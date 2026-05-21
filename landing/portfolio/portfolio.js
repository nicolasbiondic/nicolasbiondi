'use strict';

/* ════════════════════════════════════════════════════════════════
   Nav: scroll shadow + mobile toggle
   ════════════════════════════════════════════════════════════════ */
(function () {
  const nav    = document.getElementById('nav');
  const toggle = document.querySelector('.nav-toggle');
  const menu   = document.getElementById('nav-links');

  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('open');
    });

    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target)) {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Close menu on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }
}());


/* ════════════════════════════════════════════════════════════════
   Lightbox v2: zoom, thumbnails, preload, focus trap
   ════════════════════════════════════════════════════════════════ */
(function () {
  const gallery   = document.getElementById('gallery');
  const scrollHint = document.getElementById('scroll-hint');
  const lightbox  = document.getElementById('lightbox');
  if (!gallery || !lightbox) return;

  const items   = Array.from(document.querySelectorAll('.gallery-item img'));
  const lbImg   = document.getElementById('lb-img');
  const lbCount = document.getElementById('lb-counter');
  const lbThumbs = document.getElementById('lb-thumbs');
  const lbZoom  = document.getElementById('lb-zoom');
  let current   = 0;
  const total   = items.length;
  let triggerEl = null;

  /* Build thumbnail strip */
  if (lbThumbs) {
    items.forEach(function (img, idx) {
      const thumb = document.createElement('button');
      thumb.className = 'lb-thumb';
      thumb.setAttribute('type', 'button');
      thumb.setAttribute('aria-label', 'Ver ' + (img.alt || 'foto ' + (idx + 1)));
      thumb.dataset.idx = String(idx);
      thumb.innerHTML = '<img src="' + img.src + '" alt="" loading="lazy" />';
      thumb.addEventListener('click', function () { showImage(idx); });
      lbThumbs.appendChild(thumb);
    });
  }

  /* Scroll hint: hide after first scroll */
  if (scrollHint) {
    let hidden = false;
    gallery.addEventListener('scroll', function () {
      if (!hidden && gallery.scrollLeft > 30) {
        hidden = true;
        scrollHint.classList.add('hidden');
      }
    }, { passive: true });
    // Also hide on window scroll (mobile vertical layout)
    window.addEventListener('scroll', function () {
      if (!hidden && window.scrollY > 30) {
        hidden = true;
        scrollHint.classList.add('hidden');
      }
    }, { passive: true });
  }

  /* Preload neighbors */
  function preload(idx) {
    const next = items[(idx + 1) % total];
    const prev = items[(idx - 1 + total) % total];
    [next, prev].forEach(function (im) {
      if (im && im.src) {
        const i = new Image();
        i.src = im.src;
      }
    });
  }

  /* Show specific image */
  function showImage(idx) {
    current = ((idx % total) + total) % total;

    // Remove zoom state
    lbImg.classList.remove('zoomed');

    // Fade out then swap
    lbImg.classList.add('loading');
    requestAnimationFrame(function () {
      const newSrc = items[current].src;
      lbImg.src = newSrc;
      lbImg.alt = items[current].alt;

      // When loaded, fade in
      if (lbImg.complete) {
        lbImg.classList.remove('loading');
      } else {
        lbImg.onload = function () { lbImg.classList.remove('loading'); };
      }
    });

    // Update counter
    if (lbCount) {
      lbCount.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    }

    // Update active thumbnail + scroll into view
    if (lbThumbs) {
      const thumbs = lbThumbs.querySelectorAll('.lb-thumb');
      thumbs.forEach(function (t, i) {
        t.classList.toggle('active', i === current);
      });
      const activeThumb = thumbs[current];
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }

    preload(current);
  }

  /* Open / close */
  function openLightbox(idx) {
    triggerEl = document.activeElement;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    showImage(idx);
    requestAnimationFrame(function () {
      document.getElementById('lb-close').focus();
    });
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lbImg.src = '';
    lbImg.classList.remove('zoomed', 'loading');
    if (triggerEl && typeof triggerEl.focus === 'function') {
      triggerEl.focus();
    }
  }

  function showPrev() { showImage(current - 1); }
  function showNext() { showImage(current + 1); }

  /* Zoom toggle */
  function toggleZoom() {
    lbImg.classList.toggle('zoomed');
  }

  /* Gallery items: click + keyboard */
  document.querySelectorAll('.gallery-item').forEach(function (fig) {
    fig.setAttribute('tabindex', '0');
    fig.setAttribute('role', 'button');
    const img = fig.querySelector('img');
    if (img && img.alt) fig.setAttribute('aria-label', 'Ampliar: ' + img.alt);

    fig.addEventListener('click', function () {
      openLightbox(parseInt(fig.dataset.index, 10));
    });

    fig.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(parseInt(fig.dataset.index, 10));
      }
    });
  });

  /* Controls */
  const closeBtn = document.getElementById('lb-close');
  const prevBtn  = document.getElementById('lb-prev');
  const nextBtn  = document.getElementById('lb-next');
  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn)  prevBtn.addEventListener('click', showPrev);
  if (nextBtn)  nextBtn.addEventListener('click', showNext);
  if (lbZoom)   lbZoom.addEventListener('click', toggleZoom);
  if (lbImg)    lbImg.addEventListener('click', toggleZoom);

  /* Click backdrop to close (not on image or controls) */
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox || e.target.classList.contains('lb-img-wrap')) {
      closeLightbox();
    }
  });

  /* Keyboard navigation + focus trap */
  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')     { e.preventDefault(); closeLightbox(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); showPrev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); showNext(); }
    if (e.key === 'Home')       { e.preventDefault(); showImage(0); }
    if (e.key === 'End')        { e.preventDefault(); showImage(total - 1); }
    if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); toggleZoom(); }
  });

  /* Touch swipe (skip when zoomed) */
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartT = 0;
  lightbox.addEventListener('touchstart', function (e) {
    if (lbImg.classList.contains('zoomed')) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartT = Date.now();
  }, { passive: true });

  lightbox.addEventListener('touchend', function (e) {
    if (lbImg.classList.contains('zoomed')) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const dt = Date.now() - touchStartT;
    // Only horizontal swipes (not scrolls)
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 500) {
      dx < 0 ? showNext() : showPrev();
    }
    // Swipe down to close
    if (dy > 80 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      closeLightbox();
    }
  }, { passive: true });
}());


/* ════════════════════════════════════════════════════════════════
   IntersectionObserver: fade-in on scroll for static pages
   ════════════════════════════════════════════════════════════════ */
(function () {
  if (!window.IntersectionObserver) return;
  const els = document.querySelectorAll('.project-card, .about-img, .about-text p');
  if (!els.length) return;

  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -10% 0px' });

  els.forEach(function (el) {
    el.style.animationPlayState = 'paused';
    io.observe(el);
  });
}());


/* ════════════════════════════════════════════════════════════════
   Contact form
   ════════════════════════════════════════════════════════════════ */
(function () {
  const form   = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (!form || !status) return;
  const btn = form.querySelector('.btn-send');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const invalid = form.querySelector(':invalid');
    if (invalid) { invalid.focus(); return; }

    btn.disabled = true;
    btn.textContent = 'Enviando\u2026';
    status.textContent = '';
    status.className = 'form-status';

    try {
      const res = await fetch(form.action, {
        method:  'POST',
        body:    new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        status.textContent = '\u00a1Mensaje enviado! Te respondo a la brevedad.';
        status.className   = 'form-status success';
        form.reset();
      } else {
        throw new Error('server');
      }
    } catch (_) {
      status.textContent = 'Hubo un error. Escrib\u00edme a nicolas@lenz.pe';
      status.className   = 'form-status error';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enviar mensaje';
    }
  });
}());
