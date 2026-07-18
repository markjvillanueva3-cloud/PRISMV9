/**
 * CADMultiSystemAIProducerEngine — multi-CAD unified producer tests.
 */

import { describe, it, expect } from "vitest";
import {
  BRIDGE_NAME_BY_SYSTEM,
  CADMultiSystemAIProducerEngine,
  DEFAULT_BRIDGE_SELECTOR,
  SupportedProducerSystem,
  cadMultiSystemAIProducerEngine,
  isSupportedProducerSystem,
} from "../engines/CADMultiSystemAIProducerEngine.js";

const stubOrchestrator = {
  // Orchestrator produces CANONICAL ops; the producer translates them per-system via nativize.
  draw: () => [
    { op: "feature_extrude", args: { depth: 10 } },
    { op: "feature_hole",    args: { diameter: 6, depth: 8 } },
  ],
};

const hyperCADOrchestrator = {
  draw: () => [
    { op: "sketch_circle",    args: { diameter: 12 } },
    { op: "feature_extrude",  args: { depth: 8 } },
  ],
};

describe("SupportedProducerSystem (user priority order)", () => {
  it("lists 5 priority systems including hyperCAD and mastercam", () => {
    expect(SupportedProducerSystem.includes("hypercads")).toBe(true);
    expect(SupportedProducerSystem.includes("fusion360")).toBe(true);
    expect(SupportedProducerSystem.includes("solidworks")).toBe(true);
    expect(SupportedProducerSystem.includes("inventor")).toBe(true);
    expect(SupportedProducerSystem.includes("mastercam")).toBe(true);
  });

  it("does NOT list Esprit (no live-bridge engine on disk)", () => {
    expect(SupportedProducerSystem.includes("esprit" as never)).toBe(false);
  });

  it("does NOT list user-hold systems (FreeCAD, Siemens NX)", () => {
    expect(SupportedProducerSystem.includes("freecad" as never)).toBe(false);
    expect(SupportedProducerSystem.includes("nx" as never)).toBe(false);
  });
});

describe("isSupportedProducerSystem", () => {
  it("true for each priority system", () => {
    for (const s of SupportedProducerSystem) expect(isSupportedProducerSystem(s)).toBe(true);
  });
  it("false for unsupported", () => {
    expect(isSupportedProducerSystem("freecad")).toBe(false);
    expect(isSupportedProducerSystem("")).toBe(false);
  });
});

describe("BRIDGE_NAME_BY_SYSTEM mapping", () => {
  it("each priority system maps to a concrete live-bridge engine name", () => {
    expect(BRIDGE_NAME_BY_SYSTEM.get("hypercads")).toBe("HyperCADSLiveBridgeEngine");
    expect(BRIDGE_NAME_BY_SYSTEM.get("fusion360")).toBe("Fusion360LiveBridgeEngine");
    expect(BRIDGE_NAME_BY_SYSTEM.get("solidworks")).toBe("SolidWorksLiveBridgeEngine");
    expect(BRIDGE_NAME_BY_SYSTEM.get("inventor")).toBe("InventorCADExecutionBridge");
    expect(BRIDGE_NAME_BY_SYSTEM.get("mastercam")).toBe("MastercamCADExecutionBridge");
  });

  it("DEFAULT_BRIDGE_SELECTOR throws on unknown system (R12 fail-loud)", () => {
    expect(() => DEFAULT_BRIDGE_SELECTOR("nonexistent" as never)).toThrow(/no live bridge/);
  });
});

describe("producePart — happy path (fusion360 via adapter)", () => {
  it("emits canonicalOps + nativeOps + bridgeName + schemaVersion=1", async () => {
    const eng = new CADMultiSystemAIProducerEngine();
    const plan = await eng.producePart(
      "fusion360",
      { description: "12mm boss, 8mm tall, with 6mm hole" },
      { orchestrator: stubOrchestrator },
    );
    expect(plan.system).toBe("fusion360");
    expect(plan.schemaVersion).toBe(1);
    expect(plan.bridgeName).toBe("Fusion360LiveBridgeEngine");
    expect(plan.canonicalOps.length).toBe(2);
    expect(plan.nativeOps.length).toBe(2);
  });
});

describe("producePart — hyperCAD path (canonical ops route directly)", () => {
  it("hyperCAD nativeOps equal canonicalOps (no adapter translation needed)", async () => {
    const plan = await cadMultiSystemAIProducerEngine.producePart(
      "hypercads",
      { description: "Ø12 boss, 8mm tall" },
      { orchestrator: hyperCADOrchestrator },
    );
    expect(plan.nativeOps).toEqual(plan.canonicalOps);
    expect(plan.bridgeName).toBe("HyperCADSLiveBridgeEngine");
  });
});

describe("producePart — mastercam path (canonical ops route directly)", () => {
  it("mastercam bypasses the adapter (Mastercam bridge consumes canonical ops)", async () => {
    const plan = await cadMultiSystemAIProducerEngine.producePart(
      "mastercam",
      { description: "fastener clearance hole" },
      { orchestrator: hyperCADOrchestrator },
    );
    expect(plan.nativeOps).toEqual(plan.canonicalOps);
    expect(plan.bridgeName).toBe("MastercamCADExecutionBridge");
  });
});

describe("producePart — R12 fail-loud failure modes", () => {
  it("throws on unsupported CAD system (escapes Esprit-like aspirational systems)", async () => {
    await expect(cadMultiSystemAIProducerEngine.producePart("esprit" as never, { description: "x" }, { orchestrator: stubOrchestrator }))
      .rejects.toThrow(/unsupported CAD system/);
  });

  it("throws on empty intent description (perception layer didn't produce an intent)", async () => {
    await expect(cadMultiSystemAIProducerEngine.producePart("fusion360", { description: "" }, { orchestrator: stubOrchestrator }))
      .rejects.toThrow(/non-empty string/);
  });

  it("throws on null intent (adversarial input floor per build-enforce R3)", async () => {
    await expect(cadMultiSystemAIProducerEngine.producePart("fusion360", null as never, { orchestrator: stubOrchestrator }))
      .rejects.toThrow();
  });
});

describe("produceAssembly — multi-part orchestration", () => {
  it("3-part assembly produces 3 part plans with consistent system + bridge", async () => {
    const plan = await cadMultiSystemAIProducerEngine.produceAssembly(
      "solidworks",
      {
        description: "bracket assembly",
        parts: [
          { description: "base plate" },
          { description: "vertical rib" },
          { description: "boss with hole" },
        ],
      },
      { orchestrator: stubOrchestrator },
    );
    expect(plan.partPlans.length).toBe(3);
    expect(plan.bridgeName).toBe("SolidWorksLiveBridgeEngine");
    for (const p of plan.partPlans) {
      expect(p.system).toBe("solidworks");
      expect(p.canonicalOps.length).toBeGreaterThan(0);
    }
  });

  it("throws on empty parts array (assembly with no parts is a bug)", async () => {
    await expect(cadMultiSystemAIProducerEngine.produceAssembly(
      "fusion360",
      { description: "x", parts: [] },
      { orchestrator: stubOrchestrator },
    )).rejects.toThrow(/non-empty array/);
  });
});

describe("variability floor — 3 CAD systems × producePart", () => {
  for (const sys of ["fusion360", "solidworks", "inventor"] as const) {
    it(`${sys} produces a plan with the correct bridge name`, async () => {
      const plan = await cadMultiSystemAIProducerEngine.producePart(
        sys,
        { description: "test part" },
        { orchestrator: stubOrchestrator },
      );
      expect(plan.bridgeName).toBe(BRIDGE_NAME_BY_SYSTEM.get(sys));
    });
  }
});

describe("class wrapper + summary", () => {
  it("summary lists 5 systems + bridgeMap with all entries", () => {
    const s = cadMultiSystemAIProducerEngine.summary();
    expect(s.schemaVersion).toBe(1);
    expect(s.supportedSystems.length).toBe(5);
    expect(Object.keys(s.bridgeMap).length).toBe(5);
  });

  it("bridgeFor returns the right name per system", () => {
    expect(cadMultiSystemAIProducerEngine.bridgeFor("hypercads")).toBe("HyperCADSLiveBridgeEngine");
    expect(cadMultiSystemAIProducerEngine.bridgeFor("inventor")).toBe("InventorCADExecutionBridge");
  });

  it("injected bridgeSelector overrides default (test isolation)", async () => {
    const plan = await cadMultiSystemAIProducerEngine.producePart(
      "fusion360",
      { description: "x" },
      { orchestrator: stubOrchestrator, bridgeSelector: () => "MockBridge" },
    );
    expect(plan.bridgeName).toBe("MockBridge");
  });
});
