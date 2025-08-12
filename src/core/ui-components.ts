/**
 * UI 组件模块
 * 处理用户界面相关的逻辑
 */

import {
  closeIcon,
  prevIcon,
  nextIcon,
  zoomInIcon,
  zoomOutIcon,
  resetZoomIcon,
} from './icons';
import type { ProgressInfo } from './types';
import { calculateProgress, formatFileSize } from './utils';

export interface UIElements {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  title: HTMLElement;
  closeButton: HTMLElement;
  prevButton: HTMLDivElement;
  nextButton: HTMLDivElement;
  zoomInButton: HTMLButtonElement;
  zoomOutButton: HTMLButtonElement;
  resetZoomButton: HTMLButtonElement;
  loadingIndicator: HTMLElement;
  errorMessage: HTMLElement;
  progressCircle: SVGCircleElement;
  progressPercent: HTMLElement;
  progressText: HTMLElement;
  progressSize: HTMLElement;
}

/**
 * 创建预览容器的 HTML 结构
 */
export function createContainerHTML(): string {
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

/**
 * 创建预览容器元素
 */
export function createPreviewContainer(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'image-preview-container';
  container.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 5000;
    display: none; background: rgba(0,0,0,0.9); opacity: 0;
    transition: opacity 0.3s ease;
  `;
  
  container.innerHTML = createContainerHTML();
  document.body.appendChild(container);
  
  return container;
}

/**
 * 初始化 UI 元素引用
 */
export function initializeElements(container: HTMLElement): UIElements {
  const querySelector = <T extends Element>(selector: string): T => {
    const element = container.querySelector(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    return element as T;
  };

  return {
    container,
    canvas: querySelector<HTMLCanvasElement>('#previewCanvas'),
    title: querySelector('#previewTitle'),
    closeButton: querySelector('#closePreview'),
    prevButton: querySelector<HTMLDivElement>('#prevImage'),
    nextButton: querySelector<HTMLDivElement>('#nextImage'),
    zoomInButton: querySelector<HTMLButtonElement>('#zoomIn'),
    zoomOutButton: querySelector<HTMLButtonElement>('#zoomOut'),
    resetZoomButton: querySelector<HTMLButtonElement>('#resetZoom'),
    loadingIndicator: querySelector('#loadingIndicator'),
    errorMessage: querySelector('#errorMessage'),
    progressCircle: querySelector<SVGCircleElement>('#progressCircle'),
    progressPercent: querySelector('#progressPercent'),
    progressText: querySelector('#progressText'),
    progressSize: querySelector('#progressSize')
  };
}

/**
 * 显示加载指示器
 */
export function showLoading(elements: UIElements): void {
  console.log('Showing loading indicator');
  elements.loadingIndicator.style.display = 'block';
  
  // 强制重绘后添加显示类
  requestAnimationFrame(() => {
    elements.loadingIndicator.classList.add('show', 'pulse');
  });
  
  // 重置进度
  updateProgress(elements, 0, 100);
  
  // 加载时隐藏 canvas 内容
  elements.canvas.style.visibility = 'hidden';
}

/**
 * 隐藏加载指示器
 */
export function hideLoading(elements: UIElements): void {
  console.log('Hiding loading indicator');
  
  // 停止脉动动画
  elements.loadingIndicator.classList.remove('pulse');
  
  // 延迟隐藏以显示完成状态
  setTimeout(() => {
    elements.loadingIndicator.classList.remove('show');
    setTimeout(() => {
      elements.loadingIndicator.style.display = 'none';
    }, 400); // 等待动画完成
  }, 500); // 显示完成状态500ms
  
  // 图片加载成功后显示 canvas 内容
  console.log('Setting canvas visibility to visible');
  elements.canvas.style.visibility = 'visible';
  elements.canvas.style.display = 'block';
}

/**
 * 更新加载进度
 */
export function updateProgress(elements: UIElements, loaded: number, total: number): void {
  const progress = calculateProgress(loaded, total);
  const loadedMB = formatFileSize(loaded);
  const totalMB = formatFileSize(total);
  
  // 更新百分比文本
  elements.progressPercent.textContent = `${progress.percent}%`;
  
  // 更新进度圆环 (circumference = 2 * π * r = 2 * π * 14 ≈ 87.96)
  const circumference = 87.96;
  const offset = circumference - (progress.percent / 100) * circumference;
  elements.progressCircle.style.strokeDashoffset = offset.toString();
  
  // 根据进度改变颜色
  let color: string;
  if (progress.percent < 30) {
    color = '#FF9800'; // 橙色
  } else if (progress.percent < 70) {
    color = '#2196F3'; // 蓝色
  } else {
    color = '#4CAF50'; // 绿色
  }
  
  elements.progressCircle.style.stroke = color;
  elements.progressPercent.style.color = color;
  
  // 更新文本信息
  if (progress.percent < 100) {
    elements.progressText.textContent = '加载中';
    elements.progressSize.textContent = total > 0 ? `${loadedMB} / ${totalMB} MB` : `${loadedMB} MB`;
  } else {
    elements.progressText.textContent = '处理中';
    elements.progressSize.textContent = `${totalMB} MB`;
    // 完成时添加特殊样式
    elements.loadingIndicator.classList.remove('pulse');
    elements.progressCircle.style.stroke = '#4CAF50';
    elements.progressPercent.style.color = '#4CAF50';
  }
}

/**
 * 显示错误信息
 */
export function showError(elements: UIElements, error: unknown): void {
  hideLoading(elements);
  elements.canvas.style.display = 'none';
  elements.errorMessage.style.display = 'block';
  
  const errorMsg = error instanceof Error ? error.message : '未知错误';
  elements.errorMessage.textContent = `图片加载失败: ${errorMsg}`;
}

/**
 * 隐藏错误信息
 */
export function hideError(elements: UIElements): void {
  elements.errorMessage.style.display = 'none';
}

/**
 * 更新导航按钮状态
 */
export function updateNavigationButtons(
  elements: UIElements,
  currentIndex: number,
  totalCount: number
): void {
  const hasMultipleImages = totalCount > 1;
  
  elements.prevButton.style.display = hasMultipleImages ? 'flex' : 'none';
  elements.nextButton.style.display = hasMultipleImages ? 'flex' : 'none';
  
  if (hasMultipleImages) {
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === totalCount - 1;
    
    updateButtonState(elements.prevButton, !isFirst);
    updateButtonState(elements.nextButton, !isLast);
  }
}

/**
 * 更新按钮状态
 */
export function updateButtonState(button: HTMLElement, enabled: boolean): void {
  button.style.opacity = enabled ? '1' : '0.3';
  button.style.pointerEvents = enabled ? 'auto' : 'none';
}

/**
 * 设置 Canvas 尺寸
 */
export function setCanvasSize(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): void {
  Object.assign(canvas.style, {
    width: `${width}px`,
    height: `${height}px`,
    maxWidth: 'none',
    maxHeight: 'none',
    display: 'block',
    visibility: 'hidden' // 先隐藏内容，等加载完成后显示
  });
}

/**
 * 显示容器
 */
export function showContainer(container: HTMLElement): void {
  container.style.display = 'flex';
  
  // 使用Promise确保DOM更新
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      container.style.opacity = '1';
    });
  });
  
  document.body.style.overflow = 'hidden';
}

/**
 * 隐藏容器
 */
export function hideContainer(container: HTMLElement): void {
  container.style.opacity = '0';
  setTimeout(() => {
    container.style.display = 'none';
  }, 300);
  
  document.body.style.overflow = '';
}

/**
 * 清理之前的状态
 */
export function cleanupPreviousState(elements: UIElements): void {
  hideError(elements);
  // 隐藏 canvas 内容但保持其 display 状态
  elements.canvas.style.visibility = 'hidden';
}
