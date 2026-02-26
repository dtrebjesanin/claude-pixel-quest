// Procedural cave background — no sprite dependency
// Draws a tiled pixel-art cave using canvas primitives

const TILE_SIZE = 32;

// Cave palette
const COLORS = {
  bgDark: '#0f0f23',
  bgMid: '#1a1a2e',
  bgLight: '#16213e',
  rockDark: '#2c2c3a',
  rockMid: '#3d3d50',
  rockLight: '#4a4a5e',
  accent: '#534b62',
};

interface RockDetail {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export class Background {
  private details: RockDetail[] = [];
  private width = 300;
  private height = 400;

  generate(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.details = [];

    // Seed some random rock details for texture
    const rng = this.seededRandom(42);
    for (let i = 0; i < 60; i++) {
      this.details.push({
        x: Math.floor(rng() * width),
        y: Math.floor(rng() * height),
        w: 2 + Math.floor(rng() * 4),
        h: 2 + Math.floor(rng() * 3),
        color: rng() > 0.5 ? COLORS.rockDark : COLORS.rockMid,
      });
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.width !== width || this.height !== height) {
      this.generate(width, height);
    }

    // Base fill
    ctx.fillStyle = COLORS.bgDark;
    ctx.fillRect(0, 0, width, height);

    // Subtle gradient from top (darker) to bottom (lighter)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, COLORS.bgDark);
    gradient.addColorStop(0.5, COLORS.bgMid);
    gradient.addColorStop(1, COLORS.bgLight);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Rock ceiling at top
    ctx.fillStyle = COLORS.rockDark;
    for (let x = 0; x < width; x += TILE_SIZE) {
      const ceilingHeight = 12 + Math.sin(x * 0.05) * 8;
      ctx.fillRect(x, 0, TILE_SIZE, ceilingHeight);
    }

    // Rock walls on sides
    ctx.fillStyle = COLORS.rockMid;
    for (let y = 0; y < height; y += TILE_SIZE) {
      const leftWidth = 4 + Math.sin(y * 0.08) * 3;
      const rightWidth = 4 + Math.cos(y * 0.06) * 3;
      ctx.fillRect(0, y, leftWidth, TILE_SIZE);
      ctx.fillRect(width - rightWidth, y, rightWidth, TILE_SIZE);
    }

    // Rock floor at bottom
    ctx.fillStyle = COLORS.rockLight;
    for (let x = 0; x < width; x += TILE_SIZE) {
      const floorStart = height - 16 - Math.sin(x * 0.04) * 6;
      ctx.fillRect(x, floorStart, TILE_SIZE, height - floorStart);
    }

    // Scattered rock details for texture
    for (const d of this.details) {
      ctx.fillStyle = d.color;
      ctx.fillRect(d.x, d.y, d.w, d.h);
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
