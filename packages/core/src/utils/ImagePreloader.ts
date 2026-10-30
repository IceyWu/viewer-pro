export class ImagePreloader {
  private readonly cache = new Map<string, HTMLImageElement | null>();

  public constructor(private readonly limit: number) {}

  public preload(src: string): void {
    if (!src || this.limit <= 0 || this.cache.has(src)) return;

    if (this.cache.size >= this.limit) {
      const oldest = this.cache.entries().next().value;
      if (oldest) {
        const [oldestSrc, oldestImage] = oldest;
        this.cache.delete(oldestSrc);
        if (oldestImage) {
          oldestImage.onload = null;
          oldestImage.onerror = null;
          if (!oldestImage.complete) oldestImage.removeAttribute("src");
        }
      }
    }

    const img = new Image();
    img.decoding = "async";
    img.fetchPriority = "low";
    img.onload = () => {
      if (this.cache.get(src) === img) this.cache.set(src, null);
      img.onload = null;
      img.onerror = null;
    };
    img.onerror = () => {
      if (this.cache.get(src) === img) this.cache.delete(src);
      img.onload = null;
      img.onerror = null;
    };
    this.cache.set(src, img);
    img.src = src;
  }

  public clear(): void {
    this.cache.forEach((image) => {
      if (!image) return;
      image.onload = null;
      image.onerror = null;
      if (!image.complete) image.removeAttribute("src");
    });
    this.cache.clear();
  }
}
