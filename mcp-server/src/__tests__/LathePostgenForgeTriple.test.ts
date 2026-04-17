/**
 * LathePostgenForgeTriple Tests — LATHE-MASTER U-LTH24
 *
 * Tests the forge-triple deliverables:
 * 1. PostgenValidatorSkipGuardHook
 * 2. prism_lathe:postgen_full action
 * 3. /lathe-postgen skill (file existence)
 */

import { describe, it, expect } from "vitest";
import { PostgenValidatorSkipGuardHook } from "../hooks/PostgenValidatorSkipGuardHook.js";
import * as fs from "fs";
import * as path from "path";

// Read dispatcher source to verify action registration
const turningDispatcherPath = path.join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts");
const turningDispatcherSource = fs.readFileSync(turningDispatcherPath, "utf-8");

describe("U-LTH24: Forge-Triple for Post-Processor Generator", () => {
  // ── Hook Tests ────────────────────────────────────────────────────────────

  describe("PostgenValidatorSkipGuardHook", () => {
    describe("validate", () => {
      it("allows skipping non-critical categories", () => {
        const result = PostgenValidatorSkipGuardHook.validate({
          controller: "fanuc-31it",
          skip_categories: ["syntax", "modal_state"],
        });

        expect(result.allowed).toBe(true);
        expect(result.blocked_categories.length).toBe(0);
        expect(result.safety_score).toBe(1);
      });

      it("blocks skipping critical categories without override", () => {
        const result = PostgenValidatorSkipGuardHook.validate({
          controller: "fanuc-31it",
          skip_categories: ["safety", "physics"],
        });

        expect(result.allowed).toBe(false);
        expect(result.blocked_categories).toContain("safety");
        expect(result.blocked_categories).toContain("physics");
        expect(result.safety_score).toBe(0);
      });

      it("allows critical skip with override but adds warning", () => {
        const result = PostgenValidatorSkipGuardHook.validate({
          controller: "fanuc-31it",
          skip_categories: ["safety"],
          override_safety: true,
        });

        expect(result.allowed).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.requires_approval).toBe(true);
        expect(result.safety_score).toBeLessThan(1);
      });

      it("blocks critical validators without override", () => {
        const result = PostgenValidatorSkipGuardHook.validate({
          controller: "fanuc-31it",
          skip_validators: ["pp_safety_rapid_to_cut", "pp_physics_feedrate_limits"],
        });

        expect(result.allowed).toBe(false);
        expect(result.blocked_validators.length).toBe(2);
      });

      it("allows non-critical validator skip", () => {
        const result = PostgenValidatorSkipGuardHook.validate({
          controller: "fanuc-31it",
          skip_validators: ["pp_syntax_comments"],
        });

        expect(result.allowed).toBe(true);
      });
    });

    describe("canSkipCategory", () => {
      it("returns true for soft-skip categories", () => {
        expect(PostgenValidatorSkipGuardHook.canSkipCategory("syntax")).toBe(true);
        expect(PostgenValidatorSkipGuardHook.canSkipCategory("modal_state")).toBe(true);
      });

      it("returns false for critical categories", () => {
        expect(PostgenValidatorSkipGuardHook.canSkipCategory("safety")).toBe(false);
        expect(PostgenValidatorSkipGuardHook.canSkipCategory("physics")).toBe(false);
        expect(PostgenValidatorSkipGuardHook.canSkipCategory("kinematics")).toBe(false);
      });
    });

    describe("canSkipValidator", () => {
      it("returns false for critical validators", () => {
        expect(PostgenValidatorSkipGuardHook.canSkipValidator("pp_safety_rapid_to_cut")).toBe(false);
        expect(PostgenValidatorSkipGuardHook.canSkipValidator("pp_physics_feedrate_limits")).toBe(false);
      });

      it("returns true for non-critical validators", () => {
        expect(PostgenValidatorSkipGuardHook.canSkipValidator("pp_custom_comment")).toBe(true);
      });
    });

    describe("getCriticalCategories", () => {
      it("returns critical category list", () => {
        const categories = PostgenValidatorSkipGuardHook.getCriticalCategories();

        expect(categories).toContain("safety");
        expect(categories).toContain("physics");
        expect(categories).toContain("kinematics");
        expect(categories.length).toBe(3);
      });
    });

    describe("getCriticalValidators", () => {
      it("returns critical validator list", () => {
        const validators = PostgenValidatorSkipGuardHook.getCriticalValidators();

        expect(validators.length).toBeGreaterThan(0);
        expect(validators).toContain("pp_safety_rapid_to_cut");
        expect(validators).toContain("pp_physics_feedrate_limits");
      });
    });

    describe("getSoftSkipCategories", () => {
      it("returns soft-skip category list", () => {
        const categories = PostgenValidatorSkipGuardHook.getSoftSkipCategories();

        expect(categories).toContain("syntax");
        expect(categories).toContain("program_structure");
        expect(categories).toContain("modal_state");
      });
    });

    describe("preflight", () => {
      it("proceeds with no skips", () => {
        const result = PostgenValidatorSkipGuardHook.preflight({
          controller: "fanuc-31it",
        });

        expect(result.proceed).toBe(true);
        expect(result.message).toContain("All validators enabled");
      });

      it("blocks critical skip without override", () => {
        const result = PostgenValidatorSkipGuardHook.preflight({
          controller: "fanuc-31it",
          skip_categories: ["safety"],
        });

        expect(result.proceed).toBe(false);
        expect(result.message).toContain("Blocked");
      });

      it("warns with override", () => {
        const result = PostgenValidatorSkipGuardHook.preflight({
          controller: "fanuc-31it",
          skip_categories: ["safety"],
          override_safety: true,
        });

        expect(result.proceed).toBe(true);
        expect(result.message).toContain("Warning");
        expect(result.result.requires_approval).toBe(true);
      });
    });

    describe("getVersion", () => {
      it("returns version string", () => {
        expect(PostgenValidatorSkipGuardHook.getVersion()).toBe("1.0.0");
      });
    });
  });

  // ── Action Tests ──────────────────────────────────────────────────────────

  describe("postgen_full action", () => {
    it("is registered in turningDispatcher ACTIONS array", () => {
      expect(turningDispatcherSource).toContain('"postgen_full"');
    });

    it("has a case handler in the dispatcher", () => {
      expect(turningDispatcherSource).toContain('case "postgen_full"');
    });
  });

  // ── Skill Tests ───────────────────────────────────────────────────────────

  describe("/lathe-postgen skill", () => {
    const skillPath = path.join("H:", ".claude", "commands", "lathe-postgen.md");

    it("skill file exists", () => {
      expect(fs.existsSync(skillPath)).toBe(true);
    });

    it("skill file contains expected sections", () => {
      const content = fs.readFileSync(skillPath, "utf-8");

      expect(content).toContain("# /lathe-postgen");
      expect(content).toContain("## Usage");
      expect(content).toContain("## Workflow");
      expect(content).toContain("## Options");
      expect(content).toContain("## Safety");
      expect(content).toContain("LATHE-MASTER U-LTH24");
    });

    it("skill documents all 8 pipeline stages", () => {
      const content = fs.readFileSync(skillPath, "utf-8");

      expect(content).toContain("lathe_postgen_ingest");
      expect(content).toContain("lathe_postgen_skeleton");
      expect(content).toContain("lathe_postgen_transfer");
      expect(content).toContain("lathe_postgen_validate");
      expect(content).toContain("lathe_postgen_test");
      expect(content).toContain("lathe_postgen_register");
      expect(content).toContain("lathe_postgen_uncertainty");
      expect(content).toContain("lathe_postgen_feedback");
    });
  });

  // ── Integration Tests ─────────────────────────────────────────────────────

  describe("forge-triple integration", () => {
    it("hook is importable", async () => {
      const mod = await import("../hooks/PostgenValidatorSkipGuardHook.js");
      expect(mod.PostgenValidatorSkipGuardHook).toBeDefined();
      expect(mod.postgenValidatorSkipGuardHook).toBeDefined();
    });

    it("all required engines are importable", async () => {
      const engines = [
        "../engines/LathePostGeneratorSpecIngestEngine.js",
        "../engines/LathePostGeneratorDialectEngine.js",
        "../engines/LatheSwissPostGeneratorEngine.js",
        "../engines/LathePostGeneratorValidatorWiringEngine.js",
        "../engines/LathePostRegressionTestGeneratorEngine.js",
        "../engines/LathePostKnowledgeGraphEngine.js",
        "../engines/LathePostGeneratorActiveLearningEngine.js",
        "../engines/LathePostGeneratorUncertaintyEngine.js",
      ];

      for (const enginePath of engines) {
        const mod = await import(enginePath);
        expect(Object.keys(mod).length).toBeGreaterThan(0);
      }
    });

    it("postgen_full action is wired in turningDispatcher", () => {
      const hasAction = turningDispatcherSource.includes('"postgen_full"');
      const hasCase = turningDispatcherSource.includes('case "postgen_full"');
      expect(hasAction && hasCase).toBe(true);
    });
  });

  // ── Safety Score Tests ────────────────────────────────────────────────────

  describe("safety scoring", () => {
    it("full skip without override gives score 0", () => {
      const result = PostgenValidatorSkipGuardHook.validate({
        controller: "test",
        skip_categories: ["safety", "physics", "kinematics"],
      });

      expect(result.safety_score).toBe(0);
    });

    it("partial skip with override gives reduced score", () => {
      const result = PostgenValidatorSkipGuardHook.validate({
        controller: "test",
        skip_categories: ["safety"],
        override_safety: true,
      });

      expect(result.safety_score).toBeGreaterThan(0.3);
      expect(result.safety_score).toBeLessThan(1);
    });

    it("no skip gives score 1", () => {
      const result = PostgenValidatorSkipGuardHook.validate({
        controller: "test",
      });

      expect(result.safety_score).toBe(1);
    });
  });
});
