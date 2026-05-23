/* ================================================================
   HDR ACTIVATION — Nicolás Biondi
   ----------------------------------------------------------------
   Cross-browser strategy:

     Safari 16.4+ (iPhone XR/11+, MacBook Pro XDR, iPad Pro):
       Requires an HDR media element ON SCREEN to enter EDR mode.
       → We use the hidden HLG HEVC anchor video. play() on click.

     Chrome 119+ / Edge 119+ (HDR monitor + OS HDR enabled):
       Activates HDR automatically as soon as the page renders any
       HDR content (display-p3 colors > 1.0 OR a WebGL canvas with
       RGBA16F backing). The anchor video isn't needed but is
       harmless (Chrome simply ignores it if HEVC can't decode).

     Chrome 137+ / Safari 18+:
       Also honor `dynamic-range-limit: no-limit` for explicit opt-in.

     Firefox / older browsers:
       `color(display-p3 ...)` with extended values clamps to SDR;
       the page renders with saturated P3 colors but no HDR brightness.
       Everything still works — just no luminance boost.

   On EVERY browser, the same code path runs:
     1. Detect capabilities (no UA sniffing — feature detection only).
     2. On user click, toggle `.hdr-on` on <html>, play the anchor
        video (Safari needs it, others ignore), and bump the WebGL
        shader's HDR boost uniform.
     3. CSS uses `color(display-p3 r g b)` with values > 1.0 for
        accents; these render as HDR on capable displays in any
        modern browser, and clamp gracefully elsewhere.
   ================================================================ */
'use strict';

(function () {
  const root      = document.documentElement;
  const anchor    = document.getElementById('hdr-anchor');
  const canvas    = document.getElementById('fluid-canvas');

  // --- 1) Capability detection ---------------------------------
  // `dynamic-range: high` is true on HDR-capable displays (iPhone X+
  // OLED, Pro Display XDR, recent MacBook Pro mini-LED, etc).
  const hdrMQ = window.matchMedia('(dynamic-range: high)');
  const p3MQ  = window.matchMedia('(color-gamut: p3)');

  // `dynamic-range-limit` is the modern Safari 18+ way to opt into
  // HDR brightness without needing an HDR media anchor.
  const supportsRangeLimit =
    window.CSS && CSS.supports && CSS.supports('dynamic-range-limit', 'no-limit');

  // `color(display-p3 ...)` with extended values requires Color Level 4.
  const supportsP3Color =
    window.CSS && CSS.supports && CSS.supports('color', 'color(display-p3 1 1 1)');

  // Flag the document so CSS can pick up baseline capabilities.
  if (hdrMQ.matches)            root.classList.add('hdr-capable');
  if (p3MQ.matches)             root.classList.add('p3-capable');
  if (supportsRangeLimit)       root.classList.add('hdr-css-native');
  if (supportsP3Color)          root.classList.add('hdr-p3-color');

  // Expose a global flag the WebGL renderer can read each frame.
  window.NB_HDR = {
    active:   false,
    capable:  hdrMQ.matches,
    /* Multiplier applied to color values in the fluid shader. SDR
       saturates around 1.0; in EDR mode we push 3-4x to hit peak
       HDR brightness on iPhone (~1000-1600 nits headroom).        */
    boost:    1.0,

    /* --- Diagnostic helper --------------------------------------
       Run `NB_HDR.diagnose()` from DevTools on any browser to see
       a snapshot of what the page detected and what's currently
       applied. Especially useful to confirm HDR is wired up in
       Chrome on an HDR monitor (look for `mediaQueryHighDR: true`).
    */
    diagnose() {
      const c  = document.createElement('canvas');
      const gl = c.getContext('webgl2', { colorSpace: 'display-p3' });
      const snap = {
        ua:                  navigator.userAgent,
        active:              window.NB_HDR.active,
        boost:               window.NB_HDR.boost,
        htmlClasses:         document.documentElement.className || '(none)',
        mediaQueryHighDR:    hdrMQ.matches,
        mediaQueryGamutP3:   p3MQ.matches,
        cssSupportsP3:       supportsP3Color,
        cssSupportsP3Extended:
          CSS.supports && CSS.supports('color', 'color(display-p3 2 2 2)'),
        cssSupportsRangeLim: supportsRangeLimit,
        webglP3Context:      !!gl,
        webglDrawingBufStor: gl && typeof gl.drawingBufferStorage === 'function',
        webglP3ColorSpace:   gl && 'drawingBufferColorSpace' in gl,
        anchorVideo:         !!anchor && {
          src: anchor.currentSrc || anchor.src,
          paused: anchor.paused,
          readyState: anchor.readyState,
        },
        screenColorDepth:    screen.colorDepth,
      };
      console.table(snap);
      return snap;
    }
  };

  // --- 2) Activation -------------------------------------------
  let activating = false;

  async function activateHDR(event) {
    if (window.NB_HDR.active || activating) return;
    activating = true;

    // Play the HDR anchor video. This is what flips Safari into EDR
    // mode on iPhone. `play()` returns a Promise that may reject on
    // older Safari that requires user-gesture; we ignore the error
    // and still toggle the class so SDR-only browsers still get the
    // P3 accent colors (which gracefully clamp to sRGB).
    if (anchor) {
      try {
        anchor.muted    = true;        // belt + suspenders for autoplay
        anchor.playsInline = true;
        await anchor.play();
      } catch (_) {
        /* play blocked — degrade silently */
      }
    }

    // Engage CSS HDR styles.
    root.classList.add('hdr-on');

    // Boost WebGL shader output. The renderer multiplies splat colors
    // by NB_HDR.boost on every frame, so values cross 1.0 and produce
    // EDR highlights once the half-float pipeline reaches the screen.
    window.NB_HDR.boost  = 3.4;
    window.NB_HDR.active = true;

    // Signal the fluid renderer in case it wants to reconfigure its
    // drawing buffer color space on the fly.
    canvas && canvas.dispatchEvent(new CustomEvent('nb:hdr-on'));

    activating = false;
  }

  function deactivateHDR() {
    if (!window.NB_HDR.active) return;
    if (anchor) { try { anchor.pause(); } catch (_) {} }
    root.classList.remove('hdr-on');
    window.NB_HDR.boost  = 1.0;
    window.NB_HDR.active = false;
    canvas && canvas.dispatchEvent(new CustomEvent('nb:hdr-off'));
  }

  // --- 3) Trigger ----------------------------------------------
  // User wants HDR to engage on click "en el fondo" — anywhere on the
  // page (background, canvas, CLIC button). We listen on document so
  // clicks on the card also count, since the whole experience is the
  // "background". Pointer events cover both mouse and touch.
  function onActivate(e) {
    activateHDR(e);
  }

  document.addEventListener('pointerdown', onActivate, { passive: true });
  // Fallback for browsers without pointer events (rare):
  document.addEventListener('touchstart',  onActivate, { passive: true });

  // Optional: double-click anywhere to turn HDR off again (handy on
  // desktop while iterating). Disabled on touch to avoid surprises.
  document.addEventListener('dblclick', function () {
    if (!('ontouchstart' in window)) deactivateHDR();
  });

  // --- 4) React to capability changes (e.g. external display) --
  if (typeof hdrMQ.addEventListener === 'function') {
    hdrMQ.addEventListener('change', function (ev) {
      window.NB_HDR.capable = ev.matches;
      root.classList.toggle('hdr-capable', ev.matches);
      if (!ev.matches) deactivateHDR();
    });
  }

  // --- 5) Visibility: pause the anchor when the tab is hidden --
  document.addEventListener('visibilitychange', function () {
    if (!anchor) return;
    if (document.hidden) {
      try { anchor.pause(); } catch (_) {}
    } else if (window.NB_HDR.active) {
      try { anchor.play();  } catch (_) {}
    }
  });
})();
