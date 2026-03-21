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

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
  quiz: Quiz;
  estimatedMinutes: number;
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

export interface LessonContent {
  type: ContentType;
  title?: string;
  body?: string;               // Markdown text
  diagramSvg?: string;         // SVG markup for diagrams
  calculatorConfig?: {
    engine: string;            // PRISM engine name
    inputFields: string[];     // Parameter names to expose
    outputFields: string[];    // Result fields to display
    defaults?: Record<string, number>;
  };
  sandboxConfig?: {
    engine: string;
    task: string;              // Description of what student should do
    validationFn?: string;     // Validation logic name
  };
  videoUrl?: string;
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
    return this.getModule(courseId, moduleId)?.lessons.find(l => l.id === lessonId);
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

    const lessonIdx = module.lessons.findIndex(l => l.id === lessonId);
    const nextLesson = module.lessons[lessonIdx + 1];

    // Update percent complete
    const course = this.courses.get(courseId);
    if (course) {
      const totalLessons = course.modules.reduce(
        (sum, m) => sum + m.lessons.length, 0
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
    const passingScore = module?.quiz.passingScore ?? 70;
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
            const qs = student.quizScores[mod.quiz.id];
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
        for (const lesson of module.lessons) {
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
