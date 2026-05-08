import type { ViewerItem } from "../types";

interface ThumbnailControllerOptions {
  container: HTMLElement;
  host: HTMLElement;
  onSelect: (index: number) => void;
}

export class ThumbnailController {
  private lastActiveIndex = -1;

  public constructor(private readonly options: ThumbnailControllerOptions) {}

  public update(images: ViewerItem[], currentIndex: number): void {
    const { container } = this.options;

    if (container.childNodes.length !== images.length) {
      container.innerHTML = "";
      images.forEach((image, index) => {
        const thumbnail = document.createElement("div");
        thumbnail.className = `thumbnail${index === currentIndex ? " active" : ""}`;
        const thumbnailImage = document.createElement("img");
        thumbnailImage.src = image.thumbnail || image.src;
        thumbnailImage.alt = image.title || "";
        thumbnail.appendChild(thumbnailImage);
        thumbnail.addEventListener("click", () => this.options.onSelect(index));
        container.appendChild(thumbnail);
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
