/* ═══════════════════════════════════════════════════
   SHORTCUTS — Adobe-style keyboard shortcut system
   Centralises all keydown handling. Suppressed when
   the user is typing in any input/textarea.
   Edit-mode only except: F (toggle mode), Spacebar (pan), ? (help).
═══════════════════════════════════════════════════ */

window.Shortcuts = (function() {

  let spaceHeld    = false;
  let priorTool    = null;  // restored when spacebar releases
  let panelsHidden = false;

  /* ── helpers ────────────────────────────────── */

  function isTyping() {
    const el = document.activeElement;
    if (!el) return false;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
  }

  function isEditMode() {
    return document.body.classList.contains('edit-mode');
  }

  function mod(e) { return e.ctrlKey || e.metaKey; }

  function zoomAt(factor) {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const wp = window.Game.screenToWorld(cx, cy);
    window.Game.scale = Math.max(0.1, Math.min(10, window.Game.scale * factor));
    window.Game.camX  = cx - wp.x * window.Game.scale;
    window.Game.camY  = cy - wp.y * window.Game.scale;
    window.Game.applyCamera();
  }

  /* ── keydown ────────────────────────────────── */

  function onKeyDown(e) {

    // Spacebar → temporary pan (capture first, before isTyping check so we
    // can preventDefault and stop page scroll even when focus is on stage)
    if (e.code === 'Space' && !isTyping()) {
      if (!spaceHeld) {
        spaceHeld = true;
        priorTool = window.Editor.getTool();
        document.body.classList.add('space-pan');
      }
      e.preventDefault();
      return;
    }

    // F → toggle play / edit mode (global, not suppressed in play mode)
    if ((e.key === 'f' || e.key === 'F') && !mod(e) && !isTyping()) {
      if (window.App) window.App.setMode(isEditMode() ? 'play' : 'edit');
      e.preventDefault();
      return;
    }

    // ? → shortcuts help
    if (e.key === '?' && !isTyping()) {
      showShortcutsModal();
      e.preventDefault();
      return;
    }

    // Everything below is edit-mode only and suppressed while typing
    if (!isEditMode() || isTyping()) return;

    /* ── Mod+key shortcuts ── */
    if (mod(e)) {
      switch (e.key) {

        case 's': case 'S':
          if (!e.shiftKey) {
            const proj = window.Editor.getProject();
            if (proj) window.Projects.saveNow(proj);
            e.preventDefault();
          }
          return;

        case 'e': case 'E':
          if (!e.shiftKey) {
            const proj = window.Editor.getProject();
            if (proj) window.Projects.exportHtml(proj);
            e.preventDefault();
          }
          return;

        case 'd': case 'D':
          window.Editor.duplicateSelected();
          e.preventDefault();
          return;

        // Undo / redo — not yet implemented; preventDefault so browser
        // doesn't navigate or do its own undo on the page
        case 'z': case 'Z':
          e.preventDefault();
          return;

        case 'r': case 'R':
          toggleRulers();
          e.preventDefault();
          return;

        case "'":
          toggleGrid();
          e.preventDefault();
          return;

        case 'y': case 'Y':
          toggleOutlineMode();
          e.preventDefault();
          return;

        case '0':
          window.Game.centerOnPlanet();
          e.preventDefault();
          return;

        case '1': {
          const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
          const wp = window.Game.screenToWorld(cx, cy);
          window.Game.scale = 1;
          window.Game.camX  = cx - wp.x;
          window.Game.camY  = cy - wp.y;
          window.Game.applyCamera();
          e.preventDefault();
          return;
        }

        case '=': case '+':
          zoomAt(1.25);
          e.preventDefault();
          return;

        case '-':
          zoomAt(1 / 1.25);
          e.preventDefault();
          return;

        case ']':
          e.shiftKey ? window.Editor.bringToFront() : window.Editor.bringForward();
          e.preventDefault();
          return;

        case '[':
          e.shiftKey ? window.Editor.sendToBack() : window.Editor.sendBackward();
          e.preventDefault();
          return;
      }
      return; // don't fall through for other mod combos
    }

    /* ── Single-key shortcuts ── */
    switch (e.key) {

      // Tools — match Adobe conventions
      case 'v': case 'V': window.Editor.setTool('select');      e.preventDefault(); break;
      case 'h': case 'H': window.Editor.setTool('pan');         e.preventDefault(); break;
      case 'p': case 'P': window.Editor.setTool('pen');         e.preventDefault(); break;
      case 'e': case 'E': window.Editor.setTool('eraser');      e.preventDefault(); break;
      case 'i': case 'I': window.Editor.setTool('import');      e.preventDefault(); break;
      case 't': case 'T': window.Editor.setTool('addItem');     e.preventDefault(); break;
      case 's': case 'S': window.Editor.setTool('addSurprise'); e.preventDefault(); break;
      case 'x': case 'X': window.Editor.setTool('text');       e.preventDefault(); break;
      case 'c': case 'C': window.Editor.setTool('crop');       e.preventDefault(); break;

      // Zoom: Z = in, Alt+Z = out
      case 'z': case 'Z':
        zoomAt(e.altKey ? 1 / 1.25 : 1.25);
        e.preventDefault();
        break;

      // Selection / deletion
      case 'Escape':
        if (window.Editor.getTool() === 'crop') window.Editor.setTool('select');
        else window.Editor.deselect();
        e.preventDefault();
        break;
      case 'Delete':
      case 'Backspace':
        window.Editor.deleteSelected();
        e.preventDefault();
        break;

      // Nudge (world-space pixels; Shift = ×10)
      case 'ArrowUp':    window.Editor.nudgeSelected(0,  e.shiftKey ? -10 : -1); e.preventDefault(); break;
      case 'ArrowDown':  window.Editor.nudgeSelected(0,  e.shiftKey ?  10 :  1); e.preventDefault(); break;
      case 'ArrowLeft':  window.Editor.nudgeSelected(e.shiftKey ? -10 : -1, 0);  e.preventDefault(); break;
      case 'ArrowRight': window.Editor.nudgeSelected(e.shiftKey ?  10 :  1, 0);  e.preventDefault(); break;

      // Tab — hide / show all panels for distraction-free canvas
      case 'Tab':
        panelsHidden = !panelsHidden;
        document.body.classList.toggle('panels-hidden', panelsHidden);
        e.preventDefault();
        break;

      case 'F11':
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
        e.preventDefault();
        break;
    }
  }

  /* ── keyup ──────────────────────────────────── */

  function onKeyUp(e) {
    if (e.code === 'Space' && spaceHeld) {
      spaceHeld = false;
      document.body.classList.remove('space-pan');
      // Restore the previous tool, unless it was already 'pan'
      if (priorTool && priorTool !== 'pan') window.Editor.setTool(priorTool);
      priorTool = null;
    }
  }

  /* ── M7: Keyboard Shortcuts modal ──────────── */

  function showShortcutsModal() {
    const sec = label =>
      `<div style="padding:10px 0 3px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ui-text-dim);border-top:1px solid var(--panel-border);margin-top:8px">${label}</div>`;
    const row = (action, key) =>
      `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:3px 0;gap:12px">
         <span style="font-size:12px;color:var(--ui-text)">${action}</span>
         <span style="font-size:11px;color:var(--ui-text-dim);white-space:nowrap;font-family:monospace;background:var(--panel-bg-2);border:1px solid var(--panel-border);border-radius:3px;padding:1px 6px">${key}</span>
       </div>`;

    const html = `<div style="columns:2;column-gap:24px;column-fill:balance">
      <div style="break-inside:avoid">
        ${sec('Tools')}
        ${row('Select / Move', 'V')}
        ${row('Hand / Pan', 'H')}
        ${row('Pen', 'P')}
        ${row('Eraser', 'E')}
        ${row('Import image', 'I')}
        ${row('Add hit zone', 'T')}
        ${row('Add surprise', 'S')}
        ${row('Text', 'X')}
        ${row('Crop', 'C')}
        ${row('Temp pan', 'Space')}
        ${row('Constrain', 'Shift')}
      </div>
      <div style="break-inside:avoid">
        ${sec('View')}
        ${row('Zoom in', 'Z')}
        ${row('Zoom out', 'Alt+Z')}
        ${row('Fit to screen', 'Ctrl+0')}
        ${row('100%', 'Ctrl+1')}
        ${row('Rulers', 'Ctrl+R')}
        ${row('Grid', "Ctrl+'")}
        ${row('Outline mode', 'Ctrl+Y')}
        ${row('Hide panels', 'Tab')}
        ${row('Play / Edit', 'F')}
      </div>
      <div style="break-inside:avoid">
        ${sec('Object')}
        ${row('Deselect', 'Esc')}
        ${row('Delete', 'Del')}
        ${row('Duplicate', 'Ctrl+D')}
        ${row('Nudge 1px', '↑↓←→')}
        ${row('Nudge 10px', 'Shift+Arrow')}
      </div>
      <div style="break-inside:avoid">
        ${sec('Layer order')}
        ${row('Bring forward', 'Ctrl+]')}
        ${row('Send backward', 'Ctrl+[')}
        ${row('To front', 'Ctrl+Shift+]')}
        ${row('To back', 'Ctrl+Shift+[')}
        ${sec('File')}
        ${row('Save', 'Ctrl+S')}
        ${row('Export HTML', 'Ctrl+E')}
        ${row('Shortcuts', '?')}
      </div>
    </div>`;

    _openWide('Keyboard Shortcuts', html);
  }

  /* ── M7: Documentation modal ────────────────── */

  function showDocsModal() {
    const DOCS = [
      { title: 'Getting Started', content: `
        <p>Hidden Studio is a browser-based editor for building hidden-object games. No account needed — everything saves to your browser.</p>
        <h4>Workflow</h4>
        <ol>
          <li>Create a project from the start screen</li>
          <li>Upload a background image or SVG planet</li>
          <li>Switch to <strong>Edit</strong> mode</li>
          <li>Add hit zones over objects players need to find</li>
          <li>Switch to <strong>Play</strong> mode to test</li>
          <li>Export as HTML to share</li>
        </ol>` },
      { title: 'Tools', content: `
        <dl>
          <dt><strong>Select (V)</strong></dt><dd>Click to select, drag to move, drag handle to rotate/resize.</dd>
          <dt><strong>Pan (H)</strong></dt><dd>Drag to pan the canvas. Also: hold Space or middle-click drag.</dd>
          <dt><strong>Pen (P)</strong></dt><dd>Draw freehand shapes as SVG paths. Shift = constrain.</dd>
          <dt><strong>Eraser (E)</strong></dt><dd>Erase drawn strokes by dragging over them.</dd>
          <dt><strong>Import (I)</strong></dt><dd>Import PNG/JPG/SVG sprites onto the canvas.</dd>
          <dt><strong>Hit Zone (T)</strong></dt><dd>Draw a hit zone rectangle over an object to make it findable.</dd>
          <dt><strong>Surprise (S)</strong></dt><dd>Add a secret element with a custom reveal animation.</dd>
          <dt><strong>Text (X)</strong></dt><dd>Place text labels on the canvas.</dd>
          <dt><strong>Crop (C)</strong></dt><dd>Resize the document canvas boundary.</dd>
        </dl>` },
      { title: 'Objects & Layers', content: `
        <p>Every element lives on a layer. The Layers panel shows the full stack — drag to reorder.</p>
        <ul>
          <li><strong>Base layer</strong> — your background image or SVG world</li>
          <li><strong>Drawn strokes</strong> — pen paths rendered as SVG</li>
          <li><strong>Sprites</strong> — imported images positioned freely</li>
          <li><strong>Hit zones</strong> — invisible in play mode; mark findable objects</li>
          <li><strong>Surprises</strong> — secret items revealed on completion</li>
        </ul>
        <p>Use Ctrl+] / Ctrl+[ to move items forward/backward in the stack.</p>` },
      { title: 'Gameplay & Hit Zones', content: `
        <p>Hit zones are the core of the game loop. Each hit zone represents one object the player needs to find.</p>
        <ul>
          <li>Draw a hit zone rectangle over the object</li>
          <li>Name it in the Properties panel</li>
          <li>The name appears in the "Find These" list in play mode</li>
          <li>A <strong>Miss Tap</strong> zone marks areas that count as wrong taps</li>
          <li>Surprises appear after all items are found</li>
        </ul>` },
      { title: 'Exporting', content: `
        <p>File → Export HTML creates a self-contained HTML file with your game embedded — no server needed.</p>
        <ul>
          <li>The exported file works offline and on mobile</li>
          <li>Share it by uploading to any web host or sending the file directly</li>
          <li>File → Export JSON saves just the project data for backup</li>
          <li>All projects are also auto-saved in your browser's localStorage</li>
        </ul>` },
    ];

    let activeIdx = 0;

    function render() {
      const nav = DOCS.map((d, i) =>
        `<button onclick="window._docsSetTab(${i})" style="
          display:block;width:100%;text-align:left;padding:6px 10px;margin-bottom:2px;
          border-radius:4px;font-size:12px;border:none;cursor:pointer;
          background:${i === activeIdx ? 'var(--ps-accent-dim)' : 'transparent'};
          color:${i === activeIdx ? 'var(--ps-accent)' : 'var(--ui-text-dim)'};
          font-weight:${i === activeIdx ? 600 : 400};
        ">${d.title}</button>`
      ).join('');

      const content = `<div style="font-size:12px;line-height:1.75;color:var(--ui-text)">
        ${DOCS[activeIdx].content}
        </div>`.replace(/<dt>/g, '<dt style="margin-top:8px;color:var(--ui-text);font-size:12px">')
               .replace(/<dd>/g, '<dd style="margin:1px 0 4px 12px;color:var(--ui-text-dim);font-size:11px">')
               .replace(/<h4>/g, '<h4 style="margin:10px 0 4px;font-size:12px;color:var(--ui-text)">')
               .replace(/<li>/g, '<li style="margin-bottom:3px">');

      const html = `<div style="display:flex;gap:14px">
        <div style="width:130px;flex-shrink:0;border-right:1px solid var(--panel-border);padding-right:10px">
          ${nav}
        </div>
        <div style="flex:1;padding-right:4px">${content}</div>
      </div>`;

      document.getElementById('modalBody').innerHTML = html;
    }

    window._docsSetTab = (i) => { activeIdx = i; render(); };
    _openWide('Documentation', '');
    render();
  }

  /* ── M7: Settings modal ──────────────────────── */

  function showSettingsModal() {
    const PANELS_LIST = ['layers','navigator','properties','transform','swatches','hitzone','surprise','difficulty','project','history'];
    const PANEL_TITLES = { layers:'Layers', navigator:'Navigator', properties:'Properties', transform:'Transform', swatches:'Swatches', hitzone:'Hit Zone', surprise:'Surprise', difficulty:'Difficulty', project:'Project', history:'History' };

    let activeTab = 'general';

    function renderTab() {
      let content = '';
      if (activeTab === 'general') {
        const theme = window.Panels?.getTheme() || 'classic';
        const rulers = document.body.classList.contains('rulers-enabled');
        const grid   = document.body.classList.contains('grid-enabled');
        const outline = document.body.classList.contains('outline-enabled');
        content = `
          ${row('Theme', `<select onchange="window._settingsTheme(this.value)" style="background:var(--panel-bg-2);border:1px solid var(--panel-border);color:var(--ui-text);border-radius:3px;padding:2px 6px;font-size:12px">
            <option value="classic" ${theme==='classic'?'selected':''}>Classic</option>
            <option value="night"   ${theme==='night'  ?'selected':''}>Night Studio</option>
            <option value="warm"    ${theme==='warm'   ?'selected':''}>Warm Studio</option>
            <option value="paper"   ${theme==='paper'  ?'selected':''}>Paper (Light)</option>
          </select>`)}
          ${toggle('Rulers (Ctrl+R)', rulers,   "window._settingsToggle('rulers')")}
          ${toggle('Grid (Ctrl+\')',  grid,     "window._settingsToggle('grid')")}
          ${toggle('Outline mode',    outline,  "window._settingsToggle('outline')")}
        `;
      } else if (activeTab === 'panels') {
        const regs = window.Panels?._getRegs() || {};
        content = PANELS_LIST.map(id => {
          const visible = window.Panels?.isVisible(id) ?? false;
          const title = regs[id]?.title || PANEL_TITLES[id] || id;
          return toggle(title, visible, `window._settingsPanel('${id}')`);
        }).join('');
      } else if (activeTab === 'export') {
        content = `
          <p style="font-size:12px;color:var(--ui-text-dim);margin-bottom:12px">Export settings (coming soon)</p>
          ${row('Format', '<span style="font-size:12px;color:var(--ui-text-dim)">Self-contained HTML (always)</span>')}
          ${row('Image quality', '<span style="font-size:12px;color:var(--ui-text-dim)">Original (lossless)</span>')}
        `;
      } else if (activeTab === 'canvas') {
        const proj = window.Editor?.getProject?.();
        const w = proj?.canvasWidth  || proj?.width  || 1600;
        const h = proj?.canvasHeight || proj?.height || 1600;
        content = `
          ${row('Width',  `<input type="number" id="settingsW" value="${w}" min="100" max="8000" style="${inputStyle}">`)}
          ${row('Height', `<input type="number" id="settingsH" value="${h}" min="100" max="8000" style="${inputStyle}">`)}
          <div style="margin-top:12px">
            <button onclick="window._settingsCanvasApply()" style="background:var(--ui-blue);border:none;color:#fff;padding:5px 14px;border-radius:3px;font-size:12px;cursor:pointer">Apply</button>
          </div>
        `;
      }

      const el = document.getElementById('settingsContent');
      if (el) el.innerHTML = content;
    }

    const inputStyle = 'width:90px;background:var(--panel-bg-2);border:1px solid var(--panel-border);color:var(--ui-text);border-radius:3px;padding:3px 6px;font-size:12px';

    function row(label, control) {
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--panel-border)">
        <span style="font-size:12px;color:var(--ui-text)">${label}</span>
        ${control}
      </div>`;
    }

    function toggle(label, checked, action) {
      return `<div onclick="${action}" style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--panel-border);cursor:pointer;user-select:none">
        <span style="font-size:12px;color:var(--ui-text);pointer-events:none">${label}</span>
        <div style="position:relative;width:34px;height:18px;border-radius:9px;background:${checked?'var(--ui-blue)':'var(--panel-border)'};transition:background .2s;pointer-events:none;flex-shrink:0">
          <div style="position:absolute;top:2px;left:${checked?'18px':'2px'};width:14px;height:14px;border-radius:50%;background:#fff;transition:left .2s"></div>
        </div>
      </div>`;
    }

    const tabs = [
      { id: 'general', label: 'General' },
      { id: 'canvas',  label: 'Canvas'  },
      { id: 'export',  label: 'Export'  },
      { id: 'panels',  label: 'Panels'  },
    ];

    const tabBar = tabs.map(t =>
      `<button onclick="window._settingsTab('${t.id}')" data-settings-tab="${t.id}" style="
        padding:5px 12px;font-size:12px;border:none;cursor:pointer;border-radius:3px 3px 0 0;
        border-bottom:2px solid ${t.id===activeTab?'var(--ui-blue)':'transparent'};
        background:${t.id===activeTab?'var(--panel-bg-2)':'transparent'};
        color:${t.id===activeTab?'var(--ui-text)':'var(--ui-text-dim)'};
      ">${t.label}</button>`
    ).join('');

    const html = `
      <div style="display:flex;gap:2px;margin-bottom:12px;border-bottom:1px solid var(--panel-border)">${tabBar}</div>
      <div id="settingsContent"></div>`;

    window._settingsTab = (id) => {
      activeTab = id;
      document.querySelectorAll('[data-settings-tab]').forEach(btn => {
        const active = btn.dataset.settingsTab === id;
        btn.style.borderBottomColor = active ? 'var(--ui-blue)' : 'transparent';
        btn.style.background        = active ? 'var(--panel-bg-2)' : 'transparent';
        btn.style.color             = active ? 'var(--ui-text)' : 'var(--ui-text-dim)';
      });
      renderTab();
    };
    window._settingsTheme = (v) => { window.Panels?.setTheme(v); };
    window._settingsToggle = (key) => {
      if (key === 'rulers') {
        const on = document.body.classList.toggle('rulers-enabled');
        document.body.classList.toggle('show-rulers', on);
      }
      if (key === 'grid') {
        const on = document.body.classList.toggle('grid-enabled');
        document.body.classList.toggle('show-grid', on);
      }
      if (key === 'outline') {
        const on = document.body.classList.toggle('outline-enabled');
        document.body.classList.toggle('outline-mode', on);
      }
      renderTab();
    };
    // Panel toggle goes through React state — defer renderTab to next tick
    // so the new groups array is in groupsRef when isVisible() is read.
    window._settingsPanel = (id) => { window.Panels?.toggle(id); setTimeout(renderTab, 0); };
    window._settingsCanvasApply = () => {
      const w = parseInt(document.getElementById('settingsW')?.value) || 1600;
      const h = parseInt(document.getElementById('settingsH')?.value) || 1600;
      window.Editor?.resizeCanvas?.(w, h);
    };

    _openWide('Settings', html);
    renderTab();
  }

  /* ── helper: open modal wider than default 420px ── */
  function _openWide(title, html) {
    window.Editor?.openModal?.(title, html);
    const modal = document.getElementById('modal');
    if (modal) {
      modal.style.maxWidth = '640px';
      const backdrop = document.getElementById('modalBackdrop');
      const obs = new MutationObserver(() => {
        if (backdrop?.classList.contains('hidden')) {
          modal.style.maxWidth = '';
          obs.disconnect();
        }
      });
      if (backdrop) obs.observe(backdrop, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ── init ───────────────────────────────────── */

  function init() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);
    startZoomBadge();
    startStatusBar();
    document.body.classList.add('rulers-enabled', 'grid-enabled', 'outline-enabled');
    initRulers();
  }

  /* ── M6: Rulers — labels + click-to-toggle units ── */

  let rulerUnit = (typeof localStorage !== 'undefined' && localStorage.getItem('hs-ruler-unit')) || 'in';
  function pxPerUnit() { return rulerUnit === 'cm' ? 96 / 2.54 : 96; }

  function renderRulers() {
    const top    = document.getElementById('rulerTop');
    const left   = document.getElementById('rulerLeft');
    const corner = document.getElementById('rulerCorner');
    if (!top || !left || !corner) return;

    corner.textContent = rulerUnit;

    const major = pxPerUnit();
    const minor = major / (rulerUnit === 'cm' ? 2 : 4); // 0.5cm or 0.25in

    // Top ruler
    const tw = top.offsetWidth;
    let html = '';
    for (let x = minor; x < tw; x += minor) {
      const isMajor = Math.abs(x % major) < 0.5 || Math.abs((x % major) - major) < 0.5;
      const h = isMajor ? 8 : 4;
      html += `<span class="ruler-tick" style="left:${x}px;height:${h}px"></span>`;
    }
    for (let i = 1, x = major; x < tw; i++, x = i * major) {
      html += `<span class="ruler-label" style="left:${x}px">${i}</span>`;
    }
    top.innerHTML = html;

    // Left ruler
    const lh = left.offsetHeight;
    html = '';
    for (let y = minor; y < lh; y += minor) {
      const isMajor = Math.abs(y % major) < 0.5 || Math.abs((y % major) - major) < 0.5;
      const w = isMajor ? 8 : 4;
      html += `<span class="ruler-tick" style="top:${y}px;width:${w}px"></span>`;
    }
    for (let i = 1, y = major; y < lh; i++, y = i * major) {
      html += `<span class="ruler-label" style="top:${y}px">${i}</span>`;
    }
    left.innerHTML = html;
  }

  function setRulerUnit(u) {
    rulerUnit = (u === 'cm') ? 'cm' : 'in';
    try { localStorage.setItem('hs-ruler-unit', rulerUnit); } catch {}
    renderRulers();
  }

  function toggleRulerUnit() {
    setRulerUnit(rulerUnit === 'in' ? 'cm' : 'in');
  }

  function initRulers() {
    const top    = document.getElementById('rulerTop');
    const left   = document.getElementById('rulerLeft');
    const corner = document.getElementById('rulerCorner');
    if (!top || !left || !corner) return;
    [top, left, corner].forEach(el => el.addEventListener('click', toggleRulerUnit));
    renderRulers();
    window.addEventListener('resize', () => renderRulers());
    // Re-render when rulers become visible (offsetWidth/Height was 0 while hidden)
    const obs = new MutationObserver(() => {
      if (document.body.classList.contains('show-rulers')) renderRulers();
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  function togglePanels() {
    panelsHidden = !panelsHidden;
    document.body.classList.toggle('panels-hidden', panelsHidden);
  }

  function resetPanels() {
    panelsHidden = false;
    document.body.classList.remove('panels-hidden');
  }

  /* ── M6: Canvas chrome toggles ──────────────── */

  function toggleRulers() {
    document.body.classList.toggle('show-rulers');
  }

  function toggleGrid() {
    document.body.classList.toggle('show-grid');
  }

  function toggleOutlineMode() {
    document.body.classList.toggle('outline-mode');
  }

  /* ── M6: Zoom badge polling ─────────────────── */

  function startZoomBadge() {
    const badge = document.getElementById('zoomBadge');
    if (!badge) return;
    setInterval(() => {
      const z = window.Game?.scale;
      if (z != null) badge.textContent = Math.round(z * 100) + '%';
    }, 200);
  }

  /* ── M6: Status bar cursor coords ───────────── */

  function startStatusBar() {
    const coords = document.getElementById('statusCoords');
    if (!coords) return;
    document.getElementById('stage')?.addEventListener('mousemove', e => {
      if (!window.Game) return;
      const wp = window.Game.screenToWorld(e.clientX, e.clientY);
      coords.textContent = `${Math.round(wp.x)}, ${Math.round(wp.y)}`;
    });
  }

  return {
    init,
    showShortcutsModal, showDocsModal, showSettingsModal,
    zoomAt,
    togglePanels, resetPanels,
    toggleRulers, toggleGrid, toggleOutlineMode,
  };

})();
