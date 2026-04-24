/* ═══════════════════════════════════════════════════
   APP — main entry point
   Wires all modules together, handles start screen,
   mode switching, and stage input (pan / tap / draw).
═══════════════════════════════════════════════════ */

(function() {

  let currentProject = null;
  let mode = 'play'; // 'play' | 'edit'

  // DOM refs — populated on DOMContentLoaded
  let startScreen, projectsList, app;
  let stage, world, hitsLayer, playLayer, spriteLayer, drawingLayer, drawingCursor;
  let modeButtons, soundToggle;

  // Explorer state
  const selected = new Set(); // project ids
  let sortKey = 'date';
  let sortDir = -1; // -1 = desc, 1 = asc

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // Grab refs
    startScreen  = document.getElementById('startScreen');
    projectsList = document.getElementById('projectsList');
    app          = document.getElementById('app');
    stage        = document.getElementById('stage');
    world        = document.getElementById('world');
    hitsLayer    = document.getElementById('hitsLayer');
    playLayer    = document.getElementById('playLayer');
    spriteLayer  = document.getElementById('spriteLayer');
    drawingLayer = document.getElementById('drawingLayer');
    drawingCursor = document.getElementById('drawingCursor');
    soundToggle  = document.getElementById('soundToggle');

    // Init modules that need DOM
    window.Draw.init(drawingLayer, drawingCursor);
    window.Game.init({
      stage, world, hitsLayer, playLayer,
      listEl:       document.getElementById('list'),
      counterEl:    document.getElementById('counter'),
      totalEl:      document.getElementById('total'),
      secretCountEl: document.getElementById('secretCount'),
      secretTotalEl: document.getElementById('secretTotal'),
      winEl:        document.getElementById('win'),
      minimapEl:    document.getElementById('minimap'),
      viewboxEl:    document.getElementById('viewbox'),
      listPanel:    document.getElementById('listPanel'),
      panelToggle:  document.getElementById('panelToggle'),
    });
    window.Editor.init({
      stage, world, hitsLayer, spriteLayer,
      editPanel:       document.getElementById('editPanel'),
      penOptions:      document.getElementById('penOptions'),
      selectedPanel:   document.getElementById('selectedPanel'),
      selectedContent: document.getElementById('selectedContent'),
      hintTip:         document.getElementById('hintTip'),
      modalBackdrop:   document.getElementById('modalBackdrop'),
      modalTitle:      document.getElementById('modalTitle'),
      modalBody:       document.getElementById('modalBody'),
    });
    window.Projects.setStatusEl(document.getElementById('saveStatus'));

    // Start screen wiring
    renderStartScreen();

    // New project buttons (sidebar)
    document.querySelectorAll('.explorer-nav-btn[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        let data;
        if (action === 'new-planet')    data = window.Projects.create(window.PRESET_PLANET);
        else if (action === 'new-scan') data = window.Projects.create(window.PRESET_SCAN);
        else                            data = window.Projects.create(window.PRESET_BLANK);
        loadProject(data);
      });
    });

    document.getElementById('importProjectBtn').addEventListener('click', () => {
      document.getElementById('importProjectInput').click();
    });
    document.getElementById('importProjectInput').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const imported = await window.Projects.importJson(file);
        loadProject(imported);
      } catch(err) {
        alert('Could not import: ' + err.message);
      }
      e.target.value = '';
    });

    // Bulk actions
    document.getElementById('selectAllCb').addEventListener('change', (e) => {
      const all = window.Projects.list();
      if (e.target.checked) all.forEach(p => selected.add(p.meta.id));
      else selected.clear();
      renderStartScreen();
    });
    document.getElementById('exportSelectedBtn').addEventListener('click', () => {
      selected.forEach(id => {
        const p = window.Projects.get(id);
        if (p) window.Projects.exportJson(p);
      });
    });
    document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
      if (selected.size === 0) return;
      if (!confirm(`Delete ${selected.size} project${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
      selected.forEach(id => window.Projects.remove(id));
      selected.clear();
      renderStartScreen();
    });

    // Column sort headers
    document.querySelectorAll('.explorer-header span[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (sortKey === key) sortDir *= -1;
        else { sortKey = key; sortDir = key === 'date' ? -1 : 1; }
        renderStartScreen();
      });
    });

    // Shortcuts help button (? in HUD)
    document.getElementById('shortcutsBtn').addEventListener('click', () => {
      window.Shortcuts.showShortcutsModal();
    });

    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
      if (currentProject) window.Projects.saveNow(currentProject);
      showStartScreen();
    });

    // Project name — click to rename inline (works in both modes)
    document.getElementById('projectName').addEventListener('click', () => {
      window.Editor.renameProject();
    });

    // Mode toggle
    document.querySelectorAll('.mode-btn').forEach(b => {
      b.addEventListener('click', () => setMode(b.dataset.mode));
    });

    // Sound toggle
    soundToggle.addEventListener('click', () => {
      const now = !window.SFX.isOn();
      window.SFX.setOn(now);
      if (now) window.SFX.ensure();
      soundToggle.textContent = now ? '🔊 sound' : '🔇 muted';
      soundToggle.classList.toggle('off', !now);
    });

    // Stage input
    setupStageInput();

    // Keyboard shortcuts
    window.Shortcuts.init();

    // Expose setMode so shortcuts.js can toggle play/edit
    window.App = { setMode };

    // Mobile bottom-sheet panel toggles
    initMobileUI();

    // Window resize — re-fit to screen respecting current doc dimensions
    window.addEventListener('resize', () => {
      if (currentProject) window.Game.centerOnPlanet();
    });
  }

  /* ————————————————————————————————————————
     START SCREEN (explorer)
  ———————————————————————————————————————— */
  function sortedProjects() {
    const all = window.Projects.list();
    return all.sort((a, b) => {
      let av, bv;
      if (sortKey === 'name') {
        av = (a.name || '').toLowerCase(); bv = (b.name || '').toLowerCase();
        return sortDir * av.localeCompare(bv);
      }
      if (sortKey === 'items') {
        av = (a.items || []).length; bv = (b.items || []).length;
      } else if (sortKey === 'size') {
        av = JSON.stringify(a).length; bv = JSON.stringify(b).length;
      } else { // date
        av = a.meta?.updatedAt || 0; bv = b.meta?.updatedAt || 0;
      }
      return sortDir * (av - bv);
    });
  }

  function renderStartScreen() {
    const projects = sortedProjects();
    projectsList.innerHTML = '';

    // Update sort arrows
    ['name','items','size','date'].forEach(k => {
      const el = document.getElementById('sortArrow' + k.charAt(0).toUpperCase() + k.slice(1));
      if (el) el.textContent = sortKey === k ? (sortDir === -1 ? '↓' : '↑') : '';
    });

    // Update select-all state
    const selectAllCb = document.getElementById('selectAllCb');
    if (selectAllCb) {
      selectAllCb.checked = projects.length > 0 && projects.every(p => selected.has(p.meta.id));
      selectAllCb.indeterminate = !selectAllCb.checked && projects.some(p => selected.has(p.meta.id));
    }

    // Bulk actions visibility
    const bulkActions = document.getElementById('bulkActions');
    if (bulkActions) bulkActions.classList.toggle('visible', selected.size > 0);
    const countEl = document.getElementById('selectionCount');
    if (countEl) countEl.textContent = selected.size > 0 ? `${selected.size} selected` : `${projects.length} project${projects.length !== 1 ? 's' : ''}`;

    // Empty state
    const emptyEl = document.getElementById('explorerEmpty');
    if (emptyEl) emptyEl.classList.toggle('hidden', projects.length > 0);

    const fmtBytes = (b) => b >= 1024 ? (b / 1024).toFixed(0) + ' KB' : b + ' B';
    const fmtDate = (ts) => {
      if (!ts) return '—';
      const d = new Date(ts);
      const now = new Date();
      const diffDays = Math.floor((now - d) / 86400000);
      if (diffDays === 0) return 'today';
      if (diffDays === 1) return 'yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    projects.forEach(p => {
      const id = p.meta.id;
      const li = document.createElement('li');
      li.className = 'explorer-row' + (selected.has(id) ? ' selected' : '');
      li.dataset.id = id;

      const itemCount = (p.items || []).length;
      const sizeBytes = JSON.stringify(p).length;
      const dateStr = fmtDate(p.meta?.updatedAt);

      li.innerHTML = `
        <span class="col-check"><input type="checkbox" ${selected.has(id) ? 'checked' : ''} title="Select"></span>
        <span class="col-name">
          <span class="p-file-icon">🎮</span>
          <span class="p-name-text">${escapeHtml(p.name)}</span>
        </span>
        <span class="col-items">${itemCount}</span>
        <span class="col-size">${fmtBytes(sizeBytes)}</span>
        <span class="col-date">${dateStr}</span>
        <span class="col-actions"><button class="icon-btn" title="Delete">🗑</button></span>
      `;

      // Checkbox toggle
      li.querySelector('input[type=checkbox]').addEventListener('change', (e) => {
        e.stopPropagation();
        if (e.target.checked) selected.add(id);
        else selected.delete(id);
        renderStartScreen();
      });

      // Row click → open (not on checkbox or delete btn)
      li.querySelector('.col-name').addEventListener('click', () => {
        const fresh = window.Projects.get(id);
        if (fresh) loadProject(fresh);
      });

      // Delete single
      li.querySelector('.icon-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
          selected.delete(id);
          window.Projects.remove(id);
          renderStartScreen();
        }
      });

      projectsList.appendChild(li);
    });
  }

  function showStartScreen() {
    currentProject = null;
    selected.clear();
    window.Projects.clearActive();
    app.classList.add('hidden');
    startScreen.classList.remove('hidden');
    renderStartScreen();
  }

  /* ————————————————————————————————————————
     LOAD PROJECT
  ———————————————————————————————————————— */
  async function loadProject(data) {
    currentProject = data;
    window.Projects.setActive(data.meta.id);

    // HUD
    document.getElementById('projectName').textContent = data.name;

    // Hand to modules
    window.Editor.setProject(data);
    window.Game.setProject(data);
    window.Editor.renderBaseLayer();
    window.Editor.renderSprites();
    window.Draw.loadFrom(data.drawings || []);
    await window.Editor.loadProjectAssets(data);

    // Show app, default to play mode
    startScreen.classList.add('hidden');
    app.classList.remove('hidden');
    setMode('play');
  }

  /* ————————————————————————————————————————
     MODE SWITCH
  ———————————————————————————————————————— */
  function setMode(m) {
    mode = m;
    window.Shortcuts?.resetPanels?.(); // clear distraction-free mode on any switch
    document.body.classList.toggle('play-mode', m === 'play');
    document.body.classList.toggle('edit-mode', m === 'edit');
    // Close any open mobile bottom sheets on mode switch
    document.getElementById('editPanel')?.classList.remove('mobile-open');
    document.getElementById('listPanel')?.classList.remove('mobile-open');
    document.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === m);
    });
    document.getElementById('listPanel').classList.toggle('hidden', m !== 'play');
    document.getElementById('editPanel').classList.toggle('hidden', m !== 'edit');

    if (m === 'play') {
      window.Editor.deselect();
      window.Game.renderSparkles();
      // Restart the round fresh when entering play
      window.Game.restart();
    } else {
      // In edit mode, clear play-layer effects
      playLayer.querySelectorAll('.mark, .pop, .miss, .sparkle, .surprise-sprite').forEach(el => el.remove());
    }
  }

  /* ————————————————————————————————————————
     STAGE INPUT — pan, tap, draw
  ———————————————————————————————————————— */
  function setupStageInput() {
    let pointerDown = false;
    let isDrawing   = false;
    let startScreenX = 0, startScreenY = 0;
    let startCamX = 0, startCamY = 0;
    let totalDelta = 0;
    let lastScreenX = 0, lastScreenY = 0;

    const DRAW_TOOLS = ['pen', 'eraser', 'rect', 'ellipse', 'star'];

    function getPoint(e) {
      if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    function isPanMode() {
      if (document.body.classList.contains('space-pan')) return true;
      return window.Editor && window.Editor.getTool() === 'pan';
    }

    /* ── Document-level CAPTURE listener for draw/shape tools ──────────────
       Fires BEFORE any bubble-phase listeners (sprites, strokes, hit zones,
       SVG content) so those can never swallow the event.  Only intercepts
       when a draw tool is active and the click is inside the stage area. */
    function onDrawCapture(e) {
      if (!document.body.classList.contains('edit-mode')) return;
      if (isPanMode()) return;
      const _tool = window.Editor.getTool();
      if (!DRAW_TOOLS.includes(_tool)) return;
      // Only intercept clicks within the stage (not on panels / HUD)
      if (!stage.contains(e.target) && e.target !== stage) return;

      const p = getPoint(e);
      const w = window.Game.screenToWorld(p.x, p.y);
      if (!window.Editor.onDrawStart(w.x, w.y)) return;

      isDrawing    = true;
      pointerDown  = true;
      startScreenX = p.x; startScreenY = p.y;
      lastScreenX  = p.x; lastScreenY  = p.y;
      startCamX = window.Game.camX; startCamY = window.Game.camY;
      totalDelta = 0;
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      // Stop propagation so no other pointerdown handler re-fires onDrawStart
      e.stopPropagation();
    }

    function onDown(e) {
      // Draw tools already handled by the capture listener above
      if (isDrawing) return;

      const inEdit = document.body.classList.contains('edit-mode');
      if (inEdit && !isPanMode()) {
        if (e.target.closest('.hit')) return;
        if (e.target.closest('.sprite')) return;
      }

      const p = getPoint(e);
      pointerDown = true;
      startScreenX = p.x; startScreenY = p.y;
      lastScreenX  = p.x; lastScreenY  = p.y;
      startCamX = window.Game.camX; startCamY = window.Game.camY;
      totalDelta = 0;
      stage.classList.add('grabbing');
    }

    function onMove(e) {
      if (!pointerDown) return;
      const p = getPoint(e);
      const dx = p.x - lastScreenX, dy = p.y - lastScreenY;
      totalDelta += Math.abs(dx) + Math.abs(dy);
      lastScreenX = p.x; lastScreenY = p.y;

      if (isDrawing) {
        const w = window.Game.screenToWorld(p.x, p.y);
        window.Editor.onDrawMoveRecord(w.x, w.y, e.shiftKey);
        return;
      }

      // Pan
      window.Game.camX = startCamX + (p.x - startScreenX);
      window.Game.camY = startCamY + (p.y - startScreenY);
      window.Game.applyCamera();
    }

    function onUp(e) {
      if (!pointerDown) return;
      pointerDown = false;
      stage.classList.remove('grabbing');

      if (isDrawing) {
        const p = getPoint(e);
        const w = window.Game.screenToWorld(p.x, p.y);
        window.Editor.onDrawMoveRecord(w.x, w.y, e.shiftKey);
        window.Editor.onDrawEnd();
        isDrawing = false;
        return;
      }

      // Tap vs drag
      const p = getPoint(e);
      const wasTap = totalDelta < 6;
      if (wasTap) {
        const w = window.Game.screenToWorld(p.x, p.y);
        if (document.body.classList.contains('play-mode')) {
          window.Game.handleTap(p.x, p.y);
        } else if (document.body.classList.contains('edit-mode') && !isPanMode()) {
          window.Editor.onStageTap(w.x, w.y);
        }
      }
    }

    // Capture-phase: draw tools get first crack at every pointerdown on the page
    document.addEventListener('pointerdown', onDrawCapture, { capture: true });

    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup',   onUp);
    stage.addEventListener('pointercancel', onUp);

    // Document listeners for drags that leave the stage bounds
    document.addEventListener('pointermove', (e) => { if (pointerDown) onMove(e); });
    document.addEventListener('pointerup',   (e) => { if (pointerDown) onUp(e); });

    // ── Mouse-wheel / trackpad zoom ────────────────────────────────────────
    // Works for: mouse wheel, trackpad two-finger pinch (registers as Ctrl+wheel),
    // and Ctrl+wheel on laptops.  Plain scroll also zooms (no modifier required)
    // so mouse-wheel users don't need to hold Ctrl.
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();

      // Smooth factor: trackpad sends many small deltaY; mouse sends larger steps
      const factor = Math.pow(1.001, -e.deltaY);
      const newScale = Math.max(0.1, Math.min(8, window.Game.scale * factor));
      if (newScale === window.Game.scale) return;

      // World point currently under the cursor — must stay fixed after zoom
      const wx = (e.clientX - window.Game.camX) / window.Game.scale;
      const wy = (e.clientY - window.Game.camY) / window.Game.scale;

      window.Game.scale = newScale;
      window.Game.camX  = e.clientX - wx * newScale;
      window.Game.camY  = e.clientY - wy * newScale;
      window.Game.applyCamera();
    }, { passive: false });
  }

  /* ————————————————————————————————————————
     MOBILE UI — bottom-sheet panel toggles
  ———————————————————————————————————————— */
  function initMobileUI() {
    const isMobile = () => window.innerWidth <= 640;
    const editPanelEl = document.getElementById('editPanel');
    const listPanelEl = document.getElementById('listPanel');
    const panelToggleBtn = document.getElementById('panelToggle');
    const editPanelToggleBtn = document.getElementById('editPanelToggle');

    // Remove .hidden from edit-panel-toggle so CSS can show it on mobile
    editPanelToggleBtn.classList.remove('hidden');

    panelToggleBtn.addEventListener('click', () => {
      if (!isMobile()) return;
      listPanelEl.classList.toggle('mobile-open');
    });
    editPanelToggleBtn.addEventListener('click', () => {
      if (!isMobile()) return;
      editPanelEl.classList.toggle('mobile-open');
    });

    // Tapping the canvas closes panels on mobile
    stage.addEventListener('pointerdown', (e) => {
      if (!isMobile()) return;
      if (e.target.closest('.edit-panel') || e.target.closest('.list-panel')) return;
      editPanelEl.classList.remove('mobile-open');
      listPanelEl.classList.remove('mobile-open');
    });
  }

  /* Helpers */
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
