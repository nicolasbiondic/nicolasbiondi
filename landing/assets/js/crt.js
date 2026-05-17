'use strict';
/**
 * CRT Post-Process Effects
 * Renders a second WebGL canvas on top of the fluid canvas with:
 *   - Scanlines
 *   - Vignette
 *   - Chromatic aberration (RGB shift)
 *   - Horizontal glitch tears (random, intermittent)
 *   - Film grain / static noise
 */
(function () {

  /* ── Create overlay canvas ──────────────────────────────────── */
  const canvas = document.createElement('canvas');
  canvas.id = 'crt-canvas';
  canvas.style.cssText = [
    'position:fixed', 'inset:0', 'width:100%', 'height:100%',
    'z-index:2',          // above dot-overlay (z:1), below blobs (z:0 fixed but above via stacking)
    'pointer-events:none',
    'display:block'
  ].join(';');
  document.body.insertBefore(canvas, document.body.firstChild);

  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true });
  if (!gl) return;

  /* ── Helpers ────────────────────────────────────────────────── */
  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  function program(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER,   vs));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    return p;
  }

  /* ── Shaders ────────────────────────────────────────────────── */
  const VS = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main(){
      v_uv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  const FS = `
    precision mediump float;
    varying vec2 v_uv;

    uniform float u_time;
    uniform vec2  u_res;

    /* ── Pseudo-random ── */
    float rand(vec2 co){
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main(){
      vec2 uv = v_uv;

      /* ── Glitch tears ──────────────────────────────────────────
         Every ~3-8 seconds a burst of horizontal tears appears
         for ~120ms. Outside a burst → no effect.             */
      float glitchCycle  = 6.0;                          // repeat every 6s
      float glitchBurst  = 0.12;                         // burst lasts 0.12s
      float glitchPhase  = mod(u_time, glitchCycle);
      float glitchActive = step(glitchPhase, glitchBurst);

      float tearShift = 0.0;
      if (glitchActive > 0.5) {
        float seed  = floor(u_time * 8.0);               // change seed 8× per sec
        float band  = floor(uv.y * 40.0);                // 40 horizontal bands
        float rng   = rand(vec2(seed, band));
        float isTear = step(0.72, rng);                  // ~28% of bands glitch
        tearShift = isTear * (rng - 0.5) * 0.035;       // ±1.75% horizontal shift
      }
      uv.x += tearShift;

      /* ── Chromatic aberration ──────────────────────────────────
         Subtle RGB channel separation, stronger during glitch  */
      float aberration = 0.0018 + glitchActive * 0.006;
      vec2 rOff = vec2( aberration, 0.0);
      vec2 bOff = vec2(-aberration, 0.0);

      /* We're overlaying a transparent layer — sample neighbouring
         pixels would need the fluid texture. Instead we apply the
         aberration as a colour-tinted vignette tint so it's visible
         on whatever is below without needing to sample it.          */

      /* ── Scanlines ─────────────────────────────────────────────
         Thin dark bands every 2px, scrolling slowly              */
      float line    = floor(v_uv.y * u_res.y);
      float scan    = mod(line + u_time * 18.0, 3.0);   // 3-px period, moves
      float scanDark = smoothstep(0.0, 0.4, scan) * (1.0 - smoothstep(1.6, 2.4, scan));
      float scanMask = 1.0 - scanDark * 0.18;           // darken by max 18%

      /* ── Vignette ──────────────────────────────────────────────
         Smooth dark border                                       */
      vec2  vc     = v_uv * 2.0 - 1.0;
      float vgn    = 1.0 - dot(vc * vec2(0.8, 1.1), vc * vec2(0.8, 1.1));
      vgn          = clamp(vgn, 0.0, 1.0);
      float vgMask = mix(0.0, 1.0, pow(vgn, 1.4));     // soft falloff

      /* ── Film grain / static ───────────────────────────────────
         Additive noise that changes every frame                  */
      float grain  = rand(v_uv + fract(u_time * 0.37));
      float noise  = (grain - 0.5) * 0.045;            // ±2.25% brightness noise

      /* ── Chromatic fringe tint on edges ─────────────────────── */
      float edge   = 1.0 - vgMask;
      float rFringe = edge * aberration * 18.0;
      float bFringe = edge * aberration * 12.0;

      /* ── Combine ────────────────────────────────────────────── */
      /* Output is a semi-transparent dark layer that acts as a
         filter: scanlines + vignette darken what's below,
         grain adds a slight brightness noise,
         chromatic fringe adds subtle colour on edges.           */

      float darkness = (1.0 - scanMask) + (1.0 - vgMask) * 0.55;
      darkness       = clamp(darkness, 0.0, 1.0);

      /* Colour: mostly dark with slight red boost on left edge,
         blue on right — this is the chromatic aberration feel   */
      vec3 col = vec3(
        darkness + rFringe + tearShift * 4.0,   // R channel
        darkness * 0.92,                          // G slightly less
        darkness + bFringe - tearShift * 2.0     // B channel
      );

      col += noise;
      col  = clamp(col, 0.0, 1.0);

      /* Alpha: controls how opaque the CRT filter is overall.
         0 = invisible, 1 = fully black. We want it subtle.     */
      float alpha = clamp(darkness * 0.82 + abs(noise) * 0.4, 0.0, 0.72);

      /* During glitch tears: boost alpha in torn bands */
      alpha += glitchActive * abs(tearShift) * 8.0;
      alpha  = clamp(alpha, 0.0, 1.0);

      gl_FragColor = vec4(col * alpha, alpha);
    }
  `;

  const prog   = program(VS, FS);
  const u_time = gl.getUniformLocation(prog, 'u_time');
  const u_res  = gl.getUniformLocation(prog, 'u_res');
  const a_pos  = gl.getAttribLocation(prog,  'a_pos');

  /* ── Fullscreen quad ────────────────────────────────────────── */
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array([-1,-1, 1,-1, -1,1, 1,1]),
    gl.STATIC_DRAW);

  /* ── Resize ─────────────────────────────────────────────────── */
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  /* ── Render loop ─────────────────────────────────────────────── */
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(a_pos);
  gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let start = null;
  function frame(ts) {
    if (!start) start = ts;
    const t = (ts - start) / 1000;

    gl.uniform1f(u_time, t);
    gl.uniform2f(u_res, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

}());
