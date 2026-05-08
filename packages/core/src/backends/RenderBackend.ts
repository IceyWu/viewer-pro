/**
 * RenderBackend
 * --------------------------------------------------------------------------
 * Pluggable rendering backend abstraction.
 *
 * The ViewerPro core (state + math + gestures) is renderer-agnostic. It only
 * produces a `TransformState` and asks the backend to display it. Concrete
 * implementations:
 *
 *   - CssBackend   : current behavior, writes `element.style.transform`.
 *                     supports any DOM target (img, video, custom DOM).
 *   - WebGLBackend : single-texture WebGL renderer for static images, used
 *                     for 4K~8K large image performance. Falls back to
 *                     CssBackend when not applicable (Live Photo, custom
 *                     render node, WebGL unavailable, context lost, etc.).
 *
 * The backend MUST NOT manage interaction state (zoom level, pan offset,
 * gesture state). Those live in TransformEngine. The backend only mirrors
 * `TransformState` onto pixels.
 */

export type BackendKind = "css" | "webgl";

/**
 * Pure transform state. No DOM, no gesture concerns.
 */
export interface TransformState {
  /** translation X in CSS pixels (relative to centered position) */
  translateX: number;
  /** translation Y in CSS pixels */
  translateY: number;
  /** uniform scale factor (1 = natural fit) */
  scale: number;
  /** rotation in degrees (cumulative, not modulo) */
  rotation: number;
}

/**
 * How the next frame should transition from the current state.
 *  - "none"    : no transition, snap immediately (used during drag)
 *  - "normal"  : standard ease (used after zoom buttons / wheel)
 *  - "spring"  : bouncy cubic-bezier (used for snap-back when scale <= 1)
 */
export type TransitionMode = "none" | "normal" | "spring";

export interface RenderBackend {
  readonly kind: BackendKind;

  /**
   * Optional one-time mount step to attach renderer-owned DOM (e.g. the
   * <canvas> element for WebGL). Called by ViewerPro after creating the
   * preview container.
   */
  mount?(host: HTMLElement): void;

  /**
   * Register a DOM element as a transform target. Multiple targets may be
   * active simultaneously (e.g. previewImage + customRenderNode coexist
   * during the brief moment of switching content).
   *
   * For CssBackend the target IS the element being transformed.
   * For WebGLBackend the target is a hint about which logical content
   * the backend should render (only the canvas itself receives writes).
   */
  addTarget(target: HTMLElement): void;
  removeTarget(target: HTMLElement): void;
  hasTarget(target: HTMLElement): boolean;

  /**
   * Apply a transform to all current targets.
   * The backend is responsible for translating `transition` into whatever
   * mechanism it uses (CSS transition, RAF interpolation, etc.).
   */
  applyTransform(state: TransformState, transition: TransitionMode): void;

  /**
   * Optional: notify the backend that the source image (or bitmap) has
   * decoded and is ready to be rendered. CssBackend ignores; WebGLBackend
   * uploads to a GPU texture.
   *
   * Returning a Promise lets callers `await` upload completion before the
   * first applyTransform.
   */
  setImageSource?(
    source: HTMLImageElement | ImageBitmap | null,
  ): Promise<void> | void;

  /**
   * Release all DOM/GPU resources held by the backend.
   * Safe to call multiple times.
   */
  destroy(): void;
}
