/**
 * PPGRAGDialectMatchEngine Tests — U-PPG-SFC-08
 * ==============================================
 *
 * Tests for nearest-prior post retrieval by controller fingerprint.
 * Validates:
 * - Controller normalization and dialect lookup
 * - Program retrieval from JMDieProgramRAGEngine
 * - Tribal tip retrieval from TribalRAGEngine
 * - Citation generation for provenance
 * - Edge cases and error handling
 *
 * @module tests/engines/ppgRAGDialectMatchEngine.test
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  PPGRAGDialectMatchEngine,
  PPGRAGDialectMatchInputSchema,
  ProgramPriorSchema,
  DialectTipSchema,
  DialectInfoSchema,
  PPGRAGDialectMatchOutputSchema,
  type PPGRAGDialectMatchInput,
  type PPGRAGDialectMatchOutput,
} from "../../engines/PPGRAGDialectMatchEngine.js";

describe("PPGRAGDialectMatchEngine", () => {
  describe("Schema Validation", () => {
    it("should validate minimal input with just controller", () => {
      const input = { controller: "Fanuc 31i" };
      const result = PPGRAGDialectMatchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.controller).toBe("Fanuc 31i");
        expect(result.data.top_k_programs).toBe(5); // default
        expect(result.data.top_k_tips).toBe(5); // default
        expect(result.data.min_score).toBe(0.2); // default
      }
    });

    it("should validate full input with all fields", () => {
      const input: PPGRAGDialectMatchInput = {
        controller: "Siemens 840D",
        machine_type: "mill",
        machine_id: "DMG-DMU50",
        material: "Aluminum 6061",
        operation: "finish",
        customer: "ALCOA",
        top_k_programs: 10,
        top_k_tips: 8,
        min_score: 0.3,
      };
      const result = PPGRAGDialectMatchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject empty controller", () => {
      const input = { controller: "" };
      const result = PPGRAGDialectMatchInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject invalid machine_type", () => {
      const input = { controller: "Fanuc", machine_type: "invalid_type" };
      const result = PPGRAGDialectMatchInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept all valid machine types", () => {
      const machineTypes = ["lathe", "mill", "wire_edm", "sinker_edm", "grinder", "mill_turn", "swiss", "5axis", "unknown"];
      for (const mt of machineTypes) {
        const result = PPGRAGDialectMatchInputSchema.safeParse({ controller: "Fanuc", machine_type: mt });
        expect(result.success).toBe(true);
      }
    });

    it("should clamp top_k_programs to valid range", () => {
      // min 1
      const minResult = PPGRAGDialectMatchInputSchema.safeParse({ controller: "Fanuc", top_k_programs: 0 });
      expect(minResult.success).toBe(false);

      // max 10
      const maxResult = PPGRAGDialectMatchInputSchema.safeParse({ controller: "Fanuc", top_k_programs: 20 });
      expect(maxResult.success).toBe(false);

      // valid
      const validResult = PPGRAGDialectMatchInputSchema.safeParse({ controller: "Fanuc", top_k_programs: 5 });
      expect(validResult.success).toBe(true);
    });
  });

  describe("Output Schema Validation", () => {
    it("should validate ProgramPriorSchema", () => {
      const prior = {
        program_id: "JM_DIE/ALCOA/prog001.nc",
        program_number: "O0001",
        similarity: 0.85,
        raw_score: 12.5,
        controller_match: true,
        machine_match: true,
        material_match: false,
        customer: "ALCOA",
        operation_types: ["rough", "finish"],
        tool_count: 5,
        excerpt: "G0 G90 G54 X0 Y0",
      };
      const result = ProgramPriorSchema.safeParse(prior);
      expect(result.success).toBe(true);
    });

    it("should validate DialectTipSchema", () => {
      const tip = {
        tip_id: "tip_001",
        title: "Okuma OSP M9 requirement",
        body: "Okuma OSP requires explicit M9 before tool change on this machine vintage",
        severity: "warning" as const,
        similarity: 0.9,
        controller_specific: true,
        tags: ["okuma", "tool_change", "coolant"],
      };
      const result = DialectTipSchema.safeParse(tip);
      expect(result.success).toBe(true);
    });

    it("should validate DialectInfoSchema", () => {
      const dialectInfo = {
        controller_family: "fanuc",
        dialect_found: true,
        arc_format: "ijk_incremental",
        comment_style: "parentheses",
        canned_cycles_supported: true,
        hsc_mode_available: true,
        tcpc_available: false,
      };
      const result = DialectInfoSchema.safeParse(dialectInfo);
      expect(result.success).toBe(true);
    });
  });

  describe("Controller Normalization", () => {
    it("should normalize Fanuc variants", () => {
      const variants = ["Fanuc", "FANUC", "fanuc_31i", "Fanuc 30i", "GE_Fanuc"];
      for (const controller of variants) {
        const result = PPGRAGDialectMatchEngine.match({ controller });
        expect(result.ok).toBe(true);
        expect(result.controller_normalized).toBe("fanuc");
      }
    });

    it("should normalize Okuma variants", () => {
      const variants = ["Okuma", "OKUMA", "OSP", "osp_p300", "OSP-P500"];
      for (const controller of variants) {
        const result = PPGRAGDialectMatchEngine.match({ controller });
        expect(result.ok).toBe(true);
        expect(result.controller_normalized).toBe("okuma");
      }
    });

    it("should normalize Siemens variants", () => {
      const variants = ["Siemens", "SIEMENS", "Sinumerik", "840D", "828d"];
      for (const controller of variants) {
        const result = PPGRAGDialectMatchEngine.match({ controller });
        expect(result.ok).toBe(true);
        expect(result.controller_normalized).toBe("siemens");
      }
    });

    it("should normalize Heidenhain variants", () => {
      const variants = ["Heidenhain", "heidenhain", "TNC", "tnc640"];
      for (const controller of variants) {
        const result = PPGRAGDialectMatchEngine.match({ controller });
        expect(result.ok).toBe(true);
        expect(result.controller_normalized).toBe("heidenhain");
      }
    });

    it("should normalize Mazak variants", () => {
      const variants = ["Mazak", "MAZAK", "Mazatrol", "smooth"];
      for (const controller of variants) {
        const result = PPGRAGDialectMatchEngine.match({ controller });
        expect(result.ok).toBe(true);
        expect(result.controller_normalized).toBe("mazak");
      }
    });

    it("should pass through unknown controllers", () => {
      const result = PPGRAGDialectMatchEngine.match({ controller: "CustomController123" });
      expect(result.ok).toBe(true);
      expect(result.controller_normalized).toBe("customcontroller123");
    });
  });

  describe("match() Basic Functionality", () => {
    it("should return ok=true for valid input", () => {
      const result = PPGRAGDialectMatchEngine.match({
        controller: "Fanuc 31i",
        machine_type: "mill",
      });
      expect(result.ok).toBe(true);
      expect(result.controller_normalized).toBe("fanuc");
    });

    it("should return dialect_info for known controller", () => {
      const result = PPGRAGDialectMatchEngine.match({
        controller: "Fanuc 31i",
      });
      expect(result.ok).toBe(true);
      expect(result.dialect_info.controller_family).toBe("fanuc");
      // Dialect may or may not be found depending on index state
    });

    it("should return program_priors array (may be empty if no index)", () => {
      const result = PPGRAGDialectMatchEngine.match({
        controller: "Okuma OSP-P300",
        material: "D2",
        machine_type: "lathe",
      });
      expect(result.ok).toBe(true);
      expect(Array.isArray(result.program_priors)).toBe(true);
    });

    it("should return dialect_tips array (may be empty if no index)", () => {
      const result = PPGRAGDialectMatchEngine.match({
        controller: "Siemens 840D",
        operation: "finish",
      });
      expect(result.ok).toBe(true);
      expect(Array.isArray(result.dialect_tips)).toBe(true);
    });

    it("should return citations array", () => {
      const result = PPGRAGDialectMatchEngine.match({
        controller: "Haas NGC",
      });
      expect(result.ok).toBe(true);
      expect(Array.isArray(result.citations)).toBe(true);
    });

    it("should include search_time_ms", () => {
      const result = PPGRAGDialectMatchEngine.match({
        controller: "Fanuc",
      });
      expect(typeof result.search_time_ms).toBe("number");
      expect(result.search_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error Handling", () => {
    it("should return ok=false for invalid input", () => {
      // Force invalid input by bypassing schema
      const result = PPGRAGDialectMatchEngine.match({
        controller: "",
      } as PPGRAGDialectMatchInput);
      expect(result.ok).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should handle missing RAG indexes gracefully", () => {
      // This tests graceful degradation when indexes aren't loaded
      const result = PPGRAGDialectMatchEngine.match({
        controller: "Fanuc 31i",
        material: "Inconel 718",
      });
      expect(result.ok).toBe(true);
      // Should not throw, even if indexes are empty
    });
  });

  describe("Citation Generation", () => {
    it("should generate program citations with correct source_type", () => {
      const result = PPGRAGDialectMatchEngine.match({
        controller: "Fanuc",
        material: "4140",
      });
      const programCitations = result.citations.filter(c => c.source_type === "program");
      for (const citation of programCitations) {
        expect(citation.source_type).toBe("program");
        expect(citation.corpus).toBe("jm_die_programs");
        expect(citation.engine).toBe("PPGRAGDialectMatchEngine");
      }
    });

    it("should generate tribal_tip citations with correct source_type", () => {
      const result = PPGRAGDialectMatchEngine.match({
        controller: "Okuma",
      });
      const tipCitations = result.citations.filter(c => c.source_type === "tribal_tip");
      for (const citation of tipCitations) {
        expect(citation.source_type).toBe("tribal_tip");
        expect(citation.corpus).toBe("tribal_tips");
        expect(citation.engine).toBe("PPGRAGDialectMatchEngine");
      }
    });
  });

  describe("Output Schema Conformance", () => {
    it("should produce output conforming to PPGRAGDialectMatchOutputSchema", () => {
      const result = PPGRAGDialectMatchEngine.match({
        controller: "Fanuc 31i",
        machine_type: "mill",
        material: "Aluminum",
      });
      const validation = PPGRAGDialectMatchOutputSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });
  });

  describe("areIndexesReady()", () => {
    it("should return status for both programs and tips indexes", () => {
      const status = PPGRAGDialectMatchEngine.areIndexesReady();
      expect(typeof status.programs).toBe("boolean");
      expect(typeof status.tips).toBe("boolean");
    });
  });

  describe("getIndexStats()", () => {
    it("should return null or valid stats for programs", () => {
      const stats = PPGRAGDialectMatchEngine.getIndexStats();
      if (stats.programs !== null) {
        expect(typeof stats.programs.total).toBe("number");
        expect(typeof stats.programs.per_controller).toBe("object");
      }
    });

    it("should return null or valid stats for tips", () => {
      const stats = PPGRAGDialectMatchEngine.getIndexStats();
      if (stats.tips !== null) {
        expect(typeof stats.tips.total).toBe("number");
        expect(typeof stats.tips.per_domain).toBe("object");
      }
    });
  });

  describe("getSelfAwareness()", () => {
    it("should return valid self-awareness metadata", () => {
      const awareness = PPGRAGDialectMatchEngine.getSelfAwareness();
      expect(awareness.name).toBe("PPGRAGDialectMatchEngine");
      expect(awareness.version).toBe("1.0.0");
      expect(awareness.milestone).toBe("PSAU-PPG-SFC U-PPG-SFC-08");
      expect(Array.isArray(awareness.capabilities)).toBe(true);
      expect(awareness.capabilities).toContain("match");
      expect(awareness.capabilities).toContain("areIndexesReady");
      expect(awareness.capabilities).toContain("getIndexStats");
      expect(Array.isArray(awareness.dependencies)).toBe(true);
      expect(awareness.latency_target_ms).toBe(300);
    });
  });

  describe("Machine Type Handling", () => {
    it("should handle 5axis as mill for matching", () => {
      const result = PPGRAGDialectMatchEngine.match({
        controller: "Siemens 840D",
        machine_type: "5axis",
      });
      expect(result.ok).toBe(true);
      // 5axis should be treated as mill internally
    });

    it("should handle all valid machine types", () => {
      const machineTypes = ["lathe", "mill", "wire_edm", "sinker_edm", "grinder", "mill_turn", "swiss", "5axis", "unknown"] as const;
      for (const mt of machineTypes) {
        const result = PPGRAGDialectMatchEngine.match({
          controller: "Fanuc",
          machine_type: mt,
        });
        expect(result.ok).toBe(true);
      }
    });
  });

  describe("Performance", () => {
    it("should complete within reasonable time", () => {
      const start = performance.now();
      PPGRAGDialectMatchEngine.match({
        controller: "Fanuc 31i",
        machine_type: "mill",
        material: "4140",
        operation: "rough",
      });
      const elapsed = performance.now() - start;
      // Allow up to 1000ms for test environment (actual target is 300ms)
      expect(elapsed).toBeLessThan(1000);
    });

    it("should warn if latency exceeds target", () => {
      // This test just verifies the warning mechanism exists
      // Actual latency depends on index size and system load
      const result = PPGRAGDialectMatchEngine.match({
        controller: "Fanuc",
      });
      expect(Array.isArray(result.warnings)).toBe(true);
      // If latency warning exists, it should mention the target
      const latencyWarning = result.warnings.find(w => w.includes("latency"));
      if (latencyWarning) {
        expect(latencyWarning).toContain("300ms");
      }
    });
  });
});
