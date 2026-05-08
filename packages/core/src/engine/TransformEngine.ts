/**
 * TransformEngine
 * --------------------------------------------------------------------------
 * Pure state + math for the viewer transform (scale / translate / rotation).
 *
 * Carries over the EXACT formulas from the previous monolithic ViewerPro:
 *   - zoom step clamping with [min, max]
 *   - re-center to origin when scale <= 1
 *   - constrainTranslation when scale > 1
 *   - wheel deltaY normalization (handles deltaMode 0/1/2)
 *   - dynamic wheel step (base + speed bonus, capped at maxStep)
 *
 * The engine has NO knowledge of:
 *   - DOM elements (caller injects ContentBounds)
 *   - rendering (emits onUpdate; consumer chooses how to paint)
 *   - gestures (lives in GestureController)
 *
 * Behavior contract: emits an UpdateEvent only when state actually changes
 * (preserves the original "if (newScale !== this.scale)" optimization).
 */

import type { TransformState, TransitionMode } from "../backends/RenderBackend";

export interface TransformConfig {
  /** Minimum allowed scale (default 0.5) */
  min: number;
  /** Maximum allowed scale (default 3) */
  max: number;
  /** Discrete zoom step for buttons / keyboard +/- (default 0.2) */
  step: number;
  /** Base wheel step before speed bonus (default 0.15) */
  wheelBaseStep: number;
  /** Hard cap on wheel step including bonus (default 0.3) */
  wheelMaxStep: number;
  /** Multiplier converting normalized |deltaY| to bonus (default 0.01) */
  wheelSpeedMultiplier: number;
}

export const DEFAULT_TRANSFORM_CONFIG: TransformConfig = {
  min: 0.5,
  max: 3,
  step: 0.2,
  wheelBaseStep: 0.15,
  wheelMaxStep: 0.3,
  wheelSpeedMultiplier: 0.01,
};

/** Container + content dimensions used to compute pan constraints. */
export interface ContentBounds {
  containerWidth: number;
  containerHeight: number;
  contentWidth: number;
  contentHeight: number;
}

export interface UpdateEvent {
  state: TransformState;
  transition: TransitionMode;
}

export type UpdateListener = (event: UpdateEvent) => void;

export class TransformEngine {
  private _scale = 1;
  private _translateX = 0;
  private _translateY = 0;
  private _rotation = 0;
  private cfg: TransformConfig;
  private listener: UpdateListener | null = null;

  constructor(config: Partial<TransformConfig> = {}) {
    this.cfg = { ...DEFAULT_TRANSFORM_CONFIG, ...config };
  }

  // ---------- listener ----------

  public setListener(listener: UpdateListener | null): void {
    this.listener = listener;
  }

  // ---------- state accessors ----------

  public get scale(): number {
    return this._scale;
  }
  public get translateX(): number {
    return this._translateX;
  }
  public get translateY(): number {
    return this._translateY;
  }
  public get rotation(): number {
    return this._rotation;
  }

  public getState(): TransformState {
    return {
      translateX: this._translateX,
      translateY: this._translateY,
      scale: this._scale,
      rotation: this._rotation,
    };
  }

  // ---------- config ----------

  public setConfig(partial: Partial<TransformConfig>): void {
    this.cfg = { ...this.cfg, ...partial };
  }

  public getConfig(): TransformConfig {
    return { ...this.cfg };
  }

  // ---------- mutations ----------

  /**
   * Apply a delta to the current scale, clamped to [min, max].
   * Re-centers translation when the new scale <= 1, otherwise constrains
   * translation to keep the image edges visible.
   *
   * Mirrors the original `ViewerPro.zoom()` behavior bit-for-bit.
   */
  public zoomBy(
    delta: number,
    bounds: ContentBounds | null,
    transition: TransitionMode = "normal"
  ): void {
    const newScale = Math.max(
      this.cfg.min,
      Math.min(this.cfg.max, this._scale + delta)
    );
    if (newScale === this._scale) return;
    this._scale = newScale;

    if (this._scale <= 1) {
      this._translateX = 0;
      this._translateY = 0;
    } else if (bounds) {
      this.applyConstraint(bounds);
    }

    this.emit(transition);
  }

  /** Reset scale/translate/rotation to identity. */
  public reset(transition: TransitionMode = "normal"): void {
    this._scale = 1;
    this._translateX = 0;
    this._translateY = 0;
    this._rotation = 0;
    this.emit(transition);
  }

  /** Cumulative rotate (does NOT modulo, matches original behavior). */
  public rotate(degrees: number, transition: TransitionMode = "normal"): void {
    this._rotation += degrees;
    this.emit(transition);
  }

  /**
   * Set raw translation (used during drag and snap-back).
   * - When `constrain` is true and scale > 1, clamps to keep image visible.
   * - When scale <= 1 and `snapBackToOrigin` is true, snaps to (0,0).
   */
  public setTranslation(
    tx: number,
    ty: number,
    bounds: ContentBounds | null,
    options: {
      constrain?: boolean;
      snapBackToOrigin?: boolean;
      transition?: TransitionMode;
    } = {}
  ): void {
    const transition = options.transition ?? "none";
    if (this._scale <= 1 && options.snapBackToOrigin) {
      this._translateX = 0;
      this._translateY = 0;
    } else {
      this._translateX = tx;
      this._translateY = ty;
      if (options.constrain && this._scale > 1 && bounds) {
        this.applyConstraint(bounds);
      }
    }
    this.emit(transition);
  }

  /**
   * Re-evaluate translation constraints against the current bounds without
   * changing scale/rotation. Used after a drag completes to land within
   * legal range.
   */
  public reconstrain(
    bounds: ContentBounds | null,
    transition: TransitionMode = "normal"
  ): void {
    if (this._scale > 1 && bounds) {
      this.applyConstraint(bounds);
    }
    this.emit(transition);
  }

  // ---------- wheel math (preserved verbatim) ----------

  /**
   * Normalize WheelEvent.deltaY across browsers/devices.
   * Mirrors original `ViewerPro.normalizeDelta()`.
   */
  public normalizeWheelDelta(e: WheelEvent): number {
    let delta = e.deltaY;
    if (e.deltaMode === 1) {
      delta *= 16; // DOM_DELTA_LINE
    } else if (e.deltaMode === 2) {
      delta *= 800; // DOM_DELTA_PAGE
    }
    return Math.max(-100, Math.min(100, delta));
  }

  /**
   * Convert a normalized delta into a dynamic zoom step.
   * Mirrors original `ViewerPro.calculateDynamicZoomStep()`.
   */
  public computeWheelStep(normalizedDelta: number): number {
    const absDelta = Math.abs(normalizedDelta);
    const speedBonus = Math.min(
      absDelta * this.cfg.wheelSpeedMultiplier,
      this.cfg.wheelMaxStep - this.cfg.wheelBaseStep
    );
    return this.cfg.wheelBaseStep + speedBonus;
  }

  /**
   * Convenience: process a wheel event end-to-end (normalize -> step -> zoom).
   * Mirrors original `ViewerPro.handleWheelZoom()`.
   */
  public handleWheel(e: WheelEvent, bounds: ContentBounds | null): void {
    const normalized = this.normalizeWheelDelta(e);
    const step = this.computeWheelStep(normalized);
    const direction = normalized < 0 ? 1 : -1;
    this.zoomBy(direction * step, bounds, "normal");
  }

  // ---------- internals ----------

  private applyConstraint(bounds: ContentBounds): void {
    const scaledWidth = bounds.contentWidth * this._scale;
    const scaledHeight = bounds.contentHeight * this._scale;
    const maxTranslateX = Math.max(
      0,
      (scaledWidth - bounds.containerWidth) / 2
    );
    const maxTranslateY = Math.max(
      0,
      (scaledHeight - bounds.containerHeight) / 2
    );
    this._translateX = Math.max(
      -maxTranslateX,
      Math.min(maxTranslateX, this._translateX)
    );
    this._translateY = Math.max(
      -maxTranslateY,
      Math.min(maxTranslateY, this._translateY)
    );
  }

  private emit(transition: TransitionMode): void {
    if (!this.listener) return;
    this.listener({ state: this.getState(), transition });
  }

  /**
   * Reset internal state without emitting (used during destroy or content
   * navigation when the consumer will trigger its own update afterward).
   */
  public resetSilently(): void {
    this._scale = 1;
    this._translateX = 0;
    this._translateY = 0;
    this._rotation = 0;
  }
}
