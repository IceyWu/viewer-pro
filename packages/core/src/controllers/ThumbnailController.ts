import type { ViewerItem } from "../types";

interface ThumbnailControllerOptions {
  container: HTMLElement;
  host: HTMLElement;
  onSelect: (index: number) => void;
}

export class ThumbnailController {
  private lastActiveIndex = -1;
  private observer: IntersectionObserver | null = null;
  private readonly preloadRadius = 6;

  public constructor(private readonly options: ThumbnailControllerOptions) {}

  public update(images: ViewerItem[], currentIndex: number): void {
    const { container } = this.options;

    if (container.childNodes.length !== images.length) {
      this.observer?.disconnect();
      this.observer = this.createObserver();
      container.innerHTML = "";
      images.forEach((image, index) => {
        const thumbnail = document.createElement("div");
        thumbnail.className = `thumbnail${index === currentIndex ? " active" : ""}`;
        thumbnail.dataset.index = String(index);
        const thumbnailImage = document.createElement("img");
        thumbnailImage.dataset.src = image.thumbnail || image.src;
        thumbnailImage.alt = image.title || "";
        thumbnail.appendChild(thumbnailImage);
        thumbnail.addEventListener("click", () => this.options.onSelect(index));
        container.appendChild(thumbnail);
        this.observer?.observe(thumbnail);
      });
      this.lastActiveIndex = currentIndex;
    } else if (this.lastActiveIndex !== currentIndex) {
      const children = container.children;
      if (this.lastActiveIndex >= 0 && this.lastActiveIndex < children.length) {
        children[this.lastActiveIndex].classList.remove("active");
      }
      if (currentIndex >= 0 && currentIndex < children.length) {
        children[currentIndex].classList.add("active");
      }
      this.lastActiveIndex = currentIndex;
    }

    this.loadAround(currentIndex);
    this.scrollToActive(currentIndex);
  }

  public show(): void {
    this.options.container.classList.remove("hidden");
    this.options.container.classList.add("open");
    this.options.host.classList.remove("thumbs-hidden");
  }

  public hide(): void {
    this.options.container.classList.add("hidden");
    this.options.container.classList.remove("open");
    this.options.host.classList.add("thumbs-hidden");
  }

  public toggle(): void {
    if (this.options.container.classList.contains("hidden")) {
      this.show();
    } else {
      this.hide();
    }
  }

  public reset(): void {
    this.lastActiveIndex = -1;
    this.observer?.disconnect();
    this.observer = null;
  }

  private createObserver(): IntersectionObserver | null {
    if (!("IntersectionObserver" in window)) return null;
    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          this.loadThumbnail(entry.target as HTMLElement);
        });
      },
      {
        root: this.options.container,
        rootMargin: "160px",
        threshold: 0.01,
      },
    );
  }

  private loadAround(currentIndex: number): void {
    const { container } = this.options;
    const start = Math.max(0, currentIndex - this.preloadRadius);
    const end = Math.min(
      container.children.length - 1,
      currentIndex + this.preloadRadius,
    );
    for (let index = start; index <= end; index += 1) {
      this.loadThumbnail(container.children[index] as HTMLElement);
    }
  }

  private loadThumbnail(thumbnail: HTMLElement): void {
    const image = thumbnail.querySelector("img");
    if (!image || image.src || !image.dataset.src) return;
    image.src = image.dataset.src;
    delete image.dataset.src;
    this.observer?.unobserve(thumbnail);
  }

  private scrollToActive(currentIndex: number): void {
    const { container } = this.options;
    if (currentIndex < 0 || currentIndex >= container.children.length) return;

    const activeThumbnail = container.children[currentIndex] as HTMLElement;
    if (!activeThumbnail) return;

    requestAnimationFrame(() => {
      activeThumbnail.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });
  }
}
