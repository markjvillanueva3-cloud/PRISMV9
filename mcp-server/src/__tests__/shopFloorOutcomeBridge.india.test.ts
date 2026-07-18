/**
 * shopFloorOutcomeBridge — india PSN-SELF-IMPROVING-LOOP bridge tests.
 *
 * Verifies the WEDM → india OutcomeLedgerRecord schema bridge (the "use india's
 * data to flesh yours out" integration): mapper conformance to the 2026-05-25
 * coordination contract, the privacy-hash gate, the WEDM CoV verifier bounds,
 * and the injected-I/O emit. Pure-core + injected sink (RGS-MS1 lesson) — no
 * live shard touched, no dependency on india's main-only ingest engine.
 */

import { describe, it, expect } from "vitest";
import {
  mapWEDMOutcomeToLedgerRecords,
  emitWEDMToIndiaLoop,
  wedmOutcomeSafetyScore,
  hashEvidenceId,
  type OutcomeLedgerRecord,
  type WEDMJobOutcomeLike,
} from "../utils/shopFloorOutcomeBridge.js";

const GOOD: WEDMJobOutcomeLike = {
  jobId: "3024402-P1", // encodes a part number — must be hashed, never emitted raw
  material: "D2",
  finishedAt: "2026-05-29T18:00:00.000Z",
  predicted: { raUm: 0.4, cycleTimeMin: 120 },
  actual: { raUm: 0.44, cycleTimeMin: 132, wireBreaks: 0 },
};

describe("shopFloorOutcomeBridge — india OutcomeLedgerRecord mapper", () => {
  it("maps one WEDM outcome to exactly 3 records: quality(Ra) + time(cycle) + yield(breaks)", () => {
    const recs = mapWEDMOutcomeToLedgerRecords(GOOD);
    expect(recs).toHaveLength(3);
    expect(recs.map((r) => r.domain).sort()).toEqual(["quality", "time", "yield"]);
    expect(recs.every((r) => r.category === "wedm")).toBe(true);
  });

  it("quality row carries the real Ra estimate/actual in µm (contract fields)", () => {
    const q = mapWEDMOutcomeToLedgerRecords(GOOD).find((r) => r.domain === "quality")!;
    expect(q.estimated).toBeCloseTo(0.4, 5);
    expect(q.actual).toBeCloseTo(0.44, 5);
    expect(q.unit).toBe("um");
    expect(q.observed_at).toBe("2026-05-29T18:00:00.000Z"); // = finishedAt passthrough
    expect(q.shop_id).toBe("jm-die");
  });

  it("time row carries cycle-time estimate/actual in minutes", () => {
    const t = mapWEDMOutcomeToLedgerRecords(GOOD).find((r) => r.domain === "time")!;
    expect(t.estimated).toBeCloseTo(120, 5);
    expect(t.actual).toBeCloseTo(132, 5);
    expect(t.unit).toBe("min");
  });

  it("yield row encodes wire-breaks against a zero-break target", () => {
    const y = mapWEDMOutcomeToLedgerRecords(GOOD).find((r) => r.domain === "yield")!;
    expect(y.estimated).toBe(0);
    expect(y.actual).toBe(0);
    expect(y.unit).toBe("breaks");
    expect(y.s_of_x).toBe(1); // zero breaks → perfect yield
  });

  it("PRIVACY GATE: evidence_id is an opaque hash, never the raw jobId/part number", () => {
    const recs = mapWEDMOutcomeToLedgerRecords(GOOD);
    for (const r of recs) {
      expect(r.evidence_id).toMatch(/^wedm-[0-9a-f]{16}$/);
      expect(r.evidence_id).not.toContain("3024402"); // raw part number must NOT leak
      expect(r.summary ?? "").not.toContain("3024402");
    }
    // deterministic: same job → same hash (so india can dedupe by evidence_id)
    expect(mapWEDMOutcomeToLedgerRecords(GOOD)[0].evidence_id).toBe(
      hashEvidenceId("3024402-P1"),
    );
  });

  it("summary carries the public material GRADE but no shop-private id", () => {
    const recs = mapWEDMOutcomeToLedgerRecords(GOOD);
    expect(recs[0].summary).toContain("D2"); // material grade is a public spec
    expect(recs[0].summary).toContain("wedm");
  });

  it("FAIL-LOUD: a malformed outcome yields zero rows (never NaN into the shared ledger)", () => {
    expect(mapWEDMOutcomeToLedgerRecords({ ...GOOD, jobId: "" })).toHaveLength(0);
    expect(
      mapWEDMOutcomeToLedgerRecords({
        ...GOOD,
        actual: { ...GOOD.actual, raUm: NaN },
      }),
    ).toHaveLength(0);
    // @ts-expect-error intentional bad input
    expect(mapWEDMOutcomeToLedgerRecords(null)).toHaveLength(0);
  });
});

describe("shopFloorOutcomeBridge — WEDM CoV verifier (india domain open-Q)", () => {
  it("on-target estimate scores 1.0", () => {
    expect(wedmOutcomeSafetyScore(10, 10)).toBe(1);
  });

  it("30% relative error scores 0.70 — exactly india's anomaly threshold", () => {
    expect(wedmOutcomeSafetyScore(10, 13)).toBeCloseTo(0.7, 5);
  });

  it("≥100% relative error clamps to 0 (routes to india's anomaly path)", () => {
    expect(wedmOutcomeSafetyScore(10, 20)).toBe(0);
    expect(wedmOutcomeSafetyScore(10, 100)).toBe(0);
  });

  it("non-finite inputs score 0 (never emit a NaN safety score)", () => {
    expect(wedmOutcomeSafetyScore(NaN, 10)).toBe(0);
    expect(wedmOutcomeSafetyScore(10, Infinity)).toBe(0);
  });

  it("zero-estimate is handled without divide-by-zero blowup", () => {
    const s = wedmOutcomeSafetyScore(0, 0);
    expect(Number.isFinite(s)).toBe(true);
    expect(s).toBe(1); // 0 vs 0 → no error
  });
});

describe("shopFloorOutcomeBridge — emitWEDMToIndiaLoop (injected sink)", () => {
  it("appends one conformant JSONL line per record to the injected sink", () => {
    const sink: Array<{ path: string; line: string }> = [];
    const recs = emitWEDMToIndiaLoop(GOOD, {
      appendImpl: (path, line) => sink.push({ path, line }),
    });
    expect(recs).toHaveLength(3);
    expect(sink).toHaveLength(3);
    for (const { line } of sink) {
      expect(line.endsWith("\n")).toBe(true);
      const obj = JSON.parse(line) as OutcomeLedgerRecord;
      expect(obj.category).toBe("wedm");
      expect(["quality", "time", "yield"]).toContain(obj.domain);
      expect(typeof obj.observed_at).toBe("string");
      expect(typeof obj.estimated).toBe("number");
      expect(typeof obj.actual).toBe("number");
      expect(obj.s_of_x).toBeGreaterThanOrEqual(0);
      expect(obj.s_of_x).toBeLessThanOrEqual(1);
    }
  });

  it("writes to the injected ledgerPath (no live shard touched)", () => {
    const seen = new Set<string>();
    emitWEDMToIndiaLoop(GOOD, {
      ledgerPath: "FAKE/wedm-test.jsonl",
      appendImpl: (path) => seen.add(path),
    });
    expect([...seen]).toEqual(["FAKE/wedm-test.jsonl"]);
  });

  it("malformed outcome emits nothing (no partial/NaN rows)", () => {
    const sink: string[] = [];
    const recs = emitWEDMToIndiaLoop(
      { ...GOOD, jobId: "" },
      { appendImpl: (_p, line) => sink.push(line) },
    );
    expect(recs).toHaveLength(0);
    expect(sink).toHaveLength(0);
  });
});
