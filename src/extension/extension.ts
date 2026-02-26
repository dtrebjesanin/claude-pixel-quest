import * as vscode from 'vscode';
import { PixelQuestViewProvider } from './webviewProvider';
import { SessionWatcher } from './SessionWatcher';
import { PixelQuestEvent } from '../shared/types';

let bridge: SessionWatcher;
let provider: PixelQuestViewProvider;
let demoTimers: ReturnType<typeof setTimeout>[] = [];

export function activate(context: vscode.ExtensionContext) {
  bridge = new SessionWatcher();
  provider = new PixelQuestViewProvider(context.extensionUri, bridge);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('pixelQuest.sceneView', provider),
    vscode.commands.registerCommand('pixelQuest.reconnect', () => bridge.reconnect()),
    vscode.commands.registerCommand('pixelQuest.demo', () => pickDemoScenario()),
    vscode.commands.registerCommand('pixelQuest.changeTheme', () => pickTheme()),
    vscode.commands.registerCommand('pixelQuest.selectSession', () => pickSession()),
    vscode.commands.registerCommand('pixelQuest.selectProject', () => pickProject()),
    provider,
    bridge,
  );

  // If workspace folder exists, auto-connect. Otherwise wait for canvas picker.
  if (bridge.hasWorkspaceFolder()) {
    bridge.connect().catch((err: unknown) => console.error('[PixelQuest] Auto-connect failed:', err));
  }
}

export function deactivate() {
  bridge?.dispose();
}

// ── Theme picker ──

async function pickTheme() {
  const themes = [
    { label: 'Cave Mining', description: 'Goblins mine ore in a dark cave', id: 'cave' },
    { label: 'Lakeside Fishing', description: 'Fishers cast lines by a serene lake', id: 'fishing' },
    { label: 'Enchanted Forest', description: 'Lumberjacks chop trees in a woodland', id: 'forest' },
  ];

  const pick = await vscode.window.showQuickPick(themes, { placeHolder: 'Choose a theme' });
  if (!pick) return;

  await vscode.workspace.getConfiguration('pixelQuest').update('theme', pick.id, vscode.ConfigurationTarget.Global);
}

// ── Project picker ──

async function pickProject() {
  const projects = bridge.listProjectDirs();
  if (projects.length === 0) {
    vscode.window.showWarningMessage('No Claude sessions found. Run Claude Code in a project first.');
    return;
  }

  type ProjectItem = { label: string; description: string; detail?: string; dirPath: string };

  const items: ProjectItem[] = projects.map((p) => ({
    label: `$(folder) ${p.name}`,
    description: `${p.sessionCount} session${p.sessionCount !== 1 ? 's' : ''} · ${formatRelativeTime(new Date(p.latestSessionAt).toISOString())}`,
    detail: p.decodedPath,
    dirPath: p.dirPath,
  }));

  const pick = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a project to watch Claude sessions for',
  });
  if (!pick) return;

  bridge.connectToProject(pick.dirPath);

  // Immediately show session picker for the chosen project
  await pickSession();
}

// ── Session picker ──

async function pickSession() {
  const sessions = bridge.listSessions();
  if (sessions.length === 0) {
    vscode.window.showWarningMessage('No Claude sessions found for this workspace.');
    return;
  }

  type SessionItem = { label: string; description: string; detail?: string; filePath: string | null };

  const items: SessionItem[] = [
    { label: '$(eye) Follow Latest', description: 'Auto-switch to newest session', filePath: null },
    ...sessions.map((s) => {
      const time = formatRelativeTime(s.timestamp);
      const watching = s.isActive ? '  $(eye)' : '';
      return {
        label: s.slug || s.filePath.split('/').pop()!.replace('.jsonl', ''),
        description: time + watching,
        detail: s.summary || undefined,
        filePath: s.filePath,
      };
    }),
  ];

  const pick = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a Claude session to watch',
  });
  if (!pick) return;

  if (pick.filePath === null) {
    bridge.followLatest();
  } else {
    bridge.watchSession(pick.filePath);
  }
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';

  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Demo scenario picker ──

type DemoEvent = { delay: number; event: PixelQuestEvent };

function tool(delay: number, toolName: string, input: Record<string, unknown>): DemoEvent {
  return { delay, event: { type: 'tool-call', toolName, toolInput: input, isTask: false } };
}
function spawn(delay: number, agentId: string, description: string): DemoEvent {
  return { delay, event: { type: 'subagent-spawn', agentId, description } };
}
function complete(delay: number, agentId: string): DemoEvent {
  return { delay, event: { type: 'subagent-complete', agentId } };
}
function sessionStart(delay: number): DemoEvent {
  return { delay, event: { type: 'session-state', isOngoing: true } };
}
function sessionEnd(delay: number): DemoEvent {
  return { delay, event: { type: 'session-state', isOngoing: false } };
}
function connect(delay: number): DemoEvent {
  return { delay, event: { type: 'connection', state: 'connected' } };
}

async function pickDemoScenario() {
  const scenarios: Array<{ label: string; description: string; fn: () => DemoEvent[] }> = [
    { label: 'Normal Session', description: '~32s — typical Claude session with 2 subagents', fn: normalSession },
    { label: 'Large Session', description: '~55s — 25 tool calls, heavy mining', fn: largeSession },
    { label: 'Quick Burst', description: '~12s — fast 5-tool session, in and out', fn: quickBurst },
    { label: 'Consecutive Prompts', description: '~50s — 3 back-to-back sessions', fn: consecutivePrompts },
    { label: 'Subagent Swarm', description: '~40s — 4 subagents working in parallel', fn: subagentSwarm },
    { label: 'Disconnect Chaos', description: '~30s — connection drops and recovers mid-session', fn: disconnectChaos },
  ];

  const pick = await vscode.window.showQuickPick(
    scenarios.map(s => ({ label: s.label, description: s.description, fn: s.fn })),
    { placeHolder: 'Choose a demo scenario' },
  );

  if (!pick) return;
  playScenario(pick.label, pick.fn());
}

function playScenario(name: string, events: DemoEvent[]) {
  for (const t of demoTimers) clearTimeout(t);
  demoTimers = [];
  bridge.pause();
  vscode.window.showInformationMessage(`Pixel Quest: ${name} — Watch the sidebar!`);

  for (const { delay, event } of events) {
    demoTimers.push(setTimeout(() => provider.postMessage(event), delay));
  }

  const lastDelay = events[events.length - 1].delay;
  demoTimers.push(setTimeout(() => bridge.resume(), lastDelay + 5000));
}

// ── Scenarios ──

function normalSession(): DemoEvent[] {
  return [
    connect(0),
    sessionStart(100),
    tool(800, 'Read', { file_path: 'src/index.ts' }),
    tool(2500, 'Glob', { pattern: '**/*.ts' }),
    tool(4500, 'Grep', { pattern: 'function' }),
    tool(7000, 'Edit', { file_path: 'src/app.ts' }),
    tool(10000, 'Write', { file_path: 'src/new-file.ts' }),
    tool(13000, 'Bash', { command: 'npm test' }),
    spawn(15500, 'sub-1', 'Research agent'),
    tool(16500, 'Read', { file_path: 'docs/api.md' }),
    tool(18000, 'Edit', { file_path: 'src/feature.ts' }),
    spawn(19500, 'sub-2', 'Test runner'),
    tool(21000, 'Bash', { command: 'npm run build' }),
    tool(23500, 'Write', { file_path: 'src/utils.ts' }),
    complete(25000, 'sub-1'),
    complete(27000, 'sub-2'),
    tool(29000, 'Edit', { file_path: 'src/index.ts' }),
    sessionEnd(32000),
  ];
}

function largeSession(): DemoEvent[] {
  const events: DemoEvent[] = [connect(0), sessionStart(100)];

  const tools = [
    { name: 'Read', input: (i: number) => ({ file_path: `src/module${i}.ts` }) },
    { name: 'Grep', input: (i: number) => ({ pattern: `pattern${i}` }) },
    { name: 'Edit', input: (i: number) => ({ file_path: `src/file${i}.ts` }) },
    { name: 'Write', input: (i: number) => ({ file_path: `src/new${i}.ts` }) },
    { name: 'Bash', input: (i: number) => ({ command: `test ${i}` }) },
    { name: 'Glob', input: (i: number) => ({ pattern: `**/*${i}*` }) },
  ];

  // 25 tool calls spaced 2s apart
  for (let i = 0; i < 25; i++) {
    const t = tools[i % tools.length];
    events.push(tool(800 + i * 2000, t.name, t.input(i)));
  }

  // Spawn 1 subagent mid-way
  events.push(spawn(15000, 'sub-1', 'Code reviewer'));
  events.push(complete(40000, 'sub-1'));

  events.push(sessionEnd(52000));
  return events;
}

function quickBurst(): DemoEvent[] {
  return [
    connect(0),
    sessionStart(100),
    // 5 rapid tools, ~1s apart
    tool(400, 'Read', { file_path: 'src/bug.ts' }),
    tool(1500, 'Grep', { pattern: 'error' }),
    tool(2800, 'Edit', { file_path: 'src/bug.ts' }),
    tool(4200, 'Bash', { command: 'npm test' }),
    tool(5800, 'Write', { file_path: 'src/fix.ts' }),
    sessionEnd(9000),
  ];
}

function consecutivePrompts(): DemoEvent[] {
  const events: DemoEvent[] = [connect(0)];
  let t = 100;

  for (let session = 0; session < 3; session++) {
    events.push(sessionStart(t));
    t += 300;

    // 4-6 tools per session
    const count = 4 + session;
    const toolNames = ['Read', 'Grep', 'Edit', 'Bash', 'Write', 'Glob'];
    for (let i = 0; i < count; i++) {
      events.push(tool(t, toolNames[i % toolNames.length], { session, tool: i }));
      t += 1800;
    }

    // Brief subagent in sessions 2 & 3
    if (session > 0) {
      events.push(spawn(t, `sub-s${session}`, `Helper ${session}`));
      t += 3000;
      events.push(complete(t, `sub-s${session}`));
      t += 2000;
    }

    events.push(sessionEnd(t));
    t += 3000; // pause between sessions
  }

  return events;
}

function subagentSwarm(): DemoEvent[] {
  const events: DemoEvent[] = [
    connect(0),
    sessionStart(100),
    tool(500, 'Read', { file_path: 'src/index.ts' }),
    tool(2000, 'Glob', { pattern: '**/*.ts' }),
  ];

  // Spawn 4 subagents in quick succession
  const agents = [
    { id: 'sub-1', desc: 'Code reviewer' },
    { id: 'sub-2', desc: 'Test writer' },
    { id: 'sub-3', desc: 'Doc generator' },
    { id: 'sub-4', desc: 'Linter' },
  ];

  let t = 4000;
  for (const agent of agents) {
    events.push(spawn(t, agent.id, agent.desc));
    t += 1500;
  }

  // Main agent keeps working alongside
  events.push(tool(12000, 'Edit', { file_path: 'src/main.ts' }));
  events.push(tool(15000, 'Bash', { command: 'npm run build' }));
  events.push(tool(18000, 'Write', { file_path: 'src/output.ts' }));

  // Subagents complete at staggered intervals
  events.push(complete(20000, 'sub-1'));
  events.push(complete(24000, 'sub-2'));
  events.push(complete(28000, 'sub-3'));
  events.push(complete(32000, 'sub-4'));

  events.push(tool(34000, 'Edit', { file_path: 'src/final.ts' }));
  events.push(sessionEnd(38000));

  return events;
}

function disconnectChaos(): DemoEvent[] {
  return [
    connect(0),
    sessionStart(100),
    tool(500, 'Read', { file_path: 'src/index.ts' }),
    tool(2000, 'Edit', { file_path: 'src/app.ts' }),
    // Connection drops!
    { delay: 4000, event: { type: 'connection', state: 'disconnected' } },
    // Reconnects after 3 seconds
    connect(7000),
    sessionStart(7200),
    // Resumes work
    tool(8000, 'Grep', { pattern: 'TODO' }),
    tool(10000, 'Edit', { file_path: 'src/fix.ts' }),
    spawn(12000, 'sub-1', 'Recovery agent'),
    tool(14000, 'Bash', { command: 'npm test' }),
    // Brief drop again
    { delay: 16000, event: { type: 'connection', state: 'no-server' } },
    connect(19000),
    sessionStart(19200),
    tool(20000, 'Write', { file_path: 'src/stable.ts' }),
    complete(22000, 'sub-1'),
    tool(24000, 'Edit', { file_path: 'src/done.ts' }),
    sessionEnd(27000),
  ];
}
