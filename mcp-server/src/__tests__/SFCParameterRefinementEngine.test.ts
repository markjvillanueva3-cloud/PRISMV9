/**
 * SFCParameterRefinementEngine — test suite for U-BRIDGE-LEARN-SFC.
 *
 * Real-value assertions per [[feedback_verify_actual_contract_not_proxy]].
 * Each case asserts a concrete numeric or string value against the
 * median + IQR + confidence math defined by the engine.
 */

import { describe, it, expect } from "vitest";
import {
  SFCParameterRefinementEngine,
} from "../engines/SFCParameterRefinementEngine.js";
import type { OutcomeCaptureBusEngine } from "../engines/OutcomeCaptureBusEngine.js";
import type { OutcomeEvent } from "../schemas/outcomeEventSchema.js";

function mkEvent(partial: Partial<OutcomeEvent>): OutcomeEvent {
  return {
    schemaVersion: "1.1.0",
    event_id: partial.event_id ?? "evt-" + Math.random().toString(36).slice(2),
    lineage_id: partial.lineage_id ?? "lin-default",
    domain: partial.domain ?? "speed_feed",
    kind: partial.kind ?? "operator_override",
    severity: partial.severity ?? "info",
    source: partial.source ?? "operator",
    timestamp: partial.timestamp ?? "2026-05-19T00:00:00.000Z",
    agent_id: partial.agent_id,
    context: partial.context ?? {},
    recommended: partial.recommended,
    actual: partial.actual,
    delta: partial.delta,
    confidence: partial.confidence,
    note: partial.note,
    numeric_features: partial.numeric_features,
  } as OutcomeEvent;
}

function mkBus(events: OutcomeEvent[]): OutcomeCaptureBusEngine {
  return {
    query: ({ kind }: { kind?: string }) => {
      const sorted = [...events].sort((a, b) =>
        b.timestamp.localeCompare(a.timestamp),
      );
      const filtered = kind ? sorted.filter((e) => e.kind === kind) : sorted;
      return { events: filtered, truncated: false };
    },
  } as unknown as OutcomeCaptureBusEngine;
}

function mkRecAndOverride(args: {
  lineageId: string;
  recommendedSfm: number;
  actualSfm: number;
  material?: string;
  machine_id?: string;
  timestamp?: string;
}): [OutcomeEvent, OutcomeEvent] {
  const ts = args.timestamp ?? "2026-05-19T12:00:00.000Z";
  const ctx = {
    material: args.material ?? "D2",
    machine_id: args.machine_id ?? "M-08",
  };
  const rec = mkEvent({
    lineage_id: args.lineageId,
    kind: "recommendation_emitted",
    source: "system",
    context: ctx,
    recommended: {
      summary: { sfm: args.recommendedSfm },
      raw: { sfm: args.recommendedSfm },
    },
    timestamp: ts,
  });
  const ovr = mkEvent({
    lineage_id: args.lineageId,
    kind: "operator_override",
    source: "operator",
    context: ctx,
    actual: { sfm: args.actualSfm },
    timestamp: ts,
  });
  return [rec, ovr];
}

const NOW_MS = Date.parse("2026-05-20T06:00:00.000Z");
const CLOCK = () => NOW_MS;

describe("SFCParameterRefinementEngine", () => {
  it("returns no_evidence with sampleSize=0 when bus has zero matching recommendations", () => {
    const engine = new SFCParameterRefinementEngine(mkBus([]));
    const r = engine.computeRefinement({ context: {}, clock: CLOCK });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toBe("no_evidence");
    expect(r.sampleSize).toBe(0);
    expect(r.contextMatchHash).toBe("ctx:any");
    expect(r.message).toContain("no SFC recommendations matching context");
  });

  it("returns below_min_samples with sampleSize=3 when default minSamples=5", () => {
    const fixtures = [
      mkRecAndOverride({ lineageId: "L1", recommendedSfm: 300, actualSfm: 285 }),
      mkRecAndOverride({ lineageId: "L2", recommendedSfm: 300, actualSfm: 280 }),
      mkRecAndOverride({ lineageId: "L3", recommendedSfm: 300, actualSfm: 290 }),
    ].flat();
    const engine = new SFCParameterRefinementEngine(mkBus(fixtures));
    const r = engine.computeRefinement({
      context: { material: "D2", machine_id: "M-08" },
      clock: CLOCK,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toBe("below_min_samples");
    expect(r.sampleSize).toBe(3);
    expect(r.message).toContain("sampleSize=3 < minSamples=5");
  });

  it("computes sfmFactor=0.9 with sampleSize=6 confidence=0.3 (n/N_FULL=6/20, IQR=0)", () => {
    const fixtures: OutcomeEvent[] = [];
    for (let i = 1; i <= 6; i++) {
      const [rec, ovr] = mkRecAndOverride({
        lineageId: `L${i}`,
        recommendedSfm: 300,
        actualSfm: 270, // 0.9 × 300
      });
      fixtures.push(rec, ovr);
    }
    const engine = new SFCParameterRefinementEngine(mkBus(fixtures));
    const r = engine.computeRefinement({
      context: { material: "D2", machine_id: "M-08" },
      clock: CLOCK,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.sampleSize).toBe(6);
    expect(r.factors.sfmFactor).toBeCloseTo(0.9, 10);
    expect(r.factors.fzFactor).toBe(1);
    expect(r.factors.feedRateFactor).toBe(1);
    expect(r.factors.docFactor).toBe(1);
    expect(r.factors.aeFactor).toBe(1);
    expect(r.perMetricSamples.sfmFactor).toBe(6);
    expect(r.dispersion.sfm).toBe(0);
    // sampleTerm = min(1, 6/20) = 0.3; dispersionTerm = exp(-0/0.5) = 1
    expect(r.confidence).toBeCloseTo(0.3, 10);
  });

  it("context filter excludes Al6061 outliers — sfmFactor stays 0.9, sampleSize=5", () => {
    const fixtures: OutcomeEvent[] = [];
    for (let i = 1; i <= 5; i++) {
      const [rec, ovr] = mkRecAndOverride({
        lineageId: `D2-${i}`,
        recommendedSfm: 300,
        actualSfm: 270,
        material: "D2",
      });
      fixtures.push(rec, ovr);
    }
    for (let i = 1; i <= 5; i++) {
      const [rec, ovr] = mkRecAndOverride({
        lineageId: `Al-${i}`,
        recommendedSfm: 300,
        actualSfm: 150, // 0.5 — would skew the median heavily if not filtered
        material: "AL6061",
      });
      fixtures.push(rec, ovr);
    }
    const engine = new SFCParameterRefinementEngine(mkBus(fixtures));
    const r = engine.computeRefinement({
      context: { material: "D2" },
      clock: CLOCK,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.sampleSize).toBe(5);
    expect(r.factors.sfmFactor).toBeCloseTo(0.9, 10);
    expect(r.contextMatchHash).toBe("ctx:material=D2");
    expect(r.evidenceLineageIds.sort()).toEqual([
      "D2-1", "D2-2", "D2-3", "D2-4", "D2-5",
    ]);
  });

  it("pre-clips a 50× unit-mismatch outlier — bad lineage absent from evidence, factor=0.9", () => {
    const fixtures: OutcomeEvent[] = [];
    for (let i = 1; i <= 5; i++) {
      const [rec, ovr] = mkRecAndOverride({
        lineageId: `L${i}`,
        recommendedSfm: 300,
        actualSfm: 270,
      });
      fixtures.push(rec, ovr);
    }
    const [bad_rec, bad_ovr] = mkRecAndOverride({
      lineageId: "L-bad",
      recommendedSfm: 300,
      actualSfm: 15000, // 50× — unit mismatch
    });
    fixtures.push(bad_rec, bad_ovr);
    const engine = new SFCParameterRefinementEngine(mkBus(fixtures));
    const r = engine.computeRefinement({
      context: { material: "D2", machine_id: "M-08" },
      clock: CLOCK,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.evidenceLineageIds).not.toContain("L-bad");
    expect(r.sampleSize).toBe(5);
    expect(r.factors.sfmFactor).toBeCloseTo(0.9, 10);
  });

  it("clamps factor=8 down to caller maxFactor=2 within HARD_SAFETY_BAND=4", () => {
    const fixtures: OutcomeEvent[] = [];
    for (let i = 1; i <= 6; i++) {
      const [rec, ovr] = mkRecAndOverride({
        lineageId: `L${i}`,
        recommendedSfm: 100,
        actualSfm: 800, // ratio = 8 — within pre-clip [0.1, 10] but above caps
      });
      fixtures.push(rec, ovr);
    }
    const engine = new SFCParameterRefinementEngine(mkBus(fixtures));
    const r = engine.computeRefinement({
      context: { material: "D2", machine_id: "M-08" },
      maxFactor: 2,
      clock: CLOCK,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.factors.sfmFactor).toBe(2);
  });

  it("applyToRecommendation with confidence=0 leaves sfm=300 fpt=0.005 unchanged", () => {
    const engine = new SFCParameterRefinementEngine(mkBus([]));
    const refinement = {
      ok: true as const,
      factors: {
        sfmFactor: 2, fzFactor: 2, feedRateFactor: 2,
        docFactor: 2, aeFactor: 2,
      },
      confidence: 0,
      sampleSize: 5,
      evidenceLineageIds: [],
      evidenceLineageIdsTruncated: false,
      dispersion: {},
      contextMatchHash: "ctx:any",
      computedAtIso: "2026-05-20T06:00:00.000Z",
      perMetricSamples: {},
    };
    const out = engine.applyToRecommendation({ sfm: 300, fpt: 0.005 }, refinement);
    expect(out.sfm).toBe(300);
    expect(out.fpt).toBe(0.005);
  });

  it("applyToRecommendation aliasing — sfm wins over vc; doc wins over ap (no double-apply)", () => {
    const engine = new SFCParameterRefinementEngine(mkBus([]));
    const refinement = {
      ok: true as const,
      factors: {
        sfmFactor: 2, fzFactor: 1, feedRateFactor: 1,
        docFactor: 2, aeFactor: 1,
      },
      confidence: 1,
      sampleSize: 20,
      evidenceLineageIds: [],
      evidenceLineageIdsTruncated: false,
      dispersion: {},
      contextMatchHash: "ctx:any",
      computedAtIso: "2026-05-20T06:00:00.000Z",
      perMetricSamples: {},
    };
    const out = engine.applyToRecommendation(
      { sfm: 300, vc: 91.44, doc: 2.0, ap: 2.0 },
      refinement,
    );
    expect(out.sfm).toBe(600);   // doubled
    expect(out.vc).toBe(91.44);  // untouched — sfm already won
    expect(out.doc).toBe(4.0);   // doubled
    expect(out.ap).toBe(2.0);    // untouched — doc already won
  });

  it("delta-as-actual fallback REMOVED — delta-only event contributes 0 ratios, sampleSize stays 5", () => {
    const fixtures: OutcomeEvent[] = [];
    for (let i = 1; i <= 5; i++) {
      const [rec, ovr] = mkRecAndOverride({
        lineageId: `L${i}`,
        recommendedSfm: 300,
        actualSfm: 270,
      });
      fixtures.push(rec, ovr);
    }
    const [delta_rec] = mkRecAndOverride({
      lineageId: "L-delta",
      recommendedSfm: 300,
      actualSfm: 270,
    });
    fixtures.push(delta_rec);
    fixtures.push(
      mkEvent({
        lineage_id: "L-delta",
        kind: "operator_override",
        context: { material: "D2", machine_id: "M-08" },
        delta: { sfm: 50 }, // delta only
      }),
    );
    const engine = new SFCParameterRefinementEngine(mkBus(fixtures));
    const r = engine.computeRefinement({
      context: { material: "D2", machine_id: "M-08" },
      clock: CLOCK,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.sampleSize).toBe(5);
    expect(r.evidenceLineageIds).not.toContain("L-delta");
  });

  it("clock injection — computedAtIso equals frozen 2026-05-20T03:14:15.926Z", () => {
    const fixtures: OutcomeEvent[] = [];
    for (let i = 1; i <= 6; i++) {
      const [rec, ovr] = mkRecAndOverride({
        lineageId: `L${i}`,
        recommendedSfm: 300,
        actualSfm: 270,
      });
      fixtures.push(rec, ovr);
    }
    const engine = new SFCParameterRefinementEngine(mkBus(fixtures));
    const frozenClock = () => Date.parse("2026-05-20T03:14:15.926Z");
    const r = engine.computeRefinement({
      context: { material: "D2", machine_id: "M-08" },
      clock: frozenClock,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.computedAtIso).toBe("2026-05-20T03:14:15.926Z");
  });

  it("evidenceLineageIdsTruncated=true at 55 lineages — returned list capped at exactly 50", () => {
    const fixtures: OutcomeEvent[] = [];
    for (let i = 1; i <= 55; i++) {
      const [rec, ovr] = mkRecAndOverride({
        lineageId: `L${i}`,
        recommendedSfm: 300,
        actualSfm: 270,
      });
      fixtures.push(rec, ovr);
    }
    const engine = new SFCParameterRefinementEngine(mkBus(fixtures));
    const r = engine.computeRefinement({
      context: { material: "D2", machine_id: "M-08" },
      clock: CLOCK,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.sampleSize).toBe(55);
    expect(r.evidenceLineageIds.length).toBe(50);
    expect(r.evidenceLineageIdsTruncated).toBe(true);
  });

  it("bus.query() throw → ok:false reason='bus_error', message names the failure", () => {
    const angryBus = {
      query: () => {
        throw new Error("simulated disk full");
      },
    } as unknown as OutcomeCaptureBusEngine;
    const engine = new SFCParameterRefinementEngine(angryBus);
    const r = engine.computeRefinement({ context: {}, clock: CLOCK });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toBe("bus_error");
    expect(r.message).toContain("simulated disk full");
  });

  it("warning='already aligned' when ratios=1.0 — ok:true factors=1, sampleSize=6", () => {
    const fixtures: OutcomeEvent[] = [];
    for (let i = 1; i <= 6; i++) {
      const [rec, ovr] = mkRecAndOverride({
        lineageId: `L${i}`,
        recommendedSfm: 300,
        actualSfm: 300, // ratio = 1.0
      });
      fixtures.push(rec, ovr);
    }
    const engine = new SFCParameterRefinementEngine(mkBus(fixtures));
    const r = engine.computeRefinement({
      context: { material: "D2", machine_id: "M-08" },
      clock: CLOCK,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.factors.sfmFactor).toBe(1);
    expect(r.sampleSize).toBe(6);
    expect(r.warning).toContain("already aligned");
  });
});
