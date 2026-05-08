/**
 * BackendRouter
 * --------------------------------------------------------------------------
 * Selects the appropriate `RenderBackend` for a given content scenario.
 *
 * Decision rules (Stage 4):
 *
 *   1. If the user explicitly asks for `'css'` -> CssBackend (always works).
 *   2. If the user explicitly asks for `'webgl'` -> WebGLBackend, but if
 *      WebGL is unavailable in the environment, fall back to CssBackend
 *      with a console warning.
 *   3. `'auto'` (default):
 *        - If a `customRenderNode` is in use -> CssBackend
 *          (WebGL cannot render arbitrary DOM such as <video> or Live Photo).
 *        - Else if WebGL is available -> WebGLBackend.
 *        - Else -> CssBackend.
 *
 * Live downgrades (e.g. `webglcontextlost`) are NOT handled here; the
 * WebGLBackend itself notifies via callback and the consumer can ask the
 * router to swap backends.
 */

import { CssBackend } from "./CssBackend";
import type { RenderBackend } from "./RenderBackend";
import { WebGLBackend, type WebGLBackendOptions } from "./WebGLBackend";

export type BackendChoice = "auto" | "css" | "webgl";

export interface BackendRouterContext {
  /** Whether the viewer is configured with a customRenderNode. */
  hasCustomRenderNode: boolean;
  /** User preference. */
  preference: BackendChoice;
  /** Forwarded to WebGLBackend constructor. */
  webglOptions?: WebGLBackendOptions;
}

export type ResolvedBackendKind = "css" | "webgl";

export interface BackendResolution {
  kind: ResolvedBackendKind;
  backend: RenderBackend;
  /** Reason for the choice — useful for logs / debug overlay. */
  reason: string;
}

export class BackendRouter {
  /**
   * Build a backend instance for the given context. Caller is responsible
   * for `mount(host)` and lifecycle.
   */
  public static resolve(ctx: BackendRouterContext): BackendResolution {
    const { hasCustomRenderNode, preference, webglOptions } = ctx;

    if (preference === "css") {
      return {
        kind: "css",
        backend: new CssBackend(),
        reason: "explicit:css",
      };
    }

    if (preference === "webgl") {
      if (WebGLBackend.isAvailable()) {
        return {
          kind: "webgl",
          backend: new WebGLBackend(webglOptions),
          reason: "explicit:webgl",
        };
      }
      console.warn(
        "[viewer-pro] WebGL requested but unavailable; falling back to CSS."
      );
      return {
        kind: "css",
        backend: new CssBackend(),
        reason: "fallback:webgl-unavailable",
      };
    }

    // auto
    if (hasCustomRenderNode) {
      return {
        kind: "css",
        backend: new CssBackend(),
        reason: "auto:has-custom-render-node",
      };
    }
    if (WebGLBackend.isAvailable()) {
      return {
        kind: "webgl",
        backend: new WebGLBackend(webglOptions),
        reason: "auto:webgl",
      };
    }
    return {
      kind: "css",
      backend: new CssBackend(),
      reason: "auto:webgl-unavailable",
    };
  }
}
