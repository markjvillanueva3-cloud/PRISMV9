/**
 * NXOpenAssemblyDrawingEngine.test.ts — U-CAD-APP-18 (PHASE-48)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  NXOpenAssemblyDrawingEngine,
  type NXAssemblyTransport,
  type NXDrawingTransport,
  type NXAssemblyDrawingClock,
  type NXComponent,
  type NXAssemblyConstraint,
  type NXDrawing,
  type NXDrawingView,
  type NXDimension,
  type NXAnnotation,
  type NXTransform,
  type NXPoint3D,
  type NXPoint2D,
} from "../engines/NXOpenAssemblyDrawingEngine.js";

function makeClock(): NXAssemblyDrawingClock & { tick(): void } {
  let t = new Date("2026-04-22T00:00:00Z").getTime();
  return {
    now: () => new Date(t).toISOString(),
    tick: () => { t += 1000; },
  };
}

function makeTransform(): NXTransform {
  return {
    origin: { x: 0, y: 0, z: 0 },
    orientation: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    scale: 1,
  };
}

function makeComponent(id: string, name: string): NXComponent {
  return {
    componentId: id,
    displayName: name,
    partFile: `/parts/${name}.prt`,
    status: "loaded",
    transform: makeTransform(),
    isSuppressed: false,
    quantityInBom: 1,
  };
}

function makeConstraint(id: string, type: NXAssemblyConstraint["constraintType"]): NXAssemblyConstraint {
  return {
    constraintId: id,
    constraintType: type,
    geometry1: { componentId: "c1", geometryTag: "face1", geometryType: "face" },
    geometry2: { componentId: "c2", geometryTag: "face2", geometryType: "face" },
    isActive: true,
    status: "satisfied",
  };
}

function makeDrawing(id: string, name: string): NXDrawing {
  return {
    drawingId: id,
    drawingName: name,
    sourceAssembly: "/assembly.prt",
    sheets: [{
      sheetId: "sheet-1",
      sheetNumber: 1,
      sheetName: "Sheet 1",
      size: "A3",
      width: 420,
      height: 297,
      scale: "1:1",
      projection: "third_angle",
      units: "millimeters",
    }],
    views: [],
    dimensions: [],
    annotations: [],
    createdAt: "2026-04-22T00:00:00Z",
    modifiedAt: "2026-04-22T00:00:00Z",
  };
}

function makeView(id: string, type: NXDrawingView["viewType"]): NXDrawingView {
  return {
    viewId: id,
    viewName: `View ${id}`,
    viewType: type,
    sheetId: "sheet-1",
    anchor: { x: 100, y: 100 },
    scale: 1,
    hiddenLinesVisible: false,
    tangentEdgesVisible: false,
    silhouetteEdgesVisible: true,
    renderStyle: "hidden_line",
    isUpToDate: true,
  };
}

function makeDimension(id: string, type: NXDimension["dimensionType"]): NXDimension {
  return {
    dimensionId: id,
    dimensionType: type,
    viewId: "view-1",
    value: 25.4,
    displayValue: "25.4",
    textPosition: { x: 50, y: 50 },
    arrowStyle: "arrow",
    isPrimary: true,
    associatedGeometry: ["edge1"],
  };
}

function makeAnnotation(id: string, type: NXAnnotation["annotationType"]): NXAnnotation {
  return {
    annotationId: id,
    annotationType: type,
    viewId: "view-1",
    position: { x: 60, y: 60 },
  };
}

function makeAssemblyTransport(): NXAssemblyTransport {
  let componentCounter = 0;
  let constraintCounter = 0;

  return {
    addComponent: vi.fn((tag, partFile, name, transform, refset) => makeComponent(`comp-${++componentCounter}`, name)),
    removeComponent: vi.fn(() => true),
    replaceComponent: vi.fn((tag, id, newFile) => makeComponent(id, "Replaced")),
    suppressComponent: vi.fn(() => true),
    unsuppressComponent: vi.fn(() => true),

    addConstraint: vi.fn((tag, type) => makeConstraint(`const-${++constraintCounter}`, type)),
    removeConstraint: vi.fn(() => true),
    editConstraint: vi.fn(() => true),

    positionComponent: vi.fn(() => true),
    repositionComponent: vi.fn(() => true),

    getComponents: vi.fn(() => [makeComponent("c1", "Part1"), makeComponent("c2", "Part2")]),
    getConstraints: vi.fn(() => [makeConstraint("const1", "touch_align")]),
    checkInterference: vi.fn(() => [{
      component1: "c1",
      component2: "c2",
      interferenceType: "hard" as const,
      volume: 125.5,
      centroid: { x: 10, y: 10, z: 10 },
      depth: 2.5,
    }]),
    getMassProperties: vi.fn(() => ({
      mass: 2.5,
      volume: 1000000,
      surfaceArea: 60000,
      centroid: { x: 50, y: 50, z: 50 },
      momentsOfInertia: { ixx: 1e6, iyy: 1e6, izz: 1e6, ixy: 0, ixz: 0, iyz: 0 },
      principalMoments: { i1: 1e6, i2: 1e6, i3: 1e6 },
      principalAxes: [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }],
      accuracy: 0.99,
    })),
    getBom: vi.fn((tag, type) => ({
      bomId: "bom-1",
      assemblyFile: "/assembly.prt",
      bomType: type,
      items: [
        { itemNumber: 1, partNumber: "P001", partName: "Part1", quantity: 2, unit: "EA", componentIds: ["c1", "c1b"], level: 0, isPhantom: false },
        { itemNumber: 2, partNumber: "P002", partName: "Part2", quantity: 1, unit: "EA", componentIds: ["c2"], level: 0, isPhantom: false },
      ],
      totalParts: 3,
      uniqueParts: 2,
      generatedAt: "2026-04-22T00:00:00Z",
    })),

    createPattern: vi.fn(() => ["pattern-1", "pattern-2", "pattern-3"]),
    mirrorAssembly: vi.fn(() => ["mirror-1", "mirror-2"]),

    createArrangement: vi.fn(() => "arrangement-1"),
    activateArrangement: vi.fn(() => true),

    explodeView: vi.fn(() => true),
    collapseView: vi.fn(() => true),
  };
}

function makeDrawingTransport(): NXDrawingTransport {
  let viewCounter = 0;
  let dimCounter = 0;
  let annotCounter = 0;

  return {
    createDrawing: vi.fn((name, sourceFile) => makeDrawing(`drw-${Date.now()}`, name)),
    addSheet: vi.fn((drwId, sheet) => ({
      sheetId: `sheet-${Date.now()}`,
      sheetNumber: sheet.sheetNumber ?? 2,
      sheetName: sheet.sheetName ?? "Sheet 2",
      size: sheet.size ?? "A3",
      width: sheet.width ?? 420,
      height: sheet.height ?? 297,
      scale: sheet.scale ?? "1:1",
      projection: sheet.projection ?? "third_angle",
      units: sheet.units ?? "millimeters",
    })),
    deleteSheet: vi.fn(() => true),

    addBaseView: vi.fn(() => makeView(`view-${++viewCounter}`, "base")),
    addProjectedView: vi.fn((drwId, parentId, dir) => makeView(`view-${++viewCounter}`, "projected")),
    addSectionView: vi.fn(() => makeView(`view-${++viewCounter}`, "section")),
    addDetailView: vi.fn(() => makeView(`view-${++viewCounter}`, "detail")),
    addIsometricView: vi.fn(() => makeView(`view-${++viewCounter}`, "isometric")),
    deleteView: vi.fn(() => true),
    moveView: vi.fn(() => true),
    updateView: vi.fn(() => true),

    addDimension: vi.fn((drwId, viewId, type) => makeDimension(`dim-${++dimCounter}`, type)),
    editDimension: vi.fn(() => true),
    deleteDimension: vi.fn(() => true),

    addAnnotation: vi.fn((drwId, viewId, type) => makeAnnotation(`ann-${++annotCounter}`, type)),
    addCenterline: vi.fn(() => makeAnnotation(`cl-${++annotCounter}`, "centerline")),
    addCenterMark: vi.fn(() => makeAnnotation(`cm-${++annotCounter}`, "center_mark")),
    addBalloon: vi.fn(() => makeAnnotation(`bl-${++annotCounter}`, "balloon")),
    addPartsList: vi.fn(() => `pl-${Date.now()}`),
    addTitleBlock: vi.fn(() => `tb-${Date.now()}`),

    getViews: vi.fn(() => [makeView("v1", "base"), makeView("v2", "projected")]),
    getDimensions: vi.fn(() => [makeDimension("d1", "horizontal"), makeDimension("d2", "vertical")]),
    getDrawing: vi.fn((id) => makeDrawing(id, "Drawing")),

    exportPdf: vi.fn((drwId, path) => path),
    exportDwg: vi.fn((drwId, path) => path),
  };
}

describe("NXOpenAssemblyDrawingEngine (U-CAD-APP-18)", () => {
  let eng: NXOpenAssemblyDrawingEngine;
  let clock: ReturnType<typeof makeClock>;
  let assemblyTransport: NXAssemblyTransport;
  let drawingTransport: NXDrawingTransport;

  beforeEach(() => {
    clock = makeClock();
    assemblyTransport = makeAssemblyTransport();
    drawingTransport = makeDrawingTransport();
    eng = new NXOpenAssemblyDrawingEngine({ assemblyTransport, drawingTransport, clock });
  });

  describe("assembly management", () => {
    beforeEach(() => {
      eng.setActiveAssembly("asm-001");
    });

    it("setActiveAssembly sets active assembly", () => {
      expect(eng.getActiveAssemblyTag()).toBe("asm-001");
    });

    it("addComponent adds component to assembly", () => {
      const result = eng.addComponent("/parts/bracket.prt", "Bracket", makeTransform());
      expect(result.success).toBe(true);
      expect(result.componentId).toBeDefined();
      expect(result.components).toHaveLength(1);
    });

    it("addComponent fails without active assembly", () => {
      eng.setActiveAssembly(null as unknown as string);
      const result = eng.addComponent("/parts/bracket.prt", "Bracket", makeTransform(), undefined, undefined);
      expect(result.success).toBe(false);
      expect(result.error).toContain("No active assembly");
    });

    it("removeComponent removes component", () => {
      const result = eng.removeComponent("c1");
      expect(result.success).toBe(true);
      expect(result.componentId).toBe("c1");
    });

    it("replaceComponent replaces component", () => {
      const result = eng.replaceComponent("c1", "/parts/new_bracket.prt");
      expect(result.success).toBe(true);
      expect(result.components?.[0].displayName).toBe("Replaced");
    });

    it("suppressComponent suppresses component", () => {
      const result = eng.suppressComponent("c1");
      expect(result.success).toBe(true);
    });

    it("unsuppressComponent unsuppresses component", () => {
      const result = eng.unsuppressComponent("c1");
      expect(result.success).toBe(true);
    });
  });

  describe("assembly constraints", () => {
    beforeEach(() => {
      eng.setActiveAssembly("asm-001");
    });

    it("addConstraint adds touch_align constraint", () => {
      const result = eng.addConstraint(
        "touch_align",
        { componentId: "c1", geometryTag: "face1" },
        { componentId: "c2", geometryTag: "face2" }
      );
      expect(result.success).toBe(true);
      expect(result.constraintId).toBeDefined();
    });

    it("addConstraint adds distance constraint with offset", () => {
      const result = eng.addConstraint(
        "distance",
        { componentId: "c1", geometryTag: "face1" },
        { componentId: "c2", geometryTag: "face2" },
        { offset: 10 }
      );
      expect(result.success).toBe(true);
      expect(assemblyTransport.addConstraint).toHaveBeenCalledWith(
        "asm-001", "distance",
        { componentId: "c1", geometryTag: "face1" },
        { componentId: "c2", geometryTag: "face2" },
        { offset: 10 }
      );
    });

    it("addConstraint adds fix constraint (single geometry)", () => {
      const result = eng.addConstraint(
        "fix",
        { componentId: "c1", geometryTag: "csys1" }
      );
      expect(result.success).toBe(true);
    });

    it("removeConstraint removes constraint", () => {
      const result = eng.removeConstraint("const1");
      expect(result.success).toBe(true);
    });

    it("editConstraint modifies constraint parameters", () => {
      const result = eng.editConstraint("const1", { offset: 15 });
      expect(result.success).toBe(true);
    });
  });

  describe("positioning", () => {
    beforeEach(() => {
      eng.setActiveAssembly("asm-001");
    });

    it("positionComponent sets absolute position", () => {
      const transform: NXTransform = {
        origin: { x: 100, y: 50, z: 0 },
        orientation: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        scale: 1,
      };
      const result = eng.positionComponent("c1", transform);
      expect(result.success).toBe(true);
    });

    it("repositionComponent applies delta", () => {
      const result = eng.repositionComponent("c1", { x: 10, y: 5, z: 0 });
      expect(result.success).toBe(true);
    });
  });

  describe("query and analysis", () => {
    beforeEach(() => {
      eng.setActiveAssembly("asm-001");
    });

    it("getComponents returns all components", () => {
      const result = eng.getComponents();
      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(2);
    });

    it("getComponents recursive option", () => {
      eng.getComponents(true);
      expect(assemblyTransport.getComponents).toHaveBeenCalledWith("asm-001", true);
    });

    it("getConstraints returns all constraints", () => {
      const result = eng.getConstraints();
      expect(result.success).toBe(true);
      expect(result.constraints).toHaveLength(1);
    });

    it("checkInterference finds interferences", () => {
      const result = eng.checkInterference();
      expect(result.success).toBe(true);
      expect(result.interferences).toHaveLength(1);
      expect(result.interferences?.[0].interferenceType).toBe("hard");
      expect(result.interferences?.[0].volume).toBe(125.5);
    });

    it("checkInterference with specific components", () => {
      eng.checkInterference(["c1", "c2"]);
      expect(assemblyTransport.checkInterference).toHaveBeenCalledWith("asm-001", ["c1", "c2"]);
    });

    it("getMassProperties returns mass data", () => {
      const result = eng.getMassProperties();
      expect(result.success).toBe(true);
      expect(result.massProperties?.mass).toBe(2.5);
      expect(result.massProperties?.volume).toBe(1000000);
    });

    it("getBom returns bill of materials", () => {
      const result = eng.getBom("single_level");
      expect(result.success).toBe(true);
      expect(result.bom?.items).toHaveLength(2);
      expect(result.bom?.totalParts).toBe(3);
      expect(result.bom?.uniqueParts).toBe(2);
    });

    it("getBom multi_level option", () => {
      eng.getBom("multi_level");
      expect(assemblyTransport.getBom).toHaveBeenCalledWith("asm-001", "multi_level");
    });
  });

  describe("patterns and mirror", () => {
    beforeEach(() => {
      eng.setActiveAssembly("asm-001");
    });

    it("createPattern creates linear pattern", () => {
      const result = eng.createPattern(["c1"], "linear", { xCount: 3, xSpacing: 50 });
      expect(result.success).toBe(true);
      expect(result.components?.length).toBe(3);
    });

    it("createPattern creates circular pattern", () => {
      const result = eng.createPattern(["c1"], "circular", { count: 6, angle: 60 });
      expect(result.success).toBe(true);
    });

    it("mirrorAssembly creates mirrored components", () => {
      const result = eng.mirrorAssembly(
        ["c1", "c2"],
        { origin: { x: 0, y: 0, z: 0 }, normal: { x: 1, y: 0, z: 0 } }
      );
      expect(result.success).toBe(true);
      expect(result.components?.length).toBe(2);
    });
  });

  describe("arrangements", () => {
    beforeEach(() => {
      eng.setActiveAssembly("asm-001");
    });

    it("createArrangement creates arrangement", () => {
      const result = eng.createArrangement("Exploded View");
      expect(result.success).toBe(true);
      expect(result.componentId).toBe("arrangement-1");
    });

    it("activateArrangement activates arrangement", () => {
      const result = eng.activateArrangement("arrangement-1");
      expect(result.success).toBe(true);
    });
  });

  describe("explode/collapse", () => {
    beforeEach(() => {
      eng.setActiveAssembly("asm-001");
    });

    it("explodeView explodes assembly", () => {
      const result = eng.explodeView(50);
      expect(result.success).toBe(true);
    });

    it("collapseView collapses assembly", () => {
      const result = eng.collapseView();
      expect(result.success).toBe(true);
    });
  });

  describe("drawing management", () => {
    it("createDrawing creates drawing", () => {
      const result = eng.createDrawing("Assembly Drawing", "/assembly.prt");
      expect(result.success).toBe(true);
      expect(result.drawingId).toBeDefined();
      expect(eng.getActiveDrawingId()).toBe(result.drawingId);
    });

    it("addSheet adds sheet to drawing", () => {
      eng.createDrawing("Drawing", "/part.prt");
      const result = eng.addSheet({ sheetNumber: 2, sheetName: "Details" });
      expect(result.success).toBe(true);
      expect(result.sheetId).toBeDefined();
    });

    it("deleteSheet deletes sheet", () => {
      eng.createDrawing("Drawing", "/part.prt");
      const result = eng.deleteSheet("sheet-1");
      expect(result.success).toBe(true);
    });

    it("operations fail without active drawing", () => {
      const result = eng.addSheet({ sheetNumber: 2 });
      expect(result.success).toBe(false);
      expect(result.error).toContain("No active drawing");
    });
  });

  describe("view creation", () => {
    beforeEach(() => {
      eng.createDrawing("Drawing", "/part.prt");
    });

    it("addBaseView creates base view", () => {
      const result = eng.addBaseView("sheet-1", { x: 200, y: 150 }, 1);
      expect(result.success).toBe(true);
      expect(result.viewId).toBeDefined();
      expect(result.views?.[0].viewType).toBe("base");
    });

    it("addProjectedView creates projected view", () => {
      const result = eng.addProjectedView("view-1", "top", { x: 200, y: 250 });
      expect(result.success).toBe(true);
      expect(result.views?.[0].viewType).toBe("projected");
    });

    it("addSectionView creates section view", () => {
      const result = eng.addSectionView(
        "view-1",
        "full",
        [{ x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }],
        { x: 0, y: 1, z: 0 },
        { x: 350, y: 150 },
        "A-A"
      );
      expect(result.success).toBe(true);
      expect(result.views?.[0].viewType).toBe("section");
    });

    it("addDetailView creates detail view", () => {
      const result = eng.addDetailView("view-1", { x: 50, y: 50 }, 25, { x: 300, y: 250 }, "B", 2);
      expect(result.success).toBe(true);
      expect(result.views?.[0].viewType).toBe("detail");
    });

    it("addIsometricView creates isometric view", () => {
      const result = eng.addIsometricView("sheet-1", { x: 350, y: 200 }, 0.5);
      expect(result.success).toBe(true);
      expect(result.views?.[0].viewType).toBe("isometric");
    });

    it("deleteView deletes view", () => {
      const result = eng.deleteView("view-1");
      expect(result.success).toBe(true);
    });

    it("moveView moves view", () => {
      const result = eng.moveView("view-1", { x: 250, y: 200 });
      expect(result.success).toBe(true);
    });

    it("updateView updates view", () => {
      const result = eng.updateView("view-1");
      expect(result.success).toBe(true);
    });
  });

  describe("dimensions", () => {
    beforeEach(() => {
      eng.createDrawing("Drawing", "/part.prt");
    });

    it("addDimension adds horizontal dimension", () => {
      const result = eng.addDimension("view-1", "horizontal", ["edge1", "edge2"], { x: 100, y: 80 });
      expect(result.success).toBe(true);
      expect(result.dimensionId).toBeDefined();
    });

    it("addDimension adds radial dimension", () => {
      const result = eng.addDimension("view-1", "radial", ["arc1"], { x: 60, y: 60 });
      expect(result.success).toBe(true);
    });

    it("editDimension modifies dimension", () => {
      const result = eng.editDimension("dim-1", { prefix: "2x" });
      expect(result.success).toBe(true);
    });

    it("deleteDimension removes dimension", () => {
      const result = eng.deleteDimension("dim-1");
      expect(result.success).toBe(true);
    });
  });

  describe("annotations", () => {
    beforeEach(() => {
      eng.createDrawing("Drawing", "/part.prt");
    });

    it("addAnnotation adds note", () => {
      const result = eng.addAnnotation("view-1", "note", { x: 50, y: 50 }, { text: "BREAK EDGES" });
      expect(result.success).toBe(true);
      expect(result.annotationId).toBeDefined();
    });

    it("addAnnotation adds surface finish symbol", () => {
      const result = eng.addAnnotation("view-1", "surface_finish", { x: 70, y: 70 });
      expect(result.success).toBe(true);
    });

    it("addCenterline adds centerline", () => {
      const result = eng.addCenterline("view-1", ["edge1", "edge2"]);
      expect(result.success).toBe(true);
    });

    it("addCenterMark adds center mark", () => {
      const result = eng.addCenterMark("view-1", "hole1");
      expect(result.success).toBe(true);
    });

    it("addBalloon adds balloon", () => {
      const result = eng.addBalloon("view-1", "c1", { x: 100, y: 100 }, { x: 80, y: 80 });
      expect(result.success).toBe(true);
    });

    it("addPartsList adds parts list", () => {
      const result = eng.addPartsList("sheet-1", "bom-1", { x: 300, y: 250 });
      expect(result.success).toBe(true);
    });

    it("addTitleBlock adds title block", () => {
      const result = eng.addTitleBlock("sheet-1", "ANSI_D");
      expect(result.success).toBe(true);
    });
  });

  describe("drawing query", () => {
    beforeEach(() => {
      eng.createDrawing("Drawing", "/part.prt");
    });

    it("getViews returns all views", () => {
      const result = eng.getViews();
      expect(result.success).toBe(true);
      expect(result.views).toHaveLength(2);
    });

    it("getViews filters by sheet", () => {
      eng.getViews("sheet-1");
      expect(drawingTransport.getViews).toHaveBeenCalledWith(expect.any(String), "sheet-1");
    });

    it("getDimensions returns all dimensions", () => {
      const result = eng.getDimensions();
      expect(result.success).toBe(true);
      expect(result.dimensions).toHaveLength(2);
    });

    it("getDimensions filters by view", () => {
      eng.getDimensions("view-1");
      expect(drawingTransport.getDimensions).toHaveBeenCalledWith(expect.any(String), "view-1");
    });

    it("getDrawing returns drawing data", () => {
      const result = eng.getDrawing();
      expect(result.success).toBe(true);
      expect(result.drawing).toBeDefined();
    });
  });

  describe("export", () => {
    beforeEach(() => {
      eng.createDrawing("Drawing", "/part.prt");
    });

    it("exportPdf exports to PDF", () => {
      const result = eng.exportPdf("/output/drawing.pdf");
      expect(result.success).toBe(true);
      expect(result.exportPath).toBe("/output/drawing.pdf");
    });

    it("exportPdf with options", () => {
      eng.exportPdf("/output/drawing.pdf", { resolution: 300, sheets: [1, 2] });
      expect(drawingTransport.exportPdf).toHaveBeenCalledWith(
        expect.any(String),
        "/output/drawing.pdf",
        { resolution: 300, sheets: [1, 2] }
      );
    });

    it("exportDwg exports to DWG", () => {
      const result = eng.exportDwg("/output/drawing.dwg");
      expect(result.success).toBe(true);
      expect(result.exportPath).toBe("/output/drawing.dwg");
    });

    it("exportDwg with version", () => {
      eng.exportDwg("/output/drawing.dwg", "2018");
      expect(drawingTransport.exportDwg).toHaveBeenCalledWith(
        expect.any(String),
        "/output/drawing.dwg",
        "2018"
      );
    });
  });

  describe("event subscriptions", () => {
    it("onEvent receives assembly events", () => {
      const events: Array<{ type: string }> = [];
      eng.onEvent((e) => events.push(e));

      eng.setActiveAssembly("asm-001");
      eng.addComponent("/part.prt", "Part", makeTransform());

      expect(events.some(e => e.type === "component_added")).toBe(true);
    });

    it("onEvent receives drawing events", () => {
      const events: Array<{ type: string }> = [];
      eng.onEvent((e) => events.push(e));

      eng.createDrawing("Drawing", "/part.prt");
      eng.addBaseView("sheet-1", { x: 100, y: 100 }, 1);

      expect(events.some(e => e.type === "drawing_created")).toBe(true);
      expect(events.some(e => e.type === "view_added")).toBe(true);
    });

    it("onEvent unsubscribe stops notifications", () => {
      const events: Array<{ type: string }> = [];
      const unsub = eng.onEvent((e) => events.push(e));
      unsub();

      eng.setActiveAssembly("asm-001");
      eng.addComponent("/part.prt", "Part", makeTransform());

      expect(events.length).toBe(0);
    });

    it("getEventLog filters by assemblyTag", () => {
      eng.setActiveAssembly("asm-001");
      eng.addComponent("/part.prt", "Part", makeTransform());
      eng.setActiveAssembly("asm-002");
      eng.addComponent("/part2.prt", "Part2", makeTransform());

      const events = eng.getEventLog({ assemblyTag: "asm-001" });
      expect(events.every(e => e.assemblyTag === "asm-001")).toBe(true);
    });

    it("getEventLog filters by drawingId", () => {
      eng.createDrawing("D1", "/part.prt");
      const d1 = eng.getActiveDrawingId();
      eng.createDrawing("D2", "/part2.prt");

      const events = eng.getEventLog({ drawingId: d1! });
      expect(events.every(e => e.drawingId === d1)).toBe(true);
    });

    it("clearEventLog clears all events", () => {
      eng.setActiveAssembly("asm-001");
      eng.addComponent("/part.prt", "Part", makeTransform());

      const count = eng.clearEventLog();
      expect(count).toBeGreaterThan(0);
      expect(eng.getEventLog().length).toBe(0);
    });
  });

  describe("cache management", () => {
    it("getCachedComponent returns cached component", () => {
      eng.setActiveAssembly("asm-001");
      eng.addComponent("/part.prt", "Part", makeTransform());
      eng.getComponents();

      const cached = eng.getCachedComponent("asm-001", "c1");
      expect(cached).toBeDefined();
    });

    it("getCachedDrawing returns cached drawing", () => {
      eng.createDrawing("Drawing", "/part.prt");
      const id = eng.getActiveDrawingId()!;

      const cached = eng.getCachedDrawing(id);
      expect(cached).toBeDefined();
    });

    it("clearCache clears all caches", () => {
      eng.setActiveAssembly("asm-001");
      eng.getComponents();
      eng.createDrawing("Drawing", "/part.prt");

      const counts = eng.clearCache();
      expect(counts.components).toBeGreaterThan(0);
      expect(counts.drawings).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("assembly operations fail without active assembly", () => {
      expect(eng.addComponent("/part.prt", "Part", makeTransform()).success).toBe(false);
      expect(eng.addConstraint("touch_align", { componentId: "c1", geometryTag: "f1" }).success).toBe(false);
      expect(eng.checkInterference().success).toBe(false);
    });

    it("drawing operations fail without active drawing", () => {
      expect(eng.addSheet({}).success).toBe(false);
      expect(eng.addBaseView("sheet-1", { x: 0, y: 0 }, 1).success).toBe(false);
      expect(eng.addDimension("view-1", "horizontal", [], { x: 0, y: 0 }).success).toBe(false);
    });

    it("subscriber errors do not block others", () => {
      const events: Array<{ type: string }> = [];
      eng.onEvent(() => { throw new Error("fail"); });
      eng.onEvent((e) => events.push(e));

      eng.setActiveAssembly("asm-001");
      eng.addComponent("/part.prt", "Part", makeTransform());

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    beforeEach(() => {
      eng.setActiveAssembly("asm-001");
      eng.createDrawing("Drawing", "/part.prt");
    });

    it("handles zero-distance constraint", () => {
      const result = eng.addConstraint(
        "distance",
        { componentId: "c1", geometryTag: "f1" },
        { componentId: "c2", geometryTag: "f2" },
        { offset: 0 }
      );
      expect(result.success).toBe(true);
    });

    it("handles negative offset", () => {
      const result = eng.addConstraint(
        "distance",
        { componentId: "c1", geometryTag: "f1" },
        { componentId: "c2", geometryTag: "f2" },
        { offset: -10 }
      );
      expect(result.success).toBe(true);
    });

    it("handles small scale views", () => {
      const result = eng.addBaseView("sheet-1", { x: 100, y: 100 }, 0.01);
      expect(result.success).toBe(true);
    });

    it("handles large scale views", () => {
      const result = eng.addBaseView("sheet-1", { x: 100, y: 100 }, 100);
      expect(result.success).toBe(true);
    });

    it("handles explicit assembly/drawing ID override", () => {
      const result = eng.addComponent("/part.prt", "Part", makeTransform(), undefined, "other-asm");
      expect(result.success).toBe(true);
      expect(assemblyTransport.addComponent).toHaveBeenCalledWith(
        "other-asm", "/part.prt", "Part", expect.any(Object), undefined
      );
    });
  });
});
