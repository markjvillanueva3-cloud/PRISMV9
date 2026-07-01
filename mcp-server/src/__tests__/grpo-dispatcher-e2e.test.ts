/**
 * Round-trip E2E: prism_ai:group_normalize_reward through the DISPATCHER
 * (ULTRACODE-SYNERGY-MS0 Order 3). Per CLAUDE.md §ENGINE WIRING, the acceptance
 * criterion is invocation THROUGH the dispatcher, not just the engine singleton.
 * Run: npx vitest run src/__tests__/grpo-dispatcher-e2e.test.ts
 */
import { describe, it, expect } from "vitest";
import {
  executeAIReasoningAction,
  aiReasoningDispatcherDef,
  ALL_AI_ACTIONS,
} from "../tools/dispatchers/aiReasoningDispatcher.js";

describe("prism_ai:group_normalize_reward — dispatcher round-trip", () => {
  it("action is registered in the z.enum tuple", () => {
    expect(ALL_AI_ACTIONS).toContain("group_normalize_reward");
    // and the dispatcher def's enum accepts it
    const parsed = aiReasoningDispatcherDef.inputSchema.safeParse({
      action: "group_normalize_reward",
      params: { rewards: [0, 1, 2] },
    });
    expect(parsed.success).toBe(true);
  });

  it("round-trips a real group through the dispatcher → z-scored advantages", async () => {
    const res = await executeAIReasoningAction("group_normalize_reward", {
      rewards: [0, 2],
    });
    expect(res.success).toBe(true);
    const data = res.data as {
      ok: boolean;
      mode: string;
      advantages: { index: number; reward: number; advantage: number }[];
      source: string;
    };
    expect(data.ok).toBe(true);
    expect(data.mode).toBe("zscore");
    expect(data.source).toBe("grpo-group-relative");
    // reference: {0,2} → mean 1, std 1 → advantages ≈ {-1, +1}
    expect(data.advantages[0].advantage).toBeCloseTo(-1, 6);
    expect(data.advantages[1].advantage).toBeCloseTo(1, 6);
  });

  it("round-trips a 16-sample group → mean≈0 advantage vector", async () => {
    const rewards = Array.from({ length: 16 }, (_, i) => i / 15);
    const res = await executeAIReasoningAction("group_normalize_reward", { rewards });
    expect(res.success).toBe(true);
    const data = res.data as { advantages: { advantage: number }[] };
    const adv = data.advantages.map((a) => a.advantage);
    const mean = adv.reduce((a, b) => a + b, 0) / adv.length;
    expect(Math.abs(mean)).toBeLessThan(1e-9);
  });

  it("dispatcher handles missing rewards param gracefully (empty group)", async () => {
    const res = await executeAIReasoningAction("group_normalize_reward", {});
    // engine returns ok:false with a warning for an empty group — dispatcher still success-wraps it
    expect(res.success).toBe(true);
    const data = res.data as { ok: boolean; warning?: string };
    expect(data.ok).toBe(false);
    expect(data.warning).toMatch(/empty/);
  });

  it("dispatcher round-trips a NaN-poisoned group → ok:false zeroed (no crash)", async () => {
    const res = await executeAIReasoningAction("group_normalize_reward", {
      rewards: [1, NaN, 3],
    });
    expect(res.success).toBe(true);
    const data = res.data as { ok: boolean; advantages: { advantage: number }[]; warning?: string };
    expect(data.ok).toBe(false);
    expect(data.advantages.every((a) => Number.isFinite(a.advantage))).toBe(true);
    expect(data.warning).toMatch(/non-finite/);
  });
});

describe("prism_ai:rank_trajectories — dispatcher round-trip (RULER, Order 4)", () => {
  it("action is registered in the z.enum tuple + def accepts it", () => {
    expect(ALL_AI_ACTIONS).toContain("rank_trajectories");
    const parsed = aiReasoningDispatcherDef.inputSchema.safeParse({
      action: "rank_trajectories",
      params: { trajectories: [{ content: "a" }, { content: "b" }] },
    });
    expect(parsed.success).toBe(true);
  });

  it("degenerate group (empty) round-trips through the dispatcher without live models", async () => {
    // empty short-circuits before ask() — proves the wiring path end-to-end, no network.
    const res = await executeAIReasoningAction("rank_trajectories", { trajectories: [] });
    expect(res.success).toBe(true);
    const data = res.data as { ok: boolean; mode: string; warning?: string; source: string };
    expect(data.source).toBe("ruler-trajectory-rank");
    expect(data.ok).toBe(false);
    expect(data.mode).toBe("degenerate");
    expect(data.warning).toMatch(/empty/);
  });

  it("single-trajectory round-trips → reward 1, advantage 0 (no live models)", async () => {
    const res = await executeAIReasoningAction("rank_trajectories", {
      trajectories: [{ id: "solo", content: "x" }],
    });
    expect(res.success).toBe(true);
    const data = res.data as { ranked: { id: string; reward: number; advantage: number }[] };
    expect(data.ranked).toEqual([{ id: "solo", index: 0, reward: 1, advantage: 0, rank: 1 }]);
  });

  it("missing trajectories param → degenerate (coerced to []), no crash", async () => {
    const res = await executeAIReasoningAction("rank_trajectories", {});
    expect(res.success).toBe(true);
    const data = res.data as { ok: boolean; mode: string };
    expect(data.ok).toBe(false);
    expect(data.mode).toBe("degenerate");
  });
});
