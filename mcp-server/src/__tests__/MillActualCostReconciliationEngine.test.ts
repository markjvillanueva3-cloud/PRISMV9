import { describe, it, expect, beforeEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync, existsSync } from "node:fs";
import {
  MillActualCostReconciliationEngine,
  MULTIPLIER_MIN,
  MULTIPLIER_MAX,
  type ReconcileInput,
  type MillQuoteSnapshot,
  type MillShopActuals,
} from "../engines/MillActualCostReconciliationEngine.js";

let tmpPath: string;
let eng: MillActualCostReconciliationEngine;

function freshEngine(): MillActualCostReconciliationEngine {
  tmpPath = join(tmpdir(), `mill-reconcile-test-${Date.now()}-${Math.random()}.json`);
  return new MillActualCostReconciliationEngine(tmpPath);
}

function nominalQuote(o: Partial<MillQuoteSnapshot> = {}): MillQuoteSnapshot {
  // All bucket totals match physics: cycle 1000min×$90/60=$1500;
  // setup 30min×$95/60=$47.50; fixture 100 total; energy 200kWh×$0.15=$30.
  return {
    quote_id: "Q-001",
    quantity: 100,
    predicted_buckets: {
      material: 1000,        // 50 kg × $20/kg
      tool_wear: 200,        // 4 changes × $50
      cycle: 1500,           // (1000/60) × $90
      setup: 47.5,           // (30/60)  × $95
      fixture_amort: 100,    // total (mill-canonical)
      energy: 30,            // 200 × $0.15
      secondary: 0,
      overhead: 250,
    },
    predicted_cycle_time_min: 1000,
    predicted_material_mass_kg: 50,
    predicted_setup_time_min: 30,
    predicted_tool_changes: 4,
    predicted_fixture_amort_usd: 100,
    predicted_energy_kwh: 200,
    ...o,
  };
}

function nominalActuals(o: Partial<MillShopActuals> = {}): MillShopActuals {
  return {
    actual_cycle_time_min: 1000,
    actual_material_mass_kg: 50,
    actual_tool_changes: 4,
    actual_setup_time_min: 30,
    actual_scrap_parts: 0,
    actual_rework_parts: 0,
    actual_quantity_completed: 100,
    actual_fixture_amort_usd: 100,
    actual_energy_kwh: 200,
    ...o,
  };
}

function nominalInput(qo: Partial<MillQuoteSnapshot> = {}, ao: Partial<MillShopActuals> = {}): ReconcileInput {
  return {
    quote: nominalQuote(qo),
    actuals: nominalActuals(ao),
    customer: "JM_DIE",
    material_iso_group: "P",
    part_number: "PN-1234",
    job_id: "J-001",
    energy_rate_usd_kwh: 0.15,
  };
}

describe("MillActualCostReconciliationEngine", () => {
  beforeEach(() => {
    if (tmpPath && existsSync(tmpPath)) rmSync(tmpPath, { force: true });
    eng = freshEngine();
  });

  it("getStats: 8 buckets (2 mill-canonical), 8 root causes (1 mill-canonical), [0.8, 1.2] bounds", () => {
    const s = eng.getStats();
    expect(s.buckets.length).toBe(8);
    expect(s.mill_canonical_buckets).toEqual(["fixture_amort", "energy"]);
    expect(s.root_causes.length).toBe(8);
    expect(s.mill_canonical_root_causes).toEqual(["fixture"]);
    expect(s.multiplier_bounds).toEqual([MULTIPLIER_MIN, MULTIPLIER_MAX]);
  });

  it("perfect-match actuals → zero variance + root_cause='none'", () => {
    const r = eng.reconcile(nominalInput());
    expect(r.total_variance_usd).toBe(0);
    expect(r.total_variance_pct).toBe(0);
    expect(r.root_cause).toBe("none");
  });

  it("cycle 1.2× predicted → cycle variance + root_cause='programming'", () => {
    const r = eng.reconcile(nominalInput({}, { actual_cycle_time_min: 1200 }));
    const cycle = r.buckets.find(b => b.bucket === "cycle")!;
    // 1200 min × $90/60 = $1800 actual vs $1500 predicted → +$300
    expect(cycle.variance_usd).toBeCloseTo(300, 1);
    expect(cycle.variance_pct).toBeCloseTo(20, 1);
    expect(r.root_cause).toBe("programming");
  });

  it("tool_changes 2× predicted → tool_wear variance + root_cause='tooling'", () => {
    const r = eng.reconcile(nominalInput({}, { actual_tool_changes: 8 }));
    const tool = r.buckets.find(b => b.bucket === "tool_wear")!;
    expect(tool.variance_usd).toBeCloseTo(200, 1); // 200 × (8/4) = 400; -200 predicted = +200
    expect(tool.variance_pct).toBeCloseTo(100, 1);
    expect(r.root_cause).toBe("tooling");
  });

  it("setup_time 20× predicted → setup variance + root_cause='setup' (when setup dominates)", () => {
    // predicted setup = $47.5 (30 min × $95/60); actual = 600 min × $95/60 = $950; variance = +$902.50
    const r = eng.reconcile(nominalInput({}, { actual_setup_time_min: 600 }));
    expect(r.root_cause).toBe("setup");
  });

  it("material mass 1.5× predicted → material variance + root_cause='material'", () => {
    const r = eng.reconcile(nominalInput({}, { actual_material_mass_kg: 75 }));
    const mat = r.buckets.find(b => b.bucket === "material")!;
    expect(mat.variance_usd).toBeCloseTo(500, 1); // 1000 × 1.5 - 1000
    expect(r.root_cause).toBe("material");
  });

  it("MILL-CANONICAL: fixture_amort 5× predicted → root_cause='fixture'", () => {
    // predicted fixture = $100 total; actual = $500 total; variance = +$400
    const r = eng.reconcile(nominalInput({}, { actual_fixture_amort_usd: 500 }));
    expect(r.root_cause).toBe("fixture");
  });

  it("MILL-CANONICAL: energy 3× predicted → root_cause='machine' (spindle load anomaly)", () => {
    const r = eng.reconcile(nominalInput({}, { actual_energy_kwh: 600 }));
    const energy = r.buckets.find(b => b.bucket === "energy")!;
    // 600 × 0.15 = 90 actual; predicted 30 → +60 variance
    expect(energy.variance_usd).toBeCloseTo(60, 1);
    expect(r.root_cause).toBe("machine");
  });

  it("high scrap rate (>=5%) → root_cause='operator' when no other big variances", () => {
    const r = eng.reconcile(nominalInput({}, { actual_scrap_parts: 15 }));
    expect(r.physics_deltas.scrap_rate_pct).toBeCloseTo(15, 1);
    expect(r.root_cause).toBe("operator");
  });

  it("multipliers clamped to [0.8, 1.2] — actual 5× predicted clamps to 1.2", () => {
    const r = eng.reconcile(nominalInput({}, { actual_cycle_time_min: 5000 })); // 5× cycle
    const cycle = r.buckets.find(b => b.bucket === "cycle")!;
    expect(cycle.multiplier).toBe(MULTIPLIER_MAX); // 1.2
  });

  it("multipliers clamped to [0.8, 1.2] — actual 0.1× predicted clamps to 0.8", () => {
    const r = eng.reconcile(nominalInput({}, { actual_cycle_time_min: 100 }));
    const cycle = r.buckets.find(b => b.bucket === "cycle")!;
    expect(cycle.multiplier).toBe(MULTIPLIER_MIN); // 0.8
  });

  it("physics deltas reflect mill-canonical fixture + energy deltas", () => {
    const r = eng.reconcile(nominalInput({}, {
      actual_fixture_amort_usd: 250,
      actual_energy_kwh: 300,
    }));
    expect(r.physics_deltas.fixture_amort_usd_delta).toBeCloseTo(150, 1);
    expect(r.physics_deltas.energy_kwh_delta).toBeCloseTo(100, 1);
  });

  it("custom machine_rate_usd_hr overrides default 90", () => {
    // 1000 min × $120/60 = $2000 actual cycle vs $1500 predicted → +$500
    const r = eng.reconcile({
      ...nominalInput(),
      machine_rate_usd_hr: 120,
    });
    const cycle = r.buckets.find(b => b.bucket === "cycle")!;
    expect(cycle.actual_usd).toBeCloseTo(2000, 1);
    expect(cycle.variance_usd).toBeCloseTo(500, 1);
  });

  it("multiplier 1.0 when predicted=0 (avoid div-by-zero)", () => {
    const q = nominalQuote();
    q.predicted_buckets.secondary = 0; // no secondary cost
    const r = eng.reconcile({ ...nominalInput(), quote: q });
    const sec = r.buckets.find(b => b.bucket === "secondary")!;
    expect(sec.multiplier).toBe(1.0);
    expect(sec.variance_pct).toBe(0);
  });

  it("runningAccuracy returns zeros when no reconciliations yet", () => {
    const acc = eng.runningAccuracy();
    expect(acc.sample_count).toBe(0);
    expect(acc.mean_abs_variance_pct).toBe(0);
  });

  it("runningAccuracy aggregates last N reconciliations", () => {
    eng.reconcile(nominalInput({}, { actual_cycle_time_min: 1100 })); // +6.7% total
    eng.reconcile(nominalInput({}, { actual_cycle_time_min: 900 }));  // -6.7% total
    const acc = eng.runningAccuracy();
    expect(acc.sample_count).toBe(2);
    expect(acc.mean_abs_variance_pct).toBeGreaterThan(0);
    expect(Math.abs(acc.bias_signed_mean_pct)).toBeLessThan(1); // cancels out
  });

  it("runningAccuracy filter by customer", () => {
    eng.reconcile({ ...nominalInput({}, { actual_cycle_time_min: 1200 }), customer: "ACME" });
    eng.reconcile({ ...nominalInput({}, { actual_cycle_time_min: 1100 }), customer: "BETA" });
    const acmeAcc = eng.runningAccuracy({ customer: "ACME" });
    const betaAcc = eng.runningAccuracy({ customer: "BETA" });
    expect(acmeAcc.sample_count).toBe(1);
    expect(betaAcc.sample_count).toBe(1);
  });

  it("listRecent returns recent reconciliations (default limit 20)", () => {
    eng.reconcile(nominalInput());
    eng.reconcile(nominalInput());
    const recent = eng.listRecent();
    expect(recent.length).toBe(2);
  });

  it("invalid input: negative actual_cycle_time_min rejected by schema", () => {
    expect(() => eng.reconcile(nominalInput({}, { actual_cycle_time_min: -10 } as Partial<MillShopActuals>))).toThrow();
  });

  it("variability ≥3: programming, tooling, fixture root causes all reach correctly under their respective dominant variances", () => {
    eng.__resetForTests();
    const r1 = eng.reconcile(nominalInput({}, { actual_cycle_time_min: 1500 }));
    eng.__resetForTests();
    const r2 = eng.reconcile(nominalInput({}, { actual_tool_changes: 12 }));
    eng.__resetForTests();
    const r3 = eng.reconcile(nominalInput({}, { actual_fixture_amort_usd: 1000 }));
    expect(r1.root_cause).toBe("programming");
    expect(r2.root_cause).toBe("tooling");
    expect(r3.root_cause).toBe("fixture");
  });

  it("reconciled_at is ISO timestamp", () => {
    const r = eng.reconcile(nominalInput());
    expect(r.reconciled_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("persistence: new engine instance loads ring buffer of prior reconciliations", () => {
    eng.reconcile(nominalInput({}, { actual_cycle_time_min: 1100 }));
    eng.reconcile(nominalInput({}, { actual_cycle_time_min: 1200 }));
    const eng2 = new MillActualCostReconciliationEngine(tmpPath);
    expect(eng2.listRecent().length).toBe(2);
  });

  it("multipliers_for_next_quote populated for all 8 buckets", () => {
    const r = eng.reconcile(nominalInput());
    expect(Object.keys(r.multipliers_for_next_quote).sort()).toEqual(
      ["cycle", "energy", "fixture_amort", "material", "overhead", "secondary", "setup", "tool_wear"],
    );
  });

  it("adversarial: zero predicted_tool_changes does not div-zero on tool_wear variance", () => {
    const q = nominalQuote();
    q.predicted_tool_changes = 0;
    q.predicted_buckets.tool_wear = 200;
    const r = eng.reconcile({ ...nominalInput(), quote: q, actuals: nominalActuals({ actual_tool_changes: 5 }) });
    const tool = r.buckets.find(b => b.bucket === "tool_wear")!;
    expect(Number.isFinite(tool.variance_usd)).toBe(true);
  });

  it("__resetForTests clears state", () => {
    eng.reconcile(nominalInput());
    expect(eng.listRecent().length).toBe(1);
    eng.__resetForTests();
    expect(eng.listRecent().length).toBe(0);
  });
});
