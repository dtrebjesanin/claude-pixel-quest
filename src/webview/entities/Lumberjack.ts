import { Goblin } from './Goblin';
import { GoblinState } from './GoblinStateMachine';

const SIZE = 32;

// Lumberjack palette — human skin tones
const SKIN = '#DEB887';        // light tanned
const SKIN_MID = '#C4956A';    // mid tone
const SKIN_SHADOW = '#A0724E'; // shadow
const SKIN_EFFORT = '#E8A07A'; // flushed when mining

// Clothing
const PLAID_RED = '#C62828';
const PLAID_RED_DARK = '#8E0000';
const PLAID_BLACK = '#212121';
const PLAID_STRIPE = '#1B1B1B';
const DENIM = '#1A3A5C';
const DENIM_DARK = '#0F2640';
const DENIM_SEAM = '#234B72';
const BOOT_COLOR = '#3E2723';
const BOOT_DARK = '#2B1B17';

// Nightcap palette — blue & white striped
const CAP_BLUE = '#3b82f6';       // Blue stripe
const CAP_BLUE_DARK = '#2563eb';  // Blue shadow
const CAP_WHITE = '#e2e8f0';      // White stripe
const CAP_POM = '#ffffff';        // White pom-pom

// Pillow palette — white/soft
const PILLOW_MAIN = '#f1f5f9';    // Light gray-white
const PILLOW_LIGHT = '#ffffff';   // Highlight
const PILLOW_SHADOW = '#cbd5e1';  // Shadow fold

// Beard
const BEARD = '#5D4037';
const BEARD_DARK = '#3E2723';

// Beanie / toque
const BEANIE_RED = '#C62828';
const BEANIE_BLACK = '#212121';
const BEANIE_FOLD = '#8E0000';

// Boss — foreman hard hat
const HARDHAT_BODY = '#FDD835';
const HARDHAT_DARK = '#F9A825';
const HARDHAT_LIGHT = '#FFF9C4';
const SUSPENDER_COLOR = '#D84315';
const SUSPENDER_DARK = '#BF360C';

// Eyes
const EYE_WHITE = '#fff';
const EYE_PUPIL = '#1a1a2e';

// Tools
const TOOL_HANDLE = '#6D4C41';
const TOOL_HANDLE_DARK = '#4E342E';
const AXE_HEAD = '#78909C';
const AXE_SHINE = '#B0BEC5';
const AXE_EDGE = '#546E7A';

// Wheelbarrow / logs
const WHEELBARROW_BODY = '#6D4C41';
const WHEELBARROW_DARK = '#4E342E';
const WHEELBARROW_RIM = '#5D4037';
const LOG_LIGHT = '#D7CCC8';
const LOG_MID = '#A1887F';
const LOG_DARK = '#795548';
const LOG_RING = '#6D4C41';

// Scroll (reused from Goblin)
const SCROLL_BODY = '#fef3c7';
const SCROLL_EDGE = '#d97706';
const SCROLL_TEXT = '#92400e';

// Labels (reused from Goblin)
const LABEL_BG = 'rgba(0,0,0,0.75)';
const LABEL_TEXT = '#e2e8f0';
const NAME_BG = 'rgba(0,0,0,0.55)';
const NAME_TEXT = '#94a3b8';

export class Lumberjack extends Goblin {

  renderShadow(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const shadowX = Math.floor(this.x * s + 4 * s);
    const shadowY = Math.floor(this.y * s + 28 * s);
    const shadowW = 24 * s;
    const shadowH = 6 * s;

    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.fillRect(shadowX, shadowY, shadowW, shadowH);
    ctx.fillRect(shadowX + 2 * s, shadowY + shadowH, (shadowW - 4 * s), 2 * s);
    ctx.globalAlpha = 1;
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const state = this.stateMachine.getState();
    const isMining = state === 'MINING';
    const isBoss = this.variant === 'boss';

    if (state === 'SLEEPING') {
      this.renderSleeping(ctx, scale);
      return;
    }

    ctx.save();

    // Handle facing direction via horizontal flip
    const centerX = this.x * s + SIZE * s / 2;
    if (!this.facingRight) {
      ctx.translate(centerX, 0);
      ctx.scale(-1, 1);
      ctx.translate(-centerX, 0);
    }

    const px = Math.floor(this.x * s);
    const py = Math.floor(this.y * s);

    const bounce = state === 'WALKING' ? Math.sin(this.animFrame * Math.PI / 2) * 3 * s : 0;
    const jump = state === 'CELEBRATING' ? Math.abs(Math.sin(this.animFrame * Math.PI / 2)) * 8 * s : 0;
    const shake = isMining ? (this.animFrame % 2 === 0 ? 4 : -4) * s : 0;
    const drawY = py - bounce - jump;
    const drawX = px + shake;

    // Skin color changes when mining (effort flush)
    const skinColor = isMining ? SKIN_EFFORT : SKIN;
    const skinMid = isMining ? '#D4907A' : SKIN_MID;
    const skinShad = isMining ? '#B87A64' : SKIN_SHADOW;

    // =========================================================
    // BOOTS (drawn first, behind pants)
    // =========================================================
    const footAnim = state === 'WALKING' ? (this.animFrame % 2 === 0 ? 2 : -2) * s : 0;
    ctx.fillStyle = BOOT_COLOR;
    ctx.fillRect(drawX + 6 * s, drawY + 26 * s + footAnim, 8 * s, 5 * s);
    ctx.fillRect(drawX + 18 * s, drawY + 26 * s - footAnim, 8 * s, 5 * s);
    // Boot soles
    ctx.fillStyle = BOOT_DARK;
    ctx.fillRect(drawX + 5 * s, drawY + 30 * s + footAnim, 10 * s, 2 * s);
    ctx.fillRect(drawX + 17 * s, drawY + 30 * s - footAnim, 10 * s, 2 * s);
    // Boot tops / laces
    ctx.fillStyle = '#4E342E';
    ctx.fillRect(drawX + 7 * s, drawY + 26 * s + footAnim, 6 * s, 1 * s);
    ctx.fillRect(drawX + 19 * s, drawY + 26 * s - footAnim, 6 * s, 1 * s);

    // =========================================================
    // PANTS — dark denim jeans
    // =========================================================
    ctx.fillStyle = DENIM;
    ctx.fillRect(drawX + 6 * s, drawY + 20 * s, 20 * s, 8 * s);
    // Seam down the middle
    ctx.fillStyle = DENIM_SEAM;
    ctx.fillRect(drawX + 15 * s, drawY + 20 * s, 2 * s, 8 * s);
    // Darker crotch/shadow area
    ctx.fillStyle = DENIM_DARK;
    ctx.fillRect(drawX + 6 * s, drawY + 25 * s, 20 * s, 3 * s);

    // =========================================================
    // TORSO — red/black plaid flannel shirt
    // =========================================================
    // Base red
    ctx.fillStyle = PLAID_RED;
    ctx.fillRect(drawX + 6 * s, drawY + 10 * s, 20 * s, 12 * s);

    // Plaid pattern — horizontal black stripes
    ctx.fillStyle = PLAID_BLACK;
    ctx.fillRect(drawX + 6 * s, drawY + 12 * s, 20 * s, 2 * s);
    ctx.fillRect(drawX + 6 * s, drawY + 17 * s, 20 * s, 2 * s);

    // Plaid pattern — vertical black stripes
    ctx.fillRect(drawX + 10 * s, drawY + 10 * s, 2 * s, 12 * s);
    ctx.fillRect(drawX + 20 * s, drawY + 10 * s, 2 * s, 12 * s);

    // Plaid crosshatch — dark red at intersections
    ctx.fillStyle = PLAID_RED_DARK;
    ctx.fillRect(drawX + 10 * s, drawY + 12 * s, 2 * s, 2 * s);
    ctx.fillRect(drawX + 10 * s, drawY + 17 * s, 2 * s, 2 * s);
    ctx.fillRect(drawX + 20 * s, drawY + 12 * s, 2 * s, 2 * s);
    ctx.fillRect(drawX + 20 * s, drawY + 17 * s, 2 * s, 2 * s);

    // Collar at shirt top
    ctx.fillStyle = PLAID_RED_DARK;
    ctx.fillRect(drawX + 9 * s, drawY + 10 * s, 4 * s, 2 * s);
    ctx.fillRect(drawX + 19 * s, drawY + 10 * s, 4 * s, 2 * s);

    // Shadow at shirt bottom
    ctx.fillStyle = PLAID_STRIPE;
    ctx.fillRect(drawX + 6 * s, drawY + 20 * s, 20 * s, 2 * s);

    // =========================================================
    // BOSS — suspenders over flannel
    // =========================================================
    if (isBoss) {
      ctx.fillStyle = SUSPENDER_COLOR;
      ctx.fillRect(drawX + 8 * s, drawY + 10 * s, 3 * s, 12 * s);
      ctx.fillRect(drawX + 21 * s, drawY + 10 * s, 3 * s, 12 * s);
      // Suspender buckle/highlight
      ctx.fillStyle = SUSPENDER_DARK;
      ctx.fillRect(drawX + 9 * s, drawY + 10 * s, 1 * s, 12 * s);
      ctx.fillRect(drawX + 22 * s, drawY + 10 * s, 1 * s, 12 * s);
    }

    // =========================================================
    // HEAD — human proportions, no pointy ears
    // =========================================================
    // Main head block
    ctx.fillStyle = skinColor;
    ctx.fillRect(drawX + 7 * s, drawY + 0, 18 * s, 12 * s);
    ctx.fillRect(drawX + 9 * s, drawY - 1 * s, 14 * s, 14 * s);

    // Human ears — small, rounded, tight to head
    ctx.fillStyle = skinMid;
    ctx.fillRect(drawX + 5 * s, drawY + 3 * s, 3 * s, 4 * s);
    ctx.fillRect(drawX + 24 * s, drawY + 3 * s, 3 * s, 4 * s);
    // Inner ear
    ctx.fillStyle = skinShad;
    ctx.fillRect(drawX + 6 * s, drawY + 4 * s, 1 * s, 2 * s);
    ctx.fillRect(drawX + 25 * s, drawY + 4 * s, 1 * s, 2 * s);

    // =========================================================
    // HAT — beanie/toque (default) or hard hat (boss)
    // =========================================================
    if (isBoss) {
      // Foreman's hard hat — yellow safety helmet
      ctx.fillStyle = HARDHAT_BODY;
      ctx.fillRect(drawX + 6 * s, drawY - 5 * s, 20 * s, 7 * s);
      // Brim
      ctx.fillStyle = HARDHAT_DARK;
      ctx.fillRect(drawX + 4 * s, drawY + 0, 24 * s, 3 * s);
      // Top highlight
      ctx.fillStyle = HARDHAT_LIGHT;
      ctx.fillRect(drawX + 9 * s, drawY - 5 * s, 10 * s, 2 * s);
      // Ridge on top
      ctx.fillStyle = HARDHAT_DARK;
      ctx.fillRect(drawX + 14 * s, drawY - 6 * s, 4 * s, 2 * s);
    } else {
      // Red/black plaid beanie
      ctx.fillStyle = BEANIE_RED;
      ctx.fillRect(drawX + 7 * s, drawY - 5 * s, 18 * s, 7 * s);
      // Plaid stripes on beanie
      ctx.fillStyle = BEANIE_BLACK;
      ctx.fillRect(drawX + 7 * s, drawY - 3 * s, 18 * s, 2 * s);
      ctx.fillRect(drawX + 13 * s, drawY - 5 * s, 2 * s, 7 * s);
      ctx.fillRect(drawX + 19 * s, drawY - 5 * s, 2 * s, 7 * s);
      // Fold/brim at bottom
      ctx.fillStyle = BEANIE_FOLD;
      ctx.fillRect(drawX + 6 * s, drawY + 0, 20 * s, 3 * s);
      // Pom-pom on top
      ctx.fillStyle = BEANIE_RED;
      ctx.fillRect(drawX + 13 * s, drawY - 8 * s, 6 * s, 4 * s);
      ctx.fillStyle = BEANIE_BLACK;
      ctx.fillRect(drawX + 14 * s, drawY - 7 * s, 2 * s, 2 * s);
    }

    // =========================================================
    // EYES — small human eyes
    // =========================================================
    // Open eyes — white sclera + pupil
    ctx.fillStyle = EYE_WHITE;
    ctx.fillRect(drawX + 10 * s, drawY + 4 * s, 5 * s, 4 * s);
    ctx.fillRect(drawX + 18 * s, drawY + 4 * s, 5 * s, 4 * s);
    // Blink on frame 3 of idle
    if (!(state === 'IDLE' && this.animFrame === 3)) {
      ctx.fillStyle = EYE_PUPIL;
      ctx.fillRect(drawX + 12 * s, drawY + 5 * s, 2 * s, 2 * s);
      ctx.fillRect(drawX + 20 * s, drawY + 5 * s, 2 * s, 2 * s);
    }
    // Eyebrows — thick, bushy
    ctx.fillStyle = BEARD_DARK;
    ctx.fillRect(drawX + 9 * s, drawY + 3 * s, 6 * s, 1 * s);
    ctx.fillRect(drawX + 18 * s, drawY + 3 * s, 6 * s, 1 * s);

    // =========================================================
    // NOSE — small human nose (NOT a goblin snout!)
    // =========================================================
    ctx.fillStyle = skinMid;
    ctx.fillRect(drawX + 15 * s, drawY + 7 * s, 3 * s, 3 * s);
    ctx.fillStyle = skinShad;
    ctx.fillRect(drawX + 15 * s, drawY + 9 * s, 3 * s, 1 * s);

    // =========================================================
    // MOUTH — mostly hidden by beard, visible when celebrating/mining
    // =========================================================
    if (state === 'CELEBRATING') {
      // Open smile peeking through beard
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(drawX + 13 * s, drawY + 11 * s, 6 * s, 1 * s);
    } else if (isMining) {
      // Open mouth effort
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(drawX + 14 * s, drawY + 11 * s, 4 * s, 2 * s);
    }

    // =========================================================
    // BEARD — thick, bushy brown beard
    // =========================================================
    ctx.fillStyle = BEARD;
    // Main beard mass
    ctx.fillRect(drawX + 8 * s, drawY + 9 * s, 16 * s, 6 * s);
    // Wider at bottom
    ctx.fillRect(drawX + 7 * s, drawY + 11 * s, 18 * s, 3 * s);
    // Chin beard extending down
    ctx.fillRect(drawX + 9 * s, drawY + 14 * s, 14 * s, 3 * s);
    ctx.fillRect(drawX + 11 * s, drawY + 16 * s, 10 * s, 2 * s);
    // Darker shading on lower beard
    ctx.fillStyle = BEARD_DARK;
    ctx.fillRect(drawX + 10 * s, drawY + 15 * s, 12 * s, 2 * s);

    // Boss gets a bigger, bushier beard
    if (isBoss) {
      ctx.fillStyle = BEARD;
      ctx.fillRect(drawX + 6 * s, drawY + 10 * s, 20 * s, 5 * s);
      ctx.fillRect(drawX + 8 * s, drawY + 15 * s, 16 * s, 4 * s);
      ctx.fillRect(drawX + 10 * s, drawY + 18 * s, 12 * s, 2 * s);
      ctx.fillStyle = BEARD_DARK;
      ctx.fillRect(drawX + 9 * s, drawY + 17 * s, 14 * s, 2 * s);
    }

    // =========================================================
    // ARM (extended when holding tool)
    // =========================================================
    if (isMining) {
      // Flannel sleeve on arm
      ctx.fillStyle = PLAID_RED;
      ctx.fillRect(drawX + 24 * s, drawY + 10 * s, 6 * s, 4 * s);
      ctx.fillStyle = PLAID_BLACK;
      ctx.fillRect(drawX + 24 * s, drawY + 12 * s, 6 * s, 1 * s);
      // Hand
      ctx.fillStyle = skinColor;
      ctx.fillRect(drawX + 28 * s, drawY + 10 * s, 4 * s, 4 * s);
    }

    // =========================================================
    // TOOLS
    // =========================================================
    this.renderTools(ctx, state, drawX, drawY, s);

    ctx.restore();

    // =========================================================
    // LABELS — drawn after restore so they are never flipped
    // =========================================================

    // === ACTION LABEL above character ===
    if (this.actionLabel) {
      const labelX = Math.floor(this.x * s + SIZE * s / 2);
      const labelY = Math.floor(this.y * s - 10 * s);
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

    // === NAME LABEL below character ===
    if (this.nameLabel) {
      const nameX = Math.floor(this.x * s + SIZE * s / 2);
      const nameY = Math.floor(this.y * s + 34 * s);
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

      // === ROLE LABEL below name (smaller, dimmer) ===
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

  protected renderSleeping(ctx: CanvasRenderingContext2D, scale: number): void {
    const s = scale;
    const isBoss = this.variant === 'boss';
    const breathe = Math.sin(Date.now() / 1000 * 1.5) * 1.5 * s;
    const drawX = Math.floor(this.x * s);
    const drawY = Math.floor(this.y * s + 16 * s - breathe);

    // Layout: head on LEFT, feet on RIGHT — side profile

    // =========================================================
    // PILLOW — big puffy white pillow under head
    // =========================================================
    ctx.fillStyle = PILLOW_MAIN;
    ctx.fillRect(Math.floor(drawX - 6 * s), Math.floor(drawY - 2 * s), Math.floor(22 * s), Math.floor(18 * s));
    ctx.fillStyle = PILLOW_LIGHT;
    ctx.fillRect(Math.floor(drawX - 5 * s), Math.floor(drawY - 3 * s), Math.floor(20 * s), Math.floor(5 * s));
    ctx.fillStyle = PILLOW_SHADOW;
    ctx.fillRect(Math.floor(drawX - 5 * s), Math.floor(drawY + 13 * s), Math.floor(20 * s), Math.floor(4 * s));
    // Side puffs
    ctx.fillStyle = PILLOW_MAIN;
    ctx.fillRect(Math.floor(drawX - 8 * s), Math.floor(drawY + 1 * s), Math.floor(4 * s), Math.floor(12 * s));
    ctx.fillRect(Math.floor(drawX + 14 * s), Math.floor(drawY + 1 * s), Math.floor(4 * s), Math.floor(12 * s));

    // =========================================================
    // BOOTS — right end, stacked
    // =========================================================
    ctx.fillStyle = BOOT_COLOR;
    ctx.fillRect(Math.floor(drawX + 28 * s), Math.floor(drawY + 4 * s), Math.floor(6 * s), Math.floor(3 * s));
    ctx.fillRect(Math.floor(drawX + 29 * s), Math.floor(drawY + 9 * s), Math.floor(6 * s), Math.floor(3 * s));
    ctx.fillStyle = BOOT_DARK;
    ctx.fillRect(Math.floor(drawX + 32 * s), Math.floor(drawY + 4 * s), Math.floor(3 * s), Math.floor(3 * s));
    ctx.fillRect(Math.floor(drawX + 33 * s), Math.floor(drawY + 9 * s), Math.floor(3 * s), Math.floor(3 * s));

    // =========================================================
    // PANTS — denim
    // =========================================================
    ctx.fillStyle = DENIM;
    ctx.fillRect(Math.floor(drawX + 22 * s), Math.floor(drawY + 4 * s), Math.floor(8 * s), Math.floor(8 * s));
    ctx.fillStyle = DENIM_SEAM;
    ctx.fillRect(Math.floor(drawX + 25 * s), Math.floor(drawY + 4 * s), Math.floor(2 * s), Math.floor(8 * s));
    ctx.fillStyle = DENIM_DARK;
    ctx.fillRect(Math.floor(drawX + 22 * s), Math.floor(drawY + 10 * s), Math.floor(8 * s), Math.floor(2 * s));

    // =========================================================
    // TORSO — plaid flannel, side profile (on back, face up)
    // =========================================================
    ctx.fillStyle = PLAID_RED;
    ctx.fillRect(Math.floor(drawX + 10 * s), Math.floor(drawY + 4 * s), Math.floor(14 * s), Math.floor(8 * s));
    // Belly bump (top)
    ctx.fillStyle = PLAID_RED;
    ctx.fillRect(Math.floor(drawX + 12 * s), Math.floor(drawY + 2 * s), Math.floor(10 * s), Math.floor(4 * s));
    // Horizontal stripes
    ctx.fillStyle = PLAID_BLACK;
    ctx.fillRect(Math.floor(drawX + 10 * s), Math.floor(drawY + 6 * s), Math.floor(14 * s), Math.floor(2 * s));
    ctx.fillRect(Math.floor(drawX + 12 * s), Math.floor(drawY + 2 * s), Math.floor(10 * s), Math.floor(1 * s));
    // Vertical stripes
    ctx.fillRect(Math.floor(drawX + 14 * s), Math.floor(drawY + 4 * s), Math.floor(2 * s), Math.floor(8 * s));
    ctx.fillRect(Math.floor(drawX + 20 * s), Math.floor(drawY + 4 * s), Math.floor(2 * s), Math.floor(8 * s));
    // Bottom shadow
    ctx.fillStyle = PLAID_STRIPE;
    ctx.fillRect(Math.floor(drawX + 10 * s), Math.floor(drawY + 10 * s), Math.floor(14 * s), Math.floor(2 * s));
    // Boss suspenders
    if (isBoss) {
      ctx.fillStyle = SUSPENDER_COLOR;
      ctx.fillRect(Math.floor(drawX + 12 * s), Math.floor(drawY + 3 * s), Math.floor(2 * s), Math.floor(9 * s));
      ctx.fillRect(Math.floor(drawX + 21 * s), Math.floor(drawY + 3 * s), Math.floor(2 * s), Math.floor(9 * s));
    }

    // =========================================================
    // ARM on belly — flannel sleeve + hand resting on stomach
    // =========================================================
    ctx.fillStyle = PLAID_RED;
    ctx.fillRect(Math.floor(drawX + 16 * s), Math.floor(drawY + 1 * s), Math.floor(4 * s), Math.floor(3 * s));
    ctx.fillStyle = SKIN;
    ctx.fillRect(Math.floor(drawX + 17 * s), Math.floor(drawY - 1 * s), Math.floor(3 * s), Math.floor(3 * s));

    // =========================================================
    // HEAD — resting on pillow, face visible from side
    // =========================================================
    ctx.fillStyle = SKIN;
    ctx.fillRect(Math.floor(drawX + 2 * s), Math.floor(drawY + 0), Math.floor(10 * s), Math.floor(12 * s));
    ctx.fillRect(Math.floor(drawX + 0), Math.floor(drawY + 2 * s), Math.floor(12 * s), Math.floor(8 * s));
    // Ear
    ctx.fillStyle = SKIN_MID;
    ctx.fillRect(Math.floor(drawX + 4 * s), Math.floor(drawY - 2 * s), Math.floor(3 * s), Math.floor(3 * s));
    ctx.fillStyle = SKIN_SHADOW;
    ctx.fillRect(Math.floor(drawX + 5 * s), Math.floor(drawY - 1 * s), Math.floor(1 * s), Math.floor(1 * s));

    // =========================================================
    // NIGHTCAP — blue & white striped, tip drooping RIGHT
    // =========================================================
    // Base band on head
    ctx.fillStyle = CAP_BLUE;
    ctx.fillRect(Math.floor(drawX + 1 * s), Math.floor(drawY - 2 * s), Math.floor(10 * s), Math.floor(4 * s));
    ctx.fillStyle = CAP_WHITE;
    ctx.fillRect(Math.floor(drawX + 1 * s), Math.floor(drawY - 1 * s), Math.floor(10 * s), Math.floor(2 * s));
    // Mid section drooping right
    ctx.fillStyle = CAP_BLUE;
    ctx.fillRect(Math.floor(drawX + 6 * s), Math.floor(drawY - 4 * s), Math.floor(8 * s), Math.floor(4 * s));
    ctx.fillStyle = CAP_WHITE;
    ctx.fillRect(Math.floor(drawX + 6 * s), Math.floor(drawY - 3 * s), Math.floor(8 * s), Math.floor(2 * s));
    // Far section
    ctx.fillStyle = CAP_BLUE;
    ctx.fillRect(Math.floor(drawX + 12 * s), Math.floor(drawY - 5 * s), Math.floor(7 * s), Math.floor(4 * s));
    ctx.fillStyle = CAP_WHITE;
    ctx.fillRect(Math.floor(drawX + 12 * s), Math.floor(drawY - 4 * s), Math.floor(7 * s), Math.floor(2 * s));
    // Tip
    ctx.fillStyle = CAP_BLUE_DARK;
    ctx.fillRect(Math.floor(drawX + 17 * s), Math.floor(drawY - 4 * s), Math.floor(5 * s), Math.floor(3 * s));
    ctx.fillRect(Math.floor(drawX + 20 * s), Math.floor(drawY - 2 * s), Math.floor(4 * s), Math.floor(2 * s));
    // Pom-pom
    ctx.fillStyle = CAP_POM;
    ctx.fillRect(Math.floor(drawX + 22 * s), Math.floor(drawY - 4 * s), Math.floor(4 * s), Math.floor(4 * s));
    ctx.fillStyle = PILLOW_SHADOW;
    ctx.fillRect(Math.floor(drawX + 23 * s), Math.floor(drawY - 3 * s), Math.floor(2 * s), Math.floor(2 * s));

    // =========================================================
    // CLOSED EYE
    // =========================================================
    ctx.fillStyle = EYE_PUPIL;
    ctx.fillRect(Math.floor(drawX + 1 * s), Math.floor(drawY + 4 * s), Math.floor(4 * s), Math.floor(2 * s));

    // =========================================================
    // NOSE
    // =========================================================
    ctx.fillStyle = SKIN_MID;
    ctx.fillRect(Math.floor(drawX - 1 * s), Math.floor(drawY + 5 * s), Math.floor(3 * s), Math.floor(2 * s));

    // =========================================================
    // BEARD — hanging forward/left
    // =========================================================
    ctx.fillStyle = BEARD;
    ctx.fillRect(Math.floor(drawX - 2 * s), Math.floor(drawY + 7 * s), Math.floor(8 * s), Math.floor(4 * s));
    ctx.fillRect(Math.floor(drawX - 3 * s), Math.floor(drawY + 8 * s), Math.floor(6 * s), Math.floor(4 * s));
    ctx.fillStyle = BEARD_DARK;
    ctx.fillRect(Math.floor(drawX - 2 * s), Math.floor(drawY + 10 * s), Math.floor(5 * s), Math.floor(2 * s));
    // Boss bigger beard
    if (isBoss) {
      ctx.fillStyle = BEARD;
      ctx.fillRect(Math.floor(drawX - 4 * s), Math.floor(drawY + 7 * s), Math.floor(10 * s), Math.floor(5 * s));
      ctx.fillStyle = BEARD_DARK;
      ctx.fillRect(Math.floor(drawX - 3 * s), Math.floor(drawY + 10 * s), Math.floor(7 * s), Math.floor(3 * s));
    }

    // =========================================================
    // LABELS
    // =========================================================
    if (this.actionLabel) {
      const labelX = Math.floor(this.x * s + SIZE * s / 2);
      const labelY = Math.floor(this.y * s + 6 * s);
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

    if (this.nameLabel) {
      const nameX = Math.floor(this.x * s + SIZE * s / 2);
      const nameY = Math.floor(this.y * s + 34 * s);
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
    // ── AXE (Mining) — wooden handle + wedge-shaped steel head ──
    if (state === 'MINING') {
      const swingAngle = Math.sin(this.animFrame * Math.PI / 2) * 1.2;
      ctx.save();
      ctx.translate(drawX + 30 * s, drawY + 4 * s);
      ctx.rotate(swingAngle);

      // Long wooden handle
      ctx.fillStyle = TOOL_HANDLE;
      ctx.fillRect(Math.floor(-1 * s), 0, Math.floor(3 * s), Math.floor(24 * s));
      // Handle grain detail
      ctx.fillStyle = TOOL_HANDLE_DARK;
      ctx.fillRect(Math.floor(0), Math.floor(4 * s), Math.floor(1 * s), Math.floor(16 * s));

      // Axe head — wedge shape (wider at cutting edge, narrow at handle)
      // Back of head (near handle)
      ctx.fillStyle = AXE_HEAD;
      ctx.fillRect(Math.floor(-3 * s), Math.floor(-3 * s), Math.floor(8 * s), Math.floor(6 * s));
      // Wider blade edge (outward, away from lumberjack)
      ctx.fillStyle = AXE_HEAD;
      ctx.fillRect(Math.floor(3 * s), Math.floor(-5 * s), Math.floor(7 * s), Math.floor(10 * s));
      // Cutting edge — bright shine
      ctx.fillStyle = AXE_SHINE;
      ctx.fillRect(Math.floor(9 * s), Math.floor(-4 * s), Math.floor(3 * s), Math.floor(8 * s));
      // Dark edge line
      ctx.fillStyle = AXE_EDGE;
      ctx.fillRect(Math.floor(11 * s), Math.floor(-3 * s), Math.floor(1 * s), Math.floor(6 * s));

      ctx.restore();
      return;
    }

    // ── WHEELBARROW WITH LOGS (shown during CART state or walking with showCart) ──
    if (state === 'CART' || (this.showCart && state === 'WALKING')) {
      const cartBob = state === 'WALKING' ? Math.sin(this.animFrame * Math.PI / 2) * 2 * s : 0;
      const cartX = drawX + 28 * s;
      const cartY = drawY + 8 * s + cartBob;

      // Wheelbarrow body — wooden trough
      ctx.fillStyle = WHEELBARROW_BODY;
      ctx.fillRect(Math.floor(cartX), Math.floor(cartY + 2 * s), Math.floor(22 * s), Math.floor(14 * s));
      // Darker front
      ctx.fillStyle = WHEELBARROW_DARK;
      ctx.fillRect(Math.floor(cartX + 18 * s), Math.floor(cartY + 2 * s), Math.floor(4 * s), Math.floor(14 * s));
      // Rim
      ctx.fillStyle = WHEELBARROW_RIM;
      ctx.fillRect(Math.floor(cartX - 1 * s), Math.floor(cartY + 1 * s), Math.floor(24 * s), Math.floor(2 * s));

      // Single front wheel
      ctx.fillStyle = '#37474F';
      ctx.fillRect(Math.floor(cartX + 18 * s), Math.floor(cartY + 16 * s), Math.floor(6 * s), Math.floor(6 * s));
      // Wheel hub
      ctx.fillStyle = '#263238';
      ctx.fillRect(Math.floor(cartX + 20 * s), Math.floor(cartY + 18 * s), Math.floor(2 * s), Math.floor(2 * s));

      // Wheelbarrow legs (rear supports)
      ctx.fillStyle = WHEELBARROW_DARK;
      ctx.fillRect(Math.floor(cartX + 2 * s), Math.floor(cartY + 16 * s), Math.floor(2 * s), Math.floor(6 * s));
      ctx.fillRect(Math.floor(cartX + 8 * s), Math.floor(cartY + 16 * s), Math.floor(2 * s), Math.floor(6 * s));

      // Handles (connecting to lumberjack)
      ctx.fillStyle = TOOL_HANDLE;
      ctx.fillRect(Math.floor(cartX - 4 * s), Math.floor(cartY + 6 * s), Math.floor(6 * s), Math.floor(2 * s));
      ctx.fillRect(Math.floor(cartX - 4 * s), Math.floor(cartY + 12 * s), Math.floor(6 * s), Math.floor(2 * s));

      // Logs in the wheelbarrow — round cross-sections visible from top
      // Log 1
      ctx.fillStyle = LOG_LIGHT;
      ctx.fillRect(Math.floor(cartX + 2 * s), Math.floor(cartY - 4 * s), Math.floor(8 * s), Math.floor(7 * s));
      ctx.fillStyle = LOG_RING;
      ctx.fillRect(Math.floor(cartX + 4 * s), Math.floor(cartY - 2 * s), Math.floor(4 * s), Math.floor(3 * s));
      ctx.fillStyle = LOG_DARK;
      ctx.fillRect(Math.floor(cartX + 5 * s), Math.floor(cartY - 1 * s), Math.floor(2 * s), Math.floor(1 * s));

      // Log 2
      ctx.fillStyle = LOG_MID;
      ctx.fillRect(Math.floor(cartX + 10 * s), Math.floor(cartY - 3 * s), Math.floor(7 * s), Math.floor(6 * s));
      ctx.fillStyle = LOG_RING;
      ctx.fillRect(Math.floor(cartX + 12 * s), Math.floor(cartY - 1 * s), Math.floor(3 * s), Math.floor(2 * s));

      // Log 3 — stacked on top
      ctx.fillStyle = LOG_LIGHT;
      ctx.fillRect(Math.floor(cartX + 5 * s), Math.floor(cartY - 8 * s), Math.floor(6 * s), Math.floor(5 * s));
      ctx.fillStyle = LOG_RING;
      ctx.fillRect(Math.floor(cartX + 7 * s), Math.floor(cartY - 7 * s), Math.floor(2 * s), Math.floor(3 * s));
      ctx.fillStyle = LOG_DARK;
      ctx.fillRect(Math.floor(cartX + 7 * s), Math.floor(cartY - 6 * s), Math.floor(2 * s), Math.floor(1 * s));

      // Bark edges on logs
      ctx.fillStyle = LOG_DARK;
      ctx.fillRect(Math.floor(cartX + 2 * s), Math.floor(cartY - 4 * s), Math.floor(1 * s), Math.floor(7 * s));
      ctx.fillRect(Math.floor(cartX + 9 * s), Math.floor(cartY - 4 * s), Math.floor(1 * s), Math.floor(7 * s));
      ctx.fillRect(Math.floor(cartX + 10 * s), Math.floor(cartY - 3 * s), Math.floor(1 * s), Math.floor(6 * s));
      ctx.fillRect(Math.floor(cartX + 16 * s), Math.floor(cartY - 3 * s), Math.floor(1 * s), Math.floor(6 * s));

      // Arm pushing wheelbarrow (flannel sleeve)
      ctx.fillStyle = PLAID_RED;
      ctx.fillRect(Math.floor(drawX + 24 * s), Math.floor(drawY + 12 * s), Math.floor(5 * s), Math.floor(3 * s));
      ctx.fillStyle = SKIN;
      ctx.fillRect(Math.floor(drawX + 27 * s), Math.floor(drawY + 12 * s), Math.floor(3 * s), Math.floor(3 * s));
      return;
    }

    // ── SCROLL (shown during explore / showScroll) — reused from Goblin ──
    if (this.showScroll && (state === 'IDLE' || state === 'WALKING')) {
      const scrollBob = state === 'WALKING' ? Math.sin(this.animFrame * Math.PI) * 1 * s : 0;
      const scrollX = drawX + 26 * s;
      const scrollY = drawY + 6 * s + scrollBob;

      // Scroll body
      ctx.fillStyle = SCROLL_BODY;
      ctx.fillRect(Math.floor(scrollX), Math.floor(scrollY), Math.floor(12 * s), Math.floor(16 * s));
      // Top and bottom rolls
      ctx.fillStyle = SCROLL_EDGE;
      ctx.fillRect(Math.floor(scrollX - 1 * s), Math.floor(scrollY - 1 * s), Math.floor(14 * s), Math.floor(3 * s));
      ctx.fillRect(Math.floor(scrollX - 1 * s), Math.floor(scrollY + 14 * s), Math.floor(14 * s), Math.floor(3 * s));
      // Text lines
      ctx.fillStyle = SCROLL_TEXT;
      ctx.fillRect(Math.floor(scrollX + 2 * s), Math.floor(scrollY + 4 * s), Math.floor(8 * s), Math.floor(1 * s));
      ctx.fillRect(Math.floor(scrollX + 2 * s), Math.floor(scrollY + 7 * s), Math.floor(6 * s), Math.floor(1 * s));
      ctx.fillRect(Math.floor(scrollX + 2 * s), Math.floor(scrollY + 10 * s), Math.floor(7 * s), Math.floor(1 * s));

      // Arm holding scroll (flannel sleeve + hand)
      ctx.fillStyle = PLAID_RED;
      ctx.fillRect(Math.floor(drawX + 24 * s), Math.floor(drawY + 10 * s), Math.floor(3 * s), Math.floor(4 * s));
      ctx.fillStyle = SKIN;
      ctx.fillRect(Math.floor(drawX + 26 * s), Math.floor(drawY + 10 * s), Math.floor(3 * s), Math.floor(4 * s));
    }
  }
}
