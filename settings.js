/* ════════════════════════════════════════════════════════════
   Site Settings  –  settings.js
   A settings dialog after All-Space's: a header, then rows of label, hint and control.
   Palettes follow All-Space's tokens; style.css mixes every accent shade from --accent.
════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Storage ─────────────────────────────────────────────── */
  function save(key, val) {
    try { localStorage.setItem('site_setting_' + key, JSON.stringify(val)); } catch (_) {}
  }
  function load(key, fallback) {
    try {
      const v = localStorage.getItem('site_setting_' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (_) { return fallback; }
  }

  /* ── Palettes ────────────────────────────────────────────── */
  // Base tokens only; style.css derives glass, glows, rings and the navbar fade from these
  const PALETTES = {
    midnight: {
      label: 'Midnight',
      scheme: 'dark',
      colors: {
        '--bg': '#121722', '--bg-deep': '#0c0f15', '--card': '#0e1116', '--container': '#1c2330',
        '--border': '#283041', '--border-strong': '#3a4150',
        '--accent': '#7dd3fc', '--accent-contrast': '#06121c',
        '--text': '#e8edf2', '--muted': '#8b97a6',
        '--shadow': 'rgba(0, 0, 0, 0.45)', '--overlay': 'rgba(0, 0, 0, 0.55)',
      },
    },
    nord: {
      label: 'Nord',
      scheme: 'dark',
      colors: {
        '--bg': '#39414f', '--bg-deep': '#2b303b', '--card': '#2e3440', '--container': '#3b4252',
        '--border': '#434c5e', '--border-strong': '#4c566a',
        '--accent': '#88c0d0', '--accent-contrast': '#1b2330',
        '--text': '#eceff4', '--muted': '#9aa5b8',
        '--shadow': 'rgba(0, 0, 0, 0.45)', '--overlay': 'rgba(20, 24, 31, 0.55)',
      },
    },
    ember: {
      label: 'Ember',
      scheme: 'dark',
      colors: {
        '--bg': '#271d1a', '--bg-deep': '#150f0e', '--card': '#1a1413', '--container': '#2f2320',
        '--border': '#3b2c28', '--border-strong': '#503b35',
        '--accent': '#ff8a5c', '--accent-contrast': '#2a0f06',
        '--text': '#f4e9e2', '--muted': '#b89a8f',
        '--shadow': 'rgba(0, 0, 0, 0.5)', '--overlay': 'rgba(10, 6, 5, 0.55)',
      },
    },
    dawn: {
      label: 'Dawn',
      scheme: 'light',
      colors: {
        '--bg': '#eef2f8', '--bg-deep': '#e2e8f1', '--card': '#f6f8fb', '--container': '#ffffff',
        '--border': '#d6dce6', '--border-strong': '#bcc5d4',
        '--accent': '#3257d4', '--accent-contrast': '#ffffff',
        '--text': '#1b2330', '--muted': '#5a6573',
        '--shadow': 'rgba(27, 35, 48, 0.18)', '--overlay': 'rgba(27, 35, 48, 0.35)',
      },
    },
  };
  const DEFAULT_PALETTE = 'midnight';
  // Themes saved by the old panel
  const LEGACY = { dark: 'midnight', light: 'dawn', warm: 'ember' };

  function resolvePalette(id) {
    const name = LEGACY[id] || id;
    return PALETTES[name] ? name : DEFAULT_PALETTE;
  }

  /* ── State ───────────────────────────────────────────────── */
  const FONT_MIN = 70, FONT_MAX = 150, FONT_STEP = 5;

  const state = {
    theme:      resolvePalette(load('theme', DEFAULT_PALETTE)),
    fontSize:   Math.min(FONT_MAX, Math.max(FONT_MIN, load('fontSize', 100))),
    animations: load('animations', true),
    debug:      load('debug', false),
  };

  window.SiteSettings = {
    get animationsEnabled() { return state.animations; },
    get debugMode() { return state.debug; },
    get theme() { return state.theme; },
  };

  /* ── Applying settings ───────────────────────────────────── */
  let swapTimer = null;

  function applyTheme(name, fade) {
    const palette = PALETTES[name];
    const root = document.documentElement;
    // Fade colors on a user's switch, never on first paint
    if (fade && state.animations) {
      root.classList.add('palette-swap');
      clearTimeout(swapTimer);
      swapTimer = setTimeout(() => root.classList.remove('palette-swap'), 400);
    }
    Object.entries(palette.colors).forEach(([k, v]) => root.style.setProperty(k, v));
    root.style.colorScheme = palette.scheme;
    root.setAttribute('data-theme', name);
  }

  function applyFontSize(pct) {
    document.documentElement.style.fontSize = (pct / 100) + 'rem';
  }

  function applyAnimations(enabled) {
    document.body.classList.toggle('no-animations', !enabled);
  }

  /* ── Dialog building blocks ──────────────────────────────── */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // One line of the dialog: label and hint on the left, the control on the right
  function row(label, hint, control, opts = {}) {
    const r = el('div', 'settings-row' + (opts.stacked ? ' stacked' : ''));
    const text = el('div', 'settings-row-text');
    const lab = el(opts.forId ? 'label' : 'div', 'settings-row-label', label);
    if (opts.forId) lab.htmlFor = opts.forId;
    text.appendChild(lab);
    if (hint) text.appendChild(el('div', 'settings-row-hint', hint));
    r.appendChild(text);
    r.appendChild(control);
    return r;
  }

  function buildThemeControl() {
    const group = el('div', 'settings-swatches');
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', 'Color theme');

    Object.entries(PALETTES).forEach(([id, p]) => {
      const btn = el('button', 'settings-swatch');
      btn.type = 'button';
      btn.setAttribute('role', 'radio');
      btn.dataset.palette = id;

      // A miniature of the palette: a nav strip, the page, and a card with a heading in the accent and body text
      const c = p.colors;
      const preview = el('span', 'settings-swatch-preview');
      preview.style.background = `linear-gradient(180deg, ${c['--bg']}, ${c['--bg-deep']})`;
      preview.style.borderColor = c['--border'];
      const nav = el('span', 'settings-swatch-nav');
      nav.style.background = c['--card'];
      nav.style.borderColor = c['--border'];
      const card = el('span', 'settings-swatch-card');
      card.style.background = c['--container'];
      card.style.borderColor = c['--border-strong'];
      const heading = el('span', 'settings-swatch-heading');
      heading.style.background = c['--accent'];
      const text = el('span', 'settings-swatch-text');
      text.style.background = c['--text'];
      const textShort = el('span', 'settings-swatch-text short');
      textShort.style.background = c['--muted'];
      card.append(heading, text, textShort);
      preview.append(nav, card);

      btn.append(preview, el('span', 'settings-swatch-label', p.label));
      btn.addEventListener('click', () => {
        state.theme = id;
        save('theme', id);
        applyTheme(id, true);
        syncSwatches(group);
      });
      group.appendChild(btn);
    });

    syncSwatches(group);
    return group;
  }

  function syncSwatches(group) {
    group.querySelectorAll('.settings-swatch').forEach(b => {
      const on = b.dataset.palette === state.theme;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on);
    });
  }

  function buildFontControl() {
    const wrap = el('div', 'settings-font');
    const slider = el('input', 'settings-slider');
    slider.type = 'range';
    slider.id = 'settings-font';
    slider.min = FONT_MIN;
    slider.max = FONT_MAX;
    slider.step = FONT_STEP;
    slider.value = state.fontSize;

    const val = el('span', 'settings-font-val');
    const reset = el('button', 'settings-button', 'Reset');
    reset.type = 'button';

    function sync() {
      const pct = ((slider.value - FONT_MIN) / (FONT_MAX - FONT_MIN) * 100).toFixed(1) + '%';
      slider.style.setProperty('--slider-pct', pct);
      val.textContent = slider.value + '%';
      reset.disabled = Number(slider.value) === 100;
    }

    function set(pct) {
      state.fontSize = pct;
      save('fontSize', pct);
      slider.value = pct;
      sync();
      applyFontSize(pct);
    }

    slider.addEventListener('input', () => set(Number(slider.value)));
    reset.addEventListener('click', () => set(100));
    sync();

    wrap.append(slider, val, reset);
    return wrap;
  }

  // A switch for one boolean in state, saved under the same key
  function buildToggle(id, key, onChange) {
    const toggle = el('label', 'settings-toggle');
    const input = el('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = state[key];
    input.addEventListener('change', () => {
      state[key] = input.checked;
      save(key, state[key]);
      if (onChange) onChange(state[key]);
    });
    toggle.append(input, el('span', 'settings-toggle-track'));
    return toggle;
  }

  /* ── Dialog ──────────────────────────────────────────────── */
  function buildDialog() {
    const overlay = el('div', 'settings-overlay');
    overlay.id = 'settings-overlay';
    overlay.addEventListener('pointerdown', e => { if (e.target === overlay) closeDialog(); });

    const dialog = el('div', 'settings-dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'settings-title');

    const header = el('div', 'settings-header');
    const title = el('h2', 'settings-title', 'Settings');
    title.id = 'settings-title';
    const close = el('button', 'settings-close', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close settings');
    close.addEventListener('click', closeDialog);
    header.append(title, close);

    const content = el('div', 'settings-content');
    content.append(
      row('Color theme', null, buildThemeControl(), { stacked: true }),
      row('Text size', 'Scales all text on the site', buildFontControl(), { forId: 'settings-font' }),
      row('Animations', 'Banner trace, card particles and logo effects', buildToggle('settings-anim', 'animations',
        on => {
          applyAnimations(on);
          if (window._applyBannerState) window._applyBannerState(on);
        }), { forId: 'settings-anim' }),
      row('Debug mode', 'Display developer-only tools', buildToggle('settings-debug', 'debug'),
        { forId: 'settings-debug' }),
    );

    dialog.append(header, content);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeDialog();
    });
  }

  function buildGearBtn() {
    const btn = el('button', 'settings-btn');
    btn.type = 'button';
    btn.id = 'settings-gear-btn';
    btn.setAttribute('aria-label', 'Open site settings');
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.title = 'Settings';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>`;
    btn.addEventListener('click', () => {
      document.getElementById('settings-overlay').classList.contains('open') ? closeDialog() : openDialog();
    });

    const navRight = document.querySelector('.nav-right');
    if (navRight) {
      navRight.style.display = 'flex';
      navRight.style.alignItems = 'center';
      navRight.appendChild(btn);
    }
  }

  function openDialog() {
    document.getElementById('settings-overlay').classList.add('open');
    document.getElementById('settings-gear-btn').classList.add('open');
    document.querySelector('.settings-swatch.active')?.focus();
  }

  function closeDialog() {
    const overlay = document.getElementById('settings-overlay');
    if (!overlay.classList.contains('open')) return;
    overlay.classList.remove('open');
    const btn = document.getElementById('settings-gear-btn');
    btn.classList.remove('open');
    btn.focus();
  }

  /* ── Init ────────────────────────────────────────────────── */
  // Colors and size go on <html> right away so the first paint already has them
  applyTheme(state.theme, false);
  applyFontSize(state.fontSize);

  function init() {
    applyAnimations(state.animations);
    buildDialog();
    buildGearBtn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
