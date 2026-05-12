/**
 * TK-MS7-U34: LLM Interaction Learning Loop Tests
 *
 * Tests the capture of new tribal knowledge from LLM reasoning interactions.
 */

import { describe, it, expect } from "vitest";
import {
  tribalKnowledgeEngine,
  type LLMReasoningTrace,
  type CaptureCandidate,
} from "../engines/TribalKnowledgeEngine.js";

describe("TK-MS7: LLM Interaction Learning Loop", () => {
  describe("captureFromLLMReasoning", () => {
    it("should extract capture candidates from parameter overrides", () => {
      const reasoning: LLMReasoningTrace = {
        session_id: "test-session-1",
        timestamp: new Date().toISOString(),
        decisions: [
          {
            type: "parameter_override",
            parameter: "cutting_speed",
            original_value: 120,
            new_value: 90,
            action: "Reduced cutting speed by 25%",
            reason: "Material is work-hardened, need to cut below hardened layer",
            context: {
              material: "304 Stainless",
              operation: "roughing",
            },
            outcome: "success",
            outcome_detail: "Eliminated work hardening, improved surface finish",
          },
        ],
      };

      const candidates = tribalKnowledgeEngine.captureFromLLMReasoning(reasoning);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0]).toHaveProperty("title");
      expect(candidates[0]).toHaveProperty("body");
      expect(candidates[0]).toHaveProperty("category");
      expect(candidates[0]).toHaveProperty("confidence");
      expect(candidates[0].source).toBe("llm_reasoning");
      expect(candidates[0].capture_type).toBe("parameter_override");
    });

    it("should extract capture candidates from issue identifications", () => {
      const reasoning: LLMReasoningTrace = {
        session_id: "test-session-2",
        timestamp: new Date().toISOString(),
        decisions: [],
        issues_identified: [
          {
            category: "workholding",
            summary: "Part vibration during finishing",
            description: "Detected excessive vibration during finishing pass due to insufficient clamping force on thin wall",
            resolution: "Added soft jaws to distribute clamping pressure and reduced DOC",
            resolution_outcome: "resolved",
            prevention_advice: "For thin-wall parts, always use soft jaws and verify clamping pressure before finishing",
            confidence: 85,
            context: {
              material: "6061-T6",
              operation: "finishing",
            },
          },
        ],
      };

      const candidates = tribalKnowledgeEngine.captureFromLLMReasoning(reasoning);

      expect(candidates.length).toBeGreaterThan(0);
      const issueCandidate = candidates.find(c => c.capture_type === "issue_identification");
      expect(issueCandidate).toBeDefined();
      expect(issueCandidate?.category).toBe("fixturing");
    });

    it("should extract capture candidates from workarounds", () => {
      const reasoning: LLMReasoningTrace = {
        session_id: "test-session-3",
        timestamp: new Date().toISOString(),
        decisions: [],
        workarounds: [
          {
            problem: "Tool chatter in deep pocket",
            solution: "Reduced stepover to 15% and increased RPM by 20%",
            reason: "Lighter radial engagement at higher speed eliminates resonance",
            caveats: "Only effective for pockets deeper than 2xD",
            outcome: "success",
            context: {
              material: "4140",
              operation: "pocketing",
            },
          },
        ],
      };

      const candidates = tribalKnowledgeEngine.captureFromLLMReasoning(reasoning);

      expect(candidates.length).toBeGreaterThan(0);
      const workaround = candidates.find(c => c.capture_type === "workaround");
      expect(workaround).toBeDefined();
      expect(workaround?.knowledge_type).toBe("workaround");
    });

    it("should auto-categorize based on content", () => {
      const reasoning: LLMReasoningTrace = {
        session_id: "test-session-4",
        timestamp: new Date().toISOString(),
        decisions: [
          {
            type: "parameter_override",
            parameter: "feed_rate",
            original_value: 0.1,
            new_value: 0.08,
            action: "Reduced feed rate",
            reason: "Tooling cannot handle the original feed in this material",
            context: {
              material: "Inconel 718",
            },
            outcome: "success",
          },
        ],
      };

      const candidates = tribalKnowledgeEngine.captureFromLLMReasoning(reasoning);

      // Should auto-categorize based on keywords
      expect(candidates[0].category).toBe("speeds_feeds");
    });

    it("should include LLM-learned tag", () => {
      const reasoning: LLMReasoningTrace = {
        session_id: "test-session-5",
        timestamp: new Date().toISOString(),
        decisions: [
          {
            type: "parameter_override",
            parameter: "DOC",
            original_value: 2,
            new_value: 1,
            action: "Reduced depth of cut",
            reason: "Wall too thin for original DOC",
            context: {},
            outcome: "success",
          },
        ],
      };

      const candidates = tribalKnowledgeEngine.captureFromLLMReasoning(reasoning);

      expect(candidates[0].tags).toContain("llm-learned");
    });

    it("should calculate confidence based on outcome", () => {
      const successReasoning: LLMReasoningTrace = {
        session_id: "test-success",
        timestamp: new Date().toISOString(),
        decisions: [
          {
            type: "parameter_override",
            parameter: "speed",
            action: "Adjusted speed",
            reason: "Material property",
            context: {},
            outcome: "success",
          },
        ],
      };

      const candidates = tribalKnowledgeEngine.captureFromLLMReasoning(successReasoning);

      // Successful outcomes should have higher confidence
      expect(candidates[0].confidence).toBeGreaterThanOrEqual(70);
      expect(candidates[0].confidence).toBeLessThanOrEqual(90);
    });

    it("should handle empty reasoning trace", () => {
      const reasoning: LLMReasoningTrace = {
        session_id: "test-empty",
        timestamp: new Date().toISOString(),
        decisions: [],
      };

      const candidates = tribalKnowledgeEngine.captureFromLLMReasoning(reasoning);

      expect(candidates).toEqual([]);
    });

    it("should skip failed outcomes", () => {
      const reasoning: LLMReasoningTrace = {
        session_id: "test-failure",
        timestamp: new Date().toISOString(),
        decisions: [
          {
            type: "parameter_override",
            parameter: "speed",
            action: "Increased speed",
            reason: "Try to reduce cycle time",
            context: {},
            outcome: "failure",  // Should be skipped
          },
        ],
      };

      const candidates = tribalKnowledgeEngine.captureFromLLMReasoning(reasoning);

      expect(candidates).toEqual([]);
    });
  });

  describe("capture candidate structure", () => {
    it("should generate suggested ID", () => {
      const reasoning: LLMReasoningTrace = {
        session_id: "test-id",
        timestamp: new Date().toISOString(),
        decisions: [
          {
            type: "parameter_override",
            parameter: "speed",
            action: "Adjusted",
            reason: "Test",
            context: {},
            outcome: "success",
          },
        ],
      };

      const candidates = tribalKnowledgeEngine.captureFromLLMReasoning(reasoning);

      expect(candidates[0].suggested_id).toMatch(/^tk-llm-\d+-\w{4}$/);
    });

    it("should mark low-confidence candidates for validation", () => {
      const reasoning: LLMReasoningTrace = {
        session_id: "test-validation",
        timestamp: new Date().toISOString(),
        decisions: [
          {
            type: "parameter_override",
            parameter: "speed",
            action: "Minor adjustment",
            reason: "Slight optimization",
            context: {},
            outcome: "success",
          },
        ],
      };

      const candidates = tribalKnowledgeEngine.captureFromLLMReasoning(reasoning);

      // Low confidence should require validation
      if (candidates[0].confidence < 80) {
        expect(candidates[0].requires_validation).toBe(true);
      }
    });

    it("should include context in tags", () => {
      const reasoning: LLMReasoningTrace = {
        session_id: "test-tags",
        timestamp: new Date().toISOString(),
        decisions: [
          {
            type: "parameter_override",
            parameter: "speed",
            action: "Adjusted for material",
            reason: "Material specific",
            context: {
              material: "Titanium",
              machine: "Okuma",
              operation: "turning",
            },
            outcome: "success",
          },
        ],
      };

      const candidates = tribalKnowledgeEngine.captureFromLLMReasoning(reasoning);

      expect(candidates[0].tags).toContain("titanium");
      expect(candidates[0].tags).toContain("okuma");
      expect(candidates[0].tags).toContain("turning");
    });
  });

  describe("validateAndCaptureLLMTip", () => {
    it("should reject duplicate tips", () => {
      // Create a candidate that's very similar to an existing tip
      // Using exact same body text to trigger similarity detection
      const candidate: CaptureCandidate = {
        title: "Stainless 304 work hardening prevention",
        body: "Never dwell in the cut with 304/316 stainless. Use climb milling, positive rake angles, and maintain constant chip load. If you hear the pitch change, you've already work-hardened the surface — increase speed 15% and take a fresh cut below the hardened layer.",
        category: "speeds_feeds",
        domain: "shop_floor",
        knowledge_type: "best_practice",
        tags: ["llm-learned", "stainless"],
        confidence: 75,
        source: "llm_reasoning",
        context: {},
        capture_type: "parameter_override",
        requires_validation: false,
        suggested_id: "tk-llm-test-dup",
      };

      const result = tribalKnowledgeEngine.validateAndCaptureLLMTip(candidate);

      expect(result.captured).toBe(false);
      expect(result.reason).toMatch(/similar|already exists/i);
    });

    it("should reject low confidence candidates", () => {
      const candidate: CaptureCandidate = {
        title: "Very uncertain tip",
        body: "This might work sometimes maybe",
        category: "general",
        domain: "shop_floor",
        knowledge_type: "best_practice",
        tags: ["llm-learned"],
        confidence: 30,  // Too low
        source: "llm_reasoning",
        context: {},
        capture_type: "parameter_override",
        requires_validation: true,
        suggested_id: "tk-llm-test-low",
      };

      const result = tribalKnowledgeEngine.validateAndCaptureLLMTip(candidate);

      expect(result.captured).toBe(false);
      expect(result.reason).toMatch(/confidence.*low/i);
    });

    it("should capture valid unique tips", () => {
      const uniqueId = `unique-${Date.now()}`;
      const candidate: CaptureCandidate = {
        title: `LLM Test Tip ${uniqueId}`,
        body: `This is a unique test tip for validation ${uniqueId}. It contains specific machining advice that doesn't match any existing tips.`,
        category: "process_engineering",
        domain: "shop_floor",
        knowledge_type: "best_practice",
        tags: ["llm-learned", "test"],
        confidence: 75,
        source: "llm_reasoning",
        context: {
          material: "Test Material",
        },
        capture_type: "parameter_override",
        requires_validation: false,
        suggested_id: `tk-llm-${uniqueId}`,
      };

      const result = tribalKnowledgeEngine.validateAndCaptureLLMTip(candidate);

      expect(result.captured).toBe(true);
      expect(result.tip_id).toBeDefined();
      expect(result.reason).toMatch(/captured/i);
    });
  });

  describe("knowledge type inference", () => {
    it("should detect workaround knowledge type", () => {
      const reasoning: LLMReasoningTrace = {
        session_id: "test-workaround-type",
        timestamp: new Date().toISOString(),
        decisions: [],
        workarounds: [
          {
            problem: "Test problem",
            solution: "Test solution",
            reason: "Test reason",
            outcome: "success",
            context: {},
          },
        ],
      };

      const candidates = tribalKnowledgeEngine.captureFromLLMReasoning(reasoning);

      expect(candidates[0].knowledge_type).toBe("workaround");
    });

    it("should detect danger zone from never/don't keywords", () => {
      const reasoning: LLMReasoningTrace = {
        session_id: "test-danger",
        timestamp: new Date().toISOString(),
        decisions: [],
        issues_identified: [
          {
            category: "safety",
            summary: "Never do this dangerous thing",
            description: "Never attempt to clear chips while spindle is rotating - danger of injury",
            resolution: "Wait for spindle stop",
            resolution_outcome: "resolved",
            confidence: 95,
            context: {},
          },
        ],
      };

      const candidates = tribalKnowledgeEngine.captureFromLLMReasoning(reasoning);

      expect(candidates[0].knowledge_type).toBe("danger_zone");
    });
  });
});
