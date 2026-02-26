// Procedural tree — chunky pixel-art deciduous tree for forest/woodcutting scene

const TRUNK_DARK = '#6B3410';
const TRUNK_MID = '#A0522D';
const TRUNK_BASE = '#8B4513';

const CANOPY_DARK = '#1a7a1a';
const CANOPY_MID = '#2d8a2d';
const CANOPY_LIGHT = '#4CAF50';
const CANOPY_HIGHLIGHT = '#81C784';

interface LeafSpeck {
  ox: number;
  oy: number;
  w: number;
  h: number;
  color: string;
}

export class Tree {
  x: number;
  y: number;
  private swayPhase = 0;
  private swaySpeed: number;
  private leafSpecks: LeafSpeck[] = [];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.swaySpeed = 0.0015 + Math.random() * 0.001;

    // Randomize starting phase so trees don't sway in sync
    this.swayPhase = Math.random() * Math.PI * 2;

    // Generate scattered bright leaf detail specks within the canopy area
    const count = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const colors = [CANOPY_LIGHT, CANOPY_HIGHLIGHT, CANOPY_MID];
      this.leafSpecks.push({
        ox: -20 + Math.random() * 40,
        oy: -38 + Math.random() * 30,
        w: 2 + Math.random() * 3,
        h: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  update(dt: number): void {
    this.swayPhase += this.swaySpeed * dt;
    if (this.swayPhase > Math.PI * 2) {
      this.swayPhase -= Math.PI * 2;
    }
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const cx = this.x * s;
    const cy = this.y * s;

    // Canopy sway offset (1-2 pixels, sine wave) — only affects canopy, not trunk
    const swayOffset = Math.sin(this.swayPhase) * 1.5;

    // ── Trunk ──

    // Root flare (wider base)
    ctx.fillStyle = TRUNK_DARK;
    ctx.fillRect(
      Math.floor(cx - 8 * s),
      Math.floor(cy + 8 * s),
      Math.floor(16 * s),
      Math.floor(6 * s),
    );

    // Main trunk body
    ctx.fillStyle = TRUNK_BASE;
    ctx.fillRect(
      Math.floor(cx - 6 * s),
      Math.floor(cy - 10 * s),
      Math.floor(12 * s),
      Math.floor(24 * s),
    );

    // Trunk mid-tone (lighter edge, right side)
    ctx.fillStyle = TRUNK_MID;
    ctx.fillRect(
      Math.floor(cx + 2 * s),
      Math.floor(cy - 8 * s),
      Math.floor(4 * s),
      Math.floor(20 * s),
    );

    // Bark texture — darker vertical cracks
    ctx.fillStyle = TRUNK_DARK;
    ctx.fillRect(
      Math.floor(cx - 3 * s),
      Math.floor(cy - 6 * s),
      Math.floor(2 * s),
      Math.floor(14 * s),
    );
    ctx.fillRect(
      Math.floor(cx + 1 * s),
      Math.floor(cy - 2 * s),
      Math.floor(1 * s),
      Math.floor(10 * s),
    );

    // Axe notch — small darker cut on the left side of the trunk
    ctx.fillStyle = TRUNK_DARK;
    ctx.fillRect(
      Math.floor(cx - 7 * s),
      Math.floor(cy - 2 * s),
      Math.floor(4 * s),
      Math.floor(3 * s),
    );
    // Notch inner (even darker for depth)
    ctx.fillStyle = '#4a2008';
    ctx.fillRect(
      Math.floor(cx - 6 * s),
      Math.floor(cy - 1 * s),
      Math.floor(3 * s),
      Math.floor(2 * s),
    );

    // ── Canopy (with sway offset) ──
    const canX = cx + swayOffset * s;

    // Bottom canopy layer (widest, darkest — shadow underside)
    ctx.fillStyle = CANOPY_DARK;
    ctx.fillRect(
      Math.floor(canX - 22 * s),
      Math.floor(cy - 18 * s),
      Math.floor(44 * s),
      Math.floor(12 * s),
    );

    // Main canopy body (large center mass)
    ctx.fillStyle = CANOPY_MID;
    ctx.fillRect(
      Math.floor(canX - 24 * s),
      Math.floor(cy - 30 * s),
      Math.floor(48 * s),
      Math.floor(16 * s),
    );

    // Upper canopy
    ctx.fillStyle = CANOPY_MID;
    ctx.fillRect(
      Math.floor(canX - 20 * s),
      Math.floor(cy - 40 * s),
      Math.floor(40 * s),
      Math.floor(14 * s),
    );

    // Top canopy (smaller peak)
    ctx.fillStyle = CANOPY_LIGHT;
    ctx.fillRect(
      Math.floor(canX - 14 * s),
      Math.floor(cy - 46 * s),
      Math.floor(28 * s),
      Math.floor(10 * s),
    );

    // Left bulge
    ctx.fillStyle = CANOPY_MID;
    ctx.fillRect(
      Math.floor(canX - 26 * s),
      Math.floor(cy - 26 * s),
      Math.floor(10 * s),
      Math.floor(10 * s),
    );

    // Right bulge
    ctx.fillStyle = CANOPY_MID;
    ctx.fillRect(
      Math.floor(canX + 16 * s),
      Math.floor(cy - 28 * s),
      Math.floor(12 * s),
      Math.floor(12 * s),
    );

    // ── Canopy highlights (sunlit top areas) ──
    ctx.fillStyle = CANOPY_HIGHLIGHT;
    ctx.fillRect(
      Math.floor(canX - 10 * s),
      Math.floor(cy - 46 * s),
      Math.floor(20 * s),
      Math.floor(4 * s),
    );
    ctx.fillRect(
      Math.floor(canX - 18 * s),
      Math.floor(cy - 40 * s),
      Math.floor(14 * s),
      Math.floor(3 * s),
    );
    ctx.fillRect(
      Math.floor(canX + 8 * s),
      Math.floor(cy - 42 * s),
      Math.floor(10 * s),
      Math.floor(3 * s),
    );

    // ── Canopy shadow underside (darker bottom edge) ──
    ctx.fillStyle = CANOPY_DARK;
    ctx.fillRect(
      Math.floor(canX - 18 * s),
      Math.floor(cy - 10 * s),
      Math.floor(36 * s),
      Math.floor(4 * s),
    );

    // ── Scattered leaf detail specks ──
    for (const speck of this.leafSpecks) {
      ctx.fillStyle = speck.color;
      ctx.fillRect(
        Math.floor(canX + speck.ox * s),
        Math.floor(cy + speck.oy * s),
        Math.floor(speck.w * s),
        Math.floor(speck.h * s),
      );
    }
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
