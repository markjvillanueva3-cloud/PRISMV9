import { describe, it, expect } from "vitest";
import { ErrorBudgetEngine, errorBudgetEngine } from "../engines/ErrorBudgetEngine.js";

describe("ErrorBudgetEngine", () => {
  it("singleton has matching class name", () => {
    expect(errorBudgetEngine).toBeInstanceOf(ErrorBudgetEngine);
    expect(errorBudgetEngine.name).toBe("ErrorBudgetEngine");
  });

  it("all-success yields proceed recommendation", () => {
    const engine = new ErrorBudgetEngine();
    engine.setTarget({ service: "api", availabilityTarget: 0.99, windowHours: 1 });
    for (let i = 0; i < 100; i++) engine.record({ service: "api", success: true });
    const s = engine.status("api");
    expect(s.total).toBe(100);
    expect(s.failures).toBe(0);
    expect(s.budgetRemaining).toBe(1);
    expect(s.recommendation).toBe("proceed");
  });

  it("one percent error on 99% SLO triggers rollback", () => {
    const engine = new ErrorBudgetEngine();
    engine.setTarget({ service: "api", availabilityTarget: 0.99, windowHours: 1 });
    for (let i = 0; i < 99; i++) engine.record({ service: "api", success: true });
    engine.record({ service: "api", success: false });
    const s = engine.status("api");
    expect(s.budgetUsed).toBeGreaterThanOrEqual(1.0);
    expect(s.recommendation).toBe("rollback");
  });

  it("90% budget consumption triggers freeze", () => {
    const engine = new ErrorBudgetEngine();
    engine.setTarget({ service: "api", availabilityTarget: 0.99, windowHours: 1 });
    for (let i = 0; i < 991; i++) engine.record({ service: "api", success: true });
    for (let i = 0; i < 9; i++) engine.record({ service: "api", success: false });
    const s = engine.status("api");
    expect(s.budgetUsed).toBeGreaterThanOrEqual(0.85);
    expect(["freeze", "rollback"]).toContain(s.recommendation);
  });

  it("events outside window are dropped from status", () => {
    let now = 1_000_000;
    const engine = new ErrorBudgetEngine(() => now);
    engine.setTarget({ service: "api", availabilityTarget: 0.99, windowHours: 1 });
    for (let i = 0; i < 50; i++) engine.record({ service: "api", success: false, at: now });
    now += 3_600_000 * 2;
    const s = engine.status("api");
    expect(s.total).toBe(0);
    expect(s.failures).toBe(0);
  });

  it("weighted events count as their weight", () => {
    const engine = new ErrorBudgetEngine();
    engine.setTarget({ service: "api", availabilityTarget: 0.99, windowHours: 24 });
    engine.record({ service: "api", success: true, weight: 10 });
    engine.record({ service: "api", success: false, weight: 3 });
    const s = engine.status("api");
    expect(s.total).toBe(13);
    expect(s.failures).toBe(3);
  });

  it("reset(service) clears just that service's events", () => {
    const engine = new ErrorBudgetEngine();
    engine.record({ service: "a", success: true });
    engine.record({ service: "b", success: true });
    engine.reset("a");
    expect(engine.status("a").total).toBe(0);
    expect(engine.status("b").total).toBe(1);
  });

  it("listServices enumerates configured and recorded names", () => {
    const engine = new ErrorBudgetEngine();
    engine.setTarget({ service: "x", availabilityTarget: 0.99, windowHours: 1 });
    engine.record({ service: "y", success: true });
    const services = engine.listServices();
    expect(services).toContain("x");
    expect(services).toContain("y");
  });

  it("FAIL: empty service name rejected on setTarget", () => {
    const engine = new ErrorBudgetEngine();
    expect(() => engine.setTarget({ service: "", availabilityTarget: 0.99, windowHours: 1 }))
      .toThrow(/service required/);
  });

  it("FAIL: availability outside (0,1) rejected", () => {
    const engine = new ErrorBudgetEngine();
    expect(() => engine.setTarget({ service: "x", availabilityTarget: 0, windowHours: 1 }))
      .toThrow(/availabilityTarget must be/);
    expect(() => engine.setTarget({ service: "x", availabilityTarget: 1, windowHours: 1 }))
      .toThrow(/availabilityTarget must be/);
  });

  it("FAIL: non-boolean success rejected on record", () => {
    const engine = new ErrorBudgetEngine();
    expect(() => engine.record({
      service: "x",
      success: 1 as unknown as boolean,
    })).toThrow(/success boolean required/);
  });

  it("FAIL: negative weight rejected on record", () => {
    const engine = new ErrorBudgetEngine();
    expect(() => engine.record({ service: "x", success: true, weight: -1 }))
      .toThrow(/weight must be positive/);
  });

  it("ADV: 99.99% SLO sees rollback on very small failure rate", () => {
    const engine = new ErrorBudgetEngine();
    engine.setTarget({ service: "crit", availabilityTarget: 0.9999, windowHours: 24 });
    for (let i = 0; i < 9_998; i++) engine.record({ service: "crit", success: true });
    for (let i = 0; i < 2; i++) engine.record({ service: "crit", success: false });
    const s = engine.status("crit");
    expect(s.budgetUsed).toBeGreaterThanOrEqual(1.0);
    expect(s.recommendation).toBe("rollback");
  });
});
