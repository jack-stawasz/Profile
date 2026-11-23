const links = document.querySelectorAll('.nav-links a');
const main  = document.getElementById('main-content');

const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

let cursor, cursorDot;

function initCustomCursor() {
  if (isTouch) return;

  cursor    = document.createElement('div');
  cursorDot = document.createElement('div');
  cursor.className    = 'custom-cursor';
  cursorDot.className = 'custom-cursor-dot';
  cursor.appendChild(cursorDot);
  document.body.appendChild(cursor);
  document.body.classList.add('custom-cursor-enabled');

  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top  = e.clientY + 'px';
    cursor.classList.add('active');
    const isClickable = e.target.closest(
      'a, button, input, select, .project-card, .course-card, .exp-tab, .category-bookmark, .carousel-btn, .indicator-dot, [role="button"]'
    );
    cursor.classList.toggle('hovering', !!isClickable);
  });

  document.addEventListener('mouseleave', () => cursor.classList.remove('active', 'hovering'));
  document.addEventListener('mouseenter', () => cursor.classList.add('active'));
  document.addEventListener('mousedown', e => { cursor.classList.add('clicking'); createRipple(e.clientX, e.clientY); });
  document.addEventListener('mouseup',   () => cursor.classList.remove('clicking'));
}

function initTouchRipple() {
  if (!isTouch) return;
  document.addEventListener('touchstart', e => {
    const t = e.touches[0];
    createRipple(t.clientX, t.clientY);
  }, { passive: true });
}

function createRipple(x, y) {
  const ripple = document.createElement('div');
  ripple.className  = 'ripple';
  ripple.style.left = x + 'px';
  ripple.style.top  = y + 'px';
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 800);
}

function initNavbarHeightTracking() {
  const navbar = document.querySelector('.navbar');
  const mainEl = document.querySelector('main.wrap');
  if (!navbar || !mainEl) return;

  // --nav-h also keeps a scrolled-to section's top clear of the fixed bar (scroll-margin-top)
  function updatePadding() {
    const height = navbar.getBoundingClientRect().height;
    mainEl.style.paddingTop = height + 'px';
    document.documentElement.style.setProperty('--nav-h', height + 'px');
  }

  updatePadding();
  window.addEventListener('resize', updatePadding);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(updatePadding).observe(navbar);
  }
}

// The site draws its own tooltips (style.css, from data-tip); moving title there on first hover keeps the
// browser's tooltip from showing a second copy, and aria-label keeps the text for screen readers
document.addEventListener('mouseover', e => {
  const el = e.target.closest('[title]:not(iframe):not(svg)');
  if (!el || !el.title) return;
  if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.title);
  el.dataset.tip = el.title;
  el.removeAttribute('title');
});

// The footer sits above the scripts, so it already exists here
document.getElementById('footer-year').textContent = new Date().getFullYear();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initCustomCursor();
    initTouchRipple();
    initNavbarHeightTracking();
  });
} else {
  initCustomCursor();
  initTouchRipple();
  initNavbarHeightTracking();
}

// ==================================================
// One scrolling page: every section loads at startup, and the nav links scroll to them
// ==================================================
const sections = [...main.querySelectorAll(':scope > section')];

async function loadSections() {
  await Promise.all(sections.map(async section => {
    try {
      const res = await fetch(`pages/${section.id}.html`);
      if (!res.ok) throw new Error('Page not found');
      section.innerHTML = await res.text();
    } catch {
      section.innerHTML = `<p>⚠️ Failed to load ${section.id}.html</p>`;
    }
  }));

  // The sections' scripts come after this one, and a cached fetch can finish before they have run
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }

  initExperience();
  initContacts();
  await initHome();
}

function scrollBehavior() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reduced || (window.SiteSettings && !window.SiteSettings.animationsEnabled) ? 'auto' : 'smooth';
}

function scrollToSection(id, behavior) {
  if (id === 'home') window.scrollTo({ top: 0, behavior });
  else document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
}

const linkFor = id => [...links].find(l => l.getAttribute('href') === '#' + id);

// The current section is the last one whose top has crossed the upper third of the window
function updateActiveSection() {
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  const line = window.innerHeight / 3;
  const current = atBottom ? sections.length - 1
    : Math.max(0, sections.filter(s => s.getBoundingClientRect().top <= line).length - 1);
  // A section without a link (Testimonials) lights the nearest linked one above it
  const linked = sections.slice(0, current + 1).reverse().find(s => linkFor(s.id));
  const link = linkFor(linked.id);
  if (link.classList.contains('active')) return;
  links.forEach(l => l.classList.toggle('active', l === link));
  history.replaceState(null, '', '#' + linked.id);
}

links.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    scrollToSection(link.getAttribute('href').substring(1), scrollBehavior());
  });
});

let spyFrame = null;
window.addEventListener('scroll', () => {
  if (spyFrame) return;
  spyFrame = requestAnimationFrame(() => { spyFrame = null; updateActiveSection(); });
}, { passive: true });

// Old links name pages (#pages/experience); a section's id is the last part
const startId = window.location.hash.substring(1).split('/').pop();

loadSections().then(() => {
  if (!startId || startId === 'home' || !document.getElementById(startId)) return;
  // Sections above keep growing as their data and images load, so stay on the target until the reader takes over
  const READER_INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
  const pin = () => scrollToSection(startId, 'auto');
  const settle = new ResizeObserver(pin);
  const release = () => {
    settle.disconnect();
    READER_INPUT.forEach(t => window.removeEventListener(t, release));
  };
  pin();
  settle.observe(main);
  READER_INPUT.forEach(t => window.addEventListener(t, release, { passive: true }));
  setTimeout(release, 3000);
});