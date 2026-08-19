/**
 * ETERNAL IMPEX — CINEMATIC SCROLL-STORY ENGINE v4
 *
 * Hero:     Controlled scrollytelling engine with deliberate pacing (~7 seconds of storytelling).
 *           Captures initial scroll, synchronizes 300 frames with 5 narrative stages,
 *           holds each scene for reading, and releases seamlessly into About Us upon 100% completion.
 *
 * About Us: Pinned scrollytelling section with smooth progressive reveals and reading holds.
 *
 * Products: 10 products showcase matching reference layout (01. number, vertical nav, specs & image).
 */

document.addEventListener('DOMContentLoaded', () => {

/* ==========================================================================
   0. GSAP SETUP
   ========================================================================== */
gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ==========================================================================
   1. HERO SCROLLYTELLING STATE & CONFIG
   ========================================================================== */
let heroProgress       = 0;
let heroProgressTarget = 0;
let heroCompleted      = false;

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

/* ==========================================================================
   2. LENIS SMOOTH SCROLL
   ========================================================================== */
let lenis;

function initLenis() {
  if (prefersReducedMotion) return;

  lenis = new Lenis({
    duration:        1.3,
    easing:          (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel:     true,
    wheelMultiplier: 0.9,
    smoothTouch:     false,
    touchMultiplier: 1.5,
  });

  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  lenis.on('scroll', (e) => {
    ScrollTrigger.update();
    handlePageScroll(e.scroll);
  });
}

/* ==========================================================================
   3. FRAME PRELOADING & CANVAS
   ========================================================================== */
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
  setTimeout(() => { preloader?.classList.add('hidden'); }, 350);
}

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
   4. HERO STORY STAGES TIMELINE (Synchronized with Majestic Pacing)
   ========================================================================== */
const stageRanges = [
  // Scene 1: Initial composition -> Text 1 reveals -> read pause -> fade
  { el: document.getElementById('stage-1'), start: 0.00, end: 0.20, isCenter: true  },
  // Scene 2: Frame transit -> Text 2 reveals -> read pause -> fade
  { el: document.getElementById('stage-2'), start: 0.20, end: 0.40, isCenter: false },
  // Scene 3: Frame transit -> Text 3 reveals -> read pause -> fade
  { el: document.getElementById('stage-3'), start: 0.40, end: 0.60, isCenter: false },
  // Scene 4: Frame transit -> Text 4 reveals -> read pause -> fade
  { el: document.getElementById('stage-4'), start: 0.60, end: 0.80, isCenter: false },
  // Scene 5: Frame transit -> Final statement + CTA -> hold
  { el: document.getElementById('stage-5'), start: 0.80, end: 1.00, isCenter: true  },
];

const FADE_WIN = 0.030;

function updateStoryStages(progress) {
  stageRanges.forEach(stage => {
    if (!stage.el) return;

    if (progress < stage.start || progress > stage.end) {
      const isAfter = progress > stage.end;
      stage.el.style.opacity       = '0';
      stage.el.style.pointerEvents = 'none';
      stage.el.classList.remove('active');
      if (stage.isCenter) {
        stage.el.style.transform = `translateX(-50%) translateY(calc(-50% + ${isAfter ? '-24px' : '30px'}))`;
      } else {
        stage.el.style.transform = `translateY(calc(-50% + ${isAfter ? '-24px' : '30px'}))`;
      }
      return;
    }

    let opacity = 1, ty = 0;

    if (progress < stage.start + FADE_WIN) {
      const t = (progress - stage.start) / FADE_WIN;
      opacity = t;
      ty = 28 * (1 - t);
    } else if (progress > stage.end - FADE_WIN && stage.end < 1.0) {
      const t = (stage.end - progress) / FADE_WIN;
      opacity = t;
      ty = -20 * (1 - t);
    }

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

  // Payoff: Brighten up the final hero presentation (removing vignettes/tint)
  const vignette = document.querySelector('.hero-vignette');
  const atmo     = document.querySelector('.hero-atmo');
  const canvasEl = document.getElementById('hero-canvas');

  if (progress > 0.80) {
    const t = (progress - 0.80) / 0.20; // 0.0 -> 1.0
    if (vignette) vignette.style.opacity = (1.0 - t * 0.92).toFixed(3);
    if (atmo)     atmo.style.opacity     = (1.0 - t * 0.95).toFixed(3);
    if (canvasEl) {
      canvasEl.style.filter = `brightness(${1.0 + t * 0.22}) contrast(${1.0 + t * 0.05})`;
    }
  } else {
    if (vignette) vignette.style.opacity = '1';
    if (atmo)     atmo.style.opacity     = '1';
    if (canvasEl) canvasEl.style.filter  = 'none';
  }
}

/* ==========================================================================
   5. CONTROLLED HERO SCROLL CONTROLLER
   ========================================================================== */
function lockScroll() {
  if (lenis) lenis.stop();
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
}

function unlockScroll() {
  if (lenis) lenis.start();
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}

function resetHeroScrollytelling() {
  heroCompleted = false;
  heroProgress = 0;
  heroProgressTarget = 0;
  frameState.current = 0;
  frameState.target = 0;
  
  if (scrollThumb) scrollThumb.style.width = '0%';
  
  updateStoryStages(0);
  renderFrame(0);
  
  if (exitVeil) exitVeil.style.opacity = '0';
  
  const vignette = document.querySelector('.hero-vignette');
  const atmo     = document.querySelector('.hero-atmo');
  const canvasEl = document.getElementById('hero-canvas');
  if (vignette) vignette.style.opacity = '1';
  if (atmo)     atmo.style.opacity     = '1';
  if (canvasEl) canvasEl.style.filter  = 'none';

  lockScroll();
}

function initHeroScrollytelling() {
  // Bind clickable logo reset & scroll to top
  const logoBtn = document.querySelector('.site-logo');
  if (logoBtn) {
    logoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resetHeroScrollytelling();
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.4 });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  if (prefersReducedMotion) {
    heroCompleted = true;
    heroProgress = 1;
    heroProgressTarget = 1;
    updateStoryStages(1);
    renderFrame(TOTAL_FRAMES - 1);
    return;
  }

  // Initial scroll lock on load
  if (window.scrollY <= 4) {
    lockScroll();
  }

  // Wheel listener: controls hero progress when at top of page (slow, deliberate)
  window.addEventListener('wheel', (e) => {
    const atTop = window.scrollY <= 4;

    if (!heroCompleted) {
      // Locked state: wheel increments/decrements hero story
      e.preventDefault();
      const step = Math.min(0.012, Math.max(0.0015, Math.abs(e.deltaY) * 0.00008));
      
      if (e.deltaY > 0) {
        heroProgressTarget = Math.min(1.0, heroProgressTarget + step);
      } else {
        heroProgressTarget = Math.max(0.0, heroProgressTarget - step);
      }
      return;
    }

    // Completed state: if at top and scrolling UP, re-lock and reverse
    if (atTop && e.deltaY < 0) {
      e.preventDefault();
      heroCompleted = false;
      lockScroll();
      const step = Math.min(0.012, Math.max(0.0015, Math.abs(e.deltaY) * 0.00008));
      heroProgressTarget = Math.max(0.0, 1.0 - step);
    }
  }, { passive: false });

  // Touch listener for mobile gestures
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    const atTop = window.scrollY <= 4;
    const currentY = e.touches[0].clientY;
    const deltaY = touchStartY - currentY; // positive is swipe up (scroll down)

    if (!heroCompleted) {
      e.preventDefault();
      const step = Math.min(0.016, Math.abs(deltaY) * 0.00022);
      if (deltaY > 0) {
        heroProgressTarget = Math.min(1.0, heroProgressTarget + step);
      } else {
        heroProgressTarget = Math.max(0.0, heroProgressTarget - step);
      }
      touchStartY = currentY;
      return;
    }

    if (atTop && deltaY < 0) {
      e.preventDefault();
      heroCompleted = false;
      lockScroll();
      const step = Math.min(0.016, Math.abs(deltaY) * 0.00022);
      heroProgressTarget = Math.max(0.0, 1.0 - step);
      touchStartY = currentY;
    }
  }, { passive: false });

  // Keyboard navigation support
  window.addEventListener('keydown', (e) => {
    const atTop = window.scrollY <= 4;
    
    if (!heroCompleted) {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        heroProgressTarget = Math.min(1.0, heroProgressTarget + 0.022);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        heroProgressTarget = Math.max(0.0, heroProgressTarget - 0.022);
      }
      return;
    }

    if (atTop && (e.key === 'ArrowUp' || e.key === 'PageUp')) {
      e.preventDefault();
      heroCompleted = false;
      lockScroll();
      heroProgressTarget = Math.max(0.0, 1.0 - 0.022);
    }
  });
}

function handlePageScroll(scrollY) {
  if (scrollY > 60) headerEl?.classList.add('scrolled');
  else headerEl?.classList.remove('scrolled');
}

/* ==========================================================================
   6. ANIMATION LERP LOOP
   ========================================================================== */
function animateLoop() {
  // Lerp Hero story progress smoothly
  const heroDiff = heroProgressTarget - heroProgress;
  if (Math.abs(heroDiff) > 0.0005) {
    heroProgress += heroDiff * 0.075;
    
    // Sync canvas frames directly with hero progress
    frameState.target = heroProgress * (TOTAL_FRAMES - 1);
    
    if (scrollThumb) scrollThumb.style.width = `${heroProgress * 100}%`;
    updateStoryStages(heroProgress);
  }

  // Lerp Canvas frame rendering
  const frameDiff = frameState.target - frameState.current;
  if (Math.abs(frameDiff) > 0.01) {
    frameState.current += frameDiff * 0.10;
    renderFrame(Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(frameState.current))));
  }

  // Check if hero has reached final frame and unlock scrolling
  const isFinished = (heroProgressTarget >= 1.0 && heroProgress >= 0.99 && Math.round(frameState.current) >= TOTAL_FRAMES - 1);
  if (isFinished && !heroCompleted) {
    heroCompleted = true;
    unlockScroll();
  }

  updateParticles();
  requestAnimationFrame(animateLoop);
}

/* ==========================================================================
   7. AMBIENT PARTICLES
   ========================================================================== */
const particles      = [];
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
   8. CUSTOM CURSOR
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

  document.querySelectorAll('button, a, .industry-row, .quality-cert, .testimonial-btn, .prod-menu-btn').forEach(el => {
    el.addEventListener('mouseenter', () => cursorEl.classList.add('is-hovering'));
    el.addEventListener('mouseleave', () => cursorEl.classList.remove('is-hovering'));
  });
}

/* ==========================================================================
   9. CHAPTER PROGRESS NAV
   ========================================================================== */
function initChapterNav() {
  const chapterNav = document.getElementById('chapter-nav');
  const navItems   = document.querySelectorAll('.chapter-nav-item');
  const navBtns    = document.querySelectorAll('.chapter-nav-btn');
  if (!chapterNav) return;

  ScrollTrigger.create({
    trigger: '#chapter-farm',
    start: 'top 80%',
    onEnter:     () => chapterNav.classList.add('visible'),
    onLeaveBack: () => chapterNav.classList.remove('visible'),
  });

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (!target) return;
      
      // Auto complete hero if jumping forward
      heroCompleted = true;
      heroProgressTarget = 1;
      heroProgress = 1;

      const el = document.querySelector(target);
      if (!el) return;
      lenis ? lenis.scrollTo(el, { offset: 0, duration: 1.3 }) : el.scrollIntoView({ behavior: 'smooth' });
    });
  });

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
   10. CHAPTER 1 — ABOUT US SCROLLYTELLING
   ========================================================================== */
function initChapterFarm() {
  const aboutText    = document.getElementById('about-reveal-text');
  const aboutHeadline= document.getElementById('about-headline');
  const aboutPillars = document.getElementById('about-pillars');
  const farmSticky   = document.getElementById('chapter-farm-sticky');
  if (!aboutText || !farmSticky || prefersReducedMotion) return;

  const words = aboutText.textContent.trim().split(/\s+/);
  aboutText.innerHTML = words.map(w => `<span class="word">${w}</span>`).join(' ');
  const wordEls = aboutText.querySelectorAll('.word');

  gsap.set(wordEls, { color: 'rgba(244, 237, 216, 0.2)' });
  gsap.set(aboutHeadline, { opacity: 0.25, y: 15 });
  gsap.set(aboutPillars,  { opacity: 0.15, y: 24 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: farmSticky,
      start:         'top top',
      end:           `+=${window.innerHeight * 2.4}`,
      pin:           true,
      pinSpacing:    true,
      scrub:         1.2,
      anticipatePin: 1,
    }
  });

  // 1. Headline rises and illuminates
  tl.to(aboutHeadline, {
    opacity: 1,
    y: 0,
    duration: 0.2,
    ease: 'power1.out',
  }, 0);

  // 2. Story text words illuminate sequentially
  tl.to(wordEls, {
    color: '#F4EDD8',
    stagger: { each: 0.03 },
    ease: 'none',
    duration: 0.55,
  }, 0.08);

  // 3. Supporting capability pillars rise into view
  tl.to(aboutPillars, {
    opacity: 1,
    y: 0,
    duration: 0.25,
    ease: 'power2.out',
  }, 0.5);

  // 4. Reading hold from 0.75 -> 1.0 before releasing into products
}/* ==========================================================================
   11. CHAPTER 2 — OUR PRODUCTS: Sequenced Editorial Visual Story
   Sequence: First image changes -> Then description reveals -> Reading hold
   ========================================================================== */
function initChapterProducts() {
  const wrapper     = document.getElementById('prod-scroll-wrapper');
  const sticky      = document.querySelector('.prod-sticky');
  const panels      = document.querySelectorAll('.prod-panel');
  const imgWraps    = document.querySelectorAll('.prod-img-wrap');
  const hugeNumEl   = document.getElementById('prod-huge-num');
  const menuList    = document.querySelector('.prod-menu');
  const menuItems   = document.querySelectorAll('.prod-menu-item');
  const menuBtns    = document.querySelectorAll('.prod-menu-btn');

  if (!sticky || panels.length === 0) return;

  const PROD_COUNT = panels.length;

  // Mobile layout fallback
  if (window.innerWidth <= 960) {
    panels.forEach((p, i) => {
      p.style.display = i === 0 ? 'flex' : 'none';
      p.style.opacity = '1';
      p.style.position = 'relative';
    });

    imgWraps.forEach((w, i) => {
      w.style.display = i === 0 ? 'flex' : 'none';
      w.style.opacity = '1';
    });

    menuBtns.forEach((btn, i) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveProduct(i);
      });
    });

    function setActiveProduct(idx) {
      panels.forEach((p, j) => { p.style.display = j === idx ? 'flex' : 'none'; });
      imgWraps.forEach((w, j) => { w.style.display = j === idx ? 'flex' : 'none'; });
      menuItems.forEach((m, j) => m.classList.toggle('active', j === idx));
      if (hugeNumEl) hugeNumEl.textContent = `${String(idx + 1).padStart(2, '0')}.`;
    }
    return;
  }

  // Desktop: GSAP Pinned Scrollytelling
  const pinDist = PROD_COUNT * window.innerHeight * 2.2;

  // Sequenced Timing Thresholds within each product slice (0.0 -> 1.0)
  // 1. 0.00 -> 0.22 : Image transitions in first
  // 2. 0.22 -> 0.45 : Description animates in second
  // 3. 0.45 -> 0.85 : Reading hold (both image & text settled)
  // 4. 0.85 -> 1.00 : Exit phase
  const IMG_ENTRY_END  = 0.22;
  const TEXT_ENTRY_END = 0.45;
  const HOLD_END       = 0.85;

  // Set initial product state
  panels.forEach((panel, i) => {
    const imgWrap  = imgWraps[i];
    const imgInner = imgWrap?.querySelector('.prod-img-inner');

    if (i === 0) {
      gsap.set(panel,    { opacity: 1, pointerEvents: 'auto' });
      gsap.set(imgWrap,  { opacity: 1 });
      if (imgInner) gsap.set(imgInner, { scale: 1, y: 0 });
      panel.classList.add('active');
      imgWrap?.classList.add('active');
      setProductContent(panel, 1, 0);
    } else {
      gsap.set(panel,    { opacity: 0, pointerEvents: 'none' });
      gsap.set(imgWrap,  { opacity: 0 });
      if (imgInner) gsap.set(imgInner, { scale: 0.93, y: 40 });
      setProductContent(panel, 0, 40);
    }
  });

  let lastActiveIdx = 0;

  const prodST = ScrollTrigger.create({
    trigger:       sticky,
    start:         'top top',
    end:           `+=${pinDist}`,
    pin:           true,
    pinSpacing:    true,
    scrub:         1.2,
    anticipatePin: 1,
    onUpdate:      self => {
      // Map global progress 0.0 -> 1.0 to product range 0.0 -> 3.0
      const globalProgress = self.progress * (PROD_COUNT - 1);
      const prodIdx  = Math.min(PROD_COUNT - 1, Math.floor(globalProgress));
      const fraction = globalProgress - prodIdx; // 0.0 -> 1.0 within active slice

      // Sync menu and huge numbers exactly with description transition midpoint (0.38)
      const textActiveIdx = fraction >= 0.38 ? Math.min(PROD_COUNT - 1, prodIdx + 1) : prodIdx;
      if (textActiveIdx !== lastActiveIdx) {
        updateHugeNum(textActiveIdx);
        updateActiveMenu(textActiveIdx);
        lastActiveIdx = textActiveIdx;
      }

      panels.forEach((panel, i) => {
        const imgWrap  = imgWraps[i];
        const imgInner = imgWrap?.querySelector('.prod-img-inner');

        // 1. IMAGE SHOWCASE: Direct, continuous cross-fade and parallax slide
        const diff = i - globalProgress;
        const absDiff = Math.abs(diff);
        
        let imgOpacity = 0;
        if (absDiff < 1.0) {
          const t = 1.0 - absDiff;
          imgOpacity = t * t * (3 - 2 * t); // Smooth cubic ease
        }
        
        const tScale = Math.min(1.0, absDiff);
        const imgScale = diff > 0 ? (0.93 + 0.07 * (1.0 - tScale)) : (1.0 + 0.05 * tScale);
        const imgY = diff * 45;

        gsap.set(imgWrap, { opacity: imgOpacity });
        if (imgInner) {
          gsap.set(imgInner, { scale: imgScale, y: imgY });
        }

        // 2. DESCRIPTION TEXT PANELS: Delayed stagger transition after image starts
        let textOpacity = 0;
        let textY = 35;

        if (i === prodIdx) {
          if (fraction < 0.20) {
            textOpacity = 1.0;
            textY = 0;
          } else if (fraction < 0.55) {
            const t = (fraction - 0.20) / 0.35;
            textOpacity = 1.0 - t;
            textY = -35 * t;
          } else {
            textOpacity = 0.0;
            textY = -35;
          }
        } else if (i === prodIdx + 1) {
          if (fraction < 0.20) {
            textOpacity = 0.0;
            textY = 35;
          } else if (fraction < 0.55) {
            const t = (fraction - 0.20) / 0.35;
            textOpacity = t;
            textY = 35 * (1.0 - t);
          } else {
            textOpacity = 1.0;
            textY = 0;
          }
        } else {
          textOpacity = 0.0;
          textY = i < prodIdx ? -35 : 35;
        }

        gsap.set(panel, { opacity: textOpacity, pointerEvents: textOpacity > 0.1 ? 'auto' : 'none' });
        setProductContent(panel, textOpacity, textY);

        panel.classList.toggle('active', textOpacity > 0.05);
        imgWrap?.classList.toggle('active', imgOpacity > 0.05);
      });
    }
  });

  // Staggered child element animation helper for editorial typography
  function setProductContent(panel, opacity, y) {
    const cat   = panel.querySelector('.prod-cat-tag');
    const title = panel.querySelector('.prod-main-title');
    const desc  = panel.querySelector('.prod-short-desc');
    const specs = panel.querySelector('.prod-mini-specs');
    const cta   = panel.querySelector('.prod-cta');

    if (cat)   gsap.set(cat,   { opacity: Math.max(0, opacity),        y: y * 0.6 });
    if (title) gsap.set(title, { opacity: Math.max(0, opacity),        y: y * 0.9 });
    if (desc)  gsap.set(desc,  { opacity: Math.max(0, opacity - 0.05), y: y * 1.1 });
    if (specs) gsap.set(specs, { opacity: Math.max(0, opacity - 0.1),  y: y * 1.18 });
    if (cta)   gsap.set(cta,   { opacity: Math.max(0, opacity - 0.15), y: y * 1.25 });
  }

  function updateHugeNum(idx) {
    if (!hugeNumEl) return;
    gsap.to(hugeNumEl, {
      opacity: 0, y: -12, duration: 0.15,
      onComplete: () => {
        hugeNumEl.textContent = `${String(idx + 1).padStart(2, '0')}.`;
        gsap.to(hugeNumEl, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' });
      }
    });
  }

  function updateActiveMenu(idx) {
    menuItems.forEach((item, i) => {
      item.classList.toggle('active', i === idx);
    });

    if (menuList && menuItems[idx]) {
      const activeEl = menuItems[idx];
      const offsetTop = activeEl.offsetTop - menuList.offsetTop - 30;
      menuList.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }
  }

  // Click on any product name in vertical menu to jump directly to it
  menuBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetIdx = parseInt(btn.dataset.prodTarget, 10);
      if (isNaN(targetIdx)) return;

      const targetScroll = prodST.start + (targetIdx / PROD_COUNT + 0.02) * pinDist;

      if (lenis) lenis.scrollTo(targetScroll, { duration: 1.3 });
      else window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    });
  });
}

/* ==========================================================================
   12. CHAPTER 3 — THE QUALITY
   ========================================================================== */
function initChapterQuality() {
  document.querySelectorAll('.quality-cert').forEach((cert, i) => {
    gsap.to(cert, {
      opacity: 1, x: 0,
      duration: 0.9, ease: 'power3.out', delay: i * 0.1,
      scrollTrigger: { trigger: cert, start: 'top 80%', once: true }
    });
  });

  const hb = document.querySelector('.quality-header-block');
  if (hb) {
    gsap.from(hb, {
      y: 40, opacity: 0, duration: 1.1, ease: 'power3.out',
      scrollTrigger: { trigger: hb, start: 'top 80%', once: true }
    });
  }

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
   13. TESTIMONIALS
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
   14. CHAPTER 4 — THE FUTURE
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
   15. CHAPTER 5 — CONTACT + FOOTER
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
   16. NAV LINK HIGHLIGHTS & AUTO-HERO COMPLETION
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

  // If user clicks a nav link from hero, complete hero and scroll smoothly
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (!targetEl) return;

      e.preventDefault();
      heroCompleted = true;
      heroProgressTarget = 1;
      heroProgress = 1;
      
      updateStoryStages(1);
      renderFrame(TOTAL_FRAMES - 1);
      unlockScroll();

      lenis ? lenis.scrollTo(targetEl, { duration: 1.3 }) : targetEl.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

/* ==========================================================================
   17. MOBILE MENU
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
   18. QUOTE DRAWER
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
    'white-pea-beans':  'white-pea-beans',
    'cardamom':         'cardamom',
    'black-cumin':      'black-cumin',
    'ginger-turmeric':  'ginger-turmeric',
    'soybeans':         'soybeans',
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
   19. KEYBOARD
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
   20. INIT ALL
   ========================================================================== */
function initAllSections() {
  initHeroScrollytelling();
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
   21. BOOTSTRAP
   ========================================================================== */
preloadFrames();
initParticles();
updateStoryStages(0);
animateLoop();

}); // end DOMContentLoaded