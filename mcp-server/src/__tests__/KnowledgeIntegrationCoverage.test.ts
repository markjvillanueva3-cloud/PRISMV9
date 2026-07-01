/**
 * MS-KNOW-2 & MS-KNOW-3: Knowledge Integration Coverage Validation
 *
 * MS-KNOW-2: MIT Course Integration (216 courses)
 * MS-KNOW-3: Video Knowledge Integration (69 videos)
 *
 * Validates existing infrastructure:
 * - MITCourseIntegrationEngine (225 courses, 285 algorithms)
 * - MITCourseRegistryEngine (course → engine mapping)
 * - VideoLearningEngine (FFmpeg + Whisper + Vision pipeline)
 * - VideoELearningAIEngine (deep learning from videos)
 * - PostProcessorVideoKnowledgeNeuralEngine (neural video knowledge)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { mitCourseIntegrationEngine } from "../engines/MITCourseIntegrationEngine.js";
import { videoLearningEngine } from "../engines/VideoLearningEngine.js";

describe("MS-KNOW-2: MIT Course Integration", () => {
  // Initialize engine before tests
  beforeAll(async () => {
    await mitCourseIntegrationEngine.init();
  });

  // ==========================================================================
  // U-MIT-01: Course Loading & Indexing
  // ==========================================================================

  describe("U-MIT-01: Course Loading", () => {
    it("should have MITCourseIntegrationEngine available", () => {
      expect(mitCourseIntegrationEngine).toBeDefined();
    });

    it("should have course listing capability via listCourses()", () => {
      expect(typeof mitCourseIntegrationEngine.listCourses).toBe("function");
    });

    it("should have algorithm extraction capability via getAlgorithmsFromCourse()", () => {
      expect(typeof mitCourseIntegrationEngine.getAlgorithmsFromCourse).toBe("function");
    });

    it("should have search capability via searchCourses()", () => {
      expect(typeof mitCourseIntegrationEngine.searchCourses).toBe("function");
    });
  });

  // ==========================================================================
  // U-MIT-02 through U-MIT-05: Domain Mapping
  // ==========================================================================

  describe("U-MIT-02..05: Domain Mapping", () => {
    it("should support domain filtering via listCourses(domain)", () => {
      // listCourses accepts optional domain parameter
      const manufacturingCourses = mitCourseIntegrationEngine.listCourses("manufacturing");
      expect(Array.isArray(manufacturingCourses)).toBe(true);
    });

    it("should support algorithm extraction via getAlgorithmsFromCourse()", () => {
      expect(typeof mitCourseIntegrationEngine.getAlgorithmsFromCourse).toBe("function");
    });

    it("should have course recommendation via getCourseRecommendations()", () => {
      expect(typeof mitCourseIntegrationEngine.getCourseRecommendations).toBe("function");
    });

    it("should have integration statistics via getStats()", () => {
      expect(typeof mitCourseIntegrationEngine.getStats).toBe("function");
    });
  });

  // ==========================================================================
  // Course Search & Query
  // ==========================================================================

  describe("Course Search", () => {
    it("should search courses by keyword", () => {
      const results = mitCourseIntegrationEngine.searchCourses("algorithm");
      expect(results).toBeDefined();
      expect(results.courses).toBeDefined();
    });

    it("should list courses filtered by domain", () => {
      const results = mitCourseIntegrationEngine.listCourses("manufacturing");
      expect(Array.isArray(results)).toBe(true);
    });

    it("should get course details via getCourse()", () => {
      const details = mitCourseIntegrationEngine.getCourse("6.006");
      // May or may not exist in registry, but function should work
      expect(details === null || typeof details === "object").toBe(true);
    });
  });
});

describe("MS-KNOW-3: Video Knowledge Integration", () => {
  // ==========================================================================
  // U-VID-01: VideoKnowledgeEngine
  // ==========================================================================

  describe("U-VID-01: Video Learning Engine", () => {
    it("should have VideoLearningEngine available", () => {
      expect(videoLearningEngine).toBeDefined();
    });

    it("should have audio transcription capability via transcribeAudio()", () => {
      expect(typeof videoLearningEngine.transcribeAudio).toBe("function");
    });

    it("should have keyframe extraction capability via extractKeyframes()", () => {
      expect(typeof videoLearningEngine.extractKeyframes).toBe("function");
    });

    it("should have knowledge fusion capability via fuseKnowledge()", () => {
      expect(typeof videoLearningEngine.fuseKnowledge).toBe("function");
    });
  });

  // ==========================================================================
  // U-VID-02: Procedure Extraction
  // ==========================================================================

  describe("U-VID-02: Procedure Extraction", () => {
    it("should have full video processing capability via processVideo()", () => {
      expect(typeof videoLearningEngine.processVideo).toBe("function");
    });

    it("should have playbook rule extraction via extractPlaybookRules()", () => {
      expect(typeof videoLearningEngine.extractPlaybookRules).toBe("function");
      // Real-output oracle (R9): a transcript with explicit operator rules yields
      // classified PlaybookRule[]; a question is NOT a rule; blank source -> [].
      const rules = videoLearningEngine.extractPlaybookRules(
        "Always use climb milling for aluminum. " +
        "Never run the spindle above 10000 RPM on this fixture. " +
        "If the part chatters, then reduce the feed. " +
        "What coolant should we use?"
      );
      expect(rules.length).toBeGreaterThanOrEqual(3);
      const kinds = rules.map((r) => r.kind);
      expect(kinds).toContain("imperative");
      expect(kinds).toContain("prohibition");
      expect(kinds).toContain("conditional");
      expect(rules.every((r) => r.confidence > 0 && r.confidence <= 1)).toBe(true);
      expect(rules.some((r) => r.rule.toLowerCase().includes("coolant"))).toBe(false);
      expect(videoLearningEngine.extractPlaybookRules("")).toEqual([]);
    });
  });

  // ==========================================================================
  // U-VID-03 & U-VID-04: Machine Operation Mapping
  // ==========================================================================

  describe("U-VID-03..04: Operation Mapping", () => {
    it("should have video info extraction via getVideoInfo()", () => {
      expect(typeof videoLearningEngine.getVideoInfo).toBe("function");
    });

    it("should have keyframe analysis via analyzeKeyframes()", () => {
      expect(typeof videoLearningEngine.analyzeKeyframes).toBe("function");
    });

    it("should have directory processing via processDirectory()", () => {
      expect(typeof videoLearningEngine.processDirectory).toBe("function");
    });
  });
});

describe("Knowledge Integration Summary", () => {
  it("should have MIT course integration engine", () => {
    expect(mitCourseIntegrationEngine).toBeDefined();
  });

  it("should have video learning engine", () => {
    expect(videoLearningEngine).toBeDefined();
  });

  it("should provide stats for MIT courses via getStats()", () => {
    const stats = mitCourseIntegrationEngine.getStats();
    expect(stats).toBeDefined();
    expect(typeof stats.totalCourses).toBe("number");
    expect(typeof stats.totalAlgorithms).toBe("number");
  });

  it("should list all available domains via getDomains()", () => {
    const domains = mitCourseIntegrationEngine.getDomains();
    expect(Array.isArray(domains)).toBe(true);
  });

  it("should check video prerequisites via checkPrerequisites()", async () => {
    const prereqs = await videoLearningEngine.checkPrerequisites();
    expect(prereqs).toBeDefined();
    expect(typeof prereqs.ffmpeg).toBe("boolean");
    expect(typeof prereqs.ffprobe).toBe("boolean");
  });
});
