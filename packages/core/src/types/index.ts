import type { BackendChoice } from "../backends/BackendRouter";

export type ToolbarAction =
  | "zoomIn"
  | "zoomOut"
  | "reset"
  | "rotateLeft"
  | "rotateRight"
  | "thumbnails"
  | "fullscreen"
  | "download"
  | "info";

export interface ViewerItem {
  src: string;
  thumbnail?: string;
  title?: string;
  type?: string;
  photoSrc?: string;
  videoSrc?: string;
  [key: string]: any;
}

export interface LoadingContext {
  getImageLoadingStatus: () => Promise<{ loaded: boolean; error?: string }>;
  getMediaLoadingStatus: () => Promise<{
    images: boolean[];
    videos: boolean[];
    audios: boolean[];
  }>;
  onImageLoaded: (callback: () => void) => void;
  onImageError: (callback: (error: string) => void) => void;
  getCurrentImage: () => { image: ViewerItem; index: number };
  closeLoading: () => void;
}

export interface TransformChangeState {
  scale: number;
  translateX: number;
  translateY: number;
  rotation: number;
  index: number;
  image: ViewerItem | null;
}

export interface ZoomConfig {
  min?: number;
  max?: number;
  step?: number;
  wheelBaseStep?: number;
  wheelMaxStep?: number;
  wheelSpeedMultiplier?: number;
}

export interface SwipeConfig {
  maxDistance?: number;
  viewportRatio?: number;
  axisLockRatio?: number;
}

export interface ViewerProOptions {
  loadingNode?:
    | HTMLElement
    | (() => HTMLElement)
    | ((
        item: ViewerItem,
        idx: number,
      ) =>
        | HTMLElement
        | {
            node: HTMLElement;
            done: (context: LoadingContext) => void | Promise<void>;
          });
  images?: ViewerItem[];
  itemSelector?: string;
  renderNode?: HTMLElement | ((item: ViewerItem, idx: number) => HTMLElement);
  onImageLoad?: (item: ViewerItem, idx: number) => void;
  onContentReady?: (item: ViewerItem, idx: number) => void;
  onTransformChange?: (state: TransformChangeState) => void;
  infoRender?: HTMLElement | ((item: ViewerItem, idx: number) => HTMLElement);
  theme?: "dark" | "light" | "auto";
  zoomConfig?: ZoomConfig;
  backend?: BackendChoice;
  webglFiltering?: "linear" | "nearest";
  toolbar?: ToolbarAction[];
  mobileToolbar?: ToolbarAction[];
  mobileSwipeToNavigate?: boolean;
  swipeConfig?: SwipeConfig;
  preloadAdjacent?: boolean;
  preloadCacheLimit?: number;
  keyboardShortcuts?: boolean;
  onOpen?: (item: ViewerItem, idx: number) => void;
  onClose?: () => void;
  onIndexChange?: (item: ViewerItem, idx: number) => void;
  onInfoPanelOpen?: (item: ViewerItem, idx: number) => void;
  onInfoPanelClose?: (item: ViewerItem, idx: number) => void;
}
