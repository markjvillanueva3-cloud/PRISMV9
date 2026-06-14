/**
 * HyperCADSElectrodeEngine.test.ts — CAD-FUSION-LIVE-MS0 / U-HCS-ELECTRODE-TEST
 *
 * Exercises catalog membership, schema validation, op-envelope serialization,
 * and end-to-end ship-through-bridge with a stub HyperCADSLiveBridgeEngine.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  HyperCADSElectrodeEngine,
  ELECTRODE_DESCRIPTIONS,
  ELECTRODE_ORBITS,
  HOLDER_LIBRARIES,
  HOLDER_Z_HEIGHTS_MM,
  PickHolderSchema,
  SetOrbitStrategySchema,
  SetDescriptionSchema,
  GenerateElectrodeSchema,
  ExportToEdmSchema,
  SetupClampingSchema,
  BurnSequenceSchema,
} from "../engines/HyperCADSElectrodeEngine.js";

// ── Stub bridge to capture executeRaw calls ──────────────────────────────────

interface StubExec {
  code: string;
  filename?: string;
  projectName?: string;
}

function makeStubBridge() {
  const calls: StubExec[] = [];
  const stub = {
    async executeRaw(code: string, params: { projectName?: string; filename?: string } = {}) {
      calls.push({ code, ...params });
      return {
        ok: true,
        opId: `stub-${calls.length}`,
        scriptText: code,
        durationMs: 1.0,
        outputFiles: [] as string[],
        warnings: [] as string[],
        sessionOpCount: calls.length,
      };
    },
  };
  return { stub, calls };
}

// ── Catalog tests ────────────────────────────────────────────────────────────

describe("HyperCADSElectrodeEngine — catalogs", () => {
  it("has exactly 9 electrode descriptions (matches electrode_descriptions.xml)", () => {
    expect(ELECTRODE_DESCRIPTIONS).toHaveLength(9);
    expect(ELECTRODE_DESCRIPTIONS).toContain("Core electrode");
    expect(ELECTRODE_DESCRIPTIONS).toContain("Cavity electrode");
    expect(ELECTRODE_DESCRIPTIONS).toContain("User defined electrode");
  });

  it("has exactly 11 orbit strategies (matches electrode_orbit.xml)", () => {
    expect(ELECTRODE_ORBITS).toHaveLength(11);
    expect(ELECTRODE_ORBITS).toContain("Sink");
    expect(ELECTRODE_ORBITS).toContain("Sink and shpere"); // vendor spelling preserved
    expect(ELECTRODE_ORBITS).toContain("ISOG");
  });

  it("has exactly 4 holder libraries (Erowa + System-3R, r + s)", () => {
    expect(HOLDER_LIBRARIES).toHaveLength(4);
    expect(HOLDER_LIBRARIES).toEqual(
      expect.arrayContaining(["Erowa_r", "Erowa_s", "System-3R_r", "System-3R_s"]),
    );
  });

  it("has 9 standard Z heights matching the hyperCAD-S electrode catalog", () => {
    expect(HOLDER_Z_HEIGHTS_MM).toEqual([20, 40, 60, 80, 100, 150, 200, 250, 300]);
  });

  it("exposes catalog accessors as read-only views", () => {
    const eng = new HyperCADSElectrodeEngine();
    expect(eng.listElectrodeDescriptions()).toEqual(ELECTRODE_DESCRIPTIONS);
    expect(eng.listOrbitStrategies()).toEqual(ELECTRODE_ORBITS);
    expect(eng.listHolderLibraries()).toEqual(HOLDER_LIBRARIES);
    expect(eng.listHolderZHeightsMm()).toEqual(HOLDER_Z_HEIGHTS_MM);
  });
});

// ── Schema tests ─────────────────────────────────────────────────────────────

describe("HyperCADSElectrodeEngine — schemas", () => {
  it("PickHolderSchema rejects unknown holder library", () => {
    const res = PickHolderSchema.safeParse({ library: "Acme_Vise" });
    expect(res.success).toBe(false);
  });

  it("PickHolderSchema rejects non-standard Z height", () => {
    const res = PickHolderSchema.safeParse({ library: "Erowa_s", zHeightMm: 77 });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toMatch(/non-standard Z height/);
    }
  });

  it("PickHolderSchema accepts the full Erowa_s spec", () => {
    const res = PickHolderSchema.safeParse({
      library: "Erowa_s",
      faceXmm: 35,
      faceYmm: 35,
      zHeightMm: 60,
      clamping: "000",
      principalOrientation: "X",
    });
    expect(res.success).toBe(true);
  });

  it("PickHolderSchema rejects malformed clamping code", () => {
    const res = PickHolderSchema.safeParse({ library: "Erowa_s", clamping: "abc" });
    expect(res.success).toBe(false);
  });

  it("SetOrbitStrategySchema rejects unknown orbit", () => {
    const res = SetOrbitStrategySchema.safeParse({ orbit: "Twirl" });
    expect(res.success).toBe(false);
  });

  it("SetOrbitStrategySchema enforces rough-then-finish ordering", () => {
    const res = SetOrbitStrategySchema.safeParse({
      orbit: "Sink",
      roughingUndersizeMm: 0.05,
      finishingUndersizeMm: 0.10, // finish > rough → invalid
    });
    expect(res.success).toBe(false);
  });

  it("SetOrbitStrategySchema accepts roughing ≥ finishing", () => {
    const res = SetOrbitStrategySchema.safeParse({
      orbit: "Sink",
      roughingUndersizeMm: 0.10,
      finishingUndersizeMm: 0.02,
    });
    expect(res.success).toBe(true);
  });

  it("SetDescriptionSchema rejects unknown electrode type", () => {
    const res = SetDescriptionSchema.safeParse({ description: "Wizard electrode" });
    expect(res.success).toBe(false);
  });

  it("GenerateElectrodeSchema applies sensible defaults", () => {
    const res = GenerateElectrodeSchema.parse({});
    expect(res.description).toBe("Core electrode");
    expect(res.holderLibrary).toBe("Erowa_s");
    expect(res.orbitStrategy).toBe("Sink");
    expect(res.undersizeMm).toBe(0.05);
    expect(res.material).toBe("Cu_OFHC");
  });

  it("ExportToEdmSchema requires electrodeId", () => {
    const res = ExportToEdmSchema.safeParse({});
    expect(res.success).toBe(false);
  });

  it("ExportToEdmSchema rejects unknown format", () => {
    const res = ExportToEdmSchema.safeParse({ electrodeId: "e1", format: "obj" });
    expect(res.success).toBe(false);
  });

  it("SetupClampingSchema rejects malformed clamping code", () => {
    const res = SetupClampingSchema.safeParse({ electrodeId: "e1", clampingCode: "00" });
    expect(res.success).toBe(false);
  });

  it("BurnSequenceSchema requires ≥1 electrode", () => {
    const res = BurnSequenceSchema.safeParse({ electrodeIds: [] });
    expect(res.success).toBe(false);
  });
});

// ── End-to-end op ship-through tests ─────────────────────────────────────────

describe("HyperCADSElectrodeEngine — ops", () => {
  let engine: HyperCADSElectrodeEngine;
  let stub: ReturnType<typeof makeStubBridge>;

  beforeEach(() => {
    stub = makeStubBridge();
    engine = new HyperCADSElectrodeEngine(stub.stub as never);
  });

  it("pickHolder ships an electrode_pick_block_holder envelope", async () => {
    const result = await engine.pickHolder({
      library: "Erowa_s",
      faceXmm: 35,
      faceYmm: 35,
      zHeightMm: 60,
    });
    expect(result.ok).toBe(true);
    expect(stub.calls).toHaveLength(1);
    expect(stub.calls[0].code).toContain("electrode_pick_block_holder");
    expect(stub.calls[0].code).toContain("Erowa_s");
    expect(stub.calls[0].code).toContain("import prism_hypercads_addin as addin");
  });

  it("pickHolder rejects non-standard Z height before shipping", async () => {
    await expect(
      engine.pickHolder({ library: "Erowa_s", zHeightMm: 77 } as never),
    ).rejects.toThrow();
    expect(stub.calls).toHaveLength(0);
  });

  it("setOrbitStrategy ships an electrode_set_orbit_strategy envelope", async () => {
    await engine.setOrbitStrategy({ orbit: "ISOG", undersizeMm: 0.03 });
    expect(stub.calls[0].code).toContain("electrode_set_orbit_strategy");
    expect(stub.calls[0].code).toContain("ISOG");
  });

  it("setDescription ships an electrode_set_description envelope", async () => {
    await engine.setDescription({ description: "Master electrode" });
    expect(stub.calls[0].code).toContain("Master electrode");
  });

  it("generateElectrode ships full electrode_generate envelope with defaults", async () => {
    await engine.generateElectrode({
      cavityBodyId: "cav-1",
      burnFaceIds: ["f1", "f2"],
    });
    expect(stub.calls[0].code).toContain("electrode_generate");
    expect(stub.calls[0].code).toContain("cav-1");
    expect(stub.calls[0].code).toContain("Core electrode");
    expect(stub.calls[0].code).toContain("Erowa_s");
    expect(stub.calls[0].code).toContain("Sink");
  });

  it("exportToEdm ships electrode_export_to_edm with format", async () => {
    await engine.exportToEdm({ electrodeId: "elec-001", format: "step" });
    expect(stub.calls[0].code).toContain("electrode_export_to_edm");
    expect(stub.calls[0].code).toContain("elec-001");
  });

  it("setupClamping ships electrode_clamping_setup with offsets", async () => {
    await engine.setupClamping({
      electrodeId: "elec-001",
      clampingCode: "001",
      offsetZmm: 2.5,
    });
    expect(stub.calls[0].code).toContain("electrode_clamping_setup");
    expect(stub.calls[0].code).toContain("\\\"clamping_code\\\":\\\"001\\\"");
  });

  it("burnSequence ships electrode_burn_sequence with order", async () => {
    await engine.burnSequence({
      electrodeIds: ["e1", "e2", "e3"],
      order: "depth_descending",
    });
    expect(stub.calls[0].code).toContain("electrode_burn_sequence");
    expect(stub.calls[0].code).toContain("depth_descending");
  });

  it("synthesizes a unique operationId per ship", async () => {
    await engine.setDescription({ description: "Core electrode" });
    await engine.setDescription({ description: "Cavity electrode" });
    const opId1 = stub.calls[0].filename!;
    const opId2 = stub.calls[1].filename!;
    expect(opId1).not.toEqual(opId2);
    expect(opId1).toContain("electrode-1-");
    expect(opId2).toContain("electrode-2-");
  });

  it("_resetForTests resets the op counter", async () => {
    await engine.setDescription({ description: "Core electrode" });
    engine._resetForTests();
    await engine.setDescription({ description: "Core electrode" });
    expect(stub.calls[1].filename).toContain("electrode-1-");
  });

  it("generated Python script imports the host add-in by absolute path", async () => {
    await engine.pickHolder({ library: "Erowa_s" });
    const code = stub.calls[0].code;
    expect(code).toContain("'H:/PRISM/resources/OPEN MIND/hyperCAD-S'");
    expect(code).toContain("import prism_hypercads_addin as addin");
    expect(code).toContain("addin.dispatch(_state, _envelope)");
  });
});

// ── Adversarial / variability tests ──────────────────────────────────────────

describe("HyperCADSElectrodeEngine — adversarial", () => {
  let engine: HyperCADSElectrodeEngine;
  let stub: ReturnType<typeof makeStubBridge>;

  beforeEach(() => {
    stub = makeStubBridge();
    engine = new HyperCADSElectrodeEngine(stub.stub as never);
  });

  it.each(ELECTRODE_DESCRIPTIONS)("accepts all 9 electrode descriptions: %s", async (desc) => {
    const result = await engine.setDescription({ description: desc });
    expect(result.ok).toBe(true);
  });

  it.each(ELECTRODE_ORBITS)("accepts all 11 orbit strategies: %s", async (orbit) => {
    const result = await engine.setOrbitStrategy({ orbit });
    expect(result.ok).toBe(true);
  });

  it.each(HOLDER_LIBRARIES)("accepts all 4 holder libraries: %s", async (library) => {
    const result = await engine.pickHolder({ library });
    expect(result.ok).toBe(true);
  });

  it.each(HOLDER_Z_HEIGHTS_MM)("accepts standard Z height: %dmm", async (zHeightMm) => {
    const result = await engine.pickHolder({ library: "Erowa_s", zHeightMm });
    expect(result.ok).toBe(true);
  });
});
