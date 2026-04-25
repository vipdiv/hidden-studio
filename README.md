# Hidden Studio

**Make and play your own hidden object games — entirely in the browser.**

No account, no server, no build step. Everything saves locally.

🔗 **Live app:** [vipdiv.github.io/hidden-studio](https://vipdiv.github.io/hidden-studio/)

---

## What it is

Hidden Studio is a browser-based game maker for hidden object games (think Where's Waldo). Draw or import a scene, place circular hit zones over the things you want players to find, then share the game as a single standalone HTML file.

**Current version:** 1.0 — see Help → About Hidden Studio inside the app for full release notes.

---

## What's new in 1.0

- **Layer renaming** — double-click any layer (items, sprites, text, strokes, shapes) to rename it inline
- **Smart shape labels** — shapes are now labeled by type ("Star 1", "Rectangle 2", "Ellipse 3") with chronological per-kind numbering
- **Image auto-compression** — uploaded base images are resized and JPEG-encoded down to under 500 KB; before/after sizes shown
- **Numbered rulers** — rulers display measurement labels with major/minor ticks; click any ruler to toggle inches ↔ centimetres
- **Mode-aware UI** — every editor-only chrome element disappears in play mode (back, ?, FABs, panel dock, Window > Panels list); the find checklist disappears in edit mode
- **Right-side dock collapse** — the panel dock has its own «/» toggle, mirroring the editor panel; state persists
- **Standalone HTML export polish**
  - Find panel is collapsible (◁ / 📋 toggle) and the camera centers in the available area instead of being hidden behind the panel
  - Mouse wheel and trackpad zoom around the cursor; works anywhere on the page
  - Mobile (< 640 px): panel becomes a bottom sheet with a "📋 Find list" pill
  - Auto-collapses on narrow desktop windows (640–900 px)
- **Better modals** — Documentation and Release Notes are now capped at 85 vh with internal scroll instead of stretching off-screen
- **Storage clarity** — project list size column shows MB for files ≥ 1 MB
- **"Make your own" attribution** — exported HTML files include a subtle link back to the [Hidden Studio repo](https://github.com/vipdiv/hidden-studio) and a prominent invite inside the win card
- **Security hardening** — item names, easter-egg image URLs, sprite image data, and base image data in exported HTML are now rendered via `createElement` + URL allow-list (was string-concatenated into `innerHTML`); a malicious imported JSON can no longer cause script execution in a recipient's browser when they open a shared HTML file

---

## Getting started (local dev)

```bash
python -m http.server 8000
# then open http://localhost:8000
```

No dependencies, no build step. Plain HTML + CSS + vanilla JS.

---

## Features

### Project management
- Explorer-style project list with sorting, bulk export, and bulk delete
- Three starter templates: Hidden Planet (built-in SVG), Original Scan (textured background), Blank Canvas
- Import / export projects as JSON
- Export any project as a **standalone playable HTML file** — single file, no editor, works fully offline
- Auto-save to `localStorage` every 800 ms; force-save with Ctrl+S

### Editor tools
| Tool | Key | What it does |
|------|-----|-------------|
| Select | V | Click to select and drag objects |
| Pan | H | Drag the canvas to navigate |
| Pen | P | Freehand drawing with stroke smoothing |
| Eraser | E | Erase drawing strokes |
| Shapes | — | Rectangle, Ellipse, Star |
| Hit Zone | T | Drag to place a circular "find me" zone |
| Surprise | S | Place a hidden reward trigger |
| Text | X | Add styled text labels |
| Import Image | I | Upload PNG/JPG as a sprite or base layer |
| Crop | C | Trim the canvas to a specific region |

### Layers & canvas
- Layers panel with drag-to-reorder, groups, show/hide, inline rename
- Custom canvas size (default 1600 × 1600 px)
- Minimap with click-to-jump navigation
- Fit canvas to imported image automatically

### Base layer
- Upload any image (PNG/JPG/SVG); large rasters are auto-compressed to under 500 KB
- Position, rotation, scale, flip, and full filter controls
- Crop preserves pixel dimensions so the image never shrinks unexpectedly

### Items & surprises
- **Items** — circular hit zones players must find (count toward the total)
- **Surprises** — optional secrets that don't affect the found counter; reveal with sprite animations
- Per-item custom sound (11 presets or upload MP3/WAV)
- Per-item Easter egg: floating popup, fullscreen overlay, or screen shake — with custom image, text, audio

### Sprites, animations & effects
- 8 built-in SVG sprites (bird, fish, smoke, mouse, flag, sleeper, spark, heart)
- Import custom PNG/JPG images as sprites
- 9 looping animations: wiggle, bounce, float, pulse, spin, shake, fade, breathe, sway
- 3 one-shot reveal animations: pop-in, fly across, jump up
- Stack multiple animations on one object
- CSS filter effects: brightness, contrast, saturation, hue rotation, blur, grayscale, invert

### Play mode
- Tap/click to search; circular collision detection
- "Found!" / "Miss!" / "Nope!" popups with animations and haptic feedback
- SVG checkmark drawn on successful finds
- Win screen when all items are found
- Sound toggle; Web Audio API synthesised sounds (no audio files required)
- Separate secrets counter for surprises

### Offline & PWA
- Service Worker caches the full app shell on first visit
- Fully functional offline on every subsequent visit
- Installable as a PWA (Add to Home Screen)
- All data in `localStorage` — no server required

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| V / H / P / E / T / S / X / C / I | Switch tools |
| F | Toggle play / edit mode |
| Z / Alt+Z | Zoom in / out |
| Ctrl+0 | Zoom to fit |
| Ctrl+1 | Zoom to 100% |
| Ctrl+S | Save now |
| Ctrl+E | Export HTML |
| Ctrl+D | Duplicate selected |
| Del / Backspace | Delete selected |
| Arrow keys | Nudge 1 px |
| Shift+Arrow | Nudge 10 px |
| Ctrl+] / Ctrl+[ | Bring forward / send backward |
| Tab | Toggle all panels |
| ? | Keyboard shortcuts reference |

---

## File structure

```
index.html          — app shell and markup
styles.css          — main styles
styles-panels.css   — panel system + canvas chrome (rulers, grid)
sw.js               — service worker (offline/PWA)
manifest.json       — PWA manifest
js/
  app.js            — start screen, project load/save orchestration
  editor.js         — all editor tools, panels, modals
  game.js           — play mode, camera, pan/zoom
  menu.js           — menu bar actions, About modal
  projects.js       — localStorage CRUD, import/export, standalone HTML export
  shortcuts.js      — keyboard shortcuts, rulers, status bar
  draw.js           — pen, eraser, shape tools
  sprites.js        — built-in SVG sprite library
  audio.js          — Web Audio sound engine
  animations.js     — CSS animation system
  transforms.js     — transform/filter controls
  easter-eggs.js    — Easter egg runtime (editor + play)
  panels/
    panels-api.js   — panel registration bridge
    panel-system.jsx — dockable / floating panel system
    mount.jsx       — panel dock + collapse state
  data/
    presets.js      — starter project templates
    scene.svg.js    — built-in planet SVG data
    easter-eggs.js  — Easter egg definitions
    changelog.js    — app version history (powers Help → About)
assets/
  scene.jpg         — Original Scan base image
```

---

## Version history

Full release notes for each version are available inside the app at **Help → About Hidden Studio**.

---

## localStorage schema

All projects are stored under the key `hidden-studio:projects` as a JSON object keyed by project ID:

```json
{
  "p_abc123": {
    "name": "My Game",
    "meta": { "id": "p_abc123", "createdAt": 1714000000000, "updatedAt": 1714000000000 },
    "items": [],
    "surprises": [],
    "drawings": [],
    "sprites": [],
    "texts": [],
    "baseType": "image",
    "baseContent": "data:image/png;base64,...",
    "docWidth": 1600,
    "docHeight": 1600
  }
}
```
