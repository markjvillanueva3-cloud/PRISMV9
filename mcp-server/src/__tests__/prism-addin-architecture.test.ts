/**
 * Tests for PrismAddinArchitectureEngine — validates PRISM Add-in ↔ CPS
 * communication architecture: comment JSON parse/serialize, version negotiation,
 * direct param validation, sidecar building, and fallback behavior.
 */
import { describe, it, expect } from "vitest";
import {
  PrismAddinArchitectureEngine,
  PrismCommentDataSchema,
  PrismDirectParamsSchema,
  PrismSidecarSchema,
  type PrismCommentData,
} from "../engines/PrismAddinArchitectureEngine.js";

describe("PrismAddinArchitectureEngine", () => {
  // ── Serialize ──────────────────────────────────────────────────────

  describe("serializeCommentData", () => {
    it("serializes minimal physics data with version", () => {
      const result = PrismAddinArchitectureEngine.serializeCommentData({
        force_N: 450,
        power_kW: 2.1,
      });
      expect(result).toContain("PRISM:");
      expect(result).toContain('"version":"1.0.0"');
      expect(result).toContain('"force_N":450');
      expect(result).toContain('"power_kW":2.1');
    });

    it("serializes full physics data", () => {
      const result = PrismAddinArchitectureEngine.serializeCommentData({
        force_N: 1234,
        power_kW: 5.5,
        confidence: 0.92,
        tool_life_min: 45,
        stable_rpm_min: 6800,
        stable_rpm_max: 7600,
        wear_VB_mm: 0.15,
        thermal_index: 42,
        safety_score: 0.87,
        iso_group: "P",
        kc1_1: 1800,
        chip_thickness_mm: 0.12,
      });
      const parsed = JSON.parse(result.substring(6));
      expect(parsed.prism.force_N).toBe(1234);
      expect(parsed.prism.iso_group).toBe("P");
      expect(parsed.prism.kc1_1).toBe(1800);
      expect(parsed.prism.version).toBe("1.0.0");
    });

    it("rejects invalid confidence > 1", () => {
      expect(() =>
        PrismAddinArchitectureEngine.serializeCommentData({
          confidence: 1.5,
        }),
      ).toThrow();
    });

    it("rejects negative force", () => {
      expect(() =>
        PrismAddinArchitectureEngine.serializeCommentData({
          force_N: -100,
        }),
      ).toThrow();
    });
  });

  // ── Parse ──────────────────────────────────────────────────────────

  describe("parseCommentData", () => {
    it("parses valid PRISM comment data", () => {
      const comment = 'PRISM:{"prism":{"version":"1.0.0","force_N":450,"power_kW":2.1}}';
      const result = PrismAddinArchitectureEngine.parseCommentData(comment);
      expect(result).not.toBeNull();
      expect(result!.prism.force_N).toBe(450);
      expect(result!.prism.power_kW).toBe(2.1);
      expect(result!.prism.version).toBe("1.0.0");
    });

    it("returns null for empty string", () => {
      expect(PrismAddinArchitectureEngine.parseCommentData("")).toBeNull();
    });

    it("returns null for comment without PRISM prefix", () => {
      expect(PrismAddinArchitectureEngine.parseCommentData("Roughing pass 1")).toBeNull();
    });

    it("returns null for malformed JSON after PRISM:", () => {
      expect(PrismAddinArchitectureEngine.parseCommentData("PRISM:{broken")).toBeNull();
    });

    it("returns null for missing version field", () => {
      expect(PrismAddinArchitectureEngine.parseCommentData('PRISM:{"prism":{"force_N":100}}')).toBeNull();
    });

    it("parses data with user comment before PRISM prefix", () => {
      const comment = 'Finishing pass | PRISM:{"prism":{"version":"1.0.0","confidence":0.95}}';
      const result = PrismAddinArchitectureEngine.parseCommentData(comment);
      expect(result).not.toBeNull();
      expect(result!.prism.confidence).toBe(0.95);
    });
  });

  // ── Version Compatibility ──────────────────────────────────────────

  describe("isVersionCompatible", () => {
    it("accepts v1.0.0", () => {
      const data: PrismCommentData = { prism: { version: "1.0.0" } };
      expect(PrismAddinArchitectureEngine.isVersionCompatible(data)).toBe(true);
    });

    it("accepts v1.5.3 (minor forward compat)", () => {
      const data: PrismCommentData = { prism: { version: "1.5.3" } };
      expect(PrismAddinArchitectureEngine.isVersionCompatible(data)).toBe(true);
    });

    it("rejects v2.0.0 (major version mismatch)", () => {
      const data: PrismCommentData = { prism: { version: "2.0.0" } };
      expect(PrismAddinArchitectureEngine.isVersionCompatible(data)).toBe(false);
    });

    it("rejects missing version", () => {
      expect(PrismAddinArchitectureEngine.isVersionCompatible({ prism: {} } as PrismCommentData)).toBe(false);
    });
  });

  // ── Build Operation Comment ────────────────────────────────────────

  describe("buildOperationComment", () => {
    it("builds comment with no existing text", () => {
      const result = PrismAddinArchitectureEngine.buildOperationComment("", { force_N: 500 });
      expect(result.startsWith("PRISM:")).toBe(true);
    });

    it("appends to existing comment with separator", () => {
      const result = PrismAddinArchitectureEngine.buildOperationComment("Roughing", { force_N: 500 });
      expect(result.startsWith("Roughing | PRISM:")).toBe(true);
    });
  });

  // ── Extract From Comment ───────────────────────────────────────────

  describe("extractFromComment", () => {
    it("extracts user comment and PRISM data", () => {
      const comment = 'Finishing pass | PRISM:{"prism":{"version":"1.0.0","force_N":300}}';
      const result = PrismAddinArchitectureEngine.extractFromComment(comment);
      expect(result.userComment).toBe("Finishing pass");
      expect(result.prismData).not.toBeNull();
      expect(result.prismData!.prism.force_N).toBe(300);
    });

    it("returns full comment as userComment when no PRISM data", () => {
      const result = PrismAddinArchitectureEngine.extractFromComment("Just a normal comment");
      expect(result.userComment).toBe("Just a normal comment");
      expect(result.prismData).toBeNull();
    });

    it("handles empty comment", () => {
      const result = PrismAddinArchitectureEngine.extractFromComment("");
      expect(result.userComment).toBe("");
      expect(result.prismData).toBeNull();
    });
  });

  // ── CPS Parser Code Generation ────────────────────────────────────

  describe("generateCpsParserCode", () => {
    it("generates valid CPS JavaScript function", () => {
      const code = PrismAddinArchitectureEngine.generateCpsParserCode();
      expect(code).toContain("function parsePrismComment(section)");
      expect(code).toContain('getParameter("operation:comment")');
      expect(code).toContain('"PRISM:"');
      expect(code).toContain("JSON.parse");
      expect(code).toContain("return null"); // fallback
    });

    it("includes version check in generated code", () => {
      const code = PrismAddinArchitectureEngine.generateCpsParserCode();
      expect(code).toContain("major !== 1");
      expect(code).toContain("version mismatch");
    });
  });

  // ── Direct Param Validation ────────────────────────────────────────

  describe("validateDirectParams", () => {
    it("passes valid params without machine context", () => {
      const result = PrismAddinArchitectureEngine.validateDirectParams({
        rpm: 6000,
        feedrate: 500,
      });
      expect(result.params.rpm).toBe(6000);
      expect(result.params.feedrate).toBe(500);
      expect(result.warnings).toHaveLength(0);
      expect(result.clamped).toBe(false);
    });

    it("clamps RPM to machine max", () => {
      const result = PrismAddinArchitectureEngine.validateDirectParams(
        { rpm: 12000, feedrate: 500 },
        { max_rpm: 8100 },
      );
      expect(result.params.rpm).toBe(8100);
      expect(result.clamped).toBe(true);
      expect(result.warnings[0]).toContain("RPM 12000 exceeds");
    });

    it("clamps feed to machine max", () => {
      const result = PrismAddinArchitectureEngine.validateDirectParams(
        { rpm: 6000, feedrate: 800 },
        { max_feed: 500 },
      );
      expect(result.params.feedrate).toBe(500);
      expect(result.clamped).toBe(true);
      expect(result.warnings[0]).toContain("Feed 800 exceeds");
    });

    it("rejects zero RPM", () => {
      expect(() =>
        PrismAddinArchitectureEngine.validateDirectParams({
          rpm: 0,
          feedrate: 500,
        }),
      ).toThrow();
    });

    it("rejects negative feedrate", () => {
      expect(() =>
        PrismAddinArchitectureEngine.validateDirectParams({
          rpm: 6000,
          feedrate: -100,
        }),
      ).toThrow();
    });
  });

  // ── Sidecar Building ───────────────────────────────────────────────

  describe("buildSidecar", () => {
    it("builds minimal sidecar", () => {
      const sidecar = PrismAddinArchitectureEngine.buildSidecar();
      expect(sidecar.prism_version).toBe("1.0.0");
    });

    it("builds full sidecar with machine + material + tools", () => {
      const sidecar = PrismAddinArchitectureEngine.buildSidecar(
        { manufacturer: "Haas", model: "VF-2", controller: "haas_ngc", max_rpm: 8100, max_power_kW: 22.4 },
        { name: "4140 Steel", iso_group: "P", kc1_1: 1800, mc: 0.25, hardness_HRC: 28 },
        [{ number: 1, diameter_mm: 12, flute_count: 4, type: "endmill", material: "carbide" }],
        [{ id: "op1", type: "milling", tool_number: 1 }],
      );
      expect(sidecar.machine!.manufacturer).toBe("Haas");
      expect(sidecar.material!.kc1_1).toBe(1800);
      expect(sidecar.tools![0].diameter_mm).toBe(12);
      expect(sidecar.operations![0].type).toBe("milling");
    });

    it("rejects invalid ISO group", () => {
      expect(() =>
        PrismAddinArchitectureEngine.buildSidecar(
          undefined,
          { iso_group: "X" as "P" },
        ),
      ).toThrow();
    });
  });

  // ── Roundtrip ──────────────────────────────────────────────────────

  describe("roundtrip: serialize → parse", () => {
    it("roundtrips full physics data", () => {
      const input = {
        force_N: 1234.5,
        power_kW: 5.5,
        confidence: 0.92,
        tool_life_min: 45,
        stable_rpm_min: 6800,
        stable_rpm_max: 7600,
        iso_group: "P" as const,
        kc1_1: 1800,
      };
      const serialized = PrismAddinArchitectureEngine.serializeCommentData(input);
      const parsed = PrismAddinArchitectureEngine.parseCommentData(serialized);
      expect(parsed).not.toBeNull();
      expect(parsed!.prism.force_N).toBe(1234.5);
      expect(parsed!.prism.iso_group).toBe("P");
      expect(parsed!.prism.kc1_1).toBe(1800);
    });

    it("roundtrips through buildOperationComment + extractFromComment", () => {
      const comment = PrismAddinArchitectureEngine.buildOperationComment("Op1 Roughing", {
        force_N: 890,
        safety_score: 0.85,
      });
      const extracted = PrismAddinArchitectureEngine.extractFromComment(comment);
      expect(extracted.userComment).toBe("Op1 Roughing");
      expect(extracted.prismData!.prism.force_N).toBe(890);
      expect(extracted.prismData!.prism.safety_score).toBe(0.85);
    });
  });

  // ── Fallback Behavior ──────────────────────────────────────────────

  describe("fallback behavior (add-in absent)", () => {
    it("parseCommentData returns null for non-PRISM comments", () => {
      const comments = [
        "Standard roughing operation",
        "T1 D=12mm CR=0 - ZMIN=-10 - flat end mill",
        "",
        "   ",
        "G-code optimization disabled",
      ];
      for (const c of comments) {
        expect(PrismAddinArchitectureEngine.parseCommentData(c)).toBeNull();
      }
    });

    it("extractFromComment preserves user comment when no PRISM data", () => {
      const comment = "Important machining notes for operator";
      const result = PrismAddinArchitectureEngine.extractFromComment(comment);
      expect(result.userComment).toBe(comment);
      expect(result.prismData).toBeNull();
    });
  });

  // ── Schema validation ──────────────────────────────────────────────

  describe("Zod schemas", () => {
    it("PrismCommentDataSchema validates correct data", () => {
      const valid = {
        prism: {
          version: "1.0.0",
          force_N: 500,
          confidence: 0.9,
        },
      };
      expect(() => PrismCommentDataSchema.parse(valid)).not.toThrow();
    });

    it("PrismCommentDataSchema rejects bad version format", () => {
      expect(() =>
        PrismCommentDataSchema.parse({ prism: { version: "v1" } }),
      ).toThrow();
    });

    it("PrismDirectParamsSchema validates correct params", () => {
      expect(() =>
        PrismDirectParamsSchema.parse({ rpm: 6000, feedrate: 500 }),
      ).not.toThrow();
    });

    it("PrismDirectParamsSchema rejects missing rpm", () => {
      expect(() =>
        PrismDirectParamsSchema.parse({ feedrate: 500 }),
      ).toThrow();
    });
  });
});
