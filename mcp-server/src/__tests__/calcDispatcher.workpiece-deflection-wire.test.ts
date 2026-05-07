/**
 * calcDispatcher.workpiece_deflection_compensate wiring — new action.
 *
 * Wires WorkpieceDeflectionCompensationEngine into calcDispatcher. Computes
 * cantilevered bar deflection via Euler-Bernoulli (point load) or distributed
 * load on cylindrical / hexagonal cross-sections. Use case: live-tooling
 * lathes machining hex pins where each flat tapers ~0.001-0.003" without
 * compensation.
 *
 * Physics validated against canonical formulas:
 *   - δ_max (point) = F·L³ / (3·E·I)
 *   - δ_max (UDL)   = F·L³ / (8·E·I)
 *   - I_round       = π·D⁴ / 64
 *   - I_hex         = 5√3·s⁴ / 16, s = across_flat / √3
 *
 * Each test below ties exact assertions to the engine source: rounding rules,
 * material E lookup, taper unit conversion (mm → thou via /0.0254).
 *
 * @milestone COGNITIVE-BRIDGE-MS0
 * @unit U-WIRE-CALC-DEFL
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || "error" in parsed)) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCalcDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

// ── Canonical constants from WorkpieceDeflectionCompensationEngine.ts ──
const E_STEEL_GPA = 200;
const E_ALUMINUM_GPA = 70;
const E_TITANIUM_GPA = 114;
const MM_PER_THOU = 0.0254;

describe("calcDispatcher — workpiece_deflection_compensate wiring (U-WIRE-CALC-DEFL)", () => {
  // Test 1: round bar, point load, exact δ_max = F·L³/(3·E·I)
  it("round steel bar with point load: max_deflection_mm matches F·L³/(3·E·I) analytically", async () => {
    const D = 25;        // mm
    const L = 50;        // mm stickout
    const F = 200;       // N point load at tip

    const r = await call(server, "workpiece_deflection_compensate", {
      stock_diameter_mm: D,
      stickout_mm: L,
      cutting_force_N: F,
      load_model: "point",
      material: "steel",   // E = 200 GPa
      tolerance_mm: 0.025,
    });
    expect(r.ok).toBe(true);

    // I_round = π·D⁴/64 = π·25⁴/64 ≈ 19174.76 mm⁴
    const I = (Math.PI / 64) * Math.pow(D, 4);
    expect(r.data.I_round_mm4).toBeCloseTo(I, 1);

    // δ_max = F·L³ / (3·E·I) with E in MPa = 200 · 1000 = 200000
    // Engine rounds max_deflection_mm to 4 decimal places (Math.round(x*10000)/10000)
    const E_MPa = E_STEEL_GPA * 1000;
    const expectedMax = (F * L * L * L) / (3 * E_MPa * I);
    expect(r.data.max_deflection_mm).toBeCloseTo(expectedMax, 4);

    // total_taper_mm equals max_deflection_mm (chuck-end = 0), also rounded to 4 dp
    expect(r.data.total_taper_mm).toBeCloseTo(expectedMax, 4);

    // total_taper_thou = mm / 0.0254 — engine rounds to 3 dp
    expect(r.data.total_taper_thou).toBeCloseTo(expectedMax / MM_PER_THOU, 2);

    // cutting_force_N echoed back exactly
    expect(r.data.cutting_force_N).toBe(F);
  });

  // Test 2: distributed load — δ_max = F·L³/(8·E·I) (vs 3·E·I for point)
  it("UDL load model produces δ_max = F·L³/(8·E·I) — strictly less than point load", async () => {
    const D = 20;
    const L = 60;
    const F = 300;

    const point = await call(server, "workpiece_deflection_compensate", {
      stock_diameter_mm: D, stickout_mm: L, cutting_force_N: F,
      load_model: "point", material: "steel", tolerance_mm: 0.025,
    });
    const udl = await call(server, "workpiece_deflection_compensate", {
      stock_diameter_mm: D, stickout_mm: L, cutting_force_N: F,
      load_model: "distributed", material: "steel", tolerance_mm: 0.025,
    });
    expect(point.ok && udl.ok).toBe(true);

    const I = (Math.PI / 64) * Math.pow(D, 4);
    const E_MPa = E_STEEL_GPA * 1000;
    const expectedPoint = (F * L * L * L) / (3 * E_MPa * I);
    const expectedUDL = (F * L * L * L) / (8 * E_MPa * I);

    // Engine rounds to 4 decimal places — match precision
    expect(point.data.max_deflection_mm).toBeCloseTo(expectedPoint, 4);
    expect(udl.data.max_deflection_mm).toBeCloseTo(expectedUDL, 4);

    // Ratio must be exactly 8/3 (point/UDL) — engine 4-dp rounding compounds in division,
    // so use precision 1 (tolerance 0.05). Theoretical ratio: 2.6667.
    const ratio = (point.data.max_deflection_mm as number) / (udl.data.max_deflection_mm as number);
    expect(ratio).toBeCloseTo(8 / 3, 1);
  });

  // Test 3: material scaling — aluminum deflects (200/70)x more than steel
  it("aluminum bar deflects (E_steel / E_al) × steel = ~2.857× more than steel", async () => {
    const baseInput = {
      stock_diameter_mm: 18,
      stickout_mm: 45,
      cutting_force_N: 250,
      load_model: "point",
      tolerance_mm: 0.025,
    };
    const steel = await call(server, "workpiece_deflection_compensate", { ...baseInput, material: "steel" });
    const al = await call(server, "workpiece_deflection_compensate", { ...baseInput, material: "aluminum" });
    expect(steel.ok && al.ok).toBe(true);

    const ratio = (al.data.max_deflection_mm as number) / (steel.data.max_deflection_mm as number);
    // δ ∝ 1/E → al/steel ratio = E_steel / E_al = 200/70 ≈ 2.857
    // Engine 4-dp rounding adds ~0.006 noise to ratios; use precision 1 (tolerance 0.05).
    expect(ratio).toBeCloseTo(E_STEEL_GPA / E_ALUMINUM_GPA, 1);
  });

  // Test 4: hex section with 6 flats — uses weaker I_hex when smaller than I_round
  it("hex pin (6 flats) uses min(I_round, I_hex) — weaker section governs", async () => {
    const D = 25;        // round stock
    const af = 22;       // across-flat after milling

    const r = await call(server, "workpiece_deflection_compensate", {
      stock_diameter_mm: D,
      stickout_mm: 40,
      cutting_force_N: 150,
      load_model: "point",
      material: "steel",
      tolerance_mm: 0.025,
      num_flats: 6,
      across_flat_mm: af,
    });
    expect(r.ok).toBe(true);

    // I_hex = (5·√3 / 16) · s⁴ where s = af/√3
    const s = af / Math.sqrt(3);
    const expectedIHex = (5 * Math.sqrt(3) / 16) * Math.pow(s, 4);
    expect(r.data.I_hex_mm4).toBeCloseTo(expectedIHex, 1);

    // I_hex (~14000) < I_round (~19174) → hex governs deflection
    const I_round = (Math.PI / 64) * Math.pow(D, 4);
    expect((r.data.I_hex_mm4 as number) < I_round).toBe(true);

    // max_deflection used I_hex (smaller I → larger δ)
    // Engine rounds max_deflection_mm to 4 decimal places — precision 4 = tolerance 5e-5.
    const E_MPa = E_STEEL_GPA * 1000;
    const expectedDelta = (150 * 40 * 40 * 40) / (3 * E_MPa * expectedIHex);
    expect(r.data.max_deflection_mm).toBeCloseTo(expectedDelta, 4);
  });

  // Test 5: deflection curve length and monotonicity
  it("deflection_curve has num_points+1 samples, monotonic non-decreasing from chuck to tip", async () => {
    const numPoints = 10;
    const r = await call(server, "workpiece_deflection_compensate", {
      stock_diameter_mm: 20,
      stickout_mm: 50,
      cutting_force_N: 200,
      load_model: "point",
      material: "steel",
      num_points: numPoints,
      tolerance_mm: 0.025,
    });
    expect(r.ok).toBe(true);

    const curve = r.data.deflection_curve as Array<{ z_mm: number; deflection_mm: number; compensation_mm: number }>;
    expect(curve.length).toBe(numPoints + 1);

    // First point at z=0 with deflection=0 (cantilever fixed end)
    expect(curve[0].z_mm).toBe(0);
    expect(curve[0].deflection_mm).toBe(0);

    // Last point at z=stickout
    expect(curve[curve.length - 1].z_mm).toBe(50);

    // Compensation = -deflection (sign flip)
    for (const pt of curve) {
      expect(pt.compensation_mm).toBeCloseTo(-pt.deflection_mm, 6);
    }

    // Monotonic non-decreasing (cantilever deflection grows with z)
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].deflection_mm >= curve[i - 1].deflection_mm).toBe(true);
    }
  });

  // Test 6: tolerance gate — within_tolerance flag matches tolerance_mm
  it("within_tolerance flag tracks tolerance_mm threshold", async () => {
    const D = 30, L = 40, F = 100, mat = "steel";

    const tight = await call(server, "workpiece_deflection_compensate", {
      stock_diameter_mm: D, stickout_mm: L, cutting_force_N: F,
      material: mat, tolerance_mm: 0.0001, // 0.1 micron — too tight, will fail
    });
    const loose = await call(server, "workpiece_deflection_compensate", {
      stock_diameter_mm: D, stickout_mm: L, cutting_force_N: F,
      material: mat, tolerance_mm: 1.0,    // 1 mm — easy to meet
    });
    expect(tight.ok && loose.ok).toBe(true);

    // Same physics, different tolerances → gate flips
    expect(tight.data.within_tolerance).toBe(false);
    expect(loose.data.within_tolerance).toBe(true);

    // max_deflection should be identical in both
    expect(tight.data.max_deflection_mm).toBe(loose.data.max_deflection_mm);
  });

  // Test 7: spring passes recommended only when out-of-tolerance
  it("spring_passes_recommended is 0 when in tolerance, ≥1 when out of tolerance", async () => {
    // Easy case (large I, small force, generous tol) — must produce 0 passes
    const inTol = await call(server, "workpiece_deflection_compensate", {
      stock_diameter_mm: 50, stickout_mm: 30, cutting_force_N: 50,
      material: "steel", tolerance_mm: 0.025, load_model: "point",
    });
    expect(inTol.ok).toBe(true);
    expect(inTol.data.within_tolerance).toBe(true);
    expect(inTol.data.spring_passes_recommended).toBe(0);

    // Hard case (small I, big force, tight tol) — must recommend ≥1 pass
    const outTol = await call(server, "workpiece_deflection_compensate", {
      stock_diameter_mm: 8, stickout_mm: 80, cutting_force_N: 400,
      material: "aluminum", tolerance_mm: 0.005, load_model: "point",
    });
    expect(outTol.ok).toBe(true);
    expect(outTol.data.within_tolerance).toBe(false);
    expect((outTol.data.spring_passes_recommended as number) >= 1).toBe(true);
    // Cap is 5 in engine source
    expect((outTol.data.spring_passes_recommended as number) <= 5).toBe(true);
  });

  // Test 8: Kienzle force fallback — no cutting_force_N triggers Kienzle estimation
  it("missing cutting_force_N triggers Kienzle estimate from iso_group", async () => {
    const r = await call(server, "workpiece_deflection_compensate", {
      stock_diameter_mm: 20,
      stickout_mm: 40,
      material: "steel",
      iso_group: "P",            // Kienzle kc1.1 = 1800 N/mm² for P-group
      width_of_cut_mm: 6,
      depth_of_cut_mm: 1.0,
      feed_per_tooth_mm: 0.1,
      load_model: "point",
      tolerance_mm: 0.025,
    });
    expect(r.ok).toBe(true);
    // Engine should compute non-zero force from Kienzle (not the 500 N fallback)
    const F = r.data.cutting_force_N as number;
    expect(F > 0).toBe(true);
    // F should NOT be the 500 N "default" fallback that fires when force still ≤ 0
    expect(F).not.toBe(500);
  });
});
