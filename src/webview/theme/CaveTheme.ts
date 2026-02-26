import { ThemeDef } from './ThemeContract';

export const CAVE_THEME: ThemeDef = {
  id: 'cave',
  name: 'Goblin Mine',
  backgroundColor: '#1a1a2e',
  layout: {
    targetPositions: [
      { x: 40, y: 70 },
      { x: 140, y: 55 },
      { x: 230, y: 75 },
    ],
    depositPosition: { x: 130, y: 295 },
    spawnArea: { xMin: 90, xMax: 200, y: 190 },
    atmosphere: {
      torches: [
        { x: 8, y: 130, side: 'left' as const },
        { x: 292, y: 180, side: 'right' as const },
      ],
      stalactites: [
        { x: 75, tipY: 15 },
        { x: 190, tipY: 12 },
        { x: 255, tipY: 18 },
      ],
      mushrooms: [
        { x: 25, y: 350 },
        { x: 80, y: 365 },
        { x: 155, y: 355 },
        { x: 210, y: 370 },
        { x: 265, y: 340 },
        // Mid-floor — scattered through goblin walkways
        { x: 45, y: 210 },
        { x: 175, y: 225 },
        { x: 255, y: 200 },
        { x: 120, y: 240 },
      ],
    },
    creatures: {
      bats: [
        { x: 60, y: 25 },
        { x: 220, y: 18 },
      ],
      spider: { x: 280, y: 15, maxDrop: 70 },
    },
    groundY: 260,
  },
  particles: {
    action: { colors: ['#fbbf24', '#f97316', '#ef4444'] },
    spawn: { colors: ['#e2e8f0', '#94a3b8', '#ffffff'] },
    celebrate: { colors: ['#fbbf24', '#a78bfa', '#34d399', '#f472b6'] },
  },
  labels: {
    character: 'Goblin',
    target: 'Ore Vein',
    action1: 'Mining',
    action2: 'Cart',
    deposit: 'Chest',
  },
  nicknames: {
    bossName: 'Grumpytoes',
    prefixes: ['Grumpy', 'Sneaky', 'Blinky', 'Chompy', 'Wiggly', 'Mossy', 'Dusty', 'Fizzy', 'Rusty', 'Zippy', 'Cranky', 'Bonky', 'Snooty', 'Plonky', 'Mugsy'],
    suffixes: ['toes', 'nob', 'wick', 'bonk', 'fang', 'grit', 'snot', 'mug', 'wort', 'chunk', 'lump', 'knack', 'splat', 'thud', 'grub'],
  },
};
