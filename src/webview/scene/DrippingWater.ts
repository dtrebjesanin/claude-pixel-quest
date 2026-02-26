// Stalactites with dripping water drops and splash effects

import { AmbientParticlePool } from '../entities/AmbientParticlePool';

const ROCK_DARK = '#2c2c3a';
const ROCK_MID = '#3d3d50';
const DROP_COLOR = '#60a5fa';
const SPLASH_COLOR = '#93c5fd';
const MIN_DRIP_INTERVAL = 3000;
const MAX_DRIP_INTERVAL = 8000;

interface StalactiteConfig {
  x: number;
  tipY: number;
}

interface Stalactite {
  x: number;
  tipY: number;
  nextDripTime: number;
  widths: number[]; // taper widths from top to tip
}

export class DrippingWater {
  private stalactites: Stalactite[] = [];
  private dropPool: AmbientParticlePool;
  private splashPool: AmbientParticlePool;
  private floorY: number;

  constructor(positions: StalactiteConfig[], logicalHeight: number) {
    this.floorY = logicalHeight - 20; // floor zone
    this.dropPool = new AmbientParticlePool({ gravity: 200, maxParticles: 10 });
    this.splashPool = new AmbientParticlePool({ gravity: 50, maxParticles: 20 });

    for (const pos of positions) {
      this.stalactites.push({
        x: pos.x,
        tipY: pos.tipY,
        nextDripTime: MIN_DRIP_INTERVAL + Math.random() * (MAX_DRIP_INTERVAL - MIN_DRIP_INTERVAL),
        widths: [8, 6, 4, 2], // taper from 8px wide to 2px tip
      });
    }
  }

  update(dt: number): void {
    // Update drip timers
    for (const s of this.stalactites) {
      s.nextDripTime -= dt;
      if (s.nextDripTime <= 0) {
        // Spawn a drop at the stalactite tip
        this.dropPool.spawn({
          x: s.x,
          y: s.tipY + 12, // below the stalactite body
          vx: 0,
          vy: 10,
          maxLife: 3000, // generous — gravity will move it past floor fast
          size: 2,
          color: DROP_COLOR,
          brightness: 0.9,
        });
        s.nextDripTime = MIN_DRIP_INTERVAL + Math.random() * (MAX_DRIP_INTERVAL - MIN_DRIP_INTERVAL);
      }
    }

    // Update drops — check for floor hits
    const expired = this.dropPool.update(dt);

    // Also check active drops that reached the floor
    const hit = this.dropPool.removeWhere(p => p.y >= this.floorY);
    for (const p of hit) {
      this.spawnSplash(p.x, this.floorY);
    }

    // Spawn splash for any expired drops near the floor
    for (const p of expired) {
      if (p.y >= this.floorY - 20) {
        this.spawnSplash(p.x, this.floorY);
      }
    }

    this.splashPool.update(dt);
  }

  private spawnSplash(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      this.splashPool.spawn({
        x,
        y,
        vx: (Math.random() - 0.5) * 40,
        vy: -20 - Math.random() * 20,
        maxLife: 200 + Math.random() * 100,
        size: 1,
        color: SPLASH_COLOR,
        brightness: 0.7,
      });
    }
  }

  setFloorY(logicalHeight: number): void {
    this.floorY = logicalHeight - 20;
  }

  renderStalactites(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;

    for (const st of this.stalactites) {
      const cx = st.x * s;
      let ty = 0; // start from ceiling

      for (let i = 0; i < st.widths.length; i++) {
        const w = st.widths[i] * s;
        const h = 3 * s;
        ctx.fillStyle = i < 2 ? ROCK_DARK : ROCK_MID;
        ctx.fillRect(Math.floor(cx - w / 2), Math.floor(ty), Math.floor(w), Math.floor(h));
        ty += h;
      }
    }
  }

  renderDrops(ctx: CanvasRenderingContext2D, scale: number): void {
    this.dropPool.render(ctx, scale);
    this.splashPool.render(ctx, scale);
  }
}
