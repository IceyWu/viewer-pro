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
  return `
      <div class="image-preview-overlay">
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
