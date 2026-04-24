/* ═══════════════════════════════════════════════════
   SPRITES — built-in SVG characters + user imports
═══════════════════════════════════════════════════ */

window.Sprites = (function() {

  const BUILTIN = {
    bird: {
      label: 'bird',
      width: 90,
      svg: `<svg viewBox="0 0 90 40">
        <path d="M 5 20 Q 15 10 25 18 Q 30 5 40 18 Q 50 10 60 18 Q 70 8 80 20"
          fill="none" stroke="#1a1613" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M 32 19 Q 38 25 44 19" fill="none" stroke="#1a1613" stroke-width="1.5"/>
        <circle cx="38" cy="19" r="1.5" fill="#1a1613"/>
      </svg>`,
    },
    fish: {
      label: 'fish',
      width: 50,
      svg: `<svg viewBox="0 0 50 50">
        <path d="M 5 20 Q 15 8 30 15 Q 42 10 45 20 Q 42 28 30 25 Q 15 30 5 20 Z"
          fill="#f5efe2" stroke="#1a1613" stroke-width="2" stroke-linejoin="round"/>
        <path d="M 42 20 L 48 14 L 48 26 Z" fill="#f5efe2" stroke="#1a1613" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="15" cy="18" r="1.8" fill="#1a1613"/>
        <path d="M 20 21 Q 23 23 26 21" fill="none" stroke="#1a1613" stroke-width="1"/>
        <path d="M 10 5 Q 12 8 10 12" fill="none" stroke="#1a1613" stroke-width="1" stroke-linecap="round"/>
        <path d="M 35 5 Q 33 8 35 12" fill="none" stroke="#1a1613" stroke-width="1" stroke-linecap="round"/>
      </svg>`,
    },
    smoke: {
      label: 'smoke',
      width: 50,
      svg: `<svg viewBox="0 0 50 80">
        <path d="M 25 70 Q 15 60 22 50 Q 32 45 22 35 Q 12 30 20 20 Q 30 15 22 5"
          fill="none" stroke="#1a1613" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
        <circle cx="18" cy="45" r="4" fill="none" stroke="#1a1613" stroke-width="1.5" opacity="0.5"/>
        <circle cx="28" cy="28" r="3" fill="none" stroke="#1a1613" stroke-width="1.5" opacity="0.6"/>
        <circle cx="22" cy="15" r="2.5" fill="none" stroke="#1a1613" stroke-width="1.5" opacity="0.5"/>
      </svg>`,
    },
    mouse: {
      label: 'mouse',
      width: 40,
      svg: `<svg viewBox="0 0 40 30">
        <path d="M 5 25 Q 5 8 25 8 Q 38 8 38 22 L 38 28 Z"
          fill="#f5efe2" stroke="#1a1613" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="18" cy="10" r="5" fill="#f5efe2" stroke="#1a1613" stroke-width="1.8"/>
        <circle cx="18" cy="10" r="2" fill="#f7d0cc" stroke="#1a1613" stroke-width="0.5"/>
        <circle cx="12" cy="18" r="1.8" fill="#1a1613"/>
        <path d="M 6 22 L 4 22 L 5 24" fill="#1a1613"/>
        <line x1="6" y1="20" x2="1" y2="19" stroke="#1a1613" stroke-width="0.7"/>
        <line x1="6" y1="22" x2="1" y2="22" stroke="#1a1613" stroke-width="0.7"/>
        <line x1="6" y1="24" x2="1" y2="25" stroke="#1a1613" stroke-width="0.7"/>
      </svg>`,
    },
    flag: {
      label: 'flag',
      width: 60,
      svg: `<svg viewBox="0 0 60 80">
        <line x1="10" y1="5" x2="10" y2="75" stroke="#1a1613" stroke-width="2.5"/>
        <circle cx="10" cy="4" r="3" fill="#1a1613"/>
        <path d="M 10 10 L 55 14 L 50 28 L 55 42 L 10 38 Z"
          fill="none" stroke="#c43f2e" stroke-width="2.5" stroke-linejoin="round"/>
      </svg>`,
    },
    sleeper: {
      label: 'sleeper',
      width: 140,
      svg: `<svg viewBox="0 0 140 100">
        <ellipse cx="70" cy="70" rx="42" ry="22" fill="#f5efe2" stroke="#1a1613" stroke-width="2.5"/>
        <path d="M 40 72 Q 70 80 100 72" fill="none" stroke="#1a1613" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="45" cy="58" r="18" fill="#f5efe2" stroke="#1a1613" stroke-width="2.5"/>
        <path d="M 36 55 Q 41 52 46 55" fill="none" stroke="#1a1613" stroke-width="2" stroke-linecap="round"/>
        <path d="M 40 64 Q 45 67 50 64" fill="none" stroke="#1a1613" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    },
    spark: {
      label: 'spark',
      width: 30,
      svg: `<svg viewBox="0 0 30 30">
        <path d="M 15 0 L 17 13 L 30 15 L 17 17 L 15 30 L 13 17 L 0 15 L 13 13 Z"
          fill="#c43f2e"/>
      </svg>`,
    },
    heart: {
      label: 'heart',
      width: 30,
      svg: `<svg viewBox="0 0 30 30">
        <path d="M 15 10 C 10 3, 2 5, 5 15 C 8 22, 15 28, 15 28 C 15 28, 22 22, 25 15 C 28 5, 20 3, 15 10 Z"
          fill="#c43f2e" stroke="#1a1613" stroke-width="1.5"/>
      </svg>`,
    },
  };

  const BUILTIN_NAMES = Object.keys(BUILTIN);

  function renderBuiltin(name) {
    return BUILTIN[name] ? BUILTIN[name].svg : '';
  }

  function widthFor(name) {
    return BUILTIN[name] ? BUILTIN[name].width : 50;
  }

  /* For user-imported image sprites — just make an <img> wrapper. */
  function renderImage(dataUrl) {
    return `<img src="${dataUrl}" alt="" draggable="false">`;
  }

  return {
    BUILTIN,
    BUILTIN_NAMES,
    renderBuiltin,
    widthFor,
    renderImage,
  };
})();
