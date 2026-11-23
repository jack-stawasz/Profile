let homeAnimationController = null;
let skillsData = null;

async function loadSkillsData() {
  try {
    const response = await fetch('data/skills/skills.json');
    if (!response.ok) throw new Error('Failed to load skills data');
    skillsData = await response.json();
  } catch (error) {
    console.error('Error loading skills:', error);
    skillsData = null;
  }
}

async function initHome() {
  if (homeAnimationController) {
    homeAnimationController.stop();
  }
  
  initTextRotation();
  initTestimonials();
  if (!window._logoSpinOn) { window._logoSpinOn = true; initLogoSpin(); }

  // The banner starts without waiting for the skills data; the carousel and the card particles follow it in
  loadSkillsData().then(() => {
    initSkillsCarousel();
    if (!window.SiteSettings || window.SiteSettings.animationsEnabled) {
      initParticleCards();
    }
  });

  const canvas = document.getElementById("fourierCanvas");
  if (!canvas) return;

  const banner = document.querySelector('.fourier-banner');

  function showStaticBanner() {
    if (!banner) return;
    canvas.style.display = 'none';
    if (!banner.querySelector('.static-sig-svg')) {
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('class', 'static-sig-svg');
      svg.setAttribute('viewBox', '-1 -6 19 12');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';

      const defs = document.createElementNS(svgNS, 'defs');
      const filter = document.createElementNS(svgNS, 'filter');
      filter.setAttribute('id', 'sig-glow');
      filter.innerHTML = `<feGaussianBlur stdDeviation="0.18" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>`;
      defs.appendChild(filter);
      svg.appendChild(defs);

      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', document.getElementById('svgPath')?.getAttribute('d') || '');
      path.setAttribute('fill', 'none');
      path.style.stroke = 'color-mix(in srgb, var(--accent) 90%, transparent)';
      path.setAttribute('stroke-width', '0.18');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('filter', 'url(#sig-glow)');
      svg.appendChild(path);
      banner.appendChild(svg);
    }
  }

  function showAnimatedBanner() {
    if (!banner) return;
    canvas.style.display = '';
    const staticSvg = banner.querySelector('.static-sig-svg');
    if (staticSvg) staticSvg.remove();
  }

  window._applyBannerState = function(animsEnabled) {
    if (animsEnabled) {
      showAnimatedBanner();
      if (homeAnimationController && !homeAnimationController.isRunning) {
        homeAnimationController.isRunning = true;
        animate();
      }
    } else {
      if (homeAnimationController) homeAnimationController.stop();
      showStaticBanner();
    }
  };

  // Static fallback when animations are disabled on load
  if (window.SiteSettings && !window.SiteSettings.animationsEnabled) {
    showStaticBanner();
    return;
  }
  
  const ctx = canvas.getContext("2d");
  if (typeof SIGNATURE_FOURIER === 'undefined') return;

  const controller = {
    isRunning: true,
    animationId: null,
    resizeTimeout: null,
    stop: function() {
      this.isRunning = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
    }
  };
  
  homeAnimationController = controller;

  // The banner sleeps while it is scrolled out of view or a popup or the settings dialog covers the page, and wakes
  // when none of these holds
  const popupOpen = () => document.querySelector('.popup:not(.hidden), .settings-overlay.open') !== null;
  controller.offscreen = false;
  controller.sleeping = false;
  controller.wake = function() {
    if (!this.isRunning || !this.sleeping || this.offscreen || popupOpen()) return;
    this.sleeping = false;
    animate();
  };
  new IntersectionObserver(([entry]) => {
    controller.offscreen = !entry.isIntersecting;
    controller.wake();
  }).observe(canvas);
  const popupWatch = new MutationObserver(() => controller.wake());
  document.querySelectorAll('.popup, .settings-overlay').forEach(p =>
    popupWatch.observe(p, { attributes: true, attributeFilter: ['class'] }));

  let displayWidth, displayHeight, CENTER_X, CENTER_Y, fourier, nova;

  function setupCanvas() {
    const container = canvas.parentElement;
    displayWidth = container.offsetWidth;
    displayHeight = container.offsetHeight;

    canvas.width = displayWidth;
    canvas.height = displayHeight;
    if (nova) nova.resize(displayWidth, displayHeight);
    else nova = createNovaDisplay(displayWidth, displayHeight);

    // The terms are precomputed in path units (pages/banner/signature-fourier.js); the path is 11 units tall.
    // A narrow banner (a phone) shrinks the signature to 90% of its width and centers it, instead of cutting it off
    const b = SIGNATURE_FOURIER.bounds;
    const SCALE = Math.min(displayHeight / 11 * 0.6, 0.9 * displayWidth / (b.x1 - b.x0));
    CENTER_X = displayWidth / 3;
    if (CENTER_X + b.x0 * SCALE < 0.05 * displayWidth || CENTER_X + b.x1 * SCALE > 0.95 * displayWidth) {
      CENTER_X = displayWidth / 2 - (b.x0 + b.x1) / 2 * SCALE;
    }
    CENTER_Y = displayHeight / 2;
    fourier = SIGNATURE_FOURIER.terms.map(([freq, amp, phase]) => ({ freq, amp: amp * SCALE, phase }));

    // Neutrino vertices land outside the signature, with room for a vertex's hadron blob; tracks still cross it
    const VERTEX_CLEARANCE = 40;
    nova.avoid({
      x0: CENTER_X + b.x0 * SCALE - VERTEX_CLEARANCE,
      x1: CENTER_X + b.x1 * SCALE + VERTEX_CLEARANCE,
      y0: CENTER_Y + b.y0 * SCALE - VERTEX_CLEARANCE,
      y1: CENTER_Y + b.y1 * SCALE + VERTEX_CLEARANCE,
    });
  }

  setupCanvas();

  window.addEventListener('resize', () => {
    if (controller.resizeTimeout) {
      clearTimeout(controller.resizeTimeout);
    }
    controller.resizeTimeout = setTimeout(() => {
      if (controller.isRunning) {
        setupCanvas();
        // Clear user drawn paths since their coordinates are invalid after resize
        userDrawnPaths = [];
      }
    }, 250);
  });

  let time = 0;
  let trace = [];

  // The arm is a debug view; the trace only needs the arm's end point
  function drawEpicycles(x, y, fourier) {
    const showArm = Boolean(window.SiteSettings && window.SiteSettings.debugMode);
    for (const f of fourier) {
      const px = x;
      const py = y;
      const angle = f.freq * time + f.phase;
      x += f.amp * Math.cos(angle);
      y += f.amp * Math.sin(angle);
      if (!showArm) continue;

      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    return { x, y };
  }

  const DURATION = 5;
  const dt = (2 * Math.PI) / (DURATION * 60);
  const MAX_TRACE_POINTS = 300; // Reduced from 500
  const TRACE_BANDS = 12;   // brightness steps along the trace's fade
  const HALO = [[16, 0.35], [9, 0.55]];   // [width px, black alpha] strokes; overlapping, the center is darkest

  // A soft dark outline under the signature cuts back any event crossing it, like an outline on text
  function drawHalo() {
    if (trace.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < trace.length; i++) {
      const p = trace[i];
      const prev = trace[i - 1];
      // The trace's own breaks (jumps of 30 px or more) stay breaks in the outline
      if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) >= 30) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    for (const [lineWidth, alpha] of HALO) {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.stroke();
    }
    ctx.restore();
  }

  let isSettled = false;
  const SETTLE_TIME = 400;   // ms from the banner's first frame to the signature's first stroke
  let settleStart = null;

  let userDrawing = false;
  let userTrace = [];
  let userDrawnPaths = [];

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    userDrawing = true;
    userTrace = [{ x, y, time: Date.now() }];
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!userDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    userTrace.push({ x, y, time: Date.now() });
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    if (userDrawing && userTrace.length > 1) {
      userDrawnPaths.push({
        points: [...userTrace],
        startTime: Date.now()
      });
    }
    userDrawing = false;
    userTrace = [];
  });

  canvas.addEventListener('mouseleave', () => {
    if (userDrawing && userTrace.length > 1) {
      userDrawnPaths.push({
        points: [...userTrace],
        startTime: Date.now()
      });
    }
    userDrawing = false;
    userTrace = [];
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  function animate() {
    if (!controller.isRunning) return;
    if (controller.offscreen || popupOpen()) {
      controller.sleeping = true;
      controller.animationId = null;
      return;
    }

    const now = performance.now();
    nova.draw(ctx, now);
    drawHalo();

    const v = drawEpicycles(CENTER_X, CENTER_Y, fourier);

    if (!isSettled) {
      if (settleStart === null) settleStart = now;
      if (now - settleStart >= SETTLE_TIME) {
        isSettled = true;
        time = 0;
        trace = [];
      }
    } else {
      trace.push(v);
      if (trace.length > MAX_TRACE_POINTS) trace.shift();
    }

    if (trace.length > 1) drawTrace();

    if (userTrace.length > 1) {
      ctx.lineWidth = 2;
      drawActivePath(userTrace);
    }

    const currentTime = Date.now();
    const fadeTime = 2000;
    userDrawnPaths = userDrawnPaths.filter(path => {
      const elapsed = currentTime - path.startTime;
      if (elapsed > fadeTime) return false;
      ctx.lineWidth = 2;
      drawUserPath(path.points, elapsed, fadeTime);
      return true;
    });

    // Segments fade with age; grouped into bands of equal brightness, each band is one stroke and one glow pass
    function drawTrace() {
      const bands = Array.from({ length: TRACE_BANDS }, () => new Path2D());
      for (let i = 1; i < trace.length; i++) {
        const p = trace[i];
        const prev = trace[i - 1];
        if (Math.hypot(p.x - prev.x, p.y - prev.y) >= 30) continue;   // the signature's own pen lifts
        const fadeFactor = 1 - (trace.length - i) / trace.length;
        const band = Math.min(TRACE_BANDS - 1, Math.floor(fadeFactor * TRACE_BANDS));
        bands[band].moveTo(prev.x, prev.y);
        bands[band].lineTo(p.x, p.y);
      }
      ctx.lineWidth = 2.5;
      bands.forEach((band, b) => {
        const enhancedFade = Math.pow((b + 0.5) / TRACE_BANDS, 1.2);
        const brightness = 40 + (205 * enhancedFade);
        ctx.shadowBlur = enhancedFade > 0.5 ? 15 * enhancedFade : 0;
        ctx.shadowColor = `rgb(0, ${brightness}, 0)`;
        ctx.strokeStyle = `rgba(0, ${brightness}, 0, ${0.3 + 0.7 * enhancedFade})`;
        ctx.stroke(band);
      });
      ctx.shadowBlur = 0;
    }

    function drawActivePath(pathPoints) {
      for (let i = 1; i < pathPoints.length; i++) {
        const brightness = 245;
        const alpha = 1.0;
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgb(0, ${brightness}, 0)`;
        ctx.strokeStyle = `rgba(0, ${brightness}, 0, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(pathPoints[i-1].x, pathPoints[i-1].y);
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    function drawUserPath(pathPoints, elapsed, fadeTime) {
      const fadeFactor = Math.max(0, 1 - (elapsed / fadeTime));
      const enhancedFade = Math.pow(fadeFactor, 1.2);
      const brightness = 40 + (205 * enhancedFade);
      const alpha = 0.3 + (0.7 * enhancedFade);
      
      for (let i = 1; i < pathPoints.length; i++) {
        if (enhancedFade > 0.5) {
          ctx.shadowBlur = 15 * enhancedFade;
          ctx.shadowColor = `rgb(0, ${brightness}, 0)`;
        } else {
          ctx.shadowBlur = 0;
        }
        
        ctx.strokeStyle = `rgba(0, ${brightness}, 0, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(pathPoints[i-1].x, pathPoints[i-1].y);
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    time += dt;

    if (time >= 2 * Math.PI) {
      time = time % (2 * Math.PI);
    }

    controller.animationId = requestAnimationFrame(animate);
  }

  animate();
}

// The logo beside the typed intro spins once as the cursor comes near it
function initLogoSpin() {
  const ENTER_RADIUS = 70;
  const EXIT_RADIUS  = 120;
  const logoStates   = new WeakMap();

  function getState(logo) {
    if (!logoStates.has(logo)) logoStates.set(logo, { spinning: false, angle: 0 });
    return logoStates.get(logo);
  }

  document.addEventListener('mousemove', e => {
    if (window.SiteSettings && !window.SiteSettings.animationsEnabled) return;
    document.querySelectorAll('.spin-logo').forEach(logo => {
      const rect  = logo.getBoundingClientRect();
      const dist  = Math.hypot(e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2));
      const state = getState(logo);

      if (!state.spinning && dist <= ENTER_RADIUS) {
        state.spinning = true;
        state.angle   += 360;
        logo.style.transition = 'transform 0.7s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease, filter 0.3s ease';
        logo.style.transform  = `rotate(${state.angle}deg) scale(1.12)`;
        logo.style.opacity    = '1';
        logo.style.filter     = 'drop-shadow(0 0 12px color-mix(in srgb, var(--accent) 85%, transparent))';
      } else if (state.spinning && dist > EXIT_RADIUS) {
        state.spinning = false;
        state.angle    = Math.round(state.angle / 360) * 360;
        logo.style.transition = 'transform 0.7s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease, filter 0.3s ease';
        logo.style.transform  = `rotate(${state.angle}deg) scale(1)`;
        logo.style.opacity    = '0.6';
        logo.style.filter     = 'drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 40%, transparent))';
      }
    });
  });
}

function cleanupHome() {
  if (homeAnimationController) {
    homeAnimationController.stop();
    homeAnimationController = null;
  }
}

function initTextRotation() {
  const textElement = document.getElementById("welcome-text");
  if (!textElement) return;
  
  const messages = [
    "My name is Jack Stawasz",
    "I am a Physicist",
    "I research neutrinos",
    "I code software",
    "I am a W&M student"
  ];
  
  let currentIndex = 0;
  let isTyping = false;
  
  function typeText(text, callback) {
    if (isTyping) return;
    isTyping = true;
    
    let charIndex = 0;
    textElement.textContent = '';
    
    const typingInterval = setInterval(() => {
      if (charIndex < text.length) {
        textElement.textContent += text[charIndex];
        charIndex++;
      } else {
        clearInterval(typingInterval);
        isTyping = false;
        setTimeout(callback, 1000);
      }
    }, 80);
  }
  
  function deleteText(callback) {
    if (isTyping) return;
    isTyping = true;
    
    const text = textElement.textContent;
    let charIndex = text.length;
    
    const deletingInterval = setInterval(() => {
      if (charIndex > 0) {
        textElement.textContent = text.substring(0, charIndex - 1);
        charIndex--;
      } else {
        clearInterval(deletingInterval);
        isTyping = false;
        setTimeout(callback, 500);
      }
    }, 40);
  }
  
  function cycleMessages() {
    const currentMessage = messages[currentIndex];
    
    typeText(currentMessage, () => {
      deleteText(() => {
        currentIndex = (currentIndex + 1) % messages.length;
        cycleMessages();
      });
    });
  }
  
  cycleMessages();
}

function initSkillsCarousel() {
  const skillsCard = document.querySelector('.skills-card');
  const track = document.getElementById('skillsTrack');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const bookmarks = document.querySelectorAll('.category-bookmark');
  
  if (!track || !prevBtn || !nextBtn || !skillsCard) {
    console.error('Carousel elements not found');
    return;
  }
  
  if (!skillsData) {
    console.error('Skills data not loaded');
    track.innerHTML = '<div class="skill-slide"><div class="skill-description">Error loading skills data. Please check that ../data/skills/skills.json exists.</div></div>';
    return;
  }
  
  
  // Create carousel wrapper
  const carouselWrapper = document.createElement('div');
  carouselWrapper.className = 'carousel-wrapper';
  
  // Move carousel container into wrapper
  const carouselContainer = document.querySelector('.carousel-container');
  if (carouselContainer) {
    carouselContainer.remove();
  }
  
  // Create new carousel container
  const newCarouselContainer = document.createElement('div');
  newCarouselContainer.className = 'carousel-container';
  newCarouselContainer.appendChild(track);
  
  carouselWrapper.appendChild(newCarouselContainer);
  
  // Insert wrapper after category bookmarks
  const bookmarksContainer = document.querySelector('.category-bookmarks');
  bookmarksContainer.parentNode.insertBefore(carouselWrapper, bookmarksContainer.nextSibling);
  
  let currentCategory = 'physics';
  let currentSlide = 0;
  let allSkills = [];
  let slideWidth = 0;
  let slidesPerView = 1;
  let isTransitioning = false;
  
  // Flatten all skills into one continuous array with category info
  let flattenedSkills = [];
  let categoryRanges = {};
  
  function buildFlattenedSkills() {
    flattenedSkills = [];
    categoryRanges = {};
    let currentIndex = 0;
    
    const categories = ['physics', 'math', 'programming', 'tools'];
    categories.forEach(cat => {
      const skills = skillsData[cat];
      if (skills && Array.isArray(skills)) {
        categoryRanges[cat] = {
          start: currentIndex,
          end: currentIndex + skills.length - 1
        };
        skills.forEach(skill => {
          flattenedSkills.push({
            ...skill,
            category: cat
          });
        });
        currentIndex += skills.length;
      }
    });
  }
  
  function updateCarouselWidth() {
    const viewportWidth = window.innerWidth;
    
    if (viewportWidth >= 1200) {
      slidesPerView = 3;
    } else if (viewportWidth >= 768) {
      slidesPerView = 2;
    } else {
      slidesPerView = 1;
    }
    
    // Measure actual slide width from DOM (accounts for gap/padding)
    const firstSlide = track.querySelector('.skill-slide');
    if (firstSlide) {
      const gap = 6;
      slideWidth = firstSlide.getBoundingClientRect().width + gap;
    } else {
      slideWidth = viewportWidth / slidesPerView;
    }
  }
  
  function createSlide(skill) {
    const slide = document.createElement('div');
    slide.className = 'skill-slide';
    
    const imageName = skill.name.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_');
    const imagePath = `data/skills/${imageName}.png`;
    
    slide.innerHTML = `
      <img src="${imagePath}" alt="${skill.name}" class="skill-image"
        loading="lazy" decoding="async" onerror="this.remove()">
      <div class="skill-name">${skill.icon} ${skill.name}</div>
      <div class="skill-description">${skill.description}</div>
    `;
    return slide;
  }
  
  function renderCarousel(category) {
    if (!flattenedSkills.length) {
      buildFlattenedSkills();
    }
    
    if (!flattenedSkills.length) {
      console.error('No skills found');
      track.innerHTML = '<div class="skill-slide"><div class="skill-description">No skills found.</div></div>';
      return;
    }
    
    // Update dimensions first before calculating positions
    updateCarouselWidth();
    
    // Find starting position for this category
    const catRange = categoryRanges[category];
    if (catRange) {
      // Start at first slide of category (accounting for prepended clones)
      currentSlide = catRange.start + slidesPerView;
    } else {
      currentSlide = slidesPerView;
    }
    
    allSkills = flattenedSkills;
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Clone last few slides and prepend (for wrapping left)
    for (let i = flattenedSkills.length - slidesPerView; i < flattenedSkills.length; i++) {
      const slide = createSlide(flattenedSkills[i]);
      slide.classList.add('clone');
      fragment.appendChild(slide);
    }
    
    // Add all real slides
    flattenedSkills.forEach((skill) => {
      const slide = createSlide(skill);
      fragment.appendChild(slide);
    });
    
    // Clone first few slides and append (for wrapping right)
    for (let i = 0; i < slidesPerView; i++) {
      const slide = createSlide(flattenedSkills[i]);
      slide.classList.add('clone');
      fragment.appendChild(slide);
    }
    
    // Clear track and append fragment in one operation
    track.innerHTML = '';
    track.appendChild(fragment);
    
    // Re-measure now that slides are in the DOM (accounts for gap/padding)
    updateCarouselWidth();
    
    // Set initial position without transition
    track.style.transition = 'none';
    track.style.transform = `translateX(${-currentSlide * slideWidth}px)`;
    
    // Double rAF: ensures no-transition paint is committed before re-enabling
    requestAnimationFrame(() => requestAnimationFrame(() => {
      track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      updateActiveCategory();
    }));
  }
  
  function updateActiveCategory() {
    // Determine which category is currently showing based on leftmost visible slide
    const realIndex = ((currentSlide - slidesPerView) % flattenedSkills.length + flattenedSkills.length) % flattenedSkills.length;
    const currentSkill = flattenedSkills[realIndex];
    
    if (currentSkill && currentSkill.category !== currentCategory) {
      currentCategory = currentSkill.category;
      
      // Update bookmark highlights
      bookmarks.forEach(b => {
        b.classList.toggle('active', b.dataset.category === currentCategory);
      });
    }
  }
  
  function updateCarousel() {
    updateCarouselWidth();
    const offset = -currentSlide * slideWidth;
    track.style.transform = `translateX(${offset}px)`;
  }
  
  let transitionTimeout = null;

  function finishTransition() {
    if (transitionTimeout) { clearTimeout(transitionTimeout); transitionTimeout = null; }
    isTransitioning = false;

    // Check if we're at a clone and need to jump to real position
    if (currentSlide < slidesPerView) {
      track.style.transition = 'none';
      currentSlide = flattenedSkills.length + currentSlide;
      track.style.transform = `translateX(${-currentSlide * slideWidth}px)`;
      // Double rAF: first frame commits the no-transition paint, second re-enables
      requestAnimationFrame(() => requestAnimationFrame(() => {
        track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        updateActiveCategory();
      }));
    } else if (currentSlide >= flattenedSkills.length + slidesPerView) {
      track.style.transition = 'none';
      currentSlide = currentSlide - flattenedSkills.length;
      track.style.transform = `translateX(${-currentSlide * slideWidth}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        updateActiveCategory();
      }));
    } else {
      updateActiveCategory();
    }
  }

  track.addEventListener('transitionend', finishTransition);
  
  // Event listeners
  prevBtn.addEventListener('click', () => {
    currentSlide--;
    updateCarousel();
    if (transitionTimeout) clearTimeout(transitionTimeout);
    transitionTimeout = setTimeout(finishTransition, 600);
  });
  
  nextBtn.addEventListener('click', () => {
    currentSlide++;
    updateCarousel();
    if (transitionTimeout) clearTimeout(transitionTimeout);
    transitionTimeout = setTimeout(finishTransition, 600);
  });
  
  bookmarks.forEach(bookmark => {
    bookmark.addEventListener('click', () => {
      const targetCategory = bookmark.dataset.category;
      if (targetCategory === currentCategory) return;
      
      // Jump to the start of the clicked category
      const catRange = categoryRanges[targetCategory];
      if (catRange) {
        isTransitioning = true;
        currentSlide = catRange.start + slidesPerView; // Account for clones
        currentCategory = targetCategory;
        
        bookmarks.forEach(b => b.classList.remove('active'));
        bookmark.classList.add('active');
        
        updateCarousel();
        transitionTimeout = setTimeout(finishTransition, 600);
      }
    });
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      currentSlide--;
      updateCarousel();
      if (transitionTimeout) clearTimeout(transitionTimeout);
      transitionTimeout = setTimeout(finishTransition, 600);
    } else if (e.key === 'ArrowRight') {
      currentSlide++;
      updateCarousel();
      if (transitionTimeout) clearTimeout(transitionTimeout);
      transitionTimeout = setTimeout(finishTransition, 600);
    }
  });
  
  // Touch support
  let touchStartX = 0;
  let touchEndX = 0;
  
  track.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });
  
  track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });
  
  function handleSwipe() {
    if (touchStartX - touchEndX > 50) {
      // Swipe left - go forward
      if (isTransitioning) return;
      isTransitioning = true;
      currentSlide++;
      updateCarousel();
      transitionTimeout = setTimeout(finishTransition, 600);
    } else if (touchEndX - touchStartX > 50) {
      // Swipe right - go back
      if (isTransitioning) return;
      isTransitioning = true;
      currentSlide--;
      updateCarousel();
      transitionTimeout = setTimeout(finishTransition, 600);
    }
  }
  
  // Window resize handler
  window.addEventListener('resize', () => {
    updateCarousel();
  });
  
  // Initialize with physics category
  renderCarousel('physics');
}

function initParticleCards() {
  // Particle effect on the research card
  document.querySelectorAll('.card.particle-bg').forEach(card => {
    attachParticles(card, card);
  });

  // Particle effect on the testimonials section, under its cards (their track sits at z-index 2)
  const testimonialsSection = document.getElementById('testimonials-section');
  if (testimonialsSection) {
    attachParticles(testimonialsSection, testimonialsSection, '1');
  }
}

function attachParticles(host, triggerEl, zIndex = '5') {
  let particles = [];
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.opacity = '0';
  canvas.style.transition = 'opacity 0.3s ease';
  canvas.style.zIndex = zIndex;
  host.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let animationId = null;
  let width = 0, height = 0;

  // The bitmap follows the canvas's drawn size (hosts grow as their content loads), or the drawing stretches
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  new ResizeObserver(resize).observe(host);

  let rgb = accentRgb();

  triggerEl.addEventListener('mouseenter', () => {
    canvas.style.opacity = '1';
    rgb = accentRgb();
    particles = [];
    // Same density on every host: the research card's 40 particles over ~170,000 px²
    const count = Math.min(220, Math.max(20, Math.round(width * height / 4200)));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1
      });
    }
    if (!animationId) animate();
  });

  triggerEl.addEventListener('mouseleave', () => {
    canvas.style.opacity = '0';
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  });

  function animate() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width)  p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.fillStyle = `rgba(${rgb}, 0.6)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.strokeStyle = `rgba(${rgb}, ${0.2 * (1 - dist / 100)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    animationId = requestAnimationFrame(animate);
  }
}
// The palette's accent as "r, g, b" for canvas drawing, which can't read CSS variables
function accentRgb() {
  const hex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return '125, 211, 252';
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ');
}

// ─── Testimonials ────────────────────────────────────────────
async function initTestimonials() {
  const section  = document.getElementById('testimonials-section');
  const track    = document.getElementById('testimonials-track');
  const scrubber = document.getElementById('testimonials-scrubber');
  const pauseBtn = document.getElementById('testimonials-pause');
  if (!section || !track || !scrubber || !pauseBtn) return;

  // ── Load data ───────────────────────────────────────────────
  let testimonials = [];
  try {
    const res = await fetch('data/testimonials.json');
    if (!res.ok) throw new Error('Not found');
    testimonials = await res.json();
  } catch {
    track.innerHTML = '<div style="padding:1rem;color:var(--muted);text-align:center;">No testimonials found.</div>';
    section.classList.add('static');
    return;
  }
  if (!testimonials.length) {
    section.classList.add('static');
    return;
  }

  // ── Helpers ─────────────────────────────────────────────────
  function initials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  function makeCard(t) {
    const card = document.createElement('div');
    card.className = 'testimonial-card';
    card.innerHTML = `
      <div class="testimonial-quote">${t.quote}</div>
      <div class="testimonial-footer">
        <div class="testimonial-avatar">${initials(t.name)}</div>
        <div class="testimonial-meta">
          <div class="testimonial-name">${t.name}</div>
          <div class="testimonial-title">${t.title}</div>
          ${t.organization ? `<div class="testimonial-org">${t.organization}</div>` : ''}
        </div>
      </div>`;
    return card;
  }

  // ── Render one real set ──────────────────────────────────────
  testimonials.forEach(t => track.appendChild(makeCard(t)));

  // Wait two frames for layout to settle
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  // ── Measure ──────────────────────────────────────────────────
  const GAP = 20; // 1.25rem at 16px
  function measureOneSet() {
    const cards = track.querySelectorAll('.testimonial-card');
    let w = 0;
    // Only sum the first real set (testimonials.length cards)
    for (let i = 0; i < testimonials.length; i++) {
      w += cards[i].getBoundingClientRect().width + GAP;
    }
    return w;
  }

  let oneSetW = measureOneSet();
  const viewW = window.innerWidth;

  // ── Static mode: cards fit on screen ────────────────────────
  if (oneSetW <= viewW) {
    section.classList.add('static');
    return; // nothing more to do — no scroll, no controls
  }

  // ── Scroll mode: append one clone set as seamless tail ───────
  // We only need one extra copy: when we've scrolled oneSetW px the
  // tail (which is identical to the head) is now on screen and we
  // silently jump offset back to 0.
  testimonials.forEach(t => {
    const clone = makeCard(t);
    clone.classList.add('t-clone');
    track.appendChild(clone);
  });

  // ── State ────────────────────────────────────────────────────
  let offset   = 0;
  let paused   = false;
  let scrubbing = false;
  const SPEED  = 0.6; // px/frame ≈ 36 px/s at 60 fps

  function applyOffset(px) {
    track.style.transform = `translateX(${-px}px)`;
  }

  function syncScrubber() {
    const v = Math.round((offset / oneSetW) * 1000);
    scrubber.value = v;
    scrubber.style.setProperty('--scrub', (v / 10) + '%');
  }

  function setPauseIcon() {
    pauseBtn.innerHTML = paused ? '&#9654;' : '&#10074;&#10074;';
  }
  setPauseIcon();

  // ── Animation loop ──────────────────────────────────────────
  function tick() {
    requestAnimationFrame(tick);
    if (paused || scrubbing) return;

    offset += SPEED;
    if (offset >= oneSetW) offset -= oneSetW; // seamless wrap

    applyOffset(offset);
    syncScrubber();
  }
  requestAnimationFrame(tick);

  // ── Pause button ─────────────────────────────────────────────
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    setPauseIcon();
  });

  // ── Scrubber ─────────────────────────────────────────────────
  scrubber.addEventListener('mousedown',  () => { scrubbing = true; paused = true; setPauseIcon(); });
  scrubber.addEventListener('touchstart', () => { scrubbing = true; paused = true; setPauseIcon(); }, { passive: true });
  scrubber.addEventListener('mouseup',    () => { scrubbing = false; });
  scrubber.addEventListener('touchend',   () => { scrubbing = false; });

  scrubber.addEventListener('input', () => {
    offset = (Number(scrubber.value) / 1000) * oneSetW;
    applyOffset(offset);
    scrubber.style.setProperty('--scrub', (Number(scrubber.value) / 10) + '%');
  });

  // ── Pointer drag on track ────────────────────────────────────
  let isDragging = false, dragStartX = 0, dragStartOffset = 0;

  track.style.pointerEvents = 'auto';

  track.addEventListener('pointerdown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartOffset = offset;
    track.classList.add('grabbing');
    track.setPointerCapture(e.pointerId);
    scrubbing = true;
    paused = true;
    setPauseIcon();
  });

  track.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const delta = dragStartX - e.clientX;
    offset = ((dragStartOffset + delta) % oneSetW + oneSetW) % oneSetW;
    applyOffset(offset);
    syncScrubber();
  });

  const endDrag = () => {
    isDragging = false;
    scrubbing = false;
    track.classList.remove('grabbing');
  };
  track.addEventListener('pointerup',     endDrag);
  track.addEventListener('pointercancel', endDrag);

  // ── Resize ───────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    oneSetW = measureOneSet();
    // Re-check if we now fit statically (e.g. window grew)
    if (oneSetW <= window.innerWidth && !section.classList.contains('static')) {
      section.classList.add('static');
    }
  });
}