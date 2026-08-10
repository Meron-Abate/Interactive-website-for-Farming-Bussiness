/**
 * ETERNAL IMPEX - SCROLLYTELLING & INTERACTIVE ENGINE
 * Pure Vanilla JavaScript (ES6+)
 */

document.addEventListener('DOMContentLoaded', () => {
  /* ==========================================================================
     1. CONFIG & STATE MANAGEMENT
     ========================================================================== */
  const TOTAL_FRAMES = 300;
  const FRAME_DIR = './frames/';
  const images = [];
  const frameState = {
    loaded: 0,
    current: 0,
    target: 0,
    ready: false
  };

  // Canvas elements
  const heroCanvas = document.getElementById('hero-canvas');
  const heroCtx = heroCanvas ? heroCanvas.getContext('2d') : null;
  const particlesCanvas = document.getElementById('particles-canvas');
  const particlesCtx = particlesCanvas ? particlesCanvas.getContext('2d') : null;
  
  // UI Elements
  const preloader = document.getElementById('preloader');
  const progressBar = document.getElementById('preloader-bar');
  const preloaderStatus = document.getElementById('preloader-status');
  const navbar = document.getElementById('navbar');
  const heroWrapper = document.getElementById('hero');
  const scrollThumb = document.getElementById('scroll-thumb');

  /* ==========================================================================
     2. FRAME PRELOADER
     ========================================================================== */
  function getFramePath(index) {
    const frameNum = String(index + 1).padStart(3, '0');
    return `${FRAME_DIR}ezgif-frame-${frameNum}.jpg`;
  }

  function preloadFrames() {
    let loadedCount = 0;

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      
      img.onload = () => {
        loadedCount++;
        frameState.loaded = loadedCount;
        const progress = Math.round((loadedCount / TOTAL_FRAMES) * 100);
        
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (preloaderStatus) preloaderStatus.textContent = `Loading Agricultural Journey... ${progress}%`;

        // Render first frame as soon as it loads
        if (i === 0 && heroCtx) {
          resizeHeroCanvas();
          renderFrame(0);
        }

        // Unlock view smoothly after initial batch of frames loads
        if (loadedCount >= 15 && !frameState.ready) {
          frameState.ready = true;
          if (preloader) preloader.classList.add('hidden');
          resizeHeroCanvas();
          updateScrollState();
        }

        // Hide preloader when all frames are ready
        if (loadedCount === TOTAL_FRAMES && preloader) {
          preloader.classList.add('hidden');
        }
      };

      img.onerror = () => {
        loadedCount++;
        if (loadedCount >= 15 && !frameState.ready) {
          frameState.ready = true;
          if (preloader) preloader.classList.add('hidden');
        }
      };

      images.push(img);
    }
  }

  /* ==========================================================================
     3. HIGH DPI CANVAS RENDERER & COVER MATH
     ========================================================================== */
  function resizeHeroCanvas() {
    if (!heroCanvas || !heroCtx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    heroCanvas.width = width * dpr;
    heroCanvas.height = height * dpr;
    heroCanvas.style.width = `${width}px`;
    heroCanvas.style.height = `${height}px`;

    heroCtx.scale(dpr, dpr);
    renderFrame(Math.round(frameState.current));
  }

  function renderFrame(index) {
    if (!heroCtx) return;

    let img = images[index];
    if (!img || !img.complete) {
      // Fallback to nearest loaded frame to prevent stutter
      let closest = -1;
      let minDiff = Infinity;
      for (let i = 0; i < images.length; i++) {
        if (images[i] && images[i].complete) {
          const diff = Math.abs(i - index);
          if (diff < minDiff) {
            minDiff = diff;
            closest = i;
          }
        }
      }
      if (closest !== -1) {
        img = images[closest];
      } else {
        return;
      }
    }

    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    const imgWidth = img.naturalWidth || 1920;
    const imgHeight = img.naturalHeight || 1080;

    // Calculate aspect ratio cover fit
    const imgRatio = imgWidth / imgHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
      offsetX = 0;
      offsetY = (canvasHeight - drawHeight) / 2;
    } else {
      drawWidth = canvasHeight * imgRatio;
      drawHeight = canvasHeight;
      offsetX = (canvasWidth - drawWidth) / 2;
      offsetY = 0;
    }

    heroCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    heroCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }

  window.addEventListener('resize', () => {
    resizeHeroCanvas();
    resizeParticlesCanvas();
  });

  /* ==========================================================================
     4. LERP SCROLL ANIMATION ENGINE (60 FPS)
     ========================================================================== */
  function updateScrollState() {
    if (!heroWrapper) return;

    const rect = heroWrapper.getBoundingClientRect();
    const scrollDistance = heroWrapper.offsetHeight - window.innerHeight;
    
    // Calculate 0 to 1 scroll ratio through hero
    let progress = -rect.top / scrollDistance;
    progress = Math.max(0, Math.min(1, progress));

    // Update target frame index
    frameState.target = progress * (TOTAL_FRAMES - 1);

    // Update progress bar at bottom of hero
    if (scrollThumb) {
      scrollThumb.style.width = `${progress * 100}%`;
    }

    // Sync narrative cards
    updateStoryStage(progress);

    // Sticky nav backdrop toggle
    if (window.scrollY > 80) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  }

  function animateLoop() {
    // Smooth lerp frame interpolation
    const diff = frameState.target - frameState.current;
    if (Math.abs(diff) > 0.01) {
      frameState.current += diff * 0.12;
      const frameIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(frameState.current)));
      renderFrame(frameIndex);
    }

    // Update ambient particles
    updateParticles();
    
    requestAnimationFrame(animateLoop);
  }

  window.addEventListener('scroll', updateScrollState, { passive: true });

  /* ==========================================================================
     5. STORYTELLING STAGES SYNCHRONIZATION
     ========================================================================== */
  const stageRanges = [
    { el: document.getElementById('stage-1'), start: 0.00, end: 0.18 }, // 0 - 18% (Intro)
    { el: document.getElementById('stage-2'), start: 0.20, end: 0.38 }, // 20 - 38% (Quality Sourcing - Left)
    { el: document.getElementById('stage-3'), start: 0.40, end: 0.62 }, // 40 - 62% (Farmer Cooperatives - Right)
    { el: document.getElementById('stage-4'), start: 0.65, end: 0.83 }, // 65 - 83% (Global Scale - Left)
    { el: document.getElementById('stage-5'), start: 0.85, end: 1.00 }  // 85 - 100% (Final Reveal - Center)
  ];

  function updateStoryStage(progress) {
    const fadeInWindow = 0.04;
    const fadeOutWindow = 0.04;

    stageRanges.forEach(stage => {
      if (!stage.el) return;

      if (progress < stage.start || progress > stage.end) {
        stage.el.style.opacity = '0';
        stage.el.style.transform = 'translateY(30px)';
        stage.el.style.pointerEvents = 'none';
        stage.el.classList.remove('active');
        return;
      }

      let opacity = 1;
      let translateY = 0;

      if (progress < stage.start + fadeInWindow) {
        const t = (progress - stage.start) / fadeInWindow;
        opacity = t;
        translateY = 30 * (1 - t);
      } else if (progress > stage.end - fadeOutWindow) {
        const t = (stage.end - progress) / fadeOutWindow;
        opacity = t;
        translateY = -30 * (1 - t);
      }

      stage.el.style.opacity = opacity.toFixed(3);
      stage.el.style.transform = `translateY(${translateY.toFixed(1)}px)`;
      stage.el.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
      if (opacity > 0.1) {
        stage.el.classList.add('active');
      } else {
        stage.el.classList.remove('active');
      }
    });
  }

  /* ==========================================================================
     6. AMBIENT GOLD DUST & ORGANIC PARTICLES CANVAS
     ========================================================================== */
  const particles = [];
  const PARTICLE_COUNT = 45;

  function resizeParticlesCanvas() {
    if (!particlesCanvas || !particlesCtx) return;
    particlesCanvas.width = window.innerWidth;
    particlesCanvas.height = window.innerHeight;
  }

  function initParticles() {
    resizeParticlesCanvas();
    particles.length = 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 2 + 0.8,
        color: Math.random() > 0.4 ? '#D9A441' : '#5FAF3A',
        alpha: Math.random() * 0.5 + 0.2,
        speedY: -(Math.random() * 0.4 + 0.1),
        speedX: (Math.random() - 0.5) * 0.3
      });
    }
  }

  function updateParticles() {
    if (!particlesCtx || !particlesCanvas) return;

    particlesCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);

    particles.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;

      if (p.y < 0) {
        p.y = particlesCanvas.height + 10;
        p.x = Math.random() * particlesCanvas.width;
      }

      particlesCtx.beginPath();
      particlesCtx.arc(p.x, p.y, p.radius, 0, Math.max(Math.PI * 2, 0));
      particlesCtx.fillStyle = p.color;
      particlesCtx.globalAlpha = p.alpha;
      particlesCtx.shadowBlur = 10;
      particlesCtx.shadowColor = p.color;
      particlesCtx.fill();
    });

    particlesCtx.globalAlpha = 1.0;
  }

  /* ==========================================================================
     7. FEATURED PRODUCTS EXPLORER & MODAL SPECS
     ========================================================================== */
  const productData = [
    {
      id: 'sesame-humera',
      category: 'sesame',
      title: 'Humera White Sesame Seeds',
      desc: 'World-renowned Ethiopian natural white sesame seeds known for superior oil content (50-54%), sweet flavor, and uniform seed size.',
      img: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=600&q=80',
      purity: '99.5% Min',
      moisture: '6% Max',
      admixture: '0.5% Max',
      cropYear: 'Current Harvest',
      origin: 'Humera, Tigray Region',
      packing: '50kg PP Bags / 25kg Kraft Paper',
      port: 'Port of Djibouti (FOB/CIF)',
      application: 'Tahini, Confectionery, Bakery, Gourmet Oil Extraction'
    },
    {
      id: 'sesame-wollega',
      category: 'sesame',
      title: 'Wollega Type Sesame Seeds',
      desc: 'High-grade Ethiopian sesame seeds harvested from the western fertile lands, offering exceptional oil yield and nutty aroma.',
      img: 'https://images.unsplash.com/photo-1509358271058-acd05cc93280?auto=format&fit=crop&w=600&q=80',
      purity: '99% Min',
      moisture: '6% Max',
      admixture: '1% Max',
      cropYear: 'Current Harvest',
      origin: 'Wollega, Oromia Region',
      packing: '50kg Jute Bags',
      port: 'Port of Djibouti',
      application: 'Industrial Vegetable Oil Crushing, Halva'
    },
    {
      id: 'coffee-yirgacheffe',
      category: 'coffee',
      title: 'Yirgacheffe Grade 1 Specialty Coffee',
      desc: 'Washed Arabica specialty coffee featuring distinct delicate floral notes of jasmine, vibrant citrus acidity, and silky body.',
      img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
      purity: 'Grade 1 Specialty',
      moisture: '11.5% Max',
      admixture: 'Zero Defects',
      cropYear: 'Current Harvest',
      origin: 'Gedeo Zone, Southern Ethiopia',
      packing: '60kg GrainPro + Jute Bags',
      port: 'Port of Djibouti (Air/Sea Freight)',
      application: 'Specialty Roasters, Single-Origin Espresso'
    },
    {
      id: 'coffee-sidama',
      category: 'coffee',
      title: 'Sidama Natural Arabica Coffee',
      desc: 'Sun-dried natural processed coffee offering rich bergamot citrus, ripe berry sweetness, and full velvety body.',
      img: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80',
      purity: 'Grade 2 Export',
      moisture: '11% Max',
      admixture: 'Zero Defects',
      cropYear: 'Current Harvest',
      origin: 'Sidama Region',
      packing: '60kg Jute Bags with Ecotact Liner',
      port: 'Port of Djibouti',
      application: 'Espresso Blends, Commercial Premium Coffee'
    },
    {
      id: 'pulses-kidney-beans',
      category: 'pulses',
      title: 'Red Kidney Beans (Dark/Light)',
      desc: 'Machine cleaned, glossy red kidney beans packed with dietary fiber and vegetable protein. Sourced directly from verified growers.',
      img: 'https://images.unsplash.com/photo-1551462147-37885acc36f1?auto=format&fit=crop&w=600&q=80',
      purity: '98% Min',
      moisture: '12% Max',
      admixture: '0.5% Max',
      cropYear: 'Current Harvest',
      origin: 'Rift Valley, Ethiopia',
      packing: '50kg PP Bags',
      port: 'Port of Djibouti',
      application: 'Canned Food Manufacturers, Retail Packaging'
    },
    {
      id: 'spices-cardamom',
      category: 'spices',
      title: 'Ethiopian Black Cardamom (Korarima)',
      desc: 'Indigenous wild-harvested Ethiopian spice known as false cardamom, delivering intensely aromatic camphoraceous and eucalyptus notes.',
      img: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
      purity: '98% Min',
      moisture: '10% Max',
      admixture: '1% Max',
      cropYear: 'Current Harvest',
      origin: 'Kaffa Highlands',
      packing: '25kg Bags',
      port: 'Port of Djibouti / Air Freight',
      application: 'Essential Oils, Gourmet Spice Blends, Nutraceuticals'
    }
  ];

  const productsGrid = document.getElementById('products-grid');
  const filterBtns = document.querySelectorAll('.filter-btn');

  function renderProducts(filter = 'all') {
    if (!productsGrid) return;

    const filtered = filter === 'all' 
      ? productData 
      : productData.filter(p => p.category === filter);

    productsGrid.innerHTML = filtered.map(p => `
      <div class="product-card" data-category="${p.category}">
        <div class="product-image-wrap">
          <img src="${p.img}" alt="${p.title}" class="product-img" loading="lazy" />
          <span class="product-category-badge">${p.category}</span>
        </div>
        <div class="product-content">
          <h3 class="product-title">${p.title}</h3>
          <p class="product-desc">${p.desc}</p>
          <div class="product-specs-preview">
            <div class="spec-item">
              <span class="spec-label">Purity</span>
              <span class="spec-val">${p.purity}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Moisture</span>
              <span class="spec-val">${p.moisture}</span>
            </div>
          </div>
          <button class="btn-product-details" data-id="${p.id}">
            View Export Specifications
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    // Attach modal open handlers
    document.querySelectorAll('.btn-product-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openProductModal(id);
      });
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      renderProducts(e.target.getAttribute('data-filter'));
    });
  });

  renderProducts();

  // Product Modal
  const productModalBackdrop = document.getElementById('product-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  function openProductModal(id) {
    const item = productData.find(p => p.id === id);
    if (!item || !productModalBackdrop) return;

    document.getElementById('modal-title').textContent = item.title;
    document.getElementById('modal-img').src = item.img;
    document.getElementById('modal-desc').textContent = item.desc;
    document.getElementById('modal-purity').textContent = item.purity;
    document.getElementById('modal-moisture').textContent = item.moisture;
    document.getElementById('modal-origin').textContent = item.origin;
    document.getElementById('modal-packing').textContent = item.packing;
    document.getElementById('modal-port').textContent = item.port;
    document.getElementById('modal-app').textContent = item.application;

    productModalBackdrop.classList.add('open');
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      productModalBackdrop?.classList.remove('open');
    });
  }

  productModalBackdrop?.addEventListener('click', (e) => {
    if (e.target === productModalBackdrop) {
      productModalBackdrop.classList.remove('open');
    }
  });

  /* ==========================================================================
     8. GLOBAL SUPPLY CHAIN STEPPER
     ========================================================================== */
  const supplySteps = [
    {
      title: '1. Direct Farmer Co-op Sourcing',
      desc: 'Partnering directly with over 25,000 verified smallholder farmers across Oromia, Amhara, SNNPR, and Tigray regions to ensure sustainable agricultural practices, fair trade prices, and traceably sourced crops.',
      metrics: [
        { label: 'Farmer Network', val: '25,000+' },
        { label: 'Cooperative Hubs', val: '140 Centers' }
      ],
      svgIcon: '<svg viewBox="0 0 100 100" fill="none" stroke="#D9A441" stroke-width="3"><circle cx="50" cy="30" r="18"/><path d="M20 80 C 20 55, 80 55, 80 80"/></svg>'
    },
    {
      title: '2. Regional Collection & Sorting Centers',
      desc: 'Harvested commodities are immediately routed to our strategically positioned regional collection hubs for primary cleaning, moisture analysis, and batch testing under controlled storage conditions.',
      metrics: [
        { label: 'Collection Centers', val: '12 Hubs' },
        { label: 'Daily Processing', val: '850 MT' }
      ],
      svgIcon: '<svg viewBox="0 0 100 100" fill="none" stroke="#5FAF3A" stroke-width="3"><path d="M10 80 L50 20 L90 80 Z"/><rect x="35" y="55" width="30" height="25" fill="#5FAF3A" opacity="0.3"/></svg>'
    },
    {
      title: '3. High-Tech Cleaning & Gravity Sorting',
      desc: 'Equipped with state-of-the-art Buhler optical color sorters, air screen cleaners, destoners, and magnetic separators to guarantee 99.5%+ purity on all export seed shipments.',
      metrics: [
        { label: 'Sorting Precision', val: '99.5%+' },
        { label: 'Optical Sorter', val: 'Buhler Sortex' }
      ],
      svgIcon: '<svg viewBox="0 0 100 100" fill="none" stroke="#D9A441" stroke-width="3"><circle cx="50" cy="50" r="35"/><path d="M30 50 L70 50 M50 30 L50 70"/></svg>'
    },
    {
      title: '4. Quality Assurance & SGS Certification',
      desc: 'Independent Third-Party Quality Inspection (SGS / Cotecna / Bureau Veritas) performs rigorous lab testing for aflatoxins, pesticide residues, heavy metals, and moisture before sealing.',
      metrics: [
        { label: 'Lab Verification', val: 'SGS / Cotecna' },
        { label: 'Certifications', val: 'ISO & Organic' }
      ],
      svgIcon: '<svg viewBox="0 0 100 100" fill="none" stroke="#5FAF3A" stroke-width="3"><path d="M50 15 L80 30 L80 60 C80 75 50 90 50 90 C50 90 20 75 20 60 L20 30 Z"/><path d="M40 50 L48 58 L65 40" stroke-width="4"/></svg>'
    },
    {
      title: '5. Djibouti Port Freight & Global Delivery',
      desc: 'Seamless ocean freight container logistics from Addis Ababa dry ports to Port of Djibouti, providing FOB / CIF shipping terms with real-time GPS tracking to Europe, Asia, Middle East, and Americas.',
      metrics: [
        { label: 'Countries Served', val: '45+ Nations' },
        { label: 'Shipping Terms', val: 'FOB / CIF / CFR' }
      ],
      svgIcon: '<svg viewBox="0 0 100 100" fill="none" stroke="#D9A441" stroke-width="3"><rect x="15" y="40" width="70" height="35" rx="5"/><circle cx="30" cy="75" r="8"/><circle cx="70" cy="75" r="8"/></svg>'
    }
  ];

  const stepNodes = document.querySelectorAll('.supply-step-node');
  const supplyTitle = document.getElementById('supply-title');
  const supplyDesc = document.getElementById('supply-desc');
  const supplyMetrics = document.getElementById('supply-metrics');
  const supplyVisual = document.getElementById('supply-visual');

  function activeStep(index) {
    const data = supplySteps[index];
    if (!data) return;

    stepNodes.forEach((node, idx) => {
      if (idx === index) node.classList.add('active');
      else node.classList.remove('active');
    });

    if (supplyTitle) supplyTitle.textContent = data.title;
    if (supplyDesc) supplyDesc.textContent = data.desc;
    
    if (supplyMetrics) {
      supplyMetrics.innerHTML = data.metrics.map(m => `
        <div class="metric-card">
          <div class="metric-val">${m.val}</div>
          <div class="metric-lbl">${m.label}</div>
        </div>
      `).join('');
    }

    if (supplyVisual) {
      supplyVisual.innerHTML = `<div class="supply-svg-graphic">${data.svgIcon}</div>`;
    }
  }

  stepNodes.forEach((node, index) => {
    node.addEventListener('click', () => activeStep(index));
  });

  activeStep(0);

  /* ==========================================================================
     9. ANIMATED STATISTIC COUNTERS
     ========================================================================== */
  const statNumbers = document.querySelectorAll('.stat-number');
  let animated = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        statNumbers.forEach(num => {
          const target = parseInt(num.getAttribute('data-target') || '0', 10);
          const suffix = num.getAttribute('data-suffix') || '';
          let count = 0;
          const step = Math.max(1, Math.ceil(target / 60));
          
          const counter = setInterval(() => {
            count += step;
            if (count >= target) {
              num.textContent = target.toLocaleString() + suffix;
              clearInterval(counter);
            } else {
              num.textContent = count.toLocaleString() + suffix;
            }
          }, 30);
        });
      }
    });
  }, { threshold: 0.4 });

  const statsSection = document.getElementById('stats');
  if (statsSection) observer.observe(statsSection);

  /* ==========================================================================
     10. REQUEST A QUOTE DRAWER (MODAL)
     ========================================================================== */
  const quoteModal = document.getElementById('quote-modal');
  const quoteCtaBtns = document.querySelectorAll('.open-quote-drawer');
  const closeDrawerBtn = document.getElementById('close-drawer-btn');
  const quoteForm = document.getElementById('quote-form');

  quoteCtaBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      quoteModal?.classList.add('open');
    });
  });

  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', () => {
      quoteModal?.classList.remove('open');
    });
  }

  quoteModal?.addEventListener('click', (e) => {
    if (e.target === quoteModal) {
      quoteModal.classList.remove('open');
    }
  });

  if (quoteForm) {
    quoteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Thank you for submitting your trade request! Our export representative will issue an official Proforma Invoice within 2 business hours.');
      quoteModal?.classList.remove('open');
      quoteForm.reset();
    });
  }
// ===================================================
// APPLE STYLE WORD REVEAL
// ===================================================

// ===================================================
// APPLE STYLE WORD SCROLL REVEAL
// ===================================================
// ===================================================
// APPLE STYLE WORD SCROLL REVEAL
// ===================================================

/* =========================================================
   ABOUT SCROLLYTELLING
========================================================= */

gsap.registerPlugin(ScrollTrigger);

const aboutSection = document.querySelector(".about-section");
const aboutText = document.querySelector(".about-text");

if (aboutSection && aboutText) {

    /* ---------------------------------------------
       1. Split text into words
    --------------------------------------------- */

    const words = aboutText.textContent
        .trim()
        .split(/\s+/);

    aboutText.innerHTML = words
        .map(word => `<span class="word">${word}</span>`)
        .join(" ");


    /* ---------------------------------------------
       2. Get all words
    --------------------------------------------- */

    const wordElements = aboutText.querySelectorAll(".word");


    /* ---------------------------------------------
       3. Initial state
    --------------------------------------------- */

    gsap.set(wordElements, {
        color: "#6f9679",
        opacity: 0.75
    });


    /* ---------------------------------------------
       4. Scroll-controlled animation
    --------------------------------------------- */

    const aboutTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: aboutSection,

            start: "top top",
            end: "bottom bottom",

            scrub: 1,

            // markers: true
        }
    });


    /* ---------------------------------------------
       5. Reveal words sequentially
    --------------------------------------------- */

    aboutTimeline.to(
        wordElements,
        {
            color: "#ffffff",
            opacity: 1,

            stagger: {
                each: 0.08
            },

            ease: "none"
        }
    );


    ScrollTrigger.refresh();

}


// ===================================================
// INITIALIZATION EXECUTION
// ===================================================

preloadFrames();
initParticles();
updateScrollState();
animateLoop();

})