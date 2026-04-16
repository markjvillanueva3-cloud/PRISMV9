/**
 * LearningProgressionEngine — Course-Based Learning with Gated Checkpoints
 * ==========================================================================
 *
 * Structured course progression: create courses with ordered modules, enroll
 * students, gate advancement on checkpoint pass/fail, track media, and search
 * by knowledge facets (machine type, material, CAM system, process).
 *
 * Flow: create course → enroll → start module → submit checkpoint → pass → next module → complete
 *
 * Knowledge facets enable cross-domain search:
 *   "Haas VF-2" → VMC setup courses, Haas alarm courses, 3-axis strategy courses
 *   "titanium" → material-specific feeds/speeds, tool life management courses
 *
 * @version 1.0.0 — Session 6-10 U-LEARN1
 * @see LearningPathEngine — role-based learning plans (existing)
 * @see AssessmentEngine — quiz/exam system (existing)
 * @see ApprenticeEngine — apprentice progression (existing)
 */

import * as crypto from "crypto";
import { log } from "../utils/Logger.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CourseDifficulty = "beginner" | "intermediate" | "advanced" | "expert";
export type EnrollmentStatus = "enrolled" | "in_progress" | "completed" | "dropped";
export type CheckpointType = "quiz" | "exam" | "practical";
export type MediaType = "video" | "pdf" | "image" | "interactive" | "reference";

export interface CourseModule {
  idx: number;
  title: string;
  description?: string;
  estimated_minutes: number;
  has_checkpoint: boolean;
  checkpoint_type?: CheckpointType;
  pass_threshold?: number;  // 0-100, default 70
  media_ids?: string[];
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  domain: string;
  difficulty: CourseDifficulty;
  modules: CourseModule[];
  prerequisites: string[];  // course IDs
  tags: string[];
  // Knowledge facets
  machine_type?: string;
  material_focus?: string;
  cam_system?: string;
  process_type?: string;
  estimated_hours: number;
  is_published: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: EnrollmentStatus;
  current_module_idx: number;
  progress_pct: number;
  started_at?: string;
  completed_at?: string;
  score?: number;
  checkpoints: CheckpointResult[];
  created_at: string;
  updated_at: string;
}

export interface CheckpointResult {
  id: string;
  enrollment_id: string;
  module_idx: number;
  checkpoint_type: CheckpointType;
  questions: Array<{ question: string; options?: string[]; correct_answer: string }>;
  answers: Array<{ answer: string; correct: boolean }>;
  score: number;
  passed: boolean;
  pass_threshold: number;
  attempted_at: string;
  duration_sec?: number;
}

export interface LearningMedia {
  id: string;
  course_id: string;
  module_idx?: number;
  media_type: MediaType;
  title: string;
  url?: string;
  file_id?: string;
  duration_sec?: number;
  created_at: string;
}

export interface FacetSearchResult {
  courses: Course[];
  total: number;
  facets: {
    domains: Record<string, number>;
    difficulties: Record<string, number>;
    machine_types: Record<string, number>;
    materials: Record<string, number>;
    cam_systems: Record<string, number>;
    process_types: Record<string, number>;
  };
}

export interface EnrollmentSummary {
  user_id: string;
  total_enrolled: number;
  in_progress: number;
  completed: number;
  dropped: number;
  avg_score: number;
  enrollments: Array<{
    course_id: string;
    course_title: string;
    status: EnrollmentStatus;
    progress_pct: number;
    score?: number;
  }>;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class LearningProgressionEngine {
  private courses = new Map<string, Course>();
  private enrollments = new Map<string, Enrollment>();  // enrollment_id → Enrollment
  private userEnrollments = new Map<string, Set<string>>(); // user_id → Set<enrollment_id>
  private media = new Map<string, LearningMedia>();

  // ─── Course Management ──────────────────────────────────────────────

  /**
   * Create a new course with ordered modules.
   */
  createCourse(input: {
    title: string;
    description?: string;
    domain: string;
    difficulty?: CourseDifficulty;
    modules: Array<{
      title: string;
      description?: string;
      estimated_minutes?: number;
      has_checkpoint?: boolean;
      checkpoint_type?: CheckpointType;
      pass_threshold?: number;
    }>;
    prerequisites?: string[];
    tags?: string[];
    machine_type?: string;
    material_focus?: string;
    cam_system?: string;
    process_type?: string;
    is_published?: boolean;
    created_by?: string;
  }): Course {
    if (!input.title?.trim()) throw new Error("Course title is required");
    if (!input.domain?.trim()) throw new Error("Course domain is required");
    if (!input.modules?.length) throw new Error("At least one module is required");

    const now = new Date().toISOString();
    const modules: CourseModule[] = input.modules.map((m, idx) => ({
      idx,
      title: m.title,
      description: m.description,
      estimated_minutes: m.estimated_minutes ?? 30,
      has_checkpoint: m.has_checkpoint ?? false,
      checkpoint_type: m.checkpoint_type,
      pass_threshold: m.pass_threshold ?? 70,
    }));

    const totalMinutes = modules.reduce((sum, m) => sum + m.estimated_minutes, 0);

    const course: Course = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      description: input.description,
      domain: input.domain.trim(),
      difficulty: input.difficulty ?? "beginner",
      modules,
      prerequisites: input.prerequisites ?? [],
      tags: (input.tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean),
      machine_type: input.machine_type,
      material_focus: input.material_focus,
      cam_system: input.cam_system,
      process_type: input.process_type,
      estimated_hours: +(totalMinutes / 60).toFixed(1),
      is_published: input.is_published ?? false,
      created_by: input.created_by,
      created_at: now,
      updated_at: now,
    };

    this.courses.set(course.id, course);
    log.info(`[LearningProgression] Course created: "${course.title}" (${modules.length} modules)`);
    return course;
  }

  /**
   * Get a course by ID.
   */
  getCourse(courseId: string): Course | null {
    return this.courses.get(courseId) ?? null;
  }

  // ─── Enrollment ─────────────────────────────────────────────────────

  /**
   * Enroll a user in a course. Checks prerequisites.
   */
  enroll(input: { user_id: string; course_id: string }): Enrollment {
    const course = this.courses.get(input.course_id);
    if (!course) throw new Error(`Course ${input.course_id} not found`);
    if (!course.is_published) throw new Error("Cannot enroll in unpublished course");

    // Check for existing enrollment
    const userEnrIds = this.userEnrollments.get(input.user_id) ?? new Set();
    for (const eid of userEnrIds) {
      const existing = this.enrollments.get(eid);
      if (existing && existing.course_id === input.course_id && existing.status !== "dropped") {
        throw new Error("Already enrolled in this course");
      }
    }

    // Check prerequisites
    for (const prereqId of course.prerequisites) {
      let prereqCompleted = false;
      for (const eid of userEnrIds) {
        const enr = this.enrollments.get(eid);
        if (enr && enr.course_id === prereqId && enr.status === "completed") {
          prereqCompleted = true;
          break;
        }
      }
      if (!prereqCompleted) {
        const prereqCourse = this.courses.get(prereqId);
        throw new Error(`Prerequisite not completed: ${prereqCourse?.title ?? prereqId}`);
      }
    }

    const now = new Date().toISOString();
    const enrollment: Enrollment = {
      id: crypto.randomUUID(),
      user_id: input.user_id,
      course_id: input.course_id,
      status: "enrolled",
      current_module_idx: 0,
      progress_pct: 0,
      checkpoints: [],
      created_at: now,
      updated_at: now,
    };

    this.enrollments.set(enrollment.id, enrollment);
    if (!this.userEnrollments.has(input.user_id)) {
      this.userEnrollments.set(input.user_id, new Set());
    }
    this.userEnrollments.get(input.user_id)!.add(enrollment.id);

    log.info(`[LearningProgression] User ${input.user_id} enrolled in "${course.title}"`);
    return enrollment;
  }

  /**
   * Get enrollment progress for a user in a specific course.
   */
  getProgress(userId: string, courseId: string): Enrollment | null {
    const userEnrIds = this.userEnrollments.get(userId) ?? new Set();
    for (const eid of userEnrIds) {
      const enr = this.enrollments.get(eid);
      if (enr && enr.course_id === courseId) return enr;
    }
    return null;
  }

  // ─── Checkpoints ────────────────────────────────────────────────────

  /**
   * Submit a checkpoint (quiz/exam/practical) for grading.
   * Gated: module N+1 unlocked only when module N checkpoint passed.
   */
  submitCheckpoint(input: {
    enrollment_id: string;
    module_idx: number;
    answers: Array<{ answer: string }>;
    duration_sec?: number;
  }): CheckpointResult {
    const enrollment = this.enrollments.get(input.enrollment_id);
    if (!enrollment) throw new Error(`Enrollment ${input.enrollment_id} not found`);
    if (enrollment.status === "completed") throw new Error("Course already completed");
    if (enrollment.status === "dropped") throw new Error("Enrollment was dropped");

    const course = this.courses.get(enrollment.course_id);
    if (!course) throw new Error("Course not found");

    const module = course.modules[input.module_idx];
    if (!module) throw new Error(`Module ${input.module_idx} not found`);
    if (!module.has_checkpoint) throw new Error(`Module ${input.module_idx} has no checkpoint`);

    // Verify sequential progression
    if (input.module_idx > enrollment.current_module_idx) {
      throw new Error(`Cannot submit checkpoint for module ${input.module_idx} — currently at module ${enrollment.current_module_idx}`);
    }

    // Generate simple grading (in production, this would use AssessmentEngine)
    const questions = this.generateModuleQuestions(module, course);
    const graded = input.answers.map((a, i) => {
      const q = questions[i];
      if (!q) return { answer: a.answer, correct: false };
      return { answer: a.answer, correct: a.answer === q.correct_answer };
    });

    const correctCount = graded.filter((a) => a.correct).length;
    const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    const passThreshold = module.pass_threshold ?? 70;
    const passed = score >= passThreshold;

    const now = new Date().toISOString();
    const checkpoint: CheckpointResult = {
      id: crypto.randomUUID(),
      enrollment_id: enrollment.id,
      module_idx: input.module_idx,
      checkpoint_type: module.checkpoint_type ?? "quiz",
      questions,
      answers: graded,
      score,
      passed,
      pass_threshold: passThreshold,
      attempted_at: now,
      duration_sec: input.duration_sec,
    };

    enrollment.checkpoints.push(checkpoint);
    enrollment.updated_at = now;

    if (passed) {
      // Advance to next module
      if (enrollment.status === "enrolled") {
        enrollment.status = "in_progress";
        enrollment.started_at = enrollment.started_at ?? now;
      }

      // Auto-advance past any non-checkpoint modules
      let nextIdx = input.module_idx + 1;
      while (nextIdx < course.modules.length && !course.modules[nextIdx].has_checkpoint) {
        nextIdx++;
      }

      if (nextIdx >= course.modules.length) {
        // Course complete!
        enrollment.status = "completed";
        enrollment.completed_at = now;
        enrollment.current_module_idx = course.modules.length;
        enrollment.progress_pct = 100;
        enrollment.score = this.calcAverageScore(enrollment.checkpoints);
        log.info(`[LearningProgression] User ${enrollment.user_id} completed "${course.title}" (score: ${enrollment.score})`);
      } else {
        enrollment.current_module_idx = nextIdx;
        enrollment.progress_pct = Math.round((nextIdx / course.modules.length) * 100);
      }
    }

    return checkpoint;
  }

  // ─── Enrollment Summary ─────────────────────────────────────────────

  /**
   * Get enrollment summary for a user across all courses.
   */
  getEnrollmentSummary(userId: string): EnrollmentSummary {
    const userEnrIds = this.userEnrollments.get(userId) ?? new Set();
    const enrollments: EnrollmentSummary["enrollments"] = [];
    let completed = 0, inProgress = 0, dropped = 0;
    const scores: number[] = [];

    for (const eid of userEnrIds) {
      const enr = this.enrollments.get(eid);
      if (!enr) continue;
      const course = this.courses.get(enr.course_id);

      enrollments.push({
        course_id: enr.course_id,
        course_title: course?.title ?? "Unknown",
        status: enr.status,
        progress_pct: enr.progress_pct,
        score: enr.score,
      });

      if (enr.status === "completed") { completed++; if (enr.score) scores.push(enr.score); }
      else if (enr.status === "in_progress") inProgress++;
      else if (enr.status === "dropped") dropped++;
    }

    return {
      user_id: userId,
      total_enrolled: userEnrIds.size,
      in_progress: inProgress,
      completed,
      dropped,
      avg_score: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      enrollments,
    };
  }

  // ─── Knowledge Facets Search ────────────────────────────────────────

  /**
   * Search courses by knowledge facets with faceted result counts.
   */
  searchCourses(input: {
    query?: string;
    domain?: string;
    difficulty?: CourseDifficulty;
    machine_type?: string;
    material_focus?: string;
    cam_system?: string;
    process_type?: string;
    tags?: string[];
    limit?: number;
  }): FacetSearchResult {
    let results = [...this.courses.values()].filter((c) => c.is_published);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

    // Text search
    if (input.query) {
      const q = input.query.toLowerCase();
      results = results.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q) ||
        c.tags.some((t) => t.includes(q)) ||
        (c.machine_type ?? "").toLowerCase().includes(q) ||
        (c.material_focus ?? "").toLowerCase().includes(q) ||
        (c.cam_system ?? "").toLowerCase().includes(q) ||
        (c.process_type ?? "").toLowerCase().includes(q),
      );
    }

    // Facet filters
    if (input.domain) results = results.filter((c) => c.domain === input.domain);
    if (input.difficulty) results = results.filter((c) => c.difficulty === input.difficulty);
    if (input.machine_type) results = results.filter((c) => c.machine_type === input.machine_type);
    if (input.material_focus) results = results.filter((c) => c.material_focus === input.material_focus);
    if (input.cam_system) results = results.filter((c) => c.cam_system === input.cam_system);
    if (input.process_type) results = results.filter((c) => c.process_type === input.process_type);
    if (input.tags?.length) {
      const tagSet = new Set(input.tags.map((t) => t.toLowerCase()));
      results = results.filter((c) => c.tags.some((t) => tagSet.has(t)));
    }

    // Build facet counts from results
    const facets: FacetSearchResult["facets"] = {
      domains: {}, difficulties: {}, machine_types: {},
      materials: {}, cam_systems: {}, process_types: {},
    };
    for (const c of results) {
      facets.domains[c.domain] = (facets.domains[c.domain] || 0) + 1;
      facets.difficulties[c.difficulty] = (facets.difficulties[c.difficulty] || 0) + 1;
      if (c.machine_type) facets.machine_types[c.machine_type] = (facets.machine_types[c.machine_type] || 0) + 1;
      if (c.material_focus) facets.materials[c.material_focus] = (facets.materials[c.material_focus] || 0) + 1;
      if (c.cam_system) facets.cam_systems[c.cam_system] = (facets.cam_systems[c.cam_system] || 0) + 1;
      if (c.process_type) facets.process_types[c.process_type] = (facets.process_types[c.process_type] || 0) + 1;
    }

    return {
      courses: results.slice(0, limit),
      total: results.length,
      facets,
    };
  }

  // ─── Media ──────────────────────────────────────────────────────────

  /**
   * Add learning media to a course module.
   */
  addMedia(input: {
    course_id: string;
    module_idx?: number;
    media_type: MediaType;
    title: string;
    url?: string;
    file_id?: string;
    duration_sec?: number;
  }): LearningMedia {
    if (!this.courses.has(input.course_id)) throw new Error(`Course ${input.course_id} not found`);
    if (!input.title?.trim()) throw new Error("Media title is required");

    const media: LearningMedia = {
      id: crypto.randomUUID(),
      course_id: input.course_id,
      module_idx: input.module_idx,
      media_type: input.media_type,
      title: input.title.trim(),
      url: input.url,
      file_id: input.file_id,
      duration_sec: input.duration_sec,
      created_at: new Date().toISOString(),
    };

    this.media.set(media.id, media);
    return media;
  }

  /**
   * List media for a course or module.
   */
  listMedia(courseId: string, moduleIdx?: number): LearningMedia[] {
    const result: LearningMedia[] = [];
    for (const m of this.media.values()) {
      if (m.course_id === courseId) {
        if (moduleIdx !== undefined && m.module_idx !== moduleIdx) continue;
        result.push(m);
      }
    }
    return result;
  }

  // ─── Private ──────────────────────────────────────────────────────────

  private generateModuleQuestions(
    module: CourseModule,
    course: Course,
  ): CheckpointResult["questions"] {
    // Simple question generation based on module/course context
    // In production, delegates to AssessmentEngine
    return [
      {
        question: `What is the primary topic of "${module.title}" in ${course.domain}?`,
        options: [module.title, "Unrelated Topic A", "Unrelated Topic B", "None of the above"],
        correct_answer: module.title,
      },
      {
        question: `At what difficulty level is the "${course.title}" course?`,
        options: ["beginner", "intermediate", "advanced", "expert"],
        correct_answer: course.difficulty,
      },
    ];
  }

  private calcAverageScore(checkpoints: CheckpointResult[]): number {
    if (checkpoints.length === 0) return 0;
    const total = checkpoints.reduce((sum, cp) => sum + cp.score, 0);
    return Math.round(total / checkpoints.length);
  }
}

export const learningProgressionEngine = new LearningProgressionEngine();
