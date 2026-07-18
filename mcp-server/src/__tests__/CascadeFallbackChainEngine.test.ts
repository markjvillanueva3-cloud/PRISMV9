/**
 * COST-CASCADE-MS0/U-CASCADE-FALLBACK-CHAIN — 5 spec cases + R12 oracles.
 *
 *   1. happy-cheap — first tentacle returns, no escalation
 *   2. mid-down-strong-up — cheap fails, mid breaker opens, strong returns
 *   3. all-down — every tentacle fails -> ALL_BREAKERS_OPEN
 *   4. breaker-open-half-open — open breaker transitions to half-open after halfOpenAfterMs
 *   5. calibration-stale — config=null -> CALIBRATION_MISSING exit
 *
 * Plus pure-core regression oracles for evaluateBreaker / recordSuccess /
 * recordFailure (state machine correctness) and adversarial cases from the
 * spec.
 */

import { describe, it, expect } from "vitest";
import {
  CascadeFallbackChainEngine,
  STUB_CALIBRATION,
  evaluateBreaker,
  recordSuccess,
  recordFailure,
  type CascadeDeps,
  type CascadeRunInput,
  type CascadeConfig,
  type TentacleRunner,
  type TentacleSpec,
} from "../engines/CascadeFallbackChainEngine.js";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const T_CHEAP: TentacleSpec = { id: "cheap", costEstimate: "free" };
const T_MID: TentacleSpec = { id: "mid", costEstimate: "low" };
const T_STRONG: TentacleSpec = { id: "strong", costEstimate: "high" };

function mkDeps(opts: {
  runners: Partial<Record<string, TentacleRunner | undefined>>;
  config?: CascadeConfig | null;
  now?: Date;
  tentacles?: Record<string, TentacleSpec>;
}): CascadeDeps {
  const allTentacles = opts.tentacles ?? { cheap: T_CHEAP, mid: T_MID, strong: T_STRONG };
  return {
    config: opts.config !== undefined ? opts.config : STUB_CALIBRATION,
    tentacles: allTentacles,
    now: () => opts.now ?? new Date("2026-05-20T15:00:00.000Z"),
    runTentacle: async (spec, input) => {
      const r = opts.runners[spec.id];
      if (!r) return { ok: false, output: null, failureReason: `no runner wired for ${spec.id}` };
      return await r(spec, input);
    },
  };
}

const INPUT: CascadeRunInput = { taskClass: "reasoning", prompt: "compute 2+2" };

// ============================================================================
// 5 SPEC CASES
// ============================================================================

describe("CascadeFallbackChainEngine — 5 spec cases", () => {
  it("case 1: happy-cheap — first tentacle returns, mid + strong never invoked", async () => {
    const engine = new CascadeFallbackChainEngine();
    const callLog: string[] = [];
    const deps = mkDeps({
      runners: {
        cheap: async () => { callLog.push("cheap"); return { ok: true, output: "4 (via cheap)" }; },
        mid: async () => { callLog.push("mid"); return { ok: true, output: "should-not-run" }; },
        strong: async () => { callLog.push("strong"); return { ok: true, output: "should-not-run" }; },
      },
    });
    const r = await engine.run(INPUT, deps);
    expect(r.ok).toBe(true);
    expect(r.resolvedBy).toBe("cheap");
    expect(r.output).toBe("4 (via cheap)");
    expect(r.attemptedTentacles).toEqual(["cheap"]);
    expect(r.skippedTentacles).toEqual([]);
    expect(callLog).toEqual(["cheap"]);
  });

  it("case 2: mid-down-strong-up — cheap fails, mid breaker open from prior failures, strong returns", async () => {
    const engine = new CascadeFallbackChainEngine();
    // Warm up ONLY the mid breaker by running a single-tentacle ["mid"] cascade
    // 3x (default openAfterFails=3). This leaves cheap+strong breakers closed.
    const baseTime = new Date("2026-05-20T15:00:00.000Z").getTime();
    for (let i = 0; i < 3; i++) {
      const t = new Date(baseTime + i * 2000); // 2s apart to clear minDwellMs=1000
      await engine.run(INPUT, mkDeps({
        runners: {
          mid: async () => ({ ok: false, output: null, failureReason: "mid-down" }),
        },
        now: t,
        config: { ...STUB_CALIBRATION, cascade: ["mid"] },
      }));
    }
    // Mid should now be open. Run again with strong succeeding:
    const r = await engine.run(INPUT, mkDeps({
      runners: {
        cheap: async () => ({ ok: false, output: null, failureReason: "cheap-down" }),
        mid: async () => ({ ok: true, output: "should-be-skipped" }), // ignored — breaker is open
        strong: async () => ({ ok: true, output: "resolved-by-strong" }),
      },
      now: new Date(baseTime + 10_000),
    }));
    expect(r.ok).toBe(true);
    expect(r.resolvedBy).toBe("strong");
    // Cheap was attempted (and failed), mid was skipped due to open breaker, strong succeeded
    expect(r.attemptedTentacles).toContain("cheap");
    expect(r.attemptedTentacles).toContain("strong");
    expect(r.attemptedTentacles).not.toContain("mid");
    expect(r.skippedTentacles.map((s) => s.tentacleId)).toContain("mid");
  });

  it("case 3: all-down — every tentacle fails, returns ALL_BREAKERS_OPEN with lastFailureReason", async () => {
    const engine = new CascadeFallbackChainEngine();
    const r = await engine.run(INPUT, mkDeps({
      runners: {
        cheap: async () => ({ ok: false, output: null, failureReason: "cheap timeout" }),
        mid: async () => ({ ok: false, output: null, failureReason: "mid 500" }),
        strong: async () => ({ ok: false, output: null, failureReason: "strong 503" }),
      },
    }));
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("ALL_BREAKERS_OPEN");
    expect(r.lastFailureReason).toBe("strong 503"); // last one tried
    expect(r.attemptedTentacles).toEqual(["cheap", "mid", "strong"]);
    expect(r.resolvedBy).toBeNull();
  });

  it("case 4: breaker open then half-open after halfOpenAfterMs elapsed; success closes it", async () => {
    const engine = new CascadeFallbackChainEngine();
    const baseTime = new Date("2026-05-20T15:00:00.000Z").getTime();

    // Open the cheap breaker via 3 failures
    for (let i = 0; i < 3; i++) {
      await engine.run(INPUT, mkDeps({
        runners: { cheap: async () => ({ ok: false, output: null, failureReason: "cheap-down" }) },
        now: new Date(baseTime + i * 2000),
        tentacles: { cheap: T_CHEAP }, // only cheap exists
        config: { ...STUB_CALIBRATION, cascade: ["cheap"] },
      }));
    }
    // Confirm open
    let snap = engine.status().find((s) => s.tentacleId === "cheap");
    expect(snap?.state).toBe("open");

    // Run BEFORE halfOpenAfterMs (60s) elapses — should be skipped
    const r1 = await engine.run(INPUT, mkDeps({
      runners: { cheap: async () => ({ ok: true, output: "cheap-back" }) },
      now: new Date(baseTime + 5000), // 5s after open
      tentacles: { cheap: T_CHEAP },
      config: { ...STUB_CALIBRATION, cascade: ["cheap"] },
    }));
    expect(r1.ok).toBe(false);
    expect(r1.skippedTentacles.map((s) => s.tentacleId)).toContain("cheap");

    // Run AFTER halfOpenAfterMs elapses — transitions to half-open, probe succeeds → closes
    const r2 = await engine.run(INPUT, mkDeps({
      runners: { cheap: async () => ({ ok: true, output: "cheap-back" }) },
      now: new Date(baseTime + 70_000), // 70s after open
      tentacles: { cheap: T_CHEAP },
      config: { ...STUB_CALIBRATION, cascade: ["cheap"] },
    }));
    expect(r2.ok).toBe(true);
    expect(r2.resolvedBy).toBe("cheap");
    snap = engine.status().find((s) => s.tentacleId === "cheap");
    expect(snap?.state).toBe("closed");
    expect(snap?.consecutiveFails).toBe(0);
  });

  it("case 5: calibration-stale — config=null returns CALIBRATION_MISSING", async () => {
    const engine = new CascadeFallbackChainEngine();
    const r = await engine.run(INPUT, mkDeps({
      runners: { cheap: async () => ({ ok: true, output: "x" }) },
      config: null,
    }));
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("CALIBRATION_MISSING");
    expect(r.errorMessage).toMatch(/calibration absent/i);
    expect(r.attemptedTentacles).toEqual([]);
  });
});

// ============================================================================
// R12 INVARIANTS (fail-on-revert oracles)
// ============================================================================

describe("CascadeFallbackChainEngine — R12 invariants", () => {
  it("R12#1 — runner throws -> CHAIN_THREW NOT propagated; error envelope returned", async () => {
    const engine = new CascadeFallbackChainEngine();
    const r = await engine.run(INPUT, mkDeps({
      runners: { cheap: async () => { throw new Error("kaboom"); } },
      config: { ...STUB_CALIBRATION, cascade: ["cheap"] },
    }));
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("ALL_BREAKERS_OPEN"); // runner-throw is caught and recorded as failure
    expect(r.lastFailureReason).toContain("kaboom");
  });

  it("R12#5 — tentacle not registered -> skip + log, chain continues", async () => {
    const engine = new CascadeFallbackChainEngine();
    const warnings: string[] = [];
    const deps: CascadeDeps = {
      config: { ...STUB_CALIBRATION, cascade: ["bogus", "cheap"] },
      tentacles: { cheap: T_CHEAP }, // 'bogus' deliberately missing
      now: () => new Date("2026-05-20T15:00:00.000Z"),
      runTentacle: async () => ({ ok: true, output: "cheap-pass" }),
      logWarn: (m) => warnings.push(m),
    };
    const r = await engine.run(INPUT, deps);
    expect(r.ok).toBe(true);
    expect(r.resolvedBy).toBe("cheap");
    expect(r.skippedTentacles).toContainEqual({ tentacleId: "bogus", reason: "tentacle not registered" });
    expect(warnings.some((w) => w.includes("not registered"))).toBe(true);
  });

  it("R12#7 — half-open fail reopens the breaker (does not close it)", async () => {
    const engine = new CascadeFallbackChainEngine();
    const baseTime = new Date("2026-05-20T15:00:00.000Z").getTime();
    // Open via 3 failures
    for (let i = 0; i < 3; i++) {
      await engine.run(INPUT, mkDeps({
        runners: { cheap: async () => ({ ok: false, output: null, failureReason: "down" }) },
        now: new Date(baseTime + i * 2000),
        tentacles: { cheap: T_CHEAP },
        config: { ...STUB_CALIBRATION, cascade: ["cheap"] },
      }));
    }
    // After 70s — half-open probe FAILS → must reopen, NOT close
    const r = await engine.run(INPUT, mkDeps({
      runners: { cheap: async () => ({ ok: false, output: null, failureReason: "still-down" }) },
      now: new Date(baseTime + 70_000),
      tentacles: { cheap: T_CHEAP },
      config: { ...STUB_CALIBRATION, cascade: ["cheap"] },
    }));
    expect(r.ok).toBe(false);
    const snap = engine.status().find((s) => s.tentacleId === "cheap");
    expect(snap?.state).toBe("open");
    // openedAt should have been REFRESHED to the half-open-fail time
    expect(snap?.openedAt).toBe(new Date(baseTime + 70_000).toISOString());
  });

  it("forceTentacle bypasses the cascade and runs only that tentacle", async () => {
    const engine = new CascadeFallbackChainEngine();
    const callLog: string[] = [];
    const r = await engine.run(
      { ...INPUT, forceTentacle: "strong" },
      mkDeps({
        runners: {
          cheap: async () => { callLog.push("cheap"); return { ok: true, output: "cheap" }; },
          mid: async () => { callLog.push("mid"); return { ok: true, output: "mid" }; },
          strong: async () => { callLog.push("strong"); return { ok: true, output: "strong-result" }; },
        },
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.resolvedBy).toBe("strong");
    expect(callLog).toEqual(["strong"]);
  });

  it("isCascadable predicate filters task classes per config", () => {
    const engine = new CascadeFallbackChainEngine();
    expect(engine.isCascadable("reasoning", STUB_CALIBRATION)).toBe(true);
    expect(engine.isCascadable("code_review", STUB_CALIBRATION)).toBe(true);
    expect(engine.isCascadable("physics_validation", STUB_CALIBRATION)).toBe(false);
    expect(engine.isCascadable("reasoning", null)).toBe(false);
  });
});

// ============================================================================
// Pure-core unit tests (state-machine correctness)
// ============================================================================

describe("recordFailure / recordSuccess / evaluateBreaker — pure", () => {
  function mkBreaker(state: "closed" | "open" | "half-open" = "closed") {
    return {
      state,
      consecutiveFails: 0,
      lastFailAt: null,
      lastSuccessAt: null,
      openedAt: null,
      lastTransitionAt: null,
      config: { openAfterFails: 3, halfOpenAfterMs: 60_000, minDwellMs: 1_000 },
    };
  }

  it("closed breaker stays closed until openAfterFails consecutive failures", () => {
    const b = mkBreaker("closed");
    const t0 = new Date("2026-05-20T15:00:00.000Z");
    recordFailure(b, new Date(t0.getTime() + 2000));
    expect(b.state).toBe("closed");
    expect(b.consecutiveFails).toBe(1);
    recordFailure(b, new Date(t0.getTime() + 4000));
    expect(b.state).toBe("closed");
    expect(b.consecutiveFails).toBe(2);
    recordFailure(b, new Date(t0.getTime() + 6000));
    expect(b.state).toBe("open");
    expect(b.consecutiveFails).toBe(3);
    expect(b.openedAt?.toISOString()).toBe(new Date(t0.getTime() + 6000).toISOString());
  });

  it("evaluateBreaker on closed says do-not-skip", () => {
    const b = mkBreaker("closed");
    const out = evaluateBreaker(b, new Date());
    expect(out.skip).toBe(false);
    expect(out.reason).toBe("closed");
  });

  it("evaluateBreaker on open with openedAt in past < halfOpenAfterMs says skip", () => {
    const b = mkBreaker("open");
    const now = new Date("2026-05-20T15:00:00.000Z");
    b.openedAt = new Date(now.getTime() - 5000); // 5s ago
    const out = evaluateBreaker(b, now);
    expect(out.skip).toBe(true);
    expect(out.reason).toContain("until half-open");
  });

  it("evaluateBreaker on open with openedAt >= halfOpenAfterMs ago says transition to half-open", () => {
    const b = mkBreaker("open");
    const now = new Date("2026-05-20T15:00:00.000Z");
    b.openedAt = new Date(now.getTime() - 70_000); // 70s ago > 60s halfOpenAfterMs
    const out = evaluateBreaker(b, now);
    expect(out.skip).toBe(false);
    expect(out.transitionTo).toBe("half-open");
  });

  it("recordSuccess on open WITH dwell expired closes the breaker", () => {
    const b = mkBreaker("open");
    b.openedAt = new Date("2026-05-20T14:00:00.000Z");
    b.lastTransitionAt = new Date("2026-05-20T14:00:00.000Z");
    b.consecutiveFails = 5;
    recordSuccess(b, new Date("2026-05-20T15:00:00.000Z"));
    expect(b.state).toBe("closed");
    expect(b.consecutiveFails).toBe(0);
    expect(b.openedAt).toBeNull();
  });

  it("minDwellMs debounces rapid state flip", () => {
    const b = mkBreaker("closed");
    const t0 = new Date("2026-05-20T15:00:00.000Z");
    // 3 failures within 1s — last one is at t0+0.5s, less than minDwellMs from t0
    b.lastTransitionAt = t0;
    recordFailure(b, new Date(t0.getTime() + 100));
    recordFailure(b, new Date(t0.getTime() + 200));
    recordFailure(b, new Date(t0.getTime() + 300));
    // consecutiveFails crossed threshold but minDwellMs=1000 prevents transition
    expect(b.consecutiveFails).toBe(3);
    expect(b.state).toBe("closed"); // dwell-debounced
  });
});

// ============================================================================
// status() + reset() + tentacle reuse
// ============================================================================

describe("CascadeFallbackChainEngine — status + reset", () => {
  it("status() reports each known breaker; reset() wipes all", async () => {
    const engine = new CascadeFallbackChainEngine();
    await engine.run(INPUT, mkDeps({
      runners: {
        cheap: async () => ({ ok: false, output: null, failureReason: "x" }),
        mid: async () => ({ ok: true, output: "ok" }),
      },
    }));
    let snaps = engine.status();
    expect(snaps.map((s) => s.tentacleId).sort()).toEqual(["cheap", "mid"]);
    engine.reset();
    expect(engine.status()).toEqual([]);
  });
});
