/**
 * PRISM MCP Server — pollWithBackoff Unit Tests
 *
 * Covers:
 *   - Happy path (immediate success, Nth-attempt success)
 *   - All three failure paths: max-attempts, max-wall-time, aborted
 *   - Throw propagation (fn throws, predicate throws — neither retries)
 *   - Backoff growth + cap (deterministic delay sequences captured via onAttempt)
 *   - onAttempt callback receives (attempt, delayMs, lastValue)
 *   - PollTimeoutError carries diagnostic state (lastValue, attempts, elapsedMs, label)
 *   - Validation hardening (NaN/Infinity, maxWallTimeMs=0, ordering constraints)
 *   - sleep() helper abort semantics
 *
 * All assertions are exact-value or bounded. No `.toBeDefined()` / `.toBeTruthy()` /
 * unbounded `.toBeGreaterThan(0)` presence checks — every expect verifies a concrete
 * contract.
 */

import { describe, it, expect } from "vitest";
import { pollUntil, sleep, PollTimeoutError, type PollOptions } from "../../utils/pollWithBackoff.js";

// Named timing constants — keep test wall-times tight + intent obvious.
const SHORT_DELAY_MS = 1;             // negligible — for tests that don't care about timing
const POLL_INTERVAL_MS = 50;          // observable but fast
const WALL_BUDGET_MS = 80;            // smaller than 3 × POLL_INTERVAL_MS → forces wall-time exit
const ABORT_TRIGGER_MS = 30;          // abort fires partway through first sleep
const ABORT_OBSERVE_TIMEOUT_MS = 500; // upper bound on how long abort propagation may take
const SLEEP_TARGET_MS = 30;           // sleep happy-path target
const SLEEP_EARLY_TOLERANCE_MS = 10;  // setTimeout can fire ~5ms early on Windows
// Tight single-sleep upper bound. A 30ms target with 100ms ceiling catches any regression
// that pushes setTimeout >3x (catastrophic) while tolerating normal Windows scheduler drift
// (timer-resolution can be 15.6ms; 3-4× that is the realistic CI worst-case for a single timer).
// AGGREGATE tests (multiple awaits, abort handlers, etc.) use looser bounds; this is single-sleep.
const SLEEP_HAPPY_PATH_CEILING_MS = 100;
const ABORT_PROPAGATION_CEILING_MS = 150; // mid-sleep abort observed elapsed bound
const ALREADY_ABORTED_CEILING_MS = 50; // pre-aborted signal — should reject ~instantly

// Cap-test constants
const CAP_BASE_DELAY_MS = 50;
const CAP_MAX_DELAY_MS = 60;
const CAP_GROWTH_FACTOR = 10; // would explode without cap
const CAP_MAX_ATTEMPTS = 4;

/** Counter helper — returns a function that yields incrementing values. */
function makeCounter(values: readonly number[]): () => Promise<number> {
  let i = 0;
  return async () => {
    if (i >= values.length) throw new Error(`counter exhausted at index ${i}`);
    return values[i++]!;
  };
}

describe("pollUntil", () => {
  describe("happy path", () => {
    it("returns immediately when predicate true on first attempt — exactly 1 fn call", async () => {
      let calls = 0;
      const fn = async (): Promise<number> => {
        calls++;
        return 42;
      };
      const result = await pollUntil(fn, (v) => v === 42, { baseDelayMs: SHORT_DELAY_MS, maxAttempts: 5 });
      expect(result).toBe(42);
      expect(calls).toBe(1);
    });

    it("returns when predicate true on third attempt — calls fn exactly 3 times", async () => {
      let calls = 0;
      const fn = async (): Promise<number> => {
        calls++;
        return calls;
      };
      const result = await pollUntil(fn, (v) => v >= 3, { baseDelayMs: SHORT_DELAY_MS, maxAttempts: 10 });
      expect(result).toBe(3);
      expect(calls).toBe(3);
    });

    it("predicate that toggles false→false→true returns first true value (no oscillation)", async () => {
      const fn = makeCounter([0, 0, 1, 0]);
      const result = await pollUntil(fn, (v) => v === 1, { baseDelayMs: SHORT_DELAY_MS, maxAttempts: 5 });
      expect(result).toBe(1);
    });
  });

  describe("failure paths", () => {
    it("throws PollTimeoutError(max-attempts-exceeded) with correct attempts and lastValue", async () => {
      try {
        await pollUntil(makeCounter([10, 20, 30]), (v) => v === 99, {
          baseDelayMs: SHORT_DELAY_MS,
          maxAttempts: 3,
        });
        throw new Error("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(PollTimeoutError);
        const err = e as PollTimeoutError<number>;
        expect(err.reason).toBe("max-attempts-exceeded");
        expect(err.attempts).toBe(3);
        expect(err.lastValue).toBe(30); // final fn() result, NOT 99 (predicate target) or 10 (first)
      }
    });

    it("throws PollTimeoutError(max-wall-time-exceeded) with elapsedMs bounded by budget", async () => {
      const startedAt = Date.now();
      try {
        await pollUntil(makeCounter([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]), (v) => v === 99, {
          baseDelayMs: POLL_INTERVAL_MS,
          maxDelayMs: POLL_INTERVAL_MS,
          maxAttempts: 10,
          maxWallTimeMs: WALL_BUDGET_MS,
        });
        throw new Error("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(PollTimeoutError);
        const err = e as PollTimeoutError<number>;
        expect(err.reason).toBe("max-wall-time-exceeded");
        // Must wait at least the budget AND less than the would-have-been full duration
        expect(err.elapsedMs).toBeGreaterThanOrEqual(WALL_BUDGET_MS);
        expect(err.elapsedMs).toBeLessThan(10 * POLL_INTERVAL_MS);
        // Real wall-clock independently bounded
        const wallElapsed = Date.now() - startedAt;
        expect(wallElapsed).toBeLessThan(10 * POLL_INTERVAL_MS);
      }
    });

    it("throws PollTimeoutError(aborted) when AbortSignal fires mid-poll, faster than full duration", async () => {
      const controller = new AbortController();
      const fn = async (): Promise<number> => 1;
      const startedAt = Date.now();
      setTimeout(() => controller.abort(), ABORT_TRIGGER_MS);
      try {
        await pollUntil(fn, (v) => v === 99, {
          baseDelayMs: POLL_INTERVAL_MS,
          maxDelayMs: POLL_INTERVAL_MS,
          maxAttempts: 5,
          signal: controller.signal,
        });
        throw new Error("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(PollTimeoutError);
        expect((e as PollTimeoutError).reason).toBe("aborted");
        const wallElapsed = Date.now() - startedAt;
        // Abort must propagate quickly — well under 5 × POLL_INTERVAL_MS = 250ms total
        expect(wallElapsed).toBeLessThan(ABORT_OBSERVE_TIMEOUT_MS);
      }
    });

    it("throws PollTimeoutError(aborted) with attempts=0 when signal already aborted at entry — fn never called", async () => {
      const controller = new AbortController();
      controller.abort();
      let fnCalls = 0;
      const fn = async (): Promise<number> => {
        fnCalls++;
        return 1;
      };
      try {
        await pollUntil(fn, (v) => v === 1, {
          baseDelayMs: SHORT_DELAY_MS,
          maxAttempts: 5,
          signal: controller.signal,
        });
        throw new Error("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(PollTimeoutError);
        expect((e as PollTimeoutError).reason).toBe("aborted");
        expect((e as PollTimeoutError).attempts).toBe(0);
        // fn must NOT have been called — abort short-circuits before first attempt
        expect(fnCalls).toBe(0);
      }
    });
  });

  describe("throw propagation (R12)", () => {
    it("propagates errors from fn without retry — fn called exactly once", async () => {
      let calls = 0;
      const fn = async (): Promise<number> => {
        calls++;
        throw new Error("network down");
      };
      await expect(pollUntil(fn, () => true, { baseDelayMs: SHORT_DELAY_MS, maxAttempts: 5 })).rejects.toThrow(
        "network down",
      );
      expect(calls).toBe(1);
    });

    it("propagates errors from predicate without retry — fn called exactly once", async () => {
      let fnCalls = 0;
      const fn = async (): Promise<number> => {
        fnCalls++;
        return 1;
      };
      const check = (): boolean => {
        throw new Error("predicate-bug");
      };
      await expect(pollUntil(fn, check, { baseDelayMs: SHORT_DELAY_MS, maxAttempts: 5 })).rejects.toThrow(
        "predicate-bug",
      );
      expect(fnCalls).toBe(1);
    });
  });

  describe("backoff behavior", () => {
    it("delays grow exponentially up to maxDelayMs — exact captured sequence", async () => {
      const delays: number[] = [];
      try {
        await pollUntil(makeCounter([1, 1, 1, 1, 1]), (v) => v === 99, {
          baseDelayMs: 10,
          maxDelayMs: 100,
          backoffFactor: 2,
          maxAttempts: 5,
          onAttempt: (_a, d) => delays.push(d),
        });
      } catch {
        // Expected — exhausts attempts
      }
      // Inter-attempt delays (4 of them; last attempt has no inter-attempt delay):
      // delayMs starts at 10. Attempt 1: nextDelay=10, then delayMs=20.
      // Attempt 2: nextDelay=20, then delayMs=40.
      // Attempt 3: nextDelay=40, then delayMs=80.
      // Attempt 4: nextDelay=80, then delayMs=100 (capped).
      expect(delays).toEqual([10, 20, 40, 80]);
    });

    it("respects maxDelayMs cap — captured delays are exactly [base, cap, cap]", async () => {
      const delays: number[] = [];
      try {
        await pollUntil(makeCounter([1, 1, 1, 1]), (v) => v === 99, {
          baseDelayMs: CAP_BASE_DELAY_MS,
          maxDelayMs: CAP_MAX_DELAY_MS,
          backoffFactor: CAP_GROWTH_FACTOR, // 10× growth would explode without cap
          maxAttempts: CAP_MAX_ATTEMPTS,
          onAttempt: (_a, d) => delays.push(d),
        });
      } catch {
        // Expected
      }
      // 4 attempts → 3 inter-attempt delays.
      // delayMs starts at 50. Attempt 1: nextDelay=min(50,60)=50, delayMs=min(500,60)=60.
      // Attempt 2: nextDelay=60, delayMs=60. Attempt 3: nextDelay=60.
      expect(delays).toEqual([CAP_BASE_DELAY_MS, CAP_MAX_DELAY_MS, CAP_MAX_DELAY_MS]);
    });

    it("onAttempt receives (attempt, delayMs, lastValue) once per inter-attempt gap", async () => {
      const captured: Array<{ attempt: number; delay: number; value: number }> = [];
      try {
        await pollUntil(makeCounter([10, 20, 30]), (v) => v === 99, {
          baseDelayMs: SHORT_DELAY_MS,
          maxDelayMs: SHORT_DELAY_MS,
          backoffFactor: 1, // pin delays constant — isolate the (attempt, value) contract from backoff math
          maxAttempts: 3,
          onAttempt: (attempt, delay, value) => captured.push({ attempt, delay, value }),
        });
      } catch {
        // Expected
      }
      // onAttempt fires AFTER attempts 1 and 2 (not 3 — last attempt skips delay)
      expect(captured).toEqual([
        { attempt: 1, delay: SHORT_DELAY_MS, value: 10 },
        { attempt: 2, delay: SHORT_DELAY_MS, value: 20 },
      ]);
    });
  });

  describe("diagnostic state", () => {
    it("includes [label] tag in error message and exposes err.label exactly", async () => {
      const LABEL = "aps-manifest-urn:abc";
      try {
        await pollUntil(makeCounter([1]), (v) => v === 99, {
          baseDelayMs: SHORT_DELAY_MS,
          maxAttempts: 1,
          label: LABEL,
        });
        throw new Error("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(PollTimeoutError);
        const err = e as PollTimeoutError;
        expect(err.label).toBe(LABEL);
        expect(err.message).toContain(`[${LABEL}]`);
        expect(err.message).toContain("max-attempts-exceeded");
      }
    });

    it("omits label bracket from message when label not provided — err.label is undefined", async () => {
      try {
        await pollUntil(makeCounter([1]), (v) => v === 99, {
          baseDelayMs: SHORT_DELAY_MS,
          maxAttempts: 1,
        });
        throw new Error("should have thrown");
      } catch (e) {
        const err = e as PollTimeoutError;
        expect(err.label).toBe(undefined);
        // Message must not contain a bracketed label tag
        expect(err.message).not.toMatch(/\[[^\]]+\]/);
        expect(err.message).toContain("max-attempts-exceeded");
      }
    });

    it("PollTimeoutError carries lastValue from final attempt (literal, not predicate target)", async () => {
      try {
        await pollUntil(makeCounter([7, 8, 9]), (v) => v === 99, {
          baseDelayMs: SHORT_DELAY_MS,
          maxAttempts: 3,
        });
        throw new Error("should have thrown");
      } catch (e) {
        const err = e as PollTimeoutError<number>;
        expect(err.lastValue).toBe(9); // literal value fn() returned, NOT 99 (target) or 7 (first)
        expect(err.attempts).toBe(3);
      }
    });
  });

  describe("validation (fail loud) — async rejection pattern", () => {
    it("rejects NaN backoffFactor — prevents NaN-delay tight-loop bug", async () => {
      await expect(
        pollUntil(makeCounter([1]), () => true, { backoffFactor: NaN } as PollOptions<number>),
      ).rejects.toThrow(/backoffFactor/);
    });

    it("rejects Infinity baseDelayMs", async () => {
      await expect(
        pollUntil(makeCounter([1]), () => true, { baseDelayMs: Infinity } as PollOptions<number>),
      ).rejects.toThrow(/baseDelayMs/);
    });

    it("rejects maxWallTimeMs=0 — would prevent any attempt from running", async () => {
      await expect(
        pollUntil(makeCounter([1]), () => true, { maxWallTimeMs: 0 } as PollOptions<number>),
      ).rejects.toThrow(/maxWallTimeMs/);
    });

    it("rejects negative baseDelayMs", async () => {
      await expect(
        pollUntil(makeCounter([1]), () => true, { baseDelayMs: -1 } as PollOptions<number>),
      ).rejects.toThrow(/baseDelayMs/);
    });

    it("rejects maxDelayMs < baseDelayMs (would never allow growth)", async () => {
      await expect(
        pollUntil(makeCounter([1]), () => true, {
          baseDelayMs: 100,
          maxDelayMs: 50,
        } as PollOptions<number>),
      ).rejects.toThrow(/maxDelayMs/);
    });

    it("rejects maxAttempts < 1 (no attempts would run)", async () => {
      await expect(
        pollUntil(makeCounter([1]), () => true, { maxAttempts: 0 } as PollOptions<number>),
      ).rejects.toThrow(/maxAttempts/);
    });

    it("rejects backoffFactor < 1 (would cause delays to shrink each attempt)", async () => {
      await expect(
        pollUntil(makeCounter([1]), () => true, { backoffFactor: 0.5 } as PollOptions<number>),
      ).rejects.toThrow(/backoffFactor/);
    });
  });
});

describe("sleep", () => {
  it("resolves after specified delay within tight bounded tolerance", async () => {
    const t0 = Date.now();
    await sleep(SLEEP_TARGET_MS);
    const elapsed = Date.now() - t0;
    // Lower bound: setTimeout is occasionally early on Windows
    expect(elapsed).toBeGreaterThanOrEqual(SLEEP_TARGET_MS - SLEEP_EARLY_TOLERANCE_MS);
    // Upper bound: tight enough to catch a regression that pushes setTimeout >3x target
    expect(elapsed).toBeLessThan(SLEEP_HAPPY_PATH_CEILING_MS);
  });

  it("rejects immediately when signal already aborted at entry — does not wait", async () => {
    const controller = new AbortController();
    controller.abort();
    const t0 = Date.now();
    await expect(sleep(1000, controller.signal)).rejects.toThrow(PollTimeoutError);
    // Must NOT have actually waited 1000ms — verifies the early-abort guard ran
    expect(Date.now() - t0).toBeLessThan(ALREADY_ABORTED_CEILING_MS);
  });

  it("rejects when signal fires mid-sleep — short-circuits well before nominal duration", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ABORT_TRIGGER_MS);
    const t0 = Date.now();
    await expect(sleep(1000, controller.signal)).rejects.toThrow(PollTimeoutError);
    const elapsed = Date.now() - t0;
    // Aborted long before the 1000ms target
    expect(elapsed).toBeLessThan(ABORT_PROPAGATION_CEILING_MS);
    // But did wait at least until the abort fired (with tolerance for early timers)
    expect(elapsed).toBeGreaterThanOrEqual(ABORT_TRIGGER_MS - SLEEP_EARLY_TOLERANCE_MS);
  });
});
