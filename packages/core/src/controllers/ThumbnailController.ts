import type { ViewerItem } from "../types";

interface ThumbnailControllerOptions {
  container: HTMLElement;
  host: HTMLElement;
  onSelect: (index: number) => void;
}

const OVERSCAN = 5;

function getThumbnailPitch(): number {
  const mobile = window.matchMedia("(max-width: 768px)").matches;
  const width = mobile ? 64 : 72;
  const border = 4;
  const margin = mobile ? 8 : 12;
  return width + border + margin;
}

function shouldVirtualize(container: HTMLElement, imageCount: number): boolean {
  const mobile = window.matchMedia("(max-width: 768px)").matches;
  const estimatedWidth = mobile
    ? window.innerWidth
    : Math.max(320, window.innerWidth * 0.8);
  const visibleWidth = container.clientWidth || estimatedWidth;
  const perScreen = Math.max(1, Math.ceil(visibleWidth / getThumbnailPitch()));
  return imageCount > perScreen * 2;
}

export class ThumbnailController {
  private lastActiveIndex = -1;
  private lastImages: ViewerItem[] | null = null;
  private observer: IntersectionObserver | null = null;
  private renderedStart = 0;
  private virtualized = false;
  private scrollFrame = 0;
  private readonly onScroll = () => {
    if (this.scrollFrame) return;
    this.scrollFrame = requestAnimationFrame(() => {
      this.scrollFrame = 0;
      if (this.virtualized) this.renderWindow(this.lastActiveIndex, false);
      if (!this.observer) this.loadVisible();
    });
  };

  public constructor(private readonly options: ThumbnailControllerOptions) {
    options.container.addEventListener("scroll", this.onScroll, {
      passive: true,
    });
  }

  public update(images: ViewerItem[], currentIndex: number): void {
    const { container } = this.options;
    const indexChanged = this.lastActiveIndex !== currentIndex;
    const shouldUseVirtualList = shouldVirtualize(container, images.length);
    const needsRebuild =
      this.lastImages !== images ||
      this.virtualized !== shouldUseVirtualList;

    if (needsRebuild) {
      this.observer?.disconnect();
      this.observer = this.createObserver();
      this.virtualized = shouldUseVirtualList;
      this.lastImages = images;
      this.lastActiveIndex = currentIndex;
      if (this.virtualized) {
        this.renderWindow(currentIndex);
      } else {
        const fragment = document.createDocumentFragment();
        images.forEach((image, index) => {
          fragment.appendChild(this.createThumbnail(image, index, currentIndex));
        });
        container.replaceChildren(fragment);
        this.observeChildren();
        this.renderedStart = 0;
      }
    } else if (this.lastActiveIndex !== currentIndex) {
      this.setActive(this.lastActiveIndex, false);
      this.lastActiveIndex = currentIndex;
      this.setActive(currentIndex, true);
      if (this.virtualized) this.renderWindow(currentIndex);
    }

    if (!this.observer) {
      requestAnimationFrame(() => this.loadVisible());
    }
    if (needsRebuild || indexChanged) this.scrollToActive(currentIndex);
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
    if (this.options.container.classList.contains("hidden")) this.show();
    else this.hide();
  }

  public reset(): void {
    this.lastActiveIndex = -1;
    this.lastImages = null;
    this.renderedStart = 0;
    this.virtualized = false;
    if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
    this.scrollFrame = 0;
    this.observer?.disconnect();
    this.observer = null;
    this.options.container.replaceChildren();
  }

  private createObserver(): IntersectionObserver | null {
    if (!("IntersectionObserver" in window)) return null;
    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) this.loadThumbnail(entry.target as HTMLElement);
        });
      },
      { root: this.options.container, rootMargin: "0px 160px", threshold: 0.01 },
    );
  }

  private createThumbnail(
    image: ViewerItem,
    index: number,
    currentIndex: number,
  ): HTMLElement {
    const thumbnail = document.createElement("div");
    thumbnail.className = `thumbnail${index === currentIndex ? " active" : ""}`;
    thumbnail.dataset.index = String(index);
    const thumbnailImage = document.createElement("img");
    thumbnailImage.dataset.src = image.thumbnail || image.src;
    thumbnailImage.alt = image.title || "";
    thumbnail.appendChild(thumbnailImage);
    thumbnail.addEventListener("click", () => this.options.onSelect(index));
    return thumbnail;
  }

  private observeChildren(): void {
    if (!this.observer) return;
    for (const child of Array.from(this.options.container.children)) {
      if (!(child instanceof HTMLElement) || !child.dataset.index) continue;
      this.observer.observe(child);
    }
  }

  private renderWindow(currentIndex: number, keepActiveInWindow = true): void {
    const { container } = this.options;
    const images = this.lastImages;
    if (!images) return;
    const pitch = getThumbnailPitch();
    const visibleCount = Math.ceil(container.clientWidth / pitch) + OVERSCAN * 2;
    const start = this.virtualized
      ? Math.max(
          0,
          Math.min(
            images.length - visibleCount,
            Math.floor(container.scrollLeft / pitch) - OVERSCAN,
          ),
        )
      : 0;
    const targetStart = this.virtualized && keepActiveInWindow
      ? currentIndex < start || currentIndex >= start + visibleCount
        ? Math.max(0, Math.min(images.length - visibleCount, currentIndex - OVERSCAN))
        : start
      : start;
    const end = Math.min(images.length, targetStart + visibleCount);
    if (targetStart === this.renderedStart && container.children.length > 0) {
      this.setActive(currentIndex, true);
      return;
    }

    this.observer?.disconnect();
    this.observer = this.createObserver();
    const fragment = document.createDocumentFragment();
    if (targetStart > 0) fragment.appendChild(this.createSpacer(targetStart * pitch));
    for (let index = targetStart; index < end; index += 1) {
      fragment.appendChild(this.createThumbnail(images[index], index, currentIndex));
    }
    if (end < images.length) {
      fragment.appendChild(this.createSpacer((images.length - end) * pitch));
    }
    container.replaceChildren(fragment);
    this.renderedStart = targetStart;
    this.observeChildren();
  }

  private createSpacer(width: number): HTMLElement {
    const spacer = document.createElement("div");
    spacer.setAttribute("aria-hidden", "true");
    spacer.style.cssText = `flex: 0 0 ${width}px; width: ${width}px; pointer-events: none;`;
    return spacer;
  }

  private setActive(index: number, active: boolean): void {
    const node = this.options.container.querySelector<HTMLElement>(
      `.thumbnail[data-index="${index}"]`,
    );
    node?.classList.toggle("active", active);
  }

  private loadVisible(): void {
    const { container } = this.options;
    const viewport = container.getBoundingClientRect();
    const visible: HTMLElement[] = [];
    for (const node of Array.from(container.querySelectorAll<HTMLElement>(".thumbnail"))) {
      const rect = node.getBoundingClientRect();
      if (
        rect.right > viewport.left - 160 &&
        rect.left < viewport.right + 160 &&
        rect.bottom > viewport.top &&
        rect.top < viewport.bottom
      ) {
        visible.push(node);
      }
    }
    visible.forEach((thumbnail) => this.loadThumbnail(thumbnail));
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
    if (currentIndex < 0 || currentIndex >= (this.lastImages?.length ?? 0)) return;

    if (this.virtualized) {
      const pitch = getThumbnailPitch();
      const left = Math.max(0, currentIndex * pitch - (container.clientWidth - pitch) / 2);
      container.scrollTo({ left, behavior: "smooth" });
      return;
    }

    const activeThumbnail = container.querySelector<HTMLElement>(
      `.thumbnail[data-index="${currentIndex}"]`,
    );
    activeThumbnail?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }
}
