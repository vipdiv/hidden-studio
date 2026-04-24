# Phase 5 — Polish, Build Step, Wishlist

**Status:** Not started
**Estimated sessions:** 1–2 sessions, highly optional per item
**Depends on:** Phase 4 complete — or skip items that don't depend on Phase 4

---

## Goal

Cleanup pass. This is a grab-bag of polish items that don't justify their own phase but accumulate value when done together. Pick what matters, skip what doesn't.

By the end of Phase 4 you have a fully functional app. Phase 5 is optional — do it in pieces as needs arise, not all at once.

---

## Items to consider (ordered by likely value)

### 1. Real build step (Vite)

**Why:** Phase 1 uses Babel standalone in the browser — fine for development, but cold-start is slow for users and bundle size isn't optimized. A real build step gives you:
- Faster page load (pre-compiled JSX, tree-shaken React)
- Minified output
- Source maps for debugging
- Dev server with hot reload

**How:**
- Add Vite config (`vite.config.js`)
- Move JSX files to `.jsx` extension if not already
- Update `index.html` to reference `main.jsx` entry instead of individual script tags
- Add `npm run dev` and `npm run build` scripts
- Deploy output from `dist/`

**Watch for:** Don't break the vanilla-JS side. Vite handles JSX transpilation and module resolution, but make sure `editor.js`, `game.js`, `app.js` still load as they did. They should — Vite handles plain JS fine.

**Skip if:** You're deploying as a single HTML file that people download (like `Hidden Studio Standalone.html`). In that case, Babel standalone is actually the right choice — no build step means the file is self-contained.

---

### 2. Popout windows for multi-monitor

**Why:** You mentioned wanting to arrange panels on multiple monitors for detailed artwork. Floating panels from Phase 1 live inside the browser window — they can't cross monitors without OS help. Popouts open a real new browser window on another display.

**How:**
- Add a `⧉` popout button to each panel's header (next to `▾` and `×`)
- Click → `window.open('', `panel-${id}`, 'width=300,height=500')` opens a new window
- Render the panel's content into the new window's document
- Use `BroadcastChannel` to sync state between main window and popout
- Close the popout → panel returns to the dock

**Watch for:** Popups may be blocked by browsers. Document the first-click permission requirement. Handle popout close gracefully (return panel to dock, don't lose state).

**Skip if:** You haven't actually started doing multi-monitor work yet. Build this when you need it, not speculatively.

---

### 3. Tablet icon-strip polish

**Why:** Phase 1 sets up the tablet responsive mode, but the icon strip is probably rough. Phase 5 polish:
- Better icon selection (match the left toolbar style — inline SVG, not text unicode)
- Smoother slide-in animation for the panel overlay
- Tap-outside-to-close behavior
- Swipe gesture to dismiss the panel overlay

**Skip if:** You don't actually use the app on a tablet.

---

### 4. Start screen redesign

**Why:** The current start screen is explorer-style (sidebar + project table). It works but doesn't match the new UI aesthetic. Phase 5 polish:
- Match theme system — start screen uses the same CSS variables
- Richer project cards (show thumbnail of base layer)
- Better empty state (when no projects exist)
- Maybe add "Recent projects" section

**Skip if:** You rarely see the start screen and it's not bugging you.

---

### 5. Settings actually work

**Why:** The Settings modal from Phase 1 has inputs that don't wire to anything. Phase 5:
- Auto-save checkbox + interval → actually schedule periodic saves to localStorage
- Default canvas size → used when creating new projects
- Default difficulty / default font → applied to new projects
- Grid size → actually changes the grid spacing
- Render quality → affects canvas rendering (high/medium/low)
- Minify export → actually minifies the exported HTML

**Approach:** Create `js/settings.js` that reads/writes to `localStorage['hiddenstudio.settings']` and exposes `Settings.get(key)` / `Settings.set(key, value)`. Relevant modules read settings on startup.

**Skip if:** The defaults are fine and you don't need to change them.

---

### 6. Export improvements

**Why:** The current HTML export is functional but could be better:
- Smaller output (tree-shaking unused code)
- Option to embed vs. link external assets
- Preview export before download
- Bundle report (what's in the exported file + sizes)

**Skip if:** Current export is good enough.

---

### 7. Performance pass

**Why:** After 4 phases of new features, the app may be slower than when it started. Profile and fix:
- Canvas redraws that could be debounced
- Panel re-renders that happen too often
- Large drawing operations that block the UI thread
- Memory leaks from not cleaning up event listeners

**Approach:** Open DevTools performance tab, record 30 seconds of typical use, look for long frames and heavy functions. Fix the worst offenders.

**Skip if:** App feels fast enough.

---

### 8. Documentation updates

**Why:** HANDOFF.md is stale after 4 phases of changes. Update:
- Architecture section (islands approach, bridge API)
- Panel system overview
- How to add a new panel
- Theme system
- Build/deploy instructions (if Vite added)

**Skip if:** You're the only dev and you remember how everything works.

---

### 9. Test coverage

**Why:** No automated tests currently. Consider:
- Unit tests for `History` undo/redo logic
- Unit tests for the panels API
- Visual regression tests for panel layouts (overkill maybe)

**Tooling:** Vitest pairs well with Vite. Keep it light — a handful of tests on the critical paths, not a full suite.

**Skip if:** You trust manual testing and the app isn't mission-critical.

---

## How to approach Phase 5

Don't do all of these. Pick one or two that match what you're actually hitting friction on.

Good signals to prioritize an item:
- "This bothers me every time I use the app" → do it
- "I want to ship this to other people" → build step + export improvements
- "I'm thinking about doing art on dual monitors" → popout windows
- "The app feels sluggish" → performance pass

Bad signals to prioritize:
- "It would be nice to have"
- "It's on the wishlist"
- "Claude Code suggested it"

Ship what you need, ignore the rest.

---

## Deliverables

Whatever you picked. Each item above can be its own mini-session with Cody. Write a focused brief for the item, don't try to do three at once.

---

## After Phase 5

You're done. Go make some hidden object games.

If new ideas come up later, start a new phase file. Don't pile them into an existing phase retroactively.
