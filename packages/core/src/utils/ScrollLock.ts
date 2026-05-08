let lockCount = 0;
let lockedScrollY = 0;
let previousBodyStyles: Partial<CSSStyleDeclaration> = {};

export class ScrollLock {
  private locked = false;

  public lock(): void {
    if (this.locked) return;
    this.locked = true;
    lockCount += 1;
    if (lockCount > 1) return;

    lockedScrollY = window.scrollY || document.documentElement.scrollTop;
    previousBodyStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };

    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
  }

  public unlock(): void {
    if (!this.locked) return;
    this.locked = false;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount > 0) return;

    document.body.style.position = previousBodyStyles.position || "";
    document.body.style.top = previousBodyStyles.top || "";
    document.body.style.left = previousBodyStyles.left || "";
    document.body.style.right = previousBodyStyles.right || "";
    document.body.style.width = previousBodyStyles.width || "";
    document.body.style.overflow = previousBodyStyles.overflow || "";
    window.scrollTo(0, lockedScrollY);

    lockedScrollY = 0;
    previousBodyStyles = {};
  }
}
