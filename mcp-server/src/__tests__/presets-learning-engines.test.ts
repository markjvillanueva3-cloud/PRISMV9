/**
 * Tests for Session 6-10: PresetLibraryEngine + LearningProgressionEngine
 */
import { describe, it, expect, beforeEach } from "vitest";
import { PresetLibraryEngine } from "../engines/PresetLibraryEngine.js";
import { LearningProgressionEngine } from "../engines/LearningProgressionEngine.js";

// ─── PresetLibraryEngine ─────────────────────────────────────────────────────

describe("PresetLibraryEngine", () => {
  let engine: PresetLibraryEngine;

  beforeEach(() => { engine = new PresetLibraryEngine(); });

  describe("savePreset", () => {
    it("saves a speed_feed preset with auto-validation", () => {
      const p = engine.savePreset({
        user_id: "U-1", preset_type: "speed_feed", name: "6061 Pocket VF-2",
        params: { spindle_speed: 8000, feed_rate: 2400, depth_of_cut: 3 },
        tags: ["aluminum", "pocket"], machine_id: "VF-2", material_id: "6061-T6",
      });
      expect(p.id).toBeTruthy();
      expect(p.preset_type).toBe("speed_feed");
      expect(p.validated).toBe(true);
      expect(p.validation_errors).toHaveLength(0);
      expect(p.tags).toEqual(["aluminum", "pocket"]);
    });

    it("flags out-of-range speed_feed params", () => {
      const p = engine.savePreset({
        user_id: "U-1", preset_type: "speed_feed", name: "Bad Preset",
        params: { spindle_speed: 999999, feed_per_tooth: -1 },
      });
      expect(p.validated).toBe(false);
      expect(p.validation_errors.length).toBeGreaterThan(0);
    });

    it("saves non-speed_feed preset without validation errors", () => {
      const p = engine.savePreset({
        user_id: "U-1", preset_type: "fixture", name: "Kurt Vise Setup",
        params: { vise_jaw_width: 6, parallels: true },
      });
      expect(p.validated).toBe(true);
    });

    it("rejects invalid preset type", () => {
      expect(() => engine.savePreset({
        user_id: "U-1", preset_type: "invalid" as any, name: "X", params: {},
      })).toThrow("Invalid preset type");
    });

    it("enforces per-user limit", () => {
      for (let i = 0; i < 500; i++) {
        engine.savePreset({ user_id: "U-LIMIT", preset_type: "fixture", name: `P${i}`, params: {} });
      }
      expect(() => engine.savePreset({
        user_id: "U-LIMIT", preset_type: "fixture", name: "P501", params: {},
      })).toThrow("Maximum 500");
    });
  });

  describe("listPresets / searchPresets", () => {
    it("lists user presets filtered by type", () => {
      engine.savePreset({ user_id: "U-2", preset_type: "speed_feed", name: "SF1", params: {} });
      engine.savePreset({ user_id: "U-2", preset_type: "toolpath", name: "TP1", params: {} });
      const result = engine.listPresets({ user_id: "U-2", preset_type: "speed_feed" });
      expect(result.presets).toHaveLength(1);
      expect(result.presets[0].name).toBe("SF1");
    });

    it("includes shared presets from other users", () => {
      const p = engine.savePreset({ user_id: "U-3", preset_type: "speed_feed", name: "Shared", params: {} });
      engine.sharePreset(p.id, "U-3");
      const result = engine.listPresets({ user_id: "U-4", include_shared: true });
      expect(result.presets.some((r) => r.name === "Shared")).toBe(true);
    });

    it("searches by text query", () => {
      engine.savePreset({ user_id: "U-5", preset_type: "speed_feed", name: "Aluminum Pocket", params: {} });
      engine.savePreset({ user_id: "U-5", preset_type: "speed_feed", name: "Steel Profile", params: {} });
      const result = engine.searchPresets({ user_id: "U-5", query: "aluminum" });
      expect(result.presets).toHaveLength(1);
      expect(result.presets[0].name).toBe("Aluminum Pocket");
    });
  });

  describe("sharePreset / comparePresets", () => {
    it("shares and unshares a preset", () => {
      const p = engine.savePreset({ user_id: "U-6", preset_type: "fixture", name: "Shared", params: {} });
      engine.sharePreset(p.id, "U-6");
      expect(engine.getPreset(p.id)!.is_shared).toBe(true);
      engine.unsharePreset(p.id, "U-6");
      expect(engine.getPreset(p.id)!.is_shared).toBe(false);
    });

    it("prevents sharing another user's preset", () => {
      const p = engine.savePreset({ user_id: "U-7", preset_type: "fixture", name: "X", params: {} });
      expect(() => engine.sharePreset(p.id, "U-8")).toThrow("another user");
    });

    it("compares 2 presets of same type", () => {
      const p1 = engine.savePreset({ user_id: "U-9", preset_type: "speed_feed", name: "A",
        params: { spindle_speed: 8000, feed_rate: 2400 } });
      const p2 = engine.savePreset({ user_id: "U-9", preset_type: "speed_feed", name: "B",
        params: { spindle_speed: 10000, feed_rate: 3000 } });
      const cmp = engine.comparePresets([p1.id, p2.id], "U-9");
      expect(cmp.presets).toHaveLength(2);
      expect(cmp.diffs.length).toBeGreaterThan(0);
      expect(cmp.diffs.every((d) => !d.all_equal)).toBe(true);
    });

    it("rejects comparing different types", () => {
      const p1 = engine.savePreset({ user_id: "U-10", preset_type: "speed_feed", name: "A", params: {} });
      const p2 = engine.savePreset({ user_id: "U-10", preset_type: "fixture", name: "B", params: {} });
      expect(() => engine.comparePresets([p1.id, p2.id], "U-10")).toThrow("same type");
    });
  });

  describe("validatePreset / deletePreset / incrementUseCount", () => {
    it("validates and updates preset validation status", () => {
      const p = engine.savePreset({ user_id: "U-11", preset_type: "speed_feed", name: "V",
        params: { spindle_speed: 999999 } });
      const result = engine.validatePreset(p.id);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("increments use count", () => {
      const p = engine.savePreset({ user_id: "U-12", preset_type: "fixture", name: "F", params: {} });
      engine.incrementUseCount(p.id);
      engine.incrementUseCount(p.id);
      expect(engine.getPreset(p.id)!.use_count).toBe(2);
    });

    it("deletes own preset", () => {
      const p = engine.savePreset({ user_id: "U-13", preset_type: "fixture", name: "D", params: {} });
      expect(engine.deletePreset(p.id, "U-13")).toEqual({ deleted: true });
      expect(engine.getPreset(p.id)).toBeNull();
    });

    it("prevents deleting another user's preset", () => {
      const p = engine.savePreset({ user_id: "U-14", preset_type: "fixture", name: "X", params: {} });
      expect(() => engine.deletePreset(p.id, "U-15")).toThrow("another user");
    });
  });
});

// ─── LearningProgressionEngine ───────────────────────────────────────────────

describe("LearningProgressionEngine", () => {
  let engine: LearningProgressionEngine;

  beforeEach(() => { engine = new LearningProgressionEngine(); });

  const createTestCourse = (overrides: any = {}) => engine.createCourse({
    title: "VMC Setup Basics", domain: "MachineOperation", difficulty: "beginner",
    modules: [
      { title: "Work Holding", has_checkpoint: true, checkpoint_type: "quiz" as const },
      { title: "WCS Setup", has_checkpoint: true, checkpoint_type: "quiz" as const },
      { title: "First Part", has_checkpoint: true, checkpoint_type: "practical" as const },
    ],
    machine_type: "VMC", material_focus: "aluminum", cam_system: "Fusion360",
    process_type: "milling", is_published: true, ...overrides,
  });

  describe("createCourse", () => {
    it("creates a course with ordered modules", () => {
      const c = createTestCourse();
      expect(c.id).toBeTruthy();
      expect(c.modules).toHaveLength(3);
      expect(c.modules[0].idx).toBe(0);
      expect(c.modules[2].idx).toBe(2);
      expect(c.estimated_hours).toBeGreaterThan(0);
    });

    it("rejects empty title or domain", () => {
      expect(() => engine.createCourse({ title: "", domain: "X", modules: [{ title: "M" }] })).toThrow("title");
      expect(() => engine.createCourse({ title: "T", domain: "", modules: [{ title: "M" }] })).toThrow("domain");
    });

    it("rejects empty modules", () => {
      expect(() => engine.createCourse({ title: "T", domain: "D", modules: [] })).toThrow("module");
    });
  });

  describe("enroll + prerequisites", () => {
    it("enrolls in a published course", () => {
      const c = createTestCourse();
      const e = engine.enroll({ user_id: "U-1", course_id: c.id });
      expect(e.status).toBe("enrolled");
      expect(e.current_module_idx).toBe(0);
      expect(e.progress_pct).toBe(0);
    });

    it("rejects enrollment in unpublished course", () => {
      const c = createTestCourse({ is_published: false });
      expect(() => engine.enroll({ user_id: "U-2", course_id: c.id })).toThrow("unpublished");
    });

    it("rejects duplicate enrollment", () => {
      const c = createTestCourse();
      engine.enroll({ user_id: "U-3", course_id: c.id });
      expect(() => engine.enroll({ user_id: "U-3", course_id: c.id })).toThrow("Already enrolled");
    });

    it("checks prerequisites", () => {
      const prereq = createTestCourse({ title: "Prereq" });
      const advanced = createTestCourse({ title: "Advanced", prerequisites: [prereq.id] });
      expect(() => engine.enroll({ user_id: "U-4", course_id: advanced.id })).toThrow("Prerequisite");
    });
  });

  describe("checkpoint submission + gated progression", () => {
    it("passes checkpoint and advances to next module", () => {
      const c = createTestCourse();
      const e = engine.enroll({ user_id: "U-5", course_id: c.id });
      // Submit correct answer for module 0
      const cp = engine.submitCheckpoint({
        enrollment_id: e.id, module_idx: 0,
        answers: [{ answer: "Work Holding" }, { answer: "beginner" }],
      });
      expect(cp.passed).toBe(true);
      expect(cp.score).toBe(100);
      const progress = engine.getProgress("U-5", c.id)!;
      expect(progress.current_module_idx).toBe(1);
      expect(progress.status).toBe("in_progress");
    });

    it("fails checkpoint and stays at current module", () => {
      const c = createTestCourse();
      const e = engine.enroll({ user_id: "U-6", course_id: c.id });
      const cp = engine.submitCheckpoint({
        enrollment_id: e.id, module_idx: 0,
        answers: [{ answer: "wrong" }, { answer: "wrong" }],
      });
      expect(cp.passed).toBe(false);
      expect(cp.score).toBe(0);
      const progress = engine.getProgress("U-6", c.id)!;
      expect(progress.current_module_idx).toBe(0); // didn't advance
    });

    it("completes course after all checkpoints passed", () => {
      const c = createTestCourse();
      const e = engine.enroll({ user_id: "U-7", course_id: c.id });
      for (let i = 0; i < 3; i++) {
        engine.submitCheckpoint({
          enrollment_id: e.id, module_idx: i,
          answers: [{ answer: c.modules[i].title }, { answer: c.difficulty }],
        });
      }
      const progress = engine.getProgress("U-7", c.id)!;
      expect(progress.status).toBe("completed");
      expect(progress.progress_pct).toBe(100);
      expect(progress.score).toBeGreaterThan(0);
    });

    it("rejects skipping ahead", () => {
      const c = createTestCourse();
      const e = engine.enroll({ user_id: "U-8", course_id: c.id });
      expect(() => engine.submitCheckpoint({
        enrollment_id: e.id, module_idx: 2,
        answers: [{ answer: "x" }],
      })).toThrow("currently at module");
    });
  });

  describe("enrollment summary", () => {
    it("returns summary across multiple courses", () => {
      const c1 = createTestCourse({ title: "Course A" });
      const c2 = createTestCourse({ title: "Course B" });
      engine.enroll({ user_id: "U-9", course_id: c1.id });
      engine.enroll({ user_id: "U-9", course_id: c2.id });
      const summary = engine.getEnrollmentSummary("U-9");
      expect(summary.total_enrolled).toBe(2);
      expect(summary.enrollments).toHaveLength(2);
    });
  });

  describe("knowledge facets search", () => {
    it("searches by machine type", () => {
      createTestCourse({ title: "VMC Course", machine_type: "VMC" });
      createTestCourse({ title: "Lathe Course", machine_type: "Lathe" });
      const result = engine.searchCourses({ machine_type: "VMC" });
      expect(result.courses).toHaveLength(1);
      expect(result.courses[0].title).toBe("VMC Course");
      expect(result.facets.machine_types["VMC"]).toBe(1);
    });

    it("searches by text query across facets", () => {
      createTestCourse({ title: "Titanium Machining", material_focus: "titanium" });
      createTestCourse({ title: "Aluminum Basics", material_focus: "aluminum" });
      const result = engine.searchCourses({ query: "titanium" });
      expect(result.courses).toHaveLength(1);
    });

    it("builds facet counts from results", () => {
      createTestCourse({ domain: "CAM", difficulty: "beginner" });
      createTestCourse({ domain: "CAM", difficulty: "advanced" });
      createTestCourse({ domain: "ShopPractice", difficulty: "beginner" });
      const result = engine.searchCourses({});
      expect(result.facets.domains["CAM"]).toBe(2);
      expect(result.facets.domains["ShopPractice"]).toBe(1);
      expect(result.facets.difficulties["beginner"]).toBe(2);
    });
  });

  describe("media", () => {
    it("adds and lists media for a course", () => {
      const c = createTestCourse();
      engine.addMedia({ course_id: c.id, module_idx: 0, media_type: "video", title: "Setup Video", duration_sec: 300 });
      engine.addMedia({ course_id: c.id, module_idx: 1, media_type: "pdf", title: "WCS Guide" });
      const all = engine.listMedia(c.id);
      expect(all).toHaveLength(2);
      const mod0 = engine.listMedia(c.id, 0);
      expect(mod0).toHaveLength(1);
      expect(mod0[0].title).toBe("Setup Video");
    });

    it("rejects media for nonexistent course", () => {
      expect(() => engine.addMedia({ course_id: "NOPE", media_type: "video", title: "T" })).toThrow("not found");
    });
  });

  describe("getCourse", () => {
    it("returns course by ID", () => {
      const c = createTestCourse();
      const found = engine.getCourse(c.id);
      expect(found).not.toBeNull();
      expect(found!.title).toBe("VMC Setup Basics");
    });

    it("returns null for nonexistent course", () => {
      expect(engine.getCourse("NONEXISTENT")).toBeNull();
    });
  });

  describe("completed enrollment guard", () => {
    it("rejects checkpoint on completed enrollment", () => {
      const c = createTestCourse();
      const e = engine.enroll({ user_id: "U-DONE", course_id: c.id });
      // Complete all 3 modules
      for (let i = 0; i < 3; i++) {
        engine.submitCheckpoint({
          enrollment_id: e.id, module_idx: i,
          answers: [{ answer: c.modules[i].title }, { answer: c.difficulty }],
        });
      }
      const progress = engine.getProgress("U-DONE", c.id)!;
      expect(progress.status).toBe("completed");
      // Try submitting another checkpoint — should throw
      expect(() => engine.submitCheckpoint({
        enrollment_id: e.id, module_idx: 0,
        answers: [{ answer: "any" }],
      })).toThrow("already completed");
    });
  });
});
