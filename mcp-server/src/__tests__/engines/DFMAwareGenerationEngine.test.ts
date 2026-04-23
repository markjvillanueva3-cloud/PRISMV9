/**
 * DFMAwareGenerationEngine Tests — CADCAM-DAGI-MS0/U-DAGI11
 *
 * 30 tests covering:
 *   - analyzeFeatures(): wall thickness, corner radius, depth ratio, holes, threads
 *   - generateWithDFM(): auto-fix + code generation
 *   - fixFeatures(): standalone auto-fix
 *   - getEnvelope(): machine capability lookup
 *   - Material-specific constraints
 */
import { describe, it, expect } from "vitest";
import {
  dfmAwareGenerationEngine,
  type DFMGenerationInput,
  type DFMAnalysisResult,
  type MachineEnvelope,
} from "../../engines/DFMAwareGenerationEngine.js";
import type { FeatureSpec } from "../../engines/NeuralCADGenerationEngine.js";

describe("DFMAwareGenerationEngine", () => {
  // ── Engine Info ─────────────────────────────────────────────────────────
  describe("engine info", () => {
    it("has correct name and version", () => {
      expect(dfmAwareGenerationEngine.info.name).toBe("DFMAwareGenerationEngine");
      expect(dfmAwareGenerationEngine.info.version).toBe("1.0.0");
      expect(dfmAwareGenerationEngine.info.domain).toBe("cad_dfm");
    });

    it("exposes required capabilities", () => {
      const caps = dfmAwareGenerationEngine.getCapabilities();
      const names = caps.map(c => c.name);
      expect(names).toContain("dfm_generate");
      expect(names).toContain("dfm_analyze_features");
      expect(names).toContain("dfm_fix_features");
      expect(names).toContain("dfm_get_envelope");
    });
  });

  // ── validate ────────────────────────────────────────────────────────────
  describe("validate", () => {
    it("returns null for valid input", () => {
      const input: DFMGenerationInput = {
        features: [{ type: "box", params: { length: 100 } }],
      };
      expect(dfmAwareGenerationEngine.validate(input)).toBeNull();
    });

    it("returns error for missing features", () => {
      expect(dfmAwareGenerationEngine.validate({})).toBe("features array is required");
    });

    it("returns error for non-array features", () => {
      expect(dfmAwareGenerationEngine.validate({ features: "invalid" })).toBe("features array is required");
    });
  });

  // ── analyzeFeatures ─────────────────────────────────────────────────────
  describe("analyzeFeatures", () => {
    it("passes valid wall thickness", () => {
      const features: FeatureSpec[] = [
        { type: "box", params: { wallThickness: 2.0 } },
      ];
      const result = dfmAwareGenerationEngine.analyzeFeatures(features);

      expect(result.isManufacturable).toBe(true);
      const wallRule = result.rules.find(r => r.ruleId.includes("wall"));
      expect(wallRule?.severity).toBe("pass");
    });

    it("warns on thin wall", () => {
      const features: FeatureSpec[] = [
        { type: "box", params: { wallThickness: 1.2 } },
      ];
      const result = dfmAwareGenerationEngine.analyzeFeatures(features, "STEEL");

      const wallRule = result.rules.find(r => r.ruleId.includes("wall"));
      expect(wallRule?.severity).toBe("warning");
      expect(wallRule?.suggestion).toContain("Increase wall thickness");
    });

    it("fails on critically thin wall", () => {
      const features: FeatureSpec[] = [
        { type: "box", params: { wallThickness: 0.5 } },
      ];
      const result = dfmAwareGenerationEngine.analyzeFeatures(features, "STEEL");

      const wallRule = result.rules.find(r => r.ruleId.includes("wall"));
      expect(wallRule?.severity).toBe("fail");
      expect(result.isManufacturable).toBe(false);
    });

    it("passes valid corner radius", () => {
      const features: FeatureSpec[] = [
        { type: "pocket", params: { cornerRadius: 1.0 } },
      ];
      const result = dfmAwareGenerationEngine.analyzeFeatures(features);

      const cornerRule = result.rules.find(r => r.ruleId.includes("corner"));
      expect(cornerRule?.severity).toBe("pass");
    });

    it("warns on small corner radius", () => {
      const features: FeatureSpec[] = [
        { type: "pocket", params: { cornerRadius: 0.3 } },
      ];
      const result = dfmAwareGenerationEngine.analyzeFeatures(features, "STEEL");

      const cornerRule = result.rules.find(r => r.ruleId.includes("corner"));
      expect(cornerRule?.severity).toBe("warning");
    });

    it("checks depth-to-width ratio for pockets", () => {
      const features: FeatureSpec[] = [
        { type: "pocket", params: { depth: 30, width: 5 } }, // 6:1 ratio
      ];
      const result = dfmAwareGenerationEngine.analyzeFeatures(features);

      const depthRule = result.rules.find(r => r.ruleId.includes("depth"));
      expect(depthRule?.severity).toBe("warning");
      expect(depthRule?.message).toContain("exceeds");
    });

    it("passes acceptable depth-to-width ratio", () => {
      const features: FeatureSpec[] = [
        { type: "pocket", params: { depth: 10, width: 5 } }, // 2:1 ratio
      ];
      const result = dfmAwareGenerationEngine.analyzeFeatures(features);

      const depthRule = result.rules.find(r => r.ruleId.includes("depth"));
      expect(depthRule?.severity).toBe("pass");
    });

    it("warns on very small holes", () => {
      const features: FeatureSpec[] = [
        { type: "hole", params: { diameter: 0.8 } },
      ];
      const result = dfmAwareGenerationEngine.analyzeFeatures(features);

      const holeRule = result.rules.find(r => r.ruleId.includes("hole"));
      expect(holeRule?.severity).toBe("warning");
      expect(holeRule?.suggestion).toContain("EDM");
    });

    it("fails on impractical hole size", () => {
      const features: FeatureSpec[] = [
        { type: "hole", params: { diameter: 0.3 } },
      ];
      const result = dfmAwareGenerationEngine.analyzeFeatures(features);

      const holeRule = result.rules.find(r => r.ruleId.includes("hole"));
      expect(holeRule?.severity).toBe("fail");
    });

    it("warns on deep thread", () => {
      const features: FeatureSpec[] = [
        { type: "thread", params: { diameter: 6, depth: 25 } }, // 4:1 ratio
      ];
      const result = dfmAwareGenerationEngine.analyzeFeatures(features);

      const threadRule = result.rules.find(r => r.ruleId === "thread-0");
      expect(threadRule?.severity).toBe("fail");
    });

    it("warns on small thread", () => {
      const features: FeatureSpec[] = [
        { type: "thread", params: { diameter: 2, depth: 4 } },
      ];
      const result = dfmAwareGenerationEngine.analyzeFeatures(features);

      const threadMinRule = result.rules.find(r => r.ruleId.includes("thread-min"));
      expect(threadMinRule?.severity).toBe("warning");
    });

    it("warns on tiny edge treatment", () => {
      const features: FeatureSpec[] = [
        { type: "fillet", params: { radius: 0.1 } },
      ];
      const result = dfmAwareGenerationEngine.analyzeFeatures(features);

      const edgeRule = result.rules.find(r => r.ruleId.includes("edge"));
      expect(edgeRule?.severity).toBe("warning");
    });

    it("respects aluminum constraints", () => {
      const features: FeatureSpec[] = [
        { type: "box", params: { wallThickness: 1.2 } },
      ];
      const resultSteel = dfmAwareGenerationEngine.analyzeFeatures(features, "STEEL");
      const resultAlu = dfmAwareGenerationEngine.analyzeFeatures(features, "ALUMINUM");

      // 1.2mm is warning for steel (min 1.5) but OK for aluminum (min 1.0)
      const steelWall = resultSteel.rules.find(r => r.ruleId.includes("wall"));
      const aluWall = resultAlu.rules.find(r => r.ruleId.includes("wall"));

      expect(steelWall?.severity).toBe("warning");
      expect(aluWall?.severity).toBe("pass");
    });

    it("respects tool steel constraints", () => {
      const features: FeatureSpec[] = [
        { type: "box", params: { wallThickness: 1.8 } },
      ];
      const resultSteel = dfmAwareGenerationEngine.analyzeFeatures(features, "4140");
      const resultD2 = dfmAwareGenerationEngine.analyzeFeatures(features, "D2");

      // 1.8mm is OK for 4140 (min 1.5) but warning for D2 (min 2.0)
      const steelWall = resultSteel.rules.find(r => r.ruleId.includes("wall"));
      const d2Wall = resultD2.rules.find(r => r.ruleId.includes("wall"));

      expect(steelWall?.severity).toBe("pass");
      expect(d2Wall?.severity).toBe("warning");
    });

    it("calculates overall score", () => {
      const features: FeatureSpec[] = [
        { type: "box", params: { wallThickness: 2.0 } },
        { type: "pocket", params: { depth: 10, width: 5 } },
      ];
      const result = dfmAwareGenerationEngine.analyzeFeatures(features);

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
    });

    it("generates recommendations", () => {
      const features: FeatureSpec[] = [
        { type: "box", params: { wallThickness: 0.5 } }, // Failure
      ];
      const result = dfmAwareGenerationEngine.analyzeFeatures(features);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]).toContain("critical");
    });
  });

  // ── generateWithDFM ─────────────────────────────────────────────────────
  describe("generateWithDFM", () => {
    it("auto-fixes wall thickness violations", async () => {
      const input: DFMGenerationInput = {
        features: [{ type: "box", params: { wallThickness: 1.0 } }],
        material: "STEEL",
      };
      const result = await dfmAwareGenerationEngine.generateWithDFM(input);

      expect(result.modifications.length).toBeGreaterThan(0);
      const wallMod = result.modifications.find(m => m.reason.includes("wall"));
      expect(wallMod).toBeDefined();
      expect(result.features[0].params.wallThickness).toBeGreaterThanOrEqual(1.5);
    });

    it("auto-fixes corner radius violations", async () => {
      const input: DFMGenerationInput = {
        features: [{ type: "pocket", params: { cornerRadius: 0.2 } }],
        material: "STEEL",
      };
      const result = await dfmAwareGenerationEngine.generateWithDFM(input);

      expect(result.modifications.some(m => m.reason.includes("corner radius"))).toBe(true);
    });

    it("generates CadQuery code", async () => {
      const input: DFMGenerationInput = {
        features: [
          { type: "box", params: { length: 100, width: 50, height: 25 } },
          { type: "hole", params: { diameter: 10 } },
        ],
        material: "ALUMINUM",
      };
      const result = await dfmAwareGenerationEngine.generateWithDFM(input);

      expect(result.code).toContain("import cadquery");
      expect(result.code).toContain("ALUMINUM");
      expect(result.code).toContain("DFM-validated");
    });

    it("re-analyzes after fixes", async () => {
      const input: DFMGenerationInput = {
        features: [{ type: "box", params: { wallThickness: 1.0 } }],
        material: "STEEL",
      };
      const result = await dfmAwareGenerationEngine.generateWithDFM(input);

      // After fix, the analysis should show improvement
      expect(result.dfmAnalysis.isManufacturable).toBe(true);
    });
  });

  // ── fixFeatures ─────────────────────────────────────────────────────────
  describe("fixFeatures", () => {
    it("fixes multiple issues", () => {
      const features: FeatureSpec[] = [
        { type: "box", params: { wallThickness: 1.0 } },
        { type: "pocket", params: { cornerRadius: 0.2, depth: 40, width: 5 } },
      ];
      const result = dfmAwareGenerationEngine.fixFeatures(features, "STEEL");

      expect(result.fixes.length).toBeGreaterThan(0);
      expect(result.features[0].params.wallThickness).toBeGreaterThanOrEqual(1.5);
    });

    it("preserves valid features", () => {
      const features: FeatureSpec[] = [
        { type: "box", params: { wallThickness: 3.0 } },
      ];
      const result = dfmAwareGenerationEngine.fixFeatures(features, "STEEL");

      expect(result.fixes.length).toBe(0);
      expect(result.features[0].params.wallThickness).toBe(3.0);
    });

    it("respects depth-to-width limits", () => {
      const features: FeatureSpec[] = [
        { type: "pocket", params: { depth: 50, width: 5 } }, // 10:1 ratio
      ];
      const result = dfmAwareGenerationEngine.fixFeatures(features);

      expect(result.fixes.some(f => f.includes("depth"))).toBe(true);
      expect(result.features[0].params.depth).toBeLessThanOrEqual(25); // 5:1 max
    });
  });

  // ── getEnvelope ─────────────────────────────────────────────────────────
  describe("getEnvelope", () => {
    it("returns default envelope for lathe", () => {
      const envelope = dfmAwareGenerationEngine.getEnvelope("lathe");
      expect(envelope.machineType).toBe("lathe");
      expect(envelope.maxWorkpiece.length).toBeGreaterThan(0);
    });

    it("returns mill envelope", () => {
      const envelope = dfmAwareGenerationEngine.getEnvelope("mill");
      expect(envelope.machineType).toBe("mill");
      expect(envelope.maxWorkpiece.width).toBeDefined();
    });

    it("returns wire EDM envelope with smaller radii", () => {
      const envelope = dfmAwareGenerationEngine.getEnvelope("wire_edm");
      expect(envelope.machineType).toBe("wire_edm");
      expect(envelope.minCornerRadius).toBeLessThan(0.4); // Smaller than milling
    });

    it("returns default envelope for unknown type", () => {
      const envelope = dfmAwareGenerationEngine.getEnvelope("unknown");
      expect(envelope.machineId).toBe("jm-die-default");
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────
  describe("edge cases", () => {
    it("handles empty features array", () => {
      const result = dfmAwareGenerationEngine.analyzeFeatures([]);
      expect(result.overallScore).toBe(0);
      expect(result.isManufacturable).toBe(true);
    });

    it("handles features without DFM-relevant params", () => {
      const features: FeatureSpec[] = [
        { type: "box", params: {} },
      ];
      const result = dfmAwareGenerationEngine.analyzeFeatures(features);

      // Should still run without errors
      expect(result).toBeDefined();
      expect(result.rules.length).toBeGreaterThanOrEqual(0);
    });

    it("handles unknown material gracefully", () => {
      const features: FeatureSpec[] = [
        { type: "box", params: { wallThickness: 1.4 } },
      ];
      const result = dfmAwareGenerationEngine.analyzeFeatures(features, "UNOBTAINIUM");

      // Falls back to STEEL constraints
      const wallRule = result.rules.find(r => r.ruleId.includes("wall"));
      expect(wallRule?.severity).toBe("warning"); // 1.4 < 1.5 for steel
    });
  });
});
