/* ═══════════════════════════════════════════════════
   GAME — play-mode logic
   The editor reuses the same camera/rendering, but the
   actual "tap to find" rules live here.
═══════════════════════════════════════════════════ */

window.Game = (function() {

  const WORLD_W = 1600;
  const WORLD_H = 1600;

  // Dynamic world size — reads from project when available, falls back to default
  function worldW() { return (project && project.docWidth)  || WORLD_W; }
  function worldH() { return (project && project.docHeight) || WORLD_H; }

  let project = null;
  let state = { found: new Set(), surprisesFound: new Set() };

  // DOM refs (set on init)
  let stage, world, hitsLayer, playLayer;
  let listEl, counterEl, totalEl;
  let secretCountEl, secretTotalEl, winEl;
  let minimapEl, viewboxEl, listPanel, panelToggle;

  let camX = 0, camY = 0, scale = 1;

  function init(refs) {
    Object.assign({ }, refs);
    stage = refs.stage; world = refs.world;
    hitsLayer = refs.hitsLayer; playLayer = refs.playLayer;
    listEl = refs.listEl; counterEl = refs.counterEl; totalEl = refs.totalEl;
    secretCountEl = refs.secretCountEl; secretTotalEl = refs.secretTotalEl;
    winEl = refs.winEl;
    minimapEl = refs.minimapEl; viewboxEl = refs.viewboxEl;
    listPanel = refs.listPanel; panelToggle = refs.panelToggle;

    minimapEl.addEventListener('click', onMinimapClick);
    panelToggle.addEventListener('click', () => listPanel.classList.remove('collapsed'));
    listPanel.addEventListener('click', (e) => {
      if (e.target.tagName === 'H2' && window.innerWidth < 700) {
        listPanel.classList.add('collapsed');
      }
    });
  }

  function setProject(p) {
    project = p;
    restart();
  }

  function restart() {
    state = { found: new Set(), surprisesFound: new Set() };
    winEl.classList.remove('show');
    playLayer.innerHTML = '';
    renderList();
    renderHits();
    renderSparkles();
    updateCounter();
    centerOnPlanet();
  }

  /* ————————————————————————————————————————
     CAMERA
  ———————————————————————————————————————— */
  function computeBaseScale() {
    const vw = window.innerWidth, vh = window.innerHeight;
    return Math.min(vw * 0.85 / worldW(), vh * 0.85 / worldH());
  }
  function clampCamera() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const sW = worldW() * scale, sH = worldH() * scale;
    const minX = vw / 2 - sW + vw * 0.3;
    const maxX = vw / 2 - vw * 0.3;
    const minY = vh / 2 - sH + vh * 0.3;
    const maxY = vh / 2 - vh * 0.3;
    camX = Math.min(maxX, Math.max(minX, camX));
    camY = Math.min(maxY, Math.max(minY, camY));
  }
  function applyCamera() {
    clampCamera();
    world.style.transform = `translate(${camX}px, ${camY}px) scale(${scale})`;
    updateMinimap();
  }
  function centerOnPlanet() {
    scale = computeBaseScale();
    const vw = window.innerWidth, vh = window.innerHeight;
    camX = vw / 2 - (worldW() / 2) * scale;
    camY = vh / 2 - (worldH() / 2) * scale;
    applyCamera();
  }
  function updateMinimap() {
    const mapW = minimapEl.offsetWidth, mapH = minimapEl.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    const wx = (-camX) / scale;
    const wy = (-camY) / scale;
    const ww = vw / scale;
    const wh = vh / scale;
    const msx = mapW / worldW(), msy = mapH / worldH();
    viewboxEl.style.left   = `${wx * msx}px`;
    viewboxEl.style.top    = `${wy * msy}px`;
    viewboxEl.style.width  = `${ww * msx}px`;
    viewboxEl.style.height = `${wh * msy}px`;
  }
  function onMinimapClick(e) {
    const rect = minimapEl.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = mx / (rect.width  / worldW());
    const wy = my / (rect.height / worldH());
    const vw = window.innerWidth, vh = window.innerHeight;
    camX = vw / 2 - wx * scale;
    camY = vh / 2 - wy * scale;
    applyCamera();
  }

  function screenToWorld(sx, sy) {
    return { x: (sx - camX) / scale, y: (sy - camY) / scale };
  }

  /* ————————————————————————————————————————
     HIT ZONE RENDERING (invisible in play mode)
     They're rendered by the editor, but click handlers
     go through the Game.
  ———————————————————————————————————————— */
  function renderHits() {
    // Hit zones are drawn by the editor module so they're shared across
    // play/edit modes (invisible in play because of CSS on .play-mode)
    // Here we just make sure they exist.
    hitsLayer.innerHTML = '';
    if (!project) return;
    const items = [...(project.items || []), ...(project.surprises || [])];
    items.forEach((item, i) => {
      const isSurprise = (project.surprises || []).indexOf(item) >= 0;
      const el = document.createElement('div');
      el.className = 'hit ' + (isSurprise ? 'surprise' : 'item');
      el.dataset.id = item.id;
      el.dataset.kind = isSurprise ? 'surprise' : 'item';
      el.style.left = `${item.x - item.r}px`;
      el.style.top  = `${item.y - item.r}px`;
      el.style.width = `${item.r * 2}px`;
      el.style.height = `${item.r * 2}px`;
      const lbl = document.createElement('div');
      lbl.className = 'label';
      lbl.textContent = item.name;
      el.appendChild(lbl);
      const resize = document.createElement('div');
      resize.className = 'resize';
      el.appendChild(resize);
      hitsLayer.appendChild(el);
    });
  }

  function renderSparkles() {
    // Only show sparkles in play mode — if we're in edit, skip.
    if (document.body.classList.contains('edit-mode')) return;
    playLayer.querySelectorAll('.sparkle').forEach(el => el.remove());
    (project?.surprises || []).forEach(s => {
      if (state.surprisesFound.has(s.id)) return;
      const sp = document.createElement('div');
      sp.className = 'sparkle';
      sp.dataset.id = s.id;
      sp.style.left = `${s.x - 7}px`;
      sp.style.top  = `${s.y - 7}px`;
      sp.innerHTML = `<svg viewBox="0 0 14 14"><path d="M 7 0 L 8 6 L 14 7 L 8 8 L 7 14 L 6 8 L 0 7 L 6 6 Z" fill="#c43f2e" opacity="0.8"/></svg>`;
      sp.style.animationDelay = (Math.random() * 2) + 's';
      playLayer.appendChild(sp);
    });
  }

  /* ————————————————————————————————————————
     LIST + COUNTER
  ———————————————————————————————————————— */
  function renderList() {
    listEl.innerHTML = '';
    if (!project) return;
    (project.items || []).forEach(item => {
      const li = document.createElement('li');
      li.id = 'li-' + item.id;
      li.innerHTML = `<span class="box"></span><span class="label">${escapeHtml(item.name)}</span>`;
      if (state.found.has(item.id)) li.classList.add('found');
      listEl.appendChild(li);
    });
    totalEl.textContent = (project.items || []).length;
    secretTotalEl.textContent = (project.surprises || []).length;
  }
  function updateCounter(bump = false) {
    if (!project) return;
    const n = state.found.size;
    const total = (project.items || []).length;
    counterEl.innerHTML = `found <b>${n}</b> / <span>${total}</span>`;
    secretCountEl.textContent = state.surprisesFound.size;
    if (n === total && total > 0) {
      setTimeout(() => {
        winEl.classList.add('show');
        window.SFX.play('win');
        window.SFX.haptic([80, 50, 80, 50, 180]);
      }, 500);
    }
  }

  /* ————————————————————————————————————————
     HANDLE A TAP (called by app.js input logic)
  ———————————————————————————————————————— */
  function handleTap(screenX, screenY) {
    window.SFX.ensure();
    const w = screenToWorld(screenX, screenY);

    // Check surprises first
    for (const s of (project?.surprises || [])) {
      if (state.surprisesFound.has(s.id)) continue;
      const dx = w.x - s.x, dy = w.y - s.y;
      if (Math.sqrt(dx*dx + dy*dy) < s.r) {
        triggerSurprise(s);
        return;
      }
    }

    // Then items
    let hit = null;
    for (const item of (project?.items || [])) {
      if (state.found.has(item.id)) continue;
      const dx = w.x - item.x, dy = w.y - item.y;
      if (Math.sqrt(dx*dx + dy*dy) < item.r) { hit = item; break; }
    }

    if (hit) {
      state.found.add(hit.id);
      addMark(hit);
      popAt('found!', hit.x, hit.y - hit.r - 8, 'pop');
      playItemSound(hit);
      window.SFX.haptic([30, 40, 60]);
      const li = document.getElementById('li-' + hit.id);
      if (li) {
        li.classList.add('found');
        li.classList.remove('just-found');
        void li.offsetWidth;
        li.classList.add('just-found');
      }
      updateCounter(true);
    } else {
      const misses = ['nope!', 'miss!', 'hmm', 'not there', 'nuh-uh'];
      popAt(misses[Math.floor(Math.random() * misses.length)], w.x, w.y, 'miss');
      window.SFX.play('miss');
      window.SFX.haptic(40);
    }
  }

  function playItemSound(item) {
    // Check for custom sound, then item-defined sound, then default 'found'
    const custom = project.customSounds?.[item.id];
    if (custom) {
      window.SFX.play(item.id); // key is itemId
    } else if (item.sound) {
      window.SFX.play(item.sound);
    } else {
      window.SFX.play('found');
    }
  }

  function triggerSurprise(s) {
    state.surprisesFound.add(s.id);
    // Remove sparkle
    const sp = document.querySelector(`.sparkle[data-id="${s.id}"]`);
    if (sp) sp.remove();
    // Show sprite
    showSurpriseSprite(s);
    // Sound
    const custom = project.customSounds?.[s.id];
    if (custom) window.SFX.play(s.id);
    else if (s.sound) window.SFX.play(s.sound);
    else window.SFX.play('pop');
    window.SFX.haptic([20, 30, 40]);
    updateCounter();
  }

  function showSurpriseSprite(s) {
    const spriteName = s.sprite || 'spark';
    const sprW = window.Sprites.widthFor(spriteName);
    const el = document.createElement('div');
    el.className = 'surprise-sprite';
    el.style.position = 'absolute';
    el.style.left = `${s.x - sprW / 2}px`;
    el.style.top  = `${s.y - sprW / 2}px`;
    el.style.width = `${sprW}px`;
    el.style.pointerEvents = 'none';
    el.style.zIndex = 6;
    el.innerHTML = window.Sprites.renderBuiltin(spriteName);
    if (s.transform) window.Transforms.applyTo(el, s.transform, { includeScale: false });
    window.Anim.apply(el, s.anim || ['pop']);
    playLayer.appendChild(el);

    // One-shot animations auto-remove
    const anims = s.anim || [];
    const hasOneShot = anims.some(a => ['fly', 'jump'].includes(a));
    if (hasOneShot) {
      setTimeout(() => el.remove(), 4500);
    }
  }

  function addMark(item) {
    const m = document.createElement('div');
    m.className = 'mark';
    m.style.position = 'absolute';
    m.style.left   = `${item.x - item.r * 1.3}px`;
    m.style.top    = `${item.y - item.r * 1.3}px`;
    m.style.width  = `${item.r * 2.6}px`;
    m.style.height = `${item.r * 2.6}px`;
    const rot = (Math.random() * 20 - 10).toFixed(1);
    m.innerHTML = `<svg viewBox="0 0 100 100" style="transform: rotate(${rot}deg);">
      <circle cx="50" cy="50" r="44" transform="rotate(${Math.random()*360} 50 50)"/>
    </svg>`;
    playLayer.appendChild(m);
  }

  function popAt(text, wx, wy, kind) {
    const el = document.createElement('div');
    el.className = kind;
    el.style.position = 'absolute';
    el.textContent = text;
    el.style.left = `${wx}px`;
    el.style.top  = `${wy}px`;
    playLayer.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return {
    init, setProject, restart,
    centerOnPlanet, applyCamera,
    screenToWorld, handleTap,
    renderList, renderHits, renderSparkles, updateCounter,
    get camX() { return camX; }, set camX(v) { camX = v; },
    get camY() { return camY; }, set camY(v) { camY = v; },
    get scale() { return scale; }, set scale(v) { scale = v; },
  };
})();
