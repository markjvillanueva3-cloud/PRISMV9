/**
 * AutoWiringEngine.test.ts — Tests for AUTO-1 Automatic Engine Wiring Pipeline
 *
 * Tests engine file parsing, wiring gap detection, and artifact generation.
 */

import { describe, it, expect } from "vitest";
import { autoWiringEngine } from "../engines/AutoWiringEngine.js";
import type { WiringPlan } from "../engines/AutoWiringEngine.js";

describe("AutoWiringEngine", () => {
  describe("analyze()", () => {
    it("returns a WiringPlan for a known engine file", async () => {
      const plan = await autoWiringEngine.analyze("QualityScoreEngine.ts");
      expect(plan).toBeDefined();
      expect(plan.engine).toBeDefined();
      expect(plan.engine.class_name).toBe("QualityScoreEngine");
      expect(plan.engine.file_name).toBe("QualityScoreEngine.ts");
      expect(plan.engine.line_count).toBeGreaterThan(100);
      expect(plan.dry_run).toBe(true);
    });

    it("detects the singleton export name", async () => {
      const plan = await autoWiringEngine.analyze("QualityScoreEngine.ts");
      expect(plan.engine.singleton_name).toBe("qualityScoreEngine");
    });

    it("extracts public methods", async () => {
      const plan = await autoWiringEngine.analyze("QualityScoreEngine.ts");
      const methodNames = plan.engine.public_methods.map(m => m.name);
      expect(methodNames).toContain("compute");
      expect(methodNames).toContain("read");
      expect(methodNames).toContain("summary");
    });

    it("detects async methods", async () => {
      const plan = await autoWiringEngine.analyze("QualityScoreEngine.ts");
      const compute = plan.engine.public_methods.find(m => m.name === "compute");
      expect(compute).toBeDefined();
      expect(compute!.is_async).toBe(true);
    });

    it("identifies method parameters", async () => {
      const plan = await autoWiringEngine.analyze("QualityScoreEngine.ts");
      const compute = plan.engine.public_methods.find(m => m.name === "compute");
      expect(compute).toBeDefined();
      expect(compute!.params.length).toBeGreaterThanOrEqual(1);
      const engineNameParam = compute!.params.find(p => p.name === "engineName");
      if (engineNameParam) {
        expect(engineNameParam.optional).toBe(true);
      }
    });

    it("reports current wiring status", async () => {
      const plan = await autoWiringEngine.analyze("QualityScoreEngine.ts");
      expect(typeof plan.current_wiring.exported_in_index).toBe("boolean");
      expect(typeof plan.current_wiring.has_dispatcher_case).toBe("boolean");
      expect(typeof plan.current_wiring.has_schema).toBe("boolean");
      expect(typeof plan.current_wiring.has_test).toBe("boolean");
    });

    it("generates artifacts only for missing wiring", async () => {
      const plan = await autoWiringEngine.analyze("QualityScoreEngine.ts");
      // QualityScoreEngine is well-wired, so gaps should be few or zero
      for (const artifact of plan.artifacts) {
        expect(artifact.content.length).toBeGreaterThan(0);
        expect(["index_export", "dispatcher_case", "schema", "test_scaffold"]).toContain(artifact.artifact_type);
      }
    });

    it("throws for non-existent engine file", async () => {
      await expect(autoWiringEngine.analyze("NonExistentEngine12345.ts")).rejects.toThrow();
    });

    it("respects dry_run=true by default", async () => {
      const plan = await autoWiringEngine.analyze("QualityScoreEngine.ts");
      expect(plan.dry_run).toBe(true);
    });
  });

  describe("analyze() — artifact generation", () => {
    it("index_export artifact has correct format", async () => {
      const plan = await autoWiringEngine.analyze("AutoWiringEngine.ts");
      const indexArtifact = plan.artifacts.find(a => a.artifact_type === "index_export");
      if (indexArtifact) {
        expect(indexArtifact.content).toContain("export");
        expect(indexArtifact.content).toContain("AutoWiringEngine");
      }
    });

    it("dispatcher_case artifact has correct structure", async () => {
      const plan = await autoWiringEngine.analyze("AutoWiringEngine.ts");
      const dispArtifact = plan.artifacts.find(a => a.artifact_type === "dispatcher_case");
      if (dispArtifact) {
        expect(dispArtifact.content).toContain("case");
        expect(dispArtifact.content).toContain("await import");
        expect(dispArtifact.content).toContain("break;");
      }
    });

    it("schema artifact uses Zod", async () => {
      const plan = await autoWiringEngine.analyze("AutoWiringEngine.ts");
      const schemaArtifact = plan.artifacts.find(a => a.artifact_type === "schema");
      if (schemaArtifact) {
        expect(schemaArtifact.content).toContain("z.object");
      }
    });

    it("test_scaffold artifact has vitest structure", async () => {
      const plan = await autoWiringEngine.analyze("AutoWiringEngine.ts");
      const testArtifact = plan.artifacts.find(a => a.artifact_type === "test_scaffold");
      if (testArtifact) {
        expect(testArtifact.content).toContain("describe");
        expect(testArtifact.content).toContain("vitest");
        expect(testArtifact.content).toContain("expect");
      }
    });
  });

  describe("scanAll() — single engine subset", () => {
    it("analyze returns gaps array and artifacts array for any engine", async () => {
      // Test scan logic on a single known engine instead of all 1284
      const plan = await autoWiringEngine.analyze("AutoWiringEngine.ts");
      expect(plan.gaps).toBeInstanceOf(Array);
      for (const gap of plan.gaps) {
        expect(gap.description.length).toBeGreaterThan(0);
        expect(["W:export", "W:dispatcher", "W:schema", "T:test"]).toContain(gap.dimension);
        expect(typeof gap.fix_available).toBe("boolean");
      }
    });

    it("reports fix_available=true for all detectable gaps", async () => {
      const plan = await autoWiringEngine.analyze("AutoWiringEngine.ts");
      for (const gap of plan.gaps) {
        expect(gap.fix_available).toBe(true);
      }
    });

    it("artifact count matches gap count", async () => {
      const plan = await autoWiringEngine.analyze("AutoWiringEngine.ts");
      expect(plan.artifacts.length).toBe(plan.gaps.length);
    });
  });

  describe("edge cases", () => {
    it("handles engine with no public methods", async () => {
      // EventBus has mostly internal patterns
      const plan = await autoWiringEngine.analyze("EventBus.ts");
      expect(plan).toBeDefined();
      expect(plan.engine.public_methods).toBeInstanceOf(Array);
    });

    it("handles engine with many methods", async () => {
      // SpeedFeedOrchestratorEngine has many methods (2851 LOC)
      const plan = await autoWiringEngine.analyze("SpeedFeedOrchestratorEngine.ts");
      expect(plan.engine.public_methods.length).toBeGreaterThan(0);
      expect(plan.engine.line_count).toBeGreaterThan(1000);
    });

    it("detects physics engine imports", async () => {
      // StockSizeOptimizerEngine imports from physics/constants
      const plan = await autoWiringEngine.analyze("StockSizeOptimizerEngine.ts");
      expect(plan.engine.imports_physics).toBe(true);
    });

    it("non-physics engine has imports_physics=false", async () => {
      const plan = await autoWiringEngine.analyze("CustomerManagementEngine.ts");
      expect(plan.engine.imports_physics).toBe(false);
    });
  });
});
