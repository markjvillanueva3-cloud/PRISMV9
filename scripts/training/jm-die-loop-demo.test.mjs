/**
 * Tests for jm-die-loop-demo.mjs — synthetic outcome generator.
 *
 * Verifies the synthetic data exercises every interesting code path in the
 * downstream loop:
 *   - normal fold (time, rate, quality)
 *   - S(x) anomaly route
 *   - out-of-bounds multiplier anomaly route
 *
 * slot:india /goal-fleet-coord iter12
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSyntheticOutcomes } from "./jm-die-loop-demo.mjs";

describe("buildSyntheticOutcomes", () => {
  it("emits 17 records total (5 time + 5 rate + 5 quality + 1 S(x) anomaly + 1 OOB)", () => {
    const records = buildSyntheticOutcomes(new Date("2026-05-25T22:00:00Z"));
    assert.equal(records.length, 17);
  });

  it("every record is attributed to shop_id=jm-die", () => {
    const records = buildSyntheticOutcomes();
    for (const r of records) assert.equal(r.shop_id, "jm-die");
  });

  it("every record has category=lathe (single-domain demo)", () => {
    const records = buildSyntheticOutcomes();
    for (const r of records) assert.equal(r.category, "lathe");
  });

  it("5 time-domain records with realistic 1.2x ratio", () => {
    const records = buildSyntheticOutcomes();
    const time = records.filter((r) => r.domain === "time" && r.s_of_x !== 0.5 && r.actual / r.estimated < 3.0);
    assert.equal(time.length, 5);
    for (const r of time) {
      const ratio = r.actual / r.estimated;
      assert.ok(ratio > 1.15 && ratio < 1.25, `time ratio ${ratio} should be ~1.2`);
    }
  });

  it("5 rate-domain records at 1.05x baseline (55 → 57.75)", () => {
    const records = buildSyntheticOutcomes();
    const rate = records.filter((r) => r.domain === "rate");
    assert.equal(rate.length, 5);
    for (const r of rate) {
      assert.equal(r.estimated, 55);
      assert.ok(Math.abs(r.actual - 57.75) < 0.01, `rate actual should be 57.75, got ${r.actual}`);
    }
  });

  it("5 quality-domain records — Cpk in [0.88, 0.95]", () => {
    const records = buildSyntheticOutcomes();
    const q = records.filter((r) => r.domain === "quality");
    assert.equal(q.length, 5);
    for (const r of q) {
      assert.equal(r.unit, "Cpk");
      assert.ok(r.actual >= 0.88 && r.actual <= 0.95, `Cpk ${r.actual} should be in [0.88, 0.95]`);
    }
  });

  it("exactly one S(x)=0.5 anomaly record (gets routed to anomalies path)", () => {
    const records = buildSyntheticOutcomes();
    const anomalies = records.filter((r) => r.s_of_x !== undefined && r.s_of_x < 0.7);
    assert.equal(anomalies.length, 1);
    assert.equal(anomalies[0].s_of_x, 0.5);
  });

  it("exactly one 10x out-of-bounds record (gets routed to anomalies by clamp)", () => {
    const records = buildSyntheticOutcomes();
    const oob = records.filter((r) => {
      if (r.s_of_x !== undefined && r.s_of_x < 0.7) return false;
      const ratio = r.actual / r.estimated;
      return ratio > 3.0 || ratio < 0.33;
    });
    assert.equal(oob.length, 1);
    assert.equal(oob[0].estimated, 10);
    assert.equal(oob[0].actual, 100);
  });

  it("observed_at timestamps are monotonically increasing", () => {
    const records = buildSyntheticOutcomes(new Date("2026-05-25T22:00:00Z"));
    for (let i = 1; i < records.length; i++) {
      assert.ok(
        records[i].observed_at > records[i - 1].observed_at,
        `records[${i}].observed_at=${records[i].observed_at} should be > records[${i - 1}].observed_at=${records[i - 1].observed_at}`,
      );
    }
  });

  it("schema conforms — every record has the required OutcomeLedgerRecord fields", () => {
    const records = buildSyntheticOutcomes();
    for (const r of records) {
      assert.equal(typeof r.observed_at, "string");
      assert.equal(typeof r.category, "string");
      assert.equal(typeof r.domain, "string");
      assert.ok(Number.isFinite(r.estimated));
      assert.ok(Number.isFinite(r.actual));
      assert.equal(typeof r.unit, "string");
    }
  });
});
