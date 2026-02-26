import { Camera } from '../engine/Camera';
import { Scene } from './Scene';
import { Chest, DepositStyle } from './Chest';
import { Goblin } from '../entities/Goblin';
import { ParticleEmitter } from '../entities/ParticleEmitter';
import { mapToolToAction, toolDisplayName } from '../bridge/ActionMapper';
import { ScreenShake } from '../engine/ScreenShake';
import { ConnectionState, PickerState, ProjectInfo, SessionInfo, PixelQuestEvent } from '../../shared/types';
import { ThemeDef, THEME_OPTIONS } from '../theme/ThemeContract';

interface ActionQueueItem {
  toolName: string;
  toolInput: Record<string, unknown>;
}

// Activity feed entry
interface FeedEntry {
  text: string;
  age: number;
}

/** Target — generic "thing the character works on" (ore vein, fishing spot, tree, etc.) */
export interface Target {
  x: number;
  y: number;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D, scale: number): void;
}

/**
 * Base scene with all shared game logic.
 * Subclasses provide theme-specific visuals via abstract methods.
 */
export abstract class BaseScene implements Scene {
  protected theme: ThemeDef;
  protected targets: Target[] = [];
  protected chest: Chest;
  protected characters = new Map<string, Goblin>();
  protected particles = new ParticleEmitter();
  protected screenShake = new ScreenShake();
  protected stretch = 0;

  // Connection UX
  private connectionState: ConnectionState = 'disconnected';
  private overlayAlpha = 0;
  private showOverlay = false;

  // Action queue
  private actionQueue: ActionQueueItem[] = [];
  private processingAction = false;
  private nextTargetIndex = 0;

  // Activity feed
  private feed: FeedEntry[] = [];
  private readonly maxFeedEntries = 4;
  private readonly feedLifetime = 6000;

  // Character nickname generator
  private nicknameIndex = 1;

  // Subagent autonomous work
  private completingAgents = new Set<string>();

  // Ambient thinking behavior between tool events
  private sessionOngoing = false;
  private isThinking = false;
  private thinkingCooldown = 0;

  // Action pacing — smooth out burst-then-idle pattern
  private actionCooldown = 0;
  private postActionLinger = 0;

  // Text-output and error visuals
  private writingTimer = 0;
  private errorTimer = 0;

  // Refresh button flash feedback
  private refreshFlash = 0;

  // Canvas event listener cleanup
  private canvas: HTMLCanvasElement | null = null;
  private detached = false;
  private boundMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundMouseDown: ((e: MouseEvent) => void) | null = null;
  private boundMouseLeave: (() => void) | null = null;
  private boundWheel: ((e: WheelEvent) => void) | null = null;
  private cachedCanvasLeft = 0;
  private cachedCanvasTop = 0;

  // Theme picker (canvas-rendered dropdown)
  private themePickerOpen = false;
  private themePickerHover = -1;
  private mouseX = 0;
  private mouseY = 0;
  private canvasWidth = 0;
  private canvasHeight = 0;

  // Theme picker layout constants (CSS pixels)
  private static readonly PICKER_BTN_SIZE = 24;
  private static readonly PICKER_BTN_MARGIN = 8;
  private static readonly PICKER_OPTION_W = 110;
  private static readonly PICKER_OPTION_H = 26;
  private static readonly PICKER_PAD = 4;

  // Project/session picker
  private projectPickerOpen = false;
  private sessionPickerOpen = false;
  private projectPickerHover = -1;
  private sessionPickerHover = -1;
  private projectScrollOffset = 0;
  private sessionScrollOffset = 0;
  private projectList: ProjectInfo[] = [];
  private sessionList: SessionInfo[] = [];
  private isFollowingLatest = true;
  private currentProjectName: string | null = null;
  private currentSessionLabel: string | null = null;

  // Project/session picker layout constants (CSS pixels)
  private static readonly PROJ_BTN_W = 110;
  private static readonly SESS_BTN_W = 110;
  private static readonly PROJ_BTN_H = 24;
  private static readonly PROJ_GAP = 4;
  private static readonly DROP_W = 200;
  private static readonly DROP_OPTION_H = 32;
  private static readonly DROP_MAX_VISIBLE = 8;
  private static readonly DROP_PAD = 4;

  constructor(theme: ThemeDef) {
    this.theme = theme;

    const dp = theme.layout.depositPosition;
    const depositStyle: DepositStyle =
      theme.id === 'fishing' ? 'barrel' :
      theme.id === 'forest' ? 'logpile' : 'chest';
    this.chest = new Chest(dp.x, dp.y, depositStyle);

    // Create main character
    const spawn = theme.layout.spawnArea;
    const main = this.createCharacter(
      (spawn.xMin + spawn.xMax) / 2,
      spawn.y,
      'main',
    );
    main.nameLabel = theme.nicknames.bossName;
    main.roleLabel = 'Main';
    main.variant = 'boss';
    this.characters.set('main', main);
  }

  async load(): Promise<void> {}

  detachCanvas(): void {
    if (!this.canvas) return;
    if (this.boundMouseMove) this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    if (this.boundMouseDown) this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    if (this.boundMouseLeave) this.canvas.removeEventListener('mouseleave', this.boundMouseLeave);
    if (this.boundWheel) this.canvas.removeEventListener('wheel', this.boundWheel);
    this.canvas = null;
    this.detached = true;
    this.boundMouseMove = null;
    this.boundMouseDown = null;
    this.boundMouseLeave = null;
    this.boundWheel = null;
  }

  attachCanvas(canvas: HTMLCanvasElement): void {
    this.detachCanvas();
    this.canvas = canvas;
    const r0 = canvas.getBoundingClientRect();
    this.cachedCanvasLeft = r0.left;
    this.cachedCanvasTop = r0.top;

    this.boundMouseMove = (e: MouseEvent) => {
      this.mouseX = e.clientX - this.cachedCanvasLeft;
      this.mouseY = e.clientY - this.cachedCanvasTop;

      if (this.themePickerOpen) {
        this.themePickerHover = this.hitTestThemeOption(this.mouseX, this.mouseY);
      }
      if (this.projectPickerOpen) {
        this.projectPickerHover = this.hitTestProjectOption(this.mouseX, this.mouseY);
      }
      if (this.sessionPickerOpen) {
        this.sessionPickerHover = this.hitTestSessionOption(this.mouseX, this.mouseY);
      }
    };
    canvas.addEventListener('mousemove', this.boundMouseMove);

    this.boundMouseDown = (e: MouseEvent) => {
      const x = e.clientX - this.cachedCanvasLeft;
      const y = e.clientY - this.cachedCanvasTop;

      // Project/session picker buttons (top-left)
      if (this.hitTestProjectButton(x, y)) {
        this.projectPickerOpen = !this.projectPickerOpen;
        this.sessionPickerOpen = false;
        this.themePickerOpen = false;
        this.projectPickerHover = -1;
        this.projectScrollOffset = 0;
        if (this.projectPickerOpen) {
          window.postMessage({ type: 'request-projects' }, window.origin);
        }
        return;
      }

      if (this.hitTestSessionButton(x, y)) {
        this.sessionPickerOpen = !this.sessionPickerOpen;
        this.projectPickerOpen = false;
        this.themePickerOpen = false;
        this.sessionPickerHover = -1;
        this.sessionScrollOffset = 0;
        if (this.sessionPickerOpen) {
          window.postMessage({ type: 'request-sessions' }, window.origin);
        }
        return;
      }

      if (this.hitTestRefreshButton(x, y)) {
        this.projectPickerOpen = false;
        this.sessionPickerOpen = false;
        this.themePickerOpen = false;
        this.refreshFlash = 600;
        window.postMessage({ type: 'reconnect' }, window.origin);
        return;
      }

      // Project dropdown options
      if (this.projectPickerOpen) {
        const idx = this.hitTestProjectOption(x, y);
        if (idx >= 0) {
          const project = this.projectList[idx + this.projectScrollOffset];
          if (project) {
            this.currentProjectName = project.name;
            this.projectPickerOpen = false;
            window.postMessage({ type: 'select-project-dir', dirPath: project.dirPath }, window.origin);
            // Auto-open session picker after project selection
            setTimeout(() => {
              this.sessionPickerOpen = true;
              this.sessionPickerHover = -1;
              this.sessionScrollOffset = 0;
              window.postMessage({ type: 'request-sessions' }, window.origin);
            }, 300);
          }
          return;
        }
        this.projectPickerOpen = false;
        this.projectPickerHover = -1;
      }

      // Session dropdown options
      if (this.sessionPickerOpen) {
        const idx = this.hitTestSessionOption(x, y);
        if (idx >= 0) {
          const scrollIdx = idx + this.sessionScrollOffset;
          if (scrollIdx === 0) {
            // "Follow Latest"
            this.currentSessionLabel = 'Follow Latest';
            this.isFollowingLatest = true;
            window.postMessage({ type: 'follow-latest' }, window.origin);
          } else {
            const session = this.sessionList[scrollIdx - 1];
            if (session) {
              this.currentSessionLabel = trimSummary(session.summary) || session.slug || 'Session';
              this.isFollowingLatest = false;
              window.postMessage({ type: 'watch-session', filePath: session.filePath }, window.origin);
            }
          }
          this.sessionPickerOpen = false;
          return;
        }
        this.sessionPickerOpen = false;
        this.sessionPickerHover = -1;
      }

      // Theme picker button (top-right)
      if (this.hitTestPickerButton(x, y)) {
        this.themePickerOpen = !this.themePickerOpen;
        this.projectPickerOpen = false;
        this.sessionPickerOpen = false;
        this.themePickerHover = -1;
        return;
      }

      // Theme dropdown options
      if (this.themePickerOpen) {
        const idx = this.hitTestThemeOption(x, y);
        if (idx >= 0) {
          const option = THEME_OPTIONS[idx];
          if (option.id !== this.theme.id) {
            window.postMessage({ type: 'theme-change', themeId: option.id }, window.origin);
          }
          this.themePickerOpen = false;
          this.themePickerHover = -1;
          return;
        }
        this.themePickerOpen = false;
        this.themePickerHover = -1;
      }
    };
    canvas.addEventListener('mousedown', this.boundMouseDown);

    this.boundMouseLeave = () => {
      this.themePickerHover = -1;
      this.projectPickerHover = -1;
      this.sessionPickerHover = -1;
    };
    canvas.addEventListener('mouseleave', this.boundMouseLeave);

    this.boundWheel = (e: WheelEvent) => {
      if (this.projectPickerOpen) {
        const maxScroll = Math.max(0, this.projectList.length - BaseScene.DROP_MAX_VISIBLE);
        this.projectScrollOffset = Math.max(0, Math.min(
          this.projectScrollOffset + Math.sign(e.deltaY), maxScroll));
        e.preventDefault();
      } else if (this.sessionPickerOpen) {
        const totalItems = this.sessionList.length + 1; // +1 for "Follow Latest"
        const maxScroll = Math.max(0, totalItems - BaseScene.DROP_MAX_VISIBLE);
        this.sessionScrollOffset = Math.max(0, Math.min(
          this.sessionScrollOffset + Math.sign(e.deltaY), maxScroll));
        e.preventDefault();
      }
    };
    canvas.addEventListener('wheel', this.boundWheel, { passive: false });
  }

  private hitTestPickerButton(cssX: number, cssY: number): boolean {
    const size = BaseScene.PICKER_BTN_SIZE;
    const margin = BaseScene.PICKER_BTN_MARGIN;
    const btnX = this.canvasWidth - margin - size;
    const btnY = margin;
    return cssX >= btnX && cssX <= btnX + size && cssY >= btnY && cssY <= btnY + size;
  }

  private hitTestThemeOption(cssX: number, cssY: number): number {
    const btnSize = BaseScene.PICKER_BTN_SIZE;
    const margin = BaseScene.PICKER_BTN_MARGIN;
    const optW = BaseScene.PICKER_OPTION_W;
    const optH = BaseScene.PICKER_OPTION_H;
    const pad = BaseScene.PICKER_PAD;

    const dropX = this.canvasWidth - margin - optW;
    const dropY = margin + btnSize + 4;

    for (let i = 0; i < THEME_OPTIONS.length; i++) {
      const optY = dropY + pad + i * optH;
      if (cssX >= dropX && cssX <= dropX + optW && cssY >= optY && cssY <= optY + optH) {
        return i;
      }
    }
    return -1;
  }

  // ── Project/session picker hit testing ──

  private hitTestProjectButton(cssX: number, cssY: number): boolean {
    const m = BaseScene.PICKER_BTN_MARGIN;
    return cssX >= m && cssX <= m + BaseScene.PROJ_BTN_W
        && cssY >= m && cssY <= m + BaseScene.PROJ_BTN_H;
  }

  private hitTestSessionButton(cssX: number, cssY: number): boolean {
    const m = BaseScene.PICKER_BTN_MARGIN;
    const x = m + BaseScene.PROJ_BTN_W + BaseScene.PROJ_GAP;
    return cssX >= x && cssX <= x + BaseScene.SESS_BTN_W
        && cssY >= m && cssY <= m + BaseScene.PROJ_BTN_H;
  }

  private hitTestRefreshButton(cssX: number, cssY: number): boolean {
    const m = BaseScene.PICKER_BTN_MARGIN;
    const x = m + BaseScene.PROJ_BTN_W + BaseScene.PROJ_GAP + BaseScene.SESS_BTN_W + BaseScene.PROJ_GAP;
    const size = 16;
    const btnY = m + (BaseScene.PROJ_BTN_H - size) / 2;
    return cssX >= x && cssX <= x + size && cssY >= btnY && cssY <= btnY + size;
  }

  private hitTestProjectOption(cssX: number, cssY: number): number {
    const m = BaseScene.PICKER_BTN_MARGIN;
    const dropX = m;
    const dropY = m + BaseScene.PROJ_BTN_H + 2;
    const dropW = BaseScene.DROP_W;
    const optH = BaseScene.DROP_OPTION_H;
    const pad = BaseScene.DROP_PAD;
    const visible = Math.min(this.projectList.length, BaseScene.DROP_MAX_VISIBLE);

    for (let i = 0; i < visible; i++) {
      const optY = dropY + pad + i * optH;
      if (cssX >= dropX && cssX <= dropX + dropW && cssY >= optY && cssY <= optY + optH) {
        return i;
      }
    }
    return -1;
  }

  private hitTestSessionOption(cssX: number, cssY: number): number {
    const m = BaseScene.PICKER_BTN_MARGIN;
    const dropX = m + BaseScene.PROJ_BTN_W + BaseScene.PROJ_GAP;
    const dropY = m + BaseScene.PROJ_BTN_H + 2;
    const dropW = BaseScene.DROP_W;
    const optH = BaseScene.DROP_OPTION_H;
    const pad = BaseScene.DROP_PAD;
    const totalItems = this.sessionList.length + 1; // +1 for "Follow Latest"
    const visible = Math.min(totalItems, BaseScene.DROP_MAX_VISIBLE);

    for (let i = 0; i < visible; i++) {
      const optY = dropY + pad + i * optH;
      if (cssX >= dropX && cssX <= dropX + dropW && cssY >= optY && cssY <= optY + optH) {
        return i;
      }
    }
    return -1;
  }

  // ── Abstract methods — subclasses provide visuals ──

  /** Create targets from theme positions. Called by subclass constructor. */
  protected abstract createTargets(): void;
  /** Create atmosphere elements. Called by subclass constructor. */
  protected abstract createAtmosphere(): void;
  /** Update atmosphere elements each frame. */
  protected abstract updateAtmosphere(dt: number): void;
  /** Render background. */
  protected abstract renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void;
  /** Render atmosphere structure (behind characters). */
  protected abstract renderAtmosphereBack(ctx: CanvasRenderingContext2D, scale: number): void;
  /** Render atmosphere front layer (in front of characters). */
  protected abstract renderAtmosphereFront(ctx: CanvasRenderingContext2D, scale: number): void;
  /** Render glow pass (additive blending). */
  protected abstract renderGlow(ctx: CanvasRenderingContext2D, scale: number): void;
  /** Handle resize for atmosphere elements. */
  protected abstract resizeAtmosphere(w: number, h: number): void;
  /** Reposition theme elements when viewport stretch changes. */
  protected abstract applyStretch(stretch: number): void;

  /** Hook rendered after characters but before deposit. Override for z-order fixes (e.g. dock over boats). */
  protected renderBeforeDeposit(_ctx: CanvasRenderingContext2D, _scale: number): void {}

  /** Factory for creating characters. Override for theme-specific characters. */
  protected createCharacter(x: number, y: number, id: string): Goblin {
    return new Goblin(x, y, this.particles, id);
  }

  // ── Shared update/render ──

  update(dt: number): void {
    for (const target of this.targets) target.update(dt);
    this.chest.update(dt);
    for (const char of this.characters.values()) char.update(dt);
    this.particles.update(dt);
    this.screenShake.update(dt);
    this.updateAtmosphere(dt);

    // Tick pacing timers
    if (this.actionCooldown > 0) this.actionCooldown -= dt;
    if (this.postActionLinger > 0) this.postActionLinger -= dt;

    // Writing visual timer
    if (this.writingTimer > 0) {
      this.writingTimer -= dt;
      if (this.writingTimer <= 0) {
        const main = this.characters.get('main');
        if (main && main.actionLabel === 'Writing...') {
          main.actionLabel = '';
          main.showScroll = false;
        }
      }
    }

    // Error reaction timer
    if (this.errorTimer > 0) {
      this.errorTimer -= dt;
      if (this.errorTimer <= 0) {
        const main = this.characters.get('main');
        if (main && main.actionLabel === 'Error!') {
          main.actionLabel = '';
        }
      }
    }

    if (this.refreshFlash > 0) this.refreshFlash -= dt;

    // Process next action only when cooldowns are clear
    if (
      !this.processingAction &&
      this.actionQueue.length > 0 &&
      this.actionCooldown <= 0 &&
      this.postActionLinger <= 0
    ) {
      this.processNextAction();
    }

    // Ambient thinking behavior between tool events
    if (this.thinkingCooldown > 0) this.thinkingCooldown -= dt;

    if (
      this.sessionOngoing &&
      !this.processingAction &&
      this.actionQueue.length === 0 &&
      !this.isThinking &&
      this.thinkingCooldown <= 0 &&
      this.connectionState === 'connected'
    ) {
      const main = this.characters.get('main');
      if (main && main.getState() === 'IDLE') {
        this.startThinkingBehavior();
      }
    }

    for (const entry of this.feed) entry.age += dt;
    this.feed = this.feed.filter((e) => e.age < this.feedLifetime);

    if (this.showOverlay && this.connectionState === 'connected') {
      this.overlayAlpha = Math.max(0, this.overlayAlpha - dt / 500);
      if (this.overlayAlpha <= 0) this.showOverlay = false;
    }
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const w = camera.width;
    const h = camera.height;
    const scale = camera.getScale();
    const offsetX = camera.getOffsetX();
    const gameW = camera.LOGICAL_WIDTH * scale;

    // 0. Fill full canvas with theme background
    ctx.fillStyle = this.theme.backgroundColor;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    // 1. Offset game world horizontally + screen shake
    const shakeX = this.screenShake.active ? this.screenShake.offsetX * scale : 0;
    const shakeY = this.screenShake.active ? this.screenShake.offsetY * scale : 0;
    ctx.translate(offsetX + shakeX, shakeY);

    // 2. Background (full viewport height)
    this.renderBackground(ctx, gameW, h);

    // 3. Atmosphere back layer
    this.renderAtmosphereBack(ctx, scale);

    // 4. Targets
    for (const target of this.targets) target.render(ctx, scale);

    // 5. Characters (sorted by y for depth)
    const sorted = [...this.characters.values()].sort((a, b) => a.y - b.y);
    for (const char of sorted) char.renderShadow(ctx, scale);
    for (const char of sorted) char.render(ctx, scale);

    // 6. Before-deposit layer (e.g. dock surface over boats)
    this.renderBeforeDeposit(ctx, scale);

    // 7. Deposit (chest/barrel)
    this.chest.render(ctx, scale);

    // 8. Atmosphere front layer
    this.renderAtmosphereFront(ctx, scale);

    // 9. Particles
    this.particles.render(ctx, scale);

    // 10. Glow pass
    ctx.globalCompositeOperation = 'lighter';
    this.renderGlow(ctx, scale);
    this.chest.renderGlow(ctx, scale);
    ctx.globalCompositeOperation = 'source-over';

    // 11. Feed (within game world)
    const feedY = this.chest.getBottomY(scale) + 6 * scale;
    this.renderFeed(ctx, gameW, scale, feedY);

    ctx.restore();

    // 12. Overlay (covers full canvas, outside translate)
    if (this.showOverlay || this.connectionState !== 'connected') {
      this.renderOverlay(ctx, w, h, scale);
    }

    // 13. Project/session picker (top-left HUD)
    this.renderProjectSessionPicker(ctx, w, h);

    // 14. Theme picker (top-right, always on top)
    this.renderThemePicker(ctx, w, h);
  }

  // ── Event handlers ──

  handleToolCall(toolName: string, toolInput: Record<string, unknown>): void {
    this.actionQueue.push({ toolName, toolInput });
    this.chest.incrementProgress();
    const display = toolDisplayName(toolName, toolInput);
    this.addFeedEntry(display);

    // Real action interrupts thinking and clears visual states
    this.isThinking = false;
    this.thinkingCooldown = 0;
    this.writingTimer = 0;
    this.errorTimer = 0;
  }

  handleSubagentSpawn(agentId: string, description?: string): void {
    const spawn = this.theme.layout.spawnArea;
    const x = spawn.xMin + Math.random() * (spawn.xMax - spawn.xMin);
    const char = this.createCharacter(x, spawn.y, agentId);
    const nickname = this.nextNickname();
    char.nameLabel = nickname;
    char.roleLabel = description || '';
    char.playPoofIn();
    this.characters.set(agentId, char);
    this.addFeedEntry(`${nickname} joined (${description || 'agent'})`);

    setTimeout(() => this.subagentWorkLoop(agentId), 600);
  }

  handleSubagentComplete(agentId: string): void {
    this.completingAgents.add(agentId);
    const char = this.characters.get(agentId);
    if (!char) return;

    char.actionLabel = 'Done!';
    this.addFeedEntry(`Agent done: ${agentId}`);

    const state = char.getState();
    if (state === 'IDLE' || state === 'WALKING' || state === 'SLEEPING') {
      this.finishSubagentComplete(agentId);
    }
  }

  handleSessionEnd(): void {
    this.actionQueue = [];
    this.processingAction = false;
    this.sessionOngoing = false;
    this.isThinking = false;
    this.actionCooldown = 0;
    this.postActionLinger = 0;
    this.writingTimer = 0;
    this.errorTimer = 0;

    for (const [id, char] of this.characters) {
      // Only affect the main character — subagents are independent and
      // continue their work loops until their own subagent-complete arrives.
      if (id !== 'main') continue;

      char.showScroll = false;
      char.showCart = false;
      char.actionLabel = 'Done!';
      char.nameLabel = '';
      char.roleLabel = '';
      char.forceIdle();
      char.transitionTo('CELEBRATING');
    }
    this.chest.completeProgress();
    this.addFeedEntry('Session complete!');
  }

  handleSessionIdle(): void {
    this.actionQueue = [];
    this.processingAction = false;
    this.sessionOngoing = false;
    this.isThinking = false;
    this.actionCooldown = 0;
    this.postActionLinger = 0;
    this.writingTimer = 0;
    this.errorTimer = 0;

    // Only sleep the main character — subagents run independently and their
    // work loops should continue until a subagent-complete event arrives.
    const main = this.characters.get('main');
    if (main) {
      main.forceIdle();
      main.sleep();
    }
  }

  handleSessionResume(): void {
    // Resume from idle — wake main character only.
    // Subagent characters were never put to sleep, so their work loops
    // are still running and don't need restarting.
    this.sessionOngoing = true;
    this.isThinking = false;
    this.actionCooldown = 0;
    this.postActionLinger = 0;
    this.writingTimer = 0;
    this.errorTimer = 0;

    const main = this.characters.get('main');
    if (main && main.getState() === 'SLEEPING') main.wake();
  }

  handleSessionStart(): void {
    this.completingAgents.clear();
    this.nicknameIndex = 1;

    for (const [id] of this.characters) {
      if (id !== 'main') {
        this.characters.delete(id);
      }
    }

    const main = this.characters.get('main');
    if (main) {
      main.forceIdle();
      main.actionLabel = '';
      main.nameLabel = this.theme.nicknames.bossName;
      main.roleLabel = 'Main';
      main.showScroll = false;
      main.showCart = false;
    }

    this.chest.resetProgress();
    this.actionQueue = [];
    this.processingAction = false;
    this.feed = [];
    this.addFeedEntry('Session started');

    this.sessionOngoing = true;
    this.isThinking = false;
    this.thinkingCooldown = 0;
    this.actionCooldown = 0;
    this.postActionLinger = 0;
    this.writingTimer = 0;
    this.errorTimer = 0;
  }

  handleConnectionState(state: ConnectionState): void {
    this.connectionState = state;

    if (state === 'connected') {
      this.showOverlay = false;
      this.overlayAlpha = 0;
      for (const char of this.characters.values()) {
        if (char.getState() === 'SLEEPING') char.wake();
      }
    } else if (state === 'no-server' || state === 'disconnected') {
      this.showOverlay = true;
      this.overlayAlpha = 0.7;
      for (const char of this.characters.values()) char.sleep();
    }
  }

  handleThinking(): void {
    if (
      this.sessionOngoing &&
      !this.processingAction &&
      this.actionQueue.length === 0 &&
      !this.isThinking &&
      this.connectionState === 'connected'
    ) {
      this.thinkingCooldown = 0;
      const main = this.characters.get('main');
      if (main && main.getState() === 'IDLE') {
        this.startThinkingBehavior();
      }
    }
  }

  handleTextOutput(): void {
    if (this.processingAction) return;

    const main = this.characters.get('main');
    if (!main) return;

    this.isThinking = false;
    this.writingTimer = 1500;
    main.showScroll = true;
    main.showCart = false;
    main.actionLabel = 'Writing...';

    if (main.getState() === 'IDLE') {
      const jitter = (Math.random() - 0.5) * 30;
      main.walkTo(main.x + jitter, main.y, () => {});
    }
  }

  handleToolError(_toolUseId: string): void {
    const main = this.characters.get('main');
    if (!main) return;

    const state = main.getState();
    if (state !== 'IDLE' && state !== 'WALKING') return;

    this.errorTimer = 1200;
    this.isThinking = false;
    main.actionLabel = 'Error!';
    main.showScroll = false;
    main.showCart = false;

    if (state === 'WALKING') {
      main.forceIdle();
    }

    this.addFeedEntry('Tool error');
  }

  handleDataResponse(response: PixelQuestEvent): void {
    if (response.type === 'project-list') {
      this.projectList = response.projects;
    } else if (response.type === 'session-list') {
      this.sessionList = response.sessions;
      this.isFollowingLatest = response.isFollowingLatest;
      const active = response.sessions.find((s) => s.isActive);
      if (active) {
        this.currentSessionLabel = trimSummary(active.summary) || active.slug || 'Session';
      }
    }
  }

  getPickerState(): PickerState {
    return {
      projectList: this.projectList,
      sessionList: this.sessionList,
      currentProjectName: this.currentProjectName,
      currentSessionLabel: this.currentSessionLabel,
      isFollowingLatest: this.isFollowingLatest,
    };
  }

  setPickerState(state: PickerState): void {
    this.projectList = state.projectList;
    this.sessionList = state.sessionList;
    this.currentProjectName = state.currentProjectName;
    this.currentSessionLabel = state.currentSessionLabel;
    this.isFollowingLatest = state.isFollowingLatest;
  }

  resize(width: number, height: number): void {
    const scale = Math.min(width / 300, height / 400);
    const stretch = Math.max(0, height / scale - 400);
    this.stretch = stretch;

    // Keep canvasWidth/Height and cached position in sync so picker stays correct on resize
    this.canvasWidth = width;
    this.canvasHeight = height;
    if (this.canvas) {
      const r = this.canvas.getBoundingClientRect();
      this.cachedCanvasLeft = r.left;
      this.cachedCanvasTop = r.top;
    }

    // Shift deposit down by stretch so it stays at the bottom
    const dp = this.theme.layout.depositPosition;
    this.chest.y = dp.y + stretch;

    this.applyStretch(stretch);
    this.resizeAtmosphere(300 * scale, height);
  }

  // ── Private helpers ──

  private nextNickname(): string {
    const prefixes = this.theme.nicknames.prefixes;
    const suffixes = this.theme.nicknames.suffixes;
    const p = prefixes[this.nicknameIndex % prefixes.length];
    const s = suffixes[Math.floor(this.nicknameIndex / prefixes.length) % suffixes.length];
    this.nicknameIndex++;
    return `${p}${s}`;
  }

  private addFeedEntry(text: string): void {
    this.feed.push({ text, age: 0 });
    if (this.feed.length > this.maxFeedEntries) {
      this.feed.shift();
    }
  }

  private subagentWorkLoop(agentId: string): void {
    if (this.detached) return;
    if (!this.characters.has(agentId) || this.completingAgents.has(agentId)) {
      if (this.completingAgents.has(agentId)) this.finishSubagentComplete(agentId);
      return;
    }

    const char = this.characters.get(agentId)!;
    const target = this.targets[Math.floor(Math.random() * this.targets.length)];
    const willMine = Math.random() > 0.4;

    char.showScroll = !willMine;
    char.showCart = false;
    char.actionLabel = willMine ? 'Working...' : 'Researching...';

    char.walkTo(target.x - 16 + (Math.random() - 0.5) * 20, target.y + 18, () => {
      if (!this.characters.has(agentId) || this.completingAgents.has(agentId)) {
        if (this.completingAgents.has(agentId)) this.finishSubagentComplete(agentId);
        return;
      }

      char.showScroll = false;

      if (willMine) {
        char.actionLabel = `${this.theme.labels.action1}!`;
        char.transitionTo('MINING', () => {
          if (!this.characters.has(agentId) || this.completingAgents.has(agentId)) {
            if (this.completingAgents.has(agentId)) this.finishSubagentComplete(agentId);
            return;
          }
          char.actionLabel = '';
          setTimeout(() => this.subagentWorkLoop(agentId), 400);
        });
      } else {
        char.actionLabel = 'Reading...';
        setTimeout(() => {
          if (this.detached) return;
          if (!this.characters.has(agentId) || this.completingAgents.has(agentId)) {
            if (this.completingAgents.has(agentId)) this.finishSubagentComplete(agentId);
            return;
          }
          char.actionLabel = '';
          setTimeout(() => this.subagentWorkLoop(agentId), 400);
        }, 1000);
      }
    });
  }

  private finishSubagentComplete(agentId: string): void {
    const char = this.characters.get(agentId);
    if (!char) {
      this.completingAgents.delete(agentId);
      return;
    }

    char.showScroll = false;
    char.showCart = true;
    char.actionLabel = 'Done!';
    const chestPos = this.chest.getPosition();
    char.walkTo(chestPos.x - 16, chestPos.y - 30, () => {
      char.showCart = false;
      this.chest.peek(1200);
      char.transitionTo('DEPOSITING', () => {
        this.characters.delete(agentId);
        this.completingAgents.delete(agentId);
        this.chest.incrementProgress();
      });
    });
  }

  private processNextAction(): void {
    if (this.actionQueue.length === 0) {
      this.processingAction = false;
      return;
    }

    this.processingAction = true;
    const action = this.actionQueue.shift()!;
    const goblinAction = mapToolToAction(action.toolName);
    const char = this.characters.get('main') || this.characters.values().next().value!;
    const label = toolActionLabel(action.toolName);
    char.actionLabel = label;

    switch (goblinAction) {
      case 'explore': {
        const target = this.getNextTarget();
        char.showScroll = true;
        char.showCart = false;
        char.walkTo(target.x - 16, target.y + 18, () => {
          char.actionLabel = label;
          setTimeout(() => {
            char.actionLabel = '';
            char.showScroll = false;
            this.processingAction = false;
            this.actionCooldown = 400 + Math.random() * 200;
            this.postActionLinger = 200 + Math.random() * 200;
          }, 1200);
        });
        break;
      }
      case 'mine': {
        const target = this.getNextTarget();
        char.showScroll = false;
        char.showCart = false;
        char.walkTo(target.x - 16, target.y + 18, () => {
          char.actionLabel = `${this.theme.labels.action1}!`;
          this.screenShake.trigger(3, 200);
          this.particles.emitDebris(target.x, target.y);
          char.transitionTo('MINING', () => {
            char.actionLabel = '';
            this.processingAction = false;
            this.actionCooldown = 400 + Math.random() * 200;
            this.postActionLinger = 200 + Math.random() * 200;
          });
        });
        break;
      }
      case 'cart': {
        char.showScroll = false;
        char.showCart = true;
        char.actionLabel = 'Running...';
        const chestPos = this.chest.getPosition();
        char.walkTo(chestPos.x - 16, chestPos.y - 30, () => {
          char.showCart = false;
          char.actionLabel = 'Depositing';
          this.chest.peek(1200);
          char.transitionTo('DEPOSITING', () => {
            char.actionLabel = '';
            this.processingAction = false;
            this.actionCooldown = 400 + Math.random() * 200;
            this.postActionLinger = 200 + Math.random() * 200;
          });
        });
        break;
      }
      default:
        char.actionLabel = '';
        this.processingAction = false;
        break;
    }
  }

  private getNextTarget(): Target {
    const target = this.targets[this.nextTargetIndex % this.targets.length];
    this.nextTargetIndex++;
    return target;
  }

  private startThinkingBehavior(): void {
    const main = this.characters.get('main');
    if (!main) return;

    this.isThinking = true;
    main.showScroll = true;
    main.showCart = false;
    main.actionLabel = 'Thinking...';

    const target = this.getNextTarget();
    main.walkTo(target.x - 16 + (Math.random() - 0.5) * 20, target.y + 18, () => {
      if (!this.isThinking) {
        main.showScroll = false;
        main.actionLabel = '';
        return;
      }
      // Pause 0.8-2s at target before next walk
      this.thinkingCooldown = 800 + Math.random() * 1200;
      this.isThinking = false;
      main.showScroll = false;
      main.actionLabel = '';
    });
  }

  private renderFeed(ctx: CanvasRenderingContext2D, w: number, scale: number, startY: number): void {
    if (this.feed.length === 0) return;

    const fontSize = Math.max(9, Math.floor(10 * scale));
    const lineHeight = fontSize + 4 * scale;
    const pad = 6 * scale;
    const totalHeight = this.feed.length * lineHeight + pad * 2;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, startY, w, totalHeight);

    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'left';

    const textX = pad + 8 * scale;
    const maxTextW = w - textX - pad;

    for (let i = 0; i < this.feed.length; i++) {
      const entry = this.feed[i];
      const alpha = Math.max(0, 1 - entry.age / this.feedLifetime);
      ctx.globalAlpha = alpha;

      const rowY = startY + pad + i * lineHeight;
      const textBaseline = rowY + fontSize;
      // Center the square vertically with the text
      const squareSize = 4 * scale;
      const squareY = textBaseline - fontSize * 0.65 - squareSize / 2;

      ctx.fillStyle = '#4ade80';
      ctx.fillRect(pad, squareY, squareSize, squareSize);

      // Truncate text to fit canvas width
      ctx.fillStyle = '#e2e8f0';
      let text = entry.text;
      if (maxTextW > 0 && ctx.measureText(text).width > maxTextW) {
        while (text.length > 1 && ctx.measureText(text + '…').width > maxTextW) {
          text = text.slice(0, -1);
        }
        text += '…';
      }
      ctx.fillText(text, textX, textBaseline);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';
  }

  private renderProjectSessionPicker(ctx: CanvasRenderingContext2D, w: number, _h: number): void {
    if (this.canvasWidth === 0) return;

    const ratio = w / this.canvasWidth;
    const margin = BaseScene.PICKER_BTN_MARGIN * ratio;
    const btnH = BaseScene.PROJ_BTN_H * ratio;
    const projW = BaseScene.PROJ_BTN_W * ratio;
    const sessW = BaseScene.SESS_BTN_W * ratio;
    const gap = BaseScene.PROJ_GAP * ratio;
    const fontSize = Math.max(10, Math.floor(11 * ratio));

    // ── Project button ──
    const projX = margin;
    const projY = margin;

    ctx.fillStyle = this.projectPickerOpen ? 'rgba(74,222,128,0.15)' : 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(projX, projY, projW, btnH, 3 * ratio);
    ctx.fill();
    ctx.strokeStyle = this.projectPickerOpen ? '#4ade80' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = ratio;
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'left';
    const projLabel = truncateToWidth(ctx, this.currentProjectName || 'Project', projW - 16 * ratio);
    ctx.fillText(projLabel, projX + 4 * ratio, projY + btnH / 2 + fontSize / 3);

    // Down chevron
    this.renderChevron(ctx, projX + projW - 10 * ratio, projY + btnH / 2, 3 * ratio, ratio);

    // ── Session button ──
    const sessX = projX + projW + gap;

    ctx.fillStyle = this.sessionPickerOpen ? 'rgba(74,222,128,0.15)' : 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(sessX, projY, sessW, btnH, 3 * ratio);
    ctx.fill();
    ctx.strokeStyle = this.sessionPickerOpen ? '#4ade80' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = ratio;
    ctx.stroke();

    ctx.fillStyle = this.currentProjectName ? '#e2e8f0' : '#64748b';
    ctx.font = `${fontSize}px monospace`;
    const sessLabel = truncateToWidth(ctx, this.currentSessionLabel || 'Session', sessW - 16 * ratio);
    ctx.fillText(sessLabel, sessX + 4 * ratio, projY + btnH / 2 + fontSize / 3);

    this.renderChevron(ctx, sessX + sessW - 10 * ratio, projY + btnH / 2, 3 * ratio, ratio);

    // ── Refresh button (circular arrow) ──
    const refSize = 16 * ratio;
    const refX = sessX + sessW + gap;
    const refY = projY + (btnH - refSize) / 2;

    // Flash highlight on click, then settle to connection-state color
    const flashing = this.refreshFlash > 0;
    ctx.fillStyle = flashing ? 'rgba(74,222,128,0.25)' : 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(refX, refY, refSize, refSize, 3 * ratio);
    ctx.fill();
    if (flashing) {
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = ratio;
      ctx.stroke();
    }

    const refCX = refX + refSize / 2;
    const refCY = refY + refSize / 2;
    const refR = 4 * ratio;

    // Icon color reflects connection state
    const iconColor = flashing ? '#4ade80'
      : this.connectionState === 'connected' ? '#4ade80'
      : this.connectionState === 'connecting' ? '#facc15'
      : '#94a3b8';

    ctx.strokeStyle = iconColor;
    ctx.lineWidth = 1.5 * ratio;
    ctx.beginPath();
    ctx.arc(refCX, refCY, refR, -Math.PI * 0.8, Math.PI * 0.6);
    ctx.stroke();

    // Arrowhead
    const arrowAngle = Math.PI * 0.6;
    const ax = refCX + Math.cos(arrowAngle) * refR;
    const ay = refCY + Math.sin(arrowAngle) * refR;
    ctx.fillStyle = iconColor;
    ctx.beginPath();
    ctx.moveTo(ax - 2 * ratio, ay - 2.5 * ratio);
    ctx.lineTo(ax + 2.5 * ratio, ay);
    ctx.lineTo(ax - 1 * ratio, ay + 2 * ratio);
    ctx.fill();

    // ── Dropdowns ──
    if (this.projectPickerOpen) {
      this.renderProjectDropdown(ctx, projX, projY + btnH + 2 * ratio, ratio, fontSize);
    }
    if (this.sessionPickerOpen) {
      this.renderSessionDropdown(ctx, sessX, projY + btnH + 2 * ratio, ratio, fontSize);
    }

    ctx.textAlign = 'start';
  }

  private renderChevron(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, lw: number): void {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x - size, y - size / 2);
    ctx.lineTo(x, y + size / 2);
    ctx.lineTo(x + size, y - size / 2);
    ctx.stroke();
  }

  private renderProjectDropdown(
    ctx: CanvasRenderingContext2D, dropX: number, dropY: number, ratio: number, fontSize: number,
  ): void {
    const dropW = BaseScene.DROP_W * ratio;
    const optH = BaseScene.DROP_OPTION_H * ratio;
    const pad = BaseScene.DROP_PAD * ratio;
    const visible = Math.min(this.projectList.length, BaseScene.DROP_MAX_VISIBLE);
    const dropH = visible * optH + pad * 2;

    if (this.projectList.length === 0) {
      // Empty state
      ctx.fillStyle = 'rgba(15,15,25,0.92)';
      ctx.beginPath();
      ctx.roundRect(dropX, dropY, dropW, optH + pad * 2, 4 * ratio);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = ratio;
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('No projects found', dropX + pad * 2, dropY + pad + optH / 2 + fontSize / 3);
      return;
    }

    ctx.fillStyle = 'rgba(15,15,25,0.92)';
    ctx.beginPath();
    ctx.roundRect(dropX, dropY, dropW, dropH, 4 * ratio);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = ratio;
    ctx.stroke();

    const smallFont = Math.max(9, Math.floor(9 * ratio));

    for (let i = 0; i < visible; i++) {
      const project = this.projectList[i + this.projectScrollOffset];
      if (!project) break;
      const optY = dropY + pad + i * optH;

      // Hover highlight
      if (i === this.projectPickerHover) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(dropX + pad, optY, dropW - pad * 2, optH);
      }

      // Current project highlight
      if (project.name === this.currentProjectName) {
        ctx.fillStyle = 'rgba(74,222,128,0.15)';
        ctx.fillRect(dropX + pad, optY, dropW - pad * 2, optH);
      }

      // Project name
      ctx.fillStyle = project.name === this.currentProjectName ? '#4ade80' : '#e2e8f0';
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'left';
      const name = truncateToWidth(ctx, project.name, dropW * 0.55);
      ctx.fillText(name, dropX + pad * 2, optY + optH / 2 + fontSize / 3 - 2 * ratio);

      // Meta: session count + relative time
      ctx.fillStyle = '#64748b';
      ctx.font = `${smallFont}px monospace`;
      const meta = `${project.sessionCount}s · ${formatRelativeTime(project.latestSessionAt)}`;
      ctx.fillText(meta, dropX + pad * 2, optY + optH / 2 + fontSize / 3 + smallFont);
    }

    // Scroll indicators
    if (this.projectScrollOffset > 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = `${smallFont}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('▲', dropX + dropW / 2, dropY + pad + smallFont / 2);
    }
    if (this.projectScrollOffset + visible < this.projectList.length) {
      ctx.fillStyle = '#64748b';
      ctx.font = `${smallFont}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('▼', dropX + dropW / 2, dropY + dropH - pad / 2);
    }
  }

  private renderSessionDropdown(
    ctx: CanvasRenderingContext2D, dropX: number, dropY: number, ratio: number, fontSize: number,
  ): void {
    const dropW = BaseScene.DROP_W * ratio;
    const optH = BaseScene.DROP_OPTION_H * ratio;
    const pad = BaseScene.DROP_PAD * ratio;
    const totalItems = this.sessionList.length + 1; // +1 for "Follow Latest"
    const visible = Math.min(totalItems, BaseScene.DROP_MAX_VISIBLE);
    const dropH = visible * optH + pad * 2;

    ctx.fillStyle = 'rgba(15,15,25,0.92)';
    ctx.beginPath();
    ctx.roundRect(dropX, dropY, dropW, dropH, 4 * ratio);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = ratio;
    ctx.stroke();

    const smallFont = Math.max(9, Math.floor(9 * ratio));

    for (let i = 0; i < visible; i++) {
      const scrollIdx = i + this.sessionScrollOffset;
      const optY = dropY + pad + i * optH;

      // Hover highlight
      if (i === this.sessionPickerHover) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(dropX + pad, optY, dropW - pad * 2, optH);
      }

      if (scrollIdx === 0) {
        // "Follow Latest" row
        if (this.isFollowingLatest) {
          ctx.fillStyle = 'rgba(74,222,128,0.15)';
          ctx.fillRect(dropX + pad, optY, dropW - pad * 2, optH);
        }
        ctx.fillStyle = this.isFollowingLatest ? '#4ade80' : '#e2e8f0';
        ctx.font = `${fontSize}px monospace`;
        ctx.textAlign = 'left';
        ctx.fillText('▶ Follow Latest', dropX + pad * 2, optY + optH / 2 + fontSize / 3);
      } else {
        const session = this.sessionList[scrollIdx - 1];
        if (!session) break;

        // Active session highlight
        if (session.isActive && !this.isFollowingLatest) {
          ctx.fillStyle = 'rgba(74,222,128,0.15)';
          ctx.fillRect(dropX + pad, optY, dropW - pad * 2, optH);
        }

        // Session label
        const label = trimSummary(session.summary) || session.slug || 'Session';
        ctx.fillStyle = session.isActive && !this.isFollowingLatest ? '#4ade80' : '#e2e8f0';
        ctx.font = `${fontSize}px monospace`;
        ctx.textAlign = 'left';
        const name = truncateToWidth(ctx, label, dropW * 0.65);
        ctx.fillText(name, dropX + pad * 2, optY + optH / 2 + fontSize / 3 - 2 * ratio);

        // Timestamp
        ctx.fillStyle = '#64748b';
        ctx.font = `${smallFont}px monospace`;
        const time = formatRelativeTime(new Date(session.timestamp).getTime());
        ctx.fillText(time, dropX + pad * 2, optY + optH / 2 + fontSize / 3 + smallFont);
      }
    }

    // Scroll indicators
    if (this.sessionScrollOffset > 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = `${smallFont}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('▲', dropX + dropW / 2, dropY + pad + smallFont / 2);
    }
    if (this.sessionScrollOffset + visible < totalItems) {
      ctx.fillStyle = '#64748b';
      ctx.font = `${smallFont}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('▼', dropX + dropW / 2, dropY + dropH - pad / 2);
    }
  }

  private renderThemePicker(ctx: CanvasRenderingContext2D, w: number, _h: number): void {
    if (this.canvasWidth === 0) return;

    const ratio = w / this.canvasWidth;
    const size = BaseScene.PICKER_BTN_SIZE * ratio;
    const margin = BaseScene.PICKER_BTN_MARGIN * ratio;

    // ── Button (top-right corner, 3 colored dots) ──
    const btnX = w - margin - size;
    const btnY = margin;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, size, size, 4 * ratio);
    ctx.fill();

    const dotR = 3 * ratio;
    const dotGap = 7 * ratio;
    const dotCX = btnX + size / 2;
    const dotStartY = btnY + size / 2 - dotGap;

    for (let i = 0; i < THEME_OPTIONS.length; i++) {
      ctx.fillStyle = THEME_OPTIONS[i].color;
      ctx.beginPath();
      ctx.arc(dotCX, dotStartY + i * dotGap, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = ratio;
      ctx.stroke();
    }

    if (!this.themePickerOpen) return;

    // ── Dropdown panel ──
    const optW = BaseScene.PICKER_OPTION_W * ratio;
    const optH = BaseScene.PICKER_OPTION_H * ratio;
    const pad = BaseScene.PICKER_PAD * ratio;

    const dropX = w - margin - optW;
    const dropY = btnY + size + 4 * ratio;
    const dropH = THEME_OPTIONS.length * optH + pad * 2;

    ctx.fillStyle = 'rgba(15,15,25,0.92)';
    ctx.beginPath();
    ctx.roundRect(dropX, dropY, optW, dropH, 4 * ratio);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = ratio;
    ctx.stroke();

    const fontSize = Math.max(9, Math.floor(10 * ratio));
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'left';

    for (let i = 0; i < THEME_OPTIONS.length; i++) {
      const opt = THEME_OPTIONS[i];
      const optY = dropY + pad + i * optH;

      // Hover highlight
      if (i === this.themePickerHover) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(dropX + pad, optY, optW - pad * 2, optH);
      }

      // Active theme highlight
      if (opt.id === this.theme.id) {
        ctx.fillStyle = 'rgba(74,222,128,0.15)';
        ctx.fillRect(dropX + pad, optY, optW - pad * 2, optH);
      }

      // Label
      ctx.fillStyle = opt.id === this.theme.id ? '#4ade80' : '#e2e8f0';
      ctx.fillText(opt.label, dropX + pad * 2, optY + optH / 2 + fontSize / 3);
    }

    ctx.textAlign = 'start';
  }

  private renderOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number): void {
    const alpha = this.connectionState === 'connected' ? this.overlayAlpha : 0.7;
    if (alpha <= 0) return;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    let text = '';
    let subtext = '';
    switch (this.connectionState) {
      case 'no-server':
        text = 'No Session Found';
        subtext = 'Run "Pixel Quest: Run Demo" to preview';
        break;
      case 'disconnected':
        text = 'Select a Project';
        subtext = 'Use the picker above to get started';
        break;
      case 'connecting':
        text = 'Searching...';
        subtext = 'Looking for Claude session';
        break;
      case 'connected':
        return;
    }

    const fontSize = Math.max(12, Math.floor(13 * scale));
    const subFontSize = Math.max(9, Math.floor(10 * scale));

    ctx.fillStyle = '#e2e8f0';
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, h / 2 - 10 * scale);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `${subFontSize}px monospace`;
    ctx.fillText(subtext, w / 2, h / 2 + 10 * scale);

    ctx.textAlign = 'start';
  }
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  while (text.length > 1 && ctx.measureText(text + '…').width > maxWidth) {
    text = text.slice(0, -1);
  }
  return text + '…';
}

function trimSummary(summary: string | null): string | null {
  if (!summary) return null;
  const s = summary.trim();
  return s.length > 30 ? s.slice(0, 28) + '…' : s;
}

function formatRelativeTime(epochMs: number): string {
  const now = Date.now();
  const diffMs = now - epochMs;
  if (isNaN(diffMs) || diffMs < 0) return '';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function toolActionLabel(toolName: string): string {
  switch (toolName) {
    case 'Read': return 'Reading...';
    case 'Glob': return 'Searching...';
    case 'Grep': return 'Searching...';
    case 'Edit': return 'Editing!';
    case 'Write': return 'Writing!';
    case 'Bash': return 'Running...';
    default: return toolName;
  }
}
