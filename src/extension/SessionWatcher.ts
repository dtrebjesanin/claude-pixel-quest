import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { PixelQuestEvent, ConnectionState, ProjectInfo, SessionInfo } from '../shared/types';

/**
 * Encode a filesystem path to Claude Code's directory name convention.
 * Replaces `/`, `\` with `-` and ensures a leading `-` for absolute paths.
 */
function encodePath(absolutePath: string): string {
  if (!absolutePath) return '';
  const encoded = absolutePath.replace(/[/\\]/g, '-');
  return encoded.startsWith('-') ? encoded : `-${encoded}`;
}

/** Normalize a path for comparison: forward slashes, lowercase, no trailing slash. */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

/**
 * Sanitize a user message text block for display.
 * Strips XML tags, skips system/hook content and command outputs.
 * Returns null if the text is purely system-injected.
 */
function sanitizeUserText(raw: string): string | null {
  // Skip blocks that are entirely inside XML tags (hook output, IDE context, etc.)
  if (/^\s*<[a-z_-]+>[\s\S]*<\/[a-z_-]+>\s*$/i.test(raw)) return null;

  // Strip XML-style tags (e.g. <ide_opened_file>, <command-name>, etc.)
  const text = raw.replace(/<[^>]+>/g, '').trim();

  // Skip empty results, "Request interrupted" messages, and bare command names
  if (!text) return null;
  if (/^Request interrupted by user/i.test(text)) return null;
  if (text.startsWith('/') && !text.includes(' ')) return text;    // slash command like /commit

  return text;
}

/** Split a file path into its non-empty segments. */
function pathSegments(p: string): string[] {
  return p.split(/[/\\]/).filter(Boolean);
}

/**
 * Lossy fallback: decode an encoded directory name back to a path.
 * Cannot reconstruct hyphens in original path segments — use cwd from JSONL when available.
 */
function decodeDirName(encoded: string): string {
  if (!encoded) return '';

  // Legacy Windows format: `C--Users-name-project` (no leading dash, `--` = `:`)
  const legacyWin = /^([a-zA-Z])--(.+)$/.exec(encoded);
  if (legacyWin) {
    const drive = legacyWin[1].toUpperCase();
    const rest = legacyWin[2].replace(/-/g, '/');
    return `${drive}:/${rest}`;
  }

  // Remove leading dash (indicates absolute path)
  const withoutDash = encoded.startsWith('-') ? encoded.slice(1) : encoded;
  const decoded = withoutDash.replace(/-/g, '/');

  // Windows drive letter: `C:/...`
  if (/^[a-zA-Z]:\//.test(decoded)) return decoded;

  // Ensure leading slash for POSIX paths
  return decoded.startsWith('/') ? decoded : `/${decoded}`;
}

export class SessionWatcher implements vscode.Disposable {
  private state: ConnectionState = 'disconnected';
  private disposed = false;
  private paused = false;
  private log = vscode.window.createOutputChannel('Pixel Quest');

  // File watching
  private watcher: fs.FSWatcher | null = null;
  private watchedFilePath: string | null = null;
  private readOffset = 0;
  private lineBuffer = '';

  // Timers
  private rescanTimer: ReturnType<typeof setInterval> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  // Deduplication / tracking
  private seenToolIds = new Set<string>();
  private taskIds = new Set<string>();
  private activeSubagents = new Map<string, string | undefined>(); // id → description

  // Edge-trigger: only emit session-state on idle→active transition
  private sessionActive = false;
  private lastInactiveReason: 'idle' | 'end_turn' | null = null;

  // Resolved project directory for session files
  private projectDir: string | null = null;

  // Manual session selection — when set, rescan timer won't auto-switch
  private pinnedSession: string | null = null;

  // Public event emitter — same pattern as DevToolsBridge
  private eventEmitter = new vscode.EventEmitter<PixelQuestEvent>();
  readonly onEvent = this.eventEmitter.event;

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async connect(): Promise<void> {
    if (this.disposed || this.paused) return;

    this.setState('connecting');

    // 1. Resolve workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    this.log.appendLine(`[connect] workspaceFolder: ${workspaceFolder ?? '(none)'}`);

    if (this.projectDir) {
      // Already set (e.g. via connectToProject) — respect manual selection
      this.log.appendLine(`[connect] projectDir (manual): ${this.projectDir}`);
    } else if (workspaceFolder) {
      // Scan actual project directories and match by decoded path / cwd.
      // encodePath is unreliable because Claude Code has used different encoding
      // formats across versions (legacy `C--Users-...` vs modern `-C:-Users-...`).
      this.projectDir = this.findProjectDirForWorkspace(workspaceFolder);
      this.log.appendLine(`[connect] projectDir (from workspace scan): ${this.projectDir ?? '(no match)'}`);
    } else {
      // No workspace folder and no project dir set (e.g. via pickProject)
      this.log.appendLine('[connect] No workspace folder and no projectDir — setting no-server');
      this.setState('no-server');
      return;
    }

    // 2. Check project dir exists
    if (!this.projectDir || !fs.existsSync(this.projectDir)) {
      this.log.appendLine('[connect] projectDir does not exist — setting no-server');
      this.setState('no-server');
      this.startRescanTimer();
      return;
    }

    // 3. Find most recent session file
    const sessionFile = this.findLatestSessionFile();
    this.log.appendLine(`[connect] sessionFile: ${sessionFile ?? '(none)'}`);
    if (!sessionFile) {
      this.log.appendLine('[connect] No session file found — setting no-server');
      this.setState('no-server');
      this.startRescanTimer();
      return;
    }

    // 4. Start watching
    this.startWatching(sessionFile);
  }

  /** Whether a workspace folder is available (auto-detection works). */
  hasWorkspaceFolder(): boolean {
    return (vscode.workspace.workspaceFolders?.length ?? 0) > 0;
  }

  /** Whether we're in auto-follow-latest mode (no pinned session). */
  isFollowingLatest(): boolean {
    return this.pinnedSession === null;
  }

  /** Validate that dirPath is a real directory inside the projects root. */
  isValidProjectDir(dirPath: string): boolean {
    try {
      const projectsRoot = path.resolve(this.getProjectsRoot());
      const resolved = fs.realpathSync(dirPath);
      return resolved.startsWith(projectsRoot + path.sep) && fs.statSync(resolved).isDirectory();
    } catch {
      return false;
    }
  }

  /** Validate that filePath is a .jsonl file inside the current project directory. */
  isValidSessionFile(filePath: string): boolean {
    if (!this.projectDir) return false;
    try {
      const projectRoot = path.resolve(this.projectDir);
      const resolved = fs.realpathSync(filePath);
      return resolved.startsWith(projectRoot + path.sep) && resolved.endsWith('.jsonl');
    } catch {
      return false;
    }
  }

  /** Set the project directory manually (from project picker). */
  connectToProject(dirPath: string): void {
    this.cleanup();
    this.resetParserState();
    this.pinnedSession = null;
    this.projectDir = dirPath;
    this.connect().catch((err: unknown) => this.log.appendLine(`[PixelQuest] Connect error: ${String(err)}`));
  }

  /** List all project directories that have session files. */
  listProjectDirs(): ProjectInfo[] {
    const projectsRoot = this.getProjectsRoot();
    try {
      if (!fs.existsSync(projectsRoot)) return [];

      const dirs = fs.readdirSync(projectsRoot);
      const projects: ProjectInfo[] = [];

      for (const dir of dirs) {
        if (dir.startsWith('.')) continue;
        const fullDir = path.join(projectsRoot, dir);
        try {
          const stat = fs.statSync(fullDir);
          if (!stat.isDirectory()) continue;

          const files = fs.readdirSync(fullDir);
          const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));
          if (jsonlFiles.length === 0) continue;

          // Find latest session mtime and filename
          let latestMtime = 0;
          let latestFile: string | null = null;
          for (const file of jsonlFiles) {
            try {
              const fileStat = fs.statSync(path.join(fullDir, file));
              if (fileStat.mtimeMs > latestMtime) {
                latestMtime = fileStat.mtimeMs;
                latestFile = file;
              }
            } catch {
              // skip
            }
          }

          // Read cwd from the latest session file for the authoritative project path
          // (decodePath is lossy for paths containing hyphens)
          let decodedPath = decodeDirName(dir);
          let name = pathSegments(decodedPath).pop() || dir;

          if (latestFile) {
            const meta = this.readFirstLineMeta(path.join(fullDir, latestFile));
            if (meta.cwd) {
              decodedPath = meta.cwd;
              name = pathSegments(meta.cwd).pop() || name;
            }
          }

          projects.push({
            dirPath: fullDir,
            decodedPath,
            name,
            sessionCount: jsonlFiles.length,
            latestSessionAt: latestMtime,
          });
        } catch {
          // skip
        }
      }

      // Disambiguate projects that share the same display name
      const nameCounts = new Map<string, number>();
      for (const p of projects) {
        nameCounts.set(p.name, (nameCounts.get(p.name) || 0) + 1);
      }
      for (const p of projects) {
        if ((nameCounts.get(p.name) || 0) > 1) {
          // Add parent directory for context, e.g. "dev/claude-pixel-quest" vs "WorkHub/claude-pixel-quest"
          const segments = pathSegments(p.decodedPath);
          if (segments.length >= 2) {
            p.name = segments.slice(-2).join('/');
          }
        }
      }

      // Most recently active first
      projects.sort((a, b) => b.latestSessionAt - a.latestSessionAt);
      return projects;
    } catch {
      return [];
    }
  }

  private getProjectsRoot(): string {
    const config = vscode.workspace.getConfiguration('pixelQuest');
    const customRoot = config.get<string>('claudeDataPath');
    let claudeRoot = path.join(os.homedir(), '.claude');

    if (customRoot) {
      const resolved = path.resolve(customRoot);
      const home = path.resolve(os.homedir());
      if (resolved.startsWith(home + path.sep) || resolved === home) {
        claudeRoot = resolved;
      }
    }

    return path.join(claudeRoot, 'projects');
  }

  async reconnect(): Promise<void> {
    this.cleanup();
    this.resetParserState();
    await this.connect();
  }

  pause(): void {
    this.paused = true;
    this.cleanup();
  }

  resume(): void {
    this.paused = false;
    this.connect();
  }

  sendCurrentState(webview: vscode.Webview): void {
    webview.postMessage({ type: 'connection', state: this.state } as PixelQuestEvent);
    if (this.sessionActive) {
      webview.postMessage({ type: 'session-state', isOngoing: true } as PixelQuestEvent);
    }
    for (const [id, desc] of this.activeSubagents) {
      webview.postMessage({ type: 'subagent-spawn', agentId: id, description: desc } as PixelQuestEvent);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.cleanup();
    this.eventEmitter.dispose();
    this.log.dispose();
  }

  /** List all available sessions in the project directory. */
  listSessions(): SessionInfo[] {
    if (!this.projectDir) return [];

    try {
      const entries = fs.readdirSync(this.projectDir);
      const sessions: SessionInfo[] = [];

      for (const entry of entries) {
        if (!entry.endsWith('.jsonl')) continue;

        const fullPath = path.join(this.projectDir, entry);
        try {
          const stat = fs.statSync(fullPath);
          const meta = this.readFirstLineMeta(fullPath);

          sessions.push({
            filePath: fullPath,
            slug: meta.slug,
            summary: meta.summary,
            timestamp: meta.timestamp || new Date(stat.mtimeMs).toISOString(),
            modifiedAt: stat.mtimeMs,
            isActive: fullPath === this.watchedFilePath,
          });
        } catch {
          // Skip files we can't read
        }
      }

      // Most recently modified first
      sessions.sort((a, b) => b.modifiedAt - a.modifiedAt);
      return sessions;
    } catch {
      return [];
    }
  }

  /** Pin to a specific session file. Disables auto-switching. */
  watchSession(filePath: string): void {
    this.pinnedSession = filePath;
    this.stopWatcher();
    this.resetParserState();

    this.startWatching(filePath);
  }

  /** Unpin and return to auto-follow-latest behavior. */
  followLatest(): void {
    this.pinnedSession = null;
    // Rescan timer will pick up the latest file on next tick
  }

  // ---------------------------------------------------------------------------
  // Project directory resolution
  // ---------------------------------------------------------------------------

  /**
   * Scan ~/.claude/projects/ and find the directory whose decoded path
   * (or cwd read from session files) matches the given workspace folder.
   * This handles both legacy (`C--Users-...`) and modern (`-C:-Users-...`) formats.
   */
  private findProjectDirForWorkspace(workspaceFolder: string): string | null {
    const projectsRoot = this.getProjectsRoot();
    try {
      if (!fs.existsSync(projectsRoot)) return null;

      const normalizedWorkspace = normalizePath(workspaceFolder);
      const dirs = fs.readdirSync(projectsRoot);

      for (const dir of dirs) {
        if (dir.startsWith('.')) continue;
        const fullDir = path.join(projectsRoot, dir);
        try {
          if (!fs.statSync(fullDir).isDirectory()) continue;
        } catch { continue; }

        // 1. Try decoding the directory name directly
        const decoded = decodeDirName(dir);
        if (normalizePath(decoded) === normalizedWorkspace) {
          return fullDir;
        }

        // 2. Try reading cwd from the latest session file (authoritative)
        const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.jsonl'));
        for (const file of files) {
          try {
            const meta = this.readFirstLineMeta(path.join(fullDir, file));
            if (meta.cwd && normalizePath(meta.cwd) === normalizedWorkspace) {
              return fullDir;
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Session file discovery
  // ---------------------------------------------------------------------------

  private findLatestSessionFile(): string | null {
    if (!this.projectDir) return null;

    try {
      const entries = fs.readdirSync(this.projectDir);
      let latestPath: string | null = null;
      let latestMtime = 0;

      for (const entry of entries) {
        if (!entry.endsWith('.jsonl')) continue;

        const fullPath = path.join(this.projectDir, entry);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.mtimeMs > latestMtime) {
            latestMtime = stat.mtimeMs;
            latestPath = fullPath;
          }
        } catch {
          // Skip files we can't stat
        }
      }

      return latestPath;
    } catch {
      return null;
    }
  }

  /**
   * Scan the first ~64KB of a JSONL file to extract:
   * - slug (from the first "user" entry with a slug field)
   * - timestamp (from the first entry that has one)
   * - summary (first user prompt text, truncated to 80 chars)
   */
  private readFirstLineMeta(filePath: string): { slug: string | null; timestamp: string | null; summary: string | null; cwd: string | null } {
    try {
      const fd = fs.openSync(filePath, 'r');
      try {
        const buf = Buffer.alloc(65536);
        const bytesRead = fs.readSync(fd, buf, 0, 65536, 0);
        const content = buf.toString('utf-8', 0, bytesRead);
        const lines = content.split('\n');

        let slug: string | null = null;
        let timestamp: string | null = null;
        let summary: string | null = null;
        let cwd: string | null = null;

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const entry = JSON.parse(trimmed);

            // Grab earliest timestamp
            if (!timestamp && typeof entry.timestamp === 'string') {
              timestamp = entry.timestamp;
            }

            // Grab cwd from any entry that has it (authoritative project path)
            if (!cwd && typeof entry.cwd === 'string') {
              cwd = entry.cwd;
            }

            // Look for user entries with slug and prompt text
            if (entry.type === 'user') {
              if (!slug && typeof entry.slug === 'string') {
                slug = entry.slug;
              }

              if (!summary) {
                const msg = entry.message as Record<string, unknown> | undefined;
                const content = msg?.content;
                if (Array.isArray(content)) {
                  for (const block of content) {
                    const b = block as Record<string, unknown>;
                    if (b.type === 'text' && typeof b.text === 'string') {
                      const text = sanitizeUserText(b.text);
                      if (text) {
                        summary = text.length > 80 ? text.slice(0, 77) + '...' : text;
                        break;
                      }
                    }
                  }
                } else if (typeof content === 'string' && content.trim()) {
                  const text = sanitizeUserText(content);
                  if (text) {
                    summary = text.length > 80 ? text.slice(0, 77) + '...' : text;
                  }
                }
              }

              // Got everything we need
              if (slug && summary && cwd) break;
            }
          } catch {
            // Skip malformed lines
          }
        }

        return { slug, timestamp, summary, cwd };
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      return { slug: null, timestamp: null, summary: null, cwd: null };
    }
  }

  // ---------------------------------------------------------------------------
  // File watching
  // ---------------------------------------------------------------------------

  private startWatching(filePath: string): void {
    if (this.disposed || this.paused) return;

    // Get current file size — skip existing content, only tail new entries
    try {
      const lstat = fs.lstatSync(filePath);
      if (lstat.isSymbolicLink()) {
        this.setState('disconnected');
        return;
      }
      this.readOffset = lstat.size;
    } catch (err) {
      console.error('[SessionWatcher] Failed to stat session file:', err);
      this.setState('disconnected');
      return;
    }

    this.watchedFilePath = filePath;
    this.lineBuffer = '';

    try {
      this.watcher = fs.watch(filePath, (eventType) => {
        if (eventType === 'change') {
          this.readNewContent();
        }
      });

      this.watcher.on('error', (err) => {
        console.error('[SessionWatcher] File watcher error:', err);
        this.handleWatchError();
      });
    } catch (err) {
      console.error('[SessionWatcher] Failed to create file watcher:', err);
      this.setState('disconnected');
      return;
    }

    this.setState('connected');
    this.startRescanTimer();
  }

  private readNewContent(): void {
    if (!this.watchedFilePath || this.disposed || this.paused) return;

    try {
      const stat = fs.statSync(this.watchedFilePath);
      const newSize = stat.size;

      if (newSize <= this.readOffset) return;

      const bytesToRead = newSize - this.readOffset;
      const buffer = Buffer.alloc(bytesToRead);
      const fd = fs.openSync(this.watchedFilePath, 'r');

      try {
        fs.readSync(fd, buffer, 0, bytesToRead, this.readOffset);
      } finally {
        fs.closeSync(fd);
      }

      this.readOffset = newSize;

      const chunk = buffer.toString('utf-8');
      this.processChunk(chunk);
    } catch (err) {
      console.error('[SessionWatcher] Error reading new content:', err);
    }
  }

  private processChunk(chunk: string): void {
    this.lineBuffer += chunk;

    const lines = this.lineBuffer.split('\n');
    // Last element is either empty (if chunk ended with \n) or a partial line
    this.lineBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      this.parseLine(trimmed);
    }
  }

  // ---------------------------------------------------------------------------
  // JSONL parsing & event emission
  // ---------------------------------------------------------------------------

  private parseLine(line: string): void {
    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(line);
    } catch {
      // Malformed JSON — skip
      return;
    }

    // Any new entry means the session is active — reset idle timer
    this.fireSessionActive();

    const entryType = entry.type;

    if (entryType === 'assistant') {
      this.processAssistantEntry(entry);
    } else if (entryType === 'user') {
      this.processUserEntry(entry);
    } else if (entryType === 'queue-operation') {
      // queue-operation entries with task-notification content arrive immediately
      // when a background agent completes — earlier than the user entry.
      const content = entry.content;
      if (typeof content === 'string' && content.includes('<task-notification>')) {
        this.parseTaskNotifications(content);
      }
    }
  }

  private processAssistantEntry(entry: Record<string, unknown>): void {
    const message = entry.message as Record<string, unknown> | undefined;
    if (!message) return;

    const content = message.content as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(content)) return;

    // Message-level dedup: emit at most one thinking and one text-output per entry
    let firedThinking = false;
    let firedText = false;

    for (const block of content) {
      if (block.type === 'tool_use') {
        const id = typeof block.id === 'string' ? block.id : '';
        if (!id || this.seenToolIds.has(id)) continue;
        this.seenToolIds.add(id);

        const name = typeof block.name === 'string' ? block.name : '';
        const input = (block.input && typeof block.input === 'object' ? block.input : {}) as Record<string, unknown>;

        if (name === 'Agent' || name === 'Task') {
          // Background agents return a launch acknowledgment immediately —
          // their tool_result is NOT a completion signal, so skip taskIds.
          const isBackground = input.run_in_background === true;
          if (!isBackground) {
            this.taskIds.add(id);
          }

          const desc = typeof input.description === 'string' ? input.description
            : typeof input.subagent_type === 'string' ? input.subagent_type
            : undefined;
          this.activeSubagents.set(id, desc);
          this.eventEmitter.fire({
            type: 'subagent-spawn',
            agentId: id,
            description: desc,
          });
        } else {
          this.eventEmitter.fire({
            type: 'tool-call',
            toolName: name,
            toolInput: input,
            isTask: false,
          });
        }
      } else if (block.type === 'thinking' && !firedThinking) {
        if (typeof block.thinking === 'string' && block.thinking) {
          firedThinking = true;
          this.eventEmitter.fire({
            type: 'thinking',
            messageId: typeof entry.uuid === 'string' ? entry.uuid : '',
          });
        }
      } else if (block.type === 'text' && !firedText) {
        if (typeof block.text === 'string' && block.text.trim().length > 0) {
          firedText = true;
          this.eventEmitter.fire({
            type: 'text-output',
            messageId: typeof entry.uuid === 'string' ? entry.uuid : '',
          });
        }
      }
    }

    // Detect turn-ending: stop_reason === 'end_turn' is the definitive signal
    const stopReason = (message as Record<string, unknown>).stop_reason;
    if (stopReason === 'end_turn') {
      this.sessionActive = false;
      this.lastInactiveReason = 'end_turn';
      this.eventEmitter.fire({ type: 'session-state', isOngoing: false, reason: 'end_turn' });
    }
  }

  private processUserEntry(entry: Record<string, unknown>): void {
    const message = entry.message as Record<string, unknown> | undefined;
    if (!message) return;

    const content = message.content;

    // content can be a plain string (e.g. task-notification entries) or an array of blocks.
    if (typeof content === 'string') {
      this.parseTaskNotifications(content);
      return;
    }

    if (!Array.isArray(content)) return;

    for (const block of (content as Array<Record<string, unknown>>)) {
      if (block.type === 'tool_result') {
        const toolUseId = typeof block.tool_use_id === 'string' ? block.tool_use_id : '';
        if (!toolUseId) continue;

        if (this.taskIds.has(toolUseId)) {
          this.activeSubagents.delete(toolUseId);
          this.eventEmitter.fire({
            type: 'subagent-complete',
            agentId: toolUseId,
          });
        }

        if (block.is_error === true) {
          this.eventEmitter.fire({
            type: 'tool-error',
            toolUseId,
          });
        }
      } else if (block.type === 'text' && typeof block.text === 'string') {
        this.parseTaskNotifications(block.text);
      }
    }
  }

  /** Parse `<task-notification>` tags from a text string and fire subagent-complete. */
  private parseTaskNotifications(text: string): void {
    const notifPattern = /<task-notification>([\s\S]*?)<\/task-notification>/g;
    let notifMatch;
    while ((notifMatch = notifPattern.exec(text)) !== null) {
      const body = notifMatch[1];
      const statusMatch = /<status>(\w+)<\/status>/.exec(body);
      const idMatch = /<tool-use-id>([^<]+)<\/tool-use-id>/.exec(body);
      if (statusMatch && statusMatch[1] === 'completed' && idMatch) {
        const toolUseId = idMatch[1].trim();
        if (this.activeSubagents.has(toolUseId)) {
          this.activeSubagents.delete(toolUseId);
          this.eventEmitter.fire({
            type: 'subagent-complete',
            agentId: toolUseId,
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Session state & idle detection
  // ---------------------------------------------------------------------------

  private fireSessionActive(): void {
    // Any new JSONL line means the turn isn't over — cancel pending turn-end


    // Only emit on idle→active transition (edge-trigger)
    if (!this.sessionActive) {
      const resumed = this.lastInactiveReason === 'idle';
      this.sessionActive = true;
      this.lastInactiveReason = null;
      this.eventEmitter.fire({ type: 'session-state', isOngoing: true, resumed });
    }

    // Reset the idle timer — fire session-idle after 8s of no activity
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      this.sessionActive = false;
      this.lastInactiveReason = 'idle';
      this.eventEmitter.fire({ type: 'session-state', isOngoing: false, reason: 'idle' });
    }, 8_000);
  }


  // ---------------------------------------------------------------------------
  // Rescan timer — detect new session files every 10s
  // ---------------------------------------------------------------------------

  private startRescanTimer(): void {
    if (this.rescanTimer) return;

    this.rescanTimer = setInterval(() => {
      if (this.disposed || this.paused) return;

      // Don't auto-switch when user has pinned a specific session
      if (this.pinnedSession) return;

      const latest = this.findLatestSessionFile();
      if (!latest) {
        // If we were connected and the file is gone, handle it
        if (this.state === 'connected' && this.watchedFilePath && !fs.existsSync(this.watchedFilePath)) {
          this.handleWatchError();
        }
        return;
      }

      // New session file detected — switch to it
      if (latest !== this.watchedFilePath) {
        this.stopWatcher();
        this.lineBuffer = '';
        this.startWatching(latest);
      }
    }, 10_000);
  }

  // ---------------------------------------------------------------------------
  // Connection state management
  // ---------------------------------------------------------------------------

  private setState(state: ConnectionState): void {
    this.state = state;
    this.eventEmitter.fire({ type: 'connection', state });
  }

  private handleWatchError(): void {
    if (this.disposed) return;
    this.stopWatcher();
    this.setState('disconnected');
    // The rescan timer will pick up a new session file if one appears
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  private resetParserState(): void {
    this.seenToolIds.clear();
    this.taskIds.clear();
    this.activeSubagents.clear();
    this.lineBuffer = '';
    this.sessionActive = false;
    this.lastInactiveReason = null;
  }

  private stopWatcher(): void {
    if (this.watcher) {
      try {
        this.watcher.close();
      } catch {
        // Ignore close errors
      }
      this.watcher = null;
    }
    this.watchedFilePath = null;
  }

  private cleanup(): void {
    this.stopWatcher();

    if (this.rescanTimer) {
      clearInterval(this.rescanTimer);
      this.rescanTimer = null;
    }

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }


  }
}
