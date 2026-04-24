# Hidden Studio — Keyboard Shortcuts

Adobe/Photoshop-style shortcuts. All shortcuts are handled by `js/shortcuts.js`.

**Suppression rules:**
- All shortcuts are suppressed while the cursor is in any `<input>`, `<textarea>`, or contenteditable element (e.g. the rename field).
- Edit-mode-only shortcuts do nothing in play mode.
- Exception: **F** (toggle mode), **Spacebar** (pan), and **?** (help) work in both modes.

---

## Tools

| Shortcut | Action |
|----------|--------|
| `V` | Select / Move tool |
| `H` | Hand tool (pan — all clicks pan, hit zones are non-interactive) |
| `P` | Pen (draw on scene) |
| `E` | Eraser |
| `I` | Import image as sprite (opens file picker) |
| `T` | Add hit zone (find-it item) |
| `S` | Add surprise |
| `Spacebar` (hold) | **Temporary pan** — saves current tool, pans while held, restores on release (Photoshop muscle-memory) |

---

## Object Operations

| Shortcut | Action |
|----------|--------|
| `Esc` | Deselect everything |
| `Delete` / `Backspace` | Delete selected object |
| `Ctrl+D` | Duplicate selected object (offset +20 px) |
| `↑ ↓ ← →` | Nudge selected object 1 px |
| `Shift + ↑ ↓ ← →` | Nudge selected object 10 px |
| Rotate handle + `Shift` | Snap rotation to 15° increments |

---

## Layer Order (sprites only)

| Shortcut | Action |
|----------|--------|
| `Ctrl+]` | Bring forward one step |
| `Ctrl+[` | Send backward one step |
| `Ctrl+Shift+]` | Bring to front |
| `Ctrl+Shift+[` | Send to back |

---

## View

| Shortcut | Action |
|----------|--------|
| `Z` | Zoom in |
| `Alt+Z` | Zoom out |
| `Ctrl+=` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Scroll wheel` | Zoom in/out, cursor-centred (trackpad pinch works too) |
| `Ctrl+0` | Zoom to fit (center on scene) |
| `Ctrl+1` | Zoom to 100% |
| `Tab` | Toggle all panels (distraction-free canvas view) |
| `F` | Toggle play / edit mode |

---

## File

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Force-save now (flushes autosave immediately) |
| `Ctrl+E` | Export as standalone playable HTML |
| `Ctrl+Z` | Undo *(coming soon)* |
| `Ctrl+Shift+Z` | Redo *(coming soon)* |

---

## Help

| Shortcut | Action |
|----------|--------|
| `?` | Open keyboard shortcuts modal |

---

## Menu bar

The **File / Edit / View / Help** menu bar at the very top of the screen (`js/menu.js`) mirrors the most common actions. Clicking a menu item is equivalent to the keyboard shortcut shown in the same row.

---

## Notes for contributors

- **All shortcut handling lives in `js/shortcuts.js`** — do not add `keydown` listeners elsewhere.
- The `isTyping()` guard checks `document.activeElement` for `INPUT`, `TEXTAREA`, or `isContentEditable`. Any new inline-edit widget should be an `<input>` so it gets suppression automatically.
- `window.App.setMode(m)` is exposed by `js/app.js` for the F-key toggle. `window.Editor.getProject()`, `duplicateSelected()`, `nudgeSelected()`, `bringForward()` etc. are exposed by `js/editor.js` for the shortcut module.
- Undo/redo shortcuts (`Ctrl+Z` / `Ctrl+Shift+Z`) are captured and `preventDefault`'d to prevent browser interference, but the history stack is not yet implemented. When undo ships, wire it in `shortcuts.js` under those keys.
- `Ctrl` and `Cmd` (Mac) are both handled via `e.ctrlKey || e.metaKey` in `shortcuts.js`.
