/* ═══════════════════════════════════════════════════
   TRANSFORMS — rotation, scale, flip + CSS filters
   Shared helper used by editor + standalone export.
═══════════════════════════════════════════════════ */

window.Transforms = (function() {

  // Default "no transform" state — treated as identity
  function defaults() {
    return {
      rotation:   0,    // degrees
      scale:      1,    // 0.1 to 3
      flipH:      false,
      flipV:      false,
      opacity:    1,    // 0 to 1
      brightness: 1,    // 0 to 2 (1 = normal)
      contrast:   1,    // 0 to 2
      saturation: 1,    // 0 to 2
      hue:        0,    // degrees, 0-360
      blur:       0,    // px
      grayscale:  0,    // 0 to 1
      invert:     0,    // 0 to 1
    };
  }

  /* Fills in any missing fields on a possibly-partial transform object */
  function normalize(t) {
    const d = defaults();
    if (!t) return d;
    for (const k of Object.keys(d)) {
      if (t[k] === undefined || t[k] === null) t[k] = d[k];
    }
    return t;
  }

  /* Builds the CSS `transform` property string */
  function buildTransform(t) {
    t = normalize(t);
    const parts = [];
    if (t.rotation) parts.push(`rotate(${t.rotation}deg)`);
    const sx = (t.flipH ? -1 : 1) * t.scale;
    const sy = (t.flipV ? -1 : 1) * t.scale;
    if (sx !== 1 || sy !== 1) parts.push(`scale(${sx}, ${sy})`);
    return parts.join(' ');
  }

  /* Builds the CSS `filter` property string */
  function buildFilter(t) {
    t = normalize(t);
    const parts = [];
    if (t.brightness !== 1) parts.push(`brightness(${t.brightness})`);
    if (t.contrast   !== 1) parts.push(`contrast(${t.contrast})`);
    if (t.saturation !== 1) parts.push(`saturate(${t.saturation})`);
    if (t.hue        !== 0) parts.push(`hue-rotate(${t.hue}deg)`);
    if (t.blur       !== 0) parts.push(`blur(${t.blur}px)`);
    if (t.grayscale  !== 0) parts.push(`grayscale(${t.grayscale})`);
    if (t.invert     !== 0) parts.push(`invert(${t.invert})`);
    return parts.join(' ');
  }

  /* Applies both transform and filter to an element (skipping scale if includeScale=false;
     used when we already handle scale via width/height, e.g. sprites) */
  function applyTo(el, t, opts) {
    t = normalize(t);
    const includeScale = !opts || opts.includeScale !== false;
    const parts = [];
    if (t.rotation) parts.push(`rotate(${t.rotation}deg)`);
    if (includeScale) {
      const sx = (t.flipH ? -1 : 1) * t.scale;
      const sy = (t.flipV ? -1 : 1) * t.scale;
      if (sx !== 1 || sy !== 1) parts.push(`scale(${sx}, ${sy})`);
    } else {
      // just flip, no scale multiplier
      const sx = t.flipH ? -1 : 1;
      const sy = t.flipV ? -1 : 1;
      if (sx !== 1 || sy !== 1) parts.push(`scale(${sx}, ${sy})`);
    }
    el.style.transform = parts.join(' ');
    el.style.filter    = buildFilter(t);
    el.style.opacity   = (t.opacity !== undefined && t.opacity !== 1) ? String(t.opacity) : '';
  }

  /* Renders the transform sliders UI as HTML string.
     Caller is responsible for wiring events via wireUI(). */
  function renderUI(t, options) {
    t = normalize(t);
    const prefix = (options && options.prefix) || 'xf';
    const showScale = !options || options.showScale !== false;

    return `
      <div class="xf-panel">
        <div class="xf-row">
          <label>Rotate <span class="xf-val" id="${prefix}-rotation-val">${t.rotation}°</span></label>
          <input type="range" id="${prefix}-rotation" min="-180" max="180" value="${t.rotation}">
        </div>
        ${showScale ? `
        <div class="xf-row">
          <label>Scale <span class="xf-val" id="${prefix}-scale-val">${t.scale.toFixed(2)}×</span></label>
          <input type="range" id="${prefix}-scale" min="0.1" max="3" step="0.05" value="${t.scale}">
        </div>
        ` : ''}
        <div class="xf-flip-row">
          <button class="xf-flip${t.flipH ? ' active' : ''}" id="${prefix}-flipH">⇄ Flip H</button>
          <button class="xf-flip${t.flipV ? ' active' : ''}" id="${prefix}-flipV">⇅ Flip V</button>
        </div>

        <div class="xf-group-title">Color</div>
        <div class="xf-row">
          <label>Opacity <span class="xf-val" id="${prefix}-opacity-val">${Math.round(t.opacity*100)}%</span></label>
          <input type="range" id="${prefix}-opacity" min="0" max="1" step="0.02" value="${t.opacity}">
        </div>
        <div class="xf-row">
          <label>Brightness <span class="xf-val" id="${prefix}-brightness-val">${Math.round(t.brightness*100)}%</span></label>
          <input type="range" id="${prefix}-brightness" min="0" max="2" step="0.05" value="${t.brightness}">
        </div>
        <div class="xf-row">
          <label>Contrast <span class="xf-val" id="${prefix}-contrast-val">${Math.round(t.contrast*100)}%</span></label>
          <input type="range" id="${prefix}-contrast" min="0" max="2" step="0.05" value="${t.contrast}">
        </div>
        <div class="xf-row">
          <label>Saturation <span class="xf-val" id="${prefix}-saturation-val">${Math.round(t.saturation*100)}%</span></label>
          <input type="range" id="${prefix}-saturation" min="0" max="2" step="0.05" value="${t.saturation}">
        </div>
        <div class="xf-row">
          <label>Hue <span class="xf-val" id="${prefix}-hue-val">${t.hue}°</span></label>
          <input type="range" id="${prefix}-hue" min="0" max="360" value="${t.hue}">
        </div>

        <div class="xf-group-title">Effects</div>
        <div class="xf-row">
          <label>Blur <span class="xf-val" id="${prefix}-blur-val">${t.blur}px</span></label>
          <input type="range" id="${prefix}-blur" min="0" max="20" step="0.5" value="${t.blur}">
        </div>
        <div class="xf-row">
          <label>Grayscale <span class="xf-val" id="${prefix}-grayscale-val">${Math.round(t.grayscale*100)}%</span></label>
          <input type="range" id="${prefix}-grayscale" min="0" max="1" step="0.05" value="${t.grayscale}">
        </div>
        <div class="xf-row">
          <label>Invert <span class="xf-val" id="${prefix}-invert-val">${Math.round(t.invert*100)}%</span></label>
          <input type="range" id="${prefix}-invert" min="0" max="1" step="0.05" value="${t.invert}">
        </div>

        <button class="ghost-btn xf-reset" id="${prefix}-reset">↺ Reset all</button>
      </div>
    `;
  }

  /* Wires up the UI rendered by renderUI.
     onChange is called after every change with the updated transform object. */
  function wireUI(t, onChange, options) {
    t = normalize(t);
    const prefix = (options && options.prefix) || 'xf';
    const showScale = !options || options.showScale !== false;

    function bindRange(name, formatter) {
      const el  = document.getElementById(`${prefix}-${name}`);
      const val = document.getElementById(`${prefix}-${name}-val`);
      if (!el) return;
      el.addEventListener('input', () => {
        const v = parseFloat(el.value);
        t[name] = v;
        if (val && formatter) val.textContent = formatter(v);
        onChange(t);
      });
    }
    bindRange('rotation',   (v) => `${Math.round(v)}°`);
    if (showScale) bindRange('scale', (v) => `${v.toFixed(2)}×`);
    bindRange('opacity',    (v) => `${Math.round(v*100)}%`);
    bindRange('brightness', (v) => `${Math.round(v*100)}%`);
    bindRange('contrast',   (v) => `${Math.round(v*100)}%`);
    bindRange('saturation', (v) => `${Math.round(v*100)}%`);
    bindRange('hue',        (v) => `${Math.round(v)}°`);
    bindRange('blur',       (v) => `${v}px`);
    bindRange('grayscale',  (v) => `${Math.round(v*100)}%`);
    bindRange('invert',     (v) => `${Math.round(v*100)}%`);

    const flipH = document.getElementById(`${prefix}-flipH`);
    const flipV = document.getElementById(`${prefix}-flipV`);
    if (flipH) flipH.addEventListener('click', () => {
      t.flipH = !t.flipH;
      flipH.classList.toggle('active', t.flipH);
      onChange(t);
    });
    if (flipV) flipV.addEventListener('click', () => {
      t.flipV = !t.flipV;
      flipV.classList.toggle('active', t.flipV);
      onChange(t);
    });

    const reset = document.getElementById(`${prefix}-reset`);
    if (reset) reset.addEventListener('click', () => {
      Object.assign(t, defaults());
      onChange(t);
      // The caller's onChange should re-render, which re-wires.
    });
  }

  return {
    defaults,
    normalize,
    buildTransform,
    buildFilter,
    applyTo,
    renderUI,
    wireUI,
  };
})();
