/**
 * MS3-U01: Academy Courses Hook
 * Wraps static course data + localStorage progress tracking.
 * Later can swap to API-backed progress without changing component interfaces.
 *
 * PRISM-ACADEMY-MOBILE-MS0/U-PAM-AUTH (2026-05-23): accepts an optional
 * `studentId` so shop tablets shared across workers don't cross-pollute
 * progress. When `studentId` is null/absent (un-authenticated demo) progress
 * falls back to the original anon bucket — fully back-compatible.
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ALL_COURSES, getCourseById, getCourseForLesson,
  arePrerequisitesMet,
  TOTAL_LESSONS,
} from '../data/academy';
import {
  academyStorageKey,
  migrateAnonProgress,
} from '../lib/academyStorageKey';

export interface LessonProgress {
  lessonId: string;
  completedAt: string; // ISO date
  score?: number;      // 0-100 if quiz taken
}

export interface AcademyProgress {
  completedLessons: Record<string, LessonProgress>;
  completedCourses: Set<string>;
  startedCourses: Set<string>;
}

// ─── Serialization helpers (Set ↔ Array for JSON) ────────────────────────────

interface StoredProgress {
  completedLessons: Record<string, LessonProgress>;
  completedCourses: string[];
  startedCourses: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function coerceLessonProgressMap(value: unknown): Record<string, LessonProgress> {
  if (!isRecord(value)) return {};
  const entries = Object.entries(value).flatMap(([key, lesson]) => {
    if (!isRecord(lesson) || typeof lesson.lessonId !== 'string') {
      return [];
    }

    return [[key, lesson] as const];
  });

  return Object.fromEntries(entries.map(([key, lesson]) => [
    key,
    {
      lessonId: lesson.lessonId as string,
      completedAt: typeof lesson.completedAt === 'string' ? lesson.completedAt : new Date(0).toISOString(),
      ...(typeof lesson.score === 'number' ? { score: lesson.score } : {}),
    },
  ]));
}

function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (isRecord(value)) {
    return Object.keys(value).filter((item) => Boolean(item));
  }
  return [];
}

function loadProgress(storageKey: string): AcademyProgress {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return emptyProgress();
    const stored = JSON.parse(raw) as Partial<StoredProgress>;
    return {
      completedLessons: coerceLessonProgressMap(stored.completedLessons),
      completedCourses: new Set(coerceStringArray(stored.completedCourses)),
      startedCourses: new Set(coerceStringArray(stored.startedCourses)),
    };
  } catch {
    return emptyProgress();
  }
}

function saveProgress(storageKey: string, progress: AcademyProgress) {
  const stored: StoredProgress = {
    completedLessons: progress.completedLessons,
    completedCourses: Array.from(progress.completedCourses),
    startedCourses: Array.from(progress.startedCourses),
  };
  localStorage.setItem(storageKey, JSON.stringify(stored));
}

function emptyProgress(): AcademyProgress {
  return { completedLessons: {}, completedCourses: new Set(), startedCourses: new Set() };
}

// ─── Main Hook ───────────────────────────────────────────────────────────────

/**
 * Track Academy progress for a specific student (worker) when a `studentId` is
 * provided, else fall back to the anonymous shared bucket. The bucket is
 * recomputed whenever `studentId` changes (login/logout/worker swap on a
 * shared tablet), and a one-shot anon→worker migration runs the first time
 * an id is supplied so pre-login lesson work isn't lost.
 *
 * Back-compat: callers that don't pass an id get the original behavior — a
 * single anonymous bucket keyed at `prism_academy_progress_v2`.
 */
export function useCourses(studentId: string | null = null) {
  const storageKey = useMemo(() => academyStorageKey(studentId), [studentId]);
  // useRef so the one-shot migration fires per *id* (not per render) and is
  // idempotent — re-renders with the same id must NOT re-attempt migration.
  const migratedFor = useRef<string | null>(null);

  const [progress, setProgress] = useState<AcademyProgress>(() => loadProgress(storageKey));

  // Worker swap (login / logout / shared-tablet handoff): run anon→worker
  // migration FIRST (idempotent per id) then reload progress from the new key
  // so the first render after the swap reflects migrated data — never the
  // previous worker's progress.
  useEffect(() => {
    if (studentId && migratedFor.current !== studentId) {
      migrateAnonProgress(studentId);
      migratedFor.current = studentId;
    }
    setProgress(loadProgress(storageKey));
  }, [studentId, storageKey]);

  // Persist on every change. Note: depends on storageKey so the FIRST render
  // after a worker swap writes to the NEW key (never the previous worker's).
  useEffect(() => { saveProgress(storageKey, progress); }, [storageKey, progress]);

  /** Mark a lesson complete (auto-completes course if all lessons done) */
  const completeLesson = useCallback((lessonId: string, score?: number) => {
    setProgress(prev => {
      const next = { ...prev, completedLessons: { ...prev.completedLessons } };
      const previousScore = prev.completedLessons[lessonId]?.score;
      next.completedLessons[lessonId] = {
        lessonId,
        completedAt: new Date().toISOString(),
        score: typeof score === 'number'
          ? Math.max(score, previousScore ?? 0)
          : previousScore,
      };
      // Check if this completes the course
      const course = getCourseForLesson(lessonId);
      if (course) {
        next.startedCourses = new Set(prev.startedCourses);
        next.startedCourses.add(course.id);
        const allDone = course.lessons.every(l => next.completedLessons[l.id]);
        if (allDone) {
          next.completedCourses = new Set(prev.completedCourses);
          next.completedCourses.add(course.id);
        }
      }
      return next;
    });
  }, []);

  /** Mark a course as started */
  const startCourse = useCallback((courseId: string) => {
    setProgress(prev => {
      const next = { ...prev, startedCourses: new Set(prev.startedCourses) };
      next.startedCourses.add(courseId);
      return next;
    });
  }, []);

  /** Reset all progress for the current worker (does NOT touch other workers' buckets). */
  const resetProgress = useCallback(() => {
    setProgress(emptyProgress());
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // ─── Derived data ──────────────────────────────────────────────────────────

  const completedCourseIds = progress.completedCourses;

  const isLessonComplete = useCallback(
    (lessonId: string) => !!progress.completedLessons[lessonId],
    [progress.completedLessons]
  );

  const getLessonProgress = useCallback(
    (lessonId: string) => progress.completedLessons[lessonId],
    [progress.completedLessons]
  );

  const isCourseComplete = useCallback(
    (courseId: string) => progress.completedCourses.has(courseId),
    [progress.completedCourses]
  );

  const isCourseUnlocked = useCallback(
    (courseId: string) => arePrerequisitesMet(courseId, progress.completedCourses),
    [progress.completedCourses]
  );

  const courseProgress = useCallback((courseId: string): number => {
    const course = getCourseById(courseId);
    if (!course || course.lessons.length === 0) return 0;
    const done = course.lessons.filter(l => progress.completedLessons[l.id]).length;
    return Math.round((done / course.lessons.length) * 100);
  }, [progress.completedLessons]);

  const stats = useMemo(() => {
    const totalCompleted = Object.keys(progress.completedLessons).length;
    const coursesCompleted = progress.completedCourses.size;
    const coursesStarted = progress.startedCourses.size;
    return {
      lessonsCompleted: totalCompleted,
      lessonsTotal: TOTAL_LESSONS,
      coursesCompleted,
      coursesStarted,
      coursesTotal: ALL_COURSES.length,
      percentComplete: TOTAL_LESSONS > 0 ? Math.round((totalCompleted / TOTAL_LESSONS) * 100) : 0,
    };
  }, [progress]);

  return {
    // Data
    courses: ALL_COURSES,
    progress,
    stats,
    completedCourseIds,
    // Queries
    isLessonComplete,
    getLessonProgress,
    isCourseComplete,
    isCourseUnlocked,
    courseProgress,
    // Actions
    completeLesson,
    startCourse,
    resetProgress,
  };
}
