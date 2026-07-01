/**
 * ShopOutcomeIngestProcessorEngine tests — real reference values.
 *
 * Covers the operational-closure piece: JSONL outcome ledger → automated
 * loop ingest → sink ledger. JM Die baseline scenario in one place.
 *
 * slot:india /goal-psn-self-improving iter6
 */

import { describe, it, expect } from "vitest";
import {
  ShopOutcomeIngestProcessorEngine,
  parseLedgerLine,
  buildIngestInputFromLedger,
  defaultBoundsCheckVerifierFactory,
  type OutcomeLedgerRecord,
} from "../engines/ShopOutcomeIngestProcessorEngine.js";
import { ShopProfileAdapterEngine } from "../engines/ShopProfileAdapterEngine.js";
import { ChainOfVerificationEngine } from "../engines/ChainOfVerificationEngine.js";
import { PSNAutonomyLoopEngine } from "../engines/PSNAutonomyLoopEngine.js";
import { PSNSelfImprovingLoopEngine } from "../engines/PSNSelfImprovingLoopEngine.js";

// ---------------------------------------------------------------------------
// parseLedgerLine
// ---------------------------------------------------------------------------

describe("parseLedgerLine", () => {
  it("valid row → returns row", () => {
    const line = JSON.stringify({
      observed_at: "2026-05-25T22:00:00Z",
      category: "lathe",
      domain: "time",
      estimated: 10,
      actual: 12,
      unit: "min",
    });
    const r = parseLedgerLine(line, 0);
    expect("row" in r).toBe(true);
    if ("row" in r) {
      expect(r.row.category).toBe("lathe");
      expect(r.row.actual).toBe(12);
    }
  });

  it("__meta row → returns meta marker", () => {
    const r = parseLedgerLine(JSON.stringify({ __meta: true, version: 1 }), 0);
    expect("meta" in r).toBe(true);
  });

  it("invalid JSON → rejection with json_parse_failed", () => {
    const r = parseLedgerLine("not json", 5);
    expect("rejection" in r).toBe(true);
    if ("rejection" in r) {
      expect(r.rejection.reason).toBe("json_parse_failed");
      expect(r.rejection.row_index).toBe(5);
    }
  });

  it("missing required field → structured rejection", () => {
    const line = JSON.stringify({ observed_at: "x", category: "lathe", domain: "time", actual: 12, unit: "min" });
    const r = parseLedgerLine(line, 0);
    expect("rejection" in r).toBe(true);
    if ("rejection" in r) expect(r.rejection.reason).toBe("non_finite_estimated");
  });

  it("empty/blank line → rejection with empty_line", () => {
    const r = parseLedgerLine("   ", 0);
    expect("rejection" in r).toBe(true);
    if ("rejection" in r) expect(r.rejection.reason).toBe("empty_line");
  });

  it("excerpt truncated to 200 chars on long rejected lines", () => {
    const r = parseLedgerLine("a".repeat(500), 0);
    expect("rejection" in r).toBe(true);
    if ("rejection" in r) expect(r.rejection.excerpt.length).toBeLessThanOrEqual(200);
  });
});

// ---------------------------------------------------------------------------
// buildIngestInputFromLedger + defaultBoundsCheckVerifierFactory
// ---------------------------------------------------------------------------

describe("buildIngestInputFromLedger + bounds-check verifier", () => {
  const mkRow = (estimated: number, actual: number): OutcomeLedgerRecord => ({
    observed_at: "2026-05-25T22:00:00Z",
    category: "lathe",
    domain: "time",
    estimated,
    actual,
    unit: "min",
  });

  it("default shop_id is jm-die when row omits it", () => {
    const v = defaultBoundsCheckVerifierFactory(mkRow(10, 12));
    const input = buildIngestInputFromLedger(mkRow(10, 12), v);
    expect(input.shop_id).toBe("jm-die");
  });

  it("explicit shop_id propagates through", () => {
    const row = { ...mkRow(10, 12), shop_id: "acme-tools" };
    const v = defaultBoundsCheckVerifierFactory(row);
    const input = buildIngestInputFromLedger(row, v);
    expect(input.shop_id).toBe("acme-tools");
  });

  it("bounds-check verifier confirms ratio=1.2 (within [0.5, 2.0])", async () => {
    const v = defaultBoundsCheckVerifierFactory(mkRow(10, 12));
    const a = await v({ id: "q", question: "ok?", severity: "medium" });
    expect(a.outcome).toBe("confirms");
    expect(a.evidence).toContain("1.200");
  });

  it("bounds-check verifier conflicts on ratio=10 (out of bounds)", async () => {
    const v = defaultBoundsCheckVerifierFactory(mkRow(10, 100));
    const a = await v({ id: "q", question: "ok?", severity: "medium" });
    expect(a.outcome).toBe("conflicts");
  });

  it("bounds-check verifier conflicts on estimated=0 (div-by-zero → Infinity)", async () => {
    const v = defaultBoundsCheckVerifierFactory(mkRow(0, 5));
    const a = await v({ id: "q", question: "ok?", severity: "medium" });
    expect(a.outcome).toBe("conflicts");
  });
});

// ---------------------------------------------------------------------------
// ShopOutcomeIngestProcessorEngine.processLedger (end-to-end)
// ---------------------------------------------------------------------------

describe("ShopOutcomeIngestProcessorEngine.processLedger — operational closure", () => {
  function mkLoopStack() {
    const adapter = new ShopProfileAdapterEngine();
    const cov = new ChainOfVerificationEngine();
    const autonomy = new PSNAutonomyLoopEngine();
    const loopEngine = new PSNSelfImprovingLoopEngine(adapter, cov, autonomy);
    return { adapter, loopEngine };
  }

  function mkLedger(rows: Array<Partial<OutcomeLedgerRecord> & { observed_at?: string }>): string {
    const out: string[] = ['{"__meta":true,"version":1,"source":"test"}'];
    for (const r of rows) {
      out.push(JSON.stringify({
        observed_at: r.observed_at || "2026-05-25T22:00:00Z",
        category: r.category || "lathe",
        domain: r.domain || "time",
        estimated: r.estimated ?? 10,
        actual: r.actual ?? 12,
        unit: r.unit || "min",
        ...(r.shop_id ? { shop_id: r.shop_id } : {}),
        ...(r.s_of_x !== undefined ? { s_of_x: r.s_of_x } : {}),
      }));
    }
    return out.join("\n");
  }

  it("JM Die: 3 in-bounds outcomes → 3 folded into adapter (full or caveat), by_shop counts", async () => {
    const { adapter, loopEngine } = mkLoopStack();
    const ledger = mkLedger([
      { observed_at: "2026-05-25T22:00:00Z", estimated: 10, actual: 12 },
      { observed_at: "2026-05-25T22:01:00Z", estimated: 20, actual: 24 },
      { observed_at: "2026-05-25T22:02:00Z", estimated: 30, actual: 36 },
    ]);
    const sink: string[] = [];
    const engine = new ShopOutcomeIngestProcessorEngine();
    const stats = await engine.processLedger("fake.jsonl", {
      readFileImpl: () => ledger,
      sinkWriter: (l) => sink.push(l),
      loopEngine,
      nowImpl: () => "2026-05-25T22:03:00Z",
    });
    expect(stats.rows_scanned).toBe(4);
    expect(stats.rows_meta_skipped).toBe(1);
    expect(stats.rows_processed).toBe(3);
    expect(stats.rows_rejected).toBe(0);
    // All 3 folded (confirmed_full + confirmed_caveat both fold to adapter)
    expect(stats.loop_confirmed_full + stats.loop_confirmed_caveat).toBe(3);
    expect(stats.loop_anomaly_only).toBe(0);
    expect(stats.by_shop["jm-die"]).toBe(3);
    expect(sink.length).toBe(3);
    // Adapter actually learned — evidence_count=3 on lathe.time bucket
    expect(adapter.getDeltas("jm-die")?.time_by_category.lathe?.evidence_count).toBe(3);
  });

  it("out-of-bounds 10x outcome: CoV caveats + adapter rerouting → fold_skipped, anomalies has 1", async () => {
    const { adapter, loopEngine } = mkLoopStack();
    // ratio=10 → bounds-check verifier conflicts → CoV "confirmed_with_caveat"
    // → loop attempts fold → adapter clamps 10x out-of-bounds → anomalies route
    // → loop_outcome=fold_skipped
    const ledger = mkLedger([{ estimated: 10, actual: 100 }]);
    const stats = await new ShopOutcomeIngestProcessorEngine().processLedger("fake.jsonl", {
      readFileImpl: () => ledger,
      sinkWriter: () => {},
      loopEngine,
    });
    expect(stats.rows_processed).toBe(1);
    expect(stats.loop_fold_skipped).toBe(1);
    // Adapter recorded the anomaly but no time delta was created
    const d = adapter.getDeltas("jm-die");
    expect(d?.anomalies.length).toBe(1);
    expect(Object.keys(d?.time_by_category ?? {}).length).toBe(0);
  });

  it("S(x)=0.5 → fold_skipped (adapter sees anomaly, no time delta)", async () => {
    const { adapter, loopEngine } = mkLoopStack();
    const ledger = mkLedger([{ estimated: 10, actual: 12, s_of_x: 0.5 }]);
    const stats = await new ShopOutcomeIngestProcessorEngine().processLedger("fake.jsonl", {
      readFileImpl: () => ledger,
      sinkWriter: () => {},
      loopEngine,
    });
    expect(stats.loop_fold_skipped).toBe(1);
    expect(adapter.getDeltas("jm-die")?.anomalies.length).toBe(1);
  });

  it("multi-shop ledger: by_shop counts split correctly", async () => {
    const { loopEngine } = mkLoopStack();
    const ledger = mkLedger([
      { shop_id: "jm-die", estimated: 10, actual: 12 },
      { shop_id: "jm-die", estimated: 10, actual: 13 },
      { shop_id: "acme",   estimated: 10, actual: 11 },
    ]);
    const stats = await new ShopOutcomeIngestProcessorEngine().processLedger("fake.jsonl", {
      readFileImpl: () => ledger,
      sinkWriter: () => {},
      loopEngine,
    });
    expect(stats.by_shop["jm-die"]).toBe(2);
    expect(stats.by_shop["acme"]).toBe(1);
  });

  it("malformed row in middle of ledger → rejection captured, neighbors processed", async () => {
    const { loopEngine } = mkLoopStack();
    const ledger =
      '{"__meta":true}\n' +
      '{"observed_at":"2026-05-25T22:00:00Z","category":"lathe","domain":"time","estimated":10,"actual":12,"unit":"min"}\n' +
      "not-json-this-line\n" +
      '{"observed_at":"2026-05-25T22:01:00Z","category":"lathe","domain":"time","estimated":10,"actual":13,"unit":"min"}\n';
    const stats = await new ShopOutcomeIngestProcessorEngine().processLedger("fake.jsonl", {
      readFileImpl: () => ledger,
      sinkWriter: () => {},
      loopEngine,
    });
    expect(stats.rows_processed).toBe(2);
    expect(stats.rows_rejected).toBe(1);
    expect(stats.rejections[0].reason).toBe("json_parse_failed");
  });

  it("unreadable input → input_unreadable rejection, no crash", async () => {
    const stats = await new ShopOutcomeIngestProcessorEngine().processLedger("missing.jsonl", {
      readFileImpl: () => { throw new Error("ENOENT"); },
      sinkWriter: () => {},
      nowImpl: () => "2026-05-25T22:00:00Z",
    });
    expect(stats.rows_scanned).toBe(0);
    expect(stats.rejections[0].reason).toBe("input_unreadable");
    expect(stats.rejections[0].excerpt).toContain("ENOENT");
  });

  it("sink receives one stringified LoopIngestResult per processed row", async () => {
    const { loopEngine } = mkLoopStack();
    const sink: string[] = [];
    const ledger = mkLedger([{ estimated: 10, actual: 12 }, { estimated: 20, actual: 22 }]);
    await new ShopOutcomeIngestProcessorEngine().processLedger("fake.jsonl", {
      readFileImpl: () => ledger,
      sinkWriter: (l) => sink.push(l),
      loopEngine,
    });
    expect(sink.length).toBe(2);
    const r0 = JSON.parse(sink[0]);
    expect(r0.shop_id).toBe("jm-die");
    expect(typeof r0.loop_outcome).toBe("string");
    expect(typeof r0.loop_iteration_id).toBe("string");
  });

  it("end-to-end JM Die learning fixture: 5 outcomes → adapter learns multiplier, adapt() applies it", async () => {
    const { adapter, loopEngine } = mkLoopStack();
    // Five 1.3x outcomes — JM Die actually runs slower than estimates
    const rows = Array.from({ length: 5 }, (_, i) => ({
      observed_at: `2026-05-25T22:0${i}:00Z`,
      estimated: 10,
      actual: 13,
    }));
    const ledger = mkLedger(rows);
    const stats = await new ShopOutcomeIngestProcessorEngine().processLedger("fake.jsonl", {
      readFileImpl: () => ledger,
      sinkWriter: () => {},
      loopEngine,
    });
    expect(stats.rows_processed).toBe(5);
    // All 5 were folded (either confirmed_full OR confirmed_caveat — both fold)
    const folded = stats.loop_confirmed_full + stats.loop_confirmed_caveat;
    expect(folded).toBe(5);
    expect(stats.loop_anomaly_only).toBe(0);
    expect(stats.loop_fold_skipped).toBe(0);
    // Adapter actually learned — evidence_count=5
    const d = adapter.getDeltas("jm-die");
    expect(d?.time_by_category.lathe?.evidence_count).toBe(5);
    // Multiplier drifted from 1.0 toward observed 1.3 (still below convergence at 5 folds)
    expect(d?.time_by_category.lathe?.multiplier).toBeGreaterThan(1.10);
    expect(d?.time_by_category.lathe?.multiplier).toBeLessThan(1.30);
    // adapt() now applies the multiplier (evidence_count >= 3 floor cleared)
    const adapted = adapter.adapt("jm-die", 100, { kind: "time", category: "lathe", unit: "min" });
    expect(adapted.value).toBeGreaterThan(110); // 100 * multiplier > 110
    expect(typeof adapted.warning).toBe("undefined");
  });
});
