interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  text?: string;
}

export class ParticleEmitter {
  private particles: Particle[] = [];

  emitSparks(x: number, y: number): void {
    const colors = ['#fbbf24', '#f97316', '#ef4444'];
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 100,
        vy: -Math.random() * 80 - 20,
        life: 0,
        maxLife: 300 + Math.random() * 200,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2,
      });
    }
  }

  emitPoof(x: number, y: number): void {
    const colors = ['#e2e8f0', '#94a3b8', '#ffffff', '#cbd5e1'];
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * (40 + Math.random() * 30),
        vy: Math.sin(angle) * (40 + Math.random() * 30),
        life: 0,
        maxLife: 400 + Math.random() * 200,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3,
      });
    }
  }

  emitSparkles(x: number, y: number): void {
    const colors = ['#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'];
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y,
        vx: (Math.random() - 0.5) * 40,
        vy: -Math.random() * 60 - 30,
        life: 0,
        maxLife: 600 + Math.random() * 400,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 2,
      });
    }
  }

  emitDebris(x: number, y: number): void {
    const colors = ['#2c2c3a', '#3d3d50', '#4a4a5e'];
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 120,
        vy: -Math.random() * 60 - 20,
        life: 0,
        maxLife: 400 + Math.random() * 300,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random(),
      });
    }
  }

  emitDust(x: number, y: number): void {
    const colors = ['#94a3b8', '#78716c'];
    this.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 20,
      vy: -Math.random() * 10 - 5,
      life: 0,
      maxLife: 200 + Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2,
    });
  }

  emitZzz(x: number, y: number): void {
    const letters = ['Z', 'z', 'z'];
    const sizes = [8, 6, 5];
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + i * 6 + Math.random() * 4,
        y: y - i * 4,
        vx: 8 + Math.random() * 8,
        vy: -18 - Math.random() * 8 - i * 4,
        life: i * 200,   // stagger appearance
        maxLife: 1800,
        color: '#94a3b8',
        size: sizes[i],
        text: letters[i],
      });
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
        continue;
      }
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      p.vy += 150 * (dt / 1000); // gravity
    }
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    for (const p of this.particles) {
      if (p.life < 0) continue; // staggered particles not yet visible
      const alpha = 1 - p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.text) {
        const fontSize = Math.max(6, Math.floor(p.size * scale));
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.fillText(p.text, Math.floor(p.x * scale), Math.floor(p.y * scale));
      } else {
        const sz = p.size * scale;
        ctx.fillRect(Math.floor(p.x * scale), Math.floor(p.y * scale), Math.ceil(sz), Math.ceil(sz));
      }
    }
    ctx.globalAlpha = 1;
  }

  get count(): number {
    return this.particles.length;
  }
}
