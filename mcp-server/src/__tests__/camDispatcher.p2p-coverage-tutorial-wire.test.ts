/**
 * camDispatcher — P2P coverage analyzer + tutorial wiring suite
 * =============================================================
 *
 * KILO-P2P-RECONCILE-MS0/U-KP2P-02 (slot:kilo, 2026-05-22) — wires two
 * P2P-FULLSTACK-MS0 capstone engines that shipped to disk but were never
 * referenced by any dispatcher:
 *   - PrintToProgramCoverageAnalyzerEngine (U-P2PFS63) → print_to_program_coverage
 *   - PrintToProgramTutorialEngine        (U-P2PFS62) → print_to_program_tutorial
 *
 * These tests dispatch through the prism_cam handler (z.enum gate → case →
 * engine → envelope), NOT the engine singleton — that is what proves the
 * WIRING, which is the entire point of U-KP2P-02. They assert concrete
 * VALUES, not field presence:
 *   - coverage: the engine's internal invariants — total_fixtures equals
 *     per_fixture.length, the per-process rollup partitions every fixture,
 *     gap priorities are 1-5 and priority-sorted. A mis-wire to the wrong
 *     engine (or a regressed analyzer) breaks these hard.
 *   - tutorial: the 3 SEED walkthroughs carry hardcoded values — 105 total
 *     curriculum minutes (20+35+50), beginner walkthrough has 3 steps, the
 *     progression ladder is difficulty-ordered. Every assertion fails HARD
 *     (expect(undefined).toBe(105) etc.) if the bucket regresses.
 *
 * NOTE on the dispatcher contract: prism_cam wraps results through
 * responseSlimmer, which drops null/undefined and EMPTY arrays. Assertions
 * therefore target scalar fields + non-empty collections, and the
 * last-in-ladder nextAfter case (which yields null) is asserted as
 * absent-or-null. Pattern mirrors camDispatcher.controller-calibration-wire.test.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher, ACTIONS } from "../tools/dispatchers/camDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: any }> {
  const tool = server.tools.find((t) => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

// ─────────────────────────────────────────────────────────────────────
// 1. z.enum gate membership — the wiring's first contract
// ─────────────────────────────────────────────────────────────────────
describe("U-KP2P-02 — enum membership", () => {
  it("registers print_to_program_coverage in ACTIONS", () => {
    expect(ACTIONS).toContain("print_to_program_coverage");
  });
  it("registers print_to_program_tutorial in ACTIONS", () => {
    expect(ACTIONS).toContain("print_to_program_tutorial");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. print_to_program_coverage — PrintToProgramCoverageAnalyzerEngine
// ─────────────────────────────────────────────────────────────────────
describe("U-KP2P-02 — print_to_program_coverage", () => {
  it("returns a coverage report whose total_fixtures equals per_fixture.length", async () => {
    const r = await call(server, "print_to_program_coverage");
    expect(r.ok).toBe(true);
    expect(typeof r.data.total_fixtures).toBe("number");
    expect(r.data.total_fixtures).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(r.data.per_fixture)).toBe(true);
    expect(r.data.per_fixture.length).toBe(r.data.total_fixtures);
  });

  it("partitions every fixture across per_process — rollup sums to total_fixtures", async () => {
    const r = await call(server, "print_to_program_coverage");
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.per_process)).toBe(true);
    const summed = r.data.per_process.reduce(
      (s: number, p: { fixture_count: number }) => s + p.fixture_count,
      0,
    );
    expect(summed).toBe(r.data.total_fixtures);
  });

  it("computes overall_coverage_pct as a percentage in [0, 100]", async () => {
    const r = await call(server, "print_to_program_coverage");
    expect(r.ok).toBe(true);
    expect(typeof r.data.overall_coverage_pct).toBe("number");
    expect(r.data.overall_coverage_pct).toBeGreaterThanOrEqual(0);
    expect(r.data.overall_coverage_pct).toBeLessThanOrEqual(100);
  });

  it("emits a priority-sorted gap list — every gap has priority 1-5 and a known kind", async () => {
    const r = await call(server, "print_to_program_coverage");
    expect(r.ok).toBe(true);
    const gaps: { kind: string; priority: number }[] = r.data.gaps ?? [];
    const validKinds = new Set([
      "missing_bundle",
      "missing_tutorial",
      "no_pipeline_for_process",
      "harness_fail",
      "controller_divergence",
    ]);
    for (const g of gaps) {
      expect(validKinds.has(g.kind)).toBe(true);
      expect(g.priority).toBeGreaterThanOrEqual(1);
      expect(g.priority).toBeLessThanOrEqual(5);
    }
    // _collectGaps sorts ascending by priority — verify the wired path preserves it.
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i].priority).toBeGreaterThanOrEqual(gaps[i - 1].priority);
    }
  });

  it("reports controller calibration coverage — total_probes > 0, universal_hits_pct in [0,100]", async () => {
    const r = await call(server, "print_to_program_coverage");
    expect(r.ok).toBe(true);
    expect(typeof r.data.controllers.total_probes).toBe("number");
    // canonicalProbes() is a fixed 5-controller seed (asserted by the sibling
    // suite camDispatcher.controller-calibration-wire.test.ts) — exact count.
    expect(r.data.controllers.total_probes).toBe(5);
    expect(r.data.controllers.universal_hits_pct).toBeGreaterThanOrEqual(0);
    expect(r.data.controllers.universal_hits_pct).toBeLessThanOrEqual(100);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. print_to_program_tutorial — PrintToProgramTutorialEngine
//    The 3 SEED walkthroughs carry hardcoded values asserted exactly.
// ─────────────────────────────────────────────────────────────────────
describe("U-KP2P-02 — print_to_program_tutorial", () => {
  it("mode 'list' returns all 3 seed walkthroughs", async () => {
    const r = await call(server, "print_to_program_tutorial", { mode: "list" });
    expect(r.ok).toBe(true);
    expect(r.data.mode).toBe("list");
    expect(r.data.walkthroughs.length).toBe(3);
  });

  it("defaults to 'list' when no mode is given", async () => {
    const r = await call(server, "print_to_program_tutorial");
    expect(r.ok).toBe(true);
    expect(r.data.mode).toBe("list");
    expect(r.data.walkthroughs.length).toBe(3);
  });

  it("mode 'stats' reports 3 walkthroughs totalling 105 curriculum minutes (20+35+50)", async () => {
    const r = await call(server, "print_to_program_tutorial", { mode: "stats" });
    expect(r.ok).toBe(true);
    expect(r.data.total_walkthroughs).toBe(3);
    expect(r.data.total_estimated_minutes).toBe(105);
  });

  it("mode 'get' returns the beginner walkthrough with its exact 3 steps + 20 min", async () => {
    const r = await call(server, "print_to_program_tutorial", {
      mode: "get",
      fixture_id: "wedm-alcoa-10-32-punch",
    });
    expect(r.ok).toBe(true);
    expect(r.data.walkthrough.difficulty).toBe("beginner");
    expect(r.data.walkthrough.estimated_minutes).toBe(20);
    expect(r.data.walkthrough.steps.length).toBe(3);
  });

  it("mode 'ladder' orders the curriculum beginner-first", async () => {
    const r = await call(server, "print_to_program_tutorial", { mode: "ladder" });
    expect(r.ok).toBe(true);
    expect(r.data.ladder.length).toBe(3);
    expect(r.data.ladder[0].fixture_id).toBe("wedm-alcoa-10-32-punch");
    expect(r.data.ladder[0].difficulty).toBe("beginner");
    expect(r.data.ladder[2].difficulty).toBe("advanced");
  });

  it("mode 'by_difficulty' advanced returns exactly the M5 die walkthrough", async () => {
    const r = await call(server, "print_to_program_tutorial", {
      mode: "by_difficulty",
      difficulty: "advanced",
    });
    expect(r.ok).toBe(true);
    expect(r.data.walkthroughs.length).toBe(1);
    expect(r.data.walkthroughs[0].fixture_id).toBe("wedm-itw-m5-x-10-die");
  });

  it("mode 'next' steps from the beginner walkthrough to the intermediate one", async () => {
    const r = await call(server, "print_to_program_tutorial", {
      mode: "next",
      fixture_id: "wedm-alcoa-10-32-punch",
    });
    expect(r.ok).toBe(true);
    expect(r.data.next.fixture_id).toBe("sinker-alcoa-1-4-20-cavity");
  });

  it("mode 'next' on the last walkthrough yields no successor", async () => {
    const r = await call(server, "print_to_program_tutorial", {
      mode: "next",
      fixture_id: "wedm-itw-m5-x-10-die",
    });
    expect(r.ok).toBe(true);
    // nextAfter() returns undefined for the last entry → dispatcher coerces to
    // null → responseSlimmer drops it. Either absent or explicit null is correct.
    expect(r.data.next ?? null).toBe(null);
  });

  it("rejects mode 'get' without a fixture_id", async () => {
    const r = await call(server, "print_to_program_tutorial", { mode: "get" });
    expect(r.ok).toBe(false);
  });

  it("rejects mode 'by_difficulty' without a difficulty", async () => {
    const r = await call(server, "print_to_program_tutorial", { mode: "by_difficulty" });
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown mode", async () => {
    const r = await call(server, "print_to_program_tutorial", { mode: "bogus" });
    expect(r.ok).toBe(false);
  });
});
