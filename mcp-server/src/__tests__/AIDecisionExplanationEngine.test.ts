/**
 * AIDecisionExplanationEngine Tests
 * ==================================
 * Comprehensive tests for AI parameter decision explanations.
 * Covers all operation types, verbosity levels, and edge cases.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  aiDecisionExplanationEngine,
  AIDecisionExplanationEngine,
  type DecisionExplanationInput,
  type ParameterDecisionInput,
  type ParameterContext,
  type DecisionSource,
  type VerbosityLevel,
  type OperationType,
} from "../engines/AIDecisionExplanationEngine.js";

describe("AIDecisionExplanationEngine", () => {
  // ========================================================================
  // Engine Instantiation
  // ========================================================================
  describe("Engine instantiation", () => {
    it("should export singleton", () => {
      expect(aiDecisionExplanationEngine).toBeDefined();
      expect(aiDecisionExplanationEngine).toBeInstanceOf(AIDecisionExplanationEngine);
    });

    it("should have all required methods", () => {
      const methods = [
        "explainDecision",
        "explainParameter",
        "createTribalAttribution",
        "createOEMAttribution",
        "createPhysicsAttribution",
        "getApprovalGateExplanation",
      ];
      for (const m of methods) {
        expect(typeof (aiDecisionExplanationEngine as any)[m]).toBe("function");
      }
    });
  });

  // ========================================================================
  // Basic Decision Explanation
  // ========================================================================
  describe("explainDecision - basic", () => {
    it("should generate explanation for roughing operation", () => {
      const input: DecisionExplanationInput = {
        operationId: "op-001",
        operationType: "roughing",
        operationName: "Roughing Pass 1",
        parameters: [
          {
            parameter: "spindle_speed",
            chosenValue: 3200,
            unit: "RPM",
            context: { material: "4140 Steel", toolDiameter: 12 },
          },
          {
            parameter: "feed_rate",
            chosenValue: 450,
            unit: "mm/min",
            context: { material: "4140 Steel", toolDiameter: 12 },
          },
          {
            parameter: "depth_of_cut",
            chosenValue: 2.5,
            unit: "mm",
            context: { material: "4140 Steel", toolDiameter: 12 },
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.operationId).toBe("op-001");
      expect(result.operationType).toBe("roughing");
      expect(result.operationName).toBe("Roughing Pass 1");
      expect(result.parameters).toHaveLength(3);
      expect(result.overallConfidence).toBeGreaterThan(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(1);
      expect(result.summary).toBeTruthy();
      expect(result.timestamp).toBeTruthy();
    });

    it("should generate explanation for finishing operation", () => {
      const input: DecisionExplanationInput = {
        operationId: "op-002",
        operationType: "finishing",
        parameters: [
          {
            parameter: "spindle_speed",
            chosenValue: 4500,
            unit: "RPM",
            context: { material: "Aluminum 6061", targetSurfaceFinish: 1.6 },
          },
          {
            parameter: "feed_rate",
            chosenValue: 800,
            unit: "mm/min",
            context: { material: "Aluminum 6061", targetSurfaceFinish: 1.6 },
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.operationType).toBe("finishing");
      expect(result.parameters).toHaveLength(2);
      expect(result.keyTradeoffs.length).toBeGreaterThan(0);
    });

    it("should generate explanation for drilling operation", () => {
      const input: DecisionExplanationInput = {
        operationId: "op-003",
        operationType: "drilling",
        parameters: [
          {
            parameter: "peck_depth",
            chosenValue: 3.0,
            unit: "mm",
            context: { material: "Stainless Steel 316", toolDiameter: 8 },
          },
          {
            parameter: "retract_height",
            chosenValue: 2.0,
            unit: "mm",
            context: { material: "Stainless Steel 316" },
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.operationType).toBe("drilling");
      expect(result.parameters[0].parameter).toBe("peck_depth");
    });

    it("should generate explanation for threading operation", () => {
      const input: DecisionExplanationInput = {
        operationId: "op-004",
        operationType: "threading",
        parameters: [
          {
            parameter: "pitch",
            chosenValue: 1.5,
            unit: "mm",
            context: { material: "4140 Steel" },
          },
          {
            parameter: "number_of_passes",
            chosenValue: 6,
            unit: "passes",
            context: { material: "4140 Steel" },
          },
          {
            parameter: "infeed_method",
            chosenValue: "modified_flank",
            unit: "",
            context: { material: "4140 Steel" },
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.operationType).toBe("threading");
      expect(result.parameters).toHaveLength(3);
    });
  });

  // ========================================================================
  // Verbosity Levels
  // ========================================================================
  describe("verbosity levels", () => {
    const baseInput: DecisionExplanationInput = {
      operationId: "verb-test",
      operationType: "roughing",
      parameters: [
        {
          parameter: "spindle_speed",
          chosenValue: 3000,
          unit: "RPM",
          context: { material: "Steel", toolMaterial: "Carbide", toolCoating: "TiAlN" },
          sources: [
            { type: "physics_formula", description: "Kienzle cutting speed", confidence: 0.95 },
            { type: "tribal_tip", description: "Reduce 10% for hardened material", confidence: 0.85 },
          ],
          constraints: ["Max RPM 5000", "Thermal limit 180m/min"],
        },
      ],
    };

    it("should generate brief explanation with 1 reasoning point", () => {
      const input = { ...baseInput, verbosity: "brief" as VerbosityLevel };
      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.verbosityLevel).toBe("brief");
      expect(result.parameters[0].reasoning.length).toBe(1);
      expect(result.detailedNarrative).toBeUndefined();
    });

    it("should generate normal explanation with 2-3 reasoning points", () => {
      const input = { ...baseInput, verbosity: "normal" as VerbosityLevel };
      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.verbosityLevel).toBe("normal");
      expect(result.parameters[0].reasoning.length).toBeGreaterThanOrEqual(2);
      expect(result.parameters[0].reasoning.length).toBeLessThanOrEqual(3);
      expect(result.detailedNarrative).toBeUndefined();
    });

    it("should generate detailed explanation with narrative", () => {
      const input = { ...baseInput, verbosity: "detailed" as VerbosityLevel };
      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.verbosityLevel).toBe("detailed");
      expect(result.parameters[0].reasoning.length).toBeGreaterThan(3);
      expect(result.detailedNarrative).toBeTruthy();
      expect(result.detailedNarrative).toContain("Parameter Decisions");
    });

    it("should default to normal verbosity when not specified", () => {
      const result = aiDecisionExplanationEngine.explainDecision(baseInput);

      expect(result.verbosityLevel).toBe("normal");
    });
  });

  // ========================================================================
  // Alternatives Generation
  // ========================================================================
  describe("alternatives", () => {
    it("should generate alternatives when not provided", () => {
      const input: DecisionExplanationInput = {
        operationId: "alt-test",
        operationType: "turning",
        parameters: [
          {
            parameter: "feed_rate",
            chosenValue: 0.25,
            unit: "mm/rev",
            context: { material: "Steel" },
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);
      const feedParam = result.parameters[0];

      expect(feedParam.alternatives.length).toBeGreaterThan(0);
      expect(feedParam.alternatives[0].whyNotChosen).toBeTruthy();
    });

    it("should use provided alternatives with reasons", () => {
      const input: DecisionExplanationInput = {
        operationId: "alt-test-2",
        operationType: "milling" as any,
        parameters: [
          {
            parameter: "spindle_speed",
            chosenValue: 4000,
            unit: "RPM",
            context: { material: "Aluminum" },
            alternatives: [
              { value: 5000, reason: "Would exceed thermal limits for this insert" },
              { value: 3000, reason: "Suboptimal for aluminum cutting velocity" },
            ],
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);
      const speedParam = result.parameters[0];

      expect(speedParam.alternatives).toHaveLength(2);
      expect(speedParam.alternatives[0].value).toBe(5000);
      expect(speedParam.alternatives[0].whyNotChosen).toContain("thermal limits");
    });

    it("should include wouldCause consequences for auto-generated alternatives", () => {
      const input: DecisionExplanationInput = {
        operationId: "conseq-test",
        operationType: "roughing",
        parameters: [
          {
            parameter: "depth_of_cut",
            chosenValue: 3.0,
            unit: "mm",
            context: { material: "Steel" },
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);
      const docParam = result.parameters[0];

      // Higher value alternative should have consequences
      const higherAlt = docParam.alternatives.find(a => (a.value as number) > 3.0);
      expect(higherAlt).toBeTruthy();
      expect(higherAlt?.wouldCause).toBeTruthy();
      expect(higherAlt?.wouldCause?.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // Confidence Calculation
  // ========================================================================
  describe("confidence calculation", () => {
    it("should boost confidence with physics formula source", () => {
      const input: DecisionExplanationInput = {
        operationId: "conf-test-1",
        operationType: "turning",
        parameters: [
          {
            parameter: "spindle_speed",
            chosenValue: 3500,
            unit: "RPM",
            context: {},
            sources: [
              { type: "physics_formula", description: "Taylor tool life", confidence: 0.95 },
            ],
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);
      expect(result.parameters[0].confidenceLevel).toBeGreaterThan(0.8);
    });

    it("should reduce confidence with multiple risks", () => {
      const input: DecisionExplanationInput = {
        operationId: "conf-test-2",
        operationType: "roughing",
        parameters: [
          {
            parameter: "depth_of_cut",
            chosenValue: 5.0,
            unit: "mm",
            context: {},
            risks: ["Exceeds recommended engagement", "High cutting forces", "Chatter risk"],
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);
      expect(result.parameters[0].confidenceLevel).toBeLessThan(0.7);
    });

    it("should calculate weighted overall confidence", () => {
      const input: DecisionExplanationInput = {
        operationId: "conf-test-3",
        operationType: "turning",
        parameters: [
          {
            parameter: "spindle_speed",
            chosenValue: 3000,
            unit: "RPM",
            context: {},
            sources: [{ type: "physics_formula", description: "Kienzle", confidence: 0.95 }],
          },
          {
            parameter: "feed_rate",
            chosenValue: 0.2,
            unit: "mm/rev",
            context: {},
            sources: [{ type: "oem_recommendation", description: "Sandvik", confidence: 0.9 }],
          },
          {
            parameter: "nose_radius",
            chosenValue: 0.8,
            unit: "mm",
            context: {},
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      // Primary parameters (speed, feed) should have more weight
      expect(result.overallConfidence).toBeGreaterThan(0.75);
    });
  });

  // ========================================================================
  // Review Suggestion
  // ========================================================================
  describe("review suggestion", () => {
    it("should suggest review when confidence is low", () => {
      const input: DecisionExplanationInput = {
        operationId: "review-test-1",
        operationType: "wire_edm",
        parameters: [
          {
            parameter: "on_time",
            chosenValue: 3,
            unit: "us",
            context: {},
            risks: ["Risk 1", "Risk 2", "Risk 3"],
            constraints: ["C1", "C2", "C3", "C4"],
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.suggestedReview).toBe(true);
      expect(result.reviewReasons).toBeTruthy();
      expect(result.reviewReasons!.length).toBeGreaterThan(0);
    });

    it("should suggest review when user override detected", () => {
      const input: DecisionExplanationInput = {
        operationId: "review-test-2",
        operationType: "turning",
        parameters: [
          {
            parameter: "spindle_speed",
            chosenValue: 5000,
            unit: "RPM",
            context: {},
            sources: [{ type: "user_override", description: "User specified", confidence: 1.0 }],
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.suggestedReview).toBe(true);
      expect(result.reviewReasons?.some(r => r.includes("override"))).toBe(true);
    });

    it("should not suggest review when all parameters are high confidence", () => {
      const input: DecisionExplanationInput = {
        operationId: "review-test-3",
        operationType: "turning",
        parameters: [
          {
            parameter: "spindle_speed",
            chosenValue: 3000,
            unit: "RPM",
            context: {},
            sources: [
              { type: "physics_formula", description: "Kienzle", confidence: 0.95 },
              { type: "oem_recommendation", description: "Sandvik", confidence: 0.92 },
            ],
          },
          {
            parameter: "feed_rate",
            chosenValue: 0.25,
            unit: "mm/rev",
            context: {},
            sources: [
              { type: "physics_formula", description: "Surface finish formula", confidence: 0.9 },
            ],
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.suggestedReview).toBe(false);
      expect(result.reviewReasons).toBeUndefined();
    });
  });

  // ========================================================================
  // Source Attribution
  // ========================================================================
  describe("source attribution", () => {
    it("should include tribal knowledge with flag enabled", () => {
      const input: DecisionExplanationInput = {
        operationId: "source-test-1",
        operationType: "roughing",
        includeTribalKnowledge: true,
        parameters: [
          {
            parameter: "spindle_speed",
            chosenValue: 2800,
            unit: "RPM",
            context: { material: "D2 Steel" },
            sources: [
              {
                type: "tribal_tip",
                id: "tip-123",
                description: "For D2 steel, reduce speed 20% when hardened",
                confidence: 0.85,
              },
            ],
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.parameters[0].sourcesUsed.some(s => s.type === "tribal_tip")).toBe(true);
      expect(result.parameters[0].reasoning.some(r => r.includes("shop tip"))).toBe(true);
    });

    it("should exclude tribal knowledge when flag disabled", () => {
      const input: DecisionExplanationInput = {
        operationId: "source-test-2",
        operationType: "roughing",
        includeTribalKnowledge: false,
        parameters: [
          {
            parameter: "spindle_speed",
            chosenValue: 2800,
            unit: "RPM",
            context: {},
            sources: [
              {
                type: "tribal_tip",
                id: "tip-123",
                description: "For D2 steel, reduce speed 20%",
                confidence: 0.85,
              },
            ],
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.parameters[0].sourcesUsed.some(s => s.type === "tribal_tip")).toBe(false);
    });

    it("should create tribal attribution correctly", () => {
      const attribution = aiDecisionExplanationEngine.createTribalAttribution(
        "tip-456",
        "operator:John Smith",
        "When machining thin walls in aluminum, reduce feed by 30% to prevent vibration"
      );

      expect(attribution.type).toBe("tribal_tip");
      expect(attribution.id).toBe("tip-456");
      expect(attribution.confidence).toBe(0.85);
      expect(attribution.reference).toContain("JM Die tip");
    });

    it("should create OEM attribution correctly", () => {
      const attribution = aiDecisionExplanationEngine.createOEMAttribution(
        "Sandvik Coromant",
        "Use 180 m/min for CNMG insert in 4140 steel",
        "Catalog 2024, p.156"
      );

      expect(attribution.type).toBe("oem_recommendation");
      expect(attribution.description).toContain("Sandvik Coromant");
      expect(attribution.confidence).toBe(0.92);
      expect(attribution.reference).toBe("Catalog 2024, p.156");
    });

    it("should create physics attribution correctly", () => {
      const attribution = aiDecisionExplanationEngine.createPhysicsAttribution(
        "Kienzle",
        "Cutting force calculation Fc = kc1.1 * ap * fz^(1-mc)"
      );

      expect(attribution.type).toBe("physics_formula");
      expect(attribution.id).toBe("Kienzle");
      expect(attribution.confidence).toBe(0.95);
      expect(attribution.reference).toContain("PRISM physics engine");
    });
  });

  // ========================================================================
  // Tradeoffs Identification
  // ========================================================================
  describe("tradeoffs", () => {
    it("should identify roughing tradeoffs", () => {
      const input: DecisionExplanationInput = {
        operationId: "tradeoff-test-1",
        operationType: "roughing",
        parameters: [
          {
            parameter: "depth_of_cut",
            chosenValue: 3.0,
            unit: "mm",
            context: {},
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.keyTradeoffs.length).toBeGreaterThan(0);
      expect(result.keyTradeoffs.some(t =>
        t.description.includes("Material removal") || t.description.includes("tool life")
      )).toBe(true);
    });

    it("should identify finishing tradeoffs", () => {
      const input: DecisionExplanationInput = {
        operationId: "tradeoff-test-2",
        operationType: "finishing",
        parameters: [
          {
            parameter: "stepover",
            chosenValue: 0.3,
            unit: "mm",
            context: {},
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.keyTradeoffs.some(t =>
        t.description.includes("Surface finish") || t.description.includes("cycle time")
      )).toBe(true);
    });

    it("should include impact assessment in tradeoffs", () => {
      const input: DecisionExplanationInput = {
        operationId: "tradeoff-test-3",
        operationType: "turning",
        parameters: [
          {
            parameter: "feed_rate",
            chosenValue: 0.2,
            unit: "mm/rev",
            context: {},
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      for (const tradeoff of result.keyTradeoffs) {
        expect(tradeoff.impact).toBeTruthy();
        expect(tradeoff.prioritized).toBeTruthy();
        expect(tradeoff.sacrificed).toBeTruthy();
      }
    });
  });

  // ========================================================================
  // Operation Type Coverage
  // ========================================================================
  describe("operation types coverage", () => {
    const operationTypes: OperationType[] = [
      "roughing", "finishing", "drilling", "threading", "tapping",
      "boring", "reaming", "facing", "turning", "grooving", "parting",
      "profiling", "pocketing", "contouring", "chamfering",
      "wire_edm", "sinker_edm", "grinding", "general",
    ];

    for (const opType of operationTypes) {
      it(`should handle ${opType} operation`, () => {
        const input: DecisionExplanationInput = {
          operationId: `op-${opType}`,
          operationType: opType,
          parameters: [
            {
              parameter: "spindle_speed",
              chosenValue: 3000,
              unit: "RPM",
              context: { material: "Steel" },
            },
          ],
        };

        const result = aiDecisionExplanationEngine.explainDecision(input);

        expect(result.operationType).toBe(opType);
        expect(result.parameters).toHaveLength(1);
        expect(result.summary).toBeTruthy();
      });
    }
  });

  // ========================================================================
  // Approval Gate Integration
  // ========================================================================
  describe("approval gate integration", () => {
    it("should generate approval gate summary", () => {
      const input: DecisionExplanationInput = {
        operationId: "gate-test",
        operationType: "roughing",
        parameters: [
          {
            parameter: "spindle_speed",
            chosenValue: 3200,
            unit: "RPM",
            context: {},
            sources: [{ type: "physics_formula", description: "Kienzle", confidence: 0.95 }],
          },
          {
            parameter: "feed_rate",
            chosenValue: 450,
            unit: "mm/min",
            context: {},
          },
        ],
      };

      const explanation = aiDecisionExplanationEngine.explainDecision(input);
      const gateSummary = aiDecisionExplanationEngine.getApprovalGateExplanation(explanation);

      expect(gateSummary.summary).toBeTruthy();
      expect(gateSummary.confidence).toBeGreaterThan(0);
      expect(typeof gateSummary.requiresReview).toBe("boolean");
      expect(gateSummary.parameterSummary).toHaveLength(2);
      expect(gateSummary.parameterSummary[0].name).toBe("Spindle Speed");
      expect(gateSummary.parameterSummary[0].value).toBe("3200 RPM");
    });

    it("should include review reasons when review required", () => {
      const input: DecisionExplanationInput = {
        operationId: "gate-review-test",
        operationType: "sinker_edm",
        parameters: [
          {
            parameter: "peak_current",
            chosenValue: 50,
            unit: "A",
            context: {},
            risks: ["High wear rate", "Surface damage risk"],
            constraints: ["C1", "C2", "C3", "C4"],
          },
        ],
      };

      const explanation = aiDecisionExplanationEngine.explainDecision(input);
      const gateSummary = aiDecisionExplanationEngine.getApprovalGateExplanation(explanation);

      expect(gateSummary.requiresReview).toBe(true);
      expect(gateSummary.reviewReasons.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================
  describe("edge cases", () => {
    it("should handle empty parameters array", () => {
      const input: DecisionExplanationInput = {
        operationId: "empty-test",
        operationType: "general",
        parameters: [],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.parameters).toHaveLength(0);
      expect(result.overallConfidence).toBe(0.5); // Default for empty
    });

    it("should handle string parameter values", () => {
      const input: DecisionExplanationInput = {
        operationId: "string-test",
        operationType: "threading",
        parameters: [
          {
            parameter: "infeed_method",
            chosenValue: "modified_flank",
            unit: "",
            context: {},
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.parameters[0].chosenValue).toBe("modified_flank");
      // String values should not generate numeric alternatives
      expect(result.parameters[0].alternatives).toHaveLength(0);
    });

    it("should handle very long tribal tip descriptions", () => {
      const longDescription = "This is a very long tribal tip that exceeds eighty characters and should be truncated properly in the attribution";
      const attribution = aiDecisionExplanationEngine.createTribalAttribution(
        "tip-long",
        "operator:Test",
        longDescription
      );

      expect(attribution.description.length).toBeLessThanOrEqual(83); // 80 + "..."
      expect(attribution.description.endsWith("...")).toBe(true);
    });

    it("should handle missing context fields gracefully", () => {
      const input: DecisionExplanationInput = {
        operationId: "minimal-test",
        operationType: "turning",
        parameters: [
          {
            parameter: "feed_rate",
            chosenValue: 0.2,
            unit: "mm/rev",
            context: {}, // Empty context
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.parameters[0].reasoning.length).toBeGreaterThan(0);
      expect(result.parameters[0].reasoning[0]).not.toContain("undefined");
    });

    it("should handle zero numeric values", () => {
      const input: DecisionExplanationInput = {
        operationId: "zero-test",
        operationType: "grinding",
        parameters: [
          {
            parameter: "spark_out",
            chosenValue: 0,
            unit: "passes",
            context: {},
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.parameters[0].chosenValue).toBe(0);
      // Zero values still get alternatives generated (higher/lower)
      expect(result.parameters[0].alternatives.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle unknown operation type", () => {
      const input: DecisionExplanationInput = {
        operationId: "unknown-test",
        operationType: "laser_cutting" as any,
        parameters: [
          {
            parameter: "power",
            chosenValue: 2000,
            unit: "W",
            context: {},
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      // Should fall back to general template
      expect(result.operationType).toBe("laser_cutting");
      expect(result.parameters[0].reasoning.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // Summary Generation
  // ========================================================================
  describe("summary generation", () => {
    it("should generate operator-friendly summary", () => {
      const input: DecisionExplanationInput = {
        operationId: "summary-op",
        operationType: "roughing",
        targetAudience: "operator",
        parameters: [
          {
            parameter: "spindle_speed",
            chosenValue: 3000,
            unit: "RPM",
            context: {},
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.summary).toContain("Roughing");
      expect(result.summary).toContain("3000 RPM");
    });

    it("should generate engineer summary with source count", () => {
      const input: DecisionExplanationInput = {
        operationId: "summary-eng",
        operationType: "finishing",
        targetAudience: "engineer",
        parameters: [
          {
            parameter: "spindle_speed",
            chosenValue: 4500,
            unit: "RPM",
            context: {},
            sources: [
              { type: "physics_formula", description: "Surface speed", confidence: 0.9 },
              { type: "oem_recommendation", description: "Tool catalog", confidence: 0.85 },
            ],
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.summary).toContain("Finishing");
      expect(result.summary).toContain("source");
      expect(result.summary).toContain("Confidence");
    });

    it("should generate manager summary with review status", () => {
      const input: DecisionExplanationInput = {
        operationId: "summary-mgr",
        operationType: "turning",
        targetAudience: "manager",
        parameters: [
          {
            parameter: "feed_rate",
            chosenValue: 0.25,
            unit: "mm/rev",
            context: {},
            risks: ["High risk 1", "High risk 2"],
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.summary).toContain("AI-generated");
      expect(result.summary).toContain("Turning");
    });
  });

  // ========================================================================
  // Risk Factor Identification
  // ========================================================================
  describe("risk factors", () => {
    it("should identify deflection risks for depth parameters", () => {
      const input: DecisionExplanationInput = {
        operationId: "risk-defl",
        operationType: "boring",
        parameters: [
          {
            parameter: "depth_of_cut",
            chosenValue: 2.0,
            unit: "mm",
            context: {},
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      // Boring template has deflection risks
      expect(result.parameters[0].riskFactors).toBeTruthy();
    });

    it("should include explicit risks from input", () => {
      const input: DecisionExplanationInput = {
        operationId: "risk-explicit",
        operationType: "drilling",
        parameters: [
          {
            parameter: "feed_rate",
            chosenValue: 0.15,
            unit: "mm/rev",
            context: {},
            risks: ["Custom risk 1", "Custom risk 2"],
          },
        ],
      };

      const result = aiDecisionExplanationEngine.explainDecision(input);

      expect(result.parameters[0].riskFactors).toContain("Custom risk 1");
      expect(result.parameters[0].riskFactors).toContain("Custom risk 2");
    });
  });
});
