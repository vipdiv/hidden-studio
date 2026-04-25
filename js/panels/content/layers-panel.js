/* Layers panel — provides #layersList container and delegates rendering to editor.js */

(function () {
  function render() {
    const root = document.createElement('div');
    root.style.cssText = 'display:flex;flex-direction:column;height:100%;';

    const header = document.createElement('div');
    header.className = 'layers-header';

    const title = document.createElement('span');
    title.className = 'layers-header-title';
    title.textContent = 'Layers';

    const addBtn = document.createElement('button');
    addBtn.className = 'layers-add-folder-btn';
    addBtn.id = 'addFolderBtn';
    addBtn.title = 'New folder group';
    addBtn.textContent = '+ folder';
    addBtn.addEventListener('click', () => window.Editor?.createLayerGroup?.());

    header.appendChild(title);
    header.appendChild(addBtn);

    const list = document.createElement('ul');
    list.className = 'layers-list';
    list.id = 'layersList';

    root.appendChild(header);
    root.appendChild(list);

    // Populate with current project layers
    window.Editor?.renderLayersPanel?.();

    return root;
  }

  window.Panels.register('layers', {
    title: 'Layers',
    render,
    defaultSide: 'right',
    defaultOrder: 0,
  });
})();
