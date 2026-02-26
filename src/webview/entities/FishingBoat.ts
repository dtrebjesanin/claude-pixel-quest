import { Goblin } from './Goblin';
import { GoblinState } from './GoblinStateMachine';

const SIZE = 32;

// ── Hull palette (default) ──
const HULL_MAIN = '#8B4513';      // Saddle brown
const HULL_DARK = '#6B3410';      // Dark brown keel
const HULL_HIGHLIGHT = '#A0522D'; // Sienna highlight
const HULL_STRIPE = '#B22222';    // Red stripe
const HULL_GUNWALE = '#D2B48C';   // Tan gunwale

// ── Hull palette (boss) ──
const BOSS_HULL = '#1E3A5F';       // Navy blue
const BOSS_HULL_DARK = '#142B4A';  // Dark navy keel
const BOSS_TRIM = '#FFD700';       // Gold trim

// ── Mast & sail ──
const MAST_WOOD = '#6B4226';
const SAIL_COLOR = '#F5F5DC';      // Beige
const BOSS_SAIL = '#F0E68C';       // Golden sail
const FLAG_RED = '#EF4444';
const FLAG_GOLD = '#FFD700';

// ── Fishing rod ──
const ROD_HANDLE = '#6B4226';
const ROD_LINE = '#C0C0C0';
const BOBBER_RED = '#EF4444';
const BOBBER_WHITE = '#FFFFFF';

// ── Net / fish ──
const NET_ROPE = '#8B7355';
const FISH_BLUE = '#60A5FA';
const FISH_GREEN = '#34D399';

// ── Scroll (research state) ──
const SCROLL_BODY = '#fef3c7';
const SCROLL_EDGE = '#d97706';
const SCROLL_TEXT = '#92400e';

// ── Anchor ──
const ANCHOR_COLOR = '#6B7280';

// ── Labels ──
const LABEL_BG = 'rgba(0,0,0,0.75)';
const LABEL_TEXT = '#e2e8f0';
const NAME_BG = 'rgba(0,0,0,0.55)';
const NAME_TEXT = '#94a3b8';

export class FishingBoat extends Goblin {

  renderShadow(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    // Water reflection — dark semi-transparent oval below boat
    const shadowX = Math.floor(this.x * s + 2 * s);
    const shadowY = Math.floor(this.y * s + 14 * s);
    const shadowW = 28 * s;
    const shadowH = 8 * s;

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#1a3a5c';
    ctx.fillRect(shadowX, shadowY, shadowW, shadowH);
    // Softer edge
    ctx.globalAlpha = 0.15;
    ctx.fillRect(shadowX - 1 * s, shadowY + shadowH, shadowW + 2 * s, 2 * s);
    ctx.globalAlpha = 1;
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const state = this.stateMachine.getState();
    const isFishing = state === 'MINING';

    ctx.save();

    const centerX = this.x * s + SIZE * s / 2;
    if (!this.facingRight) {
      ctx.translate(centerX, 0);
      ctx.scale(-1, 1);
      ctx.translate(-centerX, 0);
    }

    const px = Math.floor(this.x * s);
    const py = Math.floor(this.y * s);

    // Boat bob (sine wave) — applies to IDLE, WALKING, CELEBRATING
    const time = Date.now() / 1000;
    const idleBob = (state === 'IDLE' || state === 'SLEEPING')
      ? Math.sin(time * 2) * 2 * s
      : 0;
    const sailBob = state === 'WALKING'
      ? Math.sin(this.animFrame * Math.PI / 2) * 3 * s
      : 0;
    const celebrateX = state === 'CELEBRATING'
      ? Math.sin(this.animFrame * Math.PI / 2) * 4 * s
      : 0;
    const celebrateY = state === 'CELEBRATING'
      ? Math.cos(this.animFrame * Math.PI / 2) * 3 * s
      : 0;
    const fishShake = isFishing
      ? (this.animFrame % 2 === 0 ? 1 : -1) * s
      : 0;

    const drawY = py - idleBob - sailBob - celebrateY;
    const drawX = px + fishShake + celebrateX;

    const isBoss = this.variant === 'boss';

    // ═══════════════════════════════════════════
    // HULL — ~24x12px boat shape
    // ═══════════════════════════════════════════

    // Main hull body (wider at top, narrower at keel)
    const hullMain = isBoss ? BOSS_HULL : HULL_MAIN;
    const hullDark = isBoss ? BOSS_HULL_DARK : HULL_DARK;

    // Top row (widest — gunwale level)
    ctx.fillStyle = isBoss ? BOSS_TRIM : HULL_GUNWALE;
    ctx.fillRect(Math.floor(drawX + 3 * s), Math.floor(drawY + 2 * s), Math.floor(26 * s), Math.floor(2 * s));

    // Upper hull
    ctx.fillStyle = hullMain;
    ctx.fillRect(Math.floor(drawX + 4 * s), Math.floor(drawY + 4 * s), Math.floor(24 * s), Math.floor(4 * s));

    // Hull highlight stripe
    ctx.fillStyle = isBoss ? BOSS_TRIM : HULL_STRIPE;
    ctx.fillRect(Math.floor(drawX + 4 * s), Math.floor(drawY + 5 * s), Math.floor(24 * s), Math.floor(1 * s));

    // Mid hull (slightly narrower)
    ctx.fillStyle = isBoss ? BOSS_HULL : HULL_HIGHLIGHT;
    ctx.fillRect(Math.floor(drawX + 5 * s), Math.floor(drawY + 8 * s), Math.floor(22 * s), Math.floor(3 * s));

    // Keel / bottom (narrowest)
    ctx.fillStyle = hullDark;
    ctx.fillRect(Math.floor(drawX + 7 * s), Math.floor(drawY + 11 * s), Math.floor(18 * s), Math.floor(2 * s));
    // Keel point
    ctx.fillRect(Math.floor(drawX + 9 * s), Math.floor(drawY + 13 * s), Math.floor(14 * s), Math.floor(1 * s));

    // Bow (front, right side) — pointed
    ctx.fillStyle = hullMain;
    ctx.fillRect(Math.floor(drawX + 28 * s), Math.floor(drawY + 3 * s), Math.floor(3 * s), Math.floor(4 * s));
    ctx.fillRect(Math.floor(drawX + 30 * s), Math.floor(drawY + 4 * s), Math.floor(2 * s), Math.floor(3 * s));

    // Stern (back, left side) — slightly raised
    ctx.fillStyle = hullDark;
    ctx.fillRect(Math.floor(drawX + 2 * s), Math.floor(drawY + 1 * s), Math.floor(3 * s), Math.floor(5 * s));
    ctx.fillStyle = isBoss ? BOSS_TRIM : HULL_GUNWALE;
    ctx.fillRect(Math.floor(drawX + 2 * s), Math.floor(drawY + 1 * s), Math.floor(3 * s), Math.floor(2 * s));

    // Boss: gold trim line along hull sides
    if (isBoss) {
      ctx.fillStyle = BOSS_TRIM;
      ctx.fillRect(Math.floor(drawX + 4 * s), Math.floor(drawY + 4 * s), Math.floor(24 * s), Math.floor(1 * s));
      ctx.fillRect(Math.floor(drawX + 5 * s), Math.floor(drawY + 10 * s), Math.floor(22 * s), Math.floor(1 * s));
    }

    // ═══════════════════════════════════════════
    // MAST + SAIL
    // ═══════════════════════════════════════════

    if (state !== 'SLEEPING') {
      // Mast — vertical pole from center of hull
      const mastX = Math.floor(drawX + 15 * s);
      ctx.fillStyle = MAST_WOOD;
      ctx.fillRect(mastX, Math.floor(drawY - 16 * s), Math.floor(2 * s), Math.floor(19 * s));

      // Sail — triangular shape approximated with stacked rects
      const sailColor = isBoss ? BOSS_SAIL : SAIL_COLOR;
      ctx.fillStyle = sailColor;
      // Wider at bottom, narrower at top
      ctx.fillRect(Math.floor(drawX + 17 * s), Math.floor(drawY - 14 * s), Math.floor(2 * s), Math.floor(2 * s));
      ctx.fillRect(Math.floor(drawX + 17 * s), Math.floor(drawY - 12 * s), Math.floor(4 * s), Math.floor(2 * s));
      ctx.fillRect(Math.floor(drawX + 17 * s), Math.floor(drawY - 10 * s), Math.floor(6 * s), Math.floor(2 * s));
      ctx.fillRect(Math.floor(drawX + 17 * s), Math.floor(drawY - 8 * s), Math.floor(8 * s), Math.floor(2 * s));
      ctx.fillRect(Math.floor(drawX + 17 * s), Math.floor(drawY - 6 * s), Math.floor(10 * s), Math.floor(2 * s));
      ctx.fillRect(Math.floor(drawX + 17 * s), Math.floor(drawY - 4 * s), Math.floor(11 * s), Math.floor(2 * s));

      // Sail shadow/crease
      ctx.fillStyle = isBoss ? '#D4C86A' : '#E8E4C8';
      ctx.fillRect(Math.floor(drawX + 21 * s), Math.floor(drawY - 10 * s), Math.floor(1 * s), Math.floor(8 * s));

      // Flag at top of mast
      const flagColor = isBoss ? FLAG_GOLD : FLAG_RED;
      ctx.fillStyle = flagColor;
      ctx.fillRect(Math.floor(drawX + 17 * s), Math.floor(drawY - 18 * s), Math.floor(4 * s), Math.floor(3 * s));
      ctx.fillRect(Math.floor(drawX + 17 * s), Math.floor(drawY - 16 * s), Math.floor(3 * s), Math.floor(2 * s));
    }

    // ═══════════════════════════════════════════
    // STATE-SPECIFIC DETAILS
    // ═══════════════════════════════════════════

    this.renderTools(ctx, state, drawX, drawY, s);

    ctx.restore();

    // ═══════════════════════════════════════════
    // ACTION LABEL above boat (never flipped)
    // ═══════════════════════════════════════════
    if (this.actionLabel) {
      const labelX = Math.floor(this.x * s + SIZE * s / 2);
      const labelY = Math.floor(this.y * s - 22 * s);
      const fontSize = Math.max(9, Math.floor(10 * s));
      ctx.font = `bold ${fontSize}px monospace`;
      const tw = ctx.measureText(this.actionLabel).width;
      const pad = 3 * s;

      ctx.fillStyle = LABEL_BG;
      ctx.fillRect(labelX - tw / 2 - pad, labelY - fontSize - pad, tw + pad * 2, fontSize + pad * 2);
      ctx.fillStyle = LABEL_TEXT;
      ctx.textAlign = 'center';
      ctx.fillText(this.actionLabel, labelX, labelY);
      ctx.textAlign = 'start';
    }

    // ═══════════════════════════════════════════
    // NAME LABEL below boat (never flipped)
    // ═══════════════════════════════════════════
    if (this.nameLabel) {
      const nameX = Math.floor(this.x * s + SIZE * s / 2);
      const nameY = Math.floor(this.y * s + 18 * s);
      const fontSize = Math.max(8, Math.floor(9 * s));
      ctx.font = `${fontSize}px monospace`;
      const tw = ctx.measureText(this.nameLabel).width;
      const pad = 2 * s;

      ctx.fillStyle = NAME_BG;
      ctx.fillRect(nameX - tw / 2 - pad, nameY - pad, tw + pad * 2, fontSize + pad * 2);
      ctx.fillStyle = NAME_TEXT;
      ctx.textAlign = 'center';
      ctx.fillText(this.nameLabel, nameX, nameY + fontSize);
      ctx.textAlign = 'start';

      // Role label below name
      if (this.roleLabel) {
        const roleY = nameY + fontSize + pad * 2 + 2 * s;
        const roleFontSize = Math.max(7, Math.floor(8 * s));
        ctx.font = `${roleFontSize}px monospace`;
        const rw = ctx.measureText(this.roleLabel).width;
        const rPad = 2 * s;

        ctx.fillStyle = NAME_BG;
        ctx.fillRect(nameX - rw / 2 - rPad, roleY - rPad, rw + rPad * 2, roleFontSize + rPad * 2);
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText(this.roleLabel, nameX, roleY + roleFontSize);
        ctx.textAlign = 'start';
      }
    }
  }

  protected renderTools(
    ctx: CanvasRenderingContext2D,
    state: GoblinState,
    drawX: number,
    drawY: number,
    s: number,
  ): void {
    // ── FISHING ROD (MINING = fishing) ──
    if (state === 'MINING') {
      const swingAngle = Math.sin(this.animFrame * Math.PI / 2) * 0.5;
      ctx.save();
      ctx.translate(Math.floor(drawX + 26 * s), Math.floor(drawY + 2 * s));
      ctx.rotate(swingAngle);

      // Rod handle
      ctx.fillStyle = ROD_HANDLE;
      ctx.fillRect(Math.floor(0), Math.floor(0), Math.floor(2 * s), Math.floor(5 * s));

      // Rod shaft extending up and outward
      ctx.fillRect(Math.floor(0), Math.floor(-14 * s), Math.floor(2 * s), Math.floor(16 * s));

      // Rod tip
      ctx.fillStyle = '#9CA3AF';
      ctx.fillRect(Math.floor(0), Math.floor(-18 * s), Math.floor(2 * s), Math.floor(5 * s));

      // Fishing line dropping down from tip
      ctx.fillStyle = ROD_LINE;
      const lineSwing = Math.sin(this.animFrame * Math.PI / 2) * 2;
      ctx.fillRect(Math.floor((1 + lineSwing) * s), Math.floor(-18 * s), Math.floor(1 * s), Math.floor(4 * s));
      ctx.fillRect(Math.floor((2 + lineSwing) * s), Math.floor(-15 * s), Math.floor(1 * s), Math.floor(5 * s));
      ctx.fillRect(Math.floor((3 + lineSwing) * s), Math.floor(-11 * s), Math.floor(1 * s), Math.floor(6 * s));
      ctx.fillRect(Math.floor((3 + lineSwing) * s), Math.floor(-6 * s), Math.floor(1 * s), Math.floor(8 * s));

      // Bobber at end of line
      const bobberBob = Math.sin(this.animFrame * Math.PI / 2) * 2;
      const bobberX = Math.floor((3 + lineSwing) * s);
      const bobberY = Math.floor((2 + bobberBob) * s);
      ctx.fillStyle = BOBBER_RED;
      ctx.fillRect(bobberX - Math.floor(2 * s), bobberY, Math.floor(4 * s), Math.floor(3 * s));
      ctx.fillStyle = BOBBER_WHITE;
      ctx.fillRect(bobberX - Math.floor(2 * s), bobberY + Math.floor(3 * s), Math.floor(4 * s), Math.floor(2 * s));

      ctx.restore();
      return;
    }

    // ── NET OF FISH (CART state — hauling catch) ──
    if (state === 'CART' || (this.showCart && state === 'WALKING')) {
      const netBob = state === 'WALKING' ? Math.sin(this.animFrame * Math.PI / 2) * 1 * s : 0;
      const netX = Math.floor(drawX + 8 * s);
      const netY = Math.floor(drawY - 2 * s + netBob);

      // Net mesh (rope color)
      ctx.fillStyle = NET_ROPE;
      ctx.fillRect(netX, netY, Math.floor(16 * s), Math.floor(2 * s));
      ctx.fillRect(netX + Math.floor(1 * s), netY + Math.floor(2 * s), Math.floor(14 * s), Math.floor(1 * s));
      // Net cross-hatch lines
      ctx.fillRect(netX + Math.floor(4 * s), netY - Math.floor(2 * s), Math.floor(1 * s), Math.floor(4 * s));
      ctx.fillRect(netX + Math.floor(8 * s), netY - Math.floor(2 * s), Math.floor(1 * s), Math.floor(4 * s));
      ctx.fillRect(netX + Math.floor(12 * s), netY - Math.floor(2 * s), Math.floor(1 * s), Math.floor(4 * s));

      // Fish in net — blue fish
      ctx.fillStyle = FISH_BLUE;
      ctx.fillRect(netX + Math.floor(2 * s), netY - Math.floor(4 * s), Math.floor(5 * s), Math.floor(3 * s));
      // Blue fish tail
      ctx.fillRect(netX + Math.floor(1 * s), netY - Math.floor(5 * s), Math.floor(2 * s), Math.floor(2 * s));

      // Green fish
      ctx.fillStyle = FISH_GREEN;
      ctx.fillRect(netX + Math.floor(9 * s), netY - Math.floor(3 * s), Math.floor(4 * s), Math.floor(3 * s));
      // Green fish tail
      ctx.fillRect(netX + Math.floor(8 * s), netY - Math.floor(4 * s), Math.floor(2 * s), Math.floor(2 * s));

      // Third fish peeking (orange)
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(netX + Math.floor(6 * s), netY - Math.floor(5 * s), Math.floor(3 * s), Math.floor(2 * s));
      return;
    }

    // ── SCROLL (research / showScroll state) ──
    if (this.showScroll && (state === 'IDLE' || state === 'WALKING')) {
      const scrollBob = state === 'WALKING' ? Math.sin(this.animFrame * Math.PI) * 1 * s : 0;
      const scrollX = Math.floor(drawX + 10 * s);
      const scrollY = Math.floor(drawY - 6 * s + scrollBob);

      // Scroll body
      ctx.fillStyle = SCROLL_BODY;
      ctx.fillRect(scrollX, scrollY, Math.floor(12 * s), Math.floor(8 * s));
      // Top and bottom rolls
      ctx.fillStyle = SCROLL_EDGE;
      ctx.fillRect(scrollX - Math.floor(1 * s), scrollY - Math.floor(1 * s), Math.floor(14 * s), Math.floor(2 * s));
      ctx.fillRect(scrollX - Math.floor(1 * s), scrollY + Math.floor(7 * s), Math.floor(14 * s), Math.floor(2 * s));
      // Text lines
      ctx.fillStyle = SCROLL_TEXT;
      ctx.fillRect(scrollX + Math.floor(2 * s), scrollY + Math.floor(2 * s), Math.floor(8 * s), Math.floor(1 * s));
      ctx.fillRect(scrollX + Math.floor(2 * s), scrollY + Math.floor(4 * s), Math.floor(6 * s), Math.floor(1 * s));
    }

    // ── SLEEPING: Anchor icon ──
    if (state === 'SLEEPING') {
      const anchorX = Math.floor(drawX + 13 * s);
      const anchorY = Math.floor(drawY - 8 * s);

      // Anchor shaft
      ctx.fillStyle = ANCHOR_COLOR;
      ctx.fillRect(anchorX + Math.floor(2 * s), anchorY, Math.floor(2 * s), Math.floor(8 * s));
      // Anchor ring (top)
      ctx.fillRect(anchorX + Math.floor(1 * s), anchorY - Math.floor(2 * s), Math.floor(4 * s), Math.floor(2 * s));
      ctx.fillRect(anchorX, anchorY - Math.floor(3 * s), Math.floor(6 * s), Math.floor(1 * s));
      // Anchor flukes (bottom arms)
      ctx.fillRect(anchorX - Math.floor(1 * s), anchorY + Math.floor(6 * s), Math.floor(8 * s), Math.floor(2 * s));
      ctx.fillRect(anchorX - Math.floor(2 * s), anchorY + Math.floor(5 * s), Math.floor(2 * s), Math.floor(2 * s));
      ctx.fillRect(anchorX + Math.floor(6 * s), anchorY + Math.floor(5 * s), Math.floor(2 * s), Math.floor(2 * s));
    }
  }
}
