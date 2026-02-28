const popup    = document.getElementById('popup');
const popFrame = document.getElementById('popup-frame');
const closeBtn = popup.querySelector('.close');

function openPopup(url) {
  popFrame.src = url;
  popup.classList.remove('hidden');
}

function closePopup() {
  popup.classList.add('hidden');
  popFrame.src = '';
}

closeBtn.addEventListener('click', closePopup);
popup.addEventListener('click', e => { if (e.target === popup) closePopup(); });

function initExpLogoSpin() {
  const ENTER_RADIUS = 70;
  const EXIT_RADIUS  = 120;
  const logoStates   = new WeakMap();

  function getState(logo) {
    if (!logoStates.has(logo)) logoStates.set(logo, { spinning: false, angle: 0 });
    return logoStates.get(logo);
  }

  document.addEventListener('mousemove', e => {
    if (window.SiteSettings && !window.SiteSettings.animationsEnabled) return;
    document.querySelectorAll('.exp-logo').forEach(logo => {
      const rect  = logo.getBoundingClientRect();
      const dist  = Math.hypot(e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2));
      const state = getState(logo);

      if (!state.spinning && dist <= ENTER_RADIUS) {
        state.spinning = true;
        state.angle   += 360;
        logo.style.transition = 'transform 0.7s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease, filter 0.3s ease';
        logo.style.transform  = `rotate(${state.angle}deg) scale(1.12)`;
        logo.style.opacity    = '1';
        logo.style.filter     = 'drop-shadow(0 0 12px rgba(125,211,252,0.85))';
      } else if (state.spinning && dist > EXIT_RADIUS) {
        state.spinning = false;
        state.angle    = Math.round(state.angle / 360) * 360;
        logo.style.transition = 'transform 0.7s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease, filter 0.3s ease';
        logo.style.transform  = `rotate(${state.angle}deg) scale(1)`;
        logo.style.opacity    = '0.6';
        logo.style.filter     = 'drop-shadow(0 0 6px rgba(125,211,252,0.4))';
      }
    });
  });
}

let _eduAbortController = null;
let eduCourses     = [];
let eduDisciplines = new Set();
let eduOrgs        = new Set();
let eduSortOrder   = ['organization', 'number', 'department', 'semester'];
let eduReverseSort = false;
let eduViewMode    = 'card';
let eduFilters     = { organizations: new Set(), disciplines: new Set() };

let _projAbortController = null;
let projProjects    = [];
let projOrgs        = new Set();
let projSortOrder   = ['title', 'organization', 'difficulty', 'has-link', 'has-repo'];
let projReverseSort = false;
let projViewMode    = 'card';
let projFilters     = { organizations: new Set() };

let _resAbortController = null;
let resItems       = [];
let resOrgs        = new Set();
let resFields      = new Set();
let resSortOrder   = ['title', 'organization', 'year', 'field'];
let resReverseSort = false;
let resViewMode    = 'card';
let resFilters     = { organizations: new Set(), fields: new Set() };

function initExperience() {
  initExpLogoSpin();
  const tabs   = document.querySelectorAll('.exp-tab');
  const inkEl  = document.querySelector('.exp-ink');
  const panels = {
    projects:  document.getElementById('exp-panel-projects'),
    education: document.getElementById('exp-panel-education'),
    research:  document.getElementById('exp-panel-research'),
  };

  let activeTab   = 'projects';
  let projInited  = false;
  let eduInited   = false;
  let resInited   = false;

  function positionInk(tabEl) {
    if (!inkEl || !tabEl) return;
    inkEl.style.left  = tabEl.offsetLeft + 'px';
    inkEl.style.width = tabEl.offsetWidth + 'px';
  }

  function switchTab(name) {
    activeTab = name;
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    Object.entries(panels).forEach(([k, el]) => { el.hidden = k !== name; });
    positionInk(document.querySelector(`.exp-tab[data-tab="${name}"]`));

    if (name === 'projects' && !projInited) {
      projInited = true;
      initProjectsPanel();
    }
    if (name === 'education' && !eduInited) {
      eduInited = true;
      initEducationPanel();
    }
    if (name === 'research' && !resInited) {
      resInited = true;
      initResearchPanel();
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  requestAnimationFrame(() => {
    positionInk(document.querySelector('.exp-tab.active'));
  });

  switchTab('projects');

  window.addEventListener('resize', () => {
    positionInk(document.querySelector('.exp-tab.active'));
  });
}

/* ═══════════════════════════════════════════════════════════
═══════════════════════════════════════════════════════════ */
function makeDragAndDrop(containerId, onReorder) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let draggedChip = null;
  let placeholder = null;

  function attachChip(chip) {
    chip.addEventListener('dragstart', e => {
      draggedChip = chip;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', chip.dataset.sort);

      
      placeholder = document.createElement('div');
      placeholder.className = 'exp-sort-chip-placeholder';
      
      placeholder.style.height = chip.getBoundingClientRect().height + 'px';

      
      chip.after(placeholder);

      
      
      requestAnimationFrame(() => {
        chip.classList.add('dragging');
      });
    });

    chip.addEventListener('dragend', () => {
      chip.classList.remove('dragging');
      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
      }
      placeholder = null;
      draggedChip = null;
    });
  }

  container.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedChip || !placeholder) return;

    
    const target = e.target.closest('.exp-sort-chip');
    if (!target || target === draggedChip) return;

    const rect = target.getBoundingClientRect();
    const mid  = rect.top + rect.height / 2;

    if (e.clientY < mid) {
      
      if (placeholder.nextSibling !== target) {
        container.insertBefore(placeholder, target);
      }
    } else {
      
      if (target.nextSibling !== placeholder) {
        container.insertBefore(placeholder, target.nextSibling);
      }
    }
  });

  container.addEventListener('drop', e => {
    e.preventDefault();
    if (!draggedChip || !placeholder || !placeholder.parentNode) return;
    
    placeholder.parentNode.replaceChild(draggedChip, placeholder);
    draggedChip.classList.remove('dragging');
    placeholder = null;
    onReorder([...container.querySelectorAll('.exp-sort-chip')].map(c => c.dataset.sort));
  });

  container.querySelectorAll('.exp-sort-chip').forEach(attachChip);
}

/* ═══════════════════════════════════════════════════════════
═══════════════════════════════════════════════════════════ */
function initProjectsPanel() {
  const PROJ_JSON = './data/projects/projects.json';

  if (_projAbortController) _projAbortController.abort();
  _projAbortController = new AbortController();
  const { signal } = _projAbortController;

  projProjects    = [];
  projOrgs        = new Set();
  projSortOrder   = ['title', 'organization', 'difficulty', 'has-link', 'has-repo'];
  projReverseSort = false;
  projViewMode    = 'card';
  projFilters     = { organizations: new Set() };

  const statusEl   = document.getElementById('proj-status');
  const listEl     = document.getElementById('proj-list');
  const qEl        = document.getElementById('proj-q');
  const viewBtn    = document.getElementById('proj-view-btn');
  const viewDrop   = document.getElementById('proj-view-drop');
  const sortBtn    = document.getElementById('proj-sort-btn');
  const sortDrop   = document.getElementById('proj-sort-drop');
  const filterBtn  = document.getElementById('proj-filter-btn');
  const filterDrop = document.getElementById('proj-filter-drop');
  const reverseBtn = document.getElementById('proj-reverse-btn');
  const clearBtn   = document.getElementById('proj-clear-btn');
  const applyBtn   = document.getElementById('proj-apply-btn');

  function showStatus(msg, type = 'loading', retry = false) {
    statusEl.className = `exp-status ${type}`;
    statusEl.innerHTML = '';
    const t = document.createElement('div');
    t.textContent = msg;
    statusEl.appendChild(t);
    if (retry) {
      const btn = document.createElement('button');
      btn.textContent = 'Retry';
      btn.className = 'exp-retry-btn';
      btn.onclick = fetchProjects;
      statusEl.appendChild(btn);
    }
    statusEl.hidden = false;
    listEl.hidden = true;
  }

  function clearStatus() {
    statusEl.hidden = true;
    listEl.hidden = false;
  }

  async function fetchProjects() {
    showStatus('Loading projects…');
    try {
      const res = await fetch(PROJ_JSON, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Expected an array.');
      projProjects = data;
      projOrgs.clear();
      projProjects.forEach(p => { if (p.organization) projOrgs.add(p.organization); });
      populateFilters();
      updateDisplay();
      setTimeout(() => makeDragAndDrop('proj-sort-chips', order => { projSortOrder = order; updateDisplay(); }), 80);
    } catch (err) {
      console.error(err);
      showStatus('Failed to load projects. ' + err.message, 'error', true);
    }
  }

  function populateFilters() {
    const orgEl = document.getElementById('proj-org-filters');
    orgEl.innerHTML = '';
    [...projOrgs].sort().forEach(v => orgEl.appendChild(makeFilterOption('proj', 'org', v)));
  }

  function makeFilterOption(prefix, type, value) {
    const wrap = document.createElement('div');
    wrap.className = 'exp-filter-option';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = `${prefix}-filter-${type}-${value.replace(/\s+/g, '-')}`;
    cb.value = value;
    cb.dataset.type = type;
    const lbl = document.createElement('label');
    lbl.htmlFor = cb.id;
    lbl.textContent = value;
    wrap.appendChild(cb);
    wrap.appendChild(lbl);
    return wrap;
  }

  function renderProjects(items) {
    listEl.innerHTML = '';
    if (!items.length) { showStatus('No projects found.', 'empty'); return; }
    clearStatus();

    listEl.classList.toggle('list-view', projViewMode === 'list');

    if (projViewMode === 'list') {
      renderListView(items);
    } else {
      renderCardView(items);
    }
  }

  function renderListView(items) {
    items.forEach(p => {
      const el = document.createElement('div');
      el.className = 'course-list-item';
      el.dataset.title = (p.title || '').toLowerCase();
      el.dataset.organization = (p.organization || '').toLowerCase();

      const inner = document.createElement('span');
      inner.textContent = p.title || 'Untitled';
      el.appendChild(inner);

      listEl.appendChild(el);
    });
  }

  function renderCardView(items) {
    items.forEach(p => {
      const card = document.createElement('article');
      card.className = 'project-card';
      card.dataset.title = (p.title || '').toLowerCase();
      card.dataset.organization = (p.organization || '').toLowerCase();

      if (p.organization) {
        const org = document.createElement('div');
        org.className = 'organization';
        org.textContent = p.organization;
        card.appendChild(org);
      }

      const thumb = document.createElement('div');
      thumb.className = 'project-thumb';
      if (p.thumbnail) {
        thumb.style.background = `url(${p.thumbnail}) center/cover`;
      } else {
        thumb.textContent = (p.title || 'P').trim().slice(0, 2).toUpperCase();
      }

      if (p.difficulty) {
        const diff = document.createElement('div');
        diff.className = 'project-difficulty';
        diff.textContent = '★'.repeat(p.difficulty) + '☆'.repeat(Math.max(0, 3 - p.difficulty));
        card.appendChild(diff);
      }

      const meta = document.createElement('div');
      meta.className = 'project-meta';

      const title = document.createElement('h2');
      title.className = 'project-title';
      title.textContent = p.title || 'Untitled';
      meta.appendChild(title);

      if (p.description) {
        const desc = document.createElement('p');
        desc.className = 'project-desc';
        desc.textContent = p.description;
        meta.appendChild(desc);
      }

      if ((p.tags || []).length || p.url || p.repo) {
        const row = document.createElement('div');
        row.className = 'project-meta-row';

        const tags = document.createElement('div');
        tags.className = 'project-tags';
        (p.tags || []).slice(0, 6).forEach(t => {
          const s = document.createElement('span');
          s.className = 'project-tag';
          s.textContent = t;
          tags.appendChild(s);
        });

        const links = document.createElement('div');
        links.className = 'project-links';

        if (p.url) {
          const a = document.createElement('a');
          a.href = '#';
          a.className = 'project-link';
          a.innerHTML = '🔗 Go to Project';
          a.title = 'View project';
          a.setAttribute('aria-label', `Open ${p.title || 'project'}`);
          a.addEventListener('click', e => { e.preventDefault(); openPopup(p.url); });
          links.appendChild(a);
        }

        if (p.repo) {
          const a = document.createElement('a');
          a.href = p.repo;
          a.className = 'project-link';
          a.innerHTML = '📦 Go to Repo';
          a.title = 'View repository';
          a.setAttribute('aria-label', `Repo for ${p.title || 'project'}`);
          a.addEventListener('click', e => { e.preventDefault(); window.open(p.repo, '_blank', 'noopener,noreferrer'); });
          links.appendChild(a);
        }

        row.appendChild(tags);
        row.appendChild(links);
        meta.appendChild(row);
      }

      card.appendChild(thumb);
      card.appendChild(meta);
      listEl.appendChild(card);
    });
  }

  function filterAndSort() {
    const q = (qEl.value || '').trim().toLowerCase();
    let filtered = projProjects.filter(p => {
      const matchQ = !q ||
        (p.title || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (p.organization || '').toLowerCase().includes(q);
      const matchOrg = projFilters.organizations.size === 0 || projFilters.organizations.has(p.organization);
      return matchQ && matchOrg;
    });

    filtered = [...filtered].sort((a, b) => {
      for (const crit of projSortOrder) {
        let cmp = 0;
        if (crit === 'title')        cmp = (a.title || '').localeCompare(b.title || '');
        else if (crit === 'organization') cmp = (a.organization || '').localeCompare(b.organization || '');
        else if (crit === 'difficulty')   cmp = (a.difficulty || 0) - (b.difficulty || 0);
        else if (crit === 'has-link')     cmp = (b.url  ? 1 : 0) - (a.url  ? 1 : 0);
        else if (crit === 'has-repo')     cmp = (b.repo ? 1 : 0) - (a.repo ? 1 : 0);
        if (cmp !== 0) return projReverseSort ? -cmp : cmp;
      }
      return 0;
    });

    return filtered;
  }

  function updateDisplay() {
    renderProjects(filterAndSort());
  }

  // Dropdown helpers
  function closeAllDropdowns() {
    viewDrop.hidden = true;
    sortDrop.hidden = true;
    filterDrop.hidden = true;
  }

  function toggleDropdown(target) {
    const wasHidden = target.hidden;
    closeAllDropdowns();
    target.hidden = !wasHidden;
  }

  viewBtn.addEventListener('click',   e => { e.stopPropagation(); toggleDropdown(viewDrop); });
  sortBtn.addEventListener('click',   e => { e.stopPropagation(); toggleDropdown(sortDrop); });
  filterBtn.addEventListener('click', e => { e.stopPropagation(); toggleDropdown(filterDrop); });

  document.addEventListener('click', e => {
    if (!viewBtn.contains(e.target)   && !viewDrop.contains(e.target))   viewDrop.hidden   = true;
    if (!sortBtn.contains(e.target)   && !sortDrop.contains(e.target))   sortDrop.hidden   = true;
    if (!filterBtn.contains(e.target) && !filterDrop.contains(e.target)) filterDrop.hidden = true;
  }, { signal });

  document.querySelectorAll('input[name="proj-view"]').forEach(r => {
    r.addEventListener('change', e => { projViewMode = e.target.value; viewDrop.hidden = true; updateDisplay(); });
  });

  reverseBtn.addEventListener('click', () => {
    projReverseSort = !projReverseSort;
    reverseBtn.classList.toggle('active', projReverseSort);
    updateDisplay();
  });

  clearBtn.addEventListener('click', () => {
    projFilters.organizations.clear();
    document.querySelectorAll('#proj-filter-drop input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    updateDisplay();
  });

  applyBtn.addEventListener('click', () => {
    projFilters.organizations.clear();
    document.querySelectorAll('#proj-filter-drop input[type="checkbox"]:checked').forEach(cb => {
      if (cb.dataset.type === 'org') projFilters.organizations.add(cb.value);
    });
    updateDisplay();
  });

  qEl.addEventListener('input', updateDisplay);

  fetchProjects();
}

/* ═══════════════════════════════════════════════════════════
═══════════════════════════════════════════════════════════ */
function initEducationPanel() {
  const EDU_JSON = './data/education.json';

  if (_eduAbortController) _eduAbortController.abort();
  _eduAbortController = new AbortController();
  const { signal } = _eduAbortController;

  eduCourses     = [];
  eduDisciplines = new Set();
  eduOrgs        = new Set();
  eduSortOrder   = ['organization', 'number', 'department', 'semester'];
  eduReverseSort = false;
  eduViewMode    = 'card';
  eduFilters     = { organizations: new Set(), disciplines: new Set() };

  const statusEl   = document.getElementById('edu-status');
  const contentEl  = document.getElementById('edu-content');
  const qEl        = document.getElementById('edu-q');
  const viewBtn    = document.getElementById('edu-view-btn');
  const viewDrop   = document.getElementById('edu-view-drop');
  const sortBtn    = document.getElementById('edu-sort-btn');
  const sortDrop   = document.getElementById('edu-sort-drop');
  const filterBtn  = document.getElementById('edu-filter-btn');
  const filterDrop = document.getElementById('edu-filter-drop');
  const reverseBtn = document.getElementById('edu-reverse-btn');
  const clearBtn   = document.getElementById('edu-clear-btn');
  const applyBtn   = document.getElementById('edu-apply-btn');

  function showStatus(msg, type = 'loading', retry = false) {
    statusEl.className = `exp-status ${type}`;
    statusEl.innerHTML = '';
    const t = document.createElement('div');
    t.textContent = msg;
    statusEl.appendChild(t);
    if (retry) {
      const btn = document.createElement('button');
      btn.className = 'exp-retry-btn';
      btn.textContent = 'Retry';
      btn.onclick = fetchEducation;
      statusEl.appendChild(btn);
    }
    statusEl.hidden = false;
    contentEl.hidden = true;
  }

  function clearStatus() {
    statusEl.hidden = true;
    contentEl.hidden = false;
  }

  async function fetchEducation() {
    showStatus('Loading courses…');
    try {
      const res = await fetch(EDU_JSON, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (typeof data !== 'object' || Array.isArray(data))
        throw new Error('Expected an object keyed by institution.');

      eduCourses    = [];
      eduDisciplines.clear();
      eduOrgs.clear();

      Object.entries(data).forEach(([inst, courses]) => {
        eduOrgs.add(inst);
        if (Array.isArray(courses)) {
          courses.forEach(c => {
            eduCourses.push({ ...c, institution: inst });
            if (c.discipline) eduDisciplines.add(c.discipline);
          });
        }
      });

      populateFilters();
      updateDisplay();
      setTimeout(initDragAndDrop, 80);
    } catch (err) {
      console.error(err);
      showStatus('Failed to load courses. ' + err.message, 'error', true);
    }
  }

  function populateFilters() {
    const orgEl  = document.getElementById('edu-org-filters');
    const discEl = document.getElementById('edu-disc-filters');
    orgEl.innerHTML  = '';
    discEl.innerHTML = '';
    [...eduOrgs].sort().forEach(v  => orgEl.appendChild(makeFilterOption('org',  v)));
    [...eduDisciplines].sort().forEach(v => discEl.appendChild(makeFilterOption('disc', v)));
  }

  function makeFilterOption(type, value) {
    const wrap = document.createElement('div');
    wrap.className = 'exp-filter-option';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = `edu-filter-${type}-${value.replace(/\s+/g,'-')}`;
    cb.value = value;
    cb.dataset.type = type;
    const lbl = document.createElement('label');
    lbl.htmlFor = cb.id;
    lbl.textContent = value;
    wrap.appendChild(cb);
    wrap.appendChild(lbl);
    return wrap;
  }

  function renderEducation() {
    contentEl.innerHTML = '';
    if (!eduCourses.length) { showStatus('No courses found.', 'empty'); return; }
    clearStatus();

    contentEl.classList.toggle('list-view', eduViewMode === 'list');

    const sorted = [...eduCourses].sort((a, b) => {
      for (const crit of eduSortOrder) {
        let cmp = 0;
        if (crit === 'organization') cmp = (a.institution || '').localeCompare(b.institution || '');
        else if (crit === 'department') cmp = dept(a.number).localeCompare(dept(b.number));
        else if (crit === 'number')    cmp = courseNum(a.number) - courseNum(b.number);
        else if (crit === 'semester')  cmp = cmpSem(a.semester, b.semester);
        if (cmp !== 0) return eduReverseSort ? -cmp : cmp;
      }
      return 0;
    });

    if (eduViewMode === 'list') renderListView(sorted);
    else renderCardView(sorted);
  }

  function renderListView(courses) {
    courses.forEach(c => {
      if (!c.title) return;
      const el = document.createElement('div');
      el.className = 'course-list-item';
      el.dataset.title = (c.title || '').toLowerCase();
      el.dataset.number = (c.number || '').toLowerCase();
      el.dataset.discipline = c.discipline || '';
      el.dataset.institution = c.institution || '';
      el.dataset.description = (c.description || '').toLowerCase();
      el.dataset.tags = (c.tags || []).join(' ').toLowerCase();

      const inner = document.createElement('span');
      inner.innerHTML = c.number
        ? `<span class="course-list-number">${c.number}</span>${c.title}`
        : c.title;
      el.appendChild(inner);

      contentEl.appendChild(el);
    });
  }

  function renderCardView(courses) {
    courses.forEach(c => {
      if (!c.title) return;

      const card = document.createElement('article');
      card.className = 'course-card';
      card.dataset.title = (c.title || '').toLowerCase();
      card.dataset.number = (c.number || '').toLowerCase();
      card.dataset.discipline = c.discipline || '';
      card.dataset.institution = c.institution || '';
      card.dataset.description = (c.description || '').toLowerCase();
      card.dataset.tags = (c.tags || []).join(' ').toLowerCase();

      const badge = document.createElement('div');
      badge.className = 'institution-badge';
      badge.textContent = c.institution;
      card.appendChild(badge);

      const thumb = document.createElement('div');
      thumb.className = 'course-thumb';
      thumb.dataset.discipline = c.discipline || '';
      if (c.image) {
        thumb.style.background = `url(${c.image}) center/cover`;
      } else {
        thumb.textContent = c.number
          ? c.number.replace(/[^A-Z0-9]/g,'').slice(0,4)
          : (c.title || 'COUR').trim().slice(0,4).toUpperCase();
      }

      const meta = document.createElement('div');
      meta.className = 'course-meta';

      const hdr = document.createElement('div');
      hdr.className = 'course-header';
      if (c.number) {
        const num = document.createElement('span');
        num.className = 'course-number';
        num.textContent = c.number;
        hdr.appendChild(num);
      }
      const ttl = document.createElement('h3');
      ttl.className = 'course-title';
      ttl.textContent = c.title;
      hdr.appendChild(ttl);
      meta.appendChild(hdr);

      if (c.description) {
        const d = document.createElement('p');
        d.className = 'course-description';
        d.textContent = c.description;
        meta.appendChild(d);
      }

      const tags = document.createElement('div');
      tags.className = 'course-tags';
      if (c.discipline) { const s = document.createElement('span'); s.className = 'course-tag'; s.textContent = c.discipline; tags.appendChild(s); }
      if (c.semester)   { const s = document.createElement('span'); s.className = 'course-tag'; s.textContent = c.semester;   tags.appendChild(s); }
      (c.tags || []).forEach(t => { const s = document.createElement('span'); s.className = 'course-tag'; s.textContent = t; tags.appendChild(s); });

      // Put tags + View Work button on the same row (mirroring project-meta-row layout)
      if (tags.children.length || c.repo) {
        const row = document.createElement('div');
        row.className = 'project-meta-row';
        row.style.marginTop = '8px';

        if (tags.children.length) row.appendChild(tags);

        if (c.repo) {
          const links = document.createElement('div');
          links.className = 'project-links';
          const a = document.createElement('a');
          a.href = c.repo;
          a.className = 'project-link';
          a.textContent = '📦 View Work';
          a.addEventListener('click', ev => { ev.preventDefault(); window.open(c.repo, '_blank', 'noopener,noreferrer'); });
          links.appendChild(a);
          row.appendChild(links);
        }

        meta.appendChild(row);
      }

      card.appendChild(thumb);
      card.appendChild(meta);
      contentEl.appendChild(card);
    });
  }

  function filterCourses() {
    const q = (qEl.value || '').trim().toLowerCase();
    const sel = eduViewMode === 'list'
      ? contentEl.querySelectorAll('.course-list-item')
      : contentEl.querySelectorAll('.course-card');

    let visible = 0;
    sel.forEach(el => {
      const title = el.dataset.title || '';
      const num   = el.dataset.number || '';
      const disc  = (el.dataset.discipline || '').toLowerCase();
      const inst  = (el.dataset.institution || '').toLowerCase();
      const desc  = el.dataset.description || '';
      const tags  = el.dataset.tags || '';

      const matchQ = !q || title.includes(q) || num.includes(q) || disc.includes(q) || inst.includes(q) || desc.includes(q) || tags.includes(q);
      const matchO = eduFilters.organizations.size === 0 || eduFilters.organizations.has(el.dataset.institution);
      const matchD = eduFilters.disciplines.size === 0   || eduFilters.disciplines.has(el.dataset.discipline);

      const show = matchQ && matchO && matchD;
      el.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    if (!visible && eduCourses.length) showStatus('No courses match your filters.', 'empty');
    else if (eduCourses.length) clearStatus();
  }

  function updateDisplay() { renderEducation(); filterCourses(); }

  function dept(n) { if (!n) return ''; const m = n.match(/^([A-Za-z]+)/); return m ? m[1].toUpperCase() : ''; }
  function courseNum(n) { if (!n) return 0; const m = n.match(/(\d+)/); return m ? parseInt(m[1]) : 0; }
  function parseSem(s) {
    if (!s) return { y: 0, s: 0 };
    const lo = s.toLowerCase().trim();
    const ry = lo.match(/(\d{4})\s*-\s*\d{4}/);
    if (ry) return { y: parseInt(ry[1]), s: 2 };
    const rs = lo.match(/(spring|summer|fall)\s+(\d{4})/);
    if (rs) return { y: parseInt(rs[2]), s: {spring:0,summer:1,fall:2}[rs[1]] ?? 0 };
    return { y: 0, s: 0 };
  }
  function cmpSem(a, b) { const pa = parseSem(a), pb = parseSem(b); return pa.y !== pb.y ? pa.y - pb.y : pa.s - pb.s; }

  function initDragAndDrop() {
    makeDragAndDrop('edu-sort-chips', order => { eduSortOrder = order; updateDisplay(); });
  }

  function closeAllDropdowns() {
    viewDrop.hidden   = true;
    sortDrop.hidden   = true;
    filterDrop.hidden = true;
  }

  function toggleDropdown(target) {
    const wasHidden = target.hidden;
    closeAllDropdowns();
    target.hidden = !wasHidden;
  }

  viewBtn.addEventListener('click',   e => { e.stopPropagation(); toggleDropdown(viewDrop); });
  sortBtn.addEventListener('click',   e => { e.stopPropagation(); toggleDropdown(sortDrop); });
  filterBtn.addEventListener('click', e => { e.stopPropagation(); toggleDropdown(filterDrop); });

  document.addEventListener('click', e => {
    if (!viewBtn.contains(e.target)   && !viewDrop.contains(e.target))   viewDrop.hidden   = true;
    if (!sortBtn.contains(e.target)   && !sortDrop.contains(e.target))   sortDrop.hidden   = true;
    if (!filterBtn.contains(e.target) && !filterDrop.contains(e.target)) filterDrop.hidden = true;
  }, { signal });

  document.querySelectorAll('input[name="edu-view"]').forEach(r => {
    r.addEventListener('change', e => { eduViewMode = e.target.value; viewDrop.hidden = true; updateDisplay(); });
  });

  reverseBtn.addEventListener('click', () => {
    eduReverseSort = !eduReverseSort;
    reverseBtn.classList.toggle('active', eduReverseSort);
    updateDisplay();
  });

  clearBtn.addEventListener('click', () => {
    eduFilters.organizations.clear();
    eduFilters.disciplines.clear();
    contentEl.querySelectorAll('.exp-filter-option input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    updateDisplay();
  });

  applyBtn.addEventListener('click', () => {
    eduFilters.organizations.clear();
    eduFilters.disciplines.clear();
    document.querySelectorAll('#edu-filter-drop input[type="checkbox"]:checked').forEach(cb => {
      if (cb.dataset.type === 'org')  eduFilters.organizations.add(cb.value);
      if (cb.dataset.type === 'disc') eduFilters.disciplines.add(cb.value);
    });
    updateDisplay();
  });

  qEl.addEventListener('input', filterCourses);

  fetchEducation();
}

/* ═══════════════════════════════════════════════════════════
═══════════════════════════════════════════════════════════ */
function initResearchPanel() {
  const RES_JSON = './data/research.json';

  if (_resAbortController) _resAbortController.abort();
  _resAbortController = new AbortController();
  const { signal } = _resAbortController;

  resItems        = [];
  resOrgs         = new Set();
  resFields       = new Set();
  resSortOrder    = ['title', 'organization', 'year', 'field'];
  resReverseSort  = false;
  resViewMode     = 'card';
  resFilters      = { organizations: new Set(), fields: new Set() };

  const statusEl   = document.getElementById('res-status');
  const contentEl  = document.getElementById('res-content');
  const qEl        = document.getElementById('res-q');
  const viewBtn    = document.getElementById('res-view-btn');
  const viewDrop   = document.getElementById('res-view-drop');
  const sortBtn    = document.getElementById('res-sort-btn');
  const sortDrop   = document.getElementById('res-sort-drop');
  const filterBtn  = document.getElementById('res-filter-btn');
  const filterDrop = document.getElementById('res-filter-drop');
  const reverseBtn = document.getElementById('res-reverse-btn');
  const clearBtn   = document.getElementById('res-clear-btn');
  const applyBtn   = document.getElementById('res-apply-btn');

  function showStatus(msg, type = 'loading', retry = false) {
    statusEl.className = `exp-status ${type}`;
    statusEl.innerHTML = '';
    const t = document.createElement('div');
    t.textContent = msg;
    statusEl.appendChild(t);
    if (retry) {
      const btn = document.createElement('button');
      btn.className = 'exp-retry-btn';
      btn.textContent = 'Retry';
      btn.onclick = fetchResearch;
      statusEl.appendChild(btn);
    }
    statusEl.hidden = false;
    contentEl.hidden = true;
  }

  function clearStatus() {
    statusEl.hidden = true;
    contentEl.hidden = false;
  }

  async function fetchResearch() {
    showStatus('Loading research…');
    try {
      const res = await fetch(RES_JSON, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Expected an array of research items.');

      resItems = data;
      resOrgs.clear();
      resFields.clear();
      resItems.forEach(r => {
        if (r.organization) resOrgs.add(r.organization);
        if (r.field) resFields.add(r.field);
      });

      populateFilters();
      updateDisplay();
      setTimeout(() => makeDragAndDrop('res-sort-chips', order => { resSortOrder = order; updateDisplay(); }), 80);
    } catch (err) {
      console.error(err);
      showStatus('Failed to load research. ' + err.message, 'error', true);
    }
  }

  function populateFilters() {
    const orgEl   = document.getElementById('res-org-filters');
    const fieldEl = document.getElementById('res-field-filters');
    orgEl.innerHTML   = '';
    fieldEl.innerHTML = '';
    [...resOrgs].sort().forEach(v  => orgEl.appendChild(makeFilterOption('org',   v)));
    [...resFields].sort().forEach(v => fieldEl.appendChild(makeFilterOption('field', v)));
  }

  function makeFilterOption(type, value) {
    const wrap = document.createElement('div');
    wrap.className = 'exp-filter-option';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = `res-filter-${type}-${value.replace(/\s+/g, '-')}`;
    cb.value = value;
    cb.dataset.type = type;
    const lbl = document.createElement('label');
    lbl.htmlFor = cb.id;
    lbl.textContent = value;
    wrap.appendChild(cb);
    wrap.appendChild(lbl);
    return wrap;
  }

  function filterAndSort() {
    const q = (qEl.value || '').trim().toLowerCase();

    let filtered = resItems.filter(r => {
      const matchQ = !q ||
        (r.title || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.organization || '').toLowerCase().includes(q) ||
        (r.field || '').toLowerCase().includes(q) ||
        (r.tags || []).some(t => t.toLowerCase().includes(q));
      const matchO = resFilters.organizations.size === 0 || resFilters.organizations.has(r.organization);
      const matchF = resFilters.fields.size === 0 || resFilters.fields.has(r.field);
      return matchQ && matchO && matchF;
    });

    filtered = [...filtered].sort((a, b) => {
      for (const crit of resSortOrder) {
        let cmp = 0;
        if (crit === 'title')        cmp = (a.title || '').localeCompare(b.title || '');
        else if (crit === 'organization') cmp = (a.organization || '').localeCompare(b.organization || '');
        else if (crit === 'year')    cmp = (a.year || 0) - (b.year || 0);
        else if (crit === 'field')   cmp = (a.field || '').localeCompare(b.field || '');
        if (cmp !== 0) return resReverseSort ? -cmp : cmp;
      }
      return 0;
    });

    return filtered;
  }

  function renderResearch(items) {
    contentEl.innerHTML = '';
    if (!items.length) { showStatus('No research items found.', 'empty'); return; }
    clearStatus();

    contentEl.classList.toggle('list-view', resViewMode === 'list');

    if (resViewMode === 'list') renderListView(items);
    else renderCardView(items);
  }

  function renderListView(items) {
    items.forEach(r => {
      if (!r.title) return;
      const el = document.createElement('div');
      el.className = 'course-list-item';
      el.dataset.title = (r.title || '').toLowerCase();
      el.dataset.organization = (r.organization || '').toLowerCase();
      el.dataset.field = (r.field || '').toLowerCase();

      const inner = document.createElement('span');
      inner.textContent = r.title;
      el.appendChild(inner);

      contentEl.appendChild(el);
    });
  }

  function renderCardView(items) {
    items.forEach(r => {
      if (!r.title) return;

      const card = document.createElement('article');
      card.className = 'project-card';
      card.dataset.title = (r.title || '').toLowerCase();
      card.dataset.organization = (r.organization || '').toLowerCase();
      card.dataset.field = (r.field || '').toLowerCase();

      if (r.organization) {
        const org = document.createElement('div');
        org.className = 'organization';
        org.textContent = r.organization;
        card.appendChild(org);
      }

      const thumb = document.createElement('div');
      thumb.className = 'project-thumb';
      thumb.style.background = 'linear-gradient(135deg, #6366f1, #4338ca)';
      thumb.style.color = '#e0e7ff';
      if (r.thumbnail) {
        thumb.style.background = `url(${r.thumbnail}) center/cover`;
        thumb.style.color = '';
      } else {
        thumb.textContent = (r.title || 'R').trim().slice(0, 2).toUpperCase();
      }

      const meta = document.createElement('div');
      meta.className = 'project-meta';

      const title = document.createElement('h2');
      title.className = 'project-title';
      title.textContent = r.title || 'Untitled';
      meta.appendChild(title);

      if (r.description) {
        const desc = document.createElement('p');
        desc.className = 'project-desc';
        desc.textContent = r.description;
        meta.appendChild(desc);
      }

      // Tags row
      const tagsAndLinks = document.createElement('div');
      tagsAndLinks.className = 'project-meta-row';
      tagsAndLinks.style.marginTop = '8px';

      const tags = document.createElement('div');
      tags.className = 'project-tags';
      if (r.field) {
        const s = document.createElement('span');
        s.className = 'project-tag';
        s.textContent = r.field;
        tags.appendChild(s);
      }
      if (r.year) {
        const s = document.createElement('span');
        s.className = 'project-tag';
        s.textContent = r.year;
        tags.appendChild(s);
      }
      (r.tags || []).forEach(t => {
        const s = document.createElement('span');
        s.className = 'project-tag';
        s.textContent = t;
        tags.appendChild(s);
      });

      const links = document.createElement('div');
      links.className = 'project-links';

      if (r.url) {
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'project-link';
        a.innerHTML = '🔗 View Research';
        a.addEventListener('click', e => { e.preventDefault(); openPopup(r.url); });
        links.appendChild(a);
      }
      if (r.repo) {
        const a = document.createElement('a');
        a.href = r.repo;
        a.className = 'project-link';
        a.innerHTML = '📦 Repository';
        a.addEventListener('click', e => { e.preventDefault(); window.open(r.repo, '_blank', 'noopener,noreferrer'); });
        links.appendChild(a);
      }

      if (tags.children.length) tagsAndLinks.appendChild(tags);
      if (links.children.length) tagsAndLinks.appendChild(links);
      if (tagsAndLinks.children.length) meta.appendChild(tagsAndLinks);

      card.appendChild(thumb);
      card.appendChild(meta);
      contentEl.appendChild(card);
    });
  }

  function updateDisplay() { renderResearch(filterAndSort()); }

  // Dropdown helpers
  function closeAllDropdowns() {
    viewDrop.hidden   = true;
    sortDrop.hidden   = true;
    filterDrop.hidden = true;
  }

  function toggleDropdown(target) {
    const wasHidden = target.hidden;
    closeAllDropdowns();
    target.hidden = !wasHidden;
  }

  viewBtn.addEventListener('click',   e => { e.stopPropagation(); toggleDropdown(viewDrop); });
  sortBtn.addEventListener('click',   e => { e.stopPropagation(); toggleDropdown(sortDrop); });
  filterBtn.addEventListener('click', e => { e.stopPropagation(); toggleDropdown(filterDrop); });

  document.addEventListener('click', e => {
    if (!viewBtn.contains(e.target)   && !viewDrop.contains(e.target))   viewDrop.hidden   = true;
    if (!sortBtn.contains(e.target)   && !sortDrop.contains(e.target))   sortDrop.hidden   = true;
    if (!filterBtn.contains(e.target) && !filterDrop.contains(e.target)) filterDrop.hidden = true;
  }, { signal });

  document.querySelectorAll('input[name="res-view"]').forEach(r => {
    r.addEventListener('change', e => { resViewMode = e.target.value; viewDrop.hidden = true; updateDisplay(); });
  });

  reverseBtn.addEventListener('click', () => {
    resReverseSort = !resReverseSort;
    reverseBtn.classList.toggle('active', resReverseSort);
    updateDisplay();
  });

  clearBtn.addEventListener('click', () => {
    resFilters.organizations.clear();
    resFilters.fields.clear();
    document.querySelectorAll('#res-filter-drop input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    updateDisplay();
  });

  applyBtn.addEventListener('click', () => {
    resFilters.organizations.clear();
    resFilters.fields.clear();
    document.querySelectorAll('#res-filter-drop input[type="checkbox"]:checked').forEach(cb => {
      if (cb.dataset.type === 'org')   resFilters.organizations.add(cb.value);
      if (cb.dataset.type === 'field') resFilters.fields.add(cb.value);
    });
    updateDisplay();
  });

  qEl.addEventListener('input', updateDisplay);

  fetchResearch();
}