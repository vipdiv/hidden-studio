# Phase 1 — New UI Shell (React Island + Vanilla Core)

**Status:** Not started
**Estimated sessions:** 1 focused session
**Depends on:** Nothing — this is the foundation

---

## Architecture decision

We're using an **islands architecture**. The panel system is a React island mounted into the vanilla app. Everything else — canvas, tools, editor.js, game.js, app.js — stays vanilla JavaScript. React only owns the panel dock.

### Why this architecture

Panels are the hardest part of the redesign (floating, docking, merging tabs, z-index, drag-to-split). React's reactive model is a natural fit for that. The rest of the app is working vanilla code we don't want to rewrite. Keeping React isolated to panels means:

- We reuse the existing `panel-system.jsx` logic from `new-ui/` (minimal translation)
- `editor.js`, `game.js`, `app.js`, `menu.js` stay untouched in structure
- The two worlds communicate through a small explicit API, not by intermingling

---

## In scope — full new-ui visual redesign

### Visual shell (vanilla — plain DOM/CSS)

- New menu bar (24px): File / Edit / View / Window / Help + centered project name + right-side Play/Edit toggle + fullscreen
- New left tool strip (36px desktop, 44px tablet) with proper inline SVG icons (no emoji)
- Tool tooltips show shortcut hints: `Hand (H)`, `Select (V)`, etc.
- Rulers on top + left edges, toggleable via View menu (`⌘R`)
- Grid as scalable SVG pattern, toggleable (`⌘'`)
- Zoom % badge bottom-left of canvas (shows `· snap` when snap-to-grid on)
- Status bar at bottom (20px, desktop/tablet only)
- Outline mode (white canvas bg, `⌘Y`)
- Hit zone preview overlay (`⌘⇧H`)
- Play mode overlay with clickable find-object circles

### Panel system (React island)

- Mounts into `<div id="panel-root">` — a React tree that owns only the panel dock area (left dock column, right dock column, floating layer)
- Full new-ui panel behavior: dock left/right, float anywhere, drag header to detach, drop near dock edge to re-dock, drag tab out to split into new floating group, drag tab onto another panel header to merge
- `▾` collapse toggle, `×` close button per panel
- Canvas is NOT inside the React tree — it stays as vanilla DOM

### Themes (four)

Implement via CSS custom properties on `body[data-theme=...]`. Both vanilla and React sides read the same CSS vars — no separate theme systems.

1. `classic` — Illustrator grey (default)
2. `night` — dark navy/purple
3. `warm` — dark amber/brown
4. `paper` — light/white (new, not in mockup — create this)

Token names: `--panel-bg`, `--panel-header-bg`, `--panel-border`, `--text`, `--dim-text`, `--accent`, `--canvas-bg`, `--app-bg`, `--menu-bg`, `--dock-bg`. No hardcoded colors anywhere.

Theme switcher in Window menu, persisted to localStorage. Theme change updates `data-theme` attribute — CSS vars cascade, no re-render needed.

### Window menu (vanilla side)

- Lists every panel by name with green check when visible, click toggles
- Separator, theme list with check on current
- Separator, "Reset Panel Layout"
- Window menu calls React island's API (see below)

### New modals (vanilla — plain DOM, not React)

- Keyboard Shortcuts (4-section grid: Tools / View / Edit / Panels)
- Documentation (sidebar nav + content pane)
- Settings (General / Default Canvas / Export / Game Defaults / Panels on-off list)

### Responsive

- Desktop (≥1024px): full shell, both docks visible
- Tablet (600–1023px): compact 48px top bar (hamburger + name + Play/Edit), left tool strip stays, right dock replaced by 52px icon strip — tap icon → panel slides in as overlay
- Phone (<600px): 48px top bar, no left tool strip (floating circular tool picker bottom-left instead), no rulers, no status bar, panels as bottom sheets

---

## The bridge API between vanilla and React

Expose one global `window.Panels` object — the ONLY communication channel between the two worlds.

```js
window.Panels = {
  // Panel visibility & layout
  show(panelId),
  hide(panelId),
  toggle(panelId),
  resetLayout(),
  isVisible(panelId),  // for Window menu checkmarks

  // Theme
  setTheme('classic' | 'night' | 'warm' | 'paper'),
  getTheme(),

  // Register a panel's content renderer (vanilla DOM returned, mounted inside React panel shell)
  register(panelId, {
    title,           // string shown in header
    render(),        // returns an HTMLElement — vanilla panels provide a DOM node, React embeds it
    defaultSide,     // 'left' | 'right'
    defaultOrder,    // number
  }),

  // Events vanilla can subscribe to (React calls these when user interacts with panel UI)
  onLayoutChange(fn),    // fn({ visibility, positions })
  onThemeChange(fn),     // fn(themeName)

  // Events React listens for (vanilla calls these when state changes)
  notifySelectionChange(selection),   // when user selects a sprite/zone — Transform & Properties panels react
  notifyZoomChange(zoom),             // Navigator panel minimap syncs
  notifyCameraChange(camX, camY),     // Navigator minimap viewport syncs
};
```

**Key design rule:** panel *content* is rendered by vanilla code (returns DOM nodes). React only owns the *panel shell* — the dock, header bar, drag handles, floating container, tab strips. This means panel bodies can directly manipulate the same DOM/state that editor.js does. No React-to-vanilla data serialization needed.

---

## Technical setup

- Add React 18 + ReactDOM + Babel standalone via script tags in `index.html` (same pattern as `new-ui/Hidden Studio.html` already uses)
- New file: `js/panels/panel-system.jsx` — translated/adapted from `new-ui/panel-system.jsx`
- New file: `js/panels/panels-api.js` — the `window.Panels` bridge
- New file: `js/panels/mount.jsx` — bootstraps the React root into `#panel-root`
- The React code loads via `<script type="text/babel">` tags — no build step required for now
- Keep all vanilla files (`editor.js`, `game.js`, `app.js`, `menu.js`) as plain JS — they should have zero React imports

---

## Panel stubs — Phase 1

Register all 10 panels as stubs with placeholder bodies. Content migration is Phase 2. Panel list:

- Layers, Transform, Properties, Hit Zone, Surprise, Swatches, Navigator, Difficulty, Project
- **History** — stub with body text: *"History will be available after undo/redo lands."* Do NOT build the history list UI yet.

---

## Explicitly NOT doing in Phase 1

- Panel content implementation (Phase 2 — migrate existing edit-panel sections)
- Wiring Navigator to real camera, Transform to real selection (Phase 2/3)
- Building undo/redo stack (Phase 4)
- Converting editor.js/game.js/app.js to React
- Touching tool logic beyond wiring new SVG icons to existing tool strings
- Build step / bundler setup — use Babel standalone in the browser for now

---

## Deliverables

- Updated `index.html` with:
  - New menu bar, SVG tool strip, rulers, status bar, canvas wrapper, modal containers (all vanilla)
  - `<div id="panel-root">` where React mounts
  - React + Babel script tags
- New CSS (split as `shell.css` for vanilla chrome + `panels.css` for panel dock, or merged into `styles.css`) with CSS variables defined for all 4 themes
- Updated `menu.js` — new Window menu calling `window.Panels.toggle()` and `window.Panels.setTheme()`
- New React module files (see Technical setup above)
- Three new modal components: Keyboard Shortcuts, Documentation, Settings (all vanilla)
- All 10 panels registered as stubs so the island can be inspected end-to-end
- Theme swap verified live (no reload)
- Panel drag/float/dock/merge/split all working with stub panels

---

## Verification checklist — do not declare Phase 1 done until all pass

1. Open the app. Menu bar, tool strip (SVG icons), rulers, status bar all render correctly.
2. All 10 panels appear as stubs in the right dock.
3. Drag a panel header → panel detaches and floats.
4. Drag a floating panel near the right edge → re-docks.
5. Drag a tab out of a panel group → splits into its own floating panel.
6. Drag a tab onto another panel's header → merges into that group.
7. `window.Panels.setTheme('paper')` in console flips all four theme surfaces (chrome + panels) instantly with no reload.
8. Window menu checkmarks update when panels are closed/opened.
9. Canvas (`#stage`) is still a vanilla DOM node — confirm React DevTools shows no React tree inside it.
10. `editor.js`, `game.js`, `app.js` have zero `import React` statements.

---

## Things to push back on if Cody suggests them

1. **"Let me convert everything to React."** No. Panel shell only. That's the whole point of the island architecture.
2. **"Let me set up Vite/Webpack for a proper build step."** Not yet. Babel standalone in the browser is fine for Phase 1. We can add a real build step in a later phase if bundle size or cold-start becomes an issue.
3. **"Let me skip the React island and just build panels in vanilla."** No. We're using React because the panel state machine is genuinely complex. Vanilla panels is 2500+ lines of bookkeeping. React panels is ~700 lines.

---

**When Phase 1 is done, come back and start on `PHASE_2_CONTENT_MIGRATION.md`.**
