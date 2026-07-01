/**
 * aiReasoningDispatcher.temporalCognitive.test.ts — temporal projection +
 * cognitive budget allocation, wired through prism_ai (U-WIRE09).
 *
 * Covers 5 actions across 2 engines:
 *   - TemporalReasoningEngine
 *       ai_temporal_record / ai_temporal_project / ai_temporal_forecast
 *   - CognitiveBudgetAllocatorEngine
 *       ai_cognitive_allocate / ai_cognitive_classify
 *
 * Reference values are computed by hand from the closed-form formulas
 * (linear regression slope/intercept, R² from SS_res/SS_tot, depth-tier
 * thresholds at score<3, <6, ≥6) so the tests anchor to the math, not
 * the implementation.
 *
 * TemporalReasoningEngine is a singleton; tests use unique U09_-prefixed
 * series names and clear() in beforeEach.
 *
 * @milestone WIRE-MS0/U-WIRE09
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";

import {
  executeAIReasoningAction,
  type AIReasoningAction,
} from "../tools/dispatchers/aiReasoningDispatcher.js";
import { temporalReasoningEngine } from "../engines/TemporalReasoningEngine.js";

async function invoke(
  action: AIReasoningAction,
  params: Record<string, unknown> = {},
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  return executeAIReasoningAction(action, params);
}

beforeAll(() => {
  temporalReasoningEngine.clear();
});

// ── TemporalReasoningEngine — 3 actions ─────────────────────────────────────

describe("aiReasoningDispatcher — ai_temporal_* (TemporalReasoningEngine)", () => {
  beforeEach(() => {
    temporalReasoningEngine.clear();
  });

  it("record + project recovers the slope of a synthetic linear series (slope=1/day)", async () => {
    // 5 daily snapshots: y = x + 10 (slope 1, intercept 10).
    // Sequential awaits required — record() is order-sensitive (snapshots are
    // chronologically inserted by `at`).
    const dates = [
      "2026-04-20T00:00:00.000Z",
      "2026-04-21T00:00:00.000Z",
      "2026-04-22T00:00:00.000Z",
      "2026-04-23T00:00:00.000Z",
      "2026-04-24T00:00:00.000Z",
    ];
    await Promise.all(
      dates.map((at, i) =>
        invoke("temporal_record", {
          series: "U09_linear_synth",
          value: 10 + i,
          at,
        }),
      ),
    );
    const out = await invoke("temporal_project", {
      series: "U09_linear_synth",
      windowSize: 5,
    });
    expect(out.success).toBe(true);
    const proj = (out.data as { projection: { slopePerDay: number; intercept: number; r2: number; current: number; windowSize: number } }).projection;
    // Perfect linear fit → slope=1, R²=1, current=14, intercept=10
    expect(proj.slopePerDay).toBeCloseTo(1.0, 4);
    expect(proj.intercept).toBeCloseTo(10.0, 4);
    expect(proj.r2).toBeCloseTo(1.0, 4);
    expect(proj.current).toBe(14);
    expect(proj.windowSize).toBe(5);
  });

  it("project handles a flat series (slope=0, R²=1)", async () => {
    const dates = [
      "2026-04-20T00:00:00.000Z",
      "2026-04-21T00:00:00.000Z",
      "2026-04-22T00:00:00.000Z",
    ];
    await Promise.all(
      dates.map((at) => invoke("temporal_record", { series: "U09_flat", value: 7, at })),
    );
    const out = await invoke("temporal_project", { series: "U09_flat" });
    const proj = (out.data as { projection: { slopePerDay: number; r2: number; current: number } }).projection;
    expect(proj.slopePerDay).toBeCloseTo(0, 4);
    expect(proj.r2).toBeCloseTo(1, 4);
    expect(proj.current).toBe(7);
  });

  it("project on insufficient data (n<2) returns null payload", async () => {
    await invoke("temporal_record", {
      series: "U09_lonely",
      value: 1,
      at: "2026-04-20T00:00:00.000Z",
    });
    const out = await invoke("temporal_project", { series: "U09_lonely" });
    expect(out.success).toBe(true);
    const data = out.data as { series: string; projection: unknown };
    expect(data.series).toBe("U09_lonely");
    expect(data.projection ?? null).toBeNull();
  });

  it("forecast: ETA to reach a target at the current slope (linear extrapolation)", async () => {
    // Series rising 2 units/day from 10. Target 20 → 3 days from current.
    const dates = [
      "2026-04-20T00:00:00.000Z",
      "2026-04-21T00:00:00.000Z",
      "2026-04-22T00:00:00.000Z",
    ];
    await Promise.all(
      dates.map((at, i) =>
        invoke("temporal_record", {
          series: "U09_eta",
          value: 10 + 2 * i,
          at,
        }),
      ),
    );
    const out = await invoke("temporal_forecast", {
      series: "U09_eta",
      target: 20,
      windowSize: 3,
      nowIso: "2026-04-22T00:00:00.000Z",
    });
    expect(out.success).toBe(true);
    const fc = out.data as {
      hit: boolean; etaDays?: number; etaIso?: string; reason: string;
    };
    expect(fc.hit).toBe(false);
    // current=14, target=20, slope=2/day → 6/2 = 3 days
    expect(fc.etaDays).toBeCloseTo(3, 1);
    expect(fc.etaIso).toBe("2026-04-25T00:00:00.000Z");
    expect(fc.reason).toMatch(/linear projection/i);
  });

  it("forecast: target already reached → hit=true, etaDays=0", async () => {
    await Promise.all(
      [
        "2026-04-20T00:00:00.000Z",
        "2026-04-21T00:00:00.000Z",
      ].map((at, i) =>
        invoke("temporal_record", { series: "U09_at_tgt", value: 5 + i, at }),
      ),
    );
    // Current is 6, target is 6 → hit immediately
    const out = await invoke("temporal_forecast", {
      series: "U09_at_tgt",
      target: 6,
      windowSize: 2,
      nowIso: "2026-04-21T00:00:00.000Z",
    });
    const fc = out.data as { hit: boolean; etaDays?: number; reason: string };
    expect(fc.hit).toBe(true);
    expect(fc.etaDays).toBe(0);
    expect(fc.reason).toMatch(/already at target/i);
  });

  it("forecast: slope points away from target (decreasing series, target above current)", async () => {
    // Series falling 1/day from 10. Target 20 → unreachable.
    await Promise.all(
      [
        "2026-04-20T00:00:00.000Z",
        "2026-04-21T00:00:00.000Z",
        "2026-04-22T00:00:00.000Z",
      ].map((at, i) =>
        invoke("temporal_record", {
          series: "U09_unreach", value: 10 - i, at,
        }),
      ),
    );
    const out = await invoke("temporal_forecast", {
      series: "U09_unreach",
      target: 20,
      windowSize: 3,
      nowIso: "2026-04-22T00:00:00.000Z",
    });
    const fc = out.data as {
      hit: boolean; reason: string; etaDays?: number; etaIso?: string;
    };
    expect(fc.hit).toBe(false);
    expect(fc.reason).toMatch(/away from target|slope points away/i);
    // When unreachable, the engine returns the result without etaDays/etaIso —
    // assert the absence positively via Object.hasOwn rather than .toBeUndefined.
    expect(Object.prototype.hasOwnProperty.call(fc, "etaDays")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(fc, "etaIso")).toBe(false);
  });

  it("Zod rejects empty series name (boundary)", async () => {
    const out = await invoke("temporal_record", {
      series: "",
      value: 1,
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/series/i);
  });

  it("Zod rejects non-finite value (Infinity adversarial)", async () => {
    const out = await invoke("temporal_record", {
      series: "U09_inf",
      value: Number.POSITIVE_INFINITY,
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/value/i);
  });

  it("Zod rejects malformed `at` timestamp (not ISO-8601 prefix)", async () => {
    const out = await invoke("temporal_record", {
      series: "U09_bad_iso",
      value: 1,
      at: "not-a-real-date",
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/at/i);
  });

  it("Zod rejects windowSize < 2 (boundary on project)", async () => {
    const out = await invoke("temporal_project", {
      series: "U09_w1",
      windowSize: 1,
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/windowSize/i);
  });
});

// ── CognitiveBudgetAllocatorEngine — 2 actions ─────────────────────────────

describe("aiReasoningDispatcher — ai_cognitive_* (CognitiveBudgetAllocatorEngine)", () => {
  it("variability: shallow tier for read+low-risk (base 1, score < 3)", async () => {
    const out = await invoke("cognitive_budget_allocate", {
      kind: "read",
      riskLevel: "low",
    });
    expect(out.success).toBe(true);
    const alloc = out.data as {
      depth: string; maxTokens: number; allowSimulation: boolean;
      allowMultiAgent: boolean; score: number; rationale: string[];
    };
    // base(read)=1, no riskBoost on low → score=1, classify<3 = shallow
    expect(alloc.depth).toBe("shallow");
    expect(alloc.score).toBe(1);
    expect(alloc.maxTokens).toBe(500);
    expect(alloc.allowSimulation).toBe(false);
    expect(alloc.allowMultiAgent).toBe(false);
  });

  it("variability: medium tier for edit+medium-risk (base 2 + riskBoost 1 = 3)", async () => {
    const out = await invoke("cognitive_budget_allocate", {
      kind: "edit",
      riskLevel: "medium",
    });
    const alloc = out.data as { depth: string; score: number; maxTokens: number };
    // base(edit)=2 + risk(medium)=1 → score=3, classify<6 = medium
    expect(alloc.score).toBe(3);
    expect(alloc.depth).toBe("medium");
    expect(alloc.maxTokens).toBe(2000);
  });

  it("variability: deep tier for refactor+critical+critical-file (4+4+3=11)", async () => {
    const out = await invoke("cognitive_budget_allocate", {
      kind: "refactor",
      riskLevel: "critical",
      touchesCriticalFile: true,
    });
    const alloc = out.data as {
      depth: string; score: number; maxTokens: number;
      allowSimulation: boolean; allowMultiAgent: boolean;
    };
    // base(refactor)=4 + risk(critical)=4 + critical-file=3 → score=11
    expect(alloc.score).toBe(11);
    expect(alloc.depth).toBe("deep");
    expect(alloc.maxTokens).toBe(8000);
    expect(alloc.allowSimulation).toBe(true);
    expect(alloc.allowMultiAgent).toBe(true);
  });

  it("user-urgent applies a -1 penalty (refactor 4 - 1 = 3 → medium)", async () => {
    const out = await invoke("cognitive_budget_allocate", {
      kind: "refactor",
      userUrgent: true,
    });
    const alloc = out.data as { depth: string; score: number; rationale: string[] };
    // base(refactor)=4 + urgent=-1 → 3 → medium
    expect(alloc.score).toBe(3);
    expect(alloc.depth).toBe("medium");
    expect(alloc.rationale.some((r: string) => r.includes("user-urgent"))).toBe(true);
  });

  it("expectedDependents boost is capped at 3 (50 dependents × 0.1 = 5 → capped)", async () => {
    const out = await invoke("cognitive_budget_allocate", {
      kind: "edit",
      expectedDependents: 50,
    });
    const alloc = out.data as { score: number; depth: string };
    // base(edit)=2 + min(3, 50*0.1=5)=3 → score=5 → medium
    expect(alloc.score).toBe(5);
    expect(alloc.depth).toBe("medium");
  });

  it("classify maps thresholds correctly: 0→shallow, 3→medium, 6→deep", async () => {
    const shallow = await invoke("cognitive_classify", { score: 0 });
    expect((shallow.data as { depth: string; score: number }).depth).toBe("shallow");
    expect((shallow.data as { score: number }).score).toBe(0);

    const med = await invoke("cognitive_classify", { score: 3 });
    expect((med.data as { depth: string }).depth).toBe("medium");

    const deep = await invoke("cognitive_classify", { score: 6 });
    expect((deep.data as { depth: string }).depth).toBe("deep");

    // Boundaries: 2.99 still shallow, 5.99 still medium
    const subShallow = await invoke("cognitive_classify", { score: 2.99 });
    expect((subShallow.data as { depth: string }).depth).toBe("shallow");
    const subMed = await invoke("cognitive_classify", { score: 5.99 });
    expect((subMed.data as { depth: string }).depth).toBe("medium");
  });

  it("Zod rejects unknown kind enum (adversarial)", async () => {
    const out = await invoke("cognitive_budget_allocate", {
      kind: "telepathy",
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/kind/i);
  });

  it("Zod rejects negative expectedDependents (boundary)", async () => {
    const out = await invoke("cognitive_budget_allocate", {
      kind: "edit",
      expectedDependents: -3,
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/expectedDependents/i);
  });

  it("Zod rejects non-finite score on classify (NaN adversarial)", async () => {
    const out = await invoke("cognitive_classify", {
      score: Number.NaN,
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/score/i);
  });
});
