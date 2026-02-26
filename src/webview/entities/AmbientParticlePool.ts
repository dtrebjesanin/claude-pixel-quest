export interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  brightness: number;
}

interface PoolConfig {
  gravity: number;
  maxParticles: number;
}

type SpawnData = Omit<AmbientParticle, 'life'>;

export class AmbientParticlePool {
  private particles: AmbientParticle[] = [];
  private config: PoolConfig;

  constructor(config: PoolConfig) {
    this.config = config;
  }

  spawn(data: SpawnData): void {
    if (this.particles.length >= this.config.maxParticles) return;
    this.particles.push({ ...data, life: 0 });
  }

  update(dt: number): AmbientParticle[] {
    const expired: AmbientParticle[] = [];
    const dtSec = dt / 1000;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        expired.push(p);
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
        continue;
      }
      p.vy += this.config.gravity * dtSec;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
    }

    return expired;
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    for (const p of this.particles) {
      const alpha = (1 - p.life / p.maxLife) * p.brightness;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const sz = p.size * scale;
      ctx.fillRect(Math.floor(p.x * scale), Math.floor(p.y * scale), Math.ceil(sz), Math.ceil(sz));
    }
    ctx.globalAlpha = 1;
  }

  /** Set the life of the most recently spawned particle. */
  setLastLife(life: number): void {
    const last = this.particles[this.particles.length - 1];
    if (last) last.life = life;
  }

  /** Remove particles matching a predicate, returning them. */
  removeWhere(predicate: (p: AmbientParticle) => boolean): AmbientParticle[] {
    const removed: AmbientParticle[] = [];
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (predicate(this.particles[i])) {
        removed.push(this.particles[i]);
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
    return removed;
  }

  get count(): number {
    return this.particles.length;
  }
}
