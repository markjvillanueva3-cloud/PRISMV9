/**
 * JMDieFinancialBaselineMS0 E2E — JM-DIE-FINANCIAL-BASELINE-MS0 / U-JM06
 *
 * Runs the full training pipeline against the REAL JM Die archive at
 * `H:/PRISM/JM DIE/_PART LIBRARY` (limited subset) and writes the resulting
 * financial baseline JSON to `state/shared/specs/` for operator inspection.
 *
 * R12 fail-loud: if the JM Die archive is not present (e.g. CI), the test
 * FAILS LOUDLY with an explicit reason (NOT silent skip) so missing prod
 * data never masquerades as a passing E2E.
 *
 * @milestone JM-DIE-FINANCIAL-BASELINE-MS0/U-JM06-REAL-CORPUS-E2E
 * @author slot:charlie /goal-14 iter3, 2026-05-24
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { jmDieQuoteTrainingPipelineEngine } from "../../engines/JMDieQuoteTrainingPipelineEngine.js";

const JM_DIE_ROOT = "H:/prism/JM DIE/_PART LIBRARY";
const OUTPUT_PATH = "H:/prism/state/shared/specs/JM-DIE-FINANCIAL-BASELINE-2026-05-24.json";
const PIPELINE_LIMIT = 500;

describe("JMDieFinancialBaselineMS0 — real-corpus E2E", () => {
  it("JM Die archive exists at H:/prism/JM DIE/_PART LIBRARY (R12 precondition; not silent skip)", () => {
    expect(fs.existsSync(JM_DIE_ROOT)).toBe(true);
  });

  it(`runs pipeline against ${PIPELINE_LIMIT} real documents, produces ok=true + ≥1 record + ≥1 customer`, () => {
    const r = jmDieQuoteTrainingPipelineEngine.trainBatch({
      rootDir: JM_DIE_ROOT,
      limit: PIPELINE_LIMIT,
      defaultMaterial: "steel_a36",
      defaultWeightLbs: 0.5,
      feedPsnAutonomy: true,
    });
    expect(r.ok).toBe(true);
    expect(r.ingest_summary.records).toBeGreaterThan(0);
    expect(r.baseline.total_records).toBeGreaterThan(0);
    expect(r.baseline.by_customer.length).toBeGreaterThanOrEqual(1);

    // Persist for operator inspection — this JSON IS the milestone deliverable
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
      ...r,
      generated_at: new Date().toISOString(),
      milestone: "JM-DIE-FINANCIAL-BASELINE-MS0",
      slot: "charlie",
      goal: "/goal-14",
    }, null, 2), "utf8");
    expect(fs.existsSync(OUTPUT_PATH)).toBe(true);
  });

  it("baseline JSON has the right top-level shape for operator consumption", () => {
    expect(fs.existsSync(OUTPUT_PATH)).toBe(true);
    const baseline = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
    expect(baseline.ok).toBe(true);
    expect(typeof baseline.ingest_summary.total_files_scanned).toBe("number");
    expect(typeof baseline.price_lookup_summary.exact).toBe("number");
    expect(Array.isArray(baseline.baseline.by_customer)).toBe(true);
    expect(Array.isArray(baseline.baseline.by_year)).toBe(true);
  });

  it("price-lookup hit rate ≥ 30% (CSV-seed covers 2020-2026 — most JM Die docs in range)", () => {
    const baseline = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
    const total = baseline.price_lookup_summary.exact + baseline.price_lookup_summary.nearest_prior + baseline.price_lookup_summary.not_found;
    expect(total).toBeGreaterThan(0);
    const hitRate = (baseline.price_lookup_summary.exact + baseline.price_lookup_summary.nearest_prior) / total;
    expect(hitRate).toBeGreaterThanOrEqual(0.30);
  });

  it("psi_delta feed fired for at least 30% of records", () => {
    const baseline = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
    const total = baseline.outcome_feed_summary.fed + baseline.outcome_feed_summary.skipped;
    expect(total).toBeGreaterThan(0);
    const feedRate = baseline.outcome_feed_summary.fed / total;
    expect(feedRate).toBeGreaterThanOrEqual(0.30);
  });
});
