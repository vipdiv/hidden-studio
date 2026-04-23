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
  let rawPoints   = [];     // sampled points for the current live stroke
  let currentColor = '#1a1613';
  let currentWidth = 3;
  let currentDash  = '';   // '' = solid | 'dash' | 'dot'
  let currentGap   = 8;    // gap size for dash/dot
  let selectedId = null;     // currently-selected stroke id

  function _id() { return 'str_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5); }

  function init(layerEl, cursorEl) {
    drawingLayer = layerEl;
    cursorLayer  = cursorEl;
  }

  function setColor(c) { currentColor = c; }
  function setWidth(w) { currentWidth = Math.max(1, Math.min(40, w)); }
  function setDash(d)  { currentDash = d || ''; }
  function setGap(g)   { currentGap = Math.max(1, Math.min(100, g)); }

  function _dashArray(dash, gap) {
    if (!dash) return null;
    if (dash === 'dash') return `${gap * 2} ${gap}`;
    if (dash === 'dot')  return `1 ${gap}`;
    return null;
  }

  /* Called by editor when pen/eraser mode is active and user starts dragging.
     wx, wy are in world coordinates (1600-space). */
  function beginStroke(wx, wy, erase = false) {
    drawing = true;
    rawPoints   = [{ x: wx, y: wy }];
    currentPath = `M ${wx.toFixed(1)} ${wy.toFixed(1)}`;
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', currentPath);
    p.setAttribute('stroke', erase ? '#0b0d1f' : currentColor);
    p.setAttribute('stroke-width', erase ? currentWidth * 3 : currentWidth);
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    p.setAttribute('fill', 'none');
    if (!erase) {
      const da = _dashArray(currentDash, currentGap);
      if (da) p.setAttribute('stroke-dasharray', da);
    }
    if (erase) p.setAttribute('data-erase', '1');
    cursorLayer.innerHTML = '';
    cursorLayer.appendChild(p);
  }

  function continueStroke(wx, wy) {
    if (!drawing) return;
    // Minimum distance filter: ~1.5 screen-pixels worth of world units
    const scale = (window.Game && window.Game.scale) || 0.4;
    const minD = (1.5 / scale);
    const last = rawPoints[rawPoints.length - 1];
    const dx = wx - last.x, dy = wy - last.y;
    if (dx * dx + dy * dy < minD * minD) return;
    rawPoints.push({ x: wx, y: wy });
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

    const smoothD = rawPoints.length >= 3 ? _smoothPath(rawPoints) : currentPath;
    const stroke = {
      id:    _id(),
      d:     smoothD || currentPath,
      color: currentColor,
      width: currentWidth,
      dash:  currentDash,
      gap:   currentGap,
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

  /* ─────── CURVE SMOOTHING ─────── */

  /* Perpendicular distance from pt to the line a→b */
  function _ptLineDist(pt, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(pt.x - a.x, pt.y - a.y);
    const t = ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / len2;
    return Math.hypot(a.x + t * dx - pt.x, a.y + t * dy - pt.y);
  }

  /* Ramer-Douglas-Peucker point simplification */
  function _rdp(pts, tol) {
    if (pts.length <= 2) return pts.slice();
    let maxD = 0, maxI = 0;
    const last = pts.length - 1;
    for (let i = 1; i < last; i++) {
      const d = _ptLineDist(pts[i], pts[0], pts[last]);
      if (d > maxD) { maxD = d; maxI = i; }
    }
    if (maxD > tol) {
      const L = _rdp(pts.slice(0, maxI + 1), tol);
      const R = _rdp(pts.slice(maxI), tol);
      return [...L.slice(0, -1), ...R];
    }
    return [pts[0], pts[last]];
  }

  /* Catmull-Rom → cubic bezier smooth path from an array of {x,y} points */
  function _smoothPath(pts) {
    // Tolerance: ~3 screen pixels in world-unit space (adapts to zoom)
    const scale = (window.Game && window.Game.scale) || 0.4;
    const tol = Math.max(1.0, 3.0 / scale);
    const s = _rdp(pts, tol);
    if (s.length < 2) return null;
    const f = v => v.toFixed(1);
    if (s.length === 2) return `M ${f(s[0].x)} ${f(s[0].y)} L ${f(s[1].x)} ${f(s[1].y)}`;
    let d = `M ${f(s[0].x)} ${f(s[0].y)}`;
    for (let i = 0; i < s.length - 1; i++) {
      const p0 = s[Math.max(0, i - 1)];
      const p1 = s[i];
      const p2 = s[i + 1];
      const p3 = s[Math.min(s.length - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`;
    }
    return d;
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
      const da = _dashArray(s.dash || '', s.gap != null ? s.gap : 8);
      if (da) p.setAttribute('stroke-dasharray', da);
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
      dash:  s.dash  || '',
      gap:   s.gap   != null ? s.gap : 8,
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

  /* ─────── SHAPE HELPERS ─────── */

  function _rectPath(x1, y1, x2, y2) {
    return `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2} L ${x1} ${y2} Z`;
  }

  function _ellipsePath(cx, cy, rx, ry) {
    const k = 0.5523;
    const x = cx, y = cy;
    return [
      `M ${x} ${y - ry}`,
      `C ${x + rx*k} ${y - ry} ${x + rx} ${y - ry*k} ${x + rx} ${y}`,
      `C ${x + rx} ${y + ry*k} ${x + rx*k} ${y + ry} ${x} ${y + ry}`,
      `C ${x - rx*k} ${y + ry} ${x - rx} ${y + ry*k} ${x - rx} ${y}`,
      `C ${x - rx} ${y - ry*k} ${x - rx*k} ${y - ry} ${x} ${y - ry} Z`,
    ].join(' ');
  }

  function _starPath(cx, cy, outerR, innerR = null, points = 5) {
    if (innerR === null) innerR = outerR * 0.42;
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (Math.PI * i / points) - Math.PI / 2;
      pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
    }
    return `M ${pts.join(' L ')} Z`;
  }

  /* Begin a shape preview (shown while dragging to size it).
     shapeType: 'rect' | 'ellipse' | 'star'
     originX/Y: world coords of the first click */
  let shapeOrigin = null;
  let shapeType   = null;

  function beginShape(type, wx, wy) {
    shapeOrigin = { x: wx, y: wy };
    shapeType   = type;
    cursorLayer.innerHTML = '';
  }

  function previewShape(wx, wy) {
    if (!shapeOrigin) return;
    const d = _shapePath(shapeType, shapeOrigin.x, shapeOrigin.y, wx, wy);
    if (!d) return;
    cursorLayer.innerHTML = '';
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    p.setAttribute('stroke', currentColor);
    p.setAttribute('stroke-width', currentWidth);
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    p.setAttribute('fill', 'none');
    cursorLayer.appendChild(p);
  }

  function _shapePath(type, x1, y1, x2, y2) {
    if (type === 'rect') {
      return _rectPath(x1, y1, x2, y2);
    }
    if (type === 'ellipse') {
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
      const rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
      if (rx < 1 || ry < 1) return null;
      return _ellipsePath(cx, cy, rx, ry);
    }
    if (type === 'star') {
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
      const r  = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2;
      if (r < 2) return null;
      return _starPath(cx, cy, r);
    }
    return null;
  }

  function commitShape(wx, wy) {
    if (!shapeOrigin) return null;
    const d = _shapePath(shapeType, shapeOrigin.x, shapeOrigin.y, wx, wy);
    shapeOrigin = null;
    shapeType   = null;
    cursorLayer.innerHTML = '';
    if (!d) return null;
    const stroke = { id: _id(), d, color: currentColor, width: currentWidth, dash: currentDash, gap: currentGap, tx: 0, ty: 0 };
    strokes.push(stroke);
    render();
    return stroke;
  }

  function cancelShape() {
    shapeOrigin = null;
    shapeType   = null;
    if (cursorLayer) cursorLayer.innerHTML = '';
  }

  function isShaping() { return !!shapeOrigin; }

  return {
    init, setColor, setWidth, setDash, setGap,
    beginStroke, continueStroke, endStroke, cancelStroke,
    moveStroke: continueStroke,
    beginShape, previewShape, commitShape, cancelShape, isShaping,
    render, clearAll, loadFrom, getStrokes, getStroke,
    isDrawing,
    setSelected, deleteStroke, setStrokeTranslation, updateStroke,
  };
})();
