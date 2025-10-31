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

// Constants for better maintainability
const ZOOM_STEP = 0.2;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_WHEEL_BASE_STEP = 0.15;      // 基础步长（增加 50%）
const ZOOM_WHEEL_MAX_STEP = 0.3;        // 最大步长
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
  getMediaLoadingStatus: () => Promise<{ images: boolean[]; videos: boolean[]; audios: boolean[] }>;
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
    | ((item: ViewerItem, idx: number) => HTMLElement | { 
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
  theme?: 'dark' | 'light' | 'auto';
  // 缩放配置
  zoomConfig?: {
    min?: number;           // 最小缩放比例，默认 0.5
    max?: number;           // 最大缩放比例，默认 3
    step?: number;          // 按钮缩放步长，默认 0.2
    wheelBaseStep?: number; // 滚轮基础步长，默认 0.15
    wheelMaxStep?: number;  // 滚轮最大步长，默认 0.3
    wheelSpeedMultiplier?: number; // 滚轮速度乘数，默认 0.01
  };
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
    | ((item: ViewerItem, idx: number) => HTMLElement | { 
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
  private progressMask!: HTMLElement;
  private progressText!: HTMLElement;
  private progressPercent!: HTMLElement;
  private progressSize!: HTMLElement;
  private infoPanelContent!: HTMLElement;

  private images: ViewerItem[] = [];
  private currentIndex = 0;
  private lastActiveIndex = -1; // Track last active thumbnail for optimization
  private scale = 1;
  private translateX = 0;
  private translateY = 0;
  private rotation = 0; // 旋转角度（0, 90, 180, 270）
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private isFullscreen = false;
  private theme: 'dark' | 'light' | 'auto' = 'dark';
  private imageLoadToken: number = 0;
  private currentImageLoadStatus: { loaded: boolean; error?: string } = { loaded: false };
  private imageLoadCallbacks: Array<() => void> = [];
  private imageErrorCallbacks: Array<(error: string) => void> = [];
  // Resource management
  private activeBlobUrl: string | null = null;
  private activeXHR: XMLHttpRequest | null = null;
  // Performance optimization
  private dragRAF: number | null = null;
  private cachedContentDimensions: { width: number; height: number } | null = null;
  private cachedCustomNode: HTMLElement | null = null;
  // Wheel zoom optimization
  private _wheelRAF: number | null = null;
  private _lastWheelTime: number = 0;
  // Zoom configuration
  private zoomMin: number = ZOOM_MIN;
  private zoomMax: number = ZOOM_MAX;
  private zoomStep: number = ZOOM_STEP;
  private zoomWheelBaseStep: number = ZOOM_WHEEL_BASE_STEP;
  private zoomWheelMaxStep: number = ZOOM_WHEEL_MAX_STEP;
  private zoomWheelSpeedMultiplier: number = ZOOM_WHEEL_SPEED_MULTIPLIER;

  private _boundDrag!: (e: MouseEvent | Touch) => void;
  private _boundStopDrag!: () => void;
  private _boundTouchDrag!: (e: TouchEvent) => void;
  private _boundTouchEnd!: () => void;
  private _boundKeyDown!: (e: KeyboardEvent) => void;
  private _boundWheel!: (e: WheelEvent) => void;
  private _boundContainerClick!: (e: MouseEvent) => void;
  private _boundImageDblClick!: (e: MouseEvent) => void;
  private _boundMouseDown!: (e: MouseEvent) => void;
  private _boundTouchStart!: (e: TouchEvent) => void;

  constructor(options: ViewerProOptions = {}) {
    this.images = Array.isArray(options.images) ? options.images : [];
    this.customLoadingNode = options.loadingNode || null;
    this.customRenderNode = options.renderNode || null;
  this.customInfoRender = options.infoRender || null;
    this.onImageLoad =
      typeof options.onImageLoad === "function" ? options.onImageLoad : null;
    this.onContentReady =
      typeof options.onContentReady === "function" ? options.onContentReady : null;
    this.onTransformChangeCb =
      typeof options.onTransformChange === "function"
        ? options.onTransformChange
        : null;
    this.theme = options.theme || 'dark';

    // 初始化缩放配置
    if (options.zoomConfig) {
      this.zoomMin = options.zoomConfig.min ?? ZOOM_MIN;
      this.zoomMax = options.zoomConfig.max ?? ZOOM_MAX;
      this.zoomStep = options.zoomConfig.step ?? ZOOM_STEP;
      this.zoomWheelBaseStep = options.zoomConfig.wheelBaseStep ?? ZOOM_WHEEL_BASE_STEP;
      this.zoomWheelMaxStep = options.zoomConfig.wheelMaxStep ?? ZOOM_WHEEL_MAX_STEP;
      this.zoomWheelSpeedMultiplier = options.zoomConfig.wheelSpeedMultiplier ?? ZOOM_WHEEL_SPEED_MULTIPLIER;
    }

    this.initializeContainer();
    this.initializeElements();
    this.bindMethods();
    this.bindEvents();

    if (this.images.length > 0) {
      this.updateThumbnails();
    }
  }

  private initializeContainer() {
    this.previewContainer = document.createElement("div");
    this.previewContainer.className = "image-preview-container";
    this.previewContainer.id = "imagePreview";
    this.previewContainer.setAttribute('data-theme', this.theme);
    document.body.appendChild(this.previewContainer);
    this.previewContainer.innerHTML = this.getContainerHTML();
  }

  private getContainerHTML(): string {
    return `
      <div class="image-preview-overlay"></div>
      <div class="image-preview-content">
        <!-- 左侧竖向操作栏 -->
        <div class="side-toolbar" id="sideToolbar">
          <button class="control-button" id="sideToggleThumbnails" title="缩略图">${gridIcon}</button>
          <div class="side-toolbar-sep"></div>
          <button class="control-button" id="sideZoomOut" title="缩小">${zoomOutIcon}</button>
          <button class="control-button" id="sideResetZoom" title="重置缩放">${resetZoomIcon}</button>
          <button class="control-button" id="sideZoomIn" title="放大">${zoomInIcon}</button>
          <div class="side-toolbar-sep"></div>
          <button class="control-button" id="sideRotateLeft" title="向左旋转">${rotateLeftIcon}</button>
          <button class="control-button" id="sideRotateRight" title="向右旋转">${rotateRightIcon}</button>
          <div class="side-toolbar-sep"></div>
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
          <div class="image-progress-mask" id="imageProgressMask" style="display:none;">
            <div class="progress-ring"><svg width="32" height="32"><circle class="progress-bg" cx="16" cy="16" r="14" stroke-width="4" fill="none"/><circle class="progress-bar" cx="16" cy="16" r="14" stroke-width="4" fill="none"/></svg></div>
            <div class="progress-info"><div id="progressText">加载中</div><div id="progressPercent">0%</div><div id="progressSize">0MB / 0MB</div></div>
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
      "#previewImage"
    ) as HTMLImageElement;
    this.previewTitle = this.previewContainer.querySelector("#previewTitle")!;
    this.closeButton = this.previewContainer.querySelector("#closePreview")!;
    this.prevButton = this.previewContainer.querySelector(
      "#prevImage"
    ) as HTMLButtonElement;
    this.nextButton = this.previewContainer.querySelector(
      "#nextImage"
    ) as HTMLButtonElement;
    this.zoomInButton = this.previewContainer.querySelector(
      "#zoomIn"
    ) as HTMLButtonElement | null;
    this.zoomOutButton = this.previewContainer.querySelector(
      "#zoomOut"
    ) as HTMLButtonElement | null;
    this.resetZoomButton = this.previewContainer.querySelector(
      "#resetZoom"
    ) as HTMLButtonElement | null;
    this.fullscreenButton = this.previewContainer.querySelector(
      "#toggleFullscreen"
    ) as HTMLButtonElement | null;
    this.downloadButton = this.previewContainer.querySelector(
      "#downloadImage"
    ) as HTMLButtonElement | null;
    this.toggleInfoBtn = this.previewContainer.querySelector(
      "#toggleInfoPanelBtn"
    ) as HTMLButtonElement | null;
    this.toggleThumbsBtn = this.previewContainer.querySelector(
      "#toggleThumbnails"
    ) as HTMLButtonElement | null;
    // 侧边栏元素
    this.sideZoomInBtn = this.previewContainer.querySelector(
      "#sideZoomIn"
    ) as HTMLButtonElement;
    this.sideZoomOutBtn = this.previewContainer.querySelector(
      "#sideZoomOut"
    ) as HTMLButtonElement;
    this.sideResetZoomBtn = this.previewContainer.querySelector(
      "#sideResetZoom"
    ) as HTMLButtonElement;
    this.sideRotateLeftBtn = this.previewContainer.querySelector(
      "#sideRotateLeft"
    ) as HTMLButtonElement;
    this.sideRotateRightBtn = this.previewContainer.querySelector(
      "#sideRotateRight"
    ) as HTMLButtonElement;
    this.sideFullscreenBtn = this.previewContainer.querySelector(
      "#sideFullscreen"
    ) as HTMLButtonElement;
    this.sideDownloadBtn = this.previewContainer.querySelector(
      "#sideDownload"
    ) as HTMLButtonElement;
    this.sideInfoBtn = this.previewContainer.querySelector(
      "#sideInfoOpen"
    ) as HTMLButtonElement;
    this.sideToggleThumbsBtn = this.previewContainer.querySelector(
      "#sideToggleThumbnails"
    ) as HTMLButtonElement;
    this.imageCounter = this.previewContainer.querySelector("#imageCounter");
    this.loadingIndicator =
      this.previewContainer.querySelector("#loadingIndicator")!;
    this.errorMessage = this.previewContainer.querySelector("#errorMessage")!;
    this.thumbnailNav = this.previewContainer.querySelector("#thumbnailNav")!;
    this.imageContainer =
      this.previewContainer.querySelector("#imageContainer")!;
    this.infoPanel = this.previewContainer.querySelector(
      "#imageInfoPanel"
    )! as HTMLElement;
    this.infoCollapseBtn = this.previewContainer.querySelector(
      "#infoCollapseBtn"
    )! as HTMLElement;
    this.progressMask = this.previewContainer.querySelector(
      "#imageProgressMask"
    )! as HTMLElement;
    this.progressText = this.previewContainer.querySelector(
      "#progressText"
    )! as HTMLElement;
    this.progressPercent = this.previewContainer.querySelector(
      "#progressPercent"
    )! as HTMLElement;
    this.progressSize = this.previewContainer.querySelector(
      "#progressSize"
    )! as HTMLElement;
    this.infoPanelContent = this.previewContainer.querySelector(
      "#infoPanelContent"
    )! as HTMLElement;
  }

  private bindMethods() {
    this._boundDrag = this.drag.bind(this);
    this._boundStopDrag = this.stopDrag.bind(this);
    this._boundTouchDrag = (e: TouchEvent) => {
      e.preventDefault();
      this.drag(e.touches[0]);
    };
    this._boundTouchEnd = this.stopDrag.bind(this);
    this._boundKeyDown = this.handleKeyDown.bind(this);
    this._boundWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // 使用 RAF 替代节流，确保流畅性
      if (this._wheelRAF !== null) {
        return; // 如果已有待处理的缩放，跳过
      }
      
      this._wheelRAF = requestAnimationFrame(() => {
        this._wheelRAF = null;
        this.handleWheelZoom(e);
      });
    };
    this._boundContainerClick = (e: MouseEvent) => {
      if (e.target === this.previewContainer) {
        this.close();
      }
    };
    this._boundImageDblClick = (e: MouseEvent) => {
      this.resetZoom();
    };
    this._boundMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!this.shouldStartDrag(target)) return;
      this.startDrag(e);
    };
    this._boundTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!this.shouldStartDrag(target)) return;
      if (e.touches && e.touches[0]) this.startDrag(e.touches[0]);
    };
  }

  private bindEvents() {
    this.closeButton.addEventListener("click", () => this.close());
    this.prevButton.addEventListener("click", () => this.navigate(-1));
    this.nextButton.addEventListener("click", () => this.navigate(1));
    if (this.zoomInButton)
      this.zoomInButton.addEventListener("click", () => this.zoom(this.zoomStep));
    if (this.zoomOutButton)
      this.zoomOutButton.addEventListener("click", () => this.zoom(-this.zoomStep));
    if (this.resetZoomButton)
      this.resetZoomButton.addEventListener("click", () => this.resetZoom());
    if (this.fullscreenButton)
      this.fullscreenButton.addEventListener("click", () =>
        this.toggleFullscreen()
      );
    if (this.downloadButton)
      this.downloadButton.addEventListener("click", () =>
        this.downloadCurrentImage()
      );
    if (this.toggleInfoBtn)
      this.toggleInfoBtn.addEventListener("click", () =>
        this.toggleInfoPanel()
      );
    if (this.toggleThumbsBtn)
      this.toggleThumbsBtn.addEventListener("click", () =>
        this.toggleThumbnails()
      );
    // 侧边栏事件
    this.sideZoomInBtn.addEventListener("click", () => this.zoom(this.zoomStep));
    this.sideZoomOutBtn.addEventListener("click", () => this.zoom(-this.zoomStep));
    this.sideResetZoomBtn.addEventListener("click", () => this.resetZoom());
    this.sideRotateLeftBtn.addEventListener("click", () => this.rotate(-90));
    this.sideRotateRightBtn.addEventListener("click", () => this.rotate(90));
    this.sideFullscreenBtn.addEventListener("click", () =>
      this.toggleFullscreen()
    );
    this.sideDownloadBtn.addEventListener("click", () =>
      this.downloadCurrentImage()
    );
    this.sideInfoBtn.addEventListener("click", () => this.toggleInfoPanel());
    this.sideToggleThumbsBtn.addEventListener("click", () =>
      this.toggleThumbnails()
    );
    // 底部迷你控制已移除
    document.addEventListener("keydown", this._boundKeyDown);
    // 将拖拽与缩放事件绑定到容器，兼容 renderNode 模式
    this.imageContainer.addEventListener("mousedown", this._boundMouseDown);
    this.imageContainer.addEventListener("touchstart", this._boundTouchStart, { passive: true });
    this.imageContainer.addEventListener("wheel", this._boundWheel);
    this.previewContainer.addEventListener("click", this._boundContainerClick);
    this.imageContainer.addEventListener("dblclick", this._boundImageDblClick);
    // 关闭信息弹窗按钮：阻止事件冒泡并强制关闭
    this.infoCollapseBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      this.closeInfoPanel();
    });
  }

  // 判断是否应开始拖拽：排除交互控件，仅对图片或自定义节点生效
  private shouldStartDrag(target: HTMLElement): boolean {
    if (
      target.closest(".arrow-btn, .info-modal, .side-toolbar")
    )
      return false;
    return !!target.closest(
      "#previewImage, .custom-render-node, #imageContainer"
    );
  }

  private throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): T {
    let inThrottle: boolean;
    return ((...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    }) as T;
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
  }

  public open(index: number) {
    if (index < 0 || index >= this.images.length) return;
    this.currentIndex = index;
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.rotation = 0;
    this.updateThumbnails(); // 先切换缩略图高亮
    this.updatePreview();
    this.previewContainer.classList.add("active");
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
    if (this.currentImageLoadStatus.loaded && this.imageLoadCallbacks.length > 0) {
      this.imageLoadCallbacks.forEach(callback => {
        try {
          callback();
        } catch (e) {
          console.warn("Image load callback error:", e);
        }
      });
    } else if (this.currentImageLoadStatus.error && this.imageErrorCallbacks.length > 0) {
      this.imageErrorCallbacks.forEach(callback => {
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
    const images = node.querySelectorAll('img');
    
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
          this.currentImageLoadStatus = { loaded: false, error: "图片加载失败" };
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
    this.showProgress(0, 0, 0);

    // 如果提供了自定义渲染节点，优先使用并跳过图片加载
    if (this.customRenderNode) {
      // Clear cached custom node reference
      if (this.cachedCustomNode) {
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
            maybePromise = this.onImageLoad(
              currentImage,
              this.currentIndex
            );
          } catch (e) {
            console.warn("onImageLoad 执行出错:", e);
          }
        }
        this.updateThumbnails();
        this.setInfoPanelContent(currentImage, this.currentIndex);
        // 自定义渲染不使用网络下载进度
        this.hideProgress();
        
        // 如果有自定义 loading 控制，则不自动隐藏 loading
        if (!this._loadingDoneCallback) {
          // 若 onImageLoad 返回 Promise，则等待后再隐藏 loading
          if (maybePromise && typeof maybePromise.then === "function") {
            try {
              (maybePromise as Promise<any>).then(
                () => this.hideLoading(),
                () => this.hideLoading()
              );
            } catch {
              this.hideLoading();
            }
          } else {
            // 保证 loading 至少渲染一帧
            requestAnimationFrame(() => requestAnimationFrame(() => this.hideLoading()));
          }
        }
        
        // 复位拖拽/缩放状态
        this.resetZoom();
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

    xhr.onprogress = (e) => {
      if (thisToken !== this.imageLoadToken) return;
      if (e.lengthComputable) {
        this.showProgress(e.loaded / e.total, e.loaded, e.total);
      }
    };

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
        this.hideProgress();

        const oldNode = this.imageContainer.querySelector(
          ".custom-render-node"
        );
        if (oldNode) oldNode.remove();

        const previewImg = document.getElementById("previewImage");
        if (previewImg) {
          this.previewImage = previewImg as HTMLImageElement;
        }
        this.updateImageTransform();

        // 更新图片加载状态
        this.currentImageLoadStatus = { loaded: true };
        // 触发图片加载完成回调
        this.imageLoadCallbacks.forEach(callback => {
          try {
            callback();
          } catch (e) {
            console.warn("Image load callback error:", e);
          }
        });
      } else {
        this.activeXHR = null;
        this.handleImageError('http', xhr.status);
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
      this.handleImageError('network');
    };

    xhr.ontimeout = () => {
      if (thisToken !== this.imageLoadToken) return;
      this.activeXHR = null;
      this.handleImageError('timeout');
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

  private handleImageError(errorType: 'network' | 'timeout' | 'http' = 'network', httpStatus?: number) {
    this.hideProgress();
    this.hideLoading();
    this.errorMessage.style.display = "block";
    
    let errorMessage: string;
    switch (errorType) {
      case 'timeout':
        errorMessage = "图片加载超时，请重试";
        break;
      case 'http':
        errorMessage = `图片加载失败 (HTTP ${httpStatus || 'error'})`;
        break;
      case 'network':
      default:
        errorMessage = "图片加载失败，请检查网络连接或图片地址";
        break;
    }
    
    this.errorMessage.textContent = errorMessage;
    
    // 更新图片加载状态
    this.currentImageLoadStatus = { loaded: false, error: errorMessage };
    // 触发图片加载失败回调
    this.imageErrorCallbacks.forEach(callback => {
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
          | ((item: ViewerItem, idx: number) => HTMLElement | { 
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
          if (result && typeof result === "object" && "node" in result && typeof result.node === "object") {
            node = result.node;
            if (typeof result.done === "function") {
              // 创建 LoadingContext
              const context: LoadingContext = {
                getImageLoadingStatus: () => Promise.resolve(this.currentImageLoadStatus),
                getMediaLoadingStatus: () => this.getMediaLoadingStatus(),
                onImageLoaded: (callback: () => void) => {
                  this.imageLoadCallbacks.push(callback);
                },
                onImageError: (callback: (error: string) => void) => {
                  this.imageErrorCallbacks.push(callback);
                },
                getCurrentImage: () => ({
                  image: this.images[this.currentIndex],
                  index: this.currentIndex
                }),
                closeLoading: () => {
                  this.closeLoading();
                }
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
                  doneResult.then(() => {
                    checkAfterDone();
                  }).catch((error) => {
                    console.warn("Loading done callback promise rejected:", error);
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
  private async getMediaLoadingStatus(): Promise<{ images: boolean[]; videos: boolean[]; audios: boolean[] }> {
    const customRenderNode = this.imageContainer.querySelector('.custom-render-node');
    if (!customRenderNode) {
      return { images: [], videos: [], audios: [] };
    }

    const images = Array.from(customRenderNode.querySelectorAll('img'));
    const videos = Array.from(customRenderNode.querySelectorAll('video'));
    const audios = Array.from(customRenderNode.querySelectorAll('audio'));

    const imageStatuses = images.map(img => img.complete && img.naturalHeight !== 0);
    const videoStatuses = videos.map(video => video.readyState >= 3); // HAVE_FUTURE_DATA
    const audioStatuses = audios.map(audio => audio.readyState >= 3);

    return {
      images: imageStatuses,
      videos: videoStatuses,
      audios: audioStatuses
    };
  }

  private navigate(direction: number) {
    const newIndex = this.currentIndex + direction;
    if (newIndex >= 0 && newIndex < this.images.length) {
      this.currentIndex = newIndex;
      this.resetZoom();
      this.updateThumbnails(); // 先切换缩略图高亮
      this.updatePreview();
    }
  }

  private zoom(delta: number) {
    const newScale = Math.max(this.zoomMin, Math.min(this.zoomMax, this.scale + delta));
    if (newScale !== this.scale) {
      this.scale = newScale;
      
      // 缩放后调整位置，防止图片超出边界
      if (this.scale <= 1) {
        // 缩放到1或更小时，重置到中心
        this.translateX = 0;
        this.translateY = 0;
      } else {
        // 缩放大于1时，约束位置在合理范围内
        this.constrainTranslation();
      }
      
      this.updateImageTransform();
    }
  }

  // 约束平移位置在合理范围内
  private constrainTranslation() {
    const containerRect = this.imageContainer.getBoundingClientRect();
    const contentDimensions = this.calculateContentDimensions(containerRect);
    const { width: contentWidth, height: contentHeight } = contentDimensions;
    
    // Calculate scaled dimensions
    const scaledWidth = contentWidth * this.scale;
    const scaledHeight = contentHeight * this.scale;
    
    // Calculate max translation to keep image edges within viewport
    const maxTranslateX = Math.max(0, (scaledWidth - containerRect.width) / 2);
    const maxTranslateY = Math.max(0, (scaledHeight - containerRect.height) / 2);
    
    // Constrain translation
    this.translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, this.translateX));
    this.translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, this.translateY));
  }

  private normalizeDelta(e: WheelEvent): number {
    let delta = e.deltaY;
    
    // 标准化不同的 deltaMode
    if (e.deltaMode === 1) {
      // DOM_DELTA_LINE
      delta *= 16; // 假设每行 16px
    } else if (e.deltaMode === 2) {
      // DOM_DELTA_PAGE
      delta *= 800; // 假设每页 800px
    }
    
    // 限制极端值
    return Math.max(-100, Math.min(100, delta));
  }

  private calculateDynamicZoomStep(normalizedDelta: number): number {
    const absDelta = Math.abs(normalizedDelta);
    
    // 基础步长 + 速度加成
    const speedBonus = Math.min(
      absDelta * this.zoomWheelSpeedMultiplier,
      this.zoomWheelMaxStep - this.zoomWheelBaseStep
    );
    
    return this.zoomWheelBaseStep + speedBonus;
  }

  private handleWheelZoom(e: WheelEvent): void {
    // 标准化 deltaY（不同浏览器和设备差异很大）
    const normalizedDelta = this.normalizeDelta(e);
    
    // 计算动态步长
    const zoomStep = this.calculateDynamicZoomStep(normalizedDelta);
    
    // 应用缩放
    const direction = normalizedDelta < 0 ? 1 : -1;
    this.zoom(direction * zoomStep);
  }

  private resetZoom() {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.rotation = 0;
    this.updateImageTransform();
  }

  private rotate(degrees: number) {
    // 累积旋转角度，不做取模，让 CSS 自然过渡
    this.rotation += degrees;
    this.updateImageTransform();
  }

  private updateImageTransform(skipTransition: boolean = false, useSpringTransition: boolean = false) {
    const transformValue = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale}) rotate(${this.rotation}deg)`;
    
    // 确定过渡效果
    let transition = "transform 0.3s ease";
    if (skipTransition) {
      transition = "none";
    } else if (useSpringTransition) {
      transition = "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
    }
    
    // 更新预览图片
    if (this.previewImage) {
      this.previewImage.style.transition = transition;
      this.previewImage.style.transform = transformValue;
    }
    
    // 更新自定义渲染节点（如果存在）
    if (this.cachedCustomNode) {
      this.cachedCustomNode.style.transition = transition;
      this.cachedCustomNode.style.transform = transformValue;
    }

    // 根据缩放状态更新容器光标（允许任何缩放级别拖动）
    if (this.imageContainer) {
      this.imageContainer.style.cursor = "grab";
    }

    // 同步到外部（无论是否使用 renderNode）
    this.syncTransformState();
  }

  // 将变换状态通过 dataset/CSS 变量/自定义事件/回调抛出
  private syncTransformState() {
    // Only sync if there are listeners (callback or event listeners)
    if (!this.onTransformChangeCb && !this.previewContainer.hasAttribute('data-has-transform-listener')) {
      return;
    }
    
    const state = {
      scale: this.scale,
      translateX: this.translateX,
      translateY: this.translateY,
      rotation: this.rotation,
      index: this.currentIndex,
      image: this.images[this.currentIndex] || null,
    };
    
    // Only update dataset if needed (for external reading)
    if (this.previewContainer.dataset.scale !== String(this.scale)) {
      this.previewContainer.dataset.scale = String(this.scale);
      this.previewContainer.dataset.tx = String(this.translateX);
      this.previewContainer.dataset.ty = String(this.translateY);
      this.previewContainer.dataset.rotation = String(this.rotation);
      this.previewContainer.dataset.index = String(this.currentIndex);
    }
    
    // CSS 变量，供外部样式或自定义节点使用（仅在有自定义节点时）
    if (this.cachedCustomNode) {
      const host = this.imageContainer as HTMLElement;
      host.style.setProperty("--vp-scale", String(this.scale));
      host.style.setProperty("--vp-tx", `${this.translateX}px`);
      host.style.setProperty("--vp-ty", `${this.translateY}px`);
      host.style.setProperty("--vp-rotation", `${this.rotation}deg`);
    }
    
    // 自定义事件（仅在有监听器时触发）
    if (this.previewContainer.hasAttribute('data-has-transform-listener')) {
      const evt = new CustomEvent("viewerpro:transform", { detail: state });
      this.previewContainer.dispatchEvent(evt);
    }
    
    // 回调
    if (this.onTransformChangeCb) this.onTransformChangeCb(state);
  }

  // 外部可主动读取当前状态
  public getState() {
    return {
      scale: this.scale,
      translateX: this.translateX,
      translateY: this.translateY,
      rotation: this.rotation,
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
    }) => void
  ) {
    const handler = (e: Event) => listener((e as CustomEvent).detail);
    this.previewContainer.addEventListener(
      "viewerpro:transform",
      handler as EventListener
    );
    return () =>
      this.previewContainer.removeEventListener(
        "viewerpro:transform",
        handler as EventListener
      );
  }

  private startDrag(e: MouseEvent | Touch) {
    // 允许任何缩放级别下拖动（小于1时松手会回弹）
    if ("preventDefault" in e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    this.isDragging = true;
    this.startX = e.clientX - this.translateX;
    this.startY = e.clientY - this.translateY;
    this.imageContainer.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    
    // Cache content dimensions at drag start for better performance
    const containerRect = this.imageContainer.getBoundingClientRect();
    this.cachedContentDimensions = this.calculateContentDimensions(containerRect);
    
    document.addEventListener("mousemove", this._boundDrag);
    document.addEventListener("mouseup", this._boundStopDrag);
    document.addEventListener("touchmove", this._boundTouchDrag, {
      passive: false,
    });
    document.addEventListener("touchend", this._boundTouchEnd);
  }

  private drag(e: MouseEvent | Touch) {
    if (!this.isDragging) return;
    if ("preventDefault" in e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }

    // Cancel previous RAF to avoid stacking
    if (this.dragRAF !== null) {
      cancelAnimationFrame(this.dragRAF);
    }

    // Use requestAnimationFrame for smooth dragging
    this.dragRAF = requestAnimationFrame(() => {
      this.dragRAF = null;
      
      const containerRect = this.imageContainer.getBoundingClientRect();
      
      // Use cached dimensions if available, otherwise calculate
      if (!this.cachedContentDimensions) {
        this.cachedContentDimensions = this.calculateContentDimensions(containerRect);
      }
      
      const { width: contentWidth, height: contentHeight } = this.cachedContentDimensions;
      
      this.translateX = e.clientX - this.startX;
      this.translateY = e.clientY - this.startY;

      // 只在缩放大于1时约束拖动范围，小于等于1时允许自由拖动
      if (this.scale > 1) {
        // Calculate scaled dimensions
        const scaledWidth = contentWidth * this.scale;
        const scaledHeight = contentHeight * this.scale;
        
        // Calculate max translation to keep image edges within viewport
        const maxTranslateX = Math.max(0, (scaledWidth - containerRect.width) / 2);
        const maxTranslateY = Math.max(0, (scaledHeight - containerRect.height) / 2);
        
        // Constrain translation
        this.translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, this.translateX));
        this.translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, this.translateY));
      }

      this.updateImageTransform(true); // Pass true to skip transition during drag
    });
  }

  private calculateContentDimensions(containerRect: DOMRect): { width: number; height: number } {
    // Use cached custom node reference to avoid DOM query
    if (this.cachedCustomNode) {
      return {
        width: this.cachedCustomNode.offsetWidth,
        height: this.cachedCustomNode.offsetHeight
      };
    } else if (this.previewImage && this.previewImage.naturalWidth > 0) {
      const imgAspect = this.previewImage.naturalWidth / this.previewImage.naturalHeight;
      const containerAspect = containerRect.width / containerRect.height;
      
      if (imgAspect > containerAspect) {
        const width = Math.min(this.previewImage.naturalWidth, containerRect.width);
        return { width, height: width / imgAspect };
      } else {
        const height = Math.min(this.previewImage.naturalHeight, containerRect.height);
        return { width: height * imgAspect, height };
      }
    }
    
    return {
      width: containerRect.width,
      height: containerRect.height
    };
  }

  private stopDrag() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.imageContainer.style.cursor = "grab"; // 允许任何缩放级别拖动
    document.body.style.userSelect = "";
    
    // Cancel any pending RAF
    if (this.dragRAF !== null) {
      cancelAnimationFrame(this.dragRAF);
      this.dragRAF = null;
    }
    
    // 如果缩放小于等于1，回弹到中心位置（使用弹性动画）
    if (this.scale <= 1) {
      this.translateX = 0;
      this.translateY = 0;
      this.updateImageTransform(false, true); // 使用弹性过渡
    } else {
      // 缩放大于1时，确保位置在合理范围内（修复缩放后位置不正确的问题）
      this.constrainTranslation();
      this.updateImageTransform(false, false); // 使用普通过渡
    }
    
    // Clear cached dimensions
    this.cachedContentDimensions = null;
    
    document.removeEventListener("mousemove", this._boundDrag);
    document.removeEventListener("mouseup", this._boundStopDrag);
    document.removeEventListener(
      "touchmove",
      this._boundTouchDrag as EventListener,
      false
    );
    document.removeEventListener("touchend", this._boundTouchEnd);
  }

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
        this.zoom(this.zoomStep);
        break;
      case "-":
        this.zoom(-this.zoomStep);
        break;
      case "0":
        this.resetZoom();
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

  private showProgress(percent: number, loaded: number, total: number) {
    this.progressMask.style.display = "flex";
    this.progressText.textContent = "加载中";
    this.progressPercent.textContent = `${Math.round(percent * 100)}%`;
    this.progressSize.textContent = `${(loaded / 1048576).toFixed(1)}MB / ${(
      total / 1048576
    ).toFixed(1)}MB`;
    // 进度环动画
    const circle = this.progressMask.querySelector(
      ".progress-bar"
    ) as SVGCircleElement;
    const r = 14,
      c = 2 * Math.PI * r;
    circle.style.strokeDasharray = `${c}`;
    circle.style.strokeDashoffset = `${c * (1 - percent)}`;
  }

  private hideProgress() {
    this.progressMask.style.display = "none";
  }

  // 缩略图抽屉开关（主要用于移动端）
  private toggleThumbnails() {
    if (!this.thumbnailNav) return;
    this.thumbnailNav.classList.toggle("open");
  }

  // 新增：清理资源的方法
  public destroy() {
    // 清理拖拽相关事件
    this.stopDrag();

    // 清理事件监听器 - 使用绑定的处理器
    document.removeEventListener("keydown", this._boundKeyDown);
    this.imageContainer.removeEventListener("mousedown", this._boundMouseDown);
    this.imageContainer.removeEventListener("touchstart", this._boundTouchStart);
    this.imageContainer.removeEventListener("wheel", this._boundWheel);
    this.previewContainer.removeEventListener("click", this._boundContainerClick);
    this.imageContainer.removeEventListener("dblclick", this._boundImageDblClick);

    // 清理资源
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
    
    // Cancel any pending RAF
    if (this.dragRAF !== null) {
      cancelAnimationFrame(this.dragRAF);
      this.dragRAF = null;
    }
    
    // 清理滚轮 RAF
    if (this._wheelRAF !== null) {
      cancelAnimationFrame(this._wheelRAF);
      this._wheelRAF = null;
    }
    
    // Clear all caches
    this.cachedContentDimensions = null;
    this.cachedCustomNode = null;
    this.lastActiveIndex = -1;

    // 从DOM中移除容器
    if (this.previewContainer && this.previewContainer.parentNode) {
      this.previewContainer.parentNode.removeChild(this.previewContainer);
    }

    // 清理回调数组
    this.imageLoadCallbacks = [];
    this.imageErrorCallbacks = [];

    // 重置状态
    this.images = [];
    this.currentIndex = 0;
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;
    this.isFullscreen = false;
    this.imageLoadToken = 0;
    this.currentImageLoadStatus = { loaded: false };
    this._loadingDoneCallback = null;
  }

  // 设置主题
  public setTheme(theme: 'dark' | 'light' | 'auto') {
    this.theme = theme;
    if (this.previewContainer) {
      this.previewContainer.setAttribute('data-theme', theme);
    }
  }

  // 获取当前主题
  public getTheme(): 'dark' | 'light' | 'auto' {
    return this.theme;
  }

  // 设置缩放配置
  public setZoomConfig(config: {
    min?: number;
    max?: number;
    step?: number;
    wheelBaseStep?: number;
    wheelMaxStep?: number;
    wheelSpeedMultiplier?: number;
  }) {
    if (config.min !== undefined) this.zoomMin = config.min;
    if (config.max !== undefined) this.zoomMax = config.max;
    if (config.step !== undefined) this.zoomStep = config.step;
    if (config.wheelBaseStep !== undefined) this.zoomWheelBaseStep = config.wheelBaseStep;
    if (config.wheelMaxStep !== undefined) this.zoomWheelMaxStep = config.wheelMaxStep;
    if (config.wheelSpeedMultiplier !== undefined) this.zoomWheelSpeedMultiplier = config.wheelSpeedMultiplier;
  }

  // 获取缩放配置
  public getZoomConfig() {
    return {
      min: this.zoomMin,
      max: this.zoomMax,
      step: this.zoomStep,
      wheelBaseStep: this.zoomWheelBaseStep,
      wheelMaxStep: this.zoomWheelMaxStep,
      wheelSpeedMultiplier: this.zoomWheelSpeedMultiplier,
    };
  }
}

// 导出到 window 方便浏览器直接使用
(window as any).ViewerPro = ViewerPro;
