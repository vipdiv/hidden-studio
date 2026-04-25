/* Layers panel — provides #layersList container and delegates rendering to editor.js */

console.log("LAYERS_PANEL_CONTENT_LOADED");

(function () {
  function render() {
    console.log("LAYERS_PANEL_RENDERED");

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
    list.style.cssText = 'overflow-y:auto;max-height:340px;';

    root.appendChild(header);
    root.appendChild(list);

    // Defer until after the node is appended to the document by PanelContent
    setTimeout(() => window.Editor?.renderLayersPanel?.(), 0);

    return root;
  }

  window.Panels.register('layers', {
    title: 'Layers',
    render,
    defaultSide: 'right',
    defaultOrder: 0,
  });

  console.log("LAYERS_PANEL_REGISTERED");
})();
