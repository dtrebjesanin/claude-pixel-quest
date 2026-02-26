import { GameLoop } from './engine/GameLoop';
import { Camera } from './engine/Camera';
import { createScene, ThemeId } from './scene/SceneFactory';
import { EventBridge } from './bridge/EventBridge';

// Declared globally by the webview HTML
declare const window: Window & {
  vscodeApi: { postMessage: (msg: unknown) => void };
  pixelQuestTheme?: string;
};

function main() {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  if (!canvas) return;

  const themeId = (window.pixelQuestTheme || 'cave') as ThemeId;
  const camera = new Camera(canvas);
  const state = { scene: createScene(themeId) };
  const bridge = new EventBridge();

  bridge.setScene(state.scene);
  state.scene.attachCanvas(canvas);

  // Handle resize
  camera.onResize((w, h) => state.scene.resize(w, h));

  // Trigger initial resize so stretch is computed before first frame
  state.scene.resize(camera.width, camera.height);

  // Load scene assets (currently all procedural, resolves immediately)
  state.scene.load().then(() => {
    const ctx = camera.getContext();

    const loop = new GameLoop(
      (dt) => {
        state.scene.update(dt);
      },
      (_interpolation) => {
        camera.clear();
        state.scene.render(ctx, camera);
      },
    );

    loop.start();

    // Listen for messages from canvas UI and extension responses
    const forwardToExtension = new Set([
      'request-projects', 'request-sessions', 'reconnect',
      'select-project-dir', 'watch-session', 'follow-latest',
    ]);

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg?.type) return;

      if (msg.type === 'theme-change') {
        const pickerState = state.scene.getPickerState();
        const newScene = createScene(msg.themeId as ThemeId);
        newScene.load().then(() => {
          state.scene.detachCanvas();
          newScene.setPickerState(pickerState);
          newScene.attachCanvas(canvas);
          newScene.resize(camera.width, camera.height);
          bridge.setScene(newScene);
          state.scene = newScene;
          window.vscodeApi.postMessage({ type: 'theme-change', themeId: msg.themeId });
          window.vscodeApi.postMessage({ type: 'ready' });
        }).catch(() => {});
      } else if (forwardToExtension.has(msg.type)) {
        window.vscodeApi.postMessage(msg);
      } else if (msg.type === 'project-list' || msg.type === 'session-list') {
        bridge.handleDataResponse(msg);
      }
    });

    // Tell extension host we're ready
    window.vscodeApi.postMessage({ type: 'ready' });
  }).catch(() => {});
}

// Boot
main();
