export interface ThemeLayout {
  /** Positions for task targets (ore veins / trees / etc.) in logical coords */
  targetPositions: Array<{ x: number; y: number }>;
  /** Position for the deposit area (chest / barrel / etc.) */
  depositPosition: { x: number; y: number };
  /** Area where characters spawn */
  spawnArea: { xMin: number; xMax: number; y: number };
  /** Atmosphere element positions */
  atmosphere: {
    torches: Array<{ x: number; y: number; side: 'left' | 'right' }>;
    stalactites: Array<{ x: number; tipY: number }>;
    mushrooms: Array<{ x: number; y: number }>;
  };
  /** Creature positions */
  creatures: {
    bats: Array<{ x: number; y: number }>;
    spider: { x: number; y: number; maxDrop: number } | null;
  };
  /** Logical y where "ground" starts. Elements at y >= groundY shift down when viewport is taller than 3:4. */
  groundY: number;
}

export interface ThemeParticles {
  action: { colors: string[] };
  spawn: { colors: string[] };
  celebrate: { colors: string[] };
}

export interface ThemeLabels {
  character: string;
  target: string;
  action1: string;
  action2: string;
  deposit: string;
}

export interface ThemeNicknames {
  bossName: string;
  prefixes: string[];
  suffixes: string[];
}

export interface ThemeDef {
  id: string;
  name: string;
  backgroundColor: string;
  layout: ThemeLayout;
  particles: ThemeParticles;
  labels: ThemeLabels;
  nicknames: ThemeNicknames;
}

export type ThemeId = 'cave' | 'fishing' | 'forest';

export const THEME_OPTIONS: { id: ThemeId; label: string; color: string }[] = [
  { id: 'cave', label: 'Goblin Mine', color: '#1a1a2e' },
  { id: 'fishing', label: 'Harbor Town', color: '#0f3d5c' },
  { id: 'forest', label: 'Lumber Camp', color: '#1a3a14' },
];
