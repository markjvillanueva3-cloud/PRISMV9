/**
 * Tests — CADAppCircuitBreakerEngine (CAD-COMPLETE-MS0 / U-AI-09)
 *
 * Uses an injected clock so cooldown timing is deterministic.
 */
import { describe, it, expect } from "vitest";
import {
  CADAppCircuitBreakerEngine,
  cadAppCircuitBreakerEngine,
  createCADAppCircuitBreaker,
  DEFAULT_BREAKER_CONFIG,
} from "./CADAppCircuitBreakerEngine.js";

/** A breaker over a manually-advanced clock. */
function makeClockedBreaker() {
  const clock = { t: 0 };
  const cb = createCADAppCircuitBreaker(() => clock.t);
  return { cb, clock };
}

describe("CADAppCircuitBreakerEngine — closed state", () => {
  it("a fresh app starts closed and permits calls", () => {
    const { cb } = makeClockedBreaker();
    const d = cb.canProceed("fusion360");
    expect(d.allowed).toBe(true);
    expect(d.state).toBe("closed");
    expect(cb.getState("fusion360").state).toBe("closed");
  });

  it("a success resets the consecutive-failure streak", () => {
    const { cb } = makeClockedBreaker();
    cb.configure("hypermill", { failureThreshold: 3 });
    cb.recordFailure("hypermill");
    cb.recordFailure("hypermill");
    cb.recordSuccess("hypermill");
    expect(cb.getState("hypermill").consecutiveFailures).toBe(0);
    expect(cb.getState("hypermill").state).toBe("closed");
  });
});

describe("CADAppCircuitBreakerEngine — closed → open", () => {
  it("trips open after failureThreshold consecutive failures", () => {
    const { cb } = makeClockedBreaker();
    cb.configure("solidworks", { failureThreshold: 3 });
    cb.recordFailure("solidworks");
    cb.recordFailure("solidworks");
    expect(cb.getState("solidworks").state).toBe("closed");
    const snap = cb.recordFailure("solidworks", "COM timeout");
    expect(snap.state).toBe("open");
    expect(snap.totals.trips).toBe(1);
    expect(snap.lastError).toBe("COM timeout");
  });

  it("rejects calls fast while open and reports retryAfterMs", () => {
    const { cb, clock } = makeClockedBreaker();
    cb.configure("nx", { failureThreshold: 1, cooldownMs: 10_000 });
    cb.recordFailure("nx");
    clock.t = 4_000;
    const d = cb.canProceed("nx");
    expect(d.allowed).toBe(false);
    expect(d.state).toBe("open");
    expect(d.retryAfterMs).toBe(6_000);
    expect(cb.getState("nx").totals.rejections).toBe(1);
  });
});

describe("CADAppCircuitBreakerEngine — open → half_open → closed", () => {
  it("permits a trial call once the cooldown elapses", () => {
    const { cb, clock } = makeClockedBreaker();
    cb.configure("fusion360", { failureThreshold: 1, cooldownMs: 10_000 });
    cb.recordFailure("fusion360");
    clock.t = 10_000;
    const d = cb.canProceed("fusion360");
    expect(d.allowed).toBe(true);
    expect(d.state).toBe("half_open");
  });

  it("closes after successThreshold consecutive trial successes", () => {
    const { cb, clock } = makeClockedBreaker();
    cb.configure("fusion360", { failureThreshold: 1, cooldownMs: 5_000, successThreshold: 2 });
    cb.recordFailure("fusion360");
    clock.t = 5_000;
    cb.canProceed("fusion360"); // probe 1
    cb.recordSuccess("fusion360");
    expect(cb.getState("fusion360").state).toBe("half_open");
    cb.canProceed("fusion360"); // probe 2
    const snap = cb.recordSuccess("fusion360");
    expect(snap.state).toBe("closed");
    expect(snap.consecutiveFailures).toBe(0);
  });

  it("a failed trial call immediately re-opens the breaker", () => {
    const { cb, clock } = makeClockedBreaker();
    cb.configure("nx", { failureThreshold: 1, cooldownMs: 5_000 });
    cb.recordFailure("nx");
    clock.t = 5_000;
    cb.canProceed("nx"); // half-open probe
    const snap = cb.recordFailure("nx", "still dead");
    expect(snap.state).toBe("open");
    expect(snap.totals.trips).toBe(2);
  });

  it("limits concurrent half-open trial probes", () => {
    const { cb, clock } = makeClockedBreaker();
    cb.configure("nx", { failureThreshold: 1, cooldownMs: 5_000, halfOpenMaxProbes: 1 });
    cb.recordFailure("nx");
    clock.t = 5_000;
    const first = cb.canProceed("nx");
    expect(first.allowed).toBe(true);
    const second = cb.canProceed("nx");
    expect(second.allowed).toBe(false);
    expect(second.state).toBe("half_open");
  });
});

describe("CADAppCircuitBreakerEngine — config, totals, lifecycle", () => {
  it("uses DEFAULT_BREAKER_CONFIG until configured", () => {
    const { cb } = makeClockedBreaker();
    expect(cb.getState("fusion360").config).toEqual(DEFAULT_BREAKER_CONFIG);
  });

  it("sanitizes an invalid config", () => {
    const { cb } = makeClockedBreaker();
    const snap = cb.configure("nx", { failureThreshold: 0, cooldownMs: -100, halfOpenMaxProbes: 0 });
    expect(snap.config.failureThreshold).toBeGreaterThanOrEqual(1);
    expect(snap.config.cooldownMs).toBeGreaterThanOrEqual(0);
    expect(snap.config.halfOpenMaxProbes).toBeGreaterThanOrEqual(1);
  });

  it("tracks call totals", () => {
    const { cb } = makeClockedBreaker();
    cb.configure("fusion360", { failureThreshold: 10 });
    cb.recordSuccess("fusion360");
    cb.recordSuccess("fusion360");
    cb.recordFailure("fusion360");
    const t = cb.getState("fusion360").totals;
    expect(t.calls).toBe(3);
    expect(t.successes).toBe(2);
    expect(t.failures).toBe(1);
  });

  it("snapshot lists every tracked app", () => {
    const { cb } = makeClockedBreaker();
    cb.getState("a");
    cb.getState("b");
    expect(cb.snapshot().map((s) => s.appId).sort()).toEqual(["a", "b"]);
  });

  it("reset clears one app", () => {
    const { cb } = makeClockedBreaker();
    cb.configure("nx", { failureThreshold: 1 });
    cb.recordFailure("nx");
    expect(cb.getState("nx").state).toBe("open");
    cb.reset("nx");
    expect(cb.getState("nx").state).toBe("closed");
  });

  it("reset() with no arg clears all apps", () => {
    const { cb } = makeClockedBreaker();
    cb.getState("a");
    cb.getState("b");
    cb.reset();
    expect(cb.snapshot()).toHaveLength(0);
  });

  it("rejects an empty appId", () => {
    const { cb } = makeClockedBreaker();
    expect(() => cb.canProceed("")).toThrow();
  });

  it("exports a shared singleton", () => {
    expect(cadAppCircuitBreakerEngine).toBeInstanceOf(CADAppCircuitBreakerEngine);
  });
});

describe("CADAppCircuitBreakerEngine — state-hygiene regressions", () => {
  it("re-opens when a half-open trial probe stalls past the cooldown", () => {
    const { cb, clock } = makeClockedBreaker();
    cb.configure("nx", { failureThreshold: 1, cooldownMs: 1_000 });
    cb.recordFailure("nx");
    clock.t = 1_000;
    const probe = cb.canProceed("nx"); // reserves a half-open probe
    expect(probe.allowed).toBe(true);
    expect(probe.state).toBe("half_open");
    // The probe never reports an outcome; a full cooldown passes.
    clock.t = 2_000;
    const stalled = cb.canProceed("nx");
    expect(stalled.allowed).toBe(false);
    expect(stalled.state).toBe("open");
    expect(stalled.reason).toMatch(/stalled/i);
  });

  it("a stray success recorded while OPEN does not bleed into the half-open streak", () => {
    const { cb, clock } = makeClockedBreaker();
    cb.configure("fusion360", { failureThreshold: 1, cooldownMs: 1_000, successThreshold: 2 });
    cb.recordFailure("fusion360"); // → open
    cb.recordSuccess("fusion360"); // stray late success while OPEN
    clock.t = 1_000;
    cb.canProceed("fusion360"); // → half_open, streak reset to 0
    cb.recordSuccess("fusion360"); // first genuine trial success
    // With the stray success leaking in this would have closed after one
    // real success; the half-open streak must start fresh.
    expect(cb.getState("fusion360").state).toBe("half_open");
  });
});
