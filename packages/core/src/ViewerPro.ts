import { fullscreenIcon, fullscreenExitIcon } from "./ui/icons";
import type { RenderBackend } from "./backends/RenderBackend";
import { CssBackend } from "./backends/CssBackend";
import {
  BackendRouter,
  type BackendChoice,
  type ResolvedBackendKind,
} from "./backends/BackendRouter";
import { TransformEngine } from "./engine/TransformEngine";
import type { ContentBounds, TransformConfig } from "./engine/TransformEngine";
import { GestureController } from "./engine/GestureController";
import { decodeBlob } from "./engine/ImageDecoder";
import {
  DEFAULT_MOBILE_TOOLBAR,
  DEFAULT_PRELOAD_CACHE_LIMIT,
  DEFAULT_ZOOM_CONFIG,
} from "./config/defaults";
import type {
  LoadingContext,
  TransformChangeState,
  ToolbarAction,
  ViewerItem,
  ViewerProOptions,
  ZoomConfig,
} from "./types";
import { collectViewerElements } from "./ui/elements";
import { ThumbnailController } from "./controllers/ThumbnailController";
import { KeyboardController } from "./controllers/KeyboardController";
import { ImagePreloader } from "./utils/ImagePreloader";
import { ScrollLock } from "./utils/ScrollLock";
import { getViewerTemplate } from "./ui/template";

export class ViewerPro {
  private static nextInstanceId = 0;

  private readonly instanceId = ViewerPro.nextInstanceId++;
  private previewContainer!: HTMLElement;
  private previewImage!: HTMLImageElement;
  private previewTitle!: HTMLElement;
  private closeButton!: HTMLElement;
  private prevButton!: HTMLButtonElement;
  private nextButton!: HTMLButtonElement;
  private zoomInButton!: HTMLButtonElement | null;
  private zoomOutButton!: HTMLButtonElement | null;
  private resetZoomButton!: HTMLButtonElement | null;
  private fullscreenButton!: HTMLButtonElement | null;
  private downloadButton!: HTMLButtonElement | null;
  private imageCounter!: HTMLElement | null;
  private loadingIndicator!: HTMLElement;
  private errorMessage!: HTMLElement;
  private thumbnailNav!: HTMLElement;
  private imageContainer!: HTMLElement;
  private toggleInfoBtn!: HTMLButtonElement | null;
  private toggleThumbsBtn!: HTMLButtonElement | null;
  // 新增：侧边工具栏按钮 & 缩放滑杆等
  private sideZoomInBtn!: HTMLButtonElement;
  private sideZoomOutBtn!: HTMLButtonElement;
  private sideResetZoomBtn!: HTMLButtonElement;
  private sideRotateLeftBtn!: HTMLButtonElement;
  private sideRotateRightBtn!: HTMLButtonElement;
  private sideFullscreenBtn!: HTMLButtonElement;
  private sideDownloadBtn!: HTMLButtonElement;
  private sideInfoBtn!: HTMLButtonElement;
  private sideToggleThumbsBtn!: HTMLButtonElement;
  private customLoadingNode:
    | HTMLElement
    | (() => HTMLElement)
    | ((
        item: ViewerItem,
        idx: number,
      ) =>
        | HTMLElement
        | {
            node: HTMLElement;
            done: (context: LoadingContext) => void | Promise<void>;
          })
    | null;
  private customRenderNode:
    | HTMLElement
    | ((item: ViewerItem, idx: number) => HTMLElement)
    | null;
  private customInfoRender:
    | HTMLElement
    | ((item: ViewerItem, idx: number) => HTMLElement)
    | null;
  private onImageLoad: ((item: ViewerItem, idx: number) => void) | null;
  private onContentReady: ((item: ViewerItem, idx: number) => void) | null;
  private onTransformChangeCb:
    | ((state: {
        scale: number;
        translateX: number;
        translateY: number;
        rotation: number;
        index: number;
        image: ViewerItem | null;
      }) => void)
    | null;
  private infoPanel!: HTMLElement; // 复用字段，但表现改为弹窗
  private infoCollapseBtn!: HTMLElement; // 弹窗关闭按钮
  private infoPanelContent!: HTMLElement;

  private images: ViewerItem[] = [];
  private currentIndex = 0;
  private isFullscreen = false;
  private theme: "dark" | "light" | "auto" = "dark";
  private imageLoadToken: number = 0;
  private currentImageLoadStatus: { loaded: boolean; error?: string } = {
    loaded: false,
  };
  private imageLoadCallbacks: Array<() => void> = [];
  private imageErrorCallbacks: Array<(error: string) => void> = [];
  // Resource management
  private activeBlobUrl: string | null = null;
  private activeXHR: XMLHttpRequest | null = null;
  // Cached custom render node (also a render-backend target)
  private cachedCustomNode: HTMLElement | null = null;

  // Render backend (CssBackend or WebGLBackend, chosen by BackendRouter).
  private renderBackend!: RenderBackend;
  private backendKind: ResolvedBackendKind = "css";
  private backendPreference: BackendChoice = "auto";
  private webglFiltering: "linear" | "nearest" | undefined;
  // Transform state + math (zoom / pan / rotate)
  private transformEngine!: TransformEngine;
  // Gesture binding (mouse / wheel / touch / dblclick / backdrop click)
  private gestureController!: GestureController;
  private thumbnailController!: ThumbnailController;
  private keyboardController!: KeyboardController;
  private scrollLock = new ScrollLock();
  private mobileToolbar: ToolbarAction[] = DEFAULT_MOBILE_TOOLBAR;
  private mobileSwipeToNavigate = true;
  private swipeConfig: ViewerProOptions["swipeConfig"];
  private preloadAdjacent = false;
  private preloadCacheLimit = DEFAULT_PRELOAD_CACHE_LIMIT;
  private imagePreloader = new ImagePreloader(DEFAULT_PRELOAD_CACHE_LIMIT);
  private keyboardShortcuts = true;
  private onOpenCb: ((item: ViewerItem, idx: number) => void) | null = null;
  private onCloseCb: (() => void) | null = null;
  private onIndexChangeCb: ((item: ViewerItem, idx: number) => void) | null =
    null;
  private onInfoPanelOpenCb: ((item: ViewerItem, idx: number) => void) | null =
    null;
  private onInfoPanelCloseCb: ((item: ViewerItem, idx: number) => void) | null =
    null;
  private transformListenerCount = 0;

  constructor(options: ViewerProOptions = {}) {
    this.images = Array.isArray(options.images) ? options.images : [];
    this.customLoadingNode = options.loadingNode || null;
    this.customRenderNode = options.renderNode || null;
    this.customInfoRender = options.infoRender || null;
    this.onImageLoad =
      typeof options.onImageLoad === "function" ? options.onImageLoad : null;
    this.onContentReady =
      typeof options.onContentReady === "function"
        ? options.onContentReady
        : null;
    this.onTransformChangeCb =
      typeof options.onTransformChange === "function"
        ? options.onTransformChange
        : null;
    this.theme = options.theme || "dark";
    this.mobileToolbar = options.mobileToolbar ?? DEFAULT_MOBILE_TOOLBAR;
    this.mobileSwipeToNavigate = options.mobileSwipeToNavigate !== false;
    this.swipeConfig = options.swipeConfig;
    this.preloadAdjacent = options.preloadAdjacent ?? false;
    this.preloadCacheLimit =
      options.preloadCacheLimit ?? DEFAULT_PRELOAD_CACHE_LIMIT;
    this.imagePreloader = new ImagePreloader(this.preloadCacheLimit);
    this.keyboardShortcuts = options.keyboardShortcuts !== false;
    this.onOpenCb =
      typeof options.onOpen === "function" ? options.onOpen : null;
    this.onCloseCb =
      typeof options.onClose === "function" ? options.onClose : null;
    this.onIndexChangeCb =
      typeof options.onIndexChange === "function"
        ? options.onIndexChange
        : null;
    this.onInfoPanelOpenCb =
      typeof options.onInfoPanelOpen === "function"
        ? options.onInfoPanelOpen
        : null;
    this.onInfoPanelCloseCb =
      typeof options.onInfoPanelClose === "function"
        ? options.onInfoPanelClose
        : null;

    // 初始化缩放配置 (defaults preserved from previous monolith)
    this.transformEngine = new TransformEngine({
      ...DEFAULT_ZOOM_CONFIG,
      ...options.zoomConfig,
    });

    this.initializeContainer();
    this.initializeElements();
    this.thumbnailController = new ThumbnailController({
      container: this.thumbnailNav,
      host: this.previewContainer,
      onSelect: (index) => this.open(index),
    });
    this.keyboardController = new KeyboardController({
      isEnabled: () => this.keyboardShortcuts,
      isActive: () => this.previewContainer.classList.contains("active"),
      isInfoOpen: () => this.infoPanel.classList.contains("open"),
      closeInfo: () => this.closeInfoPanel(),
      close: () => this.close(),
      navigate: (direction) => this.navigate(direction),
      zoomBy: (delta) =>
        this.transformEngine.zoomBy(delta, this.computeContentBounds()),
      reset: () => this.transformEngine.reset(),
      toggleFullscreen: () => this.toggleFullscreen(),
      download: () => this.downloadCurrentImage(),
      getZoomStep: () => this.transformEngine.getConfig().step,
    });

    // Resolve render backend (CSS / WebGL) based on options + capabilities.
    this.backendPreference = options.backend ?? "auto";
    this.webglFiltering = options.webglFiltering;
    const resolution = BackendRouter.resolve({
      hasCustomRenderNode: !!this.customRenderNode,
      preference: this.backendPreference,
      webglOptions: {
        filtering: this.webglFiltering,
        onContextLost: () => this.handleWebGLContextLost(),
      },
    });
    this.renderBackend = resolution.backend;
    this.backendKind = resolution.kind;
    // Mount backend (creates <canvas> overlay for WebGL; no-op for CSS).
    this.renderBackend.mount?.(this.imageContainer);
    // previewImage is the default transform target; custom render nodes
    // will be added/removed dynamically in updatePreview().
    this.renderBackend.addTarget(this.previewImage);

    // Wire engine -> backend + sync external state (dataset/event/callback).
    this.transformEngine.setListener(({ state, transition }) => {
      this.renderBackend.applyTransform(state, transition);
      if (this.imageContainer) {
        this.imageContainer.style.cursor = "grab";
      }
      this.syncTransformState();
    });

    // Wire DOM events -> engine via GestureController.
    this.gestureController = new GestureController();
    this.gestureController.bind({
      container: this.imageContainer,
      engine: this.transformEngine,
      getBounds: () => this.computeContentBounds(),
      onBackdropClick: () => this.handleBackdropClick(),
      onSwipe: (direction) => this.navigate(direction),
      swipeEnabled: this.mobileSwipeToNavigate,
      swipeConfig: this.swipeConfig,
      // dblclick falls back to engine.reset() (original behavior).
    });
    this.gestureController.bindBackdrop(this.previewContainer);

    this.bindEvents();

    if (this.images.length > 0) {
      this.updateThumbnails();
    }
  }

  private initializeContainer() {
    this.previewContainer = document.createElement("div");
    this.previewContainer.className = "image-preview-container";
    this.previewContainer.id =
      this.instanceId === 0
        ? "imagePreview"
        : `imagePreview-${this.instanceId}`;
    this.previewContainer.setAttribute("data-theme", this.theme);
    this.previewContainer.setAttribute(
      "data-viewer-pro-instance",
      String(this.instanceId),
    );
    this.previewContainer.setAttribute(
      "data-mobile-toolbar",
      this.mobileToolbar.join(" "),
    );
    document.body.appendChild(this.previewContainer);
    this.previewContainer.innerHTML = getViewerTemplate(this.instanceId);
  }

  private initializeElements() {
    const elements = collectViewerElements(this.previewContainer);
    Object.assign(this, elements);
  }

  private bindEvents() {
    const step = () => this.transformEngine.getConfig().step;
    const bounds = () => this.computeContentBounds();

    this.closeButton.addEventListener("click", () => this.close());
    this.prevButton.addEventListener("click", () => this.navigate(-1));
    this.nextButton.addEventListener("click", () => this.navigate(1));
    if (this.zoomInButton)
      this.zoomInButton.addEventListener("click", () =>
        this.transformEngine.zoomBy(step(), bounds()),
      );
    if (this.zoomOutButton)
      this.zoomOutButton.addEventListener("click", () =>
        this.transformEngine.zoomBy(-step(), bounds()),
      );
    if (this.resetZoomButton)
      this.resetZoomButton.addEventListener("click", () =>
        this.transformEngine.reset(),
      );
    if (this.fullscreenButton)
      this.fullscreenButton.addEventListener("click", () =>
        this.toggleFullscreen(),
      );
    if (this.downloadButton)
      this.downloadButton.addEventListener("click", () =>
        this.downloadCurrentImage(),
      );
    if (this.toggleInfoBtn)
      this.toggleInfoBtn.addEventListener("click", () =>
        this.toggleInfoPanel(),
      );
    if (this.toggleThumbsBtn)
      this.toggleThumbsBtn.addEventListener("click", () =>
        this.toggleThumbnails(),
      );
    // 侧边栏事件
    this.sideZoomInBtn.addEventListener("click", () =>
      this.transformEngine.zoomBy(step(), bounds()),
    );
    this.sideZoomOutBtn.addEventListener("click", () =>
      this.transformEngine.zoomBy(-step(), bounds()),
    );
    this.sideResetZoomBtn.addEventListener("click", () =>
      this.transformEngine.reset(),
    );
    this.sideRotateLeftBtn.addEventListener("click", () =>
      this.transformEngine.rotate(-90),
    );
    this.sideRotateRightBtn.addEventListener("click", () =>
      this.transformEngine.rotate(90),
    );
    this.sideFullscreenBtn.addEventListener("click", () =>
      this.toggleFullscreen(),
    );
    this.sideDownloadBtn.addEventListener("click", () =>
      this.downloadCurrentImage(),
    );
    this.sideInfoBtn.addEventListener("click", () => this.toggleInfoPanel());
    this.sideToggleThumbsBtn.addEventListener("click", () =>
      this.toggleThumbnails(),
    );
    this.keyboardController.bind();
    // 关闭信息弹窗按钮：阻止事件冒泡并强制关闭
    this.infoCollapseBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      this.closeInfoPanel();
    });
  }

  public init() {
    document.querySelectorAll(".image-grid-item").forEach((item, index) => {
      item.addEventListener("click", () => this.open(index));
    });
  }

  public addImages(images: ViewerItem[]) {
    this.images = images;
    this.updateThumbnails();
  }

  private updateThumbnails() {
    this.thumbnailController.update(this.images, this.currentIndex);
  }

  public open(index: number) {
    if (index < 0 || index >= this.images.length) return;

    // 如果点击的是当前已打开的图片，先关闭再重新打开
    const isAlreadyOpen = this.previewContainer.classList.contains("active");
    const isSameImage = this.currentIndex === index;

    if (isAlreadyOpen && isSameImage) {
      // 强制重新渲染：移除并重新添加 active 类
      this.previewContainer.classList.remove("active");
      // 使用微任务确保 DOM 更新
      requestAnimationFrame(() => {
        this.previewContainer.classList.add("active");
      });
    }

    this.setCurrentIndex(index);

    if (!isAlreadyOpen || !isSameImage) {
      this.previewContainer.classList.add("active");
    }
    this.scrollLock.lock();
    this.onOpenCb?.(this.images[this.currentIndex], this.currentIndex);
  }

  public close() {
    const wasActive = this.previewContainer.classList.contains("active");
    this.previewContainer.classList.remove("active");
    this.closeInfoPanel();
    this.previewContainer.classList.remove("thumbs-hidden", "is-zoomed");
    this.scrollLock.unlock();
    if (this.isFullscreen) {
      this.toggleFullscreen();
    }
    if (wasActive) this.onCloseCb?.();
  }

  private handleBackdropClick() {
    if (this.infoPanel.classList.contains("open")) {
      this.closeInfoPanel();
      return;
    }
    this.close();
  }

  // 检查并触发图片回调（用于处理图片已经加载完成的情况）
  private checkAndTriggerImageCallbacks() {
    if (
      this.currentImageLoadStatus.loaded &&
      this.imageLoadCallbacks.length > 0
    ) {
      this.imageLoadCallbacks.forEach((callback) => {
        try {
          callback();
        } catch (e) {
          console.warn("Image load callback error:", e);
        }
      });
    } else if (
      this.currentImageLoadStatus.error &&
      this.imageErrorCallbacks.length > 0
    ) {
      this.imageErrorCallbacks.forEach((callback) => {
        try {
          callback(this.currentImageLoadStatus.error || "未知错误");
        } catch (e) {
          console.warn("Image error callback error:", e);
        }
      });
    }
  }

  // 监听自定义渲染节点中的图片加载
  private monitorCustomNodeImageLoading(node: HTMLElement) {
    const images = node.querySelectorAll("img");

    if (images.length === 0) {
      // 如果没有图片，设置为已完成状态
      this.currentImageLoadStatus = { loaded: true };
      return;
    }

    let loadedCount = 0;
    let hasError = false;

    images.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) {
        // 图片已经加载完成
        loadedCount++;
      } else {
        // 监听图片加载
        img.onload = () => {
          loadedCount++;
          if (loadedCount === images.length && !hasError) {
            // 所有图片都加载完成，更新状态但不直接触发回调
            this.currentImageLoadStatus = { loaded: true };
          }
        };

        img.onerror = () => {
          hasError = true;
          this.currentImageLoadStatus = {
            loaded: false,
            error: "图片加载失败",
          };
        };
      }
    });

    // 如果所有图片都已经完成加载，设置状态
    if (loadedCount === images.length) {
      this.currentImageLoadStatus = { loaded: true };
    }
  }

  private updatePreview() {
    // Abort previous XHR request if exists
    if (this.activeXHR) {
      try {
        this.activeXHR.abort();
      } catch (e) {
        console.warn("Failed to abort XHR:", e);
      }
      this.activeXHR = null;
    }

    // Revoke previous blob URL if exists
    if (this.activeBlobUrl) {
      try {
        URL.revokeObjectURL(this.activeBlobUrl);
      } catch (e) {
        console.warn("Failed to revoke blob URL:", e);
      }
      this.activeBlobUrl = null;
    }

    // Reset loading state to prevent race conditions
    this.currentImageLoadStatus = { loaded: false };
    this.imageLoadCallbacks = [];
    this.imageErrorCallbacks = [];
    this._loadingDoneCallback = null;

    const currentImage = this.images[this.currentIndex];
    this.showLoading(currentImage, this.currentIndex);
    this.errorMessage.style.display = "none";
    this.previewImage.style.display = "none";
    this.previewTitle.textContent = currentImage.title || "图片预览";
    if (this.imageCounter)
      this.imageCounter.textContent = `${this.currentIndex + 1} / ${
        this.images.length
      }`;

    // 如果提供了自定义渲染节点，优先使用并跳过图片加载
    if (this.customRenderNode) {
      // Clear cached custom node reference
      if (this.cachedCustomNode) {
        this.renderBackend.removeTarget(this.cachedCustomNode);
        this.cachedCustomNode.remove();
        this.cachedCustomNode = null;
      }

      const node = this.createCustomNode(currentImage, this.currentIndex);
      if (node) {
        node.classList.add("custom-render-node");
        // 基本尺寸以适配容器
        try {
          (node as HTMLElement).style.width = "100%";
          (node as HTMLElement).style.height = "100%";
        } catch {}
        this.imageContainer.appendChild(node);
        // Cache the custom node reference for performance
        this.cachedCustomNode = node;
        // Register as a render-backend target so transforms apply.
        this.renderBackend.addTarget(node);
        // Clear previewImage src if it was using a blob
        if (this.previewImage.src) {
          this.previewImage.src = "";
        }
        // 在自定义渲染模式下：监听渲染节点中的图片加载
        this.errorMessage.style.display = "none";

        // 监听自定义渲染节点中的图片加载
        this.monitorCustomNodeImageLoading(node);

        let maybePromise: any = null;
        if (this.onImageLoad) {
          try {
            maybePromise = this.onImageLoad(currentImage, this.currentIndex);
          } catch (e) {
            console.warn("onImageLoad 执行出错:", e);
          }
        }
        this.updateThumbnails();
        this.setInfoPanelContent(currentImage, this.currentIndex);
        // 如果有自定义 loading 控制，则不自动隐藏 loading
        if (!this._loadingDoneCallback) {
          // 若 onImageLoad 返回 Promise，则等待后再隐藏 loading
          if (maybePromise && typeof maybePromise.then === "function") {
            try {
              (maybePromise as Promise<any>).then(
                () => this.hideLoading(),
                () => this.hideLoading(),
              );
            } catch {
              this.hideLoading();
            }
          } else {
            // 保证 loading 至少渲染一帧
            requestAnimationFrame(() =>
              requestAnimationFrame(() => this.hideLoading()),
            );
          }
        }

        // 复位拖拽/缩放状态
        this.transformEngine.reset();
        return;
      }
    }

    const xhr = new XMLHttpRequest();
    this.activeXHR = xhr; // Store reference for cleanup
    const thisToken = ++this.imageLoadToken;
    xhr.open("GET", currentImage.src, true);
    xhr.responseType = "blob";

    // 设置超时
    xhr.timeout = 30000; // 30秒超时

    xhr.onload = () => {
      if (thisToken !== this.imageLoadToken) return;
      if (xhr.status === 200) {
        const blob = xhr.response;
        const url = URL.createObjectURL(blob);

        // Store new blob URL reference
        this.activeBlobUrl = url;
        // Clear XHR reference as it's complete
        this.activeXHR = null;

        this.previewImage.src = url;
        this.previewImage.style.display = "block";

        const oldNode = this.imageContainer.querySelector(
          ".custom-render-node",
        );
        if (oldNode) {
          if (this.cachedCustomNode === oldNode) {
            this.renderBackend.removeTarget(this.cachedCustomNode);
            this.cachedCustomNode = null;
          } else if (oldNode instanceof HTMLElement) {
            this.renderBackend.removeTarget(oldNode);
          }
          oldNode.remove();
        }

        const previewImg = this.previewContainer.querySelector(
          '[data-vp-role="previewImage"]',
        );
        if (previewImg) {
          this.previewImage = previewImg as HTMLImageElement;
        }
        // Hand the source to the active backend.
        //  - CssBackend: no-op; relies on `previewImage.src` set above.
        //  - WebGLBackend: prefer `createImageBitmap` for off-main-thread
        //    decode; fall back to passing the <img> element.
        // Run async without blocking; on failure (e.g. MAX_TEXTURE_SIZE),
        // live-swap to CssBackend so the user still sees something.
        if (this.backendKind === "webgl") {
          const token = this.imageLoadToken;
          decodeBlob(blob)
            .then((decoded) => {
              if (token !== this.imageLoadToken) return; // navigated away
              const source =
                decoded.kind === "bitmap" ? decoded.bitmap : decoded.image;
              return this.renderBackend.setImageSource?.(source);
            })
            .catch((err) => {
              console.warn(
                "[viewer-pro] WebGL image upload failed; falling back to CSS:",
                err,
              );
              this.swapToCssBackend();
            });
        }
        // Re-emit current engine state to apply transform to the (possibly
        // re-found) preview image element.
        this.transformEngine.reconstrain(this.computeContentBounds(), "normal");

        // 更新图片加载状态
        this.currentImageLoadStatus = { loaded: true };
        // 触发图片加载完成回调
        this.imageLoadCallbacks.forEach((callback) => {
          try {
            callback();
          } catch (e) {
            console.warn("Image load callback error:", e);
          }
        });
      } else {
        this.activeXHR = null;
        this.handleImageError("http", xhr.status);
      }

      if (this.onImageLoad) {
        this.onImageLoad(currentImage, this.currentIndex);
      }

      // 如果没有自定义渲染节点且没有自定义loading控制，表示是普通图片，直接通知内容就绪
      if (!this.customRenderNode && !this._loadingDoneCallback) {
        this.notifyContentReady();
      }

      this.updateThumbnails();
      this.setInfoPanelContent(currentImage, this.currentIndex);
    };

    xhr.onerror = () => {
      if (thisToken !== this.imageLoadToken) return;
      this.activeXHR = null;
      this.handleImageError("network");
    };

    xhr.ontimeout = () => {
      if (thisToken !== this.imageLoadToken) return;
      this.activeXHR = null;
      this.handleImageError("timeout");
    };

    xhr.send();
    this.prevButton.disabled = this.currentIndex === 0;
    this.nextButton.disabled = this.currentIndex === this.images.length - 1;
  }

  // 根据 renderNode 选项创建节点
  private createCustomNode(img: ViewerItem, idx: number): HTMLElement | null {
    try {
      if (!this.customRenderNode) return null;
      const rn = this.customRenderNode;
      if (typeof rn === "function") {
        const el = rn(img, idx);
        return el instanceof HTMLElement ? el : null;
      }
      // 如果是固定元素，避免从原容器挪走，使用深拷贝
      return rn.cloneNode(true) as HTMLElement;
    } catch (e) {
      console.warn("renderNode 生成失败:", e);
      return null;
    }
  }

  private handleImageError(
    errorType: "network" | "timeout" | "http" = "network",
    httpStatus?: number,
  ) {
    this.hideLoading();
    this.errorMessage.style.display = "block";

    let errorMessage: string;
    switch (errorType) {
      case "timeout":
        errorMessage = "图片加载超时，请重试";
        break;
      case "http":
        errorMessage = `图片加载失败 (HTTP ${httpStatus || "error"})`;
        break;
      case "network":
      default:
        errorMessage = "图片加载失败，请检查网络连接或图片地址";
        break;
    }

    this.errorMessage.textContent = errorMessage;

    // 更新图片加载状态
    this.currentImageLoadStatus = { loaded: false, error: errorMessage };
    // 触发图片加载失败回调
    this.imageErrorCallbacks.forEach((callback) => {
      try {
        callback(errorMessage);
      } catch (e) {
        console.warn("Image error callback error:", e);
      }
    });
  }

  // 使用自定义渲染器填充信息面板
  private setInfoPanelContent(img: ViewerItem, idx: number) {
    // 清空旧内容
    this.infoPanelContent.innerHTML = "";
    const node = this.createInfoNode(img, idx);
    if (node) {
      node.classList.add("custom-info-node");
      try {
        (node as HTMLElement).style.maxHeight = "100%";
        (node as HTMLElement).style.overflow = "auto";
      } catch {}
      this.infoPanelContent.appendChild(node);
    } else {
      // 回退默认渲染
      this.infoPanelContent.appendChild(this.renderImageInfo(img));
    }
  }

  private createInfoNode(img: ViewerItem, idx: number): HTMLElement | null {
    try {
      if (!this.customInfoRender) return null;
      const ir = this.customInfoRender;
      if (typeof ir === "function") {
        const el = ir(img, idx);
        return el instanceof HTMLElement ? el : null;
      }
      return ir.cloneNode(true) as HTMLElement;
    } catch (e) {
      console.warn("infoRender 生成失败:", e);
      return null;
    }
  }

  private _loadingDoneCallback: (() => void) | null = null;
  private showLoading(img?: ViewerItem, idx?: number) {
    this.loadingIndicator.innerHTML = "";
    this.loadingIndicator.style.display = "flex";

    if (this.customLoadingNode) {
      try {
        let node: unknown;
        const ln = this.customLoadingNode as
          | HTMLElement
          | (() => HTMLElement)
          | ((
              item: ViewerItem,
              idx: number,
            ) =>
              | HTMLElement
              | {
                  node: HTMLElement;
                  done: (context: LoadingContext) => void | Promise<void>;
                });

        if (ln instanceof HTMLElement) {
          node = ln.cloneNode(true) as HTMLElement;
        } else if (typeof ln === "function") {
          const arity = (ln as Function).length;
          let result: any;
          if (arity >= 2) {
            const i = img ?? this.images[this.currentIndex];
            const k = idx ?? this.currentIndex;
            result = (ln as (item: ViewerItem, idx: number) => any)(i, k);
          } else {
            result = (ln as () => any)();
          }
          if (
            result &&
            typeof result === "object" &&
            "node" in result &&
            typeof result.node === "object"
          ) {
            node = result.node;
            if (typeof result.done === "function") {
              // 创建 LoadingContext
              const context: LoadingContext = {
                getImageLoadingStatus: () =>
                  Promise.resolve(this.currentImageLoadStatus),
                getMediaLoadingStatus: () => this.getMediaLoadingStatus(),
                onImageLoaded: (callback: () => void) => {
                  this.imageLoadCallbacks.push(callback);
                },
                onImageError: (callback: (error: string) => void) => {
                  this.imageErrorCallbacks.push(callback);
                },
                getCurrentImage: () => ({
                  image: this.images[this.currentIndex],
                  index: this.currentIndex,
                }),
                closeLoading: () => {
                  this.closeLoading();
                },
              };

              // 先添加 DOM 节点，再调用 done 回调
              if (node instanceof HTMLElement) {
                this.loadingIndicator.appendChild(node);
              }

              // 使用 nextTick 确保 DOM 已经添加到页面中，并延迟执行 done 回调
              setTimeout(() => {
                const doneResult = result.done(context);

                // 等待 done 回调完成后再检查图片状态
                const checkAfterDone = () => {
                  setTimeout(() => {
                    this.checkAndTriggerImageCallbacks();
                  }, 50);
                };

                if (doneResult instanceof Promise) {
                  doneResult
                    .then(() => {
                      checkAfterDone();
                    })
                    .catch((error) => {
                      console.warn(
                        "Loading done callback promise rejected:",
                        error,
                      );
                      checkAfterDone();
                    });
                } else {
                  checkAfterDone();
                }
              }, 0);

              this._loadingDoneCallback = () => {
                if (typeof result.done === "function") {
                  // 如果需要，可以再次调用 done
                }
              };
              return; // 提前返回，避免重复添加节点
            }
          } else {
            node = result;
          }
        }
        if (node instanceof HTMLElement) {
          this.loadingIndicator.appendChild(node);
          return;
        }
      } catch (e) {
        console.warn("loadingNode 生成失败:", e);
      }
    }
    // 回退默认 loading
    const div = document.createElement("div");
    div.className = "image-loading";
    this.loadingIndicator.appendChild(div);
  }

  private hideLoading() {
    // 如果 loadingNode 返回了 done，则只允许 done 主动关闭
    if (this._loadingDoneCallback) return;
    this.loadingIndicator.style.display = "none";
    this.loadingIndicator.innerHTML = "";
  }
  // 提供外部关闭 loading 的方法
  public closeLoading() {
    this.loadingIndicator.style.display = "none";
    this.loadingIndicator.innerHTML = "";
    this._loadingDoneCallback = null;
  }

  // 通知内容就绪（用于自定义渲染场景）
  public notifyContentReady() {
    if (this.onContentReady) {
      this.onContentReady(this.images[this.currentIndex], this.currentIndex);
    }
    // 如果有自定义 loading 控制，则调用其 done 方法
    if (this._loadingDoneCallback) {
      this._loadingDoneCallback();
      this._loadingDoneCallback = null;
    } else {
      // 否则直接隐藏 loading
      this.hideLoading();
    }
  }

  // 获取自定义渲染节点中的媒体元素加载状态
  private async getMediaLoadingStatus(): Promise<{
    images: boolean[];
    videos: boolean[];
    audios: boolean[];
  }> {
    const customRenderNode = this.imageContainer.querySelector(
      ".custom-render-node",
    );
    if (!customRenderNode) {
      return { images: [], videos: [], audios: [] };
    }

    const images = Array.from(customRenderNode.querySelectorAll("img"));
    const videos = Array.from(customRenderNode.querySelectorAll("video"));
    const audios = Array.from(customRenderNode.querySelectorAll("audio"));

    const imageStatuses = images.map(
      (img) => img.complete && img.naturalHeight !== 0,
    );
    const videoStatuses = videos.map((video) => video.readyState >= 3); // HAVE_FUTURE_DATA
    const audioStatuses = audios.map((audio) => audio.readyState >= 3);

    return {
      images: imageStatuses,
      videos: videoStatuses,
      audios: audioStatuses,
    };
  }

  private navigate(direction: number) {
    this.setCurrentIndex(this.currentIndex + direction);
  }

  private setCurrentIndex(index: number) {
    if (index < 0 || index >= this.images.length) return;
    const changed = this.currentIndex !== index;
    this.currentIndex = index;
    this.transformEngine.resetSilently();
    this.previewContainer.classList.remove("is-zoomed");
    this.updateThumbnails();
    this.updatePreview();
    this.preloadAdjacentImages();
    if (changed) {
      this.onIndexChangeCb?.(this.images[this.currentIndex], this.currentIndex);
    }
  }

  private preloadAdjacentImages() {
    if (!this.preloadAdjacent || this.images.length <= 1) return;
    [this.currentIndex - 1, this.currentIndex + 1].forEach((idx) => {
      const item = this.images[idx];
      if (!item) return;
      const src = item.photoSrc || item.src;
      this.imagePreloader.preload(src);
    });
  }

  /**
   * Compute current content bounds for the GestureController and engine
   * constraints. Replaces the previous `calculateContentDimensions` helper
   * but additionally returns container dimensions in a single bundle.
   */
  private computeContentBounds(): ContentBounds | null {
    if (!this.imageContainer) return null;
    const rect = this.imageContainer.getBoundingClientRect();

    let contentWidth = rect.width;
    let contentHeight = rect.height;

    if (this.cachedCustomNode) {
      contentWidth = this.cachedCustomNode.offsetWidth;
      contentHeight = this.cachedCustomNode.offsetHeight;
    } else if (this.previewImage && this.previewImage.naturalWidth > 0) {
      const imgAspect =
        this.previewImage.naturalWidth / this.previewImage.naturalHeight;
      const containerAspect = rect.width / rect.height;
      if (imgAspect > containerAspect) {
        const w = Math.min(this.previewImage.naturalWidth, rect.width);
        contentWidth = w;
        contentHeight = w / imgAspect;
      } else {
        const h = Math.min(this.previewImage.naturalHeight, rect.height);
        contentWidth = h * imgAspect;
        contentHeight = h;
      }
    }

    return {
      containerWidth: rect.width,
      containerHeight: rect.height,
      contentWidth,
      contentHeight,
    };
  }

  // 将变换状态通过 dataset/CSS 变量/自定义事件/回调抛出
  private syncTransformState() {
    const { scale, translateX, translateY, rotation } =
      this.transformEngine.getState();
    this.syncInternalTransformState(scale);

    // Only sync if there are listeners (callback or event listeners)
    if (
      !this.onTransformChangeCb &&
      !this.previewContainer.hasAttribute("data-has-transform-listener")
    ) {
      return;
    }

    const state = {
      scale,
      translateX,
      translateY,
      rotation,
      index: this.currentIndex,
      image: this.images[this.currentIndex] || null,
    };

    // Only update dataset if needed (for external reading)
    if (this.previewContainer.dataset.scale !== String(scale)) {
      this.previewContainer.dataset.scale = String(scale);
      this.previewContainer.dataset.tx = String(translateX);
      this.previewContainer.dataset.ty = String(translateY);
      this.previewContainer.dataset.rotation = String(rotation);
      this.previewContainer.dataset.index = String(this.currentIndex);
    }

    // CSS 变量，供外部样式或自定义节点使用（仅在有自定义节点时）
    if (this.cachedCustomNode) {
      const host = this.imageContainer as HTMLElement;
      host.style.setProperty("--vp-scale", String(scale));
      host.style.setProperty("--vp-tx", `${translateX}px`);
      host.style.setProperty("--vp-ty", `${translateY}px`);
      host.style.setProperty("--vp-rotation", `${rotation}deg`);
    }

    // 自定义事件（仅在有监听器时触发）
    if (this.previewContainer.hasAttribute("data-has-transform-listener")) {
      const evt = new CustomEvent("viewerpro:transform", { detail: state });
      this.previewContainer.dispatchEvent(evt);
    }

    // 回调
    if (this.onTransformChangeCb) this.onTransformChangeCb(state);
  }

  private syncInternalTransformState(scale: number) {
    this.previewContainer.classList.toggle("is-zoomed", scale > 1);
  }

  // 外部可主动读取当前状态
  public getState(): TransformChangeState {
    const { scale, translateX, translateY, rotation } =
      this.transformEngine.getState();
    return {
      scale,
      translateX,
      translateY,
      rotation,
      index: this.currentIndex,
      image: this.images[this.currentIndex] || null,
    };
  }

  // 便捷订阅方法：接收 transform 变化，返回取消订阅函数
  public onTransform(
    listener: (state: TransformChangeState) => void,
  ): () => void {
    const handler = (e: Event) => listener((e as CustomEvent).detail);
    this.transformListenerCount += 1;
    this.previewContainer.setAttribute("data-has-transform-listener", "true");
    this.previewContainer.addEventListener(
      "viewerpro:transform",
      handler as EventListener,
    );
    return () => {
      this.previewContainer.removeEventListener(
        "viewerpro:transform",
        handler as EventListener,
      );
      this.transformListenerCount = Math.max(
        0,
        this.transformListenerCount - 1,
      );
      if (this.transformListenerCount === 0) {
        this.previewContainer.removeAttribute("data-has-transform-listener");
      }
    };
  }

  // Drag / wheel handling moved to GestureController.
  // Content bounds calculation moved to `computeContentBounds()` above.

  // 全屏切换时切换图标
  private toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.previewContainer.requestFullscreen?.().catch((err) => {
        console.error(`全屏错误: ${err.message}`);
      });
      if (this.fullscreenButton)
        this.fullscreenButton.innerHTML = fullscreenExitIcon;
      if (this.sideFullscreenBtn)
        this.sideFullscreenBtn.innerHTML = fullscreenExitIcon;
      this.isFullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        if (this.fullscreenButton)
          this.fullscreenButton.innerHTML = fullscreenIcon;
        if (this.sideFullscreenBtn)
          this.sideFullscreenBtn.innerHTML = fullscreenIcon;
        this.isFullscreen = false;
      }
    }
  }

  private downloadCurrentImage() {
    const currentImage = this.images[this.currentIndex];
    const link = document.createElement("a");
    link.href = currentImage.src;
    link.download = currentImage.title || "image";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 新增：渲染图片信息HTML
  private renderImageInfo(img: ViewerItem): HTMLElement {
    // 这里只做简单示例，实际可根据你的图片对象结构扩展
    const fragment = document.createElement("div");
    const title = document.createElement("div");
    title.className = "info-title";
    title.textContent = "图片信息";
    fragment.appendChild(title);
    if (img.title) {
      fragment.appendChild(this.createInfoRow("标题", img.title));
    }
    if ((img as any).info) {
      for (const k in (img as any).info) {
        fragment.appendChild(this.createInfoRow(k, (img as any).info[k]));
      }
    }
    return fragment;
  }

  private createInfoRow(label: string, value: unknown): HTMLElement {
    const row = document.createElement("div");
    const labelNode = document.createElement("b");
    labelNode.textContent = `${label}：`;
    row.appendChild(labelNode);
    row.appendChild(document.createTextNode(String(value)));
    return row;
  }

  private toggleInfoPanel() {
    // 作为弹窗显示/隐藏
    if (this.infoPanel.classList.contains("open")) {
      this.closeInfoPanel();
    } else {
      this.openInfoPanel();
    }
  }

  public showInfoPanel() {
    const wasOpen = this.infoPanel.classList.contains("open");
    this.infoPanel.classList.add("open");
    this.previewContainer.classList.add("info-open");
    this.infoPanel.setAttribute("aria-hidden", "false");
    if (!wasOpen) {
      this.onInfoPanelOpenCb?.(
        this.images[this.currentIndex],
        this.currentIndex,
      );
    }
  }

  public hideInfoPanel() {
    const wasOpen = this.infoPanel.classList.contains("open");
    this.infoPanel.classList.remove("open");
    this.previewContainer.classList.remove("info-open");
    this.infoPanel.setAttribute("aria-hidden", "true");
    if (wasOpen) {
      this.onInfoPanelCloseCb?.(
        this.images[this.currentIndex],
        this.currentIndex,
      );
    }
  }

  public toggleInfo() {
    this.toggleInfoPanel();
  }

  private openInfoPanel() {
    this.showInfoPanel();
  }

  private closeInfoPanel() {
    this.hideInfoPanel();
  }

  public showThumbnails() {
    this.thumbnailController.show();
  }

  public hideThumbnails() {
    this.thumbnailController.hide();
  }

  public toggleThumbnailNav() {
    this.thumbnailController.toggle();
  }

  // 缩略图显示/隐藏切换
  private toggleThumbnails() {
    this.thumbnailController.toggle();
  }

  /**
   * Live-swap the active render backend to CssBackend. Used as a runtime
   * fallback when the WebGL backend can no longer be used:
   *   - `webglcontextlost` (driver crash, GPU reset)
   *   - texture upload failed (image > MAX_TEXTURE_SIZE)
   *
   * Re-registers all current targets on the new backend and applies the
   * latest transform so the viewer keeps rendering without user-visible glitch.
   */
  private swapToCssBackend(): void {
    if (this.backendKind === "css") return;
    console.warn("[viewer-pro] swapping render backend: webgl -> css");

    const collected: HTMLElement[] = [];
    if (this.previewImage) collected.push(this.previewImage);
    if (this.cachedCustomNode) collected.push(this.cachedCustomNode);

    try {
      this.renderBackend.destroy();
    } catch (e) {
      console.warn("[viewer-pro] previous backend destroy failed:", e);
    }

    this.renderBackend = new CssBackend();
    this.backendKind = "css";
    this.renderBackend.mount?.(this.imageContainer);
    for (const el of collected) {
      this.renderBackend.addTarget(el);
    }

    // Re-emit current engine state through the new backend.
    this.transformEngine.reconstrain(this.computeContentBounds(), "normal");
  }

  /** Called by WebGLBackend when the GL context is lost. */
  private handleWebGLContextLost(): void {
    this.swapToCssBackend();
  }

  // 新增：清理资源的方法
  public destroy() {
    this.scrollLock.unlock();
    // 1. Detach DOM gestures (mouse / wheel / touch / dblclick + backdrop)
    if (this.gestureController) {
      this.gestureController.unbindBackdrop(this.previewContainer);
      this.gestureController.destroy();
    }
    this.keyboardController.destroy();

    // 2. Abort in-flight resources
    if (this.activeBlobUrl) {
      try {
        URL.revokeObjectURL(this.activeBlobUrl);
      } catch (e) {
        console.warn("Failed to revoke blob URL:", e);
      }
      this.activeBlobUrl = null;
    }
    if (this.activeXHR) {
      try {
        this.activeXHR.abort();
      } catch (e) {
        console.warn("Failed to abort XHR:", e);
      }
      this.activeXHR = null;
    }
    // 3. Reset transform engine + release render backend
    this.transformEngine.setListener(null);
    this.transformEngine.resetSilently();
    if (this.renderBackend) {
      this.renderBackend.destroy();
    }

    // 4. Drop cached references
    this.imagePreloader.clear();
    this.cachedCustomNode = null;
    this.thumbnailController.reset();

    // 5. Detach preview DOM
    if (this.previewContainer && this.previewContainer.parentNode) {
      this.previewContainer.parentNode.removeChild(this.previewContainer);
    }

    // 6. Reset callback arrays + state
    this.imageLoadCallbacks = [];
    this.imageErrorCallbacks = [];
    this.images = [];
    this.currentIndex = 0;
    this.isFullscreen = false;
    this.imageLoadToken = 0;
    this.currentImageLoadStatus = { loaded: false };
    this._loadingDoneCallback = null;
    this.transformListenerCount = 0;
  }

  // 设置主题
  public setTheme(theme: "dark" | "light" | "auto") {
    this.theme = theme;
    if (this.previewContainer) {
      this.previewContainer.setAttribute("data-theme", theme);
    }
  }

  // 获取当前主题
  public getTheme(): "dark" | "light" | "auto" {
    return this.theme;
  }

  // 设置缩放配置 — proxies to TransformEngine.
  public setZoomConfig(config: ZoomConfig): void {
    this.transformEngine.setConfig({
      ...(config.min !== undefined ? { min: config.min } : {}),
      ...(config.max !== undefined ? { max: config.max } : {}),
      ...(config.step !== undefined ? { step: config.step } : {}),
      ...(config.wheelBaseStep !== undefined
        ? { wheelBaseStep: config.wheelBaseStep }
        : {}),
      ...(config.wheelMaxStep !== undefined
        ? { wheelMaxStep: config.wheelMaxStep }
        : {}),
      ...(config.wheelSpeedMultiplier !== undefined
        ? { wheelSpeedMultiplier: config.wheelSpeedMultiplier }
        : {}),
    });
  }

  // 获取缩放配置 — proxies to TransformEngine.
  public getZoomConfig(): TransformConfig {
    return this.transformEngine.getConfig();
  }
}

// 导出到 window 方便浏览器直接使用
if (typeof window !== "undefined") {
  (window as any).ViewerPro = ViewerPro;
}
