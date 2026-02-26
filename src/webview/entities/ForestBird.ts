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
