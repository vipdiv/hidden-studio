/* ═══════════════════════════════════════════════════
   EDITOR — tools, selection, property panel, modals
═══════════════════════════════════════════════════ */

window.Editor = (function() {

  let project = null;
  let selected = null;        // { kind: 'item'|'surprise', id }
  let selectedSprite = null;  // sprite id, or null
  let selectedBase = false;   // true when base layer is selected
  let selectedStroke = null;  // stroke id, or null
  let _textEditTarget = null; // text id to enter inline edit after next renderTexts()
  let _catCollapsed = (function() {
    try { return JSON.parse(localStorage.getItem('hs-cat-collapsed') || '{}'); } catch { return {}; }
  })();
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

    // Tool buttons live in #toolStrip (vertical strip) — query document-wide
    toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
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

    // Base layer controls (Planet SVG / Original scan buttons were removed
    // — those base types are still set during project creation in app.js)
    document.getElementById('setBasePlanet')?.addEventListener('click', () => setBasePlanet());
    document.getElementById('setBaseScan')?.addEventListener('click',   () => setBaseScan());
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
    document.getElementById('docSizeBtn')?.addEventListener('click', openDocSizeModal);
    document.getElementById('statsBtn')?.addEventListener('click', openStatsModal);

    // Miss tap settings
    const missSoundSel = document.getElementById('missSoundSelect');
    if (missSoundSel) {
      (window.SFX.PRESET_CATEGORIES || []).forEach(cat => {
        const og = document.createElement('optgroup');
        og.label = cat.label;
        cat.sounds.forEach(name => {
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = name;
          og.appendChild(opt);
        });
        missSoundSel.appendChild(og);
      });
      // Custom-upload group is appended on demand once a file is loaded.
      missSoundSel.addEventListener('change', () => {
        if (!project) return;
        const v = missSoundSel.value;
        project.missSound = v;
        window.SFX.ensure();
        window.SFX.play(v === '__custom__' ? '__miss__' : v);
        schedSave();
      });
    }
    document.getElementById('missSoundUploadBtn')?.addEventListener('click', uploadCustomMissSound);
    document.getElementById('missColor')?.addEventListener('input', (e) => {
      if (!project) return;
      project.missStyle = Object.assign({}, project.missStyle, { color: e.target.value });
      schedSave();
    });
    document.getElementById('missStroke')?.addEventListener('input', (e) => {
      if (!project) return;
      project.missStyle = Object.assign({}, project.missStyle, { stroke: e.target.value });
      schedSave();
    });
    document.getElementById('missFontSize')?.addEventListener('input', (e) => {
      if (!project) return;
      document.getElementById('missFontSizeVal').textContent = e.target.value;
      project.missStyle = Object.assign({}, project.missStyle, { fontSize: parseInt(e.target.value) });
      schedSave();
    });
    document.getElementById('missFontFamily')?.addEventListener('change', (e) => {
      if (!project) return;
      project.missStyle = Object.assign({}, project.missStyle, { fontFamily: e.target.value });
      schedSave();
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

    // Collapsible panel sections + panel-level collapse button
    initCollapsibleSections();
    // Crop tool
    initCropTool();

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
    // Ensure texts array exists and migrate hidden/locked/name
    if (!p.texts) p.texts = [];
    p.texts.forEach(t => {
      if (t.hidden === undefined) t.hidden = false;
      if (t.locked === undefined) t.locked = false;
      if (t.name  === undefined) t.name  = '';
    });
    // Ensure groups array exists
    if (!p.groups) p.groups = [];
    // Ensure document dimensions exist
    if (!p.docWidth)  p.docWidth  = 1600;
    if (!p.docHeight) p.docHeight = 1600;
    if (!p.docDpi)    p.docDpi    = 150;
    selected = null;
    selectedSprite = null;
    selectedBase = false;
    selectedStroke = null;
    applyDocSize();
    updateSelectedPanel();
    renderLayersPanel();
    syncMissControls();

    // Show base image size in the panel when loading a project with an uploaded image
    const infoEl = document.getElementById('baseImageInfo');
    if (infoEl) {
      if (p.baseType === 'image' && p.baseContent?.startsWith('data:image')) {
        const bytes = Math.round((p.baseContent.length - p.baseContent.indexOf(',') - 1) * 0.75);
        _showBaseImageInfo(bytes, bytes);
      } else {
        infoEl.style.display = 'none';
      }
    }
  }

  function syncMissControls() {
    if (!project) return;
    // Ensure missStyle exists and WYSIWYG defaults are written — controls display must match what renders
    if (!project.missStyle) project.missStyle = {};
    const ms = project.missStyle;
    if (ms.color      === undefined) ms.color      = '#e6e0d4';
    if (ms.fontSize   === undefined) ms.fontSize   = 24;
    if (ms.fontFamily === undefined) ms.fontFamily = "'Caveat', cursive";
    // stroke left undefined by default — no stroke unless user sets one

    const sel = document.getElementById('missSoundSelect');
    if (sel) {
      _ensureCustomMissOption(sel, !!project.missSoundData);
      sel.value = project.missSound ?? 'miss';
    }
    const colEl = document.getElementById('missColor');
    if (colEl) colEl.value = ms.color;
    const strokeEl = document.getElementById('missStroke');
    if (strokeEl) strokeEl.value = ms.stroke || '#0b0d1f';
    const fsEl = document.getElementById('missFontSize');
    if (fsEl) { fsEl.value = ms.fontSize; document.getElementById('missFontSizeVal').textContent = fsEl.value; }
    const ffEl = document.getElementById('missFontFamily');
    if (ffEl) ffEl.value = ms.fontFamily;
    _showMissSoundInfo(project.missSoundData);
  }

  /* Add (or remove) the "(custom upload)" option in the miss-sound dropdown. */
  function _ensureCustomMissOption(sel, present) {
    let og = sel.querySelector('optgroup[data-custom="1"]');
    if (present && !og) {
      og = document.createElement('optgroup');
      og.label = 'Custom';
      og.dataset.custom = '1';
      const o = document.createElement('option');
      o.value = '__custom__';
      o.textContent = 'your uploaded sound';
      og.appendChild(o);
      sel.appendChild(og);
    } else if (!present && og) {
      og.remove();
    }
  }

  /* Display compressed-size info under the upload button. */
  function _showMissSoundInfo(dataUrl) {
    const el = document.getElementById('missSoundInfo');
    if (!el) return;
    if (!dataUrl) { el.style.display = 'none'; el.textContent = ''; return; }
    const bytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
    el.style.display = 'block';
    el.textContent = `Custom sound loaded (${_fmtKb(bytes)})`;
  }

  function _fmtKb(b) {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }

  /* ————————————————————————————————————————
     CUSTOM MISS-TAP SOUND UPLOAD (with compression)
  ———————————————————————————————————————— */
  async function uploadCustomMissSound() {
    if (!project) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const infoEl = document.getElementById('missSoundInfo');
      if (infoEl) { infoEl.style.display = 'block'; infoEl.textContent = 'Compressing…'; }
      try {
        const result = await window.SFX.compressAudio(file, { maxDuration: 1.2, targetRate: 16000 });
        project.missSoundData = result.dataUrl;
        project.missSound = '__custom__';
        await window.SFX.loadCustomSound('__miss__', result.dataUrl);
        const sel = document.getElementById('missSoundSelect');
        if (sel) {
          _ensureCustomMissOption(sel, true);
          sel.value = '__custom__';
        }
        if (infoEl) {
          infoEl.style.display = 'block';
          infoEl.textContent = `Compressed: ${_fmtKb(result.originalSizeBytes)} → ${_fmtKb(result.sizeBytes)} ✓ (${result.durationSec.toFixed(2)}s)`;
        }
        window.SFX.play('__miss__');
        schedSave();
      } catch (err) {
        if (infoEl) infoEl.textContent = 'Could not load that file. Try MP3 or WAV.';
        console.warn('Miss sound upload failed', err);
      }
    });
    input.click();
  }

  function getProject() { return project; }

  function setTool(t) {
    tool = t;
    toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === t));
    // Cursor hints
    stage.classList.remove('pen-cursor', 'erase-cursor', 'add-cursor', 'crosshair-cursor', 'pan-active', 'select-active');
    if (t === 'pen')                              stage.classList.add('pen-cursor');
    else if (t === 'eraser')                      stage.classList.add('erase-cursor');
    else if (t === 'addItem' || t === 'addSurprise' || t === 'text') stage.classList.add('add-cursor');
    else if (t === 'rect' || t === 'ellipse' || t === 'star') stage.classList.add('crosshair-cursor');
    else if (t === 'crop') stage.classList.add('crosshair-cursor');
    else if (t === 'pan')    stage.classList.add('pan-active');
    else if (t === 'select') stage.classList.add('select-active');
    // Show/hide crop overlay
    if (t === 'crop') { document.body.classList.add('crop-active'); }
    else              { document.body.classList.remove('crop-active'); }
    // Pen options panel visibility — also show for shape tools
    const isPenLike = ['pen','eraser','rect','ellipse','star'].includes(t);
    penOptions.classList.toggle('hidden', !isPenLike);
    // Hint
    if (t === 'addItem')      showHint('Tap the scene to place an item');
    else if (t === 'addSurprise') showHint('Tap the scene to place a surprise');
    else if (t === 'pen')     showHint('Drag to draw');
    else if (t === 'eraser')  showHint('Drag over strokes to erase');
    else if (t === 'rect')    showHint('Drag to draw a rectangle · Shift = square');
    else if (t === 'ellipse') showHint('Drag to draw an ellipse · Shift = circle');
    else if (t === 'star')    showHint('Click to set centre, drag for size');
    else if (t === 'text')    showHint('Click to place text');
    else if (t === 'import')  { fileImportDialog(); setTool('select'); }
    else if (t === 'crop')    showHint('Drag handles to set crop area · Fit to Base · Apply');
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
    if (tool === 'addItem')          { addItem(worldX, worldY);    setTool('select'); }
    else if (tool === 'addSurprise') { addSurprise(worldX, worldY); setTool('select'); }
    else if (tool === 'text')        { addText(worldX, worldY); }
    else if (tool === 'select')      { selectAtPoint(worldX, worldY); }
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

  /* ——— TEXT TOOL ——————————————————————————— */
  function addText(x, y) {
    openModal('Add Text', `
      <label style="display:block;margin-bottom:8px">Text content
        <textarea id="text-input" rows="3" style="width:100%;margin-top:6px;background:var(--ui-bg);color:var(--ui-text);border:1px solid var(--panel-border);border-radius:3px;padding:6px;font-size:16px;resize:vertical"></textarea>
      </label>
      <label style="display:block;margin-bottom:8px">Font size
        <input type="range" id="text-size" min="8" max="120" value="32" style="width:100%;margin-top:4px">
        <span id="text-size-val" style="font-size:11px;color:var(--ui-text-dim)">32px</span>
      </label>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button id="text-confirm" class="ghost-btn" style="flex:1">Place text</button>
        <button id="text-cancel" class="ghost-btn danger" style="flex:1">Cancel</button>
      </div>
    `);
    const sizeEl = document.getElementById('text-size');
    const sizeVal = document.getElementById('text-size-val');
    sizeEl.addEventListener('input', () => sizeVal.textContent = sizeEl.value + 'px');
    document.getElementById('text-cancel').addEventListener('click', closeModal);
    document.getElementById('text-confirm').addEventListener('click', () => {
      const text = document.getElementById('text-input').value.trim();
      if (!text) return;
      const id = 'txt_' + Date.now().toString(36);
      const txt = { id, text, x, y, size: parseInt(sizeEl.value), color: '#1a1613',
                    fontFamily: 'Caveat', hidden: false, locked: false, name: '' };
      project.texts = project.texts || [];
      project.texts.push(txt);
      closeModal();
      renderTexts();
      renderLayersPanel();
      select('text', id);
      schedSave();
    });
    setTimeout(() => document.getElementById('text-input')?.focus(), 50);
  }

  function renderTexts() {
    if (!spriteLayer) return;
    // Preserve any element currently in contenteditable edit mode
    const activeEdit = spriteLayer.querySelector('.text-element[contenteditable="true"]');
    spriteLayer.querySelectorAll('.text-element').forEach(el => {
      if (el !== activeEdit) el.remove();
    });
    (project?.texts || []).forEach(txt => {
      // If this text is actively being edited, only update its class; don't recreate
      if (activeEdit && activeEdit.dataset.id === txt.id) {
        activeEdit.className = 'text-element' + (selected?.id === txt.id && selected?.kind === 'text' ? ' selected' : '');
        activeEdit.style.color = txt.color || '#1a1613';
        activeEdit.style.fontSize = (txt.size || 32) + 'px';
        activeEdit.style.fontFamily = txt.fontFamily || 'Caveat, cursive';
        return;
      }
      const el = document.createElement('div');
      el.className = 'text-element' + (selected?.id === txt.id && selected?.kind === 'text' ? ' selected' : '');
      el.dataset.id = txt.id;
      el.style.left   = txt.x + 'px';
      el.style.top    = txt.y + 'px';
      el.style.color  = txt.color || '#1a1613';
      el.style.fontSize = (txt.size || 32) + 'px';
      el.style.fontFamily = txt.fontFamily || 'Caveat, cursive';
      if (txt.hidden) el.style.display = 'none';
      el.textContent = txt.text;
      el.addEventListener('pointerdown', (e) => {
        if (el.contentEditable === 'true') return; // browser handles text cursor
        onTextPointerDown(e, txt);
      });
      if (txt.id === _textEditTarget) {
        _textEditTarget = null;
        const target = el;
        setTimeout(() => _enterTextEditMode(target, txt), 0);
      }
      spriteLayer.appendChild(el);
    });
  }

  function _enterTextEditMode(el, txt) {
    if (!el || !el.isConnected) return;
    el.style.outline = '2px solid var(--ui-blue, #3860a8)';
    el.style.outlineOffset = '3px';
    el.style.cursor = 'text';
    el.style.userSelect = 'text';
    el.contentEditable = 'true';
    el.focus();
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {}
    let cancelled = false;
    function commitEdit() {
      if (cancelled) return;
      el.contentEditable = 'false';
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.cursor = '';
      el.style.userSelect = '';
      const newText = el.innerText.replace(/\n/g, ' ').trim() || txt.text;
      if (newText !== txt.text) {
        txt.text = newText;
        schedSave();
        renderLayersPanel();
      }
      renderTexts();
    }
    function onKey(ke) {
      if (ke.key === 'Enter') { ke.preventDefault(); el.removeEventListener('keydown', onKey); el.blur(); }
      if (ke.key === 'Escape') {
        cancelled = true;
        el.removeEventListener('keydown', onKey);
        el.innerText = txt.text;
        el.contentEditable = 'false';
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.style.cursor = '';
        el.style.userSelect = '';
      }
    }
    el.addEventListener('blur', commitEdit, { once: true });
    el.addEventListener('keydown', onKey);
  }

  function onTextPointerDown(e, txt) {
    if (!document.body.classList.contains('edit-mode')) return;
    if (txt.locked) return;
    if (tool !== 'select') return;
    e.stopPropagation();
    const startPt = getScreenPoint(e);
    const startW  = window.Game.screenToWorld(startPt.x, startPt.y);
    const tx0 = txt.x, ty0 = txt.y;
    let moved = false;
    const onMove = (ev) => {
      const p = getScreenPoint(ev);
      if (Math.abs(p.x - startPt.x) + Math.abs(p.y - startPt.y) > 3) moved = true;
      if (!moved) return;
      const w = window.Game.screenToWorld(p.x, p.y);
      txt.x = tx0 + (w.x - startW.x);
      txt.y = ty0 + (w.y - startW.y);
      renderTexts();
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (!moved) {
        // Second click on an already-selected text → enter inline edit after re-render
        if (selected?.id === txt.id && selected?.kind === 'text') {
          _textEditTarget = txt.id;
        }
        select('text', txt.id);
      } else {
        schedSave();
      }
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  function renderTextEditor(txt) {
    if (!txt) return;
    const colors = ['#1a1613','#c43f2e','#ffffff','#5a7a3a','#e6a030','#3860a8'];
    const swatches = colors.map(c =>
      `<button class="color-swatch${txt.color === c ? ' active' : ''}" style="background:${c}" data-color="${c}"></button>`
    ).join('');
    const families = ['Caveat','Fraunces','Source Sans 3'];
    const familyOpts = families.map(f =>
      `<option value="${f}"${txt.fontFamily === f ? ' selected' : ''}>${f}</option>`
    ).join('');
    selectedContent.innerHTML = `
      <label style="display:block;margin-bottom:8px">Content
        <textarea id="txt-content" rows="2" style="width:100%;margin-top:4px;background:var(--ui-bg);color:var(--ui-text);border:1px solid var(--panel-border);border-radius:3px;padding:4px 6px;font-size:14px;resize:vertical">${escapeAttr(txt.text)}</textarea>
      </label>
      <label style="display:block;margin-bottom:8px;font-size:12px">Size
        <input type="range" id="txt-size" min="8" max="200" value="${txt.size || 32}" style="width:100%">
      </label>
      <div class="color-row" id="txt-colors" style="margin-bottom:10px">${swatches}</div>
      <label style="display:block;margin-bottom:8px;font-size:12px">Font
        <select id="txt-family" style="width:100%;margin-top:4px">${familyOpts}</select>
      </label>
      <button class="delete-btn" id="txt-delete">🗑 Delete text</button>
    `;
    document.getElementById('txt-content').addEventListener('input', (e) => {
      txt.text = e.target.value; renderTexts(); schedSave();
    });
    document.getElementById('txt-size').addEventListener('input', (e) => {
      txt.size = parseInt(e.target.value); renderTexts(); schedSave();
    });
    document.querySelectorAll('#txt-colors .color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        document.querySelectorAll('#txt-colors .color-swatch').forEach(x => x.classList.remove('active'));
        sw.classList.add('active');
        txt.color = sw.dataset.color;
        renderTexts(); schedSave();
      });
    });
    document.getElementById('txt-family').addEventListener('change', (e) => {
      txt.fontFamily = e.target.value; renderTexts(); schedSave();
    });
    document.getElementById('txt-delete').addEventListener('click', () => {
      if (!confirm('Delete this text?')) return;
      deleteSelected();
    });
  }

  function renderCharacterPanel() {
    const root = document.getElementById('characterPanelRoot');
    if (!root) return;

    const txt = (selected?.kind === 'text' && project)
      ? (project.texts || []).find(x => x.id === selected.id)
      : null;

    if (!txt) {
      root.innerHTML = `<div class="character-empty">Select a text object to edit its style.</div>`;
      return;
    }

    const fonts = ['Caveat', 'Fraunces', 'Source Sans 3'];
    const colors = ['#1a1613','#c43f2e','#ffffff','#5a7a3a','#e6a030','#3860a8'];
    const currentFamily = txt.fontFamily || 'Caveat';
    const familyKey = fonts.find(f => currentFamily.includes(f)) || 'Caveat';

    root.innerHTML = `
      <label class="character-row">
        <span>Font</span>
        <select id="char-family" class="character-select">
          ${fonts.map(f => `<option value="${f}"${f === familyKey ? ' selected' : ''}>${f}</option>`).join('')}
        </select>
      </label>
      <label class="character-row">
        <span>Size</span>
        <div class="character-size-row">
          <input type="range" id="char-size" min="8" max="200" value="${txt.size || 32}">
          <input type="number" id="char-size-num" min="8" max="200" value="${txt.size || 32}">
        </div>
      </label>
      <div class="character-row">
        <span>Color</span>
        <div class="character-color-row" id="char-colors">
          ${colors.map(c => `<button class="color-swatch${txt.color === c ? ' active' : ''}" style="background:${c}" data-color="${c}"></button>`).join('')}
          <input type="color" id="char-color-custom" value="${txt.color || '#1a1613'}" title="Custom color">
        </div>
      </div>
    `;

    const sizeRange = root.querySelector('#char-size');
    const sizeNum   = root.querySelector('#char-size-num');
    const setSize = (v) => {
      const n = Math.max(8, Math.min(200, parseInt(v) || 32));
      txt.size = n;
      sizeRange.value = n;
      sizeNum.value = n;
      renderTexts();
      schedSave();
    };
    sizeRange.addEventListener('input', e => setSize(e.target.value));
    sizeNum.addEventListener('input',   e => setSize(e.target.value));

    root.querySelector('#char-family').addEventListener('change', e => {
      txt.fontFamily = e.target.value;
      renderTexts();
      schedSave();
    });

    root.querySelectorAll('#char-colors .color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        root.querySelectorAll('#char-colors .color-swatch').forEach(x => x.classList.remove('active'));
        sw.classList.add('active');
        txt.color = sw.dataset.color;
        const custom = root.querySelector('#char-color-custom');
        if (custom) custom.value = sw.dataset.color;
        renderTexts();
        schedSave();
      });
    });

    root.querySelector('#char-color-custom').addEventListener('input', e => {
      txt.color = e.target.value;
      root.querySelectorAll('#char-colors .color-swatch').forEach(x => x.classList.remove('active'));
      renderTexts();
      schedSave();
    });
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
    document.body.classList.add('has-selection');
    window.Draw.setSelected(null);
    const bl = document.getElementById('baseLayer');
    if (bl) bl.classList.remove('base-selected');
    spriteLayer.querySelectorAll('.sprite').forEach(el => el.classList.remove('selected'));
    spriteLayer.querySelectorAll('.sprite-rotate-handle, .sprite-rotate-line').forEach(el => el.remove());
    hitsLayer.querySelectorAll('.hit').forEach(el => {
      el.classList.toggle('selected',
        el.dataset.id === id && el.dataset.kind === kind);
    });
    renderTexts(); // update selected highlight on text elements
    updateSelectedPanel();
  }

  function deselect() {
    selected = null;
    selectedSprite = null;
    selectedBase = false;
    selectedStroke = null;
    document.body.classList.remove('has-selection');
    window.Draw.setSelected(null);
    hitsLayer.querySelectorAll('.hit').forEach(el => el.classList.remove('selected'));
    spriteLayer.querySelectorAll('.sprite').forEach(el => el.classList.remove('selected'));
    spriteLayer.querySelectorAll('.sprite-rotate-handle, .sprite-rotate-line').forEach(el => el.remove());
    const bl = document.getElementById('baseLayer');
    if (bl) bl.classList.remove('base-selected');
    renderTexts(); // clear selected highlight on text elements
    updateSelectedPanel();
    renderLayersPanel();
  }

  function getSelected() {
    if (!selected || !project) return null;
    if (selected.kind === 'text') return (project.texts || []).find(x => x.id === selected.id) || null;
    const arr = selected.kind === 'item' ? project.items : project.surprises;
    return (arr || []).find(x => x.id === selected.id) || null;
  }

  function updateSelectedPanel() {
    const data = getSelected();
    if (!data) {
      selectedPanel.classList.add('hidden');
      renderCharacterPanel();
      return;
    }
    selectedPanel.classList.remove('hidden');
    if (selected.kind === 'text') {
      document.getElementById('selectedPanelTitle').textContent = 'Text';
      renderTextEditor(data);
      renderCharacterPanel();
      return;
    }
    document.getElementById('selectedPanelTitle').textContent = selected.kind === 'item' ? 'Item' : 'Surprise';
    renderSelectedEditor(data, selected.kind);
    renderCharacterPanel();
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

    // ── Easter Egg section ──────────────────────────
    const egg = data.easterEgg || {};
    const eggOn = !!egg.enabled;
    parts.push(`<details class="xf-details egg-details"${eggOn ? ' open' : ''}><summary>🥚 Easter egg</summary>`);
    parts.push(`<label class="egg-toggle-row"><input type="checkbox" id="egg-enabled"${eggOn ? ' checked' : ''}> Make this an easter egg</label>`);
    parts.push(`<div class="egg-fields" style="display:${eggOn ? 'block' : 'none'}">`);

    // Template picker
    const tplOpts = (window.EASTER_EGG_TEMPLATES || []).map(t =>
      `<option value="${t.templateId}">${t.name}</option>`
    ).join('');
    parts.push(`<label class="prop-label" style="margin-top:8px">Load template <select id="egg-template"><option value="">— pick —</option>${tplOpts}</select></label>`);

    // Audio
    const audioLabel = egg.audioName ? `✓ ${egg.audioName}` : 'No audio uploaded';
    parts.push(`<div class="egg-field-group"><div class="egg-field-label">Audio</div>`);
    parts.push(`<div class="egg-file-info" id="egg-audio-info">${_escAttr(audioLabel)}</div>`);
    parts.push(`<button class="ghost-btn" id="egg-upload-audio">⬆ Upload MP3/OGG/WAV</button>`);
    parts.push(`<label class="egg-toggle-row" style="margin-top:4px"><input type="checkbox" id="egg-loop"${egg.loop !== false ? ' checked' : ''}> Loop audio</label>`);
    parts.push(`</div>`);

    // Visual type
    const vt = egg.visualType || 'none';
    parts.push(`<div class="egg-field-group"><div class="egg-field-label">Visual effect</div>`);
    parts.push(`<select id="egg-visual-type">`);
    [['none','None (audio only)'],['floating','Floating image'],['fullscreen','Full-screen popup'],['shake','Shake effect']].forEach(([v,l]) => {
      parts.push(`<option value="${v}"${vt === v ? ' selected' : ''}>${l}</option>`);
    });
    parts.push(`</select></div>`);

    // Floating & fullscreen: image picker
    const showImg = vt === 'floating' || vt === 'fullscreen';
    const imgLabel = egg.visualContent?.imageName ? `✓ ${egg.visualContent.imageName}` : 'No image uploaded';
    parts.push(`<div class="egg-field-group egg-needs-image" style="display:${showImg ? 'block' : 'none'}">`);
    parts.push(`<div class="egg-field-label">Image (PNG, JPG, SVG, GIF, WebP)</div>`);
    parts.push(`<div class="egg-file-info" id="egg-img-info">${_escAttr(imgLabel)}</div>`);
    parts.push(`<button class="ghost-btn" id="egg-upload-image">⬆ Upload image</button>`);
    parts.push(`</div>`);

    // Floating: position
    const pos = egg.visualContent?.position || 'center';
    parts.push(`<div class="egg-field-group egg-needs-position" style="display:${vt === 'floating' ? 'block' : 'none'}">`);
    parts.push(`<label class="prop-label">Position <select id="egg-position">`);
    [['center','Center'],['bottom-right','Bottom right'],['random','Random']].forEach(([v,l]) => {
      parts.push(`<option value="${v}"${pos === v ? ' selected' : ''}>${l}</option>`);
    });
    parts.push(`</select></label></div>`);

    // Shake / fullscreen optional text
    const showText = vt === 'shake' || vt === 'fullscreen';
    parts.push(`<div class="egg-field-group egg-needs-text" style="display:${showText ? 'block' : 'none'}">`);
    parts.push(`<label class="prop-label" style="flex-direction:column;align-items:flex-start;gap:4px">Text<textarea id="egg-text" rows="2" style="width:100%;background:var(--panel-bg-2);color:var(--ui-text);border:1px solid var(--panel-border);border-radius:3px;padding:4px 6px;font-size:13px;resize:vertical">${_escAttr(egg.visualContent?.text || '')}</textarea></label>`);
    parts.push(`</div>`);

    // Dismissable
    parts.push(`<label class="egg-toggle-row"><input type="checkbox" id="egg-dismissable"${egg.dismissable !== false ? ' checked' : ''}> Dismissable (X / Esc / click outside)</label>`);

    parts.push(`</div></details>`); // close egg-fields, egg-details

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

    // ── Easter Egg wiring ───────────────────────────
    function getEgg() {
      if (!data.easterEgg) data.easterEgg = _defaultEgg();
      return data.easterEgg;
    }
    function saveEgg() { schedSave(); renderLayersPanel(); }

    document.getElementById('egg-enabled')?.addEventListener('change', (e) => {
      getEgg().enabled = e.target.checked;
      document.querySelector('.egg-fields').style.display = e.target.checked ? 'block' : 'none';
      saveEgg();
    });

    document.getElementById('egg-template')?.addEventListener('change', (e) => {
      const tpl = (window.EASTER_EGG_TEMPLATES || []).find(t => t.templateId === e.target.value);
      if (!tpl) return;
      const egg = getEgg();
      // Copy template fields but keep existing audio/image data
      Object.assign(egg, {
        name:         tpl.name,
        loop:         tpl.loop,
        visualType:   tpl.visualType,
        visualContent: Object.assign({}, tpl.visualContent, {
          image:     egg.visualContent?.image     || null,
          imageName: egg.visualContent?.imageName || '',
          text: tpl.visualContent?.text || egg.visualContent?.text || '',
        }),
        dismissable: tpl.dismissable,
      });
      e.target.value = '';
      saveEgg();
      updateSelectedPanel(); // re-render fields
    });

    document.getElementById('egg-upload-audio')?.addEventListener('click', () => {
      _uploadEggAudio(data);
    });

    document.getElementById('egg-loop')?.addEventListener('change', (e) => {
      getEgg().loop = e.target.checked;
      saveEgg();
    });

    document.getElementById('egg-upload-image')?.addEventListener('click', () => {
      _uploadEggImage(data);
    });

    document.getElementById('egg-visual-type')?.addEventListener('change', (e) => {
      getEgg().visualType = e.target.value;
      // Show/hide relevant sub-fields
      const vt = e.target.value;
      document.querySelector('.egg-needs-image').style.display  = (vt === 'floating' || vt === 'fullscreen') ? 'block' : 'none';
      document.querySelector('.egg-needs-position').style.display = vt === 'floating' ? 'block' : 'none';
      document.querySelector('.egg-needs-text').style.display   = (vt === 'shake' || vt === 'fullscreen') ? 'block' : 'none';
      saveEgg();
    });

    document.getElementById('egg-position')?.addEventListener('change', (e) => {
      getEgg().visualContent = getEgg().visualContent || {};
      getEgg().visualContent.position = e.target.value;
      saveEgg();
    });

    document.getElementById('egg-text')?.addEventListener('input', (e) => {
      getEgg().visualContent = getEgg().visualContent || {};
      getEgg().visualContent.text = e.target.value;
      saveEgg();
    });

    document.getElementById('egg-dismissable')?.addEventListener('change', (e) => {
      getEgg().dismissable = e.target.checked;
      saveEgg();
    });
  }

  function _defaultEgg() {
    return {
      enabled:      false,
      audio:        null,
      audioName:    '',
      loop:         true,
      visualType:   'none',
      visualContent: { image: null, imageName: '', text: '', position: 'center' },
      dismissable:  true,
    };
  }

  function _uploadEggAudio(data) {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = 'audio/*';
    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (!data.easterEgg) data.easterEgg = _defaultEgg();
        data.easterEgg.audio     = ev.target.result;
        data.easterEgg.audioName = file.name;
        schedSave();
        updateSelectedPanel();
      };
      reader.readAsDataURL(file);
    });
    input.click();
  }

  function _uploadEggImage(data) {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (!data.easterEgg) data.easterEgg = _defaultEgg();
        if (!data.easterEgg.visualContent) data.easterEgg.visualContent = {};
        data.easterEgg.visualContent.image     = ev.target.result;
        data.easterEgg.visualContent.imageName = file.name;
        schedSave();
        updateSelectedPanel();
      };
      reader.readAsDataURL(file);
    });
    input.click();
  }

  // Escape helper used in egg HTML building
  function _escAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function deleteSelected() {
    // Handle text deletion
    if (selected?.kind === 'text') {
      project.texts = (project.texts || []).filter(t => t.id !== selected.id);
      deselect();
      renderTexts();
      renderLayersPanel();
      schedSave();
      return;
    }
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
    if (selected?.kind === 'text') {
      const txt = (project.texts || []).find(t => t.id === selected.id);
      if (!txt) return;
      const copy = JSON.parse(JSON.stringify(txt));
      copy.id = 'txt_' + Date.now().toString(36);
      copy.x += 20; copy.y += 20;
      project.texts.push(copy);
      renderTexts();
      select('text', copy.id);
      schedSave();
      return;
    }
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
    if (selected?.kind === 'text') {
      const txt = (project.texts || []).find(t => t.id === selected.id);
      if (txt) { txt.x += dx; txt.y += dy; renderTexts(); schedSave(); }
      return;
    }
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
    document.body.classList.add('has-selection');
    window.Draw.setSelected(null);
    hitsLayer.querySelectorAll('.hit').forEach(el => el.classList.remove('selected'));
    spriteLayer.querySelectorAll('.sprite').forEach(el => el.classList.remove('selected'));
    spriteLayer.querySelectorAll('.sprite-rotate-handle, .sprite-rotate-line').forEach(el => el.remove());
    const bl = document.getElementById('baseLayer');
    if (bl) bl.classList.add('base-selected');

    selectedPanel.classList.remove('hidden');
    document.getElementById('selectedPanelTitle').textContent = 'Base Layer';
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
    renderCharacterPanel();
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
    document.body.classList.add('has-selection');
    hitsLayer.querySelectorAll('.hit').forEach(el => el.classList.remove('selected'));
    spriteLayer.querySelectorAll('.sprite').forEach(el => el.classList.remove('selected'));
    spriteLayer.querySelectorAll('.sprite-rotate-handle, .sprite-rotate-line').forEach(el => el.remove());
    const bl = document.getElementById('baseLayer');
    if (bl) bl.classList.remove('base-selected');
    window.Draw.setSelected(id);
    renderStrokeEditor();
    renderLayersPanel();
    renderCharacterPanel();
  }

  function renderStrokeEditor() {
    const stroke = window.Draw.getStroke(selectedStroke);
    if (!stroke) { selectedPanel.classList.add('hidden'); return; }
    selectedPanel.classList.remove('hidden');
    document.getElementById('selectedPanelTitle').textContent = 'Stroke';

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

    const sprites   = project.sprites   || [];
    const strokes   = window.Draw.getStrokes();
    const items     = project.items     || [];
    const surprises = project.surprises || [];
    const texts     = project.texts     || [];
    const groups    = project.groups    || [];

    // Flat list of all layers in display order (top = frontmost)
    const allLayers = [];
    for (let i = items.length - 1;     i >= 0; i--) allLayers.push({ type:'item',     obj:items[i],     arrIdx:i });
    for (let i = surprises.length - 1; i >= 0; i--) allLayers.push({ type:'surprise', obj:surprises[i], arrIdx:i });
    for (let i = texts.length - 1;     i >= 0; i--) allLayers.push({ type:'text',     obj:texts[i],     arrIdx:i });
    for (let i = sprites.length - 1;   i >= 0; i--) allLayers.push({ type:'sprite',   obj:sprites[i],   arrIdx:i });
    for (let i = strokes.length - 1;   i >= 0; i--) allLayers.push({ type:'stroke',   obj:strokes[i],   arrIdx:i });

    function getMembersOf(group) {
      return group.memberIds.map(k => {
        const sep = k.indexOf(':'); const t = k.slice(0,sep), id = k.slice(sep+1);
        return allLayers.find(l => l.type === t && l.obj.id === id);
      }).filter(Boolean);
    }

    const groupedKeys = new Set();
    groups.forEach(g => g.memberIds.forEach(k => groupedKeys.add(k)));

    // Per-kind chronological index for stroke naming (Star 1, Star 2, ...)
    const STROKE_LABEL = { pen: 'Stroke', rect: 'Rectangle', ellipse: 'Ellipse', star: 'Star' };
    const strokeKindIdx = new Map();
    {
      const counts = {};
      strokes.forEach(s => {
        const k = s.kind || 'pen';
        counts[k] = (counts[k] || 0) + 1;
        strokeKindIdx.set(s.id, counts[k]);
      });
    }

    // ── helpers ──────────────────────────────────────────────
    function isActive(type, id) {
      if (type === 'item')     return selected?.id === id && selected?.kind === 'item';
      if (type === 'surprise') return selected?.id === id && selected?.kind === 'surprise';
      if (type === 'sprite')   return selectedSprite === id;
      if (type === 'stroke')   return selectedStroke === id;
      if (type === 'text')     return selected?.id === id && selected?.kind === 'text';
      return false;
    }

    function visBtns(obj, type) {
      const eyeClass  = obj.hidden ? 'layer-vis is-hidden' : 'layer-vis';
      const lockClass = obj.locked ? 'layer-lock is-locked' : 'layer-lock';
      const lockIcon  = obj.locked ? '🔒' : '🔓';
      return `<button class="${eyeClass}" data-vis-type="${type}" data-vis-id="${obj.id}" title="Show/hide">👁</button>` +
             `<button class="${lockClass}" data-lock-type="${type}" data-lock-id="${obj.id}" title="Lock/unlock">${lockIcon}</button>`;
    }

    function buildRow(type, obj, arrIdx, isMember) {
      const active = isActive(type, obj.id);
      const memberCls = isMember ? ' layer-member' : '';
      const hasHandle = type === 'sprite' || type === 'stroke' || type === 'text' || type === 'item' || type === 'surprise';
      let iconHtml = '', nameHtml = '';
      if (type === 'item') {
        iconHtml = `<span class="layer-icon">⊙</span>`;
        nameHtml = escapeHtmlInner(obj.name);
        if (obj.easterEgg?.enabled) nameHtml += ' <span title="Easter egg" style="font-size:11px">🥚</span>';
      } else if (type === 'surprise') {
        iconHtml = `<span class="layer-icon">✨</span>`;
        nameHtml = escapeHtmlInner(obj.name);
        if (obj.easterEgg?.enabled) nameHtml += ' <span title="Easter egg" style="font-size:11px">🥚</span>';
      } else if (type === 'sprite') {
        iconHtml = `<span class="layer-icon">🖼</span>`;
        nameHtml = obj.name ? escapeHtmlInner(obj.name) : `Sprite ${arrIdx + 1}`;
      } else if (type === 'stroke') {
        iconHtml = `<span class="layer-icon" style="display:inline-block;width:10px;height:10px;background:${obj.color};border-radius:50%;flex-shrink:0"></span>`;
        const kind = obj.kind || 'pen';
        const label = STROKE_LABEL[kind] || 'Stroke';
        nameHtml = escapeHtmlInner(obj.name || `${label} ${strokeKindIdx.get(obj.id) || (arrIdx + 1)}`);
      } else if (type === 'text') {
        iconHtml = `<span class="layer-icon" style="font-family:'Caveat',cursive;font-size:13px;font-weight:700;color:${obj.color}">A</span>`;
        const textLabel = obj.name || obj.text;
        nameHtml = escapeHtmlInner(textLabel.length > 20 ? textLabel.slice(0,20)+'…' : textLabel);
      }
      const handleHtml = hasHandle ? `<span class="layer-drag-handle" title="Drag to reorder">⠿</span>` : '';
      const renamable = type !== 'base';
      const renameTip = type === 'text' ? 'double-click to edit text' : 'double-click to rename';
      const nameTitle = renamable
        ? `${escapeAttr(obj.name||obj.text||'')} — ${renameTip}`
        : escapeAttr(obj.name||obj.text||'');
      return `<li class="layer-row${active?' active':''}${obj.hidden?' layer-hidden':''}${memberCls}" data-layer-type="${type}" data-layer-id="${obj.id}" data-arr-idx="${arrIdx}">
        ${visBtns(obj, type)}${handleHtml}${iconHtml}
        <span class="layer-name" title="${nameTitle}">${nameHtml}</span>
        <span class="layer-actions"><button class="layer-del" data-del-type="${type}" data-del-id="${obj.id}" title="Delete">×</button></span>
      </li>`;
    }

    const rows = [];

    // ── Folder rows ───────────────────────────────────────────
    groups.forEach(group => {
      const members = getMembersOf(group);
      const allHidden = members.length > 0 && members.every(l => l.obj.hidden);
      const allLocked = members.length > 0 && members.every(l => l.obj.locked);
      rows.push(`<li class="layer-row layer-folder-row" data-layer-type="group" data-layer-id="${group.id}">
        <button class="${allHidden?'layer-vis is-hidden':'layer-vis'}" data-folder-vis="${group.id}" title="Show/hide all">👁</button>
        <button class="${allLocked?'layer-lock is-locked':'layer-lock'}" data-folder-lock="${group.id}" title="Lock/unlock all">${allLocked?'🔒':'🔓'}</button>
        <button class="folder-toggle" data-group-id="${group.id}">${group.collapsed?'▶':'▼'}</button>
        <span class="layer-icon">📁</span>
        <span class="layer-name layer-folder-name">${escapeHtmlInner(group.name)}</span>
        <span class="layer-actions"><button class="layer-del" data-del-type="group" data-del-id="${group.id}" title="Remove folder (keeps layers)">×</button></span>
      </li>`);
      if (!group.collapsed) {
        if (members.length === 0) {
          rows.push(`<li class="layer-folder-empty">— empty —</li>`);
        } else {
          members.forEach(l => rows.push(buildRow(l.type, l.obj, l.arrIdx, true)));
        }
      }
    });

    // ── Ungrouped layers (collapsible render-layer section headers) ──
    const SECTION_DEF = {
      item:     { label: 'Hit Zones',      id: 'hit-zones'    },
      surprise: { label: 'Hit Zones',      id: 'hit-zones'    },
      text:     { label: 'Sprites & Text', id: 'sprites-text' },
      sprite:   { label: 'Sprites & Text', id: 'sprites-text' },
      stroke:   { label: 'Strokes',        id: 'strokes'      },
    };
    let lastCatId = null;
    allLayers.forEach(({ type, obj, arrIdx }) => {
      if (groupedKeys.has(type + ':' + obj.id)) return;
      const sec = SECTION_DEF[type];
      if (!sec) { rows.push(buildRow(type, obj, arrIdx, false)); return; }
      if (sec.id !== lastCatId) {
        const collapsed = !!_catCollapsed[sec.id];
        rows.push(`<li class="layer-type-header${collapsed ? ' cat-collapsed' : ''}" data-cat-id="${sec.id}"><button class="cat-toggle">${collapsed ? '▶' : '▼'}</button>${sec.label}</li>`);
        lastCatId = sec.id;
      }
      if (!_catCollapsed[sec.id]) rows.push(buildRow(type, obj, arrIdx, false));
    });

    // ── Base layer (always at bottom, ungroupable) ────────────
    if (project.baseType) {
      const label = project.baseType === 'svg' ? 'Planet SVG' : 'Base image';
      rows.push(`<li class="layer-row${selectedBase?' active':''} layer-base" data-layer-type="base">
        <span class="layer-vis" style="opacity:.3;cursor:default">👁</span>
        <span class="layer-lock" style="opacity:.3;cursor:default">🔒</span>
        <span class="layer-icon">🌐</span>
        <span class="layer-name">${label}</span>
      </li>`);
    }

    listEl.innerHTML = rows.length ? rows.join('') : `<li class="layer-empty">nothing yet</li>`;

    // ── Event wiring ──────────────────────────────────────────

    // Folder collapse/expand
    listEl.querySelectorAll('.folder-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const g = (project.groups||[]).find(x => x.id === btn.dataset.groupId);
        if (g) { g.collapsed = !g.collapsed; schedSave(); renderLayersPanel(); }
      });
    });

    // Category header collapse/expand
    listEl.querySelectorAll('.layer-type-header[data-cat-id]').forEach(hdr => {
      hdr.addEventListener('click', () => {
        const catId = hdr.dataset.catId;
        _catCollapsed[catId] = !_catCollapsed[catId];
        try { localStorage.setItem('hs-cat-collapsed', JSON.stringify(_catCollapsed)); } catch {}
        renderLayersPanel();
      });
    });

    // Folder: show/hide all members
    listEl.querySelectorAll('[data-folder-vis]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const g = (project.groups||[]).find(x => x.id === btn.dataset.folderVis);
        if (!g) return;
        const members = getMembersOf(g);
        const allHid = members.length > 0 && members.every(l => l.obj.hidden);
        members.forEach(l => { l.obj.hidden = !allHid; _applyVisibility(l.type, l.obj.id, l.obj.hidden); });
        renderLayersPanel(); schedSave();
      });
    });

    // Folder: lock/unlock all members
    listEl.querySelectorAll('[data-folder-lock]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const g = (project.groups||[]).find(x => x.id === btn.dataset.folderLock);
        if (!g) return;
        const members = getMembersOf(g);
        const allLkd = members.length > 0 && members.every(l => l.obj.locked);
        members.forEach(l => { l.obj.locked = !allLkd; });
        renderLayersPanel(); schedSave();
      });
    });

    // Inline rename via dblclick — delegated on listEl, wired once.
    // Pointer capture during single-click drag/select can redirect mouse
    // events to the row, so e.target may be the <li>, not the .layer-name
    // child. Find the row first, then query the name span from within it.
    if (!listEl._dblclickWired) {
      listEl._dblclickWired = true;
      listEl.addEventListener('dblclick', (e) => {
        if (e.target.closest('.layer-del, .layer-vis, .layer-lock, .layer-drag-handle')) return;
        const row = e.target.closest('[data-layer-type]');
        if (!row) return;
        e.stopPropagation();
        if (row.classList.contains('layer-folder-row')) {
          const folderNameEl = row.querySelector('.layer-folder-name');
          if (folderNameEl) _inlineRenameGroup(folderNameEl, row.dataset.layerId);
          return;
        }
        const nameEl = row.querySelector('.layer-name');
        if (nameEl) _inlineRenameLayer(nameEl, row.dataset.layerType, row.dataset.layerId);
      });
    }

    // Layer rows: pointer (drag/select)
    listEl.querySelectorAll('.layer-row:not(.layer-folder-row)').forEach(row => {
      row.addEventListener('pointerdown', (e) => {
        if (e.target.classList.contains('layer-del') ||
            e.target.classList.contains('layer-vis') ||
            e.target.classList.contains('layer-lock')) return;
        _startLayerDragOrClick(e, row);
      });
    });

    // Individual layer vis toggles
    listEl.querySelectorAll('.layer-vis[data-vis-type]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const obj = _findObject(btn.dataset.visType, btn.dataset.visId);
        if (!obj) return;
        obj.hidden = !obj.hidden;
        _applyVisibility(btn.dataset.visType, btn.dataset.visId, obj.hidden);
        renderLayersPanel(); schedSave();
      });
    });

    // Individual layer lock toggles
    listEl.querySelectorAll('.layer-lock[data-lock-type]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const obj = _findObject(btn.dataset.lockType, btn.dataset.lockId);
        if (!obj) return;
        obj.locked = !obj.locked;
        renderLayersPanel(); schedSave();
      });
    });

    // Delete buttons
    listEl.querySelectorAll('.layer-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.dataset.delType, id = btn.dataset.delId;
        if (type === 'group') {
          project.groups = (project.groups||[]).filter(g => g.id !== id);
          schedSave(); renderLayersPanel(); return;
        }
        if (type === 'sprite') {
          if (!confirm('Delete this sprite?')) return;
          project.sprites = (project.sprites||[]).filter(s => s.id !== id);
          _removeFromAnyGroup('sprite', id);
          if (selectedSprite === id) { selectedSprite = null; selectedPanel.classList.add('hidden'); }
          renderSprites(); renderLayersPanel(); schedSave();
        } else if (type === 'stroke') {
          window.Draw.deleteStroke(id);
          project.drawings = window.Draw.getStrokes();
          _removeFromAnyGroup('stroke', id);
          if (selectedStroke === id) { selectedStroke = null; selectedPanel.classList.add('hidden'); }
          renderLayersPanel(); schedSave();
        } else if (type === 'text') {
          project.texts = (project.texts||[]).filter(t => t.id !== id);
          _removeFromAnyGroup('text', id);
          if (selected?.id === id && selected?.kind === 'text') deselect();
          renderTexts(); renderLayersPanel(); schedSave();
        } else if (type === 'item' || type === 'surprise') {
          const arr = type === 'item' ? project.items : project.surprises;
          const idx = arr.findIndex(x => x.id === id);
          if (idx >= 0) arr.splice(idx, 1);
          _removeFromAnyGroup(type, id);
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
    if (type === 'text')     return (project.texts     || []).find(x => x.id === id) || null;
    return null;
  }

  // Apply hidden state immediately to the live DOM without full re-render
  function _applyVisibility(type, id, hidden) {
    if (type === 'sprite') {
      const el = document.querySelector(`.sprite[data-id="${id}"]`);
      if (el) el.style.display = hidden ? 'none' : '';
    } else if (type === 'item' || type === 'surprise') {
      const el = document.querySelector(`.hit[data-id="${id}"]`);
      if (el) el.style.display = hidden ? 'none' : '';
    } else if (type === 'stroke') {
      const g = document.querySelector(`[data-stroke-id="${id}"]`);
      if (g) g.style.display = hidden ? 'none' : '';
    } else if (type === 'text') {
      const el = document.querySelector(`.text-element[data-id="${id}"]`);
      if (el) el.style.display = hidden ? 'none' : '';
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

    row.setPointerCapture(e.pointerId);

    const startX = e.clientX, startY = e.clientY;
    let dragging = false;
    let ghost = null;
    let currentTarget = null;
    let targetIsFolder = false;

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

      document.querySelectorAll('.layer-row').forEach(r => r.classList.remove('drag-over'));
      currentTarget = null;
      targetIsFolder = false;

      // Folder rows take priority — any layer type can drop into any folder
      document.querySelectorAll('#layersList .layer-folder-row').forEach(r => {
        const rect = r.getBoundingClientRect();
        if (ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
          r.classList.add('drag-over');
          currentTarget = r;
          targetIsFolder = true;
        }
      });

      // If not over a folder, allow same-type reorder — snap to nearest row center
      if (!targetIsFolder) {
        let bestRow = null, bestDist = Infinity;
        document.querySelectorAll('#layersList .layer-row').forEach(r => {
          if (r === row || r.classList.contains('layer-folder-row')) return;
          if (r.dataset.layerType !== type) return;
          const rect = r.getBoundingClientRect();
          const dist = Math.abs(ev.clientY - (rect.top + rect.bottom) / 2);
          if (dist < bestDist) { bestDist = dist; bestRow = r; }
        });
        if (bestRow && bestDist < 80) { bestRow.classList.add('drag-over'); currentTarget = bestRow; }
      }
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

      if (targetIsFolder) {
        _addToGroup(currentTarget.dataset.layerId, type, id);
        return;
      }

      const RENDER_CAT = { item: 'hit-zones', surprise: 'hit-zones', text: 'sprites-text', sprite: 'sprites-text', stroke: 'strokes' };
      if (RENDER_CAT[type] !== RENDER_CAT[currentTarget.dataset.layerType]) return;
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
      } else if (type === 'text') {
        const arr = project.texts;
        arr.splice(toIdx, 0, arr.splice(fromIdx, 1)[0]);
        renderTexts(); renderLayersPanel(); schedSave();
      } else if (type === 'item') {
        const arr = project.items;
        arr.splice(toIdx, 0, arr.splice(fromIdx, 1)[0]);
        window.Game.renderHits(); renderLayersPanel(); schedSave();
      } else if (type === 'surprise') {
        const arr = project.surprises;
        arr.splice(toIdx, 0, arr.splice(fromIdx, 1)[0]);
        window.Game.renderHits(); renderLayersPanel(); schedSave();
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
    else if (type === 'text')     select('text',     id);
  }

  function _inlineRenameLayer(nameSpan, type, id) {
    const obj = _findObject(type, id);
    if (!obj || type === 'base') return;
    // For strokes the displayed name is auto-generated; pre-fill the input
    // with the auto label so the user can edit it instead of starting blank.
    let current = obj.name || obj.text || '';
    if (!current && type === 'stroke') {
      const STROKE_LABEL = { pen: 'Stroke', rect: 'Rectangle', ellipse: 'Ellipse', star: 'Star' };
      const strokes = window.Draw.getStrokes();
      const counts = {};
      let mine = 1;
      for (const s of strokes) {
        const k = s.kind || 'pen';
        counts[k] = (counts[k] || 0) + 1;
        if (s.id === id) { mine = counts[k]; break; }
      }
      current = `${STROKE_LABEL[obj.kind || 'pen'] || 'Stroke'} ${mine}`;
    }
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.className = 'layer-rename-input';
    nameSpan.replaceWith(input);
    input.focus();
    input.select();
    const commit = () => {
      const val = input.value.trim();
      // Text layers: allow empty label (shows text content auto-label); others: keep current if blank
      obj.name = type === 'text' ? val : (val || current);
      if (type === 'stroke') project.drawings = window.Draw.getStrokes();
      schedSave();
      if (type === 'item' || type === 'surprise') {
        window.Game.renderList();
      }
      renderLayersPanel();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = current; input.blur(); }
    });
  }

  /* ————————————————————————————————————————
     LAYER GROUP HELPERS
  ———————————————————————————————————————— */
  function _createGroup() {
    project.groups = project.groups || [];
    const id = 'grp_' + Date.now().toString(36);
    project.groups.push({ id, name: 'New folder', collapsed: false, memberIds: [] });
    schedSave();
    renderLayersPanel();
  }

  function _addToGroup(groupId, type, id) {
    const key = type + ':' + id;
    // Remove from any existing group first
    (project.groups || []).forEach(g => {
      const idx = g.memberIds.indexOf(key);
      if (idx >= 0) g.memberIds.splice(idx, 1);
    });
    const group = (project.groups || []).find(g => g.id === groupId);
    if (group) group.memberIds.push(key);
    schedSave();
    renderLayersPanel();
  }

  function _removeFromAnyGroup(type, id) {
    const key = type + ':' + id;
    (project.groups || []).forEach(g => {
      const idx = g.memberIds.indexOf(key);
      if (idx >= 0) g.memberIds.splice(idx, 1);
    });
  }

  function _inlineRenameGroup(nameEl, groupId) {
    const g = (project.groups || []).find(x => x.id === groupId);
    if (!g) return;
    const current = g.name;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.className = 'layer-rename-input';
    nameEl.replaceWith(input);
    input.focus(); input.select();
    const commit = () => {
      g.name = input.value.trim() || current;
      schedSave();
      renderLayersPanel();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
      if (ev.key === 'Escape') { input.value = current; input.blur(); }
    });
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
     DOCUMENT SIZE
  ———————————————————————————————————————— */
  function applyDocSize() {
    if (!project || !world) return;
    const w = project.docWidth  || 1600;
    const h = project.docHeight || 1600;
    world.style.width  = w + 'px';
    world.style.height = h + 'px';
    document.getElementById('drawingLayer')?.setAttribute('viewBox', `0 0 ${w} ${h}`);
    document.getElementById('drawingCursor')?.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }

  function openDocSizeModal() {
    if (!project) return;
    const w   = project.docWidth  || 1600;
    const h   = project.docHeight || 1600;
    const dpi = project.docDpi    || 150;

    const input = (id, val, min, max, step='1') =>
      `<input type="number" id="${id}" value="${val}" min="${min}" max="${max}" step="${step}"
       style="width:100%;margin-top:4px;background:var(--ui-bg);color:var(--ui-text);border:1px solid var(--panel-border);border-radius:3px;padding:4px 6px;font-size:14px">`;

    openModal('Document Size', `
      <div style="margin-bottom:12px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--ui-text-dim);margin-bottom:6px">Units</div>
        <div style="display:flex;gap:6px">
          <button class="doc-unit-btn ghost-btn active" data-unit="px" style="flex:1">Pixels</button>
          <button class="doc-unit-btn ghost-btn" data-unit="in" style="flex:1">Inches</button>
        </div>
      </div>

      <div id="doc-px-inputs">
        <label style="display:block;margin-bottom:8px;font-size:12px">Width (px)
          ${input('doc-px-w', w, 100, 8000)}
        </label>
        <label style="display:block;margin-bottom:14px;font-size:12px">Height (px)
          ${input('doc-px-h', h, 100, 8000)}
        </label>
      </div>

      <div id="doc-in-inputs" style="display:none">
        <label style="display:block;margin-bottom:8px;font-size:12px">Width (inches)
          ${input('doc-in-w', (w/dpi).toFixed(2), 0.5, 50, 0.25)}
        </label>
        <label style="display:block;margin-bottom:8px;font-size:12px">Height (inches)
          ${input('doc-in-h', (h/dpi).toFixed(2), 0.5, 50, 0.25)}
        </label>
        <label style="display:block;margin-bottom:6px;font-size:12px">DPI
          ${input('doc-dpi', dpi, 72, 600)}
        </label>
        <div id="doc-px-equiv" style="font-size:11px;color:var(--ui-text-dim);margin-bottom:10px">${w} × ${h} px</div>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--ui-text-dim);margin-bottom:6px">Presets</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
          <button class="ghost-btn doc-preset" data-w="1600" data-h="1600"   style="font-size:11px;padding:4px">1600 × 1600</button>
          <button class="ghost-btn doc-preset" data-w="2048" data-h="2048"   style="font-size:11px;padding:4px">2048 × 2048</button>
          <button class="ghost-btn doc-preset" data-w="1275" data-h="1650"   style="font-size:11px;padding:4px">Letter 8.5" · 150dpi</button>
          <button class="ghost-btn doc-preset" data-w="1240" data-h="1754"   style="font-size:11px;padding:4px">A4 · 150dpi</button>
          <button class="ghost-btn doc-preset" data-w="1920" data-h="1080"   style="font-size:11px;padding:4px">1920 × 1080</button>
          <button class="ghost-btn doc-preset" data-w="2480" data-h="3508"   style="font-size:11px;padding:4px">A4 · 300dpi</button>
        </div>
      </div>

      <div style="display:flex;gap:8px">
        <button class="ghost-btn" id="doc-apply" style="flex:1">Apply</button>
        <button class="ghost-btn danger" id="doc-cancel" style="flex:1">Cancel</button>
      </div>
    `);

    let curUnit = 'px';

    function updateEquiv() {
      const inW = parseFloat(document.getElementById('doc-in-w')?.value) || 0;
      const inH = parseFloat(document.getElementById('doc-in-h')?.value) || 0;
      const d   = parseInt(document.getElementById('doc-dpi')?.value)    || 150;
      const el  = document.getElementById('doc-px-equiv');
      if (el) el.textContent = `${Math.round(inW * d)} × ${Math.round(inH * d)} px`;
    }

    function switchUnit(unit) {
      curUnit = unit;
      document.querySelectorAll('.doc-unit-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.unit === unit));
      document.getElementById('doc-px-inputs').style.display = unit === 'px' ? '' : 'none';
      document.getElementById('doc-in-inputs').style.display = unit === 'in' ? '' : 'none';
      if (unit === 'in') updateEquiv();
    }

    document.querySelectorAll('.doc-unit-btn').forEach(btn =>
      btn.addEventListener('click', () => switchUnit(btn.dataset.unit)));

    ['doc-in-w', 'doc-in-h', 'doc-dpi'].forEach(id =>
      document.getElementById(id)?.addEventListener('input', updateEquiv));

    document.querySelectorAll('.doc-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.doc-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const pw = parseInt(btn.dataset.w), ph = parseInt(btn.dataset.h);
        if (curUnit === 'px') {
          document.getElementById('doc-px-w').value = pw;
          document.getElementById('doc-px-h').value = ph;
        } else {
          const d = parseInt(document.getElementById('doc-dpi')?.value) || 150;
          document.getElementById('doc-in-w').value = (pw / d).toFixed(2);
          document.getElementById('doc-in-h').value = (ph / d).toFixed(2);
          updateEquiv();
        }
      });
    });

    document.getElementById('doc-cancel').addEventListener('click', closeModal);
    document.getElementById('doc-apply').addEventListener('click', () => {
      let newW, newH;
      if (curUnit === 'px') {
        newW = parseInt(document.getElementById('doc-px-w').value);
        newH = parseInt(document.getElementById('doc-px-h').value);
      } else {
        const inW = parseFloat(document.getElementById('doc-in-w').value);
        const inH = parseFloat(document.getElementById('doc-in-h').value);
        const d   = parseInt(document.getElementById('doc-dpi').value) || 150;
        project.docDpi = d;
        newW = Math.round(inW * d);
        newH = Math.round(inH * d);
      }
      if (!newW || !newH || newW < 100 || newH < 100) return;
      project.docWidth  = newW;
      project.docHeight = newH;
      applyDocSize();
      window.Game.centerOnPlanet();
      closeModal();
      schedSave();
    });
  }

  /* ————————————————————————————————————————
     BASE LAYER SWAP + TRANSFORM
  ———————————————————————————————————————— */
  function setBasePlanet() {
    project.baseType = 'svg';
    project.baseContent = 'PLANET_SVG';
    delete project.baseImgW; delete project.baseImgH;
    renderBaseLayer();
    schedSave();
    const el = document.getElementById('baseImageInfo');
    if (el) el.style.display = 'none';
  }
  function setBaseScan() {
    project.baseType = 'image';
    project.baseContent = 'SCENE_JPG';
    delete project.baseImgW; delete project.baseImgH;
    renderBaseLayer();
    schedSave();
    const el = document.getElementById('baseImageInfo');
    if (el) el.style.display = 'none';
  }
  function _fmtBytes(b) {
    if (b >= 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
    if (b >= 1024) return Math.round(b / 1024) + ' KB';
    return b + ' B';
  }

  function _showBaseImageInfo(origBytes, finalBytes) {
    const el = document.getElementById('baseImageInfo');
    if (!el) return;
    const TARGET = 500 * 1024;
    const compressed = finalBytes !== origBytes;
    const stillLarge = finalBytes > TARGET;
    const color = stillLarge ? '#e8931a' : 'var(--ui-text-dim)';
    el.style.display = 'block';
    if (compressed) {
      el.innerHTML = `<span style="color:var(--ui-blue)">↓ Compressed</span>: ${_fmtBytes(origBytes)} → <span style="color:${color}">${_fmtBytes(finalBytes)}</span>${stillLarge ? ' — <em>still large, try a smaller source</em>' : ' ✓'}`;
    } else {
      el.innerHTML = `<span style="color:${color}">${_fmtBytes(finalBytes)}</span>${stillLarge ? ' — <em>large image, will use significant storage</em>' : ''}`;
    }
  }

  function _applyBaseImage(dataUrl, origBytes) {
    project.baseType = 'image';
    project.baseContent = dataUrl;
    delete project.baseImgW; delete project.baseImgH;
    renderBaseLayer();
    schedSave();
    const storedBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
    _showBaseImageInfo(origBytes, storedBytes);
  }

  function onBaseUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const origBytes = file.size;

    // SVGs: pass through as-is (canvas can't meaningfully re-encode them)
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (ev) => _applyBaseImage(ev.target.result, origBytes);
      reader.readAsDataURL(file);
      return;
    }

    // Raster images: resize to max 1600px then JPEG-encode, reducing quality
    // until stored size < 500 KB or quality floor (0.30) is reached.
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1600, TARGET = 500 * 1024;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > MAX_DIM || h > MAX_DIM) {
          const s = MAX_DIM / Math.max(w, h);
          w = Math.round(w * s); h = Math.round(h * s);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);

        let quality = 0.85;
        const tryEncode = () => {
          const result = canvas.toDataURL('image/jpeg', quality);
          const bytes = Math.round((result.length - result.indexOf(',') - 1) * 0.75);
          if (bytes <= TARGET || quality <= 0.30) {
            _applyBaseImage(result, origBytes);
          } else {
            quality = Math.round((quality - 0.10) * 100) / 100;
            tryEncode();
          }
        };
        tryEncode();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderBaseLayer() {
    const el = document.getElementById('baseLayer');
    if (!el || !project) return;
    el.innerHTML = '';
    if (project.baseType === 'svg' && project.baseContent === 'PLANET_SVG') {
      // Trusted bundled content — safe to inject as markup so it can be styled
      el.innerHTML = window.PLANET_SVG;
    } else if (project.baseType === 'image' && project.baseContent) {
      // 'SCENE_JPG' and legacy 'assets/scene.jpg' both resolve to the bundled data URL.
      const isSceneRef = project.baseContent === 'SCENE_JPG' || project.baseContent === 'assets/scene.jpg';
      // baseContent comes from project data which can be tampered via JSON import.
      // Build the <img> imperatively and validate the URL protocol so a poisoned
      // entry like `" onerror="..."` can't break out of an attribute.
      const safe = isSceneRef
        ? (window.SCENE_JPG || '')
        : (/^(data:image\/|https?:\/\/|blob:)/i.test(project.baseContent) ? project.baseContent : '');
      const img = document.createElement('img');
      img.src = safe;
      img.alt = '';
      img.draggable = false;
      el.appendChild(img);
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
    // If the image was frozen at explicit pixel dims (after a crop), apply them
    // so it doesn't resize when the canvas (world) changes size.
    if (inner.tagName === 'IMG' && project.baseImgW) {
      inner.style.width  = project.baseImgW + 'px';
      inner.style.height = project.baseImgH + 'px';
    } else {
      inner.style.width  = '';
      inner.style.height = '';
    }
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
      if (s.hidden) el.style.display = 'none';
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
    renderTexts(); // re-render text elements above sprites
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
    document.body.classList.add('has-selection');
    window.Draw.setSelected(null);
    const bl = document.getElementById('baseLayer');
    if (bl) bl.classList.remove('base-selected');
    hitsLayer.querySelectorAll('.hit').forEach(el => el.classList.remove('selected'));
    renderSprites();
    renderSpriteEditor();
    renderCharacterPanel();
  }

  function renderSpriteEditor() {
    const sprite = (project?.sprites || []).find(s => s.id === selectedSprite);
    if (!sprite) { selectedPanel.classList.add('hidden'); return; }
    selectedPanel.classList.remove('hidden');
    document.getElementById('selectedPanelTitle').textContent = 'Sprite';
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
     PROJECT STATS
  ———————————————————————————————————————— */
  function openStatsModal() {
    if (!project) return;

    // Measure each category by JSON character count (chars ≈ bytes for ASCII)
    const categories = [
      { label: 'Hit zones / items', value: JSON.stringify(project.items || []) },
      { label: 'Pen drawings',      value: JSON.stringify(project.drawings || []) },
      { label: 'Sprites',           value: JSON.stringify(project.sprites || []) },
      { label: 'Text objects',      value: JSON.stringify((project.items || []).filter(i => i.kind === 'text')) },
      { label: 'Base image',        value: project.baseImage || '' },
      { label: 'Custom sounds',     value: JSON.stringify(project.customSounds || {}) },
    ];

    const totalJson = JSON.stringify(project);
    const totalBytes = totalJson.length;

    // Only show categories that have actual content
    const rows = categories
      .map(c => ({ label: c.label, bytes: c.value.length }))
      .filter(r => r.bytes > 2); // '[]' or '{}' = empty

    const fmt = (b) => b >= 1024 ? (b / 1024).toFixed(1) + ' KB' : b + ' B';

    const barColor = 'var(--accent)';
    const rowsHtml = rows.length === 0
      ? '<p style="color:var(--ui-text-dim);font-size:13px">No content yet.</p>'
      : rows.map(r => {
          const pct = Math.round(r.bytes / totalBytes * 100);
          return `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
              <span>${escapeHtmlInner(r.label)}</span>
              <span style="color:var(--ui-text-dim)">${fmt(r.bytes)} &nbsp; ${pct}%</span>
            </div>
            <div style="background:var(--panel-bg-2);border-radius:3px;height:8px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:${barColor};border-radius:3px;transition:width 0.3s"></div>
            </div>
          </div>`;
        }).join('');

    const body = `
      <div style="padding:4px 0 8px">
        <p style="font-size:12px;color:var(--ui-text-dim);margin-bottom:16px">
          Stored locally in your browser. No AI tokens used — this is a fully offline tool.
        </p>
        ${rowsHtml}
        <hr style="border:none;border-top:1px solid var(--panel-border);margin:12px 0">
        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600">
          <span>Total project JSON</span>
          <span>${fmt(totalBytes)}</span>
        </div>
      </div>`;

    openModal('Project stats', body);
  }

  /* ————————————————————————————————————————
     PROJECT RENAME + DRAWINGS LOAD
  ———————————————————————————————————————— */
  function renameProject() {
    const el = document.getElementById('projectName');
    if (!el || !project) return;
    el.contentEditable = 'true';
    el.focus();
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    function commit() {
      el.contentEditable = 'false';
      const name = el.textContent.trim();
      if (name) {
        project.name = name;
        el.textContent = name;
      } else {
        el.textContent = project.name;
      }
      schedSave();
      el.removeEventListener('blur', commit);
      el.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') {
        el.contentEditable = 'false';
        el.textContent = project.name;
        el.removeEventListener('blur', commit);
        el.removeEventListener('keydown', onKey);
      }
    }
    el.addEventListener('blur', commit);
    el.addEventListener('keydown', onKey);
  }

  async function loadProjectAssets(p) {
    if (p.customSounds) {
      for (const key of Object.keys(p.customSounds)) {
        await window.SFX.loadCustomSound(key, p.customSounds[key]);
      }
    }
    if (p.missSoundData) {
      await window.SFX.loadCustomSound('__miss__', p.missSoundData);
    }
  }

  function schedSave() {
    window.Projects.scheduleAutosave(project);
  }

  /* ————————————————————————————————————————
     COLLAPSIBLE PANEL SECTIONS
  ———————————————————————————————————————— */
  function initCollapsibleSections() {
    const KEY = 'hs_panelState';
    const state = JSON.parse(localStorage.getItem(KEY) || '{}');

    // Wire each .tool-section > h3 in the edit panel
    document.querySelectorAll('#editPanel .tool-section > h3').forEach(h3 => {
      const sec = h3.parentElement;
      const key = sec.id || h3.textContent.trim().replace(/\s+/g, '_').toLowerCase();
      if (state[key]) sec.classList.add('sec-collapsed');
      h3.addEventListener('click', () => {
        sec.classList.toggle('sec-collapsed');
        state[key] = sec.classList.contains('sec-collapsed');
        localStorage.setItem(KEY, JSON.stringify(state));
      });
    });

    // Panel-level collapse/expand
    const collapseBtn = document.getElementById('editPanelCollapseBtn');
    const expandBtn   = document.getElementById('editPanelToggle');
    const editPanelEl = document.getElementById('editPanel');

    function collapsePanel() {
      if (!editPanelEl) return;
      editPanelEl.classList.add('collapsed');
      state.panelCollapsed = true;
      localStorage.setItem(KEY, JSON.stringify(state));
    }
    function expandPanel() {
      if (!editPanelEl) return;
      editPanelEl.classList.remove('collapsed');
      state.panelCollapsed = false;
      localStorage.setItem(KEY, JSON.stringify(state));
    }

    if (editPanelEl && state.panelCollapsed) editPanelEl.classList.add('collapsed');
    if (collapseBtn) collapseBtn.addEventListener('click', collapsePanel);
    if (expandBtn)   expandBtn.addEventListener('click', expandPanel);
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
  function onDrawMove(wx, wy, shift = false) {
    if (SHAPE_TOOLS.includes(tool)) {
      window.Draw.previewShape(wx, wy, shift);
    } else {
      window.Draw.moveStroke(wx, wy);
    }
  }
  function onDrawEnd() {
    if (SHAPE_TOOLS.includes(tool)) {
      const stroke = window.Draw.commitShape(_lastWX, _lastWY, _lastShift);
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

  let _lastWX = 0, _lastWY = 0, _lastShift = false;
  function onDrawMoveRecord(wx, wy, shift = false) { _lastWX = wx; _lastWY = wy; _lastShift = shift; onDrawMove(wx, wy, shift); }

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

  /* ————————————————————————————————————————
     CROP TOOL
     State is in SCREEN coordinates so zoom/pan
     never affects handle positions or sizes.
     World coordinates are computed only on apply.
  ———————————————————————————————————————— */
  function initCropTool() {
    const overlay  = document.getElementById('cropOverlay');
    const cropRect = document.getElementById('cropRect');
    if (!overlay || !cropRect) return;

    // Screen-space crop rectangle
    let sx = 0, sy = 0, sw = 400, sh = 300;
    let drag = null; // { handle, startX, startY, startRect }

    function updateRect() {
      cropRect.style.left   = sx + 'px';
      cropRect.style.top    = sy + 'px';
      cropRect.style.width  = sw + 'px';
      cropRect.style.height = sh + 'px';
    }

    function resetToBase() {
      // Default: snap to base image bounds, or full doc if no base
      const inner = document.getElementById('baseLayer')?.firstElementChild;
      if (inner) {
        const r = inner.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          sx = r.left; sy = r.top; sw = r.width; sh = r.height;
          updateRect(); return;
        }
      }
      // Fallback: current doc bounds in screen coords
      if (project) {
        const tl = window.Game.worldToScreen(0, 0);
        const br = window.Game.worldToScreen(project.docWidth || 1600, project.docHeight || 1600);
        sx = tl.x; sy = tl.y; sw = br.x - tl.x; sh = br.y - tl.y;
        updateRect();
      }
    }

    // When crop tool is activated, auto-snap to base
    document.querySelectorAll('.tool-btn[data-tool="crop"]').forEach(btn => {
      btn.addEventListener('click', () => { if (project) resetToBase(); });
    });

    // Drag handler — pure screen coordinates, no scale needed
    cropRect.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      drag = {
        handle: e.target.dataset.handle || 'body',
        startX: e.clientX, startY: e.clientY,
        startRect: { sx, sy, sw, sh },
      };
      cropRect.setPointerCapture(e.pointerId);
    });

    cropRect.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const s  = drag.startRect;
      const MIN = 40; // minimum screen pixels

      switch (drag.handle) {
        case 'body': sx = s.sx + dx; sy = s.sy + dy; break;
        case 'tl': sx = s.sx + dx; sy = s.sy + dy; sw = Math.max(MIN, s.sw - dx); sh = Math.max(MIN, s.sh - dy); break;
        case 'tc': sy = s.sy + dy; sh = Math.max(MIN, s.sh - dy); break;
        case 'tr': sy = s.sy + dy; sw = Math.max(MIN, s.sw + dx); sh = Math.max(MIN, s.sh - dy); break;
        case 'ml': sx = s.sx + dx; sw = Math.max(MIN, s.sw - dx); break;
        case 'mr': sw = Math.max(MIN, s.sw + dx); break;
        case 'bl': sx = s.sx + dx; sw = Math.max(MIN, s.sw - dx); sh = Math.max(MIN, s.sh + dy); break;
        case 'bc': sh = Math.max(MIN, s.sh + dy); break;
        case 'br': sw = Math.max(MIN, s.sw + dx); sh = Math.max(MIN, s.sh + dy); break;
      }
      updateRect();
    });

    cropRect.addEventListener('pointerup',     () => { drag = null; });
    cropRect.addEventListener('pointercancel', () => { drag = null; });

    // Fit to base layer — snaps crop rect to image bounds in screen space
    document.getElementById('cropFitBase')?.addEventListener('click', () => {
      const inner = document.getElementById('baseLayer')?.firstElementChild;
      if (!inner) return;
      const r = inner.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      sx = r.left; sy = r.top; sw = r.width; sh = r.height;
      updateRect();
    });

    // Apply crop — convert screen rect to world, shift everything, resize doc
    document.getElementById('cropApply')?.addEventListener('click', () => {
      if (!project) return;

      // Convert screen crop corners to world coordinates
      const tl = window.Game.screenToWorld(sx,      sy);
      const br = window.Game.screenToWorld(sx + sw, sy + sh);
      const cropX = tl.x, cropY = tl.y;
      const cropW = Math.max(1, br.x - tl.x);
      const cropH = Math.max(1, br.y - tl.y);
      const dx = -cropX, dy = -cropY;

      // Shift all game objects into new coordinate space
      (project.items     || []).forEach(o => { o.x += dx; o.y += dy; });
      (project.surprises || []).forEach(o => { o.x += dx; o.y += dy; });
      (project.texts     || []).forEach(o => { o.x += dx; o.y += dy; });
      (project.sprites   || []).forEach(o => { o.x += dx; o.y += dy; });

      // Shift pen strokes
      window.Draw.shiftStrokes(dx, dy);

      // Freeze base image at its current rendered size BEFORE the canvas shrinks.
      // The img uses width:100%;height:100% which would make it shrink with the
      // canvas — we store explicit px dimensions so the image stays the same size.
      if (project.baseType === 'image' && project.baseContent) {
        project.baseImgW = project.docWidth  || 1600;
        project.baseImgH = project.docHeight || 1600;
      }

      // Shift base layer
      project.baseX = (project.baseX || 0) + dx;
      project.baseY = (project.baseY || 0) + dy;

      // Set new document size
      project.docWidth  = Math.round(cropW);
      project.docHeight = Math.round(cropH);

      applyDocSize();
      applyBaseTransform();
      window.Game.renderHits();
      renderTexts();
      renderSprites();
      window.Draw.render();
      renderLayersPanel();
      window.Game.centerOnPlanet();
      setTool('select');
      schedSave();
    });

    // Cancel
    document.getElementById('cropCancel')?.addEventListener('click', () => {
      setTool('select');
    });
  }

  return {
    init, setProject, getProject,
    setTool, getTool,
    onStageTap,
    onDrawStart, onDrawMove, onDrawEnd, onDrawMoveRecord,
    renderBaseLayer, applyBaseTransform, renderBaseTransformPanel,
    renderSprites, renderLayersPanel, renderCharacterPanel, createLayerGroup: _createGroup,
    selectSprite, selectBase, selectStroke,
    get selectedBase() { return selectedBase; },
    get selectedStroke() { return selectedStroke; },
    deleteSelected, duplicateSelected, nudgeSelected,
    bringForward, sendBackward, bringToFront, sendToBack,
    loadProjectAssets,
    deselect,
    openModal, closeModal,
    renameProject,
  };
})();
