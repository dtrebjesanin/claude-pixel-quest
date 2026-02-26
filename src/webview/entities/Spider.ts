type SpiderState = 'RESTING' | 'DESCENDING' | 'CLIMBING';

export class Spider {
  x: number;
  y: number;
  private originY: number;
  private maxDrop: number;
  state: SpiderState = 'RESTING';
  threadLength = 0;
  private restTimer: number;
  private speed = 30; // px/s

  constructor(x: number, y: number, maxDrop: number) {
    this.x = x;
    this.y = y;
    this.originY = y;
    this.maxDrop = maxDrop;
    this.restTimer = 4000 + Math.random() * 3000;
  }

  update(dt: number): void {
    if (this.state === 'RESTING') {
      this.restTimer -= dt;
      if (this.restTimer <= 0) {
        this.state = 'DESCENDING';
      }
    } else if (this.state === 'DESCENDING') {
      this.y += this.speed * (dt / 1000);
      this.threadLength = this.y - this.originY;
      if (this.threadLength >= this.maxDrop) {
        this.y = this.originY + this.maxDrop;
        this.threadLength = this.maxDrop;
        this.state = 'CLIMBING';
      }
    } else {
      this.y -= this.speed * (dt / 1000);
      this.threadLength = this.y - this.originY;
      if (this.y <= this.originY) {
        this.y = this.originY;
        this.threadLength = 0;
        this.state = 'RESTING';
        this.restTimer = 4000 + Math.random() * 3000;
      }
    }
  }

  renderCobweb(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    // Anchor point: top-right corner where wall meets ceiling
    const ax = Math.floor(this.x * s + 20 * s);
    const ay = Math.floor(this.originY * s - 8 * s);

    // Spoke endpoints — fan out down-left from the anchor
    const spokes = [
      { x: ax - 30 * s, y: ay + 2 * s },   // far left (nearly horizontal)
      { x: ax - 28 * s, y: ay + 12 * s },  // mid-left
      { x: ax - 22 * s, y: ay + 22 * s },  // lower-left
      { x: ax - 12 * s, y: ay + 28 * s },  // lower
      { x: ax - 2 * s, y: ay + 30 * s },   // nearly vertical down
    ];

    ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    ctx.lineWidth = 1;

    // Draw radial spokes from anchor
    ctx.beginPath();
    for (const sp of spokes) {
      ctx.moveTo(ax, ay);
      ctx.lineTo(Math.floor(sp.x), Math.floor(sp.y));
    }
    ctx.stroke();

    // Draw concentric cross-threads at 33%, 60%, 85% along each spoke
    const rings = [0.33, 0.6, 0.85];
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    for (const t of rings) {
      ctx.beginPath();
      for (let i = 0; i < spokes.length; i++) {
        const px = Math.floor(ax + (spokes[i].x - ax) * t);
        const py = Math.floor(ay + (spokes[i].y - ay) * t);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const px = Math.floor(this.x * s);
    const py = Math.floor(this.y * s);
    const originPy = Math.floor(this.originY * s);

    // Thread
    if (this.threadLength > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(px + 2 * s, originPy, 1 * s, Math.floor(this.threadLength * s));
    }

    // Body
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(px, py, 5 * s, 4 * s);

    // Legs (4 pairs)
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(px - 2 * s, py + 1 * s, 2 * s, 1 * s);
    ctx.fillRect(px + 5 * s, py + 1 * s, 2 * s, 1 * s);
    ctx.fillRect(px - 3 * s, py + 2 * s, 3 * s, 1 * s);
    ctx.fillRect(px + 5 * s, py + 2 * s, 3 * s, 1 * s);

    // Eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(px + 1 * s, py, 1 * s, 1 * s);
    ctx.fillRect(px + 3 * s, py, 1 * s, 1 * s);
  }
}
