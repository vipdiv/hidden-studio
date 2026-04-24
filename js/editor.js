/* ═══════════════════════════════════════════════════
   EDITOR — tools, selection, property panel, modals
═══════════════════════════════════════════════════ */

window.Editor = (function() {

  let project = null;
  let selected = null;        // { kind: 'item'|'surprise', id }
  let selectedSprite = null;  // sprite id, or null
  let selectedBase = false;   // true when base layer is selected
  let selectedStroke = null;  // stroke id, or null
  let tool = 'select';

  // DOM refs
  let stage, world, hitsLayer, spriteLayer;
  let panel, penOptions, selectedPanel, selectedContent;
  let hintTip, modalBackdrop, modalTitle, modalBody;
  let toolBtns;

  function init(refs) {
    stage = refs.stage; world = refs.world;
    hitsLayer = refs.hitsLayer; spriteLayer = refs.spriteLayer;
    panel = refs.editPanel;
    penOptions = refs.penOptions;
    selectedPanel = refs.selectedPanel;
    selectedContent = refs.selectedContent;
    hintTip = refs.hintTip;
    modalBackdrop = refs.modalBackdrop;
    modalTitle = refs.modalTitle;
    modalBody = refs.modalBody;

    toolBtns = panel.querySelectorAll('.tool-btn');
    toolBtns.forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));

    // Pen color + size
    panel.querySelectorAll('.color-swatch').forEach(s => {
      s.addEventListener('click', () => {
        panel.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('active'));
        s.classList.add('active');
        window.Draw.setColor(s.dataset.color);
      });
    });
    const penSize = document.getElementById('penSize');
    penSize.addEventListener('input', () => window.Draw.setWidth(parseInt(penSize.value)));

    // Dash style buttons
    panel.querySelectorAll('.dash-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.dash-btn').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        window.Draw.setDash(btn.dataset.dash);
        document.getElementById('dashSpacingRow').classList.toggle('hidden', !btn.dataset.dash);
      });
    });
    const dashSpacing = document.getElementById('dashSpacing');
    if (dashSpacing) dashSpacing.addEventListener('input', () => window.Draw.setGap(parseInt(dashSpacing.value)));

    // Base layer controls
    document.getElementById('setBasePlanet').addEventListener('click', () => setBasePlanet());
    document.getElementById('setBaseScan').addEventListener('click',   () => setBaseScan());
    document.getElementById('setBaseUpload').addEventListener('click', () => {
      document.getElementById('baseUploadInput').click();
    });
    document.getElementById('baseUploadInput').addEventListener('change', onBaseUpload);

    // Project actions
    document.getElementById('renameBtn').addEventListener('click', renameProject);
    document.getElementById('exportJsonBtn').addEventListener('click', () => {
      if (project) window.Projects.exportJson(project);
    });
    document.getElementById('exportHtmlBtn').addEventListener('click', () => {
      if (project) window.Projects.exportHtml(project);
    });
    document.getElementById('clearDrawingsBtn').addEventListener('click', () => {
      if (confirm('Clear all pen drawings? (Cannot be undone.)')) {
        window.Draw.clearAll();
        project.drawings = [];
        selectedStroke = null;
        selectedPanel.classList.add('hidden');
        renderLayersPanel();
        schedSave();
      }
    });

    // Modal close
    document.getElementById('modalClose').addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    // Click on hit zones to select
    hitsLayer.addEventListener('pointerdown', onHitPointerDown);
    // Click on base layer to select (edit mode only; handler checks mode+tool)
    document.getElementById('baseLayer').addEventListener('pointerdown', onBaseLayerPointerDown);
    // Click on drawing strokes to select and drag (edit mode only)
    document.getElementById('drawingLayer').addEventListener('pointerdown', onStrokePointerDown);
  }

  function setProject(p) {
    project = p;
    // Migrate legacy sprite.rotation → sprite.transform
    (p.sprites || []).forEach((s, i) => {
      if (!s.transform) {
        s.transform = window.Transforms.defaults();
        if (s.rotation) s.transform.rotation = s.rotation;
      }
      if (s.hidden  === undefined) s.hidden  = false;
      if (s.locked  === undefined) s.locked  = false;
    });
    // Migrate items and surprises
    [...(p.items || []), ...(p.surprises || [])].forEach(obj => {
      if (obj.hidden === undefined) obj.hidden = false;
      if (obj.locked === undefined) obj.locked = false;
    });
    // Ensure base transform data exists
    if (!p.baseTransform) p.baseTransform = window.Transforms.defaults();
    if (p.baseX === undefined) p.baseX = 0;
    if (p.baseY === undefined) p.baseY = 0;
    selected = null;
    selectedSprite = null;
    selectedBase = false;
    selectedStroke = null;
    updateSelectedPanel();
    renderLayersPanel();
  }

  function getProject() { return project; }

  function setTool(t) {
    tool = t;
    toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === t));
    // Cursor hints
    stage.classList.remove('pen-cursor', 'erase-cursor', 'add-cursor', 'crosshair-cursor');
    if (t === 'pen')                              stage.classList.add('pen-cursor');
    else if (t === 'eraser')                      stage.classList.add('erase-cursor');
    else if (t === 'addItem' || t === 'addSurprise') stage.classList.add('add-cursor');
    else if (t === 'rect' || t === 'ellipse' || t === 'star') stage.classList.add('crosshair-cursor');
    // Pen options panel visibility — also show for shape tools
    const isPenLike = ['pen','eraser','rect','ellipse','star'].includes(t);
    penOptions.classList.toggle('hidden', !isPenLike);
    // Hint
    if (t === 'addItem')      showHint('Tap the scene to place an item');
    else if (t === 'addSurprise') showHint('Tap the scene to place a surprise');
    else if (t === 'pen')     showHint('Drag to draw');
    else if (t === 'eraser')  showHint('Drag over strokes to erase');
    else if (t === 'rect')    showHint('Drag to draw a rectangle');
    else if (t === 'ellipse') showHint('Drag to draw an ellipse');
    else if (t === 'star')    showHint('Drag to draw a star');
    else if (t === 'import')  { fileImportDialog(); setTool('select'); }
    else hideHint();
  }
  function getTool() { return tool; }

  function showHint(msg) {
    hintTip.textContent = msg;
    hintTip.classList.add('show');
  }
  function hideHint() {
    hintTip.classList.remove('show');
  }

  /* Called by app.js when user clicks on the stage (in edit mode) */
  function onStageTap(worldX, worldY) {
    if (tool === 'addItem')      { addItem(worldX, worldY);      setTool('select'); }
    else if (tool === 'addSurprise') { addSurprise(worldX, worldY); setTool('select'); }
    else if (tool === 'select')  { selectAtPoint(worldX, worldY); }
  }

  function addItem(x, y) {
    const id = 'item_' + Date.now().toString(36);
    const item = { id, name: 'New item', x, y, r: 40 };
    project.items = project.items || [];
    project.items.push(item);
    schedSave();
    window.Game.renderHits();
    window.Game.renderList();
    window.Game.updateCounter();
    select('item', id);
  }

  function addSurprise(x, y) {
    const id = 'sur_' + Date.now().toString(36);
    const sur = { id, name: 'New surprise', x, y, r: 40,
                  sprite: 'spark', anim: ['pop'], sound: 'pop' };
    project.surprises = project.surprises || [];
    project.surprises.push(sur);
    schedSave();
    window.Game.renderHits();
    window.Game.renderSparkles();
    window.Game.updateCounter();
    select('surprise', id);
  }

  function selectAtPoint(x, y) {
    // Prefer the smallest hit zone containing the point (so nested zones work)
    let best = null;
    let bestR = Infinity;
    const all = [
      ...(project.items || []).map(i => ({ kind: 'item', data: i })),
      ...(project.surprises || []).map(s => ({ kind: 'surprise', data: s })),
    ];
    for (const it of all) {
      const dx = x - it.data.x, dy = y - it.data.y;
      if (dx*dx + dy*dy < it.data.r * it.data.r && it.data.r < bestR) {
        best = it; bestR = it.data.r;
      }
    }
    if (best) {
      select(best.kind, best.data.id);
    } else {
      deselect();
    }
  }

  function select(kind, id) {
    selected = { kind, id };
    selectedSprite = null;
    selectedBase = false;
    selectedStroke = null;
    window.Draw.setSelected(null);
    const bl = document.getElementById('baseLayer');
    if (bl) bl.classList.remove('base-selected');
    spriteLayer.querySelectorAll('.sprite').forEach(el => el.classList.remove('selected'));
    spriteLayer.querySelectorAll('.sprite-rotate-handle, .sprite-rotate-line').forEach(el => el.remove());
    hitsLayer.querySelectorAll('.hit').forEach(el => {
      el.classList.toggle('selected',
        el.dataset.id === id && el.dataset.kind === kind);
    });
    updateSelectedPanel();
  }

  function deselect() {
    selected = null;
    selectedSprite = null;
    selectedBase = false;
    selectedStroke = null;
    window.Draw.setSelected(null);
    hitsLayer.querySelectorAll('.hit').forEach(el => el.classList.remove('selected'));
    spriteLayer.querySelectorAll('.sprite').forEach(el => el.classList.remove('selected'));
    spriteLayer.querySelectorAll('.sprite-rotate-handle, .sprite-rotate-line').forEach(el => el.remove());
    const bl = document.getElementById('baseLayer');
    if (bl) bl.classList.remove('base-selected');
    updateSelectedPanel();
    renderLayersPanel();
  }

  function getSelected() {
    if (!selected || !project) return null;
    const arr = selected.kind === 'item' ? project.items : project.surprises;
    return (arr || []).find(x => x.id === selected.id) || null;
  }

  function updateSelectedPanel() {
    const data = getSelected();
    if (!data) {
      selectedPanel.classList.add('hidden');
      return;
    }
    selectedPanel.classList.remove('hidden');
    renderSelectedEditor(data, selected.kind);
  }

  function renderSelectedEditor(data, kind) {
    const parts = [];
    parts.push(`<label>Name<input type="text" id="sel-name" value="${escapeAttr(data.name)}"></label>`);
    parts.push(`<label>Hit radius<input type="range" id="sel-r" min="10" max="250" value="${data.r}"></label>`);

    // Sound picker
    parts.push(`<label>Sound`);
    const soundOpts = window.SFX.PRESET_NAMES.map(n =>
      `<option value="${n}"${data.sound === n ? ' selected' : ''}>${n}</option>`
    ).join('');
    parts.push(`<select id="sel-sound">${soundOpts}</select>`);
    parts.push(`</label>`);
    const customName = project.customSounds?.[data.id]
      ? `✓ custom sound loaded`
      : `no custom sound`;
    parts.push(`<div style="margin:-6px 0 8px;font-family:'Caveat',cursive;font-size:13px;color:rgba(245,239,226,.6)">${customName}</div>`);
    parts.push(`<button class="ghost-btn" id="sel-upload-sound">⬆ Upload sound (MP3/WAV)</button>`);
    parts.push(`<button class="ghost-btn" id="sel-freesound">🔎 Search Freesound</button>`);

    // Surprise-specific fields
    if (kind === 'surprise') {
      parts.push(`<label style="margin-top:10px">Sprite`);
      const spriteOpts = window.Sprites.BUILTIN_NAMES.map(n =>
        `<option value="${n}"${data.sprite === n ? ' selected' : ''}>${n}</option>`
      ).join('');
      parts.push(`<select id="sel-sprite">${spriteOpts}</select>`);
      parts.push(`</label>`);
    }

    // Animation picker (combinable chips)
    parts.push(`<label style="margin-top:10px">Animation (click to combine)</label>`);
    parts.push(`<div class="anim-chips" id="sel-anims">`);
    const allAnims = [...window.Anim.LOOPING_NAMES, ...window.Anim.ONE_SHOT_NAMES];
    allAnims.forEach(a => {
      const active = (data.anim || []).includes(a);
      parts.push(`<button class="anim-chip${active ? ' active' : ''}" data-anim="${a}">${window.Anim.PRESETS[a].label}</button>`);
    });
    parts.push(`</div>`);

    // Transform panel for surprises (configures how the sprite looks when revealed)
    if (kind === 'surprise') {
      if (!data.transform) data.transform = window.Transforms.defaults();
      parts.push(`<details class="xf-details" open><summary>Rotate & adjust reveal</summary>`);
      parts.push(window.Transforms.renderUI(data.transform, { prefix: 'sur', showScale: false }));
      parts.push(`</details>`);
    }

    parts.push(`<button class="delete-btn" id="sel-delete">🗑 Delete this ${kind}</button>`);

    selectedContent.innerHTML = parts.join('');

    // Wire up inputs
    document.getElementById('sel-name').addEventListener('input', (e) => {
      data.name = e.target.value;
      hitsLayer.querySelector(`.hit[data-id="${data.id}"] .label`).textContent = data.name;
      window.Game.renderList();
      schedSave();
    });
    document.getElementById('sel-r').addEventListener('input', (e) => {
      data.r = parseInt(e.target.value);
      window.Game.renderHits();
      // re-select so highlight stays
      setTimeout(() => select(kind, data.id), 0);
      schedSave();
    });
    document.getElementById('sel-sound').addEventListener('change', (e) => {
      data.sound = e.target.value;
      schedSave();
      window.SFX.play(data.sound);
    });
    document.getElementById('sel-upload-sound').addEventListener('click', () => {
      uploadCustomSoundFor(data.id);
    });
    document.getElementById('sel-freesound').addEventListener('click', () => {
      const url = window.SFX.freesoundSearchUrl(data.name || '');
      window.open(url, '_blank');
    });
    if (kind === 'surprise') {
      document.getElementById('sel-sprite').addEventListener('change', (e) => {
        data.sprite = e.target.value;
        schedSave();
      });
      // Wire the transform sliders — change is saved; visual preview happens on play-mode reveal
      window.Transforms.wireUI(data.transform, (t) => {
        data.transform = t;
        schedSave();
      }, { prefix: 'sur', showScale: false });
    }
    document.querySelectorAll('#sel-anims .anim-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const a = chip.dataset.anim;
        data.anim = data.anim || [];
        const idx = data.anim.indexOf(a);
        if (idx >= 0) data.anim.splice(idx, 1);
        else data.anim.push(a);
        chip.classList.toggle('active');
        schedSave();
      });
    });
    document.getElementById('sel-delete').addEventListener('click', () => {
      if (!confirm(`Delete "${data.name}"?`)) return;
      deleteSelected();
    });
  }

  function deleteSelected() {
    // Handle stroke deletion
    if (selectedStroke) {
      window.Draw.deleteStroke(selectedStroke);
      project.drawings = window.Draw.getStrokes();
      selectedStroke = null;
      selectedPanel.classList.add('hidden');
      renderLayersPanel();
      schedSave();
      return;
    }
    // Handle sprite deletion
    if (selectedSprite) {
      project.sprites = (project.sprites || []).filter(s => s.id !== selectedSprite);
      selectedSprite = null;
      renderSprites();
      selectedPanel.classList.add('hidden');
      schedSave();
      return;
    }
    if (!selected) return;
    const arr = selected.kind === 'item' ? project.items : project.surprises;
    const idx = arr.findIndex(x => x.id === selected.id);
    if (idx >= 0) arr.splice(idx, 1);
    if (project.customSounds) delete project.customSounds[selected.id];
    deselect();
    window.Game.renderHits();
    window.Game.renderList();
    window.Game.renderSparkles();
    window.Game.updateCounter();
    schedSave();
  }

  function duplicateSelected() {
    if (selectedSprite) {
      const sprite = (project.sprites || []).find(s => s.id === selectedSprite);
      if (!sprite) return;
      const copy = JSON.parse(JSON.stringify(sprite));
      copy.id = 'spr_' + Date.now().toString(36);
      copy.x += 20; copy.y += 20;
      project.sprites.push(copy);
      selectSprite(copy.id);
      schedSave();
      return;
    }
    if (!selected) return;
    const arr = selected.kind === 'item' ? project.items : project.surprises;
    const data = (arr || []).find(x => x.id === selected.id);
    if (!data) return;
    const copy = JSON.parse(JSON.stringify(data));
    const prefix = selected.kind === 'item' ? 'item_' : 'sur_';
    copy.id = prefix + Date.now().toString(36);
    copy.x += 20; copy.y += 20;
    arr.push(copy);
    window.Game.renderHits();
    window.Game.renderList();
    window.Game.updateCounter();
    select(selected.kind, copy.id);
    schedSave();
  }

  function nudgeSelected(dx, dy) {
    if (selectedStroke) {
      const s = window.Draw.getStroke(selectedStroke);
      if (s) {
        window.Draw.setStrokeTranslation(selectedStroke, (s.tx || 0) + dx, (s.ty || 0) + dy);
        project.drawings = window.Draw.getStrokes();
        schedSave();
      }
      return;
    }
    if (selectedSprite) {
      const sprite = (project.sprites || []).find(s => s.id === selectedSprite);
      if (sprite) { sprite.x += dx; sprite.y += dy; renderSprites(); schedSave(); }
      return;
    }
    if (!selected) return;
    const data = getSelected();
    if (!data) return;
    data.x += dx; data.y += dy;
    window.Game.renderHits();
    hitsLayer.querySelectorAll('.hit').forEach(el => {
      if (el.dataset.id === data.id) el.classList.add('selected');
    });
    schedSave();
  }

  /* ————————————————————————————————————————
     SPRITE LAYER ORDER
  ———————————————————————————————————————— */
  function _moveSpriteInArray(fromIdx, toIdx) {
    const arr = project.sprites;
    arr.splice(toIdx, 0, arr.splice(fromIdx, 1)[0]);
    renderSprites();
    schedSave();
  }
  function bringForward() {
    const arr = project.sprites || [];
    const i = arr.findIndex(s => s.id === selectedSprite);
    if (i >= 0 && i < arr.length - 1) _moveSpriteInArray(i, i + 1);
  }
  function sendBackward() {
    const arr = project.sprites || [];
    const i = arr.findIndex(s => s.id === selectedSprite);
    if (i > 0) _moveSpriteInArray(i, i - 1);
  }
  function bringToFront() {
    const arr = project.sprites || [];
    const i = arr.findIndex(s => s.id === selectedSprite);
    if (i >= 0) _moveSpriteInArray(i, arr.length - 1);
  }
  function sendToBack() {
    const arr = project.sprites || [];
    const i = arr.findIndex(s => s.id === selectedSprite);
    if (i > 0) _moveSpriteInArray(i, 0);
  }

  /* ————————————————————————————————————————
     DRAG TO MOVE / RESIZE hit zones
  ———————————————————————————————————————— */
  let dragMode = null; // 'move' | 'resize'
  let dragTarget = null;

  function onHitPointerDown(e) {
    if (!document.body.classList.contains('edit-mode')) return;
    if (tool !== 'select') return;
    const hitEl = e.target.closest('.hit');
    if (!hitEl) return;

    const kind = hitEl.dataset.kind;
    const id   = hitEl.dataset.id;
    // Check locked before intercepting the event
    const obj = _findObject(kind, id);
    if (obj?.locked) return;

    e.stopPropagation();
    select(kind, id);

    const data = getSelected();
    if (!data) return;

    if (e.target.classList.contains('resize')) {
      dragMode = 'resize';
    } else {
      dragMode = 'move';
    }
    dragTarget = data;
    const onMove = (ev) => {
      const p = getScreenPoint(ev);
      const w = window.Game.screenToWorld(p.x, p.y);
      if (dragMode === 'move') {
        data.x = w.x;
        data.y = w.y;
      } else if (dragMode === 'resize') {
        const dx = w.x - data.x, dy = w.y - data.y;
        data.r = Math.max(10, Math.min(300, Math.sqrt(dx*dx + dy*dy)));
      }
      window.Game.renderHits();
      hitsLayer.querySelectorAll('.hit').forEach(el => {
        if (el.dataset.id === data.id) el.classList.add('selected');
      });
      window.Game.renderSparkles();
      const rInput = document.getElementById('sel-r');
      if (rInput) rInput.value = data.r;
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      dragMode = null; dragTarget = null;
      schedSave();
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  function getScreenPoint(e) {
    return { x: e.clientX, y: e.clientY };
  }

  /* ————————————————————————————————————————
     BASE LAYER SELECTION
  ———————————————————————————————————————— */
  function selectBase() {
    if (!project) return;
    selected = null;
    selectedSprite = null;
    selectedBase = true;
    selectedStroke = null;
    window.Draw.setSelected(null);
    hitsLayer.querySelectorAll('.hit').forEach(el => el.classList.remove('selected'));
    spriteLayer.querySelectorAll('.sprite').forEach(el => el.classList.remove('selected'));
    spriteLayer.querySelectorAll('.sprite-rotate-handle, .sprite-rotate-line').forEach(el => el.remove());
    const bl = document.getElementById('baseLayer');
    if (bl) bl.classList.add('base-selected');

    selectedPanel.classList.remove('hidden');
    const t = project.baseTransform;
    selectedContent.innerHTML = `
      <div style="font-family:'Caveat',cursive;font-size:15px;color:rgba(245,239,226,.75);margin-bottom:8px">Base Layer</div>
      <label style="font-family:'Caveat',cursive;font-size:13px;color:rgba(245,239,226,.6)">
        X offset <span id="bl-ox-val">${Math.round(project.baseX || 0)}px</span>
        <input type="range" id="bl-ox" min="-800" max="800" value="${project.baseX || 0}">
      </label>
      <label style="font-family:'Caveat',cursive;font-size:13px;color:rgba(245,239,226,.6);margin-bottom:10px">
        Y offset <span id="bl-oy-val">${Math.round(project.baseY || 0)}px</span>
        <input type="range" id="bl-oy" min="-800" max="800" value="${project.baseY || 0}">
      </label>
      ${window.Transforms.renderUI(t, { prefix: 'bl' })}
      <button class="ghost-btn" id="bl-reset-pos" style="margin-top:4px;width:100%">↺ Reset position</button>
      <button class="delete-btn" id="bl-remove" style="margin-top:6px">🗑 Remove base layer</button>
    `;

    window.Transforms.wireUI(t, (newT) => {
      project.baseTransform = newT;
      applyBaseTransform();
      schedSave();
    }, { prefix: 'bl' });

    const oxEl = document.getElementById('bl-ox');
    const oyEl = document.getElementById('bl-oy');
    if (oxEl) oxEl.addEventListener('input', () => {
      project.baseX = parseFloat(oxEl.value);
      document.getElementById('bl-ox-val').textContent = Math.round(project.baseX) + 'px';
      applyBaseTransform();
      schedSave();
    });
    if (oyEl) oyEl.addEventListener('input', () => {
      project.baseY = parseFloat(oyEl.value);
      document.getElementById('bl-oy-val').textContent = Math.round(project.baseY) + 'px';
      applyBaseTransform();
      schedSave();
    });
    document.getElementById('bl-reset-pos').addEventListener('click', () => {
      project.baseX = 0; project.baseY = 0;
      if (oxEl) oxEl.value = 0;
      if (oyEl) oyEl.value = 0;
      document.getElementById('bl-ox-val').textContent = '0px';
      document.getElementById('bl-oy-val').textContent = '0px';
      applyBaseTransform();
      schedSave();
    });
    document.getElementById('bl-remove').addEventListener('click', () => {
      if (!confirm('Remove the base layer?')) return;
      project.baseType = null;
      project.baseContent = null;
      renderBaseLayer();
      deselect();
      schedSave();
    });
    renderLayersPanel();
  }

  /* ————————————————————————————————————————
     STROKE SELECTION
  ———————————————————————————————————————— */
  function selectStroke(id) {
    if (!project) return;
    selected = null;
    selectedSprite = null;
    selectedBase = false;
    selectedStroke = id;
    hitsLayer.querySelectorAll('.hit').forEach(el => el.classList.remove('selected'));
    spriteLayer.querySelectorAll('.sprite').forEach(el => el.classList.remove('selected'));
    spriteLayer.querySelectorAll('.sprite-rotate-handle, .sprite-rotate-line').forEach(el => el.remove());
    const bl = document.getElementById('baseLayer');
    if (bl) bl.classList.remove('base-selected');
    window.Draw.setSelected(id);
    renderStrokeEditor();
    renderLayersPanel();
  }

  function renderStrokeEditor() {
    const stroke = window.Draw.getStroke(selectedStroke);
    if (!stroke) { selectedPanel.classList.add('hidden'); return; }
    selectedPanel.classList.remove('hidden');

    const colors = ['#1a1613','#c43f2e','#5a7a3a','#e6a030','#3860a8','#ffffff'];
    const swatches = colors.map(c =>
      `<button class="color-swatch${stroke.color === c ? ' active' : ''}" style="background:${c}" data-color="${c}"></button>`
    ).join('');

    const dashGap = stroke.gap != null ? stroke.gap : 8;
    selectedContent.innerHTML = `
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--ui-text-dim);margin-bottom:8px">Stroke</div>
      <div class="color-row" id="stroke-colors">${swatches}</div>
      <label class="slider-row" style="margin-bottom:8px">
        Width <input type="range" id="stroke-width" min="1" max="20" value="${stroke.width}">
      </label>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--ui-text-dim);margin-bottom:4px">Line style</div>
      <div class="dash-row" id="stroke-dash-row">
        <button class="dash-btn${!stroke.dash ? ' active' : ''}" data-dash="" title="Solid">— </button>
        <button class="dash-btn${stroke.dash === 'dash' ? ' active' : ''}" data-dash="dash" title="Dashed">- -</button>
        <button class="dash-btn${stroke.dash === 'dot' ? ' active' : ''}" data-dash="dot" title="Dotted">· · ·</button>
      </div>
      <label class="slider-row${stroke.dash ? '' : ' hidden'}" id="stroke-gap-row">
        Gap <input type="range" id="stroke-gap" min="2" max="40" value="${dashGap}">
      </label>
      <button class="delete-btn" id="stroke-delete" style="margin-top:8px">🗑 Delete stroke</button>
    `;

    document.querySelectorAll('#stroke-colors .color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        document.querySelectorAll('#stroke-colors .color-swatch').forEach(x => x.classList.remove('active'));
        sw.classList.add('active');
        window.Draw.updateStroke(selectedStroke, { color: sw.dataset.color });
        project.drawings = window.Draw.getStrokes();
        schedSave();
      });
    });
    document.getElementById('stroke-width').addEventListener('input', (e) => {
      window.Draw.updateStroke(selectedStroke, { width: parseFloat(e.target.value) });
      project.drawings = window.Draw.getStrokes();
      schedSave();
    });
    document.querySelectorAll('#stroke-dash-row .dash-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#stroke-dash-row .dash-btn').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        window.Draw.updateStroke(selectedStroke, { dash: btn.dataset.dash });
        project.drawings = window.Draw.getStrokes();
        document.getElementById('stroke-gap-row').classList.toggle('hidden', !btn.dataset.dash);
        schedSave();
      });
    });
    const gapEl = document.getElementById('stroke-gap');
    if (gapEl) gapEl.addEventListener('input', () => {
      window.Draw.updateStroke(selectedStroke, { gap: parseInt(gapEl.value) });
      project.drawings = window.Draw.getStrokes();
      schedSave();
    });
    document.getElementById('stroke-delete').addEventListener('click', () => {
      window.Draw.deleteStroke(selectedStroke);
      project.drawings = window.Draw.getStrokes();
      selectedStroke = null;
      selectedPanel.classList.add('hidden');
      renderLayersPanel();
      schedSave();
    });
  }

  function onStrokePointerDown(e) {
    if (!document.body.classList.contains('edit-mode')) return;
    if (tool !== 'select') return;
    const g = e.target.closest('[data-stroke-id]');
    if (!g) return;
    const id = g.dataset.strokeId;
    e.stopPropagation();

    selectStroke(id);

    const stroke = window.Draw.getStroke(id);
    if (!stroke) return;

    const startPt  = { x: e.clientX, y: e.clientY };
    const startW   = window.Game.screenToWorld(startPt.x, startPt.y);
    const startTx  = stroke.tx || 0;
    const startTy  = stroke.ty || 0;
    let moved = false;

    const onMove = (ev) => {
      const w = window.Game.screenToWorld(ev.clientX, ev.clientY);
      const dx = w.x - startW.x;
      const dy = w.y - startW.y;
      if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
      if (!moved) return;
      window.Draw.setStrokeTranslation(id, startTx + dx, startTy + dy);
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (moved) {
        project.drawings = window.Draw.getStrokes();
        schedSave();
      }
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  /* ————————————————————————————————————————
     LAYERS PANEL + DRAG-AND-DROP
  ———————————————————————————————————————— */
  function renderLayersPanel() {
    const listEl = document.getElementById('layersList');
    if (!listEl || !project) return;

    const rows = [];
    const sprites = project.sprites || [];
    const strokes = window.Draw.getStrokes();
    const items     = project.items     || [];
    const surprises = project.surprises || [];

    // Helper: build eye + lock HTML for any object
    function visBtns(obj, type) {
      const eyeClass  = obj.hidden ? 'layer-vis is-hidden' : 'layer-vis';
      const lockClass = obj.locked ? 'layer-lock is-locked' : 'layer-lock';
      return `<button class="${eyeClass}" data-vis-type="${type}" data-vis-id="${obj.id}" title="Show/hide">👁</button>` +
             `<button class="${lockClass}" data-lock-type="${type}" data-lock-id="${obj.id}" title="Lock/unlock">🔒</button>`;
    }

    // Items (findable hit zones) — not reorderable between types
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const active = selected?.id === it.id && selected?.kind === 'item';
      rows.push(`<li class="layer-row${active ? ' active' : ''}${it.hidden ? ' layer-hidden' : ''}"
          data-layer-type="item" data-layer-id="${it.id}" data-arr-idx="${i}">
        ${visBtns(it, 'item')}
        <span class="layer-icon">⊙</span>
        <span class="layer-name" title="${escapeAttr(it.name)}">${escapeHtmlInner(it.name)}</span>
        <span class="layer-actions">
          <button class="layer-del" data-del-type="item" data-del-id="${it.id}" title="Delete">×</button>
        </span>
      </li>`);
    }

    // Surprises
    for (let i = surprises.length - 1; i >= 0; i--) {
      const su = surprises[i];
      const active = selected?.id === su.id && selected?.kind === 'surprise';
      rows.push(`<li class="layer-row${active ? ' active' : ''}${su.hidden ? ' layer-hidden' : ''}"
          data-layer-type="surprise" data-layer-id="${su.id}" data-arr-idx="${i}">
        ${visBtns(su, 'surprise')}
        <span class="layer-icon">✨</span>
        <span class="layer-name" title="${escapeAttr(su.name)}">${escapeHtmlInner(su.name)}</span>
        <span class="layer-actions">
          <button class="layer-del" data-del-type="surprise" data-del-id="${su.id}" title="Delete">×</button>
        </span>
      </li>`);
    }

    // Sprites — last in array = frontmost; shown first in panel; draggable
    for (let i = sprites.length - 1; i >= 0; i--) {
      const s = sprites[i];
      const active = selectedSprite === s.id;
      rows.push(`<li class="layer-row${active ? ' active' : ''}${s.hidden ? ' layer-hidden' : ''}"
          data-layer-type="sprite" data-layer-id="${s.id}" data-arr-idx="${i}">
        ${visBtns(s, 'sprite')}
        <span class="layer-drag-handle" title="Drag to reorder">⠿</span>
        <span class="layer-icon">🖼</span>
        <span class="layer-name">Sprite ${i + 1}</span>
        <span class="layer-actions">
          <button class="layer-del" data-del-type="sprite" data-del-id="${s.id}" title="Delete">×</button>
        </span>
      </li>`);
    }

    // Strokes — last in array = frontmost; draggable
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      const active = selectedStroke === s.id;
      rows.push(`<li class="layer-row${active ? ' active' : ''}${s.hidden ? ' layer-hidden' : ''}"
          data-layer-type="stroke" data-layer-id="${s.id}" data-arr-idx="${i}">
        ${visBtns(s, 'stroke')}
        <span class="layer-drag-handle" title="Drag to reorder">⠿</span>
        <span class="layer-icon" style="display:inline-block;width:10px;height:10px;background:${s.color};border-radius:50%;flex-shrink:0"></span>
        <span class="layer-name">Stroke ${i + 1}</span>
        <span class="layer-actions">
          <button class="layer-del" data-del-type="stroke" data-del-id="${s.id}" title="Delete">×</button>
        </span>
      </li>`);
    }

    // Base layer — fixed at bottom
    if (project.baseType) {
      const label = project.baseType === 'svg' ? 'Planet SVG' : 'Base image';
      rows.push(`<li class="layer-row${selectedBase ? ' active' : ''} layer-base" data-layer-type="base">
        <span class="layer-vis" style="opacity:.3;cursor:default">👁</span>
        <span class="layer-lock" style="opacity:.3;cursor:default">🔒</span>
        <span class="layer-icon">🌐</span>
        <span class="layer-name">${label}</span>
      </li>`);
    }

    listEl.innerHTML = rows.length
      ? rows.join('')
      : `<li class="layer-empty">nothing yet</li>`;

    // Pointer → select or drag
    listEl.querySelectorAll('.layer-row').forEach(row => {
      row.addEventListener('pointerdown', (e) => {
        if (e.target.classList.contains('layer-del') ||
            e.target.classList.contains('layer-vis') ||
            e.target.classList.contains('layer-lock')) return;
        _startLayerDragOrClick(e, row);
      });
    });

    // Visibility toggles
    listEl.querySelectorAll('.layer-vis').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.dataset.visType;
        const id   = btn.dataset.visId;
        const obj  = _findObject(type, id);
        if (!obj) return;
        obj.hidden = !obj.hidden;
        _applyVisibility(type, id, obj.hidden);
        renderLayersPanel();
        schedSave();
      });
    });

    // Lock toggles
    listEl.querySelectorAll('.layer-lock').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.dataset.lockType;
        const id   = btn.dataset.lockId;
        const obj  = _findObject(type, id);
        if (!obj) return;
        obj.locked = !obj.locked;
        renderLayersPanel();
        schedSave();
      });
    });

    // Delete buttons
    listEl.querySelectorAll('.layer-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.dataset.delType;
        const id   = btn.dataset.delId;
        if (type === 'sprite') {
          if (!confirm('Delete this sprite?')) return;
          project.sprites = (project.sprites || []).filter(s => s.id !== id);
          if (selectedSprite === id) { selectedSprite = null; selectedPanel.classList.add('hidden'); }
          renderSprites(); renderLayersPanel(); schedSave();
        } else if (type === 'stroke') {
          window.Draw.deleteStroke(id);
          project.drawings = window.Draw.getStrokes();
          if (selectedStroke === id) { selectedStroke = null; selectedPanel.classList.add('hidden'); }
          renderLayersPanel(); schedSave();
        } else if (type === 'item' || type === 'surprise') {
          const arr = type === 'item' ? project.items : project.surprises;
          const idx = arr.findIndex(x => x.id === id);
          if (idx >= 0) arr.splice(idx, 1);
          if (selected?.id === id) deselect();
          window.Game.renderHits();
          window.Game.renderList();
          window.Game.renderSparkles();
          window.Game.updateCounter();
          renderLayersPanel(); schedSave();
        }
      });
    });
  }

  // Find any object across all collections by type+id
  function _findObject(type, id) {
    if (type === 'sprite')   return (project.sprites   || []).find(x => x.id === id) || null;
    if (type === 'item')     return (project.items     || []).find(x => x.id === id) || null;
    if (type === 'surprise') return (project.surprises || []).find(x => x.id === id) || null;
    if (type === 'stroke')   return window.Draw.getStroke(id);
    return null;
  }

  // Apply hidden state immediately to the live DOM without full re-render
  function _applyVisibility(type, id, hidden) {
    if (type === 'sprite') {
      const el = document.querySelector(`.sprite[data-id="${id}"]`);
      if (el) el.style.opacity = hidden ? '0.2' : '';
    } else if (type === 'item' || type === 'surprise') {
      const el = document.querySelector(`.hit[data-id="${id}"]`);
      if (el) el.style.opacity = hidden ? '0.2' : '';
    } else if (type === 'stroke') {
      const g = document.querySelector(`[data-stroke-id="${id}"]`);
      if (g) g.style.opacity = hidden ? '0.2' : '';
    }
  }

  // Safe inner-html escape for layer names
  function escapeHtmlInner(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _startLayerDragOrClick(e, row) {
    const type = row.dataset.layerType;
    const id   = row.dataset.layerId;
    if (type === 'base') { _selectLayerRow(type, id); return; }

    // Capture pointer so move/up fire reliably even outside the element
    row.setPointerCapture(e.pointerId);

    const startX = e.clientX, startY = e.clientY;
    let dragging = false;
    let ghost = null;
    let currentTarget = null;

    function onMove(ev) {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!dragging && Math.abs(dx) + Math.abs(dy) > 5) {
        dragging = true;
        ghost = document.createElement('div');
        ghost.className = 'layer-drag-ghost';
        ghost.style.pointerEvents = 'none';
        ghost.textContent = row.querySelector('.layer-name')?.textContent || 'layer';
        document.body.appendChild(ghost);
        row.classList.add('layer-dragging');
      }
      if (!dragging) return;
      ghost.style.left = (ev.clientX + 14) + 'px';
      ghost.style.top  = (ev.clientY - 8)  + 'px';

      // Use bounding-rect hit detection (reliable even with pointer capture)
      document.querySelectorAll('.layer-row').forEach(r => r.classList.remove('drag-over'));
      currentTarget = null;
      document.querySelectorAll('#layersList .layer-row').forEach(r => {
        if (r === row) return;
        if (r.dataset.layerType !== type) return;
        const rect = r.getBoundingClientRect();
        if (ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
          r.classList.add('drag-over');
          currentTarget = r;
        }
      });
    }

    function onUp() {
      row.removeEventListener('pointermove', onMove);
      row.removeEventListener('pointerup',   onUp);
      row.removeEventListener('pointercancel', onUp);
      if (ghost) ghost.remove();
      row.classList.remove('layer-dragging');
      document.querySelectorAll('.layer-row').forEach(r => r.classList.remove('drag-over'));

      if (!dragging) { _selectLayerRow(type, id); return; }
      if (!currentTarget) return;

      const fromIdx = parseInt(row.dataset.arrIdx);
      const toIdx   = parseInt(currentTarget.dataset.arrIdx);
      if (isNaN(fromIdx) || isNaN(toIdx) || fromIdx === toIdx) return;

      if (type === 'sprite') {
        const arr = project.sprites;
        arr.splice(toIdx, 0, arr.splice(fromIdx, 1)[0]);
        renderSprites(); renderLayersPanel(); schedSave();
      } else if (type === 'stroke') {
        const strokes = window.Draw.getStrokes();
        strokes.splice(toIdx, 0, strokes.splice(fromIdx, 1)[0]);
        window.Draw.loadFrom(strokes);
        project.drawings = window.Draw.getStrokes();
        renderLayersPanel(); schedSave();
      }
    }

    row.addEventListener('pointermove',   onMove);
    row.addEventListener('pointerup',     onUp);
    row.addEventListener('pointercancel', onUp);
  }

  function _selectLayerRow(type, id) {
    if (type === 'sprite')   selectSprite(id);
    else if (type === 'stroke')   selectStroke(id);
    else if (type === 'base')     selectBase();
    else if (type === 'item')     select('item',     id);
    else if (type === 'surprise') select('surprise', id);
  }

  function onBaseLayerPointerDown(e) {
    if (!document.body.classList.contains('edit-mode')) return;
    if (tool !== 'select') return; // let pen/eraser/addItem events propagate naturally
    e.stopPropagation();

    selectBase();

    // Drag to reposition
    const startPt = { x: e.clientX, y: e.clientY };
    const startX = project.baseX || 0;
    const startY = project.baseY || 0;
    let moved = false;

    const onMove = (ev) => {
      const dx = (ev.clientX - startPt.x) / (window.Game.scale || 1);
      const dy = (ev.clientY - startPt.y) / (window.Game.scale || 1);
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      if (!moved) return;
      project.baseX = startX + dx;
      project.baseY = startY + dy;
      applyBaseTransform();
      // Sync sliders if panel is open
      const ox = document.getElementById('bl-ox');
      const oy = document.getElementById('bl-oy');
      if (ox) { ox.value = project.baseX; document.getElementById('bl-ox-val').textContent = Math.round(project.baseX) + 'px'; }
      if (oy) { oy.value = project.baseY; document.getElementById('bl-oy-val').textContent = Math.round(project.baseY) + 'px'; }
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (moved) schedSave();
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  /* ————————————————————————————————————————
     BASE LAYER SWAP + TRANSFORM
  ———————————————————————————————————————— */
  function setBasePlanet() {
    project.baseType = 'svg';
    project.baseContent = 'PLANET_SVG';
    renderBaseLayer();
    schedSave();
  }
  function setBaseScan() {
    project.baseType = 'image';
    project.baseContent = 'assets/scene.jpg';
    renderBaseLayer();
    schedSave();
  }
  function onBaseUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      project.baseType = 'image';
      project.baseContent = ev.target.result;
      renderBaseLayer();
      schedSave();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function renderBaseLayer() {
    const el = document.getElementById('baseLayer');
    if (!el || !project) return;
    if (project.baseType === 'svg' && project.baseContent === 'PLANET_SVG') {
      el.innerHTML = window.PLANET_SVG;
    } else if (project.baseType === 'image' && project.baseContent) {
      el.innerHTML = `<img src="${project.baseContent}" alt="" draggable="false">`;
    } else {
      el.innerHTML = '';
    }
    applyBaseTransform();
  }

  function applyBaseTransform() {
    const inner = document.getElementById('baseLayer')?.firstElementChild;
    if (!inner || !project) return;
    const t = window.Transforms.normalize(project.baseTransform || {});
    const x = project.baseX || 0;
    const y = project.baseY || 0;
    const parts = [];
    if (x !== 0 || y !== 0) parts.push(`translate(${x}px, ${y}px)`);
    if (t.rotation) parts.push(`rotate(${t.rotation}deg)`);
    const sx = (t.flipH ? -1 : 1) * t.scale;
    const sy = (t.flipV ? -1 : 1) * t.scale;
    if (sx !== 1 || sy !== 1) parts.push(`scale(${sx}, ${sy})`);
    inner.style.transform = parts.join(' ');
    inner.style.filter = window.Transforms.buildFilter(t);
  }

  function renderBaseTransformPanel() {
    // No-op: base layer now selected by clicking on it (see selectBase)
  }

  /* ————————————————————————————————————————
     IMAGE IMPORT AS SPRITE
  ———————————————————————————————————————— */
  function fileImportDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => importSpriteFromDataUrl(ev.target.result);
      reader.readAsDataURL(file);
    });
    input.click();
  }

  function importSpriteFromDataUrl(dataUrl) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const centerW = window.Game.screenToWorld(vw / 2, vh / 2);
    const img = new Image();
    img.onload = () => {
      const maxSide = 200;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > maxSide || h > maxSide) {
        const s = maxSide / Math.max(w, h);
        w *= s; h *= s;
      }
      const sprite = {
        id: 'spr_' + Date.now().toString(36),
        imageData: dataUrl,
        x: centerW.x, y: centerW.y,
        w, h,
        transform: window.Transforms.defaults(),
      };
      project.sprites = project.sprites || [];
      project.sprites.push(sprite);
      renderSprites();
      renderLayersPanel();
      schedSave();
      showHint('Sprite placed — tap to select, drag to move');
    };
    img.src = dataUrl;
  }

  function renderSprites() {
    spriteLayer.innerHTML = '';
    (project?.sprites || []).forEach(s => {
      const el = document.createElement('div');
      el.className = 'sprite selectable';
      el.dataset.id = s.id;
      if (s.hidden) el.style.opacity = '0.2';
      el.style.left   = `${s.x - s.w/2}px`;
      el.style.top    = `${s.y - s.h/2}px`;
      el.style.width  = `${s.w}px`;
      el.style.height = `${s.h}px`;
      // Apply rotation/flip/filters; size is via width/height so skip scale
      window.Transforms.applyTo(el, s.transform || {}, { includeScale: false });
      if (s.imageData) el.innerHTML = `<img src="${s.imageData}" alt="" draggable="false">`;
      else if (s.builtin) el.innerHTML = window.Sprites.renderBuiltin(s.builtin);
      // Selection highlight + rotate handle
      if (s.id === selectedSprite) {
        el.classList.add('selected');
        const line = document.createElement('div');
        line.className = 'sprite-rotate-line';
        el.appendChild(line);
        const handle = document.createElement('div');
        handle.className = 'sprite-rotate-handle';
        handle.textContent = '↻';
        handle.addEventListener('pointerdown', (ev) => onRotateHandleDown(ev, s));
        el.appendChild(handle);
      }
      el.addEventListener('pointerdown', (e) => onSpritePointerDown(e, s));
      spriteLayer.appendChild(el);
    });
  }

  function onSpritePointerDown(e, sprite) {
    if (!document.body.classList.contains('edit-mode')) return;
    if (sprite.locked) return; // locked layers pass through to stage
    // Only intercept in select mode; other tools (pen, shapes) need the event to reach the stage
    if (tool !== 'select') return;
    e.stopPropagation();
    const startPt = getScreenPoint(e);
    const startW  = window.Game.screenToWorld(startPt.x, startPt.y);
    const sx0 = sprite.x, sy0 = sprite.y;
    let moved = false;

    const onMove = (ev) => {
      const p = getScreenPoint(ev);
      if (Math.abs(p.x - startPt.x) + Math.abs(p.y - startPt.y) > 3) moved = true;
      if (!moved) return;
      const w = window.Game.screenToWorld(p.x, p.y);
      sprite.x = sx0 + (w.x - startW.x);
      sprite.y = sy0 + (w.y - startW.y);
      renderSprites();
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (!moved) {
        selectSprite(sprite.id);
      } else {
        schedSave();
      }
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  function onRotateHandleDown(e, sprite) {
    e.stopPropagation();
    e.preventDefault();
    const sprEl = spriteLayer.querySelector(`[data-id="${sprite.id}"]`);
    const rect  = sprEl.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const startAngle   = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    if (!sprite.transform) sprite.transform = window.Transforms.defaults();
    const startRotation = sprite.transform.rotation || 0;

    const onMove = (ev) => {
      const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
      let delta = angle - startAngle;
      if (ev.shiftKey) delta = Math.round(delta / 15) * 15;
      let newRot = startRotation + delta;
      while (newRot >  180) newRot -= 360;
      while (newRot < -180) newRot += 360;
      sprite.transform.rotation = parseFloat(newRot.toFixed(1));
      renderSprites();
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      schedSave();
      renderSpriteEditor(); // refresh rotation slider to match
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  function selectSprite(id) {
    selected = null;
    selectedSprite = id;
    selectedBase = false;
    selectedStroke = null;
    window.Draw.setSelected(null);
    const bl = document.getElementById('baseLayer');
    if (bl) bl.classList.remove('base-selected');
    hitsLayer.querySelectorAll('.hit').forEach(el => el.classList.remove('selected'));
    renderSprites();
    renderSpriteEditor();
  }

  function renderSpriteEditor() {
    const sprite = (project?.sprites || []).find(s => s.id === selectedSprite);
    if (!sprite) { selectedPanel.classList.add('hidden'); return; }
    selectedPanel.classList.remove('hidden');
    if (!sprite.transform) sprite.transform = window.Transforms.defaults();

    // Size sliders (width + height, maintain aspect if shift held)
    const sizeHtml = `
      <div style="margin-bottom:10px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--ui-text-dim);margin-bottom:6px">Size</div>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:4px">
          W <input type="range" id="spr-w" min="10" max="800" value="${Math.round(sprite.w)}">
          <span id="spr-w-val" style="min-width:34px;text-align:right;font-size:11px;color:var(--ui-text-dim)">${Math.round(sprite.w)}px</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px">
          H <input type="range" id="spr-h" min="10" max="800" value="${Math.round(sprite.h)}">
          <span id="spr-h-val" style="min-width:34px;text-align:right;font-size:11px;color:var(--ui-text-dim)">${Math.round(sprite.h)}px</span>
        </label>
      </div>
    `;

    let html = sizeHtml + window.Transforms.renderUI(sprite.transform, { prefix: 'spr' });
    html += `<button class="delete-btn" id="spr-delete" style="margin-top:8px">🗑 Delete sprite</button>`;
    selectedContent.innerHTML = html;

    // Wire size sliders
    const wSlider = document.getElementById('spr-w');
    const hSlider = document.getElementById('spr-h');
    const aspect = sprite.h / sprite.w;
    wSlider.addEventListener('input', () => {
      sprite.w = parseInt(wSlider.value);
      document.getElementById('spr-w-val').textContent = sprite.w + 'px';
      renderSprites(); schedSave();
    });
    hSlider.addEventListener('input', () => {
      sprite.h = parseInt(hSlider.value);
      document.getElementById('spr-h-val').textContent = sprite.h + 'px';
      renderSprites(); schedSave();
    });

    window.Transforms.wireUI(sprite.transform, (t) => {
      sprite.transform = t;
      renderSprites();
      schedSave();
    }, { prefix: 'spr' });

    document.getElementById('spr-delete').addEventListener('click', () => {
      if (!confirm('Delete this sprite?')) return;
      project.sprites = (project.sprites || []).filter(s => s.id !== selectedSprite);
      selectedSprite = null;
      renderSprites();
      selectedPanel.classList.add('hidden');
      renderLayersPanel();
      schedSave();
    });
  }

  /* ————————————————————————————————————————
     CUSTOM SOUND UPLOAD FOR AN ITEM
  ———————————————————————————————————————— */
  function uploadCustomSoundFor(itemId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        project.customSounds = project.customSounds || {};
        project.customSounds[itemId] = dataUrl;
        await window.SFX.loadCustomSound(itemId, dataUrl);
        schedSave();
        updateSelectedPanel();
      };
      reader.readAsDataURL(file);
    });
    input.click();
  }

  /* ————————————————————————————————————————
     PROJECT RENAME + DRAWINGS LOAD
  ———————————————————————————————————————— */
  function renameProject() {
    const name = prompt('Project name:', project.name);
    if (name && name.trim()) {
      project.name = name.trim();
      document.getElementById('projectName').textContent = project.name;
      schedSave();
    }
  }

  async function loadProjectAssets(p) {
    if (p.customSounds) {
      for (const key of Object.keys(p.customSounds)) {
        await window.SFX.loadCustomSound(key, p.customSounds[key]);
      }
    }
  }

  function schedSave() {
    window.Projects.scheduleAutosave(project);
  }

  /* Draw stroke handling — called from app.js with world coordinates */
  const SHAPE_TOOLS = ['rect', 'ellipse', 'star'];

  function onDrawStart(wx, wy) {
    if (SHAPE_TOOLS.includes(tool)) {
      window.Draw.beginShape(tool, wx, wy);
      return true;
    }
    if (tool !== 'pen' && tool !== 'eraser') return false;
    window.Draw.beginStroke(wx, wy, tool === 'eraser');
    return true;
  }
  function onDrawMove(wx, wy) {
    if (SHAPE_TOOLS.includes(tool)) {
      window.Draw.previewShape(wx, wy);
    } else {
      window.Draw.moveStroke(wx, wy);
    }
  }
  function onDrawEnd() {
    if (SHAPE_TOOLS.includes(tool)) {
      const stroke = window.Draw.commitShape(..._lastWorldPoint());
      if (stroke) {
        project.drawings = project.drawings || [];
        project.drawings.push(stroke);
        schedSave();
      }
      renderLayersPanel();
      return;
    }
    const stroke = window.Draw.endStroke(tool === 'eraser');
    if (stroke) {
      project.drawings = project.drawings || [];
      project.drawings.push(stroke);
      schedSave();
    } else if (tool === 'eraser') {
      project.drawings = window.Draw.getStrokes();
      schedSave();
    }
    renderLayersPanel();
  }

  let _lastWX = 0, _lastWY = 0;
  function _lastWorldPoint() { return [_lastWX, _lastWY]; }
  function onDrawMoveRecord(wx, wy) { _lastWX = wx; _lastWY = wy; onDrawMove(wx, wy); }

  function openModal(title, bodyHtml) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modalBackdrop.classList.remove('hidden');
  }
  function closeModal() {
    modalBackdrop.classList.add('hidden');
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }

  return {
    init, setProject, getProject,
    setTool, getTool,
    onStageTap,
    onDrawStart, onDrawMove, onDrawEnd, onDrawMoveRecord,
    renderBaseLayer, applyBaseTransform, renderBaseTransformPanel,
    renderSprites, renderLayersPanel,
    selectSprite, selectBase, selectStroke,
    get selectedBase() { return selectedBase; },
    get selectedStroke() { return selectedStroke; },
    deleteSelected, duplicateSelected, nudgeSelected,
    bringForward, sendBackward, bringToFront, sendToBack,
    loadProjectAssets,
    deselect,
    openModal, closeModal,
  };
})();
