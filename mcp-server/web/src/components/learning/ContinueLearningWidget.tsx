/**
 * ContinueLearningWidget — surfaces the user's active learning path with
 * "next course up" + progress %. Designed to be droppable anywhere:
 *   - Sidebar of /learning/* routes (LearningLayout)
 *   - Dashboard hero section (hotel wiring)
 *   - Operator shell card list
 *
 * Reads from new academyPicksStorage active-path bucket; uses useCourses
 * for live completion state. Returns null when there's no active path —
 * never renders empty chrome.
 *
 * Per PRISM-ACADEMY-FEATURES-MS0/U-HUB-UX-OVERHAUL (lima, 2026-05-27).
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCourseById } from '../../data/academy';
import { useCourses } from '../../hooks/useCourses';
import { useStudentId } from '../../hooks/useStudentId';
import {
  loadActivePath,
  pathPosition,
  pathProgress,
  type ActiveLearningPath,
} from '../../lib/academyPicksStorage';

export interface ContinueLearningWidgetProps {
  /**
   * Visual variant:
   *   - 'sidebar' — compact, full-width column card (default for LearningLayout)
   *   - 'card'    — slightly larger, fits Dashboard section
   */
  variant?: 'sidebar' | 'card';
  /** Optional className tail */
  className?: string;
}

export function ContinueLearningWidget({
  variant = 'sidebar',
  className,
}: ContinueLearningWidgetProps) {
  const studentId = useStudentId();
  const { completedCourseIds, isCourseComplete } = useCourses(studentId);
  const [path, setPath] = useState<ActiveLearningPath | null>(null);

  useEffect(() => {
    setPath(loadActivePath(studentId));
  }, [studentId]);

  const progress = useMemo(
    () => pathProgress(path, completedCourseIds),
    [path, completedCourseIds],
  );

  // Find the next course the user hasn't completed; that's their "what's next"
  const nextCourseId = useMemo(() => {
    if (!path) return null;
    for (const id of path.courseIds) {
      if (!isCourseComplete(id)) return id;
    }
    return null;
  }, [path, isCourseComplete]);

  const nextCourse = nextCourseId ? getCourseById(nextCourseId) : null;
  const nextPosition = nextCourseId && path ? pathPosition(path, nextCourseId) : null;

  if (!path || !progress) return null;

  const allDone = progress.completed === progress.total;
  const cardPad = variant === 'card' ? 'p-5' : 'p-4';
  const titleSize = variant === 'card' ? 'text-base' : 'text-sm';

  return (
    <section
      className={`rounded-2xl border border-cyan-200 bg-white shadow-sm ${cardPad} ${className ?? ''}`}
      aria-label="Continue learning"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Your training path
        </span>
        <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-800">
          {progress.completed}/{progress.total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div
          className="h-full rounded-full bg-cyan-500 transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] text-slate-500">{progress.percent}% complete</div>

      {allDone ? (
        <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-center">
          <div className="text-2xl">🎓</div>
          <div className={`mt-1 ${titleSize} font-semibold text-emerald-900`}>
            Path complete!
          </div>
          <Link
            to="/learning/academy"
            className="mt-2 inline-block text-xs font-semibold text-cyan-700 underline-offset-4 hover:underline"
            style={{ minHeight: 32 }}
          >
            Pick a new path →
          </Link>
        </div>
      ) : nextCourse && nextPosition ? (
        <div className="mt-3 space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Next up</div>
          <Link
            to={`/learning/academy/${nextCourse.id}`}
            className={`block rounded-xl bg-slate-50 p-3 transition active:bg-slate-100 hover:bg-slate-100`}
            style={{ minHeight: 56 }}
          >
            <div className="flex items-start gap-2">
              <span className="text-xl shrink-0">{nextCourse.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`${titleSize} font-semibold text-slate-900 truncate`}>
                  {nextCourse.title}
                </div>
                <div className="text-[11px] text-slate-500">
                  Course {nextPosition.index} of {nextPosition.total}
                  {' · '}
                  {nextCourse.level}
                  {' · '}
                  {Math.round((nextCourse.duration_min ?? 0) / 60)}h
                </div>
              </div>
              <span className="shrink-0 text-cyan-700">→</span>
            </div>
          </Link>
        </div>
      ) : null}

      <Link
        to="/learning/academy"
        className="mt-3 block text-center text-[11px] font-medium text-slate-500 hover:text-slate-700"
        style={{ minHeight: 24 }}
      >
        Edit your path
      </Link>
    </section>
  );
}

export default ContinueLearningWidget;
