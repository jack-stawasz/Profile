const links = document.querySelectorAll('.nav-links a');
const main  = document.getElementById('main-content');

let cursor, cursorDot;

function initCustomCursor() {
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

  function updatePadding() {
    mainEl.style.paddingTop = navbar.getBoundingClientRect().height + 'px';
  }

  updatePadding();
  window.addEventListener('resize', updatePadding);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(updatePadding).observe(navbar);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { initCustomCursor(); initNavbarHeightTracking(); });
} else {
  initCustomCursor();
  initNavbarHeightTracking();
}

async function showSection(target) {
  main.querySelectorAll('section').forEach(s => s.hidden = true);

  const sectionId = target.split('/').pop();
  const section   = document.getElementById(sectionId);
  if (!section) return;

  section.hidden = false;

  try {
    const res = await fetch(`pages/${sectionId}.html`);
    if (!res.ok) throw new Error('Page not found');
    section.innerHTML = await res.text();
  } catch {
    section.innerHTML = `<p>⚠️ Failed to load ${sectionId}.html</p>`;
  }

  if (sectionId === 'home')       setTimeout(() => initHome(), 0);
  if (sectionId === 'experience') setTimeout(() => initExperience(), 0);
  if (sectionId === 'contact')    setTimeout(() => initContacts(), 0);
}

links.forEach(link => {
  link.addEventListener('click', async e => {
    e.preventDefault();
    links.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    const target = link.getAttribute('href').substring(1);
    await showSection(target);
    window.location.hash = target;
  });
});

const initialPage = window.location.hash.substring(1) || 'pages/home';
showSection(initialPage);

setTimeout(() => {
  const current = document.querySelector('section:not([hidden])');
  links.forEach(l => {
    l.classList.remove('active');
    if (current && l.getAttribute('href').substring(1) === `pages/${current.id}`) {
      l.classList.add('active');
    }
  });
}, 100);