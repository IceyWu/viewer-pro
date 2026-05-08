import {
  closeIcon,
  prevIcon,
  nextIcon,
  zoomInIcon,
  zoomOutIcon,
  resetZoomIcon,
  fullscreenIcon,
  fullscreenExitIcon,
  downloadIcon,
  infoIcon,
  gridIcon,
  rotateLeftIcon,
  rotateRightIcon,
} from "./icons";
import type { RenderBackend } from "./backends/RenderBackend";
import { CssBackend } from "./backends/CssBackend";
import {
  BackendRouter,
  type BackendChoice,
  type ResolvedBackendKind,
} from "./backends/BackendRouter";
import { TransformEngine } from "./engine/TransformEngine";
import type { ContentBounds } from "./engine/TransformEngine";
import { GestureController } from "./engine/GestureController";
import { decodeBlob } from "./engine/ImageDecoder";

// Constants for better maintainability
const ZOOM_STEP = 0.2;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_WHEEL_BASE_STEP = 0.15; // 基础步长（增加 50%）
const ZOOM_WHEEL_MAX_STEP = 0.3; // 最大步长
const ZOOM_WHEEL_SPEED_MULTIPLIER = 0.01; // 速度乘数

// 预览项接口
export interface ViewerItem {
  src: string;
  thumbnail?: string;
  title?: string;
  type?: string;
  photoSrc?: string;
  videoSrc?: string;
  [key: string]: any;
}

// 加载状态信息接口
export interface LoadingContext {
  // 获取当前图片加载状态
  getImageLoadingStatus: () => Promise<{ loaded: boolean; error?: string }>;
  // 获取自定义渲染节点中的媒体元素加载状态
  getMediaLoadingStatus: () => Promise<{
    images: boolean[];
    videos: boolean[];
    audios: boolean[];
  }>;
  // 监听图片加载完成
  onImageLoaded: (callback: () => void) => void;
  // 监听图片加载失败
  onImageError: (callback: (error: string) => void) => void;
  // 获取当前预览项对象和索引
  getCurrentImage: () => { image: ViewerItem; index: number };
  // 手动触发关闭 loading
  closeLoading: () => void;
}

export interface ViewerProOptions {
  // 支持：固定节点 | 无参工厂 | 按图片/索引生成的工厂 | 返回 { node, done }
  // 新增：done 函数可以接收 LoadingContext 参数，用于高度自定义控制
  loadingNode?:
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
  images?: ViewerItem[];
  renderNode?: HTMLElement | ((item: ViewerItem, idx: number) => HTMLElement);
  onImageLoad?: (item: ViewerItem, idx: number) => void;
  // 当所有内容（包括自定义渲染内容）都准备就绪后调用
  onContentReady?: (item: ViewerItem, idx: number) => void;
  // 当缩放/位移/索引变化时回调（含 renderNode 模式）
  onTransformChange?: (state: {
    scale: number;
    translateX: number;
    translateY: number;
    rotation: number;
    index: number;
    image: ViewerItem | null;
  }) => void;
  // 自定义右侧信息面板渲染
  infoRender?: HTMLElement | ((item: ViewerItem, idx: number) => HTMLElement);
  // 主题设置: 'dark' | 'light' | 'auto'
  theme?: "dark" | "light" | "auto";
  // 缩放配置
  zoomConfig?: {
    min?: number; // 最小缩放比例，默认 0.5
    max?: number; // 最大缩放比例，默认 3
    step?: number; // 按钮缩放步长，默认 0.2
    wheelBaseStep?: number; // 滚轮基础步长，默认 0.15
    wheelMaxStep?: number; // 滚轮最大步长，默认 0.3
    wheelSpeedMultiplier?: number; // 滚轮速度乘数，默认 0.01
  };
  /**
   * Render backend selection.
   * - "auto"  (default): WebGL when available and no customRenderNode;
   *                      otherwise CSS.
   * - "css":   force the original CSS-transform pipeline. Required for
   *            video / Live Photo / arbitrary DOM in customRenderNode.
   * - "webgl": force the WebGL pipeline. Falls back to CSS only when WebGL
   *            is entirely unavailable.
   */
  backend?: BackendChoice;
  /**
   * "linear" (default) for photographic content; "nearest" for pixel art.
   * Only applies when the WebGL backend is active.
   */
  webglFiltering?: "linear" | "nearest";
}

export class ViewerPro {
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
  private lastActiveIndex = -1; // Track last active thumbnail for optimization
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

  // Keyboard handler kept on this instance so we can detach in destroy.
  private _boundKeyDown!: (e: KeyboardEvent) => void;

  // Render backend (CssBackend or WebGLBackend, chosen by BackendRouter).
  private renderBackend!: RenderBackend;
  private backendKind: ResolvedBackendKind = "css";
  private backendPreference: BackendChoice = "auto";
  private webglFiltering: "linear" | "nearest" | undefined;
  // Transform state + math (zoom / pan / rotate)
  private transformEngine!: TransformEngine;
  // Gesture binding (mouse / wheel / touch / dblclick / backdrop click)
  private gestureController!: GestureController;

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

    // 初始化缩放配置 (defaults preserved from previous monolith)
    this.transformEngine = new TransformEngine({
      min: options.zoomConfig?.min ?? ZOOM_MIN,
      max: options.zoomConfig?.max ?? ZOOM_MAX,
      step: options.zoomConfig?.step ?? ZOOM_STEP,
      wheelBaseStep: options.zoomConfig?.wheelBaseStep ?? ZOOM_WHEEL_BASE_STEP,
      wheelMaxStep: options.zoomConfig?.wheelMaxStep ?? ZOOM_WHEEL_MAX_STEP,
      wheelSpeedMultiplier:
        options.zoomConfig?.wheelSpeedMultiplier ?? ZOOM_WHEEL_SPEED_MULTIPLIER,
    });

    this.initializeContainer();
    this.initializeElements();

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
      onBackdropClick: () => this.close(),
      // dblclick falls back to engine.reset() (original behavior).
    });
    this.gestureController.bindBackdrop(this.previewContainer);

    this.bindMethods();
    this.bindEvents();

    if (this.images.length > 0) {
      this.updateThumbnails();
    }
  }

  private initializeContainer() {
    // 检查是否已存在预览容器，避免重复创建
    const existingContainer = document.getElementById("imagePreview");

    if (existingContainer) {
      // 复用现有容器，但先移除它
      existingContainer.remove();
    }

    this.previewContainer = document.createElement("div");
    this.previewContainer.className = "image-preview-container";
    this.previewContainer.id = "imagePreview";
    this.previewContainer.setAttribute("data-theme", this.theme);
    document.body.appendChild(this.previewContainer);
    this.previewContainer.innerHTML = this.getContainerHTML();
  }

  private getContainerHTML(): string {
    return `
      <svg style="position: absolute; width: 0; height: 0;">
        <defs>
          <filter id="blur-overlay-filter" x="-100%" y="-100%" width="300%" height="300%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="2" result="turbulence"/>
            <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="50" xChannelSelector="R" yChannelSelector="G" result="displacement"/>
            <feGaussianBlur in="displacement" stdDeviation="40" result="blur"/>
          </filter>
        </defs>
      </svg>
      <div class="image-preview-overlay">
        <canvas id="blurCanvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: none;"></canvas>
        <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0;">
          <defs>
            <radialGradient id="grad1" cx="30%" cy="40%">
              <stop offset="0%" style="stop-color:rgb(100,100,150);stop-opacity:0.6" />
              <stop offset="100%" style="stop-color:rgb(50,50,80);stop-opacity:0" />
            </radialGradient>
            <radialGradient id="grad2" cx="70%" cy="60%">
              <stop offset="0%" style="stop-color:rgb(150,100,100);stop-opacity:0.6" />
              <stop offset="100%" style="stop-color:rgb(80,50,50);stop-opacity:0" />
            </radialGradient>
            <radialGradient id="grad3" cx="50%" cy="80%">
              <stop offset="0%" style="stop-color:rgb(100,150,100);stop-opacity:0.6" />
              <stop offset="100%" style="stop-color:rgb(50,80,50);stop-opacity:0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="rgba(30,30,40,0.7)"/>
          <circle cx="30%" cy="40%" r="40%" fill="url(#grad1)" filter="url(#blur-overlay-filter)"/>
          <circle cx="70%" cy="60%" r="40%" fill="url(#grad2)" filter="url(#blur-overlay-filter)"/>
          <circle cx="50%" cy="80%" r="35%" fill="url(#grad3)" filter="url(#blur-overlay-filter)"/>
        </svg>
      </div>
      <div class="image-preview-content">
        <!-- 左侧竖向操作栏 -->
        <div class="side-toolbar" id="sideToolbar">
          <button class="control-button" id="sideZoomIn" title="放大">${zoomInIcon}</button>
          <button class="control-button" id="sideZoomOut" title="缩小">${zoomOutIcon}</button>
          <button class="control-button" id="sideResetZoom" title="1:1">${resetZoomIcon}</button>
          <div class="side-toolbar-sep"></div>
          <button class="control-button" id="sideRotateLeft" title="向左旋转">${rotateLeftIcon}</button>
          <button class="control-button" id="sideRotateRight" title="向右旋转">${rotateRightIcon}</button>
          <div class="side-toolbar-sep"></div>
          <button class="control-button" id="sideToggleThumbnails" title="缩略图">${gridIcon}</button>
          <button class="control-button" id="sideFullscreen" title="全屏">${fullscreenIcon}</button>
          <button class="control-button" id="sideDownload" title="下载">${downloadIcon}</button>
          <button class="control-button" id="sideInfoOpen" title="信息">${infoIcon}</button>
        </div>

        <div class="image-preview-main-area">
          <div class="image-preview-header">
            <div class="image-preview-title" id="previewTitle">图片预览</div>
            <div class="image-preview-close" id="closePreview" style="cursor:pointer;">
              ${closeIcon}
            </div>
          </div>
          <div class="image-preview-image-container" id="imageContainer">
            <div class="loading-overlay" id="loadingIndicator" style="display:none;"><div class="image-loading"></div></div>
            <button class="arrow-btn left-arrow" id="prevImage">${prevIcon}</button>
            <button class="arrow-btn right-arrow" id="nextImage">${nextIcon}</button>
            <div class="error-message" id="errorMessage" style="display:none;">
              图片加载失败
            </div>
            <img src="" alt="预览图片" class="image-preview-image" id="previewImage" />
          </div>
        </div>
        <!-- 右侧信息弹窗（灵感板/AI Assistant 风格） -->
        <div class="info-modal" id="imageInfoPanel">
          <button class="info-modal-close" id="infoCollapseBtn">${closeIcon}</button>
          <div class="info-modal-header">信息面板</div>
          <div class="info-panel-content" id="infoPanelContent"></div>
        </div>
      </div>
      <div class="thumbnail-nav" id="thumbnailNav"></div>
    `;
  }

  private initializeElements() {
    this.previewImage = this.previewContainer.querySelector(
      "#previewImage",
    ) as HTMLImageElement;
    this.previewTitle = this.previewContainer.querySelector("#previewTitle")!;
    this.closeButton = this.previewContainer.querySelector("#closePreview")!;
    this.prevButton = this.previewContainer.querySelector(
      "#prevImage",
    ) as HTMLButtonElement;
    this.nextButton = this.previewContainer.querySelector(
      "#nextImage",
    ) as HTMLButtonElement;
    this.zoomInButton = this.previewContainer.querySelector(
      "#zoomIn",
    ) as HTMLButtonElement | null;
    this.zoomOutButton = this.previewContainer.querySelector(
      "#zoomOut",
    ) as HTMLButtonElement | null;
    this.resetZoomButton = this.previewContainer.querySelector(
      "#resetZoom",
    ) as HTMLButtonElement | null;
    this.fullscreenButton = this.previewContainer.querySelector(
      "#toggleFullscreen",
    ) as HTMLButtonElement | null;
    this.downloadButton = this.previewContainer.querySelector(
      "#downloadImage",
    ) as HTMLButtonElement | null;
    this.toggleInfoBtn = this.previewContainer.querySelector(
      "#toggleInfoPanelBtn",
    ) as HTMLButtonElement | null;
    this.toggleThumbsBtn = this.previewContainer.querySelector(
      "#toggleThumbnails",
    ) as HTMLButtonElement | null;
    // 侧边栏元素
    this.sideZoomInBtn = this.previewContainer.querySelector(
      "#sideZoomIn",
    ) as HTMLButtonElement;
    this.sideZoomOutBtn = this.previewContainer.querySelector(
      "#sideZoomOut",
    ) as HTMLButtonElement;
    this.sideResetZoomBtn = this.previewContainer.querySelector(
      "#sideResetZoom",
    ) as HTMLButtonElement;
    this.sideRotateLeftBtn = this.previewContainer.querySelector(
      "#sideRotateLeft",
    ) as HTMLButtonElement;
    this.sideRotateRightBtn = this.previewContainer.querySelector(
      "#sideRotateRight",
    ) as HTMLButtonElement;
    this.sideFullscreenBtn = this.previewContainer.querySelector(
      "#sideFullscreen",
    ) as HTMLButtonElement;
    this.sideDownloadBtn = this.previewContainer.querySelector(
      "#sideDownload",
    ) as HTMLButtonElement;
    this.sideInfoBtn = this.previewContainer.querySelector(
      "#sideInfoOpen",
    ) as HTMLButtonElement;
    this.sideToggleThumbsBtn = this.previewContainer.querySelector(
      "#sideToggleThumbnails",
    ) as HTMLButtonElement;
    this.imageCounter = this.previewContainer.querySelector("#imageCounter");
    this.loadingIndicator =
      this.previewContainer.querySelector("#loadingIndicator")!;
    this.errorMessage = this.previewContainer.querySelector("#errorMessage")!;
    this.thumbnailNav = this.previewContainer.querySelector("#thumbnailNav")!;
    this.imageContainer =
      this.previewContainer.querySelector("#imageContainer")!;
    this.infoPanel = this.previewContainer.querySelector(
      "#imageInfoPanel",
    )! as HTMLElement;
    this.infoCollapseBtn = this.previewContainer.querySelector(
      "#infoCollapseBtn",
    )! as HTMLElement;
    this.infoPanelContent = this.previewContainer.querySelector(
      "#infoPanelContent",
    )! as HTMLElement;
  }

  private bindMethods() {
    // Only the keyboard handler is owned by ViewerPro now; everything
    // else (mouse / wheel / touch / dblclick / backdrop) lives in
    // GestureController.
    this._boundKeyDown = this.handleKeyDown.bind(this);
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
    document.addEventListener("keydown", this._boundKeyDown);
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
    // 如果 thumbnailNav 还没有内容，首次渲染
    if (this.thumbnailNav.childNodes.length !== this.images.length) {
      this.thumbnailNav.innerHTML = "";
      this.images.forEach((image, index) => {
        const thumbnail = document.createElement("div");
        thumbnail.className = `thumbnail${
          index === this.currentIndex ? " active" : ""
        }`;
        thumbnail.innerHTML = `<img src="${
          image.thumbnail || image.src
        }" alt="${image.title}">`;
        thumbnail.addEventListener("click", () => this.open(index));
        this.thumbnailNav.appendChild(thumbnail);
      });
      this.lastActiveIndex = this.currentIndex;
    } else if (this.lastActiveIndex !== this.currentIndex) {
      // 只更新变化的缩略图，避免遍历所有元素
      const children = this.thumbnailNav.children;
      if (this.lastActiveIndex >= 0 && this.lastActiveIndex < children.length) {
        children[this.lastActiveIndex].classList.remove("active");
      }
      if (this.currentIndex >= 0 && this.currentIndex < children.length) {
        children[this.currentIndex].classList.add("active");
      }
      this.lastActiveIndex = this.currentIndex;
    }

    // 自动滚动到当前激活的缩略图
    this.scrollToActiveThumbnail();
  }

  // 滚动到当前激活的缩略图
  private scrollToActiveThumbnail() {
    if (
      this.currentIndex < 0 ||
      this.currentIndex >= this.thumbnailNav.children.length
    ) {
      return;
    }

    const activeThumbnail = this.thumbnailNav.children[
      this.currentIndex
    ] as HTMLElement;
    if (!activeThumbnail) return;

    // 使用 scrollIntoView 滚动到可见区域
    requestAnimationFrame(() => {
      activeThumbnail.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });
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
    document.body.style.overflow = "hidden";
  }

  public close() {
    this.previewContainer.classList.remove("active");
    document.body.style.overflow = "";
    if (this.isFullscreen) {
      this.toggleFullscreen();
    }
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

        const previewImg = document.getElementById("previewImage");
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
      this.infoPanelContent.innerHTML = this.renderImageInfo(img);
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
    this.currentIndex = index;
    this.transformEngine.resetSilently();
    this.updateThumbnails();
    this.updatePreview();
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
    // Only sync if there are listeners (callback or event listeners)
    if (
      !this.onTransformChangeCb &&
      !this.previewContainer.hasAttribute("data-has-transform-listener")
    ) {
      return;
    }

    const { scale, translateX, translateY, rotation } =
      this.transformEngine.getState();
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

  // 外部可主动读取当前状态
  public getState() {
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
    listener: (state: {
      scale: number;
      translateX: number;
      translateY: number;
      rotation: number;
      index: number;
      image: ViewerItem | null;
    }) => void,
  ) {
    const handler = (e: Event) => listener((e as CustomEvent).detail);
    this.previewContainer.addEventListener(
      "viewerpro:transform",
      handler as EventListener,
    );
    return () =>
      this.previewContainer.removeEventListener(
        "viewerpro:transform",
        handler as EventListener,
      );
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

  private handleKeyDown(e: KeyboardEvent) {
    if (!this.previewContainer.classList.contains("active")) return;
    switch (e.key) {
      case "Escape":
        // 优先关闭信息弹窗
        if (this.infoPanel.classList.contains("open")) {
          this.closeInfoPanel();
        } else {
          this.close();
        }
        break;
      case "ArrowLeft":
        this.navigate(-1);
        break;
      case "ArrowRight":
        this.navigate(1);
        break;
      case "+":
      case "=":
        this.transformEngine.zoomBy(
          this.transformEngine.getConfig().step,
          this.computeContentBounds(),
        );
        break;
      case "-":
        this.transformEngine.zoomBy(
          -this.transformEngine.getConfig().step,
          this.computeContentBounds(),
        );
        break;
      case "0":
        this.transformEngine.reset();
        break;
      case "f":
        this.toggleFullscreen();
        break;
      case "d":
        this.downloadCurrentImage();
        break;
    }
  }

  // 新增：渲染图片信息HTML
  private renderImageInfo(img: ViewerItem): string {
    // 这里只做简单示例，实际可根据你的图片对象结构扩展
    let html = `<div class='info-title'>图片信息</div>`;
    if (img.title) html += `<div><b>标题：</b>${img.title}</div>`;
    if ((img as any).info) {
      for (const k in (img as any).info) {
        html += `<div><b>${k}：</b>${(img as any).info[k]}</div>`;
      }
    }
    return html;
  }

  private toggleInfoPanel() {
    // 作为弹窗显示/隐藏
    if (this.infoPanel.classList.contains("open")) {
      this.closeInfoPanel();
    } else {
      this.openInfoPanel();
    }
  }

  private openInfoPanel() {
    this.infoPanel.classList.add("open");
    this.infoPanel.setAttribute("aria-hidden", "false");
  }

  private closeInfoPanel() {
    this.infoPanel.classList.remove("open");
    this.infoPanel.setAttribute("aria-hidden", "true");
  }

  // 缩略图显示/隐藏切换
  private toggleThumbnails() {
    if (!this.thumbnailNav) return;

    // 切换 hidden class 来控制显示/隐藏
    const isHidden = this.thumbnailNav.classList.contains("hidden");

    if (isHidden) {
      // 显示缩略图
      this.thumbnailNav.classList.remove("hidden");
      this.thumbnailNav.classList.add("open");
    } else {
      // 隐藏缩略图
      this.thumbnailNav.classList.add("hidden");
      this.thumbnailNav.classList.remove("open");
    }
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
    // 1. Detach DOM gestures (mouse / wheel / touch / dblclick + backdrop)
    if (this.gestureController) {
      this.gestureController.unbindBackdrop(this.previewContainer);
      this.gestureController.destroy();
    }
    document.removeEventListener("keydown", this._boundKeyDown);

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
    this.cachedCustomNode = null;
    this.lastActiveIndex = -1;

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
  public setZoomConfig(config: {
    min?: number;
    max?: number;
    step?: number;
    wheelBaseStep?: number;
    wheelMaxStep?: number;
    wheelSpeedMultiplier?: number;
  }) {
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
  public getZoomConfig() {
    return this.transformEngine.getConfig();
  }
}

// 导出到 window 方便浏览器直接使用
(window as any).ViewerPro = ViewerPro;
