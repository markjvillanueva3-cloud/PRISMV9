/**
 * SVIRankedBacklogEngine — tests + prism_dev `svi_ranked_backlog` wiring E2E.
 *
 * WIRE-UNWIRED-MS0/U-WIRE03 (2026-05-16): this engine was a truly-unwired
 * backend dev-tool (no dispatcher, no test, no consumer). Tests verify the
 * Ψ-delta-per-hour ranking logic against reference scores AND the round-trip
 * through the devDispatcher `svi_ranked_backlog` action.
 *
 * Coverage: happy path · ≥3 failure modes · ≥2 adversarial inputs ·
 * ≥3 variability cases (status / dependencies / tags) · dispatcher E2E.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import {
  SVIRankedBacklogEngine,
  sviRankedBacklogEngine,
  type BacklogUnit,
} from "../engines/SVIRankedBacklogEngine.js";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

/** projection helper — only `psiDelta` is consumed by the engine. */
function unit(id: string, hours: number, psiDelta: number, extra: Partial<BacklogUnit> = {}): BacklogUnit {
  return {
    id,
    title: `unit ${id}`,
    estimatedHours: hours,
    projection: { psiDelta } as BacklogUnit["projection"],
    ...extra,
  };
}

// reference set: scoreOne = psiDelta / hours → A=5, C=2, B=1
const A = unit("A", 2, 10);
const B = unit("B", 5, 5);
const C = unit("C", 4, 8);

// ───────────────────────── engine-direct tests ──────────────────────────

describe("SVIRankedBacklogEngine — rank() / scoreOne()", () => {
  it("happy path: ranks units by Ψ-delta per hour, descending", () => {
    const engine = new SVIRankedBacklogEngine();
    const ranked = engine.rank([B, A, C]);
    expect(ranked.map((r) => r.id)).toEqual(["A", "C", "B"]);
    expect(ranked[0].score).toBe(5); // 10 / 2
    expect(ranked[1].score).toBe(2); // 8 / 4
    expect(ranked[2].score).toBe(1); // 5 / 5
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("scoreOne() computes psiDelta/estimatedHours rounded to 4 decimals", () => {
    const engine = new SVIRankedBacklogEngine();
    expect(engine.scoreOne(A)).toBe(5);
    // 1 / 3 = 0.33333… → rounded to 0.3333
    expect(engine.scoreOne(unit("X", 3, 1))).toBe(0.3333);
  });

  it("variability — status: completed units are excluded by default", () => {
    const engine = new SVIRankedBacklogEngine();
    const done = unit("D", 1, 99, { status: "completed" });
    const ranked = engine.rank([A, done, B]);
    expect(ranked.map((r) => r.id)).toEqual(["A", "B"]);
  });

  it("variability — status: excludeCompleted=false keeps completed units", () => {
    const engine = new SVIRankedBacklogEngine();
    const done = unit("D", 1, 99, { status: "completed" });
    const ranked = engine.rank([A, done], { excludeCompleted: false });
    // D scores 99/1=99 → ranks first.
    expect(ranked[0].id).toBe("D");
    expect(ranked[0].score).toBe(99);
  });

  it("variability — dependencies: a unit blocked by an unresolved dep sinks to the bottom", () => {
    const engine = new SVIRankedBacklogEngine();
    // E has the highest score but depends on a unit not in the set → blocked.
    const blocked = unit("E", 1, 100, { dependencies: ["NOT_PRESENT"] });
    const ranked = engine.rank([blocked, A]);
    expect(ranked[0].id).toBe("A");
    expect(ranked[1].id).toBe("E");
    expect(ranked[1].blockedByUnresolved).toBe(true);
    expect(ranked[0].blockedByUnresolved).toBe(false);
  });

  it("variability — tags: includeTags filters to matching units only", () => {
    const engine = new SVIRankedBacklogEngine();
    const urgent = unit("U", 2, 6, { tags: ["urgent"] });
    const normal = unit("N", 2, 6, { tags: ["later"] });
    const ranked = engine.rank([urgent, normal], { includeTags: ["urgent"] });
    expect(ranked.map((r) => r.id)).toEqual(["U"]);
  });

  it("limit truncates the ranked output", () => {
    const engine = new SVIRankedBacklogEngine();
    const ranked = engine.rank([A, B, C], { limit: 2 });
    expect(ranked).toHaveLength(2);
    expect(ranked.map((r) => r.id)).toEqual(["A", "C"]);
  });

  it("summary() aggregates totals and surfaces the top unit", () => {
    const engine = new SVIRankedBacklogEngine();
    const ranked = engine.rank([A, B, C]);
    const s = engine.summary(ranked);
    expect(s.total).toBe(3);
    expect(s.blocked).toBe(0);
    // totalPsiPotential = 10 + 5 + 8
    expect(s.totalPsiPotential).toBe(23);
    expect(s.top!.id).toBe("A");
  });

  it("summary() of an empty ranking returns zeros and a null top", () => {
    const engine = new SVIRankedBacklogEngine();
    const s = engine.summary([]);
    expect(s.total).toBe(0);
    expect(s.blocked).toBe(0);
    expect(s.totalPsiPotential).toBe(0);
    expect(s.top).toBeNull();
  });

  // ── failure modes ──
  it("failure mode — duplicate unit ids throw", () => {
    const engine = new SVIRankedBacklogEngine();
    expect(() => engine.rank([A, unit("A", 1, 1)])).toThrow(/duplicate/i);
  });

  it("failure mode — estimatedHours of 0 throws (division guard)", () => {
    const engine = new SVIRankedBacklogEngine();
    expect(() => engine.scoreOne(unit("Z", 0, 5))).toThrow(/estimatedHours/i);
  });

  it("failure mode — negative estimatedHours throws", () => {
    const engine = new SVIRankedBacklogEngine();
    expect(() => engine.scoreOne(unit("Z", -3, 5))).toThrow(/estimatedHours/i);
  });

  // ── adversarial inputs ──
  it("adversarial — an empty unit list ranks to an empty array", () => {
    const engine = new SVIRankedBacklogEngine();
    expect(engine.rank([])).toEqual([]);
  });

  it("adversarial — a negative psiDelta yields a negative score and ranks last", () => {
    const engine = new SVIRankedBacklogEngine();
    const loss = unit("LOSS", 1, -5);
    const ranked = engine.rank([A, loss]);
    expect(ranked[1].id).toBe("LOSS");
    expect(ranked[1].score).toBe(-5);
  });

  it("adversarial — a huge psiDelta over a tiny hour estimate stays finite", () => {
    const engine = new SVIRankedBacklogEngine();
    const r = engine.scoreOne(unit("HUGE", 0.001, 1_000_000));
    expect(Number.isFinite(r)).toBe(true);
    expect(r).toBe(1_000_000_000);
  });

  it("exported singleton ranks through the same logic as a fresh instance", () => {
    const ranked = sviRankedBacklogEngine.rank([B, A]);
    expect(ranked[0].id).toBe("A");
    expect(ranked[0].rank).toBe(1);
  });
});

// ───────────────────── devDispatcher round-trip E2E ─────────────────────

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerDevDispatcher(fakeServer);
  return { handler };
}

async function call(
  handler: Handler,
  action: string,
  params: Record<string, any> = {},
): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

describe("devDispatcher · svi_ranked_backlog wiring (E2E round-trip)", () => {
  let handler: Handler;

  beforeAll(async () => {
    vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });
    const s = createServer();
    handler = await s.handler;
  });

  it("ranks a backlog and returns ranked + summary", async () => {
    const r = await call(handler, "svi_ranked_backlog", { units: [B, A, C] });
    expect(r.success).toBe(true);
    expect(r.ranked.map((u: any) => u.id)).toEqual(["A", "C", "B"]);
    expect(r.ranked[0].score).toBe(5);
    expect(r.summary.total).toBe(3);
    expect(r.summary.totalPsiPotential).toBe(23);
    expect(r.summary.top.id).toBe("A");
  });

  it("honors the options.limit parameter through the dispatcher", async () => {
    const r = await call(handler, "svi_ranked_backlog", {
      units: [A, B, C],
      options: { limit: 1 },
    });
    expect(r.success).toBe(true);
    expect(r.ranked).toHaveLength(1);
    expect(r.ranked[0].id).toBe("A");
  });

  it("failure mode — missing units → structured error", async () => {
    const r = await call(handler, "svi_ranked_backlog", {});
    // devDispatcher splits the Zod failure into {error, details}.
    expect(r.error).toMatch(/invalid params for svi_ranked_backlog/i);
    expect(r.details).toMatch(/units/i);
  });

  it("failure mode — empty units array is rejected by the Zod schema (.min(1))", async () => {
    const r = await call(handler, "svi_ranked_backlog", { units: [] });
    expect(r.error).toMatch(/invalid params/i);
  });

  it("failure mode — duplicate unit ids surface the engine error", async () => {
    const r = await call(handler, "svi_ranked_backlog", {
      units: [A, { ...A }],
    });
    expect(r.error).toMatch(/svi_ranked_backlog: .*duplicate/i);
  });

  it("adversarial — estimatedHours of 0 is rejected by the schema (.positive())", async () => {
    const r = await call(handler, "svi_ranked_backlog", {
      units: [unit("ZERO", 0, 5)],
    });
    expect(r.error).toMatch(/invalid params/i);
  });

  it("adversarial — a unit missing its projection is rejected by the schema", async () => {
    const r = await call(handler, "svi_ranked_backlog", {
      units: [{ id: "NOPROJ", title: "no projection", estimatedHours: 2 }],
    });
    expect(r.error).toMatch(/invalid params/i);
  });
});
