/* ═══════════════════════════════════════════════════
   SHORTCUTS — Adobe-style keyboard shortcut system
   Centralises all keydown handling. Suppressed when
   the user is typing in any input/textarea.
   Edit-mode only except: F (toggle mode), Spacebar (pan), ? (help).
═══════════════════════════════════════════════════ */

window.Shortcuts = (function() {

  let spaceHeld    = false;
  let priorTool    = null;  // restored when spacebar releases
  let panelsHidden = false;

  /* ── helpers ────────────────────────────────── */

  function isTyping() {
    const el = document.activeElement;
    if (!el) return false;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
  }

  function isEditMode() {
    return document.body.classList.contains('edit-mode');
  }

  function mod(e) { return e.ctrlKey || e.metaKey; }

  function zoomAt(factor) {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const wp = window.Game.screenToWorld(cx, cy);
    window.Game.scale = Math.max(0.1, Math.min(10, window.Game.scale * factor));
    window.Game.camX  = cx - wp.x * window.Game.scale;
    window.Game.camY  = cy - wp.y * window.Game.scale;
    window.Game.applyCamera();
  }

  /* ── keydown ────────────────────────────────── */

  function onKeyDown(e) {

    // Spacebar → temporary pan (capture first, before isTyping check so we
    // can preventDefault and stop page scroll even when focus is on stage)
    if (e.code === 'Space' && !isTyping()) {
      if (!spaceHeld) {
        spaceHeld = true;
        priorTool = window.Editor.getTool();
        document.body.classList.add('space-pan');
      }
      e.preventDefault();
      return;
    }

    // F → toggle play / edit mode (global, not suppressed in play mode)
    if ((e.key === 'f' || e.key === 'F') && !mod(e) && !isTyping()) {
      if (window.App) window.App.setMode(isEditMode() ? 'play' : 'edit');
      e.preventDefault();
      return;
    }

    // ? → shortcuts help
    if (e.key === '?' && !isTyping()) {
      showShortcutsModal();
      e.preventDefault();
      return;
    }

    // Everything below is edit-mode only and suppressed while typing
    if (!isEditMode() || isTyping()) return;

    /* ── Mod+key shortcuts ── */
    if (mod(e)) {
      switch (e.key) {

        case 's': case 'S':
          if (!e.shiftKey) {
            const proj = window.Editor.getProject();
            if (proj) window.Projects.saveNow(proj);
            e.preventDefault();
          }
          return;

        case 'e': case 'E':
          if (!e.shiftKey) {
            const proj = window.Editor.getProject();
            if (proj) window.Projects.exportHtml(proj);
            e.preventDefault();
          }
          return;

        case 'd': case 'D':
          window.Editor.duplicateSelected();
          e.preventDefault();
          return;

        // Undo / redo — not yet implemented; preventDefault so browser
        // doesn't navigate or do its own undo on the page
        case 'z': case 'Z':
          e.preventDefault();
          return;

        case '0':
          window.Game.centerOnPlanet();
          e.preventDefault();
          return;

        case '1': {
          const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
          const wp = window.Game.screenToWorld(cx, cy);
          window.Game.scale = 1;
          window.Game.camX  = cx - wp.x;
          window.Game.camY  = cy - wp.y;
          window.Game.applyCamera();
          e.preventDefault();
          return;
        }

        case '=': case '+':
          zoomAt(1.25);
          e.preventDefault();
          return;

        case '-':
          zoomAt(1 / 1.25);
          e.preventDefault();
          return;

        case ']':
          e.shiftKey ? window.Editor.bringToFront() : window.Editor.bringForward();
          e.preventDefault();
          return;

        case '[':
          e.shiftKey ? window.Editor.sendToBack() : window.Editor.sendBackward();
          e.preventDefault();
          return;
      }
      return; // don't fall through for other mod combos
    }

    /* ── Single-key shortcuts ── */
    switch (e.key) {

      // Tools — match Adobe conventions
      case 'v': case 'V': window.Editor.setTool('select');      e.preventDefault(); break;
      case 'h': case 'H': window.Editor.setTool('pan');         e.preventDefault(); break;
      case 'p': case 'P': window.Editor.setTool('pen');         e.preventDefault(); break;
      case 'e': case 'E': window.Editor.setTool('eraser');      e.preventDefault(); break;
      case 'i': case 'I': window.Editor.setTool('import');      e.preventDefault(); break;
      case 't': case 'T': window.Editor.setTool('addItem');     e.preventDefault(); break;
      case 's': case 'S': window.Editor.setTool('addSurprise'); e.preventDefault(); break;

      // Zoom: Z = in, Alt+Z = out
      case 'z': case 'Z':
        zoomAt(e.altKey ? 1 / 1.25 : 1.25);
        e.preventDefault();
        break;

      // Selection / deletion
      case 'Escape':
        window.Editor.deselect();
        e.preventDefault();
        break;
      case 'Delete':
      case 'Backspace':
        window.Editor.deleteSelected();
        e.preventDefault();
        break;

      // Nudge (world-space pixels; Shift = ×10)
      case 'ArrowUp':    window.Editor.nudgeSelected(0,  e.shiftKey ? -10 : -1); e.preventDefault(); break;
      case 'ArrowDown':  window.Editor.nudgeSelected(0,  e.shiftKey ?  10 :  1); e.preventDefault(); break;
      case 'ArrowLeft':  window.Editor.nudgeSelected(e.shiftKey ? -10 : -1, 0);  e.preventDefault(); break;
      case 'ArrowRight': window.Editor.nudgeSelected(e.shiftKey ?  10 :  1, 0);  e.preventDefault(); break;

      // Tab — hide / show all panels for distraction-free canvas
      case 'Tab':
        panelsHidden = !panelsHidden;
        document.body.classList.toggle('panels-hidden', panelsHidden);
        e.preventDefault();
        break;
    }
  }

  /* ── keyup ──────────────────────────────────── */

  function onKeyUp(e) {
    if (e.code === 'Space' && spaceHeld) {
      spaceHeld = false;
      document.body.classList.remove('space-pan');
      // Restore the previous tool, unless it was already 'pan'
      if (priorTool && priorTool !== 'pan') window.Editor.setTool(priorTool);
      priorTool = null;
    }
  }

  /* ── shortcuts modal ────────────────────────── */

  function showShortcutsModal() {
    const section = (label) =>
      `<tr><td colspan="2" style="padding:10px 0 4px;font-family:'Caveat',cursive;font-size:17px;color:var(--accent);border-top:1px dashed rgba(245,239,226,0.15)">${label}</td></tr>`;
    const row = (action, key) =>
      `<tr>
         <td style="padding:2px 20px 2px 0;font-family:'Fraunces',serif;font-size:13px;color:rgba(245,239,226,0.8)">${action}</td>
         <td style="padding:2px 0;font-family:'Caveat',cursive;font-size:15px;white-space:nowrap;color:var(--paper)">${key}</td>
       </tr>`;
    const gap = () => `<tr><td colspan="2" style="height:2px"></td></tr>`;

    const html = `<table style="border-collapse:collapse;width:100%">
      ${section('Tools')}
      ${row('Select / Move', 'V')}
      ${row('Hand (pan)', 'H')}
      ${row('Pen', 'P')}
      ${row('Eraser', 'E')}
      ${row('Import image', 'I')}
      ${row('Add hit zone', 'T')}
      ${row('Add surprise', 'S')}
      ${row('Temporary pan', 'Spacebar (hold)')}
      ${section('Object')}
      ${row('Deselect', 'Esc')}
      ${row('Delete', 'Delete / Backspace')}
      ${row('Duplicate', 'Ctrl+D')}
      ${row('Nudge 1 px', '↑ ↓ ← →')}
      ${row('Nudge 10 px', 'Shift + Arrow')}
      ${row('Rotate (drag handle)', 'Shift = 15° snap')}
      ${section('Layer Order')}
      ${row('Bring forward', 'Ctrl+]')}
      ${row('Send backward', 'Ctrl+[')}
      ${row('Bring to front', 'Ctrl+Shift+]')}
      ${row('Send to back', 'Ctrl+Shift+[')}
      ${section('View')}
      ${row('Zoom in', 'Z  ·  Ctrl+=')}
      ${row('Zoom out', 'Alt+Z  ·  Ctrl+−')}
      ${row('Zoom to fit', 'Ctrl+0')}
      ${row('Zoom to 100%', 'Ctrl+1')}
      ${row('Toggle panels', 'Tab')}
      ${row('Toggle play / edit', 'F')}
      ${section('File')}
      ${row('Save now', 'Ctrl+S')}
      ${row('Export HTML', 'Ctrl+E')}
      ${row('Undo', 'Ctrl+Z  (coming soon)')}
      ${row('Redo', 'Ctrl+Shift+Z  (coming soon)')}
      ${section('Help')}
      ${row('This dialog', '?')}
    </table>`;

    window.Editor.openModal('Keyboard Shortcuts', html);
  }

  /* ── init ───────────────────────────────────── */

  function init() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);
  }

  return { init, showShortcutsModal };

})();
