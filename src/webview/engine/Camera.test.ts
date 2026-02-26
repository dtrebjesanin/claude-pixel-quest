// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Camera } from './Camera';

describe('Camera', () => {
  let canvas: HTMLCanvasElement;
  let mockCtx: {
    imageSmoothingEnabled: boolean;
    setTransform: ReturnType<typeof vi.fn>;
    clearRect: ReturnType<typeof vi.fn>;
  };
  let parentDiv: HTMLDivElement;
  let resizeObserverCallback: (entries: Array<{ contentRect: { width: number; height: number } }>) => void;
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create canvas and mock getContext
    canvas = document.createElement('canvas');
    mockCtx = {
      imageSmoothingEnabled: true,
      setTransform: vi.fn(),
      clearRect: vi.fn(),
    };
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);

    // Create parent div and append canvas
    parentDiv = document.createElement('div');
    parentDiv.appendChild(canvas);
    document.body.appendChild(parentDiv);

    // Mock parent getBoundingClientRect
    vi.spyOn(parentDiv, 'getBoundingClientRect').mockReturnValue({
      width: 400,
      height: 600,
      x: 0,
      y: 0,
      top: 0,
      right: 400,
      bottom: 600,
      left: 0,
      toJSON: () => {},
    });

    // Mock ResizeObserver using a class so it works with `new`
    mockObserve = vi.fn();
    mockDisconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: typeof resizeObserverCallback) {
          resizeObserverCallback = cb;
        }
        observe = mockObserve;
        disconnect = mockDisconnect;
      },
    );

    // Set device pixel ratio (use Object.defineProperty since jsdom marks it read-only)
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
  });

  afterEach(() => {
    if (parentDiv.parentElement) {
      document.body.removeChild(parentDiv);
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('constructor sets imageSmoothingEnabled to false', () => {
    new Camera(canvas);
    expect(mockCtx.imageSmoothingEnabled).toBe(false);
  });

  it('constructor observes document.body via ResizeObserver', () => {
    new Camera(canvas);
    expect(mockObserve).toHaveBeenCalledWith(document.body);
  });

  it('performs initial resize from parent element dimensions', () => {
    const camera = new Camera(canvas);

    // Parent returns 400x600, so resize should have been called
    expect(camera.width).toBe(400);
    expect(camera.height).toBe(600);
    expect(canvas.width).toBe(Math.floor(400 * 2)); // w * dpr
    expect(canvas.height).toBe(Math.floor(600 * 2));
    expect(canvas.style.width).toBe('400px');
    expect(canvas.style.height).toBe('600px');
    expect(mockCtx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  it('getContext() returns the 2d context', () => {
    const camera = new Camera(canvas);
    expect(camera.getContext()).toBe(mockCtx);
  });

  it('getScale() returns width / LOGICAL_WIDTH (default = 1)', () => {
    // Without initial resize (no parent)
    const orphanCanvas = document.createElement('canvas');
    vi.spyOn(orphanCanvas, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
    // orphanCanvas has no parentElement so no initial resize
    const camera = new Camera(orphanCanvas);
    // Default width is 300, LOGICAL_WIDTH is 300
    expect(camera.getScale()).toBe(1);
  });

  it('getScale() returns correct ratio after resize', () => {
    const camera = new Camera(canvas);
    // After initial resize, width = 400
    expect(camera.getScale()).toBe(400 / 300);

    // Trigger another resize via ResizeObserver
    resizeObserverCallback([{ contentRect: { width: 600, height: 800 } }]);
    expect(camera.getScale()).toBe(600 / 300);
  });

  it('clear() calls clearRect with current width and height', () => {
    const camera = new Camera(canvas);
    mockCtx.clearRect.mockClear();

    camera.clear();
    expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 400, 600);
  });

  it('onResize callback fires when resize happens', () => {
    const camera = new Camera(canvas);
    const callback = vi.fn();
    camera.onResize(callback);

    // Trigger resize via ResizeObserver
    resizeObserverCallback([{ contentRect: { width: 500, height: 700 } }]);
    expect(callback).toHaveBeenCalledWith(500, 700);
  });

  it('onResize callback does not fire before being registered', () => {
    const callback = vi.fn();

    // Initial resize happens in constructor, before onResize is called
    new Camera(canvas);
    // Register after construction - the initial resize already happened
    expect(callback).not.toHaveBeenCalled();
  });

  it('DPR scaling sets canvas dimensions and transform correctly', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true });
    const camera = new Camera(canvas);

    // Parent is 400x600, dpr=3
    expect(canvas.width).toBe(Math.floor(400 * 3));
    expect(canvas.height).toBe(Math.floor(600 * 3));
    expect(mockCtx.setTransform).toHaveBeenCalledWith(3, 0, 0, 3, 0, 0);
    expect(camera.width).toBe(400);
    expect(camera.height).toBe(600);
  });

  it('DPR defaults to 1 when devicePixelRatio is falsy', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 0, configurable: true });
    new Camera(canvas);

    // dpr falls back to 1, so canvas.width = 400 * 1
    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(600);
    expect(mockCtx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
  });

  it('LOGICAL_HEIGHT is 400', () => {
    const camera = new Camera(canvas);
    expect(camera.LOGICAL_HEIGHT).toBe(400);
  });

  it('getScale() uses height when height is the constraining dimension', () => {
    const camera = new Camera(canvas);
    // Wide panel: 900x400 → min(900/300, 400/400) = min(3, 1) = 1
    resizeObserverCallback([{ contentRect: { width: 900, height: 400 } }]);
    expect(camera.getScale()).toBe(1);
  });

  it('getScale() uses width when width is the constraining dimension', () => {
    const camera = new Camera(canvas);
    // Narrow sidebar: 150x600 → min(150/300, 600/400) = min(0.5, 1.5) = 0.5
    resizeObserverCallback([{ contentRect: { width: 150, height: 600 } }]);
    expect(camera.getScale()).toBe(0.5);
  });

  it('getOffsetX() returns centering offset when height-constrained', () => {
    const camera = new Camera(canvas);
    // Wide: 900x400 → scale=1, gameW=300, offsetX=(900-300)/2 = 300
    resizeObserverCallback([{ contentRect: { width: 900, height: 400 } }]);
    expect(camera.getOffsetX()).toBe(300);
    expect(camera.getOffsetY()).toBe(0);
  });

  it('getOffsetY() always returns 0 (no vertical centering)', () => {
    const camera = new Camera(canvas);
    // Narrow: 150x600 → width-constrained, but offsetY is always 0
    resizeObserverCallback([{ contentRect: { width: 150, height: 600 } }]);
    expect(camera.getOffsetX()).toBe(0);
    expect(camera.getOffsetY()).toBe(0);
  });

  it('offsets are both 0 when aspect ratio matches 3:4', () => {
    const camera = new Camera(canvas);
    resizeObserverCallback([{ contentRect: { width: 600, height: 800 } }]);
    expect(camera.getOffsetX()).toBe(0);
    expect(camera.getOffsetY()).toBe(0);
  });

  it('dispose() disconnects the ResizeObserver', () => {
    const camera = new Camera(canvas);
    camera.dispose();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('ResizeObserver skips entries with zero width', () => {
    const camera = new Camera(canvas);
    // Record current width after initial resize
    const widthBefore = camera.width;

    resizeObserverCallback([{ contentRect: { width: 0, height: 500 } }]);
    expect(camera.width).toBe(widthBefore); // unchanged
  });

  it('ResizeObserver skips entries with zero height', () => {
    const camera = new Camera(canvas);
    const heightBefore = camera.height;

    resizeObserverCallback([{ contentRect: { width: 500, height: 0 } }]);
    expect(camera.height).toBe(heightBefore); // unchanged
  });

  it('no parent element means no initial resize', () => {
    const orphanCanvas = document.createElement('canvas');
    vi.spyOn(orphanCanvas, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
    // orphanCanvas.parentElement is null

    const camera = new Camera(orphanCanvas);

    // width and height should remain at defaults
    expect(camera.width).toBe(300);
    expect(camera.height).toBe(400);
  });

  it('imageSmoothingEnabled is reset to false on each resize', () => {
    new Camera(canvas);
    // After initial resize in constructor, imageSmoothingEnabled set false again
    mockCtx.imageSmoothingEnabled = true; // simulate engine changing it

    resizeObserverCallback([{ contentRect: { width: 500, height: 700 } }]);
    expect(mockCtx.imageSmoothingEnabled).toBe(false);
  });

  it('ResizeObserver processes multiple entries', () => {
    const camera = new Camera(canvas);
    const callback = vi.fn();
    camera.onResize(callback);

    resizeObserverCallback([
      { contentRect: { width: 100, height: 200 } },
      { contentRect: { width: 300, height: 400 } },
    ]);

    // Both entries should trigger resize; last one wins
    expect(callback).toHaveBeenCalledTimes(2);
    expect(camera.width).toBe(300);
    expect(camera.height).toBe(400);
  });

  // ── Variable height helpers ──

  it('getLogicalHeight() returns height / scale', () => {
    const camera = new Camera(canvas);
    // Narrow: 150x600 → scale=0.5, logicalHeight=600/0.5=1200
    resizeObserverCallback([{ contentRect: { width: 150, height: 600 } }]);
    expect(camera.getLogicalHeight()).toBe(1200);
  });

  it('getLogicalHeight() equals LOGICAL_HEIGHT when aspect matches 3:4', () => {
    const camera = new Camera(canvas);
    resizeObserverCallback([{ contentRect: { width: 300, height: 400 } }]);
    expect(camera.getLogicalHeight()).toBe(400);
  });

  it('getStretch() returns extra logical units beyond 400', () => {
    const camera = new Camera(canvas);
    // Narrow: 150x600 → scale=0.5, logicalHeight=1200, stretch=800
    resizeObserverCallback([{ contentRect: { width: 150, height: 600 } }]);
    expect(camera.getStretch()).toBe(800);
  });

  it('getStretch() is 0 when height-constrained (wide panel)', () => {
    const camera = new Camera(canvas);
    // Wide: 900x400 → scale=1, logicalHeight=400, stretch=0
    resizeObserverCallback([{ contentRect: { width: 900, height: 400 } }]);
    expect(camera.getStretch()).toBe(0);
  });

  it('getStretch() is 0 when aspect matches 3:4', () => {
    const camera = new Camera(canvas);
    resizeObserverCallback([{ contentRect: { width: 600, height: 800 } }]);
    expect(camera.getStretch()).toBe(0);
  });
});
