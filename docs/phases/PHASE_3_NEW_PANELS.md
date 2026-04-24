# Phase 3 — Genuinely New Panels

**Status:** Not started
**Estimated sessions:** 1–2 sessions
**Depends on:** Phase 2 complete (existing content migrated, bridge API proven)

---

## Goal

Build the panels that don't exist anywhere in the current codebase. These are net-new features introduced by the new-ui redesign.

Four panels get real content in this phase. History still stays a stub (blocked on Phase 4).

---

## Panels to build

### 1. Hit Zone panel

**What it does:** Configures behavior for Hit Zone layers — the tappable regions where players find hidden objects.

**Controls:**
- Sound picker (dropdown of success sounds — populate from existing sound assets)
- Text label (when tapped, what text appears)
- Text color (color picker)
- Stroke color (color picker — for the zone outline in preview)
- Font size slider (10–48px)
- Font picker (dropdown — use the font list from Settings modal: Caveat, Patrick Hand, Roboto, Georgia)

**Data binding:**
- Selection-aware — when a hit zone is selected, panel shows that zone's config
- When nothing selected or non-hitzone selected, panel shows disabled state with message *"Select a hit zone to edit"*
- Changes save back to the zone's data in `editor.js` on every edit (or on blur for text inputs)

**Where the data lives:** Hit zones are currently in `items[]` with `type: 'hitzone'` (verify this — check `editor.js`). Extend the item schema with the new fields if needed.

### 2. Surprise panel

**What it does:** Same layout and controls as Hit Zone panel, but for Surprise layers. Surprise layers trigger bonus animations/sounds when tapped.

**Controls:** Identical to Hit Zone panel (sound, text, colors, font size, font).

**Implementation note:** Consider building a shared `renderZoneConfigPanel(layerType)` function that both panels call with a type argument. Don't duplicate code.

### 3. Swatches panel

**What it does:** 20-color palette for quick pen/fill color selection.

**Controls:**
- 20 color tiles in a grid (5 cols × 4 rows)
- Click a tile → sets the current pen color
- Editable hex input at bottom (typing a hex updates the current color)
- Optional: right-click tile to "save current color here" (nice-to-have, skip if time-constrained)

**Default palette:** Use the one from `new-ui/Hidden Studio.html` — it's a reasonable starter set. Or pick a balanced palette: black, white, 4 greys, 6 primary/secondary saturated colors, 4 pastel versions, 4 dark/muted versions.

**Data binding:**
- Reads/writes the current pen color — whatever global or module `editor.js` uses for pen state
- When pen tool is active and a color changes, the swatch panel highlights the matching tile (or deselects all if it's a custom color)

### 4. Navigator panel

**What it does:** A minimap showing the whole canvas with a draggable viewport rectangle indicating what's currently on-screen.

**Controls:**
- Thumbnail preview of the canvas (~200×150px)
- Semi-transparent rectangle overlay showing the current viewport
- Click-and-drag the rectangle → pans the main canvas
- Click somewhere in the thumbnail → centers the viewport there
- Zoom slider at bottom (5%–800%, syncs with canvas zoom)

**Wiring to the canvas:**
- Subscribes to `window.Panels.onCameraChange(camX, camY, zoom)` — pushed by `game.js` whenever the user pans or zooms
- On minimap interaction, calls back into `game.js` to set camera position: `Game.setCamera(x, y)` or similar

**Thumbnail generation:**
- Simplest approach: render a scaled-down SVG that mirrors the canvas contents (copy base layer image + bounding boxes for each item)
- Update on a debounce — don't re-render on every mouse move, maybe every 200ms or on significant changes
- Alternative: use `html2canvas` or a `<canvas>` snapshot, but the SVG approach is lighter and usually good enough

### 5. Difficulty panel

**What it does:** Game difficulty configuration — sets limits and behavior for the player experience.

**Controls:**
- Preset buttons: Easy / Medium / Hard (clicking one fills the other fields with preset values)
- Object count to find (number input, default 10)
- Time limit (number input in seconds, 0 = no limit)
- Hints allowed (number input, 0 = no hints)
- Show timer toggle (checkbox)

**Presets:**
- **Easy:** 5 objects, 0 time limit, 3 hints, timer hidden
- **Medium:** 10 objects, 120s, 1 hint, timer shown
- **Hard:** 15 objects, 60s, 0 hints, timer shown

**Data binding:**
- Difficulty config is a new section of the project data model — add a `difficulty: {}` object to the project save/load/export schema
- Values persist to project save/export JSON

---

## Panels still stubbed after Phase 3

- **History** — blocked on undo/redo stack (Phase 4)

---

## Technical notes

### Shared patterns

Most of these panels follow the same pattern:
1. Build DOM from a template string or `createElement` calls
2. Wire event handlers that update `editor.js` / `game.js` state
3. Subscribe to bridge API events for reactive updates
4. Return the DOM node from `render()`

Consider extracting common helpers into `js/panels/content/panel-helpers.js`:
- `makeNumberInput(label, value, onChange, min, max)`
- `makeColorPicker(label, value, onChange)`
- `makeSelect(label, options, value, onChange)`
- `makeSlider(label, value, onChange, min, max, step)`

These should read CSS variables for styling (no hardcoded colors).

### Bridge API additions

Phase 3 may need new bridge events. Add as needed:

```js
window.Panels.notifyToolChange(toolId);   // pen/select/etc — Properties & Swatches react
window.Panels.notifyCanvasUpdate();        // general "redraw minimap" signal for Navigator
```

Keep the API small and explicit — don't add an event for every little thing, just the ones panels need to react to.

---

## Explicitly NOT doing in Phase 3

- History panel content — wait for Phase 4
- Undo/redo stack — Phase 4
- Tablet icon-strip or phone bottom-sheet responsive behavior (should already be working from Phase 1, don't revisit unless broken)
- Performance optimization on the Navigator minimap (accept the debounced redraw for now)
- New aesthetic or layout changes — stay within the theme system from Phase 1

---

## Deliverables

- Five new content modules in `js/panels/content/`:
  - `hitzone-panel.js`
  - `surprise-panel.js`
  - `swatches-panel.js`
  - `navigator-panel.js`
  - `difficulty-panel.js`
- Shared helpers in `js/panels/content/panel-helpers.js`
- Bridge API extended with tool-change and canvas-update notifications
- Project data model extended with `difficulty: {}` section
- All five panels render real content, replacing stubs from Phase 1

---

## Verification checklist

1. Select a hit zone on the canvas. Hit Zone panel shows its config.
2. Change the text color in Hit Zone panel. Click Play mode. Tap the zone. Text appears in the new color.
3. Same flow for Surprise panel with a surprise layer.
4. Click a tile in Swatches. Activate the pen tool. Draw. Line is in the picked color.
5. Type a hex in the Swatches hex input. Current pen color updates.
6. Open Navigator. Pan the main canvas. Minimap viewport rectangle moves accordingly.
7. Drag the minimap viewport rectangle. Main canvas pans.
8. In Difficulty panel, click Easy preset. All four numeric fields fill with easy-preset values.
9. Export project JSON. Verify `difficulty: {}` is in the export.
10. Re-import the exported JSON. Difficulty panel reflects imported values.

---

**When Phase 3 is done, come back and start on `PHASE_4_UNDO_REDO_HISTORY.md`.**
