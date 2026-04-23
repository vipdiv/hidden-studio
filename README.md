# Hidden Studio

A browser-based editor for making Where's Waldo–style hidden object games from your own drawings.

## Quick start

```
python -m http.server 8000
```

Then open http://localhost:8000

## What you can do

**Play mode:** drag to pan, tap to find things hidden in the scene. Sparkles hint at surprises.

**Edit mode:**
- Place hit zones (findable items) and surprises (animated reveals)
- Import PNGs as sprite overlays, rotate/scale/filter them
- Draw on the scene with pen and eraser tools
- Swap the base layer (use the included planet SVG, your own scan, or any uploaded image)
- Assign animations (wiggle, bounce, float, pulse, spin, etc — combinable!)
- Upload custom sounds per item, or search Freesound.org
- Full color adjustments — brightness, contrast, saturation, hue, blur, grayscale, invert

**Exports:** save projects as JSON, or export a standalone playable HTML you can share.

## Multi-project

Everything saves to browser localStorage. Create multiple named projects, switch between them freely.

## See also

- `HANDOFF.md` — architecture notes for contributors / AI coding assistants
