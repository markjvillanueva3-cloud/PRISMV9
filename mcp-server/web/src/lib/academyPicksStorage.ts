/**
 * academyPicksStorage — pure per-worker persistence for AcademyHub picks
 * and the user's active generated learning path.
 *
 * Per PRISM-ACADEMY-FEATURES-MS0 — operator directive 2026-05-27 (lima):
 * "do everything to make improvements to make it more user friendly".
 *
 * Closes two of the open Hub R12 deferrals (see
 * reference_academy_hub_drilldown_2026_05_27):
 *   - U-ACADEMY-PICKS-PERSIST     : save selectedSubIds across refresh
 *   - (companion) Active path     : after "Generate Optimized Coursework",
 *                                   user commits a sorted course list as the
 *                                   active learning path. CourseDetail and
 *                                   dashboard widgets read this.
 *
 * Karpathy R8 — pattern adopted directly from sibling academyStorageKey.ts:
 *   - per-worker bucket via sanitizeStudentId
 *   - anon back-compat bucket
 *   - injected storage for tests; defaults to window.localStorage with a
 *     no-op fallback for SSR / locked-down browsers
 *   - try/catch around every JSON op — fail-soft, never throw
 *
 * The storage shape is versioned (v1 suffix in the key prefix). Future schema
 * changes fork by bumping the suffix.
 */

import { sanitizeStudentId } from './academyStorageKey';

export const PICKS_KEY_PREFIX = 'prism_academy_picks_v1';
export const PATH_KEY_PREFIX = 'prism_academy_active_path_v1';
export const PICKS_ANON_KEY = `${PICKS_KEY_PREFIX}:anon`;
export const PATH_ANON_KEY = `${PATH_KEY_PREFIX}:anon`;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AcademyPicks {
  selectedSubIds: string[];
  openDomain: string | null;
  loadedTrackId: string | null;
  /**
   * Stable hash of the loaded employee track's course_ids at the time of
   * persistence. The Hub re-fires the auto-select banner when this hash
   * disagrees with the current track hash so curriculum edits propagate to
   * returning workers (reviewer P0-5). Optional for back-compat with v1
   * payloads written before this field existed.
   */
  loadedTrackHash?: string | null;
  trackBannerDismissed: boolean;
  updatedAt: string;
}

export interface ActiveLearningPath {
  courseIds: string[];
  loadedTrackId: string | null;
  startedAt: string;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

// ─── Storage resolution ─────────────────────────────────────────────────────

const NO_OP_STORAGE: StorageLike = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function resolveStorage(storage?: StorageLike): StorageLike {
  if (storage) return storage;
  if (typeof localStorage === 'undefined') return NO_OP_STORAGE;
  // Test once that localStorage actually accepts a write — Safari private mode
  // throws on setItem; we degrade to NO_OP rather than crash the surface.
  try {
    const probe = `${PICKS_KEY_PREFIX}.__probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return NO_OP_STORAGE;
  }
}

// ─── Key derivation ─────────────────────────────────────────────────────────

export function picksKey(studentId: string | null | undefined): string {
  const safe = sanitizeStudentId(studentId);
  return safe === null ? PICKS_ANON_KEY : `${PICKS_KEY_PREFIX}:${safe}`;
}

export function pathKey(studentId: string | null | undefined): string {
  const safe = sanitizeStudentId(studentId);
  return safe === null ? PATH_ANON_KEY : `${PATH_KEY_PREFIX}:${safe}`;
}

// ─── Picks: load / save / clear ─────────────────────────────────────────────

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

export function loadPicks(
  studentId: string | null | undefined,
  storage?: StorageLike,
): AcademyPicks | null {
  const store = resolveStorage(storage);
  try {
    const raw = store.getItem(picksKey(studentId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    const data = parsed as Record<string, unknown>;
    const selectedSubIds = coerceStringArray(data.selectedSubIds);
    return {
      selectedSubIds,
      openDomain: typeof data.openDomain === 'string' ? data.openDomain : null,
      loadedTrackId: typeof data.loadedTrackId === 'string' ? data.loadedTrackId : null,
      loadedTrackHash: typeof data.loadedTrackHash === 'string' ? data.loadedTrackHash : null,
      trackBannerDismissed: Boolean(data.trackBannerDismissed),
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Save picks for a worker. Returns true on success, false when storage is
 * unavailable or the write fails (quota exceeded, Safari private mode).
 * Reviewer P2 R12: caller can surface a UI toast on false.
 *
 * NOTE: `updatedAt` on input is IGNORED — the persisted value is always
 * `new Date().toISOString()` at save time. Read via loadPicks to get the
 * actual timestamp.
 */
export function savePicks(
  studentId: string | null | undefined,
  picks: AcademyPicks,
  storage?: StorageLike,
): boolean {
  const store = resolveStorage(storage);
  try {
    store.setItem(picksKey(studentId), JSON.stringify({
      ...picks,
      updatedAt: new Date().toISOString(),
    }));
    return true;
  } catch {
    return false;
  }
}

export function clearPicks(
  studentId: string | null | undefined,
  storage?: StorageLike,
): void {
  const store = resolveStorage(storage);
  try {
    store.removeItem(picksKey(studentId));
  } catch {
    // fail-soft
  }
}

// ─── Active path: load / save / clear ───────────────────────────────────────

export function loadActivePath(
  studentId: string | null | undefined,
  storage?: StorageLike,
): ActiveLearningPath | null {
  const store = resolveStorage(storage);
  try {
    const raw = store.getItem(pathKey(studentId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    const data = parsed as Record<string, unknown>;
    // Dedup courseIds: a buggy "Generate Optimized Coursework" emitting duplicates
    // would otherwise inflate pathProgress.total and break "Course X of N" labels.
    const courseIds = Array.from(new Set(coerceStringArray(data.courseIds)));
    if (courseIds.length === 0) return null;
    return {
      courseIds,
      loadedTrackId: typeof data.loadedTrackId === 'string' ? data.loadedTrackId : null,
      startedAt: typeof data.startedAt === 'string' ? data.startedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Save the active learning path. Returns true on success, false on storage
 * failure. Reviewer P0-3 R12: callers MUST check this and surface a UI
 * failure if false (a silent "Path active" pill would lie to the user).
 */
export function saveActivePath(
  studentId: string | null | undefined,
  path: ActiveLearningPath,
  storage?: StorageLike,
): boolean {
  const store = resolveStorage(storage);
  try {
    store.setItem(pathKey(studentId), JSON.stringify(path));
    return true;
  } catch {
    return false;
  }
}

export function clearActivePath(
  studentId: string | null | undefined,
  storage?: StorageLike,
): void {
  const store = resolveStorage(storage);
  try {
    store.removeItem(pathKey(studentId));
  } catch {
    // fail-soft
  }
}

// ─── Derived queries for components ─────────────────────────────────────────

/**
 * Position of a courseId in the active path (1-based). Returns null if not
 * present. Used by CourseDetail to show "Course X of N in your path".
 */
export function pathPosition(
  path: ActiveLearningPath | null,
  courseId: string,
): { index: number; total: number; nextCourseId: string | null } | null {
  if (!path) return null;
  const i = path.courseIds.indexOf(courseId);
  if (i === -1) return null;
  return {
    index: i + 1,
    total: path.courseIds.length,
    nextCourseId: path.courseIds[i + 1] ?? null,
  };
}

/**
 * Active-path progress summary for sidebar/dashboard widgets.
 * Returns { completed, total, percent } given the path and a completed-set.
 */
export function pathProgress(
  path: ActiveLearningPath | null,
  completedCourseIds: Set<string>,
): { completed: number; total: number; percent: number } | null {
  if (!path || path.courseIds.length === 0) return null;
  const total = path.courseIds.length;
  let completed = 0;
  for (const id of path.courseIds) if (completedCourseIds.has(id)) completed += 1;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}
