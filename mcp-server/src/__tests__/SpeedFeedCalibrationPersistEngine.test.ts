/**
 * Tests for SpeedFeedCalibrationPersistEngine (OSCAR-SFC-9AXIS-MS0/U-OSC-CALIB-PERSIST).
 *
 * The closed-loop training layer's persist foundation: derives per-(ISO × mode)
 * calibration factors from the full-sweep comparison ledger and persists a
 * schema-versioned model. Reference values are hand-computed from the factor
 * formula `1 / (1 + medianΔ%/100)` so a regression in the math fails the test
 * (R9 — intent, not a hardcoded echo).
 *
 * Critically covers the SAFETY invariant: a factor that would INCREASE Vc
 * (push PRISM more aggressive than its conservative recommendation, toward an
 * un-safety-validated vendor baseline) is flagged `increases_vc: true` so a
 * downstream apply can refuse it.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SpeedFeedCalibrationPersistEngine,
  type SweepLedgerRow,
} from "../engines/SpeedFeedCalibrationPersistEngine.js";

function row(partial: Partial<SweepLedgerRow>): SweepLedgerRow {
  return {
    cell_id: "c",
    domain: "mill",
    iso: "P",
    material: "steel",
    tool_diameter_mm: 10,
    mode: "prism_optimized",
    prism_vc_mpm: 150,
    baseline_vc_mpm: 200,
    gwizard_vc_mpm: null,
    gwizard_aligned: null,
    hsmadvisor_vc_mpm: null,
    hsmadvisor_aligned: null,
    consensus_vc_mpm: 200,
    ...partial,
  };
}

describe("SpeedFeedCalibrationPersistEngine — U-OSC-CALIB-PERSIST", () => {
  let engine: SpeedFeedCalibrationPersistEngine;
  const tmpFiles: string[] = [];

  beforeEach(() => {
    engine = new SpeedFeedCalibrationPersistEngine();
  });

  afterAll(() => {
    for (const f of tmpFiles) {
      try {
        fs.rmSync(f, { force: true });
      } catch {
        /* ignore */
      }
    }
  });

  // --- parseLedger -------------------------------------------------------

  it("parses valid JSONL rows and skips blank/torn lines", () => {
    const text =
      JSON.stringify(row({})) +
      "\n\n" + // blank
      "{this is not json\n" + // torn
      JSON.stringify(row({ iso: "M" })) +
      "\n";
    const rows = engine.parseLedger(text);
    expect(rows.length).toBe(2);
    expect(rows.map((r) => r.iso).sort()).toEqual(["M", "P"]);
  });

  it("drops rows missing the iso/mode keys (malformed)", () => {
    const text = JSON.stringify({ cell_id: "x", prism_vc_mpm: 1 }) + "\n";
    expect(engine.parseLedger(text).length).toBe(0);
  });

  // --- derive: reference-value math --------------------------------------

  it("derives factor 1.0 when PRISM == baseline (median Δ 0%)", () => {
    // prism 200 vs baseline 200 → Δ 0% → factor 1/(1+0) = 1.0
    const rows = [row({ prism_vc_mpm: 200, baseline_vc_mpm: 200 })];
    const model = engine.derive(rows, "test");
    const e = model.entries.find((x) => x.iso === "P" && x.mode === "prism_optimized")!;
    expect(e.median_delta_pct).toBeCloseTo(0, 2);
    expect(e.factor).toBeCloseTo(1.0, 4);
    expect(e.increases_vc).toBe(false);
  });

  it("derives factor 1.3333 for a -25% conservative regime", () => {
    // prism 150 vs baseline 200 → Δ -25% → factor 1/(1-0.25) = 1.3333
    const rows = [row({ prism_vc_mpm: 150, baseline_vc_mpm: 200 })];
    const model = engine.derive(rows, "test");
    const e = model.entries[0]!;
    expect(e.median_delta_pct).toBeCloseTo(-25, 1);
    expect(e.factor).toBeCloseTo(1.3333, 3);
    // A factor > 1 would INCREASE Vc → flagged (the safety invariant).
    expect(e.increases_vc).toBe(true);
  });

  it("clamps an extreme conservative delta to CLAMP_MAX (1.5) and flags clamped", () => {
    // prism 80 vs baseline 200 → Δ -60% → raw 1/(0.4)=2.5 → clamped to 1.5
    const rows = [row({ prism_vc_mpm: 80, baseline_vc_mpm: 200 })];
    const e = engine.derive(rows, "test").entries[0]!;
    expect(e.factor).toBe(1.5);
    expect(e.clamped).toBe(true);
    expect(e.increases_vc).toBe(true);
  });

  it("clamps an extreme aggressive delta to CLAMP_MIN (0.5)", () => {
    // prism 500 vs baseline 200 → Δ +150% → raw 1/2.5=0.4 → clamped to 0.5
    const rows = [row({ prism_vc_mpm: 500, baseline_vc_mpm: 200 })];
    const e = engine.derive(rows, "test").entries[0]!;
    expect(e.factor).toBe(0.5);
    expect(e.clamped).toBe(true);
    expect(e.increases_vc).toBe(false);
  });

  it("groups by (iso × mode) and medians within each group", () => {
    const rows = [
      row({ iso: "P", mode: "prism_optimized", prism_vc_mpm: 150, baseline_vc_mpm: 200 }), // -25
      row({ iso: "P", mode: "prism_optimized", prism_vc_mpm: 160, baseline_vc_mpm: 200 }), // -20
      row({ iso: "P", mode: "prism_optimized", prism_vc_mpm: 170, baseline_vc_mpm: 200 }), // -15
      row({ iso: "M", mode: "cost_batch", prism_vc_mpm: 100, baseline_vc_mpm: 200 }), // -50
    ];
    const model = engine.derive(rows, "test");
    expect(model.entries.length).toBe(2);
    const p = model.entries.find((e) => e.iso === "P")!;
    expect(p.sample_count).toBe(3);
    expect(p.median_delta_pct).toBeCloseTo(-20, 1); // median of [-25,-20,-15]
  });

  // --- derive: safety / honesty ------------------------------------------

  it("EXCLUDES cells with no baseline (does not fabricate a factor)", () => {
    const rows = [
      row({ iso: "S", baseline_vc_mpm: null }), // titanium, no vendor baseline
      row({ iso: "H", baseline_vc_mpm: null }), // hardened, no vendor baseline
    ];
    const model = engine.derive(rows, "test");
    expect(model.entries.length).toBe(0);
    expect(model.ledger_rows_consumed).toBe(0);
  });

  it("excludes a zero/negative baseline (no divide-by-zero)", () => {
    const rows = [row({ baseline_vc_mpm: 0 }), row({ baseline_vc_mpm: -5 })];
    expect(engine.derive(rows, "test").entries.length).toBe(0);
  });

  it("model is advisory-only and counts the would-increase-Vc regimes in notes", () => {
    const rows = [row({ prism_vc_mpm: 150, baseline_vc_mpm: 200 })]; // factor>1
    const model = engine.derive(rows, "test");
    expect(model.apply_policy).toBe("advisory-only");
    expect(model.notes.some((n) => /never auto-applied|operator-gated/i.test(n))).toBe(true);
    expect(model.notes.some((n) => /1 of 1 regimes have factor > 1\.0/i.test(n))).toBe(true);
  });

  it("stamps a schema version", () => {
    const model = engine.derive([row({})], "ledger.jsonl");
    expect(model.schemaVersion).toBe("1.0.0");
    expect(model.generated_from).toBe("ledger.jsonl");
  });

  // --- regression: clamped flag must be FALSE for an UNclamped factor ---------
  // (reviewer P2: `factor !== round(rawFactor)` falsely flagged 1.3333… as clamped)
  it("does NOT flag clamped for an in-band non-terminating factor (-25% → 1.3333)", () => {
    // raw 1/(1-0.25) = 1.3333… is INSIDE [0.5, 1.5] → the band never bit.
    const e = engine.derive([row({ prism_vc_mpm: 150, baseline_vc_mpm: 200 })], "test").entries[0]!;
    expect(e.factor).toBeCloseTo(1.3333, 3);
    expect(e.clamped).toBe(false);
  });

  it("flags clamped only when the band actually bit (boundary exactness)", () => {
    // factor exactly 1.5 (at CLAMP_MAX from the inside) is NOT clamped; >1.5 IS.
    // prism 100 vs baseline 150 → Δ -33.33% → raw 1/(0.6667)=1.5 exactly → not clamped.
    const atBound = engine.derive([row({ prism_vc_mpm: 100, baseline_vc_mpm: 150 })], "t").entries[0]!;
    expect(atBound.factor).toBeCloseTo(1.5, 4);
    expect(atBound.clamped).toBe(false);
    // prism 80 vs baseline 200 → Δ -60% → raw 2.5 > 1.5 → clamped.
    const overBound = engine.derive([row({ prism_vc_mpm: 80, baseline_vc_mpm: 200 })], "t").entries[0]!;
    expect(overBound.clamped).toBe(true);
  });

  // --- observability: skipped-row count + loud-on-total-wipeout ----------------
  it("counts unusable rows in ledger_rows_skipped (silent corruption is loud)", () => {
    const rows = [
      row({ prism_vc_mpm: 150, baseline_vc_mpm: 200 }), // usable
      row({ baseline_vc_mpm: null }), // no baseline → skipped
      row({ baseline_vc_mpm: 0 }), // zero baseline → skipped
    ];
    const model = engine.derive(rows, "test");
    expect(model.total_cells).toBe(3);
    expect(model.ledger_rows_consumed).toBe(1);
    expect(model.ledger_rows_skipped).toBe(2);
    expect(model.notes.some((n) => /2 of 3 ledger rows were UNUSABLE/i.test(n))).toBe(true);
  });

  it("emits a LOUD WARNING when cells exist but ZERO are usable (schema drift)", () => {
    const rows = [row({ baseline_vc_mpm: null }), row({ baseline_vc_mpm: null })];
    const model = engine.derive(rows, "test");
    expect(model.entries.length).toBe(0);
    expect(model.ledger_rows_skipped).toBe(2);
    expect(model.notes[0]).toMatch(/WARNING: 0 usable rows/i);
    expect(model.notes[0]).toMatch(/schema drift|do NOT treat it as a calibration result/i);
  });

  it("does NOT emit the wipeout WARNING on an empty ledger (0 cells, not a drift)", () => {
    const model = engine.derive([], "test");
    expect(model.total_cells).toBe(0);
    expect(model.notes.some((n) => /WARNING: 0 usable rows/i.test(n))).toBe(false);
  });

  // --- persist + round-trip ----------------------------------------------

  it("persists a schema-versioned JSON model that round-trips", () => {
    const out = path.join(os.tmpdir(), `prism-calib-${process.pid}-${Math.floor(performance.now())}.json`);
    tmpFiles.push(out);
    const model = engine.derive([row({ prism_vc_mpm: 150, baseline_vc_mpm: 200 })], "test");
    engine.persist(model, out);
    expect(fs.existsSync(out)).toBe(true);
    const reloaded = JSON.parse(fs.readFileSync(out, "utf8"));
    expect(reloaded.schemaVersion).toBe("1.0.0");
    expect(reloaded.entries.length).toBe(1);
    expect(reloaded.entries[0].factor).toBeCloseTo(1.3333, 3);
  });

  it("buildFromLedgerFile throws on a missing ledger (fail-loud)", () => {
    expect(() => engine.buildFromLedgerFile("does-not-exist.jsonl", "out.json")).toThrow(/ledger not found/i);
  });

  it("buildFromLedgerFile end-to-end: read → derive → persist", () => {
    const ledger = path.join(os.tmpdir(), `prism-ledger-${process.pid}-${Math.floor(performance.now())}.jsonl`);
    const out = path.join(os.tmpdir(), `prism-calib-out-${process.pid}-${Math.floor(performance.now())}.json`);
    tmpFiles.push(ledger, out);
    fs.writeFileSync(
      ledger,
      [
        JSON.stringify(row({ iso: "P", prism_vc_mpm: 150, baseline_vc_mpm: 200 })),
        JSON.stringify(row({ iso: "N", prism_vc_mpm: 300, baseline_vc_mpm: 600 })),
      ].join("\n") + "\n",
    );
    const model = engine.buildFromLedgerFile(ledger, out);
    expect(model.ledger_rows_consumed).toBe(2);
    expect(model.entries.length).toBe(2);
    expect(fs.existsSync(out)).toBe(true);
  });
});
