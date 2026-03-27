import { createMockCorrelationPanel, createMockSection } from "@geoviz/data-models";
import { SeismicViewerController, WellCorrelationController } from "@geoviz/domain-geoscience";
import { MockCanvasRenderer, WellCorrelationCanvasRenderer } from "@geoviz/renderer";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("App root not found.");
}

app.innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <h1>geoviz tauri app</h1>
      <button id="toggle-wiggle">Switch To Wiggles</button>
      <button id="zoom-corr-in">Zoom Correlation In</button>
      <button id="zoom-corr-out">Zoom Correlation Out</button>
      <div class="readout" id="readout">Ready.</div>
    </aside>
    <main class="main">
      <div id="seismic" class="viewer"></div>
      <div id="correlation" class="viewer"></div>
    </main>
  </div>
`;

const seismicHost = document.querySelector<HTMLElement>("#seismic");
const corrHost = document.querySelector<HTMLElement>("#correlation");
const readout = document.querySelector<HTMLElement>("#readout");
if (!seismicHost || !corrHost || !readout) {
  throw new Error("Missing app nodes.");
}

const seismicController = new SeismicViewerController(new MockCanvasRenderer());
const corrController = new WellCorrelationController(new WellCorrelationCanvasRenderer());
seismicController.mount(seismicHost);
seismicController.setSection(createMockSection());
corrController.mount(corrHost);
corrController.setPanel(createMockCorrelationPanel());

let wiggle = false;
document.querySelector<HTMLButtonElement>("#toggle-wiggle")?.addEventListener("click", (event) => {
  wiggle = !wiggle;
  seismicController.setDisplayTransform({ renderMode: wiggle ? "wiggle" : "heatmap" });
  if (event.currentTarget instanceof HTMLButtonElement) {
    event.currentTarget.textContent = wiggle ? "Switch To Heatmap" : "Switch To Wiggles";
  }
});
document.querySelector<HTMLButtonElement>("#zoom-corr-in")?.addEventListener("click", () => corrController.zoomVertical(1.25));
document.querySelector<HTMLButtonElement>("#zoom-corr-out")?.addEventListener("click", () => corrController.zoomVertical(0.8));

seismicHost.addEventListener("pointermove", (event) => {
  const point = toLocalPoint(seismicHost, event);
  seismicController.updatePointer(point.x, point.y, seismicHost.clientWidth, seismicHost.clientHeight);
  const probe = seismicController.getState().probe;
  if (probe) {
    readout.textContent = `Seismic trace ${probe.traceIndex}, sample ${probe.sampleIndex}, amplitude ${probe.amplitude.toFixed(4)}`;
  }
});

corrHost.addEventListener("pointermove", (event) => {
  const point = toCorrelationLocalPoint(corrHost, event);
  corrController.updatePointer(point.x, point.y, corrHost.clientWidth, corrHost.clientHeight);
  const probe = corrController.getState().probe;
  if (probe) {
    readout.textContent = `${probe.wellName} ${probe.trackTitle} depth ${probe.panelDepth.toFixed(1)} native ${probe.nativeDepth.toFixed(1)}`;
  }
});
corrHost.addEventListener("wheel", (event) => {
  const scrollHost = getCorrelationScrollHost(corrHost);
  if (event.shiftKey) {
    scrollHost.scrollLeft += event.deltaY + event.deltaX;
    event.preventDefault();
    return;
  }
  if (event.ctrlKey || event.metaKey) {
    const point = toCorrelationLocalPoint(corrHost, event);
    const panelDepth = corrController.getPanelDepthAtViewY(point.y, corrHost.clientWidth, corrHost.clientHeight);
    if (panelDepth !== null) {
      corrController.zoomVerticalAround(panelDepth, event.deltaY < 0 ? 1.12 : 0.89);
      event.preventDefault();
    }
    return;
  }
  corrController.panVertical(event.deltaY * 0.35);
  event.preventDefault();
}, { passive: false });
corrHost.addEventListener("geoviz:correlation-viewport-request", (event) => {
  const detail = (event as CustomEvent<{ depthStart: number; depthEnd: number }>).detail;
  corrController.setViewport(detail);
});

function toLocalPoint(element: HTMLElement, event: PointerEvent): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function toCorrelationLocalPoint(
  element: HTMLElement,
  event: PointerEvent | WheelEvent
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  const scrollHost = getCorrelationScrollHost(element);
  return {
    x: event.clientX - rect.left + scrollHost.scrollLeft,
    y: event.clientY - rect.top
  };
}

function getCorrelationScrollHost(element: HTMLElement): HTMLElement {
  return element.querySelector<HTMLElement>(".geoviz-correlation-scroll-host") ?? element;
}
