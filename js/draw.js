/* ═══════════════════════════════════════════════════
   DRAW — pen / eraser tools
   Strokes are stored as SVG path data (d="...") in the
   project's drawings array, so they persist and can be
   rendered at any scale.
═══════════════════════════════════════════════════ */

window.Draw = (function() {

  let drawingLayer = null;
  let cursorLayer  = null;   // for in-progress stroke
  let strokes = [];          // array of {d, color, width}

  let drawing = false;
  let currentPath = '';
  let currentColor = '#1a1613';
  let currentWidth = 3;

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
    // render in-progress path in cursor layer
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

  function moveStroke(wx, wy) {
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
      // For eraser: just remove strokes whose paths are close to ours.
      // Simple approach: remove any stroke whose start/end points are within
      // the eraser radius along our path.  Good enough for this tool.
      strokes = strokes.filter(s => !strokeIntersects(s, currentPath, currentWidth * 3));
      cursorLayer.innerHTML = '';
      render();
      return null;
    }

    const stroke = {
      d: currentPath,
      color: currentColor,
      width: currentWidth,
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
    // matches "M x y" or "L x y" etc.
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
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', s.d);
      p.setAttribute('stroke', s.color);
      p.setAttribute('stroke-width', s.width);
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
      p.setAttribute('fill', 'none');
      drawingLayer.appendChild(p);
    });
  }

  function clearAll() {
    strokes = [];
    render();
  }

  function loadFrom(arr) {
    strokes = Array.isArray(arr) ? arr.slice() : [];
    render();
  }

  function getStrokes() { return strokes.slice(); }

  function isDrawing() { return drawing; }

  return {
    init, setColor, setWidth,
    beginStroke, moveStroke, endStroke, cancelStroke,
    render, clearAll, loadFrom, getStrokes,
    isDrawing,
  };
})();
