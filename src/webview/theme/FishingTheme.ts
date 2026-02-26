import { ThemeDef } from './ThemeContract';

export const FISHING_THEME: ThemeDef = {
  id: 'fishing',
  name: 'Harbor Town',
  backgroundColor: '#1E6091',
  layout: {
    targetPositions: [
      { x: 60, y: 160 },
      { x: 150, y: 180 },
      { x: 220, y: 155 },
    ],
    depositPosition: { x: 150, y: 283 },
    spawnArea: { xMin: 80, xMax: 220, y: 110 },
    atmosphere: {
      torches: [],
      stalactites: [],
      mushrooms: [],
    },
    creatures: {
      bats: [],
      spider: null,
    },
    groundY: 264,
  },
  particles: {
    action: { colors: ['#3b82f6', '#60a5fa', '#93c5fd'] },
    spawn: { colors: ['#e2e8f0', '#bfdbfe', '#ffffff'] },
    celebrate: { colors: ['#fbbf24', '#3b82f6', '#34d399', '#f472b6'] },
  },
  labels: {
    character: 'Boat',
    target: 'Fish School',
    action1: 'Fishing',
    action2: 'Hauling',
    deposit: 'Harbor',
  },
  nicknames: {
    bossName: 'The Kraken',
    prefixes: ['Salty', 'Rusty', 'Lucky', 'Old', 'Swift', 'Stormy', 'Coral', 'Sandy', 'Misty', 'Drifty', 'Wavy', 'Sunny', 'Breezy', 'Crusty', 'Shelly'],
    suffixes: ['fin', 'wave', 'hook', 'net', 'tide', 'reef', 'shell', 'gull', 'crab', 'pearl', 'sail', 'anchor', 'catch', 'drift', 'wake'],
  },
};
