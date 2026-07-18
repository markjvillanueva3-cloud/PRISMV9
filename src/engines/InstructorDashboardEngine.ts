/**
 * InstructorDashboardEngine — LMS Features for PRISM Academy
 *
 * Enables training institutions to adopt PRISM as their machinist
 * training platform. Provides class management, enrollment,
 * grading, analytics, exports, and custom assignments.
 *
 * 6 actions (calculate pattern via knowledgeDispatcher):
 *   instructor_create_class — Create a class with courses and dates
 *   instructor_enroll        — Add/remove students from a class
 *   instructor_grades        — Get all student grades for a class
 *   instructor_analytics     — Identify struggling/excelling students
 *   instructor_export        — Export grades as CSV or JSON
 *   instructor_assign        — Create custom assignment
 *
 * Persistence: ~/.prism/academy-classes.json
 * Integration: CurriculumEngine student progress tracking
 *
 * @module engines/InstructorDashboardEngine
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface AcademyClass {
  id: string;
  instructorId: string;
  name: string;
  courseIds: string[];
  studentIds: string[];
  assignments: Assignment[];
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  courseId?: string;
  questionIds: string[];
  dueDate: string;
  timeLimitMinutes?: number;
  createdAt: string;
}

export interface StudentCourseGrade {
  courseId: string;
  courseName: string;
  progressPercent: number;
  quizAvg: number;
  timeSpentMinutes: number;
  modulesCompleted: number;
  modulesTotal: number;
}

export interface StudentGradeRow {
  studentId: string;
  name: string;
  courses: StudentCourseGrade[];
  overallAvg: number;
}

export interface AnalyticsResult {
  classId: string;
  className: string;
  totalStudents: number;
  struggling: StudentFlag[];
  excelling: StudentFlag[];
  knowledgeGaps: KnowledgeGap[];
  classAverage: number;
}

export interface StudentFlag {
  studentId: string;
  name: string;
  avgScore: number;
  flaggedCourses: string[];
}

export interface KnowledgeGap {
  topic: string;
  courseId: string;
  avgScore: number;
  studentsBelow70: number;
}

export interface CreateClassInput {
  instructorId: string;
  className: string;
  courseIds: string[];
  startDate: string;
  endDate: string;
}

export interface EnrollInput {
  classId: string;
  studentIds: string[];
  action: "add" | "remove";
}

export interface GradesInput {
  classId: string;
}

export interface AnalyticsInput {
  classId: string;
}

export interface ExportInput {
  classId: string;
  format: "csv" | "json";
}

export interface AssignInput {
  classId: string;
  title: string;
  questionIds?: string[];
  courseId?: string;
  dueDate: string;
  timeLimitMinutes?: number;
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const PERSIST_DIR = path.join(os.homedir(), ".prism");
const PERSIST_FILE = path.join(PERSIST_DIR, "academy-classes.json");

const STRUGGLING_THRESHOLD = 60;
const EXCELLING_THRESHOLD = 90;
const GAP_THRESHOLD = 70;

/** Course name lookup for grade reports */
const COURSE_NAMES: Record<string, string> = {
  "course-0a": "Shop Math for Machinists",
  "course-0b": "Hand Tools & Measurement",
  "course-0c": "Blueprint Reading & GD&T",
  "course-1": "Manufacturing Fundamentals",
  "course-2": "Speed/Feed Mastery",
  "course-3": "G-Code Programming",
  "course-4": "Milling Operations",
  "course-5": "Turning Operations",
  "course-6": "CAM System Mastery",
  "course-7": "Material Science for Machinists",
  "course-8": "5-Axis Machining",
  "course-9": "Process Optimization",
  "course-10": "Troubleshooting & Problem Solving",
  "course-11": "Shop Economics & Estimating",
  "course-12": "Career Development",
};

/** Module counts per course for progress calculation */
const COURSE_MODULE_COUNTS: Record<string, number> = {
  "course-0a": 8, "course-0b": 10, "course-0c": 12,
  "course-1": 12, "course-2": 10, "course-3": 10,
  "course-4": 12, "course-5": 10, "course-6": 18,
  "course-7": 8, "course-8": 8, "course-9": 8,
  "course-10": 10, "course-11": 6, "course-12": 4,
};

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${ts}-${rand}`;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ═══════════════════════════════════════════════════════════════
// Engine
// ═══════════════════════════════════════════════════════════════

/**
 * InstructorDashboardEngine — LMS class management for
 * PRISM Academy. Manages classes, enrollment, grading,
 * analytics, exports, and custom assignments.
 *
 * Uses in-memory store with JSON file persistence at
 * ~/.prism/academy-classes.json.
 */
export class InstructorDashboardEngine {
  private classes: Map<string, AcademyClass> = new Map();
  private loaded = false;
  private curriculumEngine: any = null;

  // ─────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────

  /** Load classes from disk if not already loaded */
  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      if (fs.existsSync(PERSIST_FILE)) {
        const raw = fs.readFileSync(PERSIST_FILE, "utf-8");
        const data = JSON.parse(raw) as AcademyClass[];
        for (const cls of data) {
          this.classes.set(cls.id, cls);
        }
      }
    } catch {
      // First run or corrupt file — start fresh
    }
  }

  /** Save classes to disk */
  private persist(): void {
    try {
      if (!fs.existsSync(PERSIST_DIR)) {
        fs.mkdirSync(PERSIST_DIR, { recursive: true });
      }
      const data = Array.from(this.classes.values());
      fs.writeFileSync(
        PERSIST_FILE,
        JSON.stringify(data, null, 2),
        "utf-8"
      );
    } catch {
      // Non-fatal — in-memory state is authoritative
    }
  }

  /** Lazy-load CurriculumEngine to avoid circular deps */
  private async getCurriculum(): Promise<any> {
    if (!this.curriculumEngine) {
      try {
        const mod = await import("./CurriculumEngine.js");
        this.curriculumEngine =
          (mod as any).curriculumEngine ||
          new mod.CurriculumEngine();
      } catch {
        // CurriculumEngine not available
      }
    }
    return this.curriculumEngine;
  }

  // ─────────────────────────────────────────────────────────
  // Action Router
  // ─────────────────────────────────────────────────────────

  /**
   * Route an instructor action to the appropriate handler.
   * @param action - One of the 6 instructor_* actions
   * @param params - Action-specific parameters
   * @returns Action result object
   */
  async calculate(
    action: string,
    params: Record<string, any>
  ): Promise<Record<string, any>> {
    this.ensureLoaded();

    switch (action) {
      case "instructor_create_class":
        return this.createClass(params as CreateClassInput);
      case "instructor_enroll":
        return this.enroll(params as EnrollInput);
      case "instructor_grades":
        return this.getGrades(params as GradesInput);
      case "instructor_analytics":
        return this.getAnalytics(params as AnalyticsInput);
      case "instructor_export":
        return await this.exportGrades(
          params as ExportInput
        );
      case "instructor_assign":
        return this.createAssignment(params as AssignInput);
      default:
        return {
          error: `Unknown action: ${action}`,
          available: [
            "instructor_create_class",
            "instructor_enroll",
            "instructor_grades",
            "instructor_analytics",
            "instructor_export",
            "instructor_assign",
          ],
        };
    }
  }

  // ─────────────────────────────────────────────────────────
  // 1. Create Class
  // ─────────────────────────────────────────────────────────

  /**
   * Create a new class with course assignments and dates.
   */
  createClass(input: CreateClassInput): Record<string, any> {
    const { instructorId, className, courseIds, startDate, endDate } =
      input;

    if (!instructorId || !className) {
      return { error: "instructorId and className required" };
    }
    if (!courseIds || courseIds.length === 0) {
      return { error: "At least one courseId required" };
    }

    // Validate course IDs
    const validCourses = courseIds.filter(
      (c) => COURSE_NAMES[c] !== undefined
    );
    if (validCourses.length === 0) {
      return {
        error: "No valid courseIds provided",
        validIds: Object.keys(COURSE_NAMES),
      };
    }

    const id = generateId("class");
    const now = new Date().toISOString();
    const cls: AcademyClass = {
      id,
      instructorId,
      name: className,
      courseIds: validCourses,
      studentIds: [],
      assignments: [],
      startDate: startDate || now,
      endDate: endDate || "",
      createdAt: now,
      updatedAt: now,
    };

    this.classes.set(id, cls);
    this.persist();

    return {
      classId: id,
      className: cls.name,
      enrolled: 0,
      courses: validCourses.map((c) => ({
        id: c,
        name: COURSE_NAMES[c] || c,
      })),
      startDate: cls.startDate,
      endDate: cls.endDate,
    };
  }

  // ─────────────────────────────────────────────────────────
  // 2. Enroll Students
  // ─────────────────────────────────────────────────────────

  /**
   * Add or remove students from a class.
   */
  enroll(input: EnrollInput): Record<string, any> {
    const { classId, studentIds, action } = input;
    const cls = this.classes.get(classId);
    if (!cls) {
      return { error: `Class not found: ${classId}` };
    }
    if (!studentIds || studentIds.length === 0) {
      return { error: "studentIds array required" };
    }

    let added: string[] = [];
    let removed: string[] = [];

    if (action === "add") {
      for (const sid of studentIds) {
        if (!cls.studentIds.includes(sid)) {
          cls.studentIds.push(sid);
          added.push(sid);
        }
      }
    } else if (action === "remove") {
      for (const sid of studentIds) {
        const idx = cls.studentIds.indexOf(sid);
        if (idx >= 0) {
          cls.studentIds.splice(idx, 1);
          removed.push(sid);
        }
      }
    } else {
      return { error: "action must be 'add' or 'remove'" };
    }

    cls.updatedAt = new Date().toISOString();
    this.persist();

    return {
      classId,
      className: cls.name,
      enrolled: cls.studentIds.length,
      ...(added.length > 0 ? { added } : {}),
      ...(removed.length > 0 ? { removed } : {}),
    };
  }

  // ─────────────────────────────────────────────────────────
  // 3. Student Grades
  // ─────────────────────────────────────────────────────────

  /**
   * Get all student grades for a class, including per-course
   * progress, quiz averages, and time spent.
   */
  getGrades(input: GradesInput): Record<string, any> {
    const cls = this.classes.get(input.classId);
    if (!cls) {
      return { error: `Class not found: ${input.classId}` };
    }

    const students: StudentGradeRow[] = cls.studentIds.map(
      (sid) => {
        const courses = cls.courseIds.map((cid) =>
          this.getStudentCourseGrade(sid, cid)
        );
        const scores = courses
          .filter((c) => c.progressPercent > 0)
          .map((c) => c.quizAvg);
        const overallAvg =
          scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0;

        return {
          studentId: sid,
          name: this.getStudentName(sid),
          courses,
          overallAvg: Math.round(overallAvg * 10) / 10,
        };
      }
    );

    return {
      classId: input.classId,
      className: cls.name,
      courseCount: cls.courseIds.length,
      studentCount: students.length,
      students,
    };
  }

  // ─────────────────────────────────────────────────────────
  // 4. Analytics
  // ─────────────────────────────────────────────────────────

  /**
   * Identify struggling and excelling students, plus
   * knowledge gaps across the class.
   */
  getAnalytics(input: AnalyticsInput): Record<string, any> {
    const cls = this.classes.get(input.classId);
    if (!cls) {
      return { error: `Class not found: ${input.classId}` };
    }

    const gradeData = this.getGrades(input) as any;
    const students: StudentGradeRow[] = gradeData.students;

    // Struggling: overall avg below threshold
    const struggling: StudentFlag[] = students
      .filter((s) => s.overallAvg > 0 && s.overallAvg < STRUGGLING_THRESHOLD)
      .map((s) => ({
        studentId: s.studentId,
        name: s.name,
        avgScore: s.overallAvg,
        flaggedCourses: s.courses
          .filter((c) => c.quizAvg < STRUGGLING_THRESHOLD)
          .map((c) => c.courseId),
      }));

    // Excelling: overall avg above threshold
    const excelling: StudentFlag[] = students
      .filter((s) => s.overallAvg >= EXCELLING_THRESHOLD)
      .map((s) => ({
        studentId: s.studentId,
        name: s.name,
        avgScore: s.overallAvg,
        flaggedCourses: s.courses
          .filter((c) => c.quizAvg >= EXCELLING_THRESHOLD)
          .map((c) => c.courseId),
      }));

    // Knowledge gaps: courses where class avg is below 70
    const knowledgeGaps: KnowledgeGap[] = [];
    for (const cid of cls.courseIds) {
      const courseScores = students
        .map((s) => {
          const cg = s.courses.find((c) => c.courseId === cid);
          return cg ? cg.quizAvg : 0;
        })
        .filter((s) => s > 0);

      if (courseScores.length > 0) {
        const avg =
          courseScores.reduce((a, b) => a + b, 0) /
          courseScores.length;
        const below = courseScores.filter(
          (s) => s < GAP_THRESHOLD
        ).length;

        if (avg < GAP_THRESHOLD) {
          knowledgeGaps.push({
            topic: COURSE_NAMES[cid] || cid,
            courseId: cid,
            avgScore: Math.round(avg * 10) / 10,
            studentsBelow70: below,
          });
        }
      }
    }

    // Sort gaps by severity (lowest avg first)
    knowledgeGaps.sort((a, b) => a.avgScore - b.avgScore);

    const allScores = students
      .filter((s) => s.overallAvg > 0)
      .map((s) => s.overallAvg);
    const classAverage =
      allScores.length > 0
        ? Math.round(
            (allScores.reduce((a, b) => a + b, 0) /
              allScores.length) *
              10
          ) / 10
        : 0;

    return {
      classId: input.classId,
      className: cls.name,
      totalStudents: cls.studentIds.length,
      struggling,
      excelling,
      knowledgeGaps,
      classAverage,
    } satisfies AnalyticsResult;
  }

  // ─────────────────────────────────────────────────────────
  // 5. Export Grades
  // ─────────────────────────────────────────────────────────

  /**
   * Export grades as CSV or JSON for external LMS import.
   */
  async exportGrades(
    input: ExportInput
  ): Promise<Record<string, any>> {
    const cls = this.classes.get(input.classId);
    if (!cls) {
      return { error: `Class not found: ${input.classId}` };
    }

    const gradeData = this.getGrades({
      classId: input.classId,
    }) as any;
    const students: StudentGradeRow[] = gradeData.students;
    const format = input.format || "csv";
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `${cls.name.replace(/\s+/g, "_")}_grades_${timestamp}`;

    if (format === "json") {
      return {
        data: JSON.stringify(
          {
            class: cls.name,
            exportedAt: new Date().toISOString(),
            students: students.map((s) => ({
              studentId: s.studentId,
              name: s.name,
              overallAvg: s.overallAvg,
              courses: s.courses,
            })),
          },
          null,
          2
        ),
        filename: `${filename}.json`,
        format: "json",
        studentCount: students.length,
      };
    }

    // CSV export
    const courseHeaders = cls.courseIds.map(
      (c) => COURSE_NAMES[c] || c
    );
    const header = [
      "Student ID",
      "Name",
      ...courseHeaders.flatMap((h) => [
        `${h} Progress%`,
        `${h} Quiz Avg`,
        `${h} Time(min)`,
      ]),
      "Overall Avg",
    ].join(",");

    const rows = students.map((s) => {
      const courseData = cls.courseIds.flatMap((cid) => {
        const cg = s.courses.find((c) => c.courseId === cid);
        return cg
          ? [
              cg.progressPercent.toString(),
              cg.quizAvg.toString(),
              cg.timeSpentMinutes.toString(),
            ]
          : ["0", "0", "0"];
      });
      return [
        s.studentId,
        `"${s.name}"`,
        ...courseData,
        s.overallAvg.toString(),
      ].join(",");
    });

    return {
      data: [header, ...rows].join("\n"),
      filename: `${filename}.csv`,
      format: "csv",
      studentCount: students.length,
      courseCount: cls.courseIds.length,
    };
  }

  // ─────────────────────────────────────────────────────────
  // 6. Create Assignment
  // ─────────────────────────────────────────────────────────

  /**
   * Create a custom assignment for a class. Can optionally
   * pull questions from a specific course or use explicit
   * question IDs.
   */
  createAssignment(
    input: AssignInput
  ): Record<string, any> {
    const cls = this.classes.get(input.classId);
    if (!cls) {
      return { error: `Class not found: ${input.classId}` };
    }
    if (!input.title) {
      return { error: "title is required" };
    }
    if (!input.dueDate) {
      return { error: "dueDate is required" };
    }

    // Resolve question IDs
    let questionIds = input.questionIds || [];
    if (
      questionIds.length === 0 &&
      input.courseId &&
      COURSE_MODULE_COUNTS[input.courseId]
    ) {
      // Auto-generate question IDs from course modules
      const modCount =
        COURSE_MODULE_COUNTS[input.courseId] || 8;
      const questionsPerModule = 3;
      questionIds = [];
      for (let m = 1; m <= modCount; m++) {
        for (let q = 1; q <= questionsPerModule; q++) {
          questionIds.push(
            `${input.courseId}-m${m}-q${q}`
          );
        }
      }
    }

    const assignment: Assignment = {
      id: generateId("assign"),
      classId: input.classId,
      title: input.title,
      courseId: input.courseId,
      questionIds,
      dueDate: input.dueDate,
      timeLimitMinutes: input.timeLimitMinutes,
      createdAt: new Date().toISOString(),
    };

    cls.assignments.push(assignment);
    cls.updatedAt = new Date().toISOString();
    this.persist();

    return {
      assignmentId: assignment.id,
      classId: input.classId,
      title: assignment.title,
      questions: questionIds.length,
      questionIds:
        questionIds.length <= 20
          ? questionIds
          : questionIds.slice(0, 20).concat(["..."]),
      dueDate: assignment.dueDate,
      timeLimitMinutes: assignment.timeLimitMinutes || null,
      courseId: assignment.courseId || null,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Student Grade Helpers
  // ─────────────────────────────────────────────────────────

  /**
   * Get a single student's grade for one course.
   * Integrates with CurriculumEngine progress tracking
   * when available, otherwise returns placeholder data.
   */
  private getStudentCourseGrade(
    studentId: string,
    courseId: string
  ): StudentCourseGrade {
    const modulesTotal =
      COURSE_MODULE_COUNTS[courseId] || 10;

    // Try to get real data from CurriculumEngine
    if (this.curriculumEngine) {
      try {
        const student =
          this.curriculumEngine.getOrCreateStudent(
            studentId
          );
        if (student && student.courseProgress) {
          const cp = student.courseProgress.get
            ? student.courseProgress.get(courseId)
            : student.courseProgress[courseId];
          if (cp) {
            const completed = cp.completedModules
              ? cp.completedModules.length || 0
              : 0;
            const progress = clamp(
              Math.round(
                (completed / modulesTotal) * 100
              ),
              0,
              100
            );
            const quizScores = cp.quizScores || [];
            const quizAvg =
              quizScores.length > 0
                ? Math.round(
                    (quizScores.reduce(
                      (a: number, b: number) => a + b,
                      0
                    ) /
                      quizScores.length) *
                      10
                  ) / 10
                : 0;
            const timeSpent = cp.timeSpentMinutes || 0;

            return {
              courseId,
              courseName:
                COURSE_NAMES[courseId] || courseId,
              progressPercent: progress,
              quizAvg,
              timeSpentMinutes: Math.round(timeSpent),
              modulesCompleted: completed,
              modulesTotal,
            };
          }
        }
      } catch {
        // Fall through to default
      }
    }

    // Default: no progress yet
    return {
      courseId,
      courseName: COURSE_NAMES[courseId] || courseId,
      progressPercent: 0,
      quizAvg: 0,
      timeSpentMinutes: 0,
      modulesCompleted: 0,
      modulesTotal,
    };
  }

  /**
   * Get display name for a student. Returns studentId as
   * fallback if CurriculumEngine has no name on file.
   */
  private getStudentName(studentId: string): string {
    if (this.curriculumEngine) {
      try {
        const student =
          this.curriculumEngine.getOrCreateStudent(
            studentId
          );
        if (student && student.name) {
          return student.name;
        }
      } catch {
        // Fall through
      }
    }
    return studentId;
  }

  // ─────────────────────────────────────────────────────────
  // Utility Methods
  // ─────────────────────────────────────────────────────────

  /** Get a class by ID */
  getClass(classId: string): AcademyClass | undefined {
    this.ensureLoaded();
    return this.classes.get(classId);
  }

  /** List all classes for an instructor */
  listClasses(instructorId: string): AcademyClass[] {
    this.ensureLoaded();
    return Array.from(this.classes.values()).filter(
      (c) => c.instructorId === instructorId
    );
  }

  /** Delete a class */
  deleteClass(classId: string): boolean {
    this.ensureLoaded();
    const deleted = this.classes.delete(classId);
    if (deleted) this.persist();
    return deleted;
  }

  /** Get all assignments for a class */
  getAssignments(classId: string): Assignment[] {
    this.ensureLoaded();
    const cls = this.classes.get(classId);
    return cls ? cls.assignments : [];
  }

  /** Clear all data (for testing) */
  reset(): void {
    this.classes.clear();
    this.loaded = false;
  }
}

// ═══════════════════════════════════════════════════════════════
// Singleton Export
// ═══════════════════════════════════════════════════════════════

export const instructorDashboardEngine =
  new InstructorDashboardEngine();
