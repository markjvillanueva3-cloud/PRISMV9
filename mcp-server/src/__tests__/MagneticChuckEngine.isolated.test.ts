/**
 * MagneticChuckEngine — ISOLATED unit coverage (LATHE-SAFETY-DEPTH).
 *
 * *** SAFETY CRITICAL *** — insufficient magnetic holding force ejects the
 * workpiece at grinding-wheel speed. The core safety question this engine
 * answers is a HOLDING-vs-CUTTING margin: is_safe ⟺ holdingForce ≥ requiredSF·load.
 *
 * india's audit: MagneticChuckEngine (calcDispatcher:magnetic_chuck_calc) had two
 * batch cases in workholding-fixture-engines.test.ts:87 — a `holding_force>0` smoke
 * test (with an `is_safe` toBeDefined stub) and a low-contact-area comparison. No
 * hand-derived reference value; no NaN/negative/unknown-enum adversarial; no
 * round-trip. This file adds all of the above and PINS a real safety defect.
 *
 * ── Physics hand-derived from MagneticChuckEngine.ts (verified line-by-line) ──
 *   effectiveArea_cm² = (len·wid/100)·(contact%/100)
 *   holdingForce = pull_N/cm² · effectiveArea · permFactor · airGapDerating · thicknessDerating
 *   load        = √(F_tang² + F_norm²) + 0.2·weight
 *   requiredForce = load · requiredSF   (grinding 3.0, milling 2.5, edm 1.5, inspection 1.2)
 *   safety_factor = holdingForce / max(load, 1)
 *   is_safe ⟺ safety_factor ≥ requiredSF   (equivalently holdingForce ≥ requiredForce)
 *   PERMEABILITY: carbon_steel 1.0, alloy 0.95, cast_iron 0.85, 400SS 0.70,
 *                 300SS 0.05, aluminum/titanium/brass 0.0, nickel 0.10
 *
 * CANONICAL_KIENZLE imported from ../physics/constants.js to derive a representative
 * milling cut force (never inlined) that exercises the holding-vs-cutting margin.
 *
 * @milestone LATHE-SAFETY-DEPTH
 * @unit U-oscar-HoldingForce-TEST
 */

import { describe, it, expect, beforeEach } from "vitest";
import { magneticChuckEngine } from "../engines/MagneticChuckEngine.js";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ── LIVE calcDispatcher round-trip shim (prism_calc wraps result as content[0].text top-level JSON) ──
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
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
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

// Canonical baseline — pull 100 N/cm², 200×100 mm carbon-steel plate, flat, ground, surface grinding.
const BASE = {
  chuck_type: "permanent" as const,
  chuck_pull_force_N_per_cm2: 100,
  workpiece_length_mm: 200,
  workpiece_width_mm: 100,
  workpiece_thickness_mm: 20,
  workpiece_material: "carbon steel",
  workpiece_weight_N: 50,
  contact_area_pct: 100,
  cutting_force_tangential_N: 300,
  cutting_force_normal_N: 400,
  operation: "surface_grinding" as const,
  surface_roughness_Ra_um: 0.8,
};

describe("MagneticChuckEngine — isolated reference-value coverage", () => {
  // ────────────────────────── HAPPY PATH (exact hand-derived) ──────────────────────────
  it("HAPPY: reference case matches hand-derived physics to the engine's rounding", () => {
    const r = magneticChuckEngine.calculate(BASE);

    // effectiveArea = (200·100/100)·(100/100) = 200 cm²
    expect(r.effective_contact_area_cm2).toBe(200);
    expect(r.permeability_factor).toBe(1.0);       // carbon steel
    expect(r.air_gap_derating).toBe(1.0);          // Ra 0.8 < 1.6

    // holding = 100·200·1·1·1 = 20000 N
    expect(r.holding_force_N).toBe(20000);
    // load = √(300²+400²) + 0.2·50 = 500 + 10 = 510; required = 510·3 = 1530
    expect(r.required_force_N).toBe(1530);
    // sf = 20000/510 = 39.2157 → 39.22
    expect(r.safety_factor).toBeCloseTo(39.22, 2);
    expect(r.is_safe).toBe(true);                  // 39.22 ≥ 3.0
    // maxCutting = 20000/3 − 10 = 6656.67 → 6657
    expect(r.max_allowable_cutting_force_N).toBe(6657);
    expect(r.recommendations.join(" ")).toMatch(/adequate/i);
  });

  it("HAPPY: holding margin comfortably resists a CANONICAL_KIENZLE-derived milling force (no inlined constant)", () => {
    // Ft = kc1_1·ap·fz^(1−mc) from canonical Kienzle (P-steel), never inlined.
    const { kc1_1, mc } = CANONICAL_KIENZLE.P; // 1800 N/mm², 0.25
    const ap = 1, fz = 0.1;
    const Ft = kc1_1 * ap * Math.pow(fz, 1 - mc); // ≈ 320.1 N tangential
    expect(Ft).toBeGreaterThan(300);

    const r = magneticChuckEngine.calculate({
      ...BASE,
      chuck_pull_force_N_per_cm2: 120,
      workpiece_weight_N: 40,
      cutting_force_tangential_N: Ft,
      cutting_force_normal_N: 150,
      operation: "milling",       // requiredSF = 2.5
    });
    // holding = 120·200 = 24000
    expect(r.holding_force_N).toBe(24000);
    expect(r.is_safe).toBe(true);
    expect(r.safety_factor).toBeGreaterThan(2.5);                 // clears the milling SF gate
    expect(r.max_allowable_cutting_force_N).toBeGreaterThan(Ft);  // chuck out-resists the Kienzle cut
  });

  // ────────────────────────── FAILURE MODES (≥3) ──────────────────────────
  it("FAILURE #1 (KEY SAFETY): holding force EXCEEDS raw cutting force but is correctly UNSAFE for grinding", () => {
    // holding 5000 N > totalCutting 2500 N — but grinding demands SF 3.0, so sf 1.98 < 3.0 → UNSAFE.
    // This is the anti-bug assertion: "holding > cutting" must NOT be reported as adequate.
    const r = magneticChuckEngine.calculate({
      ...BASE,
      workpiece_length_mm: 100,
      workpiece_width_mm: 50,          // area 50 → holding 5000
      workpiece_weight_N: 100,
      cutting_force_tangential_N: 1500,
      cutting_force_normal_N: 2000,    // totalCutting = 2500
    });
    const totalCutting = Math.sqrt(1500 ** 2 + 2000 ** 2); // 2500
    expect(r.holding_force_N).toBe(5000);
    expect(r.holding_force_N).toBeGreaterThan(totalCutting); // holding beats raw cutting force …
    expect(r.safety_factor).toBeCloseTo(1.98, 2);            // … yet SF only 1.98
    expect(r.is_safe).toBe(false);                           // … so is_safe MUST be false
    expect(r.recommendations.join(" ")).toMatch(/UNSAFE|mechanical clamping/i);
  });

  it("FAILURE #2: aluminum is non-magnetic → zero holding, is_safe=false, hard warning", () => {
    const r = magneticChuckEngine.calculate({ ...BASE, workpiece_material: "aluminum" });
    expect(r.permeability_factor).toBe(0);
    expect(r.holding_force_N).toBe(0);
    expect(r.is_safe).toBe(false);
    expect(r.recommendations.join(" ")).toMatch(/non-magnetic|CANNOT hold/i);
  });

  it("FAILURE #3: rough contact face (Ra 6.5 µm) applies the 0.45 air-gap derating + grind-face advice", () => {
    const r = magneticChuckEngine.calculate({ ...BASE, surface_roughness_Ra_um: 6.5 });
    expect(r.air_gap_derating).toBe(0.45);
    // holding halved+ vs the Ra 0.8 baseline (20000 → 9000)
    expect(r.holding_force_N).toBe(9000);
    expect(r.recommendations.join(" ")).toMatch(/roughness|grind contact face/i);
  });

  it("FAILURE #4: thin part (2 mm) applies the 0.40 thickness derating", () => {
    const thin = magneticChuckEngine.calculate({ ...BASE, workpiece_thickness_mm: 2 });
    const thick = magneticChuckEngine.calculate({ ...BASE, workpiece_thickness_mm: 20 });
    // thicknessDerating: 2mm → 0.40, 20mm → 1.0 → ratio exactly 0.40
    expect(thin.holding_force_N / thick.holding_force_N).toBeCloseTo(0.4, 5);
    expect(thin.recommendations.join(" ")).toMatch(/thin part|pole extension/i);
  });

  // ────────────────────────── ADVERSARIAL (≥2) ──────────────────────────
  it("ADVERSARIAL #1 (NaN): NaN cutting force fails SAFE (is_safe=false, never a false green)", () => {
    const r = magneticChuckEngine.calculate({ ...BASE, cutting_force_tangential_N: NaN });
    expect(r.is_safe).toBe(false);
  });

  it("ADVERSARIAL #2 (unknown enum — SAFETY BUG): unrecognized non-magnetic material defaults to FULLY-MAGNETIC steel", () => {
    // "G10 garolite" is a glass-epoxy composite — physically UNHOLDABLE on a magnetic chuck.
    // _materialKey() has no branch for it and falls through to "carbon_steel" (permFactor 1.0),
    // making the unreachable `?? 0.5` fallback dead code. Result: the engine reports a large
    // holding force + is_safe=true for a material it cannot hold at all → part ejection hazard.
    const r = magneticChuckEngine.calculate({ ...BASE, workpiece_material: "G10 garolite" });
    // BUG (SAFETY, pinned — NOT fixed, engine source is safety-gated): unknown material → permFactor 1.0.
    expect(r.permeability_factor).toBe(1.0);        // should be ≤ 0.5 (conservative) for an unknown material
    expect(r.holding_force_N).toBe(20000);          // over-reported as if solid carbon steel
    expect(r.is_safe).toBe(true);                   // FALSE GREEN on an unholdable material
  });

  it("ADVERSARIAL #3 (near-non-magnetic 304 SS): austenitic stainless → 0.05 permeability, insufficient hold", () => {
    // 304/austenitic stainless is a classic magnetic-chuck ejection trap. permFactor 0.05.
    const r = magneticChuckEngine.calculate({
      ...BASE,
      workpiece_material: "304 stainless steel",
      cutting_force_tangential_N: 400,
      cutting_force_normal_N: 300,
      workpiece_weight_N: 30,
    });
    expect(r.permeability_factor).toBe(0.05);
    // holding = 100·200·0.05 = 1000 N; load ≈ 506 → sf ≈ 1.98 < 3.0 grinding SF
    expect(r.holding_force_N).toBe(1000);
    expect(r.is_safe).toBe(false);
    expect(r.recommendations.join(" ")).toMatch(/non-magnetic|CANNOT hold/i);
  });

  it("ADVERSARIAL #4 (negative): negative pull-force rating → negative holding, is_safe=false", () => {
    const r = magneticChuckEngine.calculate({ ...BASE, chuck_pull_force_N_per_cm2: -120 });
    expect(r.holding_force_N).toBeLessThan(0);
    expect(r.is_safe).toBe(false);
  });

  // ────────────────────────── DISPATCHER ROUND-TRIP (prism_calc:magnetic_chuck_calc) ──────────────────────────
  it("ROUND-TRIP: calcDispatcher:magnetic_chuck_calc returns the same holding + SAFETY verdict as the engine", async () => {
    const direct = magneticChuckEngine.calculate(BASE);
    const r = await call(server, "magnetic_chuck_calc", { ...BASE });
    expect(r.ok).toBe(true);
    expect(r.data.holding_force_N).toBe(direct.holding_force_N); // 20000
    expect(r.data.required_force_N).toBe(direct.required_force_N); // 1530
    expect(r.data.is_safe).toBe(direct.is_safe);                  // true
    expect(r.data.safety_factor).toBeCloseTo(39.22, 2);
  });

  it("ROUND-TRIP (bug reaches through the unvalidated dispatcher): unknown material → false-green is_safe", async () => {
    // magnetic_chuck_calc has NO Zod schema (passthrough/unvalidated), so the unknown-material
    // SAFETY BUG (adversarial #2) propagates all the way through prism_calc — no boundary catches it.
    const r = await call(server, "magnetic_chuck_calc", { ...BASE, workpiece_material: "G10 garolite" });
    expect(r.ok).toBe(true);
    expect(r.data.permeability_factor).toBe(1.0); // PIN: dispatcher passes the unholdable material as steel
    expect(r.data.is_safe).toBe(true);
  });
});
