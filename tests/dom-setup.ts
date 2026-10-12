// Set up the document before React DOM is imported so onChange uses browser events.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost:3000",
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  HTMLDialogElement: dom.window.HTMLDialogElement,
});
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
class Pointer extends dom.window.MouseEvent {
  pointerType: string;
  constructor(
    type: string,
    options: MouseEventInit & { pointerType?: string } = {},
  ) {
    super(type, options);
    this.pointerType = options.pointerType || "mouse";
  }
}
Object.defineProperty(dom.window, "PointerEvent", { value: Pointer });
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
dom.window.HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
};
let reduced = false;
export function setReducedMotion(value: boolean) {
  reduced = value;
}
Object.defineProperty(dom.window, "matchMedia", {
  value: () => ({
    matches: reduced,
    addEventListener() {},
    removeEventListener() {},
  }),
});
