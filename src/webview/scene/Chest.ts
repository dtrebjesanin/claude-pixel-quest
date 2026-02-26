// Procedural deposit container
// Renders as chest (cave), barrel (fishing), or log pile (forest)

export type DepositStyle = 'chest' | 'barrel' | 'logpile';

export class Chest {
  x: number;
  y: number;
  style: DepositStyle = 'chest';
  private bouncePhase = 0;
  private bouncing = false;
  isOpen = false;
  openPhase = 0;
  private peekTimer = 0;

  constructor(x: number, y: number, style: DepositStyle = 'chest') {
    this.x = x;
    this.y = y;
    this.style = style;
  }

  incrementProgress(): void {
    this.bouncing = true;
    this.bouncePhase = 0;
  }

  resetProgress(): void {
    this.isOpen = false;
    this.openPhase = 0;
  }

  completeProgress(): void {
    this.bouncing = true;
    this.bouncePhase = 0;
    this.isOpen = true;
    this.peekTimer = 0; // permanent open
  }

  peek(durationMs = 1500): void {
    this.isOpen = true;
    this.peekTimer = durationMs;
    this.bouncing = true;
    this.bouncePhase = 0;
  }

  update(dt: number): void {
    if (this.bouncing) {
      this.bouncePhase += dt * 0.01;
      if (this.bouncePhase > Math.PI) {
        this.bouncing = false;
        this.bouncePhase = 0;
      }
    }
    if (this.isOpen && this.openPhase < 1) {
      this.openPhase = Math.min(1, this.openPhase + dt / 500);
    }
    if (this.peekTimer > 0) {
      this.peekTimer -= dt;
      if (this.peekTimer <= 0) {
        this.isOpen = false;
        this.peekTimer = 0;
      }
    }
    if (!this.isOpen && this.openPhase > 0) {
      this.openPhase = Math.max(0, this.openPhase - dt / 400);
    }
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const cx = this.x * s;
    const cy = this.y * s;
    const bounceY = this.bouncing ? -Math.sin(this.bouncePhase) * 4 * s : 0;

    if (this.style === 'barrel') {
      this.renderBarrel(ctx, s, cx, cy, bounceY);
    } else if (this.style === 'logpile') {
      this.renderLogPile(ctx, s, cx, cy, bounceY);
    } else {
      this.renderChest(ctx, s, cx, cy, bounceY);
    }
  }

  // --- Treasure Chest (cave theme) ---
  private renderChest(ctx: CanvasRenderingContext2D, s: number, cx: number, cy: number, bounceY: number): void {
    const w = 36 * s;
    const h = 24 * s;

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(Math.floor(cx - w / 2), Math.floor(cy - h / 2 + bounceY), Math.floor(w), Math.floor(h));

    const lidH = h * 0.4;
    const lidTilt = this.openPhase * 8 * s;
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(Math.floor(cx - w / 2), Math.floor(cy - h / 2 + bounceY - lidTilt), Math.floor(w), Math.floor(lidH));

    if (this.openPhase > 0) {
      ctx.fillStyle = '#fbbf24';
      ctx.globalAlpha = this.openPhase * 0.6;
      ctx.fillRect(Math.floor(cx - w / 2 + 3 * s), Math.floor(cy - h / 2 + bounceY + lidH - lidTilt), Math.floor(w - 6 * s), Math.floor(h * 0.3));
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#DAA520';
    ctx.fillRect(Math.floor(cx - w / 2), Math.floor(cy - h / 2 + bounceY + h * 0.35), Math.floor(w), Math.floor(3 * s));
    ctx.fillRect(Math.floor(cx - w / 2), Math.floor(cy + h * 0.2 + bounceY), Math.floor(w), Math.floor(2 * s));

    ctx.fillStyle = '#FFD700';
    const lockSize = 6 * s;
    ctx.fillRect(Math.floor(cx - lockSize / 2), Math.floor(cy - h / 2 + h * 0.25 + bounceY), Math.floor(lockSize), Math.floor(lockSize));
  }

  // --- Steel Barrel (fishing theme) ---
  private renderBarrel(ctx: CanvasRenderingContext2D, s: number, cx: number, cy: number, bounceY: number): void {
    const w = 30 * s;
    const h = 28 * s;
    const topY = cy - h / 2 + bounceY;

    // Barrel body — blue-steel to contrast with brown dock
    ctx.fillStyle = '#3d4f6a';
    ctx.fillRect(Math.floor(cx - w / 2 + 2 * s), Math.floor(topY), Math.floor(w - 4 * s), Math.floor(h));
    ctx.fillStyle = '#4a6080';
    ctx.fillRect(Math.floor(cx - w / 2), Math.floor(topY + 4 * s), Math.floor(w), Math.floor(h - 8 * s));

    // Steel highlight (right edge, light reflection)
    ctx.fillStyle = '#5e7a9a';
    ctx.fillRect(Math.floor(cx + 4 * s), Math.floor(topY + 5 * s), Math.floor(6 * s), Math.floor(h - 10 * s));

    // Silver hoops
    ctx.fillStyle = '#a8b4c0';
    ctx.fillRect(Math.floor(cx - w / 2), Math.floor(topY + 3 * s), Math.floor(w), Math.floor(2 * s));
    ctx.fillRect(Math.floor(cx - w / 2), Math.floor(cy + h / 2 - 5 * s + bounceY), Math.floor(w), Math.floor(2 * s));
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(Math.floor(cx - w / 2 + 1 * s), Math.floor(cy - 1 * s + bounceY), Math.floor(w - 2 * s), Math.floor(2 * s));

    // Rivet lines (darker seams)
    ctx.fillStyle = '#2d3a4e';
    ctx.fillRect(Math.floor(cx - 4 * s), Math.floor(topY + 5 * s), Math.floor(2 * s), Math.floor(h - 10 * s));
    ctx.fillRect(Math.floor(cx + 6 * s), Math.floor(topY + 5 * s), Math.floor(2 * s), Math.floor(h - 10 * s));

    // Triangular fish tails sticking up from barrel
    if (this.openPhase > 0) {
      ctx.globalAlpha = this.openPhase;
      const wiggle1 = Math.sin(this.bouncePhase * 3) * 1 * s;
      const wiggle2 = Math.sin(this.bouncePhase * 3 + 2) * 1 * s;

      // Left tail fin — V-shape pointing up
      ctx.fillStyle = '#60a5fa';
      // Left fork of V
      ctx.fillRect(Math.floor(cx - 8 * s), Math.floor(topY - 8 * s + wiggle1), Math.floor(2 * s), Math.floor(6 * s));
      // Right fork of V
      ctx.fillRect(Math.floor(cx - 4 * s), Math.floor(topY - 8 * s + wiggle1), Math.floor(2 * s), Math.floor(6 * s));
      // V junction (connecting piece at base)
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(Math.floor(cx - 7 * s), Math.floor(topY - 2 * s + wiggle1), Math.floor(4 * s), Math.floor(3 * s));

      // Right tail fin — V-shape pointing up (taller, slight angle)
      ctx.fillStyle = '#93c5fd';
      // Left fork of V
      ctx.fillRect(Math.floor(cx + 4 * s), Math.floor(topY - 10 * s + wiggle2), Math.floor(2 * s), Math.floor(7 * s));
      // Right fork of V
      ctx.fillRect(Math.floor(cx + 8 * s), Math.floor(topY - 10 * s + wiggle2), Math.floor(2 * s), Math.floor(7 * s));
      // V junction
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(Math.floor(cx + 5 * s), Math.floor(topY - 3 * s + wiggle2), Math.floor(4 * s), Math.floor(4 * s));

      // Middle small tail (subtle third fish)
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(Math.floor(cx - 1 * s), Math.floor(topY - 5 * s), Math.floor(2 * s), Math.floor(4 * s));
      ctx.fillRect(Math.floor(cx + 2 * s), Math.floor(topY - 5 * s), Math.floor(2 * s), Math.floor(4 * s));
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(Math.floor(cx), Math.floor(topY - 1 * s), Math.floor(3 * s), Math.floor(2 * s));

      ctx.globalAlpha = 1;
    }
  }

  // --- Log Pile (forest theme) ---
  private renderLogPile(ctx: CanvasRenderingContext2D, s: number, cx: number, cy: number, bounceY: number): void {
    const logW = 32 * s;
    const logH = 8 * s;

    // Bottom row — 3 logs
    const baseY = cy + 4 * s + bounceY;
    for (let i = 0; i < 3; i++) {
      const lx = cx - 18 * s + i * 12 * s;
      // Log body
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(Math.floor(lx), Math.floor(baseY), Math.floor(logW), Math.floor(logH));
      // Bark highlight
      ctx.fillStyle = '#a0522d';
      ctx.fillRect(Math.floor(lx), Math.floor(baseY), Math.floor(logW), Math.floor(2 * s));
      // End grain circle (cross-section)
      ctx.fillStyle = '#d2a679';
      ctx.fillRect(Math.floor(lx), Math.floor(baseY + 1 * s), Math.floor(5 * s), Math.floor(6 * s));
      ctx.fillStyle = '#c08050';
      ctx.fillRect(Math.floor(lx + 1 * s), Math.floor(baseY + 2 * s), Math.floor(3 * s), Math.floor(4 * s));
      // Ring
      ctx.fillStyle = '#92400e';
      ctx.fillRect(Math.floor(lx + 2 * s), Math.floor(baseY + 3 * s), Math.floor(1 * s), Math.floor(2 * s));
    }

    // Top row — 2 logs (stacked on top, offset)
    const topY = baseY - logH + 1 * s;
    for (let i = 0; i < 2; i++) {
      const lx = cx - 12 * s + i * 14 * s;
      ctx.fillStyle = '#7a3b10';
      ctx.fillRect(Math.floor(lx), Math.floor(topY), Math.floor(logW - 4 * s), Math.floor(logH));
      ctx.fillStyle = '#92400e';
      ctx.fillRect(Math.floor(lx), Math.floor(topY), Math.floor(logW - 4 * s), Math.floor(2 * s));
      // End grain
      ctx.fillStyle = '#d2a679';
      ctx.fillRect(Math.floor(lx), Math.floor(topY + 1 * s), Math.floor(5 * s), Math.floor(6 * s));
      ctx.fillStyle = '#c08050';
      ctx.fillRect(Math.floor(lx + 1 * s), Math.floor(topY + 2 * s), Math.floor(3 * s), Math.floor(4 * s));
    }

    // Sawdust/chips when open
    if (this.openPhase > 0) {
      ctx.globalAlpha = this.openPhase * 0.7;
      ctx.fillStyle = '#d2a679';
      ctx.fillRect(Math.floor(cx - 5 * s), Math.floor(topY - 4 * s), Math.floor(3 * s), Math.floor(2 * s));
      ctx.fillRect(Math.floor(cx + 4 * s), Math.floor(topY - 6 * s), Math.floor(2 * s), Math.floor(2 * s));
      ctx.fillRect(Math.floor(cx - 1 * s), Math.floor(topY - 3 * s), Math.floor(2 * s), Math.floor(2 * s));
      ctx.globalAlpha = 1;
    }
  }

  renderGlow(ctx: CanvasRenderingContext2D, scale: number): void {
    if (this.openPhase <= 0) return;
    const s = scale;
    const cx = this.x * s;
    const cy = this.y * s;
    const radius = 40 * s * this.openPhase;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(251, 191, 36, ${0.4 * this.openPhase})`);
    grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  /** Y pixel coordinate just below the deposit sprite (for laying out content beneath the chest). */
  getBottomY(scale: number): number {
    const s = scale;
    const h = 24 * s;
    const cy = this.y * s;
    return cy + h / 2 + 4 * s;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
