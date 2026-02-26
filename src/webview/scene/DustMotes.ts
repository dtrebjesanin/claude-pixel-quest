// Floating ambient dust motes — always-on cave atmosphere

import { AmbientParticlePool } from '../entities/AmbientParticlePool';

const TARGET_COUNT = 20;
const INITIAL_COUNT = 15;
const SPAWN_INTERVAL = 300; // ms between spawn attempts
const BRIGHT_THRESHOLD = 0.7;
const BRIGHT_COLOR = '#fef3c7'; // warm white
const DIM_COLOR = '#64748b'; // gray

export class DustMotes {
  private pool: AmbientParticlePool;
  private spawnTimer = 0;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pool = new AmbientParticlePool({ gravity: 0, maxParticles: 25 });
    this.seedInitialMotes();
  }

  private seedInitialMotes(): void {
    for (let i = 0; i < INITIAL_COUNT; i++) {
      this.spawnMote(Math.random() * 0.8); // random starting life ratio
    }
  }

  private spawnMote(lifeRatio = 0): void {
    const brightness = 0.3 + Math.random() * 0.7;
    const color = brightness > BRIGHT_THRESHOLD ? BRIGHT_COLOR : DIM_COLOR;
    const maxLife = 4000 + Math.random() * 4000;
    this.pool.spawn({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 4,
      maxLife,
      size: 1 + Math.random(),
      color,
      brightness,
    });
    // Advance life for initial seeding so they don't all appear at once
    if (lifeRatio > 0) {
      this.pool.setLastLife(lifeRatio * maxLife);
    }
  }

  update(dt: number): void {
    this.pool.update(dt);

    // Spawn new motes to maintain target count
    this.spawnTimer += dt;
    if (this.spawnTimer >= SPAWN_INTERVAL && this.pool.count < TARGET_COUNT) {
      this.spawnTimer = 0;
      this.spawnMote();
    }
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    this.pool.render(ctx, scale);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  get count(): number {
    return this.pool.count;
  }
}
