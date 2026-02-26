# Sea Fishing Theme Rework — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the fishing theme from a lakeside pond to an open-sea scene with boats as characters, fish schools as targets, and full ocean atmosphere.

**Architecture:** Replace Fisher with FishingBoat (extends Goblin), replace FishingSpot with FishSchool, rewrite FishingBackground as all-ocean with island+dock, add SeaWaves and Seagull atmosphere entities, wire into FishingScene. Delete old Fisher.ts and FishingSpot.ts.

**Tech Stack:** TypeScript, Canvas 2D (fillRect-based pixel art), Vitest, Webpack

---

### Context for all tasks

- Logical coordinate system: 300x400, scaled via `camera.getScale()` (= canvasWidth / 300)
- All rendering uses `ctx.fillRect()` — no sprites, no arcs, no paths
- Characters extend `Goblin` (src/webview/entities/Goblin.ts) which handles movement, state machine, labels, particles
- Goblin states: IDLE, WALKING, MINING, CART, DEPOSITING, CELEBRATING, SLEEPING, POOF_IN
- Test pattern: Vitest, `describe/it/expect`, see ForestBird.test.ts for entity test examples
- `AmbientParticlePool` (src/webview/entities/AmbientParticlePool.ts) — reusable particle system with gravity, spawn, update, render
- Run tests: `cd /Users/danilotrebjesanin/dev/claude-pixel-quest && npx vitest run`
- Run single test: `npx vitest run src/webview/entities/FishingBoat.test.ts`

---

### Task 1: FishingBoat entity (TDD)

New character that extends Goblin. Renders a pixel-art fishing boat instead of a humanoid.

**Files:**
- Create: `src/webview/entities/FishingBoat.ts`
- Create: `src/webview/entities/FishingBoat.test.ts`

**Reference:** `src/webview/entities/Fisher.ts` (being replaced — study its structure), `src/webview/entities/Goblin.ts` (base class)

**Step 1: Write the test file**

```typescript
// src/webview/entities/FishingBoat.test.ts
import { describe, it, expect } from 'vitest';
import { FishingBoat } from './FishingBoat';
import { ParticleEmitter } from './ParticleEmitter';

describe('FishingBoat', () => {
  it('constructs without throwing', () => {
    const particles = new ParticleEmitter();
    expect(() => new FishingBoat(100, 150, particles, 'test')).not.toThrow();
  });

  it('extends Goblin — has walkTo and transitionTo', () => {
    const particles = new ParticleEmitter();
    const boat = new FishingBoat(100, 150, particles, 'test');
    expect(typeof boat.walkTo).toBe('function');
    expect(typeof boat.transitionTo).toBe('function');
  });

  it('starts in IDLE state', () => {
    const particles = new ParticleEmitter();
    const boat = new FishingBoat(100, 150, particles, 'test');
    expect(boat.getState()).toBe('IDLE');
  });

  it('has boss variant', () => {
    const particles = new ParticleEmitter();
    const boat = new FishingBoat(100, 150, particles, 'test');
    boat.variant = 'boss';
    expect(boat.variant).toBe('boss');
  });

  it('update does not throw', () => {
    const particles = new ParticleEmitter();
    const boat = new FishingBoat(100, 150, particles, 'test');
    expect(() => boat.update(16)).not.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/webview/entities/FishingBoat.test.ts`
Expected: FAIL — module not found

**Step 3: Implement FishingBoat**

```typescript
// src/webview/entities/FishingBoat.ts
import { Goblin } from './Goblin';
import { GoblinState } from './GoblinStateMachine';

const SIZE = 32;

// Boat hull colors
const HULL_MAIN = '#8B4513';     // Saddlebrown hull
const HULL_DARK = '#6B3410';     // Darker bottom
const HULL_LIGHT = '#A0522D';    // Sienna highlight
const HULL_RED = '#B22222';      // Firebrick red stripe
const GUNWALE = '#D2B48C';       // Tan top edge

// Cabin / mast
const MAST_COLOR = '#6B4226';    // Wood brown mast
const SAIL_WHITE = '#F5F5DC';    // Beige white sail
const SAIL_SHADOW = '#D4C5A0';   // Sail shadow
const FLAG_RED = '#EF4444';      // Red flag/pennant

// Boss variant — gold trim captain's vessel
const BOSS_HULL = '#1E3A5F';     // Navy blue hull
const BOSS_HULL_DARK = '#142B4A';
const BOSS_TRIM = '#FFD700';     // Gold trim
const BOSS_SAIL = '#F0E68C';     // Khaki/golden sail

// Fishing gear
const ROD_HANDLE = '#6B4226';
const ROD_LINE = '#C0C0C0';
const BOBBER_RED = '#EF4444';
const BOBBER_WHITE = '#FFFFFF';

// Net / haul
const NET_COLOR = '#8B7355';     // Rope-colored net
const NET_DARK = '#6B5540';

// Labels (same as Goblin)
const LABEL_BG = 'rgba(0,0,0,0.75)';
const LABEL_TEXT = '#e2e8f0';
const NAME_BG = 'rgba(0,0,0,0.55)';
const NAME_TEXT = '#94a3b8';

// Scroll (for "reading" state)
const SCROLL_BODY = '#fef3c7';
const SCROLL_EDGE = '#d97706';
const SCROLL_TEXT = '#92400e';

export class FishingBoat extends Goblin {

  renderShadow(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    // Water reflection — semi-transparent darker oval below boat
    const shadowX = Math.floor(this.x * s + 2 * s);
    const shadowY = Math.floor(this.y * s + 14 * s);
    const shadowW = Math.floor(28 * s);
    const shadowH = Math.floor(4 * s);

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#0a2a4a';
    ctx.fillRect(shadowX, shadowY, shadowW, shadowH);
    ctx.fillRect(shadowX + 2 * s, shadowY + shadowH, shadowW - 4 * s, 2 * s);
    ctx.globalAlpha = 1;
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const state = this.stateMachine.getState();
    const isFishing = state === 'MINING';

    ctx.save();

    // Flip logic (same as Goblin)
    const centerX = this.x * s + SIZE * s / 2;
    if (!this.facingRight) {
      ctx.translate(centerX, 0);
      ctx.scale(-1, 1);
      ctx.translate(-centerX, 0);
    }

    const px = Math.floor(this.x * s);
    const py = Math.floor(this.y * s);

    // Bob animation — boats bob on water
    const bobPhase = this.animFrame * Math.PI / 2;
    const bob = Math.sin(bobPhase) * 2 * s;
    const walkBob = state === 'WALKING' ? Math.sin(bobPhase) * 3 * s : 0;
    const jump = state === 'CELEBRATING' ? Math.abs(Math.sin(bobPhase)) * 6 * s : 0;
    const shake = isFishing ? (this.animFrame % 2 === 0 ? 1 : -1) * s : 0;
    const drawY = py - bob - walkBob - jump;
    const drawX = px + shake;

    const isBoss = this.variant === 'boss';

    // === HULL ===
    const hullMain = isBoss ? BOSS_HULL : HULL_MAIN;
    const hullDark = isBoss ? BOSS_HULL_DARK : HULL_DARK;

    // Hull body — boat shape: wider at top, narrower at bottom (trapezoid via rects)
    // Main hull body
    ctx.fillStyle = hullMain;
    ctx.fillRect(Math.floor(drawX + 4 * s), Math.floor(drawY + 6 * s), Math.floor(24 * s), Math.floor(8 * s));
    // Wider upper part
    ctx.fillRect(Math.floor(drawX + 2 * s), Math.floor(drawY + 4 * s), Math.floor(28 * s), Math.floor(4 * s));
    // Narrower bottom (keel area)
    ctx.fillStyle = hullDark;
    ctx.fillRect(Math.floor(drawX + 6 * s), Math.floor(drawY + 12 * s), Math.floor(20 * s), Math.floor(3 * s));
    // Keel point
    ctx.fillRect(Math.floor(drawX + 10 * s), Math.floor(drawY + 14 * s), Math.floor(12 * s), Math.floor(2 * s));

    // Red stripe (or gold for boss)
    ctx.fillStyle = isBoss ? BOSS_TRIM : HULL_RED;
    ctx.fillRect(Math.floor(drawX + 2 * s), Math.floor(drawY + 7 * s), Math.floor(28 * s), Math.floor(2 * s));

    // Gunwale (top edge)
    ctx.fillStyle = isBoss ? BOSS_TRIM : GUNWALE;
    ctx.fillRect(Math.floor(drawX + 1 * s), Math.floor(drawY + 3 * s), Math.floor(30 * s), Math.floor(2 * s));

    // Bow (front pointed extension)
    ctx.fillStyle = hullMain;
    ctx.fillRect(Math.floor(drawX + 28 * s), Math.floor(drawY + 5 * s), Math.floor(4 * s), Math.floor(4 * s));
    ctx.fillStyle = isBoss ? BOSS_TRIM : GUNWALE;
    ctx.fillRect(Math.floor(drawX + 28 * s), Math.floor(drawY + 4 * s), Math.floor(4 * s), Math.floor(2 * s));

    // === MAST + SAIL ===
    // Mast — vertical pole from center of boat
    ctx.fillStyle = MAST_COLOR;
    ctx.fillRect(Math.floor(drawX + 14 * s), Math.floor(drawY - 14 * s), Math.floor(2 * s), Math.floor(18 * s));

    // Sail — triangle approximated with stacked rects
    const sailColor = isBoss ? BOSS_SAIL : SAIL_WHITE;
    const sailShadow = isBoss ? '#C8B860' : SAIL_SHADOW;

    // Sail billowing slightly with animation
    const sailBillow = state === 'WALKING' ? Math.sin(bobPhase * 0.5) * 1 * s : 0;

    ctx.fillStyle = sailColor;
    ctx.fillRect(Math.floor(drawX + 16 * s + sailBillow), Math.floor(drawY - 12 * s), Math.floor(10 * s), Math.floor(4 * s));
    ctx.fillRect(Math.floor(drawX + 16 * s + sailBillow), Math.floor(drawY - 8 * s), Math.floor(8 * s), Math.floor(4 * s));
    ctx.fillRect(Math.floor(drawX + 16 * s + sailBillow), Math.floor(drawY - 4 * s), Math.floor(5 * s), Math.floor(3 * s));

    // Sail shadow stripe
    ctx.fillStyle = sailShadow;
    ctx.fillRect(Math.floor(drawX + 16 * s + sailBillow), Math.floor(drawY - 6 * s), Math.floor(8 * s), Math.floor(2 * s));

    // Flag/pennant at mast top
    ctx.fillStyle = isBoss ? BOSS_TRIM : FLAG_RED;
    ctx.fillRect(Math.floor(drawX + 16 * s), Math.floor(drawY - 16 * s), Math.floor(6 * s), Math.floor(3 * s));
    ctx.fillRect(Math.floor(drawX + 16 * s), Math.floor(drawY - 14 * s), Math.floor(4 * s), Math.floor(2 * s));

    // === TOOLS ===
    this.renderTools(ctx, state, drawX, drawY, s);

    ctx.restore();

    // === ACTION LABEL above boat (never flipped) ===
    if (this.actionLabel) {
      const labelX = Math.floor(this.x * s + SIZE * s / 2);
      const labelY = Math.floor(this.y * s - 20 * s);
      const fontSize = Math.max(9, Math.floor(10 * s));
      ctx.font = `bold ${fontSize}px monospace`;
      const tw = ctx.measureText(this.actionLabel).width;
      const pad = 3 * s;

      ctx.fillStyle = LABEL_BG;
      ctx.fillRect(labelX - tw / 2 - pad, labelY - fontSize - pad, tw + pad * 2, fontSize + pad * 2);
      ctx.fillStyle = LABEL_TEXT;
      ctx.textAlign = 'center';
      ctx.fillText(this.actionLabel, labelX, labelY);
      ctx.textAlign = 'start';
    }

    // === NAME LABEL below boat (never flipped) ===
    if (this.nameLabel) {
      const nameX = Math.floor(this.x * s + SIZE * s / 2);
      const nameY = Math.floor(this.y * s + 20 * s);
      const fontSize = Math.max(8, Math.floor(9 * s));
      ctx.font = `${fontSize}px monospace`;
      const tw = ctx.measureText(this.nameLabel).width;
      const pad = 2 * s;

      ctx.fillStyle = NAME_BG;
      ctx.fillRect(nameX - tw / 2 - pad, nameY - pad, tw + pad * 2, fontSize + pad * 2);
      ctx.fillStyle = NAME_TEXT;
      ctx.textAlign = 'center';
      ctx.fillText(this.nameLabel, nameX, nameY + fontSize);
      ctx.textAlign = 'start';

      if (this.roleLabel) {
        const roleY = nameY + fontSize + pad * 2 + 2 * s;
        const roleFontSize = Math.max(7, Math.floor(8 * s));
        ctx.font = `${roleFontSize}px monospace`;
        const rw = ctx.measureText(this.roleLabel).width;
        const rPad = 2 * s;

        ctx.fillStyle = NAME_BG;
        ctx.fillRect(nameX - rw / 2 - rPad, roleY - rPad, rw + rPad * 2, roleFontSize + rPad * 2);
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText(this.roleLabel, nameX, roleY + roleFontSize);
        ctx.textAlign = 'start';
      }
    }
  }

  protected renderTools(
    ctx: CanvasRenderingContext2D,
    state: GoblinState,
    drawX: number,
    drawY: number,
    s: number,
  ): void {
    // ── FISHING ROD (MINING state) ──
    if (state === 'MINING') {
      const swingAngle = Math.sin(this.animFrame * Math.PI / 2) * 0.4;
      ctx.save();
      ctx.translate(Math.floor(drawX + 26 * s), Math.floor(drawY + 2 * s));
      ctx.rotate(swingAngle);

      // Rod shaft
      ctx.fillStyle = ROD_HANDLE;
      ctx.fillRect(0, Math.floor(-16 * s), Math.floor(2 * s), Math.floor(18 * s));

      // Rod tip
      ctx.fillStyle = '#9CA3AF';
      ctx.fillRect(0, Math.floor(-20 * s), Math.floor(2 * s), Math.floor(5 * s));

      // Fishing line dropping down
      ctx.fillStyle = ROD_LINE;
      const lineSwing = Math.sin(this.animFrame * Math.PI / 2) * 2;
      ctx.fillRect(Math.floor((1 + lineSwing) * s), Math.floor(-20 * s), Math.floor(1 * s), Math.floor(4 * s));
      ctx.fillRect(Math.floor((2 + lineSwing) * s), Math.floor(-17 * s), Math.floor(1 * s), Math.floor(6 * s));
      ctx.fillRect(Math.floor((3 + lineSwing) * s), Math.floor(-12 * s), Math.floor(1 * s), Math.floor(8 * s));
      ctx.fillRect(Math.floor((3 + lineSwing) * s), Math.floor(-5 * s), Math.floor(1 * s), Math.floor(8 * s));

      // Bobber at end of line
      const bobberBob = Math.sin(this.animFrame * Math.PI / 2) * 2;
      const bobberX = Math.floor((3 + lineSwing) * s);
      const bobberY = Math.floor((3 + bobberBob) * s);
      ctx.fillStyle = BOBBER_RED;
      ctx.fillRect(bobberX - Math.floor(2 * s), bobberY, Math.floor(4 * s), Math.floor(3 * s));
      ctx.fillStyle = BOBBER_WHITE;
      ctx.fillRect(bobberX - Math.floor(2 * s), bobberY + Math.floor(3 * s), Math.floor(4 * s), Math.floor(2 * s));

      ctx.restore();
      return;
    }

    // ── FISH NET (CART state or walking with showCart) ──
    if (state === 'CART' || (this.showCart && state === 'WALKING')) {
      const netBob = state === 'WALKING' ? Math.sin(this.animFrame * Math.PI / 2) * 1 * s : 0;
      const netX = Math.floor(drawX + 4 * s);
      const netY = Math.floor(drawY - 2 * s + netBob);

      // Net body (rope mesh)
      ctx.fillStyle = NET_COLOR;
      ctx.fillRect(netX, netY, Math.floor(12 * s), Math.floor(6 * s));
      ctx.fillStyle = NET_DARK;
      ctx.fillRect(netX + Math.floor(1 * s), netY + Math.floor(4 * s), Math.floor(10 * s), Math.floor(2 * s));

      // Fish visible in net
      ctx.fillStyle = '#60A5FA'; // Blue fish
      ctx.fillRect(netX + Math.floor(2 * s), netY - Math.floor(2 * s), Math.floor(4 * s), Math.floor(3 * s));
      ctx.fillStyle = '#34D399'; // Green fish
      ctx.fillRect(netX + Math.floor(7 * s), netY - Math.floor(1 * s), Math.floor(3 * s), Math.floor(2 * s));
      // Tail fin
      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(netX + Math.floor(1 * s), netY - Math.floor(3 * s), Math.floor(2 * s), Math.floor(2 * s));

      return;
    }

    // ── SCROLL (explore/research state) ──
    if (this.showScroll && (state === 'IDLE' || state === 'WALKING')) {
      const scrollBob = state === 'WALKING' ? Math.sin(this.animFrame * Math.PI) * 1 * s : 0;
      const scrollX = Math.floor(drawX + 20 * s);
      const scrollY = Math.floor(drawY - 6 * s + scrollBob);

      ctx.fillStyle = SCROLL_BODY;
      ctx.fillRect(scrollX, scrollY, Math.floor(10 * s), Math.floor(12 * s));
      ctx.fillStyle = SCROLL_EDGE;
      ctx.fillRect(scrollX - Math.floor(1 * s), scrollY - Math.floor(1 * s), Math.floor(12 * s), Math.floor(2 * s));
      ctx.fillRect(scrollX - Math.floor(1 * s), scrollY + Math.floor(10 * s), Math.floor(12 * s), Math.floor(2 * s));
      ctx.fillStyle = SCROLL_TEXT;
      ctx.fillRect(scrollX + Math.floor(2 * s), scrollY + Math.floor(3 * s), Math.floor(6 * s), Math.floor(1 * s));
      ctx.fillRect(scrollX + Math.floor(2 * s), scrollY + Math.floor(5 * s), Math.floor(4 * s), Math.floor(1 * s));
      ctx.fillRect(scrollX + Math.floor(2 * s), scrollY + Math.floor(7 * s), Math.floor(5 * s), Math.floor(1 * s));
    }

    // ── SLEEPING: anchor icon ──
    if (state === 'SLEEPING') {
      ctx.fillStyle = '#78716c';
      // Anchor shaft
      ctx.fillRect(Math.floor(drawX + 14 * s), Math.floor(drawY - 8 * s), Math.floor(2 * s), Math.floor(8 * s));
      // Anchor crossbar
      ctx.fillRect(Math.floor(drawX + 11 * s), Math.floor(drawY - 4 * s), Math.floor(8 * s), Math.floor(2 * s));
      // Anchor ring at top
      ctx.fillRect(Math.floor(drawX + 13 * s), Math.floor(drawY - 10 * s), Math.floor(4 * s), Math.floor(3 * s));
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/webview/entities/FishingBoat.test.ts`
Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add src/webview/entities/FishingBoat.ts src/webview/entities/FishingBoat.test.ts
git commit -m "feat: add FishingBoat entity for sea fishing theme"
```

---

### Task 2: FishSchool entity (TDD)

New target entity — schools of fish visible on the water surface.

**Files:**
- Create: `src/webview/entities/FishSchool.ts`
- Create: `src/webview/entities/FishSchool.test.ts`

**Reference:** `src/webview/entities/FishingSpot.ts` (being replaced — study its interface: x, y, update(dt), render(ctx, scale))

**Step 1: Write the test file**

```typescript
// src/webview/entities/FishSchool.test.ts
import { describe, it, expect } from 'vitest';
import { FishSchool } from './FishSchool';

describe('FishSchool', () => {
  it('constructs with x and y', () => {
    const school = new FishSchool(100, 180);
    expect(school.x).toBe(100);
    expect(school.y).toBe(180);
  });

  it('update does not throw', () => {
    const school = new FishSchool(100, 180);
    expect(() => school.update(16)).not.toThrow();
  });

  it('phase advances during update', () => {
    const school = new FishSchool(100, 180);
    school.update(1000);
    expect((school as any).phase).toBeGreaterThan(0);
  });

  it('splash triggers after interval', () => {
    const school = new FishSchool(100, 180);
    // Tick enough to trigger splash (3-8 seconds)
    for (let t = 0; t < 10000; t += 16) {
      school.update(16);
    }
    // At least one splash should have triggered by now
    // (test that it doesn't error — splash is visual)
    expect(true).toBe(true);
  });

  it('has fish count between 3 and 5', () => {
    const school = new FishSchool(100, 180);
    const fishCount = (school as any).fishCount;
    expect(fishCount).toBeGreaterThanOrEqual(3);
    expect(fishCount).toBeLessThanOrEqual(5);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/webview/entities/FishSchool.test.ts`
Expected: FAIL — module not found

**Step 3: Implement FishSchool**

The FishSchool renders as a cluster of 3-5 small fish silhouettes that undulate, with occasional splash/jump effects. Similar structure to FishingSpot but with visible fish shapes instead of ripples.

Key visual elements:
- Fish silhouettes: Dark shadows (~3x2px each) that drift in a loose cluster
- Undulation: Fish positions oscillate slightly with sine wave
- Splash: Occasional fish jumps (small arc of pixels above water, reuse splash mechanic from FishingSpot)
- Shimmer: Light glints on water around school

Must have: `x`, `y`, `update(dt)`, `render(ctx, scale)` — same interface as FishingSpot so it works as a `Target`.

Fish color palette: use underwater shadow tones (`#1a4a6b`, `#1e5a7b`, `#164060`) for the silhouettes, with occasional bright flash (`#60a5fa`) when a fish turns/jumps.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/webview/entities/FishSchool.test.ts`
Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add src/webview/entities/FishSchool.ts src/webview/entities/FishSchool.test.ts
git commit -m "feat: add FishSchool entity for sea fishing targets"
```

---

### Task 3: Seagull entity (TDD)

Flying seagulls for sea atmosphere. Same pattern as ForestBird but with white body, longer flight paths, and sea-appropriate positioning.

**Files:**
- Create: `src/webview/entities/Seagull.ts`
- Create: `src/webview/entities/Seagull.test.ts`

**Reference:** `src/webview/entities/ForestBird.ts` — same PERCHED/FLYING state machine pattern

**Step 1: Write the test file**

```typescript
// src/webview/entities/Seagull.test.ts
import { describe, it, expect } from 'vitest';
import { Seagull } from './Seagull';

function tickUntilState(gull: Seagull, target: 'PERCHED' | 'FLYING', maxMs = 20000, stepMs = 16): void {
  for (let t = 0; t < maxMs; t += stepMs) {
    gull.update(stepMs);
    if (gull.state === target) return;
  }
}

describe('Seagull', () => {
  it('starts in PERCHED state', () => {
    const gull = new Seagull(150, 60);
    expect(gull.state).toBe('PERCHED');
  });

  it('stays PERCHED while timer has not expired', () => {
    const gull = new Seagull(150, 60);
    gull.update(500);
    expect(gull.state).toBe('PERCHED');
  });

  it('transitions to FLYING after perchTimer expires', () => {
    const gull = new Seagull(150, 60);
    tickUntilState(gull, 'FLYING');
    expect(gull.state).toBe('FLYING');
  });

  it('returns to PERCHED after flight completes', () => {
    const gull = new Seagull(150, 60);
    tickUntilState(gull, 'FLYING');
    tickUntilState(gull, 'PERCHED');
    expect(gull.state).toBe('PERCHED');
  });

  it('returns to origin after flight', () => {
    const gull = new Seagull(150, 60);
    tickUntilState(gull, 'FLYING');
    tickUntilState(gull, 'PERCHED');
    expect(gull.x).toBe(150);
    expect(gull.y).toBe(60);
  });

  it('moves during FLYING state', () => {
    const gull = new Seagull(150, 60);
    tickUntilState(gull, 'FLYING');
    const xBefore = gull.x;
    gull.update(200);
    expect(gull.x).not.toBe(xBefore);
  });

  it('wingPhase advances during update', () => {
    const gull = new Seagull(150, 60);
    gull.update(100);
    expect(gull.wingPhase).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/webview/entities/Seagull.test.ts`
Expected: FAIL — module not found

**Step 3: Implement Seagull**

Same state machine as ForestBird but:
- **Colors**: White body (`#FFFFFF`), gray wing tips (`#D1D5DB`), orange beak (`#F59E0B`)
- **Longer flight**: `flightDuration = 3000` (vs ForestBird's 2000)
- **Wider range**: `vx = (Math.random() - 0.5) * 160` (wider sweeps over sea)
- **Slower wing flap**: `wingPhase += dt * 0.015` during flight (larger, more graceful wings)
- **Perch timer**: `3000 + Math.random() * 6000`

Body rendering: 5x3px white body, 4x2px wings on each side that flap via wingPhase sine offset. Orange beak 1px dot.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/webview/entities/Seagull.test.ts`
Expected: 7 tests PASS

**Step 5: Commit**

```bash
git add src/webview/entities/Seagull.ts src/webview/entities/Seagull.test.ts
git commit -m "feat: add Seagull entity for sea atmosphere"
```

---

### Task 4: SeaWaves atmosphere entity (TDD)

Animated wave crests that scroll horizontally across the sea surface.

**Files:**
- Create: `src/webview/scene/SeaWaves.ts`
- Create: `src/webview/scene/SeaWaves.test.ts`

**Reference:** `src/webview/scene/SunbeamShafts.ts` — similar pattern (phase-based animation, render + optional renderGlow)

**Step 1: Write the test file**

```typescript
// src/webview/scene/SeaWaves.test.ts
import { describe, it, expect } from 'vitest';
import { SeaWaves } from './SeaWaves';

describe('SeaWaves', () => {
  it('constructs with width and height', () => {
    const waves = new SeaWaves(300, 400);
    expect(waves).toBeDefined();
  });

  it('update advances phase', () => {
    const waves = new SeaWaves(300, 400);
    waves.update(1000);
    expect(waves.phase).toBeGreaterThan(0);
  });

  it('has wave count based on height', () => {
    const waves = new SeaWaves(300, 400);
    expect(waves.waveCount).toBeGreaterThan(0);
  });

  it('resize updates dimensions', () => {
    const waves = new SeaWaves(300, 400);
    waves.resize(600, 800);
    // Should not throw and should update internal state
    expect(waves.waveCount).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/webview/scene/SeaWaves.test.ts`
Expected: FAIL — module not found

**Step 3: Implement SeaWaves**

Renders horizontal wave crest lines (white/light blue foam) that scroll slowly across the viewport. 6-10 wave lines spread vertically, each scrolling at slightly different speeds. Rendered as thin horizontal semi-transparent rects with foam highlights.

Key properties:
- `phase`: advances with time for scrolling
- `waveCount`: number of wave crests
- `update(dt)`: advance phase
- `render(ctx, scale)`: draw wave foam lines
- `renderGlow(ctx, scale)`: subtle water sparkle glints
- `resize(w, h)`: update dimensions

Wave crest appearance: 1-2px tall white/cyan rects (`rgba(255, 255, 255, 0.08-0.12)`) stretching most of viewport width, with gaps. Each wave has a slightly different x-offset based on its phase to create rolling motion.

Water sparkle (glow pass): Random bright pixel-sized glints (`rgba(255, 255, 255, 0.1)`) that twinkle based on phase.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/webview/scene/SeaWaves.test.ts`
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add src/webview/scene/SeaWaves.ts src/webview/scene/SeaWaves.test.ts
git commit -m "feat: add SeaWaves atmosphere for sea fishing theme"
```

---

### Task 5: FishingBackground full rewrite

Replace the lakeside background with all-ocean, island at top, dock at bottom.

**Files:**
- Rewrite: `src/webview/scene/FishingBackground.ts`
- Create: `src/webview/scene/FishingBackground.test.ts`

**Reference:** `src/webview/scene/ForestBackground.ts` — same pattern (generate + render, seededRandom)

**Step 1: Write smoke tests**

```typescript
// src/webview/scene/FishingBackground.test.ts
import { describe, it, expect } from 'vitest';
import { FishingBackground } from './FishingBackground';

describe('FishingBackground', () => {
  it('generates without throwing', () => {
    const bg = new FishingBackground();
    expect(() => bg.generate(300, 400)).not.toThrow();
  });

  it('re-generates on size change during render', () => {
    const bg = new FishingBackground();
    bg.generate(300, 400);
    // Calling generate with different dimensions should not throw
    expect(() => bg.generate(600, 800)).not.toThrow();
  });
});
```

**Step 2: Run test — should pass with existing code (it has generate)**

Run: `npx vitest run src/webview/scene/FishingBackground.test.ts`
Expected: PASS (existing FishingBackground has generate())

**Step 3: Full rewrite of FishingBackground**

Replace entire content. The new background renders:

1. **Water gradient** — full viewport, `#1E6091` (top) → `#0C3547` (bottom)
2. **Wave texture** — horizontal lighter bands at intervals (same concept as current but covering entire canvas)
3. **Island at top** — centered, ~y 0-70 logical coords
   - Sandy base: `#F4D03F` / `#E6B800` stacked rects (wider at bottom, narrower at top)
   - Beach edge: `#DEB887` (burlywood) thin strip at waterline
   - Palm trees: 2-3 procedural palm trees with brown trunks (`#8B4513`) and green frond clusters (`#228B22`, `#32CD32`)
   - Small bush/grass: `#2E8B57` rects on island
4. **Dock at bottom** — centered at ~y 290-330 logical coords
   - Wooden planks: `#8B4513` horizontal rects
   - Support posts: `#6B4226` vertical rects extending into water
   - Rope/cleat detail: Small dark rects on dock
5. **Underwater details** — scattered coral/rocks below mid-point
   - Coral: Small colored rects in `#FF6B6B`, `#FF8E53`, `#FFA07A`
   - Seaweed: Thin green rects (`#2E8B57`) rising from bottom
   - Rocks: Small gray rects at bottom

Use `seededRandom(77)` (same seed as current) for reproducibility. Use scale = width / 300. Same `generate(w, h)` + `render(ctx, w, h)` interface as current.

**Step 4: Run tests to verify**

Run: `npx vitest run src/webview/scene/FishingBackground.test.ts`
Expected: 2 tests PASS

**Step 5: Commit**

```bash
git add src/webview/scene/FishingBackground.ts src/webview/scene/FishingBackground.test.ts
git commit -m "feat: rewrite FishingBackground as all-ocean with island and dock"
```

---

### Task 6: Theme-specific character nicknames

Currently all themes use goblin-style names (Grumpy/Sneaky + toes/nob/fang). Add theme-specific nickname arrays so lumberjacks and boats get appropriate names.

**Files:**
- Modify: `src/webview/theme/ThemeContract.ts` — add `nicknames` to ThemeDef
- Modify: `src/webview/theme/CaveTheme.ts` — add goblin nicknames (preserve existing names)
- Modify: `src/webview/theme/ForestTheme.ts` — add lumberjack nicknames
- Modify: `src/webview/theme/FishingTheme.ts` — add boat nicknames
- Modify: `src/webview/scene/BaseScene.ts` — read nicknames from theme instead of hardcoded arrays

**Step 1: Add nicknames to ThemeContract**

Add to `ThemeDef`:
```typescript
export interface ThemeNicknames {
  bossName: string;
  prefixes: string[];
  suffixes: string[];
}
```

Add `nicknames: ThemeNicknames` to `ThemeDef`.

**Step 2: Add nicknames to each theme**

CaveTheme (keep existing goblin names):
```typescript
nicknames: {
  bossName: 'Grumpytoes',
  prefixes: ['Grumpy', 'Sneaky', 'Blinky', 'Chompy', 'Wiggly', 'Mossy', 'Dusty', 'Fizzy', 'Rusty', 'Zippy', 'Cranky', 'Bonky', 'Snooty', 'Plonky', 'Mugsy'],
  suffixes: ['toes', 'nob', 'wick', 'bonk', 'fang', 'grit', 'snot', 'mug', 'wort', 'chunk', 'lump', 'knack', 'splat', 'thud', 'grub'],
},
```

ForestTheme (lumberjack names — rugged outdoors feel):
```typescript
nicknames: {
  bossName: 'Big Timber',
  prefixes: ['Oak', 'Birch', 'Maple', 'Cedar', 'Ash', 'Pine', 'Elm', 'Spruce', 'Willow', 'Alder', 'Rowan', 'Hazel', 'Thorn', 'Bramble', 'Moss'],
  suffixes: ['beard', 'axe', 'bark', 'knot', 'stump', 'root', 'branch', 'saw', 'chip', 'ring', 'leaf', 'log', 'trunk', 'burr', 'grain'],
},
```

FishingTheme (boat names — nautical/sea feel):
```typescript
nicknames: {
  bossName: 'The Kraken',
  prefixes: ['Salty', 'Rusty', 'Lucky', 'Old', 'Swift', 'Stormy', 'Coral', 'Sandy', 'Misty', 'Drifty', 'Wavy', 'Sunny', 'Breezy', 'Crusty', 'Shelly'],
  suffixes: ['fin', 'wave', 'hook', 'net', 'tide', 'reef', 'shell', 'gull', 'crab', 'pearl', 'sail', 'anchor', 'catch', 'drift', 'wake'],
},
```

**Step 3: Update BaseScene to use theme nicknames**

In `BaseScene.ts`, replace the hardcoded PREFIXES/SUFFIXES arrays and `nextNickname()` function. Make `nextNickname` read from `this.theme.nicknames`. Replace `'Grumpytoes'` with `this.theme.nicknames.bossName`.

The nickname generator changes from module-level constants to using the theme passed to the constructor. The simplest approach: keep `nicknameIndex` as module-level, but read prefixes/suffixes from the theme in a method.

Change the constructor and handleSessionStart to use `this.theme.nicknames.bossName` instead of hardcoded `'Grumpytoes'`.

Change `handleSubagentSpawn` to call a method that reads from `this.theme.nicknames`.

**Step 4: Update CaveScene tests**

The test `'main goblin is always named Grumpytoes'` should still pass since CaveTheme keeps bossName as 'Grumpytoes'.

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/webview/theme/ThemeContract.ts src/webview/theme/CaveTheme.ts src/webview/theme/ForestTheme.ts src/webview/theme/FishingTheme.ts src/webview/scene/BaseScene.ts
git commit -m "feat: add theme-specific character nicknames for all themes"
```

---

### Task 7: Update FishingTheme + wire FishingScene + delete old files

Wire all new entities into the scene and update the theme config.

**Files:**
- Modify: `src/webview/theme/FishingTheme.ts`
- Modify: `src/webview/scene/FishingScene.ts`
- Modify: `src/webview/scene/BaseScene.ts:84-86` (deposit style for 'fishing' should become 'barrel' — already is, just verify)
- Delete: `src/webview/entities/Fisher.ts`
- Delete: `src/webview/entities/FishingSpot.ts`
- Create: `src/webview/scene/FishingScene.test.ts`

**Step 1: Update FishingTheme.ts**

```typescript
// src/webview/theme/FishingTheme.ts
import { ThemeDef } from './ThemeContract';

export const FISHING_THEME: ThemeDef = {
  id: 'fishing',
  name: 'Sea Fishing',
  backgroundColor: '#1E6091',
  layout: {
    targetPositions: [
      { x: 60, y: 160 },
      { x: 150, y: 180 },
      { x: 235, y: 155 },
    ],
    depositPosition: { x: 150, y: 310 },
    spawnArea: { xMin: 80, xMax: 220, y: 110 },
    atmosphere: {
      torches: [],
      stalactites: [],
      mushrooms: [],
    },
    creatures: {
      bats: [],
      spider: null,
    },
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

**Step 2: Update FishingScene.ts**

```typescript
// src/webview/scene/FishingScene.ts
import { BaseScene, Target } from './BaseScene';
import { FishingBackground } from './FishingBackground';
import { FishSchool } from '../entities/FishSchool';
import { FishingBoat } from '../entities/FishingBoat';
import { Goblin } from '../entities/Goblin';
import { FISHING_THEME } from '../theme/FishingTheme';
import { SeaWaves } from './SeaWaves';
import { Seagull } from '../entities/Seagull';

export class FishingScene extends BaseScene {
  private background = new FishingBackground();
  private seaWaves!: SeaWaves;
  private seagulls: Seagull[] = [];

  constructor() {
    super(FISHING_THEME);
    this.createTargets();
    this.createAtmosphere();
  }

  protected createTargets(): void {
    for (const pos of this.theme.layout.targetPositions) {
      this.targets.push(new FishSchool(pos.x, pos.y) as Target);
    }
  }

  protected createCharacter(x: number, y: number, id: string): Goblin {
    return new FishingBoat(x, y, this.particles, id);
  }

  protected createAtmosphere(): void {
    this.seaWaves = new SeaWaves(300, 400);
    this.seagulls = [
      new Seagull(50, 30),
      new Seagull(180, 25),
      new Seagull(250, 40),
    ];
  }

  protected updateAtmosphere(dt: number): void {
    this.seaWaves.update(dt);
    for (const gull of this.seagulls) gull.update(dt);
  }

  protected renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    this.background.render(ctx, w, h);
  }

  protected renderAtmosphereBack(ctx: CanvasRenderingContext2D, scale: number): void {
    this.seaWaves.render(ctx, scale);
  }

  protected renderAtmosphereFront(ctx: CanvasRenderingContext2D, scale: number): void {
    for (const gull of this.seagulls) gull.render(ctx, scale);
  }

  protected renderGlow(ctx: CanvasRenderingContext2D, scale: number): void {
    this.seaWaves.renderGlow(ctx, scale);
  }

  protected resizeAtmosphere(w: number, h: number): void {
    this.background.generate(w, h);
    this.seaWaves.resize(w, h);
  }
}
```

**Step 3: Delete old files**

```bash
rm src/webview/entities/Fisher.ts
rm src/webview/entities/FishingSpot.ts
```

**Step 4: Write FishingScene tests**

```typescript
// src/webview/scene/FishingScene.test.ts
import { describe, it, expect } from 'vitest';
import { FishingScene } from './FishingScene';

describe('FishingScene', () => {
  it('constructs without throwing', () => {
    expect(() => new FishingScene()).not.toThrow();
  });

  it('update does not throw', () => {
    const scene = new FishingScene();
    expect(() => scene.update(100)).not.toThrow();
  });

  it('has sea waves atmosphere', () => {
    const scene = new FishingScene();
    expect((scene as any).seaWaves).toBeDefined();
  });

  it('has seagulls', () => {
    const scene = new FishingScene();
    expect((scene as any).seagulls.length).toBeGreaterThan(0);
  });
});
```

**Step 5: Fix any imports that reference Fisher or FishingSpot**

Search codebase for `import.*Fisher` and `import.*FishingSpot` — the only references should be in the files we've already updated (FishingScene.ts). If there are others, update them.

**Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS (no references to deleted Fisher/FishingSpot remain)

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: wire sea fishing scene — FishingBoat, FishSchool, atmosphere, delete old Fisher/FishingSpot"
```

---

### Task 8: Fix Lumberjack pickaxe blade orientation

The Lumberjack's pickaxe blade appears reversed — the blade faces toward the head instead of away. This is in the Goblin base class `renderTools` method.

**Files:**
- Modify: `src/webview/entities/Goblin.ts:367-391` — fix pickaxe head rendering

**Reference:** The pickaxe head is drawn as a T-shape at lines 380-387. The sharp tips at `-10*s` (left) and `+10*s` (right) should be swapped or the orientation of the head rects adjusted so the blade edge faces outward (away from the goblin's head).

**Step 1: Read the current renderTools method in Goblin.ts**

Look at lines 367-391. The pickaxe head is:
```typescript
// Pickaxe head (T-shape, much bigger)
ctx.fillStyle = TOOL_HEAD;
ctx.fillRect(-8 * s, -4 * s, 18 * s, 7 * s);
// Shine highlight
ctx.fillStyle = TOOL_SHINE;
ctx.fillRect(-8 * s, -4 * s, 5 * s, 7 * s);
// Sharp tip
ctx.fillStyle = '#6b7280';
ctx.fillRect(-10 * s, -2 * s, 3 * s, 3 * s);
ctx.fillRect(10 * s, -2 * s, 3 * s, 3 * s);
```

The pivot point is at `(drawX + 30*s, drawY + 4*s)` — that's near the goblin's hand, so the pickaxe extends upward/rightward. The T-shape head starts at -8*s (left of pivot) to +10*s (right of pivot). The shine highlight is at the LEFT side (-8*s) — but since the goblin faces right and swings forward, the blade edge should be at the OUTER tip (right/top of the T-shape), and the flat/blunt side near the handle.

**Step 2: Fix orientation**

Move the shine highlight to the outer edge (right side of T-shape) and the sharp dark tips to extend outward from the blade instead of inward. The fix depends on how the rotation looks — the subagent should render-test and adjust. The key issue: blade edge should face AWAY from the goblin (toward the target).

**Step 3: Run tests**

Run: `npx vitest run`
Expected: All tests PASS (visual change only)

**Step 4: Commit**

```bash
git add src/webview/entities/Goblin.ts
git commit -m "fix: correct pickaxe blade orientation in Goblin renderTools"
```

---

### Task 9: Visual verification + full test suite

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 2: Build**

Run: `npx webpack --mode production`
Expected: Build succeeds with no errors

**Step 3: Visual check**

Open VS Code, run the extension, switch to fishing theme. Verify:
- Full ocean (no sky, no horizon)
- Island visible at top with palm trees
- Dock at bottom
- Boats as characters (not humans)
- Fish schools as targets (fish shadows, not ripples/bobbers)
- Seagulls flying
- Wave foam lines scrolling
- Fishing rod visible when boat is at a target
- Fish net visible when hauling
- Labels display correctly
- All animations smooth

Report to user for visual feedback.

---

### Parallelization notes

Tasks 1-4 are fully independent — can be executed in parallel.
Task 5 is independent of 1-4.
Task 6 is independent of 1-5 (theme contract + nicknames).
Task 7 depends on Tasks 1-6 (wires everything together).
Task 8 is independent of 1-7 (fixes Goblin.ts, separate from fishing).
Task 9 depends on all previous tasks.

Recommended execution order: Tasks 1-5 + 6 + 8 in parallel → Task 7 → Task 9.
