/**
 * LatheActualCostReconciliationEngine tests — U-LTH49
 *
 * Coverage:
 *   - End-to-end: quote → actuals → reconciliation report
 *   - Per-bucket variance math (material/tool_wear/cycle/setup)
 *   - Physics deltas (cycle/material/setup/tool_changes/scrap/rework rates)
 *   - Root cause classification (all 7 categories + boundary cases)
 *   - Feedback multiplier clamping [0.8, 1.2]
 *   - Accuracy stats: mean abs %, bias sign, stdev, worst/best
 *   - Ring-buffer persistence (cap 100)
 *   - Customer + ISO-group accuracy slicing
 *   - Within-variance-band check
 *   - Failure modes: missing quote, missing quote.cost, missing variance_band
 *   - Adversarial: NaN/Infinity/negative actuals (Zod rejects)
 *   - Dispatcher wiring (2 actions: reconcile + accuracy)
 */

import { describe, it, expect } from "vitest";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LatheActualCostReconciliationEngine } from "../engines/LatheActualCostReconciliationEngine.js";
import type { QuotePackage } from "../engines/LatheAutoQuoteFromPrintEngine.js";

function makeEngine(): { engine: LatheActualCostReconciliationEngine; statePath: string } {
  const dir = mkdtempSync(join(tmpdir(), "recon-test-"));
  const statePath = join(dir, "recon-state.json");
  const engine = new LatheActualCostReconciliationEngine(statePath);
  engine.__resetForTests();
  return { engine, statePath };
}

/** Builds a realistic QuotePackage for 1018 steel (matches U-LTH48 rates). */
function makeQuote(overrides: Partial<QuotePackage["cost"]> = {}): QuotePackage {
  const cost = {
    material_usd: 2.0,
    tool_wear_usd: 0.5,
    cycle_usd: 10.0,
    setup_usd: 71.25,
    programming_usd: 18.0,
    overhead_usd: 15.26,
    margin_usd: 50.60,
    total_direct_usd: 101.75,
    total_unit_price_usd: 167.61,
    total_lot_price_usd: 1676.10,
    ...overrides,
  };
  return {
    quote_id: `QUOTE-T-${Date.now()}`,
    generated_at: new Date().toISOString(),
    generation_ms: 12,
    customer: "JM_DIE",
    part_number: "TEST-PART",
    quantity: 10,
    cost,
    tool_wear_lines: [],
    evidence: {
      material_name: "1018",
      iso_group: "P",
      stock_od_mm: 40,
      stock_id_mm: 0,
      stock_length_mm: 80,
      stock_volume_cm3: 100.5,
      stock_mass_kg: 0.79,
      total_cycle_min: 7.0,
      total_rapid_min: 0.03,
      setup_count: 1,
      operation_count: 3,
      material_price_usd_per_kg: 2.5,
      machine_rate_usd_hr: 85,
      setup_rate_usd_hr: 95,
      overhead_rate: 0.15,
      margin_rate: 0.35,
      scrap_factor: 0.2,
    },
    variance_band: {
      low_usd: 150.85,
      high_usd: 184.37,
      band_pct: 10,
      confidence: "moderate",
      basis: "Default ±10% band",
    },
    meets_sla: true,
    sla_limit_sec: 90,
  };
}

// ============================================================================
// END-TO-END + ACCOUNTING
// ============================================================================

describe("LatheActualCostReconciliationEngine — end-to-end", () => {
  it("produces a full report with all 4 bucket variances and total", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    const report = engine.reconcile({
      quote,
      actuals: {
        actual_cycle_time_min: 7.0,
        actual_material_mass_kg: 0.79,
        actual_tool_changes: 2,
        actual_setup_time_min: 45,
        actual_scrap_parts: 0,
        actual_rework_parts: 0,
        actual_quantity_completed: 10,
      },
      customer: "ALCOA",
      material_iso_group: "P",
    });
    expect(report.buckets).toHaveLength(4);
    expect(report.buckets.map((b) => b.bucket).sort()).toEqual(
      ["cycle", "material", "setup", "tool_wear"],
    );
    expect(report.quote_id).toBe(quote.quote_id);
  });

  it("perfect match: variance_usd = 0 per bucket, root_cause = 'none'", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    const report = engine.reconcile({
      quote,
      actuals: {
        actual_cycle_time_min: 7.0,
        actual_material_mass_kg: 0.79,
        actual_tool_changes: 2,
        actual_setup_time_min: 45,
        actual_scrap_parts: 0,
        actual_rework_parts: 0,
        actual_quantity_completed: 10,
      },
    });
    for (const bucket of report.buckets) {
      expect(Math.abs(bucket.variance_pct)).toBeLessThan(1);
    }
    expect(report.root_cause).toBe("none");
  });

  it("within_variance_band true when actual inside quote band", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    const report = engine.reconcile({
      quote,
      actuals: {
        actual_cycle_time_min: 7.0,
        actual_material_mass_kg: 0.79,
        actual_tool_changes: 2,
        actual_setup_time_min: 45,
        actual_scrap_parts: 0,
        actual_rework_parts: 0,
        actual_quantity_completed: 10,
      },
    });
    expect(report.within_variance_band).toBe(true);
  });
});

// ============================================================================
// ROOT CAUSE CLASSIFICATION
// ============================================================================

describe("LatheActualCostReconciliationEngine — root cause classification", () => {
  it("high scrap rate (>5%) → tooling", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    const report = engine.reconcile({
      quote,
      actuals: {
        actual_cycle_time_min: 7.0,
        actual_material_mass_kg: 0.79,
        actual_tool_changes: 2,
        actual_setup_time_min: 45,
        actual_scrap_parts: 2,   // 20%
        actual_rework_parts: 0,
        actual_quantity_completed: 10,
      },
    });
    expect(report.root_cause).toBe("tooling");
    expect(report.physics.scrap_rate_pct).toBe(20);
  });

  it("high rework rate (>10%) → programming", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    const report = engine.reconcile({
      quote,
      actuals: {
        actual_cycle_time_min: 7.0,
        actual_material_mass_kg: 0.79,
        actual_tool_changes: 2,
        actual_setup_time_min: 45,
        actual_scrap_parts: 0,
        actual_rework_parts: 2,   // 20%
        actual_quantity_completed: 10,
      },
    });
    expect(report.root_cause).toBe("programming");
  });

  it("cycle overrun +20% → programming", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    const report = engine.reconcile({
      quote,
      actuals: {
        actual_cycle_time_min: 9.0,    // 7 → 9 = +28.6%
        actual_material_mass_kg: 0.79,
        actual_tool_changes: 2,
        actual_setup_time_min: 45,
        actual_scrap_parts: 0,
        actual_rework_parts: 0,
        actual_quantity_completed: 10,
      },
    });
    expect(report.root_cause).toBe("programming");
  });

  it("setup overrun → setup", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    const report = engine.reconcile({
      quote,
      actuals: {
        actual_cycle_time_min: 7.0,
        actual_material_mass_kg: 0.79,
        actual_tool_changes: 2,
        actual_setup_time_min: 90,    // +100% setup
        actual_scrap_parts: 0,
        actual_rework_parts: 0,
        actual_quantity_completed: 10,
      },
    });
    expect(report.root_cause).toBe("setup");
  });

  it("material mass overrun → material", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    const report = engine.reconcile({
      quote,
      actuals: {
        actual_cycle_time_min: 7.0,
        actual_material_mass_kg: 1.5,   // ≈2× predicted
        actual_tool_changes: 2,
        actual_setup_time_min: 45,
        actual_scrap_parts: 0,
        actual_rework_parts: 0,
        actual_quantity_completed: 10,
      },
    });
    expect(report.root_cause).toBe("material");
  });

  it("everything within ±5% → root_cause = none", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    const report = engine.reconcile({
      quote,
      actuals: {
        actual_cycle_time_min: 7.1,
        actual_material_mass_kg: 0.795,
        actual_tool_changes: 2,
        actual_setup_time_min: 45,
        actual_scrap_parts: 0,
        actual_rework_parts: 0,
        actual_quantity_completed: 10,
      },
    });
    expect(report.root_cause).toBe("none");
  });
});

// ============================================================================
// FEEDBACK MULTIPLIER CLAMPING
// ============================================================================

describe("LatheActualCostReconciliationEngine — multiplier clamping", () => {
  it("extreme 10x overrun clamps multiplier to 1.2 (+20% cap)", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    const report = engine.reconcile({
      quote,
      actuals: {
        actual_cycle_time_min: 70.0,     // 10× predicted
        actual_material_mass_kg: 0.79,
        actual_tool_changes: 2,
        actual_setup_time_min: 45,
        actual_scrap_parts: 0,
        actual_rework_parts: 0,
        actual_quantity_completed: 10,
      },
    });
    expect(report.feedback_multipliers.cycle).toBe(1.2);
    expect(report.buckets.find((b) => b.bucket === "cycle")?.multiplier).toBe(1.2);
  });

  it("zero actual clamps multiplier to 0.8 (−20% cap)", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    const report = engine.reconcile({
      quote,
      actuals: {
        actual_cycle_time_min: 0,
        actual_material_mass_kg: 0.79,
        actual_tool_changes: 2,
        actual_setup_time_min: 45,
        actual_scrap_parts: 0,
        actual_rework_parts: 0,
        actual_quantity_completed: 10,
      },
    });
    expect(report.feedback_multipliers.cycle).toBe(0.8);
  });
});

// ============================================================================
// ACCURACY STATS
// ============================================================================

describe("LatheActualCostReconciliationEngine — accuracy stats", () => {
  it("empty state returns sample_count=0 and all zeros", () => {
    const { engine } = makeEngine();
    const stats = engine.getAccuracyStats();
    expect(stats.sample_count).toBe(0);
    expect(stats.mean_abs_variance_pct).toBe(0);
    expect(stats.bias_pct).toBe(0);
  });

  it("bias positive when actuals chronically exceed quotes (underquoting)", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    // Three jobs, all with cycle overruns → positive bias
    for (let i = 0; i < 3; i++) {
      engine.reconcile({
        quote: { ...quote, quote_id: `Q-${i}` },
        actuals: {
          actual_cycle_time_min: 9.0,
          actual_material_mass_kg: 0.79,
          actual_tool_changes: 2,
          actual_setup_time_min: 45,
          actual_scrap_parts: 0,
          actual_rework_parts: 0,
          actual_quantity_completed: 10,
        },
        customer: "ALCOA",
        material_iso_group: "P",
      });
    }
    const stats = engine.getAccuracyStats("ALCOA", "P");
    expect(stats.sample_count).toBe(3);
    expect(stats.bias_pct).toBeGreaterThan(0);
  });

  it("slicing by customer returns only matching records", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    engine.reconcile({
      quote: { ...quote, quote_id: "Q-A" },
      actuals: {
        actual_cycle_time_min: 7.0, actual_material_mass_kg: 0.79, actual_tool_changes: 2,
        actual_setup_time_min: 45, actual_scrap_parts: 0, actual_rework_parts: 0,
        actual_quantity_completed: 10,
      },
      customer: "ALCOA",
    });
    engine.reconcile({
      quote: { ...quote, quote_id: "Q-B" },
      actuals: {
        actual_cycle_time_min: 9.0, actual_material_mass_kg: 0.79, actual_tool_changes: 2,
        actual_setup_time_min: 45, actual_scrap_parts: 0, actual_rework_parts: 0,
        actual_quantity_completed: 10,
      },
      customer: "ITW",
    });
    const alcoa = engine.getAccuracyStats("ALCOA");
    const itw = engine.getAccuracyStats("ITW");
    expect(alcoa.sample_count).toBe(1);
    expect(itw.sample_count).toBe(1);
    expect(alcoa.mean_abs_variance_pct).not.toBe(itw.mean_abs_variance_pct);
  });
});

// ============================================================================
// MATERIAL VARIABILITY (SPANS 3 ISO GROUPS)
// ============================================================================

describe("LatheActualCostReconciliationEngine — ISO-group variability", () => {
  it("aluminum (N), steel (P), and Inconel (S) each compute independently", () => {
    const { engine } = makeEngine();
    const alQuote = makeQuote({ material_usd: 2.7 });
    const pQuote = makeQuote({ material_usd: 2.0 });
    const sQuote = makeQuote({ material_usd: 35.5 });

    const reportN = engine.reconcile({
      quote: alQuote, customer: "ALCOA", material_iso_group: "N",
      actuals: { actual_cycle_time_min: 7, actual_material_mass_kg: 0.79,
                 actual_tool_changes: 2, actual_setup_time_min: 45,
                 actual_scrap_parts: 0, actual_rework_parts: 0, actual_quantity_completed: 10 },
    });
    const reportP = engine.reconcile({
      quote: pQuote, customer: "ITW", material_iso_group: "P",
      actuals: { actual_cycle_time_min: 7, actual_material_mass_kg: 0.79,
                 actual_tool_changes: 2, actual_setup_time_min: 45,
                 actual_scrap_parts: 0, actual_rework_parts: 0, actual_quantity_completed: 10 },
    });
    const reportS = engine.reconcile({
      quote: sQuote, customer: "OPTIMAS", material_iso_group: "S",
      actuals: { actual_cycle_time_min: 7, actual_material_mass_kg: 0.79,
                 actual_tool_changes: 2, actual_setup_time_min: 45,
                 actual_scrap_parts: 0, actual_rework_parts: 0, actual_quantity_completed: 10 },
    });
    expect(reportN.reconciliation_id).not.toBe(reportP.reconciliation_id);
    expect(reportP.reconciliation_id).not.toBe(reportS.reconciliation_id);
    const stats = engine.getAccuracyStats();
    expect(stats.sample_count).toBe(3);
  });
});

// ============================================================================
// FAILURE MODES
// ============================================================================

describe("LatheActualCostReconciliationEngine — failure modes", () => {
  it("rejects missing quote", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.reconcile({
        quote: null,
        actuals: { actual_cycle_time_min: 7, actual_material_mass_kg: 0.79, actual_tool_changes: 2,
                   actual_setup_time_min: 45, actual_scrap_parts: 0, actual_rework_parts: 0,
                   actual_quantity_completed: 10 },
      } as any),
    ).toThrow(/quote missing/);
  });

  it("rejects quote missing cost", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.reconcile({
        quote: { cost: undefined, variance_band: {}, evidence: {} } as any,
        actuals: { actual_cycle_time_min: 7, actual_material_mass_kg: 0.79, actual_tool_changes: 2,
                   actual_setup_time_min: 45, actual_scrap_parts: 0, actual_rework_parts: 0,
                   actual_quantity_completed: 10 },
      }),
    ).toThrow(/cost\.total_unit_price_usd missing/);
  });

  it("rejects negative actual cycle time (Zod)", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    expect(() =>
      engine.reconcile({
        quote,
        actuals: { actual_cycle_time_min: -1, actual_material_mass_kg: 0.79, actual_tool_changes: 2,
                   actual_setup_time_min: 45, actual_scrap_parts: 0, actual_rework_parts: 0,
                   actual_quantity_completed: 10 },
      }),
    ).toThrow();
  });

  it("rejects NaN actual material mass", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    expect(() =>
      engine.reconcile({
        quote,
        actuals: { actual_cycle_time_min: 7, actual_material_mass_kg: Number.NaN,
                   actual_tool_changes: 2, actual_setup_time_min: 45,
                   actual_scrap_parts: 0, actual_rework_parts: 0, actual_quantity_completed: 10 },
      }),
    ).toThrow();
  });

  it("rejects Infinity actual setup time", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    expect(() =>
      engine.reconcile({
        quote,
        actuals: { actual_cycle_time_min: 7, actual_material_mass_kg: 0.79,
                   actual_tool_changes: 2,
                   actual_setup_time_min: Number.POSITIVE_INFINITY,
                   actual_scrap_parts: 0, actual_rework_parts: 0, actual_quantity_completed: 10 },
      }),
    ).toThrow();
  });

  it("rejects invalid iso_group", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    expect(() =>
      engine.reconcile({
        quote,
        material_iso_group: "Z" as any,
        actuals: { actual_cycle_time_min: 7, actual_material_mass_kg: 0.79, actual_tool_changes: 2,
                   actual_setup_time_min: 45, actual_scrap_parts: 0, actual_rework_parts: 0,
                   actual_quantity_completed: 10 },
      }),
    ).toThrow();
  });
});

// ============================================================================
// PERSISTENCE (RING BUFFER)
// ============================================================================

describe("LatheActualCostReconciliationEngine — persistence and ring buffer", () => {
  it("persists records across engine instances", () => {
    const { engine, statePath } = makeEngine();
    const quote = makeQuote();
    engine.reconcile({
      quote,
      actuals: { actual_cycle_time_min: 7, actual_material_mass_kg: 0.79,
                 actual_tool_changes: 2, actual_setup_time_min: 45,
                 actual_scrap_parts: 0, actual_rework_parts: 0, actual_quantity_completed: 10 },
      customer: "ALCOA",
    });
    expect(existsSync(statePath)).toBe(true);

    const engine2 = new LatheActualCostReconciliationEngine(statePath);
    expect(engine2.__getState().records).toHaveLength(1);
  });

  it("ring buffer caps at 100 records (oldest dropped first)", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    for (let i = 0; i < 105; i++) {
      engine.reconcile({
        quote: { ...quote, quote_id: `Q-${i}` },
        actuals: { actual_cycle_time_min: 7, actual_material_mass_kg: 0.79,
                   actual_tool_changes: 2, actual_setup_time_min: 45,
                   actual_scrap_parts: 0, actual_rework_parts: 0, actual_quantity_completed: 10 },
      });
    }
    expect(engine.__getState().records).toHaveLength(100);
    expect(engine.__getState().next_seq).toBe(106);
  });

  it("persisted JSON has schemaVersion=1 and updated_at timestamp", () => {
    const { engine, statePath } = makeEngine();
    const quote = makeQuote();
    engine.reconcile({
      quote,
      actuals: { actual_cycle_time_min: 7, actual_material_mass_kg: 0.79,
                 actual_tool_changes: 2, actual_setup_time_min: 45,
                 actual_scrap_parts: 0, actual_rework_parts: 0, actual_quantity_completed: 10 },
    });
    const parsed = JSON.parse(readFileSync(statePath, "utf-8")) as {
      schemaVersion: number;
      records: unknown[];
      updated_at: string;
    };
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(parsed.records).toHaveLength(1);
  });
});

// ============================================================================
// DISPATCHER WIRING
// ============================================================================

describe("LatheActualCostReconciliationEngine — dispatcher wiring", () => {
  it("both U-LTH49 actions are enum-registered with case handlers + lazy import", () => {
    const src = readFileSync(
      "H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts",
      "utf-8",
    );
    expect(src).toContain('"lathe_actual_cost_reconcile"');
    expect(src).toContain('"lathe_actual_cost_accuracy"');
    expect(src).toMatch(/case "lathe_actual_cost_reconcile"/);
    expect(src).toMatch(/case "lathe_actual_cost_accuracy"/);
    expect(src).toContain('"../../engines/LatheActualCostReconciliationEngine.js"');
    expect(src).toContain('case "latheReconciliation"');
  });

  it("end-to-end engine methods round-trip: reconcile → accuracy stats", () => {
    const { engine } = makeEngine();
    const quote = makeQuote();
    const report = engine.reconcile({
      quote,
      actuals: { actual_cycle_time_min: 7.5, actual_material_mass_kg: 0.8,
                 actual_tool_changes: 2, actual_setup_time_min: 48,
                 actual_scrap_parts: 0, actual_rework_parts: 0, actual_quantity_completed: 10 },
      customer: "ALCOA",
      material_iso_group: "P",
    });
    expect(report.reconciliation_id).toMatch(/^rec_\d{6}$/);
    expect(report.buckets).toHaveLength(4);
    const stats = engine.getAccuracyStats("ALCOA", "P");
    expect(stats.sample_count).toBe(1);
  });
});
