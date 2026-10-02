export class RendererAdapter {
  constructor({ canvasRenderer, activeRenderer = canvasRenderer }) {
    if (!canvasRenderer || typeof canvasRenderer.renderFrame !== 'function') {
      throw new TypeError('A Canvas fallback renderer is required.');
    }
    this.canvasRenderer = canvasRenderer;
    this.activeRenderer = activeRenderer || canvasRenderer;
    this.mode = this.activeRenderer.mode || 'canvas';
    this.lastError = null;
    this.metrics = { intervals: [], durations: [], firstFrame: null, lastFrame: null };
  }

  setActiveRenderer(renderer) {
    if (!renderer || typeof renderer.renderFrame !== 'function') {
      throw new TypeError('The active renderer must implement renderFrame(frame).');
    }
    this.activeRenderer?.setActive?.(false);
    this.activeRenderer = renderer;
    this.activeRenderer.setActive?.(true);
    this.mode = renderer.mode || 'renderer';
    this.lastError = null;
  }

  renderFrame(frame) {
    const start = performance.now();
    if (this.metrics.lastFrame !== null) this.metrics.intervals.push(start - this.metrics.lastFrame);
    else this.metrics.firstFrame = start;
    try {
      this.activeRenderer.renderFrame(frame);
      this.mode = this.lastError && this.activeRenderer === this.canvasRenderer
        ? 'canvas-fallback'
        : (this.activeRenderer.mode || 'renderer');
    } catch (error) {
      if (this.activeRenderer === this.canvasRenderer) throw error;
      this.lastError = error;
      this.activeRenderer?.setActive?.(false);
      this.activeRenderer = this.canvasRenderer;
      this.canvasRenderer.setActive?.(true);
      this.mode = 'canvas-fallback';
      this.canvasRenderer.renderFrame(frame);
    } finally {
      const finished = performance.now();
      this.metrics.durations.push(finished - start);
      this.metrics.lastFrame = finished;
    }
  }

  resetMetrics() {
    this.metrics = { intervals: [], durations: [], firstFrame: null, lastFrame: null };
  }

  getMetrics() {
    const intervals = [...this.metrics.intervals].sort((a, b) => a - b);
    const percentile = fraction => intervals.length
      ? intervals[Math.min(intervals.length - 1, Math.ceil(intervals.length * fraction) - 1)]
      : null;
    const durations = [...this.metrics.durations].sort((a, b) => a - b);
    return {
      sampleDurationMs: this.metrics.firstFrame === null ? 0 : this.metrics.lastFrame - this.metrics.firstFrame,
      frameCount: this.metrics.durations.length,
      medianFrameIntervalMs: percentile(0.5),
      p95FrameIntervalMs: percentile(0.95),
      p99FrameIntervalMs: percentile(0.99),
      maxFrameIntervalMs: intervals.length ? intervals.at(-1) : null,
      medianRenderCostMs: durations.length ? durations[Math.floor(durations.length / 2)] : null
    };
  }

  async destroy() {
    const renderers = new Set([this.activeRenderer, this.canvasRenderer]);
    await Promise.all([...renderers].map((renderer) => renderer.destroy?.()));
  }
}

export class Canvas2DRenderer {
  constructor(renderCanvas) {
    if (typeof renderCanvas !== 'function') throw new TypeError('Canvas2DRenderer requires the existing Canvas draw function.');
    this.renderCanvas = renderCanvas;
    this.mode = 'canvas';
  }

  renderFrame(frame) {
    this.renderCanvas(frame.time);
  }
}
