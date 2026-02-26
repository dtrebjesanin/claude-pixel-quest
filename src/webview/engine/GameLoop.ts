export class GameLoop {
  private lastTime = 0;
  private accumulator = 0;
  private readonly fixedDt = 1000 / 30; // 30 fps for pixel art
  private running = false;
  private rafId = 0;
  private updateFn: (dt: number) => void;
  private renderFn: (interpolation: number) => void;

  constructor(update: (dt: number) => void, render: (interpolation: number) => void) {
    this.updateFn = update;
    this.renderFn = render;
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick(now: number): void {
    if (!this.running) return;

    const delta = Math.min(now - this.lastTime, 100); // Cap at 100ms to avoid spiral
    this.lastTime = now;
    this.accumulator += delta;

    while (this.accumulator >= this.fixedDt) {
      this.updateFn(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    this.renderFn(this.accumulator / this.fixedDt);
    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }
}
