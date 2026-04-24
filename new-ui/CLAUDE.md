# Hidden Studio — Developer Notes

This file is read automatically by Claude in every chat session for this project.

---

## Project Overview

Hidden Studio is a game-making tool for creating hidden object games. It has an Adobe Illustrator-style panel system with floating/dockable panels, a canvas area, and a Play mode to simulate the game.

The current build (`Hidden Studio.html`) is a **UI prototype** — all panels, tools, and interactions are wired up visually but not yet connected to real game data or export logic.

---

## Architecture

- `Hidden Studio.html` — main app shell, React/Babel, all layout + interaction logic
- `panel-contents.jsx` — panel component definitions (LayersPanel, PropertiesPanel, ProjectPanel, TransformPanel, SwatchesPanel, HistoryPanel, NavigatorPanel, DifficultyPanel, HitZonePanel, SurprisePanel)
- `panel-system.jsx` — PanelGroup component (floating, docking, tab drag/merge, minimize, close)

---

## Layers / Game Structure

| Layer type | Purpose |
|---|---|
| Base Layer | Background image players search |
| Layers | Each entry = one hidden object to find |
| Hit Zone | Tappable area for a hidden object |
| Missed Tap | Penalty zone — triggered when player taps wrong area |
| Surprise | Optional bonus trigger (animation/sound) |
| Font / Text Color / Stroke Color / Font Size / Font Color | Typography styling per layer |

---

## Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| Desktop (≥1024px) | Full panel dock, left toolbar, rulers, full menu bar |
| Tablet (600–1023px) | Icon strip on right, tap to open panel overlay, compact top bar |
| Phone (<600px) | Bottom sheet panels, floating tool picker, compact top bar, no rulers |

---

## Security — Required When Wiring Real Features

### 1. Export (JSON / HTML)
When implementing `Export JSON` and `Export as playable HTML`:
- **Sanitize all layer names** before embedding in exported output — strip or escape `<`, `>`, `"`, `'`, `&` and any script-injectable characters
- **Sanitize project name** the same way
- **Validate exported JSON** against a schema before writing to disk

### 2. File Upload (Base Layer images)
When implementing image upload for Base Layer:
- **Validate file type server-side** — accept only `image/png`, `image/jpeg`, `image/svg+xml`, `image/webp`
- **Validate file size server-side** — enforce a max (e.g. 10MB) to prevent DoS
- **Do not trust the file extension** — check the MIME type from the actual file bytes
- **Sanitize SVG uploads** — SVGs can contain `<script>` tags; strip or sandbox them before rendering

### 3. Deployment
- **Add a Content Security Policy (CSP) header** when deploying:
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:;
  ```
- **Use HTTPS** — required for `requestFullscreen()` API on some browsers
- **Set `X-Frame-Options: SAMEORIGIN`** to prevent clickjacking

### 4. Input Validation (already implemented in UI)
These are already clamped in the prototype — maintain them when wiring real state:
- Font size: 8–72px
- Document dimensions: 1–9999px
- Dim amount: 0–100%
- Layer name max length: 64 chars
- Project name max length: 80 chars

---

## TODO — Wiring Up

- [ ] Connect Layers panel to real canvas object list
- [ ] Wire Transform panel (X, Y, W, H, Rotation) to selected object
- [ ] Wire Properties / Hit Zone / Surprise panels to layer data
- [ ] Implement Export JSON with sanitized output
- [ ] Implement Export as playable HTML (self-contained game file)
- [ ] Implement file upload for Base Layer (with server-side validation)
- [ ] Wire History panel to real undo/redo stack
- [ ] Wire Navigator panel zoom to canvas zoom state
- [ ] Wire Difficulty panel settings to game export
- [ ] Wire Swatches panel to color pickers throughout
- [ ] Add real drawing tools to canvas (Draw, Erase, shapes)
- [ ] Snap-to-grid logic on canvas drag/resize
- [ ] Outline mode rendering

---

## Notes for Claude Code

- The panel system state lives in `App` in `Hidden Studio.html` — `groups` array drives all panel layout
- `PANEL_DEFS` is defined inside `App` so it can close over shared state (projectName, etc.)
- `THEMES` object holds the 3 color themes — Classic, Night Studio, Warm Studio
- `INITIAL_GROUPS` defines the default panel layout — reset via Window → Reset Panel Layout
- Keyboard shortcuts are wired in the `useEffect` keydown handler inside `App`
- `useViewport()` hook drives responsive layout — returns `'phone' | 'tablet' | 'desktop'`
