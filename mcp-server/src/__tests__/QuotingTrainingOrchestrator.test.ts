/**
 * QuotingTrainingOrchestratorEngine tests — continuous calibration loop
 * @milestone QUOTING-SYNERGY-MS0/U-QP-TRAINING-ORCHESTRATOR (charlie /goal-yolo iter1)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { quotingTrainingOrchestratorEngine } from "../engines/QuotingTrainingOrchestratorEngine.js";
import type { QuoteBaselineRecord } from "../engines/QuotingTrainingLoopEngine.js";

describe("QuotingTrainingOrchestratorEngine.runOnce — U-QP-TRAINING-ORCHESTRATOR", () => {
  let tmpDir: string;
  let activePath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "qto-test-"));
    activePath = join(tmpDir, "active-calibration.json");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  function makeRecords(count: number, biasPct: number): QuoteBaselineRecord[] {
    const records: QuoteBaselineRecord[] = [];
    for (let i = 0; i < count; i++) {
      const fmvApprox = 89.58;
      const actual = fmvApprox / (1 + biasPct / 100);
      records.push({
        customer: i % 2 === 0 ? "ACME" : "INDUSTRIAL",
        part_id: `part-${i.toString().padStart(3, "0")}`,
        doc_date: "2026-05-25",
        actual_revenue_usd: round2(actual),
        estimated_time_in_cut_s: 1500,
        machine_rate_usd_per_hr: 95,
        estimated_material_spend_usd: 50,
      });
    }
    return records;
  }
  function round2(n: number): number { return Math.round(n * 100) / 100; }

  it("rejects empty records — returns ok:false with reason", async () => {
    const r = await quotingTrainingOrchestratorEngine.runOnce({
      records: [],
      activeFactorPath: activePath,
    });
    expect(r.ok).toBe(false);
    expect(typeof r.reason).toBe("string");
    expect((r.reason ?? "").length).toBeGreaterThan(0);
    expect(r.active_factor_written).toBe(false);
  });

  it("writes active-factor JSON when CoV gates safe_to_activate", async () => {
    const records = makeRecords(20, 12);
    const r = await quotingTrainingOrchestratorEngine.runOnce({
      records,
      activeFactorPath: activePath,
    });
    expect(r.ok).toBe(true);
    expect(r.report.ok).toBe(true);
    expect(r.report.total_predicted).toBe(20);
    expect(r.factors?.ok).toBe(true);
    expect(typeof r.cov?.posteriorConfidence).toBe("number");
    if (r.safe_to_activate) {
      expect(r.active_factor_written).toBe(true);
      expect(r.active_factor_path).toBe(activePath);
      const raw = await fs.readFile(activePath, "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.ok).toBe(true);
      expect(typeof parsed.global.factor).toBe("number");
      expect(parsed.global.factor).toBeGreaterThan(0);
    } else {
      expect(r.active_factor_written).toBe(false);
      expect(r.skip_reason).toMatch(/CoV verdict not safe/);
    }
  });

  it("writeIfSafe=false → skips write even if CoV is safe", async () => {
    const records = makeRecords(20, 10);
    const r = await quotingTrainingOrchestratorEngine.runOnce({
      records,
      activeFactorPath: activePath,
      writeIfSafe: false,
    });
    expect(r.ok).toBe(true);
    expect(r.active_factor_written).toBe(false);
    if (r.safe_to_activate) {
      expect(r.skip_reason).toMatch(/writeIfSafe=false/);
    }
    await expect(fs.access(activePath)).rejects.toThrow();
  });

  it("CoV escalation case (sparse customer data) → no write, skip_reason explains", async () => {
    const records: QuoteBaselineRecord[] = [{
      customer: "SOLO_CUSTOMER", part_id: "p1", doc_date: "2026-05-25",
      actual_revenue_usd: 80, estimated_time_in_cut_s: 1500,
      machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 50,
    }];
    const r = await quotingTrainingOrchestratorEngine.runOnce({
      records,
      activeFactorPath: activePath,
    });
    expect(r.ok).toBe(true);
    expect(r.report.total_predicted).toBe(1);
    expect(r.active_factor_written).toBe(false);
    expect(typeof r.skip_reason).toBe("string");
    expect((r.skip_reason ?? "").length).toBeGreaterThan(0);
  });

  it("atomic write — no .tmp- file leftovers in target dir", async () => {
    const records = makeRecords(15, 8);
    const r = await quotingTrainingOrchestratorEngine.runOnce({
      records,
      activeFactorPath: activePath,
    });
    if (r.active_factor_written) {
      const entries = await fs.readdir(tmpDir);
      const tmpLeftovers = entries.filter(n => n.includes(".tmp-"));
      expect(tmpLeftovers).toHaveLength(0);
    }
  });

  it("creates target directory if missing (atomic mkdir)", async () => {
    const nested = join(tmpDir, "nested", "dir", "active-calibration.json");
    const records = makeRecords(15, 8);
    const r = await quotingTrainingOrchestratorEngine.runOnce({
      records,
      activeFactorPath: nested,
    });
    if (r.active_factor_written) {
      expect(r.active_factor_path).toBe(nested);
      const raw = await fs.readFile(nested, "utf-8");
      expect(raw.length).toBeGreaterThan(0);
    }
  });

  it("feedPsnAutonomy=true → psi_delta_fed_count is non-negative finite", async () => {
    const records = makeRecords(15, 10);
    const r = await quotingTrainingOrchestratorEngine.runOnce({
      records,
      activeFactorPath: activePath,
      feedPsnAutonomy: true,
    });
    expect(r.ok).toBe(true);
    expect(r.psi_delta_fed_count).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.psi_delta_fed_count)).toBe(true);
  });

  it("feedPsnAutonomy=false → psi_delta_fed_count = 0", async () => {
    const records = makeRecords(15, 10);
    const r = await quotingTrainingOrchestratorEngine.runOnce({
      records,
      activeFactorPath: activePath,
      feedPsnAutonomy: false,
    });
    expect(r.psi_delta_fed_count).toBe(0);
  });

  it("deriveOpts.maxFactor clamps over-prediction correction", async () => {
    const records = makeRecords(20, 300);
    const r = await quotingTrainingOrchestratorEngine.runOnce({
      records,
      activeFactorPath: activePath,
      deriveOpts: { maxFactor: 2.0 },
    });
    if (r.factors?.ok && r.factors.global) {
      expect(r.factors.global.factor).toBeLessThanOrEqual(2.0);
      expect(r.factors.global.factor).toBeGreaterThan(0);
    }
  });

  it("returns the full AccuracyReport with metrics + per_customer_bias", async () => {
    const records = makeRecords(15, 10);
    const r = await quotingTrainingOrchestratorEngine.runOnce({
      records,
      activeFactorPath: activePath,
    });
    expect(typeof r.report.metrics.mae_usd).toBe("number");
    expect(typeof r.report.metrics.mape_pct).toBe("number");
    expect(r.report.metrics.mape_pct).toBeGreaterThan(0);
    expect(Array.isArray(r.report.per_customer_bias)).toBe(true);
    expect(r.report.per_customer_bias.length).toBeGreaterThanOrEqual(1);
  });

  it("warnings array always present (audit trail invariant)", async () => {
    const r = await quotingTrainingOrchestratorEngine.runOnce({
      records: makeRecords(5, 10),
      activeFactorPath: activePath,
    });
    expect(Array.isArray(r.warnings)).toBe(true);
  });
});
