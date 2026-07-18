/**
 * TailstockForceEngine — ISOLATED unit coverage (LATHE-SAFETY-DEPTH).
 *
 * *** SAFETY CRITICAL *** — between-centers turning. Insufficient tailstock
 * force ejects the workpiece; excessive force crushes the center hole.
 *
 * india's audit: TailstockForceEngine (turningDispatcher, ~201 LOC) had ONLY
 * one batch smoke case in l2-pass2-specialty-engines.test.ts:419 —
 *   expect(r.required_force_N).toBeGreaterThan(0); (a >0 stub, no reference value).
 * This file adds hand-derived reference-value coverage + failure + adversarial
 * modes, and round-trips the SAFETY path through prism_turning:tailstock.
 *
 * ── Physics hand-derived from TailstockForceEngine.ts (verified line-by-line) ──
 *   Simply-supported sag:  δ = 5·w·L⁴ / (384·E·I),  w = m·g/L,  I = π·d⁴/64
 *   requiredForce  = F_axial + m·g·(1 − pos/span) + 0.3·F_radial
 *   recommendedForce = 2.0 · requiredForce                    (SF = 2.0)
 *   contactArea_mm² = π·r²/sin(θ/2)·0.3,  r = holeDia/2       (θ = point angle)
 *   contactPressure = recommendedForce / contactArea          [N/mm² = MPa]
 *   maxForce        = contactArea · 800 MPa                   (center-hole crush)
 *   thermalGrowth   = α · (span/1000) · ΔT,  ΔT = dead?30:10  (α default 12 µm/m/°C)
 *   is_safe ⟺ recommendedForce ≤ maxForce ∧ contactPressure < 800 MPa
 *
 * Engine constants: E = 210e9 Pa, g = 9.81, MAX_CENTER_PRESSURE = 800 MPa.
 * CANONICAL_KIENZLE imported from ../physics/constants.js and used to derive a
 * representative turning cut force (never inlined) that feeds the radial-moment path.
 *
 * @milestone LATHE-SAFETY-DEPTH
 * @unit U-oscar-HoldingForce-TEST
 */

import { describe, it, expect } from "vitest";
import { tailstockForceEngine } from "../engines/TailstockForceEngine.js";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ── LIVE dispatcher round-trip shim (prism_turning wraps result as content[0].text top-level JSON) ──
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
function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerTurningDispatcher(s as unknown as { tool: MockMCPServer["tool"] });
  return s;
}
async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools.find((t) => t.name === "prism_turning") ?? server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

// Canonical baseline case — every reference value below is hand-derived from it.
// L=0.4m, d=0.05m, m=10kg, span=400mm, pos=200mm, axial=500N, radial=300N, hole=6mm, θ=60°, live.
const BASE = {
  center_type: "live" as const,
  center_point_angle_deg: 60,
  workpiece_mass_kg: 10,
  workpiece_length_mm: 400,
  workpiece_diameter_mm: 50,
  chuck_to_tailstock_mm: 400,
  spindle_rpm: 1000,
  cutting_force_axial_N: 500,
  cutting_force_radial_N: 300,
  cutting_position_from_chuck_mm: 200,
  center_hole_diameter_mm: 6,
};

describe("TailstockForceEngine — isolated reference-value coverage", () => {
  // ────────────────────────── HAPPY PATH (exact hand-derived) ──────────────────────────
  it("HAPPY: reference case matches hand-derived physics to the engine's rounding", () => {
    const r = tailstockForceEngine.calculate(BASE);

    // requiredForce = 500(axial) + 10·9.81·(1−200/400)=49.05(weight) + 0.3·300=90(moment) = 639.05 → 639
    expect(r.required_force_N).toBe(639);
    // recommendedForce = 2.0·639.05 = 1278.1 → 1278
    expect(r.recommended_force_N).toBe(1278);

    // contactArea = π·3²/sin(30°)·0.3 = π·9/0.5·0.3 = 16.9646 mm²
    // contactPressure = 1278.1 / 16.9646 = 75.34 MPa
    expect(r.center_contact_pressure_MPa).toBeCloseTo(75.3, 1);
    // maxForce = 16.9646 · 800 = 13571.7 → 13572
    expect(r.max_force_before_damage_N).toBe(13572);

    // sag = 5·(245.25)·0.4⁴ / (384·210e9·3.06796e-7) = 1.2689 µm
    expect(r.workpiece_sag_um).toBeCloseTo(1.3, 1);
    expect(r.deflection_with_support_um).toBeCloseTo(0.1, 1); // 10% of sag

    // thermalGrowth = 12·0.4·10(live) = 48 µm
    expect(r.thermal_growth_um).toBeCloseTo(48, 3);

    // recommended(1278) ≤ max(13572) ∧ pressure(75.3) < 800 → safe
    expect(r.is_safe).toBe(true);
    // spindle 1000 ≤ 1500 and not dead → no live-center flag
    expect(r.live_center_recommended).toBe(false);
    expect(r.recommendations.join(" ")).toMatch(/adequate/i);
  });

  it("HAPPY: radial-moment path anchored to CANONICAL_KIENZLE turning force (no inlined constant)", () => {
    // Representative P-steel turning cut: Fc = kc1_1·ap·f^(1−mc) (canonical Kienzle, not inlined)
    const { kc1_1, mc } = CANONICAL_KIENZLE.P; // P = 1800 N/mm², mc = 0.25
    const ap = 3, feed = 0.2;
    const Fc = kc1_1 * ap * Math.pow(feed, 1 - mc); // ≈ 1614.1 N tangential/radial
    expect(Fc).toBeGreaterThan(1500);

    const r = tailstockForceEngine.calculate({
      ...BASE,
      workpiece_mass_kg: 8,
      cutting_force_axial_N: 0,           // isolate the weight+moment contribution
      cutting_force_radial_N: Fc,
    });
    // required = 0 + 8·9.81·(1−200/400) + 0.3·Fc
    const weightAtTail = 8 * 9.81 * (1 - 200 / 400);
    const expectedRequired = Math.round(0 + weightAtTail + Fc * 0.3);
    expect(r.required_force_N).toBe(expectedRequired);
    // recommended = round(2·unrounded_required); differs from 2·round(required) by ≤1 (rounding order).
    expect(Math.abs(r.recommended_force_N - 2 * r.required_force_N)).toBeLessThanOrEqual(1);
  });

  // ────────────────────────── FAILURE MODES (≥3) ──────────────────────────
  it("FAILURE #1: undersized center hole + heavy cut → center-hole crush, is_safe=false", () => {
    // Tiny hole (1.5mm) shrinks contactArea → maxForce; huge axial/radial → recommendedForce ≫ maxForce.
    const r = tailstockForceEngine.calculate({
      ...BASE,
      workpiece_mass_kg: 20,
      cutting_force_axial_N: 8000,
      cutting_force_radial_N: 3000,
      cutting_position_from_chuck_mm: 100,
      center_hole_diameter_mm: 1.5,
    });
    expect(r.is_safe).toBe(false);
    // recommended(~18094) ≫ max(~848)
    expect(r.recommended_force_N).toBeGreaterThan(r.max_force_before_damage_N);
    expect(r.recommendations[0]).toMatch(/SAFETY/);
    expect(r.recommendations[0]).toMatch(/center hole/i);
  });

  it("FAILURE #2: dead center above 800 rpm → live-center flag + thermal-seizure guidance", () => {
    const r = tailstockForceEngine.calculate({ ...BASE, center_type: "dead", spindle_rpm: 1000 });
    // liveCenterRec = (rpm>1500) || (dead && rpm>800) = false || true → true
    expect(r.live_center_recommended).toBe(true);
    // dead → ΔT=30 → thermalGrowth = 12·0.4·30 = 144 µm
    expect(r.thermal_growth_um).toBeCloseTo(144, 3);
    const joined = r.recommendations.join(" ");
    expect(joined).toMatch(/live center/i);
    expect(joined).toMatch(/thermal/i);
  });

  it("FAILURE #3: long slender heavy bar → sag > 100 µm, steady-rest recommended", () => {
    const r = tailstockForceEngine.calculate({
      ...BASE,
      workpiece_mass_kg: 15,
      workpiece_diameter_mm: 10,     // slender → tiny I → large sag
      workpiece_length_mm: 800,
      chuck_to_tailstock_mm: 800,
    });
    expect(r.workpiece_sag_um).toBeGreaterThan(100);
    expect(r.recommendations.join(" ")).toMatch(/sag|steady rest/i);
  });

  it("FAILURE #4: high spindle rpm (>1500) with a live center still flags live-center use", () => {
    const r = tailstockForceEngine.calculate({ ...BASE, spindle_rpm: 3000 });
    expect(r.live_center_recommended).toBe(true);
  });

  // ────────────────────────── ADVERSARIAL (≥2) ──────────────────────────
  it("ADVERSARIAL #1 (NaN): NaN axial force fails SAFE (is_safe=false, never a false green)", () => {
    const r = tailstockForceEngine.calculate({ ...BASE, cutting_force_axial_N: NaN });
    // recommendedForce=NaN → (NaN ≤ max) is false → is_safe false. Correct fail-safe behavior.
    expect(r.is_safe).toBe(false);
    expect(Number.isNaN(r.recommended_force_N)).toBe(true);
  });

  it("ADVERSARIAL #2 (negative): negative axial force → is_safe=true (engine VALIDATION GAP, pinned)", () => {
    // A physically-impossible negative cutting force drives requiredForce negative; the crush-only
    // is_safe gate (recommended ≤ max ∧ pressure < 800) is trivially satisfied by a negative force.
    const r = tailstockForceEngine.calculate({ ...BASE, cutting_force_axial_N: -2000 });
    expect(r.required_force_N).toBeLessThan(0);
    // BUG (validation gap, NOT fixed — safety-gated engine source): the engine reports a NONSENSE
    // negative-force setup as is_safe=true. The engine itself never guards non-negative forces —
    // the ONLY guard is the prism_turning schema (z.number().nonnegative(), asserted below).
    expect(r.is_safe).toBe(true); // PIN current behavior
  });

  it("ADVERSARIAL #3 (geometry): cutting position beyond the tailstock → negative weight share (unvalidated, pinned)", () => {
    // pos(500) > span(400) → (1 − 500/400) = −0.25 → weightAtTailstock negative, silently reducing requiredForce.
    const r = tailstockForceEngine.calculate({
      ...BASE,
      cutting_force_axial_N: 0,
      cutting_force_radial_N: 0,
      cutting_position_from_chuck_mm: 500,
    });
    // BUG (geometry-consistency gap, pinned): required = m·g·(1−1.25) = 10·9.81·(−0.25) = −24.525 → −25
    expect(r.required_force_N).toBe(Math.round(10 * 9.81 * (1 - 500 / 400)));
    expect(r.required_force_N).toBeLessThan(0);
  });

  it("ADVERSARIAL #4 (zero): zero diameter → I=0 handled gracefully (sag=0, no NaN/divide-by-zero)", () => {
    const r = tailstockForceEngine.calculate({ ...BASE, workpiece_diameter_mm: 0 });
    expect(r.workpiece_sag_um).toBe(0);
    expect(r.deflection_with_support_um).toBe(0);
    expect(Number.isFinite(r.required_force_N)).toBe(true);
  });

  // ────────────────────────── DISPATCHER ROUND-TRIP (prism_turning) ──────────────────────────
  it("ROUND-TRIP: prism_turning:tailstock returns the same SAFETY verdict as the engine", async () => {
    const s = newServer();
    const direct = tailstockForceEngine.calculate(BASE);
    const r = await call(s, "tailstock", { ...BASE });
    expect(r.ok).toBe(true);
    expect(r.data.blocked).not.toBe(true);
    expect(r.data.required_force_N).toBe(direct.required_force_N); // 639
    expect(r.data.is_safe).toBe(direct.is_safe);                   // true
    expect(r.data.max_force_before_damage_N).toBe(direct.max_force_before_damage_N);
  });

  it("ROUND-TRIP (schema safety gate): negative axial force is REJECTED at the dispatcher boundary", async () => {
    // The engine itself accepts negatives (adversarial #2); the prism_turning schema does NOT —
    // z.number().nonnegative() on cutting_force_axial_N blocks the nonsense input before the engine.
    const s = newServer();
    const r = await call(s, "tailstock", { ...BASE, cutting_force_axial_N: -500 });
    expect(r.ok).toBe(false);
  });
});
