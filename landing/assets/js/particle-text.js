/* ================================================================
   PARTICLE TEXT — Nicolás Biondi
   ----------------------------------------------------------------
   Vanilla-JS port of the Cursor-Driven Particle Typography
   component pattern from componentry.fun. Renders a target text
   element as a grid of particles sampled from the rasterized
   glyphs. Particles disperse from the cursor (push force inversely
   proportional to distance, capped to a dispersion radius) and
   spring back to their origin via a simple Hooke + damping model.

   Mounted automatically on any element with data-particle-text on
   it — the element's own text content is hidden visually but kept
   in the DOM for screen readers and SEO, and a canvas overlay is
   appended on top that does the visual rendering.

       <h1 class="name" data-particle-text
           data-particle-size="1.5"
           data-particle-density="5"
           data-dispersion="28"
           data-return-speed="0.08"
           data-color="#ffffff">
         Nicolás Biondi
       </h1>

   All knobs are optional. Defaults mirror the componentry.fun
   reference values.

   Performance: text is sampled once on init (and on resize). Per
   frame work is O(P) where P is the particle count — for
   "Nicolás Biondi" at the default density that's ~700 particles,
   well inside a 60 Hz budget.
   ================================================================ */
'use strict';

(function () {
  const targets = document.querySelectorAll('[data-particle-text]');
  if (!targets.length) return;

  // Defer init until web-fonts have actually loaded — otherwise the
  // pixel sampling sees a fallback font and the particle outline
  // doesn't match what the page settles into.
  const start = () => targets.forEach(mount);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start);
  } else {
    setTimeout(start, 600);
  }

  function mount(el) {
    const text = (el.textContent || '').trim();
    if (!text) return;

    // ---- Config (data-* with sensible defaults) ----
    const cfg = {
      particleSize:    parseFloat(el.dataset.particleSize)    || 1.5,
      particleDensity: parseFloat(el.dataset.particleDensity) || 5,
      dispersion:      parseFloat(el.dataset.dispersion)      || 28,
      returnSpeed:     parseFloat(el.dataset.returnSpeed)     || 0.08,
      damping:         parseFloat(el.dataset.damping)         || 0.85,
      color:           el.dataset.color                       || '',
      // Extra canvas room (in CSS px) on each side so dispersing
      // particles don't hit the canvas edge and clip. The canvas is
      // positioned with negative offsets equal to these paddings so
      // the rendered text still lines up exactly with the host's
      // original text box.
      paddingX:        parseFloat(el.dataset.paddingX)        || 100,
      paddingY:        parseFloat(el.dataset.paddingY)        || 24,
    };

    // ---- Canvas overlay ----
    const canvas = document.createElement('canvas');
    canvas.className = 'particle-text-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    el.appendChild(canvas);

    // Mark the element so CSS can hide the original glyphs.
    el.classList.add('is-particleized');

    const ctx = canvas.getContext('2d', { alpha: true });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let particles = [];
    const mouse = { x: -9999, y: -9999 };

    function resolveColor() {
      if (cfg.color) return cfg.color;
      // Inherit the original computed color of the host. Falls back
      // to white if the host has been forced transparent (which it
      // is once .is-particleized lands, so we cache the first read).
      if (!resolveColor.cached) {
        const c = getComputedStyle(el).color;
        resolveColor.cached =
          (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') ? c : '#ffffff';
      }
      return resolveColor.cached;
    }

    function sampleParticles() {
      // The host element's box gives us where the original text
      // is laid out. We size the canvas LARGER than that (+ padding
      // on each side) and shift it left/up with negative CSS offsets
      // so the rendered text still lands exactly where the host text
      // would have, but particles have free room to disperse without
      // hitting a canvas edge and getting clipped.
      const rect = el.getBoundingClientRect();
      const innerW = Math.max(1, Math.ceil(rect.width));
      const innerH = Math.max(1, Math.ceil(rect.height));
      const w = innerW + cfg.paddingX * 2;
      const h = innerH + cfg.paddingY * 2;

      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      canvas.style.left   = (-cfg.paddingX) + 'px';
      canvas.style.top    = (-cfg.paddingY) + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Rasterize the text into an off-screen canvas using the
      // SAME computed font as the host, so glyph shapes match
      // exactly. We have to read the computed style BEFORE the
      // .is-particleized class strips the visible color — but we
      // only care about font, weight, family and letter-spacing,
      // not the (now transparent) color.
      const cs = getComputedStyle(el);
      const font = [
        cs.fontStyle,
        cs.fontVariant,
        cs.fontWeight,
        cs.fontSize + '/' + cs.lineHeight,
        cs.fontFamily,
      ].join(' ');

      const off = document.createElement('canvas');
      off.width  = canvas.width;
      off.height = canvas.height;
      const octx = off.getContext('2d');
      octx.scale(dpr, dpr);
      octx.font = font;
      octx.textBaseline = 'middle';
      octx.textAlign = 'left';
      octx.fillStyle = '#ffffff';
      // Render at the inner origin (paddingX, h/2) so the visible
      // glyphs align with where the host's text would be.
      octx.fillText(text, cfg.paddingX, h / 2);

      // Sample alpha channel on a coarse grid; every cell whose
      // alpha is above ~50% becomes a particle.
      const imageData = octx.getImageData(0, 0, off.width, off.height);
      const data = imageData.data;
      const stride = off.width;
      const density = Math.max(1, cfg.particleDensity);

      particles = [];
      for (let y = 0; y < h; y += density) {
        const dy = Math.floor(y * dpr);
        for (let x = 0; x < w; x += density) {
          const dx = Math.floor(x * dpr);
          const idx = (dy * stride + dx) * 4 + 3;          // alpha byte
          if (data[idx] > 128) {
            particles.push({
              ox: x, oy: y,
              x:  x, y:  y,
              vx: 0, vy: 0,
            });
          }
        }
      }
    }

    function onPointerMove(e) {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    }

    function onPointerLeave() {
      // Park the cursor far away so particles spring back.
      mouse.x = -9999;
      mouse.y = -9999;
    }

    document.addEventListener('pointermove',  onPointerMove,  { passive: true });
    document.addEventListener('pointerleave', onPointerLeave, { passive: true });

    // Re-sample on viewport / font-size changes.
    const ro = new ResizeObserver(() => sampleParticles());
    ro.observe(el);

    sampleParticles();

    // ---- Render loop ----
    const dispR = cfg.dispersion * 4;
    const dispR2 = dispR * dispR;

    function frame() {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = resolveColor();

      const mx = mouse.x, my = mouse.y;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Cursor repulsion within radius.
        const dx = mx - p.x;
        const dy = my - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < dispR2 && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = (dispR - d) / dispR * cfg.dispersion;
          p.vx -= (dx / d) * f * 0.1;
          p.vy -= (dy / d) * f * 0.1;
        }

        // Spring back to origin.
        p.vx += (p.ox - p.x) * cfg.returnSpeed;
        p.vy += (p.oy - p.y) * cfg.returnSpeed;

        // Damping.
        p.vx *= cfg.damping;
        p.vy *= cfg.damping;

        // Integrate.
        p.x += p.vx;
        p.y += p.vy;

        // Draw — Path2D would batch nicer but for ~700 dots the
        // overhead of beginPath + arc is negligible.
        ctx.beginPath();
        ctx.arc(p.x, p.y, cfg.particleSize, 0, 6.283185307);
        ctx.fill();
      }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
