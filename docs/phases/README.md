# Hidden Studio — UI Redesign Phases

Five phase briefs for Cody (Claude Code). One focused session per phase. Hand them off one at a time — don't give Cody more than the current phase.

## Phase order

1. **[PHASE_1_NEW_UI_SHELL.md](./PHASE_1_NEW_UI_SHELL.md)** — New UI shell with React island for panels, vanilla everything else. All 10 panels as stubs. Four themes. New menus, tool strip, rulers, status bar, modals. ~1 session.

2. **[PHASE_2_CONTENT_MIGRATION.md](./PHASE_2_CONTENT_MIGRATION.md)** — Move existing edit/properties panel content into the new Layers, Transform, Properties, Project panels. No new features, just reshuffling. ~1 session.

3. **[PHASE_3_NEW_PANELS.md](./PHASE_3_NEW_PANELS.md)** — Build the net-new panels: Hit Zone, Surprise, Swatches, Navigator, Difficulty. ~1–2 sessions.

4. **[PHASE_4_UNDO_REDO_HISTORY.md](./PHASE_4_UNDO_REDO_HISTORY.md)** — Build the undo/redo stack, wire Edit menu, fill in the History panel. ~1–2 sessions.

5. **[PHASE_5_POLISH.md](./PHASE_5_POLISH.md)** — Grab-bag of optional polish: build step, popout windows, settings wiring, perf, docs. Pick what matters, skip what doesn't. ~1–2 sessions.

## Total estimate

5–8 focused sessions end to end. Phases 1–4 get you a complete app; Phase 5 is optional polish.

## Architecture at a glance

**Islands architecture** — React owns only the panel dock system (the hard part: float/dock/merge/split). Everything else stays vanilla JavaScript (canvas, tools, editor.js, game.js, app.js). The two sides communicate through a small `window.Panels` API.

Why: React makes the complex panel state machine ~700 lines instead of ~2500. Vanilla keeps the working game engine untouched. Best of both.

## Ground rules for Cody

- Don't convert non-panel code to React. Panel shell only.
- Don't set up a bundler until Phase 5 (if ever). Babel standalone is fine.
- Don't skip ahead. One phase at a time.
- If a phase's verification checklist doesn't pass, don't declare it done.
