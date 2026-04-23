# Hidden Studio — Project Handoff

A browser-based editor for building hidden-object games (think *Hidden Folks*, *A Castle Full of Cats*). Built from scanned pen-and-ink drawings. Play mode = tap to find things. Edit mode = place hit zones, import sprites, draw, apply transforms and animations.

Runs as a static site. No backend, no build step. Vanilla JS, no framework.

---

## How to run locally

```
cd hidden-studio
python -m http.server 8000
```

Then open `http://localhost:8000`. **Don't double-click `index.html`** — browsers block multi-file JS over `file://`.

---

## Folder structure

```
hidden-studio/
├── index.html              # shell: HUD, stage, list panel, edit panel, modal
├── styles.css              # all styling
├── assets/
│   └── scene.jpg           # user's original scanned drawing
└── js/
    ├── app.js              # main entry — DOMContentLoaded, mode switching, stage input (pan/tap/draw)
    ├── audio.js            # window.SFX — Web Audio generated sounds + custom sound loading + Freesound search
    ├── animations.js       # window.Anim — combinable CSS animation presets (wiggle, bounce, float, pulse, spin, shake, fadeInOut, breathe, sway, fly, jump, pop)
    ├── sprites.js          # window.Sprites — inline SVG sprites (bird, fish, smoke, mouse, flag, sleeper, spark, heart)
    ├── draw.js             # window.Draw — pen/eraser tool, SVG stroke storage
    ├── projects.js         # window.Projects — localStorage CRUD, autosave, import/export JSON, standalone HTML export
    ├── game.js             # window.Game — play mode: camera, minimap, hit detection, sparkles, surprise reveals
    ├── editor.js           # window.Editor — edit mode: tool switching, selection, property panel, sprite/base transforms, rotate handle
    ├── transforms.js       # window.Transforms — shared rotation/scale/flip + filter (brightness/contrast/saturation/hue/blur/grayscale/invert) helpers
    └── data/
        ├── scene.svg.js    # window.PLANET_SVG — inline SVG for the planet scene
        └── presets.js      # window.PRESET_PLANET / PRESET_SCAN / PRESET_BLANK starter projects
```

Script load order in `index.html` matters — data → transforms → audio → animations → sprites → draw → projects → game → editor → app. Each module defines a `window.X` namespace.

---

## Data model

```js
project = {
  meta: { id, createdAt, updatedAt },
  name: 'Hidden Planet',
  baseType: 'svg' | 'image' | 'empty',
  baseContent: 'PLANET_SVG' | 'assets/scene.jpg' | '<data-url>' | '',
  baseTransform: TransformObject,
  items:     [{ id, name, x, y, r, sound, anim: [] }],        // invisible findable hit zones
  surprises: [{ id, name, x, y, r, sprite, anim: [], sound }], // animated sprite reveals on tap
  sprites:   [{ id, imageData, x, y, w, h, transform, anim: [] }], // imported PNGs
  drawings:  [{ d, color, width }],                            // pen strokes as SVG paths
  customSounds: { [itemId]: dataUrl },                         // uploaded audio
}

TransformObject = {
  rotation: 0,         // degrees
  scale: 1,            // 0.1 to 3
  flipH: false, flipV: false,
  brightness: 1, contrast: 1, saturation: 1, hue: 0,  // hue in degrees
  blur: 0, grayscale: 0, invert: 0,
}
```

Coordinates are in a fixed 1600×1600 world space. Scale fits it to viewport.

---

## Key conventions

- **Edit vs play mode** is controlled by `document.body.classList` (`edit-mode` / `play-mode`). CSS uses these to hide/show hit zones, list panel, edit panel.
- **Autosave** is debounced 800ms via `Projects.scheduleAutosave(project)`. Call `schedSave()` inside `editor.js` after any mutation.
- **Camera** state (`camX, camY, scale`) lives in `Game`. `Editor` reads it via `Game.screenToWorld(x, y)`.
- **No `localStorage` in shared artifacts** — but this isn't an artifact, it's a real static site, so localStorage is fine.
- **Custom sounds** are stored as data URLs in `project.customSounds` and re-loaded into the AudioContext on project open via `Editor.loadProjectAssets()`.
- **Transforms** are applied via `window.Transforms.applyTo(element, transformObject)`. The module also exposes `renderUI()` / `wireUI()` for slider panels.

---

## Standalone HTML export

`Projects.exportHtml(project)` produces a self-contained playable HTML file with all assets inlined (base layer, sprites, drawings, sounds, transforms). The template is `STANDALONE_TEMPLATE` at the bottom of `projects.js`. It has its own tiny `xfCss()` transform builder because the main `Transforms` module isn't included in the export.

**When adding new features that affect play-mode rendering, update the template too** or exports will be missing functionality.

---

## Current state (as of this handoff)

✅ Shipped:
- Play/Edit mode toggle
- 3 starter projects (Planet, Original Scan, Blank)
- Hit zone editor (place, name, resize, drag)
- Pen/eraser drawing tools (5 colors, variable size)
- Image import as sprite overlays
- Per-item custom sound upload + Freesound.org search button
- Animation chips (combinable — e.g. wiggle + float)
- Multi-project localStorage with named projects and autosave
- Export as JSON / Import JSON
- Export as standalone playable HTML
- Full transform + filter controls on base layer AND sprites (rotation, scale, flipH/V, brightness, contrast, saturation, hue, blur, grayscale, invert)
- Drag-to-rotate handle on selected sprites (Shift = 15° snap)

🔜 Ideas for Phase 2:
- Keyframe-based custom animations (currently only preset combos)
- Multi-scene / scene linking (doorways between rooms)
- Undo/redo
- Full Freesound API integration (requires OAuth — not static-site-friendly)
- Mobile touch rotation for sprites (currently only single-pointer drag; two-finger rotation would be nice)
- Snap-to-grid for hit zone placement

---

## Gotchas / things to know when editing

1. **Never use `localStorage` or `sessionStorage` inside React artifacts** — irrelevant here since this is a real static site, but worth flagging.
2. **The `js/data/scene.svg.js` file is big** (~14KB of inline SVG). Don't try to inline-expand it in other files.
3. **Script order in index.html** is load-order-sensitive. Data files first, then transforms (used by editor & projects), then everything else, app.js last.
4. **`world` element is 1600×1600 regardless of base layer** — all coordinates are in this space. `Game.scale` fits it to viewport.
5. **Pointer events on the stage** are tangled: app.js handles stage-level pan/tap/draw. Hit zones and sprites have their own pointer handlers that `stopPropagation()`. When adding new interactive elements, decide carefully whether to let clicks bubble.
6. **Sprite selection is tap-vs-drag based** — pointerdown → pointerup with movement under 3px = select, otherwise = drag-move. Don't break that.
7. **Browsers block mixed content** — if hosting over HTTPS, ensure no `http://` URLs leak in (Freesound link opens in new tab, which is fine).
8. **Safari haptics** — `navigator.vibrate()` is Android-only. Already handled with feature check.

---

## Recent change log

- Added `js/transforms.js` module (shared rotate/scale/flip/filter helpers)
- Added "Rotate & adjust base layer" expandable panel to edit sidebar
- Sprites now have full transform panels + draggable rotate handle
- Standalone HTML export now carries all transforms
- Sprite data model changed: `rotation` field → `transform` object (backward-compatible on load)
- `Editor.setProject()` now normalizes transforms on load (missing fields filled with defaults)

---

## Design aesthetic

Warm sketchbook / cream paper + deep navy space. Fonts: **Fraunces** (serif, for body/UI) and **Caveat** (handwriting, for labels and chips). Hit-zone "found" marks are drawn as hand-sketched red pencil circles. Keep any new UI consistent with this — no flat material design, no slick gradients, lean into the handmade vibe.
