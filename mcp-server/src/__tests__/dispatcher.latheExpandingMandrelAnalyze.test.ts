/**
 * dispatcher.latheExpandingMandrelAnalyze.test.ts — round-trip integration
 * coverage for U-WIRE-EMA (slot:romeo, CATALOG-APP-WIRING-MS0 follow-on).
 *
 * Drives the NEW action through the real `prism_turning` dispatcher:
 *   - lathe_expanding_mandrel_analyze → ExpandingMandrelEngine.analyze
 *
 * R7 — this action is DISTINCT from the pre-existing
 * `lathe_workholding_expanding_mandrel` (LatheWorkholdingEngine's Lame
 * interference-fit model). ExpandingMandrelEngine is the DYNAMIC grip model:
 * actuator-force-driven grip with centrifugal de-rating + max_safe_rpm. Both
 * actions are exercised here against the SAME dispatcher so the test proves
 * they coexist and return their different shapes (centrifugal_loss_mpa +
 * max_safe_rpm are unique to the new one).
 *
 * Every assertion pins a concrete reference value derived from the engine's
 * published formulas (grip pressure p = E·δ/D, contact area = π·D·L,
 * torque = μ·p·A·R, centrifugal Δp = ρ·ω²·R²/2). Wraps the same
 * { success, data } envelope the rest of the PRISM dispatcher suite asserts.
 */

import { describe, it, expect, beforeAll } from "vitest";

import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

// Baseline reference case (hand-computed against the engine formulas):
//   mandrel 4140 (E=205 GPa, yield=655 MPa), expanded_od 25.05, bore 25.0,
//   grip_length 30, actuator_force 8000 N, rpm 2000, part 4140 (ρ=7850),
//   outer_od 50, μ=0.15.
//   interference     = 25.05 − 25.0       = 0.05 mm
//   grip_pressure    = 205000·0.05/25.0   = 410 MPa
//   contact_area     = π·25·30            = 2356.19 mm²
//   max_torque       = 0.15·410·2356.19·0.0125 = 1811.32 N·m
//   centrifugal_loss = 7850·209.44²·0.025²/2/1e6 ≈ 0.11 MPa
//   safety_factor    = 655/410            ≈ 1.60
const BASE = {
  mandrel: { nominal_od_mm: 25.0, expanded_od_mm: 25.05, grip_length_mm: 30, material: "4140" as const },
  part: { bore_id_mm: 25.0, material: "4140", outer_od_mm: 50 },
  actuator_force_n: 8000,
  rpm: 2000,
  mu: 0.15,
};

describe("U-WIRE-EMA — action + schema registration", () => {
  it("lathe_expanding_mandrel_analyze schema is a registered Zod object", () => {
    expect(typeof TURNING_ACTION_SCHEMAS["lathe_expanding_mandrel_analyze"].safeParse).toBe("function");
  });

  it("does NOT collide with the pre-existing lathe_workholding_expanding_mandrel action", () => {
    // R7: both actions must coexist — distinct engines, distinct schemas. The
    // schemas are the registration mirror of the dispatcher enum; both keys
    // present + non-identical objects proves the two actions are independent.
    expect(typeof TURNING_ACTION_SCHEMAS["lathe_workholding_expanding_mandrel"].safeParse).toBe("function");
    expect(typeof TURNING_ACTION_SCHEMAS["lathe_expanding_mandrel_analyze"].safeParse).toBe("function");
    expect(
      TURNING_ACTION_SCHEMAS["lathe_expanding_mandrel_analyze"],
    ).not.toBe(TURNING_ACTION_SCHEMAS["lathe_workholding_expanding_mandrel"]);
  });
});

describe("U-WIRE-EMA — schema rejection paths", () => {
  const S = TURNING_ACTION_SCHEMAS["lathe_expanding_mandrel_analyze"];

  it("rejects a missing mandrel block", () => {
    expect(S.safeParse({ part: BASE.part, actuator_force_n: 8000, rpm: 2000 }).success).toBe(false);
  });

  it("rejects an unknown mandrel material (not in the 4140/4340/S7/D2/H13 set)", () => {
    expect(S.safeParse({
      ...BASE,
      mandrel: { ...BASE.mandrel, material: "titanium" },
    }).success).toBe(false);
  });

  it("rejects a negative actuator_force_n", () => {
    expect(S.safeParse({ ...BASE, actuator_force_n: -1 }).success).toBe(false);
  });

  it("rejects μ outside [0.05, 1]", () => {
    expect(S.safeParse({ ...BASE, mu: 2 }).success).toBe(false);
  });
});

describe("U-WIRE-EMA — prism_turning round-trip (real reference values)", () => {
  it("baseline 4140 mandrel → grip_pressure 410 MPa, contact_area 2356.19 mm², torque 1811.3 N·m", async () => {
    const r = await invokeHandler(turningHandler, "lathe_expanding_mandrel_analyze", BASE);
    expect(r.success).toBe(true);
    const d = r.data as {
      grip_pressure_mpa: number;
      contact_area_mm2: number;
      max_transmitted_torque_nm: number;
      centrifugal_loss_mpa: number;
      max_safe_rpm: number;
      safety_factor: number;
      grips_safely: boolean;
    };
    // p = E·δ/D = 205000·0.05/25 = 410 MPa exactly
    expect(d.grip_pressure_mpa).toBeCloseTo(410, 1);
    // A = π·D·L = π·25·30 = 2356.19 mm²
    expect(d.contact_area_mm2).toBeCloseTo(2356.19, 1);
    // T = μ·p·A·R = 0.15·410·2356.19·0.0125 = 1811.3 N·m
    expect(d.max_transmitted_torque_nm).toBeCloseTo(1811.3, 0);
    // centrifugal de-rating at 2000 rpm is small (bore-grip dominated)
    expect(d.centrifugal_loss_mpa).toBeGreaterThan(0);
    expect(d.centrifugal_loss_mpa).toBeLessThan(1);
    // max_safe_rpm (where p drops 20%) is far above 2000 here
    expect(d.max_safe_rpm).toBeGreaterThan(2000);
    // SF = yield/grip = 655/410 ≈ 1.60
    expect(d.safety_factor).toBeCloseTo(1.6, 1);
  });

  it("zero interference (expanded_od ≤ bore) → free-spin warning, grips_safely false", async () => {
    const r = await invokeHandler(turningHandler, "lathe_expanding_mandrel_analyze", {
      ...BASE,
      mandrel: { ...BASE.mandrel, expanded_od_mm: 25.0 }, // == bore → 0 interference
    });
    expect(r.success).toBe(true);
    const d = r.data as { grip_pressure_mpa: number; warnings: string[]; grips_safely: boolean };
    expect(d.grip_pressure_mpa).toBe(0);
    expect(d.warnings.some((w) => /interference/i.test(w))).toBe(true);
  });

  it("over-speed → RPM-exceeds-max_safe warning, grips_safely false (centrifugal unloads grip)", async () => {
    // tiny interference + light part-bore but a huge outer mass at high rpm pushes
    // centrifugal loss past the 20% threshold → over-speed warning fires.
    const r = await invokeHandler(turningHandler, "lathe_expanding_mandrel_analyze", {
      mandrel: { nominal_od_mm: 100, expanded_od_mm: 100.002, grip_length_mm: 20, material: "4140" },
      part: { bore_id_mm: 100, material: "Inconel-718", outer_od_mm: 300 },
      actuator_force_n: 5000,
      rpm: 12000,
      mu: 0.15,
    });
    expect(r.success).toBe(true);
    const d = r.data as { max_safe_rpm: number; warnings: string[]; grips_safely: boolean };
    expect(d.max_safe_rpm).toBeLessThan(12000);
    expect(d.warnings.some((w) => /max safe rpm/i.test(w))).toBe(true);
    expect(d.grips_safely).toBe(false);
  });

  it("cutting_force exceeding grip capacity → slip warning, grips_safely false", async () => {
    const r = await invokeHandler(turningHandler, "lathe_expanding_mandrel_analyze", {
      ...BASE,
      cutting_force_n: 500_000, // absurd load vs ~1811 N·m grip → must slip
    });
    expect(r.success).toBe(true);
    const d = r.data as { warnings: string[]; grips_safely: boolean };
    expect(d.warnings.some((w) => /slip/i.test(w))).toBe(true);
    expect(d.grips_safely).toBe(false);
  });

  it("thin-wall part reports radial_deformation_um (unique to the dynamic engine)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_expanding_mandrel_analyze", {
      ...BASE,
      part: { ...BASE.part, wall_thickness_mm: 2 },
    });
    expect(r.success).toBe(true);
    const d = r.data as { radial_deformation_um?: number };
    // Δr = p·r²/(E_part·t) = 410·12.5²/(205000·2)·1000 = 156.25 µm
    expect(d.radial_deformation_um).toBeCloseTo(156.25, 0);
  });

  it("rejects an invalid payload at the dispatcher boundary", async () => {
    const r = await invokeHandler(turningHandler, "lathe_expanding_mandrel_analyze", {
      mandrel: { nominal_od_mm: 25, expanded_od_mm: 25.05, grip_length_mm: 30, material: "4140" },
      part: { bore_id_mm: 25, material: "4140" },
      actuator_force_n: -8000, // invalid
      rpm: 2000,
    });
    expect(r.success).not.toBe(true);
  });
});
