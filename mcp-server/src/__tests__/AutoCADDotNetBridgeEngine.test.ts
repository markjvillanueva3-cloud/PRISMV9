/**
 * AutoCADDotNetBridgeEngine.test.ts — U-CAD-APP-11 (PHASE-48)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AutoCADDotNetBridgeEngine,
  type AcadTransport,
  type AcadClock,
} from "../engines/AutoCADDotNetBridgeEngine.js";
import type {
  AcadDrawing,
  AcadLayer,
  AcadLine,
  AcadCircle,
  AcadPolyline,
  AcadText,
  AcadDimension,
  AcadHatch,
  AcadBlockDef,
  AcadBlockRef,
  AcadLispResult,
  AcadCommand,
} from "../schemas/cadAutoCADSchema.js";

function makeClock(): AcadClock & { tickMs(ms: number): void } {
  let mono = 1_000_000;
  let iso = new Date("2026-04-22T00:00:00Z").getTime();
  return {
    now: () => new Date(iso).toISOString(),
    monotonicMs: () => mono,
    tickMs: (ms: number) => {
      mono += ms;
      iso += ms;
    },
  };
}

function successTransport(result: unknown): AcadTransport {
  return {
    send: () => ({ ok: true, result }),
  };
}

function errorTransport(error: string, errorCode?: number): AcadTransport {
  return {
    send: () => ({ ok: false, error, errorCode }),
  };
}

function routingTransport(handlers: Partial<Record<AcadCommand, unknown>>): AcadTransport {
  return {
    send: (cmd: AcadCommand) => {
      if (cmd in handlers) {
        return { ok: true, result: handlers[cmd] };
      }
      return { ok: false, error: `Unhandled command: ${cmd}` };
    },
  };
}

function makeDrawing(overrides: Partial<AcadDrawing> = {}): AcadDrawing {
  return {
    path: "C:\\Drawings\\test.dwg",
    name: "test.dwg",
    version: "2024",
    isReadOnly: false,
    isModified: false,
    units: "Inches",
    layerCount: 5,
    entityCount: 100,
    blockCount: 10,
    ...overrides,
  };
}

function makeLayer(overrides: Partial<AcadLayer> = {}): AcadLayer {
  return {
    name: "Layer1",
    color: { colorIndex: 7 },
    linetype: "Continuous",
    lineweight: 0.25,
    isOff: false,
    isFrozen: false,
    isLocked: false,
    isPlottable: true,
    ...overrides,
  };
}

function makeLine(overrides: Partial<AcadLine> = {}): AcadLine {
  return {
    handle: "1A2",
    entityType: "LINE",
    layer: "0",
    startPoint: [0, 0, 0],
    endPoint: [100, 0, 0],
    visible: true,
    ...overrides,
  };
}

function makeCircle(overrides: Partial<AcadCircle> = {}): AcadCircle {
  return {
    handle: "1A3",
    entityType: "CIRCLE",
    layer: "0",
    center: [50, 50, 0],
    radius: 25,
    visible: true,
    ...overrides,
  };
}

function makePolyline(overrides: Partial<AcadPolyline> = {}): AcadPolyline {
  return {
    handle: "1A4",
    entityType: "LWPOLYLINE",
    layer: "0",
    vertices: [[0, 0], [100, 0], [100, 100], [0, 100]],
    closed: true,
    visible: true,
    ...overrides,
  };
}

function makeText(overrides: Partial<AcadText> = {}): AcadText {
  return {
    handle: "1A5",
    entityType: "TEXT",
    layer: "0",
    insertionPoint: [0, 0, 0],
    textString: "Sample Text",
    height: 0.125,
    rotation: 0,
    horizontalMode: "Left",
    verticalMode: "Baseline",
    visible: true,
    ...overrides,
  };
}

function makeDimension(overrides: Partial<AcadDimension> = {}): AcadDimension {
  return {
    handle: "1A6",
    entityType: "DIMENSION",
    layer: "Dimensions",
    dimensionType: "LINEAR",
    defPoint1: [0, 0, 0],
    defPoint2: [100, 0, 0],
    dimLinePoint: [50, 10, 0],
    measurement: 100,
    visible: true,
    ...overrides,
  };
}

function makeHatch(overrides: Partial<AcadHatch> = {}): AcadHatch {
  return {
    handle: "1A7",
    entityType: "HATCH",
    layer: "0",
    patternName: "ANSI31",
    patternScale: 1,
    patternAngle: 0,
    isSolid: false,
    boundaryHandles: ["1A4"],
    visible: true,
    ...overrides,
  };
}

function makeBlockDef(overrides: Partial<AcadBlockDef> = {}): AcadBlockDef {
  return {
    name: "Block1",
    basePoint: [0, 0, 0],
    description: "Test block",
    isAnonymous: false,
    isXref: false,
    entityCount: 5,
    ...overrides,
  };
}

function makeBlockRef(overrides: Partial<AcadBlockRef> = {}): AcadBlockRef {
  return {
    handle: "1A8",
    entityType: "INSERT",
    layer: "0",
    blockName: "Block1",
    insertionPoint: [0, 0, 0],
    scale: [1, 1, 1],
    rotation: 0,
    visible: true,
    ...overrides,
  };
}

function makeLispResult(overrides: Partial<AcadLispResult> = {}): AcadLispResult {
  return {
    expression: "(+ 1 2)",
    result: 3,
    resultType: "integer",
    executionTimeMs: 1,
    ...overrides,
  };
}

describe("AutoCADDotNetBridgeEngine (U-CAD-APP-11)", () => {
  let eng: AutoCADDotNetBridgeEngine;
  let clock: ReturnType<typeof makeClock>;

  beforeEach(() => {
    clock = makeClock();
  });

  describe("document operations", () => {
    it("openDrawing returns drawing info", () => {
      const drawing = makeDrawing();
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(drawing), clock });
      const result = eng.openDrawing("C:\\Drawings\\test.dwg");
      expect(result.name).toBe("test.dwg");
      expect(result.units).toBe("Inches");
    });

    it("openDrawing with readOnly option", () => {
      const drawing = makeDrawing({ isReadOnly: true });
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(drawing), clock });
      const result = eng.openDrawing("C:\\Drawings\\test.dwg", { readOnly: true });
      expect(result.isReadOnly).toBe(true);
    });

    it("saveDrawing returns true", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(true), clock });
      expect(eng.saveDrawing()).toBe(true);
    });

    it("closeDrawing returns true", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(true), clock });
      expect(eng.closeDrawing({ save: true })).toBe(true);
    });

    it("newDrawing creates new drawing", () => {
      const drawing = makeDrawing({ name: "Drawing1.dwg", entityCount: 0 });
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(drawing), clock });
      const result = eng.newDrawing();
      expect(result.entityCount).toBe(0);
    });

    it("getDrawingInfo returns current drawing", () => {
      const drawing = makeDrawing();
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(drawing), clock });
      const result = eng.getDrawingInfo();
      expect(result.layerCount).toBe(5);
    });
  });

  describe("entity operations", () => {
    it("createEntity creates a line", () => {
      const line = makeLine();
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(line), clock });
      const result = eng.createEntity("LINE", { startPoint: [0, 0, 0], endPoint: [100, 0, 0] });
      expect(result.entityType).toBe("LINE");
    });

    it("createEntity creates a circle", () => {
      const circle = makeCircle();
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(circle), clock });
      const result = eng.createEntity("CIRCLE", { center: [50, 50, 0], radius: 25 });
      expect(result.entityType).toBe("CIRCLE");
    });

    it("getEntity retrieves entity by handle", () => {
      const line = makeLine({ handle: "ABC123" });
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(line), clock });
      const result = eng.getEntity("ABC123");
      expect(result.handle).toBe("ABC123");
    });

    it("updateEntity modifies entity", () => {
      const line = makeLine({ endPoint: [200, 0, 0] });
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(line), clock });
      const result = eng.updateEntity("1A2", { endPoint: [200, 0, 0] });
      expect((result as AcadLine).endPoint).toEqual([200, 0, 0]);
    });

    it("deleteEntity returns true", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(true), clock });
      expect(eng.deleteEntity("1A2")).toBe(true);
    });

    it("listEntities returns entity array", () => {
      const entities = [makeLine(), makeCircle()];
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(entities), clock });
      const result = eng.listEntities();
      expect(result.length).toBe(2);
    });

    it("listEntities with filter", () => {
      const entities = [makeLine()];
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(entities), clock });
      const result = eng.listEntities({ entityTypes: ["LINE"], layers: ["0"] });
      expect(result.length).toBe(1);
      expect(result[0].entityType).toBe("LINE");
    });

    it("selectEntities returns handles", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(["1A2", "1A3"]), clock });
      const result = eng.selectEntities({ entityTypes: ["LINE", "CIRCLE"] });
      expect(result).toEqual(["1A2", "1A3"]);
    });
  });

  describe("layer operations", () => {
    it("createLayer creates new layer", () => {
      const layer = makeLayer({ name: "NewLayer" });
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(layer), clock });
      const result = eng.createLayer("NewLayer", { color: { colorIndex: 1 } });
      expect(result.name).toBe("NewLayer");
    });

    it("getLayer retrieves layer by name", () => {
      const layer = makeLayer();
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(layer), clock });
      const result = eng.getLayer("Layer1");
      expect(result.name).toBe("Layer1");
    });

    it("updateLayer modifies layer properties", () => {
      const layer = makeLayer({ isOff: true });
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(layer), clock });
      const result = eng.updateLayer("Layer1", { isOff: true });
      expect(result.isOff).toBe(true);
    });

    it("deleteLayer returns true", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(true), clock });
      expect(eng.deleteLayer("Layer1")).toBe(true);
    });

    it("listLayers returns layer array", () => {
      const layers = [makeLayer(), makeLayer({ name: "Layer2" })];
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(layers), clock });
      const result = eng.listLayers();
      expect(result.length).toBe(2);
    });
  });

  describe("block operations", () => {
    it("createBlock creates block definition", () => {
      const block = makeBlockDef();
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(block), clock });
      const result = eng.createBlock("Block1", ["1A2", "1A3"]);
      expect(result.name).toBe("Block1");
    });

    it("insertBlock creates block reference", () => {
      const blockRef = makeBlockRef();
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(blockRef), clock });
      const result = eng.insertBlock("Block1", [0, 0, 0]);
      expect(result.entityType).toBe("INSERT");
      expect(result.blockName).toBe("Block1");
    });

    it("insertBlock with scale and rotation", () => {
      const blockRef = makeBlockRef({ scale: [2, 2, 2], rotation: 45 });
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(blockRef), clock });
      const result = eng.insertBlock("Block1", [0, 0, 0], { scale: [2, 2, 2], rotation: 45 });
      expect(result.scale).toEqual([2, 2, 2]);
      expect(result.rotation).toBe(45);
    });

    it("explodeBlock returns entity handles", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(["1A2", "1A3", "1A4"]), clock });
      const result = eng.explodeBlock("1A8");
      expect(result.length).toBe(3);
    });

    it("getBlock retrieves block definition", () => {
      const block = makeBlockDef();
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(block), clock });
      const result = eng.getBlock("Block1");
      expect(result.entityCount).toBe(5);
    });

    it("listBlocks returns block definitions", () => {
      const blocks = [makeBlockDef(), makeBlockDef({ name: "Block2" })];
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(blocks), clock });
      const result = eng.listBlocks();
      expect(result.length).toBe(2);
    });
  });

  describe("dimension operations", () => {
    it("createDimension creates linear dimension", () => {
      const dim = makeDimension();
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(dim), clock });
      const result = eng.createDimension("LINEAR", [0, 0, 0], [100, 0, 0], [50, 10, 0]);
      expect(result.entityType).toBe("DIMENSION");
    });

    it("getDimension retrieves dimension", () => {
      const dim = makeDimension();
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(dim), clock });
      const result = eng.getDimension("1A6");
      expect((result as AcadDimension).measurement).toBe(100);
    });

    it("updateDimension modifies dimension", () => {
      const dim = makeDimension({ textOverride: "100.00 mm" });
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(dim), clock });
      const result = eng.updateDimension("1A6", { textOverride: "100.00 mm" });
      expect((result as AcadDimension).textOverride).toBe("100.00 mm");
    });
  });

  describe("text and hatch operations", () => {
    it("createText creates text entity", () => {
      const text = makeText();
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(text), clock });
      const result = eng.createText("Sample Text", [0, 0, 0], 0.125);
      expect(result.entityType).toBe("TEXT");
    });

    it("createHatch creates hatch entity", () => {
      const hatch = makeHatch();
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(hatch), clock });
      const result = eng.createHatch("ANSI31", ["1A4"]);
      expect(result.entityType).toBe("HATCH");
    });
  });

  describe("xref operations", () => {
    it("createXref attaches external reference", () => {
      const xref = makeBlockRef({ blockName: "ExternalDwg" });
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(xref), clock });
      const result = eng.createXref("C:\\Refs\\external.dwg", [0, 0, 0]);
      expect(result.entityType).toBe("INSERT");
    });

    it("reloadXref returns true", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(true), clock });
      expect(eng.reloadXref("ExternalDwg")).toBe(true);
    });

    it("detachXref returns true", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(true), clock });
      expect(eng.detachXref("ExternalDwg")).toBe(true);
    });
  });

  describe("AutoLISP operations", () => {
    it("evalLisp evaluates expression", () => {
      const result = makeLispResult();
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(result), clock });
      const lisp = eng.evalLisp("(+ 1 2)");
      expect(lisp.result).toBe(3);
      expect(lisp.resultType).toBe("integer");
    });

    it("evalLisp handles string result", () => {
      const result = makeLispResult({ expression: "(getvar \"DWGNAME\")", result: "test.dwg", resultType: "string" });
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(result), clock });
      const lisp = eng.evalLisp("(getvar \"DWGNAME\")");
      expect(lisp.resultType).toBe("string");
    });

    it("runCommand executes command", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(true), clock });
      expect(eng.runCommand("_.LINE 0,0 100,0 ")).toBe(true);
    });
  });

  describe("plot and export operations", () => {
    it("plotDrawing plots to device", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(true), clock });
      const result = eng.plotDrawing({
        device: "DWG To PDF.pc3",
        paperSize: "ANSI_A_(8.50_x_11.00_Inches)",
        plotArea: "Extents",
        scale: "Fit",
        orientation: "Landscape",
        centerPlot: true,
        lineweightScale: 1,
        plotOffset: [0, 0],
      });
      expect(result).toBe(true);
    });

    it("exportPdf creates PDF", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(true), clock });
      expect(eng.exportPdf("C:\\Output\\drawing.pdf")).toBe(true);
    });

    it("exportDwf creates DWF", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(true), clock });
      expect(eng.exportDwf("C:\\Output\\drawing.dwf")).toBe(true);
    });
  });

  describe("utility operations", () => {
    it("purge removes unused items", () => {
      const purgeResult = { purgedCount: 15, types: ["Layers", "Blocks", "Styles"] };
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(purgeResult), clock });
      const result = eng.purge();
      expect(result.purgedCount).toBe(15);
    });

    it("audit checks drawing integrity", () => {
      const auditResult = { errorCount: 2, fixedCount: 2 };
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(auditResult), clock });
      const result = eng.audit({ fixErrors: true });
      expect(result.fixedCount).toBe(2);
    });

    it("zoomExtents returns true", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(true), clock });
      expect(eng.zoomExtents()).toBe(true);
    });

    it("setUcs sets user coordinate system", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(true), clock });
      expect(eng.setUcs([0, 0, 0], [1, 0, 0], [0, 1, 0])).toBe(true);
    });

    it("getSystemVariable retrieves value", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport("test.dwg"), clock });
      expect(eng.getSystemVariable("DWGNAME")).toBe("test.dwg");
    });

    it("setSystemVariable sets value", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(true), clock });
      expect(eng.setSystemVariable("FILEDIA", 0)).toBe(true);
    });
  });

  describe("error handling", () => {
    it("throws on API error", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: errorTransport("File not found", 2), clock });
      expect(() => eng.openDrawing("nonexistent.dwg")).toThrow("File not found (code 2)");
    });

    it("throws on transport exception", () => {
      const transport: AcadTransport = {
        send: () => { throw new Error("COM error"); },
      };
      eng = new AutoCADDotNetBridgeEngine({ transport, clock });
      expect(() => eng.getDrawingInfo()).toThrow("COM error");
    });
  });

  describe("call logging", () => {
    it("logs all calls", () => {
      eng = new AutoCADDotNetBridgeEngine({
        transport: routingTransport({
          get_drawing_info: makeDrawing(),
          list_layers: [makeLayer()],
        }),
        clock,
      });

      eng.getDrawingInfo();
      clock.tickMs(10);
      eng.listLayers();

      const log = eng.getCallLog();
      expect(log.length).toBe(2);
      expect(log[0].command).toBe("get_drawing_info");
      expect(log[1].command).toBe("list_layers");
    });

    it("clearCallLog empties log", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(makeDrawing()), clock });
      eng.getDrawingInfo();
      eng.clearCallLog();
      expect(eng.getCallLog().length).toBe(0);
    });

    it("p50LatencyMs calculates median", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(makeDrawing()), clock });
      for (let i = 0; i < 10; i++) {
        clock.tickMs(i * 2);
        eng.getDrawingInfo();
      }
      expect(eng.p50LatencyMs()).toBeDefined();
    });

    it("p95LatencyMs calculates 95th percentile", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(makeDrawing()), clock });
      for (let i = 0; i < 20; i++) {
        clock.tickMs(i);
        eng.getDrawingInfo();
      }
      expect(eng.p95LatencyMs()).toBeDefined();
    });

    it("p50LatencyMs returns undefined when empty", () => {
      eng = new AutoCADDotNetBridgeEngine({ transport: successTransport(makeDrawing()), clock });
      expect(eng.p50LatencyMs()).toBeUndefined();
    });
  });
});
