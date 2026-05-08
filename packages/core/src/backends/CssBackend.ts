import type {
  RenderBackend,
  TransformState,
  TransitionMode,
} from "./RenderBackend";

/**
 * CssBackend
 * --------------------------------------------------------------------------
 * The original viewer-pro behavior, extracted intact from `updateImageTransform`.
 *
 * Each registered target receives the same `transform` and `transition` value.
 * This faithfully preserves the prior code path — including the dual-write to
 * both `previewImage` and `cachedCustomNode` when both are present.
 *
 * Transition strings MUST stay byte-identical to the previous implementation
 * to avoid any visual regression:
 *   none   -> "none"
 *   normal -> "transform 0.3s ease"
 *   spring -> "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
 */
export class CssBackend implements RenderBackend {
  public readonly kind = "css" as const;

  private targets = new Set<HTMLElement>();
  private destroyed = false;

  public addTarget(target: HTMLElement): void {
    if (this.destroyed) return;
    this.targets.add(target);
  }

  public removeTarget(target: HTMLElement): void {
    this.targets.delete(target);
  }

  public hasTarget(target: HTMLElement): boolean {
    return this.targets.has(target);
  }

  public applyTransform(state: TransformState, transition: TransitionMode): void {
    if (this.destroyed) return;
    const transformValue = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale}) rotate(${state.rotation}deg)`;
    const transitionValue = cssTransitionFor(transition);

    for (const el of this.targets) {
      el.style.transition = transitionValue;
      el.style.transform = transformValue;
    }
  }

  public destroy(): void {
    this.destroyed = true;
    this.targets.clear();
  }
}

function cssTransitionFor(mode: TransitionMode): string {
  switch (mode) {
    case "none":
      return "none";
    case "spring":
      return "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
    case "normal":
    default:
      return "transform 0.3s ease";
  }
}
