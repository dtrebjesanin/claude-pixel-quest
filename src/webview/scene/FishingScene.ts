import { BaseScene, Target } from './BaseScene';
import { FishingBackground } from './FishingBackground';
import { FishSchool } from '../entities/FishSchool';
import { FishingBoat } from '../entities/FishingBoat';
import { Goblin } from '../entities/Goblin';
import { FISHING_THEME } from '../theme/FishingTheme';
import { SeaWaves } from './SeaWaves';
import { Seagull } from '../entities/Seagull';

export class FishingScene extends BaseScene {
  private background = new FishingBackground();
  private seaWaves!: SeaWaves;
  private seagulls: Seagull[] = [];

  constructor() {
    super(FISHING_THEME);
    this.createTargets();
    this.createAtmosphere();
  }

  protected createTargets(): void {
    for (const pos of this.theme.layout.targetPositions) {
      this.targets.push(new FishSchool(pos.x, pos.y) as Target);
    }
  }

  protected createCharacter(x: number, y: number, id: string): Goblin {
    return new FishingBoat(x, y, this.particles, id);
  }

  protected createAtmosphere(): void {
    this.seaWaves = new SeaWaves(300, 400);
    this.seagulls = [
      new Seagull(50, 30),
      new Seagull(180, 25),
      new Seagull(250, 40),
    ];
  }

  protected updateAtmosphere(dt: number): void {
    this.seaWaves.update(dt);
    for (const gull of this.seagulls) gull.update(dt);
  }

  protected renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    this.background.render(ctx, w, h);
  }

  protected renderBeforeDeposit(_ctx: CanvasRenderingContext2D, _scale: number): void {
    this.background.renderDockSurface(_ctx);
  }

  protected renderAtmosphereBack(ctx: CanvasRenderingContext2D, scale: number): void {
    this.seaWaves.render(ctx, scale);
  }

  protected renderAtmosphereFront(ctx: CanvasRenderingContext2D, scale: number): void {
    for (const gull of this.seagulls) gull.render(ctx, scale);
  }

  protected renderGlow(ctx: CanvasRenderingContext2D, scale: number): void {
    this.seaWaves.renderGlow(ctx, scale);
  }

  protected resizeAtmosphere(w: number, h: number): void {
    this.background.generate(w, h);
  }

  protected applyStretch(stretch: number): void {
    this.seaWaves.resize(300, 400 + stretch);
  }
}
