import type { CanvasSize, ProgressInfo } from './types';
import { DEFAULT_CANVAS_SIZE, WEBGL_CONSTANTS } from './constants';

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T, 
  wait: number
): T {
  let timeout: number | null = null;
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  }) as T;
}

/**
 * 缓动函数 - 三次贝塞尔曲线
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * 检查数值是否为2的幂次方
 */
export function isPowerOf2(value: number): boolean {
  return (value & (value - 1)) === 0;
}

/**
 * 获取有效的 Canvas 尺寸
 */
export function getValidCanvasSize(canvas: HTMLCanvasElement): CanvasSize {
  const rect = canvas.getBoundingClientRect();
  let { width, height } = rect;
  
  if (width === 0 || height === 0) {
    // 尝试从父容器获取尺寸
    const parent = canvas.parentElement;
    if (parent) {
      const parentRect = parent.getBoundingClientRect();
      width = parentRect.width || DEFAULT_CANVAS_SIZE.width;
      height = parentRect.height || DEFAULT_CANVAS_SIZE.height;
    } else {
      width = DEFAULT_CANVAS_SIZE.width;
      height = DEFAULT_CANVAS_SIZE.height;
    }
    
    // 强制设置 Canvas 的 CSS 尺寸
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
  
  return { width, height };
}

/**
 * 检查 WebGL 支持
 */
export function isWebGLSupported(): boolean {
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

/**
 * 获取 WebGL 上下文
 */
export function getWebGLContext(canvas: HTMLCanvasElement): WebGLRenderingContext {
  const gl = canvas.getContext('webgl', { 
    alpha: true, 
    antialias: true, 
    powerPreference: 'high-performance' 
  }) || canvas.getContext('experimental-webgl', { 
    alpha: true, 
    antialias: true 
  });
  
  if (!gl) {
    throw new Error('WebGL not supported in this browser');
  }
  
  return gl as WebGLRenderingContext;
}

/**
 * 等待 DOM 更新
 */
export function waitForDOMUpdate(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
}

/**
 * 计算进度信息
 */
export function calculateProgress(loaded: number, total: number): ProgressInfo {
  const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
  return { loaded, total, percent };
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/**
 * 限制设备像素比
 */
export function getClampedDevicePixelRatio(): number {
  return Math.min(
    window.devicePixelRatio || 1, 
    WEBGL_CONSTANTS.DEVICE_PIXEL_RATIO_THRESHOLD
  );
}

/**
 * 计算适配屏幕的缩放值
 */
export function calculateFitScale(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  initialScale: number
): number {
  if (imageWidth === 0 || imageHeight === 0 || canvasWidth === 0 || canvasHeight === 0) {
    return initialScale;
  }
  
  // 计算图片和canvas的纵横比
  const imageAspect = imageWidth / imageHeight;
  const canvasAspect = canvasWidth / canvasHeight;
  
  // 计算适合屏幕的缩放值，确保图片完整显示在视口中
  let fitScale: number;
  
  if (imageAspect > canvasAspect) {
    // 图片比canvas更宽，按宽度适配
    fitScale = 0.9; // 留一些边距
  } else {
    // 图片比canvas更高，按高度适配
    fitScale = 0.9; // 留一些边距
  }
  
  return fitScale * initialScale;
}

/**
 * 约束平移位置到边界内
 */
export function constrainPosition(
  translateX: number,
  translateY: number,
  scale: number,
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  fitScale: number,
  limitToBounds: boolean
): { x: number; y: number } {
  if (!limitToBounds) {
    return { x: translateX, y: translateY };
  }

  if (scale <= fitScale) {
    return { x: 0, y: 0 };
  }

  // 计算纵横比调整
  const imageAspect = imageWidth / imageHeight;
  const canvasAspect = canvasWidth / canvasHeight;
  
  // 根据当前缩放计算图片在NDC空间中的实际尺寸
  let effectiveScaleX = scale;
  let effectiveScaleY = scale;
  
  if (imageAspect > canvasAspect) {
    effectiveScaleY = scale * (canvasAspect / imageAspect);
  } else {
    effectiveScaleX = scale * (imageAspect / canvasAspect);
  }
  
  // 计算允许的最大平移范围（NDC空间中的单位）
  const maxTranslateX = Math.max(0, (effectiveScaleX - 1) * canvasWidth / 2);
  const maxTranslateY = Math.max(0, (effectiveScaleY - 1) * canvasHeight / 2);

  const x = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX));
  const y = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY));

  return { x, y };
}
