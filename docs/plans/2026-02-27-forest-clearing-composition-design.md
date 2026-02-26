# Forest Clearing Composition Design

## Goal

Recompose the forest theme to show a **clearing surrounded by dense forest on all sides** — no horizon, no sky. Based on hand-drawn sketch showing trees enclosing the scene from every direction with the character and log pile in a central opening.

Mood: **Dense & naturalistic** — falling leaves, birds in the canopy, subtle filtered light. Grounded, not magical.

## Current State

- `ForestBackground.ts`: Sky gradient at top, trees along a single ground line, side-view composition
- `ForestScene.ts`: Empty atmosphere methods (no ambient life)
- `ForestTheme.ts`: Background color `#2d5a27`, targets at y=195-215, spawn at y=230, deposit at y=310
- Logical canvas: 300x400

## Changes

### 1. ForestBackground.ts — Full Rewrite

Replace the current sky-and-ground-line composition with an enclosed clearing:

**Layers (back to front):**

1. **Base fill** — Dark forest green (`#1a3a14` or similar), no sky gradient
2. **Canopy ceiling** (top ~30% of viewport) — Overlapping green crowns made of layered rects in dark/mid/light greens. Small irregular gaps where lighter green/yellow-green shows through (filtered light, not sky blue)
3. **Side tree trunks** — Thick brown trunks entering from left and right edges, extending partially into frame. 2-3 per side at varying heights
4. **Side foliage** — Bushes and leaf clusters attached to side trunks, pressing inward
5. **Bottom trees** — Tree trunks and canopy entering from the bottom edge (partially visible, cut off by viewport). Creates depth — you're looking into the clearing, not at a flat ground
6. **Central clearing floor** — Earthy grass: green-brown gradient, grass tufts, scattered leaves, small flowers. Roughly the middle 40-60% of the viewport
7. **Foreground canopy hints** — A few dark canopy rects at the very top and bottom edges rendered last, creating a subtle vignette/frame

**Key principle:** Trees should feel organic and varied, not symmetrical. Use the seeded RNG for reproducibility.

### 2. ForestScene.ts — Add Naturalistic Atmosphere

Fill in the currently empty atmosphere methods, following the CaveScene pattern:

**New atmosphere entities:**

- **FallingLeaves** — Similar to `DustMotes` but leaf-shaped (2-3px rects), autumnal colors (orange, red, brown, yellow). Drift slowly downward with slight horizontal sway. ~8-12 active at a time.
- **SunbeamShafts** — 2-3 static vertical rectangles of very low-opacity warm yellow (`rgba(255,250,200,0.04-0.06)`), positioned at canopy gaps. Subtle pulse/flicker.
- **ForestBird** — Small silhouettes (3-5px) perched in canopy area. Occasionally one flits across the clearing (similar movement to `Bat` but faster, more direct path). 2-3 birds.
- **Foreground canopy overlay** — Dark green canopy rects rendered in `renderAtmosphereFront` at the very top and bottom edges, partially overlapping characters near edges for depth.

**Glow pass:**
- Subtle warm glow at sunbeam positions (very faint, additive)

### 3. ForestTheme.ts — Layout Adjustments

- `backgroundColor`: Change to `#1a3a14` (darker, enclosed feel)
- `targetPositions`: Adjust inward slightly — keep within clearing bounds. Roughly x: 60-230, y: 170-210
- `spawnArea`: Keep roughly centered, y=220
- `depositPosition`: Keep at roughly x=130, y=300
- Add atmosphere config (mushroom positions not needed, but could add placeholder arrays for consistency)

### 4. New Entity Files

- `src/webview/scene/FallingLeaves.ts` — Leaf particle system
- `src/webview/entities/ForestBird.ts` — Bird entity (similar to Bat)
- `src/webview/scene/SunbeamShafts.ts` — Static light shafts

## Visual Composition (ASCII)

```
+----------------------------------+
|  @@@@  @@@@@@  @@@  @@@@  @@@   |  <- Dense canopy ceiling
| @@@@ @@@ ·  @@@  · @@@@ @@@@   |     (overlapping crowns, small light gaps)
|  @@  @@   ·    @@   ·  @@  @@  |
|@|  |         ·        |  |@@@  |  <- Side trunks + foliage
|@|  |    [tree]   [tree]  |  |@ |
|@@@/       ☺          \@@@@@|   |  <- Character in clearing
|  /    [log pile]       \   |   |  <- Deposit
|@|  |    [tree]         |  |@  |
|@|  |                   |  |@@  |
| @@@@ @@@@  @@@@ @@@@  @@@@ @@ |  <- Bottom trees/foliage
|  @@@@  @@@@@@  @@@  @@@@  @@@  |
+----------------------------------+
```

## Non-Goals

- No changes to character rendering or gameplay logic
- No changes to other themes (cave, fishing)
- No sprite sheets — everything stays procedural canvas rendering
