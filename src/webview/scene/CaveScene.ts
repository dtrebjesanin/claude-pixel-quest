import { BaseScene, Target } from './BaseScene';
import { Background } from './Background';
import { OreVein } from './OreVein';
import { CAVE_THEME } from '../theme/CaveTheme';
import { WallTorch } from './WallTorch';
import { DustMotes } from './DustMotes';
import { DrippingWater } from './DrippingWater';
import { GlowingMushroom } from './GlowingMushroom';
import { Bat } from '../entities/Bat';
import { Spider } from '../entities/Spider';

export class CaveScene extends BaseScene {
  private background = new Background();
  private wallTorches: WallTorch[] = [];
  private dustMotes!: DustMotes;
  private drippingWater!: DrippingWater;
  private mushrooms: GlowingMushroom[] = [];
  private bats: Bat[] = [];
  private spider: Spider | null = null;

  constructor() {
    super(CAVE_THEME);
    this.createTargets();
    this.createAtmosphere();
  }

  protected createTargets(): void {
    for (const pos of this.theme.layout.targetPositions) {
      this.targets.push(new OreVein(pos.x, pos.y) as Target);
    }
  }

  protected createAtmosphere(): void {
    const atm = this.theme.layout.atmosphere;
    for (const t of atm.torches) {
      this.wallTorches.push(new WallTorch(t.x, t.y, t.side));
    }
    this.dustMotes = new DustMotes(300, 400);
    this.drippingWater = new DrippingWater(atm.stalactites, 400);
    for (const m of atm.mushrooms) {
      this.mushrooms.push(new GlowingMushroom(m.x, m.y));
    }

    const creatures = this.theme.layout.creatures;
    for (const b of creatures.bats) {
      this.bats.push(new Bat(b.x, b.y));
    }
    if (creatures.spider) {
      const sp = creatures.spider;
      this.spider = new Spider(sp.x, sp.y, sp.maxDrop);
    }
  }

  protected updateAtmosphere(dt: number): void {
    for (const torch of this.wallTorches) torch.update(dt);
    this.dustMotes.update(dt);
    this.drippingWater.update(dt);
    for (const mushroom of this.mushrooms) mushroom.update(dt);
    for (const bat of this.bats) bat.update(dt);
    if (this.spider) this.spider.update(dt);
  }

  protected renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    this.background.render(ctx, w, h);
  }

  protected renderAtmosphereBack(ctx: CanvasRenderingContext2D, scale: number): void {
    this.drippingWater.renderStalactites(ctx, scale);
    for (const torch of this.wallTorches) torch.renderBody(ctx, scale);
    for (const mushroom of this.mushrooms) mushroom.renderBody(ctx, scale);
    if (this.spider) this.spider.renderCobweb(ctx, scale);
    this.dustMotes.render(ctx, scale);
  }

  protected renderAtmosphereFront(ctx: CanvasRenderingContext2D, scale: number): void {
    for (const bat of this.bats) bat.render(ctx, scale);
    if (this.spider) this.spider.render(ctx, scale);
    this.drippingWater.renderDrops(ctx, scale);
  }

  protected renderGlow(ctx: CanvasRenderingContext2D, scale: number): void {
    for (const torch of this.wallTorches) torch.renderGlow(ctx, scale);
    for (const mushroom of this.mushrooms) mushroom.renderGlow(ctx, scale);
  }

  protected resizeAtmosphere(w: number, h: number): void {
    this.background.generate(w, h);
  }

  protected applyStretch(stretch: number): void {
    const groundY = this.theme.layout.groundY;
    const atm = this.theme.layout.atmosphere;

    // Reposition mushrooms at or below groundY
    for (let i = 0; i < this.mushrooms.length; i++) {
      const orig = atm.mushrooms[i];
      this.mushrooms[i].y = orig.y >= groundY ? orig.y + stretch : orig.y;
    }

    this.drippingWater.setFloorY(400 + stretch);
    this.dustMotes.resize(300, 400 + stretch);
  }
}
