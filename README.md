# Claude Pixel Quest

A VS Code extension that visualizes [Claude Code](https://docs.anthropic.com/en/docs/claude-code) agent activity as pixel art characters mining ore, catching fish, or chopping trees — in real time.

Inspired by [Claude Dev Tools](https://www.claude-dev.tools/) — a serious and useful activity tracker — this is a fun, vibe-coded take on the same idea: instead of tracking what Claude is doing, just watch some pixel characters do their thing. All the current art is procedurally drawn on canvas by an LLM that has never held a pencil — everyone is more than welcome to create their own scenes and characters.

<!-- TODO: Add a GIF/screenshot here -->

## Features

- **Real-time visualization** — watches your active Claude Code session and animates characters based on tool calls
- **3 themed scenes** — Cave Mining (goblins), Lakeside Fishing (boats), Enchanted Forest (lumberjacks)
- **Procedural pixel art** — all graphics are drawn on canvas, no sprite sheets
- **Subagent support** — spawns additional characters when Claude uses background agents, each with their own name and actions
- **Ambient atmosphere** — bats, seagulls, falling leaves, glowing mushrooms, and more
- **Demo mode** — 6 built-in scenarios to preview animations without a live session

## How It Works

The extension monitors Claude Code's session files (`~/.claude/projects/*/sessions/*.jsonl`) and maps tool calls to character actions:

| Tool Call | Action |
|-----------|--------|
| Read, Glob, Grep | Explore (holding a scroll) |
| Edit, Write | Mine / Chop / Fish |
| Bash | Push a cart / wheelbarrow |
| Idle | Stand around or fall asleep |

## Installation

### From VSIX (manual)

1. [Download the latest `.vsix`](https://github.com/dtrebjesanin/claude-pixel-quest/releases)
2. In VS Code: `Extensions` > `...` menu > `Install from VSIX...`
3. Open the **Pixel Quest** panel from the activity bar

### From Source

```bash
git clone https://github.com/dtrebjesanin/claude-pixel-quest.git
cd claude-pixel-quest
npm install
npx @vscode/vsce package
```

Then install the generated `.vsix` file via `Extensions` > `...` > `Install from VSIX...`.

## Usage

1. Open the **Pixel Quest** panel in the activity bar (goblin icon)
2. Start a Claude Code session in your terminal
3. Watch the characters react to Claude's tool calls

### Commands

| Command | Description |
|---------|-------------|
| `Pixel Quest: Change Theme` | Switch between Cave, Fishing, and Forest |
| `Pixel Quest: Select Project` | Pick which project to monitor |
| `Pixel Quest: Select Session` | Pick a specific session |
| `Pixel Quest: Run Demo` | Preview animations with simulated events |
| `Pixel Quest: Reconnect` | Reconnect to the session watcher |

You can also switch themes and select projects/sessions directly from the canvas UI inside the panel.

## Themes

### Goblin Mine
Goblins mine ore veins and deposit loot in a treasure chest. Glowing mushrooms, torches, stalactites, bats, and spiders fill the cave.

### Harbor Town
Boats cast lines into fish schools and haul their catch to a harbor barrel. Seagulls circle overhead while waves lap the shore.

### Lumber Camp
Lumberjacks chop trees and stack logs at the lumber pile. Leaves drift down and birds flit between the branches.

## Development

```bash
npm install          # install dependencies
npm run watch        # dev mode with hot reload
npm test             # run tests
npm run build        # production build
```

To package a VSIX:

```bash
npx @vscode/vsce package
```

### Project Structure

```
src/
├── extension/           # VS Code extension host
│   ├── extension.ts     # Entry point, commands, demo scenarios
│   ├── webviewProvider.ts   # Webview panel creation
│   └── SessionWatcher.ts   # Claude session file watcher
├── webview/             # Browser-side game engine
│   ├── index.ts         # Canvas bootstrap
│   ├── bridge/          # Extension <-> Webview messaging
│   ├── engine/          # Game loop, camera, screen shake
│   ├── scene/           # Base scene + 3 theme scenes
│   ├── entities/        # Characters, particles, ambient creatures
│   └── theme/           # Theme data contracts
└── shared/
    └── types.ts         # Shared type definitions
```

## Contributing

The theme system is designed to be extended. If you want to create a new scene — especially one with hand-drawn pixel art — take a look at the existing themes in `src/webview/scene/` and `src/webview/entities/` for reference. PRs welcome.

## Built With

- TypeScript
- Canvas 2D API (all pixel art is procedurally rendered)
- Webpack (dual-config: Node extension + browser webview)
- Vitest

## License

[MIT](LICENSE) — Danilo Trebješanin

