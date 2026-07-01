/**
 * QuotingTrainingOrchestratorEngine — Stage-4 psi_delta feed regression
 *
 * Locks the U-QP-ORCH-PSI-FIELD-FIX bug (slot:charlie /goal-yolo iter8, 2026-06-02):
 * the Stage-4 psi_delta feed read `pred.predicted_usd`, but PerRecordPrediction's
 * predicted field is `predicted_fmv_usd` (there is no `predicted_usd` on it). The
 * stale name yielded `undefined`, which QuoteOutcomePSIDeltaBridgeEngine.scoreOutcome
 * rejects (Number.isFinite(undefined) === false) — so EVERY worst-record was silently
 * dropped and `psi_delta_fed_count` was always 0 whenever feedPsnAutonomy:true.
 *
 * These tests exercise the real call site (runOnce Stage 4) — the only place the bug
 * lives. The "feeds count" assertion FAILS on the pre-fix code (count 0) and PASSES
 * on the fix (count 3). Hermetic: writeIfSafe:false skips the Stage-3 active-factor
 * write, so no filesystem side effect is produced.
 */
import { describe, it, expect } from "vitest";
import { quotingTrainingOrchestratorEngine } from "../engines/QuotingTrainingOrchestratorEngine.js";
import type { QuoteBaselineRecord } from "../engines/QuotingTrainingLoopEngine.js";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Three valid baseline records spanning three customers. Explicit time/rate/material
// make each FMV deterministic and decoupled from the engine's DEFAULT_* constants
// (these are arbitrary TEST INPUTS, not canonical shop-rate constants). Every record
// has a positive actual + a positive predicted FMV, so every worst-5 entry is a
// finite-positive (predicted, actual) pair scoreOutcome MUST accept.
const RECORDS: QuoteBaselineRecord[] = [
  {
    customer: "ACME", part_id: "P-1", doc_date: "2026-01-01", actual_revenue_usd: 120,
    estimated_time_in_cut_s: 600, estimated_material_spend_usd: 40, machine_rate_usd_per_hr: 95,
  },
  {
    customer: "BETA", part_id: "P-2", doc_date: "2026-01-02", actual_revenue_usd: 80,
    estimated_time_in_cut_s: 1200, estimated_material_spend_usd: 60, machine_rate_usd_per_hr: 110,
  },
  {
    customer: "GAMMA", part_id: "P-3", doc_date: "2026-01-03", actual_revenue_usd: 250,
    estimated_time_in_cut_s: 300, estimated_material_spend_usd: 25, machine_rate_usd_per_hr: 85,
  },
];

// writeIfSafe:false → Stage 3 is skipped entirely (no active-factor write). The
// activeFactorPath points at a throwaway temp path purely as belt-and-suspenders;
// it is never created when writeIfSafe is false.
const NO_WRITE = {
  writeIfSafe: false as const,
  activeFactorPath: join(tmpdir(), "prism-orch-psi-test-never-written.json"),
};

describe("QuotingTrainingOrchestratorEngine — Stage-4 psi_delta feed", () => {
  it("feeds every worst-record into scoreOutcome when feedPsnAutonomy:true (reads predicted_fmv_usd, not the undefined predicted_usd)", async () => {
    const result = await quotingTrainingOrchestratorEngine.runOnce({
      records: RECORDS,
      feedPsnAutonomy: true,
      ...NO_WRITE,
    });
    expect(result.ok).toBe(true);
    // 3 records → exactly 3 worst-5 entries, each a finite-positive (predicted_fmv_usd,
    // actual_usd) pair → scoreOutcome accepts all 3. The pre-fix bug read the absent
    // `predicted_usd` (undefined), so scoreOutcome rejected EVERY record and this was 0.
    expect(result.psi_delta_fed_count).toBe(3);
    // No write requested → Stage 3 reports the dry-run skip, never a path.
    expect(result.active_factor_written).toBe(false);
  });

  it("does NOT feed psi_delta when feedPsnAutonomy is omitted (Stage-4 gate honored)", async () => {
    const result = await quotingTrainingOrchestratorEngine.runOnce({
      records: RECORDS,
      ...NO_WRITE,
    });
    expect(result.ok).toBe(true);
    // Stage 4 is gated on feedPsnAutonomy — omitted means the feed never runs.
    expect(result.psi_delta_fed_count).toBe(0);
  });

  it("returns ok:false with no predictions and feeds nothing on empty input (R12 — never fabricates a feed)", async () => {
    const result = await quotingTrainingOrchestratorEngine.runOnce({
      records: [],
      feedPsnAutonomy: true,
      ...NO_WRITE,
    });
    expect(result.ok).toBe(false);
    expect(result.psi_delta_fed_count).toBe(0);
  });
});
