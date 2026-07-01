/**
 * useStudentId.test.tsx — covers the AuthContext-safe student-id reader used by
 * the Academy progress hooks on shared shop tablets.
 *
 * Per PRISM-ACADEMY-MOBILE-MS0/U-PAM-AUTH. The hook MUST work both with and
 * without an AuthProvider mounted (component tests, marketing demo, fresh
 * boot before login).
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useStudentId } from '../hooks/useStudentId';
import { TestAuthProvider } from '../contexts/AuthContext';

function withAuth(value: Parameters<typeof TestAuthProvider>[0]['value']) {
  return ({ children }: { children: ReactNode }) => (
    <TestAuthProvider value={value}>{children}</TestAuthProvider>
  );
}

describe('useStudentId', () => {
  it('returns null when no AuthProvider is mounted (does NOT throw)', () => {
    const { result } = renderHook(() => useStudentId());
    expect(result.current).toBeNull();
  });

  it('returns null when context value is null (logged-out, provider absent)', () => {
    const wrapper = withAuth(null);
    const { result } = renderHook(() => useStudentId(), { wrapper });
    expect(result.current).toBeNull();
  });

  it('returns employee.id when authenticated with a full employee record', () => {
    const wrapper = withAuth({
      isAuthenticated: true,
      userId: 'auth-user-99',
      employee: {
        id: 'emp-42',
        first_name: 'A',
        last_name: 'B',
        department: 'CNC',
        role: 'machinist',
        clearance_level: 'shop_floor',
      },
    });
    const { result } = renderHook(() => useStudentId(), { wrapper });
    expect(result.current).toBe('emp-42');
  });

  it('falls back to userId when employee record is missing', () => {
    const wrapper = withAuth({
      isAuthenticated: true,
      userId: 'auth-user-99',
      employee: null,
    });
    const { result } = renderHook(() => useStudentId(), { wrapper });
    expect(result.current).toBe('auth-user-99');
  });

  it('returns null when neither employee.id nor userId is available', () => {
    const wrapper = withAuth({
      isAuthenticated: false,
      userId: null,
      employee: null,
    });
    const { result } = renderHook(() => useStudentId(), { wrapper });
    expect(result.current).toBeNull();
  });
});
