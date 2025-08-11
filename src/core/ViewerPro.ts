import {
  closeIcon,
  prevIcon,
  nextIcon,
  zoomInIcon,
  zoomOutIcon,
  resetZoomIcon,
} from './icons';

// 图片预览组件（简化版，使用 WebGL 渲染）
export interface ImageObj {
  src: string;
  title?: string;
}

export interface ViewerProOptions {
  images?: ImageObj[];
  webglOptions?: {
    initialScale?: number;
    minScale?: number;
    maxScale?: number;
    smooth?: boolean;
    limitToBounds?: boolean;
  };
}

// 常量定义
const DEFAULT_CONFIG = {
  initialScale: 1,
  minScale: 0.1,
  maxScale: 10,
  smooth: true,
  limitToBounds: true,
} as const;

const ANIMATION_DURATION = 300;
const ZOOM_FACTOR = 1.2;
const DEFAULT_CANVAS_SIZE = { width: 800, height: 600 };

// WebGL Image Viewer 引擎
class WebGLImageViewerEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program!: WebGLProgram;
  private texture: WebGLTexture | null = null;
  private imageLoaded = false;

  // Transform state
  private scale = 1;
  private translateX = 0;
  private translateY = 0;
  private imageWidth = 0;
  private imageHeight = 0;
  private canvasWidth = 0;
  private canvasHeight = 0;

  // Interaction state
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private lastTouchDistance = 0;

  // Animation state
  private animationFrame: number | null = null;
  private isAnimating = false;
  private animationStartTime = 0;
  private readonly animationDuration = ANIMATION_DURATION;
  private startScale = 1;
  private targetScale = 1;
  private startTranslateX = 0;
  private startTranslateY = 0;
  private targetTranslateX = 0;
  private targetTranslateY = 0;

  // Configuration
  private config: Required<NonNullable<ViewerProOptions['webglOptions']>>;

  // Bound event handlers (使用箭头函数避免bind调用)
  private handleMouseDown = (e: MouseEvent) => this._handleMouseDown(e);
  private handleMouseMove = (e: MouseEvent) => this._handleMouseMove(e);
  private handleMouseUp = () => this._handleMouseUp();
  private handleWheel = (e: WheelEvent) => this._handleWheel(e);
  private handleDoubleClick = (e: MouseEvent) => this._handleDoubleClick(e);
  private handleTouchStart = (e: TouchEvent) => this._handleTouchStart(e);
  private handleTouchMove = (e: TouchEvent) => this._handleTouchMove(e);
  private handleTouchEnd = (e: TouchEvent) => this._handleTouchEnd(e);
  private handleResize = () => this.resizeCanvas();

  // Shaders (移到类外部作为静态常量)
  private static readonly VERTEX_SHADER_SOURCE = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    uniform mat3 u_matrix;
    varying vec2 v_texCoord;
    
    void main() {
      vec3 position = u_matrix * vec3(a_position, 1.0);
      gl_Position = vec4(position.xy, 0, 1);
      v_texCoord = a_texCoord;
    }
  `;

  private static readonly FRAGMENT_SHADER_SOURCE = `
    precision mediump float;
    uniform sampler2D u_image;
    varying vec2 v_texCoord;
    
    void main() {
      gl_FragColor = texture2D(u_image, v_texCoord);
    }
  `;

  constructor(canvas: HTMLCanvasElement, config: NonNullable<ViewerProOptions['webglOptions']> = {}) {
    this.canvas = canvas;
    this.config = { ...DEFAULT_CONFIG, ...config };

    const gl = this.getWebGLContext();
    this.gl = gl;

    this.validateCanvas();
    this.setupCanvas();
    this.initWebGL();
    this.setupEventListeners();
  }

  private getWebGLContext(): WebGLRenderingContext {
    const gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    if (!gl) {
      throw new Error('WebGL not supported in this browser');
    }
    return gl as WebGLRenderingContext;
  }

  private validateCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      throw new Error(`Canvas has invalid size: ${rect.width}x${rect.height}`);
    }
  }

  private setupCanvas(): void {
    this.resizeCanvas();
    window.addEventListener('resize', this.handleResize, { passive: true });
  }

  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    
    // 获取有效尺寸
    const { width, height } = this.getValidCanvasSize(rect);
    
    this.canvasWidth = width;
    this.canvasHeight = height;
    
    // 设置 Canvas 的实际像素尺寸
    const devicePixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = width * devicePixelRatio;
    this.canvas.height = height * devicePixelRatio;
    
    // 设置 WebGL 视口
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    if (this.imageLoaded) {
      this.fitImageToScreen();
      this.render();
    }
  }

  private getValidCanvasSize(rect: DOMRect): { width: number; height: number } {
    let { width, height } = rect;
    
    if (width === 0 || height === 0) {
      // 尝试从父容器获取尺寸
      const parent = this.canvas.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        width = parentRect.width || DEFAULT_CANVAS_SIZE.width;
        height = parentRect.height || DEFAULT_CANVAS_SIZE.height;
      } else {
        width = DEFAULT_CANVAS_SIZE.width;
        height = DEFAULT_CANVAS_SIZE.height;
      }
      
      // 强制设置 Canvas 的 CSS 尺寸
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
    }
    
    return { width, height };
  }

  private initWebGL(): void {
    const { gl } = this;
    
    try {
      const vertexShader = this.createShader(gl.VERTEX_SHADER, WebGLImageViewerEngine.VERTEX_SHADER_SOURCE);
      const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, WebGLImageViewerEngine.FRAGMENT_SHADER_SOURCE);

      this.program = this.createProgram(vertexShader, fragmentShader);
      this.setupWebGLState();
      this.createGeometry();
    } catch (error) {
      throw new Error(`WebGL initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const { gl } = this;
    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create WebGL program');
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program link error: ${error}`);
    }

    return program;
  }

  private setupWebGLState(): void {
    const { gl } = this;
    gl.useProgram(this.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private createGeometry(): void {
    const { gl } = this;
    
    // 预定义几何数据
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]);

    this.createBuffer(positions, 'a_position', 2);
    this.createBuffer(texCoords, 'a_texCoord', 2);
  }

  private createBuffer(data: Float32Array, attributeName: string, size: number): void {
    const { gl } = this;
    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error(`Failed to create buffer for ${attributeName}`);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    
    const location = gl.getAttribLocation(this.program, attributeName);
    if (location === -1) {
      throw new Error(`Attribute ${attributeName} not found in shader`);
    }
    
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }

  private createShader(type: number, source: string): WebGLShader {
    const { gl } = this;
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${error}`);
    }
    return shader;
  }

  async loadImage(url: string): Promise<void> {
    const image = await this.loadImageElement(url);
    this.imageWidth = image.width;
    this.imageHeight = image.height;
    this.createTexture(image);
    this.imageLoaded = true;
    this.fitImageToScreen();
    this.render();
  }

  private loadImageElement(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      
      const cleanup = () => {
        image.onload = null;
        image.onerror = null;
      };

      image.onload = () => {
        cleanup();
        resolve(image);
      };
      
      image.onerror = () => {
        cleanup();
        reject(new Error(`Failed to load image: ${url}`));
      };
      
      image.src = url;
    });
  }

  private createTexture(image: HTMLImageElement): void {
    const { gl } = this;
    
    // 清理旧纹理
    if (this.texture) {
      gl.deleteTexture(this.texture);
    }

    this.texture = gl.createTexture();
    if (!this.texture) {
      throw new Error('Failed to create texture');
    }

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }

  private createMatrix(): Float32Array {
    // 优化矩阵计算
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasWidth = this.canvas.width / devicePixelRatio;
    const canvasHeight = this.canvas.height / devicePixelRatio;
    
    const scaleX = (this.imageWidth * this.scale) / canvasWidth;
    const scaleY = (this.imageHeight * this.scale) / canvasHeight;
    const translateX = (this.translateX * 2) / canvasWidth;
    const translateY = -(this.translateY * 2) / canvasHeight;
    
    return new Float32Array([
      scaleX, 0, 0,
      0, scaleY, 0,
      translateX, translateY, 1
    ]);
  }

  private fitImageToScreen(): void {
    const scaleX = this.canvasWidth / this.imageWidth;
    const scaleY = this.canvasHeight / this.imageHeight;
    const fitToScreenScale = Math.min(scaleX, scaleY);
    this.scale = fitToScreenScale * this.config.initialScale;
    this.translateX = 0;
    this.translateY = 0;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private startAnimation(targetScale: number, targetTranslateX: number, targetTranslateY: number): void {
    // 停止当前动画
    this.stopAnimation();
    
    this.isAnimating = true;
    this.animationStartTime = performance.now();
    this.startScale = this.scale;
    this.targetScale = targetScale;
    this.startTranslateX = this.translateX;
    this.startTranslateY = this.translateY;
    this.targetTranslateX = targetTranslateX;
    this.targetTranslateY = targetTranslateY;
    this.animate();
  }

  private stopAnimation(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.isAnimating = false;
  }

  private animate(): void {
    if (!this.isAnimating) return;

    const now = performance.now();
    const elapsed = now - this.animationStartTime;
    const progress = Math.min(elapsed / this.animationDuration, 1);
    const easedProgress = this.config.smooth ? this.easeInOutCubic(progress) : progress;

    this.scale = this.startScale + (this.targetScale - this.startScale) * easedProgress;
    this.translateX = this.startTranslateX + (this.targetTranslateX - this.startTranslateX) * easedProgress;
    this.translateY = this.startTranslateY + (this.targetTranslateY - this.startTranslateY) * easedProgress;

    this.render();

    if (progress < 1) {
      this.animationFrame = requestAnimationFrame(() => this.animate());
    } else {
      this.stopAnimation();
    }
  }

  private getFitToScreenScale(): number {
    const scaleX = this.canvasWidth / this.imageWidth;
    const scaleY = this.canvasHeight / this.imageHeight;
    return Math.min(scaleX, scaleY);
  }

  private constrainImagePosition(): void {
    if (!this.config.limitToBounds) return;

    const fitScale = this.getFitToScreenScale();
    if (this.scale <= fitScale) {
      this.translateX = 0;
      this.translateY = 0;
      return;
    }

    const scaledWidth = this.imageWidth * this.scale;
    const scaledHeight = this.imageHeight * this.scale;
    const maxTranslateX = Math.max(0, (scaledWidth - this.canvasWidth) / 2);
    const maxTranslateY = Math.max(0, (scaledHeight - this.canvasHeight) / 2);

    this.translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, this.translateX));
    this.translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, this.translateY));
  }

  private render(): void {
    const { gl } = this;
    
    // 清除画布
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (!this.texture || !this.imageLoaded) {
      return;
    }

    gl.useProgram(this.program);
    
    // 设置矩阵
    const matrixLocation = gl.getUniformLocation(this.program, 'u_matrix');
    const matrix = this.createMatrix();
    gl.uniformMatrix3fv(matrixLocation, false, matrix);
    
    // 设置纹理
    const imageLocation = gl.getUniformLocation(this.program, 'u_image');
    gl.uniform1i(imageLocation, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    
    // 绘制
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private setupEventListeners(): void {
    const options = { passive: false };
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('wheel', this.handleWheel, options);
    this.canvas.addEventListener('dblclick', this.handleDoubleClick);
    this.canvas.addEventListener('touchstart', this.handleTouchStart, options);
  }

  private removeEventListeners(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('dblclick', this.handleDoubleClick);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('resize', this.handleResize);
    
    // 清理document级别的事件监听器
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
  }

  private _handleMouseDown(e: MouseEvent): void {
    e.preventDefault();
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.style.cursor = 'grabbing';
  }

  private _handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    e.preventDefault();
    
    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;
    this.translateX += deltaX;
    this.translateY += deltaY;
    this.constrainImagePosition();
    this.render();
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private _handleMouseUp(): void {
    this.isDragging = false;
    this.canvas.style.cursor = 'grab';
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  private _handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleFactor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    this.zoomAt(x, y, scaleFactor);
  }

  private _handleDoubleClick(e: MouseEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const fitScale = this.getFitToScreenScale();
    
    if (this.scale > fitScale * 1.1) {
      this.resetView();
    } else {
      this.zoomAt(x, y, 2, true);
    }
  }

  private _handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
      document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      document.addEventListener('touchend', this.handleTouchEnd);
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.lastTouchDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
    }
  }

  private _handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.lastMouseX;
      const deltaY = touch.clientY - this.lastMouseY;
      this.translateX += deltaX;
      this.translateY += deltaY;
      this.constrainImagePosition();
      this.render();
      this.lastMouseX = touch.clientX;
      this.lastMouseY = touch.clientY;
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      if (this.lastTouchDistance > 0) {
        const scaleFactor = currentDistance / this.lastTouchDistance;
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        const rect = this.canvas.getBoundingClientRect();
        this.zoomAt(centerX - rect.left, centerY - rect.top, scaleFactor);
      }
      this.lastTouchDistance = currentDistance;
    }
  }

  private _handleTouchEnd(e: TouchEvent): void {
    this.isDragging = false;
    this.lastTouchDistance = 0;
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
  }

  private zoomAt(x: number, y: number, scaleFactor: number, animated = false): void {
    const oldScale = this.scale;
    const fitScale = this.getFitToScreenScale();
    const newScale = Math.max(
      fitScale * this.config.minScale,
      Math.min(fitScale * this.config.maxScale, oldScale * scaleFactor)
    );
    
    if (newScale === oldScale) return;
    
    const scaleChange = newScale / oldScale;
    const newTranslateX = x - (x - this.translateX) * scaleChange;
    const newTranslateY = y - (y - this.translateY) * scaleChange;
    
    if (animated) {
      this.startAnimation(newScale, newTranslateX, newTranslateY);
    } else {
      this.scale = newScale;
      this.translateX = newTranslateX;
      this.translateY = newTranslateY;
      this.constrainImagePosition();
      this.render();
    }
  }

  public zoomIn(animated = false): void {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    this.zoomAt(centerX, centerY, ZOOM_FACTOR, animated);
  }

  public zoomOut(animated = false): void {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    this.zoomAt(centerX, centerY, 1 / ZOOM_FACTOR, animated);
  }

  public resetView(): void {
    this.fitImageToScreen();
    if (this.config.smooth) {
      this.startAnimation(this.scale, this.translateX, this.translateY);
    } else {
      this.render();
    }
  }

  public destroy(): void {
    this.stopAnimation();
    this.removeEventListeners();
    
    const { gl } = this;
    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }
    if (this.program) {
      gl.deleteProgram(this.program);
    }
    
    this.imageLoaded = false;
  }
}

export class ViewerPro {
  private previewContainer: HTMLElement;
  private previewCanvas: HTMLCanvasElement;
  private webglViewer: WebGLImageViewerEngine | null = null;
  private previewTitle: HTMLElement;
  private closeButton: HTMLElement;
  private prevButton: HTMLDivElement;
  private nextButton: HTMLDivElement;
  private zoomInButton: HTMLButtonElement;
  private zoomOutButton: HTMLButtonElement;
  private resetZoomButton: HTMLButtonElement;
  private loadingIndicator: HTMLElement;
  private errorMessage: HTMLElement;

  private images: ImageObj[] = [];
  private currentIndex = 0;
  private webglOptions: NonNullable<ViewerProOptions['webglOptions']>;
  private isDestroyed = false;

  constructor(options: ViewerProOptions = {}) {
    this.webglOptions = { ...DEFAULT_CONFIG, ...options.webglOptions };
    this.images = Array.isArray(options.images) ? [...options.images] : [];
    
    this.createContainer();
    this.bindEvents();
  }

  private createContainer(): void {
    this.previewContainer = document.createElement('div');
    this.previewContainer.className = 'image-preview-container';
    this.previewContainer.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 5000;
      display: none; background: rgba(0,0,0,0.9); opacity: 0;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(this.previewContainer);

    this.previewContainer.innerHTML = this.getContainerHTML();
    this.initializeElements();
  }

  private getContainerHTML(): string {
    return `
      <div style="position: relative; width: 100%; height: 100%; display: flex; flex-direction: column;">
        <div style="position: absolute; top: 20px; left: 20px; right: 20px; display: flex; justify-content: space-between; align-items: center; z-index: 10;">
          <div id="previewTitle" style="color: white; font-size: 1.25rem; font-weight: 500;">图片预览</div>
          <div id="closePreview" style="color: white; font-size: 1.5rem; cursor: pointer; width: 40px; height: 40px; border-radius: 50%; display: flex; justify-content: center; align-items: center; background: rgba(255,255,255,0.2);">
            ${closeIcon}
          </div>
        </div>
        
        <div style="flex: 1; position: relative; display: flex; justify-content: center; align-items: center;">
          <div id="loadingIndicator" style="display: none; color: white; font-size: 1.2rem;">加载中...</div>
          <div id="errorMessage" style="display: none; color: white; background: rgba(255,0,0,0.2); padding: 1rem; border-radius: 0.5rem;">图片加载失败</div>
          <canvas id="previewCanvas" style="cursor: grab; display: none;"></canvas>
          
          <div id="prevImage" style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); color: white; font-size: 2rem; cursor: pointer; width: 50px; height: 50px; border-radius: 50%; display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.5);">
            ${prevIcon}
          </div>
          <div id="nextImage" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); color: white; font-size: 2rem; cursor: pointer; width: 50px; height: 50px; border-radius: 50%; display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.5);">
            ${nextIcon}
          </div>
        </div>
        
        <div style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px;">
          <button id="zoomOut" style="background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; justify-content: center; align-items: center;" title="缩小">
            ${zoomOutIcon}
          </button>
          <button id="resetZoom" style="background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; justify-content: center; align-items: center;" title="重置">
            ${resetZoomIcon}
          </button>
          <button id="zoomIn" style="background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; justify-content: center; align-items: center;" title="放大">
            ${zoomInIcon}
          </button>
        </div>
      </div>
    `;
  }

  private initializeElements(): void {
    const querySelector = <T extends Element>(selector: string): T => {
      const element = this.previewContainer.querySelector(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }
      return element as T;
    };

    this.previewCanvas = querySelector<HTMLCanvasElement>('#previewCanvas');
    this.previewTitle = querySelector('#previewTitle');
    this.closeButton = querySelector('#closePreview');
    this.prevButton = querySelector<HTMLDivElement>('#prevImage');
    this.nextButton = querySelector<HTMLDivElement>('#nextImage');
    this.zoomInButton = querySelector<HTMLButtonElement>('#zoomIn');
    this.zoomOutButton = querySelector<HTMLButtonElement>('#zoomOut');
    this.resetZoomButton = querySelector<HTMLButtonElement>('#resetZoom');
    this.loadingIndicator = querySelector('#loadingIndicator');
    this.errorMessage = querySelector('#errorMessage');
  }

  public init(): this {
    console.log('ViewerPro initialized');
    return this;
  }

  private bindEvents(): void {
    this.closeButton.addEventListener('click', () => this.close());
    this.prevButton.addEventListener('click', () => this.navigate(-1));
    this.nextButton.addEventListener('click', () => this.navigate(1));
    this.zoomInButton.addEventListener('click', () => this.webglViewer?.zoomIn(this.webglOptions.smooth));
    this.zoomOutButton.addEventListener('click', () => this.webglViewer?.zoomOut(this.webglOptions.smooth));
    this.resetZoomButton.addEventListener('click', () => this.webglViewer?.resetView());
    
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.previewContainer.addEventListener('click', (e) => {
      if (e.target === this.previewContainer) {
        this.close();
      }
    });
  }

  public addImages(images: ImageObj[]): this {
    this.images = [...images];
    return this;
  }

  public open(index: number): this {
    if (this.isDestroyed || index < 0 || index >= this.images.length) return this;
    
    this.currentIndex = index;
    this.previewContainer.style.display = 'flex';
    
    // 使用Promise确保DOM更新
    requestAnimationFrame(() => {
      this.updatePreview();
      requestAnimationFrame(() => {
        this.previewContainer.style.opacity = '1';
      });
    });
    
    document.body.style.overflow = 'hidden';
    return this;
  }

  public close(): this {
    if (this.isDestroyed) return this;
    
    this.previewContainer.style.opacity = '0';
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.previewContainer.style.display = 'none';
      }
    }, 300);
    
    document.body.style.overflow = '';
    
    if (this.webglViewer) {
      this.webglViewer.destroy();
      this.webglViewer = null;
    }
    return this;
  }

  public destroy(): this {
    if (this.isDestroyed) return this;
    
    this.isDestroyed = true;
    
    if (this.webglViewer) {
      this.webglViewer.destroy();
      this.webglViewer = null;
    }
    
    if (this.previewContainer?.parentNode) {
      this.previewContainer.parentNode.removeChild(this.previewContainer);
    }
    
    this.images = [];
    this.currentIndex = 0;
    
    // 恢复body样式
    document.body.style.overflow = '';
    
    return this;
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public getImagesCount(): number {
    return this.images.length;
  }

  public getCurrentImage(): ImageObj | null {
    return this.images[this.currentIndex] || null;
  }

  public isOpen(): boolean {
    return !this.isDestroyed && this.previewContainer.style.display !== 'none';
  }

  private async updatePreview(): Promise<void> {
    if (this.isDestroyed) return;

    const currentImage = this.images[this.currentIndex];
    if (!currentImage) {
      console.warn('No image found at index:', this.currentIndex);
      return;
    }

    // 清理之前的状态
    this.cleanupPreviousState();

    // 显示加载状态
    this.showLoading();
    this.previewTitle.textContent = currentImage.title || '图片预览';

    try {
      await this.setupCanvas();
      await this.loadImageIntoViewer(currentImage.src);
      this.hideLoading(); // 只有图片加载成功后才显示canvas
    } catch (error) {
      console.error('Failed to load image:', error);
      this.showError(error);
    }

    this.updateNavigationButtons();
  }

  private cleanupPreviousState(): void {
    if (this.webglViewer) {
      this.webglViewer.destroy();
      this.webglViewer = null;
    }
    this.errorMessage.style.display = 'none';
    this.previewCanvas.style.display = 'none'; // 确保每次切换都隐藏canvas
  }

  private async setupCanvas(): Promise<void> {
    const containerRect = this.previewContainer.getBoundingClientRect();
    const targetWidth = Math.min(containerRect.width * 0.8, window.innerWidth * 0.9);
    const targetHeight = Math.min(containerRect.height * 0.8, window.innerHeight * 0.9);
    
    // 设置Canvas样式
    Object.assign(this.previewCanvas.style, {
      width: `${targetWidth}px`,
      height: `${targetHeight}px`,
      maxWidth: 'none',
      maxHeight: 'none',
      display: 'block'
    });
    
    // 等待DOM更新
    await this.waitForDOMUpdate();
    
    // 验证Canvas尺寸
    const rect = this.previewCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      throw new Error(`Canvas size is invalid: ${rect.width}x${rect.height}`);
    }

    // 设置像素尺寸
    const devicePixelRatio = window.devicePixelRatio || 1;
    this.previewCanvas.width = rect.width * devicePixelRatio;
    this.previewCanvas.height = rect.height * devicePixelRatio;
  }

  private waitForDOMUpdate(): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });
    });
  }

  private async loadImageIntoViewer(src: string): Promise<void> {
    // 测试WebGL支持
    const testGl = this.previewCanvas.getContext('webgl') || 
                   this.previewCanvas.getContext('experimental-webgl');
    if (!testGl) {
      throw new Error('WebGL not supported in this browser');
    }

    this.webglViewer = new WebGLImageViewerEngine(this.previewCanvas, this.webglOptions);
    await this.webglViewer.loadImage(src);
  }

  private showLoading(): void {
    this.loadingIndicator.style.display = 'block';
    this.previewCanvas.style.display = 'none'; // 加载时隐藏canvas
  }

  private hideLoading(): void {
    this.loadingIndicator.style.display = 'none';
    // 只有图片加载成功后才显示canvas
    if (this.webglViewer) {
      this.previewCanvas.style.display = 'block';
    }
  }

  private showError(error: unknown): void {
    this.hideLoading();
    this.previewCanvas.style.display = 'none';
    this.errorMessage.style.display = 'block';
    
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    this.errorMessage.textContent = `图片加载失败: ${errorMsg}`;
  }

  private navigate(direction: number): void {
    const newIndex = this.currentIndex + direction;
    if (newIndex >= 0 && newIndex < this.images.length) {
      this.currentIndex = newIndex;
      this.updatePreview();
    }
  }

  private updateNavigationButtons(): void {
    const hasMultipleImages = this.images.length > 1;
    
    this.prevButton.style.display = hasMultipleImages ? 'flex' : 'none';
    this.nextButton.style.display = hasMultipleImages ? 'flex' : 'none';
    
    if (hasMultipleImages) {
      const isFirst = this.currentIndex === 0;
      const isLast = this.currentIndex === this.images.length - 1;
      
      this.updateButtonState(this.prevButton, !isFirst);
      this.updateButtonState(this.nextButton, !isLast);
    }
  }

  private updateButtonState(button: HTMLElement, enabled: boolean): void {
    button.style.opacity = enabled ? '1' : '0.3';
    button.style.pointerEvents = enabled ? 'auto' : 'none';
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isOpen()) return;
    
    const preventKeys = ['Escape', 'ArrowLeft', 'ArrowRight', '+', '=', '-', '0'];
    if (preventKeys.includes(e.key)) {
      e.preventDefault();
    }
    
    const keyActions: Record<string, () => void> = {
      'Escape': () => this.close(),
      'ArrowLeft': () => this.navigate(-1),
      'ArrowRight': () => this.navigate(1),
      '+': () => this.webglViewer?.zoomIn(this.webglOptions.smooth),
      '=': () => this.webglViewer?.zoomIn(this.webglOptions.smooth),
      '-': () => this.webglViewer?.zoomOut(this.webglOptions.smooth),
      '0': () => this.webglViewer?.resetView(),
    };
    
    const action = keyActions[e.key];
    if (action) {
      action();
    }
  }
}

// 导出到 window
(window as any).ViewerPro = ViewerPro;