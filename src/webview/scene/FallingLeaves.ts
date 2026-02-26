// Falling leaf particles — naturalistic forest atmosphere
// Slow-drifting leaves with horizontal sway, autumnal colors

import { AmbientParticlePool } from '../entities/AmbientParticlePool';

const TARGET_COUNT = 10;
const INITIAL_COUNT = 8;
const SPAWN_INTERVAL = 500; // ms between spawn attempts
const LEAF_COLORS = ['#92400e', '#b45309', '#ca8a04', '#a16207', '#dc2626', '#d97706'];

export class FallingLeaves {
  private pool: AmbientParticlePool;
  private spawnTimer = 0;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    // Positive gravity for downward drift, but gentle
    this.pool = new AmbientParticlePool({ gravity: 8, maxParticles: 15 });
    this.seedInitial();
  }

  private seedInitial(): void {
    for (let i = 0; i < INITIAL_COUNT; i++) {
      this.spawnLeaf(Math.random() * 0.7);
    }
  }

  private spawnLeaf(lifeRatio = 0): void {
    const maxLife = 6000 + Math.random() * 5000;
    this.pool.spawn({
      x: Math.random() * this.width,
      y: Math.random() * this.height * 0.3, // spawn in upper area (canopy)
      vx: (Math.random() - 0.5) * 12, // gentle horizontal sway
      vy: 3 + Math.random() * 5, // slow downward
      maxLife,
      size: 2 + Math.random() * 2,
      color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      brightness: 0.6 + Math.random() * 0.4,
    });
  }

  update(dt: number): void {
    this.pool.update(dt);

    this.spawnTimer += dt;
    if (this.spawnTimer >= SPAWN_INTERVAL && this.pool.count < TARGET_COUNT) {
      this.spawnTimer = 0;
      this.spawnLeaf();
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
