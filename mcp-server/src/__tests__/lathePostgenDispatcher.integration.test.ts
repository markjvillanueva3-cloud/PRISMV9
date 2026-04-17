/**
 * Lathe Post-Generator Dispatcher Integration Tests — LATHE-MASTER U-LTH23
 *
 * Tests 8 lathe_postgen_* actions wired through camDispatcher.
 * Verifies action names in ACTIONS list and schema registration.
 */

import { describe, it, expect } from "vitest";
import { ACTIONS } from "../tools/dispatchers/camDispatcher.js";
import { LathePostKnowledgeGraphEngine } from "../engines/LathePostKnowledgeGraphEngine.js";
import { LathePostGeneratorActiveLearningEngine } from "../engines/LathePostGeneratorActiveLearningEngine.js";
import { LathePostGeneratorUncertaintyEngine } from "../engines/LathePostGeneratorUncertaintyEngine.js";
import { LathePostGeneratorValidatorWiringEngine } from "../engines/LathePostGeneratorValidatorWiringEngine.js";
import { LathePostRegressionTestGeneratorEngine } from "../engines/LathePostRegressionTestGeneratorEngine.js";

describe("lathe_postgen_* dispatcher wiring (U-LTH23)", () => {
  // ── Action Registration ───────────────────────────────────────────────────

  describe("action registration in camDispatcher ACTIONS", () => {
    const POSTGEN_ACTIONS = [
      "lathe_postgen_ingest",
      "lathe_postgen_skeleton",
      "lathe_postgen_transfer",
      "lathe_postgen_validate",
      "lathe_postgen_test",
      "lathe_postgen_register",
      "lathe_postgen_feedback",
      "lathe_postgen_uncertainty",
    ];

    it("has all 8 lathe_postgen_* actions registered", () => {
      for (const action of POSTGEN_ACTIONS) {
        expect(ACTIONS).toContain(action);
      }
    });

    it("has exactly 8 lathe_postgen_* actions", () => {
      const postgenActions = ACTIONS.filter((a: string) => a.startsWith("lathe_postgen_"));
      expect(postgenActions.length).toBe(8);
    });

    it("lathe_postgen_ingest is in ACTIONS", () => {
      expect(ACTIONS).toContain("lathe_postgen_ingest");
    });

    it("lathe_postgen_skeleton is in ACTIONS", () => {
      expect(ACTIONS).toContain("lathe_postgen_skeleton");
    });

    it("lathe_postgen_transfer is in ACTIONS", () => {
      expect(ACTIONS).toContain("lathe_postgen_transfer");
    });

    it("lathe_postgen_validate is in ACTIONS", () => {
      expect(ACTIONS).toContain("lathe_postgen_validate");
    });

    it("lathe_postgen_test is in ACTIONS", () => {
      expect(ACTIONS).toContain("lathe_postgen_test");
    });

    it("lathe_postgen_register is in ACTIONS", () => {
      expect(ACTIONS).toContain("lathe_postgen_register");
    });

    it("lathe_postgen_feedback is in ACTIONS", () => {
      expect(ACTIONS).toContain("lathe_postgen_feedback");
    });

    it("lathe_postgen_uncertainty is in ACTIONS", () => {
      expect(ACTIONS).toContain("lathe_postgen_uncertainty");
    });
  });

  // ── Engine Import Verification ────────────────────────────────────────────

  describe("engine imports (lazy load targets exist)", () => {
    it("LathePostGeneratorSpecIngestEngine is importable", async () => {
      const mod = await import("../engines/LathePostGeneratorSpecIngestEngine.js");
      expect(mod.LathePostGeneratorSpecIngestEngine).toBeDefined();
    });

    it("LathePostGeneratorDialectEngine is importable", async () => {
      const mod = await import("../engines/LathePostGeneratorDialectEngine.js");
      expect(mod.LathePostGeneratorDialectEngine).toBeDefined();
    });

    it("LatheSwissPostGeneratorEngine is importable", async () => {
      const mod = await import("../engines/LatheSwissPostGeneratorEngine.js");
      expect(mod.LatheSwissPostGeneratorEngine).toBeDefined();
    });

    it("LathePostGeneratorValidatorWiringEngine is importable", async () => {
      const mod = await import("../engines/LathePostGeneratorValidatorWiringEngine.js");
      expect(mod.LathePostGeneratorValidatorWiringEngine).toBeDefined();
    });

    it("LathePostRegressionTestGeneratorEngine is importable", async () => {
      const mod = await import("../engines/LathePostRegressionTestGeneratorEngine.js");
      expect(mod.LathePostRegressionTestGeneratorEngine).toBeDefined();
    });

    it("LathePostKnowledgeGraphEngine is importable", async () => {
      const mod = await import("../engines/LathePostKnowledgeGraphEngine.js");
      expect(mod.LathePostKnowledgeGraphEngine).toBeDefined();
    });

    it("LathePostGeneratorActiveLearningEngine is importable", async () => {
      const mod = await import("../engines/LathePostGeneratorActiveLearningEngine.js");
      expect(mod.LathePostGeneratorActiveLearningEngine).toBeDefined();
    });

    it("LathePostGeneratorUncertaintyEngine is importable", async () => {
      const mod = await import("../engines/LathePostGeneratorUncertaintyEngine.js");
      expect(mod.LathePostGeneratorUncertaintyEngine).toBeDefined();
    });
  });

  // ── lathe_postgen_register (LathePostKnowledgeGraphEngine) ────────────────

  describe("lathe_postgen_register engine (direct call)", () => {
    it("gets controller cycles", () => {
      const engine = new LathePostKnowledgeGraphEngine();
      const cycles = engine.getControllerCycles("fanuc-31it");

      expect(cycles).toBeDefined();
      expect(Array.isArray(cycles)).toBe(true);
      expect(cycles.some(c => c.label === "G71")).toBe(true);
    });

    it("gets controller features", () => {
      const engine = new LathePostKnowledgeGraphEngine();
      const features = engine.getControllerFeatures("citizen-cincom-m32");

      expect(features).toBeDefined();
      expect(features.some(f => f.label === "guide_bushing")).toBe(true);
    });

    it("infers controller properties", () => {
      const engine = new LathePostKnowledgeGraphEngine();
      const inference = engine.inferControllerProperties("Fanuc", ["c_axis"]);

      expect(inference.suggestedDialect).toBe("fanuc");
      expect(inference.confidence).toBeGreaterThan(0.5);
    });
  });

  // ── lathe_postgen_uncertainty (LathePostGeneratorUncertaintyEngine) ───────

  describe("lathe_postgen_uncertainty engine (direct call)", () => {
    it("analyzes single block uncertainty", () => {
      const engine = new LathePostGeneratorUncertaintyEngine();
      const block = engine.analyzeBlock("G71 U2.0 R1.0 P100 Q200", 15);

      expect(block.confidence).toBeGreaterThan(0);
      expect(block.category).toBe("cycle");
      expect(block.risk_level).toBeDefined();
    });

    it("analyzes full program uncertainty", () => {
      const engine = new LathePostGeneratorUncertaintyEngine();
      const gcode = ["G28 U0 W0", "T0101", "S1500 M03", "G00 X50.0 Z5.0", "G01 X25.0 F0.2", "M30"];
      const program = engine.analyzeProgram(gcode, "TEST", "fanuc");

      expect(program.overall_confidence).toBeGreaterThan(0);
      expect(program.risk_distribution).toBeDefined();
      expect(program.total_blocks).toBe(6);
    });

    it("checks production readiness", () => {
      const engine = new LathePostGeneratorUncertaintyEngine();
      const result = engine.isProductionReady(["G28 U0 W0", "T0101", "M30"]);

      expect(typeof result.ready).toBe("boolean");
      expect(Array.isArray(result.blockers)).toBe(true);
    });
  });

  // ── lathe_postgen_validate (LathePostGeneratorValidatorWiringEngine) ──────

  describe("lathe_postgen_validate engine (direct call)", () => {
    it("engine class is defined", () => {
      expect(LathePostGeneratorValidatorWiringEngine).toBeDefined();
    });

    it("has static wireValidators method", () => {
      expect(typeof LathePostGeneratorValidatorWiringEngine.wireValidators).toBe("function");
    });

    it("has static validateProgram method", () => {
      expect(typeof LathePostGeneratorValidatorWiringEngine.validateProgram).toBe("function");
    });

    it("has static listValidators method", () => {
      const validators = LathePostGeneratorValidatorWiringEngine.listValidators();
      expect(validators.length).toBeGreaterThan(0);
    });
  });

  // ── lathe_postgen_test (LathePostRegressionTestGeneratorEngine) ───────────

  describe("lathe_postgen_test engine (direct call)", () => {
    it("engine class is defined", () => {
      expect(LathePostRegressionTestGeneratorEngine).toBeDefined();
    });

    it("has static generateTest method", () => {
      expect(typeof LathePostRegressionTestGeneratorEngine.generateTest).toBe("function");
    });

    it("generates test for a simple program", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: ["%", "O1234", "G28 U0 W0", "M30", "%"],
        program_id: "O1234",
        controller: "fanuc",
      });
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
      expect(result.patterns_found).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Schema Validation ─────────────────────────────────────────────────────

  describe("schema validation", () => {
    it("imports schema without errors", async () => {
      const schemas = await import("../schemas/lathePostgenActionSchemas.js");

      expect(schemas.ACTION_LATHE_POSTGEN_SCHEMAS).toBeDefined();
      expect(schemas.ACTION_LATHE_POSTGEN_SCHEMAS.lathe_postgen_ingest).toBeDefined();
      expect(schemas.ACTION_LATHE_POSTGEN_SCHEMAS.lathe_postgen_uncertainty).toBeDefined();
    });

    it("has 8 action schemas", async () => {
      const schemas = await import("../schemas/lathePostgenActionSchemas.js");
      const actionCount = Object.keys(schemas.ACTION_LATHE_POSTGEN_SCHEMAS).length;

      expect(actionCount).toBe(8);
    });
  });
});
