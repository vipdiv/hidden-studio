# Phase 2 — Content Migration

**Status:** Not started
**Estimated sessions:** 1 session
**Depends on:** Phase 1 complete (panel shell working with stubs)

---

## Goal

Migrate existing functionality from the old edit panel and properties panel into the real panel stubs created in Phase 1. No new features — just move working code into new homes.

The Phase 1 stubs stay as-is for panels that need new implementation (Phase 3). This phase handles the panels whose content already exists somewhere in the current codebase.

---

## What currently exists that needs moving

### Current edit panel sections (left side, from `index.html` + `editor.js`)

1. **Pen options** — color swatches, size slider, opacity, dash style
2. **Base layer** — image upload, transform accordion (rotation/scale/flip + filters)
3. **Layers list** — items + surprises + sprites flat list, eye/lock toggles, drag reorder, "Add" buttons
4. **Miss tap** — sound + styling for wrong-tap penalty
5. **Project actions** — rename, export JSON, export HTML, clear drawings, project stats

### Current properties panel (right side, shows when `body.has-selection`)

- Transform accordion: rotation/scale/flip + brightness/contrast/saturation/hue/blur/grayscale/invert
- Rendered via `window.Transforms.renderUI()` / `wireUI()`

---

## Migration map — where each piece goes

| Current location | New panel | Notes |
|---|---|---|
| Layers list section | **Layers** panel | Keep the same data model — items[] + surprises[] + sprites[] + drawings[] shown as a unified list. Preserve eye/lock toggles, drag-reorder, Add buttons. |
| Base layer section | **Project** panel | Base layer image upload + base image transform goes under Project. Not a standalone panel. |
| Pen options | **Properties** panel (contextual) | When pen/brush tool is active, Properties panel shows pen options. When a sprite is selected, Properties shows the selected object's properties. Tool-aware content. |
| Miss tap | **Properties** panel (contextual) | When a missed-tap layer is selected, or as a default section when nothing else is selected. TBD — pick whichever is less jarring. |
| Project actions (rename, export, stats, clear drawings) | **Project** panel | All project-level actions consolidated here. |
| Transform accordion (rotation/scale/flip) | **Transform** panel | Wire to `Game` selection state — show current selection's transform values, edit live. |
| Filter accordion (brightness/contrast/etc) | **Properties** panel | Filters are image-property-like, belong in Properties when a sprite/image is selected. |

---

## Panels touched in Phase 2

- **Layers** — replace stub with real content (migrate from edit panel)
- **Project** — replace stub with real content (base layer + project actions)
- **Properties** — replace stub with real content (filters + pen options + miss tap, tool/selection-aware)
- **Transform** — replace stub with real content (from existing Transforms module)

## Panels left as stubs after Phase 2

- Hit Zone, Surprise, Swatches, Navigator, Difficulty, History

These either need new implementation (Phase 3) or depend on features that don't exist yet (History = Phase 4).

---

## Technical approach

### Using the panel API from Phase 1

Each vanilla module now returns DOM nodes for its panel's `render()` method:

```js
// In editor.js or a new js/panels/content/layers-panel.js
function renderLayersPanel() {
  const el = document.createElement('div');
  el.className = 'layers-panel-body';
  // ... build the DOM using existing edit-panel logic
  return el;
}

window.Panels.register('layers', {
  title: 'Layers',
  render: renderLayersPanel,
  defaultSide: 'right',
  defaultOrder: 0,
});
```

### Selection-aware panels (Transform + Properties)

These panels re-render or update when selection changes. Use the bridge API:

```js
// In editor.js — when selection changes:
window.Panels.notifySelectionChange(selectedObject);

// In the panel content module:
window.Panels.onSelectionChange((sel) => {
  // Update Transform panel inputs to show sel.x, sel.y, sel.rotation, etc.
});
```

### Where to put the panel content code

Create a new folder: `js/panels/content/`. One file per panel:

- `js/panels/content/layers-panel.js`
- `js/panels/content/transform-panel.js`
- `js/panels/content/properties-panel.js`
- `js/panels/content/project-panel.js`

Each file exports a `render()` function and registers with `window.Panels` on load. They can freely reach into `editor.js`, `game.js`, `window.Transforms`, etc. — they're vanilla code sharing the same globals.

---

## Old DOM cleanup

After migration, remove from `index.html`:

- Old `#edit-panel` div and all its sections
- Old `#properties-panel` div
- Related CSS in `styles.css` for `.edit-panel`, `.properties-panel`, `.xf-details` (if only used there)
- `body.has-selection` and `body.panel-off-editor` class handlers (no longer needed — panel visibility is managed by `window.Panels`)

Keep `editor.js` functions that build the panel content — they now get called by the panel module wrappers instead of on page load.

---

## Explicitly NOT doing in Phase 2

- Hit Zone, Surprise, Swatches panels — content doesn't exist yet, Phase 3
- Navigator minimap wiring — Phase 3
- Difficulty panel — new feature, Phase 3
- History panel — blocked on undo/redo (Phase 4)
- New visual styling — use the CSS variables set up in Phase 1
- New features inside migrated panels — just move, don't expand

---

## Deliverables

- New folder `js/panels/content/` with four content modules (layers, transform, properties, project)
- Four stubs replaced with real content
- Old `#edit-panel` and `#properties-panel` markup removed from `index.html`
- Old edit-panel/properties-panel CSS cleaned up (kept only if reused)
- Bridge API extended: `notifySelectionChange` and `onSelectionChange` working end-to-end
- All existing functionality (layer toggles, transforms, exports, base image upload) still works — just in new locations

---

## Verification checklist

1. Open the app. Layers panel shows the current project's layers exactly as before.
2. Click a sprite on the canvas. Transform panel updates to show its X/Y/rotation.
3. Drag a layer in the Layers panel to reorder. Canvas reflects the change.
4. Upload a base image via Project panel. Image appears on canvas.
5. Export JSON from Project panel. File downloads correctly.
6. Switch tools. Properties panel content updates to reflect the active tool (pen options when pen is active).
7. Close the Layers panel via `×`. Window menu shows it unchecked. Click in Window menu to reopen — content is intact.
8. Float the Transform panel off the dock. Edit values. Changes still apply to the canvas selection.

---

**When Phase 2 is done, come back and start on `PHASE_3_NEW_PANELS.md`.**
