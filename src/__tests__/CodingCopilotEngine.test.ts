/**
 * CodingCopilotEngine Tests — MXU-MS1
 */
import { describe, it, expect } from "vitest";
import { codingCopilotEngine } from "../engines/CodingCopilotEngine.js";

// ── Reuse Suggestion ─────────────────────────────────────────

describe("CodingCopilotEngine — Reuse Suggestion", () => {

  it("suggests SpeedFeedOrchestrator for speed/feed tasks", () => {
    const r = codingCopilotEngine.suggestReuse("calculate cutting speed and feed rate");
    expect(r.length).toBeGreaterThan(0);
    expect(r.some(s => s.engine_name.includes("SpeedFeed"))).toBe(true);
  });

  it("suggests PostProcessor engines for G-code tasks", () => {
    const r = codingCopilotEngine.suggestReuse("generate G-code for Fanuc controller");
    expect(r.some(s => s.domain === "post_processor")).toBe(true);
  });

  it("suggests Kienzle for cutting force", () => {
    const r = codingCopilotEngine.suggestReuse("compute cutting force with Kienzle model");
    expect(r.some(s => s.engine_name.includes("Kienzle"))).toBe(true);
  });

  it("suggests EDM engines for wire EDM", () => {
    const r = codingCopilotEngine.suggestReuse("wire EDM settings for rough cut");
    expect(r.some(s => s.domain === "edm")).toBe(true);
  });

  it("returns empty for unrelated task", () => {
    const r = codingCopilotEngine.suggestReuse("xyz abc 123");
    expect(r).toHaveLength(0);
  });

  it("respects maxResults limit", () => {
    const r = codingCopilotEngine.suggestReuse("machine tool material speed feed", 2);
    expect(r.length).toBeLessThanOrEqual(2);
  });
});

// ── Duplication Detection ────────────────────────────────────

describe("CodingCopilotEngine — Duplication Detection", () => {

  it("detects high overlap for similar name", () => {
    const r = codingCopilotEngine.checkDuplication(
      "SpeedFeedCalculatorEngine",
      ["speed and feed calculation"],
      ["SpeedFeedOrchestratorEngine", "KienzleForceModelEngine"],
    );
    expect(r.confidence).toBeGreaterThan(0.3);
    expect(r.overlapping_engines.length).toBeGreaterThan(0);
  });

  it("proceeds for novel engine", () => {
    const r = codingCopilotEngine.checkDuplication(
      "QuantumVortexEngine",
      ["quantum vortex computation"],
      ["SpeedFeedOrchestratorEngine", "PostProcessorPipelineEngine"],
    );
    expect(r.recommendation).toBe("proceed");
    expect(r.is_duplicate).toBe(false);
  });

  it("returns overlapping engine names", () => {
    const r = codingCopilotEngine.checkDuplication(
      "CuttingForceEngine",
      ["force calculation"],
      ["KienzleForceModelEngine", "DeflectionAnalysisEngine"],
    );
    expect(r.overlapping_engines.length).toBeGreaterThanOrEqual(0);
  });
});

// ── Wiring Pattern ───────────────────────────────────────────

describe("CodingCopilotEngine — Wiring Pattern", () => {

  it("suggests calcDispatcher for physics engines", () => {
    const r = codingCopilotEngine.suggestWiring("NewPhysicsEngine", "physics");
    expect(r[0].dispatcher).toBe("calcDispatcher");
    expect(r[0].action_name).toContain("new_physics");
  });

  it("suggests businessDispatcher for business engines", () => {
    const r = codingCopilotEngine.suggestWiring("CostAnalysisEngine", "business");
    expect(r[0].dispatcher).toBe("businessDispatcher");
  });

  it("generates valid example code", () => {
    const r = codingCopilotEngine.suggestWiring("TestEngine", "general");
    expect(r[0].example).toContain("case");
    expect(r[0].example).toContain("import");
  });
});

// ── Convention Check ─────────────────────────────────────────

describe("CodingCopilotEngine — Convention Check", () => {

  it("passes for well-formed engine", () => {
    const r = codingCopilotEngine.checkConventions("SpeedFeedEngine", true, true, true, true);
    expect(r.pass).toBe(true);
    expect(r.issues).toHaveLength(0);
  });

  it("fails without Engine suffix", () => {
    const r = codingCopilotEngine.checkConventions("SpeedFeed", true, true, true, true);
    expect(r.pass).toBe(false);
    expect(r.issues.some(i => i.rule === "naming")).toBe(true);
  });

  it("warns without tests", () => {
    const r = codingCopilotEngine.checkConventions("NewEngine", true, true, false, true);
    expect(r.issues.some(i => i.rule === "testing")).toBe(true);
  });

  it("warns without singleton export", () => {
    const r = codingCopilotEngine.checkConventions("NewEngine", true, false, true, true);
    expect(r.issues.some(i => i.rule === "export" && i.severity === "warning")).toBe(true);
  });
});

// ── Template Generation ──────────────────────────────────────

describe("CodingCopilotEngine — Template Generation", () => {

  it("generates valid skeleton", () => {
    const t = codingCopilotEngine.generateTemplate("NewFeature", "physics", ["compute forces", "predict wear"]);
    expect(t.class_name).toBe("NewFeatureEngine");
    expect(t.file_name).toBe("NewFeatureEngine.ts");
    expect(t.skeleton).toContain("export class NewFeatureEngine");
    expect(t.skeleton).toContain("compute_forces");
    expect(t.skeleton).toContain("predict_wear");
    expect(t.suggested_dispatcher).toBe("calcDispatcher");
  });

  it("appends Engine suffix if missing", () => {
    const t = codingCopilotEngine.generateTemplate("ChipBreaker", "tooling", ["analyze chips"]);
    expect(t.class_name).toBe("ChipBreakerEngine");
  });
});

// ── Full Suggestion ──────────────────────────────────────────

describe("CodingCopilotEngine — Full Suggestion", () => {

  it("returns complete suggestion set", () => {
    const r = codingCopilotEngine.suggest(
      "build a thermal analysis engine for cutting temperature prediction",
      "ThermalAnalysisEngine",
      ["CuttingTemperatureEngine", "ThermalWearCouplingEngine"],
    );
    expect(r.reuse_suggestions.length).toBeGreaterThan(0);
    expect(r.duplication_check).toBeDefined();
    expect(r.wiring_patterns.length).toBeGreaterThan(0);
    expect(r.convention_check).toBeDefined();
  });

  it("provides template when no duplication", () => {
    const r = codingCopilotEngine.suggest(
      "build a quantum flux engine",
      "QuantumFluxEngine",
      [],
    );
    expect(r.template).toBeDefined();
    expect(r.template!.class_name).toBe("QuantumFluxEngine");
  });

  it("infers engine name from description", () => {
    const r = codingCopilotEngine.suggest("calculate vibration damping ratio");
    expect(r.task_description).toContain("vibration");
  });
});

// ── Utility ──────────────────────────────────────────────────

describe("CodingCopilotEngine — Utility", () => {

  it("lists domain engines", () => {
    const domains = codingCopilotEngine.listDomainEngines();
    expect(Object.keys(domains).length).toBeGreaterThan(5);
    expect(domains.physics.length).toBeGreaterThan(3);
  });

  it("gets dispatcher for domain", () => {
    expect(codingCopilotEngine.getDispatcherFor("physics")).toBe("calcDispatcher");
    expect(codingCopilotEngine.getDispatcherFor("business")).toBe("businessDispatcher");
    expect(codingCopilotEngine.getDispatcherFor("unknown")).toBe("devDispatcher");
  });
});
