export class ImagePreloader {
  private readonly cache = new Set<string>();

  public constructor(private readonly limit: number) {}

  public preload(src: string): void {
    if (!src || this.cache.has(src)) return;

    if (this.cache.size >= this.limit) {
      const oldest = this.cache.values().next().value;
      if (oldest) this.cache.delete(oldest);
    }

    this.cache.add(src);
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }

  public clear(): void {
    this.cache.clear();
  }
}
