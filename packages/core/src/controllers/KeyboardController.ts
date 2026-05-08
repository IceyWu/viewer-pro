interface KeyboardControllerOptions {
  isEnabled: () => boolean;
  isActive: () => boolean;
  isInfoOpen: () => boolean;
  closeInfo: () => void;
  close: () => void;
  navigate: (direction: number) => void;
  zoomBy: (delta: number) => void;
  reset: () => void;
  toggleFullscreen: () => void;
  download: () => void;
  getZoomStep: () => number;
}

export class KeyboardController {
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.options.isEnabled()) return;
    if (!this.options.isActive()) return;

    switch (event.key) {
      case "Escape":
        if (this.options.isInfoOpen()) {
          this.options.closeInfo();
        } else {
          this.options.close();
        }
        break;
      case "ArrowLeft":
        this.options.navigate(-1);
        break;
      case "ArrowRight":
        this.options.navigate(1);
        break;
      case "+":
      case "=":
        this.options.zoomBy(this.options.getZoomStep());
        break;
      case "-":
        this.options.zoomBy(-this.options.getZoomStep());
        break;
      case "0":
        this.options.reset();
        break;
      case "f":
        this.options.toggleFullscreen();
        break;
      case "d":
        this.options.download();
        break;
    }
  };

  public constructor(private readonly options: KeyboardControllerOptions) {}

  public bind(): void {
    document.addEventListener("keydown", this.onKeyDown);
  }

  public destroy(): void {
    document.removeEventListener("keydown", this.onKeyDown);
  }
}
