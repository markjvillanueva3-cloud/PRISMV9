/**
 * academyStorageKey — pure key-derivation for per-worker Academy progress.
 *
 * Shop tablets are shared (`PRISM-ACADEMY-MOBILE-MS0/U-PAM-AUTH`): Worker A's
 * lesson progress must not overwrite Worker B's. We namespace the localStorage
 * key by `employee.id` from AuthContext. When unauthenticated (demo / fresh
 * boot before login), we fall back to a single anonymous bucket so the surface
 * still works — login graduates that anon state into the worker's own bucket
 * via `migrateAnonProgress()` on next sign-in.
 *
 * Design notes (per Karpathy R8 — read before writing):
 *  - The legacy single key was 'prism_academy_progress_v2'. Keeping that exact
 *    string as the ANON bucket preserves all existing un-authenticated progress
 *    on first deploy (no data loss).
 *  - We sanitize employee IDs to a safe charset to avoid collisions like
 *    "alice/bob" colliding with "alice" + "/bob" or path-traversal lookups.
 *  - The version suffix `_v2` is intentionally kept inside ANON_KEY (it predates
 *    this change). Per-worker keys carry their own `_v3` suffix so a future
 *    schema migration can fork cleanly.
 */

export const ANON_STORAGE_KEY = 'prism_academy_progress_v2';
const PER_WORKER_PREFIX = 'prism_academy_progress_v3:';

/**
 * Sanitize an employee ID for use as a localStorage suffix.
 *  - lower-cased
 *  - allowed chars: [a-z0-9._-]
 *  - everything else collapses to '_'
 *  - leading/trailing underscores stripped (avoids '__' walks)
 *  - capped at 64 chars (long IDs would bloat the key)
 *
 * Returns null when the input would sanitize to an empty string (e.g. all
 * spaces or symbols) — caller falls back to ANON.
 */
export function sanitizeStudentId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const safe = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return safe.length === 0 ? null : safe;
}

/**
 * Derive the storage key for a given student id.
 *  - null / undefined / un-sanitizable → ANON_STORAGE_KEY (back-compat bucket).
 *  - otherwise → 'prism_academy_progress_v3:<sanitized-id>'.
 */
export function academyStorageKey(studentId: string | null | undefined): string {
  const safe = sanitizeStudentId(studentId);
  return safe === null ? ANON_STORAGE_KEY : `${PER_WORKER_PREFIX}${safe}`;
}

/**
 * Best-effort migration: when a worker logs in, copy the anon bucket's progress
 * into their per-worker bucket IF the per-worker bucket is empty. This catches
 * the common "machinist did a few lessons before logging in" case without
 * destroying real progress they may already have on this tablet.
 *
 * Returns:
 *   - 'migrated' — anon data was copied into the worker bucket
 *   - 'kept'     — worker already had data, anon NOT copied
 *   - 'no-anon'  — nothing to migrate
 *   - 'no-op'    — student id failed to sanitize (we never touch anon for this)
 *
 * Idempotent: anon bucket is NOT cleared after migration. We leave it so a
 * second worker who logs in on the same tablet still sees their pre-login work.
 * (A tablet-reset operator action can clear anon separately.)
 *
 * Storage is injected for testability — defaults to window.localStorage.
 */
export function migrateAnonProgress(
  studentId: string | null | undefined,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): 'migrated' | 'kept' | 'no-anon' | 'no-op' {
  const safe = sanitizeStudentId(studentId);
  if (safe === null) return 'no-op';
  const store: Pick<Storage, 'getItem' | 'setItem'> =
    storage ?? (typeof localStorage !== 'undefined' ? localStorage : ({
      getItem: () => null,
      setItem: () => {},
    } as Pick<Storage, 'getItem' | 'setItem'>));

  const workerKey = `${PER_WORKER_PREFIX}${safe}`;
  const existing = store.getItem(workerKey);
  if (existing && existing.length > 0) return 'kept';

  const anon = store.getItem(ANON_STORAGE_KEY);
  if (!anon || anon.length === 0) return 'no-anon';

  store.setItem(workerKey, anon);
  return 'migrated';
}
