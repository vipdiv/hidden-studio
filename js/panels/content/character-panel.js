/* Character panel — text styling for selected canvas text objects.
   Phase 2: canvas text only. Phase 3 will route Surprise/Miss-Tap text here. */

(function () {
  function render() {
    const root = document.createElement('div');
    root.id = 'characterPanelRoot';
    root.className = 'character-panel';

    setTimeout(() => window.Editor?.renderCharacterPanel?.(), 0);
    return root;
  }

  window.Panels.register('character', {
    title: 'Character',
    render,
    defaultSide: 'right',
    defaultOrder: 2,
  });
})();
