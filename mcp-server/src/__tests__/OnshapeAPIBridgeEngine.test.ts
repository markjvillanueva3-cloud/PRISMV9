/**
 * OnshapeAPIBridgeEngine.test.ts — U-CAD-APP-09 (PHASE-48)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  OnshapeAPIBridgeEngine,
  type OnshapeTransport,
  type OnshapeClock,
} from "../engines/OnshapeAPIBridgeEngine.js";
import type {
  OnshapeDocument,
  OnshapeWorkspace,
  OnshapeVersion,
  OnshapeElement,
  OnshapeFeature,
  OnshapePart,
  OnshapeAssemblyDefinition,
  OnshapeMassProperties,
  OnshapeBoundingBox,
  OnshapeConfiguration,
  OnshapeWebhook,
  OnshapeCommand,
} from "../schemas/cadOnshapeSchema.js";

function makeClock(): OnshapeClock & { tickMs(ms: number): void } {
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

function makeDocument(overrides: Partial<OnshapeDocument> = {}): OnshapeDocument {
  return {
    id: "doc-001",
    name: "Test Document",
    owner: { id: "user-001", name: "Test User", type: "user" },
    defaultWorkspace: { id: "ws-001", name: "Main" },
    createdAt: "2026-04-01T00:00:00Z",
    modifiedAt: "2026-04-22T00:00:00Z",
    isPublic: false,
    permission: "OWNER",
    ...overrides,
  };
}

function makeWorkspace(overrides: Partial<OnshapeWorkspace> = {}): OnshapeWorkspace {
  return {
    id: "ws-001",
    name: "Main",
    createdAt: "2026-04-01T00:00:00Z",
    modifiedAt: "2026-04-22T00:00:00Z",
    creator: { id: "user-001", name: "Test User" },
    ...overrides,
  };
}

function makeVersion(overrides: Partial<OnshapeVersion> = {}): OnshapeVersion {
  return {
    id: "v-001",
    name: "V1",
    createdAt: "2026-04-22T00:00:00Z",
    creator: { id: "user-001", name: "Test User" },
    microversion: "abc123",
    ...overrides,
  };
}

function makeElement(overrides: Partial<OnshapeElement> = {}): OnshapeElement {
  return {
    id: "elem-001",
    name: "Part Studio 1",
    elementType: "PARTSTUDIO",
    lengthUnits: "millimeter",
    ...overrides,
  };
}

function makeFeature(overrides: Partial<OnshapeFeature> = {}): OnshapeFeature {
  return {
    id: "feat-001",
    name: "Extrude 1",
    featureType: "extrude",
    suppressed: false,
    featureStatus: { status: "OK" },
    ...overrides,
  };
}

function makePart(overrides: Partial<OnshapePart> = {}): OnshapePart {
  return {
    partId: "part-001",
    name: "Part 1",
    bodyType: "solid",
    ...overrides,
  };
}

function makeAssemblyDef(): OnshapeAssemblyDefinition {
  return {
    rootAssembly: {
      occurrences: [{ path: ["occ-001"], fixed: true, hidden: false }],
      instances: [{ id: "inst-001", name: "Part 1", type: "Part", suppressed: false }],
    },
    parts: [makePart()],
    subAssemblies: [],
  };
}

function makeMassProps(overrides: Partial<OnshapeMassProperties> = {}): OnshapeMassProperties {
  return {
    mass: 1.5,
    volume: 0.0005,
    surfaceArea: 0.02,
    centroid: [0, 0, 25],
    inertia: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    principalInertia: [1, 1, 1],
    ...overrides,
  };
}

function makeBoundingBox(): OnshapeBoundingBox {
  return {
    minCorner: [0, 0, 0],
    maxCorner: [100, 50, 50],
  };
}

function makeConfig(): OnshapeConfiguration {
  return {
    configurationParameters: [
      {
        parameterId: "param-001",
        parameterName: "Length",
        parameterType: "QUANTITY",
        quantityType: "LENGTH",
        currentValue: 100,
        defaultValue: 100,
        rangeMin: 10,
        rangeMax: 500,
      },
    ],
    currentConfiguration: [{ parameterId: "param-001", parameterValue: 100 }],
  };
}

function makeWebhook(overrides: Partial<OnshapeWebhook> = {}): OnshapeWebhook {
  return {
    id: "wh-001",
    url: "https://example.com/webhook",
    events: ["onshape.model.changed"],
    isActive: true,
    createdAt: "2026-04-22T00:00:00Z",
    ...overrides,
  };
}

type TransportHandler = (cmd: OnshapeCommand, args: Record<string, unknown>) => {
  ok: boolean;
  result?: unknown;
  error?: string;
  statusCode?: number;
};

function makeTransport(handler: TransportHandler): OnshapeTransport {
  return { send: handler };
}

function successTransport(result: unknown): OnshapeTransport {
  return makeTransport(() => ({ ok: true, result }));
}

function errorTransport(error: string, statusCode = 400): OnshapeTransport {
  return makeTransport(() => ({ ok: false, error, statusCode }));
}

describe("OnshapeAPIBridgeEngine (U-CAD-APP-09)", () => {
  let eng: OnshapeAPIBridgeEngine;
  let clock: ReturnType<typeof makeClock>;

  describe("document operations", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("getDocument returns parsed document", () => {
      const doc = makeDocument();
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(doc), clock });
      const result = eng.getDocument("doc-001");
      expect(result.id).toBe("doc-001");
      expect(result.name).toBe("Test Document");
      expect(result.permission).toBe("OWNER");
    });

    it("listDocuments returns array", () => {
      const docs = [makeDocument(), makeDocument({ id: "doc-002", name: "Doc 2" })];
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(docs), clock });
      const result = eng.listDocuments();
      expect(result.length).toBe(2);
    });

    it("createDocument returns new document", () => {
      const doc = makeDocument({ name: "New Doc" });
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(doc), clock });
      const result = eng.createDocument("New Doc", { isPublic: false });
      expect(result.name).toBe("New Doc");
    });

    it("deleteDocument returns true on success", () => {
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(true), clock });
      expect(eng.deleteDocument("doc-001")).toBe(true);
    });

    it("throws on 404 error", () => {
      eng = new OnshapeAPIBridgeEngine({
        transport: errorTransport("Document not found", 404),
        clock,
      });
      expect(() => eng.getDocument("missing")).toThrow("Document not found (HTTP 404)");
    });
  });

  describe("workspace/version operations", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("getWorkspaces returns array", () => {
      const workspaces = [makeWorkspace(), makeWorkspace({ id: "ws-002", name: "Branch" })];
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(workspaces), clock });
      const result = eng.getWorkspaces("doc-001");
      expect(result.length).toBe(2);
      expect(result[1].name).toBe("Branch");
    });

    it("getVersions returns array", () => {
      const versions = [makeVersion(), makeVersion({ id: "v-002", name: "V2" })];
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(versions), clock });
      const result = eng.getVersions("doc-001");
      expect(result.length).toBe(2);
    });

    it("createVersion returns new version", () => {
      const version = makeVersion({ name: "Release 1.0" });
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(version), clock });
      const result = eng.createVersion("doc-001", "ws-001", "Release 1.0");
      expect(result.name).toBe("Release 1.0");
    });
  });

  describe("element operations", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("getElements returns array", () => {
      const elements = [
        makeElement(),
        makeElement({ id: "elem-002", name: "Assembly 1", elementType: "ASSEMBLY" }),
      ];
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(elements), clock });
      const result = eng.getElements("doc-001", "ws-001");
      expect(result.length).toBe(2);
      expect(result[1].elementType).toBe("ASSEMBLY");
    });
  });

  describe("part studio operations", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("getPartStudioFeatures returns features", () => {
      const features = [
        makeFeature(),
        makeFeature({ id: "feat-002", name: "Fillet 1", featureType: "fillet" }),
      ];
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(features), clock });
      const result = eng.getPartStudioFeatures("doc-001", "ws-001", "elem-001");
      expect(result.length).toBe(2);
      expect(result[0].featureType).toBe("extrude");
    });

    it("addFeature creates feature", () => {
      const feature = makeFeature({ name: "New Extrude" });
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(feature), clock });
      const result = eng.addFeature("doc-001", "ws-001", "elem-001", "extrude", { depth: 10 });
      expect(result.featureType).toBe("extrude");
    });

    it("updateFeature modifies feature", () => {
      const feature = makeFeature({ parameters: { depth: 20 } });
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(feature), clock });
      const result = eng.updateFeature("doc-001", "ws-001", "elem-001", "feat-001", { depth: 20 });
      expect(result.id).toBe("feat-001");
    });

    it("deleteFeature returns true", () => {
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(true), clock });
      expect(eng.deleteFeature("doc-001", "ws-001", "elem-001", "feat-001")).toBe(true);
    });

    it("getParts returns parts", () => {
      const parts = [makePart(), makePart({ partId: "part-002", name: "Part 2" })];
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(parts), clock });
      const result = eng.getParts("doc-001", "ws-001", "elem-001");
      expect(result.length).toBe(2);
    });

    it("getPartMetadata returns metadata", () => {
      const metadata = { partNumber: "PN-001", revision: "A" };
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(metadata), clock });
      const result = eng.getPartMetadata("doc-001", "ws-001", "elem-001", "part-001");
      expect(result.partNumber).toBe("PN-001");
    });
  });

  describe("assembly operations", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("getAssemblyDefinition returns definition", () => {
      const def = makeAssemblyDef();
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(def), clock });
      const result = eng.getAssemblyDefinition("doc-001", "ws-001", "elem-001");
      expect(result.rootAssembly.instances.length).toBe(1);
      expect(result.parts.length).toBe(1);
    });

    it("addMate creates mate", () => {
      const mate = { id: "mate-001", name: "Fastened 1" };
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(mate), clock });
      const result = eng.addMate("doc-001", "ws-001", "elem-001", "FASTENED", []);
      expect(result.id).toBe("mate-001");
    });
  });

  describe("mass properties / bounding box", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("getMassProperties returns physics data", () => {
      const props = makeMassProps();
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(props), clock });
      const result = eng.getMassProperties("doc-001", "ws-001", "elem-001");
      expect(result.mass).toBe(1.5);
      expect(result.centroid).toEqual([0, 0, 25]);
    });

    it("getBoundingBox returns bounds", () => {
      const box = makeBoundingBox();
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(box), clock });
      const result = eng.getBoundingBox("doc-001", "ws-001", "elem-001");
      expect(result.minCorner).toEqual([0, 0, 0]);
      expect(result.maxCorner).toEqual([100, 50, 50]);
    });
  });

  describe("configuration", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("getConfiguration returns params", () => {
      const config = makeConfig();
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(config), clock });
      const result = eng.getConfiguration("doc-001", "ws-001", "elem-001");
      expect(result.configurationParameters.length).toBe(1);
      expect(result.configurationParameters[0].parameterName).toBe("Length");
    });

    it("setConfiguration updates params", () => {
      const config = makeConfig();
      config.currentConfiguration[0].parameterValue = 200;
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(config), clock });
      const result = eng.setConfiguration("doc-001", "ws-001", "elem-001", [
        { parameterId: "param-001", parameterValue: 200 },
      ]);
      expect(result.currentConfiguration[0].parameterValue).toBe(200);
    });
  });

  describe("FeatureScript", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("evaluateFeatureScript returns result", () => {
      const fsResult = {
        result: { value: 42, serializationVersion: "1.0" },
        statusCode: 200,
        console: "Output: 42",
      };
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(fsResult), clock });
      const result = eng.evaluateFeatureScript(
        "doc-001",
        "ws-001",
        "elem-001",
        "return 42;",
      );
      expect(result.statusCode).toBe(200);
      expect(result.result.value).toBe(42);
    });
  });

  describe("export operations", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("exportPart returns translation ID", () => {
      const exportResult = { translationId: "trans-001", status: "ACTIVE" };
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(exportResult), clock });
      const result = eng.exportPart("doc-001", "ws-001", "elem-001", "part-001", {
        format: "STEP",
        units: "millimeter",
      });
      expect(result.translationId).toBe("trans-001");
    });

    it("exportAssembly returns translation ID", () => {
      const exportResult = { translationId: "trans-002", status: "ACTIVE" };
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(exportResult), clock });
      const result = eng.exportAssembly("doc-001", "ws-001", "elem-001", {
        format: "STEP",
        flattenAssemblies: true,
      });
      expect(result.translationId).toBe("trans-002");
    });
  });

  describe("webhooks", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("registerWebhook creates webhook", () => {
      const webhook = makeWebhook();
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(webhook), clock });
      const result = eng.registerWebhook("https://example.com/webhook", ["onshape.model.changed"]);
      expect(result.id).toBe("wh-001");
      expect(result.events).toContain("onshape.model.changed");
    });

    it("deleteWebhook returns true", () => {
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(true), clock });
      expect(eng.deleteWebhook("wh-001")).toBe(true);
    });

    it("listWebhooks returns array", () => {
      const webhooks = [makeWebhook(), makeWebhook({ id: "wh-002" })];
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(webhooks), clock });
      const result = eng.listWebhooks();
      expect(result.length).toBe(2);
    });
  });

  describe("thumbnail", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("getThumbnail returns URL", () => {
      const url = "https://cad.onshape.com/thumbnail/doc-001.png";
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(url), clock });
      const result = eng.getThumbnail("doc-001", "ws-001", "elem-001", { size: "300x170" });
      expect(result).toBe(url);
    });
  });

  describe("call logging", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("logs all API calls", () => {
      eng = new OnshapeAPIBridgeEngine({
        transport: makeTransport(() => {
          clock.tickMs(25);
          return { ok: true, result: makeDocument() };
        }),
        clock,
      });
      eng.getDocument("doc-001");
      eng.getDocument("doc-002");

      const log = eng.getCallLog();
      expect(log.length).toBe(2);
      expect(log[0].command).toBe("get_document");
      expect(log[0].durationMs).toBe(25);
    });

    it("clearCallLog resets", () => {
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(makeDocument()), clock });
      eng.getDocument("doc-001");
      eng.clearCallLog();
      expect(eng.getCallLog().length).toBe(0);
    });

    it("p50LatencyMs calculates median", () => {
      let callNum = 0;
      const latencies = [10, 20, 30, 40, 50];
      eng = new OnshapeAPIBridgeEngine({
        transport: makeTransport(() => {
          clock.tickMs(latencies[callNum++] ?? 30);
          return { ok: true, result: makeDocument() };
        }),
        clock,
      });
      for (let i = 0; i < 5; i++) eng.getDocument(`doc-${i}`);
      expect(eng.p50LatencyMs()).toBe(30);
    });

    it("p95LatencyMs calculates 95th percentile", () => {
      eng = new OnshapeAPIBridgeEngine({
        transport: makeTransport(() => {
          clock.tickMs(15);
          return { ok: true, result: makeDocument() };
        }),
        clock,
      });
      for (let i = 0; i < 20; i++) eng.getDocument(`doc-${i}`);
      expect(eng.p95LatencyMs()).toBe(15);
    });

    it("returns undefined with no calls", () => {
      eng = new OnshapeAPIBridgeEngine({ transport: successTransport(null), clock });
      expect(eng.p50LatencyMs()).toBeUndefined();
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("handles transport exception", () => {
      eng = new OnshapeAPIBridgeEngine({
        transport: {
          send: () => {
            throw new Error("Network error");
          },
        },
        clock,
      });
      expect(() => eng.getDocument("doc-001")).toThrow("Network error");
      expect(eng.getCallLog()[0].ok).toBe(false);
    });

    it("handles 401 unauthorized", () => {
      eng = new OnshapeAPIBridgeEngine({
        transport: errorTransport("Unauthorized", 401),
        clock,
      });
      expect(() => eng.getDocument("doc-001")).toThrow("Unauthorized (HTTP 401)");
    });

    it("handles 403 forbidden", () => {
      eng = new OnshapeAPIBridgeEngine({
        transport: errorTransport("Access denied", 403),
        clock,
      });
      expect(() => eng.listDocuments()).toThrow("Access denied (HTTP 403)");
    });

    it("handles 500 server error", () => {
      eng = new OnshapeAPIBridgeEngine({
        transport: errorTransport("Internal server error", 500),
        clock,
      });
      expect(() => eng.createDocument("Test")).toThrow("Internal server error (HTTP 500)");
    });

    it("handles missing error message", () => {
      eng = new OnshapeAPIBridgeEngine({
        transport: makeTransport(() => ({ ok: false })),
        clock,
      });
      expect(() => eng.getDocument("doc-001")).toThrow("Onshape API call failed");
    });
  });

  describe("rate limiting awareness", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("handles 429 rate limit", () => {
      eng = new OnshapeAPIBridgeEngine({
        transport: errorTransport("Rate limit exceeded", 429),
        clock,
      });
      expect(() => eng.listDocuments()).toThrow("Rate limit exceeded (HTTP 429)");
    });
  });
});
