/* ════════════════════════════════════════════════════════════
   Site Settings  –  settings.js
════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Storage helpers ─────────────────────────────────────── */
  function save(key, val) {
    try { localStorage.setItem('site_setting_' + key, JSON.stringify(val)); } catch (_) {}
  }
  function load(key, fallback) {
    try {
      const v = localStorage.getItem('site_setting_' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (_) { return fallback; }
  }

  /* ── State ───────────────────────────────────────────────── */
  const today = new Date();
  const todayDOY = dayOfYear(today);

  const state = {
    theme:      load('theme', 'dark'),
    dateDOY:    load('dateDOY', todayDOY),
    fontSize:   load('fontSize', 100),   // percent
    animations: load('animations', true),
  };

  /* ── Public API (window.SiteSettings) ───────────────────── */
  window.SiteSettings = {
    getDate() {
      return dateFromDOY(state.dateDOY, today.getFullYear());
    },
    get animationsEnabled() { return state.animations; },
    get theme() { return state.theme; },
  };

  /* ── Helpers ─────────────────────────────────────────────── */
  function dayOfYear(d) {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff  = d - start;
    return Math.floor(diff / 86400000);
  }

  function dateFromDOY(doy, year) {
    const d = new Date(year, 0);
    d.setDate(doy);
    return d;
  }

  const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function formatDate(d) {
    return `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  /* ── Theme application ───────────────────────────────────── */
  const THEMES = {
    dark: {
      '--bg':           '#0f1724',
      '--bg-deep':      '#071021',
      '--card':         '#0b1220',
      '--container':    '#17253c',
      '--glass':        'rgba(255,255,255,0.03)',
      '--border':       'rgba(255,255,255,0.07)',
      '--border-strong':'rgba(255,255,255,0.14)',
      '--accent':       '#7dd3fc',
      '--accent-glow':  'rgba(125,211,252,0.5)',
      '--accent-dim':   'rgba(125,211,252,0.08)',
      '--accent-mid':   'rgba(125,211,252,0.18)',
      '--accent-ring':  'rgba(125,211,252,0.25)',
      '--accent-border':'rgba(125,211,252,0.28)',
      '--accent-hover': 'rgba(125,211,252,0.55)',
      '--text':         '#e6eef6',
      '--text-soft':    '#ccd8e4',
      '--muted':        '#9aa4b2',
      '--shadow':       'rgba(2,6,23,0.6)',
      '--shadow-deep':  'rgba(2,6,23,0.9)',
      '--overlay':      'rgba(0,0,0,0.6)',
      '--navbar-bg':    'linear-gradient(180deg,#000 0%,rgba(0,0,0,0.8) 60%,transparent 100%)',
    },
    light: {
      '--bg':           '#f0f4f8',
      '--bg-deep':      '#dce6f0',
      '--card':         '#ffffff',
      '--container':    '#ffffff',
      '--glass':        'rgba(0,0,0,0.03)',
      '--border':       'rgba(0,0,0,0.09)',
      '--border-strong':'rgba(0,0,0,0.18)',
      '--accent':       '#0369a1',
      '--accent-glow':  'rgba(3,105,161,0.4)',
      '--accent-dim':   'rgba(3,105,161,0.08)',
      '--accent-mid':   'rgba(3,105,161,0.15)',
      '--accent-ring':  'rgba(3,105,161,0.22)',
      '--accent-border':'rgba(3,105,161,0.3)',
      '--accent-hover': 'rgba(3,105,161,0.5)',
      '--text':         '#1a2535',
      '--text-soft':    '#334155',
      '--muted':        '#64748b',
      '--shadow':       'rgba(0,0,0,0.12)',
      '--shadow-deep':  'rgba(0,0,0,0.2)',
      '--overlay':      'rgba(0,0,0,0.25)',
      '--navbar-bg':    'linear-gradient(180deg,rgba(240,244,248,0.98) 0%,rgba(240,244,248,0.9) 60%,transparent 100%)',
    },
    warm: {
      '--bg':           '#1a1208',
      '--bg-deep':      '#0f0a02',
      '--card':         '#1f1608',
      '--container':    '#2a1e0d',
      '--glass':        'rgba(255,200,100,0.03)',
      '--border':       'rgba(255,200,100,0.08)',
      '--border-strong':'rgba(255,200,100,0.16)',
      '--accent':       '#f59e0b',
      '--accent-glow':  'rgba(245,158,11,0.5)',
      '--accent-dim':   'rgba(245,158,11,0.08)',
      '--accent-mid':   'rgba(245,158,11,0.18)',
      '--accent-ring':  'rgba(245,158,11,0.25)',
      '--accent-border':'rgba(245,158,11,0.3)',
      '--accent-hover': 'rgba(245,158,11,0.55)',
      '--text':         '#fdf0d5',
      '--text-soft':    '#e8d5a8',
      '--muted':        '#b89a68',
      '--shadow':       'rgba(10,5,0,0.7)',
      '--shadow-deep':  'rgba(10,5,0,0.9)',
      '--overlay':      'rgba(0,0,0,0.65)',
      '--navbar-bg':    'linear-gradient(180deg,#0f0a02 0%,rgba(15,10,2,0.8) 60%,transparent 100%)',
    },
  };

  function applyTheme(name) {
    const vars = THEMES[name] || THEMES.dark;
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    root.setAttribute('data-theme', name);
  }

  /* ── Font size application ───────────────────────────────── */
  function applyFontSize(pct) {
    document.documentElement.style.fontSize = (pct / 100) + 'rem';
  }

  /* ── Animations application ──────────────────────────────── */
  function applyAnimations(enabled) {
    document.body.classList.toggle('no-animations', !enabled);
  }

  /* ── Apply saved state on load ───────────────────────────── */
  function applyAll() {
    applyTheme(state.theme);
    applyFontSize(state.fontSize);
    applyAnimations(state.animations);
  }

  /* ══════════════════════════════════════════════════════════
     7-Segment display
  ══════════════════════════════════════════════════════════ */
  // Segment map: which segments are on for digits 0-9
  // Segments: a(top) b(top-right) c(bot-right) d(bot) e(bot-left) f(top-left) g(mid)
  const SEG_MAP = [
    [1,1,1,1,1,1,0], // 0
    [0,1,1,0,0,0,0], // 1
    [1,1,0,1,1,0,1], // 2
    [1,1,1,1,0,0,1], // 3
    [0,1,1,0,0,1,1], // 4
    [1,0,1,1,0,1,1], // 5
    [1,0,1,1,1,1,1], // 6
    [1,1,1,0,0,0,0], // 7
    [1,1,1,1,1,1,1], // 8
    [1,1,1,1,0,1,1], // 9
  ];

  function makeSegDigitSVG(digit) {
    const on  = 'rgba(125,211,252,1)';
    const off = 'rgba(125,211,252,0.08)';
    const s   = digit < 0 ? Array(7).fill(0) : SEG_MAP[digit] || SEG_MAP[0];

    // Segment colors based on state.theme
    const accentOn  = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || on;
    const accentOff = getComputedStyle(document.documentElement).getPropertyValue('--accent-dim').trim() || off;

    function c(i) { return s[i] ? accentOn : accentOff; }
    function glow(i) { return s[i] ? `filter:drop-shadow(0 0 4px ${accentOn})` : ''; }

    // Using path-based segments (thick bar style)
    return `<svg viewBox="0 0 20 34" xmlns="http://www.w3.org/2000/svg" style="display:block">
      <!-- a top -->
      <path d="M3 2 L17 2 L15.5 3.5 L4.5 3.5 Z" fill="${c(0)}" style="${glow(0)}"/>
      <!-- b top-right -->
      <path d="M17.5 3 L18.5 15.5 L17 16.5 L16 4 Z" fill="${c(1)}" style="${glow(1)}"/>
      <!-- c bot-right -->
      <path d="M17.5 19 L18.5 31 L17 32 L16 20 Z" fill="${c(2)}" style="${glow(2)}"/>
      <!-- d bot -->
      <path d="M3 32 L17 32 L15.5 30.5 L4.5 30.5 Z" fill="${c(3)}" style="${glow(3)}"/>
      <!-- e bot-left -->
      <path d="M2.5 19 L3.5 31 L4 20 L3 16.5 Z" fill="${c(4)}" style="${glow(4)}"/>
      <!-- f top-left -->
      <path d="M2.5 3 L3.5 15.5 L4 16.5 L3 4 Z" fill="${c(5)}" style="${glow(5)}"/>
      <!-- g mid -->
      <path d="M4 16 L16 16 L16.5 17 L16 18 L4 18 L3.5 17 Z" fill="${c(6)}" style="${glow(6)}"/>
    </svg>`;
  }

  function createSegClock() {
    const box = document.createElement('div');
    box.className = 'seg-clock-box';

    const wrap = document.createElement('div');
    wrap.className = 'seg-clock';
    wrap.id = 'seg-clock';

    // H H : M M : S S  AM/PM
    const ids = ['ch0','ch1','sep1','cm0','cm1','sep2','cs0','cs1'];
    ids.forEach(id => {
      if (id.startsWith('sep')) {
        const sep = document.createElement('div');
        sep.className = 'seg-sep';
        sep.innerHTML = '<div class="seg-sep-dot"></div><div class="seg-sep-dot"></div>';
        sep.id = id;
        wrap.appendChild(sep);
      } else {
        const d = document.createElement('div');
        d.className = 'seg-digit';
        d.id = id;
        wrap.appendChild(d);
      }
    });

    const ampm = document.createElement('div');
    ampm.className = 'seg-ampm';
    ampm.id = 'seg-ampm';
    wrap.appendChild(ampm);

    box.appendChild(wrap);
    return box;
  }

  function updateSegClock() {
    const now  = new Date();
    let   h    = now.getHours();
    const m    = now.getMinutes();
    const s    = now.getSeconds();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;

    const digits = [
      Math.floor(h / 10) || -1,  // leading zero hidden
      h % 10,
      Math.floor(m / 10),
      m % 10,
      Math.floor(s / 10),
      s % 10,
    ];
    const ids = ['ch0','ch1','cm0','cm1','cs0','cs1'];
    ids.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = makeSegDigitSVG(digits[i]);
    });
    const ampmEl = document.getElementById('seg-ampm');
    if (ampmEl) ampmEl.textContent = ampm;
  }

  /* ══════════════════════════════════════════════════════════
     Build the panel
  ══════════════════════════════════════════════════════════ */
  function buildPanel() {
    /* ── overlay wrapper ── */
    const overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.id = 'settings-overlay';

    /* ── backdrop (click to close) ── */
    const backdrop = document.createElement('div');
    backdrop.className = 'settings-backdrop';
    backdrop.addEventListener('click', closePanel);
    overlay.appendChild(backdrop);

    /* ── panel ── */
    const panel = document.createElement('div');
    panel.className = 'settings-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Site Settings');

    /* header */
    const header = document.createElement('div');
    header.className = 'settings-panel-header';
    header.innerHTML = `<h3>⚙ Site Settings</h3>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'settings-close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close settings');
    closeBtn.addEventListener('click', closePanel);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    /* ─── Group: Theme ─── */
    const themeGroup = document.createElement('div');
    themeGroup.className = 'settings-group';
    themeGroup.innerHTML = `<label class="settings-label" for="settings-theme">Color Theme</label>`;
    const themeSelect = document.createElement('select');
    themeSelect.className = 'settings-select';
    themeSelect.id = 'settings-theme';
    [['dark','🌑 Dark'],['light','☀️ Light'],['warm','🕯 Warm']].forEach(([val, label]) => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      if (val === state.theme) opt.selected = true;
      themeSelect.appendChild(opt);
    });
    themeSelect.addEventListener('change', () => {
      state.theme = themeSelect.value;
      save('theme', state.theme);
      applyTheme(state.theme);
    });
    themeGroup.appendChild(themeSelect);
    panel.appendChild(themeGroup);

    /* ─── Group: Simulated Date ─── */
    const dateGroup = document.createElement('div');
    dateGroup.className = 'settings-group';

    const dateHeader = document.createElement('div');
    dateHeader.className = 'settings-date-header';

    const dateLabelEl = document.createElement('span');
    dateLabelEl.className = 'settings-label';
    dateLabelEl.style.marginBottom = '0';
    dateLabelEl.textContent = 'Simulated Date';

    const todayBtn = document.createElement('button');
    todayBtn.className = 'settings-today-btn';
    todayBtn.textContent = 'Today';
    todayBtn.setAttribute('aria-label', 'Reset to today');

    dateHeader.appendChild(dateLabelEl);
    dateHeader.appendChild(todayBtn);
    dateGroup.appendChild(dateHeader);

    const dateDisplay = document.createElement('div');
    dateDisplay.className = 'settings-date-display';
    dateDisplay.id = 'settings-date-display';
    dateDisplay.textContent = formatDate(window.SiteSettings.getDate());

    const dateSlider = document.createElement('input');
    dateSlider.type = 'range';
    dateSlider.min  = 1;
    dateSlider.max  = 365;
    dateSlider.value = state.dateDOY;
    dateSlider.className = 'settings-slider';
    dateSlider.id = 'settings-date-slider';
    dateSlider.setAttribute('aria-label', 'Simulated day of year');

    function syncDateSlider() {
      const pct = ((dateSlider.value - 1) / 364 * 100).toFixed(1) + '%';
      dateSlider.style.setProperty('--slider-pct', pct);
      dateDisplay.textContent = formatDate(dateFromDOY(Number(dateSlider.value), today.getFullYear()));
    }
    syncDateSlider();

    dateSlider.addEventListener('input', () => {
      state.dateDOY = Number(dateSlider.value);
      save('dateDOY', state.dateDOY);
      syncDateSlider();
      if (window._refreshSidebar) window._refreshSidebar();
    });

    todayBtn.addEventListener('click', () => {
      state.dateDOY = todayDOY;
      save('dateDOY', state.dateDOY);
      dateSlider.value = todayDOY;
      syncDateSlider();
      if (window._refreshSidebar) window._refreshSidebar();
    });

    const ticks = document.createElement('div');
    ticks.className = 'date-slider-ticks';
    ticks.innerHTML = '<span>Jan</span><span>Apr</span><span>Jul</span><span>Oct</span><span>Dec</span>';

    dateGroup.appendChild(dateDisplay);
    dateGroup.appendChild(dateSlider);
    dateGroup.appendChild(ticks);
    panel.appendChild(dateGroup);

    /* ─── Group: Font Size ─── */
    const fontGroup = document.createElement('div');
    fontGroup.className = 'settings-group';
    fontGroup.innerHTML = `<span class="settings-label">Font Size</span>`;

    const fontRow = document.createElement('div');
    fontRow.className = 'settings-font-row';

    const decBtn = document.createElement('button');
    decBtn.className = 'settings-font-btn';
    decBtn.textContent = '−';
    decBtn.setAttribute('aria-label', 'Decrease font size');

    const fontVal = document.createElement('div');
    fontVal.className = 'settings-font-val';
    fontVal.id = 'settings-font-val';
    fontVal.textContent = state.fontSize + '%';

    const incBtn = document.createElement('button');
    incBtn.className = 'settings-font-btn';
    incBtn.textContent = '+';
    incBtn.setAttribute('aria-label', 'Increase font size');

    const resetFontBtn = document.createElement('button');
    resetFontBtn.className = 'settings-font-reset';
    resetFontBtn.textContent = 'Reset';

    function changeFontSize(delta) {
      state.fontSize = Math.min(150, Math.max(70, state.fontSize + delta));
      save('fontSize', state.fontSize);
      fontVal.textContent = state.fontSize + '%';
      applyFontSize(state.fontSize);
    }

    decBtn.addEventListener('click', () => changeFontSize(-5));
    incBtn.addEventListener('click', () => changeFontSize(5));
    resetFontBtn.addEventListener('click', () => {
      state.fontSize = 100;
      save('fontSize', 100);
      fontVal.textContent = '100%';
      applyFontSize(100);
    });

    fontRow.appendChild(decBtn);
    fontRow.appendChild(fontVal);
    fontRow.appendChild(incBtn);
    fontRow.appendChild(resetFontBtn);
    fontGroup.appendChild(fontRow);
    panel.appendChild(fontGroup);

    /* ─── Group: Clock ─── */
    const clockGroup = document.createElement('div');
    clockGroup.className = 'settings-group';
    clockGroup.innerHTML = `<span class="settings-label">Current Time</span>`;
    const clock = createSegClock();
    clockGroup.appendChild(clock);
    panel.appendChild(clockGroup);

    /* ─── Group: Animation Intensity ─── */
    const animGroup = document.createElement('div');
    animGroup.className = 'settings-group';

    const animRow = document.createElement('div');
    animRow.className = 'settings-toggle-row';

    const animLabel = document.createElement('div');
    animLabel.innerHTML = `
      <span class="settings-toggle-label">Animations</span>
      <div style="font-size:0.72rem;color:var(--muted);margin-top:2px;line-height:1.4">
        Sidebar effects, signature drawing, particle backgrounds, contact glow
      </div>`;

    const toggleWrap = document.createElement('label');
    toggleWrap.className = 'settings-toggle';
    toggleWrap.setAttribute('aria-label', 'Toggle animations');

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = state.animations;
    toggleInput.id = 'settings-anim-toggle';

    const toggleTrack = document.createElement('div');
    toggleTrack.className = 'settings-toggle-track';

    toggleWrap.appendChild(toggleInput);
    toggleWrap.appendChild(toggleTrack);

    toggleInput.addEventListener('change', () => {
      state.animations = toggleInput.checked;
      save('animations', state.animations);
      applyAnimations(state.animations);
    });

    animRow.appendChild(animLabel);
    animRow.appendChild(toggleWrap);
    animGroup.appendChild(animRow);
    panel.appendChild(animGroup);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }

  /* ── Gear button ─────────────────────────────────────────── */
  function buildGearBtn() {
    const btn = document.createElement('button');
    btn.className = 'settings-btn';
    btn.id = 'settings-gear-btn';
    btn.setAttribute('aria-label', 'Open site settings');
    btn.setAttribute('title', 'Site Settings');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>`;

    btn.addEventListener('click', () => {
      const isOpen = btn.classList.contains('open');
      isOpen ? closePanel() : openPanel();
    });

    // Inject into nav-right
    const navRight = document.querySelector('.nav-right');
    if (navRight) {
      navRight.style.display = 'flex';
      navRight.style.alignItems = 'center';
      navRight.appendChild(btn);
    }
  }

  let clockInterval = null;

  function openPanel() {
    const overlay = document.getElementById('settings-overlay');
    const btn     = document.getElementById('settings-gear-btn');
    if (!overlay || !btn) return;
    overlay.classList.add('open');
    btn.classList.add('open');
    updateSegClock();
    clockInterval = setInterval(updateSegClock, 1000);
  }

  function closePanel() {
    const overlay = document.getElementById('settings-overlay');
    const btn     = document.getElementById('settings-gear-btn');
    if (!overlay || !btn) return;
    overlay.classList.remove('open');
    btn.classList.remove('open');
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
  }

  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    applyAll();
    buildPanel();
    buildGearBtn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();