/* ═══════════════════════════════════════════════════
   MENU — slim menu bar (File / Edit / View / Help)
═══════════════════════════════════════════════════ */

window.Menu = (function() {

  let anyOpen = false;

  /* ── Per-panel visibility state ────────────────── */
  const PANEL_KEY = 'hs_panelVisibility';
  const PANEL_DEFS = [
    { id: 'editor',     cls: 'panel-off-editor' },
    { id: 'toolstrip',  cls: 'panel-off-toolstrip' },
    { id: 'properties', cls: 'panel-off-properties' },
    { id: 'minimap',    cls: 'panel-off-minimap' },
  ];

  function loadPanelState() {
    try { return JSON.parse(localStorage.getItem(PANEL_KEY) || '{}'); } catch { return {}; }
  }
  function savePanelState(state) {
    localStorage.setItem(PANEL_KEY, JSON.stringify(state));
  }
  function applyPanelState(state) {
    PANEL_DEFS.forEach(({ id, cls }) => {
      document.body.classList.toggle(cls, !!state[id]);
    });
  }
  function refreshDots() {
    const state = loadPanelState();
    document.querySelectorAll('#panelsMenuDropdown [data-panel-id]').forEach(li => {
      const dot = li.querySelector('.panel-dot');
      if (!dot) return;
      const on = !state[li.dataset.panelId]; // "on" = NOT hidden
      dot.classList.toggle('dot-on', on);
    });
  }

  /* ── About modal with release notes drill-down ─── */
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
          <span style="color:var(--accent);font-size:16px">›</span>
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

    // Wire click handlers after DOM is updated
    document.querySelectorAll('.about-ver-row').forEach(row => {
      row.addEventListener('mouseenter', () => { row.style.borderColor = 'var(--accent)'; });
      row.addEventListener('mouseleave', () => { row.style.borderColor = 'var(--panel-border)'; });
      row.addEventListener('click', () => {
        const ver = row.dataset.ver;
        const entry = (window.CHANGELOG || []).find(e => e.version === ver);
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
        <button id="aboutBackBtn" style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:13px;padding:0;display:flex;align-items:center;gap:4px">
          ‹ Back
        </button>
      </div>
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:4px">
        <span style="font-family:'Caveat',cursive;font-size:22px;font-weight:700">${entry.label}</span>
        <span style="font-size:11px;color:var(--ui-text-dim)">${entry.date}</span>
      </div>
      <div style="font-size:12px;color:var(--ui-text-dim);font-style:italic;margin-bottom:12px">${entry.tagline}</div>
      <hr style="border:none;border-top:1px solid var(--panel-border);margin:0 0 4px">
      <div style="max-height:54vh;overflow-y:auto;padding-right:4px">
        ${sections}
      </div>`;

    window.Editor?.openModal?.('Release Notes', body);
    document.getElementById('aboutBackBtn')?.addEventListener('click', openAbout);
  }

  function init() {
    const bar = document.getElementById('menuBar');
    if (!bar) return;

    // Apply saved panel visibility on startup
    applyPanelState(loadPanelState());

    const items = bar.querySelectorAll('.menu-item[data-menu]');

    items.forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const wasOpen = item.classList.contains('open');
        closeAll();
        if (!wasOpen) {
          item.classList.add('open');
          anyOpen = true;
          if (item.dataset.menu === 'panels') refreshDots();
        }
      });
      // Hover-to-open once any menu is already open
      item.addEventListener('mouseenter', () => {
        if (anyOpen && !item.classList.contains('open')) {
          closeAll();
          item.classList.add('open');
          anyOpen = true;
          if (item.dataset.menu === 'panels') refreshDots();
        }
      });
    });

    // Click outside closes everything
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('#menuBar')) closeAll();
    });

    // Wire each action item
    bar.querySelectorAll('[data-action]').forEach(li => {
      li.addEventListener('mousedown', (e) => {
        if (li.classList.contains('menu-disabled')) { e.preventDefault(); return; }
        e.preventDefault();
        e.stopPropagation();
        closeAll();
        handleAction(li.dataset.action);
      });
    });
  }

  function closeAll() {
    document.querySelectorAll('#menuBar .menu-item.open').forEach(x => x.classList.remove('open'));
    anyOpen = false;
  }

  function handleAction(action) {
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

      case 'duplicate':
        window.Editor?.duplicateSelected?.();
        break;

      case 'delete':
        window.Editor?.deleteSelected?.();
        break;

      case 'zoom-in':
        window.Shortcuts?.zoomAt?.(1.25);
        break;

      case 'zoom-out':
        window.Shortcuts?.zoomAt?.(1 / 1.25);
        break;

      case 'zoom-fit':
        window.Game?.centerOnPlanet?.();
        break;

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

      case 'toggle-panels':
        window.Shortcuts?.togglePanels?.();
        break;

      case 'toggle-mode':
        if (window.App) {
          const inEdit = document.body.classList.contains('edit-mode');
          window.App.setMode(inEdit ? 'play' : 'edit');
        }
        break;

      case 'shortcuts':
        window.Shortcuts?.showShortcutsModal?.();
        break;

      case 'about':
        openAbout();
        break;

      // ── Panels menu ──────────────────────────────────
      case 'toggle-panel-editor':
      case 'toggle-panel-toolstrip':
      case 'toggle-panel-properties':
      case 'toggle-panel-minimap': {
        const id = action.replace('toggle-panel-', '');
        const def = PANEL_DEFS.find(d => d.id === id);
        if (!def) break;
        const state = loadPanelState();
        state[id] = !state[id];
        savePanelState(state);
        applyPanelState(state);
        break;
      }

      case 'panels-show-all': {
        savePanelState({});
        applyPanelState({});
        window.Shortcuts?.resetPanels?.(); // also clear Tab hide-all state
        break;
      }

      case 'panels-hide-all':
        window.Shortcuts?.togglePanels?.();
        break;
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { init };

})();
