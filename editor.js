/* ═══════════════════════════════════════════════════
   EDITOR — tools, selection, property panel, modals
═══════════════════════════════════════════════════ */

window.Editor = (function() {

  let project = null;
  let selected = null;   // { kind: 'item'|'surprise'|'sprite', id }
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
  }

  function setProject(p) {
    project = p;
    selected = null;
    // Normalize transforms for existing data
    p.baseTransform = window.Transforms.normalize(p.baseTransform);
    (p.sprites || []).forEach(s => {
      s.transform = window.Transforms.normalize(s.transform);
    });
    updateSelectedPanel();
    renderBaseTransformPanel();
  }

  function setTool(t) {
    tool = t;
    toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === t));
    // Cursor hints
    stage.classList.remove('pen-cursor', 'erase-cursor', 'add-cursor');
    if (t === 'pen')                 stage.classList.add('pen-cursor');
    else if (t === 'eraser')         stage.classList.add('erase-cursor');
    else if (t === 'addItem' || t === 'addSurprise') stage.classList.add('add-cursor');
    // Pen options panel visibility
    penOptions.classList.toggle('hidden', t !== 'pen' && t !== 'eraser');
    // Hint
    if (t === 'addItem')      showHint('Tap the scene to place an item');
    else if (t === 'addSurprise') showHint('Tap the scene to place a surprise');
    else if (t === 'pen')     showHint('Drag to draw on the scene');
    else if (t === 'eraser')  showHint('Drag over strokes to erase');
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
    // Visual selection
    hitsLayer.querySelectorAll('.hit').forEach(el => {
      el.classList.toggle('selected',
        el.dataset.id === id && el.dataset.kind === kind);
    });
    renderSprites();
    updateSelectedPanel();
  }

  function deselect() {
    selected = null;
    hitsLayer.querySelectorAll('.hit').forEach(el => el.classList.remove('selected'));
    renderSprites();
    updateSelectedPanel();
  }

  function getSelected() {
    if (!selected || !project) return null;
    if (selected.kind === 'sprite') {
      return (project.sprites || []).find(x => x.id === selected.id) || null;
    }
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
    // Sprites get their own specialized editor (no hit radius, no sound, but full transforms)
    if (kind === 'sprite') {
      renderSpriteEditor(data);
      return;
    }

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

    // Animation picker (combinable chips)
    if (kind === 'surprise') {
      parts.push(`<label style="margin-top:10px">Sprite`);
      const spriteOpts = window.Sprites.BUILTIN_NAMES.map(n =>
        `<option value="${n}"${data.sprite === n ? ' selected' : ''}>${n}</option>`
      ).join('');
      parts.push(`<select id="sel-sprite">${spriteOpts}</select>`);
      parts.push(`</label>`);
    }

    parts.push(`<label style="margin-top:10px">Animation (click to combine)</label>`);
    parts.push(`<div class="anim-chips" id="sel-anims">`);
    const allAnims = [...window.Anim.LOOPING_NAMES, ...window.Anim.ONE_SHOT_NAMES];
    allAnims.forEach(a => {
      const active = (data.anim || []).includes(a);
      parts.push(`<button class="anim-chip${active ? ' active' : ''}" data-anim="${a}">${window.Anim.PRESETS[a].label}</button>`);
    });
    parts.push(`</div>`);

    // Transform + filter panel for surprises (so the revealed sprite can be rotated, tinted, etc.)
    if (kind === 'surprise') {
      data.transform = window.Transforms.normalize(data.transform);
      parts.push(`<details class="xf-details" style="margin-top:10px"><summary>Rotate & adjust</summary><div id="sel-xf-panel"></div></details>`);
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
      // preview
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
      // Wire transform panel
      const xfHost = document.getElementById('sel-xf-panel');
      if (xfHost) {
        function wireSurpriseXf() {
          xfHost.innerHTML = window.Transforms.renderUI(data.transform, { prefix: 'selxf' });
          window.Transforms.wireUI(data.transform, (updated) => {
            data.transform = updated;
            const rotSlider = document.getElementById('selxf-rotation');
            if (rotSlider && parseFloat(rotSlider.value) !== updated.rotation) {
              wireSurpriseXf(); // Reset happened — rebuild UI
            }
            schedSave();
          }, { prefix: 'selxf' });
        }
        wireSurpriseXf();
      }
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

  /* ————————————————————————————————————————
     SPRITE EDITOR — transforms, size, delete
  ———————————————————————————————————————— */
  function renderSpriteEditor(sprite) {
    sprite.transform = window.Transforms.normalize(sprite.transform);
    const parts = [];

    parts.push(`<div style="font-family:'Caveat',cursive;font-size:16px;color:rgba(245,239,226,.85);margin-bottom:8px">Imported sprite</div>`);

    // Size slider (changes w/h proportionally)
    const currentSize = Math.max(sprite.w, sprite.h);
    parts.push(`<label>Size <span class="xf-val" id="spr-size-val">${Math.round(currentSize)}px</span>`);
    parts.push(`<input type="range" id="spr-size" min="30" max="800" value="${Math.round(currentSize)}">`);
    parts.push(`</label>`);

    // Full transform panel
    parts.push(`<div class="xf-group-title" style="margin-top:10px">Transform</div>`);
    parts.push(window.Transforms.renderUI(sprite.transform, { prefix: 'sprxf' }));

    // Animation chips (sprites can animate too!)
    parts.push(`<label style="margin-top:10px">Animation (click to combine)</label>`);
    parts.push(`<div class="anim-chips" id="spr-anims">`);
    const allAnims = [...window.Anim.LOOPING_NAMES, ...window.Anim.ONE_SHOT_NAMES];
    allAnims.forEach(a => {
      const active = (sprite.anim || []).includes(a);
      parts.push(`<button class="anim-chip${active ? ' active' : ''}" data-anim="${a}">${window.Anim.PRESETS[a].label}</button>`);
    });
    parts.push(`</div>`);

    parts.push(`<button class="delete-btn" id="spr-delete">🗑 Delete sprite</button>`);

    selectedContent.innerHTML = parts.join('');

    // Size slider — keep aspect ratio
    const sizeInput = document.getElementById('spr-size');
    const sizeVal   = document.getElementById('spr-size-val');
    const aspect    = sprite.w / sprite.h;
    sizeInput.addEventListener('input', () => {
      const v = parseInt(sizeInput.value);
      if (aspect >= 1) { sprite.w = v; sprite.h = v / aspect; }
      else             { sprite.h = v; sprite.w = v * aspect; }
      sizeVal.textContent = `${v}px`;
      renderSprites();
      schedSave();
    });

    // Transform sliders
    window.Transforms.wireUI(sprite.transform, (updated) => {
      sprite.transform = updated;
      renderSprites();
      // If reset was clicked, sliders are stale — re-render panel
      const rotSlider = document.getElementById('sprxf-rotation');
      if (rotSlider && parseFloat(rotSlider.value) !== updated.rotation) {
        renderSpriteEditor(sprite);
      }
      schedSave();
    }, { prefix: 'sprxf' });

    // Animation chips
    document.querySelectorAll('#spr-anims .anim-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const a = chip.dataset.anim;
        sprite.anim = sprite.anim || [];
        const idx = sprite.anim.indexOf(a);
        if (idx >= 0) sprite.anim.splice(idx, 1);
        else sprite.anim.push(a);
        chip.classList.toggle('active');
        renderSprites();
        schedSave();
      });
    });

    // Delete
    document.getElementById('spr-delete').addEventListener('click', () => {
      if (!confirm('Delete this sprite?')) return;
      const idx = project.sprites.findIndex(x => x.id === sprite.id);
      if (idx >= 0) project.sprites.splice(idx, 1);
      deselect();
      renderSprites();
      schedSave();
    });
  }

  function deleteSelected() {
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

  /* ————————————————————————————————————————
     DRAG TO MOVE / RESIZE hit zones
  ———————————————————————————————————————— */
  let dragMode = null; // 'move' | 'resize'
  let dragTarget = null;

  function onHitPointerDown(e) {
    if (tool !== 'select') return;
    const hitEl = e.target.closest('.hit');
    if (!hitEl) return;
    e.stopPropagation();

    const kind = hitEl.dataset.kind;
    const id = hitEl.dataset.id;
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
      // keep selection highlight
      hitsLayer.querySelectorAll('.hit').forEach(el => {
        if (el.dataset.id === data.id) el.classList.add('selected');
      });
      window.Game.renderSparkles();
      // Update range slider if shown
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
     BASE LAYER SWAP
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
      project.baseContent = ev.target.result; // data URL
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
    const el = document.getElementById('baseLayer');
    if (!el) return;
    const inner = el.firstElementChild;
    if (!inner) return;
    const t = project.baseTransform = window.Transforms.normalize(project.baseTransform);
    window.Transforms.applyTo(inner, t);
  }

  function renderBaseTransformPanel() {
    const container = document.getElementById('baseTransformPanel');
    if (!container || !project) return;
    const t = project.baseTransform = window.Transforms.normalize(project.baseTransform);
    container.innerHTML = window.Transforms.renderUI(t, { prefix: 'basext' });
    window.Transforms.wireUI(t, (updated) => {
      project.baseTransform = updated;
      applyBaseTransform();
      // If reset was clicked, re-render UI to update slider positions
      const rotSlider = document.getElementById('basext-rotation');
      if (rotSlider && parseFloat(rotSlider.value) !== updated.rotation) {
        renderBaseTransformPanel();
      }
      schedSave();
    }, { prefix: 'basext' });
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
    // Place it at center of current view
    const vw = window.innerWidth, vh = window.innerHeight;
    const centerW = window.Game.screenToWorld(vw / 2, vh / 2);
    // Need image size to compute w/h
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
        x: centerW.x,
        y: centerW.y,
        w, h,
        transform: window.Transforms.defaults(),
      };
      project.sprites = project.sprites || [];
      project.sprites.push(sprite);
      renderSprites();
      schedSave();
      showHint('Sprite placed — drag to move');
    };
    img.src = dataUrl;
  }

  function renderSprites() {
    spriteLayer.innerHTML = '';
    (project?.sprites || []).forEach(s => {
      const el = document.createElement('div');
      el.className = 'sprite selectable';
      el.dataset.id = s.id;
      el.style.left = `${s.x - s.w/2}px`;
      el.style.top  = `${s.y - s.h/2}px`;
      el.style.width = `${s.w}px`;
      el.style.height = `${s.h}px`;

      // Apply full transform + filter
      s.transform = window.Transforms.normalize(s.transform);
      window.Transforms.applyTo(el, s.transform);

      if (s.imageData) el.innerHTML = `<img src="${s.imageData}" alt="" draggable="false">`;
      else if (s.builtin) el.innerHTML = window.Sprites.renderBuiltin(s.builtin);

      // Highlight + rotate handle when selected (only in edit mode)
      if (selected && selected.kind === 'sprite' && selected.id === s.id) {
        el.classList.add('selected');
        if (document.body.classList.contains('edit-mode')) {
          addRotateHandle(el, s);
        }
      }

      // Drag to move
      el.addEventListener('pointerdown', (e) => onSpritePointerDown(e, s));
      spriteLayer.appendChild(el);
    });
  }

  function addRotateHandle(spriteEl, sprite) {
    const line = document.createElement('div');
    line.className = 'sprite-rotate-line';
    spriteEl.appendChild(line);
    const handle = document.createElement('div');
    handle.className = 'sprite-rotate-handle';
    handle.innerHTML = '↻';
    handle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const rect = spriteEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
      const startRot = sprite.transform.rotation || 0;
      const onMove = (ev) => {
        const a = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
        let newRot = startRot + (a - startAngle);
        // Snap to 15° with shift key
        if (ev.shiftKey) newRot = Math.round(newRot / 15) * 15;
        // Keep in -180..180 range
        while (newRot > 180)  newRot -= 360;
        while (newRot < -180) newRot += 360;
        sprite.transform.rotation = Math.round(newRot);
        window.Transforms.applyTo(spriteEl, sprite.transform);
        // Also update slider in panel if open
        const rotSlider = document.getElementById('sprxf-rotation');
        const rotVal    = document.getElementById('sprxf-rotation-val');
        if (rotSlider) rotSlider.value = sprite.transform.rotation;
        if (rotVal) rotVal.textContent = `${sprite.transform.rotation}°`;
      };
      const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        schedSave();
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
    spriteEl.appendChild(handle);
  }

  function onSpritePointerDown(e, sprite) {
    if (!document.body.classList.contains('edit-mode')) return;
    // If clicking on the rotate handle, let it handle itself
    if (e.target.closest('.sprite-rotate-handle')) return;
    e.stopPropagation();
    const startScreen = getScreenPoint(e);
    const startW = window.Game.screenToWorld(startScreen.x, startScreen.y);
    const sx0 = sprite.x, sy0 = sprite.y;
    let moved = false;
    const onMove = (ev) => {
      const p = getScreenPoint(ev);
      const w = window.Game.screenToWorld(p.x, p.y);
      const dx = w.x - startW.x, dy = w.y - startW.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      sprite.x = sx0 + dx;
      sprite.y = sy0 + dy;
      renderSprites();
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (!moved) {
        // it's a tap — select the sprite
        selected = { kind: 'sprite', id: sprite.id };
        hitsLayer.querySelectorAll('.hit').forEach(el => el.classList.remove('selected'));
        renderSprites();
        updateSelectedPanel();
      } else {
        schedSave();
      }
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
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
        updateSelectedPanel(); // refresh to show "custom sound loaded"
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

  /* Called when a project is loaded — hook up its custom sounds */
  async function loadProjectAssets(p) {
    if (p.customSounds) {
      for (const key of Object.keys(p.customSounds)) {
        await window.SFX.loadCustomSound(key, p.customSounds[key]);
      }
    }
  }

  /* Autosave helper */
  function schedSave() {
    window.Projects.scheduleAutosave(project);
  }

  /* Draw stroke handling — called from app.js with world coordinates */
  function onDrawStart(wx, wy) {
    if (tool !== 'pen' && tool !== 'eraser') return false;
    window.Draw.beginStroke(wx, wy, tool === 'eraser');
    return true;
  }
  function onDrawMove(wx, wy) {
    window.Draw.moveStroke(wx, wy);
  }
  function onDrawEnd() {
    const stroke = window.Draw.endStroke(tool === 'eraser');
    if (stroke) {
      project.drawings = project.drawings || [];
      project.drawings.push(stroke);
      schedSave();
    } else if (tool === 'eraser') {
      // strokes were removed; update project
      project.drawings = window.Draw.getStrokes();
      schedSave();
    }
  }

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
    init, setProject,
    setTool, getTool,
    onStageTap,
    onDrawStart, onDrawMove, onDrawEnd,
    renderBaseLayer,
    renderBaseTransformPanel,
    renderSprites,
    loadProjectAssets,
    deselect,
    openModal, closeModal,
  };
})();
