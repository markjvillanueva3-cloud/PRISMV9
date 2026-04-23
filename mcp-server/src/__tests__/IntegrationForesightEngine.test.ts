/**
 * U-FORE-08 tests — IntegrationForesightEngine
 *
 * Coverage floor: happy + ≥3 failure modes + ≥2 adversarial.
 * Variability: 4 engine-spec shapes (minimal, safety-critical, schema-free,
 * skill+hook combo) to cover the branching in the checklist generator.
 * Dispatcher round-trip included.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  IntegrationForesightEngine,
  integrationForesightEngine,
  type EngineSpec,
} from "../engines/IntegrationForesightEngine.js";

// ─── Happy path ─────────────────────────────────────────────────────

describe("IntegrationForesightEngine — predictIntegration", () => {
  it("returns checklist with engine + test + dispatcher + schema for a minimal spec", () => {
    const f = integrationForesightEngine.predictIntegration({
      name: "FooBarEngine",
      purpose: "computes foo",
    });
    const kinds = f.checklist.map((s) => s.kind);
    expect(kinds).toContain("write_engine");
    expect(kinds).toContain("write_tests");
    expect(kinds).toContain("add_dispatcher_action");
    expect(kinds).toContain("add_action_schema");
    expect(kinds).toContain("update_engine_digest");
  });

  it("coverage counts required vs total", () => {
    const f = integrationForesightEngine.predictIntegration({ name: "BazEngine" });
    expect(f.coverage.required).toBeGreaterThan(0);
    expect(f.coverage.total).toBeGreaterThanOrEqual(f.coverage.required);
  });

  it("dispatcher hint resolves for CAM-flavored engines", () => {
    const f = integrationForesightEngine.predictIntegration({
      name: "CAMStrategyPickerEngine",
      purpose: "chooses mill strategies",
    });
    expect(f.dispatcherHint).toBe("cam");
  });

  it("dispatcher hint resolves for safety-flavored engines", () => {
    const f = integrationForesightEngine.predictIntegration({
      name: "SpindleCollisionGuardEngine",
      purpose: "checks collisions between spindle and stock",
    });
    expect(f.dispatcherHint).toBe("safety");
  });

  it("dispatcher hint resolves for CAD engines", () => {
    const f = integrationForesightEngine.predictIntegration({
      name: "SketchMeshBuilderEngine",
      purpose: "builds meshes from sketches",
    });
    expect(f.dispatcherHint).toBe("cad");
  });

  it("falls back to no hint when no match", () => {
    const f = integrationForesightEngine.predictIntegration({
      name: "XyzUnrelatedEngine",
      purpose: "unknown",
    });
    expect(["dev", null, undefined, "orchestrate"]).toContain(f.dispatcherHint);
  });

  it("VARIABILITY: safety-critical spec adds S(x) gate hook", () => {
    const f = integrationForesightEngine.predictIntegration({
      name: "SafetyCriticalForceEngine",
      isSafetyCritical: true,
    });
    const hooks = f.checklist.filter((s) => s.kind === "add_hook");
    expect(hooks.length).toBeGreaterThan(0);
    expect(hooks.some((h) => /SAFETY/i.test(h.description))).toBe(true);
  });

  it("VARIABILITY: needsSkill flag adds skill step", () => {
    const f = integrationForesightEngine.predictIntegration({
      name: "UIFacingEngine",
      needsSkill: true,
    });
    expect(f.checklist.some((s) => s.kind === "add_skill")).toBe(true);
  });

  it("VARIABILITY: needsHook without safety still adds a hook entry", () => {
    const f = integrationForesightEngine.predictIntegration({
      name: "MonitorableEngine",
      needsHook: true,
      isSafetyCritical: false,
    });
    expect(f.checklist.some((s) => s.kind === "add_hook")).toBe(true);
  });

  it("VARIABILITY: needsSchema=false drops the schema step", () => {
    const f = integrationForesightEngine.predictIntegration({
      name: "PureDataEngine",
      needsSchema: false,
    });
    expect(f.checklist.some((s) => s.kind === "add_action_schema")).toBe(false);
  });
});

// ─── Failure modes ──────────────────────────────────────────────────

describe("IntegrationForesightEngine — failure modes", () => {
  it("FAIL: null spec throws", () => {
    // @ts-expect-error
    expect(() => integrationForesightEngine.predictIntegration(null)).toThrow(
      /must be an object/
    );
  });

  it("FAIL: missing name throws", () => {
    expect(() =>
      integrationForesightEngine.predictIntegration({} as any)
    ).toThrow(/name required/);
  });

  it("FAIL: name without 'Engine' suffix throws", () => {
    expect(() =>
      integrationForesightEngine.predictIntegration({ name: "MyThing" })
    ).toThrow(/end with 'Engine'/);
  });

  it("FAIL: empty name throws", () => {
    expect(() =>
      integrationForesightEngine.predictIntegration({ name: "" })
    ).toThrow(/name required/);
  });
});

// ─── Adversarial ────────────────────────────────────────────────────

describe("IntegrationForesightEngine — adversarial", () => {
  it("ADV: very long name handled without crashing", () => {
    const longName = "X".repeat(500) + "Engine";
    const f = integrationForesightEngine.predictIntegration({ name: longName });
    expect(f.engine).toBe(longName);
  });

  it("ADV: unicode in purpose is tokenized safely", () => {
    const f = integrationForesightEngine.predictIntegration({
      name: "UnicodeEngine",
      purpose: "handles 漢字 and emoji 🚀 safely",
    });
    expect(f.checklist.length).toBeGreaterThan(0);
  });

  it("ADV: similar-engine scan is bounded (<5 results)", () => {
    const f = integrationForesightEngine.predictIntegration({
      name: "CommonCoreHelperEngine",
      purpose: "engine helper core common",
    });
    expect(f.similarEngines.length).toBeLessThanOrEqual(5);
  });
});

// ─── validateCoverage ───────────────────────────────────────────────

describe("IntegrationForesightEngine — validateCoverage", () => {
  it("flags missing required steps", () => {
    const f = integrationForesightEngine.predictIntegration({
      name: "CheckMeEngine",
    });
    const v = integrationForesightEngine.validateCoverage(f, []);
    expect(v.missingRequired.length).toBeGreaterThan(0);
    expect(v.coveragePct).toBe(0);
  });

  it("reports 100% coverage when all required done", () => {
    const f = integrationForesightEngine.predictIntegration({
      name: "DoneEngine",
      needsSchema: false,
    });
    const done = f.checklist.filter((s) => s.required).map((s) => s.kind);
    const v = integrationForesightEngine.validateCoverage(f, done);
    expect(v.missingRequired).toEqual([]);
    expect(v.coveragePct).toBe(1);
  });

  it("ignores non-required steps in coverage %", () => {
    const f = integrationForesightEngine.predictIntegration({
      name: "PartialEngine",
    });
    const requiredOnly = f.checklist
      .filter((s) => s.required)
      .map((s) => s.kind);
    const v = integrationForesightEngine.validateCoverage(f, requiredOnly);
    expect(v.coveragePct).toBe(1);
  });
});

// ─── inferDispatcherPath / inferSchemaPath ──────────────────────────

describe("IntegrationForesightEngine — path inference", () => {
  it("infers dispatcher path from domain hint", () => {
    const p = integrationForesightEngine.inferDispatcherPath({
      name: "MillingSweeperEngine",
    });
    expect(p).toMatch(/camDispatcher\.ts$/);
  });

  it("falls back to dev dispatcher when no match", () => {
    const p = integrationForesightEngine.inferDispatcherPath({
      name: "UnknownEngine",
    });
    expect(p).toMatch(/dev(Dispatcher)?\.ts$/);
  });

  it("schema path matches dispatcher domain", () => {
    const p = integrationForesightEngine.inferSchemaPath({
      name: "CADFeatureEngine",
    });
    expect(p).toContain("cad");
    expect(p).toMatch(/ActionSchemas\.ts$/);
  });
});

// ─── summarize ──────────────────────────────────────────────────────

describe("IntegrationForesightEngine — summarize", () => {
  it("renders a multi-line checklist string", () => {
    const f = integrationForesightEngine.predictIntegration({
      name: "SummarizeMeEngine",
    });
    const s = integrationForesightEngine.summarize(f);
    expect(s).toContain("SummarizeMeEngine");
    expect(s.split("\n").length).toBeGreaterThan(3);
  });

  it("includes similar-engine section when matches exist", () => {
    const f = integrationForesightEngine.predictIntegration({
      name: "CAMStrategyEngine",
      purpose: "strategy mill toolpath",
    });
    const s = integrationForesightEngine.summarize(f);
    if (f.similarEngines.length > 0) {
      expect(s).toContain("Similar engines");
    }
  });
});

// ─── findSimilarEngines ─────────────────────────────────────────────

describe("IntegrationForesightEngine — findSimilarEngines", () => {
  it("scans the engines directory and produces overlap scores", () => {
    const fake = new IntegrationForesightEngine(process.cwd());
    const matches = fake.findSimilarEngines({
      name: "NewMillStrategyEngine",
      purpose: "selects milling strategy",
    });
    // Either we find some similar engines or cleanly return []
    expect(Array.isArray(matches)).toBe(true);
    for (const m of matches) {
      expect(m.similarity).toBeGreaterThan(0);
      expect(m.similarity).toBeLessThanOrEqual(1);
      expect(m.overlapKeywords.length).toBeGreaterThan(0);
    }
  });

  it("returns [] when the engines directory is missing", () => {
    const fake = new IntegrationForesightEngine("/nonexistent/repo/root");
    const matches = fake.findSimilarEngines({ name: "XEngine" });
    expect(matches).toEqual([]);
  });
});

// ─── Dispatcher round-trip ──────────────────────────────────────────

describe("U-FORE-08 — dispatcher round-trip", () => {
  it("devDispatcher exposes integration_foresight + integration_validate actions", () => {
    const disp = fs.readFileSync(
      path.join(process.cwd(), "src/tools/dispatchers/devDispatcher.ts"),
      "utf-8"
    );
    expect(disp).toContain('"integration_foresight"');
    expect(disp).toContain('"integration_validate"');
    expect(disp).toContain("IntegrationForesightEngine.js");
  });
});
