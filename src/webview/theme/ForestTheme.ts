import { ThemeDef } from './ThemeContract';

export const FOREST_THEME: ThemeDef = {
  id: 'forest',
  name: 'Lumber Camp',
  backgroundColor: '#1a3a14',
  layout: {
    targetPositions: [
      { x: 70, y: 180 },
      { x: 150, y: 165 },
      { x: 230, y: 185 },
    ],
    depositPosition: { x: 130, y: 285 },
    spawnArea: { xMin: 60, xMax: 220, y: 220 },
    atmosphere: {
      torches: [],
      stalactites: [],
      mushrooms: [],
    },
    creatures: {
      bats: [],
      spider: null,
    },
    groundY: 260,
  },
  particles: {
    action: { colors: ['#92400e', '#a16207', '#78350f'] },
    spawn: { colors: ['#86efac', '#4ade80', '#ffffff'] },
    celebrate: { colors: ['#fbbf24', '#22c55e', '#a78bfa', '#f472b6'] },
  },
  labels: {
    character: 'Lumberjack',
    target: 'Tree',
    action1: 'Chopping',
    action2: 'Wheelbarrow',
    deposit: 'Log Pile',
  },
  nicknames: {
    bossName: 'Big Timber',
    prefixes: ['Oak', 'Birch', 'Maple', 'Cedar', 'Ash', 'Pine', 'Elm', 'Spruce', 'Willow', 'Alder', 'Rowan', 'Hazel', 'Thorn', 'Bramble', 'Moss'],
    suffixes: ['beard', 'axe', 'bark', 'knot', 'stump', 'root', 'branch', 'saw', 'chip', 'ring', 'leaf', 'log', 'trunk', 'burr', 'grain'],
  },
};
