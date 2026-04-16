'use strict';

/* ================================================================
   1. Custom cursor — smooth circle following the mouse
   ================================================================ */
(function () {
  var ball = document.getElementById('ball');
  if (!ball) return;

  var HALF  = 16; // half of 32px width
  var mouseX = window.innerWidth  / 2;
  var mouseY = window.innerHeight / 2;
  var curX   = mouseX;
  var curY   = mouseY;
  var EASE   = 0.12;

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function tick() {
    curX += (mouseX - curX) * EASE;
    curY += (mouseY - curY) * EASE;
    ball.style.transform = 'translate(' + (curX - HALF) + 'px,' + (curY - HALF) + 'px)';
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}());


/* ================================================================
   2. Magnetic wiggle — replicates Nicol theme's parallaxIt()
      Applied to: .social-btn, .tag, .nicol-boom
   ================================================================ */
(function () {
  var MOVEMENT = 10;   // max px displacement (theme uses 25, more subtle here)
  var EASE_OUT = 'power2.out';

  document.querySelectorAll('.social-btn, .tag, .nicol-boom').forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      var rect   = el.getBoundingClientRect();
      var relX   = e.clientX - rect.left;
      var relY   = e.clientY - rect.top;
      var moveX  = ((relX - rect.width  / 2) / rect.width)  * MOVEMENT;
      var moveY  = ((relY - rect.height / 2) / rect.height) * MOVEMENT;

      gsap.to(el, { duration: 0.3, x: moveX, y: moveY, ease: EASE_OUT });
    });

    el.addEventListener('mouseleave', function () {
      gsap.to(el, { duration: 0.4, x: 0, y: 0, ease: EASE_OUT, clearProps: 'transform' });
    });
  });
}());


/* ================================================================
   3. Title underline — hover triggers it, then stays underlined
   ================================================================ */
(function () {
  var title = document.querySelector('.name');
  if (!title) return;

  title.addEventListener('mouseenter', function () {
    title.classList.add('underlined');
  });
  // Does NOT remove on mouseleave — stays underlined permanently after first hover
}());
