// Procedural fish school — underwater silhouettes with splash effects and shimmer

interface SplashDrop {
  ox: number;
  oy: number;
  vy: number;
  life: number;
}

interface FishOffset {
  /** Horizontal offset from school center */
  dx: number;
  /** Vertical offset from school center */
  dy: number;
  /** Phase offset for sine-wave undulation */
  phaseOffset: number;
  /** Color for this fish silhouette */
  color: string;
  /** Flash timer — when > 0 the fish is "turning" and shows bright color */
  flashTimer: number;
}

const FISH_COLORS = ['#4a9ece', '#5bb8e8', '#3a8ab8'];
const FISH_FLASH_COLOR = '#93c5fd';

export class FishSchool {
  x: number;
  y: number;

  // Shimmer / undulation phase
  private phase = 0;
  private phaseSpeed: number;

  // Fish cluster
  private fishCount: number;
  private fish: FishOffset[] = [];

  // Splash timing (same pattern as FishingSpot)
  private splashTimer: number;
  private splashInterval: number;
  private splashActive = false;
  private splashElapsed = 0;
  private readonly splashDuration = 500;
  private splashDrops: SplashDrop[] = [];

  // Water shimmer highlights
  private shimmerSpots: { dx: number; dy: number; phaseOffset: number }[] = [];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;

    this.phaseSpeed = 0.002 + Math.random() * 0.001;
    this.splashInterval = 3000 + Math.random() * 5000;
    this.splashTimer = Math.random() * this.splashInterval; // stagger initial timing

    // 3-5 fish per school
    this.fishCount = 3 + Math.floor(Math.random() * 3);

    // Generate individual fish offsets from center
    for (let i = 0; i < this.fishCount; i++) {
      this.fish.push({
        dx: -8 + Math.random() * 16,
        dy: -4 + Math.random() * 8,
        phaseOffset: Math.random() * Math.PI * 2,
        color: FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)],
        flashTimer: 0,
      });
    }

    // 2-3 shimmer highlight spots
    const shimmerCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < shimmerCount; i++) {
      this.shimmerSpots.push({
        dx: -10 + Math.random() * 20,
        dy: -6 + Math.random() * 12,
        phaseOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  update(dt: number): void {
    // Advance undulation phase
    this.phase += this.phaseSpeed * dt;
    if (this.phase > Math.PI * 2) {
      this.phase -= Math.PI * 2;
    }

    // Update fish flash timers and occasionally trigger flashes
    for (const f of this.fish) {
      if (f.flashTimer > 0) {
        f.flashTimer -= dt;
        if (f.flashTimer < 0) f.flashTimer = 0;
      }
      // Random chance of a "turn" flash (~0.1% per frame at 60fps)
      if (f.flashTimer === 0 && Math.random() < 0.0005 * (dt / 16)) {
        f.flashTimer = 150 + Math.random() * 150; // flash for 150-300ms
      }
    }

    // Splash timer (same pattern as FishingSpot)
    if (!this.splashActive) {
      this.splashTimer += dt;
      if (this.splashTimer >= this.splashInterval) {
        this.splashActive = true;
        this.splashElapsed = 0;
        this.splashTimer = 0;
        this.splashInterval = 3000 + Math.random() * 5000;
        // Generate splash droplets — a fish jumping
        this.splashDrops = [];
        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          this.splashDrops.push({
            ox: -6 + Math.random() * 12,
            oy: 0,
            vy: -(1.5 + Math.random() * 2),
            life: 0,
          });
        }
      }
    } else {
      this.splashElapsed += dt;
      // Update droplet positions with gravity
      for (const drop of this.splashDrops) {
        drop.life += dt;
        drop.oy += drop.vy * (dt / 16);
        drop.vy += 0.12 * (dt / 16); // gravity
      }
      if (this.splashElapsed >= this.splashDuration) {
        this.splashActive = false;
        this.splashDrops = [];
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const cx = this.x * s;
    const cy = this.y * s;

    // --- Fish silhouettes ---
    for (const f of this.fish) {
      // Sine-wave undulation for each fish
      const undulationX = Math.sin(this.phase + f.phaseOffset) * 2;
      const undulationY = Math.cos(this.phase * 0.7 + f.phaseOffset) * 1;

      const fx = cx + (f.dx + undulationX) * s;
      const fy = cy + (f.dy + undulationY) * s;

      // Pick color — flash bright if turning
      const color = f.flashTimer > 0 ? FISH_FLASH_COLOR : f.color;
      ctx.fillStyle = color;

      // Fish body: 5x3 pixel block
      ctx.fillRect(
        Math.floor(fx),
        Math.floor(fy),
        Math.floor(5 * s),
        Math.floor(3 * s),
      );

      // Fish tail: V-shape behind the body
      ctx.fillRect(
        Math.floor(fx - 2 * s),
        Math.floor(fy - 1 * s),
        Math.floor(2 * s),
        Math.floor(2 * s),
      );
      ctx.fillRect(
        Math.floor(fx - 2 * s),
        Math.floor(fy + 2 * s),
        Math.floor(2 * s),
        Math.floor(2 * s),
      );

      // Belly highlight
      ctx.fillStyle = '#a8d8f0';
      ctx.fillRect(
        Math.floor(fx + 1 * s),
        Math.floor(fy + 2 * s),
        Math.floor(3 * s),
        Math.floor(1 * s),
      );
    }

    // --- Water shimmer highlights ---
    for (const spot of this.shimmerSpots) {
      const shimAlpha = Math.sin(this.phase * 1.5 + spot.phaseOffset) * 0.5 + 0.5;
      const sx = spot.dx + Math.sin(this.phase * 0.8 + spot.phaseOffset) * 3;
      const sy = spot.dy + Math.cos(this.phase * 0.6 + spot.phaseOffset) * 2;

      ctx.globalAlpha = shimAlpha * 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(
        Math.floor(cx + sx * s),
        Math.floor(cy + sy * s),
        Math.floor(3 * s),
        Math.floor(2 * s),
      );
    }
    ctx.globalAlpha = 1;

    // --- Splash particles ---
    if (this.splashActive) {
      const splashAlpha = 1 - this.splashElapsed / this.splashDuration;
      ctx.globalAlpha = Math.max(0, splashAlpha);
      ctx.fillStyle = '#93c5fd';

      for (const drop of this.splashDrops) {
        ctx.fillRect(
          Math.floor(cx + drop.ox * s),
          Math.floor(cy + drop.oy * s),
          Math.floor(2 * s),
          Math.floor(2 * s),
        );
      }
      ctx.globalAlpha = 1;
    }
  }
}
