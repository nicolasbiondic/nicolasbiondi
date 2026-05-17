'use strict';
/**
 * Post-process overlay — Cuphead vintage feel:
 *   - Heavy film grain
 *   - Strong vignette with warm tint
 *   - Sepia overlay
 *   - Chromatic aberration (edge-weighted, breathing)
 *   - Film scratches (vertical, intermittent)
 *   - Projector flicker
 */
(function () {

  const canvas = document.createElement('canvas');
  canvas.id = 'crt-canvas';
  canvas.style.cssText = [
    'position:fixed','inset:0','width:100%','height:100%',
    'z-index:2','pointer-events:none','display:block'
  ].join(';');
  document.body.insertBefore(canvas, document.body.firstChild);

  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true });
  if (!gl) return;

  function mkShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  const VS = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main(){ v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos,0.,1.); }
  `;

  const FS = `
    precision mediump float;
    varying vec2 v_uv;
    uniform float u_time;
    uniform vec2  u_res;

    float rand(vec2 co){ return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453); }
    float rand1(float x){ return fract(sin(x * 127.1) * 43758.5453); }

    void main(){
      vec2 uv = v_uv;
      vec2 vc = uv * 2.0 - 1.0;

      /* ── Vignette (very strong, warm-tinted) ──────────────────── */
      float vgn   = dot(vc * vec2(0.70, 0.95), vc * vec2(0.70, 0.95));
      float vgMask = clamp(pow(vgn, 1.1), 0.0, 1.0);

      /* ── Projector flicker ────────────────────────────────────── */
      /* Irregular low-frequency brightness variation               */
      float flicker = 0.97
        + 0.02 * sin(u_time * 11.3)
        + 0.01 * sin(u_time * 27.7 + 1.3);

      /* ── Film scratches ───────────────────────────────────────── */
      /* Two independent scratches, each present ~8% of the time    */
      float st       = floor(u_time * 4.0);
      float sx1      = rand1(st);
      float sa1      = step(0.92, rand1(st + 100.0));
      float scratch1 = sa1 * max(0.0, 1.0 - abs(uv.x - sx1) * u_res.x * 0.55);

      float sx2      = rand1(st + 50.0);
      float sa2      = step(0.95, rand1(st + 150.0));
      float scratch2 = sa2 * max(0.0, 1.0 - abs(uv.x - sx2) * u_res.x * 0.55);

      float scratch  = clamp(scratch1 + scratch2, 0.0, 1.0) * 0.55;

      /* ── Heavy film grain ─────────────────────────────────────── */
      float grain  = rand(uv + fract(u_time * 0.47 + uv.yx * 3.1));
      float noise  = (grain - 0.5) * 0.13;   /* ±6.5% brightness */

      /* ── Chromatic aberration ─────────────────────────────────── */
      float dist  = length(vc);
      float aberr = 0.014 + dist * dist * 0.065 + sin(u_time * 0.35) * 0.007;

      /* Barrel-distort each channel outward */
      float rFringe = clamp((length((uv + vc * aberr) * 2.0 - 1.0) - 0.58) * 2.0, 0.0, 1.0);
      float bFringe = clamp((0.68 - length((uv - vc * aberr * 0.8) * 2.0 - 1.0)) * 2.5, 0.0, 1.0);

      /* ── Sepia / warm overlay ─────────────────────────────────── */
      /* Adds a warm amber-brown tint, stronger at edges            */
      vec3 sepia = vec3(0.22, 0.11, 0.03) * vgMask * 0.7;

      /* ── Assemble ─────────────────────────────────────────────── */
      /* Vignette darkness (warm-biased: more red/green than blue)  */
      vec3 vgnCol = vec3(
        vgMask * 0.78 * flicker,
        vgMask * 0.68 * flicker,
        vgMask * 0.52 * flicker    /* blue crushed → warm shadow  */
      );

      /* Chromatic fringe */
      vec3 chromaCol = vec3(rFringe * 0.60, 0.0, bFringe * 0.50);

      vec3 col = vgnCol + sepia + chromaCol;
      col += vec3(noise * 1.0, noise * 0.9, noise * 0.7); /* warm grain */
      col += vec3(scratch * 0.8, scratch * 0.75, scratch * 0.5); /* warm scratch */
      col = clamp(col, 0.0, 1.0);

      /* Alpha */
      float alpha = clamp(
        vgMask * 0.80
        + length(chromaCol) * 1.1
        + abs(noise) * 0.5
        + scratch * 0.6,
        0.0, 1.0
      );

      gl_FragColor = vec4(col * alpha, alpha);
    }
  `;

  const prog  = gl.createProgram();
  gl.attachShader(prog, mkShader(gl.VERTEX_SHADER,   VS));
  gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);

  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes  = gl.getUniformLocation(prog, 'u_res');
  const aPos  = gl.getAttribLocation(prog,  'a_pos');

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let t0 = null;
  function frame(ts) {
    if (!t0) t0 = ts;
    gl.uniform1f(uTime, (ts - t0) / 1000);
    gl.uniform2f(uRes,  canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}());
