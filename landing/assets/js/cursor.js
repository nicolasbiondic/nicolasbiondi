'use strict';

(function () {
  var ball = document.getElementById('ball');
  if (!ball) return;

  var half   = 16; // half of 32px
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
    ball.style.transform = 'translate(' + (curX - half) + 'px,' + (curY - half) + 'px)';
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}());
