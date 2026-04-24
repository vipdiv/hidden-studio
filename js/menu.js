/* ═══════════════════════════════════════════════════
   MENU — slim menu bar (File / Edit / View / Help)
═══════════════════════════════════════════════════ */

window.Menu = (function() {

  let anyOpen = false;

  function init() {
    const bar = document.getElementById('menuBar');
    if (!bar) return;

    const items = bar.querySelectorAll('.menu-item[data-menu]');

    items.forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const wasOpen = item.classList.contains('open');
        closeAll();
        if (!wasOpen) { item.classList.add('open'); anyOpen = true; }
      });
      // Hover-to-open once any menu is already open
      item.addEventListener('mouseenter', () => {
        if (anyOpen && !item.classList.contains('open')) {
          closeAll();
          item.classList.add('open');
          anyOpen = true;
        }
      });
    });

    // Click outside closes everything
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('#menuBar')) closeAll();
    });

    // Wire each action item
    bar.querySelectorAll('[data-action]').forEach(li => {
      li.addEventListener('mousedown', (e) => {
        if (li.classList.contains('menu-disabled')) { e.preventDefault(); return; }
        e.preventDefault();
        e.stopPropagation();
        closeAll();
        handleAction(li.dataset.action);
      });
    });
  }

  function closeAll() {
    document.querySelectorAll('#menuBar .menu-item.open').forEach(x => x.classList.remove('open'));
    anyOpen = false;
  }

  function handleAction(action) {
    switch (action) {

      case 'back':
        document.getElementById('backBtn')?.click();
        break;

      case 'save': {
        const proj = window.Editor?.getProject?.();
        if (proj) window.Projects.saveNow(proj);
        break;
      }
      case 'export-html': {
        const proj = window.Editor?.getProject?.();
        if (proj) window.Projects.exportHtml(proj);
        break;
      }
      case 'export-json': {
        const proj = window.Editor?.getProject?.();
        if (proj) window.Projects.exportJson(proj);
        break;
      }

      case 'duplicate':
        window.Editor?.duplicateSelected?.();
        break;

      case 'delete':
        window.Editor?.deleteSelected?.();
        break;

      case 'zoom-in':
        window.Shortcuts?.zoomAt?.(1.25);
        break;

      case 'zoom-out':
        window.Shortcuts?.zoomAt?.(1 / 1.25);
        break;

      case 'zoom-fit':
        window.Game?.centerOnPlanet?.();
        break;

      case 'zoom-100': {
        if (!window.Game) break;
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        const wp = window.Game.screenToWorld(cx, cy);
        window.Game.scale = 1;
        window.Game.camX = cx - wp.x;
        window.Game.camY = cy - wp.y;
        window.Game.applyCamera();
        break;
      }

      case 'toggle-panels':
        window.Shortcuts?.togglePanels?.();
        break;

      case 'toggle-mode':
        if (window.App) {
          const inEdit = document.body.classList.contains('edit-mode');
          window.App.setMode(inEdit ? 'play' : 'edit');
        }
        break;

      case 'shortcuts':
        window.Shortcuts?.showShortcutsModal?.();
        break;
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { init };

})();
