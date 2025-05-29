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
  private isAnimating = false;
  private animationStartTime = 0;
  private animationDuration = 300;
  private startScale = 1;
  private targetScale = 1;
  private startTranslateX = 0;
  private startTranslateY = 0;
  private targetTranslateX = 0;
  private targetTranslateY = 0;

  // Configuration
  private config: Required<NonNullable<ViewerProOptions['webglOptions']>>;

  // Bound event handlers
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseUp: () => void;
  private boundHandleWheel: (e: WheelEvent) => void;
  private boundHandleDoubleClick: (e: MouseEvent) => void;
  private boundHandleTouchStart: (e: TouchEvent) => void;
  private boundHandleTouchMove: (e: TouchEvent) => void;
  private boundHandleTouchEnd: (e: TouchEvent) => void;
  private boundResizeCanvas: () => void;

  // Shaders
  private vertexShaderSource = `
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

  private fragmentShaderSource = `
    precision mediump float;
    uniform sampler2D u_image;
    varying vec2 v_texCoord;
    
    void main() {
      gl_FragColor = texture2D(u_image, v_texCoord);
    }
  `;

  constructor(canvas: HTMLCanvasElement, config: NonNullable<ViewerProOptions['webglOptions']> = {}) {
    this.canvas = canvas;
    this.config = {
      initialScale: 1,
      minScale: 0.1,
      maxScale: 10,
      smooth: true,
      limitToBounds: true,
      ...config,
    };

    const gl = canvas.getContext('webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    this.gl = gl;

    // Bind event handlers
    this.boundHandleMouseDown = (e: MouseEvent) => this.handleMouseDown(e);
    this.boundHandleMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
    this.boundHandleMouseUp = () => this.handleMouseUp();
    this.boundHandleWheel = (e: WheelEvent) => this.handleWheel(e);
    this.boundHandleDoubleClick = (e: MouseEvent) => this.handleDoubleClick(e);
    this.boundHandleTouchStart = (e: TouchEvent) => this.handleTouchStart(e);
    this.boundHandleTouchMove = (e: TouchEvent) => this.handleTouchMove(e);
    this.boundHandleTouchEnd = (e: TouchEvent) => this.handleTouchEnd(e);
    this.boundResizeCanvas = () => this.resizeCanvas();

    this.setupCanvas();
    this.initWebGL();
    this.setupEventListeners();
  }

  private setupCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', this.boundResizeCanvas);
  }

  private resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    
    // 如果 getBoundingClientRect 返回的尺寸为 0，使用父容器或默认尺寸
    let width = rect.width;
    let height = rect.height;
    
    if (width === 0 || height === 0) {
      // 尝试从父容器获取尺寸
      const parent = this.canvas.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        width = parentRect.width || 800; // 默认宽度
        height = parentRect.height || 600; // 默认高度
      } else {
        width = 800;
        height = 600;
      }
      
      // 强制设置 Canvas 的 CSS 尺寸
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
    }
    
    this.canvasWidth = width;
    this.canvasHeight = height;
    
    // 设置 Canvas 的实际像素尺寸
    const devicePixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = width * devicePixelRatio;
    this.canvas.height = height * devicePixelRatio;
    
    // 设置 WebGL 视口
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    console.log('Canvas resized to:', { width, height, devicePixelRatio });

    if (this.imageLoaded) {
      this.fitImageToScreen();
      this.render();
    }
  }

  private initWebGL() {
    const { gl } = this;
    const vertexShader = this.createShader(gl.VERTEX_SHADER, this.vertexShaderSource);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource);

    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error(`WebGL program link error: ${gl.getProgramInfoLog(this.program)}`);
    }

    gl.useProgram(this.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Create geometry
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]);

    // Position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Texture coordinate buffer
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    const texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
  }

  private createShader(type: number, source: string): WebGLShader {
    const { gl } = this;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Shader compile error: ${gl.getShaderInfoLog(shader)}`);
    }
    return shader;
  }

  async loadImage(url: string): Promise<void> {
    const image = new Image();
    image.crossOrigin = 'anonymous';

    return new Promise<void>((resolve, reject) => {
      image.onload = () => {
        this.imageWidth = image.width;
        this.imageHeight = image.height;
        this.createTexture(image);
        this.imageLoaded = true;
        this.fitImageToScreen();
        this.render();
        resolve();
      };
      image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      image.src = url;
    });
  }

  private createTexture(image: HTMLImageElement) {
    const { gl } = this;
    if (this.texture) {
      gl.deleteTexture(this.texture);
    }

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }

  private createMatrix(): Float32Array {
    // 修正矩阵计算，考虑设备像素比
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

  private fitImageToScreen() {
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

  private startAnimation(targetScale: number, targetTranslateX: number, targetTranslateY: number) {
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

  private animate() {
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
      requestAnimationFrame(() => this.animate());
    } else {
      this.isAnimating = false;
    }
  }

  private getFitToScreenScale(): number {
    const scaleX = this.canvasWidth / this.imageWidth;
    const scaleY = this.canvasHeight / this.imageHeight;
    return Math.min(scaleX, scaleY);
  }




  private constrainImagePosition() {
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

  private render() {
    const { gl } = this;
    
    // 清除画布
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (!this.texture || !this.imageLoaded) {
      console.log('No texture or image not loaded');
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
    
    console.log('Rendered frame with scale:', this.scale, 'translate:', this.translateX, this.translateY);
  }

  private setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.boundHandleMouseDown);
    this.canvas.addEventListener('wheel', this.boundHandleWheel);
    this.canvas.addEventListener('dblclick', this.boundHandleDoubleClick);
    this.canvas.addEventListener('touchstart', this.boundHandleTouchStart);
  }

  private removeEventListeners() {
    this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown);
    this.canvas.removeEventListener('wheel', this.boundHandleWheel);
    this.canvas.removeEventListener('dblclick', this.boundHandleDoubleClick);
    this.canvas.removeEventListener('touchstart', this.boundHandleTouchStart);
    window.removeEventListener('resize', this.boundResizeCanvas);
  }

  private handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    document.addEventListener('mousemove', this.boundHandleMouseMove);
    document.addEventListener('mouseup', this.boundHandleMouseUp);
    this.canvas.style.cursor = 'grabbing';
  }

  private handleMouseMove(e: MouseEvent) {
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

  private handleMouseUp() {
    this.isDragging = false;
    this.canvas.style.cursor = 'grab';
    document.removeEventListener('mousemove', this.boundHandleMouseMove);
    document.removeEventListener('mouseup', this.boundHandleMouseUp);
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;
    this.zoomAt(x, y, scaleFactor);
  }

  private handleDoubleClick(e: MouseEvent) {
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

  private handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
      document.addEventListener('touchmove', this.boundHandleTouchMove);
      document.addEventListener('touchend', this.boundHandleTouchEnd);
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.lastTouchDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
    }
  }

  private handleTouchMove(e: TouchEvent) {
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

  private handleTouchEnd(e: TouchEvent) {
    this.isDragging = false;
    this.lastTouchDistance = 0;
    document.removeEventListener('touchmove', this.boundHandleTouchMove);
    document.removeEventListener('touchend', this.boundHandleTouchEnd);
  }

  private zoomAt(x: number, y: number, scaleFactor: number, animated = false) {
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

  public zoomIn(animated = false) {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    this.zoomAt(centerX, centerY, 1.2, animated);
  }

  public zoomOut(animated = false) {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    this.zoomAt(centerX, centerY, 0.8, animated);
  }

  public resetView() {
    this.fitImageToScreen();
    if (this.config.smooth) {
      this.startAnimation(this.scale, this.translateX, this.translateY);
    } else {
      this.render();
    }
  }

  public destroy() {
    this.removeEventListeners();
    const { gl } = this;
    if (this.texture) {
      gl.deleteTexture(this.texture);
    }
    if (this.program) {
      gl.deleteProgram(this.program);
    }
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

  constructor(options: ViewerProOptions = {}) {
    this.webglOptions = {
      initialScale: 1,
      minScale: 0.1,
      maxScale: 10,
      smooth: true,
      limitToBounds: true,
      ...options.webglOptions,
    };

    // 创建主容器
    this.previewContainer = document.createElement('div');
    this.previewContainer.className = 'image-preview-container';
    this.previewContainer.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 5000;
      display: none; background: rgba(0,0,0,0.9); opacity: 0;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(this.previewContainer);

    // 创建内部结构
    this.previewContainer.innerHTML = `
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
          <canvas id="previewCanvas" style="max-width: 100%; max-height: 100%; cursor: grab;"></canvas>
          
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

    // 获取元素引用
    this.previewCanvas = this.previewContainer.querySelector('#previewCanvas') as HTMLCanvasElement;
    this.previewTitle = this.previewContainer.querySelector('#previewTitle')!;
    this.closeButton = this.previewContainer.querySelector('#closePreview')!;
    this.prevButton = this.previewContainer.querySelector('#prevImage') as HTMLDivElement;
    this.nextButton = this.previewContainer.querySelector('#nextImage') as HTMLDivElement;
    this.zoomInButton = this.previewContainer.querySelector('#zoomIn') as HTMLButtonElement;
    this.zoomOutButton = this.previewContainer.querySelector('#zoomOut') as HTMLButtonElement;
    this.resetZoomButton = this.previewContainer.querySelector('#resetZoom') as HTMLButtonElement;
    this.loadingIndicator = this.previewContainer.querySelector('#loadingIndicator')!;
    this.errorMessage = this.previewContainer.querySelector('#errorMessage')!;

    this.images = Array.isArray(options.images) ? options.images : [];

    this.bindEvents();
  }

  // 添加 init 方法以保持兼容性（虽然不需要做任何事情）
  public init() {
    // 简化版本在构造函数中已完成所有初始化
    // 此方法仅为保持 API 兼容性
    console.log('ViewerPro initialized');
    return this;
  }

  private bindEvents() {
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

  public addImages(images: ImageObj[]) {
    this.images = images;
    return this;
  }

  public open(index: number) {
    if (index < 0 || index >= this.images.length) return;
    this.currentIndex = index;
    this.updatePreview();
    this.previewContainer.style.display = 'flex';
    setTimeout(() => {
      this.previewContainer.style.opacity = '1';
    }, 10);
    document.body.style.overflow = 'hidden';
    return this;
  }

  public close() {
    this.previewContainer.style.opacity = '0';
    setTimeout(() => {
      this.previewContainer.style.display = 'none';
    }, 300);
    document.body.style.overflow = '';
    if (this.webglViewer) {
      this.webglViewer.destroy();
      this.webglViewer = null;
    }
    return this;
  }

  // 添加销毁方法
  public destroy() {
    if (this.webglViewer) {
      this.webglViewer.destroy();
      this.webglViewer = null;
    }
    
    // 移除 DOM 元素
    if (this.previewContainer && this.previewContainer.parentNode) {
      this.previewContainer.parentNode.removeChild(this.previewContainer);
    }
    
    // 清理数据
    this.images = [];
    this.currentIndex = 0;
    
    return this;
  }

  // 添加获取当前状态的方法
  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public getImagesCount(): number {
    return this.images.length;
  }

  public getCurrentImage(): ImageObj | null {
    return this.images[this.currentIndex] || null;
  }

  // 添加是否打开的状态检查
  public isOpen(): boolean {
    return this.previewContainer.style.display !== 'none';
  }

  // ...existing methods...

  private async updatePreview() {
    const currentImage = this.images[this.currentIndex];
    if (!currentImage) {
      console.warn('No image found at index:', this.currentIndex);
      return;
    }

    this.showLoading();
    this.errorMessage.style.display = 'none';
    this.previewCanvas.style.display = 'none';
    this.previewTitle.textContent = currentImage.title || '图片预览';

    try {
      if (this.webglViewer) {
        this.webglViewer.destroy();
      }
      
      // 先设置 Canvas 的基本尺寸
      this.previewCanvas.style.width = '80%';
      this.previewCanvas.style.height = '80%';
      this.previewCanvas.style.maxWidth = '90vw';
      this.previewCanvas.style.maxHeight = '90vh';
      
      // 显示 Canvas 以确保可以获取正确的尺寸
      this.previewCanvas.style.display = 'block';
      
      // 等待多帧让 CSS 生效和布局完成
      await new Promise(resolve => requestAnimationFrame(() => 
        requestAnimationFrame(resolve)
      ));
      
      // 再次检查并设置正确的尺寸
      const rect = this.previewCanvas.getBoundingClientRect();
      console.log('Canvas rect after CSS:', rect);
      
      if (rect.width === 0 || rect.height === 0) {
        // 如果仍然为 0，手动计算尺寸
        const container = this.previewContainer;
        const containerRect = container.getBoundingClientRect();
        const targetWidth = Math.min(containerRect.width * 0.8, window.innerWidth * 0.9);
        const targetHeight = Math.min(containerRect.height * 0.8, window.innerHeight * 0.9);
        
        this.previewCanvas.style.width = targetWidth + 'px';
        this.previewCanvas.style.height = targetHeight + 'px';
        
        console.log('Manually set canvas size:', { targetWidth, targetHeight });
        
        // 再等一帧
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      
      this.webglViewer = new WebGLImageViewerEngine(this.previewCanvas, this.webglOptions);
      await this.webglViewer.loadImage(currentImage.src);
      
      this.hideLoading();
      
      console.log('Image loaded successfully:', currentImage.src);
      
    } catch (error) {
      console.error('Failed to load image:', error);
      this.hideLoading();
      this.errorMessage.style.display = 'block';
      this.errorMessage.textContent = `图片加载失败: ${error instanceof Error ? error.message : '未知错误'}`;
    }

    this.updateNavigationButtons();
  }

  private showLoading() {
    this.loadingIndicator.style.display = 'block';
  }

  private hideLoading() {
    this.loadingIndicator.style.display = 'none';
  }

  private navigate(direction: number) {
    const newIndex = this.currentIndex + direction;
    if (newIndex >= 0 && newIndex < this.images.length) {
      this.currentIndex = newIndex;
      this.updatePreview();
    }
  }

  private updateNavigationButtons() {
    // 只有一张图片时隐藏导航按钮
    if (this.images.length <= 1) {
      this.prevButton.style.display = 'none';
      this.nextButton.style.display = 'none';
      return;
    }

    this.prevButton.style.display = 'flex';
    this.nextButton.style.display = 'flex';
    
    this.prevButton.style.opacity = this.currentIndex === 0 ? '0.3' : '1';
    this.nextButton.style.opacity = this.currentIndex === this.images.length - 1 ? '0.3' : '1';
    this.prevButton.style.pointerEvents = this.currentIndex === 0 ? 'none' : 'auto';
    this.nextButton.style.pointerEvents = this.currentIndex === this.images.length - 1 ? 'none' : 'auto';
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (this.previewContainer.style.display === 'none') return;
    
    // 阻止默认行为
    const preventKeys = ['Escape', 'ArrowLeft', 'ArrowRight', '+', '=', '-', '0'];
    if (preventKeys.includes(e.key)) {
      e.preventDefault();
    }
    
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
        this.webglViewer?.zoomIn(this.webglOptions.smooth);
        break;
      case '-':
        this.webglViewer?.zoomOut(this.webglOptions.smooth);
        break;
      case '0':
        this.webglViewer?.resetView();
        break;
    }
  }
}

// 导出到 window
(window as any).ViewerPro = ViewerPro;