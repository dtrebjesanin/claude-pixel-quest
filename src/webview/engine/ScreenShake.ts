export class ScreenShake {
  private intensity = 0;
  private duration = 0;
  private elapsed = 0;

  offsetX = 0;
  offsetY = 0;

  get active(): boolean {
    return this.elapsed < this.duration && this.intensity > 0;
  }

  trigger(intensity: number, durationMs: number): void {
    this.intensity = intensity;
    this.duration = durationMs;
    this.elapsed = 0;
  }

  update(dt: number): void {
    if (!this.active) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    this.elapsed += dt;

    if (this.elapsed >= this.duration) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    const decay = 1 - this.elapsed / this.duration;
    const mag = this.intensity * decay;
    this.offsetX = (Math.random() - 0.5) * 2 * mag;
    this.offsetY = (Math.random() - 0.5) * 2 * mag;
  }
}
