/**
 * MultiModelConsensusEngine.rankTrajectories — RULER trajectory ranking (Order 4).
 * The judge panel (ask()) is spied to return controlled rankings, so we test the
 * reward-derivation + GRPO-advantage + parse logic deterministically without live models.
 * Run: npx vitest run src/__tests__/MultiModelConsensusRankTrajectories.test.ts
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  MultiModelConsensusEngine,
  type ConsensusResult,
  type RankTrajectoriesResult,
} from "../engines/MultiModelConsensusEngine.js";

// build a fake ConsensusResult whose consensus.answer carries a RANKING: line
const judgeAnswer = (answer: string): ConsensusResult => ({
  ok: true,
  mode: "compare",
  responses: [{ model: "stub", vendor: "ollama", ok: true, answer, latencyMs: 1, tokens: null, error: null }],
  successCount: 1,
  agreementScore: 1,
  consensus: { answer, voters: ["stub"], confidence: 1 },
  recommendation: "accept",
  totalLatencyMs: 1,
  factCheck: {},
});

const engine = new MultiModelConsensusEngine();

afterEach(() => vi.restoreAllMocks());

const meanOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe("rankTrajectories — RULER reward + GRPO advantage", () => {
  it("judge-ranked: best id → reward 1, worst → 0; advantages mean≈0", async () => {
    vi.spyOn(engine, "ask").mockResolvedValue(judgeAnswer("RANKING: b, c, a"));
    const r: RankTrajectoriesResult = await engine.rankTrajectories({
      trajectories: [
        { id: "a", content: "weak attempt" },
        { id: "b", content: "best attempt" },
        { id: "c", content: "ok attempt" },
      ],
      systemPrompt: "Solve the task correctly and completely.",
    });
    expect(r.ok).toBe(true);
    expect(r.mode).toBe("judge-ranked");
    // b ranked #1 → reward 1; a ranked last → reward 0; c middle → 0.5
    const byId = Object.fromEntries(r.ranked.map((x) => [x.id, x]));
    expect(byId.b.reward).toBeCloseTo(1, 6);
    expect(byId.a.reward).toBeCloseTo(0, 6);
    expect(byId.c.reward).toBeCloseTo(0.5, 6);
    // ranks
    expect(byId.b.rank).toBe(1);
    expect(byId.c.rank).toBe(2);
    expect(byId.a.rank).toBe(3);
    // GRPO advantages mean≈0; best has the highest advantage
    expect(Math.abs(meanOf(r.ranked.map((x) => x.advantage)))).toBeLessThan(1e-9);
    expect(byId.b.advantage).toBeGreaterThan(byId.c.advantage);
    expect(byId.c.advantage).toBeGreaterThan(byId.a.advantage);
  });

  it("ranked results are returned in INPUT order (index preserved)", async () => {
    vi.spyOn(engine, "ask").mockResolvedValue(judgeAnswer("RANKING: t1, t0"));
    const r = await engine.rankTrajectories({
      trajectories: [{ content: "first" }, { content: "second" }],
    });
    expect(r.ranked.map((x) => x.index)).toEqual([0, 1]);
    expect(r.ranked.map((x) => x.id)).toEqual(["t0", "t1"]); // auto-id by index
    expect(r.ranked[1].rank).toBe(1); // t1 won
  });

  it("rubric defaults to systemPrompt; explicit rubric overrides (both reach the judge)", async () => {
    const spy = vi.spyOn(engine, "ask").mockResolvedValue(judgeAnswer("RANKING: t0, t1"));
    await engine.rankTrajectories({
      trajectories: [{ content: "x" }, { content: "y" }],
      systemPrompt: "MY-SYSTEM-PROMPT-MARKER",
    });
    expect(spy.mock.calls[0][0].prompt).toContain("MY-SYSTEM-PROMPT-MARKER");
    spy.mockClear();
    await engine.rankTrajectories({
      trajectories: [{ content: "x" }, { content: "y" }],
      rubric: "MY-EXPLICIT-RUBRIC",
      systemPrompt: "ignored-when-rubric-set",
    });
    expect(spy.mock.calls[0][0].prompt).toContain("MY-EXPLICIT-RUBRIC");
    expect(spy.mock.calls[0][0].prompt).not.toContain("ignored-when-rubric-set");
  });

  // ── FAILURE MODE 1: judge unreachable → order-fallback, flat reward, zero advantage ──
  it("judge throws → order-fallback: flat reward 0.5, advantages all 0, warning", async () => {
    vi.spyOn(engine, "ask").mockRejectedValue(new Error("all models offline"));
    const r = await engine.rankTrajectories({
      trajectories: [{ id: "a", content: "x" }, { id: "b", content: "y" }],
    });
    expect(r.ok).toBe(false);
    expect(r.mode).toBe("order-fallback");
    expect(r.ranked.every((x) => x.reward === 0.5)).toBe(true);
    expect(r.ranked.every((x) => x.advantage === 0)).toBe(true);
    expect(r.warning).toMatch(/no usable RANKING/);
  });

  // ── FAILURE MODE 2: judge gives a PARTIAL/duplicate ranking → untrusted → fallback ──
  it("partial ranking (missing an id) → order-fallback (not trusted)", async () => {
    vi.spyOn(engine, "ask").mockResolvedValue(judgeAnswer("RANKING: a")); // only 1 of 3
    const r = await engine.rankTrajectories({
      trajectories: [{ id: "a", content: "x" }, { id: "b", content: "y" }, { id: "c", content: "z" }],
    });
    expect(r.mode).toBe("order-fallback");
    expect(r.ranked.every((x) => x.reward === 0.5)).toBe(true);
  });

  it("duplicate id in ranking → order-fallback (untrusted)", async () => {
    vi.spyOn(engine, "ask").mockResolvedValue(judgeAnswer("RANKING: a, a"));
    const r = await engine.rankTrajectories({
      trajectories: [{ id: "a", content: "x" }, { id: "b", content: "y" }],
    });
    expect(r.mode).toBe("order-fallback");
  });

  it("unknown id in ranking → order-fallback (untrusted)", async () => {
    vi.spyOn(engine, "ask").mockResolvedValue(judgeAnswer("RANKING: a, ZZZ"));
    const r = await engine.rankTrajectories({
      trajectories: [{ id: "a", content: "x" }, { id: "b", content: "y" }],
    });
    expect(r.mode).toBe("order-fallback");
  });

  it("no RANKING: line in judge answer → order-fallback", async () => {
    vi.spyOn(engine, "ask").mockResolvedValue(judgeAnswer("I think trajectory a is best, honestly."));
    const r = await engine.rankTrajectories({
      trajectories: [{ id: "a", content: "x" }, { id: "b", content: "y" }],
    });
    expect(r.mode).toBe("order-fallback");
  });

  // ── FAILURE MODE 3: degenerate group sizes ──
  it("empty trajectory group → degenerate, ok:false", async () => {
    const r = await engine.rankTrajectories({ trajectories: [] });
    expect(r.ok).toBe(false);
    expect(r.mode).toBe("degenerate");
    expect(r.ranked).toEqual([]);
    expect(r.warning).toMatch(/empty/);
  });

  it("single trajectory → reward 1, advantage 0 (no relative baseline)", async () => {
    const r = await engine.rankTrajectories({ trajectories: [{ id: "solo", content: "x" }] });
    expect(r.mode).toBe("degenerate");
    expect(r.ranked).toEqual([{ id: "solo", index: 0, reward: 1, advantage: 0, rank: 1 }]);
  });

  // ── ADVERSARIAL ──
  it("non-array trajectories → degenerate, ok:false, no crash", async () => {
    // @ts-expect-error deliberate bad input
    const r = await engine.rankTrajectories({ trajectories: "nope" });
    expect(r.ok).toBe(false);
    expect(r.warning).toMatch(/must be an array/);
  });

  it("trajectory with non-string content coerced to empty, still ranks", async () => {
    vi.spyOn(engine, "ask").mockResolvedValue(judgeAnswer("RANKING: t0, t1"));
    const r = await engine.rankTrajectories({
      // @ts-expect-error deliberate
      trajectories: [{ content: 123 }, { content: "real" }],
    });
    expect(r.ok).toBe(true);
    expect(r.ranked.length).toBe(2);
  });

  it("case-insensitive id match in ranking", async () => {
    vi.spyOn(engine, "ask").mockResolvedValue(judgeAnswer("RANKING: B, A"));
    const r = await engine.rankTrajectories({
      trajectories: [{ id: "a", content: "x" }, { id: "b", content: "y" }],
    });
    expect(r.mode).toBe("judge-ranked");
    const byId = Object.fromEntries(r.ranked.map((x) => [x.id, x]));
    expect(byId.b.rank).toBe(1); // "B" matched "b"
  });
});
