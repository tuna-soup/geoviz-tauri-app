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
      <div class="group">
        <strong>Seismic</strong>
        <button id="toggle-wiggle">Switch To Wiggles</button>
        <button id="seismic-mode-cursor">Seismic Cursor Mode</button>
        <button id="seismic-toggle-crosshair">Toggle Seismic Crosshair</button>
      </div>
      <div class="group">
        <strong>Correlation</strong>
        <button id="zoom-corr-in">Zoom Correlation In</button>
        <button id="zoom-corr-out">Zoom Correlation Out</button>
        <button id="corr-mode-cursor">Correlation Cursor Mode</button>
        <button id="corr-mode-top-edit">Correlation Top Edit Mode</button>
        <button id="corr-mode-lasso">Correlation Lasso Mode</button>
        <button id="corr-toggle-crosshair">Toggle Correlation Crosshair</button>
      </div>
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
seismicHost.tabIndex = 0;
corrHost.tabIndex = 0;

let wiggle = false;
document.querySelector<HTMLButtonElement>("#toggle-wiggle")?.addEventListener("click", (event) => {
  wiggle = !wiggle;
  seismicController.setDisplayTransform({ renderMode: wiggle ? "wiggle" : "heatmap" });
  if (event.currentTarget instanceof HTMLButtonElement) {
    event.currentTarget.textContent = wiggle ? "Switch To Heatmap" : "Switch To Wiggles";
  }
});
document.querySelector<HTMLButtonElement>("#seismic-mode-cursor")?.addEventListener("click", () => {
  seismicController.setPrimaryMode("cursor");
});
document.querySelector<HTMLButtonElement>("#seismic-toggle-crosshair")?.addEventListener("click", () => {
  seismicController.toggleCrosshair();
});
document.querySelector<HTMLButtonElement>("#zoom-corr-in")?.addEventListener("click", () => corrController.zoomVertical(1.25));
document.querySelector<HTMLButtonElement>("#zoom-corr-out")?.addEventListener("click", () => corrController.zoomVertical(0.8));
document.querySelector<HTMLButtonElement>("#corr-mode-cursor")?.addEventListener("click", () => {
  corrController.setPrimaryMode("cursor");
});
document.querySelector<HTMLButtonElement>("#corr-mode-top-edit")?.addEventListener("click", () => {
  corrController.setPrimaryMode("topEdit");
});
document.querySelector<HTMLButtonElement>("#corr-mode-lasso")?.addEventListener("click", () => {
  corrController.setPrimaryMode("lassoSelect");
});
document.querySelector<HTMLButtonElement>("#corr-toggle-crosshair")?.addEventListener("click", () => {
  corrController.toggleCrosshair();
});

seismicHost.addEventListener("focus", () => seismicController.focus());
seismicHost.addEventListener("blur", () => seismicController.blur());
corrHost.addEventListener("focus", () => corrController.focus());
corrHost.addEventListener("blur", () => corrController.blur());

seismicHost.addEventListener("pointermove", (event) => {
  const point = toLocalPoint(seismicHost, event);
  seismicController.updatePointer(point.x, point.y, seismicHost.clientWidth, seismicHost.clientHeight);
  const probe = seismicController.getState().probe;
  if (probe) {
    readout.textContent = `Seismic trace ${probe.traceIndex}, sample ${probe.sampleIndex}, amplitude ${probe.amplitude.toFixed(4)}`;
  }
});
seismicHost.addEventListener("pointerdown", () => seismicHost.focus());
seismicHost.addEventListener("pointerleave", () => seismicController.clearPointer());

corrHost.addEventListener("pointermove", (event) => {
  const point = toCorrelationLocalPoint(corrHost, event);
  corrController.handlePointerMove(point.x, point.y, corrHost.clientWidth, corrHost.clientHeight);
  const probe = corrController.getState().probe;
  if (probe) {
    readout.textContent = `${probe.wellName} ${probe.trackTitle} depth ${probe.panelDepth.toFixed(1)} native ${probe.nativeDepth.toFixed(1)}`;
  }
});
corrHost.addEventListener("pointerdown", (event) => {
  corrHost.focus();
  corrHost.setPointerCapture(event.pointerId);
  const point = toCorrelationLocalPoint(corrHost, event);
  corrController.handlePointerDown(point.x, point.y, corrHost.clientWidth, corrHost.clientHeight);
});
corrHost.addEventListener("pointerup", (event) => {
  if (corrHost.hasPointerCapture(event.pointerId)) {
    corrHost.releasePointerCapture(event.pointerId);
  }
  corrController.handlePointerUp();
});
corrHost.addEventListener("pointerleave", () => corrController.clearPointer());
corrHost.addEventListener("keydown", (event) => {
  corrController.handleKeyDown(event.key);
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
