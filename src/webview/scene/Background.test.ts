import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Background } from './Background';

describe('Background', () => {
  let bg: Background;

  beforeEach(() => {
    bg = new Background();
  });

  describe('initial state', () => {
    it('has empty details, width=300, height=400 before generate()', () => {
      expect((bg as any).details).toEqual([]);
      expect((bg as any).width).toBe(300);
      expect((bg as any).height).toBe(400);
    });
  });

  describe('generate()', () => {
    it('creates exactly 60 details', () => {
      bg.generate(800, 600);
      expect((bg as any).details).toHaveLength(60);
    });

    it('is deterministic — same dimensions always produce identical details', () => {
      bg.generate(800, 600);
      const firstRun = JSON.parse(JSON.stringify((bg as any).details));

      bg.generate(800, 600);
      const secondRun = (bg as any).details;

      expect(secondRun).toEqual(firstRun);
    });

    it('resets details when called again with new dimensions', () => {
      bg.generate(800, 600);
      const firstDetails = JSON.parse(JSON.stringify((bg as any).details));

      bg.generate(1024, 768);
      const secondDetails = (bg as any).details;

      expect(secondDetails).toHaveLength(60);
      expect(secondDetails).not.toEqual(firstDetails);
    });

    it('keeps all generated x values within [0, width)', () => {
      const width = 640;
      bg.generate(width, 480);
      for (const d of (bg as any).details) {
        expect(d.x).toBeGreaterThanOrEqual(0);
        expect(d.x).toBeLessThan(width);
      }
    });

    it('keeps all generated y values within [0, height)', () => {
      const height = 480;
      bg.generate(640, height);
      for (const d of (bg as any).details) {
        expect(d.y).toBeGreaterThanOrEqual(0);
        expect(d.y).toBeLessThan(height);
      }
    });

    it('generates w values in range [2, 5]', () => {
      bg.generate(800, 600);
      for (const d of (bg as any).details) {
        expect(d.w).toBeGreaterThanOrEqual(2);
        expect(d.w).toBeLessThanOrEqual(5);
      }
    });

    it('generates h values in range [2, 4]', () => {
      bg.generate(800, 600);
      for (const d of (bg as any).details) {
        expect(d.h).toBeGreaterThanOrEqual(2);
        expect(d.h).toBeLessThanOrEqual(4);
      }
    });

    it('assigns only rockDark or rockMid as detail colors', () => {
      bg.generate(800, 600);
      const validColors = ['#2c2c3a', '#3d3d50'];
      for (const d of (bg as any).details) {
        expect(validColors).toContain(d.color);
      }
    });

    it('produces different x/y values for different dimensions', () => {
      bg.generate(200, 200);
      const smallDetails = (bg as any).details.map((d: any) => ({ x: d.x, y: d.y }));

      bg.generate(2000, 2000);
      const largeDetails = (bg as any).details.map((d: any) => ({ x: d.x, y: d.y }));

      // With a 10x larger canvas, the max x/y values should be much larger
      const smallMaxX = Math.max(...smallDetails.map((d: any) => d.x));
      const largeMaxX = Math.max(...largeDetails.map((d: any) => d.x));
      expect(largeMaxX).toBeGreaterThan(smallMaxX);
    });
  });

  describe('render()', () => {
    function createMockCtx() {
      const gradientMock = {
        addColorStop: vi.fn(),
      };
      return {
        fillStyle: '',
        fillRect: vi.fn(),
        createLinearGradient: vi.fn(() => gradientMock),
        _gradient: gradientMock,
      };
    }

    it('auto-generates when called with new dimensions', () => {
      const ctx = createMockCtx();
      expect((bg as any).details).toHaveLength(0);

      // Default internal size is 300x400, so calling with 800x600 triggers regeneration
      bg.render(ctx as unknown as CanvasRenderingContext2D, 800, 600);

      expect((bg as any).details).toHaveLength(60);
      expect((bg as any).width).toBe(800);
      expect((bg as any).height).toBe(600);
    });

    it('does not regenerate when dimensions match', () => {
      const ctx = createMockCtx();

      bg.generate(800, 600);
      const detailsAfterGenerate = (bg as any).details;
      const ref = detailsAfterGenerate[0];

      bg.render(ctx as unknown as CanvasRenderingContext2D, 800, 600);

      // Same reference means generate() was NOT called again
      expect((bg as any).details[0]).toBe(ref);
    });

    it('calls fillRect and createLinearGradient on the context', () => {
      const ctx = createMockCtx();
      bg.render(ctx as unknown as CanvasRenderingContext2D, 800, 600);

      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 600);
      expect(ctx._gradient.addColorStop).toHaveBeenCalled();
    });
  });
});
