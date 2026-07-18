/**
 * ConsumableReconciliationEngine.test.ts -- QUOTING-OPTIMAL/U4a
 *
 * Real-value + adversarial coverage for the per-consumable-type reconciliation
 * core. All numeric asserts are exact reference values (R9 -- a test must fail
 * when the business math changes). Uses a hermetic temp jm-tool-purchases.json
 * fixture so the advisory-prior path is deterministic and never depends on the
 * (gitignored) live corpus.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  consumableReconciliationEngine,
  ConsumableReconciliationEngine,
  type ConsumableReconcileInput,
} from "../engines/ConsumableReconciliationEngine.js";

// Hermetic advisory-prior fixture: byType {count, spend} -> spend/count $/line-item.
// insert 200/$1000 = $5.00; drill 100/$500 = $5.00. NO wire/coolant/abrasive keys
// (mirrors the live corpus, which has no such keys -> those categories -> "none").
let fixtureDir: string;
let basisPath: string;
beforeAll(() => {
  fixtureDir = mkdtempSync(join(tmpdir(), "consrec-"));
  basisPath = join(fixtureDir, "jm-tool-purchases.json");
  writeFileSync(
    basisPath,
    JSON.stringify({
      schemaVersion: "1.0.0",
      byType: {
        insert: { count: 200, spend: 1000 }, // $5.00 / line-item
        drill: { count: 100, spend: 500 }, // $5.00 / line-item
        tap: { count: 10, spend: 20 }, // $2.00 / line-item
        "misc-tooling": { count: 0, spend: 500 }, // count 0 -> skipped (guard)
      },
    }),
    "utf8",
  );
});
afterAll(() => {
  rmSync(fixtureDir, { recursive: true, force: true });
});

const baseInput = (over: Partial<ConsumableReconcileInput> = {}): ConsumableReconcileInput => ({
  job_id: "J-100",
  quote_id: "Q-100",
  predicted: [],
  actual: [],
  unit_cost_basis_path: basisPath,
  ...over,
});

describe("ConsumableReconciliationEngine.reconcile -- happy path (exact math)", () => {
  it("caller-supplied cost: over-consumption -> positive variance + bounded multiplier", () => {
    const r = consumableReconciliationEngine.reconcile(
      baseInput({
        predicted: [{ type: "roughing_inserts", category: "insert", predicted_qty: 4, cost_per_unit: 12.5 }],
        actual: [{ type: "roughing_inserts", qty_used: 6, qty_broken: 1 }],
      }),
    );
    const c = r.consumables[0];
    expect(c.cost_per_unit_source).toBe("caller");
    expect(c.cost_per_unit).toBe(12.5);
    expect(c.predicted_cost_usd).toBe(50); // 4 * 12.5
    expect(c.actual_cost_usd).toBe(75); // 6 * 12.5
    expect(c.variance_qty).toBe(2); // 6 - 4
    expect(c.variance_qty_pct).toBe(50); // 2/4 * 100
    expect(c.variance_cost_usd).toBe(25); // 75 - 50
    expect(c.variance_cost_pct).toBe(50);
    expect(c.breakage_rate_pct).toBeCloseTo(16.67, 2); // 1/6 * 100
    expect(c.multiplier).toBe(1.2); // 75/50 = 1.5 -> clamped to 1.2
    expect(r.total_predicted_consumable_usd).toBe(50);
    expect(r.total_actual_consumable_usd).toBe(75);
    expect(r.total_variance_usd).toBe(25);
    expect(r.total_variance_pct).toBe(50);
    expect(r.feedback_multipliers.roughing_inserts).toBe(1.2);
    expect(r.reconciliation_id).toBe("consrec-Q-100-J-100");
  });

  it("multi-type roll-up: exact totals across 2 types", () => {
    const r = consumableReconciliationEngine.reconcile(
      baseInput({
        predicted: [
          { type: "insert_a", category: "insert", predicted_qty: 2, cost_per_unit: 10 },
          { type: "drill_b", category: "drill", predicted_qty: 1, cost_per_unit: 8 },
        ],
        actual: [
          { type: "insert_a", qty_used: 2 },
          { type: "drill_b", qty_used: 1 },
        ],
      }),
    );
    // perfect prediction -> variance 0, multiplier 1.0
    expect(r.total_predicted_consumable_usd).toBe(28); // 20 + 8
    expect(r.total_actual_consumable_usd).toBe(28);
    expect(r.total_variance_usd).toBe(0);
    expect(r.total_variance_pct).toBe(0);
    expect(r.consumables[0].multiplier).toBe(1);
    expect(r.consumables[1].multiplier).toBe(1);
  });

  it("under-consumption -> multiplier clamps at the lower 0.8 rail", () => {
    const r = consumableReconciliationEngine.reconcile(
      baseInput({
        predicted: [{ type: "t", category: "insert", predicted_qty: 10, cost_per_unit: 5 }],
        actual: [{ type: "t", qty_used: 0 }], // actual/predicted = 0
      }),
    );
    expect(r.consumables[0].multiplier).toBe(0.8); // 0/50 -> clamped up to 0.8
    expect(r.consumables[0].variance_cost_usd).toBe(-50);
  });
});

describe("ConsumableReconciliationEngine -- advisory prior fallback (data honesty, gotcha #5)", () => {
  it("omitted cost_per_unit falls back to the $/line-item prior + flags advisory-prior", () => {
    const r = consumableReconciliationEngine.reconcile(
      baseInput({
        predicted: [{ type: "ins", category: "insert", predicted_qty: 3 }], // no cost_per_unit
        actual: [{ type: "ins", qty_used: 3 }],
      }),
    );
    const c = r.consumables[0];
    expect(c.cost_per_unit_source).toBe("advisory-prior");
    expect(c.cost_per_unit).toBe(5); // 1000/200 line-item avg
    expect(c.predicted_cost_usd).toBe(15); // 3 * 5
    expect(c.warnings.some((w) => w.includes("ADVISORY"))).toBe(true);
  });

  it("drill + tap advisory priors resolve from their own byType keys ($/line-item), not just insert", () => {
    const r = consumableReconciliationEngine.reconcile(
      baseInput({
        predicted: [
          { type: "d", category: "drill", predicted_qty: 1 }, // no cost_per_unit -> prior
          { type: "tp", category: "tap", predicted_qty: 1 }, // no cost_per_unit -> prior
        ],
        actual: [
          { type: "d", qty_used: 1 },
          { type: "tp", qty_used: 1 },
        ],
      }),
    );
    const drill = r.consumables.find((c) => c.type === "d")!;
    const tap = r.consumables.find((c) => c.type === "tp")!;
    expect(drill.cost_per_unit_source).toBe("advisory-prior");
    expect(drill.cost_per_unit).toBe(5); // 500/100 line-item avg
    expect(tap.cost_per_unit_source).toBe("advisory-prior");
    expect(tap.cost_per_unit).toBe(2); // 20/10 line-item avg
  });

  it("wire/coolant/abrasive have NO prior key -> cost_per_unit_source 'none' (NOT a fabricated fallback)", () => {
    for (const category of ["wire", "coolant", "abrasive"] as const) {
      const r = consumableReconciliationEngine.reconcile(
        baseInput({
          predicted: [{ type: "x", category, predicted_qty: 5 }],
          actual: [{ type: "x", qty_used: 5 }],
        }),
      );
      const c = r.consumables[0];
      expect(c.cost_per_unit_source).toBe("none");
      expect(c.cost_per_unit).toBe(0);
      expect(c.predicted_cost_usd).toBe(0);
      expect(c.multiplier).toBeNull(); // predicted_cost 0 -> no multiplier
    }
  });

  it("count=0 byType entry is skipped by the prior guard (no div-by-zero)", () => {
    const r = consumableReconciliationEngine.reconcile(
      baseInput({
        predicted: [{ type: "m", category: "misc-tooling", predicted_qty: 2 }],
        actual: [{ type: "m", qty_used: 2 }],
      }),
    );
    // misc-tooling has count 0 in the fixture -> not in prior -> "none"
    expect(r.consumables[0].cost_per_unit_source).toBe("none");
  });
});

describe("ConsumableReconciliationEngine -- failure modes (guards)", () => {
  it("predicted_qty=0 -> variance_qty_pct null, no NaN/Infinity", () => {
    const r = consumableReconciliationEngine.reconcile(
      baseInput({
        predicted: [{ type: "t", category: "insert", predicted_qty: 0, cost_per_unit: 5 }],
        actual: [{ type: "t", qty_used: 3 }],
      }),
    );
    const c = r.consumables[0];
    expect(c.variance_qty_pct).toBeNull();
    expect(c.variance_cost_pct).toBeNull();
    expect(c.multiplier).toBeNull(); // predicted_cost 0
    expect(Number.isNaN(c.actual_cost_usd)).toBe(false);
  });

  it("missing actual for a predicted type -> qty_used 0 + explicit warning", () => {
    const r = consumableReconciliationEngine.reconcile(
      baseInput({
        predicted: [{ type: "ghost", category: "insert", predicted_qty: 2, cost_per_unit: 5 }],
        actual: [], // no actual reported
      }),
    );
    const c = r.consumables[0];
    expect(c.actual_qty_used).toBe(0);
    expect(c.warnings.some((w) => w.includes("no actual consumption"))).toBe(true);
    expect(c.variance_cost_usd).toBe(-10); // 0 - (2*5)
  });

  it("empty predicted[] and actual[] -> empty report, null total pct, no throw", () => {
    const r = consumableReconciliationEngine.reconcile(baseInput({ predicted: [], actual: [] }));
    expect(r.consumables).toEqual([]);
    expect(r.total_predicted_consumable_usd).toBe(0);
    expect(r.total_variance_pct).toBeNull();
    expect(r.root_causes).toEqual([]);
  });

  it("throws on missing job_id / quote_id / non-array inputs (caller-contract violations)", () => {
    expect(() => consumableReconciliationEngine.reconcile(baseInput({ job_id: "" }))).toThrow(/job_id/);
    expect(() => consumableReconciliationEngine.reconcile(baseInput({ quote_id: "" }))).toThrow(/quote_id/);
    // @ts-expect-error -- deliberately break the predicted[] contract
    expect(() => consumableReconciliationEngine.reconcile(baseInput({ predicted: null }))).toThrow(/predicted/);
    // @ts-expect-error -- deliberately break the actual[] contract
    expect(() => consumableReconciliationEngine.reconcile(baseInput({ actual: null }))).toThrow(/actual/);
  });

  it("missing/corrupt prior file -> empty prior, category resolves 'none', no throw", () => {
    const eng = new ConsumableReconciliationEngine();
    const r = eng.reconcile({
      job_id: "J",
      quote_id: "Q",
      predicted: [{ type: "t", category: "insert", predicted_qty: 1 }],
      actual: [{ type: "t", qty_used: 1 }],
      unit_cost_basis_path: join(fixtureDir, "does-not-exist.json"),
    });
    expect(r.consumables[0].cost_per_unit_source).toBe("none");
  });
});

describe("ConsumableReconciliationEngine -- adversarial inputs", () => {
  it("NaN / Infinity / negative quantities are sanitized to 0 with warnings", () => {
    const r = consumableReconciliationEngine.reconcile(
      baseInput({
        predicted: [
          { type: "nan", category: "insert", predicted_qty: NaN, cost_per_unit: 5 },
          { type: "inf", category: "insert", predicted_qty: Infinity, cost_per_unit: 5 },
          { type: "neg", category: "insert", predicted_qty: -4, cost_per_unit: 5 },
        ],
        actual: [
          { type: "nan", qty_used: NaN },
          { type: "inf", qty_used: Infinity, qty_broken: -2 },
          { type: "neg", qty_used: -1 },
        ],
      }),
    );
    for (const c of r.consumables) {
      expect(Number.isFinite(c.predicted_qty)).toBe(true);
      expect(Number.isFinite(c.actual_qty_used)).toBe(true);
      expect(c.predicted_qty).toBe(0);
      expect(c.actual_qty_used).toBe(0);
      expect(c.warnings.length).toBeGreaterThan(0);
    }
    // everything sanitized to 0 -> no cost, no NaN totals
    expect(r.total_predicted_consumable_usd).toBe(0);
    expect(Number.isNaN(r.total_variance_usd)).toBe(false);
  });

  it("qty_broken exceeding qty_used is clamped so breakage_rate stays <=100%", () => {
    const r = consumableReconciliationEngine.reconcile(
      baseInput({
        predicted: [{ type: "t", category: "insert", predicted_qty: 2, cost_per_unit: 5 }],
        actual: [{ type: "t", qty_used: 3, qty_broken: 9 }], // impossible: broke more than used
      }),
    );
    const c = r.consumables[0];
    expect(c.actual_qty_broken).toBe(3); // clamped down to qty_used
    expect(c.breakage_rate_pct).toBe(100); // 3/3, capped
    expect(c.warnings.some((w) => w.includes("exceeds qty_used"))).toBe(true);
  });

  it("oversize actual (100x over-run) still clamps the multiplier to 1.2", () => {
    const r = consumableReconciliationEngine.reconcile(
      baseInput({
        predicted: [{ type: "t", category: "insert", predicted_qty: 1, cost_per_unit: 5 }],
        actual: [{ type: "t", qty_used: 100, qty_broken: 40 }],
      }),
    );
    const c = r.consumables[0];
    expect(c.multiplier).toBe(1.2); // 500/5 = 100 -> clamped
    expect(c.breakage_rate_pct).toBe(40);
    // high breakage (>10%) surfaces a root cause
    expect(r.root_causes.some((rc) => rc.reason.includes("breakage"))).toBe(true);
  });

  it("multiplier never escapes [0.8, 1.2] across a spanning set", () => {
    const r = consumableReconciliationEngine.reconcile(
      baseInput({
        predicted: [
          { type: "a", category: "insert", predicted_qty: 10, cost_per_unit: 1 },
          { type: "b", category: "drill", predicted_qty: 1, cost_per_unit: 1 },
          { type: "c", category: "tap", predicted_qty: 5, cost_per_unit: 1 },
        ],
        actual: [
          { type: "a", qty_used: 0 }, // ratio 0 -> 0.8
          { type: "b", qty_used: 50 }, // ratio 50 -> 1.2
          { type: "c", qty_used: 5 }, // ratio 1 -> 1.0
        ],
      }),
    );
    for (const c of r.consumables) {
      if (c.multiplier !== null) {
        expect(c.multiplier).toBeGreaterThanOrEqual(0.8);
        expect(c.multiplier).toBeLessThanOrEqual(1.2);
      }
    }
  });
});

describe("ConsumableReconciliationEngine -- root-cause + JSON-serializability", () => {
  it("largest |cost variance| driver is the primary root cause", () => {
    const r = consumableReconciliationEngine.reconcile(
      baseInput({
        predicted: [
          { type: "small", category: "insert", predicted_qty: 1, cost_per_unit: 5 },
          { type: "big", category: "drill", predicted_qty: 1, cost_per_unit: 5 },
        ],
        actual: [
          { type: "small", qty_used: 2 }, // +$5
          { type: "big", qty_used: 20 }, // +$95
        ],
      }),
    );
    expect(r.root_causes[0].type).toBe("big");
    expect(r.root_causes[0].reason).toContain("over-run");
  });

  it("the report round-trips through JSON.stringify losslessly (outcome-bus seam)", () => {
    const r = consumableReconciliationEngine.reconcile(
      baseInput({
        customer: "OPTIMAS",
        predicted: [{ type: "t", category: "insert", subtype: "r390", predicted_qty: 2, cost_per_unit: 5 }],
        actual: [{ type: "t", qty_used: 3 }],
      }),
    );
    const round = JSON.parse(JSON.stringify(r));
    expect(round.customer).toBe("OPTIMAS");
    expect(round.consumables[0].subtype).toBe("r390");
    expect(round.total_variance_usd).toBe(r.total_variance_usd);
    // the outcome-bus seam carries feedback_multipliers + root_causes -- prove they survive
    expect(round.feedback_multipliers).toEqual(r.feedback_multipliers);
    expect(round.root_causes).toEqual(r.root_causes);
  });
});
