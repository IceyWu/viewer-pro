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
} from './icons';

// Constants for better maintainability
const ZOOM_STEP = 0.2;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_WHEEL_STEP = 0.1;

// 图片预览组件（TypeScript 版，适配模块导出）
export interface ImageObj {
  src: string;
  thumbnail?: string;
  title?: string;
  type?: string;
  photoSrc?: string;
  videoSrc?: string;
  [key: string]: any;
}

export interface ViewerProOptions {
  loadingNode?: HTMLElement | (() => HTMLElement);
  images?: ImageObj[];
  renderNode?: HTMLElement | ((imgObj: ImageObj, idx: number) => HTMLElement);
  onImageLoad?: (imgObj: ImageObj, idx: number) => void;
}

export class ViewerPro {
  private previewContainer!: HTMLElement;
  private previewImage!: HTMLImageElement;
  private previewTitle!: HTMLElement;
  private closeButton!: HTMLElement;
  private prevButton!: HTMLButtonElement;
  private nextButton!: HTMLButtonElement;
  private zoomInButton!: HTMLButtonElement;
  private zoomOutButton!: HTMLButtonElement;
  private resetZoomButton!: HTMLButtonElement;
  private fullscreenButton!: HTMLButtonElement;
  private downloadButton!: HTMLButtonElement;
  private imageCounter!: HTMLElement;
  private loadingIndicator!: HTMLElement;
  private errorMessage!: HTMLElement;
  private thumbnailNav!: HTMLElement;
  private imageContainer!: HTMLElement;
  private customLoadingNode: HTMLElement | (() => HTMLElement) | null;
  private onImageLoad: ((imgObj: ImageObj, idx: number) => void) | null;
  private infoPanel!: HTMLElement;
  private infoCollapseBtn!: HTMLElement;
  private progressMask!: HTMLElement;
  private progressText!: HTMLElement;
  private progressPercent!: HTMLElement;
  private progressSize!: HTMLElement;
  private infoPanelContent!: HTMLElement;

  private images: ImageObj[] = [];
  private currentIndex = 0;
  private scale = 1;
  private translateX = 0;
  private translateY = 0;
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private isFullscreen = false;
  private imageLoadToken: number = 0; // 新增

  private _boundDrag!: (e: MouseEvent | Touch) => void;
  private _boundStopDrag!: () => void;
  private _boundTouchDrag!: (e: TouchEvent) => void;
  private _boundTouchEnd!: () => void;

  constructor(options: ViewerProOptions = {}) {
    this.images = Array.isArray(options.images) ? options.images : [];
    this.customLoadingNode = options.loadingNode || null;
    this.onImageLoad = typeof options.onImageLoad === 'function' ? options.onImageLoad : null;
    
    this.initializeContainer();
    this.initializeElements();
    this.bindMethods();
    this.bindEvents();
    
    if (this.images.length > 0) {
      this.updateThumbnails();
    }
  }

  private initializeContainer() {
    this.previewContainer = document.createElement('div');
    this.previewContainer.className = 'image-preview-container';
    this.previewContainer.id = 'imagePreview';
    document.body.appendChild(this.previewContainer);
    this.previewContainer.innerHTML = this.getContainerHTML();
  }

  private getContainerHTML(): string {
    return `
      <div class="image-preview-overlay"></div>
      <div class="image-preview-content">
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
            <div class="corner-tools" id="cornerTools">
              <button class="control-button" id="zoomOut" title="缩小">${zoomOutIcon}</button>
              <button class="control-button" id="resetZoom" title="重置缩放">${resetZoomIcon}</button>
              <button class="control-button" id="zoomIn" title="放大">${zoomInIcon}</button>
              <button class="control-button" id="toggleFullscreen" title="全屏">${fullscreenIcon}</button>
              <button class="control-button" id="downloadImage" title="下载">${downloadIcon}</button>
              <span class="image-preview-counter" id="imageCounter">1 / 1</span>
            </div>
          </div>
          <div class="image-progress-mask" id="imageProgressMask" style="display:none;">
            <div class="progress-ring"><svg width="32" height="32"><circle class="progress-bg" cx="16" cy="16" r="14" stroke-width="4" fill="none"/><circle class="progress-bar" cx="16" cy="16" r="14" stroke-width="4" fill="none"/></svg></div>
            <div class="progress-info"><div id="progressText">加载中</div><div id="progressPercent">0%</div><div id="progressSize">0MB / 0MB</div></div>
          </div>
        </div>
        <div class="image-info-panel expanded" id="imageInfoPanel">
          <div class="info-collapse-btn" id="infoCollapseBtn">&gt;</div>
          <div class="info-panel-content" id="infoPanelContent"></div>
        </div>
      </div>
      <div class="thumbnail-nav" id="thumbnailNav"></div>
    `;
  }

  private initializeElements() {
    this.previewImage = this.previewContainer.querySelector('#previewImage') as HTMLImageElement;
    this.previewTitle = this.previewContainer.querySelector('#previewTitle')!;
    this.closeButton = this.previewContainer.querySelector('#closePreview')!;
    this.prevButton = this.previewContainer.querySelector('#prevImage') as HTMLButtonElement;
    this.nextButton = this.previewContainer.querySelector('#nextImage') as HTMLButtonElement;
    this.zoomInButton = this.previewContainer.querySelector('#zoomIn') as HTMLButtonElement;
    this.zoomOutButton = this.previewContainer.querySelector('#zoomOut') as HTMLButtonElement;
    this.resetZoomButton = this.previewContainer.querySelector('#resetZoom') as HTMLButtonElement;
    this.fullscreenButton = this.previewContainer.querySelector('#toggleFullscreen') as HTMLButtonElement;
    this.downloadButton = this.previewContainer.querySelector('#downloadImage') as HTMLButtonElement;
    this.imageCounter = this.previewContainer.querySelector('#imageCounter')!;
    this.loadingIndicator = this.previewContainer.querySelector('#loadingIndicator')!;
    this.errorMessage = this.previewContainer.querySelector('#errorMessage')!;
    this.thumbnailNav = this.previewContainer.querySelector('#thumbnailNav')!;
    this.imageContainer = this.previewContainer.querySelector('#imageContainer')!;
    this.infoPanel = this.previewContainer.querySelector('#imageInfoPanel')! as HTMLElement;
    this.infoCollapseBtn = this.previewContainer.querySelector('#infoCollapseBtn')! as HTMLElement;
    this.progressMask = this.previewContainer.querySelector('#imageProgressMask')! as HTMLElement;
    this.progressText = this.previewContainer.querySelector('#progressText')! as HTMLElement;
    this.progressPercent = this.previewContainer.querySelector('#progressPercent')! as HTMLElement;
    this.progressSize = this.previewContainer.querySelector('#progressSize')! as HTMLElement;
    this.infoPanelContent = this.previewContainer.querySelector('#infoPanelContent')! as HTMLElement;
  }

  private bindMethods() {
    this._boundDrag = this.drag.bind(this);
    this._boundStopDrag = this.stopDrag.bind(this);
    this._boundTouchDrag = (e: TouchEvent) => {
      e.preventDefault();
      this.drag(e.touches[0]);
    };
    this._boundTouchEnd = this.stopDrag.bind(this);
  }

  private bindEvents() {
    this.closeButton.addEventListener('click', () => this.close());
    this.prevButton.addEventListener('click', () => this.navigate(-1));
    this.nextButton.addEventListener('click', () => this.navigate(1));
    this.zoomInButton.addEventListener('click', () => this.zoom(ZOOM_STEP));
    this.zoomOutButton.addEventListener('click', () => this.zoom(-ZOOM_STEP));
    this.resetZoomButton.addEventListener('click', () => this.resetZoom());
    this.fullscreenButton.addEventListener('click', () => this.toggleFullscreen());
    this.downloadButton.addEventListener('click', () => this.downloadCurrentImage());
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.previewImage.addEventListener('mousedown', (e) => this.startDrag(e));
    this.previewImage.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
    this.previewImage.addEventListener('wheel', this.throttle((e: WheelEvent) => {
      e.preventDefault();
      this.zoom(e.deltaY < 0 ? ZOOM_WHEEL_STEP : -ZOOM_WHEEL_STEP);
    }, 16));
    this.previewContainer.addEventListener('click', (e) => {
      if (e.target === this.previewContainer) {
        this.close();
      }
    });
    this.previewImage.addEventListener('dblclick', () => this.resetZoom());
    this.infoCollapseBtn.addEventListener('click', () => this.toggleInfoPanel());
  }

  private throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
    let inThrottle: boolean;
    return ((...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }) as T;
  }

  public init() {
    document.querySelectorAll('.image-grid-item').forEach((item, index) => {
      item.addEventListener('click', () => this.open(index));
    });
  }

  public addImages(images: ImageObj[]) {
    this.images = images;
    this.updateThumbnails();
  }

  private updateThumbnails() {
    // 如果 thumbnailNav 还没有内容，首次渲染
    if (this.thumbnailNav.childNodes.length !== this.images.length) {
      this.thumbnailNav.innerHTML = '';
      this.images.forEach((image, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = `thumbnail${index === this.currentIndex ? ' active' : ''}`;
        thumbnail.innerHTML = `<img src="${image.thumbnail || image.src}" alt="${image.title}">`;
        thumbnail.addEventListener('click', () => this.open(index));
        this.thumbnailNav.appendChild(thumbnail);
      });
    } else {
      // 只更新 active 状态
      Array.from(this.thumbnailNav.children).forEach((node, idx) => {
        if (idx === this.currentIndex) {
          node.classList.add('active');
        } else {
          node.classList.remove('active');
        }
      });
    }
  }

  public open(index: number) {
    if (index < 0 || index >= this.images.length) return;
    this.currentIndex = index;
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.updateThumbnails(); // 先切换缩略图高亮
    this.updatePreview();
    this.previewContainer.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  public close() {
    this.previewContainer.classList.remove('active');
    document.body.style.overflow = '';
    if (this.isFullscreen) {
      this.toggleFullscreen();
    }
  }

  private updatePreview() {
    const currentImage = this.images[this.currentIndex];
    this.showLoading();
    this.errorMessage.style.display = 'none';
    this.previewImage.style.display = 'none';
    this.previewTitle.textContent = currentImage.title || '图片预览';
    this.imageCounter.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
    this.showProgress(0, 0, 0);
    
    const xhr = new XMLHttpRequest();
    const thisToken = ++this.imageLoadToken;
    xhr.open('GET', currentImage.src, true);
    xhr.responseType = 'blob';
    
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
        
        // 清理之前的blob URL
        if (this.previewImage.src.startsWith('blob:')) {
          URL.revokeObjectURL(this.previewImage.src);
        }
        
        this.previewImage.src = url;
        this.previewImage.style.display = 'block';
        this.hideProgress();
        
        const oldNode = this.imageContainer.querySelector('.custom-render-node');
        if (oldNode) oldNode.remove();
        
        this.previewImage = document.getElementById('previewImage') as HTMLImageElement;
        this.updateImageTransform();
      } else {
        this.handleImageError();
      }
      
      if (this.onImageLoad) {
        this.onImageLoad(currentImage, this.currentIndex);
      }
      this.updateThumbnails();
      this.infoPanelContent.innerHTML = this.renderImageInfo(currentImage);
    };
    
    xhr.onerror = () => {
      if (thisToken !== this.imageLoadToken) return;
      this.handleImageError();
    };
    
    xhr.ontimeout = () => {
      if (thisToken !== this.imageLoadToken) return;
      this.handleImageError();
    };
    
    xhr.send();
    this.prevButton.disabled = this.currentIndex === 0;
    this.nextButton.disabled = this.currentIndex === this.images.length - 1;
  }

  private handleImageError() {
    this.hideProgress();
    this.hideLoading();
    this.errorMessage.style.display = 'block';
    this.errorMessage.textContent = '图片加载失败，请检查网络连接或图片地址';
  }

  private showLoading() {
    this.loadingIndicator.innerHTML = '';
    this.loadingIndicator.style.display = 'flex';
    if (this.customLoadingNode) {
      if (typeof this.customLoadingNode === 'function') {
        const node = this.customLoadingNode();
        if (node instanceof HTMLElement) {
          this.loadingIndicator.appendChild(node);
        }
      } else if (this.customLoadingNode instanceof HTMLElement) {
        this.loadingIndicator.appendChild(this.customLoadingNode);
      }
    } else {
      const div = document.createElement('div');
      div.className = 'image-loading';
      this.loadingIndicator.appendChild(div);
    }
  }

  private hideLoading() {
    this.loadingIndicator.style.display = 'none';
    this.loadingIndicator.innerHTML = '';
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
    const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.scale + delta));
    if (newScale !== this.scale) {
      this.scale = newScale;
      this.updateImageTransform();
    }
  }

  private resetZoom() {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.updateImageTransform();
  }

  private updateImageTransform() {
    this.previewImage.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  private startDrag(e: MouseEvent | Touch) {
    if (this.scale <= 1) return;
    if ('preventDefault' in e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    this.isDragging = true;
    this.startX = e.clientX - this.translateX;
    this.startY = e.clientY - this.translateY;
    this.previewImage.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', this._boundDrag);
    document.addEventListener('mouseup', this._boundStopDrag);
    document.addEventListener('touchmove', this._boundTouchDrag, { passive: false });
    document.addEventListener('touchend', this._boundTouchEnd);
  }

  private drag(e: MouseEvent | Touch) {
    if (!this.isDragging) return;
    if ('preventDefault' in e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    
    // Use requestAnimationFrame for smooth dragging
    requestAnimationFrame(() => {
      const containerRect = this.imageContainer.getBoundingClientRect();
      const imageRect = this.previewImage.getBoundingClientRect();
      this.translateX = e.clientX - this.startX;
      this.translateY = e.clientY - this.startY;
      
      // Constrain dragging within bounds
      const maxTranslateX = Math.max(0, (imageRect.width * this.scale - containerRect.width) / 2);
      const maxTranslateY = Math.max(0, (imageRect.height * this.scale - containerRect.height) / 2);
      this.translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, this.translateX));
      this.translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, this.translateY));
      
      this.updateImageTransform();
    });
  }

  private stopDrag() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.previewImage.style.cursor = 'grab';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', this._boundDrag);
    document.removeEventListener('mouseup', this._boundStopDrag);
    document.removeEventListener('touchmove', this._boundTouchDrag as EventListener, false);
    document.removeEventListener('touchend', this._boundTouchEnd);
  }

  // 全屏切换时切换图标
  private toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.previewContainer.requestFullscreen?.().catch((err) => {
        console.error(`全屏错误: ${err.message}`);
      });
      this.fullscreenButton.innerHTML = fullscreenExitIcon;
      this.isFullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        this.fullscreenButton.innerHTML = fullscreenIcon;
        this.isFullscreen = false;
      }
    }
  }

  private downloadCurrentImage() {
    const currentImage = this.images[this.currentIndex];
    const link = document.createElement('a');
    link.href = currentImage.src;
    link.download = currentImage.title || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (!this.previewContainer.classList.contains('active')) return;
    switch (e.key) {
      case 'Escape':
        this.close();
        break;
      case 'ArrowLeft':
        this.navigate(-1);
        break;
      case 'ArrowRight':
        this.navigate(1);
        break;
      case '+':
      case '=':
        this.zoom(ZOOM_STEP);
        break;
      case '-':
        this.zoom(-ZOOM_STEP);
        break;
      case '0':
        this.resetZoom();
        break;
      case 'f':
        this.toggleFullscreen();
        break;
      case 'd':
        this.downloadCurrentImage();
        break;
    }
  }

  // 新增：渲染图片信息HTML
  private renderImageInfo(img: ImageObj): string {
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
    if (this.infoPanel.classList.contains('expanded')) {
      this.infoPanel.classList.remove('expanded');
      this.infoPanel.classList.add('collapsed');
      this.infoCollapseBtn.innerHTML = '<';
    } else {
      this.infoPanel.classList.remove('collapsed');
      this.infoPanel.classList.add('expanded');
      this.infoCollapseBtn.innerHTML = '>';
    }
  }

  private showProgress(percent: number, loaded: number, total: number) {
    this.progressMask.style.display = 'flex';
    this.progressText.textContent = '加载中';
    this.progressPercent.textContent = `${Math.round(percent * 100)}%`;
    this.progressSize.textContent = `${(loaded / 1048576).toFixed(1)}MB / ${(total / 1048576).toFixed(1)}MB`;
    // 进度环动画
    const circle = this.progressMask.querySelector('.progress-bar') as SVGCircleElement;
    const r = 14, c = 2 * Math.PI * r;
    circle.style.strokeDasharray = `${c}`;
    circle.style.strokeDashoffset = `${c * (1 - percent)}`;
  }

  private hideProgress() {
    this.progressMask.style.display = 'none';
  }

  // 新增：清理资源的方法
  public destroy() {
    // 清理事件监听器
    this.closeButton.removeEventListener('click', () => this.close());
    this.prevButton.removeEventListener('click', () => this.navigate(-1));
    this.nextButton.removeEventListener('click', () => this.navigate(1));
    this.zoomInButton.removeEventListener('click', () => this.zoom(ZOOM_STEP));
    this.zoomOutButton.removeEventListener('click', () => this.zoom(-ZOOM_STEP));
    this.resetZoomButton.removeEventListener('click', () => this.resetZoom());
    this.fullscreenButton.removeEventListener('click', () => this.toggleFullscreen());
    this.downloadButton.removeEventListener('click', () => this.downloadCurrentImage());
    document.removeEventListener('keydown', (e) => this.handleKeyDown(e));
    
    // 清理拖拽相关事件
    this.stopDrag();
    
    // 从DOM中移除容器
    if (this.previewContainer && this.previewContainer.parentNode) {
      this.previewContainer.parentNode.removeChild(this.previewContainer);
    }
    
    // 清理图片资源
    if (this.previewImage.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewImage.src);
    }
    
    // 重置状态
    this.images = [];
    this.currentIndex = 0;
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;
    this.isFullscreen = false;
    this.imageLoadToken = 0;
  }
}

// 导出到 window 方便浏览器直接使用
(window as any).ViewerPro = ViewerPro;
