/* App version history — add a new entry at the TOP for each release. */

window.CHANGELOG = [
  {
    version: 'Beta',
    label: 'Version Beta',
    date: 'April 2025',
    tagline: 'Initial release — full game creation toolkit',
    notes: [
      {
        section: 'Project Management',
        items: [
          'Project explorer with sortable list (name, items, size, date)',
          'Three starter templates: Hidden Planet, Original Scan, Blank Canvas',
          'Import & export projects as JSON for sharing or backup',
          'Export any project as a standalone playable HTML file — no editor, works offline',
          'Bulk select, export, or delete multiple projects at once',
          'Auto-save every 800 ms with saving… / saved status in the HUD',
          'Force-save with Ctrl+S at any time',
          'Inline project rename by clicking the project name in the HUD',
        ]
      },
      {
        section: 'Editor — Tools',
        items: [
          'Select tool — click to select objects; drag to move them',
          'Pan / Hand tool — drag the canvas to navigate',
          'Pen tool — freehand drawing with stroke smoothing (Ramer–Douglas–Peucker + Catmull-Rom curves)',
          'Eraser tool — erase drawing strokes by overlapping',
          'Rectangle, Ellipse, Star shape tools',
          'Hit Zone tool — drag to place circular detection zones (things to find)',
          'Surprise tool — place hidden reward triggers with sparkle animations',
          'Text tool — add styled text labels anywhere on the canvas',
          'Import Image tool — upload PNG/JPG as a sprite or base layer',
          'Crop tool — trim the canvas to specific bounds with a draggable overlay',
        ]
      },
      {
        section: 'Editor — Drawing & Pen',
        items: [
          '5 quick-pick colors + custom color picker',
          'Stroke width 1–20 px with live slider',
          'Solid, dashed, and dotted stroke styles with adjustable gap',
          'Live pen preview rendered in a separate cursor layer while drawing',
          'Select and move individual strokes after drawing',
        ]
      },
      {
        section: 'Editor — Layers & Canvas',
        items: [
          'Layers panel showing all objects with type icons',
          'Drag-to-reorder layers to change render/z-order',
          'Group objects into named folders; collapse/expand groups',
          'Show/hide individual layers or entire groups with eye icon toggle',
          'Inline rename any layer or group',
          'Custom canvas size (default 1600 × 1600 px) via document size modal',
          'Fit canvas to base image dimensions automatically on import',
          'Minimap showing viewport position within the document; click to jump',
          'Project statistics modal: item count, surprise count, drawing strokes, file size',
        ]
      },
      {
        section: 'Base Layer',
        items: [
          'Three base types: built-in Planet SVG, Original Scan texture, or custom uploaded image',
          'Position, rotation, scale, and flip controls for the base layer',
          'Remove base layer entirely for a transparent background',
          'Crop preserves pixel dimensions so the base image never shrinks on canvas trim',
        ]
      },
      {
        section: 'Hit Zones & Items',
        items: [
          'Circular hit zones with name, radius, and X/Y position',
          'Per-item found sound: 11 presets or custom MP3/WAV upload',
          'Item-level Easter egg: floating popup, fullscreen overlay, or screen shake',
          'Easter egg supports custom image, text, audio (with loop option), and dismiss controls',
          'Nudge items 1 px (arrow keys) or 10 px (Shift+arrow)',
          'Duplicate any item with Ctrl+D',
        ]
      },
      {
        section: 'Surprises',
        items: [
          'Surprises are optional secrets that don\'t count toward the main find total',
          'Sparkle animation marks unrevealed surprises in play mode',
          'Built-in reveal animations: pop-in, fly across, jump up',
          'Per-surprise sound, Easter egg, and full transform controls',
        ]
      },
      {
        section: 'Sprites & Images',
        items: [
          '8 built-in SVG sprites: bird, fish, smoke, mouse, flag, sleeper, spark, heart',
          'Import custom PNG/JPG images as canvas sprites',
          'Full transform controls: position, rotation, scale, flip, opacity',
          'CSS filter effects: brightness, contrast, saturation, hue rotation, blur, grayscale, invert',
        ]
      },
      {
        section: 'Animations',
        items: [
          '9 looping animations: wiggle, bounce, float, pulse, spin, shake, fade, breathe, sway',
          '3 one-shot reveal animations for surprises: pop-in, fly across, jump up',
          'Stack multiple animations on a single object simultaneously',
        ]
      },
      {
        section: 'Text',
        items: [
          'Place text labels anywhere on the canvas',
          'Font choices: Caveat (handwriting), Fraunces (serif), Source Sans 3 (sans-serif)',
          'Font size, color, rotation, and position controls',
          'Double-click a text label to edit its content inline',
        ]
      },
      {
        section: 'Play Mode',
        items: [
          'Tap or click to search for hidden items — circular collision detection',
          '"Found!" / "Miss!" / "Nope!" text popups with smooth animations',
          'SVG checkmark drawn on successful finds with randomised rotation for an organic feel',
          'Sidebar checklist tracks found vs. remaining items with strikethrough on find',
          'Secrets counter tracks discovered surprises separately from items',
          'Win screen when all items are found, with a play-again button',
          'Haptic vibration patterns on mobile: short pulse for finds, double buzz for misses, long celebration for win',
          'Sound toggle (🔊/🔇) mutes all feedback instantly',
          'Inspirational Walt Disney quote shown when a project has no content yet',
          'Pan and zoom behave identically in play mode and edit mode',
        ]
      },
      {
        section: 'Sound',
        items: [
          'Web Audio API synthesised sounds: sine sweep for found, pitch drop for miss, chord for win',
          'Per-item custom found sound via MP3/WAV upload',
          'Customisable miss-tap feedback: text content, font, size, color, stroke, and sound',
          '11 preset sound effects: found, pop, ding, chirp, splash, puff, squeak, thud, miss, win, silence',
        ]
      },
      {
        section: 'Menus & UI',
        items: [
          'Menu bar: File, Edit, View, Panels, Help',
          'Per-panel show/hide (editor, toolstrip, properties, minimap) with state saved in localStorage',
          'Tab key hides all panels for distraction-free editing',
          'Fullscreen toggle via F11 or the ⛶ button',
          'Offline red-dot indicator in the HUD when internet connection is lost',
          'Keyboard shortcuts reference modal (? key or Help menu)',
        ]
      },
      {
        section: 'Offline & PWA',
        items: [
          'Service Worker caches the full app shell on first visit',
          'App loads and runs completely offline on every subsequent visit',
          'Installable as a PWA — Add to Home Screen on mobile or desktop',
          'All project data stored in browser localStorage — no server or account required',
          '"Save failed — storage full?" warning surfaced in the HUD if browser quota is exceeded',
        ]
      },
    ]
  }
];
