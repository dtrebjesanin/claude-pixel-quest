// Animated wave crests and water sparkle glints for sea atmosphere
// Horizontal foam lines scroll across the surface; tiny sparkle pixels pulse

interface SparkleDef {
  x: number;  // logical x position (fraction of width)
  y: number;  // logical y position (fraction of height)
  offset: number; // phase offset for pulsing
}

const SPARKLE_COUNT = 10;
const WAVE_SPACING = 0.12; // fraction of height between foam lines
const PHASE_SPEED = 0.0005;

export class SeaWaves {
  private width: number;
  private height: number;
  private sparkles: SparkleDef[];
  phase = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.sparkles = this.generateSparkles();
  }

  private generateSparkles(): SparkleDef[] {
    const result: SparkleDef[] = [];
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      result.push({
        x: Math.random(),
        y: Math.random(),
        offset: Math.random() * Math.PI * 2,
      });
    }
    return result;
  }

  update(dt: number): void {
    this.phase += dt * PHASE_SPEED;
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const count = this.waveCount;

    for (let i = 0; i < count; i++) {
      // Each foam line has a different alpha for variety
      const alpha = 0.06 + (i % 3) * 0.015;
      // Rolling x-offset based on phase and index
      const xOffset = Math.sin(this.phase + i * 0.8) * this.width * 0.05;
      // Vertical position — spread evenly across viewport
      const y = (i + 1) * this.height * WAVE_SPACING;
      // Width covers most of viewport with small gap
      const lineWidth = this.width * (0.85 + Math.sin(this.phase + i * 1.2) * 0.05);
      const lineHeight = 1 + (i % 2); // 1-2px thickness

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(
        Math.floor((xOffset + (this.width - lineWidth) * 0.5) * s),
        Math.floor(y * s),
        Math.floor(lineWidth * s),
        Math.floor(lineHeight * s),
      );
    }
  }

  renderGlow(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;

    for (let i = 0; i < this.sparkles.length; i++) {
      const sp = this.sparkles[i];
      const alpha = 0.05 + Math.sin(this.phase + sp.offset) * 0.05;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(
        Math.floor(sp.x * this.width * s),
        Math.floor(sp.y * this.height * s),
        Math.floor(2 * s),
        Math.floor(2 * s),
      );
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.sparkles = this.generateSparkles();
  }

  get waveCount(): number {
    // 6-10 foam lines depending on height, spaced by WAVE_SPACING
    const count = Math.floor(1 / WAVE_SPACING) - 1;
    return Math.max(6, Math.min(10, count));
  }
}
