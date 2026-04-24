/* ═══════════════════════════════════════════════════
   EASTER EGGS — runtime trigger / dismiss
   Handles audio playback and all three visual types.
   Called from game.js when a marked hit zone is tapped.
═══════════════════════════════════════════════════ */

window.EasterEggs = (function () {

  let activeAudio   = null;
  let activeOverlay = null;
  let escHandler    = null;
  let outsideTimer  = null;

  /* ────────────────────────────────────────────────
     PUBLIC — trigger(egg)
     egg = the easterEgg object stored on a hit zone
  ──────────────────────────────────────────────── */
  function trigger(egg) {
    if (!egg || !egg.enabled) return;
    dismiss(); // clear any previous egg

    // ── Audio ──────────────────────────────────────
    if (egg.audio) {
      try {
        activeAudio = new Audio(egg.audio);
        activeAudio.loop = !!egg.loop;
        activeAudio.volume = 0.85;
        activeAudio.play().catch(() => {});
      } catch (_) {}
    }

    // ── Visuals ────────────────────────────────────
    const vt = egg.visualType || 'none';
    if      (vt === 'floating')   _showFloating(egg);
    else if (vt === 'fullscreen') _showFullscreen(egg);
    else if (vt === 'shake')      _doShake(egg);

    // ── Dismiss hooks (not for shake — it self-dismisses) ──
    if (egg.dismissable && vt !== 'shake') {
      escHandler = (e) => { if (e.key === 'Escape') dismiss(); };
      document.addEventListener('keydown', escHandler);
    }

    // Audio-only ('none' visual): dismiss on any click after a short delay
    if (vt === 'none' && egg.dismissable && egg.audio) {
      outsideTimer = setTimeout(() => {
        document.addEventListener('click', dismiss, { once: true });
      }, 300);
    }
  }

  /* ────────────────────────────────────────────────
     PUBLIC — dismiss()
  ──────────────────────────────────────────────── */
  function dismiss() {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    }
    if (activeOverlay) {
      activeOverlay.remove();
      activeOverlay = null;
    }
    if (escHandler) {
      document.removeEventListener('keydown', escHandler);
      escHandler = null;
    }
    if (outsideTimer) {
      clearTimeout(outsideTimer);
      outsideTimer = null;
    }
    document.removeEventListener('click', dismiss);
  }

  function isActive() { return !!(activeAudio || activeOverlay); }

  /* ────────────────────────────────────────────────
     FLOATING visual
  ──────────────────────────────────────────────── */
  function _showFloating(egg) {
    const vc  = egg.visualContent || {};
    const el  = document.createElement('div');
    el.className = 'egg-floating';
    el.id = 'egg-overlay';

    let inner = '';
    if (egg.dismissable) inner += `<button class="egg-close" aria-label="Close">✕</button>`;
    if (vc.image) inner += `<img src="${vc.image}" class="egg-img" draggable="false" alt="">`;
    if (vc.text)  inner += `<div class="egg-text">${_esc(vc.text)}</div>`;
    el.innerHTML = inner;

    // Position
    const pos = vc.position || 'center';
    if (pos === 'bottom-right') {
      el.style.cssText = 'right:24px;bottom:24px;transform:none';
    } else if (pos === 'random') {
      const rx = 10 + Math.random() * 55;
      const ry = 10 + Math.random() * 55;
      el.style.left = rx + '%';
      el.style.top  = ry + '%';
    }
    // 'center' is the CSS default

    document.body.appendChild(el);
    activeOverlay = el;

    if (egg.dismissable) {
      el.querySelector('.egg-close')?.addEventListener('click', (e) => {
        e.stopPropagation();
        dismiss();
      });
      // Outside-click (with a slight delay to avoid catching the triggering click)
      setTimeout(() => {
        document.addEventListener('click', _outsideClick, { capture: true });
      }, 200);
    }
  }

  /* ────────────────────────────────────────────────
     FULL-SCREEN visual
  ──────────────────────────────────────────────── */
  function _showFullscreen(egg) {
    const vc = egg.visualContent || {};
    const el = document.createElement('div');
    el.className = 'egg-fullscreen';
    el.id = 'egg-overlay';

    let inner = `<div class="egg-inner">`;
    if (egg.dismissable) inner += `<button class="egg-close" aria-label="Close">✕</button>`;
    if (vc.image) inner += `<img src="${vc.image}" class="egg-img" draggable="false" alt="">`;
    if (vc.text)  inner += `<div class="egg-text">${_esc(vc.text)}</div>`;
    inner += `</div>`;
    el.innerHTML = inner;

    document.body.appendChild(el);
    activeOverlay = el;

    if (egg.dismissable) {
      el.querySelector('.egg-close')?.addEventListener('click', (e) => {
        e.stopPropagation();
        dismiss();
      });
      // Click on the backdrop (outside the inner card) dismisses
      el.addEventListener('click', (e) => {
        if (e.target === el) dismiss();
      });
      setTimeout(() => {
        document.addEventListener('click', _outsideClick, { capture: true });
      }, 200);
    }
  }

  /* ────────────────────────────────────────────────
     SHAKE visual
  ──────────────────────────────────────────────── */
  function _doShake(egg) {
    const vc    = egg.visualContent || {};
    const stage = document.getElementById('stage') || document.body;
    stage.classList.add('egg-shake');
    setTimeout(() => stage.classList.remove('egg-shake'), 850);

    if (vc.text) {
      const el = document.createElement('div');
      el.className = 'egg-shake-text';
      el.textContent = vc.text;
      document.body.appendChild(el);
      activeOverlay = el;
      setTimeout(() => { if (activeOverlay === el) { el.remove(); activeOverlay = null; } }, 2200);
    }

    // Audio for shake: if not looping, let it play to completion; stop on audio end
    if (activeAudio && !egg.loop) {
      activeAudio.addEventListener('ended', () => { activeAudio = null; }, { once: true });
    }
  }

  /* ────────────────────────────────────────────────
     HELPERS
  ──────────────────────────────────────────────── */
  function _outsideClick(e) {
    const overlay = document.getElementById('egg-overlay');
    if (overlay && !overlay.contains(e.target)) {
      document.removeEventListener('click', _outsideClick, { capture: true });
      dismiss();
    }
  }

  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { trigger, dismiss, isActive };

})();
