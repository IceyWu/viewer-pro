/**
 * WebGLBackend
 * --------------------------------------------------------------------------
 * Single-texture WebGL renderer. Designed for plain raster images (no Live
 * Photo / video / custom DOM — those route to CssBackend via BackendRouter).
 *
 * Responsibilities:
 *   - Create + size a <canvas> overlay inside the host container
 *   - Compile shaders, link program, allocate quad VBOs (once)
 *   - Upload the source image as a single GPU texture
 *   - Compute per-frame mat3 transform (fit -> user scale/rotate/translate
 *     -> CSS->clip-space) and submit a single drawArrays call
 *   - Hide registered <img> targets while the canvas is showing pixels
 *   - Respect MAX_TEXTURE_SIZE (returns false from `canHandleSize`)
 *   - Listen for `webglcontextlost` / `webglcontextrestored`
 *
 * NOT responsible for:
 *   - Choosing whether to be active (BackendRouter does that)
 *   - Image decoding / network (handled upstream)
 *   - Animations beyond a snap-to-state apply (Stage 5 may add interp)
 */

import type {
  RenderBackend,
  TransformState,
  TransitionMode,
} from "./RenderBackend";
import { createImageProgram } from "./shaders";

/** Devices where mid-class hardware sets MAX_TEXTURE_SIZE = 4096. */
const SAFE_FALLBACK_MAX_TEXTURE_SIZE = 4096;

export interface WebGLBackendOptions {
  /** "linear" (default) for photos, "nearest" for pixel art. */
  filtering?: "linear" | "nearest";
  /** Override device pixel ratio cap (default = window.devicePixelRatio). */
  maxDevicePixelRatio?: number;
  /** Called when GL context is lost (so router can fall back to CSS). */
  onContextLost?: () => void;
  /** Called when GL context is restored. */
  onContextRestored?: () => void;
}

export class WebGLBackend implements RenderBackend {
  public readonly kind = "webgl" as const;

  private host: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private posBuffer: WebGLBuffer | null = null;
  private uvBuffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;
  private uMatrixLoc: WebGLUniformLocation | null = null;
  private uTextureLoc: WebGLUniformLocation | null = null;
  private aPositionLoc = -1;
  private aTexcoordLoc = -1;

  private targets = new Set<HTMLElement>();
  private hiddenStyles = new WeakMap<HTMLElement, string>();

  private imageWidth = 0;
  private imageHeight = 0;
  private hasTexture = false;

  private resizeObserver: ResizeObserver | null = null;
  private boundOnLost = (e: Event) => this.handleContextLost(e);
  private boundOnRestored = () => this.handleContextRestored();

  private destroyed = false;
  private maxTextureSize = SAFE_FALLBACK_MAX_TEXTURE_SIZE;
  private dprCap: number;
  private filtering: "linear" | "nearest";
  private opts: WebGLBackendOptions;

  // Last applied transform (re-applied on resize / context restore)
  private lastState: TransformState = {
    translateX: 0,
    translateY: 0,
    scale: 1,
    rotation: 0,
  };

  constructor(opts: WebGLBackendOptions = {}) {
    this.opts = opts;
    this.filtering = opts.filtering ?? "linear";
    this.dprCap = opts.maxDevicePixelRatio ?? Infinity;
  }

  // ---------- static probe ----------

  /**
   * Probe whether WebGL is available in this environment. Cheap; uses a
   * throwaway canvas and immediately disposes it.
   */
  public static isAvailable(): boolean {
    try {
      const c = document.createElement("canvas");
      const gl =
        (c.getContext("webgl") as WebGLRenderingContext | null) ||
        (c.getContext("experimental-webgl") as WebGLRenderingContext | null);
      return !!gl;
    } catch {
      return false;
    }
  }

  /** Reports the GL impl's MAX_TEXTURE_SIZE (after init). */
  public getMaxTextureSize(): number {
    return this.maxTextureSize;
  }

  /**
   * Returns false if the requested image dimensions exceed MAX_TEXTURE_SIZE
   * — caller (router) should fall back to CSS in that case.
   */
  public canHandleSize(w: number, h: number): boolean {
    return (
      w > 0 && h > 0 && w <= this.maxTextureSize && h <= this.maxTextureSize
    );
  }

  // ---------- RenderBackend ----------

  public mount(host: HTMLElement): void {
    if (this.destroyed) return;
    if (this.host) return; // idempotent
    this.host = host;

    const canvas = document.createElement("canvas");
    canvas.className = "viewer-pro-webgl-canvas";
    Object.assign(canvas.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      display: "block",
      pointerEvents: "none", // events pass through to imageContainer
      zIndex: "1",
    } as CSSStyleDeclaration);
    host.appendChild(canvas);
    this.canvas = canvas;

    // Try webgl1 first (broader compatibility).
    const gl =
      (canvas.getContext("webgl", {
        antialias: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
      }) as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    if (!gl) {
      // Caller (router) should detect this via isAvailable() before mounting,
      // but be defensive: leave canvas in place but render nothing.
      this.canvas.style.display = "none";
      return;
    }
    this.gl = gl;

    this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;

    canvas.addEventListener(
      "webglcontextlost",
      this.boundOnLost as EventListener,
    );
    canvas.addEventListener(
      "webglcontextrestored",
      this.boundOnRestored as EventListener,
    );

    this.initGlResources();
    this.resize();

    // ResizeObserver watches host so we update canvas backing buffer when
    // the modal resizes (e.g., fullscreen toggle, window resize).
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(host);
    } else {
      window.addEventListener("resize", this.boundResize);
    }
  }

  public addTarget(target: HTMLElement): void {
    if (this.destroyed) return;
    this.targets.add(target);
    // Hide DOM image targets while canvas displays pixels. Custom render
    // nodes shouldn't reach here (router routes them to CssBackend), but
    // be defensive.
    if (target instanceof HTMLImageElement) {
      this.hideTarget(target);
    }
  }

  public removeTarget(target: HTMLElement): void {
    if (!this.targets.has(target)) return;
    this.targets.delete(target);
    this.restoreTarget(target);
  }

  public hasTarget(target: HTMLElement): boolean {
    return this.targets.has(target);
  }

  public async setImageSource(
    source: HTMLImageElement | ImageBitmap | null,
  ): Promise<void> {
    if (this.destroyed || !this.gl) return;
    if (!source) {
      this.hasTexture = false;
      this.clear();
      return;
    }

    if (source instanceof HTMLImageElement) {
      // Wait for decode if needed.
      if (!source.complete || source.naturalWidth === 0) {
        await new Promise<void>((resolve, reject) => {
          const onLoad = () => {
            source.removeEventListener("load", onLoad);
            source.removeEventListener("error", onError);
            resolve();
          };
          const onError = () => {
            source.removeEventListener("load", onLoad);
            source.removeEventListener("error", onError);
            reject(new Error("Image failed to load"));
          };
          source.addEventListener("load", onLoad);
          source.addEventListener("error", onError);
        });
      }
      this.imageWidth = source.naturalWidth;
      this.imageHeight = source.naturalHeight;
    } else {
      // ImageBitmap
      this.imageWidth = source.width;
      this.imageHeight = source.height;
    }

    this.uploadTexture(source);
    this.draw();
  }

  public applyTransform(
    state: TransformState,
    _transition: TransitionMode,
  ): void {
    // Stage 3: snap-to-state. Stage 5 may interpolate via RAF.
    this.lastState = { ...state };
    this.draw();
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener("resize", this.boundResize);

    if (this.canvas) {
      this.canvas.removeEventListener(
        "webglcontextlost",
        this.boundOnLost as EventListener,
      );
      this.canvas.removeEventListener(
        "webglcontextrestored",
        this.boundOnRestored as EventListener,
      );
    }

    // Restore visibility of any DOM targets we hid.
    for (const t of this.targets) this.restoreTarget(t);
    this.targets.clear();

    this.releaseGlResources();

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    this.gl = null;
    this.host = null;
    this.hasTexture = false;
  }

  // ---------- internals ----------

  private boundResize = () => this.resize();

  private initGlResources(): void {
    const gl = this.gl;
    if (!gl) return;
    this.program = createImageProgram(gl);
    this.aPositionLoc = gl.getAttribLocation(this.program, "a_position");
    this.aTexcoordLoc = gl.getAttribLocation(this.program, "a_texcoord");
    this.uMatrixLoc = gl.getUniformLocation(this.program, "u_matrix");
    this.uTextureLoc = gl.getUniformLocation(this.program, "u_texture");

    // Quad in unit-image-space: (-0.5, -0.5) to (+0.5, +0.5). The vertex
    // shader scales by image dimensions via the matrix.
    this.posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
      ]),
      gl.STATIC_DRAW,
    );

    // UVs (Y flipped because GL textures load with Y-up by default; flipping
    // here keeps texImage2D source orientation matching CSS Y-down).
    this.uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]),
      gl.STATIC_DRAW,
    );

    gl.clearColor(0, 0, 0, 0);
  }

  private releaseGlResources(): void {
    const gl = this.gl;
    if (!gl) return;
    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }
    if (this.posBuffer) {
      gl.deleteBuffer(this.posBuffer);
      this.posBuffer = null;
    }
    if (this.uvBuffer) {
      gl.deleteBuffer(this.uvBuffer);
      this.uvBuffer = null;
    }
    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
  }

  private resize(): void {
    if (!this.canvas || !this.host || !this.gl) return;
    const dpr = Math.min(
      this.dprCap,
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
    );
    const cssW = this.host.clientWidth;
    const cssH = this.host.clientHeight;
    const bufW = Math.max(1, Math.round(cssW * dpr));
    const bufH = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== bufW) this.canvas.width = bufW;
    if (this.canvas.height !== bufH) this.canvas.height = bufH;
    this.gl.viewport(0, 0, bufW, bufH);
    if (this.hasTexture) this.draw();
  }

  private uploadTexture(source: HTMLImageElement | ImageBitmap): void {
    const gl = this.gl;
    if (!gl) return;

    if (!this.canHandleSize(this.imageWidth, this.imageHeight)) {
      // Caller should have routed away from us; render nothing.
      this.hasTexture = false;
      return;
    }

    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }
    const tex = gl.createTexture();
    if (!tex) return;
    this.texture = tex;
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Avoid Y-flip in pixel store; we account for orientation in the UV
    // buffer above. premultiply alpha to match canvas2d defaults.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      source as unknown as TexImageSource,
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const filter = this.filtering === "nearest" ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);

    this.hasTexture = true;
  }

  private clear(): void {
    const gl = this.gl;
    if (!gl) return;
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  private draw(): void {
    const gl = this.gl;
    if (!gl || !this.canvas || !this.program || !this.hasTexture) {
      if (gl) this.clear();
      return;
    }

    // Compute matrix in CSS pixel space, then map to clip space.
    // Quad is in unit space (-0.5..+0.5), so first scale by image size in
    // CSS pixels, then by user transform, then clip-space conversion.
    const cssW = this.canvas.width; // backing buffer (DPR'd) — viewport uses these
    const cssH = this.canvas.height;
    const cssWidthCss = this.host?.clientWidth ?? cssW;
    const cssHeightCss = this.host?.clientHeight ?? cssH;

    const fit = Math.min(
      cssWidthCss / this.imageWidth,
      cssHeightCss / this.imageHeight,
    );
    const fittedW = this.imageWidth * fit;
    const fittedH = this.imageHeight * fit;

    const { translateX, translateY, scale, rotation } = this.lastState;

    // Build column-major mat3 (WebGL uniformMatrix3fv expects column-major).
    //
    // The 2D affine [a c tx; b d ty] represents: x' = a*x + c*y + tx,
    //                                            y' = b*x + d*y + ty.
    //
    // Composition order (vertex flow, right-to-left in matrix algebra):
    //   M = clip * T_user * R_user * S_user * S_fit * v_unit
    //
    // We build it by starting with S_fit*S_user, then left-multiplying R,
    // then left-multiplying T, then left-multiplying clip-space scale.

    // 1) S_fit * S_user (combined): scale by (fittedW*scale, fittedH*scale)
    let a = fittedW * scale;
    let b = 0;
    let c = 0;
    let d = fittedH * scale;
    let tx = 0;
    let ty = 0;

    // 2) Left-multiply by rotation R = [[cs,-sn,0],[sn,cs,0],[0,0,1]].
    //    new_a = cs*a - sn*b, etc.  (CSS Y-down: positive degrees = CW visually.)
    const rad = (rotation * Math.PI) / 180;
    const cs = Math.cos(rad);
    const sn = Math.sin(rad);
    const ra = cs * a - sn * b;
    const rb = sn * a + cs * b;
    const rc = cs * c - sn * d;
    const rd = sn * c + cs * d;
    const rtx = cs * tx - sn * ty;
    const rty = sn * tx + cs * ty;
    a = ra;
    b = rb;
    c = rc;
    d = rd;
    tx = rtx;
    ty = rty;

    // 3) Left-multiply by translation T_user. For pure translation, only
    //    tx/ty change.
    tx += translateX;
    ty += translateY;

    // 4) Left-multiply by clip-space scale: x*=2/cssW, y*=-2/cssH (Y flip).
    const sx = 2 / cssWidthCss;
    const sy = -2 / cssHeightCss;
    a *= sx;
    b *= sy;
    c *= sx;
    d *= sy;
    tx *= sx;
    ty *= sy;

    // mat3 column-major: [a c tx; b d ty; 0 0 1]
    const matrix = new Float32Array([a, b, 0, c, d, 0, tx, ty, 1]);

    gl.useProgram(this.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.enableVertexAttribArray(this.aPositionLoc);
    gl.vertexAttribPointer(this.aPositionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.enableVertexAttribArray(this.aTexcoordLoc);
    gl.vertexAttribPointer(this.aTexcoordLoc, 2, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix3fv(this.uMatrixLoc, false, matrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uTextureLoc, 0);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private hideTarget(target: HTMLElement): void {
    if (this.hiddenStyles.has(target)) return;
    this.hiddenStyles.set(target, target.style.visibility);
    // visibility:hidden (not display:none) keeps layout / naturalSize
    // measurable, which `computeContentBounds` and others rely on.
    target.style.visibility = "hidden";
  }

  private restoreTarget(target: HTMLElement): void {
    const prev = this.hiddenStyles.get(target);
    if (prev === undefined) return;
    target.style.visibility = prev;
    this.hiddenStyles.delete(target);
  }

  private handleContextLost(e: Event): void {
    e.preventDefault(); // required to allow restoration
    this.hasTexture = false;
    this.texture = null;
    this.program = null;
    this.posBuffer = null;
    this.uvBuffer = null;
    this.opts.onContextLost?.();
  }

  private handleContextRestored(): void {
    if (!this.gl || this.destroyed) return;
    this.initGlResources();
    this.opts.onContextRestored?.();
    // Texture must be re-uploaded by caller; we can't synthesize the source.
  }
}
