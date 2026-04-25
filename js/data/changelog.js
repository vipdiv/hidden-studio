/* App version history — add a new entry at the TOP for each release. */

window.CHANGELOG = [
  {
    version: '1.0',
    label: 'Version 1.0',
    date: 'April 2026',
    tagline: 'Polish, responsiveness, and play-mode cleanup',
    notes: [
      {
        section: 'Layer Renaming',
        items: [
          'Double-click any layer to rename it inline — items, sprites, text labels, strokes, and shapes (base layer remains non-renamable)',
          'Layer tooltip now reads "<name> — double-click to rename" for renamable layers',
          'Shapes are labeled by type ("Star 1", "Rectangle 2", "Ellipse 3") instead of generic "Stroke N", with chronological per-kind numbering',
          'Stroke "kind" metadata is preserved through save/load and JSON export/import',
        ]
      },
      {
        section: 'Image Upload & Storage',
        items: [
          'Uploaded base images now auto-compress: canvas resize to max 1600 px, then JPEG re-encode at 0.85 quality stepping down to 0.30 until file is under 500 KB',
          'Before/after size shown under the upload button ("Compressed: 4.1 MB → 312 KB ✓")',
          'SVG uploads pass through unchanged (already compact)',
          'Project list size column displays MB for files ≥ 1 MB instead of cramped KB numbers',
          'Removed "Planet SVG" and "Original scan" buttons from the Base Layer panel — only Upload Image remains',
        ]
      },
      {
        section: 'Rulers, Grid, Outline',
        items: [
          'Rulers now render numbered measurement labels with major and minor tick marks (was an empty CSS gradient before)',
          'Default unit is inches (96 px/in); click any ruler or the corner square to toggle to centimetres (37.8 px/cm)',
          'Corner square displays the current unit ("in" / "cm"); preference persists across sessions',
          'View menu now built dynamically each open with green checkmarks for active state (matching the Window menu style)',
          'Rulers / Grid / Outline disappear from the View menu when their master toggle is OFF in Settings',
          'View menu labels right-aligned with shortcut keys far right',
          'Lower ruler z-index so menu dropdowns render correctly above',
        ]
      },
      {
        section: 'Modals',
        items: [
          'Modals now cap at 85vh with the header pinned and the body scrolling internally — Documentation and Release Notes no longer stretch off-screen on tall content',
          'Thin styled scrollbar inside the modal body',
          'Backdrop uses safe-center alignment so very tall content still scrolls accessibly on small viewports',
        ]
      },
      {
        section: 'Editor Panel Chrome',
        items: [
          'Editor panel sits flush against the 36 px tool strip (no gap)',
          'Collapsed-editor reopen button is now 26 × 56 px with red accent outline, positioned below the rulers (was a tiny grey rectangle camouflaged behind the ruler corner)',
          'Hover state expands the toggle to 30 px wide with a filled accent background',
          'Right-side panel dock now has its own «/» collapse toggle, mirroring the editor panel',
          'Dock collapse state persists in localStorage',
        ]
      },
      {
        section: 'Play / Edit Mode Cleanup',
        items: [
          'Play mode now hides every editor-only chrome element: back arrow, help (?) button, edit-panel toggle, mobile pencil/panels FABs, and the entire right-side panel dock',
          'Edit mode hides the "Find These" checklist panel and its clipboard (📋) toggle — the find list belongs to play only',
          'Window menu Panels section is hidden in play mode (panels themselves are hidden, so toggling them is just clutter)',
          'Lowered the editor-toggle button z-index so the menu bar dropdowns render above it',
          'Hit-zone outlines disappear in play mode; outlines and labels return when you switch back to Edit',
        ]
      },
      {
        section: 'Standalone HTML Export',
        items: [
          'Find panel is now collapsible: ◁ button on the panel header hides it, floating 📋 button at the left edge brings it back',
          'Camera centers in the available area (excluding the panel) instead of the full window — canvas no longer sits half-hidden',
          'Auto-collapse panel on narrow desktop windows (640–900 px) so the canvas gets full width by default',
          'Mobile (< 640 px): panel becomes a bottom-sheet with a "📋 Find list" pill-button toggle in the bottom-left',
          'Mouse wheel and trackpad zoom around the cursor position (clamped 0.5×–6× the fit-to-window scale)',
          'Wheel listener attached to the document so scrolling anywhere on the page triggers zoom; scrolls find list naturally over the panel',
          'Resize handler recenters the canvas on window resize and orientation change',
          'Subtle "made with Hidden Studio" attribution links to the GitHub repo, plus a "Make your own" link inside the win card',
        ]
      },
      {
        section: 'Sounds — Library & Custom Upload',
        items: [
          'Miss-tap sound dropdown is now grouped by category: Game feedback, Animal, Human, Nature, Sound FX, Silent',
          'Six new built-in sounds added: bark, meow, laugh, oof, zap, drip — synthesized live (no audio files bundled), so the app stays small',
          'New "⬆ Upload custom sound" button on the Miss tap panel — pick any short MP3/WAV',
          'Uploads are auto-decoded → trimmed to 1.2 s max → mixed to mono → downsampled to 16 kHz → re-encoded as 16-bit PCM WAV; typical result is 2–40 KB',
          'Before/after status shown after upload ("Compressed: 350 KB → 38 KB ✓ (1.20 s)")',
          'Hint text under the panel links to freemusicarchive.org and freesound.org for free legal sounds',
          'Standalone HTML export now honors the chosen miss sound — every preset (including the new ones) plays in the exported game, and custom uploaded sounds are embedded as data URLs',
        ]
      },
      {
        section: 'Scrollbar UI',
        items: [
          'Editor side panels (left edit panel, right properties panel, find list, layer list) now use a thin minimal dark scrollbar matching the Documentation / Release Notes modal style',
          '8 px wide thumb in panel-border grey on a transparent track; brightens to text-dim on hover',
          'Replaces the wide default OS scrollbar that clashed with the dark editor chrome',
        ]
      },
      {
        section: 'Bug Fixes',
        items: [
          'Standalone HTML export: canvas/base image was blank for projects using the Original Scan preset because its baseContent is a relative path (assets/scene.jpg) that fails the security URL allow-list — fixed by fetching and inlining the file as a data URL at export time',
        ]
      },
      {
        section: 'Security Hardening',
        items: [
          'Item names in exported HTML now rendered via textContent (was string-concatenated into innerHTML — a malicious project file with item name like `<img onerror=…>` could execute code in the recipient\'s browser)',
          'Easter-egg image URLs validated against a strict allow-list (data:image/*, http(s)://, blob:) — blocks javascript: URLs and attribute-breakout payloads',
          'Easter-egg text rendered via textContent everywhere (was a partial < → &lt; replace in the standalone export)',
          'Sprite image data and base-image data built imperatively with createElement + URL validation instead of string-concatenated innerHTML',
          'Outbound links in the export use rel="noopener noreferrer" to block tabnabbing',
          'Defense-in-depth: editor\'s base-layer renderer now also validates baseContent before setting <img src>, so a poisoned imported JSON can\'t break out of the attribute',
        ]
      },
    ]
  },
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
