// Procedural ocean background — no sprite dependency
// Draws a pixel-art all-ocean scene with island at top and harbor town at bottom

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export class FishingBackground {
  // Wave ripple segments (broken lines for natural look)
  private ripples: { x: number; y: number; w: number; alpha: number }[] = [];
  // Island elements
  private sandRects: Rect[] = [];
  private palmTrees: { trunk: Rect[]; fronds: Rect[] }[] = [];
  private bushes: Rect[] = [];
  // Harbor back layer (behind boats)
  private harborBackRects: Rect[] = [];
  // Harbor front layer (over boats)
  private harborFrontRects: Rect[] = [];
  // Underwater details
  private coralRects: Rect[] = [];
  private seaweedRects: Rect[] = [];
  private rockRects: Rect[] = [];

  private width = 300;
  private height = 400;

  generate(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.ripples = [];
    this.sandRects = [];
    this.palmTrees = [];
    this.bushes = [];
    this.harborBackRects = [];
    this.harborFrontRects = [];
    this.coralRects = [];
    this.seaweedRects = [];
    this.rockRects = [];

    const rng = this.seededRandom(77);
    const scale = width / 300;

    // --- Ripple segments (broken, natural-looking water lines) ---
    const rowSpacing = 18 * scale;
    const rowCount = Math.floor(height / rowSpacing);
    for (let i = 0; i < rowCount; i++) {
      const ry = i * rowSpacing + rng() * 6 * scale;
      // 1-2 broken segments per row
      const segCount = 1 + Math.floor(rng() * 2);
      let segX = rng() * 30 * scale;
      for (let j = 0; j < segCount; j++) {
        const segW = (20 + rng() * 40) * scale;
        const alpha = 0.06 + rng() * 0.12;
        this.ripples.push({ x: segX, y: ry, w: segW, alpha });
        segX += segW + (15 + rng() * 30) * scale; // gap between segments
        if (segX > width) break;
      }
    }

    // --- Island at top (centered, ~y 0-70 logical) ---
    const islandCenterX = width / 2;
    const islandTopY = Math.floor(10 * scale);
    const islandBottomY = Math.floor(70 * scale);

    // Sandy base: stacked rects getting wider toward bottom
    const sandLayers = 8;
    for (let i = 0; i < sandLayers; i++) {
      const t = i / (sandLayers - 1); // 0 at top, 1 at bottom
      const layerY = islandTopY + t * (islandBottomY - islandTopY);
      const layerW = (30 + t * 70) * scale;
      const layerH = ((islandBottomY - islandTopY) / sandLayers + 1) * 1;

      // Main sand
      this.sandRects.push({
        x: islandCenterX - layerW / 2,
        y: layerY,
        w: layerW,
        h: Math.ceil(layerH + 1),
        color: '#F4D03F',
      });

      // Darker accent on alternating layers
      if (i % 2 === 0 && i > 0) {
        this.sandRects.push({
          x: islandCenterX - layerW / 2 + 2 * scale,
          y: layerY,
          w: layerW - 4 * scale,
          h: Math.ceil(layerH / 2),
          color: '#E6B800',
        });
      }
    }

    // Beach edge at waterline (wider sandy fringe)
    this.sandRects.push({
      x: islandCenterX - 55 * scale,
      y: islandBottomY - 3 * scale,
      w: 110 * scale,
      h: 5 * scale,
      color: '#DEB887',
    });

    // --- Palm trees (2-3) ---
    const palmCount = 2 + (rng() > 0.5 ? 1 : 0);
    const palmPositions = [
      { x: islandCenterX - 20 * scale, lean: -3 * scale },
      { x: islandCenterX + 15 * scale, lean: 4 * scale },
      { x: islandCenterX - 5 * scale, lean: -1 * scale },
    ];

    for (let p = 0; p < palmCount; p++) {
      const pos = palmPositions[p];
      const trunkBaseY = Math.floor((35 + rng() * 10) * scale);
      const trunkTopY = Math.floor((12 + rng() * 5) * scale);
      const trunkRects: Rect[] = [];
      const frondRects: Rect[] = [];

      // Trunk: series of small rects going up with lean
      const trunkSegments = 6;
      for (let s = 0; s < trunkSegments; s++) {
        const t = s / (trunkSegments - 1);
        const segY = trunkBaseY - t * (trunkBaseY - trunkTopY);
        const segX = pos.x + t * pos.lean;
        trunkRects.push({
          x: segX,
          y: segY,
          w: 4 * scale,
          h: Math.ceil((trunkBaseY - trunkTopY) / trunkSegments) + 1,
          color: '#8B4513',
        });
      }

      // Frond cluster at top
      const frondX = pos.x + pos.lean;
      const frondY = trunkTopY - 2 * scale;
      const frondColors = ['#228B22', '#32CD32', '#2E8B57'];

      // Center mass
      frondRects.push({
        x: frondX - 8 * scale,
        y: frondY - 4 * scale,
        w: 20 * scale,
        h: 6 * scale,
        color: frondColors[0],
      });
      // Top layer
      frondRects.push({
        x: frondX - 6 * scale,
        y: frondY - 8 * scale,
        w: 16 * scale,
        h: 5 * scale,
        color: frondColors[1],
      });
      // Left droop
      frondRects.push({
        x: frondX - 12 * scale,
        y: frondY - 2 * scale,
        w: 8 * scale,
        h: 4 * scale,
        color: frondColors[2],
      });
      // Right droop
      frondRects.push({
        x: frondX + 8 * scale,
        y: frondY - 2 * scale,
        w: 8 * scale,
        h: 4 * scale,
        color: frondColors[2],
      });
      // Bright highlight
      frondRects.push({
        x: frondX - 3 * scale,
        y: frondY - 6 * scale,
        w: 10 * scale,
        h: 3 * scale,
        color: '#32CD32',
      });

      this.palmTrees.push({ trunk: trunkRects, fronds: frondRects });
    }

    // --- Small bushes/grass on island ---
    for (let i = 0; i < 4; i++) {
      this.bushes.push({
        x: islandCenterX + (rng() - 0.5) * 50 * scale,
        y: (30 + rng() * 25) * scale,
        w: (5 + rng() * 6) * scale,
        h: (3 + rng() * 4) * scale,
        color: '#2E8B57',
      });
    }

    // --- Harbor town at bottom (~y 264-400, fills to canvas bottom) ---
    const s = scale;
    const back = this.harborBackRects;
    const front = this.harborFrontRects;
    const cx = islandCenterX;

    // ── Ground / cobblestone base (full width to canvas bottom) ──
    back.push({ x: 0, y: 264 * s, w: 300 * s, h: 3 * s, color: '#6B8E9B' }); // water-stone transition
    back.push({ x: 0, y: 267 * s, w: 300 * s, h: 133 * s, color: '#8B7D6B' }); // stone ground to y=400
    back.push({ x: 0, y: 267 * s, w: 300 * s, h: 3 * s, color: '#A09080' }); // top highlight
    // Sandy beach edges at waterline
    back.push({ x: 0, y: 264 * s, w: 35 * s, h: 5 * s, color: '#DEB887' });
    back.push({ x: 250 * s, y: 264 * s, w: 50 * s, h: 4 * s, color: '#DEB887' });
    // Seafoam
    back.push({ x: 5 * s, y: 263 * s, w: 25 * s, h: 1, color: '#B0D8E8' });
    back.push({ x: 85 * s, y: 262 * s, w: 20 * s, h: 1, color: '#B0D8E8' });
    back.push({ x: 215 * s, y: 263 * s, w: 18 * s, h: 1, color: '#B0D8E8' });

    // ── Row 2: Town houses (y=316-370) ──
    // House A — Sandstone house (x=2-48)
    back.push({ x: 2 * s, y: 320 * s, w: 46 * s, h: 50 * s, color: '#C4956A' }); // wall
    back.push({ x: 0, y: 314 * s, w: 50 * s, h: 8 * s, color: '#8B2500' }); // roof
    back.push({ x: 4 * s, y: 314 * s, w: 42 * s, h: 2 * s, color: '#A03000' }); // roof highlight
    back.push({ x: 10 * s, y: 330 * s, w: 8 * s, h: 8 * s, color: '#FFE4B5' }); // window L
    back.push({ x: 11 * s, y: 334 * s, w: 6 * s, h: 1, color: '#8B7355' }); // sill
    back.push({ x: 30 * s, y: 330 * s, w: 8 * s, h: 8 * s, color: '#FFE4B5' }); // window R
    back.push({ x: 31 * s, y: 334 * s, w: 6 * s, h: 1, color: '#8B7355' }); // sill
    back.push({ x: 18 * s, y: 346 * s, w: 10 * s, h: 24 * s, color: '#6B3410' }); // door
    back.push({ x: 19 * s, y: 346 * s, w: 8 * s, h: 1, color: '#8B4513' }); // door highlight
    back.push({ x: 26 * s, y: 356 * s, w: 2 * s, h: 2 * s, color: '#FFD700' }); // knob
    // Chimney
    back.push({ x: 36 * s, y: 306 * s, w: 6 * s, h: 10 * s, color: '#7A4A30' });
    back.push({ x: 35 * s, y: 304 * s, w: 8 * s, h: 3 * s, color: '#5A3A20' }); // cap

    // House B — Blue-roofed tavern (x=50-96)
    back.push({ x: 52 * s, y: 318 * s, w: 42 * s, h: 52 * s, color: '#D4A574' }); // wall
    back.push({ x: 50 * s, y: 312 * s, w: 46 * s, h: 8 * s, color: '#2E5090' }); // roof
    back.push({ x: 54 * s, y: 312 * s, w: 38 * s, h: 2 * s, color: '#3A68B0' }); // roof highlight
    back.push({ x: 58 * s, y: 326 * s, w: 8 * s, h: 8 * s, color: '#FFE4B5' }); // window L
    back.push({ x: 59 * s, y: 330 * s, w: 6 * s, h: 1, color: '#8B7355' });
    back.push({ x: 78 * s, y: 326 * s, w: 8 * s, h: 8 * s, color: '#FFE4B5' }); // window R
    back.push({ x: 79 * s, y: 330 * s, w: 6 * s, h: 1, color: '#8B7355' });
    back.push({ x: 66 * s, y: 342 * s, w: 12 * s, h: 28 * s, color: '#5A3E26' }); // door
    back.push({ x: 67 * s, y: 342 * s, w: 10 * s, h: 1, color: '#6B4E36' });
    // Tavern sign
    back.push({ x: 56 * s, y: 336 * s, w: 8 * s, h: 6 * s, color: '#A0522D' });
    back.push({ x: 57 * s, y: 337 * s, w: 6 * s, h: 4 * s, color: '#FEFCE8' });

    // House C — Yellow house (x=98-140)
    back.push({ x: 100 * s, y: 324 * s, w: 38 * s, h: 46 * s, color: '#E8C87A' }); // wall
    back.push({ x: 98 * s, y: 318 * s, w: 42 * s, h: 8 * s, color: '#8B4513' }); // roof
    back.push({ x: 102 * s, y: 318 * s, w: 34 * s, h: 2 * s, color: '#A0522D' }); // highlight
    back.push({ x: 106 * s, y: 334 * s, w: 7 * s, h: 7 * s, color: '#FFE4B5' }); // window L
    back.push({ x: 125 * s, y: 334 * s, w: 7 * s, h: 7 * s, color: '#FFE4B5' }); // window R
    back.push({ x: 114 * s, y: 350 * s, w: 10 * s, h: 20 * s, color: '#6B3410' }); // door
    back.push({ x: 115 * s, y: 350 * s, w: 8 * s, h: 1, color: '#8B4513' });
    // Chimney
    back.push({ x: 128 * s, y: 310 * s, w: 6 * s, h: 10 * s, color: '#7A4A30' });
    back.push({ x: 127 * s, y: 308 * s, w: 8 * s, h: 3 * s, color: '#5A3A20' });

    // House D — Narrow green-shuttered (x=142-178)
    back.push({ x: 144 * s, y: 316 * s, w: 32 * s, h: 54 * s, color: '#D2B48C' }); // wall
    back.push({ x: 142 * s, y: 310 * s, w: 36 * s, h: 8 * s, color: '#2D5016' }); // roof
    back.push({ x: 146 * s, y: 310 * s, w: 28 * s, h: 2 * s, color: '#3A6820' }); // highlight
    back.push({ x: 150 * s, y: 324 * s, w: 6 * s, h: 6 * s, color: '#FFE4B5' }); // window L
    back.push({ x: 166 * s, y: 324 * s, w: 6 * s, h: 6 * s, color: '#FFE4B5' }); // window R
    back.push({ x: 148 * s, y: 324 * s, w: 2 * s, h: 6 * s, color: '#2D5016' }); // shutter L
    back.push({ x: 172 * s, y: 324 * s, w: 2 * s, h: 6 * s, color: '#2D5016' }); // shutter R
    back.push({ x: 155 * s, y: 340 * s, w: 10 * s, h: 30 * s, color: '#5A3E26' }); // door

    // House E — Tall white house (x=180-222)
    back.push({ x: 182 * s, y: 312 * s, w: 38 * s, h: 58 * s, color: '#E8E0D0' }); // wall
    back.push({ x: 180 * s, y: 306 * s, w: 42 * s, h: 8 * s, color: '#CC2222' }); // roof
    back.push({ x: 184 * s, y: 306 * s, w: 34 * s, h: 2 * s, color: '#DD3333' }); // highlight
    back.push({ x: 188 * s, y: 320 * s, w: 7 * s, h: 7 * s, color: '#FFE4B5' }); // window L
    back.push({ x: 207 * s, y: 320 * s, w: 7 * s, h: 7 * s, color: '#FFE4B5' }); // window R
    back.push({ x: 188 * s, y: 340 * s, w: 7 * s, h: 7 * s, color: '#FFE4B5' }); // window L row 2
    back.push({ x: 207 * s, y: 340 * s, w: 7 * s, h: 7 * s, color: '#FFE4B5' }); // window R row 2
    back.push({ x: 196 * s, y: 350 * s, w: 10 * s, h: 20 * s, color: '#6B3410' }); // door
    // Chimney
    back.push({ x: 210 * s, y: 298 * s, w: 6 * s, h: 10 * s, color: '#8B6045' });
    back.push({ x: 209 * s, y: 296 * s, w: 8 * s, h: 3 * s, color: '#6B4030' });

    // House F — Wide building near lighthouse (x=224-298)
    back.push({ x: 226 * s, y: 320 * s, w: 72 * s, h: 50 * s, color: '#B8956A' }); // wall
    back.push({ x: 224 * s, y: 314 * s, w: 76 * s, h: 8 * s, color: '#7A3B10' }); // roof
    back.push({ x: 228 * s, y: 314 * s, w: 68 * s, h: 2 * s, color: '#8B4B20' }); // highlight
    back.push({ x: 234 * s, y: 328 * s, w: 7 * s, h: 7 * s, color: '#FFE4B5' }); // window 1
    back.push({ x: 254 * s, y: 328 * s, w: 7 * s, h: 7 * s, color: '#FFE4B5' }); // window 2
    back.push({ x: 274 * s, y: 328 * s, w: 7 * s, h: 7 * s, color: '#FFE4B5' }); // window 3
    back.push({ x: 260 * s, y: 344 * s, w: 14 * s, h: 26 * s, color: '#5A3E26' }); // door
    back.push({ x: 280 * s, y: 344 * s, w: 14 * s, h: 26 * s, color: '#5A3E26' }); // door 2
    // Chimney
    back.push({ x: 290 * s, y: 306 * s, w: 6 * s, h: 10 * s, color: '#7A4A30' });
    back.push({ x: 289 * s, y: 304 * s, w: 8 * s, h: 3 * s, color: '#5A3A20' });

    // ── Row 3: Background rooftops peeking above bottom edge (y=370-400) ──
    // These create depth — just roofs and upper walls visible
    back.push({ x: 4 * s, y: 374 * s, w: 40 * s, h: 26 * s, color: '#C0A080' }); // wall peek
    back.push({ x: 2 * s, y: 370 * s, w: 44 * s, h: 6 * s, color: '#6B3020' }); // roof
    back.push({ x: 50 * s, y: 378 * s, w: 35 * s, h: 22 * s, color: '#B8A080' });
    back.push({ x: 48 * s, y: 374 * s, w: 39 * s, h: 6 * s, color: '#2E5090' }); // blue roof
    back.push({ x: 92 * s, y: 376 * s, w: 38 * s, h: 24 * s, color: '#D0B090' });
    back.push({ x: 90 * s, y: 372 * s, w: 42 * s, h: 6 * s, color: '#8B4513' }); // brown roof
    back.push({ x: 136 * s, y: 380 * s, w: 32 * s, h: 20 * s, color: '#C8B898' });
    back.push({ x: 134 * s, y: 376 * s, w: 36 * s, h: 6 * s, color: '#CC2222' }); // red roof
    back.push({ x: 174 * s, y: 378 * s, w: 36 * s, h: 22 * s, color: '#D4B894' });
    back.push({ x: 172 * s, y: 374 * s, w: 40 * s, h: 6 * s, color: '#2D5016' }); // green roof
    back.push({ x: 216 * s, y: 376 * s, w: 42 * s, h: 24 * s, color: '#C0A878' });
    back.push({ x: 214 * s, y: 372 * s, w: 46 * s, h: 6 * s, color: '#7A3B10' }); // brown roof
    back.push({ x: 264 * s, y: 380 * s, w: 36 * s, h: 20 * s, color: '#B8A070' });
    back.push({ x: 262 * s, y: 376 * s, w: 38 * s, h: 6 * s, color: '#8B2500' }); // dark red roof
    // Row 3 chimneys
    back.push({ x: 30 * s, y: 364 * s, w: 5 * s, h: 8 * s, color: '#6B4A30' });
    back.push({ x: 110 * s, y: 366 * s, w: 5 * s, h: 8 * s, color: '#7A4A30' });
    back.push({ x: 196 * s, y: 368 * s, w: 5 * s, h: 8 * s, color: '#6B4A30' });
    back.push({ x: 280 * s, y: 370 * s, w: 5 * s, h: 8 * s, color: '#7A4A30' });
    // Row 3 windows (warm glow)
    back.push({ x: 14 * s, y: 380 * s, w: 5 * s, h: 5 * s, color: '#FFE4B5' });
    back.push({ x: 60 * s, y: 384 * s, w: 5 * s, h: 5 * s, color: '#FFE4B5' });
    back.push({ x: 104 * s, y: 382 * s, w: 5 * s, h: 5 * s, color: '#FFE4B5' });
    back.push({ x: 148 * s, y: 386 * s, w: 5 * s, h: 5 * s, color: '#FFE4B5' });
    back.push({ x: 188 * s, y: 384 * s, w: 5 * s, h: 5 * s, color: '#FFE4B5' });
    back.push({ x: 236 * s, y: 382 * s, w: 5 * s, h: 5 * s, color: '#FFE4B5' });
    back.push({ x: 276 * s, y: 386 * s, w: 5 * s, h: 5 * s, color: '#FFE4B5' });

    // ── Pier / boardwalk (center, extends over water) ──
    // Support posts (back layer — behind boats)
    const pierLeft = 95 * s;
    const pierRight = 205 * s;
    for (const px of [100 * s, 148 * s, 195 * s]) {
      back.push({ x: px, y: 266 * s, w: 5 * s, h: 18 * s, color: '#6B3410' });
      back.push({ x: px - 1, y: 264 * s, w: 7 * s, h: 3 * s, color: '#4A2E16' }); // post cap
    }
    // Planks (front layer — over boats)
    for (let i = 0; i < 3; i++) {
      const py = (260 + i * 4) * s;
      const darker = i === 1;
      front.push({ x: pierLeft, y: py, w: pierRight - pierLeft, h: 3 * s, color: darker ? '#7A3B10' : '#8B4513' });
      front.push({ x: pierLeft + 2 * s, y: py, w: pierRight - pierLeft - 4 * s, h: 1, color: '#A0522D' });
    }
    // Railings
    front.push({ x: pierLeft, y: 256 * s, w: 3 * s, h: 16 * s, color: '#6B3410' });
    front.push({ x: pierRight - 3 * s, y: 256 * s, w: 3 * s, h: 16 * s, color: '#6B3410' });
    front.push({ x: pierLeft, y: 256 * s, w: pierRight - pierLeft, h: 2 * s, color: '#8B4513' });

    // ── Fish market (left side, x=10-70) ──
    // Back wall + posts (back layer)
    back.push({ x: 14 * s, y: 272 * s, w: 52 * s, h: 40 * s, color: '#D2691E' }); // back wall
    back.push({ x: 14 * s, y: 272 * s, w: 52 * s, h: 2 * s, color: '#8B4513' }); // wall shadow
    back.push({ x: 16 * s, y: 274 * s, w: 48 * s, h: 2 * s, color: '#CD853F' }); // wall highlight
    back.push({ x: 12 * s, y: 264 * s, w: 4 * s, h: 48 * s, color: '#6B3410' }); // left post
    back.push({ x: 64 * s, y: 264 * s, w: 4 * s, h: 48 * s, color: '#6B3410' }); // right post
    back.push({ x: 16 * s, y: 304 * s, w: 48 * s, h: 8 * s, color: '#A09080' }); // floor
    // Awning (front layer — colorful stripes)
    front.push({ x: 10 * s, y: 262 * s, w: 60 * s, h: 4 * s, color: '#E74C3C' }); // red stripe
    front.push({ x: 10 * s, y: 266 * s, w: 60 * s, h: 4 * s, color: '#F4D03F' }); // yellow stripe
    front.push({ x: 10 * s, y: 270 * s, w: 58 * s, h: 3 * s, color: '#E74C3C' }); // red stripe
    // Scallop fringe
    for (let i = 0; i < 5; i++) {
      front.push({ x: (12 + i * 12) * s, y: 273 * s, w: 8 * s, h: 2 * s, color: i % 2 === 0 ? '#E74C3C' : '#F4D03F' });
    }
    // Counter + fish display
    front.push({ x: 14 * s, y: 290 * s, w: 52 * s, h: 4 * s, color: '#A0522D' }); // counter
    front.push({ x: 14 * s, y: 290 * s, w: 52 * s, h: 1, color: '#B8733D' }); // highlight
    // Fish on counter
    front.push({ x: 18 * s, y: 286 * s, w: 6 * s, h: 4 * s, color: '#60A5FA' });
    front.push({ x: 28 * s, y: 287 * s, w: 5 * s, h: 3 * s, color: '#34D399' });
    front.push({ x: 38 * s, y: 286 * s, w: 6 * s, h: 4 * s, color: '#F59E0B' });
    front.push({ x: 48 * s, y: 287 * s, w: 5 * s, h: 3 * s, color: '#FF6B6B' });
    // Price sign
    front.push({ x: 56 * s, y: 276 * s, w: 10 * s, h: 8 * s, color: '#FEFCE8' });
    front.push({ x: 57 * s, y: 278 * s, w: 8 * s, h: 1, color: '#92400E' });
    front.push({ x: 57 * s, y: 280 * s, w: 6 * s, h: 1, color: '#92400E' });

    // ── Storage shed (center, x=118-172, near barrel deposit) ──
    // Back wall + roof (back layer)
    back.push({ x: 118 * s, y: 276 * s, w: 54 * s, h: 32 * s, color: '#6B4226' }); // wall
    back.push({ x: 115 * s, y: 270 * s, w: 60 * s, h: 8 * s, color: '#4A2E16' }); // roof
    back.push({ x: 115 * s, y: 270 * s, w: 60 * s, h: 2 * s, color: '#5A3E26' }); // roof highlight
    back.push({ x: 130 * s, y: 282 * s, w: 8 * s, h: 6 * s, color: '#1E6091' }); // window
    back.push({ x: 129 * s, y: 281 * s, w: 10 * s, h: 1, color: '#4A2E16' }); // frame top
    back.push({ x: 129 * s, y: 288 * s, w: 10 * s, h: 1, color: '#4A2E16' }); // frame bottom
    back.push({ x: 155 * s, y: 282 * s, w: 12 * s, h: 16 * s, color: '#5A3E26' }); // door
    back.push({ x: 160 * s, y: 282 * s, w: 1, h: 16 * s, color: '#4A2E16' }); // door crack
    // Crates, rope, net (front layer)
    front.push({ x: 108 * s, y: 300 * s, w: 10 * s, h: 10 * s, color: '#A0522D' }); // crate 1
    front.push({ x: 108 * s, y: 300 * s, w: 10 * s, h: 1, color: '#B8733D' }); // crate highlight
    front.push({ x: 112 * s, y: 302 * s, w: 1, h: 6 * s, color: '#6B3410' }); // slat
    front.push({ x: 109 * s, y: 292 * s, w: 8 * s, h: 8 * s, color: '#8B4513' }); // crate stacked
    front.push({ x: 109 * s, y: 292 * s, w: 8 * s, h: 1, color: '#A0522D' }); // highlight
    front.push({ x: 180 * s, y: 302 * s, w: 8 * s, h: 8 * s, color: '#8B4513' }); // crate right
    front.push({ x: 180 * s, y: 302 * s, w: 8 * s, h: 1, color: '#A0522D' }); // highlight
    front.push({ x: 186 * s, y: 306 * s, w: 6 * s, h: 4 * s, color: '#C4A36E' }); // rope coil
    front.push({ x: 188 * s, y: 307 * s, w: 2 * s, h: 2 * s, color: '#A08050' }); // rope center
    // Fishing net draped
    front.push({ x: 192 * s, y: 296 * s, w: 12 * s, h: 8 * s, color: '#8B7355' });
    front.push({ x: 194 * s, y: 298 * s, w: 1, h: 4 * s, color: '#6B5335' });
    front.push({ x: 198 * s, y: 297 * s, w: 1, h: 5 * s, color: '#6B5335' });
    front.push({ x: 202 * s, y: 298 * s, w: 1, h: 4 * s, color: '#6B5335' });

    // ── Lighthouse (right side, x=240-270) ──
    // Foundation + base (back layer)
    back.push({ x: 238 * s, y: 304 * s, w: 28 * s, h: 12 * s, color: '#808080' }); // foundation
    back.push({ x: 238 * s, y: 304 * s, w: 28 * s, h: 2 * s, color: '#999999' }); // top edge
    back.push({ x: 243 * s, y: 268 * s, w: 18 * s, h: 48 * s, color: '#F5F5F5' }); // base white
    // Tower stripes + lamp (front layer)
    const stripeColors = ['#F5F5F5', '#CC2222'];
    for (let i = 0; i < 8; i++) {
      const ty = (248 + i * 7) * s;
      const tw = i < 4 ? 14 * s : 18 * s;
      const tx = i < 4 ? 245 * s : 243 * s;
      front.push({ x: tx, y: ty, w: tw, h: 6 * s, color: stripeColors[i % 2] });
    }
    // Shadow on right edge
    front.push({ x: 259 * s, y: 250 * s, w: 2 * s, h: 54 * s, color: '#C0C0C0' });
    // Lamp room
    front.push({ x: 242 * s, y: 244 * s, w: 20 * s, h: 4 * s, color: '#4A4A4A' }); // platform
    front.push({ x: 247 * s, y: 236 * s, w: 10 * s, h: 8 * s, color: '#333333' }); // frame
    front.push({ x: 248 * s, y: 237 * s, w: 8 * s, h: 6 * s, color: '#FFD700' }); // lamp glow
    front.push({ x: 248 * s, y: 233 * s, w: 8 * s, h: 4 * s, color: '#CC2222' }); // dome
    front.push({ x: 250 * s, y: 230 * s, w: 4 * s, h: 3 * s, color: '#CC2222' }); // peak

    // ── Lamp post (between market and pier) ──
    front.push({ x: 80 * s, y: 274 * s, w: 3 * s, h: 30 * s, color: '#4A4A4A' }); // pole
    front.push({ x: 78 * s, y: 304 * s, w: 7 * s, h: 3 * s, color: '#333333' }); // base
    front.push({ x: 78 * s, y: 270 * s, w: 7 * s, h: 5 * s, color: '#333333' }); // housing
    front.push({ x: 79 * s, y: 271 * s, w: 5 * s, h: 3 * s, color: '#FFB347' }); // lamp

    // ── Extra decorative barrel ──
    front.push({ x: 72 * s, y: 304 * s, w: 8 * s, h: 10 * s, color: '#8B4513' });
    front.push({ x: 72 * s, y: 306 * s, w: 8 * s, h: 1, color: '#A0A0A0' }); // hoop
    front.push({ x: 72 * s, y: 311 * s, w: 8 * s, h: 1, color: '#A0A0A0' }); // hoop

    // --- Shift all harbor rects down by stretch ---
    const stretch = Math.max(0, height / scale - 400);
    const gs = stretch * scale;
    for (const r of this.harborBackRects) r.y += gs;
    for (const r of this.harborFrontRects) r.y += gs;

    // --- Underwater details (below mid-point, ~y 200+) ---
    const underwaterStartY = Math.floor(200 * scale);

    // Coral: 3-5 small colored rects
    const coralColors = ['#FF6B6B', '#FF8E53', '#FFA07A'];
    const coralCount = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < coralCount; i++) {
      const cx = 20 * scale + rng() * (width - 40 * scale);
      const cy = underwaterStartY + rng() * (height - underwaterStartY - 30 * scale);
      this.coralRects.push({
        x: cx,
        y: cy,
        w: (4 + rng() * 6) * scale,
        h: (3 + rng() * 5) * scale,
        color: coralColors[Math.floor(rng() * coralColors.length)],
      });
      // Small second piece next to it
      if (rng() > 0.4) {
        this.coralRects.push({
          x: cx + (3 + rng() * 4) * scale,
          y: cy + 2 * scale,
          w: (3 + rng() * 4) * scale,
          h: (2 + rng() * 3) * scale,
          color: coralColors[Math.floor(rng() * coralColors.length)],
        });
      }
    }

    // Seaweed: 4-6 thin green rects rising from bottom
    const seaweedCount = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < seaweedCount; i++) {
      const sx = 15 * scale + rng() * (width - 30 * scale);
      const sheight = (15 + rng() * 25) * scale;
      this.seaweedRects.push({
        x: sx,
        y: height - sheight - rng() * 20 * scale,
        w: 2 * scale,
        h: sheight,
        color: '#2E8B57',
      });
      // Slight branch
      if (rng() > 0.5) {
        this.seaweedRects.push({
          x: sx + (rng() > 0.5 ? 2 : -2) * scale,
          y: height - sheight * 0.6 - rng() * 15 * scale,
          w: 2 * scale,
          h: sheight * 0.4,
          color: '#2E8B57',
        });
      }
    }

    // Rocks: 3-4 small gray rects near bottom
    const rockCount = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < rockCount; i++) {
      this.rockRects.push({
        x: 10 * scale + rng() * (width - 20 * scale),
        y: height - (10 + rng() * 30) * scale,
        w: (5 + rng() * 8) * scale,
        h: (3 + rng() * 5) * scale,
        color: '#6B7280',
      });
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.width !== width || this.height !== height) {
      this.generate(width, height);
    }

    const scale = width / 300;

    // --- 1. Water gradient (full viewport) ---
    const waterGrad = ctx.createLinearGradient(0, 0, 0, height);
    waterGrad.addColorStop(0, '#1E6091');
    waterGrad.addColorStop(1, '#0C3547');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, 0, width, height);

    // --- 2. Water ripples (broken highlight segments for natural look) ---
    for (const rip of this.ripples) {
      ctx.globalAlpha = rip.alpha;
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(Math.floor(rip.x), Math.floor(rip.y), Math.floor(rip.w), 2);
    }
    ctx.globalAlpha = 1;

    // --- 3. Underwater details (rendered before island/dock so they appear behind) ---
    // Seaweed
    for (const sw of this.seaweedRects) {
      ctx.fillStyle = sw.color;
      ctx.fillRect(Math.floor(sw.x), Math.floor(sw.y), Math.floor(sw.w), Math.floor(sw.h));
    }

    // Rocks
    for (const rock of this.rockRects) {
      ctx.fillStyle = rock.color;
      ctx.fillRect(Math.floor(rock.x), Math.floor(rock.y), Math.floor(rock.w), Math.floor(rock.h));
    }

    // Coral
    for (const coral of this.coralRects) {
      ctx.fillStyle = coral.color;
      ctx.fillRect(Math.floor(coral.x), Math.floor(coral.y), Math.floor(coral.w), Math.floor(coral.h));
    }

    // --- 4. Island ---
    // Sand base
    for (const sand of this.sandRects) {
      ctx.fillStyle = sand.color;
      ctx.fillRect(Math.floor(sand.x), Math.floor(sand.y), Math.floor(sand.w), Math.floor(sand.h));
    }

    // Bushes
    for (const bush of this.bushes) {
      ctx.fillStyle = bush.color;
      ctx.fillRect(Math.floor(bush.x), Math.floor(bush.y), Math.floor(bush.w), Math.floor(bush.h));
    }

    // Palm trees: trunks first, then fronds on top
    for (const palm of this.palmTrees) {
      for (const seg of palm.trunk) {
        ctx.fillStyle = seg.color;
        ctx.fillRect(Math.floor(seg.x), Math.floor(seg.y), Math.floor(seg.w), Math.floor(seg.h));
      }
    }
    for (const palm of this.palmTrees) {
      for (const frond of palm.fronds) {
        ctx.fillStyle = frond.color;
        ctx.fillRect(Math.floor(frond.x), Math.floor(frond.y), Math.floor(frond.w), Math.floor(frond.h));
      }
    }

    // --- 5. Harbor back layer (ground, building walls, pier posts — behind boats) ---
    for (const r of this.harborBackRects) {
      ctx.fillStyle = r.color;
      ctx.fillRect(Math.floor(r.x), Math.floor(r.y), Math.floor(r.w), Math.floor(r.h));
    }
  }

  /** Render harbor front layer — called after characters so buildings/pier are on top of boats. */
  renderDockSurface(ctx: CanvasRenderingContext2D): void {
    for (const r of this.harborFrontRects) {
      ctx.fillStyle = r.color;
      ctx.fillRect(Math.floor(r.x), Math.floor(r.y), Math.floor(r.w), Math.floor(r.h));
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
