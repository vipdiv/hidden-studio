/* =========================================================
   MENU — 24px menu bar (File / Edit / View / Window / Help)
   Window menu drives window.Panels for panel visibility
   and theme switching.
   ========================================================= */

window.Menu = (function() {

  let anyOpen = false;

  /* Four themes exposed in Window > Theme */
  const THEMES = [
    { id: 'classic', label: 'Classic' },
    { id: 'night',   label: 'Night Studio' },
    { id: 'warm',    label: 'Warm Studio' },
    { id: 'paper',   label: 'Paper (Light)' },
  ];

  /* Build View menu dynamically each time it opens */
  function buildViewMenu() {
    const dd = document.getElementById('viewMenuDropdown');
    if (!dd) return;
    dd.innerHTML = '';

    const check = (on) => `<span style="color:${on ? '#5aaa5a' : 'transparent'};flex-shrink:0">&#10003;</span>`;

    const addItem = (action, label, shortcut, active) => {
      const li = makeLi(action, {});
      li.innerHTML = `${check(active)}<span style="flex:1;text-align:right">${label}</span><span class="menu-shortcut">${shortcut}</span>`;
      dd.appendChild(li);
    };

    addItem('zoom-in',   'Zoom In',       'Z',       false);
    addItem('zoom-out',  'Zoom Out',       'Alt+Z',   false);
    addItem('zoom-fit',  'Fit to Screen',  'Ctrl+0',  false);
    addItem('zoom-100',  '100%',           'Ctrl+1',  false);
    dd.appendChild(makeSep());

    const rulersEnabled  = document.body.classList.contains('rulers-enabled');
    const gridEnabled    = document.body.classList.contains('grid-enabled');
    const outlineEnabled = document.body.classList.contains('outline-enabled');

    if (rulersEnabled)  addItem('toggle-rulers', 'Rulers',       "Ctrl+R",  document.body.classList.contains('show-rulers'));
    if (gridEnabled)    addItem('toggle-grid',   'Grid',         "Ctrl+'",  document.body.classList.contains('show-grid'));
    if (outlineEnabled) addItem('outline-mode',  'Outline Mode', 'Ctrl+Y',  document.body.classList.contains('outline-mode'));

    if (rulersEnabled || gridEnabled || outlineEnabled) dd.appendChild(makeSep());

    addItem('toggle-mode', 'Toggle Play / Edit', 'F', false);

    dd.querySelectorAll('[data-action]').forEach(li => {
      li.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        closeAll();
        handleAction(li.dataset.action, li.dataset);
      });
    });
  }

  /* Build Window menu dynamically each time it opens */
  function buildWindowMenu() {
    const dd = document.getElementById('windowMenuDropdown');
    if (!dd) return;
    dd.innerHTML = '';

    // Theme section first — always visible regardless of how many panels exist
    dd.appendChild(makeLabel('Theme'));
    const currentTheme = window.Panels.getTheme();
    THEMES.forEach(({ id, label }) => {
      const li = makeLi('window-set-theme', { themeId: id });
      li.innerHTML = `<span style="color:${id === currentTheme ? '#5aaa5a' : 'transparent'}">&#10003;</span> ${label}`;
      dd.appendChild(li);
    });

    // Panels section is editor-only — panels themselves are hidden in play mode,
    // so showing their toggles would just be visual clutter
    const inPlayMode = document.body.classList.contains('play-mode');
    if (!inPlayMode) {
      dd.appendChild(makeSep());

      const regs = window.Panels._getRegs();
      const panelIds = Object.keys(regs);

      if (panelIds.length > 0) {
        dd.appendChild(makeLabel('Panels'));
        panelIds.forEach(id => {
          const visible = window.Panels.isVisible(id);
          const li = makeLi('window-panel-toggle', { panelId: id });
          li.innerHTML = `<span style="color:${visible ? '#5aaa5a' : 'transparent'}">&#10003;</span> ${regs[id].title}`;
          dd.appendChild(li);
        });
        dd.appendChild(makeSep());
        const resetLi = makeLi('window-reset-layout', {});
        resetLi.innerHTML = '<span style="color:transparent">&#10003;</span> Reset Panel Layout';
        dd.appendChild(resetLi);
      }
    }

    // Wire clicks inside the freshly-built dropdown
    dd.querySelectorAll('[data-action]').forEach(li => {
      li.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        closeAll();
        handleAction(li.dataset.action, li.dataset);
      });
    });
  }

  function makeLabel(text) {
    const li = document.createElement('li');
    li.className = 'win-menu-label';
    li.textContent = text;
    return li;
  }
  function makeSep() {
    const li = document.createElement('li');
    li.className = 'menu-sep';
    return li;
  }
  function makeLi(action, data) {
    const li = document.createElement('li');
    li.dataset.action = action;
    Object.assign(li.dataset, data);
    return li;
  }

  /* Mirror #projectName content into #menuProjectName */
  function syncProjectName() {
    const src = document.getElementById('projectName');
    const dst = document.getElementById('menuProjectName');
    if (!src || !dst) return;
    const copy = () => { dst.textContent = (src.textContent || src.innerText || 'Untitled').trim(); };
    copy();
    new MutationObserver(copy).observe(src, { childList: true, subtree: true, characterData: true });
  }

  /* Wire Play/Edit toggle buttons in menu-right */
  function wireModeBtns() {
    const playBtn = document.getElementById('menuPlayBtn');
    const editBtn = document.getElementById('menuEditBtn');

    playBtn?.addEventListener('click', () => {
      if (window.App) window.App.setMode('play');
      refreshModeBtns();
    });
    editBtn?.addEventListener('click', () => {
      if (window.App) window.App.setMode('edit');
      refreshModeBtns();
    });

    // Also refresh when hud-top mode buttons fire
    document.querySelectorAll('.hud-center [data-mode]').forEach(btn =>
      btn.addEventListener('click', () => setTimeout(refreshModeBtns, 0))
    );

    refreshModeBtns();
  }

  function refreshModeBtns() {
    const inEdit = document.body.classList.contains('edit-mode');
    document.getElementById('menuPlayBtn')?.classList.toggle('menu-mode-active', !inEdit);
    document.getElementById('menuEditBtn')?.classList.toggle('menu-mode-active', inEdit);
  }

  /* About modal with release notes drill-down */
  function openAbout() {
    const changelog = window.CHANGELOG || [];
    const rows = changelog.map(entry => `
      <div class="about-ver-row" data-ver="${entry.version}" style="
        display:flex;justify-content:space-between;align-items:center;
        padding:10px 14px;margin-bottom:8px;border-radius:6px;cursor:pointer;
        background:var(--panel-bg);border:1.5px solid var(--panel-border);
        transition:border-color .15s;">
        <div>
          <div style="font-family:'Caveat',cursive;font-size:19px;font-weight:700;letter-spacing:.02em">${entry.label}</div>
          <div style="font-size:11px;color:var(--ui-text-dim);margin-top:1px;font-style:italic">${entry.tagline}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:11px;color:var(--ui-text-dim)">${entry.date}</span>
          <span style="color:var(--accent);font-size:16px">&#x203A;</span>
        </div>
      </div>
    `).join('');

    const body = `
      <div style="text-align:center;padding:4px 0 16px">
        <div style="font-family:'Caveat',cursive;font-size:28px;font-weight:700;color:var(--accent);margin-bottom:4px">Hidden Studio</div>
        <div style="font-size:12px;color:var(--ui-text-dim);font-style:italic">Make &amp; play your own hidden object games</div>
      </div>
      <hr style="border:none;border-top:1px solid var(--panel-border);margin:0 0 14px">
      ${rows}
      <p style="font-size:11px;color:var(--ui-text-dim);text-align:center;margin-top:6px;line-height:1.5">
        All projects are saved locally in your browser.<br>No account, no server, no AI tokens.
      </p>`;

    window.Editor?.openModal?.('About Hidden Studio', body);

    document.querySelectorAll('.about-ver-row').forEach(row => {
      row.addEventListener('mouseenter', () => { row.style.borderColor = 'var(--accent)'; });
      row.addEventListener('mouseleave', () => { row.style.borderColor = 'var(--panel-border)'; });
      row.addEventListener('click', () => {
        const entry = (window.CHANGELOG || []).find(e => e.version === row.dataset.ver);
        if (entry) openReleaseNotes(entry);
      });
    });
  }

  function openReleaseNotes(entry) {
    const sections = (entry.notes || []).map(s => `
      <div style="font-family:'Caveat',cursive;font-size:16px;font-weight:700;color:var(--accent);margin:14px 0 5px">${s.section}</div>
      <ul style="margin:0;padding-left:16px;list-style:disc">
        ${s.items.map(item => `<li style="font-size:12px;color:var(--ui-text-dim);line-height:1.65;margin-bottom:2px">${item}</li>`).join('')}
      </ul>
    `).join('');

    const body = `
      <div style="margin-bottom:14px">
        <button id="aboutBackBtn" style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:13px;padding:0;display:flex;align-items:center;gap:4px">&#x2039; Back</button>
      </div>
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:4px">
        <span style="font-family:'Caveat',cursive;font-size:22px;font-weight:700">${entry.label}</span>
        <span style="font-size:11px;color:var(--ui-text-dim)">${entry.date}</span>
      </div>
      <div style="font-size:12px;color:var(--ui-text-dim);font-style:italic;margin-bottom:12px">${entry.tagline}</div>
      <hr style="border:none;border-top:1px solid var(--panel-border);margin:0 0 4px">
      <div>${sections}</div>`;

    window.Editor?.openModal?.('Release Notes', body);
    document.getElementById('aboutBackBtn')?.addEventListener('click', openAbout);
  }

  function init() {
    const bar = document.getElementById('menuBar');
    if (!bar) return;

    syncProjectName();
    wireModeBtns();

    const items = bar.querySelectorAll('.menu-item[data-menu]');

    items.forEach(item => {
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        const wasOpen = item.classList.contains('open');
        closeAll();
        if (!wasOpen) {
          item.classList.add('open');
          anyOpen = true;
          if (item.dataset.menu === 'window') buildWindowMenu();
          if (item.dataset.menu === 'view')   buildViewMenu();
        }
      });
      item.addEventListener('mouseenter', () => {
        if (anyOpen && !item.classList.contains('open')) {
          closeAll();
          item.classList.add('open');
          anyOpen = true;
          if (item.dataset.menu === 'window') buildWindowMenu();
          if (item.dataset.menu === 'view')   buildViewMenu();
        }
      });
    });

    // Click outside closes everything
    document.addEventListener('mousedown', e => {
      if (!e.target.closest('#menuBar')) closeAll();
    });

    // Wire static menu items (all except Window menu which is dynamic)
    bar.querySelectorAll('[data-action]').forEach(li => {
      li.addEventListener('mousedown', e => {
        if (li.classList.contains('menu-disabled')) { e.preventDefault(); return; }
        e.preventDefault();
        e.stopPropagation();
        closeAll();
        handleAction(li.dataset.action, li.dataset);
      });
    });
  }

  function closeAll() {
    document.querySelectorAll('#menuBar .menu-item.open').forEach(x => x.classList.remove('open'));
    anyOpen = false;
  }

  function handleAction(action, data = {}) {
    switch (action) {

      case 'back':
        document.getElementById('backBtn')?.click();
        break;

      case 'save': {
        const proj = window.Editor?.getProject?.();
        if (proj) window.Projects.saveNow(proj);
        break;
      }
      case 'export-html': {
        const proj = window.Editor?.getProject?.();
        if (proj) window.Projects.exportHtml(proj);
        break;
      }
      case 'export-json': {
        const proj = window.Editor?.getProject?.();
        if (proj) window.Projects.exportJson(proj);
        break;
      }

      case 'duplicate': window.Editor?.duplicateSelected?.(); break;
      case 'delete':    window.Editor?.deleteSelected?.(); break;

      case 'zoom-in':   window.Shortcuts?.zoomAt?.(1.25); break;
      case 'zoom-out':  window.Shortcuts?.zoomAt?.(1 / 1.25); break;
      case 'zoom-fit':  window.Game?.centerOnPlanet?.(); break;
      case 'zoom-100': {
        if (!window.Game) break;
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        const wp = window.Game.screenToWorld(cx, cy);
        window.Game.scale = 1;
        window.Game.camX = cx - wp.x;
        window.Game.camY = cy - wp.y;
        window.Game.applyCamera();
        break;
      }

      case 'toggle-rulers': window.Shortcuts?.toggleRulers?.(); break;
      case 'toggle-grid':   window.Shortcuts?.toggleGrid?.(); break;
      case 'outline-mode':  window.Shortcuts?.toggleOutlineMode?.(); break;

      case 'toggle-panels': window.Shortcuts?.togglePanels?.(); break;
      case 'toggle-mode':
        if (window.App) {
          const inEdit = document.body.classList.contains('edit-mode');
          window.App.setMode(inEdit ? 'play' : 'edit');
          setTimeout(refreshModeBtns, 0);
        }
        break;

      case 'set-mode-play':
        if (window.App) { window.App.setMode('play'); setTimeout(refreshModeBtns, 0); }
        break;
      case 'set-mode-edit':
        if (window.App) { window.App.setMode('edit'); setTimeout(refreshModeBtns, 0); }
        break;

      case 'shortcuts': window.Shortcuts?.showShortcutsModal?.(); break;
      case 'docs':      window.Shortcuts?.showDocsModal?.(); break;
      case 'settings':  window.Shortcuts?.showSettingsModal?.(); break;
      case 'about':     openAbout(); break;

      /* Window menu actions */
      case 'window-panel-toggle':
        if (data.panelId) window.Panels.toggle(data.panelId);
        break;
      case 'window-reset-layout':
        window.Panels.resetLayout();
        break;
      case 'window-set-theme':
        if (data.themeId) window.Panels.setTheme(data.themeId);
        break;

      /* Legacy panel toggle actions (old CSS-class panels) */
      case 'panels-show-all':
        window.Shortcuts?.resetPanels?.();
        break;
      case 'panels-hide-all':
        window.Shortcuts?.togglePanels?.();
        break;
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { init, refreshModeBtns };

})();
