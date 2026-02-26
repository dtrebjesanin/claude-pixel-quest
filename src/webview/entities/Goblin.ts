import { GoblinStateMachine, GoblinState } from './GoblinStateMachine';
import { ParticleEmitter } from './ParticleEmitter';

const SIZE = 32;
const SPEED = 110;

// Goblin palette — default (green)
const SKIN = '#4ade80';
const SKIN_DARK = '#22c55e';
const SKIN_SHADOW = '#16a34a';
const SKIN_EFFORT = '#f87171'; // Red tint when mining
const EYE_WHITE = '#fff';
const EYE_PUPIL = '#1a1a2e';
const PANTS = '#854d0e';
const PANTS_DARK = '#713f12';

// Nightcap palette — blue & white striped
const CAP_BLUE = '#3b82f6';       // Blue stripe
const CAP_BLUE_DARK = '#2563eb';  // Blue shadow
const CAP_WHITE = '#e2e8f0';      // White stripe
const CAP_POM = '#ffffff';        // White pom-pom

// Pillow palette — white/soft
const PILLOW_MAIN = '#f1f5f9';    // Light gray-white
const PILLOW_LIGHT = '#ffffff';   // Highlight
const PILLOW_SHADOW = '#cbd5e1';  // Shadow fold

// Boss palette — Grumpytoes (amber/orange)
const BOSS_SKIN = '#fb923c';
const BOSS_SKIN_DARK = '#ea580c';
const BOSS_SKIN_SHADOW = '#c2410c';
const BOSS_SKIN_EFFORT = '#fbbf24';
const BOSS_PANTS = '#1e3a5f';
const BOSS_PANTS_DARK = '#172554';
const HELMET_BODY = '#fbbf24';
const HELMET_DARK = '#d97706';
const HELMET_LIGHT = '#fde68a';
const HELMET_LAMP = '#ef4444';
const HELMET_LAMP_GLOW = '#fef08a';
const TOOL_HANDLE = '#92400e';
const TOOL_HEAD = '#9ca3af';
const TOOL_SHINE = '#d1d5db';
const SCROLL_BODY = '#fef3c7';
const SCROLL_EDGE = '#d97706';
const SCROLL_TEXT = '#92400e';
const LABEL_BG = 'rgba(0,0,0,0.75)';
const LABEL_TEXT = '#e2e8f0';
const NAME_BG = 'rgba(0,0,0,0.55)';
const NAME_TEXT = '#94a3b8';

export class Goblin {
  x: number;
  y: number;
  private targetX: number | null = null;
  private targetY: number | null = null;
  private onArrival: (() => void) | null = null;
  protected stateMachine = new GoblinStateMachine();
  protected facingRight = true;
  protected animFrame = 0;
  private animTimer = 0;
  protected particles: ParticleEmitter;
  private particleTimer = 0;
  actionLabel = '';
  nameLabel = '';
  roleLabel = '';
  variant: 'default' | 'boss' = 'default';
  showCart = false;
  showScroll = false;
  readonly id: string;

  constructor(x: number, y: number, particles: ParticleEmitter, id: string = 'main') {
    this.x = x;
    this.y = y;
    this.particles = particles;
    this.id = id;
  }

  getState(): GoblinState {
    return this.stateMachine.getState();
  }

  walkTo(targetX: number, targetY: number, onArrival?: () => void): void {
    this.targetX = targetX;
    this.targetY = targetY;
    this.onArrival = onArrival || null;
    this.stateMachine.transition('WALKING');
    this.facingRight = targetX > this.x;
  }

  transitionTo(state: GoblinState, onComplete?: () => void): void {
    this.targetX = null;
    this.targetY = null;
    this.stateMachine.transition(state, onComplete);
  }

  playPoofIn(): void {
    this.stateMachine.transition('POOF_IN');
    this.particles.emitPoof(this.x + SIZE / 2, this.y + SIZE / 2);
  }

  sleep(): void {
    this.actionLabel = '';
    this.showCart = false;
    this.showScroll = false;
    this.particleTimer = 0;
    this.stateMachine.transition('SLEEPING');
  }

  wake(): void {
    this.stateMachine.transition('IDLE');
  }

  /** Force-reset to IDLE, bypassing canInterrupt guards. For session reset. */
  forceIdle(): void {
    this.targetX = null;
    this.targetY = null;
    this.stateMachine.forceIdle();
  }

  update(dt: number): void {
    const state = this.stateMachine.getState();

    // Movement
    if (this.targetX !== null && this.targetY !== null && state === 'WALKING') {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = SPEED * (dt / 1000);

      if (dist <= step) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.targetX = null;
        this.targetY = null;
        const cb = this.onArrival;
        this.onArrival = null;
        this.stateMachine.transition('IDLE');
        cb?.();
      } else {
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
        this.facingRight = dx > 0;
      }
    }

    // Animation speed varies by state
    this.animTimer += dt;
    const frameSpeed = state === 'MINING' ? 100 : state === 'CELEBRATING' ? 150 : 200;
    if (this.animTimer > frameSpeed) {
      this.animTimer -= frameSpeed;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    // Particles
    this.particleTimer += dt;
    if (state === 'MINING' && this.particleTimer > 200) {
      this.particleTimer -= 200;
      const sparkX = this.x + (this.facingRight ? SIZE + 4 : -4);
      this.particles.emitSparks(sparkX, this.y - 2);
    }
    if (state === 'SLEEPING' && this.particleTimer > 1200) {
      this.particleTimer -= 1200;
      this.particles.emitZzz(this.x + SIZE - 2, this.y - 6);
    }
    if (state === 'CELEBRATING' && this.animFrame === 0) {
      this.particles.emitSparkles(this.x + SIZE / 2, this.y - 4);
    }

    this.stateMachine.update(dt);
  }

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

    if (state === 'SLEEPING') {
      this.renderSleeping(ctx, scale);
      return;
    }

    ctx.save();

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

    // === BODY ===
    const isBoss = this.variant === 'boss';
    const skinColor = isMining
      ? (isBoss ? BOSS_SKIN_EFFORT : SKIN_EFFORT)
      : (isBoss ? BOSS_SKIN : SKIN);
    const skinDark = isMining
      ? (isBoss ? '#f59e0b' : '#dc2626')
      : (isBoss ? BOSS_SKIN_DARK : SKIN_DARK);
    const skinShadow = isMining
      ? (isBoss ? '#d97706' : '#b91c1c')
      : (isBoss ? BOSS_SKIN_SHADOW : SKIN_SHADOW);

    // Torso
    ctx.fillStyle = skinColor;
    ctx.fillRect(drawX + 6 * s, drawY + 10 * s, 20 * s, 12 * s);
    ctx.fillStyle = skinShadow;
    ctx.fillRect(drawX + 6 * s, drawY + 18 * s, 20 * s, 4 * s);

    // Head
    ctx.fillStyle = skinColor;
    ctx.fillRect(drawX + 7 * s, drawY + 0, 18 * s, 12 * s);
    ctx.fillRect(drawX + 9 * s, drawY - 1 * s, 14 * s, 14 * s);

    // Ears — pointy elf-style, tapering outward
    ctx.fillStyle = skinDark;
    // Left ear: wide base at head, narrows to a point
    ctx.fillRect(drawX + 3 * s, drawY + 3 * s, 6 * s, 5 * s);  // base
    ctx.fillRect(drawX + 1 * s, drawY + 2 * s, 5 * s, 4 * s);  // mid
    ctx.fillRect(drawX - 1 * s, drawY + 1 * s, 3 * s, 3 * s);  // narrow
    ctx.fillRect(drawX - 3 * s, drawY + 0, 2 * s, 2 * s);       // tip
    // Right ear
    ctx.fillRect(drawX + 23 * s, drawY + 3 * s, 6 * s, 5 * s);
    ctx.fillRect(drawX + 26 * s, drawY + 2 * s, 5 * s, 4 * s);
    ctx.fillRect(drawX + 30 * s, drawY + 1 * s, 3 * s, 3 * s);
    ctx.fillRect(drawX + 33 * s, drawY + 0, 2 * s, 2 * s);

    // === MINING HELMET (boss only) ===
    if (isBoss) {
      // Helmet body — sits on top of head
      ctx.fillStyle = HELMET_BODY;
      ctx.fillRect(drawX + 6 * s, drawY - 4 * s, 20 * s, 6 * s);
      // Brim
      ctx.fillStyle = HELMET_DARK;
      ctx.fillRect(drawX + 4 * s, drawY + 1 * s, 24 * s, 3 * s);
      // Top highlight
      ctx.fillStyle = HELMET_LIGHT;
      ctx.fillRect(drawX + 8 * s, drawY - 4 * s, 10 * s, 2 * s);
      // Headlamp
      ctx.fillStyle = HELMET_LAMP;
      ctx.fillRect(drawX + 13 * s, drawY - 2 * s, 6 * s, 4 * s);
      // Lamp glow (flickering)
      if (this.animFrame % 2 === 0) {
        ctx.fillStyle = HELMET_LAMP_GLOW;
        ctx.fillRect(drawX + 14 * s, drawY - 1 * s, 4 * s, 2 * s);
      }
    }

    // Eyes
    ctx.fillStyle = EYE_WHITE;
    ctx.fillRect(drawX + 9 * s, drawY + 4 * s, 6 * s, 5 * s);
    ctx.fillRect(drawX + 18 * s, drawY + 4 * s, 6 * s, 5 * s);
    if (!(state === 'IDLE' && this.animFrame === 3)) {
      ctx.fillStyle = EYE_PUPIL;
      ctx.fillRect(drawX + 11 * s, drawY + 5 * s, 3 * s, 3 * s);
      ctx.fillRect(drawX + 20 * s, drawY + 5 * s, 3 * s, 3 * s);
    }

    // Nose — long pointy goblin snout poking out right
    ctx.fillStyle = skinDark;
    ctx.fillRect(drawX + 19 * s, drawY + 9 * s, 5 * s, 5 * s);  // base (fat)
    ctx.fillRect(drawX + 24 * s, drawY + 10 * s, 4 * s, 4 * s); // mid
    ctx.fillRect(drawX + 28 * s, drawY + 11 * s, 3 * s, 3 * s); // narrow
    ctx.fillRect(drawX + 31 * s, drawY + 12 * s, 2 * s, 2 * s); // tip

    // Mouth — open wide when mining
    ctx.fillStyle = skinDark;
    if (state === 'CELEBRATING') {
      ctx.fillRect(drawX + 12 * s, drawY + 10 * s, 8 * s, 2 * s);
    } else if (isMining) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(drawX + 12 * s, drawY + 10 * s, 8 * s, 3 * s);
    }

    // Pants
    ctx.fillStyle = isBoss ? BOSS_PANTS : PANTS;
    ctx.fillRect(drawX + 6 * s, drawY + 20 * s, 20 * s, 6 * s);
    ctx.fillStyle = isBoss ? BOSS_PANTS_DARK : PANTS_DARK;
    ctx.fillRect(drawX + 15 * s, drawY + 20 * s, 2 * s, 6 * s);

    // Feet
    ctx.fillStyle = skinDark;
    const footAnim = state === 'WALKING' ? (this.animFrame % 2 === 0 ? 2 : -2) * s : 0;
    ctx.fillRect(drawX + 6 * s, drawY + 26 * s + footAnim, 8 * s, 4 * s);
    ctx.fillRect(drawX + 18 * s, drawY + 26 * s - footAnim, 8 * s, 4 * s);

    // === ARM (extended when holding tool) ===
    if (isMining) {
      ctx.fillStyle = skinColor;
      ctx.fillRect(drawX + 24 * s, drawY + 10 * s, 8 * s, 5 * s);
    }

    // === TOOLS ===
    this.renderTools(ctx, state, drawX, drawY, s);

    ctx.restore();

    // === ACTION LABEL above goblin (never flipped) ===
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

    // === NAME LABEL below goblin (never flipped) ===
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
    const breathe = Math.sin(Date.now() / 1000 * 1.5) * 1.5 * s;
    const drawX = Math.floor(this.x * s);
    const drawY = Math.floor(this.y * s + 14 * s - breathe);

    const isBoss = this.variant === 'boss';
    const skinColor = isBoss ? BOSS_SKIN : SKIN;
    const skinDark = isBoss ? BOSS_SKIN_DARK : SKIN_DARK;
    const skinShadow = isBoss ? BOSS_SKIN_SHADOW : SKIN_SHADOW;

    // Layout: head on LEFT, feet on RIGHT — lying on back, 3/4 view
    // Head is wide (front-facing), body shows front (belly up)

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
    // FEET — right side, stacked
    // =========================================================
    ctx.fillStyle = skinDark;
    ctx.fillRect(Math.floor(drawX + 32 * s), Math.floor(drawY + 2 * s), Math.floor(5 * s), Math.floor(4 * s));
    ctx.fillRect(Math.floor(drawX + 33 * s), Math.floor(drawY + 8 * s), Math.floor(5 * s), Math.floor(4 * s));

    // =========================================================
    // PANTS
    // =========================================================
    ctx.fillStyle = isBoss ? BOSS_PANTS : PANTS;
    ctx.fillRect(Math.floor(drawX + 24 * s), Math.floor(drawY + 1 * s), Math.floor(10 * s), Math.floor(12 * s));
    ctx.fillStyle = isBoss ? BOSS_PANTS_DARK : PANTS_DARK;
    ctx.fillRect(Math.floor(drawX + 28 * s), Math.floor(drawY + 1 * s), Math.floor(2 * s), Math.floor(12 * s));

    // =========================================================
    // BODY — wide torso on back, belly bump facing up
    // =========================================================
    ctx.fillStyle = skinColor;
    ctx.fillRect(Math.floor(drawX + 12 * s), Math.floor(drawY + 1 * s), Math.floor(14 * s), Math.floor(12 * s));
    // Belly bump (top, facing viewer)
    ctx.fillRect(Math.floor(drawX + 14 * s), Math.floor(drawY - 1 * s), Math.floor(10 * s), Math.floor(4 * s));
    // Bottom shadow
    ctx.fillStyle = skinShadow;
    ctx.fillRect(Math.floor(drawX + 12 * s), Math.floor(drawY + 11 * s), Math.floor(14 * s), Math.floor(2 * s));

    // =========================================================
    // ARM — resting on belly
    // =========================================================
    ctx.fillStyle = skinColor;
    ctx.fillRect(Math.floor(drawX + 17 * s), Math.floor(drawY - 2 * s), Math.floor(5 * s), Math.floor(4 * s));

    // =========================================================
    // HEAD — wide, 3/4 front view, sunk into pillow
    // =========================================================
    ctx.fillStyle = skinColor;
    ctx.fillRect(Math.floor(drawX - 1 * s), Math.floor(drawY + 0), Math.floor(14 * s), Math.floor(14 * s));
    ctx.fillRect(Math.floor(drawX - 3 * s), Math.floor(drawY + 2 * s), Math.floor(18 * s), Math.floor(10 * s));

    // =========================================================
    // EARS — pointy goblin ears poking up/out
    // =========================================================
    ctx.fillStyle = skinDark;
    // Left ear — poking up-left
    ctx.fillRect(Math.floor(drawX - 4 * s), Math.floor(drawY - 1 * s), Math.floor(4 * s), Math.floor(4 * s));
    ctx.fillRect(Math.floor(drawX - 6 * s), Math.floor(drawY - 3 * s), Math.floor(3 * s), Math.floor(4 * s));
    ctx.fillRect(Math.floor(drawX - 8 * s), Math.floor(drawY - 4 * s), Math.floor(2 * s), Math.floor(2 * s));
    // Right ear — poking up-right
    ctx.fillRect(Math.floor(drawX + 12 * s), Math.floor(drawY - 1 * s), Math.floor(4 * s), Math.floor(4 * s));
    ctx.fillRect(Math.floor(drawX + 15 * s), Math.floor(drawY - 3 * s), Math.floor(3 * s), Math.floor(4 * s));
    ctx.fillRect(Math.floor(drawX + 17 * s), Math.floor(drawY - 4 * s), Math.floor(2 * s), Math.floor(2 * s));

    // =========================================================
    // NIGHTCAP — blue & white striped, draped over forehead
    // =========================================================
    // Band across top of head
    ctx.fillStyle = CAP_BLUE;
    ctx.fillRect(Math.floor(drawX - 2 * s), Math.floor(drawY - 2 * s), Math.floor(16 * s), Math.floor(5 * s));
    ctx.fillStyle = CAP_WHITE;
    ctx.fillRect(Math.floor(drawX - 2 * s), Math.floor(drawY - 1 * s), Math.floor(16 * s), Math.floor(2 * s));
    // Cap rising up and flopping to the right
    ctx.fillStyle = CAP_BLUE;
    ctx.fillRect(Math.floor(drawX + 6 * s), Math.floor(drawY - 6 * s), Math.floor(10 * s), Math.floor(5 * s));
    ctx.fillStyle = CAP_WHITE;
    ctx.fillRect(Math.floor(drawX + 6 * s), Math.floor(drawY - 5 * s), Math.floor(10 * s), Math.floor(2 * s));
    // Floppy tip drooping right
    ctx.fillStyle = CAP_BLUE_DARK;
    ctx.fillRect(Math.floor(drawX + 12 * s), Math.floor(drawY - 8 * s), Math.floor(8 * s), Math.floor(4 * s));
    ctx.fillStyle = CAP_WHITE;
    ctx.fillRect(Math.floor(drawX + 12 * s), Math.floor(drawY - 7 * s), Math.floor(8 * s), Math.floor(2 * s));
    ctx.fillStyle = CAP_BLUE;
    ctx.fillRect(Math.floor(drawX + 18 * s), Math.floor(drawY - 7 * s), Math.floor(5 * s), Math.floor(3 * s));
    // Pom-pom
    ctx.fillStyle = CAP_POM;
    ctx.fillRect(Math.floor(drawX + 21 * s), Math.floor(drawY - 8 * s), Math.floor(4 * s), Math.floor(4 * s));
    ctx.fillStyle = PILLOW_SHADOW;
    ctx.fillRect(Math.floor(drawX + 22 * s), Math.floor(drawY - 7 * s), Math.floor(2 * s), Math.floor(2 * s));

    // =========================================================
    // CLOSED EYES — two horizontal lines (lying on back, face up)
    // =========================================================
    ctx.fillStyle = EYE_PUPIL;
    // Left eye
    ctx.fillRect(Math.floor(drawX + 0), Math.floor(drawY + 4 * s), Math.floor(4 * s), Math.floor(2 * s));
    // Right eye
    ctx.fillRect(Math.floor(drawX + 7 * s), Math.floor(drawY + 4 * s), Math.floor(4 * s), Math.floor(2 * s));

    // =========================================================
    // NOSE — pointy snout poking left (toward viewer)
    // =========================================================
    ctx.fillStyle = skinDark;
    ctx.fillRect(Math.floor(drawX - 3 * s), Math.floor(drawY + 6 * s), Math.floor(4 * s), Math.floor(4 * s));
    ctx.fillRect(Math.floor(drawX - 6 * s), Math.floor(drawY + 7 * s), Math.floor(4 * s), Math.floor(3 * s));
    ctx.fillRect(Math.floor(drawX - 8 * s), Math.floor(drawY + 8 * s), Math.floor(2 * s), Math.floor(2 * s));

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
    // ── PICKAXE (Mining) ──
    if (state === 'MINING') {
      const swingAngle = Math.sin(this.animFrame * Math.PI / 2) * 1.2;
      ctx.save();
      ctx.translate(drawX + 30 * s, drawY + 4 * s);
      ctx.rotate(swingAngle);

      // Long handle
      ctx.fillStyle = TOOL_HANDLE;
      ctx.fillRect(-1 * s, 0, 4 * s, 24 * s);

      // Pickaxe head (T-shape, much bigger)
      ctx.fillStyle = TOOL_HEAD;
      ctx.fillRect(-8 * s, -4 * s, 18 * s, 7 * s);
      // Shine highlight — on the OUTER edge (right side, away from goblin)
      ctx.fillStyle = TOOL_SHINE;
      ctx.fillRect(5 * s, -4 * s, 5 * s, 7 * s);
      // Sharp tip
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(-10 * s, -2 * s, 3 * s, 3 * s);
      ctx.fillRect(10 * s, -2 * s, 3 * s, 3 * s);

      ctx.restore();
      return;
    }

    // ── MINE CART (shown during CART state or while walking with showCart) ──
    if (state === 'CART' || (this.showCart && state === 'WALKING')) {
      const cartBob = state === 'WALKING' ? Math.sin(this.animFrame * Math.PI / 2) * 2 * s : 0;
      const cartX = drawX + 28 * s;
      const cartY = drawY + 10 * s + cartBob;

      // Cart body
      ctx.fillStyle = '#78716c';
      ctx.fillRect(cartX, cartY, 24 * s, 16 * s);
      // Dark top rim
      ctx.fillStyle = '#57534e';
      ctx.fillRect(cartX - 1 * s, cartY - 1 * s, 26 * s, 3 * s);
      // Side detail
      ctx.fillStyle = '#a8a29e';
      ctx.fillRect(cartX + 1 * s, cartY + 3 * s, 22 * s, 2 * s);

      // Wheels
      ctx.fillStyle = '#44403c';
      ctx.fillRect(cartX + 2 * s, cartY + 16 * s, 6 * s, 6 * s);
      ctx.fillRect(cartX + 16 * s, cartY + 16 * s, 6 * s, 6 * s);
      // Wheel axle
      ctx.fillStyle = '#292524';
      ctx.fillRect(cartX + 4 * s, cartY + 18 * s, 2 * s, 2 * s);
      ctx.fillRect(cartX + 18 * s, cartY + 18 * s, 2 * s, 2 * s);

      // Ore chunks in cart
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(cartX + 4 * s, cartY - 5 * s, 8 * s, 6 * s);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cartX + 13 * s, cartY - 4 * s, 7 * s, 5 * s);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(cartX + 8 * s, cartY - 7 * s, 5 * s, 4 * s);

      // Arm pushing cart
      ctx.fillStyle = this.variant === 'boss' ? BOSS_SKIN : SKIN;
      ctx.fillRect(drawX + 24 * s, drawY + 12 * s, 6 * s, 4 * s);
      return;
    }

    // ── SCROLL (shown during explore / showScroll) ──
    if (this.showScroll && (state === 'IDLE' || state === 'WALKING')) {
      const scrollBob = state === 'WALKING' ? Math.sin(this.animFrame * Math.PI) * 1 * s : 0;
      const scrollX = drawX + 26 * s;
      const scrollY = drawY + 6 * s + scrollBob;

      // Scroll body
      ctx.fillStyle = SCROLL_BODY;
      ctx.fillRect(scrollX, scrollY, 12 * s, 16 * s);
      // Top and bottom rolls
      ctx.fillStyle = SCROLL_EDGE;
      ctx.fillRect(scrollX - 1 * s, scrollY - 1 * s, 14 * s, 3 * s);
      ctx.fillRect(scrollX - 1 * s, scrollY + 14 * s, 14 * s, 3 * s);
      // Text lines
      ctx.fillStyle = SCROLL_TEXT;
      ctx.fillRect(scrollX + 2 * s, scrollY + 4 * s, 8 * s, 1 * s);
      ctx.fillRect(scrollX + 2 * s, scrollY + 7 * s, 6 * s, 1 * s);
      ctx.fillRect(scrollX + 2 * s, scrollY + 10 * s, 7 * s, 1 * s);

      // Arm holding scroll
      ctx.fillStyle = this.variant === 'boss' ? BOSS_SKIN : SKIN;
      ctx.fillRect(drawX + 24 * s, drawY + 10 * s, 4 * s, 5 * s);
    }
  }
}
