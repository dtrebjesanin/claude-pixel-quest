// Procedural bioluminescent mushroom cluster with pulsing glow

const STEM_COLOR = '#134e4a';
const CAP_CYAN = ['#22d3ee', '#06b6d4'];
const CAP_PURPLE = ['#a78bfa', '#8b5cf6'];
const GLOW_RADIUS = 20;

interface Mushroom {
  ox: number;
  oy: number;
  capW: number;
  capH: number;
  stemH: number;
  hue: 'cyan' | 'purple';
}

export class GlowingMushroom {
  readonly x: number;
  y: number;
  private mushrooms: Mushroom[] = [];
  private glowPhase = 0;
  private glowSpeed: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.glowSpeed = 0.002 + Math.random() * 0.001;

    const count = 2 + Math.floor(Math.random() * 2); // 2-3
    for (let i = 0; i < count; i++) {
      this.mushrooms.push({
        ox: -8 + i * 7 + Math.random() * 4,
        oy: -Math.random() * 4,
        capW: 4 + Math.random() * 3,
        capH: 3 + Math.random() * 2,
        stemH: 4 + Math.random() * 4,
        hue: Math.random() > 0.5 ? 'cyan' : 'purple',
      });
    }
  }

  update(dt: number): void {
    this.glowPhase += this.glowSpeed * dt;
    if (this.glowPhase > Math.PI * 2) {
      this.glowPhase -= Math.PI * 2;
    }
  }

  renderBody(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const cx = this.x * s;
    const cy = this.y * s;

    for (const m of this.mushrooms) {
      const mx = cx + m.ox * s;
      const my = cy + m.oy * s;

      // Stem
      ctx.fillStyle = STEM_COLOR;
      const stemW = 2 * s;
      ctx.fillRect(
        Math.floor(mx + (m.capW * s) / 2 - stemW / 2),
        Math.floor(my),
        Math.floor(stemW),
        Math.floor(m.stemH * s),
      );

      // Cap
      const colors = m.hue === 'cyan' ? CAP_CYAN : CAP_PURPLE;
      ctx.fillStyle = colors[0];
      ctx.fillRect(
        Math.floor(mx),
        Math.floor(my - m.capH * s),
        Math.floor(m.capW * s),
        Math.floor(m.capH * s),
      );
      // Highlight on cap
      ctx.fillStyle = colors[1];
      ctx.fillRect(
        Math.floor(mx + 1 * s),
        Math.floor(my - m.capH * s),
        Math.floor(Math.max(1, (m.capW - 2) * s)),
        Math.floor(Math.max(1, (m.capH * 0.4) * s)),
      );
    }
  }

  renderGlow(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const cx = this.x * s;
    const cy = (this.y - 3) * s; // glow centered slightly above base
    const intensity = 0.4 + Math.sin(this.glowPhase) * 0.25;
    const glowRadius = GLOW_RADIUS * s;

    // Determine average hue for glow
    const hasCyan = this.mushrooms.some((m) => m.hue === 'cyan');
    const r = hasCyan ? 34 : 167;
    const g = hasCyan ? 211 : 139;
    const b = hasCyan ? 238 : 250;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${(intensity * 0.15).toFixed(3)})`);
    gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${(intensity * 0.06).toFixed(3)})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - glowRadius, cy - glowRadius, glowRadius * 2, glowRadius * 2);
    ctx.restore();
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
