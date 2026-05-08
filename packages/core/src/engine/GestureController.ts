/**
 * GestureController
 * --------------------------------------------------------------------------
 * Translates DOM events (mouse / wheel / touch / dblclick) into commands on
 * a `TransformEngine`. Faithfully preserves the original ViewerPro behavior:
 *
 *   - wheel: RAF-throttled (skip if a frame is already pending)
 *   - drag : RAF-coalesced (cancel previous frame before scheduling next)
 *   - drag end with scale <= 1 : spring snap-back to (0, 0)
 *   - drag end with scale  > 1 : reconstrain + normal transition
 *   - dblclick: reset (NOT toggle/zoom — original behavior)
 *   - shouldStartDrag selector unchanged: only image / custom-render-node /
 *     imageContainer; never toolbar / arrows / info modal
 */

import type { ContentBounds, TransformEngine } from "./TransformEngine";

const DEFAULT_SWIPE_MAX_DISTANCE = 80;
const DEFAULT_SWIPE_VIEWPORT_RATIO = 0.18;
const DEFAULT_SWIPE_AXIS_LOCK_RATIO = 1.25;

export interface GestureBindings {
  /** Container that captures pointer/wheel events. */
  container: HTMLElement;
  /** Transform engine to drive. */
  engine: TransformEngine;
  /**
   * Compute current content bounds (DOM-aware). Called lazily — at the start
   * of a drag and on demand for wheel/zoom constraint evaluation.
   * Returning null disables constraint (treat as "unknown bounds").
   */
  getBounds: () => ContentBounds | null;
  /** When the user double-clicks on the content. Default: engine.reset(). */
  onDoubleClick?: (e: MouseEvent) => void;
  /** When the user clicks on the backdrop (container itself). */
  onBackdropClick?: (e: MouseEvent) => void;
  onSwipe?: (direction: -1 | 1) => void;
  swipeEnabled?: boolean;
  swipeConfig?: {
    maxDistance?: number;
    viewportRatio?: number;
    axisLockRatio?: number;
  };
}

export class GestureController {
  private bindings: GestureBindings | null = null;

  // drag state
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private dragRAF: number | null = null;
  private cachedBounds: ContentBounds | null = null;
  private isTouchSwiping = false;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchCurrentX = 0;
  private touchCurrentY = 0;
  private isPinching = false;
  private pinchStartDistance = 0;
  private pinchStartScale = 1;

  // wheel throttle
  private wheelRAF: number | null = null;
  private pendingWheel: WheelEvent | null = null;

  // bound handlers (kept to allow remove)
  private onMouseDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!this.shouldStartDrag(target)) return;
    this.startDrag(e);
  };
  private onTouchStart = (e: TouchEvent) => {
    const target = e.target as HTMLElement;
    if (!this.shouldStartDrag(target)) return;
    if (e.touches.length >= 2) {
      e.preventDefault();
      this.startPinch(e);
      return;
    }
    if (e.touches && e.touches[0] && this.shouldUseSwipeNavigation()) {
      e.preventDefault();
      this.startTouchSwipe(e.touches[0]);
      return;
    }
    if (e.touches && e.touches[0]) this.startDrag(e.touches[0]);
  };
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    // Original behavior: if a RAF is already pending, drop this event.
    if (this.wheelRAF !== null) return;
    this.pendingWheel = e;
    this.wheelRAF = requestAnimationFrame(() => {
      this.wheelRAF = null;
      const evt = this.pendingWheel;
      this.pendingWheel = null;
      if (!evt || !this.bindings) return;
      this.bindings.engine.handleWheel(evt, this.bindings.getBounds());
    });
  };
  private onDblClick = (e: MouseEvent) => {
    if (!this.bindings) return;
    if (this.bindings.onDoubleClick) {
      this.bindings.onDoubleClick(e);
    } else {
      this.bindings.engine.reset("normal");
    }
  };
  private onContainerClick = (e: MouseEvent) => {
    if (!this.bindings) return;
    if (e.target === this.bindings.container && this.bindings.onBackdropClick) {
      this.bindings.onBackdropClick(e);
    }
  };

  // doc-level handlers (only attached during drag)
  private onDocMouseMove = (e: MouseEvent) => this.onDrag(e);
  private onDocMouseUp = () => this.stopDrag();
  private onDocTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (this.isPinching && e.touches.length >= 2) {
      this.onPinch(e);
      return;
    }
    if (!e.touches[0]) return;
    if (this.isTouchSwiping) {
      this.onTouchSwipe(e.touches[0]);
      return;
    }
    this.onDrag(e.touches[0]);
  };
  private onDocTouchEnd = (e: TouchEvent) => {
    if (this.isPinching) {
      this.stopPinch();
      if (e.touches.length === 1) {
        this.startDrag(e.touches[0]);
      }
      return;
    }
    if (this.isTouchSwiping) {
      this.stopTouchSwipe();
      return;
    }
    this.stopDrag();
  };

  // ---------- public ----------

  public bind(bindings: GestureBindings): void {
    this.unbind();
    this.bindings = bindings;
    const c = bindings.container;
    c.addEventListener("mousedown", this.onMouseDown);
    c.addEventListener("touchstart", this.onTouchStart, { passive: false });
    c.addEventListener("wheel", this.onWheel, { passive: false });
    c.addEventListener("dblclick", this.onDblClick);
  }

  /** Bind the backdrop click handler on a separate element (the overlay). */
  public bindBackdrop(target: HTMLElement): void {
    target.addEventListener("click", this.onContainerClick);
  }

  public unbindBackdrop(target: HTMLElement): void {
    target.removeEventListener("click", this.onContainerClick);
  }

  public unbind(): void {
    this.stopPinch();
    this.stopTouchSwipe(false);
    this.stopDrag();
    if (this.wheelRAF !== null) {
      cancelAnimationFrame(this.wheelRAF);
      this.wheelRAF = null;
    }
    this.pendingWheel = null;
    if (!this.bindings) return;
    const c = this.bindings.container;
    c.removeEventListener("mousedown", this.onMouseDown);
    c.removeEventListener("touchstart", this.onTouchStart);
    c.removeEventListener("wheel", this.onWheel);
    c.removeEventListener("dblclick", this.onDblClick);
    this.bindings = null;
  }

  public destroy(): void {
    this.unbind();
  }

  // ---------- internals ----------

  /** Selector logic preserved from original ViewerPro.shouldStartDrag(). */
  private shouldStartDrag(target: HTMLElement): boolean {
    if (target.closest(".arrow-btn, .info-modal, .side-toolbar")) return false;
    return !!target.closest(
      '[data-vp-role="previewImage"], .custom-render-node, [data-vp-role="imageContainer"]',
    );
  }

  private startDrag(e: MouseEvent | Touch): void {
    if (!this.bindings) return;
    if (this.isPinching) return;
    if ("preventDefault" in e && typeof e.preventDefault === "function") {
      (e as MouseEvent).preventDefault();
    }
    this.isDragging = true;
    const engine = this.bindings.engine;
    this.startX = e.clientX - engine.translateX;
    this.startY = e.clientY - engine.translateY;
    this.bindings.container.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    // Cache bounds for the duration of this drag (perf optimization).
    this.cachedBounds = this.bindings.getBounds();

    document.addEventListener("mousemove", this.onDocMouseMove);
    document.addEventListener("mouseup", this.onDocMouseUp);
    document.addEventListener("touchmove", this.onDocTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", this.onDocTouchEnd);
  }

  private onDrag(e: MouseEvent | Touch): void {
    if (!this.isDragging || this.isPinching || !this.bindings) return;
    if ("preventDefault" in e && typeof e.preventDefault === "function") {
      (e as MouseEvent).preventDefault();
    }

    if (this.dragRAF !== null) {
      cancelAnimationFrame(this.dragRAF);
    }
    this.dragRAF = requestAnimationFrame(() => {
      this.dragRAF = null;
      if (!this.bindings) return;
      // Refresh bounds if cache is missing (e.g., started before content ready).
      if (!this.cachedBounds) {
        this.cachedBounds = this.bindings.getBounds();
      }
      const tx = e.clientX - this.startX;
      const ty = e.clientY - this.startY;
      // During drag: constrain only when scale > 1; transition "none".
      this.bindings.engine.setTranslation(tx, ty, this.cachedBounds, {
        constrain: true,
        transition: "none",
      });
    });
  }

  private stopDrag(): void {
    if (!this.isDragging) {
      // Still detach in case bind/unbind raced.
      this.detachDocListeners();
      return;
    }
    this.isDragging = false;
    if (this.bindings) {
      this.bindings.container.style.cursor = "grab";
    }
    document.body.style.userSelect = "";

    if (this.dragRAF !== null) {
      cancelAnimationFrame(this.dragRAF);
      this.dragRAF = null;
    }

    if (this.bindings) {
      const engine = this.bindings.engine;
      const bounds = this.cachedBounds ?? this.bindings.getBounds();
      if (engine.scale <= 1) {
        // Spring snap-back to origin.
        engine.setTranslation(0, 0, bounds, {
          snapBackToOrigin: true,
          transition: "spring",
        });
      } else {
        // Constrain to legal range with normal transition.
        engine.reconstrain(bounds, "normal");
      }
    }

    this.cachedBounds = null;
    this.detachDocListeners();
  }

  private startPinch(e: TouchEvent): void {
    if (!this.bindings) return;
    this.stopDrag();
    this.isPinching = true;
    this.cachedBounds = this.bindings.getBounds();
    this.pinchStartDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
    this.pinchStartScale = this.bindings.engine.scale;
    this.bindings.container.style.cursor = "grab";
    document.body.style.userSelect = "none";
    document.addEventListener("touchmove", this.onDocTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", this.onDocTouchEnd);
    document.addEventListener("touchcancel", this.onDocTouchEnd);
  }

  private onPinch(e: TouchEvent): void {
    if (!this.bindings || this.pinchStartDistance <= 0) return;
    const currentDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
    const targetScale =
      this.pinchStartScale * (currentDistance / this.pinchStartDistance);
    this.bindings.engine.zoomBy(
      targetScale - this.bindings.engine.scale,
      this.cachedBounds ?? this.bindings.getBounds(),
      "none",
    );
  }

  private stopPinch(): void {
    if (!this.isPinching) return;
    this.isPinching = false;
    if (this.bindings) {
      this.bindings.engine.reconstrain(
        this.cachedBounds ?? this.bindings.getBounds(),
        "normal",
      );
    }
    this.pinchStartDistance = 0;
    this.pinchStartScale = 1;
    this.cachedBounds = null;
    document.body.style.userSelect = "";
    document.removeEventListener("touchcancel", this.onDocTouchEnd);
    this.detachDocListeners();
  }

  private startTouchSwipe(touch: Touch): void {
    if (!this.bindings) return;
    this.isTouchSwiping = true;
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchCurrentX = touch.clientX;
    this.touchCurrentY = touch.clientY;
    document.body.style.userSelect = "none";
    document.addEventListener("touchmove", this.onDocTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", this.onDocTouchEnd);
    document.addEventListener("touchcancel", this.onDocTouchEnd);
  }

  private onTouchSwipe(touch: Touch): void {
    this.touchCurrentX = touch.clientX;
    this.touchCurrentY = touch.clientY;
  }

  private stopTouchSwipe(emit = true): void {
    if (!this.isTouchSwiping) return;
    this.isTouchSwiping = false;
    document.body.style.userSelect = "";
    if (emit && this.bindings?.onSwipe) {
      const deltaX = this.touchCurrentX - this.touchStartX;
      const deltaY = this.touchCurrentY - this.touchStartY;
      const cfg = this.bindings.swipeConfig;
      const minDistance = Math.min(
        cfg?.maxDistance ?? DEFAULT_SWIPE_MAX_DISTANCE,
        window.innerWidth *
          (cfg?.viewportRatio ?? DEFAULT_SWIPE_VIEWPORT_RATIO),
      );
      if (
        Math.abs(deltaX) >= minDistance &&
        Math.abs(deltaX) >
          Math.abs(deltaY) *
            (cfg?.axisLockRatio ?? DEFAULT_SWIPE_AXIS_LOCK_RATIO)
      ) {
        this.bindings.onSwipe(deltaX < 0 ? 1 : -1);
      }
    }
    this.detachDocListeners();
  }

  private getTouchDistance(a: Touch, b: Touch): number {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  private shouldUseSwipeNavigation(): boolean {
    return (
      !!this.bindings?.onSwipe &&
      this.bindings.swipeEnabled !== false &&
      this.bindings.engine.scale <= 1 &&
      window.matchMedia("(pointer: coarse)").matches
    );
  }

  private detachDocListeners(): void {
    document.removeEventListener("mousemove", this.onDocMouseMove);
    document.removeEventListener("mouseup", this.onDocMouseUp);
    document.removeEventListener("touchmove", this.onDocTouchMove);
    document.removeEventListener("touchend", this.onDocTouchEnd);
    document.removeEventListener("touchcancel", this.onDocTouchEnd);
  }
}
