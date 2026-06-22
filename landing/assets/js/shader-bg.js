/* ================================================================
   SHADER BACKGROUND — Nicolás Biondi
   ----------------------------------------------------------------
   A full-screen animated GLSL fragment shader: slow, domain-warped
   fractal-noise "aurora" in the brand palette (deep navy → electric
   blue #1AB6FF → a touch of violet). Vanilla WebGL, no dependencies.

   - Cursor-reactive: a soft glow follows the pointer.
   - Respects prefers-reduced-motion (renders a single static frame).
   - Pauses when the tab is hidden; handles resize + DPR.
   - Renders at a reduced internal resolution for performance (the
     softness reads as depth on a background).

   Mounts on <canvas id="shader-canvas">.
   ================================================================ */
'use strict';

(function () {
  const canvas = document.getElementById('shader-canvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl', {antialias: false, alpha: false, depth: false, stencil: false})
          || canvas.getContext('experimental-webgl');
  if (!gl) return; // no WebGL → CSS background shows through

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RES_SCALE = 0.66;           // internal render scale (perf)
  const DPR_CAP = 1.5;

  const VERT = `
    attribute vec2 p;
    void main(){ gl_Position = vec4(p, 0.0, 1.0); }
  `;

  // Fragment: fbm value-noise + domain warp → flowing aurora bands.
  const FRAG = `
    precision highp float;
    uniform vec2  u_res;
    uniform float u_time;
    uniform vec2  u_mouse;   // 0..1, y up

    // -- hash / value noise --
    float hash(vec2 p){
      p = fract(p * vec2(123.34, 345.45));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
    }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for(int i = 0; i < 5; i++){
        v += a * noise(p);
        p = m * p;
        a *= 0.5;
      }
      return v;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_res.xy;
      float agectx = u_res.x / u_res.y;
      vec2 p = uv;
      p.x *= agectx;

      float t = u_time * 0.045;

      // Domain warp: noise drives the lookup of more noise → flow.
      vec2 q = vec2(fbm(p * 2.2 + vec2(0.0, t)),
                    fbm(p * 2.2 + vec2(5.2, -t)));
      vec2 r = vec2(fbm(p * 2.6 + 1.7 * q + vec2(8.3, 2.8) + t * 0.7),
                    fbm(p * 2.6 + 1.7 * q + vec2(2.1, 6.5) - t * 0.7));
      float n = fbm(p * 2.4 + 2.4 * r + t * 0.5);

      // -- palette (sRGB-ish) --
      vec3 deep   = vec3(0.035, 0.039, 0.078);   // near-bg navy
      vec3 blue   = vec3(0.102, 0.714, 1.000);   // #1AB6FF
      vec3 violet = vec3(0.36,  0.06,  0.78);    // depth accent
      vec3 cyan   = vec3(0.40,  0.92,  1.00);    // highlight

      vec3 col = deep;
      col = mix(col, violet, smoothstep(0.30, 0.95, n) * 0.45);
      col = mix(col, blue,   smoothstep(0.45, 1.05, n) * 0.65);
      // bright filaments where the warp field is busiest
      float fil = smoothstep(0.55, 0.62, length(r) * n);
      col = mix(col, cyan, fil * 0.25);

      // Cursor glow — soft electric bloom following the pointer.
      vec2 m = u_mouse; m.x *= agectx;
      float d = distance(p, m);
      col += blue * 0.10 * exp(-d * 3.2);

      // Gentle vignette to ground the composition + keep card legible.
      float vig = smoothstep(1.15, 0.25, length(uv - 0.5));
      col *= 0.82 + 0.18 * vig;

      // subtle filmic-ish lift + dither to avoid banding
      col = pow(col, vec3(0.92));
      col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('shader-bg compile error:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  // Fullscreen triangle
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');

  // Eased pointer so the glow trails smoothly.
  const mouse = {x: 0.5, y: 0.5, tx: 0.5, ty: 0.5};
  window.addEventListener('pointermove', (e) => {
    mouse.tx = e.clientX / window.innerWidth;
    mouse.ty = 1.0 - e.clientY / window.innerHeight;
  }, {passive: true});

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const w = Math.max(1, Math.floor(window.innerWidth * dpr * RES_SCALE));
    const h = Math.max(1, Math.floor(window.innerHeight * dpr * RES_SCALE));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    gl.viewport(0, 0, w, h);
  }
  window.addEventListener('resize', resize, {passive: true});
  resize();

  const start = performance.now();
  let raf = 0;
  let running = true;

  function frame(now) {
    if (!running) return;
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  }

  function renderStatic() {
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, 12.0);
    gl.uniform2f(uMouse, 0.5, 0.55);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (reduceMotion) {
    renderStatic();
  } else {
    raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    });
  }
})();
