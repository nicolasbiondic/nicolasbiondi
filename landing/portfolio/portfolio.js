'use strict';

/* ── Mobile nav toggle ──────────────────────────────────────── */
const toggle  = document.querySelector('.nav-toggle');
const navMenu = document.getElementById('nav-links');

if (toggle && navMenu) {
  toggle.addEventListener('click', function () {
    navMenu.classList.toggle('open');
  });
  // Close when a link is clicked
  navMenu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { navMenu.classList.remove('open'); });
  });
}

/* ── Lightbox (gallery page only) ───────────────────────────── */
const lightbox = document.getElementById('lightbox');
if (lightbox) {
  const items   = Array.from(document.querySelectorAll('.gallery-item img'));
  const lbImg   = document.getElementById('lb-img');
  let current   = 0;

  function openLightbox(idx) {
    current = idx;
    lbImg.src = items[idx].src;
    lbImg.alt = items[idx].alt;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lbImg.src = '';
  }

  function showPrev() { openLightbox((current - 1 + items.length) % items.length); }
  function showNext() { openLightbox((current + 1) % items.length); }

  // Open on item click
  document.querySelectorAll('.gallery-item').forEach(function (fig) {
    fig.addEventListener('click', function () {
      openLightbox(parseInt(fig.dataset.index));
    });
  });

  document.getElementById('lb-close').addEventListener('click', closeLightbox);
  document.getElementById('lb-prev').addEventListener('click', showPrev);
  document.getElementById('lb-next').addEventListener('click', showNext);

  // Click outside image to close
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  showPrev();
    if (e.key === 'ArrowRight') showNext();
  });
}

/* ── Contact form (Formspree) ────────────────────────────────── */
const form   = document.getElementById('contact-form');
const status = document.getElementById('form-status');

if (form && status) {
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    status.textContent = 'Enviando...';
    status.className   = 'form-status';

    try {
      const res = await fetch(form.action, {
        method:  'POST',
        body:    new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        status.textContent = '¡Mensaje enviado! Te respondo a la brevedad.';
        status.className   = 'form-status success';
        form.reset();
      } else {
        throw new Error('server');
      }
    } catch {
      status.textContent = 'Hubo un error. Escribime directo a nicolas@lenz.pe';
      status.className   = 'form-status error';
    }
  });
}
