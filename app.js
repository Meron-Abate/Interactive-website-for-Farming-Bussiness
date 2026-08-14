/**
 * ETERNAL IMPEX — CINEMATIC SCROLL-STORY ENGINE v2
 *
 * Hero:     700vh CSS-sticky  →  stages have generous HOLD windows
 *           Stage 5 gets 30% of total scroll = ~210vh of reading time
 *
 * About:    GSAP pinned word-reveal  →  300vh total (reveal + hold + release)
 *
 * Products: CSS-sticky, 6 products × 2.5vh each  →  ENTRY / HOLD / EXIT phases
 *           Left: step num + content panels
 *           Right: image panels crossfade
 */

document.addEventListener('DOMContentLoaded', () => {

/* ==========================================================================
   0. GSAP SETUP
   ========================================================================== */
gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ==========================================================================
   1. LENIS SMOOTH SCROLL
   ========================================================================== */
let lenis;

function initLenis() {
  if (prefersReducedMotion) return;

  lenis = new Lenis({
    duration:        1.4,
    easing:          (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel:     true,
    wheelMultiplier: 0.85,
    smoothTouch:     false,
    touchMultiplier: 1.5,
  });

  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  lenis.on('scroll', () => {
    updateHeroScrollState();
    ScrollTrigger.update();
  });
}

/* ==========================================================================
   2. CANVAS FRAME SEQUENCE (300 frames)
   ========================================================================== */
const TOTAL_FRAMES = 300;
const FRAME_DIR    = './frames/';
const images       = [];
const frameState   = { loaded: 0, current: 0, target: 0, ready: false };

const heroCanvas   = document.getElementById('hero-canvas');
const heroCtx      = heroCanvas ? heroCanvas.getContext('2d') : null;
const pCanvas      = document.getElementById('particles-canvas');
const pCtx         = pCanvas ? pCanvas.getContext('2d') : null;

const preloader    = document.getElementById('preloader');
const preloaderBar = document.getElementById('preloader-bar');
const preloaderPct = document.getElementById('preloader-pct');
const headerEl     = document.getElementById('site-header');
const heroSection  = document.getElementById('hero');
const scrollThumb  = document.getElementById('scroll-thumb');
const exitVeil     = document.getElementById('hero-exit-veil');

function getFramePath(i) {
  return `${FRAME_DIR}ezgif-frame-${String(i + 1).padStart(3, '0')}.jpg`;
}

function preloadFrames() {
  let loaded = 0;

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const img = new Image();
    img.src = getFramePath(i);

    img.onload = () => {
      loaded++;
      frameState.loaded = loaded;
      const pct = Math.round((loaded / TOTAL_FRAMES) * 100);
      if (preloaderBar) preloaderBar.style.width = `${pct}%`;
      if (preloaderPct) preloaderPct.textContent  = `${pct}%`;

      if (i === 0 && heroCtx) { resizeHeroCanvas(); renderFrame(0); }

      if (loaded >= 20 && !frameState.ready) {
        frameState.ready = true;
        dismissPreloader();
        resizeHeroCanvas();
        initLenis();
        initAllSections();
      }

      if (loaded === TOTAL_FRAMES && preloader) preloader.classList.add('hidden');
    };

    img.onerror = () => {
      loaded++;
      if (loaded >= 20 && !frameState.ready) {
        frameState.ready = true;
        dismissPreloader();
        initLenis();
        initAllSections();
      }
    };

    images.push(img);
  }
}

function dismissPreloader() {
  setTimeout(() => { preloader?.classList.add('hidden'); }, 500);
}

/* ==========================================================================
   3. CANVAS RENDERING
   ========================================================================== */
function resizeHeroCanvas() {
  if (!heroCanvas || !heroCtx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  heroCanvas.width  = w * dpr;
  heroCanvas.height = h * dpr;
  heroCanvas.style.width  = `${w}px`;
  heroCanvas.style.height = `${h}px`;
  heroCtx.scale(dpr, dpr);
  renderFrame(Math.round(frameState.current));
}

function renderFrame(index) {
  if (!heroCtx) return;
  let img = images[index];
  if (!img || !img.complete || !img.naturalWidth) {
    // find nearest loaded frame
    let closest = -1, minDiff = Infinity;
    for (let i = 0; i < images.length; i++) {
      if (images[i]?.complete && images[i].naturalWidth) {
        const d = Math.abs(i - index);
        if (d < minDiff) { minDiff = d; closest = i; }
      }
    }
    if (closest !== -1) img = images[closest]; else return;
  }
  const cw = window.innerWidth, ch = window.innerHeight;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const ir = iw / ih, cr = cw / ch;
  let dw, dh, ox, oy;
  if (cr > ir) { dw = cw; dh = cw / ir; ox = 0; oy = (ch - dh) / 2; }
  else         { dh = ch; dw = ch * ir; ox = (cw - dw) / 2; oy = 0; }
  heroCtx.clearRect(0, 0, cw, ch);
  heroCtx.drawImage(img, ox, oy, dw, dh);
}

window.addEventListener('resize', () => {
  resizeHeroCanvas();
  resizeParticlesCanvas();
  ScrollTrigger.refresh();
}, { passive: true });

/* ==========================================================================
   4. LERP ANIMATION LOOP
   ========================================================================== */
function animateLoop() {
  const diff = frameState.target - frameState.current;
  if (Math.abs(diff) > 0.01) {
    frameState.current += diff * 0.1;
    renderFrame(Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(frameState.current))));
  }
  updateParticles();
  requestAnimationFrame(animateLoop);
}

/* ==========================================================================
   5. HERO SCROLL STATE — 700vh scroll space, 5 stages, big holds
   ========================================================================== */

/**
 * Stage timeline on the 700vh canvas:
 *
 * Stage 1 (opening):       0.00 → 0.15  (105vh total, ~91vh solid)
 * gap:                     0.15 → 0.17
 * Stage 2 (sourcing):      0.17 → 0.32  (105vh total, ~91vh solid)
 * gap:                     0.32 → 0.34
 * Stage 3 (cooperatives):  0.34 → 0.50  (112vh total, ~98vh solid)
 * gap:                     0.50 → 0.52
 * Stage 4 (export):        0.52 → 0.67  (105vh total, ~91vh solid)
 * gap:                     0.67 → 0.70
 * Stage 5 (final + HOLD):  0.70 → 1.00  (210vh total, ~182vh solid!)
 *
 * FADE_WIN 0.015 → very small fade windows = maximum reading time per stage.
 */
const FADE_WIN = 0.015;

const stageRanges = [
  { el: document.getElementById('stage-1'), start: 0.00, end: 0.15, isCenter: true  },
  { el: document.getElementById('stage-2'), start: 0.17, end: 0.32, isCenter: false },
  { el: document.getElementById('stage-3'), start: 0.34, end: 0.50, isCenter: false },
  { el: document.getElementById('stage-4'), start: 0.52, end: 0.67, isCenter: false },
  { el: document.getElementById('stage-5'), start: 0.70, end: 1.00, isCenter: true  },
];

function updateStoryStages(progress) {
  stageRanges.forEach(stage => {
    if (!stage.el) return;

    // OUTSIDE range → hidden
    if (progress < stage.start || progress > stage.end) {
      const isAfter = progress > stage.end;
      stage.el.style.opacity       = '0';
      stage.el.style.pointerEvents = 'none';
      stage.el.classList.remove('active');
      if (stage.isCenter) {
        stage.el.style.transform = `translateX(-50%) translateY(calc(-50% + ${isAfter ? '-28px' : '36px'}))`;
      } else {
        stage.el.style.transform = `translateY(calc(-50% + ${isAfter ? '-28px' : '36px'}))`;
      }
      return;
    }

    // INSIDE range — calculate opacity and y offset
    let opacity = 1, ty = 0;

    if (progress < stage.start + FADE_WIN) {
      // ENTRY fade-in
      const t = (progress - stage.start) / FADE_WIN;
      opacity = t;
      ty = 34 * (1 - t);
    } else if (progress > stage.end - FADE_WIN) {
      // EXIT fade-out (stage 5 never exits — it ends at 1.0)
      const t = (stage.end - progress) / FADE_WIN;
      opacity = t;
      ty = -22 * (1 - t);
    }
    // else: solid hold — opacity = 1, ty = 0

    stage.el.style.opacity       = opacity.toFixed(3);
    stage.el.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';

    if (stage.isCenter) {
      stage.el.style.transform = `translateX(-50%) translateY(calc(-50% + ${ty.toFixed(1)}px))`;
    } else {
      stage.el.style.transform = `translateY(calc(-50% + ${ty.toFixed(1)}px))`;
    }

    if (opacity > 0.1) stage.el.classList.add('active');
    else stage.el.classList.remove('active');
  });
}

function updateHeroScrollState() {
  if (!heroSection) return;
  const rect      = heroSection.getBoundingClientRect();
  const scrollDist = heroSection.offsetHeight - window.innerHeight;
  const progress  = Math.max(0, Math.min(1, -rect.top / scrollDist));

  // Drive canvas frames
  frameState.target = progress * (TOTAL_FRAMES - 1);

  // Scroll progress bar
  if (scrollThumb) scrollThumb.style.width = `${progress * 100}%`;

  // Text stages
  updateStoryStages(progress);

  // Exit veil: fades in as stage-5 exits (progress 0.97 → 1.0)
  if (exitVeil) {
    const veilT = Math.max(0, (progress - 0.97) / 0.03);
    exitVeil.style.opacity = (veilT * 0.85).toFixed(3);
  }

  // Header background
  if (-rect.top > 60) headerEl?.classList.add('scrolled');
  else headerEl?.classList.remove('scrolled');
}

window.addEventListener('scroll', updateHeroScrollState, { passive: true });

/* ==========================================================================
   6. AMBIENT PARTICLES
   ========================================================================== */
const particles   = [];
const PARTICLE_COUNT = 28;

function resizeParticlesCanvas() {
  if (!pCanvas) return;
  pCanvas.width  = window.innerWidth;
  pCanvas.height = window.innerHeight;
}

function initParticles() {
  resizeParticlesCanvas();
  particles.length = 0;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x:     Math.random() * window.innerWidth,
      y:     Math.random() * window.innerHeight,
      r:     Math.random() * 1.5 + 0.4,
      color: Math.random() > 0.4 ? '#D9A441' : '#4a8f3a',
      alpha: Math.random() * 0.32 + 0.08,
      vy:    -(Math.random() * 0.3 + 0.07),
      vx:    (Math.random() - 0.5) * 0.2,
    });
  }
}

function updateParticles() {
  if (!pCtx || !pCanvas) return;
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  particles.forEach(p => {
    p.y += p.vy; p.x += p.vx;
    if (p.y < 0) { p.y = pCanvas.height + 8; p.x = Math.random() * pCanvas.width; }
    pCtx.beginPath();
    pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    pCtx.fillStyle = p.color;
    pCtx.globalAlpha = p.alpha;
    pCtx.shadowBlur  = 7;
    pCtx.shadowColor = p.color;
    pCtx.fill();
  });
  pCtx.globalAlpha = 1;
}

/* ==========================================================================
   7. CUSTOM CURSOR
   ========================================================================== */
function initCursor() {
  const cursorEl   = document.getElementById('cursor');
  const cursorDot  = cursorEl?.querySelector('.cursor-dot');
  const cursorRing = cursorEl?.querySelector('.cursor-ring');
  if (!cursorEl || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let cx = -100, cy = -100, rx = -100, ry = -100;

  document.addEventListener('mousemove', e => {
    cx = e.clientX; cy = e.clientY;
    if (cursorDot) { cursorDot.style.left = `${cx}px`; cursorDot.style.top = `${cy}px`; }
  });

  (function animateCursor() {
    rx += (cx - rx) * 0.1; ry += (cy - ry) * 0.1;
    if (cursorRing) { cursorRing.style.left = `${rx}px`; cursorRing.style.top = `${ry}px`; }
    requestAnimationFrame(animateCursor);
  })();

  document.querySelectorAll('button, a, .industry-row, .quality-cert, .testimonial-btn, .prod-dot').forEach(el => {
    el.addEventListener('mouseenter', () => cursorEl.classList.add('is-hovering'));
    el.addEventListener('mouseleave', () => cursorEl.classList.remove('is-hovering'));
  });
}

/* ==========================================================================
   8. CHAPTER PROGRESS NAV
   ========================================================================== */
function initChapterNav() {
  const chapterNav = document.getElementById('chapter-nav');
  const navItems   = document.querySelectorAll('.chapter-nav-item');
  const navBtns    = document.querySelectorAll('.chapter-nav-btn');
  if (!chapterNav) return;

  // Show after hero
  ScrollTrigger.create({
    trigger: '#chapter-farm',
    start: 'top 80%',
    onEnter:     () => chapterNav.classList.add('visible'),
    onLeaveBack: () => chapterNav.classList.remove('visible'),
  });

  // Scroll to section on click
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (!target) return;
      const el = document.querySelector(target);
      if (!el) return;
      lenis ? lenis.scrollTo(el, { offset: 0, duration: 1.5 }) : el.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Active chapter highlighting
  const chapterSections = [
    { id: 'hero',             key: 'hero'     },
    { id: 'chapter-farm',    key: 'farm'     },
    { id: 'chapter-products',key: 'products' },
    { id: 'chapter-quality', key: 'quality'  },
    { id: 'chapter-future',  key: 'future'   },
  ];

  chapterSections.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 60%', end: 'bottom 40%',
      onEnter:     () => setActive(key),
      onEnterBack: () => setActive(key),
    });
  });

  function setActive(key) {
    navItems.forEach(item => item.classList.toggle('active', item.dataset.chapter === key));
  }
}

/* ==========================================================================
   9. CHAPTER 1 — THE FARM — Centered word reveal with hold
   ========================================================================== */
function initChapterFarm() {
  const aboutText    = document.getElementById('about-reveal-text');
  const farmSticky   = document.getElementById('chapter-farm-sticky');
  if (!aboutText || !farmSticky || prefersReducedMotion) return;

  // Split into word spans
  const words = aboutText.textContent.trim().split(/\s+/);
  aboutText.innerHTML = words.map(w => `<span class="word">${w}</span>`).join(' ');
  const wordEls = aboutText.querySelectorAll('.word');

  gsap.set(wordEls, { color: 'var(--text-muted)' });

  /**
   * Timeline structure (pinned):
   *  0% → 65%  — words reveal progressively (scrubbed)
   *  65% → 100% — all words lit, section HOLDS (reading phase)
   *
   * The 35% tail at full brightness = reading time where nothing changes
   * even though the user continues scrolling.
   *
   * Total scroll distance = window.innerHeight * 3 (300vh)
   * Reading hold = 35% × 300vh ≈ 105vh of solid readable text.
   */
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: farmSticky,
      start:      'top top',
      end:        `+=${window.innerHeight * 3}`,
      pin:        true,
      pinSpacing: true,
      scrub:      1.8,
      anticipatePin: 1,
    }
  });

  // Words reveal over 0→0.65 of the timeline (normalized to duration 1)
  tl.to(wordEls, {
    color:   'var(--cream)',
    stagger: { each: 0.05 },
    ease:    'none',
    duration: 0.65, // 65% of timeline
  }, 0);

  // Implicit 35% tail: timeline ends at 1.0, words stay cream from 0.65→1.0
  // — no animation needed, this is the reading HOLD
}

/* ==========================================================================
   10. CHAPTER 2 — OUR PRODUCTS  (Left content + right image, 6 products)
   ==========================================================================
   Scroll mapping:
     Each product occupies an equal slice of [0, 1] progress.
     Within each slice:
       0.00 → 0.22  ENTRY  (text and image rise/fade in)
       0.22 → 0.78  HOLD   (56% of slice = reading time)
       0.78 → 1.00  EXIT   (text rises out, next begins entering)

   Scroll distance per product = window.innerHeight × 2.5
   Reading hold per product = 56% × 2.5vh ≈ 1.4 viewport-heights
   ========================================================================== */
function initChapterProducts() {
  const wrapper    = document.getElementById('prod-scroll-wrapper');
  const sticky     = document.querySelector('.prod-sticky');
  const panels     = document.querySelectorAll('.prod-panel');
  const imgWraps   = document.querySelectorAll('.prod-img-wrap');
  const stepNumEl  = document.getElementById('prod-step-num');
  const progFill   = document.getElementById('prod-progress-fill');
  const dots       = document.querySelectorAll('.prod-dot');

  if (!wrapper || panels.length === 0) return;

  const PROD_COUNT = panels.length;

  // --- Mobile: simplified, static panels ---
  if (window.innerWidth <= 900) {
    wrapper.style.height = 'auto';
    sticky.style.position = 'relative';
    sticky.style.height   = 'auto';

    panels.forEach((p, i) => {
      p.style.position     = 'relative';
      p.style.opacity      = '1';
      p.style.pointerEvents = 'auto';
      p.style.transform    = 'none';
    });

    imgWraps.forEach((w, i) => {
      w.style.position = 'relative';
      w.style.inset    = 'auto';
      w.style.opacity  = '1';
    });

    // dot navigation
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        panels.forEach((p, j) => { p.style.display = j === i ? 'flex' : 'none'; });
        imgWraps.forEach((w, j) => { w.style.display = j === i ? 'block' : 'none'; });
        dots.forEach((d, j) => d.classList.toggle('active', j === i));
        updateStepNum(i);
        updateProgressBar(i);
      });
    });

    panels.forEach((p, i) => { p.style.display = i === 0 ? 'flex' : 'none'; });
    imgWraps.forEach((w, i) => { w.style.display = i === 0 ? 'block' : 'none'; });
    return;
  }

  // --- Desktop: scroll-driven ---
  const PER_PROD_H = window.innerHeight * 2.5;
  wrapper.style.height = `${window.innerHeight + PROD_COUNT * PER_PROD_H}px`;

  // Phase thresholds (within each product's 0→1 slice)
  const ENTRY_END = 0.22; // entry complete
  const HOLD_END  = 0.78; // hold ends, exit begins
  // NOTE: next product starts entering during the EXIT phase of current

  // Initial state
  panels.forEach((panel, i) => {
    const imgWrap = imgWraps[i];
    if (i === 0) {
      gsap.set(panel,   { opacity: 1, pointerEvents: 'auto' });
      gsap.set(imgWrap, { opacity: 1, scale: 1 });
      panel.classList.add('active');
      imgWrap?.classList.add('active');
      setElementContent(panel, 1, 0, 1, 0);  // fully visible
    } else {
      gsap.set(panel,   { opacity: 0, pointerEvents: 'none' });
      gsap.set(imgWrap, { opacity: 0, scale: 0.97 });
      setElementContent(panel, 0, 60, 0, 60);  // hidden below
    }
  });

  let lastProductIdx = 0;

  ScrollTrigger.create({
    trigger:    wrapper,
    start:      'top top',
    end:        'bottom bottom',
    onUpdate:   self => {
      const rawIdx     = self.progress * PROD_COUNT;
      const prodIdx    = Math.min(PROD_COUNT - 1, Math.floor(rawIdx));
      const fraction   = rawIdx - prodIdx; // 0 → 1 within this product

      // update step number if product changed
      if (prodIdx !== lastProductIdx) {
        updateStepNum(prodIdx);
        lastProductIdx = prodIdx;
      }

      updateProgressBar(prodIdx);
      updateDots(prodIdx);

      panels.forEach((panel, i) => {
        const imgWrap = imgWraps[i];
        const isLast  = (i === PROD_COUNT - 1);

        if (i < prodIdx) {
          // Fully past — hide
          gsap.set(panel,   { opacity: 0, pointerEvents: 'none' });
          gsap.set(imgWrap, { opacity: 0, scale: 0.96 });
          setElementContent(panel, 0, -40, 0, -40);
          panel.classList.remove('active');
          imgWrap?.classList.remove('active');

        } else if (i === prodIdx) {
          // CURRENT product
          const isLastProd = isLast;
          let pOpacity, imgOpacity, imgScale, contentY, contentOpacity;

          if (fraction < ENTRY_END) {
            // ENTRY phase
            const t = fraction / ENTRY_END;
            const easeT = 1 - Math.pow(1 - t, 3); // cubic ease out
            pOpacity       = easeT;
            imgOpacity     = easeT;
            imgScale       = 0.97 + 0.03 * easeT;
            contentY       = 44 * (1 - easeT);
            contentOpacity = Math.min(1, easeT * 1.4);
          } else if (fraction < HOLD_END || isLastProd) {
            // HOLD phase — everything fully visible, nothing changes
            pOpacity       = 1;
            imgOpacity     = 1;
            imgScale       = 1;
            contentY       = 0;
            contentOpacity = 1;
          } else {
            // EXIT phase
            const exitT   = (fraction - HOLD_END) / (1 - HOLD_END);
            const easeT   = exitT * exitT; // ease in
            pOpacity       = Math.max(0, 1 - easeT * 1.4);
            imgOpacity     = Math.max(0, 1 - easeT * 0.6);
            imgScale       = 1 - easeT * 0.04;
            contentY       = -50 * easeT;
            contentOpacity = Math.max(0, 1 - easeT * 1.5);
          }

          gsap.set(panel,   { opacity: pOpacity,   pointerEvents: pOpacity > 0.1 ? 'auto' : 'none' });
          gsap.set(imgWrap, { opacity: imgOpacity,  scale: imgScale });
          setElementContent(panel, contentOpacity, contentY, contentOpacity, contentY);

          panel.classList.toggle('active',  pOpacity > 0.05);
          imgWrap?.classList.toggle('active', imgOpacity > 0.05);

        } else if (i === prodIdx + 1) {
          // NEXT product — enters DURING the exit phase of current
          const enterZoneStart = HOLD_END;
          let enterOpacity, imgOpacity, imgScale, contentY;

          if (fraction >= enterZoneStart) {
            const enterT  = (fraction - enterZoneStart) / (1 - enterZoneStart);
            const easeT   = 1 - Math.pow(1 - enterT, 2); // ease out
            enterOpacity  = Math.min(1, easeT * 1.3);
            imgOpacity    = Math.min(1, easeT * 0.9);
            imgScale      = 0.97 + 0.03 * easeT;
            contentY      = 56 * (1 - easeT);
          } else {
            enterOpacity  = 0;
            imgOpacity    = 0;
            imgScale      = 0.97;
            contentY      = 56;
          }

          gsap.set(panel,   { opacity: enterOpacity, pointerEvents: enterOpacity > 0.5 ? 'auto' : 'none' });
          gsap.set(imgWrap, { opacity: imgOpacity,   scale: imgScale });
          setElementContent(panel, Math.max(0, enterOpacity - 0.05), contentY, Math.max(0, enterOpacity - 0.1), contentY * 1.1);

          panel.classList.toggle('active',  enterOpacity > 0.05);
          imgWrap?.classList.toggle('active', imgOpacity > 0.05);

        } else {
          // Future — fully hidden
          gsap.set(panel,   { opacity: 0, pointerEvents: 'none' });
          gsap.set(imgWrap, { opacity: 0, scale: 0.97 });
          setElementContent(panel, 0, 56, 0, 70);
          panel.classList.remove('active');
          imgWrap?.classList.remove('active');
        }
      });
    }
  });

  // ---- helpers ----
  function setElementContent(panel, opacity, y, specOpacity, specY) {
    const cat   = panel.querySelector('.prod-cat');
    const title = panel.querySelector('.prod-title');
    const desc  = panel.querySelector('.prod-desc');
    const specs = panel.querySelector('.prod-specs');
    const cta   = panel.querySelector('.prod-cta');

    if (cat)   gsap.set(cat,   { opacity: Math.max(0, opacity),             y: y * 0.6 });
    if (title) gsap.set(title, { opacity: Math.max(0, opacity),             y: y });
    if (desc)  gsap.set(desc,  { opacity: Math.max(0, opacity - 0.05),      y: y * 1.05 });
    if (specs) gsap.set(specs, { opacity: Math.max(0, specOpacity - 0.1),   y: specY });
    if (cta)   gsap.set(cta,   { opacity: Math.max(0, specOpacity - 0.15),  y: specY * 1.1 });
  }

  function updateStepNum(idx) {
    if (!stepNumEl) return;
    gsap.to(stepNumEl, {
      opacity: 0, y: -16, duration: 0.18,
      onComplete: () => {
        stepNumEl.textContent = String(idx + 1).padStart(2, '0');
        gsap.to(stepNumEl, { opacity: 1, y: 0, duration: 0.25 });
      }
    });
  }

  function updateProgressBar(idx) {
    if (!progFill) return;
    const pct = ((idx + 1) / PROD_COUNT) * 100;
    gsap.to(progFill, { height: `${pct}%`, duration: 0.5, ease: 'power2.out' });
  }

  function updateDots(idx) {
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  // Dot clicks
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const wTop   = wrapper.getBoundingClientRect().top + window.scrollY;
      const frac   = i / PROD_COUNT + 0.001; // small offset into the product's range
      const targetY = wTop + frac * (wrapper.offsetHeight - window.innerHeight);
      if (lenis) lenis.scrollTo(targetY, { duration: 1.4 });
      else window.scrollTo({ top: targetY, behavior: 'smooth' });
    });
  });
}

/* ==========================================================================
   11. CHAPTER 3 — THE QUALITY
   ========================================================================== */
function initChapterQuality() {
  // Cert rows reveal
  document.querySelectorAll('.quality-cert').forEach((cert, i) => {
    gsap.to(cert, {
      opacity: 1, x: 0,
      duration: 0.9, ease: 'power3.out', delay: i * 0.12,
      scrollTrigger: { trigger: cert, start: 'top 80%', once: true }
    });
  });

  // Header block
  const hb = document.querySelector('.quality-header-block');
  if (hb) {
    gsap.from(hb, {
      y: 40, opacity: 0, duration: 1.1, ease: 'power3.out',
      scrollTrigger: { trigger: hb, start: 'top 80%', once: true }
    });
  }

  // Industries accordion
  document.querySelectorAll('.industry-row').forEach((row, i) => {
    gsap.from(row, {
      y: 24, opacity: 0, duration: 0.7, ease: 'power3.out', delay: i * 0.08,
      scrollTrigger: { trigger: row, start: 'top 85%', once: true }
    });

    row.addEventListener('click', () => {
      const isActive = row.classList.contains('active');
      document.querySelectorAll('.industry-row').forEach(r => r.classList.remove('active'));
      if (!isActive) row.classList.add('active');
    });
  });
}

/* ==========================================================================
   12. TESTIMONIALS
   ========================================================================== */
function initTestimonials() {
  const slides  = document.querySelectorAll('.testimonial-slide');
  const dots    = document.querySelectorAll('.tdot');
  const prevBtn = document.getElementById('testimonial-prev');
  const nextBtn = document.getElementById('testimonial-next');
  if (!slides.length) return;

  let current = 0;
  let autoTimer;

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    dots[current]?.setAttribute('aria-selected', 'false');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
    dots[current]?.setAttribute('aria-selected', 'true');
  }

  prevBtn?.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
  nextBtn?.addEventListener('click', () => { goTo(current + 1); resetAuto(); });
  dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); resetAuto(); }));

  function startAuto() { autoTimer = setInterval(() => goTo(current + 1), 6500); }
  function resetAuto()  { clearInterval(autoTimer); startAuto(); }
  startAuto();

  gsap.from('.testimonials-inner', {
    y: 50, opacity: 0, duration: 1.2, ease: 'power3.out',
    scrollTrigger: { trigger: '.chapter-testimonials', start: 'top 75%', once: true }
  });
}

/* ==========================================================================
   13. CHAPTER 4 — THE FUTURE
   ========================================================================== */
function initChapterFuture() {
  const words = document.querySelectorAll('.future-word');
  if (!words.length) return;

  gsap.from(words, {
    y: 60, opacity: 0, stagger: 0.08, duration: 1.2, ease: 'power4.out',
    scrollTrigger: { trigger: '.chapter-future', start: 'top 60%', once: true }
  });

  gsap.from('.future-sub', {
    y: 30, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.5,
    scrollTrigger: { trigger: '.chapter-future', start: 'top 60%', once: true }
  });
}

/* ==========================================================================
   14. CHAPTER 5 — CONTACT + FOOTER
   ========================================================================== */
function initChapterContact() {
  gsap.from('.contact-left > *', {
    y: 36, opacity: 0, duration: 1, stagger: 0.12, ease: 'power3.out',
    scrollTrigger: { trigger: '.chapter-contact', start: 'top 70%', once: true }
  });

  gsap.from('.contact-info-block', {
    x: 30, opacity: 0, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: '.chapter-contact', start: 'top 65%', once: true }
  });

  gsap.from('.footer-top > *', {
    y: 28, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out',
    scrollTrigger: { trigger: '.site-footer', start: 'top 85%', once: true }
  });
}

/* ==========================================================================
   15. NAV LINK HIGHLIGHTS
   ========================================================================== */
function initNavHighlight() {
  const navLinks = document.querySelectorAll('.site-nav-link');

  [
    { id: 'chapter-farm',    key: 'farm'     },
    { id: 'chapter-products',key: 'products' },
    { id: 'chapter-quality', key: 'quality'  },
    { id: 'chapter-contact', key: 'contact'  },
  ].forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;
    ScrollTrigger.create({
      trigger: el, start: 'top 55%', end: 'bottom 45%',
      onEnter:     () => setActiveNav(key),
      onEnterBack: () => setActiveNav(key),
    });
  });

  function setActiveNav(key) {
    navLinks.forEach(link => link.classList.toggle('active', link.dataset.section === key));
  }
}

/* ==========================================================================
   16. MOBILE MENU
   ========================================================================== */
function initMobileMenu() {
  const menuBtn    = document.getElementById('mobile-menu-btn');
  const navOverlay = document.getElementById('mobile-nav-overlay');

  menuBtn?.addEventListener('click', () => {
    const isOpen = menuBtn.classList.toggle('open');
    navOverlay?.classList.toggle('open', isOpen);
    menuBtn.setAttribute('aria-expanded', String(isOpen));
    navOverlay?.setAttribute('aria-hidden', String(!isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      menuBtn?.classList.remove('open');
      navOverlay?.classList.remove('open');
      menuBtn?.setAttribute('aria-expanded', 'false');
      navOverlay?.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    });
  });
}

/* ==========================================================================
   17. QUOTE DRAWER
   ========================================================================== */
function initQuoteDrawer() {
  const modal     = document.getElementById('quote-modal');
  const closeBtn  = document.getElementById('close-drawer-btn');
  const form      = document.getElementById('quote-form');
  const submitBtn = document.getElementById('form-submit-btn');
  if (!modal) return;

  const productMap = {
    'humera-sesame':    'humera-sesame',
    'wollega-sesame':   'wollega-sesame',
    'yirgacheffe-coffee':'yirgacheffe-coffee',
    'sidama-coffee':    'sidama-coffee',
    'red-kidney-beans': 'red-kidney-beans',
    'cardamom':         'cardamom',
  };

  function openDrawer(productKey) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (productKey) {
      const select = document.getElementById('commodity-select');
      if (select && productMap[productKey]) select.value = productMap[productKey];
    }
  }

  function closeDrawer() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.open-quote-drawer').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      openDrawer(btn.dataset.product || null);
    });
  });

  document.querySelectorAll('.prod-cta').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      openDrawer(btn.dataset.product || null);
    });
  });

  closeBtn?.addEventListener('click', closeDrawer);
  modal.addEventListener('click', e => { if (e.target === modal) closeDrawer(); });

  form?.addEventListener('submit', e => {
    e.preventDefault();
    const span = submitBtn?.querySelector('span');
    if (!span) return;
    const orig = span.textContent;
    span.textContent = 'Inquiry Submitted ✓';
    if (submitBtn) { submitBtn.style.background = '#2a6e3a'; submitBtn.style.pointerEvents = 'none'; }
    setTimeout(() => {
      closeDrawer();
      form.reset();
      span.textContent = orig;
      if (submitBtn) { submitBtn.style.background = ''; submitBtn.style.pointerEvents = ''; }
    }, 2200);
  });
}

/* ==========================================================================
   18. KEYBOARD
   ========================================================================== */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('quote-modal')?.classList.remove('open');
    document.getElementById('mobile-nav-overlay')?.classList.remove('open');
    document.getElementById('mobile-menu-btn')?.classList.remove('open');
    document.body.style.overflow = '';
  }
});

/* ==========================================================================
   19. INIT ALL
   ========================================================================== */
function initAllSections() {
  initCursor();
  initChapterNav();
  initChapterFarm();
  initChapterProducts();
  initChapterQuality();
  initTestimonials();
  initChapterFuture();
  initChapterContact();
  initNavHighlight();
  initMobileMenu();
  initQuoteDrawer();
  ScrollTrigger.refresh();
}

/* ==========================================================================
   20. BOOTSTRAP
   ========================================================================== */
preloadFrames();
initParticles();
updateHeroScrollState();
animateLoop();

}); // end DOMContentLoaded