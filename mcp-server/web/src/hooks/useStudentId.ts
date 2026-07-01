/**
 * useStudentId — derive the current academy `student_id` from AuthContext.
 *
 * AuthContext's `useAuth()` throws when no AuthProvider is mounted (a defensible
 * choice for required-auth surfaces). The Academy hooks need to work both with
 * AND without an AuthProvider (component tests, marketing demo, fresh shell),
 * so this helper reads the context directly and returns null when absent.
 *
 * Returns the auth employee id when authenticated, else null. Never throws.
 *
 * Per `PRISM-ACADEMY-MOBILE-MS0/U-PAM-AUTH`.
 */

import { useAuthOptional } from '../contexts/AuthContext';

export function useStudentId(): string | null {
  const ctx = useAuthOptional();
  if (!ctx) return null;
  // ctx.employee may be null even when authenticated (employee record fetch
  // failed). Fall back to userId in that case so the worker still gets their
  // own bucket — auth user ids are stable across the auth-user/employee join.
  return ctx.employee?.id ?? ctx.userId ?? null;
}
