import { BaseScene, Target } from './BaseScene';
import { ForestBackground } from './ForestBackground';
import { Tree } from '../entities/Tree';
import { Lumberjack } from '../entities/Lumberjack';
import { Goblin } from '../entities/Goblin';
import { FOREST_THEME } from '../theme/ForestTheme';
import { FallingLeaves } from './FallingLeaves';
import { ForestBird } from '../entities/ForestBird';

export class ForestScene extends BaseScene {
  private background = new ForestBackground();
  private fallingLeaves!: FallingLeaves;
  private birds: ForestBird[] = [];

  constructor() {
    super(FOREST_THEME);
    this.createTargets();
    this.createAtmosphere();
  }

  protected createTargets(): void {
    for (const pos of this.theme.layout.targetPositions) {
      this.targets.push(new Tree(pos.x, pos.y) as Target);
    }
  }

  protected createCharacter(x: number, y: number, id: string): Goblin {
    return new Lumberjack(x, y, this.particles, id);
  }

  protected createAtmosphere(): void {
    this.fallingLeaves = new FallingLeaves(300, 400);

    // Birds perched in canopy area (upper portion of viewport)
    this.birds = [
      new ForestBird(45, 35),
      new ForestBird(200, 28),
      new ForestBird(260, 45),
    ];
  }

  protected updateAtmosphere(dt: number): void {
    this.fallingLeaves.update(dt);
    for (const bird of this.birds) bird.update(dt);
  }

  protected renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    this.background.render(ctx, w, h);
  }

  protected renderAtmosphereBack(ctx: CanvasRenderingContext2D, scale: number): void {
    this.fallingLeaves.render(ctx, scale);
  }

  protected renderAtmosphereFront(ctx: CanvasRenderingContext2D, scale: number): void {
    for (const bird of this.birds) bird.render(ctx, scale);
  }

  protected renderGlow(_ctx: CanvasRenderingContext2D, _scale: number): void {}

  protected resizeAtmosphere(w: number, h: number): void {
    this.background.generate(w, h);
  }

  protected applyStretch(stretch: number): void {
    this.fallingLeaves.resize(300, 400 + stretch);
  }
}
