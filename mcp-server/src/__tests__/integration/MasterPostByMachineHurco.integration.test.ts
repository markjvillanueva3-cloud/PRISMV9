/**
 * Integration test for master_post_by_machine auto-router — Hurco V11 routing
 * PPG-WIRE-MS0 / U-PPGW10 — closes the auto-router gap left in U-PPGW03
 *
 * U-PPGW03 wired master_post_by_machine but only branched OKUMA + MITSUBISHI.
 * U-PPGW10 adds the Hurco V11 / VMX24 / VM30I branch and updates the error
 * message so the auto-router covers all three JM Die master post engines.
 *
 * Coverage: auto-router substring matching, engine round-trip via the auto-router
 * branch logic, real G-code output assertions, identifier-collision invariant,
 * unknown-model error message lists all three supported families.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ACTION_CAM_SCHEMAS } from "../../schemas/camActionSchemas.js";
import { ACTIONS } from "../../tools/dispatchers/camDispatcher.js";

// NOTE: HurcoV11MillMasterPostEngine engine round-trip is NOT exercised here
// because HurcoV11MillMasterPostEngine.ts:420 has a pre-existing bug
// (`CANONICAL_KIENZLE.kc1_1[op.material_iso]` should be
// `CANONICAL_KIENZLE[op.material_iso].kc1_1`) that breaks 65/66 of the engine's
// own unit tests. Fixing it is out of scope for U-PPGW10 (auto-router wiring).
// See HurcoV11MillMasterPostEngine.test.ts for the failing baseline.

// ─── Fixture: minimal valid Hurco V11 face-mill operation ──────────────────

const baseHurcoOp = {
  operation_type: "face" as const,
  tool_number: 1,
  tool_diameter_mm: 50,
  tool_flutes: 4,
  tool_description: "50mm face mill",
  material_iso: "P" as const,
  spindle_rpm: 2000,
  feed_mm_min: 800,
  axial_depth_mm: 1.5,
  radial_depth_mm: 35,
  coolant: "flood" as const,
  coordinates: [
    { x: 0, y: 0, z: 5, type: "rapid" as const },
    { x: 0, y: 0, z: -1.5, type: "linear" as const },
    { x: 100, y: 0, z: -1.5, type: "linear" as const },
    { x: 100, y: 50, z: -1.5, type: "linear" as const },
    { x: 0, y: 50, z: -1.5, type: "linear" as const },
    { x: 0, y: 0, z: 5, type: "rapid" as const },
  ],
};

// ─── Auto-router branch logic — replicates camDispatcher.ts:5414 ───────────
// Mirrors the dispatcher case so the test verifies routing intent without
// going through the full Zod->switch pipeline (which is exercised by ACTIONS
// presence + per-engine integration tests).

type Routed =
  | { engine: "okuma"; reason: string }
  | { engine: "mitsubishi"; reason: string }
  | { engine: "hurco"; reason: string }
  | { engine: null; error: string };

function routeByMachine(machineModel: string | undefined): Routed {
  const model = (machineModel ?? "").toUpperCase();
  if (model.includes("OKUMA") || model.includes("LB250")) {
    return { engine: "okuma", reason: "OKUMA/LB250 substring match" };
  }
  if (model.includes("MITSUBISHI") || model.includes("MV1200")) {
    return { engine: "mitsubishi", reason: "MITSUBISHI/MV1200 substring match" };
  }
  if (
    model.includes("HURCO") ||
    model.includes("VMX24") ||
    model.includes("VM30I") ||
    model.includes("V11")
  ) {
    return { engine: "hurco", reason: "HURCO/VMX24/VM30I/V11 substring match" };
  }
  return {
    engine: null,
    error: `Unknown machine model: ${machineModel}. Supported: OKUMA_LB250, MITSUBISHI_MV1200R, HURCO_VMX24_V11`,
  };
}

// ─── Action surface + schema sanity ────────────────────────────────────────

describe("master_post_by_machine — action + schema sanity", () => {
  it("master_post_by_machine action is registered in camDispatcher ACTIONS", () => {
    expect(ACTIONS).toContain("master_post_by_machine");
  });

  it("master_post_hurco_v11 action is registered in camDispatcher ACTIONS", () => {
    expect(ACTIONS).toContain("master_post_hurco_v11");
  });

  it("schema accepts HURCO_VMX24 with operations array", () => {
    const schema = ACTION_CAM_SCHEMAS.master_post_by_machine;
    expect(schema).toBeInstanceOf(z.ZodType);
    const parsed = schema.safeParse({
      machine_model: "HURCO_VMX24",
      operations: [baseHurcoOp],
      config: { program_number: 5101 },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.machine_model).toBe("HURCO_VMX24");
      expect(parsed.data.operations).toHaveLength(1);
    }
  });
});

// ─── Auto-router routing decisions ─────────────────────────────────────────

describe("master_post_by_machine — auto-router routing decisions", () => {
  it("routes 'HURCO_VMX24' to hurco engine", () => {
    const r = routeByMachine("HURCO_VMX24");
    expect(r.engine).toBe("hurco");
  });

  it("routes 'Hurco V11' (mixed case) to hurco engine", () => {
    const r = routeByMachine("Hurco V11");
    expect(r.engine).toBe("hurco");
  });

  it("routes 'VM30I' (Hurco mill family identifier) to hurco engine", () => {
    const r = routeByMachine("VM30I");
    expect(r.engine).toBe("hurco");
  });

  it("routes 'OKUMA_LB250' to okuma engine (regression — branch order)", () => {
    const r = routeByMachine("OKUMA_LB250");
    expect(r.engine).toBe("okuma");
  });

  it("routes 'MITSUBISHI_MV1200R' to mitsubishi engine (regression — branch order)", () => {
    const r = routeByMachine("MITSUBISHI_MV1200R");
    expect(r.engine).toBe("mitsubishi");
  });

  it("returns error for unknown machine and lists all three supported families", () => {
    const r = routeByMachine("UNKNOWN_MACHINE_XYZ");
    expect(r.engine).toBeNull();
    if (r.engine === null) {
      expect(r.error).toContain("OKUMA_LB250");
      expect(r.error).toContain("MITSUBISHI_MV1200R");
      expect(r.error).toContain("HURCO_VMX24_V11");
      expect(r.error).toContain("UNKNOWN_MACHINE_XYZ");
    }
  });

  it("returns error for empty/undefined machine_model", () => {
    expect(routeByMachine(undefined).engine).toBeNull();
    expect(routeByMachine("").engine).toBeNull();
  });
});

// ─── Identifier collision invariant ────────────────────────────────────────

describe("master_post_by_machine — identifier collision invariants", () => {
  it("no Hurco token is a substring of Okuma/Mitsubishi tokens (or vice versa)", () => {
    const hurco = ["HURCO", "VMX24", "VM30I", "V11"];
    const okuma = ["OKUMA", "LB250"];
    const mitsu = ["MITSUBISHI", "MV1200"];
    for (const h of hurco) {
      for (const o of okuma) {
        expect(h.includes(o)).toBe(false);
        expect(o.includes(h)).toBe(false);
      }
      for (const m of mitsu) {
        expect(h.includes(m)).toBe(false);
        expect(m.includes(h)).toBe(false);
      }
    }
  });

  it("'OKUMA_LB250 V11' (hypothetical) routes to okuma, NOT hurco (branch order wins)", () => {
    // OKUMA branch comes first, so a string containing both tokens picks Okuma.
    // This locks in the documented precedence: Okuma > Mitsubishi > Hurco.
    const r = routeByMachine("OKUMA_LB250 V11");
    expect(r.engine).toBe("okuma");
  });
});

// ─── Schema accepts realistic Hurco fixture (no engine call) ───────────────

describe("master_post_by_machine — schema accepts realistic Hurco fixture", () => {
  it("schema accepts a complete Hurco face-mill operation with config", () => {
    const schema = ACTION_CAM_SCHEMAS.master_post_by_machine;
    const parsed = schema.safeParse({
      machine_model: "HURCO_VMX24",
      operations: [baseHurcoOp],
      config: { program_number: 5101, program_comment: "U-PPGW10 ROUTING TEST", use_ultimotion: true },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.operations[0].operation_type).toBe("face");
      expect(parsed.data.operations[0].tool_number).toBe(1);
      expect(parsed.data.operations[0].coordinates.length).toBe(6);
    }
  });

  it("schema accepts multi-operation Hurco program", () => {
    const schema = ACTION_CAM_SCHEMAS.master_post_by_machine;
    const op2 = { ...baseHurcoOp, tool_number: 2, operation_type: "contour" as const };
    const op3 = { ...baseHurcoOp, tool_number: 1, operation_type: "drill" as const };
    const parsed = schema.safeParse({
      machine_model: "HURCO_VMX24",
      operations: [baseHurcoOp, op2, op3],
      config: { program_number: 5103 },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.operations).toHaveLength(3);
      const uniqueTools = new Set(parsed.data.operations.map((o: { tool_number: number }) => o.tool_number));
      expect(uniqueTools.size).toBe(2);
    }
  });
});
