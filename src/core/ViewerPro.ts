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

// WebGL 相关常量
const WEBGL_CONSTANTS = {
  CONTEXT_LOST_EVENT: 'webglcontextlost',
  CONTEXT_RESTORED_EVENT: 'webglcontextrestored',
  MAX_TEXTURE_SIZE: 4096,
  DEVICE_PIXEL_RATIO_THRESHOLD: 3,
} as const;

// 性能优化常量
const PERFORMANCE_CONFIG = {
  DEBOUNCE_RESIZE_MS: 16,
  CANVAS_SIZE_CACHE_TTL: 1000,
  MAX_RENDER_FPS: 60,
} as const;

// WebGL Image Viewer 引擎
class WebGLImageViewerEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program!: WebGLProgram;
  private texture: WebGLTexture | null = null;
  private imageLoaded = false;
  private isContextLost = false;

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
  
  // 性能优化
  private lastRenderTime = 0;
  private resizeTimeoutId: number | null = null;
  
  // WebGL 资源缓存
  private vertexBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private uniformLocations: {
    matrix: WebGLUniformLocation | null;
    image: WebGLUniformLocation | null;
  } = { matrix: null, image: null };

  // Bound event handlers (使用箭头函数避免bind调用)
  private handleMouseDown = (e: MouseEvent) => this._handleMouseDown(e);
  private handleMouseMove = (e: MouseEvent) => this._handleMouseMove(e);
  private handleMouseUp = () => this._handleMouseUp();
  private handleWheel = (e: WheelEvent) => this._handleWheel(e);
  private handleDoubleClick = (e: MouseEvent) => this._handleDoubleClick(e);
  private handleTouchStart = (e: TouchEvent) => this._handleTouchStart(e);
  private handleTouchMove = (e: TouchEvent) => this._handleTouchMove(e);
  private handleTouchEnd = (e: TouchEvent) => this._handleTouchEnd(e);
  private handleResize = () => this.debouncedResizeCanvas();
  private handleContextLost = (e: Event) => this._handleContextLost(e);
  private handleContextRestored = () => this._handleContextRestored();

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
    const gl = this.canvas.getContext('webgl', { 
      alpha: true, 
      antialias: true, 
      powerPreference: 'high-performance' 
    }) || this.canvas.getContext('experimental-webgl', { 
      alpha: true, 
      antialias: true 
    });
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
    
    // WebGL 上下文丢失处理
    this.canvas.addEventListener(WEBGL_CONSTANTS.CONTEXT_LOST_EVENT, this.handleContextLost);
    this.canvas.addEventListener(WEBGL_CONSTANTS.CONTEXT_RESTORED_EVENT, this.handleContextRestored);
  }

  // 防抖调整画布大小
  private debouncedResizeCanvas(): void {
    if (this.resizeTimeoutId) {
      clearTimeout(this.resizeTimeoutId);
    }
    this.resizeTimeoutId = window.setTimeout(() => {
      this.resizeCanvas();
      this.resizeTimeoutId = null;
    }, PERFORMANCE_CONFIG.DEBOUNCE_RESIZE_MS);
  }

  // WebGL 上下文丢失处理
  private _handleContextLost(e: Event): void {
    e.preventDefault();
    this.isContextLost = true;
    this.stopAnimation();
    console.warn('WebGL context lost');
  }

  private _handleContextRestored(): void {
    this.isContextLost = false;
    console.log('WebGL context restored');
    try {
      this.initWebGL();
      if (this.imageLoaded) {
        this.forceRender();
      }
    } catch (error) {
      console.error('Failed to restore WebGL context:', error);
    }
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
      this.forceRender();
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

    this.vertexBuffer = this.createBuffer(positions, 'a_position', 2);
    this.texCoordBuffer = this.createBuffer(texCoords, 'a_texCoord', 2);
  }

  private createBuffer(data: Float32Array, attributeName: string, size: number): WebGLBuffer {
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
    
    return buffer;
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

  async loadImage(url: string, progressCallback?: (loaded: number, total: number) => void): Promise<void> {
    const image = await this.loadImageElement(url, progressCallback);
    this.imageWidth = image.width;
    this.imageHeight = image.height;
    this.createTexture(image);
    this.imageLoaded = true;
    this.fitImageToScreen();
    // 强制渲染，不受帧率限制
    this.forceRender();
  }

  private forceRender(): void {
    // 强制渲染，忽略帧率限制
    console.log('Force rendering, imageLoaded:', this.imageLoaded, 'texture:', !!this.texture);
    this.lastRenderTime = 0;
    this.render();
  }

  private loadImageElement(url: string, progressCallback?: (loaded: number, total: number) => void): Promise<HTMLImageElement> {
    return new Promise(async (resolve, reject) => {
      // 首先尝试使用 fetch 获取进度信息
      try {
        const response = await fetch(url, {
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentLength = response.headers.get('Content-Length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        let loaded = 0;

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Cannot read response body');
        }

        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          chunks.push(value);
          loaded += value.length;
          
          // 更新进度
          if (total > 0 && progressCallback) {
            progressCallback(loaded, total);
          }
        }

        // 合并所有 chunks
        const allChunks = new Uint8Array(loaded);
        let offset = 0;
        for (const chunk of chunks) {
          allChunks.set(chunk, offset);
          offset += chunk.length;
        }

        // 创建 blob 和 object URL
        const blob = new Blob([allChunks]);
        const objectURL = URL.createObjectURL(blob);

        const image = new Image();
        
        const cleanup = () => {
          image.onload = null;
          image.onerror = null;
          URL.revokeObjectURL(objectURL);
        };

        image.onload = () => {
          cleanup();
          console.log('Image loaded via fetch:', url);
          resolve(image);
        };
        
        image.onerror = () => {
          cleanup();
          console.warn('Failed to load image via fetch, trying direct load:', url);
          // 如果 blob 方式失败，尝试直接加载
          this.loadImageDirectly(url, progressCallback).then(resolve).catch(reject);
        };
        
        image.src = objectURL;

      } catch (error) {
        console.warn('Fetch failed, trying direct image load:', error);
        // 如果 fetch 失败，尝试直接加载图片
        this.loadImageDirectly(url, progressCallback).then(resolve).catch(reject);
      }
    });
  }

  private loadImageDirectly(url: string, progressCallback?: (loaded: number, total: number) => void): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      
      // 尝试不同的 crossOrigin 设置
      const tryLoad = (crossOriginSetting: string | null) => {
        return new Promise<HTMLImageElement>((resolveLoad, rejectLoad) => {
          if (crossOriginSetting) {
            image.crossOrigin = crossOriginSetting;
          }
          
          const cleanup = () => {
            image.onload = null;
            image.onerror = null;
          };

          image.onload = () => {
            cleanup();
            console.log(`Image loaded directly with crossOrigin=${crossOriginSetting}:`, url);
            
            // 模拟进度完成
            if (progressCallback) {
              progressCallback(100, 100);
            }
            
            resolveLoad(image);
          };
          
          image.onerror = () => {
            cleanup();
            rejectLoad(new Error(`Failed to load image with crossOrigin=${crossOriginSetting}`));
          };
          
          image.src = url;
        });
      };

      // 按顺序尝试不同的 crossOrigin 设置
      tryLoad('anonymous')
        .catch(() => tryLoad('use-credentials'))
        .catch(() => tryLoad(null))
        .then(resolve)
        .catch(() => reject(new Error(`Failed to load image: ${url}`)));
    });
  }

  private createTexture(image: HTMLImageElement): void {
    const { gl } = this;
    
    // 验证图片尺寸
    if (image.width > WEBGL_CONSTANTS.MAX_TEXTURE_SIZE || image.height > WEBGL_CONSTANTS.MAX_TEXTURE_SIZE) {
      console.warn(`Image size ${image.width}x${image.height} exceeds maximum texture size ${WEBGL_CONSTANTS.MAX_TEXTURE_SIZE}`);
    }
    
    // 清理旧纹理
    if (this.texture) {
      gl.deleteTexture(this.texture);
    }

    this.texture = gl.createTexture();
    if (!this.texture) {
      throw new Error('Failed to create texture');
    }

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    
    // 优化纹理参数设置
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // 根据图片大小选择过滤方式
    const useLinearFiltering = image.width * image.height <= 1024 * 1024; // 1MP threshold
    const filter = useLinearFiltering ? gl.LINEAR : gl.LINEAR_MIPMAP_LINEAR;
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    // 为大图片生成 mipmaps
    if (!useLinearFiltering && this.isPowerOf2(image.width) && this.isPowerOf2(image.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
  }

  private isPowerOf2(value: number): boolean {
    return (value & (value - 1)) === 0;
  }

  private createMatrix(): Float32Array {
    // 缓存设备像素比，避免重复计算
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, WEBGL_CONSTANTS.DEVICE_PIXEL_RATIO_THRESHOLD);
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
    if (this.imageWidth === 0 || this.imageHeight === 0 || this.canvasWidth === 0 || this.canvasHeight === 0) {
      return;
    }
    
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
    // 帧率控制
    const now = performance.now();
    const minFrameInterval = 1000 / PERFORMANCE_CONFIG.MAX_RENDER_FPS;
    if (now - this.lastRenderTime < minFrameInterval) {
      return;
    }
    this.lastRenderTime = now;

    if (this.isContextLost) {
      return;
    }

    const { gl } = this;
    
    // 清除画布
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (!this.texture || !this.imageLoaded) {
      return;
    }

    gl.useProgram(this.program);
    
    // 使用缓存的 uniform 位置
    if (!this.uniformLocations.matrix) {
      this.uniformLocations.matrix = gl.getUniformLocation(this.program, 'u_matrix');
    }
    if (!this.uniformLocations.image) {
      this.uniformLocations.image = gl.getUniformLocation(this.program, 'u_image');
    }
    
    // 设置矩阵
    const matrix = this.createMatrix();
    gl.uniformMatrix3fv(this.uniformLocations.matrix, false, matrix);
    
    // 设置纹理
    gl.uniform1i(this.uniformLocations.image, 0);
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
    this.canvas.removeEventListener(WEBGL_CONSTANTS.CONTEXT_LOST_EVENT, this.handleContextLost);
    this.canvas.removeEventListener(WEBGL_CONSTANTS.CONTEXT_RESTORED_EVENT, this.handleContextRestored);
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
    // 确保拖拽结束后进行一次完整渲染
    this.forceRender();
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
    // 确保触摸结束后进行一次完整渲染
    this.forceRender();
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
      this.forceRender();
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
      this.forceRender();
    }
  }

  public destroy(): void {
    this.stopAnimation();
    this.removeEventListeners();
    
    const { gl } = this;
    
    // 清理 WebGL 资源
    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }
    
    if (this.vertexBuffer) {
      gl.deleteBuffer(this.vertexBuffer);
      this.vertexBuffer = null;
    }
    
    if (this.texCoordBuffer) {
      gl.deleteBuffer(this.texCoordBuffer);
      this.texCoordBuffer = null;
    }
    
    if (this.program) {
      gl.deleteProgram(this.program);
    }
    
    // 清理定时器
    if (this.resizeTimeoutId) {
      clearTimeout(this.resizeTimeoutId);
      this.resizeTimeoutId = null;
    }
    
    // 重置状态
    this.imageLoaded = false;
    this.isContextLost = false;
    this.uniformLocations = { matrix: null, image: null };
  }
}

export class ViewerPro {
  private previewContainer!: HTMLElement;
  private previewCanvas!: HTMLCanvasElement;
  private webglViewer: WebGLImageViewerEngine | null = null;
  private previewTitle!: HTMLElement;
  private closeButton!: HTMLElement;
  private prevButton!: HTMLDivElement;
  private nextButton!: HTMLDivElement;
  private zoomInButton!: HTMLButtonElement;
  private zoomOutButton!: HTMLButtonElement;
  private resetZoomButton!: HTMLButtonElement;
  private loadingIndicator!: HTMLElement;
  private errorMessage!: HTMLElement;
  private progressCircle!: SVGCircleElement;
  private progressPercent!: HTMLElement;
  private progressText!: HTMLElement;
  private progressSize!: HTMLElement;

  private images: ImageObj[] = [];
  private currentIndex = 0;
  private webglOptions: Required<NonNullable<ViewerProOptions['webglOptions']>>;
  private isDestroyed = false;
  
  // 性能优化相关属性
  private resizeTimeoutId: number | null = null;
  private lastRenderTime = 0;
  private canvasSizeCache: { width: number; height: number; timestamp: number } | null = null;

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
          <div id="errorMessage" style="display: none; color: white; background: rgba(255,0,0,0.2); padding: 1rem; border-radius: 0.5rem;">图片加载失败</div>
          <canvas id="previewCanvas" style="cursor: grab; display: none;"></canvas>
          
          <div id="prevImage" style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); color: white; font-size: 2rem; cursor: pointer; width: 50px; height: 50px; border-radius: 50%; display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.5);">
            ${prevIcon}
          </div>
          <div id="nextImage" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); color: white; font-size: 2rem; cursor: pointer; width: 50px; height: 50px; border-radius: 50%; display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.5);">
            ${nextIcon}
          </div>
        </div>
        
        <!-- 加载进度指示器 - 右下角 -->
        <div id="loadingIndicator" class="loading-progress-indicator">
          <div class="progress-content">
            <div class="progress-circle-container">
              <svg class="progress-circle-svg" width="32" height="32">
                <circle class="progress-circle-bg" cx="16" cy="16" r="14"/>
                <circle id="progressCircle" class="progress-circle-bar" cx="16" cy="16" r="14" 
                        stroke-dasharray="87.96" stroke-dashoffset="87.96"/>
              </svg>
              <div id="progressPercent" class="progress-percent">0%</div>
            </div>
            <div class="progress-info">
              <div id="progressText" class="progress-text">加载中</div>
              <div id="progressSize" class="progress-size">0 MB</div>
            </div>
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
    this.progressCircle = querySelector<SVGCircleElement>('#progressCircle');
    this.progressPercent = querySelector('#progressPercent');
    this.progressText = querySelector('#progressText');
    this.progressSize = querySelector('#progressSize');
  }

  public init(): this {
    console.log('ViewerPro initialized');
    return this;
  }

  private bindEvents(): void {
    // 使用防抖的事件处理器
    const debouncedKeyHandler = this.debounce((e: KeyboardEvent) => this.handleKeyDown(e), 50);
    
    this.closeButton.addEventListener('click', () => this.close());
    this.prevButton.addEventListener('click', () => this.navigate(-1));
    this.nextButton.addEventListener('click', () => this.navigate(1));
    this.zoomInButton.addEventListener('click', () => this.webglViewer?.zoomIn(this.webglOptions.smooth));
    this.zoomOutButton.addEventListener('click', () => this.webglViewer?.zoomOut(this.webglOptions.smooth));
    this.resetZoomButton.addEventListener('click', () => this.webglViewer?.resetView());
    
    document.addEventListener('keydown', debouncedKeyHandler);
    this.previewContainer.addEventListener('click', (e) => {
      if (e.target === this.previewContainer) {
        this.close();
      }
    });
  }

  private debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
    let timeout: number | null = null;
    return ((...args: any[]) => {
      if (timeout) clearTimeout(timeout);
      timeout = window.setTimeout(() => func(...args), wait);
    }) as T;
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
    
    // 清理 WebGL 查看器
    if (this.webglViewer) {
      this.webglViewer.destroy();
      this.webglViewer = null;
    }
    
    // 清理缓存
    this.canvasSizeCache = null;
    
    // 清理定时器
    if (this.resizeTimeoutId) {
      clearTimeout(this.resizeTimeoutId);
      this.resizeTimeoutId = null;
    }
    
    // 清理 DOM 事件监听器
    this.removeAllEventListeners();
    
    // 从 DOM 中移除容器
    if (this.previewContainer?.parentNode) {
      this.previewContainer.parentNode.removeChild(this.previewContainer);
    }
    
    // 重置数据
    this.images = [];
    this.currentIndex = 0;
    
    // 恢复 body 样式
    document.body.style.overflow = '';
    
    return this;
  }

  private removeAllEventListeners(): void {
    // 移除事件监听器的逻辑
    // 由于事件是在 bindEvents 中绑定的，这里应该相应地移除
    // 但由于我们销毁了整个容器，大部分事件监听器会自动清理
    
    // 只需要清理 document 级别的事件监听器
    const debouncedKeyHandler = this.debounce((e: KeyboardEvent) => this.handleKeyDown(e), 50);
    document.removeEventListener('keydown', debouncedKeyHandler);
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
      // 图片加载成功后，确保 canvas 可见并隐藏加载指示器
      this.hideLoading();
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
    // 隐藏 canvas 内容但保持其 display 状态
    this.previewCanvas.style.visibility = 'hidden';
  }

  private async setupCanvas(): Promise<void> {
    // 使用缓存的 canvas 尺寸以提升性能
    const now = Date.now();
    if (this.canvasSizeCache && (now - this.canvasSizeCache.timestamp) < PERFORMANCE_CONFIG.CANVAS_SIZE_CACHE_TTL) {
      const { width, height } = this.canvasSizeCache;
      this.applyCanvasSize(width, height);
      return;
    }

    const containerRect = this.previewContainer.getBoundingClientRect();
    const targetWidth = Math.min(containerRect.width * 0.8, window.innerWidth * 0.9);
    const targetHeight = Math.min(containerRect.height * 0.8, window.innerHeight * 0.9);
    
    // 缓存计算结果
    this.canvasSizeCache = {
      width: targetWidth,
      height: targetHeight,
      timestamp: now
    };
    
    this.applyCanvasSize(targetWidth, targetHeight);
    
    // 等待DOM更新
    await this.waitForDOMUpdate();
    
    // 验证Canvas尺寸
    const rect = this.previewCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      throw new Error(`Canvas size is invalid: ${rect.width}x${rect.height}`);
    }

    // 设置像素尺寸，限制设备像素比以避免过大的纹理
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, WEBGL_CONSTANTS.DEVICE_PIXEL_RATIO_THRESHOLD);
    this.previewCanvas.width = rect.width * devicePixelRatio;
    this.previewCanvas.height = rect.height * devicePixelRatio;
  }

  private applyCanvasSize(width: number, height: number): void {
    Object.assign(this.previewCanvas.style, {
      width: `${width}px`,
      height: `${height}px`,
      maxWidth: 'none',
      maxHeight: 'none',
      display: 'block', // 确保 canvas 可见
      visibility: 'hidden' // 先隐藏内容，等加载完成后显示
    });
  }

  private waitForDOMUpdate(): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
    });
  }

  private async loadImageIntoViewer(src: string): Promise<void> {
    console.log('Loading image into viewer:', src);
    
    // 预检查 WebGL 支持
    if (!this.isWebGLSupported()) {
      throw new Error('WebGL not supported in this browser');
    }

    try {
      this.webglViewer = new WebGLImageViewerEngine(this.previewCanvas, this.webglOptions);
      await this.webglViewer.loadImage(src, (loaded, total) => {
        this.updateProgress(loaded, total);
      });
      console.log('Image loaded successfully into WebGL viewer');
    } catch (error) {
      console.error('Failed to load image into WebGL viewer:', error);
      // 清理失败的 WebGL viewer
      if (this.webglViewer) {
        this.webglViewer.destroy();
        this.webglViewer = null;
      }
      throw error;
    }
  }

  private isWebGLSupported(): boolean {
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  private showLoading(): void {
    console.log('Showing loading indicator');
    this.loadingIndicator.style.display = 'block';
    // 强制重绘后添加显示类
    requestAnimationFrame(() => {
      this.loadingIndicator.classList.add('show', 'pulse');
    });
    // 重置进度
    this.updateProgress(0, 100);
    // 加载时隐藏 canvas 内容
    this.previewCanvas.style.visibility = 'hidden';
  }

  private updateProgress(loaded: number, total: number): void {
    const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
    const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
    const totalMB = (total / (1024 * 1024)).toFixed(1);
    
    // 更新百分比文本
    this.progressPercent.textContent = `${percent}%`;
    
    // 更新进度圆环 (circumference = 2 * π * r = 2 * π * 14 ≈ 87.96)
    const circumference = 87.96;
    const offset = circumference - (percent / 100) * circumference;
    this.progressCircle.style.strokeDashoffset = offset.toString();
    
    // 根据进度改变颜色
    if (percent < 30) {
      this.progressCircle.style.stroke = '#FF9800'; // 橙色
      this.progressPercent.style.color = '#FF9800';
    } else if (percent < 70) {
      this.progressCircle.style.stroke = '#2196F3'; // 蓝色
      this.progressPercent.style.color = '#2196F3';
    } else {
      this.progressCircle.style.stroke = '#4CAF50'; // 绿色
      this.progressPercent.style.color = '#4CAF50';
    }
    
    // 更新文本信息
    if (percent < 100) {
      this.progressText.textContent = '加载中';
      this.progressSize.textContent = total > 0 ? `${loadedMB} / ${totalMB} MB` : `${loadedMB} MB`;
    } else {
      this.progressText.textContent = '处理中';
      this.progressSize.textContent = `${totalMB} MB`;
      // 完成时添加特殊样式
      this.loadingIndicator.classList.remove('pulse');
      this.progressCircle.style.stroke = '#4CAF50';
      this.progressPercent.style.color = '#4CAF50';
    }
  }

  private hideLoading(): void {
    console.log('Hiding loading, webglViewer exists:', !!this.webglViewer);
    
    // 停止脉动动画
    this.loadingIndicator.classList.remove('pulse');
    
    // 延迟隐藏以显示完成状态
    setTimeout(() => {
      this.loadingIndicator.classList.remove('show');
      setTimeout(() => {
        this.loadingIndicator.style.display = 'none';
      }, 400); // 等待动画完成
    }, 500); // 显示完成状态500ms
    
    // 图片加载成功后显示 canvas 内容
    if (this.webglViewer) {
      console.log('Setting canvas visibility to visible');
      this.previewCanvas.style.visibility = 'visible';
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
    if (preventKeys.indexOf(e.key) !== -1) {
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