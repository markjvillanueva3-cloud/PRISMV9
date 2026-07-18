/**
 * TrainingSchedulerEngine
 *
 * Adaptive training scheduler for PRISM Academy. Wraps CurriculumEngine to
 * provide per-employee enrollment, due-date tracking, score-based remediation
 * recommendations, and assessment-test orchestration.
 *
 * Built 2026-05-24 (lima slot, iter19) in response to operator directive:
 *   "have a scheduler for academy courses for every employee that prism tracks
 *    what they've completed and assess their scores so the app can recommend
 *    further training until they pass the test"
 *
 * Composition (NOT inheritance) -- TrainingSchedulerEngine HAS-A CurriculumEngine.
 * The curriculum source-of-truth (courses, modules, quizzes) stays in
 * CurriculumEngine. This engine adds the per-employee layer on top.
 */

import { CurriculumEngine, type Course, type StudentProgress } from "./CurriculumEngine.js";

export interface EmployeeEnrollment {
  employeeId: string;            // matches StudentProgress.studentId
  courseId: string;
  enrolledAt: string;            // ISO timestamp
  targetCompletionDate: string;  // ISO date (yyyy-mm-dd)
  priority: 1 | 2 | 3;           // 1=critical (regulatory), 2=role-required, 3=growth
  enrolledBy: string;            // manager id / "self" / "auto-recommend"
  status: "active" | "completed" | "overdue" | "deferred";
}

export interface RemediationSuggestion {
  employeeId: string;
  courseId: string;
  failedQuizId: string;
  bestScore: number;
  passingScore: number;
  gap: number;                    // passingScore - bestScore
  weakTopics: string[];           // topic tags from wrongAnswerTags
  recommendedLessons: string[];   // lessonIds to re-study
  recommendedNextAction: "retake_quiz" | "review_lessons" | "take_remedial_course" | "escalate_to_instructor";
  rationale: string;
}

export interface ScheduleEntry {
  date: string;                   // yyyy-mm-dd
  employeeId: string;
  courseId: string;
  moduleId: string;
  estimatedMinutes: number;
  priority: 1 | 2 | 3;
}

export interface EmployeeTrainingReport {
  employeeId: string;
  enrolledCount: number;
  activeCount: number;
  completedCount: number;
  overdueCount: number;
  averageQuizScore: number;       // 0-100, across all attempted quizzes
  totalTrainingHours: number;
  certifications: string[];       // certification level names
  topPendingRemediations: RemediationSuggestion[];
}

export class TrainingSchedulerEngine {
  private enrollments: Map<string, EmployeeEnrollment[]> = new Map();
  private curriculum: CurriculumEngine;

  constructor(curriculum?: CurriculumEngine) {
    this.curriculum = curriculum ?? new CurriculumEngine();
  }

  /**
   * Enroll an employee in a course. Returns the enrollment record or an error.
   * Validates that the course exists and the employee meets prerequisites.
   */
  enrollEmployee(params: {
    employeeId: string;
    courseId: string;
    targetCompletionDate: string;
    priority: 1 | 2 | 3;
    enrolledBy: string;
  }): { ok: boolean; enrollment?: EmployeeEnrollment; error?: string } {
    const course = this.curriculum.getCourse(params.courseId);
    if (!course) return { ok: false, error: `Course not found: ${params.courseId}` };

    const student = this.curriculum.getOrCreateStudent(params.employeeId);
    for (const prereq of course.prerequisites) {
      if (!student.courseProgress[prereq]?.completed) {
        return { ok: false, error: `Prerequisite not completed: ${prereq}` };
      }
    }

    const existing = this.getEnrollments(params.employeeId)
      .find(e => e.courseId === params.courseId && e.status !== "completed");
    if (existing) return { ok: false, error: `Already enrolled: ${params.courseId}` };

    const enrollment: EmployeeEnrollment = {
      employeeId: params.employeeId,
      courseId: params.courseId,
      enrolledAt: new Date().toISOString(),
      targetCompletionDate: params.targetCompletionDate,
      priority: params.priority,
      enrolledBy: params.enrolledBy,
      status: "active",
    };

    const list = this.enrollments.get(params.employeeId) ?? [];
    list.push(enrollment);
    this.enrollments.set(params.employeeId, list);

    return { ok: true, enrollment };
  }

  getEnrollments(employeeId: string): EmployeeEnrollment[] {
    return this.enrollments.get(employeeId) ?? [];
  }

  /**
   * Recompute enrollment statuses against today's date. Anything with
   * targetCompletionDate < today AND status === "active" becomes "overdue".
   * Anything whose courseProgress is completed becomes "completed".
   */
  refreshEnrollmentStatuses(employeeId: string, now: Date = new Date()): EmployeeEnrollment[] {
    const list = this.enrollments.get(employeeId) ?? [];
    const student = this.curriculum.getOrCreateStudent(employeeId);
    const today = now.toISOString().slice(0, 10);

    for (const e of list) {
      if (e.status === "deferred") continue;
      const progress = student.courseProgress[e.courseId];
      if (progress?.completed) {
        e.status = "completed";
        continue;
      }
      if (e.targetCompletionDate < today && e.status === "active") {
        e.status = "overdue";
      }
    }
    return list;
  }

  /**
   * Suggest remediation for a failed quiz. Inspects the student's quiz history
   * and weak topics, then maps weak topics back to lesson ids in the course.
   * If gap > 30 points, recommend the whole module re-study (or remedial course).
   */
  recommendRemediation(employeeId: string, courseId: string, moduleId: string): RemediationSuggestion | null {
    const student = this.curriculum.getOrCreateStudent(employeeId);
    const module = this.curriculum.getModule(courseId, moduleId);
    if (!module) return null;

    // ModuleQuiz is Quiz | InlineQuestion[] | undefined -- narrow before accessing
    // .id / .passingScore (array form has neither; absent form has neither).
    const rawQuiz = module.quiz;
    const narrowedQuiz = rawQuiz && !Array.isArray(rawQuiz) ? rawQuiz : undefined;
    if (!narrowedQuiz) return null;

    const score = student.quizScores[narrowedQuiz.id];
    if (!score) return null;

    const passingScore = narrowedQuiz.passingScore;
    if (score.bestScore >= passingScore) return null; // already passed

    const gap = passingScore - score.bestScore;
    const weakTopics = score.wrongAnswerTags ?? [];

    // Map weak topics back to lesson ids in this module that mention the topic.
    // Lima-shape modules (courses 17, 19-23, 28-34) ship `content[]` instead of `lessons[]`.
    const moduleLessons = module.lessons ?? [];
    const recommendedLessons = moduleLessons
      .filter(l => (l.keyFormulas ?? []).some(f => weakTopics.includes(f))
        || (l.title ?? "").toLowerCase().split(/\W+/).some(w => weakTopics.includes(w)))
      .map(l => l.id);

    let recommendedNextAction: RemediationSuggestion["recommendedNextAction"];
    let rationale: string;
    if (score.attempts >= 3 && gap > 30) {
      recommendedNextAction = "escalate_to_instructor";
      rationale = `3+ attempts with gap=${gap} from passing -- instructor intervention recommended`;
    } else if (gap > 30) {
      recommendedNextAction = "take_remedial_course";
      rationale = `Large gap (${gap} points) -- full remedial course recommended before retake`;
    } else if (recommendedLessons.length >= 1) {
      recommendedNextAction = "review_lessons";
      rationale = `Topic-specific weakness in ${weakTopics.join(", ") || "general material"} -- review ${recommendedLessons.length} lesson(s) then retake`;
    } else {
      recommendedNextAction = "retake_quiz";
      rationale = `Small gap (${gap} points) -- retake quiz`;
    }

    // Lima-shape `quiz: InlineQuestion[]` carries no id wrapper -- synthesize from moduleId.
    const failedQuizId = Array.isArray(module.quiz) || !module.quiz
      ? `${module.id}-quiz`
      : module.quiz.id;

    return {
      employeeId,
      courseId,
      failedQuizId,
      bestScore: score.bestScore,
      passingScore,
      gap,
      weakTopics,
      recommendedLessons: recommendedLessons.length > 0 ? recommendedLessons : moduleLessons.map(l => l.id),
      recommendedNextAction,
      rationale,
    };
  }

  /**
   * Generate an N-day study schedule for the employee's active enrollments.
   * Distributes modules across days at most `dailyMinutesBudget` per day, in
   * order: priority 1 first, then 2, then 3. Within priority, earliest target
   * date first.
   */
  generateSchedule(employeeId: string, days: number, dailyMinutesBudget: number, startDate: Date = new Date()): ScheduleEntry[] {
    const enrollments = this.refreshEnrollmentStatuses(employeeId, startDate)
      .filter(e => e.status === "active" || e.status === "overdue")
      .sort((a, b) =>
        a.priority - b.priority
        || a.targetCompletionDate.localeCompare(b.targetCompletionDate)
      );

    const student = this.curriculum.getOrCreateStudent(employeeId);
    const schedule: ScheduleEntry[] = [];
    let dayOffset = 0;
    let minutesUsedToday = 0;

    for (const e of enrollments) {
      const course = this.curriculum.getCourse(e.courseId);
      if (!course) continue;
      const progress = student.courseProgress[e.courseId];
      const completedModuleIds = new Set(progress?.modulesCompleted ?? []);

      for (const m of course.modules) {
        if (completedModuleIds.has(m.id)) continue;
        if (dayOffset >= days) return schedule;

        const moduleMinutes = m.estimatedMinutes ?? 0;
        if (minutesUsedToday + moduleMinutes > dailyMinutesBudget && minutesUsedToday > 0) {
          dayOffset++;
          minutesUsedToday = 0;
          if (dayOffset >= days) return schedule;
        }

        const date = new Date(startDate);
        date.setDate(date.getDate() + dayOffset);
        schedule.push({
          date: date.toISOString().slice(0, 10),
          employeeId,
          courseId: e.courseId,
          moduleId: m.id,
          estimatedMinutes: moduleMinutes,
          priority: e.priority,
        });
        minutesUsedToday += moduleMinutes;
      }
    }

    return schedule;
  }

  /**
   * Per-employee training report -- single-pane dashboard view.
   */
  generateReport(employeeId: string, now: Date = new Date()): EmployeeTrainingReport {
    const enrollments = this.refreshEnrollmentStatuses(employeeId, now);
    const student = this.curriculum.getOrCreateStudent(employeeId);

    const enrolledCount = enrollments.length;
    const activeCount = enrollments.filter(e => e.status === "active").length;
    const completedCount = enrollments.filter(e => e.status === "completed").length;
    const overdueCount = enrollments.filter(e => e.status === "overdue").length;

    const quizScores = Object.values(student.quizScores);
    const averageQuizScore = quizScores.length > 0
      ? quizScores.reduce((sum, qs) => sum + qs.bestScore, 0) / quizScores.length
      : 0;

    const totalTrainingHours = Math.round(student.totalTimeMinutes / 60 * 10) / 10;

    const topPendingRemediations: RemediationSuggestion[] = [];
    for (const e of enrollments) {
      if (e.status === "completed") continue;
      const course = this.curriculum.getCourse(e.courseId);
      if (!course) continue;
      for (const m of course.modules) {
        const rec = this.recommendRemediation(employeeId, e.courseId, m.id);
        if (rec) topPendingRemediations.push(rec);
        if (topPendingRemediations.length >= 5) break;
      }
      if (topPendingRemediations.length >= 5) break;
    }

    return {
      employeeId,
      enrolledCount,
      activeCount,
      completedCount,
      overdueCount,
      averageQuizScore: Math.round(averageQuizScore * 10) / 10,
      totalTrainingHours,
      certifications: student.certifications.map(c => c.level),
      topPendingRemediations,
    };
  }

  /**
   * Recommend the next course for an employee based on completed prerequisites
   * and average quiz performance. Calls into CurriculumEngine's recommender
   * and adds adaptive logic: if avg quiz score < 70, recommend an easier
   * companion course before advancing.
   */
  recommendNextCourse(employeeId: string): Course | null {
    const report = this.generateReport(employeeId);
    const baseRecommendation = this.curriculum.getRecommendedNextCourse(employeeId);

    if (report.averageQuizScore < 70 && report.enrolledCount > 0) {
      // employee is struggling -- keep them on current courses, don't escalate
      return null;
    }
    return baseRecommendation;
  }

  // Expose curriculum reference for callers that need both
  getCurriculum(): CurriculumEngine {
    return this.curriculum;
  }

  // Re-export commonly-used CurriculumEngine pass-throughs
  getStudent(employeeId: string): StudentProgress {
    return this.curriculum.getOrCreateStudent(employeeId);
  }
}

export const trainingSchedulerEngine = new TrainingSchedulerEngine();
