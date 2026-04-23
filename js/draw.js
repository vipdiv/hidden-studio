/* ═══════════════════════════════════════════════════
   DRAW — pen / eraser tools
   Strokes are stored as SVG path data (d="...") in the
   project's drawings array, so they persist and can be
   rendered at any scale. Each stroke also carries tx/ty
   world-space translation so the user can move them.
═══════════════════════════════════════════════════ */

window.Draw = (function() {

  let drawingLayer = null;
  let cursorLayer  = null;   // for in-progress stroke
  let strokes = [];          // array of {id, d, color, width, tx, ty}

  let drawing = false;
  let currentPath = '';
  let currentColor = '#1a1613';
  let currentWidth = 3;
  let selectedId = null;     // currently-selected stroke id

  function _id() { return 'str_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5); }

  function init(layerEl, cursorEl) {
    drawingLayer = layerEl;
    cursorLayer  = cursorEl;
  }

  function setColor(c) { currentColor = c; }
  function setWidth(w) { currentWidth = Math.max(1, Math.min(40, w)); }

  /* Called by editor when pen/eraser mode is active and user starts dragging.
     wx, wy are in world coordinates (1600-space). */
  function beginStroke(wx, wy, erase = false) {
    drawing = true;
    currentPath = `M ${wx.toFixed(1)} ${wy.toFixed(1)}`;
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', currentPath);
    p.setAttribute('stroke', erase ? '#0b0d1f' : currentColor);
    p.setAttribute('stroke-width', erase ? currentWidth * 3 : currentWidth);
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    p.setAttribute('fill', 'none');
    if (erase) p.setAttribute('data-erase', '1');
    cursorLayer.innerHTML = '';
    cursorLayer.appendChild(p);
  }

  function continueStroke(wx, wy) {
    if (!drawing) return;
    currentPath += ` L ${wx.toFixed(1)} ${wy.toFixed(1)}`;
    const p = cursorLayer.firstChild;
    if (p) p.setAttribute('d', currentPath);
  }

  /* End stroke. If eraser, erase anything the stroke overlaps. */
  function endStroke(erase = false) {
    if (!drawing) return null;
    drawing = false;

    if (erase) {
      strokes = strokes.filter(s => !strokeIntersects(s, currentPath, currentWidth * 3));
      cursorLayer.innerHTML = '';
      render();
      return null;
    }

    const stroke = {
      id:    _id(),
      d:     currentPath,
      color: currentColor,
      width: currentWidth,
      tx:    0,
      ty:    0,
    };
    strokes.push(stroke);
    cursorLayer.innerHTML = '';
    render();
    return stroke;
  }

  function cancelStroke() {
    drawing = false;
    if (cursorLayer) cursorLayer.innerHTML = '';
  }

  /* Check if an existing stroke's d-path intersects a fresh d-path within
     the given radius. Dumb approximation: sample the erase path's points,
     see if any existing stroke point is within radius. */
  function strokeIntersects(existing, erasePathD, radius) {
    const existingPts = parsePoints(existing.d);
    const erasePts    = parsePoints(erasePathD);
    if (!existingPts.length || !erasePts.length) return false;
    const r2 = radius * radius;
    for (const ep of erasePts) {
      for (const xp of existingPts) {
        const dx = ep.x - xp.x, dy = ep.y - xp.y;
        if (dx * dx + dy * dy < r2) return true;
      }
    }
    return false;
  }

  function parsePoints(pathD) {
    const pts = [];
    const re = /[ML]\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g;
    let m;
    while ((m = re.exec(pathD)) !== null) {
      pts.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
    }
    return pts;
  }

  /* Render all committed strokes to the drawing layer */
  function render() {
    if (!drawingLayer) return;
    drawingLayer.innerHTML = '';
    strokes.forEach(s => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const tx = s.tx || 0, ty = s.ty || 0;
      if (tx || ty) g.setAttribute('transform', `translate(${tx}, ${ty})`);
      g.setAttribute('data-stroke-id', s.id);

      if (s.id === selectedId) {
        // Selection halo — wide semi-transparent path behind the stroke
        const halo = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        halo.setAttribute('d', s.d);
        halo.setAttribute('stroke', 'rgba(245,239,226,0.35)');
        halo.setAttribute('stroke-width', s.width + 10);
        halo.setAttribute('stroke-linecap', 'round');
        halo.setAttribute('stroke-linejoin', 'round');
        halo.setAttribute('fill', 'none');
        halo.setAttribute('pointer-events', 'none');
        g.appendChild(halo);
      }

      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', s.d);
      p.setAttribute('stroke', s.color);
      p.setAttribute('stroke-width', s.width);
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
      p.setAttribute('fill', 'none');
      g.appendChild(p);

      // Wide transparent hit area so thin strokes are easy to click
      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hit.setAttribute('d', s.d);
      hit.setAttribute('stroke', 'transparent');
      hit.setAttribute('stroke-width', Math.max(s.width + 8, 16));
      hit.setAttribute('fill', 'none');
      hit.setAttribute('stroke-linecap', 'round');
      g.appendChild(hit);

      drawingLayer.appendChild(g);
    });
  }

  function clearAll() {
    strokes = [];
    selectedId = null;
    render();
  }

  function loadFrom(arr) {
    strokes = Array.isArray(arr) ? arr.map(s => ({
      id:    s.id    || _id(),
      d:     s.d,
      color: s.color,
      width: s.width,
      tx:    s.tx || 0,
      ty:    s.ty || 0,
    })) : [];
    selectedId = null;
    render();
  }

  function getStrokes() { return strokes.slice(); }
  function getStroke(id) { return strokes.find(s => s.id === id) || null; }

  function setSelected(id) {
    selectedId = id;
    render();
  }

  function deleteStroke(id) {
    strokes = strokes.filter(s => s.id !== id);
    if (selectedId === id) selectedId = null;
    render();
    return strokes.slice();
  }

  function setStrokeTranslation(id, tx, ty) {
    const s = strokes.find(s => s.id === id);
    if (!s) return;
    s.tx = tx; s.ty = ty;
    render();
  }

  function updateStroke(id, changes) {
    const s = strokes.find(s => s.id === id);
    if (!s) return;
    Object.assign(s, changes);
    render();
  }

  function isDrawing() { return drawing; }

  return {
    init, setColor, setWidth,
    beginStroke, continueStroke, endStroke, cancelStroke,
    // legacy alias so app.js's onDrawMove still works
    moveStroke: continueStroke,
    render, clearAll, loadFrom, getStrokes, getStroke,
    isDrawing,
    setSelected, deleteStroke, setStrokeTranslation, updateStroke,
  };
})();
