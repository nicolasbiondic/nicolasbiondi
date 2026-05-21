'use strict';

/* ── Nav: scroll shadow + mobile toggle ──────────────────────── */
(function () {
  const nav    = document.getElementById('nav');
  const toggle = document.querySelector('.nav-toggle');
  const menu   = document.getElementById('nav-links');

  // Scroll shadow
  if (nav) {
    var lastScroll = 0;
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 10);
      lastScroll = window.scrollY;
    }, { passive: true });
  }

  // Mobile hamburger
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('open');
    });

    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target)) {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
}());

/* ── Gallery: scroll hint + lightbox + swipe ─────────────────── */
(function () {
  var gallery   = document.getElementById('gallery');
  var scrollHint = document.getElementById('scroll-hint');
  var lightbox  = document.getElementById('lightbox');
  if (!gallery || !lightbox) return;

  var items   = Array.from(document.querySelectorAll('.gallery-item img'));
  var lbImg   = document.getElementById('lb-img');
  var lbCount = document.getElementById('lb-counter');
  var current = 0;
  var total   = items.length;

  /* Scroll hint: hide after first scroll */
  if (scrollHint) {
    var hintHidden = false;
    gallery.addEventListener('scroll', function () {
      if (!hintHidden && gallery.scrollLeft > 30) {
        hintHidden = true;
        scrollHint.classList.add('hidden');
      }
    }, { passive: true });
  }

  /* Lightbox open */
  function openLightbox(idx) {
    current = ((idx % total) + total) % total;
    lbImg.src = items[current].src;
    lbImg.alt = items[current].alt;
    if (lbCount) lbCount.textContent = (current + 1) + ' / ' + total;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    document.getElementById('lb-close').focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lbImg.src = '';
    // Return focus to the triggering gallery item
    var fig = document.querySelector('.gallery-item[data-index="' + current + '"]');
    if (fig) fig.focus();
  }

  function showPrev() { openLightbox(current - 1); }
  function showNext() { openLightbox(current + 1); }

  /* Gallery item: click + keyboard */
  document.querySelectorAll('.gallery-item').forEach(function (fig) {
    fig.setAttribute('tabindex', '0');
    fig.setAttribute('role', 'button');
    fig.setAttribute('aria-label', 'Ampliar ' + (fig.querySelector('img') || {}).alt);

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

  document.getElementById('lb-close').addEventListener('click', closeLightbox);
  document.getElementById('lb-prev').addEventListener('click', showPrev);
  document.getElementById('lb-next').addEventListener('click', showNext);

  /* Click backdrop to close */
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  /* Keyboard navigation */
  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')     { e.preventDefault(); closeLightbox(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); showPrev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); showNext(); }
  });

  /* Touch swipe in lightbox */
  var touchStartX = 0;
  lightbox.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  lightbox.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      dx < 0 ? showNext() : showPrev();
    }
  }, { passive: true });
}());

/* ── Intersection Observer: fade-in on scroll ────────────────── */
(function () {
  if (!window.IntersectionObserver) return;
  var els = document.querySelectorAll('.project-card, .about-img, .about-text p');
  if (!els.length) return;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  els.forEach(function (el) {
    el.style.animationPlayState = 'paused';
    io.observe(el);
  });
}());

/* ── Contact form ─────────────────────────────────────────────── */
(function () {
  var form   = document.getElementById('contact-form');
  var status = document.getElementById('form-status');
  var btn    = form && form.querySelector('.btn-send');
  if (!form || !status) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Basic client validation
    var invalid = form.querySelector(':invalid');
    if (invalid) {
      invalid.focus();
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Enviando\u2026';
    status.textContent = '';
    status.className = 'form-status';

    try {
      var res = await fetch(form.action, {
        method:  'POST',
        body:    new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        status.textContent = '\u00a1Mensaje enviado! Te respondo a la brevedad.';
        status.className   = 'form-status success';
        form.reset();
        btn.textContent = 'Enviar mensaje';
      } else {
        throw new Error('server');
      }
    } catch (_) {
      status.textContent = 'Hubo un error. Escrib\u00edme a nicolas@lenz.pe';
      status.className   = 'form-status error';
      btn.textContent = 'Enviar mensaje';
    } finally {
      btn.disabled = false;
    }
  });
}());
