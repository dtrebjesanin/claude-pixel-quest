// src/webview/scene/ForestBackground.ts
// Procedural forest clearing — enclosed by dense trees on all sides, no horizon

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

interface BgTree {
  x: number;
  y: number;       // base of trunk
  trunkW: number;
  trunkH: number;
  trunkColor: string;
  canopyRects: Rect[];
  rootRects: Rect[];
}

export class ForestBackground {
  // Top canopy trees
  private topTrees: BgTree[] = [];
  // Left-side trees
  private leftTrees: BgTree[] = [];
  // Right-side trees
  private rightTrees: BgTree[] = [];
  // Bottom trees (entering from bottom edge)
  private bottomTrees: BgTree[] = [];
  // Clearing floor details
  private grassTufts: Rect[] = [];
  private fallenLeaves: Rect[] = [];
  private flowers: Rect[] = [];
  private dirtPatches: Rect[] = [];
  // Foreground canopy overlay rects (rendered last for depth)
  private foregroundCanopy: Rect[] = [];

  private width = 300;
  private height = 400;

  generate(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.topTrees = [];
    this.leftTrees = [];
    this.rightTrees = [];
    this.bottomTrees = [];
    this.grassTufts = [];
    this.fallenLeaves = [];
    this.flowers = [];
    this.dirtPatches = [];
    this.foregroundCanopy = [];

    const rng = this.seededRandom(91);
    const scale = width / 300;

    const trunkColors = ['#5c3a1a', '#6b4226', '#4a2e14', '#7a4b2a', '#3d2211'];
    const canopyDark = ['#143d14', '#1a4a1a', '#0f330f'];
    const canopyMid = ['#1e5c1e', '#256b25', '#1a521a'];
    const canopyLight = ['#2d7a2d', '#328a32', '#267326'];
    const canopyHighlight = ['#4CAF50', '#45a049'];

    const pickTrunk = () => trunkColors[Math.floor(rng() * trunkColors.length)];
    const pickCanopy = (arr: string[]) => arr[Math.floor(rng() * arr.length)];

    // Helper: build canopy rects around a center point — big, overlapping masses
    const buildCanopy = (cx: number, cy: number, baseW: number): Rect[] => {
      const rects: Rect[] = [];
      // Dark base (widest)
      rects.push({ x: cx - baseW / 2, y: cy + 15, w: baseW, h: 40 + rng() * 20, color: pickCanopy(canopyDark) });
      // Mid layer
      const midW = baseW * 0.9;
      rects.push({ x: cx - midW / 2, y: cy - 5, w: midW, h: 50 + rng() * 15, color: pickCanopy(canopyMid) });
      // Upper
      const upW = baseW * 0.7;
      rects.push({ x: cx - upW / 2, y: cy - 20 - rng() * 10, w: upW, h: 35 + rng() * 12, color: pickCanopy(canopyMid) });
      // Top highlight
      const topW = baseW * 0.45;
      rects.push({ x: cx - topW / 2, y: cy - 25 - rng() * 8, w: topW, h: 15 + rng() * 8, color: pickCanopy(canopyLight) });
      // Bright speck
      rects.push({ x: cx - topW * 0.3, y: cy - 15, w: topW * 0.5, h: 5 + rng() * 4, color: pickCanopy(canopyHighlight) });
      return rects;
    };

    // ── TOP CANOPY TREES (5-7 massive overlapping trees across the top) ──
    const topCount = 5 + Math.floor(rng() * 3);
    for (let i = 0; i < topCount; i++) {
      const tx = (i / topCount) * width + (rng() - 0.5) * (width / topCount) * 0.5;
      const tw = (24 + rng() * 16) * scale;
      const th = (100 + rng() * 50) * scale;
      const baseY = th; // trunk extends down from top
      const canopyCx = tx + tw / 2;
      const canopyBaseW = (80 + rng() * 50) * scale;
      const canopyCy = baseY - 25 * scale - rng() * 15 * scale;

      this.topTrees.push({
        x: tx, y: baseY,
        trunkW: tw, trunkH: th,
        trunkColor: pickTrunk(),
        canopyRects: buildCanopy(canopyCx, canopyCy, canopyBaseW),
        rootRects: [],
      });
    }

    // ── LEFT SIDE TREES (2-3 trees, mostly off-screen — just trunks peeking in) ──
    const leftCount = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < leftCount; i++) {
      const ty = height * 0.15 + (i / leftCount) * height * 0.6 + (rng() - 0.5) * 20 * scale;
      const tw = (30 + rng() * 18) * scale;
      const th = (120 + rng() * 80) * scale;
      const tx = -(tw * 0.75) + rng() * 3 * scale; // far off-screen left — only edge visible
      const canopyCx = tx + tw / 2; // no lean — canopy stays over trunk
      const canopyBaseW = (60 + rng() * 30) * scale;
      const canopyCy = ty - th * 0.3;

      this.leftTrees.push({
        x: tx, y: ty,
        trunkW: tw, trunkH: th,
        trunkColor: pickTrunk(),
        canopyRects: buildCanopy(canopyCx, canopyCy, canopyBaseW),
        rootRects: [
          { x: tx - 4 * scale, y: ty + th / 2 - 6 * scale, w: tw + 8 * scale, h: 12 * scale, color: pickTrunk() },
        ],
      });
    }

    // ── RIGHT SIDE TREES (2-3 trees, mostly off-screen — just trunks peeking in) ──
    const rightCount = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < rightCount; i++) {
      const ty = height * 0.15 + (i / rightCount) * height * 0.6 + (rng() - 0.5) * 20 * scale;
      const tw = (30 + rng() * 18) * scale;
      const th = (120 + rng() * 80) * scale;
      const tx = width - tw * 0.25 + rng() * 3 * scale; // far off-screen right — only edge visible
      const canopyCx = tx + tw / 2; // no lean — canopy stays over trunk
      const canopyBaseW = (60 + rng() * 30) * scale;
      const canopyCy = ty - th * 0.3;

      this.rightTrees.push({
        x: tx, y: ty,
        trunkW: tw, trunkH: th,
        trunkColor: pickTrunk(),
        canopyRects: buildCanopy(canopyCx, canopyCy, canopyBaseW),
        rootRects: [
          { x: tx - 4 * scale, y: ty + th / 2 - 6 * scale, w: tw + 8 * scale, h: 12 * scale, color: pickTrunk() },
        ],
      });
    }

    // ── BOTTOM TREES (4-5 massive trees entering from bottom edge) ──
    const bottomCount = 4 + Math.floor(rng() * 2);
    for (let i = 0; i < bottomCount; i++) {
      const tx = (i / bottomCount) * width + (rng() - 0.5) * (width / bottomCount) * 0.4;
      const tw = (24 + rng() * 16) * scale;
      const th = (90 + rng() * 50) * scale;
      const baseY = height + th * 0.4; // trunk base well below viewport
      const canopyCx = tx + tw / 2;
      const canopyBaseW = (80 + rng() * 50) * scale;
      const canopyCy = height - (40 + rng() * 35) * scale;

      this.bottomTrees.push({
        x: tx, y: baseY,
        trunkW: tw, trunkH: th,
        trunkColor: pickTrunk(),
        canopyRects: buildCanopy(canopyCx, canopyCy, canopyBaseW),
        rootRects: [],
      });
    }

    // ── CLEARING FLOOR (center area) ──
    const clearingTop = height * 0.35;
    const clearingBottom = height * 0.78;

    // Grass tufts
    for (let i = 0; i < 35; i++) {
      this.grassTufts.push({
        x: 20 * scale + rng() * (width - 40 * scale),
        y: clearingTop + rng() * (clearingBottom - clearingTop),
        w: (2 + rng() * 3) * scale,
        h: (3 + rng() * 5) * scale,
        color: rng() > 0.5 ? '#3a7a2a' : '#2d6b22',
      });
    }

    // Dirt patches
    for (let i = 0; i < 8; i++) {
      this.dirtPatches.push({
        x: 30 * scale + rng() * (width - 60 * scale),
        y: clearingTop + 10 * scale + rng() * (clearingBottom - clearingTop - 20 * scale),
        w: (8 + rng() * 15) * scale,
        h: (4 + rng() * 8) * scale,
        color: rng() > 0.5 ? '#5a4a30' : '#4a3b28',
      });
    }

    // Fallen leaves
    const leafColors = ['#92400e', '#b45309', '#ca8a04', '#a16207', '#dc2626'];
    for (let i = 0; i < 20; i++) {
      this.fallenLeaves.push({
        x: 15 * scale + rng() * (width - 30 * scale),
        y: clearingTop + rng() * (clearingBottom - clearingTop + 20 * scale),
        w: (2 + rng() * 3) * scale,
        h: (1 + rng() * 2) * scale,
        color: leafColors[Math.floor(rng() * leafColors.length)],
      });
    }

    // Small flowers
    const flowerColors = ['#fbbf24', '#f472b6', '#c084fc', '#ffffff'];
    for (let i = 0; i < 5; i++) {
      this.flowers.push({
        x: 30 * scale + rng() * (width - 60 * scale),
        y: clearingTop + 20 * scale + rng() * (clearingBottom - clearingTop - 30 * scale),
        w: 3 * scale,
        h: 3 * scale,
        color: flowerColors[Math.floor(rng() * flowerColors.length)],
      });
    }

    // ── FOREGROUND CANOPY OVERLAY (dark rects at extreme edges for vignette) ──
    // Top edge overlay — thick canopy band
    for (let i = 0; i < 6; i++) {
      const fx = (i / 6) * width + (rng() - 0.5) * width * 0.12;
      this.foregroundCanopy.push({
        x: fx, y: -rng() * 8 * scale,
        w: (70 + rng() * 40) * scale,
        h: (25 + rng() * 15) * scale,
        color: pickCanopy(canopyDark),
      });
    }
    // Bottom edge overlay — thick canopy band
    for (let i = 0; i < 5; i++) {
      const fx = (i / 5) * width + (rng() - 0.5) * width * 0.12;
      this.foregroundCanopy.push({
        x: fx, y: height - (20 + rng() * 12) * scale,
        w: (65 + rng() * 40) * scale,
        h: (25 + rng() * 15) * scale,
        color: pickCanopy(canopyDark),
      });
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.width !== width || this.height !== height) {
      this.generate(width, height);
    }

    // 1. Base fill — dark forest green, no sky
    ctx.fillStyle = '#1a3a14';
    ctx.fillRect(0, 0, width, height);

    // 2. Clearing floor gradient — earthy green in center
    const clearingGrad = ctx.createRadialGradient(
      width / 2, height * 0.56, 0,
      width / 2, height * 0.56, width * 0.45,
    );
    clearingGrad.addColorStop(0, '#4a7a3a');   // bright center
    clearingGrad.addColorStop(0.5, '#3d6b30'); // mid green
    clearingGrad.addColorStop(0.8, '#2d5520'); // darker edges
    clearingGrad.addColorStop(1, '#1a3a14');   // blends into forest
    ctx.fillStyle = clearingGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Dirt patches
    for (const d of this.dirtPatches) {
      ctx.fillStyle = d.color;
      ctx.fillRect(Math.floor(d.x), Math.floor(d.y), Math.floor(d.w), Math.floor(d.h));
    }

    // 4. Grass tufts
    for (const g of this.grassTufts) {
      ctx.fillStyle = g.color;
      ctx.fillRect(Math.floor(g.x), Math.floor(g.y - g.h), Math.floor(g.w), Math.floor(g.h));
    }

    // 5. Flowers
    for (const f of this.flowers) {
      ctx.fillStyle = f.color;
      ctx.fillRect(Math.floor(f.x), Math.floor(f.y), Math.floor(f.w), Math.floor(f.h));
      ctx.fillStyle = '#15803d';
      ctx.fillRect(Math.floor(f.x + f.w / 3), Math.floor(f.y + f.h), Math.ceil(f.w / 3), Math.ceil(4 * (width / 300)));
    }

    // 6. Fallen leaves
    for (const leaf of this.fallenLeaves) {
      ctx.fillStyle = leaf.color;
      ctx.fillRect(Math.floor(leaf.x), Math.floor(leaf.y), Math.floor(leaf.w), Math.floor(leaf.h));
    }

    // 7. Tree trunks (all sides)
    this.renderTrunks(ctx, this.topTrees, 'top');
    this.renderTrunks(ctx, this.leftTrees, 'side');
    this.renderTrunks(ctx, this.rightTrees, 'side');
    this.renderTrunks(ctx, this.bottomTrees, 'bottom');

    // 8. Tree canopies (all sides — on top of trunks)
    for (const trees of [this.topTrees, this.leftTrees, this.rightTrees, this.bottomTrees]) {
      for (const tree of trees) {
        for (const r of tree.canopyRects) {
          ctx.fillStyle = r.color;
          ctx.fillRect(Math.floor(r.x), Math.floor(r.y), Math.floor(r.w), Math.floor(r.h));
        }
      }
    }

    // 9. Foreground canopy overlay (vignette framing)
    for (const r of this.foregroundCanopy) {
      ctx.fillStyle = r.color;
      ctx.fillRect(Math.floor(r.x), Math.floor(r.y), Math.floor(r.w), Math.floor(r.h));
    }

    // 10. Subtle dark vignette at edges
    const vignetteGrad = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.2,
      width / 2, height / 2, width * 0.7,
    );
    vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, width, height);
  }

  private renderTrunks(ctx: CanvasRenderingContext2D, trees: BgTree[], type: 'top' | 'side' | 'bottom'): void {
    for (const tree of trees) {
      // Main trunk
      ctx.fillStyle = tree.trunkColor;
      if (type === 'top') {
        // Trunk grows downward from top
        ctx.fillRect(
          Math.floor(tree.x), 0,
          Math.floor(tree.trunkW), Math.floor(tree.y),
        );
      } else if (type === 'bottom') {
        // Trunk grows upward from bottom
        const trunkTop = tree.y - tree.trunkH;
        ctx.fillRect(
          Math.floor(tree.x), Math.floor(trunkTop),
          Math.floor(tree.trunkW), Math.floor(tree.trunkH),
        );
      } else {
        // Side tree — vertical trunk
        const trunkTop = tree.y - tree.trunkH / 2;
        ctx.fillRect(
          Math.floor(tree.x), Math.floor(trunkTop),
          Math.floor(tree.trunkW), Math.floor(tree.trunkH),
        );
      }

      // Bark detail — darker lines
      ctx.fillStyle = '#3d2211';
      const barkX = tree.x + tree.trunkW * 0.3;
      const barkX2 = tree.x + tree.trunkW * 0.65;
      const start = type === 'top' ? 10 : tree.y - tree.trunkH / 2;
      const end = type === 'top' ? tree.y : tree.y + tree.trunkH / 2;
      for (let by = start; by < end; by += 12 * (this.width / 300)) {
        ctx.fillRect(Math.floor(barkX), Math.floor(by), 2, 5);
        ctx.fillRect(Math.floor(barkX2), Math.floor(by + 6), 2, 4);
      }

      // Root flare
      for (const root of tree.rootRects) {
        ctx.fillStyle = root.color;
        ctx.fillRect(Math.floor(root.x), Math.floor(root.y), Math.floor(root.w), Math.floor(root.h));
      }
    }
  }

  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return s / 2147483647;
    };
  }
}
