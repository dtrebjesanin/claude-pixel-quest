export class Camera {
  width = 300;
  height = 400;
  readonly LOGICAL_WIDTH = 300;
  readonly LOGICAL_HEIGHT = 400;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private resizeObserver: ResizeObserver;
  private onResizeCallback?: (width: number, height: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.resize(width, height);
        }
      }
    });

    // Observe body for sidebar resize events
    this.resizeObserver.observe(document.body);

    // Initial size
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect && rect.width > 0) {
      this.resize(rect.width, rect.height);
    }
  }

  onResize(callback: (width: number, height: number) => void): void {
    this.onResizeCallback = callback;
  }

  private resize(w: number, h: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.width = w;
    this.height = h;
    this.onResizeCallback?.(w, h);
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getScale(): number {
    return Math.min(this.width / this.LOGICAL_WIDTH, this.height / this.LOGICAL_HEIGHT);
  }

  /** Actual logical height of the viewport (>= LOGICAL_HEIGHT). */
  getLogicalHeight(): number {
    return this.height / this.getScale();
  }

  /** Extra logical units beyond 400 (0 when height-constrained or exact fit). */
  getStretch(): number {
    return Math.max(0, this.getLogicalHeight() - this.LOGICAL_HEIGHT);
  }

  getOffsetX(): number {
    return (this.width - this.LOGICAL_WIDTH * this.getScale()) / 2;
  }

  getOffsetY(): number {
    return 0;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  dispose(): void {
    this.resizeObserver.disconnect();
  }
}
