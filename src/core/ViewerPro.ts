/**
 * ViewerPro - 现代化的图片查看器（精简主类）
 * 负责编排 UI 与 WebGL 引擎，逻辑拆分至独立模块
 */

import type { ImageObj, ViewerProOptions } from './types';
import { DEFAULT_CONFIG, PERFORMANCE_CONFIG } from './constants';
import { debounce, isWebGLSupported, waitForDOMUpdate, getClampedDevicePixelRatio } from './utils';
import { WebGLImageViewerEngine } from './webgl-engine';
import {
  createPreviewContainer,
  initializeElements,
  showLoading,
  hideLoading,
  updateProgress,
  showError,
  updateNavigationButtons,
  setCanvasSize,
  showContainer,
  hideContainer,
  cleanupPreviousState,
  type UIElements
} from './ui-components';

export class ViewerPro {
  private elements!: UIElements;
  private webglViewer: WebGLImageViewerEngine | null = null;

  private images: ImageObj[] = [];
  private currentIndex = 0;
  private webglOptions = DEFAULT_CONFIG;
  private isDestroyed = false;

  // 加载状态
  private currentLoadingId = 0;
  private currentAbortController: AbortController | null = null;
  private isLoading = false;

  // 缓存/性能
  private canvasSizeCache: { width: number; height: number; timestamp: number } | null = null;
  private resizeTimeoutId: number | null = null;

  constructor(options: ViewerProOptions = {}) {
    this.webglOptions = { ...DEFAULT_CONFIG, ...options.webglOptions };
    this.images = Array.isArray(options.images) ? [...options.images] : [];

    const container = createPreviewContainer();
    this.elements = initializeElements(container);
    this.bindEvents();
  }

  public init(): this {
    return this;
  }

  public addImages(images: ImageObj[]): this {
    this.images = [...images];
    return this;
  }

  public open(index: number): this {
    if (this.isDestroyed || index < 0 || index >= this.images.length) return this;
    this.currentIndex = index;
    showContainer(this.elements.container);
    // 通过两帧 RAF 让布局稳定，再开始加载
    requestAnimationFrame(() => this.updatePreview());
    return this;
  }

  public close(): this {
    if (this.isDestroyed) return this;
    hideContainer(this.elements.container);

    if (this.webglViewer) {
      this.webglViewer.destroy();
      this.webglViewer = null;
    }
    return this;
  }

  public destroy(): this {
    if (this.isDestroyed) return this;
    this.isDestroyed = true;

    // 取消加载
    this.currentAbortController?.abort();
    this.currentAbortController = null;
    this.currentLoadingId++;
    this.isLoading = false;

    // 销毁引擎
    this.webglViewer?.destroy();
    this.webglViewer = null;

    // 清理缓存/定时器
    this.canvasSizeCache = null;
    if (this.resizeTimeoutId) {
      clearTimeout(this.resizeTimeoutId);
      this.resizeTimeoutId = null;
    }

    // 移除容器
    const container = this.elements?.container;
    if (container?.parentNode) container.parentNode.removeChild(container);

    // 重置
    this.images = [];
    this.currentIndex = 0;
    document.body.style.overflow = '';
    return this;
  }

  public getCurrentIndex(): number { return this.currentIndex; }
  public getImagesCount(): number { return this.images.length; }
  public getCurrentImage(): ImageObj | null { return this.images[this.currentIndex] || null; }
  public isOpen(): boolean { return !this.isDestroyed && this.elements.container.style.display !== 'none'; }

  // 事件绑定
  private bindEvents(): void {
    const debouncedKeyHandler = debounce((e: KeyboardEvent) => this.handleKeyDown(e), 50);

    this.elements.closeButton.addEventListener('click', () => this.close());
    this.elements.prevButton.addEventListener('click', () => this.navigate(-1));
    this.elements.nextButton.addEventListener('click', () => this.navigate(1));
    this.elements.zoomInButton.addEventListener('click', () => this.webglViewer?.zoomIn(this.webglOptions.smooth));
    this.elements.zoomOutButton.addEventListener('click', () => this.webglViewer?.zoomOut(this.webglOptions.smooth));
    this.elements.resetZoomButton.addEventListener('click', () => this.webglViewer?.resetView());

    document.addEventListener('keydown', debouncedKeyHandler);
    this.elements.container.addEventListener('click', (e) => {
      if (e.target === this.elements.container) this.close();
    });
  }

  // 预览更新
  private async updatePreview(): Promise<void> {
    if (this.isDestroyed) return;

    const currentImage = this.images[this.currentIndex];
    if (!currentImage) return;

    // 取消上一次加载
    this.currentAbortController?.abort();
    this.currentAbortController = new AbortController();
    const loadingId = ++this.currentLoadingId;

    // 标题 & 状态
    this.elements.title.textContent = currentImage.title || '图片预览';
    this.isLoading = true;

    // 清理旧状态并显示 loading
    this.cleanupPreviousState();
    showLoading(this.elements);

    try {
      // 仍有效？
      if (loadingId !== this.currentLoadingId || this.currentAbortController.signal.aborted) return;

      await this.setupCanvas();
      if (loadingId !== this.currentLoadingId || this.currentAbortController.signal.aborted) return;

      await this.loadImageIntoViewer(currentImage.src, loadingId, this.currentAbortController.signal);
      if (loadingId !== this.currentLoadingId || this.currentAbortController.signal.aborted) {
        // 过期请求，清理
        this.webglViewer?.destroy();
        this.webglViewer = null;
        return;
      }

      hideLoading(this.elements);
      this.isLoading = false;
    } catch (error) {
      if (loadingId === this.currentLoadingId && !this.currentAbortController.signal.aborted) {
        showError(this.elements, error);
        this.isLoading = false;
      }
    }

    if (loadingId === this.currentLoadingId && !this.currentAbortController.signal.aborted) {
      updateNavigationButtons(this.elements, this.currentIndex, this.images.length);
    }
  }

  private cleanupPreviousState(): void {
    this.webglViewer?.destroy();
    this.webglViewer = null;
    cleanupPreviousState(this.elements);
  }

  // Canvas 尺寸与像素比
  private async setupCanvas(): Promise<void> {
    const now = Date.now();
    if (this.canvasSizeCache && (now - this.canvasSizeCache.timestamp) < PERFORMANCE_CONFIG.CANVAS_SIZE_CACHE_TTL) {
      const { width, height } = this.canvasSizeCache;
      setCanvasSize(this.elements.canvas, width, height);
    } else {
      const rect = this.elements.container.getBoundingClientRect();
      const width = Math.min(rect.width * 0.8, window.innerWidth * 0.9);
      const height = Math.min(rect.height * 0.8, window.innerHeight * 0.9);
      this.canvasSizeCache = { width, height, timestamp: now };
      setCanvasSize(this.elements.canvas, width, height);
    }

    await waitForDOMUpdate();

    const canvasRect = this.elements.canvas.getBoundingClientRect();
    if (canvasRect.width === 0 || canvasRect.height === 0) {
      throw new Error(`Canvas size is invalid: ${canvasRect.width}x${canvasRect.height}`);
    }

    const dpr = getClampedDevicePixelRatio();
    this.elements.canvas.width = canvasRect.width * dpr;
    this.elements.canvas.height = canvasRect.height * dpr;
  }

  private async loadImageIntoViewer(src: string, loadingId: number, abortSignal: AbortSignal): Promise<void> {
    if (!isWebGLSupported()) throw new Error('WebGL not supported in this browser');

    try {
      if (loadingId !== this.currentLoadingId || abortSignal.aborted) throw new Error('Load request cancelled');

      this.webglViewer = new WebGLImageViewerEngine(this.elements.canvas, this.webglOptions);
      await this.webglViewer.loadImage(src, (loaded, total) => {
        if (loadingId === this.currentLoadingId && !abortSignal.aborted) updateProgress(this.elements, loaded, total);
      }, abortSignal);

      if (loadingId !== this.currentLoadingId || abortSignal.aborted) throw new Error('Load request cancelled after completion');
    } catch (error) {
      this.webglViewer?.destroy();
      this.webglViewer = null;
      throw error;
    }
  }

  private navigate(direction: number): void {
    const newIndex = this.currentIndex + direction;
    if (newIndex >= 0 && newIndex < this.images.length) {
      this.currentIndex = newIndex;
      this.updatePreview();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isOpen()) return;

  const prevent = ['Escape', 'ArrowLeft', 'ArrowRight', '+', '=', '-', '0'];
  if (prevent.indexOf(e.key) !== -1) e.preventDefault();

    const map: Record<string, () => void> = {
      Escape: () => this.close(),
      ArrowLeft: () => this.navigate(-1),
      ArrowRight: () => this.navigate(1),
      '+': () => this.webglViewer?.zoomIn(this.webglOptions.smooth),
      '=': () => this.webglViewer?.zoomIn(this.webglOptions.smooth),
      '-': () => this.webglViewer?.zoomOut(this.webglOptions.smooth),
      '0': () => this.webglViewer?.resetView(),
    };

    map[e.key]?.();
  }
}

// 导出到 window（保持对外 API 兼容）
(window as any).ViewerPro = ViewerPro;