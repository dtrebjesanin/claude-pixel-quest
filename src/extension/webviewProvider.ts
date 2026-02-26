import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { SessionWatcher } from './SessionWatcher';

export class PixelQuestViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly bridge: SessionWatcher,
  ) {}

  postMessage(msg: unknown): void {
    this.view?.webview.postMessage(msg);
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Forward bridge events to webview
    this.disposables.push(this.bridge.onEvent((event) => {
      webviewView.webview.postMessage(event);
    }));

    // Handle messages from webview
    this.disposables.push(webviewView.webview.onDidReceiveMessage((msg) => {
      if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;

      switch (msg.type) {
        case 'ready':
          this.bridge.sendCurrentState(webviewView.webview);
          break;
        case 'theme-change':
          if (typeof msg.themeId === 'string' && /^[a-z]+$/.test(msg.themeId)) {
            vscode.workspace.getConfiguration('pixelQuest').update('theme', msg.themeId, vscode.ConfigurationTarget.Global);
          }
          break;
        case 'request-projects': {
          const projects = this.bridge.listProjectDirs();
          webviewView.webview.postMessage({ type: 'project-list', projects });
          break;
        }
        case 'request-sessions': {
          const sessions = this.bridge.listSessions();
          const isFollowingLatest = this.bridge.isFollowingLatest();
          webviewView.webview.postMessage({ type: 'session-list', sessions, isFollowingLatest });
          break;
        }
        case 'select-project-dir':
          if (typeof msg.dirPath === 'string' && this.bridge.isValidProjectDir(msg.dirPath)) {
            this.bridge.connectToProject(msg.dirPath);
          }
          break;
        case 'watch-session':
          if (typeof msg.filePath === 'string' && this.bridge.isValidSessionFile(msg.filePath)) {
            this.bridge.watchSession(msg.filePath);
          }
          break;
        case 'follow-latest':
          this.bridge.followLatest();
          break;
        case 'reconnect':
          this.bridge.reconnect();
          break;
      }
    }));
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js'),
    );
    const nonce = crypto.randomBytes(16).toString('hex');

    // Read current theme setting
    const themeId = vscode.workspace.getConfiguration('pixelQuest').get<string>('theme', 'cave');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1a2e; }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script nonce="${nonce}">
    window.pixelQuestTheme = ${JSON.stringify(themeId)};
    window.vscodeApi = acquireVsCodeApi();
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
