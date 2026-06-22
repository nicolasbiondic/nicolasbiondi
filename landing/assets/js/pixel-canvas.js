/* ================================================================
   PIXEL CANVAS — Nicolás Biondi
   ----------------------------------------------------------------
   Vanilla-JS port of the Pixel Canvas component pattern from
   componentry.fun. A grid of cells lights up under the cursor and
   smoothly fades through a color gradient. Click events emit an
   expanding ring of light. Designed to sit OVER the fluid canvas
   so the page has two layered backgrounds: organic fluid blobs +
   crisp pixel grid.

   Usage:
     <canvas id="pixel-canvas"
       data-gap="14"
       data-decay="0.94"
       data-radius="100"
       data-colors='["#0a0a0a","#404040","#c8c8c8","#ffffff"]'
       data-variant="default"
       data-click-radius="300"></canvas>

   Performance:
     - Iterates only the cells inside the cursor / click radius
       per frame (O(R²/gap²) per pointer, not O(W·H/gap²)).
     - Uses Float32Array for intensity state.
     - Skips draw + decay for cells under a near-zero threshold.
     - All cells decay multiplicatively each frame, so the trail
       fades exponentially without any per-cell allocation.
   ================================================================ */
'use strict';

(function () {
  const canvas = document.getElementById('pixel-canvas');
  if (!canvas) return;

  // --- Config (data-* attributes override defaults) -------------
  const cfg = {
    gap:         parseFloat(canvas.dataset.gap)         || 14,
    decay:       parseFloat(canvas.dataset.decay)       || 0.94,
    radius:      parseFloat(canvas.dataset.radius)      || 100,
    clickRadius: parseFloat(canvas.dataset.clickRadius) || 320,
    clickSpeed:  parseFloat(canvas.dataset.clickSpeed)  || 14,
    variant:     canvas.dataset.variant                 || 'default',
    colors:      JSON.parse(canvas.dataset.colors       || '["#0a0a0a","#404040","#c8c8c8","#ffffff"]'),
  };

  // Optional inline blend-mode override (the CSS default is `screen`).
  // Useful values: 'screen', 'lighten', 'plus-lighter', 'color-dodge'.
  if (canvas.dataset.blendMode) canvas.style.mixBlendMode = canvas.dataset.blendMode;

  // Convert hex colors to [r,g,b] stops once at init.
  const stops = cfg.colors.map(hexToRgb);

  // --- Canvas + grid setup --------------------------------------
  const ctx = canvas.getContext('2d', { alpha: true });
  let cols = 0, rows = 0, intensity = null;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width  = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.ceil(w / cfg.gap);
    rows = Math.ceil(h / cfg.gap);
    intensity = new Float32Array(cols * rows);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // --- Pointer state --------------------------------------------
  const pointer = { x: -9999, y: -9999, active: false, last: 0 };
  const ripples = [];   // { x, y, t (seconds since spawn) }

  document.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    pointer.last = performance.now();
  }, { passive: true });

  document.addEventListener('pointerleave', () => { pointer.active = false; });

  document.addEventListener('click', (e) => {
    ripples.push({ x: e.clientX, y: e.clientY, t: 0 });
    // Keep the ripple list bounded — 8 concurrent is plenty.
    if (ripples.length > 8) ripples.shift();
  });

  // --- Helpers --------------------------------------------------
  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{6})$/i.exec(hex);
    if (!m) return [255, 255, 255];
    const v = parseInt(m[1], 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  // Linear interpolation through stops. t in [0, 1].
  function sampleGradient(t) {
    if (t <= 0) return stops[0];
    if (t >= 1) return stops[stops.length - 1];
    const seg = t * (stops.length - 1);
    const i = seg | 0;
    const f = seg - i;
    const a = stops[i], b = stops[i + 1];
    return [
      a[0] + (b[0] - a[0]) * f,
      a[1] + (b[1] - a[1]) * f,
      a[2] + (b[2] - a[2]) * f,
    ];
  }

  // Bump every cell within `r` of (px, py) up by `mag * falloff`.
  function bumpCircle(px, py, r, mag) {
    const r2 = r * r;
    const col0 = Math.max(0, Math.floor((px - r) / cfg.gap));
    const col1 = Math.min(cols - 1, Math.ceil((px + r) / cfg.gap));
    const row0 = Math.max(0, Math.floor((py - r) / cfg.gap));
    const row1 = Math.min(rows - 1, Math.ceil((py + r) / cfg.gap));

    for (let row = row0; row <= row1; row++) {
      const cy = row * cfg.gap + cfg.gap * 0.5;
      const dy = cy - py;
      for (let col = col0; col <= col1; col++) {
        const cx = col * cfg.gap + cfg.gap * 0.5;
        const dx = cx - px;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const t = 1 - Math.sqrt(d2) / r;            // 0 at edge, 1 at center
        const idx = row * cols + col;
        const v = mag * t * t;                       // smooth falloff
        if (v > intensity[idx]) intensity[idx] = v;
      }
    }
  }

  // Bump cells in a thin ring at radius `r` from (px, py).
  function bumpRing(px, py, r, halfWidth, mag) {
    const outer = r + halfWidth;
    const col0 = Math.max(0, Math.floor((px - outer) / cfg.gap));
    const col1 = Math.min(cols - 1, Math.ceil((px + outer) / cfg.gap));
    const row0 = Math.max(0, Math.floor((py - outer) / cfg.gap));
    const row1 = Math.min(rows - 1, Math.ceil((py + outer) / cfg.gap));

    for (let row = row0; row <= row1; row++) {
      const cy = row * cfg.gap + cfg.gap * 0.5;
      const dy = cy - py;
      for (let col = col0; col <= col1; col++) {
        const cx = col * cfg.gap + cfg.gap * 0.5;
        const dx = cx - px;
        const d = Math.sqrt(dx * dx + dy * dy);
        const offset = Math.abs(d - r);
        if (offset > halfWidth) continue;
        const t = 1 - offset / halfWidth;
        const idx = row * cols + col;
        const v = mag * t;
        if (v > intensity[idx]) intensity[idx] = v;
      }
    }
  }

  // --- Main loop ------------------------------------------------
  let lastFrame = performance.now();
  const cellMargin = 1;            // 1 px gutter between pixels
  const minVisible = 0.012;        // skip drawing below this intensity
  const ROUND_RADIUS = 2;          // for 'trail' variant rounded corners

  function frame(now) {
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Pump from cursor (only when active + recently moved).
    if (pointer.active && now - pointer.last < 1500) {
      bumpCircle(pointer.x, pointer.y, cfg.radius, 1.0);
    }

    // Pump from active click ripples. Each ripple is a ring whose
    // radius grows over time and whose strength fades.
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.t += dt;
      const r = rp.t * cfg.clickSpeed * 60;             // px per frame * 60 = px/sec
      const life = 1 - rp.t / 1.2;                       // life over ~1.2 s
      if (life <= 0 || r > cfg.clickRadius * 3) {
        ripples.splice(i, 1);
        continue;
      }
      const halfWidth = cfg.radius * 0.6;
      bumpRing(rp.x, rp.y, r, halfWidth, life);
    }

    // Decay + draw every cell. Cells with negligible intensity are
    // forced to 0 and skipped, so the steady-state frame is cheap.
    const size = cfg.gap - cellMargin;
    const variant = cfg.variant;
    const supportsRoundRect = typeof ctx.roundRect === 'function';

    for (let row = 0; row < rows; row++) {
      const y = row * cfg.gap;
      const rowBase = row * cols;
      for (let col = 0; col < cols; col++) {
        const idx = rowBase + col;
        let v = intensity[idx];
        if (v < minVisible) {
          if (v !== 0) intensity[idx] = 0;
          continue;
        }
        // Sample color from gradient and fade alpha with intensity.
        const t = v > 1 ? 1 : v;
        const rgb = sampleGradient(t);
        const alpha = t;
        ctx.fillStyle = 'rgba(' + (rgb[0] | 0) + ',' + (rgb[1] | 0) + ',' + (rgb[2] | 0) + ',' + alpha.toFixed(3) + ')';

        const x = col * cfg.gap;
        if (variant === 'trail' && supportsRoundRect) {
          ctx.beginPath();
          ctx.roundRect(x, y, size, size, ROUND_RADIUS);
          ctx.fill();
        } else if (variant === 'glow') {
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 8;
          ctx.fillRect(x, y, size, size);
        } else {
          ctx.fillRect(x, y, size, size);
        }

        intensity[idx] = v * cfg.decay;
      }
    }

    if (variant === 'glow') ctx.shadowBlur = 0;

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
