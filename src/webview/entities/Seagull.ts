// Seagull — perches on masts/rocks, occasionally glides across the sea

type GullState = 'PERCHED' | 'FLYING';

export class Seagull {
  x: number;
  y: number;
  private originX: number;
  private originY: number;
  state: GullState = 'PERCHED';
  wingPhase = 0;
  private perchTimer: number;
  private flightTimer = 0;
  private flightDuration = 3000;
  private vx = 0;
  private vy = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.originX = x;
    this.originY = y;
    this.perchTimer = 3000 + Math.random() * 6000;
  }

  update(dt: number): void {
    if (this.state === 'PERCHED') {
      this.wingPhase += dt * 0.001; // very slow idle
      this.perchTimer -= dt;
      if (this.perchTimer <= 0) {
        this.state = 'FLYING';
        this.flightTimer = this.flightDuration;
        // Wider gliding range than forest birds
        this.vx = (Math.random() - 0.5) * 160;
        this.vy = (Math.random() - 0.5) * 50;
      }
    } else {
      this.wingPhase += dt * 0.015; // slower wing flap than forest bird
      this.flightTimer -= dt;
      this.x += this.vx * (dt / 1000);
      this.y += this.vy * (dt / 1000);
      if (this.flightTimer <= 0) {
        this.state = 'PERCHED';
        this.x = this.originX;
        this.y = this.originY;
        this.perchTimer = 3000 + Math.random() * 6000;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const px = Math.floor(this.x * s);
    const py = Math.floor(this.y * s);
    const wingOffset = Math.sin(this.wingPhase) * 2 * s;

    // Body — white seagull body (5x3px)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(px, py, Math.ceil(5 * s), Math.ceil(3 * s));

    // Left wing — gray tips (4x2px)
    ctx.fillStyle = '#D1D5DB';
    ctx.fillRect(
      Math.floor(px - 4 * s),
      Math.floor(py - wingOffset),
      Math.ceil(4 * s),
      Math.ceil(2 * s),
    );

    // Right wing — gray tips (4x2px)
    ctx.fillRect(
      Math.floor(px + 5 * s),
      Math.floor(py + wingOffset),
      Math.ceil(4 * s),
      Math.ceil(2 * s),
    );

    // Beak — orange 1px
    ctx.fillStyle = '#F59E0B';
    const beakX = this.vx >= 0 ? px + 5 * s : px - 1 * s;
    ctx.fillRect(Math.floor(beakX), Math.floor(py + 1 * s), Math.ceil(1 * s), Math.ceil(1 * s));
  }
}
