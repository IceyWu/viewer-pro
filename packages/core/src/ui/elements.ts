export interface ViewerElements {
  previewImage: HTMLImageElement;
  previewTitle: HTMLElement;
  closeButton: HTMLElement;
  prevButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  zoomInButton: HTMLButtonElement | null;
  zoomOutButton: HTMLButtonElement | null;
  resetZoomButton: HTMLButtonElement | null;
  fullscreenButton: HTMLButtonElement | null;
  downloadButton: HTMLButtonElement | null;
  imageCounter: HTMLElement | null;
  loadingIndicator: HTMLElement;
  errorMessage: HTMLElement;
  thumbnailNav: HTMLElement;
  imageContainer: HTMLElement;
  toggleInfoBtn: HTMLButtonElement | null;
  toggleThumbsBtn: HTMLButtonElement | null;
  sideZoomInBtn: HTMLButtonElement;
  sideZoomOutBtn: HTMLButtonElement;
  sideResetZoomBtn: HTMLButtonElement;
  sideRotateLeftBtn: HTMLButtonElement;
  sideRotateRightBtn: HTMLButtonElement;
  sideFullscreenBtn: HTMLButtonElement;
  sideDownloadBtn: HTMLButtonElement;
  sideInfoBtn: HTMLButtonElement;
  sideToggleThumbsBtn: HTMLButtonElement;
  infoPanel: HTMLElement;
  infoCollapseBtn: HTMLElement;
  infoPanelContent: HTMLElement;
}

function queryRequired<T extends Element>(
  root: HTMLElement,
  selector: string,
): T {
  const element = root.querySelector(selector);
  if (!element) {
    throw new Error(`[viewer-pro] missing required element: ${selector}`);
  }
  return element as T;
}

const roleSelector = (role: string): string => `[data-vp-role="${role}"]`;

export function collectViewerElements(root: HTMLElement): ViewerElements {
  return {
    previewImage: queryRequired<HTMLImageElement>(
      root,
      roleSelector("previewImage"),
    ),
    previewTitle: queryRequired<HTMLElement>(
      root,
      roleSelector("previewTitle"),
    ),
    closeButton: queryRequired<HTMLElement>(root, roleSelector("closePreview")),
    prevButton: queryRequired<HTMLButtonElement>(
      root,
      roleSelector("prevImage"),
    ),
    nextButton: queryRequired<HTMLButtonElement>(
      root,
      roleSelector("nextImage"),
    ),
    zoomInButton: root.querySelector(
      roleSelector("zoomIn"),
    ) as HTMLButtonElement | null,
    zoomOutButton: root.querySelector(
      roleSelector("zoomOut"),
    ) as HTMLButtonElement | null,
    resetZoomButton: root.querySelector(
      roleSelector("resetZoom"),
    ) as HTMLButtonElement | null,
    fullscreenButton: root.querySelector(
      roleSelector("toggleFullscreen"),
    ) as HTMLButtonElement | null,
    downloadButton: root.querySelector(
      roleSelector("downloadImage"),
    ) as HTMLButtonElement | null,
    imageCounter: root.querySelector(roleSelector("imageCounter")),
    loadingIndicator: queryRequired<HTMLElement>(
      root,
      roleSelector("loadingIndicator"),
    ),
    errorMessage: queryRequired<HTMLElement>(
      root,
      roleSelector("errorMessage"),
    ),
    thumbnailNav: queryRequired<HTMLElement>(
      root,
      roleSelector("thumbnailNav"),
    ),
    imageContainer: queryRequired<HTMLElement>(
      root,
      roleSelector("imageContainer"),
    ),
    toggleInfoBtn: root.querySelector(
      roleSelector("toggleInfoPanelBtn"),
    ) as HTMLButtonElement | null,
    toggleThumbsBtn: root.querySelector(
      roleSelector("toggleThumbnails"),
    ) as HTMLButtonElement | null,
    sideZoomInBtn: queryRequired<HTMLButtonElement>(
      root,
      roleSelector("sideZoomIn"),
    ),
    sideZoomOutBtn: queryRequired<HTMLButtonElement>(
      root,
      roleSelector("sideZoomOut"),
    ),
    sideResetZoomBtn: queryRequired<HTMLButtonElement>(
      root,
      roleSelector("sideResetZoom"),
    ),
    sideRotateLeftBtn: queryRequired<HTMLButtonElement>(
      root,
      roleSelector("sideRotateLeft"),
    ),
    sideRotateRightBtn: queryRequired<HTMLButtonElement>(
      root,
      roleSelector("sideRotateRight"),
    ),
    sideFullscreenBtn: queryRequired<HTMLButtonElement>(
      root,
      roleSelector("sideFullscreen"),
    ),
    sideDownloadBtn: queryRequired<HTMLButtonElement>(
      root,
      roleSelector("sideDownload"),
    ),
    sideInfoBtn: queryRequired<HTMLButtonElement>(
      root,
      roleSelector("sideInfoOpen"),
    ),
    sideToggleThumbsBtn: queryRequired<HTMLButtonElement>(
      root,
      roleSelector("sideToggleThumbnails"),
    ),
    infoPanel: queryRequired<HTMLElement>(root, roleSelector("imageInfoPanel")),
    infoCollapseBtn: queryRequired<HTMLElement>(
      root,
      roleSelector("infoCollapseBtn"),
    ),
    infoPanelContent: queryRequired<HTMLElement>(
      root,
      roleSelector("infoPanelContent"),
    ),
  };
}
