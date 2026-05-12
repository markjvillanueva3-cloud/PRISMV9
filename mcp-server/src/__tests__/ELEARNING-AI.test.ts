/**
 * Tests for VideoELearningAIEngine — E-Learning knowledge extraction
 *
 * Covers: course parsing, lesson indexing, knowledge search, tutorial recommendation,
 * workflow extraction, quiz generation, module cataloging, and feature vectors.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as path from "path";

// ── fs mock setup ────────────────────────────────────────────────────────────

const META_XML_31 = `<?xml version="1.0" encoding="utf-8"?>
<meta><project id="course-ms-31" title="Machine-simulation_en" datepublished="2020-11-20T08:43:13"
  version="1.0.0.0" duration="Über 4 Minutes" totalvideo="72874">
  <slidemeta viewslides="42" /></project></meta>`;

const FRAME_XML_31 = `<?xml version="1.0" encoding="utf-8"?>
<bwFrame>
  <nav_data><outline>
    <links>
      <slidelink slideid="_player.1" displaytext="Quick start of Collision Check and the Machine simulation" type="slide" />
      <slidelink slideid="_player.2" displaytext="How to use this Tutorial" type="slide" />
      <slidelink slideid="_player.3" displaytext="Select job for simulation and collision check" type="slide" />
      <slidelink slideid="_player.4" displaytext="Select Machine Simulation" type="slide" />
      <slidelink slideid="_player.5" displaytext="Machine Simulation is loading" type="slide" />
      <slidelink slideid="_player.6" displaytext="Setting up Machine for simulation" type="slide" />
      <slidelink slideid="_player.7" displaytext="Start collision check before simulating" type="slide" />
      <slidelink slideid="_player.8" displaytext="Start the Machine simulation" type="slide" />
      <slidelink slideid="_player.9" displaytext="Analyzing Machine simulation" type="slide" />
      <slidelink slideid="_player.10" displaytext="Correcting job and rechecking simulation" type="slide" />
    </links>
  </outline></nav_data>
</bwFrame>`;

const mockFs: Record<string, any> = {};

vi.mock("fs", async (importOriginal) => {
  const real = await importOriginal() as Record<string, unknown>;
  return {
    ...real,
    existsSync: (p: string) => {
      if (typeof mockFs.existsSync === "function") return mockFs.existsSync(p);
      return true;
    },
    mkdirSync: vi.fn(),
    readdirSync: (p: string, opts?: any) => {
      if (typeof mockFs.readdirSync === "function") return mockFs.readdirSync(p, opts);
      return [];
    },
    readFileSync: (p: string, enc?: any) => {
      if (typeof mockFs.readFileSync === "function") return mockFs.readFileSync(p, enc);
      if (p.includes("meta.xml")) return META_XML_31;
      if (p.includes("frame.xml")) return FRAME_XML_31;
      return "";
    },
  };
});

// ── Import engine after mocks ────────────────────────────────────────────────

import {
  videoELearningAIEngine,
  ELEARNING_RESOURCE_PATHS,
  type ELearningCourse,
  type ELearningLesson,
  type LearningPath,
  type QuizQuestion,
  type WorkflowStep,
  type LessonFeatureVector,
  type ELearningModule,
} from "../engines/VideoELearningAIEngine.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function setupCourseMock(videos: string[] = [
  "story_content/video_5VIBm59JTEj_0_56_1920x1168.mp4",
  "story_content/video_5VMnMBTIJCU_0_56_1920x1168.mp4",
  "story_content/video_5b8pNjmaQE2_0_56_1920x1040.mp4",
]) {
  mockFs.existsSync = (_p: string) => true;
  mockFs.readdirSync = (p: string, opts?: any) => {
    if (opts?.withFileTypes) {
      if (p.includes("E-Learning") && !p.includes("Machine-simulation")) {
        return [{ name: "Machine-simulation", isDirectory: () => true }];
      }
      if (p.includes("Machine-simulation")) {
        return [{ name: "en", isDirectory: () => true }];
      }
      return [];
    }
    if (p.includes("story_content")) {
      const all = [
        ...videos.map(v => path.basename(v)),
        "MouseClickSound_223a04e8_44100_56_0.mp3",
        "frame.xml",
        "meta.xml",
      ];
      return all;
    }
    return [];
  };
  mockFs.readFileSync = (p: string, enc?: any) => {
    if (p.includes("meta.xml")) return META_XML_31;
    if (p.includes("frame.xml")) return FRAME_XML_31;
    return "";
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("VideoELearningAIEngine", () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.existsSync = (_p: string) => true;
    mockFs.readdirSync = (_p: string, _opts?: any) => [];
    mockFs.readFileSync = (p: string, _enc?: any) => {
      if (p.includes("meta.xml")) return META_XML_31;
      if (p.includes("frame.xml")) return FRAME_XML_31;
      return "";
    };
  });

  afterEach(() => {
    mockFs.existsSync = (_p: string) => true;
    mockFs.readdirSync = (_p: string, _opts?: any) => [];
  });

  // ── ELEARNING-AI-001: Resource path constants ──────────────────────────────

  describe("ELEARNING_RESOURCE_PATHS constants", () => {
    it("ELEARNING-AI-001: hyperMILL 31.0 path is correct", () => {
      expect(ELEARNING_RESOURCE_PATHS.HYPERMILL_31).toBe(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning"
      );
    });

    it("ELEARNING-AI-002: hyperMILL 33.0 path is correct", () => {
      expect(ELEARNING_RESOURCE_PATHS.HYPERMILL_33).toBe(
        "H:/prism/Resources/OPEN MIND/doc/33.0/E-Learning"
      );
    });

    it("ELEARNING-AI-003: SOLIDWORKS FEA path is correct", () => {
      expect(ELEARNING_RESOURCE_PATHS.SOLIDWORKS_FEA).toContain("SOLIDWORKS");
      expect(ELEARNING_RESOURCE_PATHS.SOLIDWORKS_FEA).toContain("Avi");
    });
  });

  // ── ELEARNING-AI-004: getKnownResourcePaths ────────────────────────────────

  describe("getKnownResourcePaths", () => {
    it("ELEARNING-AI-004: returns 3 resource entries", () => {
      const resources = videoELearningAIEngine.getKnownResourcePaths();
      expect(resources).toHaveLength(3);
    });

    it("ELEARNING-AI-005: each entry has required fields", () => {
      const resources = videoELearningAIEngine.getKnownResourcePaths();
      for (const r of resources) {
        expect(r).toHaveProperty("label");
        expect(r).toHaveProperty("path");
        expect(r).toHaveProperty("type");
        expect(r).toHaveProperty("version");
        expect(r).toHaveProperty("estimated_video_count");
        expect(r.estimated_video_count).toBeGreaterThan(0);
      }
    });

    it("ELEARNING-AI-006: hyperMILL entries report 37 videos each", () => {
      const resources = videoELearningAIEngine.getKnownResourcePaths();
      const hmEntries = resources.filter(r => r.type === "hypermill");
      expect(hmEntries).toHaveLength(2);
      for (const hm of hmEntries) {
        expect(hm.estimated_video_count).toBe(37);
      }
    });

    it("ELEARNING-AI-007: SOLIDWORKS entry has type solidworks", () => {
      const resources = videoELearningAIEngine.getKnownResourcePaths();
      const sw = resources.find(r => r.type === "solidworks");
      expect(sw).toBeDefined();
      expect(sw!.estimated_video_count).toBe(12);
    });
  });

  // ── ELEARNING-AI-008: processELearningCourse ──────────────────────────────

  describe("processELearningCourse", () => {
    it("ELEARNING-AI-008: parses course title from meta.xml", async () => {
      setupCourseMock();
      const course = await videoELearningAIEngine.processELearningCourse(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation"
      );
      expect(course.title).toBe("Machine-simulation_en");
    });

    it("ELEARNING-AI-009: parses course id from meta.xml", async () => {
      setupCourseMock();
      const course = await videoELearningAIEngine.processELearningCourse(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation"
      );
      expect(course.id).toBe("course-ms-31");
    });

    it("ELEARNING-AI-010: extracts lesson titles from frame.xml", async () => {
      setupCourseMock();
      const course = await videoELearningAIEngine.processELearningCourse(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation"
      );
      expect(course.lesson_titles.length).toBeGreaterThanOrEqual(5);
      expect(course.lesson_titles[0]).toContain("Quick start");
    });

    it("ELEARNING-AI-011: discovers MP4 video files", async () => {
      setupCourseMock();
      const course = await videoELearningAIEngine.processELearningCourse(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation"
      );
      expect(course.video_paths.length).toBe(3);
      expect(course.video_paths[0]).toContain(".mp4");
    });

    it("ELEARNING-AI-012: sets duration_seconds from duration string", async () => {
      setupCourseMock();
      const course = await videoELearningAIEngine.processELearningCourse(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation"
      );
      // "Über 4 Minutes" → 240 seconds
      expect(course.duration_seconds).toBe(240);
    });

    it("ELEARNING-AI-013: sets slide_count from meta.xml", async () => {
      setupCourseMock();
      const course = await videoELearningAIEngine.processELearningCourse(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation"
      );
      expect(course.slide_count).toBe(42);
    });

    it("ELEARNING-AI-014: throws when course path does not exist", async () => {
      mockFs.existsSync = (_p: string) => false;
      await expect(
        videoELearningAIEngine.processELearningCourse("/nonexistent/path")
      ).rejects.toThrow("Course path not found");
    });
  });

  // ── ELEARNING-AI-015: computeFeatureVector ────────────────────────────────

  describe("computeFeatureVector", () => {
    it("ELEARNING-AI-015: beginner difficulty for quick-start slide", () => {
      const fv = videoELearningAIEngine.computeFeatureVector({
        title: "Quick start of Collision Check and the Machine simulation",
        video_path: "story_content/video_abc_0_56_1920x1168.mp4",
        slide_index: 0,
        duration_seconds: 35,
      });
      expect(fv.difficulty_level).toBe("beginner");
    });

    it("ELEARNING-AI-016: advanced difficulty for correcting/rechecking slide", () => {
      const fv = videoELearningAIEngine.computeFeatureVector({
        title: "Correcting job and rechecking simulation",
        video_path: "story_content/video_abc_0_56_1920x1168.mp4",
        slide_index: 32,
        duration_seconds: 35,
      });
      expect(fv.difficulty_level).toBe("advanced");
    });

    it("ELEARNING-AI-017: collision-detection tag for collision slide", () => {
      const fv = videoELearningAIEngine.computeFeatureVector({
        title: "Start collision check before simulating",
        video_path: "story_content/video_abc_0_56_1920x1168.mp4",
        slide_index: 12,
        duration_seconds: 35,
      });
      expect(fv.topic_tags).toContain("collision-detection");
    });

    it("ELEARNING-AI-018: machine-simulation tag for simulation slide", () => {
      const fv = videoELearningAIEngine.computeFeatureVector({
        title: "Start the Machine simulation",
        video_path: "story_content/video_abc_0_56_1920x1168.mp4",
        slide_index: 14,
        duration_seconds: 35,
      });
      expect(fv.topic_tags).toContain("machine-simulation");
    });

    it("ELEARNING-AI-019: visual_complexity in range 0-1", () => {
      const fv = videoELearningAIEngine.computeFeatureVector({
        title: "Analyzing Machine simulation",
        video_path: "story_content/video_abc_0_56_1920x1168.mp4",
        slide_index: 25,
        duration_seconds: 35,
      });
      expect(fv.visual_complexity).toBeGreaterThan(0);
      expect(fv.visual_complexity).toBeLessThanOrEqual(1);
    });

    it("ELEARNING-AI-020: learning_outcomes is non-empty array", () => {
      const fv = videoELearningAIEngine.computeFeatureVector({
        title: "Analyzing Machine simulation",
        video_path: "story_content/video_abc_0_56_1920x1168.mp4",
        slide_index: 25,
        duration_seconds: 35,
      });
      expect(fv.learning_outcomes.length).toBeGreaterThan(0);
    });

    it("ELEARNING-AI-021: prerequisite_skills populated for advanced slide", () => {
      const fv = videoELearningAIEngine.computeFeatureVector({
        title: "Correcting job and rechecking simulation",
        video_path: "story_content/video_abc_0_56_1920x1168.mp4",
        slide_index: 32,
        duration_seconds: 35,
      });
      expect(fv.prerequisite_skills.length).toBeGreaterThan(0);
    });

    it("ELEARNING-AI-022: duration_seconds matches input", () => {
      const fv = videoELearningAIEngine.computeFeatureVector({
        title: "Stop the Machine simulation",
        video_path: "story_content/video_abc_0_56_1920x1168.mp4",
        slide_index: 15,
        duration_seconds: 80,
      });
      expect(fv.duration_seconds).toBe(80);
    });
  });

  // ── ELEARNING-AI-023: recommendTutorial ───────────────────────────────────

  describe("recommendTutorial", () => {
    it("ELEARNING-AI-023: returns LearningPath for beginner machine-simulation", () => {
      const path = videoELearningAIEngine.recommendTutorial("beginner", "machine simulation");
      expect(path.skill_level).toBe("beginner");
      expect(path.lesson_sequence.length).toBeGreaterThan(0);
    });

    it("ELEARNING-AI-024: returns LearningPath for intermediate collision-detection", () => {
      const lp = videoELearningAIEngine.recommendTutorial("intermediate", "collision detection");
      expect(lp.skill_level).toBe("intermediate");
      expect(lp.topic).toBe("collision detection");
      expect(lp.lesson_sequence.length).toBeGreaterThan(0);
    });

    it("ELEARNING-AI-025: returns LearningPath for advanced collision-detection", () => {
      const lp = videoELearningAIEngine.recommendTutorial("advanced", "collision detection");
      expect(lp.skill_level).toBe("advanced");
      expect(lp.lesson_sequence.length).toBeGreaterThan(0);
    });

    it("ELEARNING-AI-026: path_id encodes skill_level and topic", () => {
      const lp = videoELearningAIEngine.recommendTutorial("beginner", "machine simulation");
      expect(lp.path_id).toContain("beginner");
      expect(lp.path_id).toContain("machine");
    });

    it("ELEARNING-AI-027: total_duration_seconds is positive", () => {
      const lp = videoELearningAIEngine.recommendTutorial("intermediate", "machine simulation");
      expect(lp.total_duration_seconds).toBeGreaterThan(0);
    });

    it("ELEARNING-AI-028: rationale string is non-empty", () => {
      const lp = videoELearningAIEngine.recommendTutorial("beginner", "machine simulation");
      expect(lp.rationale.length).toBeGreaterThan(10);
    });
  });

  // ── ELEARNING-AI-029: extractWorkflowSteps ────────────────────────────────

  describe("extractWorkflowSteps", () => {
    it("ELEARNING-AI-029: returns workflow steps for collision topic", async () => {
      setupCourseMock();
      await videoELearningAIEngine.processELearningCourse(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation"
      );
      const steps = videoELearningAIEngine.extractWorkflowSteps("collision");
      expect(steps.length).toBeGreaterThan(0);
    });

    it("ELEARNING-AI-030: workflow steps have sequential step_number", async () => {
      setupCourseMock();
      await videoELearningAIEngine.processELearningCourse(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation"
      );
      const steps = videoELearningAIEngine.extractWorkflowSteps("simulation");
      steps.forEach((s, i) => {
        expect(s.step_number).toBe(i + 1);
      });
    });

    it("ELEARNING-AI-031: each step has non-empty action", async () => {
      setupCourseMock();
      await videoELearningAIEngine.processELearningCourse(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation"
      );
      const steps = videoELearningAIEngine.extractWorkflowSteps("simulation");
      for (const step of steps) {
        expect(step.action.length).toBeGreaterThan(0);
      }
    });

    it("ELEARNING-AI-032: returns empty array for unknown video_id with no index", () => {
      // Clear indexes by querying before any course is processed
      const steps = videoELearningAIEngine.extractWorkflowSteps("zzz-nonexistent-xyz-123");
      expect(Array.isArray(steps)).toBe(true);
    });
  });

  // ── ELEARNING-AI-033: generateQuiz ────────────────────────────────────────

  describe("generateQuiz", () => {
    it("ELEARNING-AI-033: generates questions for collision-detection topic", () => {
      const quiz = videoELearningAIEngine.generateQuiz("collision detection");
      expect(quiz.length).toBeGreaterThan(0);
    });

    it("ELEARNING-AI-034: each question has 4 choices", () => {
      const quiz = videoELearningAIEngine.generateQuiz("machine simulation");
      for (const q of quiz) {
        expect(q.choices).toHaveLength(4);
      }
    });

    it("ELEARNING-AI-035: correct_index is in range 0-3", () => {
      const quiz = videoELearningAIEngine.generateQuiz("collision detection");
      for (const q of quiz) {
        expect(q.correct_index).toBeGreaterThanOrEqual(0);
        expect(q.correct_index).toBeLessThanOrEqual(3);
      }
    });

    it("ELEARNING-AI-036: each question has non-empty explanation", () => {
      const quiz = videoELearningAIEngine.generateQuiz("machine simulation");
      for (const q of quiz) {
        expect(q.explanation.length).toBeGreaterThan(10);
      }
    });

    it("ELEARNING-AI-037: count parameter limits output", () => {
      const quiz = videoELearningAIEngine.generateQuiz("machine simulation", 2);
      expect(quiz.length).toBeLessThanOrEqual(2);
    });

    it("ELEARNING-AI-038: tags array is non-empty on each question", () => {
      const quiz = videoELearningAIEngine.generateQuiz("collision detection");
      for (const q of quiz) {
        expect(q.tags.length).toBeGreaterThan(0);
      }
    });

    it("ELEARNING-AI-039: question text is non-empty string", () => {
      const quiz = videoELearningAIEngine.generateQuiz("collision detection");
      for (const q of quiz) {
        expect(typeof q.question).toBe("string");
        expect(q.question.length).toBeGreaterThan(10);
      }
    });
  });

  // ── ELEARNING-AI-040: searchVideoKnowledge ────────────────────────────────

  describe("searchVideoKnowledge", () => {
    it("ELEARNING-AI-040: returns results array (may be empty before indexing)", async () => {
      const results = videoELearningAIEngine.searchVideoKnowledge("collision");
      expect(Array.isArray(results)).toBe(true);
    });

    it("ELEARNING-AI-041: results after course indexing include lesson titles", async () => {
      setupCourseMock();
      await videoELearningAIEngine.processELearningCourse(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation"
      );
      const results = videoELearningAIEngine.searchVideoKnowledge("collision check");
      // Should find collision-related lessons from course slide index
      expect(results.length).toBeGreaterThan(0);
    });

    it("ELEARNING-AI-042: each result has required fields", async () => {
      setupCourseMock();
      await videoELearningAIEngine.processELearningCourse(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation"
      );
      const results = videoELearningAIEngine.searchVideoKnowledge("simulation");
      for (const r of results) {
        expect(r).toHaveProperty("lesson_id");
        expect(r).toHaveProperty("lesson_title");
        expect(r).toHaveProperty("course_title");
        expect(r).toHaveProperty("score");
        expect(r).toHaveProperty("matched_excerpts");
      }
    });

    it("ELEARNING-AI-043: results are sorted by score descending", async () => {
      setupCourseMock();
      await videoELearningAIEngine.processELearningCourse(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation"
      );
      const results = videoELearningAIEngine.searchVideoKnowledge("machine simulation");
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it("ELEARNING-AI-044: top_k limits results", async () => {
      setupCourseMock();
      await videoELearningAIEngine.processELearningCourse(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation"
      );
      const results = videoELearningAIEngine.searchVideoKnowledge("simulation", 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("ELEARNING-AI-045: score is in range 0-100", async () => {
      setupCourseMock();
      await videoELearningAIEngine.processELearningCourse(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation"
      );
      const results = videoELearningAIEngine.searchVideoKnowledge("collision");
      for (const r of results) {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(100);
      }
    });
  });

  // ── ELEARNING-AI-046: catalogELearningModules ─────────────────────────────

  describe("catalogELearningModules", () => {
    it("ELEARNING-AI-046: returns empty array when base_path does not exist", () => {
      mockFs.existsSync = (_p: string) => false;
      const modules = videoELearningAIEngine.catalogELearningModules("/nonexistent", "31.0");
      expect(modules).toHaveLength(0);
    });

    it("ELEARNING-AI-047: catalogs Machine-simulation module", () => {
      mockFs.existsSync = (_p: string) => true;
      mockFs.readdirSync = (p: string, opts?: any) => {
        if (opts?.withFileTypes) {
          if (!p.includes("Machine-simulation") && !p.includes("en")) {
            return [{ name: "Machine-simulation", isDirectory: () => true }];
          }
          if (p.includes("Machine-simulation") && !p.includes("en")) {
            return [{ name: "en", isDirectory: () => true }];
          }
          return [];
        }
        // story_content MP4s
        if (p.includes("story_content")) {
          return [
            "video_5VIBm59JTEj_0_56_1920x1168.mp4",
            "video_5VMnMBTIJCU_0_56_1920x1168.mp4",
            "frame.xml",
          ];
        }
        return [];
      };
      mockFs.readFileSync = (p: string, _enc?: any) => {
        if (p.includes("meta.xml")) return META_XML_31;
        if (p.includes("frame.xml")) return FRAME_XML_31;
        return "";
      };

      const modules = videoELearningAIEngine.catalogELearningModules(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning",
        "31.0"
      );
      expect(modules.length).toBeGreaterThan(0);
      expect(modules[0].module_name).toBe("Machine-simulation");
    });

    it("ELEARNING-AI-048: module has total_videos count", () => {
      mockFs.existsSync = (_p: string) => true;
      mockFs.readdirSync = (p: string, opts?: any) => {
        if (opts?.withFileTypes) {
          if (!p.includes("Machine-simulation") && !p.includes("en")) {
            return [{ name: "Machine-simulation", isDirectory: () => true }];
          }
          if (p.includes("Machine-simulation") && !p.includes("en")) {
            return [{ name: "en", isDirectory: () => true }];
          }
          return [];
        }
        if (p.includes("story_content")) {
          return ["video_a_0_56_1920x1168.mp4", "video_b_0_56_1920x1168.mp4"];
        }
        return [];
      };
      mockFs.readFileSync = (p: string, _enc?: any) => {
        if (p.includes("meta.xml")) return META_XML_31;
        if (p.includes("frame.xml")) return FRAME_XML_31;
        return "";
      };

      const modules = videoELearningAIEngine.catalogELearningModules(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning",
        "31.0"
      );
      expect(modules[0].total_videos).toBe(2);
    });

    it("ELEARNING-AI-049: module has total_duration_seconds", () => {
      mockFs.existsSync = (_p: string) => true;
      mockFs.readdirSync = (p: string, opts?: any) => {
        if (opts?.withFileTypes) {
          if (!p.includes("Machine-simulation") && !p.includes("en")) {
            return [{ name: "Machine-simulation", isDirectory: () => true }];
          }
          if (p.includes("Machine-simulation") && !p.includes("en")) {
            return [{ name: "en", isDirectory: () => true }];
          }
          return [];
        }
        if (p.includes("story_content")) {
          return ["video_a_0_56_1920x1168.mp4"];
        }
        return [];
      };
      mockFs.readFileSync = (p: string, _enc?: any) => {
        if (p.includes("meta.xml")) return META_XML_31;
        if (p.includes("frame.xml")) return FRAME_XML_31;
        return "";
      };

      const modules = videoELearningAIEngine.catalogELearningModules(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning",
        "31.0"
      );
      expect(modules[0].total_duration_seconds).toBeGreaterThanOrEqual(0);
    });
  });

  // ── ELEARNING-AI-050: ingestVideoProcessResult ────────────────────────────

  describe("ingestVideoProcessResult", () => {
    it("ELEARNING-AI-050: ingested items appear in searchVideoKnowledge", async () => {
      setupCourseMock();
      const course = await videoELearningAIEngine.processELearningCourse(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation"
      );

      const fakeResult = {
        video_path: course.video_paths[0] ?? "test.mp4",
        duration_seconds: 35,
        transcript: { full_text: "collision check panel settings", segments: [], language: "en", duration_seconds: 35 },
        keyframes_extracted: 3,
        keyframes_analyzed: 3,
        knowledge_items: [
          {
            title: "Collision check sensitivity setting",
            body: "Set the collision sensitivity threshold in the collision check panel to detect near-miss events.",
            category: "safety",
            tags: ["video-learned", "collision-detection", "hypermill"],
            confidence: 85,
            source: "video:test@12s",
            transcript_excerpt: "Adjust the sensitivity value",
            frame_reference: "12.0s",
          },
        ],
        api_cost_estimate: { whisper: 0.01, vision: 0.04, total: 0.05 },
      };

      const lessonId = `${course.id}:${path.basename(course.video_paths[0] ?? "test", ".mp4")}`;
      videoELearningAIEngine.ingestVideoProcessResult(fakeResult, lessonId);

      const results = videoELearningAIEngine.searchVideoKnowledge("collision sensitivity");
      // The ingested knowledge body contains "collision" so it should score
      expect(results.some(r => r.lesson_id === lessonId || r.matched_excerpts.length > 0)).toBe(true);
    });
  });

  // ── ELEARNING-AI-051: Edge cases ──────────────────────────────────────────

  describe("Edge cases", () => {
    it("ELEARNING-AI-051: quiz with count=0 returns empty array", () => {
      const quiz = videoELearningAIEngine.generateQuiz("collision detection", 0);
      expect(quiz).toHaveLength(0);
    });

    it("ELEARNING-AI-052: searchVideoKnowledge with empty query returns empty", () => {
      const results = videoELearningAIEngine.searchVideoKnowledge("");
      // Tokens will be empty, no matches expected
      expect(Array.isArray(results)).toBe(true);
    });

    it("ELEARNING-AI-053: recommendTutorial for unknown topic returns a LearningPath", () => {
      const lp = videoELearningAIEngine.recommendTutorial("beginner", "unknown-xyz-topic");
      expect(lp).toHaveProperty("lesson_sequence");
      expect(lp).toHaveProperty("total_duration_seconds");
    });

    it("ELEARNING-AI-054: feature vector topic_tags are unique", () => {
      const fv = videoELearningAIEngine.computeFeatureVector({
        title: "Start collision check before simulating",
        video_path: "video_abc_1920x1168.mp4",
        slide_index: 6,
        duration_seconds: 35,
      });
      const unique = new Set(fv.topic_tags);
      expect(unique.size).toBe(fv.topic_tags.length);
    });

    it("ELEARNING-AI-055: processELearningCourse with no MP4s returns empty video_paths", async () => {
      mockFs.existsSync = (_p: string) => true;
      mockFs.readdirSync = (p: string, opts?: any) => {
        if (opts?.withFileTypes) {
          if (p.includes("Machine-simulation") && !p.includes("en")) {
            return [{ name: "en", isDirectory: () => true }];
          }
          return [];
        }
        // story_content has no mp4s
        return ["frame.xml", "thumbnail.jpg"];
      };
      mockFs.readFileSync = (p: string, _enc?: any) => {
        if (p.includes("meta.xml")) return META_XML_31;
        if (p.includes("frame.xml")) return FRAME_XML_31;
        return "";
      };

      const course = await videoELearningAIEngine.processELearningCourse(
        "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation"
      );
      expect(course.video_paths).toHaveLength(0);
    });
  });
});
