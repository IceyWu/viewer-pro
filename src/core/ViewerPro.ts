// 图片预览组件（TypeScript 版，适配模块导出）
export interface ImageObj {
  src: string;
  thumbnail?: string;
  title?: string;
}

export interface ViewerProOptions {
  loadingNode?: HTMLElement | (() => HTMLElement);
  images?: ImageObj[];
  renderNode?: HTMLElement | ((imgObj: ImageObj, idx: number) => HTMLElement);
  onImageLoad?: (imgObj: ImageObj, idx: number) => void;
}

export class ViewerPro {
  private previewContainer: HTMLElement;
  private previewImage: HTMLImageElement;
  private previewTitle: HTMLElement;
  private closeButton: HTMLElement;
  private prevButton: HTMLButtonElement;
  private nextButton: HTMLButtonElement;
  private zoomInButton: HTMLButtonElement;
  private zoomOutButton: HTMLButtonElement;
  private resetZoomButton: HTMLButtonElement;
  private fullscreenButton: HTMLButtonElement;
  private downloadButton: HTMLButtonElement;
  private imageCounter: HTMLElement;
  private loadingIndicator: HTMLElement;
  private errorMessage: HTMLElement;
  private thumbnailNav: HTMLElement;
  private imageContainer: HTMLElement;
  private customLoadingNode: HTMLElement | (() => HTMLElement) | null;
  private customRenderNode: HTMLElement | ((imgObj: ImageObj, idx: number) => HTMLElement) | null;
  private onImageLoad: ((imgObj: ImageObj, idx: number) => void) | null;

  private images: ImageObj[] = [];
  private currentIndex = 0;
  private scale = 1;
  private translateX = 0;
  private translateY = 0;
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private isFullscreen = false;

  private _boundDrag: (e: MouseEvent | Touch) => void;
  private _boundStopDrag: () => void;
  private _boundTouchDrag: (e: TouchEvent) => void;
  private _boundTouchEnd: () => void;

  constructor(options: ViewerProOptions = {}) {
    this.previewContainer = document.getElementById('imagePreview')!;
    this.previewImage = document.getElementById('previewImage') as HTMLImageElement;
    this.previewTitle = document.getElementById('previewTitle')!;
    this.closeButton = document.getElementById('closePreview')!;
    this.prevButton = document.getElementById('prevImage') as HTMLButtonElement;
    this.nextButton = document.getElementById('nextImage') as HTMLButtonElement;
    this.zoomInButton = document.getElementById('zoomIn') as HTMLButtonElement;
    this.zoomOutButton = document.getElementById('zoomOut') as HTMLButtonElement;
    this.resetZoomButton = document.getElementById('resetZoom') as HTMLButtonElement;
    this.fullscreenButton = document.getElementById('toggleFullscreen') as HTMLButtonElement;
    this.downloadButton = document.getElementById('downloadImage') as HTMLButtonElement;
    this.imageCounter = document.getElementById('imageCounter')!;
    this.loadingIndicator = document.getElementById('loadingIndicator')!;
    this.errorMessage = document.getElementById('errorMessage')!;
    this.thumbnailNav = document.getElementById('thumbnailNav')!;
    this.imageContainer = document.getElementById('imageContainer')!;
    this.customLoadingNode = options.loadingNode || null;
    this.customRenderNode = options.renderNode || null;
    this.onImageLoad = typeof options.onImageLoad === 'function' ? options.onImageLoad : null;

    this.images = Array.isArray(options.images) ? options.images : [];
    this._boundDrag = this.drag.bind(this);
    this._boundStopDrag = this.stopDrag.bind(this);
    this._boundTouchDrag = (e: TouchEvent) => {
      e.preventDefault();
      this.drag(e.touches[0]);
    };
    this._boundTouchEnd = this.stopDrag.bind(this);

    this.bindEvents();
    if (this.images.length > 0) {
      this.updateThumbnails();
    }
  }

  private bindEvents() {
    this.closeButton.addEventListener('click', () => this.close());
    this.prevButton.addEventListener('click', () => this.navigate(-1));
    this.nextButton.addEventListener('click', () => this.navigate(1));
    this.zoomInButton.addEventListener('click', () => this.zoom(0.2));
    this.zoomOutButton.addEventListener('click', () => this.zoom(-0.2));
    this.resetZoomButton.addEventListener('click', () => this.resetZoom());
    this.fullscreenButton.addEventListener('click', () => this.toggleFullscreen());
    this.downloadButton.addEventListener('click', () => this.downloadCurrentImage());
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.previewImage.addEventListener('mousedown', (e) => this.startDrag(e));
    this.previewImage.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
    this.previewImage.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom(e.deltaY < 0 ? 0.1 : -0.1);
    });
    this.previewContainer.addEventListener('click', (e) => {
      if (e.target === this.previewContainer) {
        this.close();
      }
    });
    this.previewImage.addEventListener('dblclick', () => this.resetZoom());
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
    this.thumbnailNav.innerHTML = '';
    this.images.forEach((image, index) => {
      const thumbnail = document.createElement('div');
      thumbnail.className = `thumbnail ${index === this.currentIndex ? 'active' : ''}`;
      thumbnail.innerHTML = `<img src="${image.thumbnail || image.src}" alt="${image.title}">`;
      thumbnail.addEventListener('click', () => this.open(index));
      this.thumbnailNav.appendChild(thumbnail);
    });
  }

  public open(index: number) {
    if (index < 0 || index >= this.images.length) return;
    this.currentIndex = index;
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.updatePreview();
    this.updateThumbnails();
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

    const img = new Image();
    img.onload = () => {
      this.hideLoading();
      if (this.customRenderNode) {
        this.previewImage.style.display = 'none';
        const oldNode = this.imageContainer.querySelector('.custom-render-node');
        if (oldNode) oldNode.remove();
        let node: HTMLElement;
        if (typeof this.customRenderNode === 'function') {
          node = this.customRenderNode(currentImage, this.currentIndex);
        } else {
          node = this.customRenderNode;
        }
        if (node instanceof HTMLElement) {
          node.classList.add('custom-render-node');
          this.imageContainer.appendChild(node);
          const customImg = node.tagName === 'IMG' ? node : node.querySelector('img');
          if (customImg) {
            (customImg as any).onmousedown = null;
            (customImg as any).ontouchstart = null;
            (customImg as any).onwheel = null;
            (customImg as any).ondblclick = null;
            customImg.addEventListener('mousedown', (e: MouseEvent) => this.startDrag(e));
            customImg.addEventListener('touchstart', (e: TouchEvent) => this.startDrag(e.touches[0]));
            customImg.addEventListener('wheel', (e: WheelEvent) => {
              e.preventDefault();
              this.zoom(e.deltaY < 0 ? 0.1 : -0.1);
            });
            customImg.addEventListener('dblclick', () => this.resetZoom());
            (customImg as HTMLElement).style.cursor = 'grab';
            this.previewImage = customImg as HTMLImageElement;
            this.updateImageTransform();
          }
        }
      } else {
        this.previewImage.src = currentImage.src;
        this.previewImage.style.display = 'block';
        const oldNode = this.imageContainer.querySelector('.custom-render-node');
        if (oldNode) oldNode.remove();
        this.previewImage = document.getElementById('previewImage') as HTMLImageElement;
        this.updateImageTransform();
      }
      if (this.onImageLoad) {
        this.onImageLoad(currentImage, this.currentIndex);
      }
      this.updateThumbnails();
    };
    img.onerror = () => {
      this.hideLoading();
      this.errorMessage.style.display = 'block';
    };
    img.src = currentImage.src;
    this.prevButton.disabled = this.currentIndex === 0;
    this.nextButton.disabled = this.currentIndex === this.images.length - 1;
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
      this.updatePreview();
    }
  }

  private zoom(delta: number) {
    const newScale = Math.max(0.5, Math.min(3, this.scale + delta));
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
    const containerRect = this.imageContainer.getBoundingClientRect();
    const imageRect = this.previewImage.getBoundingClientRect();
    this.translateX = e.clientX - this.startX;
    this.translateY = e.clientY - this.startY;
    const maxTranslateX = (imageRect.width * this.scale - containerRect.width) / 2;
    const maxTranslateY = (imageRect.height * this.scale - containerRect.height) / 2;
    this.translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, this.translateX));
    this.translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, this.translateY));
    this.updateImageTransform();
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

  private toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.previewContainer.requestFullscreen?.().catch((err) => {
        console.error(`全屏错误: ${err.message}`);
      });
      this.fullscreenButton.innerHTML = '<i class="fa-solid fa-compress"></i>';
      this.isFullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        this.fullscreenButton.innerHTML = '<i class="fa-solid fa-expand"></i>';
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
        this.zoom(0.2);
        break;
      case '-':
        this.zoom(-0.2);
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
}

// 导出到 window 方便浏览器直接使用
(window as any).ViewerPro = ViewerPro;