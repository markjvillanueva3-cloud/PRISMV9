/**
 * EDMMaterialMachineWireEngine.isolated.test.ts — ISOLATED UNIT (WEDM-DEPTH)
 *
 * WHY THIS FILE EXISTS (india audit gap):
 *   EDMMaterialMachineWireEngine is exercised only through pipeline/E2E paths
 *   (`src/__tests__/wedm-pipeline-engines.test.ts:222-263` — three happy-path
 *   smoke cases with `toBeDefined()`/`toBeTruthy()`/`toBeGreaterThan(0)` only,
 *   plus a full-pipeline E2E). There is NO isolated unit pinning the reference
 *   values (machinability class, recast crack probability, spark-gap tier, wire
 *   selection, tension, wire consumption cost) nor round-trips through
 *   edmDispatcher. This file adds one: happy + failure + adversarial, with
 *   reference values HAND-DERIVED from the engine's documented formulas.
 *
 * REFERENCE-VALUE DERIVATION (verified against EDMMaterialMachineWireEngine.ts):
 *   classifyMachinability (line 744): score = mrr*40 + clamp(resistivity/10,0,10)*3
 *       + clamp(thermalCond/50,0,5)*2 - (SLOW?15:0) - (melt>2000?10:0);
 *       A>=50, B>=35, C>=20, D<20
 *   assessRecastRisk (line 787): +40 carbon>=1.5 / +25 >=0.8 / +10 >=0.4;
 *       +15 hrc>55 / +8 hrc>45; +20 HIGH_CRACK_RISK flag; +10 thermalCond<15;
 *       clamp[0,95]; risk <15 low / <35 moderate / <60 high / else critical
 *   calculateTension (line 1340): brass/coated 55%, moly 45%, tungsten 35% of UTS;
 *       +heightBoost(>100mm), -5% thin(<10mm), -5% high-energy, +3% low-energy;
 *       clamp[25,70]; tension_N = UTS * pct/100
 *   estimateWireCost (line 1431): roughTime=cutLen/roughSpeed, wireFeed 10 m/min (brass);
 *       finishing = (passes-1) skims at 0.6 feed / 1.5x speed; threading 0.5m/pass
 *
 * NOTE ON CONSTANTS: this engine ships its own MATERIALS_DB / WIRE_DB / MACHINE_DB
 * inline heuristic tables (spark-gap, MRR factors) — it does NOT consume
 * CANONICAL_KIENZLE (a metal-cutting force constant, irrelevant to EDM) nor the
 * EDM_PHYSICS block. So no physics constant is inlined in THIS test — reference
 * values are derived from the engine formulas above. EDM_PHYSICS is imported for
 * an independent canonical-source cross-check (gap-voltage tiers) only.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { edmMaterialMachineWireEngine } from "../engines/EDMMaterialMachineWireEngine.js";
import { EDM_PHYSICS } from "../physics/constants.js";

// ---------------------------------------------------------------------------
// Dispatcher round-trip harness
// ---------------------------------------------------------------------------
let invoke: (action: string, params?: any) => Promise<any>;

class FakeServer {
  private handler: ((args: { action: string; params: any }) => Promise<any>) | null = null;
  tool(_name: string, _desc: string, _schema: any, handler: any) { this.handler = handler; }
  async call(action: string, params: any = {}) {
    if (!this.handler) throw new Error("dispatcher not registered");
    return this.handler({ action, params });
  }
}

beforeAll(async () => {
  const { registerEdmDispatcher } = await import("../tools/dispatchers/edmDispatcher.js");
  const srv = new FakeServer();
  registerEdmDispatcher(srv as any);
  invoke = async (action, params) => {
    const resp = await srv.call(action, params ?? {});
    if (resp?.content?.[0]?.text) {
      try { return JSON.parse(resp.content[0].text); } catch { return resp.content[0].text; }
    }
    return resp;
  };
});

describe("EDMMaterialMachineWireEngine — isolated reference-value units", () => {
  // =========================================================================
  // assessMaterial — machinability class, recast crack risk, spark-gap tier
  // =========================================================================

  it("assessMaterial(copper_C110): Class A (score 90.5), spark gap 'Very small', recast 0% low", () => {
    // score = 2.0*40 + clamp(1.7/10,0,10)*3 + clamp(390/50→5)*2 = 80 + 0.51 + 10 = 90.51 → A
    // carbon 0 → crackProb 0 → low
    const r = edmMaterialMachineWireEngine.assessMaterial({ material: "copper_C110" });
    expect(r.material_key).toBe("copper_C110");
    expect(r.machinability_class).toBe("A");
    expect(r.mrr_factor).toBe(2.0);
    expect(r.electrical.spark_gap_behavior).toContain("Very small gap"); // resistivity 1.7 < 5
    expect(r.recast.crack_probability_pct).toBe(0);
    expect(r.recast.risk_level).toBe("low");
  });

  it("assessMaterial(steel_1045): Class B (score 46.8), 'Normal spark gap', recast 10% low", () => {
    // score = 1.0*40 + clamp(16/10,0,10)*3 + clamp(49.8/50)*2 = 40 + 4.8 + 1.992 = 46.79 → B
    // carbon 0.45 >=0.4 → +10 → crackProb 10 → low
    const r = edmMaterialMachineWireEngine.assessMaterial({ material: "steel_1045" });
    expect(r.machinability_class).toBe("B");
    expect(r.electrical.spark_gap_behavior).toContain("Normal spark gap"); // resistivity 16 in [5,25)
    expect(r.recast.crack_probability_pct).toBe(10);
    expect(r.recast.risk_level).toBe("low");
    expect(r.thermal.melting_point_C).toBe(1520);
  });

  it("assessMaterial(D2, 60 HRC): Class A, CRITICAL recast (75% crack), 'Moderate gap'", () => {
    // machinability: 1.0*40 + clamp(65/10→6.5)*3 + clamp(20/50=0.4)*2 = 40+19.5+0.8 = 60.3 → A
    // recast: carbon 2.1>=1.5 (+40) + hrc 60>55 (+15) + HIGH_CRACK_RISK (+20) = 75 → critical
    const r = edmMaterialMachineWireEngine.assessMaterial({ material: "D2", hardness_hrc: 60 });
    expect(r.material_key).toBe("D2_tool");
    expect(r.machinability_class).toBe("A");
    expect(r.recast.crack_probability_pct).toBe(75);
    expect(r.recast.risk_level).toBe("critical");
    expect(r.electrical.spark_gap_behavior).toContain("Moderate gap"); // resistivity 65 in [25,80)
    expect(r.thermal.melting_point_C).toBe(1421);
    expect(r.warnings.some(w => w.includes("HIGH CRACK RISK"))).toBe(true);
  });

  it("assessMaterial(carbide_WC): Class D — very difficult (score 12.4, melting>2000 penalty)", () => {
    // score = 0.3*40 + clamp(20/10=2)*3 + clamp(110/50→2.2)*2 - 10(melt 2870>2000) = 12+6+4.4-10 = 12.4 → D
    const r = edmMaterialMachineWireEngine.assessMaterial({ material: "carbide" });
    expect(r.material_key).toBe("carbide_WC");
    expect(r.machinability_class).toBe("D");
  });

  // =========================================================================
  // selectWire / optimizeWireDiameter — deterministic corner-radius filtering
  // =========================================================================

  it("selectWire(min_corner 0.05mm): only tungsten_005 (0.03mm) is viable → 0.05mm wire, est speed 1.25", () => {
    // viable = wires with min_corner_radius_mm <= 0.05 → only tungsten_005 (0.03)
    // est speed = round2(((0.5+2)/2)*mrr(steel 1.0)*boost(1.0)) = 1.25
    const r = edmMaterialMachineWireEngine.selectWire({
      material: "steel_1045", thickness_mm: 20, min_corner_radius_mm: 0.05, priority: "speed",
    });
    expect(r.recommended_wire).toBe("tungsten_005");
    expect(r.wire_type).toBe("tungsten");
    expect(r.diameter_mm).toBe(0.05);
    expect(r.estimated_speed_mm_min).toBeCloseTo(1.25, 5);
  });

  it("optimizeWireDiameter(0.15mm, 50mm): largest wire meeting corner = brass_025, clearance 0.01mm", () => {
    // sorted largest-first, first with min_corner<=0.15 & height ok → brass_025 (0.14)
    const r = edmMaterialMachineWireEngine.optimizeWireDiameter(0.15, 50);
    expect(r.wire_key).toBe("brass_025");
    expect(r.optimal_diameter_mm).toBe(0.25);
    expect(r.corner_clearance_mm).toBeCloseTo(0.01, 5); // 0.15 - 0.14
  });

  it("optimizeWireDiameter(0.05mm, 50mm): only tungsten_005 meets corner, clearance 0.02mm", () => {
    const r = edmMaterialMachineWireEngine.optimizeWireDiameter(0.05, 50);
    expect(r.wire_key).toBe("tungsten_005");
    expect(r.optimal_diameter_mm).toBe(0.05);
    expect(r.corner_clearance_mm).toBeCloseTo(0.02, 5); // 0.05 - 0.03
  });

  // =========================================================================
  // calculateTension — reference N values from % of wire UTS
  // =========================================================================

  it("calculateTension(brass_025, 50mm, medium): 55% of 900N UTS = 495N, low break risk", () => {
    const r = edmMaterialMachineWireEngine.calculateTension("brass_025", 50, "medium");
    expect(r.optimal_tension_N).toBeCloseTo(495, 5);
    expect(r.tension_pct_of_uts).toBe(55);
    expect(r.break_risk).toBe("low");
  });

  it("calculateTension(brass_025, 250mm tall, high energy): +3% height -5% energy → 53% = 477N", () => {
    // base 55 + heightBoost min((250-100)/500*10,10)=3 → 58; high energy -5 → 53; 900*0.53=477
    const r = edmMaterialMachineWireEngine.calculateTension("brass_025", 250, "high");
    expect(r.tension_pct_of_uts).toBe(53);
    expect(r.optimal_tension_N).toBeCloseTo(477, 5);
    expect(r.break_risk).toBe("low"); // 53 not > 55
    expect(r.adjustments.some(a => a.includes("tall workpiece"))).toBe(true);
  });

  // =========================================================================
  // estimateWireCost — reference consumption/cost derivation
  // =========================================================================

  it("estimateWireCost(brass_025, 100mm cut, 50mm thick, 4 passes): 246.44m / $4.93, breakdown pinned", () => {
    // avgSpeed=(3+15)/2=9; thicknessAdjust=max(0.3,1-(50-50)/500)=1; roughSpeed=9; feed=10 m/min
    // roughTime=100/9=11.111; roughing=111.111m
    // finishPasses=3; finishTime=3*(100/13.5)=22.222; finishing=22.222*10*0.6=133.333m
    // threading=4*0.5=2m; total=246.444m; cost=246.444*0.02=4.9289→4.93
    const r = edmMaterialMachineWireEngine.estimateWireCost("brass_025", 100, 50, 4, 1);
    expect(r.wire_consumed_m).toBeCloseTo(246.44, 2);
    expect(r.cost_usd).toBeCloseTo(4.93, 2);
    expect(r.cost_per_part_usd).toBeCloseTo(4.93, 2);
    expect(r.breakdown.roughing_m).toBeCloseTo(111.11, 2);
    expect(r.breakdown.finishing_m).toBeCloseTo(133.33, 2);
    expect(r.breakdown.threading_waste_m).toBeCloseTo(2, 5);
    expect(r.wire_consumed_kg).toBeCloseTo(0.1, 5);
  });

  // =========================================================================
  // selectMachine — travel-envelope filtering + score-sort invariant
  // =========================================================================

  it("selectMachine(200x150x50mm, D2): recommends machines, sorted by score descending", () => {
    const r = edmMaterialMachineWireEngine.selectMachine({
      part_x_mm: 200, part_y_mm: 150, part_z_mm: 50, material: "D2",
    });
    expect(r.recommended_machines.length).toBeGreaterThan(0);
    for (let i = 1; i < r.recommended_machines.length; i++) {
      expect(r.recommended_machines[i - 1].score).toBeGreaterThanOrEqual(r.recommended_machines[i].score);
    }
  });

  // =========================================================================
  // CANONICAL-SOURCE CROSS-CHECK (uses ../physics/constants.js EDM_PHYSICS)
  // =========================================================================

  it("canonical cross-check: high-resistivity materials → elevated open voltage, consistent with EDM_PHYSICS gap-voltage tiers", () => {
    // EDM_PHYSICS canonical: precision < standard < high_speed open-circuit voltage.
    const gv = EDM_PHYSICS.gap_voltage.open_circuit_V;
    expect(gv.high_speed).toBeGreaterThan(gv.standard);
    expect(gv.standard).toBeGreaterThan(gv.precision);
    // Inconel 718 resistivity 125 µΩcm ([80,150) band) → engine explicitly recommends
    // ">100V" open voltage — matching the canonical high_speed open-circuit tier (100 V),
    // well above the canonical standard (80 V) suitable for low-resistivity work.
    const inc = edmMaterialMachineWireEngine.assessMaterial({ material: "inconel_718" });
    expect(inc.electrical.resistivity_uOhm_cm).toBe(125);
    expect(inc.electrical.spark_gap_behavior).toContain("Large gap");
    expect(inc.electrical.servo_strategy).toContain("100V"); // ">100V" ≈ canonical high_speed tier
    expect(gv.high_speed).toBe(100);
    // Ti6Al4V resistivity 178 µΩcm (>=150) → the extreme "very large gap" / max-voltage tier.
    const ti = edmMaterialMachineWireEngine.assessMaterial({ material: "Ti6Al4V" });
    expect(ti.electrical.resistivity_uOhm_cm).toBe(178);
    expect(ti.electrical.spark_gap_behavior).toContain("Very large gap");
    expect(ti.electrical.servo_strategy).toContain("Maximum open voltage");
  });

  // =========================================================================
  // FAILURE MODES (unknown material / unknown wire key / unknown controller)
  // =========================================================================

  it("failure: unknown material → conservative Class C default with warning, no throw", () => {
    const r = edmMaterialMachineWireEngine.assessMaterial({ material: "unobtanium_9000" });
    expect(r.machinability_class).toBe("C");
    expect(r.warnings.some(w => w.includes("not found in database"))).toBe(true);
    expect(r.thermal.melting_point_C).toBeGreaterThan(0); // conservative default, not NaN
  });

  it("failure: unknown wire key in calculateTension → 10N conservative default, moderate risk", () => {
    const r = edmMaterialMachineWireEngine.calculateTension("phantom_wire", 50, "medium");
    expect(r.optimal_tension_N).toBe(10);
    expect(r.tension_pct_of_uts).toBe(50);
    expect(r.break_risk).toBe("moderate");
    expect(r.adjustments.some(a => a.includes("Unknown wire"))).toBe(true);
  });

  it("failure: unknown wire key in estimateWireCost → all-zero cost (no NaN)", () => {
    const r = edmMaterialMachineWireEngine.estimateWireCost("phantom_wire", 100, 50, 4, 1);
    expect(r.wire_consumed_m).toBe(0);
    expect(r.cost_usd).toBe(0);
    expect(Number.isNaN(r.cost_usd)).toBe(false);
  });

  it("failure: unknown controller in mapController → 'Unknown controller brand' strength, empty features", () => {
    const r = edmMaterialMachineWireEngine.mapController("BoschEDM" as any);
    expect(r.features.length).toBe(0);
    expect(r.strengths.some(s => s.includes("Unknown controller brand"))).toBe(true);
  });

  // =========================================================================
  // ADVERSARIAL (NaN / negative / oversized inputs)
  // =========================================================================

  it("adversarial: NaN hardness_hrc is silently ignored (falsy short-circuit) → recast 60% not 75%", () => {
    // D2: hardness contribution requires `hardnessHrc && hardnessHrc>55`; NaN is falsy → skipped.
    // crackProb = 40(carbon) + 20(HIGH_CRACK_RISK) = 60 → critical (>=60).
    const r = edmMaterialMachineWireEngine.assessMaterial({ material: "D2", hardness_hrc: NaN });
    expect(r.recast.crack_probability_pct).toBe(60);
    expect(r.recast.risk_level).toBe("critical");
    expect(Number.isNaN(r.recast.crack_probability_pct)).toBe(false);
  });

  it("adversarial: negative thickness in assessMaterial does not crash and adds no bogus thickness rec", () => {
    const r = edmMaterialMachineWireEngine.assessMaterial({ material: "steel_1045", thickness_mm: -5 });
    expect(r.machinability_class).toBe("B");            // unchanged by thickness
    expect(Array.isArray(r.recommendations)).toBe(true); // no throw, structured output
    expect(r.recommendations.some(rec => rec.includes("Tall workpiece"))).toBe(false);
  });

  it("adversarial: oversized part (2000mm cube) rejects EVERY machine — no recommendation", () => {
    const r = edmMaterialMachineWireEngine.selectMachine({
      part_x_mm: 2000, part_y_mm: 2000, part_z_mm: 2000, material: "steel_1045",
    });
    expect(r.recommended_machines.length).toBe(0);
    expect(r.rejected_machines.length).toBeGreaterThan(0);
    expect(r.rejected_machines.some(m => m.reason.includes("travel insufficient"))).toBe(true);
  });

  // =========================================================================
  // DISPATCHER ROUND-TRIP (edmDispatcher → wedm_* → engine)
  // =========================================================================

  it("round-trip: prism_edm wedm_assess_material(D2) → Class A, critical recast, melting 1421", async () => {
    const r = await invoke("wedm_assess_material", { material: "D2", hardness_hrc: 60 });
    const payload = r?.result ?? r;
    expect(payload.machinability_class).toBe("A");
    expect(payload.thermal.melting_point_C).toBe(1421);
    expect(payload.recast.risk_level).toBe("critical"); // 60 or 75 both → critical (schema-strip robust)
    expect(payload.recast.crack_probability_pct).toBeGreaterThanOrEqual(60);
  });

  it("round-trip: prism_edm wedm_select_wire(min_corner 0.05) → tungsten_005 0.05mm wire", async () => {
    const r = await invoke("wedm_select_wire", {
      material: "steel_1045", thickness_mm: 20, min_corner_radius_mm: 0.05, priority: "speed",
    });
    const payload = r?.result ?? r;
    expect(payload.recommended_wire).toBe("tungsten_005");
    expect(payload.diameter_mm).toBe(0.05);
  });
});
