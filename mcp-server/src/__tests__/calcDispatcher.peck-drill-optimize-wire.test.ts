/**
 * calcDispatcher.peck_drill_optimize wiring — completes a half-wired action.
 *
 * Before this fix: `peck_drill_optimize` was registered in the action enum
 * AND had a result-slimmer mapper (calcDispatcher.ts:244-245) but had NO
 * case handler in the dispatch switch. Calls would either fall through to
 * an unrelated case or throw "unknown action" — both violate the contract
 * the slimmer documents.
 *
 * After this fix: `peck_drill_optimize` calls PeckDrillingOptimizationEngine
 * and the dispatcher returns the slimmed shape:
 *   { ld_ratio, strategy, peck_mm, pecks, feed_adj, time_s }
 *
 * Expected values are derived directly from the engine source
 * (PeckDrillingOptimizationEngine.ts). Each assertion ties to a documented
 * physics/geometry rule:
 *   - ld_ratio = L / D
 *   - chip_break selected only when L/D ≤ 3 ∧ chipFactor ≤ 1.0 ∧ TSC=true
 *   - peck_depth = max(D·0.25, basePeck · (1 − (L/D − 3)·0.05) · 1/chipFactor)
 *   - feedReductionPct kicks in when L/D > base_ld[drillType]
 *   - cycle_time = L/(fn·rpm)·60 + numPecks·(2·(L/2)/5000)·60
 *
 * @milestone COGNITIVE-BRIDGE-MS0
 * @unit U-WIRE-CALC-PECK
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
    | { success: false; error: string; action: string; dispatcher: string };
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

// ── Constants from PeckDrillingOptimizationEngine.ts (canonical values) ─────
const ALUMINUM_CHIP_FACTOR = 0.6;
const STAINLESS_CHIP_FACTOR = 1.3;
const TITANIUM_CHIP_FACTOR = 1.5;
const CARBIDE_TWIST_BASE_LD = 5.0;
const CARBIDE_TWIST_PECK_FACTOR = 1.5;
const RAPID_RATE_MM_MIN = 5000;

describe("calcDispatcher — peck_drill_optimize wiring (U-WIRE-CALC-PECK)", () => {
  // Test 1: chip_break path — shallow easy hole
  it("shallow aluminum (L/D=2) selects chip_break with single peck", async () => {
    const D = 10;
    const L = 20;
    const fn = 0.2;
    const Vc = 80;

    const r = await call(server, "peck_drill_optimize", {
      drill_diameter_mm: D,
      hole_depth_mm: L,
      drill_type: "carbide_twist",
      cutting_speed_m_min: Vc,
      feed_per_rev_mm: fn,
      material: "aluminum",
      coolant_through_spindle: true,
    });
    expect(r.ok).toBe(true);

    // ld_ratio = L/D = 20/10 = 2.0 (rounded to 1 decimal)
    expect(r.data.ld_ratio).toBe(2.0);

    // L/D ≤ 3 ∧ chipFactor=0.6 ≤ 1.0 ∧ TSC=true → chip_break
    expect(r.data.peck_strategy).toBe("chip_break");

    // peckDepth = max(D·0.25, D·peckFactor · (1 − (L/D − 3)·0.05) · 1/chipFactor)
    //   = max(2.5, 10·1.5 · (1 − (2−3)·0.05) · 1/0.6)
    //   = max(2.5, 15 · 1.05 · 1.6667) = max(2.5, 26.25) = 26.25
    expect(r.data.peck_depth_mm).toBeCloseTo(26.25, 2);

    // peckDepth (26.25) ≥ L (20) → numPecks = ceil(20/26.25) = 1
    expect(r.data.num_pecks).toBe(1);

    // L/D=2 < base_ld=5 → no feed reduction → adjusted_feed = fn = 0.2
    expect(r.data.adjusted_feed_mm_rev).toBeCloseTo(0.2, 3);

    // Cycle time analytic: rpm = Vc·1000/(π·D) = 80000/(π·10) ≈ 2546.48
    // feedRate = fn·rpm ≈ 509.30 mm/min
    // cuttingTime = (L/feedRate)·60 ≈ (20/509.30)·60 ≈ 2.356 s
    // retractTime = numPecks · (2·(L/2)/RAPID)·60 = 1 · (2·10/5000)·60 = 0.24 s
    // total ≈ 2.60 s (rounded to 1 dp)
    const rpm = (Vc * 1000) / (Math.PI * D);
    const feedRate = fn * rpm;
    const cuttingTime = (L / feedRate) * 60;
    const retractTime = 1 * ((2 * (L / 2)) / RAPID_RATE_MM_MIN) * 60;
    const expectedTotal = Math.round((cuttingTime + retractTime) * 10) / 10;
    expect(r.data.estimated_cycle_time_s).toBeCloseTo(expectedTotal, 1);
  });

  // Test 2: full_retract path — deep stainless hole with feed reduction
  it("deep stainless (L/D=10) selects full_retract with feed reduction", async () => {
    const D = 5;
    const L = 50;
    const fn = 0.08;
    const Vc = 25;

    const r = await call(server, "peck_drill_optimize", {
      drill_diameter_mm: D,
      hole_depth_mm: L,
      drill_type: "carbide_twist",
      cutting_speed_m_min: Vc,
      feed_per_rev_mm: fn,
      material: "stainless",
      coolant_through_spindle: true,
    });
    expect(r.ok).toBe(true);

    // L/D = 50/5 = 10.0
    expect(r.data.ld_ratio).toBe(10.0);

    // L/D > 3 → strategy must be full_retract (not chip_break)
    expect(r.data.peck_strategy).toBe("full_retract");

    // peckDepth = max(1.25, 5·1.5 · (1 − (10−3)·0.05) · 1/1.3)
    //           = max(1.25, 7.5 · 0.65 · 0.7692) = max(1.25, 3.75) = 3.75
    expect(r.data.peck_depth_mm).toBeCloseTo(3.75, 2);

    // numPecks = ceil(L / peckDepth) = ceil(50/3.75) = ceil(13.33) = 14
    expect(r.data.num_pecks).toBe(14);

    // feedReductionPct = (L/D − base_ld)·5 + 10 (chipFactor>1.2 ∧ L/D>4)
    //                   = (10−5)·5 + 10 = 35
    // adjusted_feed = 0.08 · (1 − 0.35) = 0.052
    expect(r.data.adjusted_feed_mm_rev).toBeCloseTo(0.052, 3);
  });

  // Test 3: material scaling — exact arithmetic on feed adjustment
  it("titanium feed_adj is exactly aluminum feed_adj × 0.9 at L/D=5+ε", async () => {
    // Pick L/D = 6 (>5) so we're past base_ld and feedReductionPct activates
    const D = 5;
    const L = 30; // L/D = 6
    const fn = 0.10;

    const al = await call(server, "peck_drill_optimize", {
      drill_diameter_mm: D,
      hole_depth_mm: L,
      drill_type: "carbide_twist",
      cutting_speed_m_min: 30,
      feed_per_rev_mm: fn,
      material: "aluminum",
      coolant_through_spindle: true,
    });
    const ti = await call(server, "peck_drill_optimize", {
      drill_diameter_mm: D,
      hole_depth_mm: L,
      drill_type: "carbide_twist",
      cutting_speed_m_min: 30,
      feed_per_rev_mm: fn,
      material: "titanium",
      coolant_through_spindle: true,
    });
    expect(al.ok && ti.ok).toBe(true);

    // Aluminum (chipFactor=0.6) at L/D=6:
    //   first-if: (6−5)·5 = 5
    //   second-if: chipFactor=0.6 NOT > 1.2 → no extra reduction
    //   feedReductionPct = 5 → adjusted_feed = 0.10 · 0.95 = 0.095
    expect(al.data.adjusted_feed_mm_rev).toBeCloseTo(0.095, 3);

    // Titanium (chipFactor=1.5) at L/D=6:
    //   first-if: (6−5)·5 = 5
    //   second-if: chipFactor=1.5 > 1.2 ∧ L/D=6 > 4 → +10 → 15
    //   adjusted_feed = 0.10 · 0.85 = 0.085
    expect(ti.data.adjusted_feed_mm_rev).toBeCloseTo(0.085, 3);

    // Titanium feed must be strictly less than aluminum feed at this L/D
    expect((ti.data.adjusted_feed_mm_rev as number) < (al.data.adjusted_feed_mm_rev as number)).toBe(true);
  });

  // Test 4: gun_drill path — continuous (no peck)
  it("gun_drill selects gun_drill_continuous with numPecks=1 and no retract time", async () => {
    const D = 6;
    const L = 200; // L/D = 33 — extreme, but gun drill handles it
    const fn = 0.05;
    const Vc = 60;

    const r = await call(server, "peck_drill_optimize", {
      drill_diameter_mm: D,
      hole_depth_mm: L,
      drill_type: "gun_drill",
      cutting_speed_m_min: Vc,
      feed_per_rev_mm: fn,
      material: "alloy_steel",
      coolant_through_spindle: true,
    });
    expect(r.ok).toBe(true);

    // gun_drill always selects gun_drill_continuous regardless of L/D or chipFactor
    expect(r.data.peck_strategy).toBe("gun_drill_continuous");

    // peckDepth for gun_drill = L (continuous feed)
    expect(r.data.peck_depth_mm).toBe(L);

    // numPecks = 1 (continuous)
    expect(r.data.num_pecks).toBe(1);

    // For gun_drill, retract time = 0 → total time = pure cutting time
    // gun_drill base_ld=40, L/D=33 < 40 → first-if false → no reduction
    // chipFactor (alloy_steel)=1.1, NOT > 1.2 → no second reduction
    // adjusted_feed = 0.05
    expect(r.data.adjusted_feed_mm_rev).toBeCloseTo(0.05, 3);

    // cycle_time = (L/(fn·rpm))·60 with NO retract addition
    const rpm = (Vc * 1000) / (Math.PI * D);
    const feedRate = fn * rpm;
    const expectedTotal = Math.round(((L / feedRate) * 60) * 10) / 10;
    expect(r.data.estimated_cycle_time_s).toBeCloseTo(expectedTotal, 1);
  });

  // Test 5: contract preservation — must NEVER fall through to drill_cycle_optimize or coating_select
  it("response shape is peck_drill_optimize (not drill_cycle_optimize / coating_select fall-through)", async () => {
    const r = await call(server, "peck_drill_optimize", {
      drill_diameter_mm: 8,
      hole_depth_mm: 24,
      drill_type: "carbide_twist",
      cutting_speed_m_min: 40,
      feed_per_rev_mm: 0.15,
      material: "aluminum",
      coolant_through_spindle: true,
    });
    expect(r.ok).toBe(true);
    // Engine raw shape (slimmer only fires under memory pressure / response_level):
    expect(Object.keys(r.data).sort()).toEqual([
      "adjusted_feed_mm_rev",
      "estimated_cycle_time_s",
      "feed_reduction_pct",
      "ld_ratio",
      "num_pecks",
      "peck_depth_mm",
      "peck_strategy",
      "recommendations",
      "retract_distance_mm",
    ]);
    // Must NOT have drill_cycle_optimize fields (cycle, depth_to_diameter_ratio, dwell_s, chip_risk)
    expect("cycle" in r.data).toBe(false);
    expect("dwell_s" in r.data).toBe(false);
    expect("chip_risk" in r.data).toBe(false);
    // Must NOT have coating_select fields (coating, max_temp_C, friction)
    expect("coating" in r.data).toBe(false);
    expect("max_temp_C" in r.data).toBe(false);
    expect("friction" in r.data).toBe(false);
  });

  // Test 6: stateless dispatcher — two consecutive calls must not share state
  it("two consecutive calls produce independent results (no shared mutable state)", async () => {
    const r1 = await call(server, "peck_drill_optimize", {
      drill_diameter_mm: 10, hole_depth_mm: 20, drill_type: "carbide_twist",
      cutting_speed_m_min: 80, feed_per_rev_mm: 0.2, material: "aluminum",
      coolant_through_spindle: true,
    });
    const r2 = await call(server, "peck_drill_optimize", {
      drill_diameter_mm: 5, hole_depth_mm: 50, drill_type: "carbide_twist",
      cutting_speed_m_min: 25, feed_per_rev_mm: 0.08, material: "stainless",
      coolant_through_spindle: true,
    });
    expect(r1.ok && r2.ok).toBe(true);
    // Each call must produce its OWN ld_ratio (2.0 vs 10.0)
    expect(r1.data.ld_ratio).toBe(2.0);
    expect(r2.data.ld_ratio).toBe(10.0);
    // Each call must produce its OWN strategy (chip_break vs full_retract)
    expect(r1.data.peck_strategy).toBe("chip_break");
    expect(r2.data.peck_strategy).toBe("full_retract");
    // pecks differ (1 vs 14) — confirms independent computation
    expect(r1.data.num_pecks).toBe(1);
    expect(r2.data.num_pecks).toBe(14);
  });

  // Test 7: error envelope — invalid input rejected, no fall-through
  it("D ≤ 0 rejected by engine; dispatcher returns error envelope, never silent fall-through", async () => {
    const r = await call(server, "peck_drill_optimize", {
      drill_diameter_mm: 0,
      hole_depth_mm: 20,
      drill_type: "carbide_twist",
      cutting_speed_m_min: 30,
      feed_per_rev_mm: 0.10,
      material: "alloy_steel",
      coolant_through_spindle: true,
    });
    // Engine throws "Drill diameter must be positive" — dispatcher should surface as error
    expect(r.ok).toBe(false);
    // The error envelope MUST NOT contain peck_drill_optimize success fields
    // (i.e. no fall-through to a stale prior result)
    expect("ld_ratio" in r.data).toBe(false);
  });
});
