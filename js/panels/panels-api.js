/* ═══════════════════════════════════════════════════
   window.Panels — bridge between vanilla JS and the
   React panel island. Load this before any React code.

   Vanilla code (menu.js, editor.js, etc.) calls:
     window.Panels.toggle('layers')
     window.Panels.setTheme('night')

   React island calls _connect() on mount to wire up
   the state-mutating methods.
   ═══════════════════════════════════════════════════ */
window.Panels = (function () {
  'use strict';

  const _regs = {};
  const _layoutListeners = [];
  const _themeListeners = [];
  let _api = null; // set by React on mount

  const THEME_KEY = 'hs_theme';

  function _applyBodyTheme(name) {
    document.body.dataset.theme = name;
    try { localStorage.setItem(THEME_KEY, name); } catch (_) {}
    _themeListeners.forEach(fn => fn(name));
  }

  // Restore persisted theme immediately (before React mounts)
  (function () {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved) document.body.dataset.theme = saved;
    } catch (_) {}
  })();

  return {
    /* ── Panel registration ──────────────────────── */
    register(panelId, { title, render, defaultSide = 'right', defaultOrder = 0 }) {
      _regs[panelId] = { title, render, defaultSide, defaultOrder };
    },

    /* ── Internal — used by React island ────────── */
    _getRegs() { return _regs; },
    _connect(api) {
      _api = api;
      // body[data-theme] is already set before React mounts (see IIFE above),
      // so CSS vars are correct at first paint — no extra setTheme call needed.
    },

    /* ── Visibility ──────────────────────────────── */
    show(panelId)   { _api?.show(panelId); },
    hide(panelId)   { _api?.hide(panelId); },
    toggle(panelId) { _api?.toggle(panelId); },
    resetLayout()   { _api?.resetLayout(); },
    isVisible(panelId) { return _api?.isVisible(panelId) ?? false; },

    /* ── Theming ─────────────────────────────────── */
    setTheme(name) {
      _applyBodyTheme(name);
      _api?.setTheme(name);
    },
    getTheme() { return document.body.dataset.theme || 'classic'; },

    /* ── Event subscriptions (vanilla → vanilla) ─── */
    onLayoutChange(fn) { _layoutListeners.push(fn); },
    onThemeChange(fn)  { _themeListeners.push(fn); },

    /* ── Notifications (vanilla → React) ─────────── */
    notifySelectionChange(selection) { _api?.onSelectionChange(selection); },
    notifyZoomChange(zoom)           { _api?.onZoomChange(zoom); },
    notifyCameraChange(camX, camY)   { _api?.onCameraChange(camX, camY); },

    /* ── Internal — called by React on layout change */
    _notifyLayoutChange(data) { _layoutListeners.forEach(fn => fn(data)); },
  };
})();
