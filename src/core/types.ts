// 图片预览组件类型定义
export interface ImageObj {
  src: string;
  title?: string;
}

export interface ViewerProOptions {
  images?: ImageObj[];
  webglOptions?: WebGLViewerOptions;
}

export interface WebGLViewerOptions {
  initialScale?: number;
  minScale?: number;
  maxScale?: number;
  smooth?: boolean;
  limitToBounds?: boolean;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface TransformState {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface AnimationState {
  isAnimating: boolean;
  startTime: number;
  startScale: number;
  targetScale: number;
  startTranslateX: number;
  startTranslateY: number;
  targetTranslateX: number;
  targetTranslateY: number;
}

export interface WebGLResources {
  texture: WebGLTexture | null;
  vertexBuffer: WebGLBuffer | null;
  texCoordBuffer: WebGLBuffer | null;
  program: WebGLProgram | null;
  uniformLocations: {
    matrix: WebGLUniformLocation | null;
    image: WebGLUniformLocation | null;
  };
}

export interface LoadingState {
  isLoading: boolean;
  loadingId: number;
  abortController: AbortController | null;
}

export interface ProgressInfo {
  loaded: number;
  total: number;
  percent: number;
}
