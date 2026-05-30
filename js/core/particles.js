/* ═══════════════════════════════════════════════════════
   js/core/particles.js
   Ambient floating particle background
═══════════════════════════════════════════════════════ */
(function () {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 80 }, () => ({
    x:   Math.random() * 1920,
    y:   Math.random() * 1080,
    r:   Math.random() * 1.5 + 0.3,
    dx:  (Math.random() - 0.5) * 0.15,
    dy:  -Math.random() * 0.2 - 0.05,
    a:   Math.random() * 0.6 + 0.1,
    hue: Math.random() < 0.6 ? 225 : (Math.random() < 0.5 ? 260 : 45),
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc((p.x % W + W) % W, (p.y % H + H) % H, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.a})`;
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.y < -5) p.y = H + 5;
    });
    requestAnimationFrame(draw);
  }

  draw();
})();
