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

    document.querySelectorAll('.start-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        let data;
        if (action === 'new-planet')      data = window.Projects.create(window.PRESET_PLANET);
        else if (action === 'new-scan')   data = window.Projects.create(window.PRESET_SCAN);
        else                              data = window.Projects.create(window.PRESET_BLANK);
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

    // Shortcuts help button (? in HUD)
    document.getElementById('shortcutsBtn').addEventListener('click', () => {
      window.Shortcuts.showShortcutsModal();
    });

    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
      if (currentProject) window.Projects.saveNow(currentProject);
      showStartScreen();
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

    // Window resize
    window.addEventListener('resize', () => {
      if (currentProject) {
        window.Game.scale = Math.min(window.innerWidth, window.innerHeight) * 0.85 / 900;
        window.Game.applyCamera();
      }
    });
  }

  /* ————————————————————————————————————————
     START SCREEN
  ———————————————————————————————————————— */
  function renderStartScreen() {
    const projects = window.Projects.list();
    projectsList.innerHTML = '';
    projects.forEach(p => {
      const li = document.createElement('li');
      li.className = 'project-row';
      const date = new Date(p.meta?.updatedAt || 0);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const itemCount = (p.items || []).length;
      li.innerHTML = `
        <span class="p-name">${escapeHtml(p.name)}</span>
        <span class="p-meta">${itemCount} items · ${dateStr}</span>
        <button class="icon-btn" title="Delete">🗑</button>
      `;
      li.querySelector('.p-name').addEventListener('click', () => {
        const fresh = window.Projects.get(p.meta.id);
        if (fresh) loadProject(fresh);
      });
      li.querySelector('.icon-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
          window.Projects.remove(p.meta.id);
          renderStartScreen();
        }
      });
      projectsList.appendChild(li);
    });
  }

  function showStartScreen() {
    currentProject = null;
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

    function getPoint(e) {
      if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    // True when spacebar is held or H-tool is active — everything pans
    function isPanMode() {
      if (document.body.classList.contains('space-pan')) return true;
      return window.Editor && window.Editor.getTool() === 'pan';
    }

    function onDown(e) {
      // In edit mode, let hit zones and sprites capture events — UNLESS
      // spacebar is held or the Hand tool is active (pan overrides everything)
      if (document.body.classList.contains('edit-mode') && !isPanMode()) {
        if (e.target.closest('.hit')) return;
        if (e.target.closest('.sprite')) return;
      }
      const p = getPoint(e);
      pointerDown = true;
      startScreenX = p.x; startScreenY = p.y;
      lastScreenX = p.x;  lastScreenY = p.y;
      startCamX = window.Game.camX; startCamY = window.Game.camY;
      totalDelta = 0;

      // Start drawing only when NOT in pan mode
      if (document.body.classList.contains('edit-mode') && !isPanMode()) {
        const tool = window.Editor.getTool();
        if (tool === 'pen' || tool === 'eraser') {
          const w = window.Game.screenToWorld(p.x, p.y);
          if (window.Editor.onDrawStart(w.x, w.y)) {
            isDrawing = true;
            return;
          }
        }
      }
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
        window.Editor.onDrawMoveRecord(w.x, w.y);
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

    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup',   onUp);
    stage.addEventListener('pointercancel', onUp);
    stage.addEventListener('pointerleave', (e) => {
      // Don't treat leaving as cancel — user can continue drag outside stage
    });

    // Also listen on document for moves that go outside stage during drag
    document.addEventListener('pointermove', (e) => {
      if (!pointerDown) return;
      // Only handle if the original target was the stage
      onMove(e);
    });
    document.addEventListener('pointerup', (e) => {
      if (pointerDown) onUp(e);
    });
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
