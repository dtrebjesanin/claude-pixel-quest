type BatState = 'HANGING' | 'FLYING';

export class Bat {
  x: number;
  y: number;
  private originX: number;
  private originY: number;
  state: BatState = 'HANGING';
  wingPhase = 0;
  private hangTimer: number;
  private flightTimer = 0;
  private flightDuration = 3000;
  private vx = 0;
  private vy = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.originX = x;
    this.originY = y;
    this.hangTimer = 3000 + Math.random() * 3000;
  }

  update(dt: number): void {
    if (this.state === 'HANGING') {
      this.wingPhase += dt * 0.002; // slow breathing
      this.hangTimer -= dt;
      if (this.hangTimer <= 0) {
        this.state = 'FLYING';
        this.flightTimer = this.flightDuration;
        this.vx = (Math.random() - 0.5) * 80;
        this.vy = (Math.random() - 0.5) * 40;
      }
    } else {
      this.wingPhase += dt * 0.015; // fast flapping
      this.flightTimer -= dt;
      this.x += this.vx * (dt / 1000);
      this.y += this.vy * (dt / 1000);
      if (this.flightTimer <= 0) {
        this.state = 'HANGING';
        this.x = this.originX;
        this.y = this.originY;
        this.hangTimer = 3000 + Math.random() * 3000;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const px = Math.floor(this.x * s);
    const py = Math.floor(this.y * s);
    const wingOffset = Math.sin(this.wingPhase) * 3 * s;

    // Body
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(px, py, 6 * s, 4 * s);

    // Left wing
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(px - 5 * s, py - wingOffset, 5 * s, 3 * s);

    // Right wing
    ctx.fillRect(px + 6 * s, py + wingOffset, 5 * s, 3 * s);

    // Eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(px + 1 * s, py + 1 * s, 1 * s, 1 * s);
    ctx.fillRect(px + 4 * s, py + 1 * s, 1 * s, 1 * s);
  }
}
