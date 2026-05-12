import { describe, it, expect } from "vitest";
import { iso14971RiskManagementEngine } from "../engines/ISO14971RiskManagementEngine.js";

describe("ISO14971RiskManagementEngine", () => {
  it("acceptable initial risk passes", () => {
    const r = iso14971RiskManagementEngine.evaluate({
      device_name: "D",
      intended_use: "use",
      hazards: [{
        id: "H1",
        description: "minor cut",
        hazardous_situation: "sharp edge",
        harm: "skin laceration",
        severity_initial: 1,
        probability_initial: 2,
        controls: [],
      }],
    });
    expect(r.overall_acceptable).toBe(true);
    expect(r.acceptable_residual).toContain("H1");
  });

  it("unacceptable without benefit-risk → not acceptable", () => {
    const r = iso14971RiskManagementEngine.evaluate({
      device_name: "D",
      intended_use: "use",
      hazards: [{
        id: "H1",
        description: "shock",
        hazardous_situation: "frayed wire",
        harm: "death",
        severity_initial: 5,
        probability_initial: 5,
        controls: [],
      }],
    });
    expect(r.overall_acceptable).toBe(false);
    expect(r.unacceptable_residual).toContain("H1");
    expect(r.hazards_without_benefit_risk).toContain("H1");
  });

  it("unacceptable with benefit-risk accepted → overall acceptable", () => {
    const r = iso14971RiskManagementEngine.evaluate({
      device_name: "D",
      intended_use: "use",
      hazards: [{
        id: "H1",
        description: "shock",
        hazardous_situation: "x",
        harm: "death",
        severity_initial: 5,
        probability_initial: 5,
        controls: [{ id: "C1", type: "inherent_safety_by_design", description: "insulate", verified: true }],
        benefit_risk_accepted: true,
      }],
    });
    expect(r.overall_acceptable).toBe(true);
  });

  it("ALARP zone identified correctly", () => {
    const r = iso14971RiskManagementEngine.evaluate({
      device_name: "D",
      intended_use: "use",
      hazards: [{
        id: "H1",
        description: "x",
        hazardous_situation: "y",
        harm: "z",
        severity_initial: 3,
        probability_initial: 3, // 9 → ALARP
        controls: [{ id: "C1", type: "protective_measure", description: "guard", verified: true }],
      }],
    });
    expect(r.alarp_residual).toContain("H1");
  });

  it("residual reduction reflects control effect", () => {
    const r = iso14971RiskManagementEngine.evaluate({
      device_name: "D",
      intended_use: "use",
      hazards: [{
        id: "H1",
        description: "x",
        hazardous_situation: "y",
        harm: "z",
        severity_initial: 5,
        probability_initial: 5,
        probability_residual: 1,
        controls: [{ id: "C1", type: "inherent_safety_by_design", description: "redesign", verified: true }],
      }],
    });
    const ev = r.evaluations.find((e) => e.id === "H1")!;
    expect(ev.risk_initial).toBe(25);
    expect(ev.risk_residual).toBe(5);
    expect(ev.risk_reduction).toBe(20);
  });

  it("info-only control for unacceptable risk violates hierarchy", () => {
    const r = iso14971RiskManagementEngine.evaluate({
      device_name: "D",
      intended_use: "use",
      hazards: [{
        id: "H1",
        description: "x",
        hazardous_situation: "y",
        harm: "z",
        severity_initial: 5,
        probability_initial: 4,
        controls: [{ id: "C1", type: "information_for_safety", description: "label", verified: true }],
      }],
    });
    const ev = r.evaluations.find((e) => e.id === "H1")!;
    expect(ev.control_hierarchy_respected).toBe(false);
  });

  it("unverified controls listed", () => {
    const r = iso14971RiskManagementEngine.evaluate({
      device_name: "D",
      intended_use: "use",
      hazards: [{
        id: "H1",
        description: "x",
        hazardous_situation: "y",
        harm: "z",
        severity_initial: 3,
        probability_initial: 3,
        controls: [{ id: "C1", type: "protective_measure", description: "guard", verified: false }],
      }],
    });
    const ev = r.evaluations.find((e) => e.id === "H1")!;
    expect(ev.unverified_controls).toContain("C1");
  });

  it("custom thresholds override defaults", () => {
    const r = iso14971RiskManagementEngine.evaluate({
      device_name: "D",
      intended_use: "use",
      acceptable_threshold: 1,
      alarp_upper: 2,
      hazards: [{
        id: "H1",
        description: "x",
        hazardous_situation: "y",
        harm: "z",
        severity_initial: 1,
        probability_initial: 2,
        controls: [],
      }],
    });
    expect(r.alarp_residual).toContain("H1");
  });

  it("zero-control with already-acceptable risk is fine", () => {
    const r = iso14971RiskManagementEngine.evaluate({
      device_name: "D",
      intended_use: "use",
      hazards: [{
        id: "H1",
        description: "x",
        hazardous_situation: "y",
        harm: "z",
        severity_initial: 1,
        probability_initial: 1,
        controls: [],
      }],
    });
    const ev = r.evaluations.find((e) => e.id === "H1")!;
    expect(ev.notes.some((n) => n.includes("no controls"))).toBe(false);
  });

  it("multiple hazards counted separately", () => {
    const r = iso14971RiskManagementEngine.evaluate({
      device_name: "D",
      intended_use: "use",
      hazards: [
        { id: "H1", description: "a", hazardous_situation: "x", harm: "y", severity_initial: 1, probability_initial: 2, controls: [] },
        { id: "H2", description: "b", hazardous_situation: "x", harm: "y", severity_initial: 4, probability_initial: 4, controls: [], benefit_risk_accepted: true },
      ],
    });
    expect(r.hazards_evaluated).toBe(2);
    expect(r.acceptable_residual).toContain("H1");
    expect(r.unacceptable_residual).toContain("H2");
  });

  it("reasoning summarizes counts", () => {
    const r = iso14971RiskManagementEngine.evaluate({
      device_name: "D",
      intended_use: "use",
      hazards: [{ id: "H1", description: "x", hazardous_situation: "y", harm: "z", severity_initial: 1, probability_initial: 1, controls: [] }],
    });
    expect(r.reasoning.join(" ")).toMatch(/acceptable/);
  });

  it("getStats returns matrix size", () => {
    const s = iso14971RiskManagementEngine.getStats();
    expect(s.matrix_size).toBe("5x5");
    expect(s.reference).toMatch(/14971/);
  });
});
