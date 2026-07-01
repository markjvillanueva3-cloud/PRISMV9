/**
 * CurriculumEngine — PRISM Academy Course Management
 *
 * Manages the machinist training curriculum: courses, modules, lessons,
 * quizzes, and student progress tracking. Supports prerequisite chains,
 * spaced repetition for formula review, and adaptive learning paths.
 *
 * 15 courses from Novice → Master + Professional:
 *  0A. Shop Math for Machinists (Novice, 8 modules, ~6hr)
 *  0B. Hand Tools & Measurement (Novice, 10 modules, ~8hr)
 *  0C. Blueprint Reading & GD&T (Novice, 12 modules, ~10hr)
 *   1. Manufacturing Fundamentals (Novice, 12 modules, ~8hr)
 *   2. Speed/Feed Mastery (Intermediate, 10 modules, ~6hr)
 *   3. G-Code Programming (Intermediate, 10 modules, ~8hr)
 *   4. Milling Operations (Advanced, 12 modules, ~10hr)
 *   5. Turning Operations (Advanced, 10 modules, ~8hr)
 *   6. CAM System Mastery (Advanced, 18 mini-modules, ~12hr)
 *   7. Material Science for Machinists (Advanced, 8 modules, ~6hr)
 *   8. 5-Axis Machining (Master, 8 modules, ~8hr)
 *   9. Process Optimization (Master, 8 modules, ~8hr)
 *  10. Troubleshooting & Problem Solving (Master, 10 modules, ~8hr)
 *  11. Shop Economics & Estimating (Advanced, 6 modules, ~5hr)
 *  12. Career Development (Intermediate, 4 modules, ~3hr)
 *
 * 4 certification levels:
 *   - PRISM Foundational (courses 0A+0B+0C, ≥70%)
 *   - PRISM Certified Operator (courses 0-3, ≥80%)
 *   - PRISM Certified Programmer (courses 0-7, ≥85%)
 *   - PRISM Certified Master (all 15, ≥90%)
 *
 * Lines: ~1000 (+ ~4500 lines of rich course content in academy data files)
 */

// ═══════════════════════════════════════════════════════════════
// Academy Course Data Imports
// ═══════════════════════════════════════════════════════════════

import { COURSE_0A_MODULES } from "../data/academy/course-0a-shop-math.js";
import { COURSE_0B_MODULES } from "../data/academy/course-0b-hand-tools.js";
import { COURSE_0C_MODULES } from "../data/academy/course-0c-blueprint-reading.js";
import { COURSE_1_MODULES } from "../data/academy/course-1-manufacturing-fundamentals.js";
import { COURSE_2_MODULES } from "../data/academy/course-2-speed-feed-mastery.js";
import { COURSE_3_MODULES } from "../data/academy/course-3-gcode-programming.js";
import { COURSE_4_MODULES } from "../data/academy/course-4-milling-operations.js";
import { COURSE_5_MODULES } from "../data/academy/course-5-turning-operations.js";
import {
  COURSE_6_MODULES, COURSE_7_MODULES, COURSE_8_MODULES,
  COURSE_9_MODULES, COURSE_10_MODULES, COURSE_11_MODULES,
  COURSE_12_MODULES,
} from "../data/academy/course-6-to-12-advanced.js";
import { COURSE_13_MODULES } from "../data/academy/course-13-wire-edm-progressive.js";
import {
  COURSE_14_MODULES, COURSE_15_MODULES, COURSE_16_MODULES,
} from "../data/academy/course-14-15-16-electrode-robot-sinker.js";
import { COURSE_17_MODULES } from "../data/academy/course-17-tooling-codes.js";
import { COURSE_18_MODULES } from "../data/academy/course-18-cad-cam-entry-level.js";
import { COURSE_19_MODULES } from "../data/academy/course-19-hypermill-nx-solidcam-entry.js";
import { COURSE_20_MODULES } from "../data/academy/course-20-esprit-powermill-inventor-catia-entry.js";
import { COURSE_21_MODULES } from "../data/academy/course-21-business-management.js";
import { COURSE_22_MODULES } from "../data/academy/course-22-alarm-troubleshooting-deep.js";
import { COURSE_23_MODULES } from "../data/academy/course-23-prism-database-mastery.js";
import { COURSE_24_MODULES } from "../data/academy/course-24-accuracy-improvement.js";
import { COURSE_25_MODULES } from "../data/academy/course-25-creo-worknc-gibbscam-edgecam-entry.js";
import { COURSE_26_MODULES } from "../data/academy/course-26-hexagon-trio-camworks-entry.js";
import { COURSE_27_MODULES } from "../data/academy/course-27-final-six-cam-entry.js";
import { COURSE_28_MODULES } from "../data/academy/course-28-function-index-reference.js";
import { COURSE_29_MODULES } from "../data/academy/course-29-toolpath-reasoning-dual-level.js";
import { COURSE_30_MODULES } from "../data/academy/course-30-toolpath-catalog-programming-paradigms.js";
import { COURSE_31_MODULES } from "../data/academy/course-31-cadcam-operations-atlas.js";
import { COURSE_32_MODULES } from "../data/academy/course-32-machining-math-science-deep-dive.js";
import { COURSE_33_MODULES } from "../data/academy/course-33-material-machining-atlas.js";
import { COURSE_34_MODULES } from "../data/academy/course-34-per-machine-type-operations.js";

/** Map of course ID → rich module content from academy data files */
const RICH_MODULES: Record<string, Module[]> = {
  "course-0a": COURSE_0A_MODULES,
  "course-0b": COURSE_0B_MODULES,
  "course-0c": COURSE_0C_MODULES,
  "course-1": COURSE_1_MODULES,
  "course-2": COURSE_2_MODULES,
  "course-3": COURSE_3_MODULES,
  "course-4": COURSE_4_MODULES,
  "course-5": COURSE_5_MODULES,
  "course-6": COURSE_6_MODULES,
  "course-7": COURSE_7_MODULES,
  "course-8": COURSE_8_MODULES,
  "course-9": COURSE_9_MODULES,
  "course-10": COURSE_10_MODULES,
  "course-11": COURSE_11_MODULES,
  "course-12": COURSE_12_MODULES,
  "course-13": COURSE_13_MODULES,
  "course-14": COURSE_14_MODULES,
  "course-15": COURSE_15_MODULES,
  "course-16": COURSE_16_MODULES,
  "course-17": COURSE_17_MODULES,
  "course-18": COURSE_18_MODULES,
  "course-19": COURSE_19_MODULES,
  "course-20": COURSE_20_MODULES,
  "course-21": COURSE_21_MODULES,
  "course-22": COURSE_22_MODULES,
  "course-23": COURSE_23_MODULES,
  "course-24": COURSE_24_MODULES,
  "course-25": COURSE_25_MODULES,
  "course-26": COURSE_26_MODULES,
  "course-27": COURSE_27_MODULES,
  "course-28": COURSE_28_MODULES,
  "course-29": COURSE_29_MODULES,
  "course-30": COURSE_30_MODULES,
  "course-31": COURSE_31_MODULES,
  "course-32": COURSE_32_MODULES,
  "course-33": COURSE_33_MODULES,
  "course-34": COURSE_34_MODULES,
};

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type SkillLevel = "foundational" | "novice" | "intermediate" | "advanced" | "master";
export type ContentType = "text" | "diagram" | "animation" | "calculator" | "sandbox" | "video" | "3d_viewer";
export type QuestionType = "multiple_choice" | "calculation" | "visual_id" | "troubleshooting_tree";

export interface Course {
  id: string;
  title: string;
  description: string;
  level: SkillLevel;
  modules: Module[];
  prerequisites: string[];    // course IDs
  estimatedHours: number;
  certificationLevel?: "operator" | "programmer" | "master";
}

/**
 * Inline question shape used by courses 17, 19-23, 28-34 (Lima session 2026-05-24..25).
 * Simpler than the canonical {@link Question} — bare-array convention without Quiz wrapper.
 * Both shapes accepted at runtime; RICH_MODULES coerces as needed.
 */
export interface InlineQuestion {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topicTags?: string[];
}

export type ModuleQuiz = Quiz | InlineQuestion[];

/**
 * Inline lesson-content shape used by courses 17, 19-23, 28-34 (Lima session 2026-05-24..25).
 * These ship `content[]` directly on the module instead of nesting in `lessons[]`.
 */
export type ModuleContent = LessonContent;

export interface Module {
  id: string;
  courseId?: string;
  title: string;
  description?: string;
  order?: number;
  /** Canonical lesson nesting (courses 0a..16). */
  lessons?: Lesson[];
  /** Inline lesson content (courses 17, 19-23, 28-34 Lima convention). */
  content?: ModuleContent[];
  quiz?: ModuleQuiz;
  estimatedMinutes?: number;
  prismEngines?: string[];
  prismDispatcherActions?: string[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  order: number;
  content: LessonContent[];
  keyFormulas?: string[];      // Formula IDs from FormulaRegistry
  prismEngines?: string[];     // Engine names used in interactive elements
}

/**
 * Generic content-block config bag — used by courses 17, 19-23, 28-34 as a single `config` field
 * instead of the more-typed {@link LessonContent.calculatorConfig}. Free-form so each course can
 * embed engine-specific input/output shapes without forcing a schema migration.
 */
export interface LessonAnnotation {
  x?: number;
  y?: number;
  label?: string;
  description?: string;
}

export interface LessonContent {
  type: ContentType | string;
  title?: string;
  body?: string;               // Markdown text
  diagramSvg?: string;         // SVG markup for diagrams
  /** Generic config bag — Lima-session convention for calculator/sandbox/video/3d_viewer blocks. */
  config?: Record<string, unknown>;
  calculatorConfig?: {
    engine: string;            // PRISM engine name
    inputFields: string[];     // Parameter names to expose
    outputFields: string[];    // Result fields to display
    defaults?: Record<string, number | string>;
  };
  sandboxConfig?: {
    engine: string;
    task: string;              // Description of what student should do
    validationFn?: string;     // Validation logic name
  };
  videoUrl?: string;
  videoPosterUrl?: string;       // Optional thumbnail for video blocks
  modelUrl?: string;             // glTF/USDZ URL for 3d_viewer blocks
  annotations?: Array<{
    x: number; y: number;
    label: string;
    description: string;
  }>;
}

export interface Quiz {
  id: string;
  moduleId: string;
  questions: Question[];
  passingScore: number;        // 0-100
  timeLimitMinutes?: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  difficulty: 1 | 2 | 3;      // 1=easy, 2=medium, 3=hard
  diagramSvg?: string;         // For visual_id questions
  options?: QuestionOption[];  // For multiple_choice
  correctAnswer?: string | number;
  tolerance?: number;          // For calculation questions (±%)
  decisionTree?: DecisionNode[]; // For troubleshooting_tree
  explanation: string;         // Shown after answering
  remedialLessonId?: string;   // If wrong, suggest this lesson
  tags: string[];              // Topics for adaptive tracking
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;        // Why this is right/wrong
}

export interface DecisionNode {
  id: string;
  text: string;
  children: Array<{ label: string; nextNodeId: string }>;
  isCorrectPath?: boolean;
}

export interface StudentProgress {
  studentId: string;
  courseProgress: Record<string, CourseProgress>;
  quizScores: Record<string, QuizScore>;
  topicStrengths: Record<string, number>;  // 0-100
  totalTimeMinutes: number;
  streak: number;                          // Consecutive days
  lastActive: string;                      // ISO date
  certifications: Certification[];
  reviewQueue: ReviewItem[];               // Spaced repetition
}

export interface CourseProgress {
  courseId: string;
  started: string;
  completed?: string;
  modulesCompleted: string[];
  lessonsViewed: string[];
  currentModuleId?: string;
  percentComplete: number;
}

export interface QuizScore {
  quizId: string;
  moduleId: string;
  score: number;               // 0-100
  attempts: number;
  bestScore: number;
  lastAttempt: string;
  wrongAnswerTags: string[];   // For adaptive targeting
}

export interface Certification {
  level: "foundational" | "operator" | "programmer" | "master";
  earnedDate: string;
  score: number;
  verificationCode: string;
  expiresDate?: string;
}

export interface ReviewItem {
  formulaId: string;
  nextReview: string;          // ISO date
  interval: number;            // Days until next review
  easeFactor: number;          // SM-2 algorithm
  repetitions: number;
}

// ═══════════════════════════════════════════════════════════════
// Engine
// ═══════════════════════════════════════════════════════════════

export class CurriculumEngine {
  private courses: Map<string, Course> = new Map();
  private students: Map<string, StudentProgress> = new Map();

  constructor() {
    this.initializeCurriculum();
  }

  // ─────────────────────────────────────────────────────────
  // Course Access
  // ─────────────────────────────────────────────────────────

  getCourse(courseId: string): Course | undefined {
    return this.courses.get(courseId);
  }

  getAllCourses(): Course[] {
    return Array.from(this.courses.values());
  }

  getCoursesByLevel(level: SkillLevel): Course[] {
    return this.getAllCourses().filter(c => c.level === level);
  }

  getModule(courseId: string, moduleId: string): Module | undefined {
    return this.courses.get(courseId)?.modules.find(m => m.id === moduleId);
  }

  getLesson(courseId: string, moduleId: string, lessonId: string): Lesson | undefined {
    return this.getModule(courseId, moduleId)?.lessons?.find(l => l.id === lessonId);
  }

  // ─────────────────────────────────────────────────────────
  // Student Progress
  // ─────────────────────────────────────────────────────────

  getOrCreateStudent(studentId: string): StudentProgress {
    let student = this.students.get(studentId);
    if (!student) {
      student = {
        studentId,
        courseProgress: {},
        quizScores: {},
        topicStrengths: {},
        totalTimeMinutes: 0,
        streak: 0,
        lastActive: new Date().toISOString(),
        certifications: [],
        reviewQueue: [],
      };
      this.students.set(studentId, student);
    }
    return student;
  }

  startCourse(studentId: string, courseId: string): {
    ok: boolean;
    error?: string;
    course?: Course;
  } {
    const course = this.courses.get(courseId);
    if (!course) return { ok: false, error: `Course not found: ${courseId}` };

    // Check prerequisites
    const student = this.getOrCreateStudent(studentId);
    for (const prereq of course.prerequisites) {
      const prereqProgress = student.courseProgress[prereq];
      if (!prereqProgress?.completed) {
        return {
          ok: false,
          error: `Prerequisite not completed: ${prereq}`,
        };
      }
    }

    if (!student.courseProgress[courseId]) {
      student.courseProgress[courseId] = {
        courseId,
        started: new Date().toISOString(),
        modulesCompleted: [],
        lessonsViewed: [],
        currentModuleId: course.modules[0]?.id,
        percentComplete: 0,
      };
    }

    return { ok: true, course };
  }

  completeLesson(
    studentId: string,
    courseId: string,
    moduleId: string,
    lessonId: string,
    timeMinutes: number
  ): { ok: boolean; nextLesson?: string } {
    const student = this.getOrCreateStudent(studentId);
    const progress = student.courseProgress[courseId];
    if (!progress) return { ok: false };

    if (!progress.lessonsViewed.includes(lessonId)) {
      progress.lessonsViewed.push(lessonId);
    }
    student.totalTimeMinutes += timeMinutes;
    student.lastActive = new Date().toISOString();

    // Find next lesson
    const module = this.getModule(courseId, moduleId);
    if (!module) return { ok: true };

    // Lima-shape modules (courses 17, 19-23, 28-34) ship inline `content[]` instead of `lessons[]`.
    // Optional-chain + array-default keeps the engine compatible with both shapes.
    const moduleLessons = module.lessons ?? [];
    const lessonIdx = moduleLessons.findIndex(l => l.id === lessonId);
    const nextLesson = moduleLessons[lessonIdx + 1];

    // Update percent complete
    const course = this.courses.get(courseId);
    if (course) {
      const totalLessons = course.modules.reduce(
        (sum, m) => sum + (m.lessons?.length ?? 0), 0
      );
      progress.percentComplete = totalLessons > 0
        ? Math.round((progress.lessonsViewed.length / totalLessons) * 100)
        : 0;
    }

    return {
      ok: true,
      nextLesson: nextLesson?.id,
    };
  }

  recordQuizScore(
    studentId: string,
    quizId: string,
    moduleId: string,
    courseId: string,
    score: number,
    wrongTags: string[]
  ): {
    passed: boolean;
    score: number;
    bestScore: number;
    moduleCompleted: boolean;
  } {
    const student = this.getOrCreateStudent(studentId);
    const existing = student.quizScores[quizId];

    const quizScore: QuizScore = {
      quizId,
      moduleId,
      score,
      attempts: (existing?.attempts ?? 0) + 1,
      bestScore: Math.max(score, existing?.bestScore ?? 0),
      lastAttempt: new Date().toISOString(),
      wrongAnswerTags: wrongTags,
    };
    student.quizScores[quizId] = quizScore;

    // Update topic strengths
    for (const tag of wrongTags) {
      student.topicStrengths[tag] = Math.max(
        0,
        (student.topicStrengths[tag] ?? 50) - 10
      );
    }

    // Check if module quiz passed
    const module = this.getModule(courseId, moduleId);
    // ModuleQuiz is Quiz | InlineQuestion[] — narrow before .passingScore access (array form has no passing score).
    const quiz = module?.quiz;
    const passingScore = (quiz && !Array.isArray(quiz) ? quiz.passingScore : undefined) ?? 70;
    const passed = score >= passingScore;

    if (passed) {
      const progress = student.courseProgress[courseId];
      if (progress && !progress.modulesCompleted.includes(moduleId)) {
        progress.modulesCompleted.push(moduleId);

        // Advance to next module
        const course = this.courses.get(courseId);
        if (course) {
          const modIdx = course.modules.findIndex(m => m.id === moduleId);
          const nextMod = course.modules[modIdx + 1];
          progress.currentModuleId = nextMod?.id;

          // Check course completion
          if (progress.modulesCompleted.length >= course.modules.length) {
            progress.completed = new Date().toISOString();
            progress.percentComplete = 100;
          }
        }
      }
    }

    return {
      passed,
      score,
      bestScore: quizScore.bestScore,
      moduleCompleted: passed,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Certification
  // ─────────────────────────────────────────────────────────

  checkCertificationEligibility(
    studentId: string,
    level: "operator" | "programmer" | "master"
  ): {
    eligible: boolean;
    coursesRequired: string[];
    coursesCompleted: string[];
    coursesMissing: string[];
    minimumScore: number;
    currentAverageScore: number;
  } {
    const student = this.getOrCreateStudent(studentId);
    const config = CERTIFICATION_CONFIG[level];

    const coursesCompleted: string[] = [];
    const coursesMissing: string[] = [];
    let totalScore = 0;
    let scoreCount = 0;

    for (const courseId of config.requiredCourses) {
      const progress = student.courseProgress[courseId];
      if (progress?.completed) {
        coursesCompleted.push(courseId);
        // Average quiz scores for this course
        const course = this.courses.get(courseId);
        if (course) {
          for (const mod of course.modules) {
            // ModuleQuiz narrow: array form has no .id
            const quizId = mod.quiz && !Array.isArray(mod.quiz) ? mod.quiz.id : undefined;
            const qs = quizId ? student.quizScores[quizId] : undefined;
            if (qs) {
              totalScore += qs.bestScore;
              scoreCount++;
            }
          }
        }
      } else {
        coursesMissing.push(courseId);
      }
    }

    const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;

    return {
      eligible: coursesMissing.length === 0 && avgScore >= config.minimumScore,
      coursesRequired: config.requiredCourses,
      coursesCompleted,
      coursesMissing,
      minimumScore: config.minimumScore,
      currentAverageScore: Math.round(avgScore),
    };
  }

  awardCertification(
    studentId: string,
    level: "operator" | "programmer" | "master"
  ): Certification | null {
    const eligibility = this.checkCertificationEligibility(studentId, level);
    if (!eligibility.eligible) return null;

    const student = this.getOrCreateStudent(studentId);
    const cert: Certification = {
      level,
      earnedDate: new Date().toISOString(),
      score: eligibility.currentAverageScore,
      verificationCode: generateVerificationCode(studentId, level),
      expiresDate: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
    student.certifications.push(cert);
    return cert;
  }

  verifyCertification(code: string): {
    valid: boolean;
    level?: string;
    studentId?: string;
    earnedDate?: string;
  } {
    for (const [id, student] of this.students) {
      for (const cert of student.certifications) {
        if (cert.verificationCode === code) {
          const expired = cert.expiresDate
            ? new Date(cert.expiresDate) < new Date()
            : false;
          return {
            valid: !expired,
            level: cert.level,
            studentId: id,
            earnedDate: cert.earnedDate,
          };
        }
      }
    }
    return { valid: false };
  }

  // ─────────────────────────────────────────────────────────
  // Spaced Repetition (SM-2 algorithm)
  // ─────────────────────────────────────────────────────────

  addToReviewQueue(
    studentId: string,
    formulaId: string
  ): void {
    const student = this.getOrCreateStudent(studentId);
    if (student.reviewQueue.some(r => r.formulaId === formulaId)) return;

    student.reviewQueue.push({
      formulaId,
      nextReview: new Date().toISOString(),
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
    });
  }

  getDueReviews(studentId: string): ReviewItem[] {
    const student = this.students.get(studentId);
    if (!student) return [];

    const now = new Date();
    return student.reviewQueue.filter(
      r => new Date(r.nextReview) <= now
    );
  }

  recordReview(
    studentId: string,
    formulaId: string,
    quality: number // 0-5 (SM-2 scale)
  ): void {
    const student = this.students.get(studentId);
    if (!student) return;

    const item = student.reviewQueue.find(
      r => r.formulaId === formulaId
    );
    if (!item) return;

    // SM-2 algorithm
    if (quality >= 3) {
      if (item.repetitions === 0) {
        item.interval = 1;
      } else if (item.repetitions === 1) {
        item.interval = 6;
      } else {
        item.interval = Math.round(item.interval * item.easeFactor);
      }
      item.repetitions++;
    } else {
      item.repetitions = 0;
      item.interval = 1;
    }

    item.easeFactor = Math.max(
      1.3,
      item.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    const next = new Date();
    next.setDate(next.getDate() + item.interval);
    item.nextReview = next.toISOString();
  }

  // ─────────────────────────────────────────────────────────
  // Adaptive Learning
  // ─────────────────────────────────────────────────────────

  getWeakTopics(studentId: string, limit = 5): Array<{
    topic: string;
    strength: number;
    suggestedLessons: string[];
  }> {
    const student = this.students.get(studentId);
    if (!student) return [];

    return Object.entries(student.topicStrengths)
      .filter(([, strength]) => strength < 60)
      .sort(([, a], [, b]) => a - b)
      .slice(0, limit)
      .map(([topic, strength]) => ({
        topic,
        strength,
        suggestedLessons: this.findLessonsForTopic(topic),
      }));
  }

  getRecommendedNextCourse(studentId: string): Course | null {
    const student = this.students.get(studentId);
    if (!student) return this.courses.get("course-1") ?? null;

    for (const course of this.courses.values()) {
      const progress = student.courseProgress[course.id];
      if (!progress?.completed) {
        // Check prerequisites
        const prereqsMet = course.prerequisites.every(
          p => student.courseProgress[p]?.completed
        );
        if (prereqsMet) return course;
      }
    }
    return null;
  }

  getStudentDashboard(studentId: string): {
    totalCourses: number;
    completedCourses: number;
    totalTimeHours: number;
    streak: number;
    certifications: Certification[];
    currentCourse: string | null;
    percentOverall: number;
    weakTopics: Array<{ topic: string; strength: number }>;
    dueReviews: number;
  } {
    const student = this.getOrCreateStudent(studentId);
    const totalCourses = this.courses.size;
    const completedCourses = Object.values(student.courseProgress)
      .filter(p => p.completed).length;

    const currentCourse = Object.entries(student.courseProgress)
      .find(([, p]) => !p.completed)?.[0] ?? null;

    return {
      totalCourses,
      completedCourses,
      totalTimeHours: Math.round(student.totalTimeMinutes / 60 * 10) / 10,
      streak: student.streak,
      certifications: student.certifications,
      currentCourse,
      percentOverall: totalCourses > 0
        ? Math.round((completedCourses / totalCourses) * 100)
        : 0,
      weakTopics: Object.entries(student.topicStrengths)
        .filter(([, s]) => s < 60)
        .sort(([, a], [, b]) => a - b)
        .slice(0, 3)
        .map(([topic, strength]) => ({ topic, strength })),
      dueReviews: this.getDueReviews(studentId).length,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────────

  private findLessonsForTopic(topic: string): string[] {
    const lessons: string[] = [];
    for (const course of this.courses.values()) {
      for (const module of course.modules) {
        for (const lesson of module.lessons ?? []) {
          if (lesson.keyFormulas?.some(f => f.includes(topic))) {
            lessons.push(lesson.id);
          }
        }
      }
    }
    return lessons.slice(0, 3);
  }

  private initializeCurriculum(): void {
    // Course definitions — structure only, content populated by LessonRendererEngine
    const courseDefinitions: Array<Omit<Course, "modules"> & { moduleCount: number; moduleTitles: string[] }> = [
      // ── Phase 0: Pre-Machining Fundamentals ──
      {
        id: "course-0a",
        title: "Shop Math for Machinists",
        description: "Decimals, fractions, metric, geometry, trig — all using machining examples. No prior math assumed.",
        level: "novice",
        prerequisites: [],
        estimatedHours: 6,
        moduleCount: 8,
        moduleTitles: [
          "Numbers & Decimals", "Fractions & Conversions",
          "The Metric System", "Basic Geometry",
          "Area & Volume", "Ratios & Percentages",
          "Basic Algebra", "Trigonometry for Machinists",
        ],
      },
      {
        id: "course-0b",
        title: "Hand Tools & Measurement",
        description: "Every tool and instrument in the shop — wrenches to micrometers, tape measures to CMM reports.",
        level: "novice",
        prerequisites: ["course-0a"],
        estimatedHours: 8,
        moduleCount: 10,
        moduleTitles: [
          "Common Hand Tools", "Reading a Tape Measure",
          "Calipers — Dial & Digital", "Micrometers",
          "Height Gauges & Indicators", "Gauge Blocks & Pin Gauges",
          "Surface Plates & Layout", "Thread Identification",
          "Material Identification", "Inspection Reports",
        ],
      },
      {
        id: "course-0c",
        title: "Blueprint Reading & GD&T",
        description: "Read any engineering drawing — orthographic views, dimensions, tolerances, GD&T feature control frames.",
        level: "novice",
        prerequisites: ["course-0a"],
        estimatedHours: 10,
        certificationLevel: "operator",
        moduleCount: 12,
        moduleTitles: [
          "What is a Blueprint?", "Orthographic Projection",
          "Isometric & Section Views", "Dimensioning Basics",
          "Tolerancing", "Surface Finish Symbols",
          "Thread Callouts", "Hole Callouts",
          "GD&T Introduction", "GD&T Form Controls",
          "GD&T Location Controls", "GD&T Orientation & Runout",
        ],
      },
      // ── Phase 1: Machine Fundamentals ──
      {
        id: "course-1",
        title: "Manufacturing Fundamentals",
        description: "Everything a novice needs to understand CNC machining — from machine types to shop safety",
        level: "novice",
        prerequisites: [],
        estimatedHours: 8,
        certificationLevel: "operator",
        moduleCount: 12,
        moduleTitles: [
          "What is CNC Machining?", "Machine Types", "Coordinate Systems",
          "Cutting Tool Anatomy", "Material Basics", "Speeds & Feeds Concept",
          "Reading Engineering Drawings", "Surface Finish", "Tolerances",
          "Workholding", "Coolant Basics", "Shop Safety",
        ],
      },
      {
        id: "course-2",
        title: "Speed & Feed Mastery",
        description: "Master the physics of cutting — Kienzle force, Taylor tool life, stability lobes, and chip thinning",
        level: "intermediate",
        prerequisites: ["course-1"],
        estimatedHours: 6,
        certificationLevel: "operator",
        moduleCount: 10,
        moduleTitles: [
          "Chip Load Explained", "Kienzle Cutting Force", "Taylor Tool Life",
          "SFM to RPM Conversion", "Feed Rate Calculation", "Stability Lobes",
          "Chip Thinning Compensation", "Material-Specific Strategies",
          "Tool Deflection", "Full S/F Walkthrough",
        ],
      },
      {
        id: "course-3",
        title: "G-Code Programming",
        description: "Write, read, and debug CNC programs — from G00 to subprograms",
        level: "intermediate",
        prerequisites: ["course-1"],
        estimatedHours: 8,
        certificationLevel: "operator",
        moduleCount: 10,
        moduleTitles: [
          "G-Code Structure", "Motion Commands", "Canned Cycles",
          "Work Offsets", "Tool Changes", "Cutter Compensation",
          "Subprograms", "Program Structure", "Common Mistakes",
          "Reading Real Programs",
        ],
      },
      {
        id: "course-4",
        title: "Milling Operations",
        description: "Every milling operation with animations, playbook rules, and live calculators",
        level: "advanced",
        prerequisites: ["course-2"],
        estimatedHours: 10,
        moduleCount: 12,
        moduleTitles: [
          "Face Milling", "Pocket Milling", "Slotting", "Contour Milling",
          "Plunge Milling", "Adaptive / HSM", "Rest Machining",
          "3D Surfacing", "Thread Milling", "Drilling Strategies",
          "Tapping", "Micro-Machining",
        ],
      },
      {
        id: "course-5",
        title: "Turning Operations",
        description: "Lathe mastery from OD roughing to Swiss-type machining",
        level: "advanced",
        prerequisites: ["course-2"],
        estimatedHours: 8,
        moduleCount: 10,
        moduleTitles: [
          "OD Roughing", "OD Finishing", "Facing", "Grooving",
          "Threading", "Boring", "Parting", "Live Tooling",
          "Sub-Spindle", "Swiss-Type",
        ],
      },
      {
        id: "course-6",
        title: "CAM System Mastery",
        description: "18 CAM systems compared — tribal tips, unique features, and cross-system wisdom",
        level: "advanced",
        prerequisites: ["course-4"],
        estimatedHours: 12,
        moduleCount: 18,
        moduleTitles: [
          "Mastercam", "Edgecam", "hyperMILL", "Fusion 360",
          "SolidCAM", "Siemens NX", "PowerMill", "ESPRIT",
          "CAMWorks", "TopSolid", "WorkNC", "GibbsCAM",
          "BobCAD", "CATIA", "Cimatron", "Tebis",
          "SprutCAM", "SurfCAM",
        ],
      },
      {
        id: "course-7",
        title: "Material Science for Machinists",
        description: "Understand your workpiece — from steel families to exotic alloys",
        level: "advanced",
        prerequisites: ["course-2"],
        estimatedHours: 6,
        moduleCount: 8,
        moduleTitles: [
          "Steel Families", "Aluminum Alloys", "Stainless Steel",
          "Titanium", "Superalloys", "Plastics",
          "Composites", "Exotic Materials",
        ],
      },
      {
        id: "course-8",
        title: "5-Axis Machining",
        description: "Master simultaneous 5-axis — from kinematics to singularity avoidance",
        level: "master",
        prerequisites: ["course-4"],
        estimatedHours: 8,
        certificationLevel: "master",
        moduleCount: 8,
        moduleTitles: [
          "3+2 vs Simultaneous", "Lead/Lag/Tilt Angles",
          "TCPC & RTCP", "Singularity Zones", "Collision Avoidance",
          "Port Machining", "Impeller & Blisk", "Post-Processor Considerations",
        ],
      },
      {
        id: "course-9",
        title: "Process Optimization",
        description: "Statistical and physics-based optimization for maximum productivity",
        level: "master",
        prerequisites: ["course-2", "course-4"],
        estimatedHours: 8,
        certificationLevel: "master",
        moduleCount: 8,
        moduleTitles: [
          "Monte Carlo Force Analysis", "Taguchi DOE",
          "SPC & Cpk", "Tool Wear Prediction",
          "Thermal Compensation", "Vibration Analysis",
          "Energy Optimization", "Cost Optimization",
        ],
      },
      {
        id: "course-10",
        title: "Troubleshooting & Problem Solving",
        description: "Diagnose and fix every common machining problem",
        level: "master",
        prerequisites: ["course-4", "course-5"],
        estimatedHours: 8,
        certificationLevel: "master",
        moduleCount: 10,
        moduleTitles: [
          "Chatter", "Poor Surface Finish", "Tool Breakage",
          "Dimensional Errors", "Chip Evacuation", "Coolant Failures",
          "Fixture Failures", "Program Crashes", "Alarm Decoding",
          "Post-Processor Issues",
        ],
      },
      // ── Phase 5: Professional Development ──
      {
        id: "course-11",
        title: "Shop Economics & Estimating",
        description: "Cost per part, quoting, make-vs-buy, ROI on tooling, scrap economics",
        level: "advanced",
        prerequisites: ["course-2"],
        estimatedHours: 5,
        moduleCount: 6,
        moduleTitles: [
          "Cost Per Part Breakdown",
          "Quoting Basics — Markup & Margin",
          "Make vs Buy Decisions",
          "ROI on Tooling Upgrades",
          "Scrap Cost & First Article Economics",
          "Price Breaks & Batch Economics",
        ],
      },
      {
        id: "course-13",
        title: "Wire EDM — Entry to Master (Progressive)",
        description: "Wire EDM from foundations through master-level micro-features. 5 modules: foundations, basic programming, 4-axis taper, multi-pass strategy, lights-out production.",
        level: "intermediate",
        prerequisites: ["course-1"],
        estimatedHours: 6,
        moduleCount: 5,
        moduleTitles: [
          "Wire EDM Foundations",
          "Basic Wire EDM Programming",
          "Advanced 4-Axis Programming",
          "Surface Quality & Multi-Pass Strategy",
          "Master Work — Micro-Features, PCD/Carbide, Lights-Out",
        ],
      },
      {
        id: "course-14",
        title: "Electrode Making — Copper, Graphite, Tungsten-Copper",
        description: "Electrode design and fabrication for sinker EDM. 4 modules: foundations, sizing & overcut, orbital patterns, micro-electrodes.",
        level: "intermediate",
        prerequisites: ["course-1"],
        estimatedHours: 4,
        moduleCount: 4,
        moduleTitles: [
          "Electrode Foundations",
          "Side-Overcut & Electrode Sizing",
          "Orbital and Vector Patterns",
          "Master Work — Micro-Electrodes Below Ø0.10 mm",
        ],
      },
      {
        id: "course-15",
        title: "Robot Arms — JM Die Context (Entry to Master)",
        description: "6-axis articulated arms for CNC tending. 4 modules: foundations, grippers, Okuma pickoff handshake, lights-out cells. JM LTH-01 prioritized.",
        level: "advanced",
        prerequisites: ["course-1"],
        estimatedHours: 4,
        moduleCount: 4,
        moduleTitles: [
          "6-Axis Arm Foundations",
          "Gripper End-Effectors",
          "Robot↔CNC Handshake (Okuma Pickoff)",
          "Master Work — Multi-Machine Lights-Out Cells",
        ],
      },
      {
        id: "course-17",
        title: "Tooling Codes — ISO Insert + ANSI Body + Chip-Breaker",
        description: "Read every character of an ISO/ANSI tooling code and feed the data directly into speed-feed pipelines. 3 modules: insert code anatomy, holder code anatomy, grade+breaker→Vc/fn mapping.",
        level: "intermediate",
        prerequisites: ["course-5"],
        estimatedHours: 3,
        moduleCount: 3,
        moduleTitles: [
          "ISO 1832 Insert Code Anatomy",
          "ANSI Body Code Anatomy",
          "Grade Codes + Chip-Breakers → Speed-Feed Pipeline",
        ],
      },
      {
        id: "course-18",
        title: "CAD/CAM Entry-Level Training",
        description: "First-day-on-the-job training: Fusion 360 first part, Mastercam Dynamic Motion first job, toolpath strategy hierarchy, alarm 5-step diagnosis, and shop-floor efficiency (OEE + SMED + accuracy). 5 modules.",
        level: "novice",
        prerequisites: ["course-0c"],
        estimatedHours: 4,
        moduleCount: 5,
        moduleTitles: [
          "CAD Entry — Fusion 360 First-Part Walkthrough",
          "CAM Entry — Mastercam Dynamic Motion First Job",
          "Toolpath Strategy Hierarchy — Rough → Semi → Finish",
          "Alarm Troubleshooting — Fanuc / Haas / Okuma 5-Step Diagnosis",
          "Shop-Floor Efficiency — OEE, Setup Reduction, Accuracy",
        ],
      },
      {
        id: "course-19",
        title: "CAM Entry — hyperMILL + NX CAM + SolidCAM iMachining",
        description: "Continues course-18 into the next 3 priority CAM systems by U.S. installed base. 4 modules: hyperMILL project workflow, NX CAM feature-based machining + aerospace defaults, SolidCAM iMachining patented chip-thinning, and a cross-CAM decision matrix (when to use which).",
        level: "novice",
        prerequisites: ["course-18"],
        estimatedHours: 5,
        moduleCount: 4,
        moduleTitles: [
          "hyperMILL Entry — Project Setup + First 2D Pocket",
          "NX CAM Entry — Feature-Based Machining + Aerospace Defaults",
          "SolidCAM iMachining Entry — Patented Chip-Thinning + SolidWorks Integration",
          "CAM System Selection — When to Use hyperMILL vs NX vs SolidCAM vs Mastercam vs Fusion",
        ],
      },
      {
        id: "course-34",
        title: "Per-Machine-Type Operation Guide — VMC, HMC, 5-Axis, Lathes, EDM, Grinders",
        description: "Per user directive 2026-05-25: 'expand all domains of machining, each machine type'. 7 modules covering distinctive operations per machine type: 3-axis VMC, HMC + 4-axis VMC (tombstone), 5-axis (trunnion + gantry + head/head configs with RTCP G43.4/TRAORI/M128), lathes (2-axis + sub-spindle + live tooling + Swiss + multi-spindle), EDM (wire + sinker), grinders (surface + cylindrical + centerless + creep-feed + form), and a machine-selection decision tree. LAYMAN + ADVANCED dual-level. Closes the 'each machine type' axis of the /goal.",
        level: "intermediate",
        prerequisites: ["course-33"],
        estimatedHours: 7,
        moduleCount: 7,
        moduleTitles: [
          "3-Axis VMC (Vertical Machining Center)",
          "HMC (Horizontal Machining Center) + 4-Axis VMC",
          "5-Axis Machining Centers (Trunnion + Gantry + Head/Head)",
          "Lathes (2-Axis + Sub-Spindle + Live Tooling)",
          "Wire EDM + Sinker EDM (Non-Traditional)",
          "Grinders (Surface, Cylindrical, Centerless, Creep-Feed, Form)",
          "Machine Selection — The Routing Decision Tree",
        ],
      },
      {
        id: "course-33",
        title: "Material Machining Atlas — How to Cut Every Material + Operation Order",
        description: "Per user directive 2026-05-25: 'how to cut different materials (all materials), explain recommendations and why we do operations in certain order'. 6 modules covering all 6 ISO groups (P steels, M stainless, N aluminum/non-ferrous, S superalloys, K cast iron, H hardened) with per-material parameters + coating selection + coolant selection + operation-order rationale. Canonical mill + lathe order templates with bad-order quantified examples. Closes the materials axis of the /goal.",
        level: "intermediate",
        prerequisites: ["course-32"],
        estimatedHours: 6,
        moduleCount: 6,
        moduleTitles: [
          "Group P — Steels (1018, 4140, 4340, A2/D2, H13, 17-4 PH)",
          "Group M — Stainless Steels (303, 304, 316, 410, 416)",
          "Group N — Aluminum + Non-Ferrous (6061, 7075, brass, copper, magnesium)",
          "Group S — Superalloys (Ti-6Al-4V, Inconel 625/718, Hastelloy)",
          "Group K + H — Cast Iron + Hardened/Bearing Materials",
          "Operation Order — Why We Do Things In Certain Order",
        ],
      },
      {
        id: "course-32",
        title: "Machining Math & Science Deep-Dive — Why Optimal Parameters Are Optimal",
        description: "Per user directive 2026-05-25: 'tooling utilization, optimal parameters and why its optimal, explain the math and science behind machining processes'. 5 modules with LAYMAN + ADVANCED dual-level template: Merchant's circle + shear-angle mechanics, Komanduri-Hou heat partition + Loewen-Shaw thermal zones, 5 tool wear mechanisms (Archard adhesion + abrasion + diffusion + oxidation + BUE), surface integrity physics (Brammertz Ra + Mishra-Yoon residual stress + Pawade white layer + work hardening), Taylor + Gilbert tool-life economy + cost-minimum cutting speed derivation with worked JM Die example.",
        level: "advanced",
        prerequisites: ["course-30"],
        estimatedHours: 6,
        moduleCount: 5,
        moduleTitles: [
          "Cutting Mechanics — Merchant's Circle, Shear Angle, Force Physics",
          "Heat Partition + Thermal Physics in Machining",
          "Tool Wear Mechanisms — Adhesion, Abrasion, Diffusion, Oxidation, BUE",
          "Surface Integrity — Ra, Residual Stress, White Layer, Work Hardening",
          "Optimal Parameter Selection — Taylor Tool Life Economics + Cost-Minimum Cutting Speed",
        ],
      },
      {
        id: "course-31",
        title: "Complete CAD/CAM Operations Atlas (Rosetta Stone)",
        description: "Per user directive 2026-05-25 'full coverage for all tool paths from all cam softwares, all cad functions from all cad software': operation-centric Rosetta Stone enumerating ~1000+ cross-system operation-name correspondences. 7 modules: hole-making, 2D milling, 3D milling, 5-axis, turning + mill-turn, CAD operations across 11 priority CAD systems, specialty operations (probing/EDM/laser/waterjet/grinding).",
        level: "intermediate",
        prerequisites: ["course-30"],
        estimatedHours: 5,
        moduleCount: 7,
        moduleTitles: [
          "Hole-Making Operations Across All CAM Systems",
          "2D Milling Operations Across All CAM Systems",
          "3D Milling Operations Across All CAM Systems",
          "5-Axis Operations Across All CAM Systems",
          "Turning + Mill-Turn Operations Across All CAM Systems",
          "CAD Operations Across All Priority CAD Systems",
          "Specialty Operations — Probing, EDM, Laser, Waterjet, Grinding Across All Systems",
        ],
      },
      {
        id: "course-30",
        title: "Complete Toolpath Catalog + Programming Paradigms (Hard Code / Macros / Conversational)",
        description: "Per user directive 2026-05-25: 'account for all possible tool paths and explain them all and show how to use them and how each input works and affects the cut for each cam tool path, hard code, macros, conversational'. 5 modules: 2D toolpath catalog (face/pocket/profile/slot/drill/helical/bore + G81-G89 canned cycles), 3D toolpath catalog (Z-level/parallel/scallop/pencil/rest/swarf/multi-axis), per-input quantified effects (Vc/fz/ap/ae/stepover/stepdown/coolant), programming paradigms (hard code vs Fanuc Custom Macro B vs Mazatrol conversational), and a 4-question synthesis decision tree.",
        level: "intermediate",
        prerequisites: ["course-29"],
        estimatedHours: 6,
        moduleCount: 5,
        moduleTitles: [
          "2D Toolpath Catalog — Face, Pocket, Profile, Slot, Drill, Helical, Bore",
          "3D Toolpath Catalog — Z-Level, Parallel, Scallop, Pencil, Rest, Swarf, Multi-Axis",
          "Per-Input Effects — What Each Parameter Does to the Cut",
          "Programming Paradigms — Hard Code vs Macros vs Conversational",
          "Putting It All Together — The Toolpath Decision Tree",
        ],
      },
      {
        id: "course-29",
        title: "Toolpath Reasoning — Why Strategies Match Geometry (Layman + Advanced)",
        description: "Establishes the CANONICAL dual-level pedagogy: every machining concept presented BOTH in plain-language layman terms AND in advanced math/physics terms with citations. 6 modules: spindle stiffness anisotropy + plunge roughing for tall walls + high-feed milling + trochoidal slots + HSM adaptive clearing + climb vs conventional. Each module includes annotated ASCII force-vector diagrams. This is the TEMPLATE for re-enriching all machining/engineering courses with dual-level explanations per user directive 2026-05-24.",
        level: "intermediate",
        prerequisites: ["course-4"],
        estimatedHours: 5,
        moduleCount: 6,
        moduleTitles: [
          "Force Direction Fundamentals — Spindle Stiffness Anisotropy",
          "Plunge Roughing Tall Walls — Force Targeted Vertically",
          "High-Feed Milling — Why Small Axial DOC + Large Feed Per Tooth Works",
          "Trochoidal Slot Milling — Engagement-Angle Modulation",
          "HSM Adaptive Clearing — Engagement-Modulated Feed for Constant Force",
          "Climb vs Conventional — Chip Geometry + Deflection Direction",
        ],
      },
      {
        id: "course-28",
        title: "Function-Index Reference — Every Function + Input for All 23 Priority CAD/CAM Systems",
        description: "CLOSES /goal axis 'include every single function and input possible for each cad and cam system, utilize all compatible nodes from /system-viz'. 23 modules — one per priority CAM system — each cataloging the PRISM function-index dispatcher actions (8-15 per CAM) that enumerate every toolpath, parameter, operation, and input. Teaches NAVIGATION of PRISM's existing function-index surface rather than re-deriving content. Each module includes a calculator slot for live-query of the function index.",
        level: "intermediate",
        prerequisites: ["course-27"],
        estimatedHours: 6,
        moduleCount: 23,
        moduleTitles: [
          "Fusion 360 — Function Index",
          "Mastercam — Function Index (Mill + Lathe + Mill-Turn)",
          "hyperMILL — Function Index (Mold/Die + 5-Axis)",
          "NX CAM — Function Index (Aerospace + Auto)",
          "SolidCAM — Function Index (iMachining)",
          "Esprit — Function Index (ProfitTurning + Multi-Channel)",
          "PowerMill — Function Index (Vortex + 5-Axis)",
          "Inventor HSM — Function Index (Inventor-Native CAM)",
          "CATIA Machining — Function Index (Tier-1 OEM)",
          "Creo NC — Function Index (PTC)",
          "WorkNC — Function Index (Auto5)",
          "GibbsCAM — Function Index (Volumill)",
          "EdgeCAM — Function Index (Waveform)",
          "SURFCAM — Function Index (TrueMill)",
          "VISI — Function Index (Mold/Die)",
          "CAMWorks — Function Index (SolidWorks AFR)",
          "Alphacam — Function Index (Non-Metallic)",
          "TopSolid — Function Index (European Tier-2)",
          "BobCAD-CAM — Function Index (Budget DMT)",
          "Cimatron — Function Index (Mold/Die)",
          "SprutCAM — Function Index (Robot CAM)",
          "PartMaker — Function Index (Swiss)",
          "Closing the Loop — FeatureCAM + Vericut + Tebis Function Indexes",
        ],
      },
      {
        id: "course-27",
        title: "CAM Entry — Final 6 (TopSolid + BobCAD + Cimatron + SprutCAM + PartMaker + FeatureCAM)",
        description: "CLOSES /goal CAM-coverage axis. After course-27, 23 of 23 priority CAM systems have entry-level training. 6 modules: TopSolid (European Tier-2 PMI), BobCAD-CAM (budget small-shop), Cimatron (plastic injection mold), SprutCAM (cross-vendor robot CAM), PartMaker (Swiss + multi-spindle specialist, Autodesk), FeatureCAM (Autodesk AFR).",
        level: "novice",
        prerequisites: ["course-26"],
        estimatedHours: 5,
        moduleCount: 6,
        moduleTitles: [
          "TopSolid Entry — French CAM with PMI-Driven Workflow",
          "BobCAD-CAM Entry — Budget Small-Shop CAM",
          "Cimatron Entry — Plastic Injection Mold/Die Specialist",
          "SprutCAM Entry — Robot Programming + CNC",
          "PartMaker Entry — Swiss + Multi-Spindle Specialist (Autodesk)",
          "FeatureCAM Entry — Autodesk AFR + Closing the CAM-Coverage Loop",
        ],
      },
      {
        id: "course-26",
        title: "CAM Entry — SURFCAM + VISI + Alphacam + CAMWorks",
        description: "Continues course-25 into 4 more priority CAM systems. 4 modules: SURFCAM TrueMill HSM (US patent 7,451,013), VISI mold/die split-design, Alphacam non-metallic specialist (wood + composite + stone), CAMWorks AFR (Automatic Feature Recognition) on SolidWorks.",
        level: "novice",
        prerequisites: ["course-25"],
        estimatedHours: 4,
        moduleCount: 4,
        moduleTitles: [
          "SURFCAM Entry — TrueMill HSM (Hexagon)",
          "VISI Entry — Mold/Die Specialist (Hexagon)",
          "Alphacam Entry — Wood + Composite + Stone Specialist (Hexagon)",
          "CAMWorks Entry — AFR (Automatic Feature Recognition) on SolidWorks",
        ],
      },
      {
        id: "course-25",
        title: "CAM Entry — Creo NC + WorkNC + GibbsCAM + EdgeCAM",
        description: "Continues course-20 into 4 more priority CAM systems. 4 modules: Creo NC (PTC, aerospace + auto PMI-driven), WorkNC (Hexagon, Auto5 1-click 5-axis conversion), GibbsCAM (Sandvik, Volumill — first commercial HSM algorithm), EdgeCAM (Hexagon, SolidWorks/Inventor add-in + PC-DMIS closed-loop).",
        level: "novice",
        prerequisites: ["course-20"],
        estimatedHours: 4,
        moduleCount: 4,
        moduleTitles: [
          "Creo NC Entry — PTC's Aerospace + Auto CAM",
          "WorkNC Entry — Auto-5-Axis Mold/Die",
          "GibbsCAM Entry — Volumill Chip-Thinning + Mill-Turn",
          "EdgeCAM Entry — Waveform Roughing + SolidWorks/Inventor Add-In",
        ],
      },
      {
        id: "course-24",
        title: "Accuracy Improvement Per Machine Class",
        description: "Closes the /goal 'how to improve accuracy' axis. Decomposes accuracy errors into 4 pathways (geometric, thermal, dynamic, process) + applies machine-class-specific compensation strategies. 4 modules: ISO 230 fundamentals + ballbar + thermal comp, mill RTCP + head clearance + tool deflection RSS stack, lathe springback + taper + tool wear progression, wire EDM multi-pass + corner radius + grinder spark-out.",
        level: "advanced",
        prerequisites: ["course-21"],
        estimatedHours: 5,
        moduleCount: 4,
        moduleTitles: [
          "Machine Accuracy Fundamentals — ISO 230 + Ballbar + Thermal",
          "Mill Accuracy — Geometric Comp + RTCP + Head Clearance",
          "Lathe Accuracy — Springback + Taper + Tool Offset Wear",
          "Wire EDM + Grinder Accuracy — Corner Radius + Taper Error",
        ],
      },
      {
        id: "course-23",
        title: "PRISM Database Mastery — Tooling + Inserts + Materials + Machines",
        description: "Closes the /goal 'full database of tooling and inserts and machines and material' axis. Teaches HOW TO QUERY PRISM's vast catalogs (12 tool vendors, ISO 1832 inserts, 25+ machine manufacturers, 12+ material spec systems) rather than memorizing data. 4 modules covering tool catalog query workflow, insert ISO-code → catalog mapping, material spec equivalents + machinability, and machine capability + job-to-machine matching.",
        level: "intermediate",
        prerequisites: ["course-17"],
        estimatedHours: 5,
        moduleCount: 4,
        moduleTitles: [
          "Tooling Database — Catalog Query + Selection Workflow",
          "Insert Database — ISO 1832 Code → Material → Performance",
          "Material Database — ISO Groups + Equivalents + Machinability",
          "Machine Database — Capability Lookup + Selection + Cost Per Hour",
        ],
      },
      {
        id: "course-22",
        title: "Alarm Troubleshooting Deep Dive — Fanuc + Haas + Okuma + Mazak + Siemens 840D",
        description: "Continues course-18 mod 4 (top-15 cheat sheet) into systematic alarm decoding across 5 major controllers + 100+ alarm classes. Universal 8-category framework + Fanuc/Haas/Okuma/Mazak/Siemens deep dives + escalation protocol + pattern detection + PRISM AlarmIntelligenceEngine integration. 5 modules.",
        level: "intermediate",
        prerequisites: ["course-18"],
        estimatedHours: 6,
        moduleCount: 5,
        moduleTitles: [
          "Alarm Anatomy — Code Structure + Category Decode",
          "Fanuc Alarm Deep Dive — The 30 Most Common + Root Causes",
          "Haas + Okuma Alarm Deep Dive",
          "Mazak + Siemens 840D Alarm Deep Dive",
          "Alarm Escalation + Pattern Detection + PRISM Workflow",
        ],
      },
      {
        id: "course-21",
        title: "Business Management for Machinists + Shop-Floor Managers",
        description: "Job costing (labor/material/overhead/scrap/margin), quoting fundamentals (cycle time + capacity planning), shop-floor management (KPIs, dispatching, daily standup), continuous improvement (PDCA + kaizen + lean), and a daily operating rhythm. 5 modules. Closes the /goal 'business management + shop floor manager + efficiency + accuracy' axes.",
        level: "intermediate",
        prerequisites: ["course-1"],
        estimatedHours: 6,
        moduleCount: 5,
        moduleTitles: [
          "Job Costing — Labor, Material, Overhead, Scrap, Margin",
          "Quoting Fundamentals — Cycle Time + Capacity Planning",
          "Shop-Floor Management — KPIs, Dispatching, Daily Standup",
          "Continuous Improvement — PDCA, Kaizen, Lean Metrics",
          "Putting It Together — A Daily Routine for Shop-Floor Managers",
        ],
      },
      {
        id: "course-20",
        title: "CAM Entry — Esprit + PowerMill + Inventor HSM + CATIA Machining",
        description: "Continues course-19 into the next 4 priority CAM systems. 4 modules: Esprit mill-turn + ProfitTurning (Swiss machining), PowerMill mold/die + Vortex roughing, Inventor HSM Adaptive Clearing (Fusion-paired), and CATIA Machining APT/KBM workflow (large-OEM aerospace + auto + defense).",
        level: "novice",
        prerequisites: ["course-19"],
        estimatedHours: 4,
        moduleCount: 4,
        moduleTitles: [
          "Esprit Entry — Mill-Turn + ProfitTurning + Swiss Machining",
          "PowerMill Entry — Mold/Die Surface Finishing + Vortex Roughing",
          "Inventor HSM Entry — Inventor-Integrated CAM (Fusion-paired)",
          "CATIA Machining Entry — Large-OEM Aerospace + Auto + Defense",
        ],
      },
      {
        id: "course-16",
        title: "Sinker EDM — JM Mitsubishi EA12 (Entry to Master)",
        description: "Sinker EDM via JM's EA12S+EA12D fleet. 4 modules: foundations, flushing, multi-pass strategy, micro+mirror master work.",
        level: "intermediate",
        prerequisites: ["course-14"],
        estimatedHours: 4,
        moduleCount: 4,
        moduleTitles: [
          "Sinker EDM Foundations (JM EA12 fleet)",
          "Flushing — The 70% Quality Determinant",
          "Multi-Pass Strategy (Rough → Mirror)",
          "Master Work — Micro-Sinker + Mirror + Sealing Pockets",
        ],
      },
      {
        id: "course-12",
        title: "Career Development for Machinists",
        description: "Career paths, portfolio building, interview prep, continuous learning resources",
        level: "intermediate",
        prerequisites: ["course-1"],
        estimatedHours: 3,
        moduleCount: 4,
        moduleTitles: [
          "Career Paths — Operator to Engineer",
          "Building a Programming Portfolio",
          "Interview Preparation",
          "Continuous Learning Resources",
        ],
      },
    ];

    for (const def of courseDefinitions) {
      // Use rich academy content when available, fall back to stubs
      const richModules = RICH_MODULES[def.id];
      const modules: Module[] = richModules?.length
        ? richModules
        : def.moduleTitles.map((title, idx) => ({
        id: `${def.id}-mod-${idx + 1}`,
        courseId: def.id,
        title,
        description: `${title} — ${def.title}`,
        order: idx + 1,
        lessons: [
          {
            id: `${def.id}-mod-${idx + 1}-les-1`,
            moduleId: `${def.id}-mod-${idx + 1}`,
            title: `${title} — Concepts`,
            order: 1,
            content: [{ type: "text" as ContentType, body: `# ${title}\n\nContent pending.` }],
          },
          {
            id: `${def.id}-mod-${idx + 1}-les-2`,
            moduleId: `${def.id}-mod-${idx + 1}`,
            title: `${title} — Practice`,
            order: 2,
            content: [{ type: "calculator" as ContentType, title: `${title} Calculator` }],
          },
        ],
        quiz: {
          id: `${def.id}-mod-${idx + 1}-quiz`,
          moduleId: `${def.id}-mod-${idx + 1}`,
          questions: [],
          passingScore: 70,
        },
        estimatedMinutes: Math.round((def.estimatedHours * 60) / def.moduleCount),
      }));

      this.courses.set(def.id, {
        id: def.id,
        title: def.title,
        description: def.description,
        level: def.level,
        modules,
        prerequisites: def.prerequisites,
        estimatedHours: def.estimatedHours,
        certificationLevel: def.certificationLevel,
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const CERTIFICATION_CONFIG: Record<string, {
  requiredCourses: string[];
  minimumScore: number;
}> = {
  foundational: {
    requiredCourses: ["course-0a", "course-0b", "course-0c"],
    minimumScore: 70,
  },
  operator: {
    requiredCourses: [
      "course-0a", "course-0b", "course-0c",
      "course-1", "course-2", "course-3",
    ],
    minimumScore: 80,
  },
  programmer: {
    requiredCourses: [
      "course-0a", "course-0b", "course-0c",
      "course-1", "course-2", "course-3",
      "course-4", "course-5", "course-6", "course-7",
    ],
    minimumScore: 85,
  },
  master: {
    requiredCourses: [
      "course-0a", "course-0b", "course-0c",
      "course-1", "course-2", "course-3", "course-4", "course-5",
      "course-6", "course-7", "course-8", "course-9", "course-10",
      "course-11", "course-12",
    ],
    minimumScore: 90,
  },
};

function generateVerificationCode(
  studentId: string,
  level: string
): string {
  const timestamp = Date.now().toString(36);
  const hash = Array.from(studentId + level)
    .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
    .toString(36)
    .replace("-", "");
  return `PRISM-${level.toUpperCase().substring(0, 3)}-${timestamp}-${hash}`.toUpperCase();
}
