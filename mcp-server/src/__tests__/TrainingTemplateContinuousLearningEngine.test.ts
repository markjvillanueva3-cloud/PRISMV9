/**
 * TrainingTemplateContinuousLearningEngine — real-value contract tests
 * ===================================================================
 *
 * All assertions are concrete values, algebraic invariants, or behavioural
 * contracts from the engine JSDoc. No `toBeDefined/Truthy/Undefined/Falsy()`
 * stubs (test-legitimacy.mjs Tier-0 hook rejects them).
 *
 * @milestone TRAINING-LEARNING-MS0 / U-TL-U6-CONTINUOUS-LEARNING
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  trainingTemplateContinuousLearningEngine,
  TrainingTemplateContinuousLearningEngine,
  type OutcomeInput,
} from "../engines/TrainingTemplateContinuousLearningEngine.js";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-train-out-"));
}

function readLedgerLines(file: string): Array<Record<string, unknown>> {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

const FIXED_NOW = () => new Date("2026-05-13T22:30:00Z");

describe("TrainingTemplateContinuousLearningEngine", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTempDir();
  });

  // ─── construction ─────────────────────────────────────────────────────────

  it("exports a singleton + class", () => {
    expect(trainingTemplateContinuousLearningEngine).toBeInstanceOf(
      TrainingTemplateContinuousLearningEngine,
    );
  });

  // ─── input validation: missing job_id ─────────────────────────────────────

  it("rejects missing job_id with discriminated error", () => {
    const r = trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
      // @ts-expect-error — intentional missing field
      { family: "shaft", outcome: "success" },
      { dir: tmp },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("missing_job_id");
  });

  it("rejects null input with discriminated error", () => {
    // @ts-expect-error — intentional null
    const r = trainingTemplateContinuousLearningEngine.ingestMillOutcome(null, { dir: tmp });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("missing_job_id");
  });

  it("rejects empty-string job_id", () => {
    const r = trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
      { job_id: "", family: "shaft", outcome: "success" },
      { dir: tmp },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("missing_job_id");
  });

  // ─── input validation: missing family ─────────────────────────────────────

  it("rejects missing family with discriminated error", () => {
    const r = trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
      // @ts-expect-error — intentional missing field
      { job_id: "JOB-001", outcome: "success" },
      { dir: tmp },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("missing_family");
  });

  it("rejects empty-string family", () => {
    const r = trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
      { job_id: "JOB-001", family: "", outcome: "success" },
      { dir: tmp },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("missing_family");
  });

  // ─── input validation: invalid outcome ────────────────────────────────────

  it("rejects invalid outcome enum", () => {
    const r = trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
      // @ts-expect-error — bogus outcome
      { job_id: "JOB-001", family: "shaft", outcome: "kinda-worked" },
      { dir: tmp },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_outcome");
  });

  // ─── input validation: customer_actuals ──────────────────────────────────

  it("rejects scrap_rate outside [0,1]", () => {
    const r = trainingTemplateContinuousLearningEngine.ingestMillOutcome(
      {
        job_id: "JOB-002",
        family: "plate",
        outcome: "success",
        customer_actuals: { scrap_rate: 1.5 },
      },
      { dir: tmp },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_customer_actuals");
  });

  it("rejects negative tool_life_min", () => {
    const r = trainingTemplateContinuousLearningEngine.ingestWEDMOutcome(
      {
        job_id: "JOB-003",
        family: "punch-die",
        outcome: "success",
        customer_actuals: { tool_life_min: -5 },
      },
      { dir: tmp },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_customer_actuals");
  });

  it("rejects NaN measured_ra_um", () => {
    const r = trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
      {
        job_id: "JOB-004",
        family: "shaft",
        outcome: "success",
        customer_actuals: { measured_ra_um: NaN },
      },
      { dir: tmp },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_customer_actuals");
  });

  // ─── happy-path ingest (each domain) ──────────────────────────────────────

  it("ingestLatheOutcome appends a record to the lathe ledger", () => {
    const r = trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
      {
        job_id: "LATHE-001",
        family: "shaft",
        outcome: "success",
        customer: "ITW",
        material: "AISI 1045",
        customer_actuals: { tool_life_min: 90, cycle_time_sec: 240, measured_ra_um: 1.6 },
      },
      { dir: tmp, now: FIXED_NOW },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record.domain).toBe("lathe");
      expect(r.record.job_id).toBe("LATHE-001");
      expect(r.record.family).toBe("shaft");
      expect(r.record.outcome).toBe("success");
      expect(r.record.ts).toBe("2026-05-13T22:30:00.000Z");
      expect(r.record.seq).toBe(1);
      expect(r.record.schemaVersion).toBe(1);
      expect(r.ledger_size).toBe(1);
    }
    const lines = readLedgerLines(path.join(tmp, "lathe-outcomes.jsonl"));
    expect(lines.length).toBe(1);
    expect((lines[0] as { job_id: string }).job_id).toBe("LATHE-001");
  });

  it("ingestMillOutcome writes to mill-outcomes.jsonl", () => {
    const r = trainingTemplateContinuousLearningEngine.ingestMillOutcome(
      { job_id: "MILL-001", family: "plate", outcome: "partial" },
      { dir: tmp, now: FIXED_NOW },
    );
    expect(r.ok).toBe(true);
    expect(fs.existsSync(path.join(tmp, "mill-outcomes.jsonl"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, "lathe-outcomes.jsonl"))).toBe(false);
  });

  it("ingestWEDMOutcome writes to wedm-outcomes.jsonl", () => {
    const r = trainingTemplateContinuousLearningEngine.ingestWEDMOutcome(
      { job_id: "WEDM-001", family: "punch-die", outcome: "fail" },
      { dir: tmp, now: FIXED_NOW },
    );
    expect(r.ok).toBe(true);
    expect(fs.existsSync(path.join(tmp, "wedm-outcomes.jsonl"))).toBe(true);
  });

  // ─── append-only invariant ────────────────────────────────────────────────

  it("multiple ingests append (not overwrite) and seq monotonically increases", () => {
    const r1 = trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
      { job_id: "A", family: "shaft", outcome: "success" },
      { dir: tmp, now: FIXED_NOW },
    );
    const r2 = trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
      { job_id: "B", family: "shaft", outcome: "fail" },
      { dir: tmp, now: FIXED_NOW },
    );
    const r3 = trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
      { job_id: "C", family: "flange", outcome: "partial" },
      { dir: tmp, now: FIXED_NOW },
    );
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);
    if (r1.ok && r2.ok && r3.ok) {
      expect(r1.record.seq).toBe(1);
      expect(r2.record.seq).toBe(2);
      expect(r3.record.seq).toBe(3);
      expect(r3.ledger_size).toBe(3);
    }
    const lines = readLedgerLines(path.join(tmp, "lathe-outcomes.jsonl"));
    expect(lines.length).toBe(3);
    expect((lines[0] as { job_id: string }).job_id).toBe("A");
    expect((lines[1] as { job_id: string }).job_id).toBe("B");
    expect((lines[2] as { job_id: string }).job_id).toBe("C");
  });

  it("explicit ts in input is preserved (not overwritten by engine clock)", () => {
    const explicitTs = "2025-12-31T23:59:59.000Z";
    const r = trainingTemplateContinuousLearningEngine.ingestMillOutcome(
      { job_id: "M-TS", family: "plate", outcome: "success", ts: explicitTs },
      { dir: tmp, now: FIXED_NOW },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.record.ts).toBe(explicitTs);
  });

  // ─── listRecentOutcomes ──────────────────────────────────────────────────

  it("listRecentOutcomes returns chronological records", () => {
    trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
      { job_id: "A", family: "shaft", outcome: "success" },
      { dir: tmp, now: FIXED_NOW },
    );
    trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
      { job_id: "B", family: "flange", outcome: "fail" },
      { dir: tmp, now: FIXED_NOW },
    );
    const r = trainingTemplateContinuousLearningEngine.listRecentOutcomes("lathe", {
      dir: tmp,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.records.length).toBe(2);
      expect(r.records[0].job_id).toBe("A");
      expect(r.records[1].job_id).toBe("B");
      expect(r.ledger_present).toBe(true);
    }
  });

  it("listRecentOutcomes returns empty array for empty domain", () => {
    const r = trainingTemplateContinuousLearningEngine.listRecentOutcomes("wedm", {
      dir: tmp,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.records.length).toBe(0);
      expect(r.ledger_present).toBe(false);
    }
  });

  it("listRecentOutcomes rejects invalid domain", () => {
    const r = trainingTemplateContinuousLearningEngine.listRecentOutcomes(
      // @ts-expect-error — intentional bad domain
      "submarine",
      { dir: tmp },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_domain");
  });

  it("listRecentOutcomes respects limit (last-N tail)", () => {
    for (let i = 1; i <= 5; i++) {
      trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
        { job_id: `J-${i}`, family: "shaft", outcome: "success" },
        { dir: tmp, now: FIXED_NOW },
      );
    }
    const r = trainingTemplateContinuousLearningEngine.listRecentOutcomes("lathe", {
      dir: tmp,
      limit: 2,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.records.length).toBe(2);
      expect(r.records[0].job_id).toBe("J-4");
      expect(r.records[1].job_id).toBe("J-5");
    }
  });

  // ─── getFamilyAccuracy ──────────────────────────────────────────────────

  it("getFamilyAccuracy: 2 success / 1 partial / 1 fail of shaft → 2.5/4 = 0.625", () => {
    const inputs: OutcomeInput[] = [
      { job_id: "1", family: "shaft", outcome: "success" },
      { job_id: "2", family: "shaft", outcome: "success" },
      { job_id: "3", family: "shaft", outcome: "partial" },
      { job_id: "4", family: "shaft", outcome: "fail" },
    ];
    for (const inp of inputs) {
      trainingTemplateContinuousLearningEngine.ingestLatheOutcome(inp, {
        dir: tmp,
        now: FIXED_NOW,
      });
    }
    const r = trainingTemplateContinuousLearningEngine.getFamilyAccuracy("lathe", "shaft", {
      dir: tmp,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.total_records).toBe(4);
      expect(r.success_count).toBe(2);
      expect(r.partial_count).toBe(1);
      expect(r.fail_count).toBe(1);
      expect(r.accuracy).toBeCloseTo(0.625, 9);
    }
  });

  it("getFamilyAccuracy: only family-matching records included", () => {
    trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
      { job_id: "S1", family: "shaft", outcome: "success" },
      { dir: tmp, now: FIXED_NOW },
    );
    trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
      { job_id: "F1", family: "flange", outcome: "fail" },
      { dir: tmp, now: FIXED_NOW },
    );
    const r = trainingTemplateContinuousLearningEngine.getFamilyAccuracy("lathe", "shaft", {
      dir: tmp,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.total_records).toBe(1);
      expect(r.success_count).toBe(1);
      expect(r.accuracy).toBe(1.0);
    }
  });

  it("getFamilyAccuracy computes mean tool_life / cycle_time / Ra correctly", () => {
    const acts = [
      { tool_life_min: 60, cycle_time_sec: 180, measured_ra_um: 1.2 },
      { tool_life_min: 120, cycle_time_sec: 240, measured_ra_um: 1.8 },
      { tool_life_min: 90, cycle_time_sec: 210, measured_ra_um: 1.5 },
    ];
    for (let i = 0; i < acts.length; i++) {
      trainingTemplateContinuousLearningEngine.ingestMillOutcome(
        {
          job_id: `M${i}`,
          family: "plate",
          outcome: "success",
          customer_actuals: acts[i],
        },
        { dir: tmp, now: FIXED_NOW },
      );
    }
    const r = trainingTemplateContinuousLearningEngine.getFamilyAccuracy("mill", "plate", {
      dir: tmp,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mean_tool_life_min).toBeCloseTo((60 + 120 + 90) / 3, 9);
      expect(r.mean_cycle_time_sec).toBeCloseTo((180 + 240 + 210) / 3, 9);
      expect(r.mean_measured_ra_um).toBeCloseTo((1.2 + 1.8 + 1.5) / 3, 9);
    }
  });

  it("getFamilyAccuracy: no_records when family has no entries", () => {
    const r = trainingTemplateContinuousLearningEngine.getFamilyAccuracy("wedm", "punch-die", {
      dir: tmp,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("no_records");
  });

  it("getFamilyAccuracy: missing_family on empty string", () => {
    const r = trainingTemplateContinuousLearningEngine.getFamilyAccuracy("lathe", "", {
      dir: tmp,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("missing_family");
  });

  // ─── getOutcomeStats ────────────────────────────────────────────────────

  it("getOutcomeStats aggregates across families with correct accuracy per family", () => {
    const inputs: OutcomeInput[] = [
      { job_id: "1", family: "shaft", outcome: "success", customer: "ITW" },
      { job_id: "2", family: "shaft", outcome: "fail", customer: "Holo-Krome" },
      { job_id: "3", family: "flange", outcome: "success", customer: "ITW" },
      { job_id: "4", family: "flange", outcome: "success", customer: "Alcoa" },
    ];
    for (const inp of inputs) {
      trainingTemplateContinuousLearningEngine.ingestLatheOutcome(inp, {
        dir: tmp,
        now: FIXED_NOW,
      });
    }
    const r = trainingTemplateContinuousLearningEngine.getOutcomeStats("lathe", {
      dir: tmp,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.total_records).toBe(4);
      expect(r.per_family.shaft.total).toBe(2);
      expect(r.per_family.shaft.success).toBe(1);
      expect(r.per_family.shaft.fail).toBe(1);
      expect(r.per_family.shaft.accuracy).toBe(0.5);
      expect(r.per_family.flange.total).toBe(2);
      expect(r.per_family.flange.success).toBe(2);
      expect(r.per_family.flange.accuracy).toBe(1.0);
      expect(r.customers).toEqual(["Alcoa", "Holo-Krome", "ITW"]);
    }
  });

  it("getOutcomeStats: empty domain returns total=0 with empty maps", () => {
    const r = trainingTemplateContinuousLearningEngine.getOutcomeStats("wedm", {
      dir: tmp,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.total_records).toBe(0);
      expect(Object.keys(r.per_family).length).toBe(0);
      expect(r.customers).toEqual([]);
      expect(r.earliest_ts).toBe(null);
      expect(r.latest_ts).toBe(null);
    }
  });

  it("getOutcomeStats: invalid_domain rejected", () => {
    const r = trainingTemplateContinuousLearningEngine.getOutcomeStats(
      // @ts-expect-error
      "submarine",
      { dir: tmp },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_domain");
  });

  // ─── prototype-pollution + JSON safety ───────────────────────────────────

  it("readLedger ignores __proto__ keys (prototype-pollution-safe)", () => {
    const file = path.join(tmp, "lathe-outcomes.jsonl");
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(
      file,
      JSON.stringify({ schemaVersion: 1, domain: "lathe", job_id: "X", family: "shaft", outcome: "success", ts: "2026-05-13T00:00:00.000Z", seq: 1, "__proto__": { polluted: true } }) + "\n",
      "utf8",
    );
    const r = trainingTemplateContinuousLearningEngine.listRecentOutcomes("lathe", { dir: tmp });
    expect(r.ok).toBe(true);
    // Verify Object.prototype was not polluted.
    expect(({} as Record<string, unknown>).polluted).toBe(undefined);
  });

  it("readLedger skips malformed lines and reads valid ones", () => {
    const file = path.join(tmp, "mill-outcomes.jsonl");
    fs.mkdirSync(tmp, { recursive: true });
    const validLine = JSON.stringify({ schemaVersion: 1, domain: "mill", job_id: "VALID", family: "plate", outcome: "success", ts: "2026-05-13T00:00:00.000Z", seq: 1 });
    fs.writeFileSync(file, validLine + "\nthis is not json\n" + validLine + "\n", "utf8");
    const r = trainingTemplateContinuousLearningEngine.listRecentOutcomes("mill", { dir: tmp });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.records.length).toBe(2);
      expect(r.records[0].job_id).toBe("VALID");
    }
  });

  // ─── adversarial / edge cases ────────────────────────────────────────────

  it("very long job_id (10KB) is accepted and round-trips", () => {
    const longId = "J-" + "x".repeat(10_000);
    const r = trainingTemplateContinuousLearningEngine.ingestWEDMOutcome(
      { job_id: longId, family: "punch-die", outcome: "success" },
      { dir: tmp, now: FIXED_NOW },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.record.job_id).toBe(longId);
    const lines = readLedgerLines(path.join(tmp, "wedm-outcomes.jsonl"));
    expect((lines[0] as { job_id: string }).job_id).toBe(longId);
  });

  it("scrap_rate at exact boundary 0 and 1 is accepted", () => {
    const r0 = trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
      { job_id: "S0", family: "shaft", outcome: "success", customer_actuals: { scrap_rate: 0 } },
      { dir: tmp, now: FIXED_NOW },
    );
    const r1 = trainingTemplateContinuousLearningEngine.ingestLatheOutcome(
      { job_id: "S1", family: "shaft", outcome: "fail", customer_actuals: { scrap_rate: 1 } },
      { dir: tmp, now: FIXED_NOW },
    );
    expect(r0.ok).toBe(true);
    expect(r1.ok).toBe(true);
  });
});
