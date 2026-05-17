/**
 * dispatcher.autonomousGoalSynthesis.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-AGS (AutonomousGoalSynthesisEngine).
 *
 * 1 pure-compute action through real `prism_dev`:
 *   ags_propose → propose(gaps[], limit?) — ranks gaps by Ψ×urgency×feasibility
 *
 * No DEFER list — pure compute, no state mutation.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { autonomousGoalSynthesisEngine } from "../engines/AutonomousGoalSynthesisEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

// Three gaps with known scores: score = psiImpact × urgency × feasibility
// HIGH: 8 × 0.9 × 0.8 = 5.76
// MID:  5 × 0.7 × 0.6 = 2.10
// LOW:  3 × 0.5 × 0.4 = 0.60
const THREE_GAPS = [
  { id: "G-HIGH", kind: "orphan-surface" as const, title: "High-impact gap",
    psiImpact: 8, urgency: 0.9, feasibility: 0.8 },
  { id: "G-MID",  kind: "psi-deficit" as const, title: "Mid-impact gap",
    psiImpact: 5, urgency: 0.7, feasibility: 0.6 },
  { id: "G-LOW",  kind: "failing-test" as const, title: "Low-impact gap",
    psiImpact: 3, urgency: 0.5, feasibility: 0.4 },
];

describe("WIRE-UNWIRED-MS0/U-WIRE-AGS — Zod schemas", () => {
  it("ags_propose requires gaps[] (1-1000) + valid GapKind enum", () => {
    expect(ACTION_DEV_SCHEMAS["ags_propose"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ags_propose"].safeParse({ gaps: [] }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ags_propose"].safeParse({ gaps: THREE_GAPS }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ags_propose"].safeParse({
      gaps: [{ ...THREE_GAPS[0], kind: "INVALID" }],
    }).success).toBe(false);
  });

  it("ags_propose enforces psiImpact [0,10] + urgency/feasibility [0,1]", () => {
    expect(ACTION_DEV_SCHEMAS["ags_propose"].safeParse({
      gaps: [{ ...THREE_GAPS[0], psiImpact: 11 }],
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ags_propose"].safeParse({
      gaps: [{ ...THREE_GAPS[0], urgency: 1.5 }],
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ags_propose"].safeParse({
      gaps: [{ ...THREE_GAPS[0], feasibility: -0.1 }],
    }).success).toBe(false);
  });

  it("ags_propose caps gaps at 1000 + limit at 1000 (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["ags_propose"].safeParse({
      gaps: new Array(1001).fill({ ...THREE_GAPS[0], id: "x" }),
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ags_propose"].safeParse({
      gaps: THREE_GAPS, limit: 1001,
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-AGS — prism_dev :: ags_propose", () => {
  it("returns goals sorted DESC by score (engine line 60-63)", async () => {
    const r = await invokeHandler(devHandler, "ags_propose", { gaps: THREE_GAPS, limit: 3 });
    const goals = (r as { goals: Array<{ id: string; score: number }> }).goals;
    expect(goals.length).toBe(3);
    // Known scores: G-HIGH=5.76 > G-MID=2.10 > G-LOW=0.60
    expect(goals[0]?.id).toBe("G-HIGH");
    expect(goals[1]?.id).toBe("G-MID");
    expect(goals[2]?.id).toBe("G-LOW");
    expect(goals[0]!.score).toBeCloseTo(5.76, 2);
    expect(goals[1]!.score).toBeCloseTo(2.10, 2);
    expect(goals[2]!.score).toBeCloseTo(0.60, 2);
  });

  it("score = psiImpact × urgency × feasibility algebraic invariant (engine line 50)", async () => {
    const r = await invokeHandler(devHandler, "ags_propose", { gaps: THREE_GAPS, limit: 3 });
    const goals = (r as { goals: Array<{ id: string; score: number; source: { psiImpact: number; urgency: number; feasibility: number } }> }).goals;
    for (const g of goals) {
      const expected = Math.round(g.source.psiImpact * g.source.urgency * g.source.feasibility * 10000) / 10000;
      expect(g.score).toBeCloseTo(expected, 4);
    }
  });

  it("limit=1 returns top-1 goal only", async () => {
    const r = await invokeHandler(devHandler, "ags_propose", { gaps: THREE_GAPS, limit: 1 });
    expect((r.goal_count as number | undefined) ?? 0).toBe(1);
    const goals = (r as { goals: Array<{ id: string }> }).goals;
    expect(goals[0]?.id).toBe("G-HIGH");
  });

  it("limit=0 returns ALL goals unlimited (engine line 64)", async () => {
    const r = await invokeHandler(devHandler, "ags_propose", { gaps: THREE_GAPS, limit: 0 });
    const goals = (r as { goals: unknown[] }).goals;
    expect(goals.length).toBe(3);
  });

  it("VARIABILITY — all 7 GapKind discriminators round-trip through dispatcher", async () => {
    const kinds = [
      "orphan-surface", "psi-deficit", "failing-test",
      "extraction-candidate", "user-desire", "peer-insight", "other",
    ];
    const gaps = kinds.map((kind, i) => ({
      id: `G-${i}`, kind, title: `Gap ${i}`,
      psiImpact: 5, urgency: 0.5, feasibility: 0.5,
    }));
    const r = await invokeHandler(devHandler, "ags_propose", { gaps, limit: 0 });
    const goals = (r as { goals: Array<{ kind: string }> }).goals;
    expect(goals.length).toBe(7);
    const returnedKinds = new Set(goals.map(g => g.kind));
    expect(returnedKinds.size).toBe(7);
  });

  it("equal-score tiebreak by id ASC (engine line 62)", async () => {
    const equalGaps = [
      { id: "B", kind: "other" as const, title: "B", psiImpact: 5, urgency: 0.5, feasibility: 0.5 },
      { id: "A", kind: "other" as const, title: "A", psiImpact: 5, urgency: 0.5, feasibility: 0.5 },
      { id: "C", kind: "other" as const, title: "C", psiImpact: 5, urgency: 0.5, feasibility: 0.5 },
    ];
    const r = await invokeHandler(devHandler, "ags_propose", { gaps: equalGaps, limit: 3 });
    const goals = (r as { goals: Array<{ id: string }> }).goals;
    // All scores equal → tiebreak by id.localeCompare ascending
    expect(goals[0]?.id).toBe("A");
    expect(goals[1]?.id).toBe("B");
    expect(goals[2]?.id).toBe("C");
  });

  it("duplicate gap ids throw (engine line 70) — returned via error envelope", async () => {
    const dupGaps = [
      { id: "DUP", kind: "other", title: "First", psiImpact: 5, urgency: 0.5, feasibility: 0.5 },
      { id: "DUP", kind: "other", title: "Second", psiImpact: 6, urgency: 0.5, feasibility: 0.5 },
    ];
    const r = await invokeHandler(devHandler, "ags_propose", { gaps: dupGaps });
    expect(typeof r.error).toBe("string");
    expect(r.error).toContain("duplicate gap id");
  });

  it("rationale string includes Ψ + urgency + feasibility + score (engine line 56)", async () => {
    const r = await invokeHandler(devHandler, "ags_propose", { gaps: [THREE_GAPS[0]], limit: 1 });
    const goals = (r as { goals: Array<{ rationale: string }> }).goals;
    const rat = goals[0]!.rationale;
    expect(rat).toContain("Ψ=8");
    expect(rat).toContain("urgency=0.9");
    expect(rat).toContain("feasibility=0.8");
    expect(rat).toContain("5.76");
  });

  it("ROUTING PROOF — wire goal score equals engine-direct propose() score", async () => {
    const r = await invokeHandler(devHandler, "ags_propose", { gaps: THREE_GAPS, limit: 3 });
    const direct = autonomousGoalSynthesisEngine.propose(THREE_GAPS, 3);
    const wireGoals = (r as { goals: Array<{ id: string; score: number }> }).goals;
    for (let i = 0; i < direct.length; i++) {
      expect(wireGoals[i]?.id).toBe(direct[i]!.id);
      expect(wireGoals[i]?.score).toBeCloseTo(direct[i]!.score, 4);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-AGS — error envelope", () => {
  it("ags_propose without gaps → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ags_propose", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ags_propose with empty gaps array → schema rejects (min: 1)", async () => {
    const r = await invokeHandler(devHandler, "ags_propose", { gaps: [] });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ags_propose with > 1000 gaps → schema rejects (DoS)", async () => {
    const r = await invokeHandler(devHandler, "ags_propose", {
      gaps: new Array(5000).fill({ ...THREE_GAPS[0], id: "x" }),
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
