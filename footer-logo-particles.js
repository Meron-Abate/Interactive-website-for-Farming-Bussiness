/**
 * FOOTER — INTERACTIVE PARTICLE LOGO
 * Samples the hidden Eternal logo SVG geometry (via isPointInFill) into a
 * point cloud and lets the cursor repel nearby particles, easing them back
 * to their home position. Pure SVG geometry — no image/canvas rasterization,
 * so it works reliably even opened directly from disk (file://).
 * Vanilla JS — no external dependencies, safe to include on any page.
 */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('footer-logo-canvas');
    const source = document.getElementById('footer-logo-source');
    if (!canvas || !source) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const VB_W = 257.72, VB_H = 59.05;
    const GRID = 2.1; // sampling step in the SVG's own coordinate units
    const REPEL_RADIUS = 46;
    const REPEL_FORCE  = 24;
    const SWIRL_FORCE  = 15; // tangential component — gives the hover a swing/vortex feel
    const EASE         = 0.14;
    const ASSEMBLE_DURATION = 1.1; // seconds
    const ASSEMBLE_STAGGER  = 0.5; // seconds of spread across particles

    const COLORS = {
      'cls-1': [244, 237, 216], // wordmark — cream
      'cls-2': [246, 143, 49],  // mark — brand orange
    };

    const paths = Array.from(source.querySelectorAll('path')).map((p) => ({
      el: p,
      color: COLORS[p.getAttribute('class')] || [244, 237, 216],
    }));

    let particles = [];
    let cw = 0, ch = 0, dpr = 1;
    let mouseX = -9999, mouseY = -9999;
    let rafId = null;
    let assembleStart = null; // rAF timestamp when the reveal begins

    function pointInPath(pathEl, x, y) {
      try {
        return pathEl.isPointInFill(new DOMPoint(x, y));
      } catch (err) {
        const pt = source.createSVGPoint();
        pt.x = x; pt.y = y;
        return pathEl.isPointInFill(pt);
      }
    }

    function easeOutBack(t) {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    function buildParticles() {
      particles = [];
      for (let y = 0; y < VB_H; y += GRID) {
        for (let x = 0; x < VB_W; x += GRID) {
          for (let i = 0; i < paths.length; i++) {
            if (pointInPath(paths[i].el, x, y)) {
              particles.push({
                nx: x / VB_W,
                ny: y / VB_H,
                color: paths[i].color,
                x: 0, y: 0,
                seed: Math.random() * Math.PI * 2,
                scatterAngle: Math.random() * Math.PI * 2,
                scatterDist: 0.55 + Math.random() * 0.85,
                delay: Math.random() * ASSEMBLE_STAGGER,
                arrived: reduceMotion, // reduced-motion users see the logo settled immediately
              });
              break;
            }
          }
        }
      }
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      cw = rect.width;
      ch = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = cw * dpr;
      canvas.height = ch * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function setPointer(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      mouseX = clientX - rect.left;
      mouseY = clientY - rect.top;
    }

    canvas.addEventListener('mousemove', (e) => setPointer(e.clientX, e.clientY));
    canvas.addEventListener('mouseleave', () => { mouseX = -9999; mouseY = -9999; });
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    canvas.addEventListener('touchend', () => { mouseX = -9999; mouseY = -9999; });

    function observeVisibility() {
      if (!('IntersectionObserver' in window)) { assembleStart = performance.now(); draw(); return; }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && assembleStart === null) assembleStart = performance.now();
          if (entry.isIntersecting && !rafId) draw();
          if (!entry.isIntersecting && rafId) { cancelAnimationFrame(rafId); rafId = null; }
        });
      }, { threshold: 0.05 });
      io.observe(canvas);
    }

    function draw(time) {
      rafId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, cw, ch);

      const elapsedTotal = assembleStart !== null ? ((time || 0) - assembleStart) / 1000 : 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const homeX = p.nx * cw;
        const homeY = p.ny * ch;

        // Dynamic resting target: home position plus idle bob and hover swing
        let tx = homeX, ty = homeY;

        if (!reduceMotion) {
          ty += Math.sin((time || 0) * 0.0015 + p.seed) * 0.6;

          const dx = homeX - mouseX;
          const dy = homeY - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < REPEL_RADIUS) {
            const pull = 1 - dist / REPEL_RADIUS;
            const angle = Math.atan2(dy, dx);
            // Radial push plus a perpendicular swirl for a cool "swing" deflection
            tx += Math.cos(angle) * pull * REPEL_FORCE + Math.cos(angle + Math.PI / 2) * pull * SWIRL_FORCE;
            ty += Math.sin(angle) * pull * REPEL_FORCE + Math.sin(angle + Math.PI / 2) * pull * SWIRL_FORCE;
          }
        }

        if (!p.arrived) {
          // Entrance: fly in from a scattered position and snap into place with a slight overshoot
          const t = Math.max(0, Math.min(1, (elapsedTotal - p.delay) / ASSEMBLE_DURATION));
          const eased = easeOutBack(t);
          const scatterX = homeX + Math.cos(p.scatterAngle) * p.scatterDist * Math.max(cw, ch);
          const scatterY = homeY + Math.sin(p.scatterAngle) * p.scatterDist * Math.max(cw, ch);
          p.x = scatterX + (tx - scatterX) * eased;
          p.y = scatterY + (ty - scatterY) * eased;
          if (t >= 1) p.arrived = true;
        } else {
          p.x += (tx - p.x) * EASE;
          p.y += (ty - p.y) * EASE;
        }

        ctx.fillStyle = `rgb(${p.color[0]}, ${p.color[1]}, ${p.color[2]})`;
        ctx.fillRect(p.x, p.y, 1.7, 1.7);
      }
    }

    buildParticles();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    observeVisibility();
  });
})();

