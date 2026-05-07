import { describe, it, expect } from "vitest";
import { BlastDampenerEngine, blastDampenerEngine } from "../engines/BlastDampenerEngine.js";

describe("BlastDampenerEngine", () => {
  it("singleton engine has class-matching name", () => {
    expect(blastDampenerEngine).toBeInstanceOf(BlastDampenerEngine);
    expect(blastDampenerEngine.name).toBe("BlastDampenerEngine");
  });

  it("unknown kind is always allowed with Infinity remaining", () => {
    const engine = new BlastDampenerEngine();
    const verdict = engine.tryAcquire("unknown_op", "x");
    expect(verdict.ok).toBe(true);
    expect(verdict.remaining).toBe(Infinity);
  });

  it("refuses acquire after maxOps is exhausted within window", () => {
    let now = 1_000_000;
    const engine = new BlastDampenerEngine(() => now);
    engine.setPolicy("burst", { maxOps: 3, windowMs: 10_000 });
    expect(engine.tryAcquire("burst", "t").ok).toBe(true);
    expect(engine.tryAcquire("burst", "t").ok).toBe(true);
    expect(engine.tryAcquire("burst", "t").ok).toBe(true);
    const fourth = engine.tryAcquire("burst", "t");
    expect(fourth.ok).toBe(false);
    expect(fourth.retryAfterMs).toBeGreaterThan(0);
  });

  it("allows new acquires after the window rolls forward", () => {
    let now = 1_000_000;
    const engine = new BlastDampenerEngine(() => now);
    engine.setPolicy("burst", { maxOps: 2, windowMs: 1_000 });
    engine.tryAcquire("burst", "t");
    engine.tryAcquire("burst", "t");
    expect(engine.tryAcquire("burst", "t").ok).toBe(false);
    now += 1_500;
    expect(engine.tryAcquire("burst", "t").ok).toBe(true);
  });

  it("tracks independent buckets per target", () => {
    let now = 1_000_000;
    const engine = new BlastDampenerEngine(() => now);
    engine.setPolicy("op", { maxOps: 1, windowMs: 10_000 });
    expect(engine.tryAcquire("op", "a").ok).toBe(true);
    expect(engine.tryAcquire("op", "b").ok).toBe(true);
    expect(engine.tryAcquire("op", "a").ok).toBe(false);
  });

  it("default policies include destructive kinds", () => {
    const engine = new BlastDampenerEngine();
    const kinds = engine.policyKinds();
    expect(kinds).toContain("delete");
    expect(kinds).toContain("git_push_force");
  });

  it("reset({kind}) clears just the targeted bucket family", () => {
    let now = 1_000_000;
    const engine = new BlastDampenerEngine(() => now);
    engine.setPolicy("op1", { maxOps: 1, windowMs: 10_000 });
    engine.setPolicy("op2", { maxOps: 1, windowMs: 10_000 });
    engine.tryAcquire("op1", "t");
    engine.tryAcquire("op2", "t");
    engine.reset({ kind: "op1" });
    expect(engine.tryAcquire("op1", "t").ok).toBe(true);
    expect(engine.tryAcquire("op2", "t").ok).toBe(false);
  });

  it("status reports current active count per bucket", () => {
    const engine = new BlastDampenerEngine();
    engine.setPolicy("kk", { maxOps: 5, windowMs: 60_000 });
    engine.tryAcquire("kk", "tt");
    engine.tryAcquire("kk", "tt");
    const entry = engine.status().find((e) => e.key === "kk:tt");
    expect(entry?.count).toBe(2);
  });

  it("FAIL: setPolicy with empty kind is rejected", () => {
    const engine = new BlastDampenerEngine();
    expect(() => engine.setPolicy("", { maxOps: 1, windowMs: 1 })).toThrow(/kind required/);
  });

  it("FAIL: setPolicy with non-positive maxOps is rejected", () => {
    const engine = new BlastDampenerEngine();
    expect(() => engine.setPolicy("k", { maxOps: 0, windowMs: 1 })).toThrow(/maxOps must be/);
    expect(() => engine.setPolicy("k", { maxOps: -5, windowMs: 1 })).toThrow(/maxOps must be/);
  });

  it("FAIL: setPolicy with non-positive windowMs is rejected", () => {
    const engine = new BlastDampenerEngine();
    expect(() => engine.setPolicy("k", { maxOps: 1, windowMs: 0 })).toThrow(/windowMs must be/);
  });

  it("FAIL: tryAcquire with empty kind is rejected", () => {
    const engine = new BlastDampenerEngine();
    expect(() => engine.tryAcquire("", "t")).toThrow(/kind required/);
  });

  it("FAIL: tryAcquire with empty target is rejected", () => {
    const engine = new BlastDampenerEngine();
    expect(() => engine.tryAcquire("k", "")).toThrow(/target required/);
  });

  it("ADV: retryAfterMs shrinks as the oldest op ages out", () => {
    let now = 1_000_000;
    const engine = new BlastDampenerEngine(() => now);
    engine.setPolicy("op", { maxOps: 1, windowMs: 10_000 });
    engine.tryAcquire("op", "x");
    const refusedEarly = engine.tryAcquire("op", "x");
    expect(refusedEarly.retryAfterMs).toBeGreaterThan(9_000);
    now += 9_500;
    const refusedLate = engine.tryAcquire("op", "x");
    expect(refusedLate.retryAfterMs).toBeLessThanOrEqual(1_000);
  });

  it("ADV: remaining decrements correctly across successive acquires", () => {
    let now = 1_000_000;
    const engine = new BlastDampenerEngine(() => now);
    engine.setPolicy("m", { maxOps: 5, windowMs: 60_000 });
    for (let i = 0; i < 5; i++) {
      const verdict = engine.tryAcquire("m", "t");
      expect(verdict.remaining).toBe(4 - i);
    }
    expect(engine.tryAcquire("m", "t").ok).toBe(false);
  });
});
