/**
 * GraphImprovementFanoutEngine tests -- U-ALPHA-HERMES-GRAPH-IMPROVE.
 *
 * Pure planning core: queue -> subtasks -> opus-fast-max fan-out plan. Reference
 * values tie to the opus cost table (opus-large 150k) so a budget change fails loudly.
 */
import { describe, it, expect } from "vitest";
import {
  GraphImprovementFanoutEngine,
  DOMAIN_SLOT_MAP,
  type WiringQueueEntry,
} from "../engines/GraphImprovementFanoutEngine.js";

const QUEUE: WiringQueueEntry[] = [
  { domain: "MiscDomains", id: "eng.misc", unwired: 69, coverage_pct: 96, leverageScore: 138, needsDispatcherInference: true },
  { domain: "Speed", id: "eng.speed", unwired: 5, coverage_pct: 90, leverageScore: 5 },
  { domain: "Mill", id: "eng.mill", unwired: 2, coverage_pct: 99, leverageScore: 2 },
  { domain: "Empty", id: "eng.empty", unwired: 0, leverageScore: 99 }, // filtered (0 unwired)
];

describe("sizeHintForUnwired", () => {
  it("maps counts to size bands", () => {
    expect(GraphImprovementFanoutEngine.sizeHintForUnwired(0)).toBe("short");
    expect(GraphImprovementFanoutEngine.sizeHintForUnwired(3)).toBe("short");
    expect(GraphImprovementFanoutEngine.sizeHintForUnwired(5)).toBe("medium");
    expect(GraphImprovementFanoutEngine.sizeHintForUnwired(20)).toBe("medium");
    expect(GraphImprovementFanoutEngine.sizeHintForUnwired(21)).toBe("large");
    expect(GraphImprovementFanoutEngine.sizeHintForUnwired(NaN)).toBe("short");
  });
});

describe("normalizeDomain", () => {
  it("slugifies + handles junk", () => {
    expect(GraphImprovementFanoutEngine.normalizeDomain("MiscDomains")).toBe("miscdomains");
    expect(GraphImprovementFanoutEngine.normalizeDomain("Wire EDM")).toBe("wire-edm");
    expect(GraphImprovementFanoutEngine.normalizeDomain(null)).toBe("unknown");
    expect(GraphImprovementFanoutEngine.normalizeDomain("")).toBe("unknown");
  });
});

describe("queueToSubtasks", () => {
  it("ranks by leverage desc, drops zero-unwired, caps", () => {
    const subs = GraphImprovementFanoutEngine.queueToSubtasks(QUEUE, 2);
    expect(subs).toHaveLength(2);
    expect(subs[0].subtask_id).toBe("wire-miscdomains"); // leverage 138 first
    expect(subs[1].subtask_id).toBe("wire-speed"); // leverage 5 next
    expect(subs.every((s) => s.depends_on.length === 0)).toBe(true); // all parallelizable
  });

  it("derives size_hint from unwired count", () => {
    const subs = GraphImprovementFanoutEngine.queueToSubtasks(QUEUE, 10);
    expect(subs.find((s) => s.subtask_id === "wire-miscdomains")!.size_hint).toBe("large"); // 69
    expect(subs.find((s) => s.subtask_id === "wire-speed")!.size_hint).toBe("medium"); // 5
    expect(subs.find((s) => s.subtask_id === "wire-mill")!.size_hint).toBe("short"); // 2
  });

  it("empty / non-array queue -> no subtasks (adversarial)", () => {
    expect(GraphImprovementFanoutEngine.queueToSubtasks([], 12)).toHaveLength(0);
    expect(GraphImprovementFanoutEngine.queueToSubtasks(undefined as never, 12)).toHaveLength(0);
  });
});

describe("buildCandidates", () => {
  it("maps galaxy domains to owner slots + fills fallbacks for non-galaxy buckets", () => {
    const subs = GraphImprovementFanoutEngine.queueToSubtasks(QUEUE, 10);
    const cands = GraphImprovementFanoutEngine.buildCandidates(subs);
    const bySlot = new Map(cands.map((c) => [c.slot, c]));
    expect(bySlot.get("oscar")?.primary_domain).toBe("speed"); // galaxy owner
    expect(bySlot.get("foxtrot")?.primary_domain).toBe("mill");
    const miscCand = cands.find((c) => c.primary_domain === "miscdomains");
    expect(miscCand).toBeTruthy();
    expect(miscCand!.score).toBeGreaterThan(0);
    expect(new Set(cands.map((c) => c.slot)).size).toBe(cands.length); // each slot once
  });

  it("DOMAIN_SLOT_MAP routes known galaxy buckets", () => {
    expect(DOMAIN_SLOT_MAP.speed).toBe("oscar");
    expect(DOMAIN_SLOT_MAP.mill).toBe("foxtrot");
    expect(DOMAIN_SLOT_MAP.quoting).toBe("charlie");
  });
});

describe("plan -- full composition on live-shaped data", () => {
  it("fat budget fans out all subtasks at opus-fast-max", () => {
    const plan = GraphImprovementFanoutEngine.plan({ queue: QUEUE, budgetTokens: 5_000_000, desiredAgents: 12, maxSubtasks: 12 });
    expect(plan.ok).toBe(true);
    expect(plan.agentBatch.length).toBeGreaterThanOrEqual(3); // 3 non-zero domains
    expect(plan.agentBatch.every((a) => a.spec.model === "opus" && a.spec.effort === "max" && a.spec.fastMode)).toBe(true);
    expect(plan.fanout.unrouted).toHaveLength(0);
  });

  it("tight budget caps parallelism below desired (over) -- opus-large 150k each", () => {
    // budget 400k -> reserve 40k -> available 360k -> 2 opus-large fit.
    const plan = GraphImprovementFanoutEngine.plan({ queue: QUEUE, budgetTokens: 400_000, desiredAgents: 12, maxSubtasks: 12 });
    expect(plan.opus.recommended_parallel).toBe(2);
    expect(plan.agentBatch.length).toBe(2);
    expect(plan.opus.verdict.verdict).toBe("over");
  });

  it("budget refused -> ok:false + ZERO phantom spawns (R12 honesty)", () => {
    const plan = GraphImprovementFanoutEngine.plan({ queue: QUEUE, budgetTokens: 100_000, desiredAgents: 5, maxSubtasks: 12 });
    expect(plan.opus.recommended_parallel).toBe(0);
    expect(plan.ok).toBe(false);
    expect(plan.reason).toContain("refused");
    expect(plan.agentBatch).toHaveLength(0);
    expect(plan.fanout.reject_reason).toBe("budget-refused");
  });

  it("empty queue -> ok:true clean no-op, zero agents", () => {
    const plan = GraphImprovementFanoutEngine.plan({ queue: [], budgetTokens: 5_000_000, desiredAgents: 12 });
    expect(plan.ok).toBe(true);
    expect(plan.agentBatch).toHaveLength(0);
    expect(plan.reason).toContain("no graph gaps");
  });

  it("rejects desiredAgents > 20 (adversarial -- over the envelope cap)", () => {
    expect(() => GraphImprovementFanoutEngine.plan({ queue: QUEUE, budgetTokens: 5_000_000, desiredAgents: 50 } as never)).toThrow();
  });

  it("rejects a malformed queue entry (missing required fields)", () => {
    expect(() => GraphImprovementFanoutEngine.plan({ queue: [{ id: "x" } as never], budgetTokens: 1_000, desiredAgents: 1 })).toThrow();
  });

  it("renderBatch renders agent rows + the opus plan tag", () => {
    const plan = GraphImprovementFanoutEngine.plan({ queue: QUEUE, budgetTokens: 5_000_000, desiredAgents: 12 });
    const md = GraphImprovementFanoutEngine.renderBatch(plan);
    expect(md).toContain("[GRAPH-IMPROVE]");
    expect(md).toContain("[opus/max/fast]");
  });
});
