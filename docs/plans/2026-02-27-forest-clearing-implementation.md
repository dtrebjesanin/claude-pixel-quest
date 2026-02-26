# Forest Clearing Composition Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Recompose the forest theme from a side-view sky-and-ground layout to an enclosed clearing surrounded by dense forest on all sides, with naturalistic atmosphere (falling leaves, sunbeams, birds).

**Architecture:** Three new atmosphere entities (`FallingLeaves`, `ForestBird`, `SunbeamShafts`) follow existing patterns (`DustMotes`, `Bat`, `WallTorch`). `ForestBackground` gets a full rewrite replacing sky+ground with an enclosed clearing. `ForestScene` wires atmosphere into the empty abstract methods.

**Tech Stack:** TypeScript, Canvas 2D procedural rendering, Vitest

---

### Task 1: FallingLeaves Entity

**Files:**
- Create: `src/webview/scene/FallingLeaves.ts`
- Create: `src/webview/scene/FallingLeaves.test.ts`

**Step 1: Write the failing test**

```typescript
// src/webview/scene/FallingLeaves.test.ts
import { describe, it, expect } from 'vitest';
import { FallingLeaves } from './FallingLeaves';

describe('FallingLeaves', () => {
  it('seeds initial leaves on construction', () => {
    const leaves = new FallingLeaves(300, 400);
    expect(leaves.count).toBeGreaterThanOrEqual(5);
    expect(leaves.count).toBeLessThanOrEqual(12);
  });

  it('count stays in reasonable range after many updates', () => {
    const leaves = new FallingLeaves(300, 400);
    for (let i = 0; i < 200; i++) {
      leaves.update(100);
    }
    expect(leaves.count).toBeGreaterThanOrEqual(3);
    expect(leaves.count).toBeLessThanOrEqual(15);
  });

  it('resize updates bounds', () => {
    const leaves = new FallingLeaves(300, 400);
    leaves.resize(600, 800);
    expect((leaves as any).width).toBe(600);
    expect((leaves as any).height).toBe(800);
  });

  it('update does not throw', () => {
    const leaves = new FallingLeaves(300, 400);
    expect(() => leaves.update(1000)).not.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/danilotrebjesanin/dev/claude-pixel-quest && npx vitest run src/webview/scene/FallingLeaves.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// src/webview/scene/FallingLeaves.ts
// Falling leaf particles — naturalistic forest atmosphere
// Slow-drifting leaves with horizontal sway, autumnal colors

import { AmbientParticlePool } from '../entities/AmbientParticlePool';

const TARGET_COUNT = 10;
const INITIAL_COUNT = 8;
const SPAWN_INTERVAL = 500; // ms between spawn attempts
const LEAF_COLORS = ['#92400e', '#b45309', '#ca8a04', '#a16207', '#dc2626', '#d97706'];

export class FallingLeaves {
  private pool: AmbientParticlePool;
  private spawnTimer = 0;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    // Positive gravity for downward drift, but gentle
    this.pool = new AmbientParticlePool({ gravity: 8, maxParticles: 15 });
    this.seedInitial();
  }

  private seedInitial(): void {
    for (let i = 0; i < INITIAL_COUNT; i++) {
      this.spawnLeaf(Math.random() * 0.7);
    }
  }

  private spawnLeaf(lifeRatio = 0): void {
    const maxLife = 6000 + Math.random() * 5000;
    this.pool.spawn({
      x: Math.random() * this.width,
      y: Math.random() * this.height * 0.3, // spawn in upper area (canopy)
      vx: (Math.random() - 0.5) * 12, // gentle horizontal sway
      vy: 3 + Math.random() * 5, // slow downward
      maxLife,
      size: 2 + Math.random() * 2,
      color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      brightness: 0.6 + Math.random() * 0.4,
    });
  }

  update(dt: number): void {
    this.pool.update(dt);

    this.spawnTimer += dt;
    if (this.spawnTimer >= SPAWN_INTERVAL && this.pool.count < TARGET_COUNT) {
      this.spawnTimer = 0;
      this.spawnLeaf();
    }
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    this.pool.render(ctx, scale);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  get count(): number {
    return this.pool.count;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/danilotrebjesanin/dev/claude-pixel-quest && npx vitest run src/webview/scene/FallingLeaves.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
cd /Users/danilotrebjesanin/dev/claude-pixel-quest
git add src/webview/scene/FallingLeaves.ts src/webview/scene/FallingLeaves.test.ts
git commit -m "feat: add FallingLeaves atmosphere entity for forest theme"
```

---

### Task 2: ForestBird Entity

**Files:**
- Create: `src/webview/entities/ForestBird.ts`
- Create: `src/webview/entities/ForestBird.test.ts`

**Step 1: Write the failing test**

```typescript
// src/webview/entities/ForestBird.test.ts
import { describe, it, expect } from 'vitest';
import { ForestBird } from './ForestBird';

function tickUntilState(bird: ForestBird, target: 'PERCHED' | 'FLYING', maxMs = 20000, stepMs = 16): void {
  for (let t = 0; t < maxMs; t += stepMs) {
    bird.update(stepMs);
    if (bird.state === target) return;
  }
}

describe('ForestBird', () => {
  it('starts in PERCHED state', () => {
    const bird = new ForestBird(50, 40);
    expect(bird.state).toBe('PERCHED');
  });

  it('stays PERCHED while perchTimer has not expired', () => {
    const bird = new ForestBird(50, 40);
    bird.update(500);
    expect(bird.state).toBe('PERCHED');
  });

  it('transitions to FLYING after perchTimer expires', () => {
    const bird = new ForestBird(50, 40);
    tickUntilState(bird, 'FLYING');
    expect(bird.state).toBe('FLYING');
  });

  it('returns to PERCHED after flight completes', () => {
    const bird = new ForestBird(50, 40);
    tickUntilState(bird, 'FLYING');
    tickUntilState(bird, 'PERCHED');
    expect(bird.state).toBe('PERCHED');
  });

  it('returns to origin after flight', () => {
    const bird = new ForestBird(50, 40);
    tickUntilState(bird, 'FLYING');
    tickUntilState(bird, 'PERCHED');
    expect(bird.x).toBe(50);
    expect(bird.y).toBe(40);
  });

  it('moves during FLYING state', () => {
    const bird = new ForestBird(50, 40);
    tickUntilState(bird, 'FLYING');
    const xBefore = bird.x;
    bird.update(200);
    expect(bird.x).not.toBe(xBefore);
  });

  it('wingPhase advances during update', () => {
    const bird = new ForestBird(50, 40);
    bird.update(100);
    expect(bird.wingPhase).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/danilotrebjesanin/dev/claude-pixel-quest && npx vitest run src/webview/entities/ForestBird.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// src/webview/entities/ForestBird.ts
// Small bird silhouette — perches in canopy, occasionally flits across clearing

type BirdState = 'PERCHED' | 'FLYING';

export class ForestBird {
  x: number;
  y: number;
  private originX: number;
  private originY: number;
  state: BirdState = 'PERCHED';
  wingPhase = 0;
  private perchTimer: number;
  private flightTimer = 0;
  private flightDuration = 2000;
  private vx = 0;
  private vy = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.originX = x;
    this.originY = y;
    this.perchTimer = 4000 + Math.random() * 5000;
  }

  update(dt: number): void {
    if (this.state === 'PERCHED') {
      this.wingPhase += dt * 0.001; // very slow idle
      this.perchTimer -= dt;
      if (this.perchTimer <= 0) {
        this.state = 'FLYING';
        this.flightTimer = this.flightDuration;
        // Faster, more direct than bats — birds dart
        this.vx = (Math.random() - 0.5) * 120;
        this.vy = (Math.random() - 0.5) * 50;
      }
    } else {
      this.wingPhase += dt * 0.02; // fast flapping
      this.flightTimer -= dt;
      this.x += this.vx * (dt / 1000);
      this.y += this.vy * (dt / 1000);
      if (this.flightTimer <= 0) {
        this.state = 'PERCHED';
        this.x = this.originX;
        this.y = this.originY;
        this.perchTimer = 4000 + Math.random() * 5000;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const px = Math.floor(this.x * s);
    const py = Math.floor(this.y * s);
    const wingOffset = Math.sin(this.wingPhase) * 2 * s;

    // Body — small dark silhouette
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(px, py, Math.ceil(4 * s), Math.ceil(3 * s));

    // Left wing
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(
      Math.floor(px - 3 * s),
      Math.floor(py - wingOffset),
      Math.ceil(3 * s),
      Math.ceil(2 * s),
    );

    // Right wing
    ctx.fillRect(
      Math.floor(px + 4 * s),
      Math.floor(py + wingOffset),
      Math.ceil(3 * s),
      Math.ceil(2 * s),
    );

    // Beak — tiny bright pixel
    ctx.fillStyle = '#f59e0b';
    const beakX = this.vx >= 0 ? px + 4 * s : px - 1 * s;
    ctx.fillRect(Math.floor(beakX), Math.floor(py + 1 * s), Math.ceil(1 * s), Math.ceil(1 * s));
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/danilotrebjesanin/dev/claude-pixel-quest && npx vitest run src/webview/entities/ForestBird.test.ts`
Expected: PASS (7 tests)

**Step 5: Commit**

```bash
cd /Users/danilotrebjesanin/dev/claude-pixel-quest
git add src/webview/entities/ForestBird.ts src/webview/entities/ForestBird.test.ts
git commit -m "feat: add ForestBird entity for forest atmosphere"
```

---

### Task 3: SunbeamShafts Entity

**Files:**
- Create: `src/webview/scene/SunbeamShafts.ts`
- Create: `src/webview/scene/SunbeamShafts.test.ts`

**Step 1: Write the failing test**

```typescript
// src/webview/scene/SunbeamShafts.test.ts
import { describe, it, expect } from 'vitest';
import { SunbeamShafts } from './SunbeamShafts';

describe('SunbeamShafts', () => {
  it('creates shafts from provided positions', () => {
    const shafts = new SunbeamShafts([
      { x: 80, width: 15, height: 180 },
      { x: 200, width: 12, height: 160 },
    ]);
    expect(shafts.shaftCount).toBe(2);
  });

  it('phase advances on update', () => {
    const shafts = new SunbeamShafts([{ x: 80, width: 15, height: 180 }]);
    shafts.update(1000);
    expect(shafts.phase).toBeGreaterThan(0);
  });

  it('update does not throw', () => {
    const shafts = new SunbeamShafts([{ x: 80, width: 15, height: 180 }]);
    expect(() => shafts.update(500)).not.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/danilotrebjesanin/dev/claude-pixel-quest && npx vitest run src/webview/scene/SunbeamShafts.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// src/webview/scene/SunbeamShafts.ts
// Subtle sunbeam shafts filtering through canopy gaps

interface ShaftDef {
  x: number;      // logical x position
  width: number;   // logical width
  height: number;  // logical height from top
}

export class SunbeamShafts {
  private shafts: ShaftDef[];
  phase = 0;

  constructor(shafts: ShaftDef[]) {
    this.shafts = shafts;
  }

  update(dt: number): void {
    this.phase += dt * 0.0008;
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    for (let i = 0; i < this.shafts.length; i++) {
      const shaft = this.shafts[i];
      // Subtle pulse — each shaft offset by index
      const alpha = 0.035 + Math.sin(this.phase + i * 1.5) * 0.015;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(
        Math.floor(shaft.x * s),
        0,
        Math.floor(shaft.width * s),
        Math.floor(shaft.height * s),
      );
    }
    ctx.globalAlpha = 1;
  }

  renderGlow(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    for (let i = 0; i < this.shafts.length; i++) {
      const shaft = this.shafts[i];
      const alpha = 0.03 + Math.sin(this.phase + i * 1.5) * 0.01;
      const cx = (shaft.x + shaft.width / 2) * s;
      const cy = (shaft.height * 0.4) * s;
      const radius = shaft.width * 2 * s;

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, `rgba(255, 250, 200, ${alpha})`);
      gradient.addColorStop(1, 'rgba(255, 250, 200, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }
  }

  get shaftCount(): number {
    return this.shafts.length;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/danilotrebjesanin/dev/claude-pixel-quest && npx vitest run src/webview/scene/SunbeamShafts.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
cd /Users/danilotrebjesanin/dev/claude-pixel-quest
git add src/webview/scene/SunbeamShafts.ts src/webview/scene/SunbeamShafts.test.ts
git commit -m "feat: add SunbeamShafts entity for forest atmosphere"
```

---

### Task 4: ForestBackground Full Rewrite

**Files:**
- Modify: `src/webview/scene/ForestBackground.ts` (full rewrite)

**Step 1: Write the failing test**

No separate test file exists for ForestBackground currently. The background is visual-only and difficult to unit test meaningfully beyond "doesn't throw." We'll add a basic smoke test.

```typescript
// Add to bottom of src/webview/scene/FallingLeaves.test.ts or create new file:
// src/webview/scene/ForestBackground.test.ts
import { describe, it, expect } from 'vitest';
import { ForestBackground } from './ForestBackground';

describe('ForestBackground', () => {
  it('generates without throwing', () => {
    const bg = new ForestBackground();
    expect(() => bg.generate(600, 800)).not.toThrow();
  });

  it('re-generates on size change during render', () => {
    const bg = new ForestBackground();
    bg.generate(300, 400);
    // Calling generate with new size should not throw
    expect(() => bg.generate(600, 800)).not.toThrow();
  });
});
```

**Step 2: Run test to verify it passes with current code (baseline)**

Run: `cd /Users/danilotrebjesanin/dev/claude-pixel-quest && npx vitest run src/webview/scene/ForestBackground.test.ts`
Expected: PASS (existing code satisfies smoke tests)

**Step 3: Rewrite ForestBackground.ts**

Replace entire contents of `src/webview/scene/ForestBackground.ts` with the enclosed clearing composition. Key changes:

- **No sky** — base fill is dark forest green, no sky gradient
- **Canopy ceiling** — overlapping green crown rects across top ~35% of viewport
- **Side trees** — thick trunks entering from left and right edges with attached foliage
- **Bottom trees** — partial trunks/canopy entering from bottom edge
- **Central clearing** — earthy grass floor in center ~40-60% of viewport
- **Foreground canopy rects** — dark overlapping rects at extreme top/bottom edges for vignette framing

```typescript
// src/webview/scene/ForestBackground.ts
// Procedural forest clearing — enclosed by dense trees on all sides, no horizon

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

interface BgTree {
  x: number;
  y: number;       // base of trunk
  trunkW: number;
  trunkH: number;
  trunkColor: string;
  canopyRects: Rect[];
  rootRects: Rect[];
}

export class ForestBackground {
  // Top canopy trees
  private topTrees: BgTree[] = [];
  // Left-side trees
  private leftTrees: BgTree[] = [];
  // Right-side trees
  private rightTrees: BgTree[] = [];
  // Bottom trees (entering from bottom edge)
  private bottomTrees: BgTree[] = [];
  // Clearing floor details
  private grassTufts: Rect[] = [];
  private fallenLeaves: Rect[] = [];
  private flowers: Rect[] = [];
  private dirtPatches: Rect[] = [];
  // Foreground canopy overlay rects (rendered last for depth)
  private foregroundCanopy: Rect[] = [];

  private width = 300;
  private height = 400;

  generate(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.topTrees = [];
    this.leftTrees = [];
    this.rightTrees = [];
    this.bottomTrees = [];
    this.grassTufts = [];
    this.fallenLeaves = [];
    this.flowers = [];
    this.dirtPatches = [];
    this.foregroundCanopy = [];

    const rng = this.seededRandom(91);
    const scale = width / 300;

    const trunkColors = ['#5c3a1a', '#6b4226', '#4a2e14', '#7a4b2a', '#3d2211'];
    const canopyDark = ['#143d14', '#1a4a1a', '#0f330f'];
    const canopyMid = ['#1e5c1e', '#256b25', '#1a521a'];
    const canopyLight = ['#2d7a2d', '#328a32', '#267326'];
    const canopyHighlight = ['#4CAF50', '#45a049'];

    const pickTrunk = () => trunkColors[Math.floor(rng() * trunkColors.length)];
    const pickCanopy = (arr: string[]) => arr[Math.floor(rng() * arr.length)];

    // Helper: build canopy rects around a center point
    const buildCanopy = (cx: number, cy: number, baseW: number): Rect[] => {
      const rects: Rect[] = [];
      // Dark base (widest)
      rects.push({ x: cx - baseW / 2, y: cy + 10, w: baseW, h: 25 + rng() * 10, color: pickCanopy(canopyDark) });
      // Mid layer
      const midW = baseW * 0.85;
      rects.push({ x: cx - midW / 2, y: cy, w: midW, h: 30 + rng() * 8, color: pickCanopy(canopyMid) });
      // Upper
      const upW = baseW * 0.65;
      rects.push({ x: cx - upW / 2, y: cy - 10 - rng() * 5, w: upW, h: 18 + rng() * 8, color: pickCanopy(canopyMid) });
      // Top highlight
      const topW = baseW * 0.4;
      rects.push({ x: cx - topW / 2, y: cy - 12 - rng() * 5, w: topW, h: 8 + rng() * 5, color: pickCanopy(canopyLight) });
      // Bright speck
      rects.push({ x: cx - topW * 0.3, y: cy - 8, w: topW * 0.5, h: 3 + rng() * 3, color: pickCanopy(canopyHighlight) });
      return rects;
    };

    // ── TOP CANOPY TREES (6-8 overlapping trees across the top) ──
    const topCount = 6 + Math.floor(rng() * 3);
    for (let i = 0; i < topCount; i++) {
      const tx = (i / topCount) * width + (rng() - 0.5) * (width / topCount) * 0.6;
      const tw = (14 + rng() * 10) * scale;
      const th = (60 + rng() * 40) * scale;
      const baseY = th; // trunk extends down from top
      const canopyCx = tx + tw / 2;
      const canopyBaseW = (45 + rng() * 30) * scale;
      const canopyCy = baseY - 15 * scale - rng() * 10 * scale;

      this.topTrees.push({
        x: tx, y: baseY,
        trunkW: tw, trunkH: th,
        trunkColor: pickTrunk(),
        canopyRects: buildCanopy(canopyCx, canopyCy, canopyBaseW),
        rootRects: [],
      });
    }

    // ── LEFT SIDE TREES (2-3 trees) ──
    const leftCount = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < leftCount; i++) {
      const ty = height * 0.2 + (i / leftCount) * height * 0.55 + (rng() - 0.5) * 30 * scale;
      const tw = (16 + rng() * 12) * scale;
      const th = (70 + rng() * 50) * scale;
      const tx = -(tw * 0.3) + rng() * 10 * scale; // partially off-screen left
      const canopyCx = tx + tw / 2;
      const canopyBaseW = (40 + rng() * 25) * scale;
      const canopyCy = ty - th / 2;

      this.leftTrees.push({
        x: tx, y: ty,
        trunkW: tw, trunkH: th,
        trunkColor: pickTrunk(),
        canopyRects: buildCanopy(canopyCx, canopyCy, canopyBaseW),
        rootRects: [
          { x: tx - 3 * scale, y: ty + th / 2 - 4 * scale, w: tw + 6 * scale, h: 8 * scale, color: pickTrunk() },
        ],
      });
    }

    // ── RIGHT SIDE TREES (2-3 trees) ──
    const rightCount = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < rightCount; i++) {
      const ty = height * 0.15 + (i / rightCount) * height * 0.55 + (rng() - 0.5) * 30 * scale;
      const tw = (16 + rng() * 12) * scale;
      const th = (70 + rng() * 50) * scale;
      const tx = width - tw * 0.7 + rng() * 5 * scale; // partially off-screen right
      const canopyCx = tx + tw / 2;
      const canopyBaseW = (40 + rng() * 25) * scale;
      const canopyCy = ty - th / 2;

      this.rightTrees.push({
        x: tx, y: ty,
        trunkW: tw, trunkH: th,
        trunkColor: pickTrunk(),
        canopyRects: buildCanopy(canopyCx, canopyCy, canopyBaseW),
        rootRects: [
          { x: tx - 3 * scale, y: ty + th / 2 - 4 * scale, w: tw + 6 * scale, h: 8 * scale, color: pickTrunk() },
        ],
      });
    }

    // ── BOTTOM TREES (4-5 trees entering from bottom edge) ──
    const bottomCount = 4 + Math.floor(rng() * 2);
    for (let i = 0; i < bottomCount; i++) {
      const tx = (i / bottomCount) * width + (rng() - 0.5) * (width / bottomCount) * 0.5;
      const tw = (14 + rng() * 12) * scale;
      const th = (50 + rng() * 40) * scale;
      const baseY = height + th * 0.3; // trunk base below viewport
      const canopyCx = tx + tw / 2;
      const canopyBaseW = (40 + rng() * 30) * scale;
      const canopyCy = height - (20 + rng() * 25) * scale;

      this.bottomTrees.push({
        x: tx, y: baseY,
        trunkW: tw, trunkH: th,
        trunkColor: pickTrunk(),
        canopyRects: buildCanopy(canopyCx, canopyCy, canopyBaseW),
        rootRects: [],
      });
    }

    // ── CLEARING FLOOR (center area) ──
    const clearingTop = height * 0.35;
    const clearingBottom = height * 0.78;

    // Grass tufts
    for (let i = 0; i < 35; i++) {
      this.grassTufts.push({
        x: 20 * scale + rng() * (width - 40 * scale),
        y: clearingTop + rng() * (clearingBottom - clearingTop),
        w: (2 + rng() * 3) * scale,
        h: (3 + rng() * 5) * scale,
        color: rng() > 0.5 ? '#3a7a2a' : '#2d6b22',
      });
    }

    // Dirt patches
    for (let i = 0; i < 8; i++) {
      this.dirtPatches.push({
        x: 30 * scale + rng() * (width - 60 * scale),
        y: clearingTop + 10 * scale + rng() * (clearingBottom - clearingTop - 20 * scale),
        w: (8 + rng() * 15) * scale,
        h: (4 + rng() * 8) * scale,
        color: rng() > 0.5 ? '#5a4a30' : '#4a3b28',
      });
    }

    // Fallen leaves
    const leafColors = ['#92400e', '#b45309', '#ca8a04', '#a16207', '#dc2626'];
    for (let i = 0; i < 20; i++) {
      this.fallenLeaves.push({
        x: 15 * scale + rng() * (width - 30 * scale),
        y: clearingTop + rng() * (clearingBottom - clearingTop + 20 * scale),
        w: (2 + rng() * 3) * scale,
        h: (1 + rng() * 2) * scale,
        color: leafColors[Math.floor(rng() * leafColors.length)],
      });
    }

    // Small flowers
    const flowerColors = ['#fbbf24', '#f472b6', '#c084fc', '#ffffff'];
    for (let i = 0; i < 5; i++) {
      this.flowers.push({
        x: 30 * scale + rng() * (width - 60 * scale),
        y: clearingTop + 20 * scale + rng() * (clearingBottom - clearingTop - 30 * scale),
        w: 3 * scale,
        h: 3 * scale,
        color: flowerColors[Math.floor(rng() * flowerColors.length)],
      });
    }

    // ── FOREGROUND CANOPY OVERLAY (dark rects at extreme edges for vignette) ──
    // Top edge overlay
    for (let i = 0; i < 5; i++) {
      const fx = (i / 5) * width + (rng() - 0.5) * width * 0.15;
      this.foregroundCanopy.push({
        x: fx, y: -rng() * 5 * scale,
        w: (50 + rng() * 30) * scale,
        h: (15 + rng() * 10) * scale,
        color: pickCanopy(canopyDark),
      });
    }
    // Bottom edge overlay
    for (let i = 0; i < 4; i++) {
      const fx = (i / 4) * width + (rng() - 0.5) * width * 0.15;
      this.foregroundCanopy.push({
        x: fx, y: height - (12 + rng() * 8) * scale,
        w: (45 + rng() * 30) * scale,
        h: (15 + rng() * 10) * scale,
        color: pickCanopy(canopyDark),
      });
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.width !== width || this.height !== height) {
      this.generate(width, height);
    }

    // 1. Base fill — dark forest green, no sky
    ctx.fillStyle = '#1a3a14';
    ctx.fillRect(0, 0, width, height);

    // 2. Clearing floor gradient — earthy green in center
    const clearingTop = height * 0.35;
    const clearingBottom = height * 0.78;
    const clearingGrad = ctx.createRadialGradient(
      width / 2, (clearingTop + clearingBottom) / 2, 0,
      width / 2, (clearingTop + clearingBottom) / 2, width * 0.45,
    );
    clearingGrad.addColorStop(0, '#4a7a3a');   // bright center
    clearingGrad.addColorStop(0.5, '#3d6b30'); // mid green
    clearingGrad.addColorStop(0.8, '#2d5520'); // darker edges
    clearingGrad.addColorStop(1, '#1a3a14');   // blends into forest
    ctx.fillStyle = clearingGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Dirt patches
    for (const d of this.dirtPatches) {
      ctx.fillStyle = d.color;
      ctx.fillRect(Math.floor(d.x), Math.floor(d.y), Math.floor(d.w), Math.floor(d.h));
    }

    // 4. Grass tufts
    for (const g of this.grassTufts) {
      ctx.fillStyle = g.color;
      ctx.fillRect(Math.floor(g.x), Math.floor(g.y - g.h), Math.floor(g.w), Math.floor(g.h));
    }

    // 5. Flowers
    for (const f of this.flowers) {
      ctx.fillStyle = f.color;
      ctx.fillRect(Math.floor(f.x), Math.floor(f.y), Math.floor(f.w), Math.floor(f.h));
      ctx.fillStyle = '#15803d';
      ctx.fillRect(Math.floor(f.x + f.w / 3), Math.floor(f.y + f.h), Math.ceil(f.w / 3), Math.ceil(4 * (width / 300)));
    }

    // 6. Fallen leaves
    for (const leaf of this.fallenLeaves) {
      ctx.fillStyle = leaf.color;
      ctx.fillRect(Math.floor(leaf.x), Math.floor(leaf.y), Math.floor(leaf.w), Math.floor(leaf.h));
    }

    // 7. Tree trunks (all sides)
    this.renderTrunks(ctx, this.topTrees, 'top');
    this.renderTrunks(ctx, this.leftTrees, 'side');
    this.renderTrunks(ctx, this.rightTrees, 'side');
    this.renderTrunks(ctx, this.bottomTrees, 'bottom');

    // 8. Tree canopies (all sides — on top of trunks)
    for (const trees of [this.topTrees, this.leftTrees, this.rightTrees, this.bottomTrees]) {
      for (const tree of trees) {
        for (const r of tree.canopyRects) {
          ctx.fillStyle = r.color;
          ctx.fillRect(Math.floor(r.x), Math.floor(r.y), Math.floor(r.w), Math.floor(r.h));
        }
      }
    }

    // 9. Foreground canopy overlay (vignette framing)
    for (const r of this.foregroundCanopy) {
      ctx.fillStyle = r.color;
      ctx.fillRect(Math.floor(r.x), Math.floor(r.y), Math.floor(r.w), Math.floor(r.h));
    }

    // 10. Subtle dark vignette at edges
    const vignetteGrad = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.2,
      width / 2, height / 2, width * 0.7,
    );
    vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, width, height);
  }

  private renderTrunks(ctx: CanvasRenderingContext2D, trees: BgTree[], type: 'top' | 'side' | 'bottom'): void {
    for (const tree of trees) {
      // Main trunk
      ctx.fillStyle = tree.trunkColor;
      if (type === 'top') {
        // Trunk grows downward from top
        ctx.fillRect(
          Math.floor(tree.x), 0,
          Math.floor(tree.trunkW), Math.floor(tree.y),
        );
      } else if (type === 'bottom') {
        // Trunk grows upward from bottom
        const trunkTop = tree.y - tree.trunkH;
        ctx.fillRect(
          Math.floor(tree.x), Math.floor(trunkTop),
          Math.floor(tree.trunkW), Math.floor(tree.trunkH),
        );
      } else {
        // Side tree — vertical trunk
        const trunkTop = tree.y - tree.trunkH / 2;
        ctx.fillRect(
          Math.floor(tree.x), Math.floor(trunkTop),
          Math.floor(tree.trunkW), Math.floor(tree.trunkH),
        );
      }

      // Bark detail — darker lines
      ctx.fillStyle = '#3d2211';
      const barkX = tree.x + tree.trunkW * 0.3;
      const barkX2 = tree.x + tree.trunkW * 0.65;
      const start = type === 'top' ? 10 : tree.y - tree.trunkH / 2;
      const end = type === 'top' ? tree.y : tree.y + tree.trunkH / 2;
      for (let by = start; by < end; by += 12 * (this.width / 300)) {
        ctx.fillRect(Math.floor(barkX), Math.floor(by), 2, 5);
        ctx.fillRect(Math.floor(barkX2), Math.floor(by + 6), 2, 4);
      }

      // Root flare
      for (const root of tree.rootRects) {
        ctx.fillStyle = root.color;
        ctx.fillRect(Math.floor(root.x), Math.floor(root.y), Math.floor(root.w), Math.floor(root.h));
      }
    }
  }

  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return s / 2147483647;
    };
  }
}
```

**Step 4: Run tests to verify nothing broke**

Run: `cd /Users/danilotrebjesanin/dev/claude-pixel-quest && npx vitest run src/webview/scene/ForestBackground.test.ts`
Expected: PASS

Run: `cd /Users/danilotrebjesanin/dev/claude-pixel-quest && npx vitest run`
Expected: All existing tests still pass

**Step 5: Commit**

```bash
cd /Users/danilotrebjesanin/dev/claude-pixel-quest
git add src/webview/scene/ForestBackground.ts src/webview/scene/ForestBackground.test.ts
git commit -m "feat: rewrite ForestBackground as enclosed clearing composition

Replace sky-and-ground-line layout with dense trees on all four
sides surrounding a central clearing. No horizon, no sky visible."
```

---

### Task 5: Update ForestTheme Layout

**Files:**
- Modify: `src/webview/theme/ForestTheme.ts`

**Step 1: No test needed — layout values are config, tested via integration**

**Step 2: Update the theme**

In `src/webview/theme/ForestTheme.ts`, make these changes:

- `backgroundColor`: `'#1a3a14'` (dark forest, matches new background)
- `targetPositions`: Adjust to stay within clearing — `(70, 180)`, `(150, 165)`, `(230, 185)` (slightly higher and more centered)
- `spawnArea`: Keep `xMin: 60, xMax: 220, y: 220`
- `depositPosition`: Keep `{ x: 130, y: 300 }`

**Step 3: Run full test suite**

Run: `cd /Users/danilotrebjesanin/dev/claude-pixel-quest && npx vitest run`
Expected: All tests pass

**Step 4: Commit**

```bash
cd /Users/danilotrebjesanin/dev/claude-pixel-quest
git add src/webview/theme/ForestTheme.ts
git commit -m "feat: adjust forest theme layout for clearing composition"
```

---

### Task 6: Wire Atmosphere into ForestScene

**Files:**
- Modify: `src/webview/scene/ForestScene.ts`

**Step 1: Write the failing test**

```typescript
// src/webview/scene/ForestScene.test.ts
import { describe, it, expect } from 'vitest';
import { ForestScene } from './ForestScene';

describe('ForestScene', () => {
  it('constructs without throwing', () => {
    expect(() => new ForestScene()).not.toThrow();
  });

  it('update does not throw', () => {
    const scene = new ForestScene();
    expect(() => scene.update(100)).not.toThrow();
  });

  it('has falling leaves atmosphere', () => {
    const scene = new ForestScene();
    expect((scene as any).fallingLeaves).toBeDefined();
    expect((scene as any).fallingLeaves.count).toBeGreaterThan(0);
  });

  it('has forest birds', () => {
    const scene = new ForestScene();
    expect((scene as any).birds.length).toBeGreaterThan(0);
  });

  it('has sunbeam shafts', () => {
    const scene = new ForestScene();
    expect((scene as any).sunbeams).toBeDefined();
    expect((scene as any).sunbeams.shaftCount).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/danilotrebjesanin/dev/claude-pixel-quest && npx vitest run src/webview/scene/ForestScene.test.ts`
Expected: FAIL — fallingLeaves/birds/sunbeams not defined

**Step 3: Wire atmosphere into ForestScene**

Replace `src/webview/scene/ForestScene.ts`:

```typescript
import { BaseScene, Target } from './BaseScene';
import { ForestBackground } from './ForestBackground';
import { Tree } from '../entities/Tree';
import { Lumberjack } from '../entities/Lumberjack';
import { Goblin } from '../entities/Goblin';
import { FOREST_THEME } from '../theme/ForestTheme';
import { FallingLeaves } from './FallingLeaves';
import { ForestBird } from '../entities/ForestBird';
import { SunbeamShafts } from './SunbeamShafts';

export class ForestScene extends BaseScene {
  private background = new ForestBackground();
  private fallingLeaves!: FallingLeaves;
  private birds: ForestBird[] = [];
  private sunbeams!: SunbeamShafts;

  constructor() {
    super(FOREST_THEME);
    this.createTargets();
    this.createAtmosphere();
  }

  protected createTargets(): void {
    for (const pos of this.theme.layout.targetPositions) {
      this.targets.push(new Tree(pos.x, pos.y) as Target);
    }
  }

  protected createCharacter(x: number, y: number, id: string): Goblin {
    return new Lumberjack(x, y, this.particles, id);
  }

  protected createAtmosphere(): void {
    this.fallingLeaves = new FallingLeaves(300, 400);

    // Birds perched in canopy area (upper portion of viewport)
    this.birds = [
      new ForestBird(45, 35),
      new ForestBird(200, 28),
      new ForestBird(260, 45),
    ];

    // Sunbeam shafts — positioned in canopy gaps
    this.sunbeams = new SunbeamShafts([
      { x: 90, width: 14, height: 200 },
      { x: 170, width: 10, height: 170 },
      { x: 240, width: 12, height: 185 },
    ]);
  }

  protected updateAtmosphere(dt: number): void {
    this.fallingLeaves.update(dt);
    for (const bird of this.birds) bird.update(dt);
    this.sunbeams.update(dt);
  }

  protected renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    this.background.render(ctx, w, h);
  }

  protected renderAtmosphereBack(ctx: CanvasRenderingContext2D, scale: number): void {
    // Sunbeams behind characters
    this.sunbeams.render(ctx, scale);
    // Falling leaves behind characters
    this.fallingLeaves.render(ctx, scale);
  }

  protected renderAtmosphereFront(ctx: CanvasRenderingContext2D, scale: number): void {
    // Birds in front of characters
    for (const bird of this.birds) bird.render(ctx, scale);
  }

  protected renderGlow(ctx: CanvasRenderingContext2D, scale: number): void {
    this.sunbeams.renderGlow(ctx, scale);
  }

  protected resizeAtmosphere(w: number, h: number): void {
    this.background.generate(w, h);
    this.fallingLeaves.resize(w, h);
  }
}
```

**Step 4: Run tests to verify everything passes**

Run: `cd /Users/danilotrebjesanin/dev/claude-pixel-quest && npx vitest run src/webview/scene/ForestScene.test.ts`
Expected: PASS (5 tests)

Run: `cd /Users/danilotrebjesanin/dev/claude-pixel-quest && npx vitest run`
Expected: All tests pass

**Step 5: Commit**

```bash
cd /Users/danilotrebjesanin/dev/claude-pixel-quest
git add src/webview/scene/ForestScene.ts src/webview/scene/ForestScene.test.ts
git commit -m "feat: wire atmosphere into ForestScene

Add falling leaves, forest birds, and sunbeam shafts to the
forest theme, filling in the previously empty atmosphere methods."
```

---

### Task 7: Visual Verification & Full Test Suite

**Step 1: Run the full test suite**

Run: `cd /Users/danilotrebjesanin/dev/claude-pixel-quest && npx vitest run`
Expected: All tests pass

**Step 2: Build the extension**

Run: `cd /Users/danilotrebjesanin/dev/claude-pixel-quest && npm run build`
Expected: Build succeeds with no errors

**Step 3: Manual visual test**

Open VS Code, run "Pixel Quest: Change Theme" → select "Forest", then run "Pixel Quest: Run Demo" to visually verify:
- No sky visible — entire scene is enclosed forest
- Trees on all 4 sides
- Central clearing visible with grass/earth floor
- Lumberjack character and targets visible in clearing
- Falling leaves drifting through scene
- Bird silhouettes in canopy, occasionally flitting
- Subtle sunbeam shafts

**Step 4: Final commit if any visual tweaks are needed**

Adjust any spacing/positioning based on visual results and commit.
