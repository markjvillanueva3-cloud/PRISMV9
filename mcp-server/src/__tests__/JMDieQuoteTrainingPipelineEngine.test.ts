/**
 * Tests for JMDieQuoteTrainingPipelineEngine — JM-DIE-FINANCIAL-BASELINE-MS0 / U-JM04.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { JMDieQuoteTrainingPipelineEngine } from "../engines/JMDieQuoteTrainingPipelineEngine.js";

const eng = new JMDieQuoteTrainingPipelineEngine();

let tmpRoot: string;
beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-pipeline-"));
  const dir1 = path.join(tmpRoot, "AAFAS", "1490");
  fs.mkdirSync(dir1, { recursive: true });
  fs.writeFileSync(path.join(dir1, "1490__Scanned Document - 11_4_2020 10_35 AM.pdf"), "A".repeat(50_000));
  const dir2 = path.join(tmpRoot, "ALCOA", "9000");
  fs.mkdirSync(dir2, { recursive: true });
  fs.writeFileSync(path.join(dir2, "quote-3_15_2022.xlsx"), "B".repeat(120_000));
});
afterEach(() => { try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {} });

describe("JMDieQuoteTrainingPipelineEngine.trainBatch — happy path", () => {
  it("composes ingest → price-lookup → baseline → ok=true", () => {
    const r = eng.trainBatch({ rootDir: tmpRoot, limit: 100 });
    expect(r.ok).toBe(true);
    expect(r.ingest_summary.records).toBe(2);
    expect(r.ingest_summary.customers_seen).toBe(2);
    expect(r.baseline.ok).toBe(true);
    expect(r.baseline.total_records).toBe(2);
  });

  it("price_lookup_summary tracks exact + nearest_prior + not_found", () => {
    const r = eng.trainBatch({ rootDir: tmpRoot, limit: 100, defaultMaterial: "steel_a36" });
    // Both dates (Nov 2020, Mar 2022) are within 2020-2026 CSV range
    const total = r.price_lookup_summary.exact + r.price_lookup_summary.nearest_prior + r.price_lookup_summary.not_found;
    expect(total).toBe(2);
  });

  it("baseline.by_customer sorted by revenue (ALCOA bigger file → higher revenue)", () => {
    const r = eng.trainBatch({ rootDir: tmpRoot, limit: 100 });
    expect(r.baseline.by_customer[0].customer).toBe("ALCOA");
  });

  it("feedPsnAutonomy=false → outcome_feed_summary.fed=0 (training-only mode)", () => {
    const r = eng.trainBatch({ rootDir: tmpRoot, limit: 100, feedPsnAutonomy: false });
    expect(r.outcome_feed_summary.fed).toBe(0);
  });

  it("feedPsnAutonomy=true → outcome_feed_summary.fed > 0 (live psi_delta wiring)", () => {
    const r = eng.trainBatch({ rootDir: tmpRoot, limit: 100, feedPsnAutonomy: true });
    expect(r.outcome_feed_summary.fed).toBeGreaterThan(0);
  });
});

describe("JMDieQuoteTrainingPipelineEngine.trainBatch — failure modes (R12 fail-loud)", () => {
  it("missing rootDir → ok=false reason=missing-rootDir", () => {
    const r = eng.trainBatch({ rootDir: "" });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("missing-rootDir");
  });

  it("bogus rootDir → ok=false reason starts with ingest-failed", () => {
    const r = eng.trainBatch({ rootDir: "/non/existent/path/xyz" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^ingest-failed/);
  });

  it("missing input → ok=false (R12 runtime guard)", () => {
    // @ts-expect-error testing runtime guard
    const r = eng.trainBatch(null);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("missing-rootDir");
  });
});

describe("JMDieQuoteTrainingPipelineEngine.trainBatch — limit honored", () => {
  it("limit=1 → only 1 record processed", () => {
    const r = eng.trainBatch({ rootDir: tmpRoot, limit: 1 });
    expect(r.ingest_summary.records).toBe(1);
    expect(r.baseline.total_records).toBe(1);
  });
});

describe("JMDieQuoteTrainingPipelineEngine.trainBatch — material variability", () => {
  it("defaultMaterial=aluminum_6061 → all records material-tagged aluminum_6061", () => {
    const r = eng.trainBatch({ rootDir: tmpRoot, limit: 100, defaultMaterial: "aluminum_6061" });
    expect(r.baseline.by_material[0].material).toBe("aluminum_6061");
  });

  it("defaultMaterial=copper_c110 → all records material-tagged copper_c110", () => {
    const r = eng.trainBatch({ rootDir: tmpRoot, limit: 100, defaultMaterial: "copper_c110" });
    expect(r.baseline.by_material[0].material).toBe("copper_c110");
  });

  it("defaultMaterial=stainless_304 → all records material-tagged stainless_304", () => {
    const r = eng.trainBatch({ rootDir: tmpRoot, limit: 100, defaultMaterial: "stainless_304" });
    expect(r.baseline.by_material[0].material).toBe("stainless_304");
  });
});
