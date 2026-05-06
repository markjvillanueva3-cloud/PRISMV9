/**
 * CAMFeedbackLoopEngine tests — CAM-EXHAUST-MS0/U-CAM120
 *
 * Coverage targets per CLAUDE.md COMPREHENSIVE-BUILD ENFORCEMENT:
 *   - happy path
 *   - >=3 failure modes (bad input, boundary, resource exhaustion)
 *   - >=2 adversarial inputs (NaN, Infinity)
 *   - >=3 spanning AGIDecisionTask configurations
 *   - Mann-Kendall + ordinary-slope reference values from Mann (1945)
 *   - End-to-end via camDispatcher (round-trip assertion)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  CAMFeedbackLoopEngine,
  mannKendall,
  ordinarySlope,
} from "../engines/CAMFeedbackLoopEngine.js";
import type { AGIDecision } from "../engines/CAMDeepLearningOrchestratorEngine.js";

// ── Test constants (extracted to satisfy MAGIC NUMBER hook) ──────────────
const FIXED_TS_BASE = 1_700_000_000_000;
const MIN_DRIFT_SAMPLES = 30;
const POST_FLIP_SAMPLES = 30;
const NO_TREND_SAMPLES = 60;
const FIFO_CAP = 3;
const FIFO_OVERFLOW_RECORDS = 10;
const REASON_TRUNCATE_LIMIT = 480;
const PROMPT_TRUNCATE_LIMIT = 4096;
const TOP_SOURCE_SHARE_DENOM = 6;
const STATS_CORRECTION_COUNT = 6;
const STATS_OUTCOME_COUNT = 4;
const OLLAMA_CORRECTION_COUNT = 4;
const PARAMETER_CORRECTION_COUNT = 3;
const STRATEGY_CORRECTION_COUNT = 5;

beforeEach(() => {
  CAMFeedbackLoopEngine.clearAll();
  CAMFeedbackLoopEngine.setBufferCap(10_000);
});

describe("CAMFeedbackLoopEngine — recordCorrection", () => {
  it("records a correction and returns a CorrectionRecord", () => {
    const rec = CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "dec-1",
      task: "strategy_recommend",
      originalValue: "trochoidal",
      correctedValue: "adaptive",
      originalSource: "ollama",
      originalConfidence: 0.72,
      reason: "thin-wall vibration risk",
      operatorId: "op-mark",
      prompt: "ti6al4v 3mm wall, end mill 6mm",
      recordedAt: FIXED_TS_BASE,
    });
    expect(rec.recordId.startsWith("corr-")).toBe(true);
    expect(rec.decisionId).toBe("dec-1");
    expect(rec.task).toBe("strategy_recommend");
    expect(rec.originalValue).toBe("trochoidal");
    expect(rec.correctedValue).toBe("adaptive");
    expect(rec.originalSource).toBe("ollama");
    expect(rec.originalConfidence).toBe(0.72);
    expect(rec.reason).toBe("thin-wall vibration risk");
    expect(rec.recordedAt).toBe(FIXED_TS_BASE);
  });

  it("applies sensible defaults for missing optional fields", () => {
    const rec = CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "dec-2",
      task: "parameter_extract",
      originalValue: 1200,
      correctedValue: 800,
      recordedAt: FIXED_TS_BASE,
    });
    expect(rec.originalSource).toBeNull();
    expect(rec.originalConfidence).toBe(0);
    expect(rec.reason).toBe("");
    expect(rec.operatorId).toBe("");
    expect(rec.prompt).toBe("");
  });

  it("throws on empty decisionId (failure mode: bad input)", () => {
    expect(() =>
      CAMFeedbackLoopEngine.recordCorrection({
        decisionId: "",
        task: "strategy_recommend",
        originalValue: "a",
        correctedValue: "b",
      })
    ).toThrow(/decisionId/);
  });

  it("throws on empty task (failure mode: bad input)", () => {
    expect(() =>
      CAMFeedbackLoopEngine.recordCorrection({
        decisionId: "dec-x",
        // @ts-expect-error — runtime check
        task: "",
        originalValue: "a",
        correctedValue: "b",
      })
    ).toThrow(/task/);
  });

  it("throws when both original and corrected values are undefined (boundary)", () => {
    expect(() =>
      CAMFeedbackLoopEngine.recordCorrection({
        decisionId: "dec-x",
        task: "strategy_recommend",
        originalValue: undefined,
        correctedValue: undefined,
      })
    ).toThrow(/originalValue\/correctedValue/);
  });

  it("throws when originalConfidence is out of bounds (boundary)", () => {
    expect(() =>
      CAMFeedbackLoopEngine.recordCorrection({
        decisionId: "dec-x",
        task: "strategy_recommend",
        originalValue: "a",
        correctedValue: "b",
        originalConfidence: 1.7,
      })
    ).toThrow(/\[0, 1\]/);
    expect(() =>
      CAMFeedbackLoopEngine.recordCorrection({
        decisionId: "dec-x",
        task: "strategy_recommend",
        originalValue: "a",
        correctedValue: "b",
        originalConfidence: -0.1,
      })
    ).toThrow(/\[0, 1\]/);
  });

  it("throws on NaN originalConfidence (adversarial)", () => {
    expect(() =>
      CAMFeedbackLoopEngine.recordCorrection({
        decisionId: "dec-x",
        task: "strategy_recommend",
        originalValue: "a",
        correctedValue: "b",
        originalConfidence: Number.NaN,
      })
    ).toThrow(/\[0, 1\]/);
  });

  it("throws on Infinity originalConfidence (adversarial)", () => {
    expect(() =>
      CAMFeedbackLoopEngine.recordCorrection({
        decisionId: "dec-x",
        task: "strategy_recommend",
        originalValue: "a",
        correctedValue: "b",
        originalConfidence: Number.POSITIVE_INFINITY,
      })
    ).toThrow(/\[0, 1\]/);
  });

  it("truncates reason to 480 chars and prompt to 4096 chars with ellipsis marker", () => {
    const longReason = "x".repeat(REASON_TRUNCATE_LIMIT * 2);
    const longPrompt = "y".repeat(PROMPT_TRUNCATE_LIMIT * 2);
    const rec = CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "dec-trunc",
      task: "strategy_recommend",
      originalValue: "a",
      correctedValue: "b",
      reason: longReason,
      prompt: longPrompt,
    });
    expect(rec.reason.length).toBe(REASON_TRUNCATE_LIMIT);
    expect(rec.prompt.length).toBe(PROMPT_TRUNCATE_LIMIT);
    expect(rec.reason.endsWith("…")).toBe(true);
    expect(rec.prompt.endsWith("…")).toBe(true);
  });
});

describe("CAMFeedbackLoopEngine — recordCorrectionFromDecision", () => {
  it("derives originalValue, source, confidence from the decision", () => {
    const decision: AGIDecision<string> = {
      task: "operation_classify",
      value: "rough_pocket",
      confidence: 0.81,
      escalateToHuman: false,
      rationale: "physics + ollama agree",
      voices: [
        {
          source: "physics",
          value: "rough_pocket",
          confidence: 0.9,
          weight: 1,
          available: true,
          latencyMs: 12,
        },
      ],
      totalLatencyMs: 24,
      agreeingSources: ["physics", "ollama"],
      // @ts-expect-error optional in source type — exercises real engine field
      dissentingSources: ["nvidia"],
    };
    const rec = CAMFeedbackLoopEngine.recordCorrectionFromDecision(
      decision,
      "finish_pocket",
      { reason: "operator wants finish first", operatorId: "op-1" }
    );
    expect(rec.task).toBe("operation_classify");
    expect(rec.originalValue).toBe("rough_pocket");
    expect(rec.correctedValue).toBe("finish_pocket");
    expect(rec.originalSource).toBe("physics");
    expect(rec.originalConfidence).toBe(0.81);
    expect(rec.reason).toBe("operator wants finish first");
  });

  it("throws on null decision (adversarial)", () => {
    expect(() =>
      // @ts-expect-error — adversarial
      CAMFeedbackLoopEngine.recordCorrectionFromDecision(null, "x")
    ).toThrow(/AGIDecision/);
  });
});

describe("CAMFeedbackLoopEngine — recordOutcome", () => {
  it("records an outcome with all explicit fields", () => {
    const out = CAMFeedbackLoopEngine.recordOutcome({
      decisionId: "dec-3",
      task: "tool_select_advisor",
      wasCorrect: true,
      predictedConfidence: 0.65,
      recordedAt: FIXED_TS_BASE,
    });
    expect(out.recordId.startsWith("out-")).toBe(true);
    expect(out.task).toBe("tool_select_advisor");
    expect(out.wasCorrect).toBe(true);
    expect(out.predictedConfidence).toBe(0.65);
    expect(out.recordedAt).toBe(FIXED_TS_BASE);
  });

  it("throws when wasCorrect is not a boolean (failure mode)", () => {
    expect(() =>
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: "dec-x",
        task: "tool_select_advisor",
        // @ts-expect-error
        wasCorrect: "yes",
      })
    ).toThrow(/wasCorrect/);
  });

  it("throws on NaN predictedConfidence (adversarial)", () => {
    expect(() =>
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: "dec-x",
        task: "tool_select_advisor",
        wasCorrect: true,
        predictedConfidence: Number.NaN,
      })
    ).toThrow(/predictedConfidence/);
  });

  it("clamps out-of-range predictedConfidence to [0, 1]", () => {
    const high = CAMFeedbackLoopEngine.recordOutcome({
      decisionId: "h",
      task: "tool_select_advisor",
      wasCorrect: true,
      predictedConfidence: 1.5,
    });
    const low = CAMFeedbackLoopEngine.recordOutcome({
      decisionId: "l",
      task: "tool_select_advisor",
      wasCorrect: false,
      predictedConfidence: -0.5,
    });
    expect(high.predictedConfidence).toBe(1);
    expect(low.predictedConfidence).toBe(0);
  });
});

describe("CAMFeedbackLoopEngine — getCorrections filtering (3 spanning tasks)", () => {
  beforeEach(() => {
    for (let i = 0; i < STRATEGY_CORRECTION_COUNT; i++) {
      CAMFeedbackLoopEngine.recordCorrection({
        decisionId: `s-${i}`,
        task: "strategy_recommend",
        originalValue: "a",
        correctedValue: "b",
        operatorId: i % 2 === 0 ? "alice" : "bob",
        recordedAt: 1_000 + i,
      });
    }
    for (let i = 0; i < PARAMETER_CORRECTION_COUNT; i++) {
      CAMFeedbackLoopEngine.recordCorrection({
        decisionId: `p-${i}`,
        task: "parameter_extract",
        originalValue: 1000,
        correctedValue: 800,
        recordedAt: 2_000 + i,
      });
    }
    CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "tsa-1",
      task: "tool_select_advisor",
      originalValue: "10mm-flat",
      correctedValue: "12mm-flat",
      recordedAt: 3_000,
    });
  });

  it("filters by task across all 3 spanning configurations", () => {
    expect(
      CAMFeedbackLoopEngine.getCorrections({ task: "strategy_recommend" }).length
    ).toBe(STRATEGY_CORRECTION_COUNT);
    expect(
      CAMFeedbackLoopEngine.getCorrections({ task: "parameter_extract" }).length
    ).toBe(PARAMETER_CORRECTION_COUNT);
    expect(
      CAMFeedbackLoopEngine.getCorrections({ task: "tool_select_advisor" }).length
    ).toBe(1);
  });

  it("filters by sinceMs", () => {
    expect(
      CAMFeedbackLoopEngine.getCorrections({ sinceMs: 2_000 }).length
    ).toBe(PARAMETER_CORRECTION_COUNT + 1);
    expect(
      CAMFeedbackLoopEngine.getCorrections({ sinceMs: 1_002 }).length
    ).toBe(STRATEGY_CORRECTION_COUNT - 2 + PARAMETER_CORRECTION_COUNT + 1);
  });

  it("filters by operatorId", () => {
    const alice = CAMFeedbackLoopEngine.getCorrections({ operatorId: "alice" });
    expect(alice.length).toBe(3);
    expect(
      CAMFeedbackLoopEngine.getCorrections({ operatorId: "bob" }).length
    ).toBe(2);
  });

  it("limit returns the most-recent N entries", () => {
    const last2 = CAMFeedbackLoopEngine.getCorrections({ limit: 2 });
    expect(last2.length).toBe(2);
    expect(last2[0].decisionId).toBe("p-2");
    expect(last2[1].decisionId).toBe("tsa-1");
  });
});

describe("CAMFeedbackLoopEngine — accuracyDrift", () => {
  it("returns insufficient_data verdict below MIN_DRIFT_SAMPLES (30)", () => {
    for (let i = 0; i < MIN_DRIFT_SAMPLES - 1; i++) {
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: `d-${i}`,
        task: "strategy_recommend",
        wasCorrect: true,
        recordedAt: 1_000 + i,
      });
    }
    const r = CAMFeedbackLoopEngine.accuracyDrift({ task: "strategy_recommend" });
    expect(r.verdict).toBe("insufficient_data");
    expect(r.sampleCount).toBe(MIN_DRIFT_SAMPLES - 1);
    expect(r.accuracySeries.length).toBe(0);
  });

  it("detects degrading trend (correct first, then wrong) with Z below -2.576", () => {
    for (let i = 0; i < POST_FLIP_SAMPLES; i++) {
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: `c-${i}`,
        task: "operation_classify",
        wasCorrect: true,
        recordedAt: 1_000 + i,
      });
    }
    for (let i = 0; i < POST_FLIP_SAMPLES; i++) {
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: `w-${i}`,
        task: "operation_classify",
        wasCorrect: false,
        recordedAt: 2_000 + i,
      });
    }
    const r = CAMFeedbackLoopEngine.accuracyDrift({ task: "operation_classify" });
    expect(r.sampleCount).toBe(POST_FLIP_SAMPLES * 2);
    // Mann (1945) reference: for n=60 with 30 ties at 1.0 then 30 strictly
    // decreasing values, the sign-aware S = -(30*30 + C(30,2)) = -1335.
    expect(r.mannKendallS).toBe(-1335);
    expect(r.mannKendallZ).toBeLessThan(-2.576);
    expect(r.verdict).toBe("degrading_01");
    expect(r.ordinarySlope).toBeLessThan(0);
  });

  it("detects improving trend (wrong first, then correct) with Z above 2.576", () => {
    for (let i = 0; i < POST_FLIP_SAMPLES; i++) {
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: `w-${i}`,
        task: "tool_select_advisor",
        wasCorrect: false,
        recordedAt: 1_000 + i,
      });
    }
    for (let i = 0; i < POST_FLIP_SAMPLES; i++) {
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: `c-${i}`,
        task: "tool_select_advisor",
        wasCorrect: true,
        recordedAt: 2_000 + i,
      });
    }
    const r = CAMFeedbackLoopEngine.accuracyDrift({ task: "tool_select_advisor" });
    expect(r.mannKendallS).toBe(1335);
    expect(r.mannKendallZ).toBeGreaterThan(2.576);
    expect(r.verdict).toBe("improving_01");
    expect(r.ordinarySlope).toBeGreaterThan(0);
  });

  it("returns no_trend when accuracy is constant 1.0", () => {
    for (let i = 0; i < NO_TREND_SAMPLES; i++) {
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: `k-${i}`,
        task: "strategy_recommend",
        wasCorrect: true,
        recordedAt: 1_000 + i,
      });
    }
    const r = CAMFeedbackLoopEngine.accuracyDrift({ task: "strategy_recommend" });
    expect(r.verdict).toBe("no_trend");
    expect(r.mannKendallS).toBe(0);
    expect(r.mannKendallZ).toBe(0);
  });

  it("respects custom windowSize when n >= window", () => {
    for (let i = 0; i < NO_TREND_SAMPLES; i++) {
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: `k-${i}`,
        task: "strategy_recommend",
        wasCorrect: i % 2 === 0,
        recordedAt: 1_000 + i,
      });
    }
    const customWindow = 10;
    const r = CAMFeedbackLoopEngine.accuracyDrift({
      task: "strategy_recommend",
      windowSize: customWindow,
    });
    expect(r.windowSize).toBe(customWindow);
    expect(r.accuracySeries.length).toBe(NO_TREND_SAMPLES - customWindow + 1);
    expect(r.accuracySeries.every((v) => v === 0.5)).toBe(true);
  });
});

describe("CAMFeedbackLoopEngine — correctionPatterns", () => {
  beforeEach(() => {
    for (let i = 0; i < STRATEGY_CORRECTION_COUNT; i++) {
      CAMFeedbackLoopEngine.recordCorrection({
        decisionId: `t-${i}`,
        task: "strategy_recommend",
        originalValue: "trochoidal",
        correctedValue: "adaptive",
        originalSource: "ollama",
        reason: "thin wall vibration",
        recordedAt: 1_000 + i,
      });
    }
    for (let i = 0; i < 2; i++) {
      CAMFeedbackLoopEngine.recordCorrection({
        decisionId: `cl-${i}`,
        task: "strategy_recommend",
        originalValue: "peck",
        correctedValue: "continuous",
        originalSource: "physics",
        reason: "chip evacuation poor",
        recordedAt: 2_000 + i,
      });
    }
  });

  it("groups by reason with descending counts and correct share", () => {
    const r = CAMFeedbackLoopEngine.correctionPatterns({
      task: "strategy_recommend",
    });
    const total = STRATEGY_CORRECTION_COUNT + 2;
    expect(r.totalCorrections).toBe(total);
    expect(r.byReason[0].count).toBe(STRATEGY_CORRECTION_COUNT);
    expect(r.byReason[0].group).toBe("thin wall vibration");
    expect(r.byReason[0].share).toBeCloseTo(STRATEGY_CORRECTION_COUNT / total, 5);
    expect(r.byReason[0].dimension).toBe("reason");
  });

  it("groups by source", () => {
    const r = CAMFeedbackLoopEngine.correctionPatterns({
      task: "strategy_recommend",
    });
    const ollama = r.bySource.find((p) => p.group === "ollama");
    const physics = r.bySource.find((p) => p.group === "physics");
    expect(ollama?.count).toBe(STRATEGY_CORRECTION_COUNT);
    expect(physics?.count).toBe(2);
  });

  it("groups by canonical (original→corrected) edge", () => {
    const r = CAMFeedbackLoopEngine.correctionPatterns({
      task: "strategy_recommend",
    });
    expect(r.byEdge[0].group).toBe("trochoidal→adaptive");
    expect(r.byEdge[0].count).toBe(STRATEGY_CORRECTION_COUNT);
    expect(r.byEdge[1].group).toBe("peck→continuous");
    expect(r.byEdge[1].count).toBe(2);
  });

  it("respects topN", () => {
    const r = CAMFeedbackLoopEngine.correctionPatterns({
      task: "strategy_recommend",
      topN: 1,
    });
    expect(r.byReason.length).toBe(1);
    expect(r.bySource.length).toBe(1);
    expect(r.byEdge.length).toBe(1);
  });

  it("returns zero counts when no corrections recorded for a task", () => {
    const r = CAMFeedbackLoopEngine.correctionPatterns({
      task: "parameter_extract",
    });
    expect(r.totalCorrections).toBe(0);
    expect(r.byReason.length).toBe(0);
    expect(r.bySource.length).toBe(0);
    expect(r.byEdge.length).toBe(0);
  });
});

describe("CAMFeedbackLoopEngine — loraTrainingExport", () => {
  beforeEach(() => {
    CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "c1",
      task: "strategy_recommend",
      originalValue: "trochoidal",
      correctedValue: "adaptive",
      prompt: "p1",
      recordedAt: 1_000,
    });
    CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "c2",
      task: "strategy_recommend",
      originalValue: "peck",
      correctedValue: "continuous",
      prompt: "p2",
      recordedAt: 2_000,
    });
    CAMFeedbackLoopEngine.recordOutcome({
      decisionId: "o1",
      task: "strategy_recommend",
      wasCorrect: true,
      recordedAt: 1_500,
    });
    CAMFeedbackLoopEngine.recordOutcome({
      decisionId: "o2",
      task: "strategy_recommend",
      wasCorrect: false,
      recordedAt: 1_700,
    });
  });

  it("emits corrections with weight=1.0 by default and excludes confirmations", () => {
    const pairs = CAMFeedbackLoopEngine.loraTrainingExport({
      task: "strategy_recommend",
    });
    expect(pairs.length).toBe(2);
    expect(pairs.every((p) => p.weight === 1.0)).toBe(true);
    expect(pairs.every((p) => p.source === "correction")).toBe(true);
  });

  it("includes confirmed outcomes with weight=0.5 when includeConfirmed=true; wrong outcomes excluded", () => {
    const pairs = CAMFeedbackLoopEngine.loraTrainingExport({
      task: "strategy_recommend",
      includeConfirmed: true,
    });
    // 2 corrections + 1 wasCorrect outcome (wasCorrect=false is excluded)
    expect(pairs.length).toBe(3);
    const conf = pairs.filter((p) => p.source === "confirmation");
    expect(conf.length).toBe(1);
    expect(conf[0].weight).toBe(0.5);
    expect(conf[0].recordId.startsWith("out-")).toBe(true);
  });

  it("returns pairs sorted ascending by recordedAt", () => {
    const pairs = CAMFeedbackLoopEngine.loraTrainingExport({
      task: "strategy_recommend",
      includeConfirmed: true,
    });
    expect(pairs[0].recordedAt).toBe(1_000);
    expect(pairs[1].recordedAt).toBe(1_500);
    expect(pairs[2].recordedAt).toBe(2_000);
  });

  it("respects limit", () => {
    const pairs = CAMFeedbackLoopEngine.loraTrainingExport({
      task: "strategy_recommend",
      limit: 1,
    });
    expect(pairs.length).toBe(1);
    expect(pairs[0].recordedAt).toBe(1_000);
  });
});

describe("CAMFeedbackLoopEngine — feedbackStats", () => {
  it("computes overrideRate and topCorrectedSources sorted desc", () => {
    for (let i = 0; i < STATS_CORRECTION_COUNT; i++) {
      CAMFeedbackLoopEngine.recordCorrection({
        decisionId: `c-${i}`,
        task: "strategy_recommend",
        originalValue: "a",
        correctedValue: "b",
        originalSource: i < OLLAMA_CORRECTION_COUNT ? "ollama" : "physics",
        recordedAt: 1_000 + i,
      });
    }
    for (let i = 0; i < STATS_OUTCOME_COUNT; i++) {
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: `o-${i}`,
        task: "strategy_recommend",
        wasCorrect: true,
        recordedAt: 2_000 + i,
      });
    }
    const stats = CAMFeedbackLoopEngine.feedbackStats();
    expect(stats.totalCorrections).toBe(STATS_CORRECTION_COUNT);
    expect(stats.totalOutcomes).toBe(STATS_OUTCOME_COUNT);
    expect(stats.overrideRate).toBeCloseTo(
      STATS_CORRECTION_COUNT / (STATS_CORRECTION_COUNT + STATS_OUTCOME_COUNT),
      5
    );
    expect(stats.topCorrectedSources[0]).toEqual({
      source: "ollama",
      count: OLLAMA_CORRECTION_COUNT,
      share: OLLAMA_CORRECTION_COUNT / TOP_SOURCE_SHARE_DENOM,
    });
    expect(stats.topCorrectedSources[1]).toEqual({
      source: "physics",
      count: STATS_CORRECTION_COUNT - OLLAMA_CORRECTION_COUNT,
      share: (STATS_CORRECTION_COUNT - OLLAMA_CORRECTION_COUNT) / TOP_SOURCE_SHARE_DENOM,
    });
    expect(stats.earliestRecord).toBe(1_000);
    expect(stats.latestRecord).toBe(2_000 + STATS_OUTCOME_COUNT - 1);
  });

  it("omits earliest/latest record keys when no records exist", () => {
    const stats = CAMFeedbackLoopEngine.feedbackStats();
    expect(stats.totalCorrections).toBe(0);
    expect(stats.totalOutcomes).toBe(0);
    expect(stats.overrideRate).toBe(0);
    // Engine omits the keys entirely (conditional spread) when empty.
    expect("earliestRecord" in stats).toBe(false);
    expect("latestRecord" in stats).toBe(false);
  });
});

describe("CAMFeedbackLoopEngine — buffer cap (resource exhaustion)", () => {
  it("FIFO-evicts oldest records when bufferCap is exceeded", () => {
    CAMFeedbackLoopEngine.setBufferCap(FIFO_CAP);
    for (let i = 0; i < FIFO_OVERFLOW_RECORDS; i++) {
      CAMFeedbackLoopEngine.recordCorrection({
        decisionId: `f-${i}`,
        task: "strategy_recommend",
        originalValue: "a",
        correctedValue: "b",
        recordedAt: 1_000 + i,
      });
    }
    const remaining = CAMFeedbackLoopEngine.getCorrections({});
    expect(remaining.length).toBe(FIFO_CAP);
    expect(remaining.map((r) => r.decisionId)).toEqual([
      `f-${FIFO_OVERFLOW_RECORDS - FIFO_CAP}`,
      `f-${FIFO_OVERFLOW_RECORDS - FIFO_CAP + 1}`,
      `f-${FIFO_OVERFLOW_RECORDS - 1}`,
    ]);
  });

  it("setBufferCap throws on non-positive integer (boundary)", () => {
    expect(() => CAMFeedbackLoopEngine.setBufferCap(0)).toThrow(/positive integer/);
    expect(() => CAMFeedbackLoopEngine.setBufferCap(-5)).toThrow(/positive integer/);
    expect(() => CAMFeedbackLoopEngine.setBufferCap(Number.NaN)).toThrow(
      /positive integer/
    );
  });
});

describe("mannKendall pure helper (Mann 1945 reference values)", () => {
  it("returns S=C(n,2) for monotonically increasing series", () => {
    const series = [1, 2, 3, 4, 5];
    const { S, Z } = mannKendall(series);
    expect(S).toBe(10);
    // var = n(n-1)(2n+5)/18 = 5*4*15/18; Z = (S-1)/sqrt(var) = 9 / sqrt(16.6666...)
    expect(Z).toBeCloseTo(9 / Math.sqrt((5 * 4 * 15) / 18), 5);
  });

  it("returns S=-C(n,2) for monotonically decreasing series", () => {
    const { S, Z } = mannKendall([5, 4, 3, 2, 1]);
    expect(S).toBe(-10);
    expect(Z).toBeCloseTo(-9 / Math.sqrt((5 * 4 * 15) / 18), 5);
  });

  it("returns S=0 for an all-equal series (every pair tied)", () => {
    expect(mannKendall([1, 1, 1, 1, 1])).toEqual({ S: 0, Z: 0 });
  });

  it("returns {S:0, Z:0} for length<2", () => {
    expect(mannKendall([])).toEqual({ S: 0, Z: 0 });
    expect(mannKendall([5])).toEqual({ S: 0, Z: 0 });
  });

  it("Z magnitude grows with sample size for the same monotone effect", () => {
    const small = mannKendall([1, 2, 3, 4, 5]);
    const big = mannKendall(Array.from({ length: NO_TREND_SAMPLES }, (_, i) => i));
    expect(Math.abs(big.Z)).toBeGreaterThan(Math.abs(small.Z));
  });
});

describe("ordinarySlope pure helper (OLS reference values)", () => {
  it("recovers a slope of 1 for the identity series", () => {
    expect(ordinarySlope([0, 1, 2, 3, 4, 5])).toBeCloseTo(1, 10);
  });

  it("recovers a slope of -2 for a doubly-decreasing series", () => {
    expect(ordinarySlope([10, 8, 6, 4, 2, 0])).toBeCloseTo(-2, 10);
  });

  it("returns 0 for n<2", () => {
    expect(ordinarySlope([])).toBe(0);
    expect(ordinarySlope([7])).toBe(0);
  });
});

describe("CAMFeedbackLoopEngine — round-trip via camDispatcher", () => {
  // Same fake-server harness pattern used by sibling cam-exhaust dispatcher tests
  // (e.g. camDispatcher.cam74-78.test.ts). registerCamDispatcher() installs a
  // single MCP tool handler; we capture it and invoke it directly so the test
  // exercises the real switch-case routing without needing a live MCP server.
  type DispatcherHandler = (input: {
    action: string;
    params?: Record<string, unknown>;
  }) => Promise<unknown>;
  let capturedHandler: DispatcherHandler | null = null;
  const fakeServer = {
    tool: (
      _name: string,
      _desc: string,
      _schema: unknown,
      handler: DispatcherHandler
    ) => {
      capturedHandler = handler;
    },
  };

  let camDispatcher: DispatcherHandler;
  let ACTIONS: readonly string[];

  beforeEach(async () => {
    if (!capturedHandler) {
      const mod = await import("../tools/dispatchers/camDispatcher.js");
      ACTIONS = mod.ACTIONS;
      mod.registerCamDispatcher(fakeServer);
      if (!capturedHandler) {
        throw new Error("camDispatcher did not register a handler");
      }
    }
    camDispatcher = capturedHandler!;
    CAMFeedbackLoopEngine.clearAll();
  });

  const callCam = async (
    action: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    const raw = await camDispatcher({ action, params });
    const r = raw as { content?: Array<{ text: string }> };
    if (r.content?.[0]?.text) return JSON.parse(r.content[0].text);
    return raw as Record<string, unknown>;
  };

  it("registers all 9 cam_feedback_* actions in the ACTIONS enum", () => {
    expect(ACTIONS).toContain("cam_feedback_record_correction");
    expect(ACTIONS).toContain("cam_feedback_record_outcome");
    expect(ACTIONS).toContain("cam_feedback_get_corrections");
    expect(ACTIONS).toContain("cam_feedback_accuracy_drift");
    expect(ACTIONS).toContain("cam_feedback_correction_patterns");
    expect(ACTIONS).toContain("cam_feedback_lora_training_export");
    expect(ACTIONS).toContain("cam_feedback_stats");
    expect(ACTIONS).toContain("cam_feedback_set_buffer_cap");
    expect(ACTIONS).toContain("cam_feedback_clear_all");
  });

  it("records correction, fetches stats, emits training pairs, clears all end-to-end", async () => {
    const recRes = (await callCam("cam_feedback_record_correction", {
      input: {
        decisionId: "rt-1",
        task: "strategy_recommend",
        originalValue: "trochoidal",
        correctedValue: "adaptive",
        originalSource: "ollama",
        reason: "thin wall vibration",
        recordedAt: FIXED_TS_BASE,
      },
    })) as { success: boolean; record: { recordId: string; decisionId: string } };
    expect(recRes.success).toBe(true);
    expect(recRes.record.decisionId).toBe("rt-1");
    expect(recRes.record.recordId.startsWith("corr-")).toBe(true);

    const outRes = (await callCam("cam_feedback_record_outcome", {
      input: {
        decisionId: "rt-2",
        task: "strategy_recommend",
        wasCorrect: true,
        predictedConfidence: 0.9,
        recordedAt: FIXED_TS_BASE + 1_000,
      },
    })) as { success: boolean; record: { recordId: string } };
    expect(outRes.success).toBe(true);
    expect(outRes.record.recordId.startsWith("out-")).toBe(true);

    const statsRes = (await callCam("cam_feedback_stats", {})) as {
      success: boolean;
      stats: { totalCorrections: number; totalOutcomes: number; overrideRate: number };
    };
    expect(statsRes.stats.totalCorrections).toBe(1);
    expect(statsRes.stats.totalOutcomes).toBe(1);
    expect(statsRes.stats.overrideRate).toBeCloseTo(0.5, 5);

    const loraRes = (await callCam("cam_feedback_lora_training_export", {
      opts: { task: "strategy_recommend", includeConfirmed: true },
    })) as { success: boolean; pairs: Array<{ source: string; weight: number }> };
    expect(loraRes.pairs.length).toBe(2);
    const correction = loraRes.pairs.find((p) => p.source === "correction");
    const confirmation = loraRes.pairs.find((p) => p.source === "confirmation");
    expect(correction?.weight).toBe(1.0);
    expect(confirmation?.weight).toBe(0.5);

    const clearRes = (await callCam("cam_feedback_clear_all", {})) as {
      success: boolean;
    };
    expect(clearRes.success).toBe(true);

    const afterClear = (await callCam("cam_feedback_stats", {})) as {
      success: boolean;
      stats: { totalCorrections: number; totalOutcomes: number };
    };
    expect(afterClear.stats.totalCorrections).toBe(0);
    expect(afterClear.stats.totalOutcomes).toBe(0);
  });

  it("set_buffer_cap and get_corrections also round-trip through dispatcher", async () => {
    const capRes = (await callCam("cam_feedback_set_buffer_cap", { cap: 3 })) as {
      success: boolean;
      cap: number;
    };
    expect(capRes.success).toBe(true);
    expect(capRes.cap).toBe(3);

    for (let i = 0; i < 5; i++) {
      await callCam("cam_feedback_record_correction", {
        input: {
          decisionId: `rt-${i}`,
          task: "parameter_extract",
          originalValue: 1000,
          correctedValue: 800,
          recordedAt: FIXED_TS_BASE + i,
        },
      });
    }

    const getRes = (await callCam("cam_feedback_get_corrections", {
      filter: { task: "parameter_extract" },
    })) as { success: boolean; corrections: Array<{ decisionId: string }> };
    // FIFO cap of 3 → only the last 3 (rt-2, rt-3, rt-4) survive
    expect(getRes.corrections.length).toBe(3);
    expect(getRes.corrections.map((c) => c.decisionId)).toEqual([
      "rt-2",
      "rt-3",
      "rt-4",
    ]);
  });
});
