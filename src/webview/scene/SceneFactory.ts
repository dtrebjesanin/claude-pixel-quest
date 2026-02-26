import { Scene } from './Scene';
import { CaveScene } from './CaveScene';
import { FishingScene } from './FishingScene';
import { ForestScene } from './ForestScene';
import { ThemeId } from '../theme/ThemeContract';

export { ThemeId } from '../theme/ThemeContract';

export function createScene(themeId: ThemeId): Scene {
  switch (themeId) {
    case 'fishing': return new FishingScene();
    case 'forest': return new ForestScene();
    case 'cave':
    default: return new CaveScene();
  }
}
