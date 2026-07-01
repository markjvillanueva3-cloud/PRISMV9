/**
 * QuotingOutcomeCaptureWireEngine.test.ts -- U-CHARLIE-QUOTING-OUTCOME-WIRE
 *
 * Verifies the wire that connects quoting closed-loop outcomes -> the
 * OutcomeCaptureBus (producer side of the P0-U04 learning-loop bridge -> india).
 * Tests encode INTENT (R9): the kind mapping, the bus event contract
 * (domain/source/lineage/numeric_features), best-effort never-throw, and
 * idempotency. A fake bus captures every record() call so we assert the exact
 * emitted shape without disk I/O.
 */
import { describe, it, expect } from "vitest";
import {
  QuotingOutcomeCaptureWireEngine,
  outcomeKindFor,
  quoteDeltaPct,
  SEEN_CAP,
  type QuotingEmissionResult,
} from "../engines/QuotingOutcomeCaptureWireEngine.js";
import {
  OutcomeCaptureBusEngine,
  type RecordOutcomeInput,
  type RecordOutcomeResult,
} from "../engines/OutcomeCaptureBusEngine.js";
import type { QuoteOutcomeRecord } from "../engines/QuotingClosedLoopEngine.js";

/** Captures record() inputs; returns a deterministic ok result by default. */
class FakeBus {
  calls: RecordOutcomeInput[] = [];
  behavior: (input: RecordOutcomeInput) => RecordOutcomeResult = (input) => ({
    ok: true,
    lineage_id: input.lineage_id ?? "gen-lineage",
    event_id: `evt-${this.calls.length}`,
  });
  record(input: RecordOutcomeInput): RecordOutcomeResult {
    this.calls.push(input);
    return this.behavior(input);
  }
}

function wireWithFake(): { wire: QuotingOutcomeCaptureWireEngine; bus: FakeBus } {
  const bus = new FakeBus();
  const wire = new QuotingOutcomeCaptureWireEngine(bus as unknown as OutcomeCaptureBusEngine);
  return { wire, bus };
}

const baseRecord = (over: Partial<QuoteOutcomeRecord> = {}): QuoteOutcomeRecord => ({
  quote_id: "Q-1001",
  customer: "ALCOA",
  part_id: "PN-77",
  material: "4140",
  machine_class: "vmc",
  predicted_quote_usd: 1000,
  ...over,
});

describe("outcomeKindFor -- faithful realized-signal mapping", () => {
  it("accepted=true -> quote_accepted (terminal success)", () => {
    expect(outcomeKindFor(baseRecord({ accepted: true }))).toBe("quote_accepted");
  });
  it("accepted=false -> quote_rejected (terminal failure)", () => {
    expect(outcomeKindFor(baseRecord({ accepted: false }))).toBe("quote_rejected");
  });
  it("no accept signal but finite positive actual -> quote_vs_actual", () => {
    expect(outcomeKindFor(baseRecord({ accepted: null, actual_invoice_usd: 1234.5 }))).toBe(
      "quote_vs_actual",
    );
  });
  it("no realized signal at all -> recommendation_emitted (prediction only)", () => {
    expect(outcomeKindFor(baseRecord())).toBe("recommendation_emitted");
  });
  it("accept precedence over actual: accepted=true wins even with an actual present", () => {
    expect(outcomeKindFor(baseRecord({ accepted: true, actual_invoice_usd: 950 }))).toBe(
      "quote_accepted",
    );
  });
  it("actual of 0 is NOT a realized reconciliation -> recommendation_emitted", () => {
    expect(outcomeKindFor(baseRecord({ accepted: null, actual_invoice_usd: 0 }))).toBe(
      "recommendation_emitted",
    );
  });
  it("non-finite actual (NaN) falls through -> recommendation_emitted", () => {
    expect(outcomeKindFor(baseRecord({ accepted: null, actual_invoice_usd: NaN }))).toBe(
      "recommendation_emitted",
    );
  });
});

describe("quoteDeltaPct -- realized vs predicted percent error", () => {
  it("over-invoice: predicted 200, actual 250 -> +25.0", () => {
    expect(quoteDeltaPct(baseRecord({ predicted_quote_usd: 200, actual_invoice_usd: 250 }))).toBeCloseTo(
      25,
      10,
    );
  });
  it("under-invoice: predicted 100, actual 80 -> -20.0", () => {
    expect(quoteDeltaPct(baseRecord({ predicted_quote_usd: 100, actual_invoice_usd: 80 }))).toBeCloseTo(
      -20,
      10,
    );
  });
  it("zero prediction -> undefined (no divide-by-zero, no fabricated value)", () => {
    expect(quoteDeltaPct(baseRecord({ predicted_quote_usd: 0, actual_invoice_usd: 50 }))).toBeUndefined();
  });
  it("missing actual -> undefined", () => {
    expect(quoteDeltaPct(baseRecord({ actual_invoice_usd: null }))).toBeUndefined();
  });
  it("NaN predicted -> undefined", () => {
    expect(quoteDeltaPct(baseRecord({ predicted_quote_usd: NaN, actual_invoice_usd: 100 }))).toBeUndefined();
  });
});

describe("recordOutcome -- bus event contract", () => {
  it("emits a quote_accepted event with the exact bus contract", () => {
    const { wire, bus } = wireWithFake();
    const res = wire.recordOutcome(baseRecord({ accepted: true }), { agentId: "claude-x" });
    expect(res.ok).toBe(true);
    expect(res.emitted).toBe(true);
    expect(res.kind).toBe("quote_accepted");
    expect(bus.calls).toHaveLength(1);
    const ev = bus.calls[0];
    expect(ev.domain).toBe("quote");
    expect(ev.source).toBe("system");
    expect(ev.kind).toBe("quote_accepted");
    expect(ev.lineage_id).toBe("Q-1001"); // lineage == quote_id pairs prediction+outcome
    expect(ev.agent_id).toBe("claude-x");
    expect((ev.context as Record<string, unknown>).customer).toBe("ALCOA");
    expect((ev.context as Record<string, unknown>).part_number).toBe("PN-77");
    expect((ev.context as Record<string, unknown>).machine_class).toBe("vmc");
    // Cost numerics ride on `recommended`, NOT `numeric_features` (which is a
    // closed machining-physics key allowlist the real bus rejects USD keys on).
    expect((ev.recommended as Record<string, number>).predicted_quote_usd).toBe(1000);
    expect(ev.numeric_features).toBeUndefined();
  });

  it("quote_vs_actual carries predicted+actual+delta on the free-form fields", () => {
    const { wire, bus } = wireWithFake();
    const res = wire.recordOutcome(
      baseRecord({ accepted: null, predicted_quote_usd: 200, actual_invoice_usd: 250 }),
    );
    expect(res.kind).toBe("quote_vs_actual");
    expect(bus.calls[0].recommended).toEqual({ predicted_quote_usd: 200 });
    expect(bus.calls[0].actual).toEqual({ actual_invoice_usd: 250 });
    expect((bus.calls[0].delta as { pct: number }).pct).toBeCloseTo(25, 10);
    // never on the physics-feature allowlist surface
    expect(bus.calls[0].numeric_features).toBeUndefined();
  });

  it("recommendation_emitted (prediction only) omits actual + delta", () => {
    const { wire, bus } = wireWithFake();
    const res = wire.recordOutcome(baseRecord());
    expect(res.kind).toBe("recommendation_emitted");
    expect(bus.calls[0].actual).toBeUndefined();
    expect(bus.calls[0].delta).toBeUndefined();
    expect(bus.calls[0].numeric_features).toBeUndefined();
    expect(bus.calls[0].recommended).toEqual({ predicted_quote_usd: 1000 });
  });
});

describe("recordOutcome -- failure modes (never throw, fail loud in the result)", () => {
  it("missing quote_id -> ok:false, NOT emitted, bus never called", () => {
    const { wire, bus } = wireWithFake();
    const res = wire.recordOutcome(baseRecord({ quote_id: "" }));
    expect(res.ok).toBe(false);
    expect(res.emitted).toBe(false);
    expect(res.reason).toBe("missing quote_id");
    expect(bus.calls).toHaveLength(0);
  });

  it("bus rejects (ok:false) -> emitted:false and record is NOT marked seen (retryable)", () => {
    const { wire, bus } = wireWithFake();
    bus.behavior = (input) => ({ ok: false, lineage_id: input.lineage_id ?? "", event_id: "", warning: "disk full" });
    const r1 = wire.recordOutcome(baseRecord({ accepted: true }));
    expect(r1.ok).toBe(false);
    expect(r1.emitted).toBe(false);
    expect(r1.warning).toBe("disk full");
    expect(wire.seenSize).toBe(0); // not memoized -> a later cycle can retry
    // flip bus healthy: same record now emits (proves it was retryable)
    bus.behavior = (input) => ({ ok: true, lineage_id: input.lineage_id ?? "", event_id: "evt-retry" });
    const r2 = wire.recordOutcome(baseRecord({ accepted: true }));
    expect(r2.emitted).toBe(true);
  });

  it("bus throws -> caught, ok:false, never propagates into the closed loop", () => {
    const { wire } = wireWithFake();
    const throwingBus = {
      record() {
        throw new Error("bus exploded");
      },
    } as unknown as OutcomeCaptureBusEngine;
    const w = new QuotingOutcomeCaptureWireEngine(throwingBus);
    let res!: QuotingEmissionResult;
    expect(() => {
      res = w.recordOutcome(baseRecord({ accepted: true }));
    }).not.toThrow();
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/emit error/);
  });
});

describe("recordOutcome -- idempotency (best-effort dedup across cycles)", () => {
  it("same record twice -> second is a skipped duplicate", () => {
    const { wire, bus } = wireWithFake();
    const rec = baseRecord({ accepted: true, observed_at: "2026-06-27T00:00:00Z" });
    const a = wire.recordOutcome(rec);
    const b = wire.recordOutcome(rec);
    expect(a.emitted).toBe(true);
    expect(b.emitted).toBe(false);
    expect(b.reason).toBe("duplicate");
    expect(bus.calls).toHaveLength(1);
  });

  it("same quote_id but a new observed_at emits again (a fresh realized signal)", () => {
    const { wire, bus } = wireWithFake();
    wire.recordOutcome(baseRecord({ accepted: true, observed_at: "2026-06-27T00:00:00Z" }));
    const b = wire.recordOutcome(baseRecord({ accepted: true, observed_at: "2026-06-28T00:00:00Z" }));
    expect(b.emitted).toBe(true);
    expect(bus.calls).toHaveLength(2);
  });

  it("a prediction then its realized accept are distinct kinds -> both emit", () => {
    const { wire, bus } = wireWithFake();
    const pred = wire.recordOutcome(baseRecord({ observed_at: "t0" })); // recommendation_emitted
    const real = wire.recordOutcome(baseRecord({ accepted: true, observed_at: "t0" })); // quote_accepted
    expect(pred.kind).toBe("recommendation_emitted");
    expect(real.kind).toBe("quote_accepted");
    expect(bus.calls).toHaveLength(2); // different kind -> different dedup key
  });
});

describe("recordOutcomes -- batch", () => {
  it("returns one result per record in order; non-array -> []", () => {
    const { wire, bus } = wireWithFake();
    const results = wire.recordOutcomes([
      baseRecord({ quote_id: "A", accepted: true }),
      baseRecord({ quote_id: "B", accepted: false }),
      baseRecord({ quote_id: "", accepted: true }), // skipped (no id)
    ]);
    expect(results).toHaveLength(3);
    expect(results[0].kind).toBe("quote_accepted");
    expect(results[1].kind).toBe("quote_rejected");
    expect(results[2].emitted).toBe(false);
    expect(bus.calls).toHaveLength(2);
    expect(wire.recordOutcomes(null as unknown as QuoteOutcomeRecord[])).toEqual([]);
  });
});

describe("constants", () => {
  it("SEEN_CAP is a sane positive bound", () => {
    expect(SEEN_CAP).toBeGreaterThan(0);
  });
});
