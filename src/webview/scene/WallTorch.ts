// Procedural wall torch with flickering flame and radial light glow

const HANDLE_COLOR = '#92400e';
const HANDLE_DARK = '#78350f';
const FLAME_COLORS = ['#fbbf24', '#f97316', '#ef4444'];
const FLAME_BRIGHT = '#fef3c7';
const GLOW_BASE_RADIUS = 50;
const GLOW_OSCILLATION = 5;

interface FlameShape {
  rects: Array<{ ox: number; oy: number; w: number; h: number; color: string }>;
}

const FLAME_FRAMES: FlameShape[] = [
  {
    rects: [
      { ox: -2, oy: -8, w: 4, h: 6, color: FLAME_COLORS[0] },
      { ox: -1, oy: -11, w: 3, h: 4, color: FLAME_COLORS[1] },
      { ox: 0, oy: -13, w: 2, h: 3, color: FLAME_COLORS[2] },
      { ox: 0, oy: -9, w: 1, h: 2, color: FLAME_BRIGHT },
    ],
  },
  {
    rects: [
      { ox: -2, oy: -9, w: 5, h: 6, color: FLAME_COLORS[0] },
      { ox: -1, oy: -12, w: 3, h: 5, color: FLAME_COLORS[1] },
      { ox: 1, oy: -14, w: 2, h: 3, color: FLAME_COLORS[2] },
      { ox: 0, oy: -10, w: 2, h: 2, color: FLAME_BRIGHT },
    ],
  },
  {
    rects: [
      { ox: -3, oy: -8, w: 5, h: 5, color: FLAME_COLORS[0] },
      { ox: -2, oy: -11, w: 4, h: 4, color: FLAME_COLORS[1] },
      { ox: -1, oy: -13, w: 2, h: 3, color: FLAME_COLORS[2] },
      { ox: -1, oy: -9, w: 2, h: 2, color: FLAME_BRIGHT },
    ],
  },
];

export class WallTorch {
  readonly x: number;
  readonly y: number;
  readonly side: 'left' | 'right';
  private flameFrame = 0;
  private frameTimer = 0;
  private nextFrameTime: number;
  private glowPhase = 0;

  constructor(x: number, y: number, side: 'left' | 'right') {
    this.x = x;
    this.y = y;
    this.side = side;
    this.nextFrameTime = 80 + Math.random() * 120;
  }

  update(dt: number): void {
    this.frameTimer += dt;
    this.glowPhase += dt * 0.003;

    if (this.frameTimer >= this.nextFrameTime) {
      this.frameTimer = 0;
      this.flameFrame = (this.flameFrame + 1) % 3;
      this.nextFrameTime = 80 + Math.random() * 120;
    }
  }

  getGlowRadius(): number {
    return GLOW_BASE_RADIUS + Math.sin(this.glowPhase) * GLOW_OSCILLATION;
  }

  renderBody(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const cx = this.x * s;
    const cy = this.y * s;

    // Handle (vertical stick)
    ctx.fillStyle = HANDLE_COLOR;
    ctx.fillRect(Math.floor(cx - 1 * s), Math.floor(cy), Math.floor(3 * s), Math.floor(10 * s));
    // Handle bracket (horizontal mount to wall)
    ctx.fillStyle = HANDLE_DARK;
    if (this.side === 'left') {
      ctx.fillRect(Math.floor(cx - 4 * s), Math.floor(cy + 2 * s), Math.floor(5 * s), Math.floor(3 * s));
    } else {
      ctx.fillRect(Math.floor(cx), Math.floor(cy + 2 * s), Math.floor(5 * s), Math.floor(3 * s));
    }

    // Flame
    const frame = FLAME_FRAMES[this.flameFrame];
    for (const r of frame.rects) {
      ctx.fillStyle = r.color;
      ctx.fillRect(
        Math.floor(cx + r.ox * s),
        Math.floor(cy + r.oy * s),
        Math.floor(r.w * s),
        Math.floor(r.h * s),
      );
    }
  }

  renderGlow(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const fx = this.x * s;
    const fy = (this.y - 6) * s; // glow centered on flame tip
    const glowRadius = this.getGlowRadius() * s;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gradient = ctx.createRadialGradient(fx, fy, 0, fx, fy, glowRadius);
    gradient.addColorStop(0, 'rgba(255, 160, 60, 0.12)');
    gradient.addColorStop(0.5, 'rgba(255, 120, 30, 0.06)');
    gradient.addColorStop(1, 'rgba(255, 80, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(fx - glowRadius, fy - glowRadius, glowRadius * 2, glowRadius * 2);
    ctx.restore();
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
