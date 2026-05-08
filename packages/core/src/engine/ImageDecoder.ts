/**
 * ImageDecoder
 * --------------------------------------------------------------------------
 * Async image decoding helper. Prefers `createImageBitmap` (off-main-thread
 * decode in modern browsers) so the UI thread doesn't stall on large blobs
 * before WebGL upload. Falls back gracefully to a regular HTMLImageElement
 * when ImageBitmap isn't available (older Safari, etc.).
 *
 * Output is a tagged union so callers can:
 *   - hand an ImageBitmap directly to `gl.texImage2D` (zero extra copy), or
 *   - assign HTMLImageElement.src to a regular <img> (CSS path).
 *
 * Networking / XHR is NOT this module's concern — it operates on already-
 * fetched Blob inputs, or on raw URLs when ImageBitmap is unavailable.
 */

export type DecodedImage =
  | { kind: "bitmap"; bitmap: ImageBitmap; width: number; height: number }
  | {
      kind: "element";
      image: HTMLImageElement;
      width: number;
      height: number;
    };

/**
 * Decode a Blob into the most efficient form available.
 *  - Modern browsers: `createImageBitmap` -> `ImageBitmap` (background thread)
 *  - Older browsers : fall back to HTMLImageElement + objectURL
 */
export async function decodeBlob(blob: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        kind: "bitmap",
        bitmap,
        width: bitmap.width,
        height: bitmap.height,
      };
    } catch (err) {
      // Some browsers throw on certain image formats; fall through to <img>.
      console.warn(
        "[viewer-pro] createImageBitmap failed, falling back to <img>:",
        err
      );
    }
  }
  return decodeViaImgElement(URL.createObjectURL(blob));
}

/** Decode by assigning to an <img> element and awaiting `decode()` / load. */
export async function decodeViaImgElement(
  url: string
): Promise<DecodedImage> {
  const image = new Image();
  // crossOrigin not set: blob URLs are same-origin; remote URLs that need
  // CORS are the caller's responsibility (network layer should set headers).
  image.src = url;
  if (typeof image.decode === "function") {
    try {
      await image.decode();
    } catch {
      await waitForImageLoad(image);
    }
  } else {
    await waitForImageLoad(image);
  }
  return {
    kind: "element",
    image,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

function waitForImageLoad(img: HTMLImageElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (img.complete && img.naturalWidth > 0) {
      resolve();
      return;
    }
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Image failed to load"));
    };
    const cleanup = () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };
    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
  });
}

/** Release ImageBitmap GPU/memory resources when no longer needed. */
export function disposeDecoded(decoded: DecodedImage | null): void {
  if (!decoded) return;
  if (decoded.kind === "bitmap") {
    try {
      decoded.bitmap.close();
    } catch {
      /* ignore */
    }
  }
}
