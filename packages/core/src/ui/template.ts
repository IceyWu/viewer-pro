import {
  closeIcon,
  prevIcon,
  nextIcon,
  zoomInIcon,
  zoomOutIcon,
  resetZoomIcon,
  fullscreenIcon,
  downloadIcon,
  infoIcon,
  gridIcon,
  rotateLeftIcon,
  rotateRightIcon,
} from "./icons";

export function getViewerTemplate(instanceId = 0): string {
  const suffix = `vp-${instanceId}`;
  const blurFilterId = `blur-overlay-filter-${suffix}`;
  const grad1Id = `grad1-${suffix}`;
  const grad2Id = `grad2-${suffix}`;
  const grad3Id = `grad3-${suffix}`;

  return `
      <svg style="position: absolute; width: 0; height: 0;">
        <defs>
          <filter id="${blurFilterId}" x="-100%" y="-100%" width="300%" height="300%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="2" result="turbulence"/>
            <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="50" xChannelSelector="R" yChannelSelector="G" result="displacement"/>
            <feGaussianBlur in="displacement" stdDeviation="40" result="blur"/>
          </filter>
        </defs>
      </svg>
      <div class="image-preview-overlay">
        <canvas data-vp-role="blurCanvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: none;"></canvas>
        <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0;">
          <defs>
            <radialGradient id="${grad1Id}" cx="30%" cy="40%">
              <stop offset="0%" style="stop-color:rgb(100,100,150);stop-opacity:0.6" />
              <stop offset="100%" style="stop-color:rgb(50,50,80);stop-opacity:0" />
            </radialGradient>
            <radialGradient id="${grad2Id}" cx="70%" cy="60%">
              <stop offset="0%" style="stop-color:rgb(150,100,100);stop-opacity:0.6" />
              <stop offset="100%" style="stop-color:rgb(80,50,50);stop-opacity:0" />
            </radialGradient>
            <radialGradient id="${grad3Id}" cx="50%" cy="80%">
              <stop offset="0%" style="stop-color:rgb(100,150,100);stop-opacity:0.6" />
              <stop offset="100%" style="stop-color:rgb(50,80,50);stop-opacity:0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="rgba(30,30,40,0.7)"/>
          <circle cx="30%" cy="40%" r="40%" fill="url(#${grad1Id})" filter="url(#${blurFilterId})"/>
          <circle cx="70%" cy="60%" r="40%" fill="url(#${grad2Id})" filter="url(#${blurFilterId})"/>
          <circle cx="50%" cy="80%" r="35%" fill="url(#${grad3Id})" filter="url(#${blurFilterId})"/>
        </svg>
      </div>
      <div class="image-preview-content">
        <div class="side-toolbar" data-vp-role="sideToolbar">
          <button class="control-button" data-vp-role="sideZoomIn" title="放大">${zoomInIcon}</button>
          <button class="control-button" data-vp-role="sideZoomOut" title="缩小">${zoomOutIcon}</button>
          <button class="control-button" data-vp-role="sideResetZoom" title="1:1">${resetZoomIcon}</button>
          <div class="side-toolbar-sep"></div>
          <button class="control-button" data-vp-role="sideRotateLeft" title="向左旋转">${rotateLeftIcon}</button>
          <button class="control-button" data-vp-role="sideRotateRight" title="向右旋转">${rotateRightIcon}</button>
          <div class="side-toolbar-sep"></div>
          <button class="control-button" data-vp-role="sideToggleThumbnails" title="缩略图">${gridIcon}</button>
          <button class="control-button" data-vp-role="sideFullscreen" title="全屏">${fullscreenIcon}</button>
          <button class="control-button" data-vp-role="sideDownload" title="下载">${downloadIcon}</button>
          <button class="control-button" data-vp-role="sideInfoOpen" title="信息">${infoIcon}</button>
        </div>

        <div class="image-preview-main-area">
          <div class="image-preview-header">
            <div class="image-preview-title" data-vp-role="previewTitle">图片预览</div>
            <div class="image-preview-close" data-vp-role="closePreview" style="cursor:pointer;">
              ${closeIcon}
            </div>
          </div>
          <div class="image-preview-image-container" data-vp-role="imageContainer">
            <div class="loading-overlay" data-vp-role="loadingIndicator" style="display:none;"><div class="image-loading"></div></div>
            <button class="arrow-btn left-arrow" data-vp-role="prevImage">${prevIcon}</button>
            <button class="arrow-btn right-arrow" data-vp-role="nextImage">${nextIcon}</button>
            <div class="error-message" data-vp-role="errorMessage" style="display:none;">
              图片加载失败
            </div>
            <img src="" alt="预览图片" class="image-preview-image" data-vp-role="previewImage" />
          </div>
        </div>
        <div class="info-modal" data-vp-role="imageInfoPanel">
          <button class="info-modal-close" data-vp-role="infoCollapseBtn">${closeIcon}</button>
          <div class="info-modal-header">信息面板</div>
          <div class="info-panel-content" data-vp-role="infoPanelContent"></div>
        </div>
      </div>
      <div class="thumbnail-nav" data-vp-role="thumbnailNav"></div>
    `;
}
