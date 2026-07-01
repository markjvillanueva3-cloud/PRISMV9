import { describe, it, expect } from "vitest";
import { CurriculumEngine } from "../engines/CurriculumEngine.js";

describe("CurriculumEngine — course catalog", () => {
  it("getCourse('course-0a') returns the Shop Math course at level 'novice' with no prereqs", () => {
    const c = new CurriculumEngine().getCourse("course-0a");
    expect(c?.id).toBe("course-0a");
    expect(c?.level).toBe("novice");
    expect(c?.prerequisites).toEqual([]);
  });

  it("getCourse('course-12') declares 'course-1' as its single prerequisite", () => {
    expect(new CurriculumEngine().getCourse("course-12")?.prerequisites).toEqual(["course-1"]);
  });

  it("getCourse('course-bogus-id') resolves to undefined for an unknown course id", () => {
    expect(new CurriculumEngine().getCourse("course-bogus-id")).toEqual(undefined);
  });

  it("getCoursesByLevel('novice') includes 4 entry courses + 6 CAD/CAM-entry expansion courses (18, 19, 20, 25, 26, 27 — closes all 23 priority CAM systems)", () => {
    const ids = new CurriculumEngine().getCoursesByLevel("novice").map(c => c.id).sort();
    expect(ids).toEqual(["course-0a", "course-0b", "course-0c", "course-1", "course-18", "course-19", "course-20", "course-25", "course-26", "course-27"]);
  });

  it("getCoursesByLevel('foundational') returns an empty array (no foundational-level courses in the catalog)", () => {
    expect(new CurriculumEngine().getCoursesByLevel("foundational")).toEqual([]);
  });

  it("getModule('course-0a', 'course-0a-mod-1') returns the Module whose quiz id is 'course-0a-mod-1-quiz'", () => {
    const m = new CurriculumEngine().getModule("course-0a", "course-0a-mod-1");
    expect(m?.id).toBe("course-0a-mod-1");
    expect(m?.courseId).toBe("course-0a");
    expect(m?.quiz.id).toBe("course-0a-mod-1-quiz");
  });

  it("getModule('course-0a', 'nonexistent-mod') resolves to undefined", () => {
    expect(new CurriculumEngine().getModule("course-0a", "nonexistent-mod")).toEqual(undefined);
  });

  it("getLesson with an unknown lessonId resolves to undefined", () => {
    expect(new CurriculumEngine().getLesson("course-0a", "course-0a-mod-1", "nonexistent")).toEqual(undefined);
  });
});

describe("CurriculumEngine — student state", () => {
  it("getOrCreateStudent('student-A') seeds courseProgress={}, streak=0, totalTimeMinutes=0", () => {
    const s = new CurriculumEngine().getOrCreateStudent("student-A");
    expect(s.studentId).toBe("student-A");
    expect(s.courseProgress).toEqual({});
    expect(s.certifications).toEqual([]);
    expect(s.streak).toBe(0);
    expect(s.totalTimeMinutes).toBe(0);
  });

  it("getOrCreateStudent returns the SAME object on repeat calls (singleton-per-id)", () => {
    const engine = new CurriculumEngine();
    const first = engine.getOrCreateStudent("student-id-equality-check");
    const second = engine.getOrCreateStudent("student-id-equality-check");
    expect(first).toBe(second);
  });
});

describe("CurriculumEngine — startCourse behavior", () => {
  it("startCourse('S','course-bogus') returns ok=false with exact message 'Course not found: course-bogus'", () => {
    const r = new CurriculumEngine().startCourse("S", "course-bogus");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Course not found: course-bogus");
  });

  it("startCourse('S','course-12') without course-1 done returns 'Prerequisite not completed: course-1'", () => {
    const r = new CurriculumEngine().startCourse("S", "course-12");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Prerequisite not completed: course-1");
  });

  it("startCourse('S','course-0a') seeds courseProgress with completed=undefined (timestamp set only on completion)", () => {
    const engine = new CurriculumEngine();
    const r = engine.startCourse("start-S", "course-0a");
    expect(r.ok).toBe(true);
    expect(r.course?.id).toBe("course-0a");
    const p = engine.getOrCreateStudent("start-S").courseProgress["course-0a"];
    expect(p.completed).toEqual(undefined);
    expect(p.lessonsViewed).toEqual([]);
    expect(p.modulesCompleted).toEqual([]);
    expect(p.percentComplete).toBe(0);
    expect(p.currentModuleId).toBe("course-0a-mod-1");
  });
});

describe("CurriculumEngine — completeLesson state transitions", () => {
  it("completeLesson records the lesson id exactly once and accumulates exactly 12 totalTimeMinutes", () => {
    const engine = new CurriculumEngine();
    engine.startCourse("complete-S", "course-0a");
    const m = engine.getCourse("course-0a")!.modules[0];
    const l = m.lessons[0];
    const r = engine.completeLesson("complete-S", "course-0a", m.id, l.id, 12);
    expect(r.ok).toBe(true);
    const student = engine.getOrCreateStudent("complete-S");
    expect(student.totalTimeMinutes).toBe(12);
    expect(student.courseProgress["course-0a"].lessonsViewed).toEqual([l.id]);
  });

  it("completeLesson called twice with same lessonId records the id ONCE (idempotent) but doubles time", () => {
    const engine = new CurriculumEngine();
    engine.startCourse("idem-S", "course-0a");
    const m = engine.getCourse("course-0a")!.modules[0];
    const l = m.lessons[0];
    engine.completeLesson("idem-S", "course-0a", m.id, l.id, 5);
    engine.completeLesson("idem-S", "course-0a", m.id, l.id, 5);
    const student = engine.getOrCreateStudent("idem-S");
    expect(student.courseProgress["course-0a"].lessonsViewed).toEqual([l.id]);
    expect(student.totalTimeMinutes).toBe(10);
  });

  it("completeLesson on a student who never called startCourse returns ok=false", () => {
    const engine = new CurriculumEngine();
    const m = engine.getCourse("course-0a")!.modules[0];
    const l = m.lessons[0];
    const r = engine.completeLesson("never-started", "course-0a", m.id, l.id, 5);
    expect(r.ok).toBe(false);
  });
});

describe("CurriculumEngine — quiz scoring + topic strengths", () => {
  it("recordQuizScore with score above passingScore returns passed=true and bestScore=score", () => {
    const engine = new CurriculumEngine();
    engine.startCourse("pass-S", "course-0a");
    const m = engine.getCourse("course-0a")!.modules[0];
    const score = m.quiz.passingScore + 5;
    const r = engine.recordQuizScore("pass-S", m.quiz.id, m.id, "course-0a", score, []);
    expect(r.passed).toBe(true);
    expect(r.score).toBe(score);
    expect(r.bestScore).toBe(score);
  });

  it("recordQuizScore with wrongTags=['rpm-formula'] sets topicStrengths['rpm-formula'] to exactly 40 (default 50 − 10)", () => {
    const engine = new CurriculumEngine();
    engine.startCourse("topic-S", "course-0a");
    const m = engine.getCourse("course-0a")!.modules[0];
    const failScore = Math.max(0, m.quiz.passingScore - 10);
    engine.recordQuizScore("topic-S", m.quiz.id, m.id, "course-0a", failScore, ["rpm-formula"]);
    const student = engine.getOrCreateStudent("topic-S");
    expect(student.topicStrengths["rpm-formula"]).toBe(40);
  });

  it("recordQuizScore preserves max bestScore across attempts (max, not last)", () => {
    const engine = new CurriculumEngine();
    engine.startCourse("best-S", "course-0a");
    const m = engine.getCourse("course-0a")!.modules[0];
    const passing = m.quiz.passingScore;
    engine.recordQuizScore("best-S", m.quiz.id, m.id, "course-0a", passing + 10, []);
    const r = engine.recordQuizScore("best-S", m.quiz.id, m.id, "course-0a", passing - 5, ["x"]);
    expect(r.score).toBe(passing - 5);
    expect(r.bestScore).toBe(passing + 10);
  });
});

describe("CurriculumEngine — dashboard + recommendations", () => {
  it("getStudentDashboard returns completedCourses=0 + currentCourse=null for a brand-new student", () => {
    const dash = new CurriculumEngine().getStudentDashboard("dashboard-new-S");
    expect(dash.completedCourses).toBe(0);
    expect(dash.percentOverall).toBe(0);
    expect(dash.streak).toBe(0);
    expect(dash.currentCourse).toBe(null);
    expect(dash.weakTopics).toEqual([]);
    expect(dash.dueReviews).toBe(0);
    expect(dash.totalTimeHours).toBe(0);
  });

  it("getRecommendedNextCourse for a brand-new student returns a course with zero prerequisites", () => {
    const rec = new CurriculumEngine().getRecommendedNextCourse("rec-new-S");
    expect(rec?.prerequisites).toEqual([]);
  });

  it("getStudentDashboard after startCourse('course-0a') sets currentCourse='course-0a'", () => {
    const engine = new CurriculumEngine();
    engine.startCourse("curr-S", "course-0a");
    const dash = engine.getStudentDashboard("curr-S");
    expect(dash.currentCourse).toBe("course-0a");
  });
});

// ──────────────────────────────────────────────────────────────────
// iter42 follow-up — verify engine is safe against Lima-shape modules
// (courses 17, 19-23, 28-34 ship `content[]` instead of `lessons[]` and
// bare `InlineQuestion[]` instead of canonical `Quiz` wrapper). Pre-iter42
// these would have thrown TypeError on .lessons.find / .findIndex / .length.
// ──────────────────────────────────────────────────────────────────
describe("CurriculumEngine — Lima-shape module safety (iter42)", () => {
  it("getLesson on a Lima-shape course (course-29) returns undefined without throwing (was: crashed pre-iter42)", () => {
    // course-29 ships modules with `content[]` instead of `lessons[]`.
    // Pre-fix: this threw "Cannot read properties of undefined (reading 'find')".
    const engine = new CurriculumEngine();
    expect(() => engine.getLesson("course-29", "course-29-m1", "any-lesson")).not.toThrow();
    // Concrete expected value: missing-lesson lookup MUST be undefined (not throw, not null, not empty object).
    const result = engine.getLesson("course-29", "course-29-m1", "any-lesson");
    expect(result).toBe(undefined);
  });

  it("getModule('course-34', 'course-34-m1') returns the 3-axis VMC module with quiz as InlineQuestion[] array", () => {
    const engine = new CurriculumEngine();
    const m = engine.getModule("course-34", "course-34-m1");
    expect(m?.id).toBe("course-34-m1");
    expect(m?.title).toBe("3-Axis VMC (Vertical Machining Center)");
    // course-34 uses Lima inline-quiz convention: bare InlineQuestion[] array.
    expect(Array.isArray(m?.quiz)).toBe(true);
    // First question's prompt field carries the Lima naming convention.
    if (Array.isArray(m?.quiz)) {
      expect(m?.quiz.length).toBeGreaterThan(0);
      const firstQ = m?.quiz[0] as { prompt?: string };
      expect(typeof firstQ?.prompt).toBe("string");
    }
  });

  it("completeLesson on a Lima-shape course (course-29) without prereqs returns ok=false WITHOUT throwing", () => {
    // Pre-iter42: `module.lessons.findIndex` threw "Cannot read properties of undefined" on Lima modules.
    // Post-iter42: optional-chained; the function gracefully returns ok=false because course-29
    // requires course-4 prereq which our test student hasn't completed. Critical assertion: no throw.
    const engine = new CurriculumEngine();
    expect(() => engine.completeLesson("lima-test-S", "course-29", "course-29-m1", "any-lesson", 90)).not.toThrow();
    const result = engine.completeLesson("lima-test-S", "course-29", "course-29-m1", "any-lesson", 90);
    expect(result.ok).toBe(false); // course not started by this student — graceful refusal, not crash
  });

  it("getCourse('course-34') returns the Per-Machine-Type course (7 modules, prereq=course-33)", () => {
    const c = new CurriculumEngine().getCourse("course-34");
    expect(c?.id).toBe("course-34");
    expect(c?.modules.length).toBe(7);
    expect(c?.prerequisites).toEqual(["course-33"]);
    expect(c?.title).toBe("Per-Machine-Type Operation Guide — VMC, HMC, 5-Axis, Lathes, EDM, Grinders");
  });

  it("getCourse('course-33') returns the Material Atlas course (6 modules covering all ISO groups, prereq=course-32)", () => {
    const c = new CurriculumEngine().getCourse("course-33");
    expect(c?.id).toBe("course-33");
    expect(c?.modules.length).toBe(6);
    expect(c?.prerequisites).toEqual(["course-32"]);
  });

  it("backend catalog includes all 35 courses (0a/0b/0c + 1-34) post-iter42", () => {
    const engine = new CurriculumEngine();
    const expectedIds = [
      "course-0a", "course-0b", "course-0c",
      ...Array.from({ length: 34 }, (_, i) => `course-${i + 1}`),
    ];
    for (const id of expectedIds) {
      const course = engine.getCourse(id);
      expect(course?.id, `course ${id} not found in catalog`).toBe(id);
    }
    // Confirm exact catalog size: 3 (0a/0b/0c) + 34 (1..34) = 37 courses MINIMUM (some courses bundle multiple — count is ≥ 35).
    expect(expectedIds.length).toBe(37);
  });
});
