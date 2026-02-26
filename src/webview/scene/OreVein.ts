// Procedural ore vein — chunky pixel-art cave rock with embedded crystals

const ORE_COLORS = ['#fbbf24', '#f59e0b', '#d97706']; // Gold tones
const ORE_BRIGHT = '#fef3c7'; // Crystal highlight
const ROCK_COLOR = '#4a4a5e';
const ROCK_DARK = '#3d3d50';
const ROCK_LIGHT = '#5c5c72';

interface OreSpot {
  ox: number;
  oy: number;
  color: string;
  w: number;
  h: number;
}

export class OreVein {
  x: number;
  y: number;
  private shimmerPhase = 0;
  private shimmerSpeed: number;
  private oreSpots: OreSpot[] = [];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.shimmerSpeed = 0.003 + Math.random() * 0.002;

    // Generate ore crystal formations — mix of veins and clusters
    const count = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const isVein = Math.random() > 0.5;
      this.oreSpots.push({
        ox: -14 + Math.random() * 28,
        oy: -10 + Math.random() * 26,
        color: ORE_COLORS[Math.floor(Math.random() * ORE_COLORS.length)],
        w: isVein ? 2 + Math.random() * 2 : 3 + Math.random() * 4,
        h: isVein ? 4 + Math.random() * 5 : 3 + Math.random() * 3,
      });
    }
  }

  update(dt: number): void {
    this.shimmerPhase += this.shimmerSpeed * dt;
    if (this.shimmerPhase > Math.PI * 2) {
      this.shimmerPhase -= Math.PI * 2;
    }
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const cx = this.x * s;
    const cy = this.y * s;

    // --- Chunky rock formation (multiple overlapping rects) ---

    // Wide base
    ctx.fillStyle = ROCK_DARK;
    ctx.fillRect(Math.floor(cx - 18 * s), Math.floor(cy + 2 * s), Math.floor(36 * s), Math.floor(18 * s));

    // Main body
    ctx.fillStyle = ROCK_COLOR;
    ctx.fillRect(Math.floor(cx - 16 * s), Math.floor(cy - 6 * s), Math.floor(32 * s), Math.floor(26 * s));

    // Upper section
    ctx.fillRect(Math.floor(cx - 12 * s), Math.floor(cy - 12 * s), Math.floor(24 * s), Math.floor(8 * s));

    // Peak
    ctx.fillRect(Math.floor(cx - 6 * s), Math.floor(cy - 16 * s), Math.floor(14 * s), Math.floor(6 * s));

    // Left bump
    ctx.fillRect(Math.floor(cx - 20 * s), Math.floor(cy + 4 * s), Math.floor(8 * s), Math.floor(12 * s));

    // Right bump
    ctx.fillRect(Math.floor(cx + 14 * s), Math.floor(cy), Math.floor(8 * s), Math.floor(14 * s));

    // --- Highlights (top edges for 3D depth) ---
    ctx.fillStyle = ROCK_LIGHT;
    ctx.fillRect(Math.floor(cx - 12 * s), Math.floor(cy - 12 * s), Math.floor(24 * s), Math.floor(2 * s));
    ctx.fillRect(Math.floor(cx - 6 * s), Math.floor(cy - 16 * s), Math.floor(14 * s), Math.floor(2 * s));
    ctx.fillRect(Math.floor(cx - 16 * s), Math.floor(cy - 6 * s), Math.floor(32 * s), Math.floor(2 * s));

    // --- Cracks (texture detail) ---
    ctx.fillStyle = ROCK_DARK;
    ctx.fillRect(Math.floor(cx - 4 * s), Math.floor(cy - 8 * s), Math.floor(2 * s), Math.floor(12 * s));
    ctx.fillRect(Math.floor(cx + 7 * s), Math.floor(cy - 2 * s), Math.floor(2 * s), Math.floor(8 * s));
    ctx.fillRect(Math.floor(cx - 10 * s), Math.floor(cy + 6 * s), Math.floor(8 * s), Math.floor(2 * s));

    // --- Ore crystals with shimmer ---
    for (let i = 0; i < this.oreSpots.length; i++) {
      const spot = this.oreSpots[i];
      const shimmer = Math.sin(this.shimmerPhase + i * 1.2) * 0.3 + 0.7;

      // Crystal body
      ctx.globalAlpha = shimmer;
      ctx.fillStyle = spot.color;
      ctx.fillRect(
        Math.floor(cx + spot.ox * s),
        Math.floor(cy + spot.oy * s),
        Math.floor(spot.w * s),
        Math.floor(spot.h * s),
      );

      // Bright highlight on crystal corner
      ctx.globalAlpha = shimmer * 0.5;
      ctx.fillStyle = ORE_BRIGHT;
      const hlW = Math.max(1, Math.floor(spot.w * 0.4));
      const hlH = Math.max(1, Math.floor(spot.h * 0.3));
      ctx.fillRect(
        Math.floor(cx + spot.ox * s),
        Math.floor(cy + spot.oy * s),
        Math.floor(hlW * s),
        Math.floor(hlH * s),
      );
    }
    ctx.globalAlpha = 1;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
