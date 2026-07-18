import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeRecords } from "./lathe-baseline-analyzer.mjs";

const fixture = [
  {
    iso_group: "P",
    summary: { quality_score: 62, operations_observed: ["od_rough", "od_finish"], inserts_observed: ["CNMG", "DNMG"] },
    stages: [{ name: "PARSE", ok: true, g_codes: ["G50", "G71", "G96"] }],
  },
  {
    iso_group: "P",
    summary: { quality_score: 88, operations_observed: ["od_rough", "od_thread"], inserts_observed: ["WNMG"] },
    stages: [{ name: "PARSE", ok: true, g_codes: ["G71", "G76"] }],
  },
  {
    iso_group: "H",
    summary: { quality_score: 35, operations_observed: ["od_finish"], inserts_observed: [] },
    stages: [{ name: "PARSE", ok: true, g_codes: ["G70"] }],
  },
  {
    iso_group: "M",
    summary: { quality_score: 70, operations_observed: ["od_rough"], inserts_observed: ["CNMG"] },
    stages: [{ name: "PARSE", ok: true, g_codes: ["G71", "G96"] }],
  },
];

describe("analyzeRecords", () => {
  it("computes mean/median/p10/p90 from quality scores", () => {
    const r = analyzeRecords(fixture);
    assert.equal(r.total_programs, 4);
    assert.equal(r.scored, 4);
    assert.equal(r.quality.mean, Math.round((62 + 88 + 35 + 70) / 4));
    assert.equal(typeof r.quality.median, "number");
  });

  it("bins scores into POOR / AMATEUR / MEDIOCRE / GOOD / EXPERT", () => {
    const r = analyzeRecords(fixture);
    const binLabels = r.quality.distribution.map(d => d.bin);
    assert.ok(binLabels.some(l => l.startsWith("0-40")));
    assert.ok(binLabels.some(l => l.startsWith("55-70") || l.startsWith("70-85")));
  });

  it("reports insert coverage percentage", () => {
    const r = analyzeRecords(fixture);
    // 3 of 4 records have inserts → 75%
    assert.equal(r.insert_coverage_pct, 75);
    assert.equal(r.with_explicit_inserts, 3);
  });

  it("tallies operations across records", () => {
    const r = analyzeRecords(fixture);
    const ops = Object.fromEntries(r.top_operations.map(o => [o.key, o.count]));
    assert.equal(ops.od_rough, 3);
    assert.equal(ops.od_finish, 2);
    assert.equal(ops.od_thread, 1);
  });

  it("tallies ISO groups", () => {
    const r = analyzeRecords(fixture);
    const iso = Object.fromEntries(r.iso_groups.map(i => [i.iso, i.count]));
    assert.equal(iso.P, 2);
    assert.equal(iso.H, 1);
    assert.equal(iso.M, 1);
  });

  it("tallies G-codes from PARSE stage", () => {
    const r = analyzeRecords(fixture);
    const g = Object.fromEntries(r.top_g_codes.map(x => [x.key, x.count]));
    assert.equal(g.G71, 3);
    assert.equal(g.G96, 2);
    assert.equal(g.G76, 1);
  });

  it("handles empty input gracefully", () => {
    const r = analyzeRecords([]);
    assert.equal(r.total_programs, 0);
    assert.equal(r.scored, 0);
    assert.equal(r.quality.mean, null);
    assert.equal(r.insert_coverage_pct, 0);
  });

  it("ignores records with no quality_score", () => {
    const r = analyzeRecords([{ summary: {} }, { summary: { quality_score: 80 } }]);
    assert.equal(r.scored, 1);
    assert.equal(r.quality.mean, 80);
  });
});
