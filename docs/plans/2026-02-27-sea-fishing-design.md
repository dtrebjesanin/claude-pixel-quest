# Sea Fishing Theme Rework — Design

## Goal

Transform the fishing theme from a lakeside pond scene into an open-sea fishing experience. The entire viewport is ocean water — no sky, no horizon. Boats replace the human Fisher character. An island sits at the top, a dock at the bottom.

## Key Decisions

- **Characters are boats** — the FishingBoat extends Goblin, replacing the Fisher entity entirely
- **Targets are fish schools** — visible fish shadows/splashes on the water surface
- **Full ocean background** — water covers the entire canvas, island at top, dock at bottom
- **Pixel-cozy mood** — bright cheerful colors, playful waves, cute details
- **Deposit at bottom** — dock/pier structure at the bottom edge

## Background — Full Ocean

The entire viewport is water. No sky, no horizon line.

- **Water fill**: Deep blue gradient top-to-bottom (`#1E6091` → `#0C3547`)
- **Wave texture**: Horizontal bands of lighter blue at intervals, random x-offsets (covers entire canvas)
- **Island at top**: Small sandy island at ~y 0-80. Sandy base (`#F4D03F`), green palm tops, brown trunks. Pixel-cozy — bright colors.
- **Dock at bottom**: Simple wooden pier at the bottom edge where the deposit barrel sits. Brown planks, posts into water.
- **Coral/rocks**: Small decorative elements scattered underwater (subtle colored rectangles)

## Character — FishingBoat (extends Goblin)

The boat IS the character. Replaces `Fisher` entirely (Fisher.ts deleted).

- **Hull**: ~24x12px wooden boat shape. Brown/red hull, lighter gunwale.
- **Cabin/mast**: Small mast with a pixel sail or flag. Boss variant gets bigger sail or gold trim.
- **States**:
  - **IDLE**: Gentle bob up/down (sine wave on y)
  - **WALKING** (sailing): Same bob + wake particles behind
  - **MINING** (fishing): Rod visible off the side, line dropping into water, bobber animation
  - **CART** (hauling): Net of fish visible on deck
  - **CELEBRATING**: Boat bounces higher, maybe flag waves
  - **SLEEPING**: Boat still, small anchor icon
- **Shadow**: Water reflection — semi-transparent darker oval below boat
- **Labels**: Same system — name/action/role labels above and below

## Targets — FishSchool

Schools of fish visible on the water surface.

- **Fish shadows**: 3-5 small dark fish silhouettes clustered, undulating movement
- **Splash effects**: Occasional fish jumping (small arc of pixels above water)
- **Shimmer**: Light glints on the water around the school

## Atmosphere

- **SeaWaves**: Animated wave crests scrolling horizontally (white/light blue foam lines). Front layer — passes over boats.
- **Seagull**: 2-3 seagulls flying across scene. White body, wing flap animation. Similar to ForestBird but longer flight paths.
- **Water sparkle**: Bright pixel glints on water surface (glow pass)

## Theme Config

```typescript
FISHING_THEME: ThemeDef = {
  id: 'fishing',
  name: 'Sea Fishing',
  backgroundColor: '#1E6091',
  layout: {
    targetPositions: [spread across mid-sea, ~y 130-200],
    depositPosition: { dock at bottom, ~y 310 },
    spawnArea: { mid-upper near island, ~y 100-120 },
    atmosphere: { torches: [], stalactites: [], mushrooms: [] },
    creatures: { bats: [], spider: null },
  },
  particles: {
    action: { colors: ['#3b82f6', '#60a5fa', '#93c5fd'] },
    spawn: { colors: ['#e2e8f0', '#bfdbfe', '#ffffff'] },
    celebrate: { colors: ['#fbbf24', '#3b82f6', '#34d399', '#f472b6'] },
  },
  labels: {
    character: 'Boat',
    target: 'Fish School',
    action1: 'Fishing',
    action2: 'Hauling',
    deposit: 'Dock',
  },
};
```

## Files Changed

| Action | File | Description |
|--------|------|-------------|
| Delete | `entities/Fisher.ts` | Removed — replaced by FishingBoat |
| Create | `entities/FishingBoat.ts` | New boat character extending Goblin |
| Create | `entities/FishSchool.ts` | New target — schools of fish |
| Create | `scene/SeaWaves.ts` | Atmosphere — animated wave overlay |
| Create | `entities/Seagull.ts` | Atmosphere — flying seagulls |
| Rewrite | `scene/FishingBackground.ts` | All-ocean with island + dock |
| Update | `scene/FishingScene.ts` | Wire new entities + atmosphere |
| Update | `theme/FishingTheme.ts` | New layout, colors, labels |
