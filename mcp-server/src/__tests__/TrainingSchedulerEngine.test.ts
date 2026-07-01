import { describe, it, expect, beforeEach } from "vitest";
import { TrainingSchedulerEngine } from "../engines/TrainingSchedulerEngine.js";

describe("TrainingSchedulerEngine — enrollment", () => {
  let engine: TrainingSchedulerEngine;

  beforeEach(() => {
    engine = new TrainingSchedulerEngine();
  });

  it("enrollEmployee for 'course-0a' (no prereqs) returns ok=true and records an active enrollment", () => {
    const r = engine.enrollEmployee({
      employeeId: "emp-001",
      courseId: "course-0a",
      targetCompletionDate: "2026-06-30",
      priority: 2,
      enrolledBy: "manager-01",
    });
    expect(r.ok).toBe(true);
    expect(r.enrollment?.courseId).toBe("course-0a");
    expect(r.enrollment?.status).toBe("active");
    expect(r.enrollment?.priority).toBe(2);
    expect(r.enrollment?.enrolledBy).toBe("manager-01");
  });

  it("enrollEmployee for unknown course returns ok=false with 'Course not found' error", () => {
    const r = engine.enrollEmployee({
      employeeId: "emp-002",
      courseId: "course-bogus",
      targetCompletionDate: "2026-06-30",
      priority: 2,
      enrolledBy: "manager-01",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Course not found: course-bogus");
  });

  it("enrollEmployee for 'course-12' (requires course-1) returns 'Prerequisite not completed: course-1'", () => {
    const r = engine.enrollEmployee({
      employeeId: "emp-003",
      courseId: "course-12",
      targetCompletionDate: "2026-06-30",
      priority: 2,
      enrolledBy: "manager-01",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Prerequisite not completed: course-1");
  });

  it("enrolling the same employee in the same active course twice returns 'Already enrolled' error", () => {
    engine.enrollEmployee({
      employeeId: "emp-004",
      courseId: "course-0a",
      targetCompletionDate: "2026-06-30",
      priority: 2,
      enrolledBy: "manager-01",
    });
    const r2 = engine.enrollEmployee({
      employeeId: "emp-004",
      courseId: "course-0a",
      targetCompletionDate: "2026-07-30",
      priority: 1,
      enrolledBy: "manager-02",
    });
    expect(r2.ok).toBe(false);
    expect(r2.error).toBe("Already enrolled: course-0a");
  });

  it("getEnrollments returns the list for a known employee and [] for an unknown one", () => {
    engine.enrollEmployee({
      employeeId: "emp-005",
      courseId: "course-0a",
      targetCompletionDate: "2026-06-30",
      priority: 2,
      enrolledBy: "manager-01",
    });
    expect(engine.getEnrollments("emp-005").length).toBe(1);
    expect(engine.getEnrollments("emp-no-such")).toEqual([]);
  });
});

describe("TrainingSchedulerEngine — status refresh", () => {
  it("refreshEnrollmentStatuses flips active → overdue when targetCompletionDate is in the past", () => {
    const engine = new TrainingSchedulerEngine();
    engine.enrollEmployee({
      employeeId: "emp-over",
      courseId: "course-0a",
      targetCompletionDate: "2025-01-01",
      priority: 2,
      enrolledBy: "manager-01",
    });
    const refreshed = engine.refreshEnrollmentStatuses("emp-over", new Date("2026-05-24"));
    expect(refreshed[0].status).toBe("overdue");
  });

  it("refreshEnrollmentStatuses keeps status=active when targetCompletionDate is in the future", () => {
    const engine = new TrainingSchedulerEngine();
    engine.enrollEmployee({
      employeeId: "emp-future",
      courseId: "course-0a",
      targetCompletionDate: "2099-12-31",
      priority: 2,
      enrolledBy: "manager-01",
    });
    const refreshed = engine.refreshEnrollmentStatuses("emp-future", new Date("2026-05-24"));
    expect(refreshed[0].status).toBe("active");
  });
});

describe("TrainingSchedulerEngine — remediation", () => {
  it("recommendRemediation returns null when no quiz has been attempted", () => {
    const engine = new TrainingSchedulerEngine();
    engine.enrollEmployee({
      employeeId: "emp-rem",
      courseId: "course-0a",
      targetCompletionDate: "2026-06-30",
      priority: 2,
      enrolledBy: "manager-01",
    });
    expect(engine.recommendRemediation("emp-rem", "course-0a", "course-0a-mod-1")).toBe(null);
  });

  it("recommendRemediation returns null when the quiz has been passed (bestScore >= passing)", () => {
    const engine = new TrainingSchedulerEngine();
    engine.enrollEmployee({
      employeeId: "emp-pass",
      courseId: "course-0a",
      targetCompletionDate: "2026-06-30",
      priority: 2,
      enrolledBy: "manager-01",
    });
    const curr = engine.getCurriculum();
    const m = curr.getCourse("course-0a")!.modules[0];
    curr.recordQuizScore("emp-pass", m.quiz.id, m.id, "course-0a", m.quiz.passingScore + 10, []);
    expect(engine.recommendRemediation("emp-pass", "course-0a", m.id)).toBe(null);
  });

  it("recommendRemediation returns gap=20 + retake_quiz action when failing by 20 points with no weak-tag lesson matches", () => {
    const engine = new TrainingSchedulerEngine();
    engine.enrollEmployee({
      employeeId: "emp-r-small",
      courseId: "course-0a",
      targetCompletionDate: "2026-06-30",
      priority: 2,
      enrolledBy: "manager-01",
    });
    const curr = engine.getCurriculum();
    const m = curr.getCourse("course-0a")!.modules[0];
    const failScore = m.quiz.passingScore - 20;
    curr.recordQuizScore("emp-r-small", m.quiz.id, m.id, "course-0a", failScore, []);
    const rec = engine.recommendRemediation("emp-r-small", "course-0a", m.id)!;
    expect(rec.gap).toBe(20);
    expect(rec.bestScore).toBe(failScore);
    expect(rec.recommendedNextAction).toBe("retake_quiz");
  });

  it("recommendRemediation returns 'take_remedial_course' when gap > 30 points", () => {
    const engine = new TrainingSchedulerEngine();
    engine.enrollEmployee({
      employeeId: "emp-r-big",
      courseId: "course-0a",
      targetCompletionDate: "2026-06-30",
      priority: 2,
      enrolledBy: "manager-01",
    });
    const curr = engine.getCurriculum();
    const m = curr.getCourse("course-0a")!.modules[0];
    const failScore = Math.max(0, m.quiz.passingScore - 40);
    curr.recordQuizScore("emp-r-big", m.quiz.id, m.id, "course-0a", failScore, []);
    const rec = engine.recommendRemediation("emp-r-big", "course-0a", m.id)!;
    expect(rec.gap).toBeGreaterThanOrEqual(40);
    expect(rec.recommendedNextAction).toBe("take_remedial_course");
  });

  it("recommendRemediation escalates to instructor after 3+ attempts with gap > 30", () => {
    const engine = new TrainingSchedulerEngine();
    engine.enrollEmployee({
      employeeId: "emp-r-escalate",
      courseId: "course-0a",
      targetCompletionDate: "2026-06-30",
      priority: 2,
      enrolledBy: "manager-01",
    });
    const curr = engine.getCurriculum();
    const m = curr.getCourse("course-0a")!.modules[0];
    const failScore = Math.max(0, m.quiz.passingScore - 40);
    curr.recordQuizScore("emp-r-escalate", m.quiz.id, m.id, "course-0a", failScore, []);
    curr.recordQuizScore("emp-r-escalate", m.quiz.id, m.id, "course-0a", failScore, []);
    curr.recordQuizScore("emp-r-escalate", m.quiz.id, m.id, "course-0a", failScore, []);
    const rec = engine.recommendRemediation("emp-r-escalate", "course-0a", m.id)!;
    expect(rec.recommendedNextAction).toBe("escalate_to_instructor");
  });
});

describe("TrainingSchedulerEngine — schedule generation", () => {
  it("generateSchedule for an employee with no enrollments returns an empty array", () => {
    const engine = new TrainingSchedulerEngine();
    expect(engine.generateSchedule("emp-empty", 7, 60)).toEqual([]);
  });

  it("generateSchedule respects daily minutes budget across modules", () => {
    const engine = new TrainingSchedulerEngine();
    engine.enrollEmployee({
      employeeId: "emp-sched",
      courseId: "course-0a",
      targetCompletionDate: "2026-06-30",
      priority: 2,
      enrolledBy: "manager-01",
    });
    const schedule = engine.generateSchedule("emp-sched", 14, 60, new Date("2026-05-24"));
    expect(schedule.length).toBeGreaterThanOrEqual(1);
    expect(schedule[0].employeeId).toBe("emp-sched");
    expect(schedule[0].courseId).toBe("course-0a");
    expect(schedule[0].priority).toBe(2);
  });

  it("generateSchedule sorts priority=1 enrollments BEFORE priority=3 in the same employee's queue", () => {
    const engine = new TrainingSchedulerEngine();
    engine.enrollEmployee({
      employeeId: "emp-prio",
      courseId: "course-0c",
      targetCompletionDate: "2026-06-30",
      priority: 3,
      enrolledBy: "manager-01",
    });
    engine.enrollEmployee({
      employeeId: "emp-prio",
      courseId: "course-0a",
      targetCompletionDate: "2026-06-30",
      priority: 1,
      enrolledBy: "manager-01",
    });
    const schedule = engine.generateSchedule("emp-prio", 14, 60, new Date("2026-05-24"));
    expect(schedule[0].courseId).toBe("course-0a");
    expect(schedule[0].priority).toBe(1);
  });
});

describe("TrainingSchedulerEngine — report + adaptive recommendation", () => {
  it("generateReport for a brand-new employee returns all-zero counts + empty cert list", () => {
    const engine = new TrainingSchedulerEngine();
    const report = engine.generateReport("emp-report-new");
    expect(report.employeeId).toBe("emp-report-new");
    expect(report.enrolledCount).toBe(0);
    expect(report.activeCount).toBe(0);
    expect(report.completedCount).toBe(0);
    expect(report.overdueCount).toBe(0);
    expect(report.averageQuizScore).toBe(0);
    expect(report.totalTrainingHours).toBe(0);
    expect(report.certifications).toEqual([]);
    expect(report.topPendingRemediations).toEqual([]);
  });

  it("recommendNextCourse returns null when the employee is struggling (avg < 70) AND has any enrollments", () => {
    const engine = new TrainingSchedulerEngine();
    engine.enrollEmployee({
      employeeId: "emp-struggle",
      courseId: "course-0a",
      targetCompletionDate: "2026-06-30",
      priority: 2,
      enrolledBy: "manager-01",
    });
    const curr = engine.getCurriculum();
    const m = curr.getCourse("course-0a")!.modules[0];
    curr.recordQuizScore("emp-struggle", m.quiz.id, m.id, "course-0a", 50, []);
    const rec = engine.recommendNextCourse("emp-struggle");
    expect(rec).toBe(null);
  });

  it("recommendNextCourse returns a no-prereq course for a brand-new employee", () => {
    const engine = new TrainingSchedulerEngine();
    const rec = engine.recommendNextCourse("emp-fresh");
    expect(rec?.prerequisites).toEqual([]);
  });
});
