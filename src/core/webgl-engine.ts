/**
 * WebGL 图片查看器引擎
 * 专门处理 WebGL 渲染逻辑
 */

import type { 
  WebGLViewerOptions, 
  TransformState, 
  AnimationState, 
  WebGLResources 
} from './types';
import { 
  DEFAULT_CONFIG, 
  ANIMATION_DURATION, 
  ZOOM_FACTOR, 
  WEBGL_CONSTANTS, 
  PERFORMANCE_CONFIG,
  VERTEX_SHADER_SOURCE,
  FRAGMENT_SHADER_SOURCE,
  GEOMETRY_DATA
} from './constants';
import {
  debounce,
  easeInOutCubic,
  isPowerOf2,
  getValidCanvasSize,
  getWebGLContext,
  getClampedDevicePixelRatio,
  calculateFitScale,
  constrainPosition
} from './utils';
import { loadImageElement, type ProgressCallback } from './image-loader';

export class WebGLImageViewerEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private resources: WebGLResources;
  
  // Transform state
  private transform: TransformState = {
    scale: 1,
    translateX: 0,
    translateY: 0
  };
  
  // Image state
  private imageWidth = 0;
  private imageHeight = 0;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private imageLoaded = false;
  private isContextLost = false;

  // Interaction state
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private lastTouchDistance = 0;

  // Animation state
  private animation: AnimationState = {
    isAnimating: false,
    startTime: 0,
    startScale: 1,
    targetScale: 1,
    startTranslateX: 0,
    startTranslateY: 0,
    targetTranslateX: 0,
    targetTranslateY: 0
  };
  private animationFrame: number | null = null;

  // Configuration
  private config: Required<WebGLViewerOptions>;
  
  // 性能优化
  private lastRenderTime = 0;
  private resizeTimeoutId: number | null = null;

  // Bound event handlers
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

  constructor(canvas: HTMLCanvasElement, config: WebGLViewerOptions = {}) {
    this.canvas = canvas;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.resources = {
      texture: null,
      vertexBuffer: null,
      texCoordBuffer: null,
      program: null,
      uniformLocations: { matrix: null, image: null }
    };

    this.gl = getWebGLContext(canvas);
    this.validateCanvas();
    this.setupCanvas();
    this.initWebGL();
    this.setupEventListeners();
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
  private debouncedResizeCanvas = debounce(() => {
    this.resizeCanvas();
  }, PERFORMANCE_CONFIG.DEBOUNCE_RESIZE_MS);

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
    const { width, height } = getValidCanvasSize(this.canvas);
    
    this.canvasWidth = width;
    this.canvasHeight = height;
    
    // 设置 Canvas 的实际像素尺寸
    const devicePixelRatio = getClampedDevicePixelRatio();
    this.canvas.width = width * devicePixelRatio;
    this.canvas.height = height * devicePixelRatio;
    
    // 设置 WebGL 视口
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    if (this.imageLoaded) {
      this.fitImageToScreen();
      this.forceRender();
    }
  }

  private initWebGL(): void {
    const { gl } = this;
    
    try {
      const vertexShader = this.createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
      const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);

      this.resources.program = this.createProgram(vertexShader, fragmentShader);
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
    gl.useProgram(this.resources.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private createGeometry(): void {
    this.resources.vertexBuffer = this.createBuffer(GEOMETRY_DATA.positions, 'a_position', 2);
    this.resources.texCoordBuffer = this.createBuffer(GEOMETRY_DATA.texCoords, 'a_texCoord', 2);
  }

  private createBuffer(data: Float32Array, attributeName: string, size: number): WebGLBuffer {
    const { gl } = this;
    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error(`Failed to create buffer for ${attributeName}`);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    
    const location = gl.getAttribLocation(this.resources.program!, attributeName);
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

  public async loadImage(
    url: string, 
    progressCallback?: ProgressCallback, 
    abortSignal?: AbortSignal
  ): Promise<void> {
    const image = await loadImageElement(url, progressCallback, abortSignal);
    
    // 检查是否已取消
    if (abortSignal?.aborted) {
      throw new Error('Image loading was cancelled');
    }
    
    this.imageWidth = image.width;
    this.imageHeight = image.height;
    this.createTexture(image);
    this.imageLoaded = true;
    this.fitImageToScreen();
    this.forceRender();
  }

  private createTexture(image: HTMLImageElement): void {
    const { gl } = this;
    
    // 验证图片尺寸
    if (image.width > WEBGL_CONSTANTS.MAX_TEXTURE_SIZE || image.height > WEBGL_CONSTANTS.MAX_TEXTURE_SIZE) {
      console.warn(`Image size ${image.width}x${image.height} exceeds maximum texture size ${WEBGL_CONSTANTS.MAX_TEXTURE_SIZE}`);
    }
    
    // 清理旧纹理
    if (this.resources.texture) {
      gl.deleteTexture(this.resources.texture);
    }

    this.resources.texture = gl.createTexture();
    if (!this.resources.texture) {
      throw new Error('Failed to create texture');
    }

    gl.bindTexture(gl.TEXTURE_2D, this.resources.texture);
    
    // 设置纹理参数
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // 检查是否为2的幂次方
    const isPowerOf2Image = isPowerOf2(image.width) && isPowerOf2(image.height);
    
    if (isPowerOf2Image) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    
    // 上传纹理数据
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    // 检查WebGL错误
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
      throw new Error(`Failed to upload texture data: ${error}`);
    }
    
    // 只为2的幂次方图片生成mipmaps
    if (isPowerOf2Image) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
  }

  private fitImageToScreen(): void {
    if (this.imageWidth === 0 || this.imageHeight === 0 || this.canvasWidth === 0 || this.canvasHeight === 0) {
      return;
    }
    
    this.transform.scale = calculateFitScale(
      this.imageWidth,
      this.imageHeight,
      this.canvasWidth,
      this.canvasHeight,
      this.config.initialScale
    );
    this.transform.translateX = 0;
    this.transform.translateY = 0;
  }

  private getFitToScreenScale(): number {
    return calculateFitScale(
      this.imageWidth,
      this.imageHeight,
      this.canvasWidth,
      this.canvasHeight,
      this.config.initialScale
    );
  }

  private constrainImagePosition(): void {
    const fitScale = this.getFitToScreenScale();
    const constrained = constrainPosition(
      this.transform.translateX,
      this.transform.translateY,
      this.transform.scale,
      this.imageWidth,
      this.imageHeight,
      this.canvasWidth,
      this.canvasHeight,
      fitScale,
      this.config.limitToBounds
    );
    
    this.transform.translateX = constrained.x;
    this.transform.translateY = constrained.y;
  }

  // ... 继续其他方法（下一部分）
  
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
      this.startAnimation(this.transform.scale, this.transform.translateX, this.transform.translateY);
    } else {
      this.forceRender();
    }
  }

  public destroy(): void {
    this.stopAnimation();
    this.removeEventListeners();
    this.cleanupWebGLResources();
    this.resetState();
  }

  // 私有方法继续...
  private forceRender(): void {
    this.lastRenderTime = 0;
    this.render();
  }

  private render(): void {
    // 帧率控制
    const now = performance.now();
    const minFrameInterval = 1000 / PERFORMANCE_CONFIG.MAX_RENDER_FPS;
    if (now - this.lastRenderTime < minFrameInterval) {
      return;
    }
    this.lastRenderTime = now;

    if (this.isContextLost || !this.resources.texture || !this.imageLoaded) {
      return;
    }

    const { gl } = this;
    
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.resources.program);
    
    // 使用缓存的 uniform 位置
    this.setupUniforms();
    this.bindVertexAttributes();
    
    // 设置矩阵和纹理
    const matrix = this.createMatrix();
    gl.uniformMatrix3fv(this.resources.uniformLocations.matrix, false, matrix);
    gl.uniform1i(this.resources.uniformLocations.image, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.resources.texture);
    
    // 绘制
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private createMatrix(): Float32Array {
    const devicePixelRatio = getClampedDevicePixelRatio();
    const canvasWidth = this.canvas.width / devicePixelRatio;
    const canvasHeight = this.canvas.height / devicePixelRatio;
    
    // 计算图片和canvas的纵横比
    const imageAspect = this.imageWidth / this.imageHeight;
    const canvasAspect = canvasWidth / canvasHeight;
    
    // 根据纵横比计算缩放
    let scaleX = this.transform.scale;
    let scaleY = this.transform.scale;
    
    if (imageAspect > canvasAspect) {
      scaleY = scaleY * (canvasAspect / imageAspect);
    } else {
      scaleX = scaleX * (imageAspect / canvasAspect);
    }
    
    const translateX = (this.transform.translateX * 2) / canvasWidth;
    const translateY = -(this.transform.translateY * 2) / canvasHeight;
    
    return new Float32Array([
      scaleX, 0, 0,
      0, scaleY, 0,
      translateX, translateY, 1
    ]);
  }

  private setupUniforms(): void {
    const { gl } = this;
    if (!this.resources.uniformLocations.matrix) {
      this.resources.uniformLocations.matrix = gl.getUniformLocation(this.resources.program!, 'u_matrix');
    }
    if (!this.resources.uniformLocations.image) {
      this.resources.uniformLocations.image = gl.getUniformLocation(this.resources.program!, 'u_image');
    }
  }

  private bindVertexAttributes(): void {
    const { gl } = this;
    
    // 绑定位置属性
    if (this.resources.vertexBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.vertexBuffer);
      const posLocation = gl.getAttribLocation(this.resources.program!, 'a_position');
      if (posLocation !== -1) {
        gl.enableVertexAttribArray(posLocation);
        gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 0, 0);
      }
    }
    
    // 绑定纹理坐标属性
    if (this.resources.texCoordBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.texCoordBuffer);
      const texCoordLocation = gl.getAttribLocation(this.resources.program!, 'a_texCoord');
      if (texCoordLocation !== -1) {
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
      }
    }
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

  private cleanupWebGLResources(): void {
    const { gl } = this;
    
    if (this.resources.texture) {
      gl.deleteTexture(this.resources.texture);
      this.resources.texture = null;
    }
    
    if (this.resources.vertexBuffer) {
      gl.deleteBuffer(this.resources.vertexBuffer);
      this.resources.vertexBuffer = null;
    }
    
    if (this.resources.texCoordBuffer) {
      gl.deleteBuffer(this.resources.texCoordBuffer);
      this.resources.texCoordBuffer = null;
    }
    
    if (this.resources.program) {
      gl.deleteProgram(this.resources.program);
      this.resources.program = null;
    }
  }

  private resetState(): void {
    if (this.resizeTimeoutId) {
      clearTimeout(this.resizeTimeoutId);
      this.resizeTimeoutId = null;
    }
    
    this.imageLoaded = false;
    this.isContextLost = false;
    this.resources.uniformLocations = { matrix: null, image: null };
  }

  // 事件处理方法（简化版本，完整实现需要包含所有交互逻辑）
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
    this.transform.translateX += deltaX;
    this.transform.translateY += deltaY;
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
    
    if (this.transform.scale > fitScale * 1.1) {
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
      this.transform.translateX += deltaX;
      this.transform.translateY += deltaY;
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
    this.forceRender();
  }

  private zoomAt(x: number, y: number, scaleFactor: number, animated = false): void {
    const oldScale = this.transform.scale;
    const fitScale = this.getFitToScreenScale();
    const newScale = Math.max(
      fitScale * this.config.minScale,
      Math.min(fitScale * this.config.maxScale, oldScale * scaleFactor)
    );
    
    if (newScale === oldScale) return;
    
    // 缩放中心计算逻辑...
    const ndcX = (x / this.canvasWidth) * 2 - 1;
    const ndcY = -((y / this.canvasHeight) * 2 - 1);
    
    const imageAspect = this.imageWidth / this.imageHeight;
    const canvasAspect = this.canvasWidth / this.canvasHeight;
    
    let adjustedNdcX = ndcX;
    let adjustedNdcY = ndcY;
    
    if (imageAspect > canvasAspect) {
      const scaleAdjustment = canvasAspect / imageAspect;
      adjustedNdcY = ndcY / scaleAdjustment;
    } else {
      const scaleAdjustment = imageAspect / canvasAspect;
      adjustedNdcX = ndcX / scaleAdjustment;
    }
    
    const scaleChange = newScale / oldScale;
    const newTranslateX = this.transform.translateX + adjustedNdcX * (1 - scaleChange) * this.canvasWidth / 2;
    const newTranslateY = this.transform.translateY + adjustedNdcY * (1 - scaleChange) * this.canvasHeight / 2;
    
    if (animated) {
      this.startAnimation(newScale, newTranslateX, newTranslateY);
    } else {
      this.transform.scale = newScale;
      this.transform.translateX = newTranslateX;
      this.transform.translateY = newTranslateY;
      this.constrainImagePosition();
      this.forceRender();
    }
  }

  private startAnimation(targetScale: number, targetTranslateX: number, targetTranslateY: number): void {
    this.stopAnimation();
    
    this.animation.isAnimating = true;
    this.animation.startTime = performance.now();
    this.animation.startScale = this.transform.scale;
    this.animation.targetScale = targetScale;
    this.animation.startTranslateX = this.transform.translateX;
    this.animation.startTranslateY = this.transform.translateY;
    this.animation.targetTranslateX = targetTranslateX;
    this.animation.targetTranslateY = targetTranslateY;
    this.animate();
  }

  private stopAnimation(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.animation.isAnimating = false;
  }

  private animate(): void {
    if (!this.animation.isAnimating) return;

    const now = performance.now();
    const elapsed = now - this.animation.startTime;
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
    const easedProgress = this.config.smooth ? easeInOutCubic(progress) : progress;

    this.transform.scale = this.animation.startScale + (this.animation.targetScale - this.animation.startScale) * easedProgress;
    this.transform.translateX = this.animation.startTranslateX + (this.animation.targetTranslateX - this.animation.startTranslateX) * easedProgress;
    this.transform.translateY = this.animation.startTranslateY + (this.animation.targetTranslateY - this.animation.startTranslateY) * easedProgress;

    this.render();

    if (progress < 1) {
      this.animationFrame = requestAnimationFrame(() => this.animate());
    } else {
      this.stopAnimation();
    }
  }
}
