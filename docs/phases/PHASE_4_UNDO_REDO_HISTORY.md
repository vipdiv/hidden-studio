# Phase 4 — Undo/Redo + History Panel

**Status:** Not started
**Estimated sessions:** 1–2 sessions
**Depends on:** Phase 3 complete

---

## Goal

Build an undo/redo stack for the editor and wire it to the History panel. This is the one feature from HANDOFF.md listed as "Phase 2" that's been deferred — it's time to build it.

Without this, the Edit → Undo menu item stays a stub and the History panel stays a placeholder.

---

## Scope — what needs undo/redo

Not every editor action needs to be undoable. Focus on the operations where "oops, undo that" is a real user need:

### Undoable actions (in scope)

- Drawing with pen/brush (each stroke = one undo step)
- Erasing
- Adding a sprite/image/text
- Deleting a sprite/zone/surprise
- Moving/transforming a sprite (one step per move — debounce during drag, commit on release)
- Changing a layer's properties (visibility, lock — less critical but cheap to include)
- Adding a hit zone or surprise layer
- Resizing the canvas / changing document size
- Clearing all drawings
- Base layer image upload/replacement

### NOT undoable (out of scope)

- Panel layout changes (docking, floating, closing panels)
- Theme changes
- Zoom / pan (ephemeral view state, not document state)
- Project rename (edge case — optional include)
- Export actions (don't mutate state)
- Settings modal changes

---

## Architecture

### Command pattern

Each undoable action becomes a "command" object with `do()` and `undo()` methods. The history stack is an array of commands.

```js
// js/history.js
window.History = {
  stack: [],
  index: -1,
  maxSize: 100,

  push(command) {
    // If we're in the middle of the stack (user undid then did something new),
    // truncate everything after the current index.
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(command);
    if (this.stack.length > this.maxSize) this.stack.shift();
    this.index = this.stack.length - 1;
    command.do();  // execute
    this._notify();
  },

  undo() {
    if (this.index < 0) return;
    this.stack[this.index].undo();
    this.index--;
    this._notify();
  },

  redo() {
    if (this.index >= this.stack.length - 1) return;
    this.index++;
    this.stack[this.index].do();
    this._notify();
  },

  canUndo() { return this.index >= 0; },
  canRedo() { return this.index < this.stack.length - 1; },

  jumpTo(targetIndex) {
    // For History panel clicks — undo/redo until we reach targetIndex
    while (this.index > targetIndex) this.undo();
    while (this.index < targetIndex) this.redo();
  },

  getEntries() {
    return this.stack.map((cmd, i) => ({
      label: cmd.label,
      index: i,
      isCurrent: i === this.index,
    }));
  },

  _listeners: [],
  onChange(fn) { this._listeners.push(fn); },
  _notify() { this._listeners.forEach(fn => fn()); },
};
```

### Command shape

```js
{
  label: 'Add sprite',  // shown in History panel
  do() { /* apply the change */ },
  undo() { /* reverse it */ },
}
```

For simple mutations, commands capture the before/after state:

```js
function moveSprite(sprite, newX, newY) {
  const oldX = sprite.x, oldY = sprite.y;
  History.push({
    label: 'Move sprite',
    do: () => { sprite.x = newX; sprite.y = newY; Game.redraw(); },
    undo: () => { sprite.x = oldX; sprite.y = oldY; Game.redraw(); },
  });
}
```

For complex mutations (full drawing strokes, bulk operations), the command can snapshot larger state — just be aware of memory if the canvas is big.

### Integration points in existing code

`editor.js` and `game.js` currently mutate state directly. Find every site that does a user-initiated mutation and wrap it with a `History.push({...})` call. Places to check:

- `editor.js` — sprite/zone add/delete, layer reorder, property changes
- Pen/brush stroke completion in drawing logic
- Transform updates (on drag release, not on every pixel)
- Base image upload
- Canvas resize

Do NOT wrap internal/automated state changes — only user-triggered ones.

---

## History panel — real content

Replace the stub from Phase 1 with a functional history list.

### UI

- Scrollable list, newest at top (or bottom — pick one and stick with it; Photoshop uses bottom)
- Each entry shows the command `label`
- Current state highlighted with an accent background
- Entries *after* the current state (i.e. "future" if you redo) shown dimmed
- Click an entry → `History.jumpTo(entry.index)` — undoes or redoes to that point
- "Clear History" button at top

### Data binding

- Subscribes to `History.onChange()` — re-renders the list whenever the stack changes
- Reads `History.getEntries()` for the list data
- Uses `History.jumpTo(i)` on click

---

## Menu + keyboard wiring

### Edit menu

- **Undo** — `⌘Z` / `Ctrl+Z` — calls `History.undo()`. Disabled when `!History.canUndo()`.
- **Redo** — `⌘⇧Z` / `Ctrl+Y` — calls `History.redo()`. Disabled when `!History.canRedo()`.

### Keyboard shortcuts

Already listed in the Shortcuts modal from Phase 1. Make sure they're actually wired — previously these were stubs.

---

## Memory/perf notes

- Cap stack size at 100 commands (configurable in Settings later if needed)
- For large-state commands (e.g. a full drawing stroke snapshot), consider storing compressed data or diff-based storage if memory becomes an issue — but ship the simple version first
- Don't persist history to localStorage — it's ephemeral per session

---

## Explicitly NOT doing in Phase 4

- Per-action redo granularity beyond what's listed (e.g. don't make every single pen-movement an undo step)
- History persistence across page reloads
- Branching history (non-linear undo tree) — way out of scope
- Auto-save integration with history
- New panels or visual changes

---

## Deliverables

- New file `js/history.js` with the `window.History` API
- `editor.js` and `game.js` updated to wrap undoable actions in `History.push()`
- History panel stub replaced with real scrollable list
- Edit menu Undo/Redo wired to actual functions, disabled states working
- `⌘Z` / `⌘⇧Z` keyboard shortcuts functional
- Stack capped at 100, older entries drop off

---

## Verification checklist

1. Draw a pen stroke. Press `⌘Z`. Stroke disappears.
2. Press `⌘⇧Z`. Stroke returns.
3. Add a sprite. Move it. Change its rotation. History panel shows three distinct entries.
4. Click the first entry in History panel. Canvas reverts to the state just after the sprite was added (move and rotation undone).
5. Do a new action while "back in time." Entries after the new current state are truncated.
6. Undo past the beginning — no crash, undo stays disabled.
7. Redo past the end — no crash, redo stays disabled.
8. Fill the stack to 100+ entries. Earliest entries drop off, not a memory leak.
9. Reload the page. History is cleared (not persisted — expected).
10. Export project JSON. Re-import. History is empty for the imported session (expected).

---

**When Phase 4 is done, come back and start on `PHASE_5_POLISH.md`.**
