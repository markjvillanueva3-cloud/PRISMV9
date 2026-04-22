/**
 * jm-die-provenance-guard.test.ts — CAM-UIX-INFRA-00/U-JMDP01
 *
 * Tests for the JM Die provenance guard hook that enforces
 * source_quality tagging on JM Die program ingestion records.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const VALID_SOURCE_QUALITY = "empirical_shop_reality_unoptimized";

interface ValidationResult {
  errors: string[];
  warnings: string[];
  hasJmDieRef: boolean;
  sourceQuality: string | null;
}

function validateIngestionContent(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const JMDIE_SOURCE_PATTERNS = [
    /H:[/\\]prism[/\\]JM DIE[/\\]/i,
    /JM[\s_-]?DIE/i,
    /resources[/\\].*[/\\]JMDie[/\\]/i,
    /jm_die_program/i,
    /jmdie/i,
  ];

  const INVALID_CLAIMS = [
    "vendor_published_recommended",
    "physics_derived_canonical",
    "benchmark_competition",
    "ground_truth_labeled",
  ];

  const sourceQualityMatch = content.match(/"source_quality"\s*:\s*"([^"]+)"/);
  const sourceQuality = sourceQualityMatch ? sourceQualityMatch[1] : null;

  const hasJmDieRef = JMDIE_SOURCE_PATTERNS.some((re) => re.test(content));

  if (hasJmDieRef) {
    if (!sourceQuality) {
      warnings.push(`JMDie-sourced record missing source_quality field`);
    } else if (sourceQuality !== VALID_SOURCE_QUALITY) {
      if (INVALID_CLAIMS.includes(sourceQuality)) {
        errors.push(
          `PROVENANCE VIOLATION: JMDie-sourced record claims source_quality='${sourceQuality}'`
        );
      } else {
        warnings.push(`JMDie-sourced record has unexpected source_quality='${sourceQuality}'`);
      }
    }

    if (!content.includes('"optimization_status"')) {
      warnings.push("JMDie-sourced record missing optimization_status");
    }
  }

  return { errors, warnings, hasJmDieRef, sourceQuality };
}

describe("jm-die-provenance-guard", () => {
  describe("JM Die source detection", () => {
    it("detects H:/prism/JM DIE/ path references", () => {
      const content = JSON.stringify({
        sourcePath: "H:/prism/JM DIE/ALCOA/part123.MIN",
        source_quality: VALID_SOURCE_QUALITY,
        optimization_status: "unoptimized_shop_baseline",
      });
      const result = validateIngestionContent(content);
      expect(result.hasJmDieRef).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("detects jm_die_program reference", () => {
      const content = JSON.stringify({
        type: "jm_die_program",
        source_quality: VALID_SOURCE_QUALITY,
      });
      const result = validateIngestionContent(content);
      expect(result.hasJmDieRef).toBe(true);
    });

    it("detects JM-DIE hyphenated reference", () => {
      const content = JSON.stringify({
        customer: "JM-DIE",
        source_quality: VALID_SOURCE_QUALITY,
      });
      const result = validateIngestionContent(content);
      expect(result.hasJmDieRef).toBe(true);
    });

    it("does not flag non-JM Die content", () => {
      const content = JSON.stringify({
        sourcePath: "H:/prism/resources/mastercam-tips.json",
        source_quality: "vendor_published_recommended",
      });
      const result = validateIngestionContent(content);
      expect(result.hasJmDieRef).toBe(false);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("source_quality validation", () => {
    it("accepts valid source_quality for JM Die records", () => {
      const content = JSON.stringify({
        sourcePath: "H:/prism/JM DIE/ITW/prog001.MIN",
        source_quality: "empirical_shop_reality_unoptimized",
        optimization_status: "unoptimized_shop_baseline",
      });
      const result = validateIngestionContent(content);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("blocks vendor_published_recommended claim for JM Die data", () => {
      const content = JSON.stringify({
        sourcePath: "H:/prism/JM DIE/ALCOA/part456.MIN",
        source_quality: "vendor_published_recommended",
      });
      const result = validateIngestionContent(content);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("PROVENANCE VIOLATION");
      expect(result.errors[0]).toContain("vendor_published_recommended");
    });

    it("blocks physics_derived_canonical claim for JM Die data", () => {
      const content = JSON.stringify({
        sourcePath: "H:/prism/JM DIE/SFS/thread.MIN",
        source_quality: "physics_derived_canonical",
      });
      const result = validateIngestionContent(content);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("physics_derived_canonical");
    });

    it("blocks benchmark_competition claim for JM Die data", () => {
      const content = JSON.stringify({
        jmdie: true,
        source_quality: "benchmark_competition",
      });
      const result = validateIngestionContent(content);
      expect(result.errors).toHaveLength(1);
    });

    it("blocks ground_truth_labeled claim for JM Die data", () => {
      const content = JSON.stringify({
        customer: "JM DIE",
        source_quality: "ground_truth_labeled",
      });
      const result = validateIngestionContent(content);
      expect(result.errors).toHaveLength(1);
    });

    it("warns on missing source_quality for JM Die data", () => {
      const content = JSON.stringify({
        sourcePath: "H:/prism/JM DIE/OPTIMAS/bore.MIN",
        optimization_status: "unoptimized_shop_baseline",
      });
      const result = validateIngestionContent(content);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("missing source_quality");
    });

    it("warns on unexpected source_quality value", () => {
      const content = JSON.stringify({
        sourcePath: "H:/prism/JM DIE/HOLO-KROME/tap.MIN",
        source_quality: "some_unknown_value",
      });
      const result = validateIngestionContent(content);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(2); // unexpected + missing optimization_status
    });
  });

  describe("optimization_status validation", () => {
    it("warns on missing optimization_status for JM Die data", () => {
      const content = JSON.stringify({
        sourcePath: "H:/prism/JM DIE/ITW/prog.MIN",
        source_quality: VALID_SOURCE_QUALITY,
      });
      const result = validateIngestionContent(content);
      expect(result.warnings.some((w) => w.includes("optimization_status"))).toBe(true);
    });

    it("does not warn when optimization_status is present", () => {
      const content = JSON.stringify({
        sourcePath: "H:/prism/JM DIE/ITW/prog.MIN",
        source_quality: VALID_SOURCE_QUALITY,
        optimization_status: "unoptimized_shop_baseline",
      });
      const result = validateIngestionContent(content);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("handles empty content gracefully", () => {
      const result = validateIngestionContent("");
      expect(result.hasJmDieRef).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it("handles malformed JSON content", () => {
      const result = validateIngestionContent("{invalid json");
      expect(result.hasJmDieRef).toBe(false);
    });

    it("handles JSONL with multiple records", () => {
      const content = [
        JSON.stringify({ sourcePath: "H:/prism/JM DIE/A/1.MIN", source_quality: VALID_SOURCE_QUALITY }),
        JSON.stringify({ sourcePath: "H:/prism/resources/tips.json", source_quality: "vendor_published_recommended" }),
      ].join("\n");
      const result = validateIngestionContent(content);
      expect(result.hasJmDieRef).toBe(true);
    });

    it("handles Windows backslash paths", () => {
      const content = JSON.stringify({
        sourcePath: "H:\\prism\\JM DIE\\ALCOA\\part.MIN",
        source_quality: VALID_SOURCE_QUALITY,
        optimization_status: "unoptimized_shop_baseline",
      });
      const result = validateIngestionContent(content);
      expect(result.hasJmDieRef).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("handles case variations in JM DIE path", () => {
      const variations = [
        "H:/prism/JM DIE/file.MIN",
        "H:/PRISM/JM DIE/file.MIN",
        "H:/prism/jm die/file.MIN",
        "H:/prism/Jm Die/file.MIN",
      ];
      for (const p of variations) {
        const content = JSON.stringify({ sourcePath: p, source_quality: VALID_SOURCE_QUALITY });
        const result = validateIngestionContent(content);
        expect(result.hasJmDieRef).toBe(true);
      }
    });
  });

  describe("non-JM Die content passthrough", () => {
    it("allows vendor_published_recommended for non-JM Die content", () => {
      const content = JSON.stringify({
        sourcePath: "H:/prism/resources/mastercam-official.pdf",
        source_quality: "vendor_published_recommended",
      });
      const result = validateIngestionContent(content);
      expect(result.hasJmDieRef).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it("allows physics_derived_canonical for formula content", () => {
      const content = JSON.stringify({
        type: "formula",
        source: "src/physics/constants.ts",
        source_quality: "physics_derived_canonical",
      });
      const result = validateIngestionContent(content);
      expect(result.hasJmDieRef).toBe(false);
      expect(result.errors).toHaveLength(0);
    });
  });
});
