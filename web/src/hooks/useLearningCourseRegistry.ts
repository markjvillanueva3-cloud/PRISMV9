import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getLearningEnrollmentSummary,
  listLearningCourses,
} from '../api/learningProgression';
import { loadShellSession } from '../features/operating-system/shellSession';
import type {
  LearningCourseEnrollmentSummary,
  LearningCourseSearchResult,
} from '../types/learning';

const GUEST_STORAGE_KEY = 'prism_learning_registry_user_v1';

function createGuestLearningUserId() {
  return `academy-guest-${Math.random().toString(36).slice(2, 10)}`;
}

function resolveLearningUserId() {
  const session = loadShellSession();
  if (session?.identityId) {
    return session.identityId;
  }

  if (session?.email) {
    return session.email;
  }

  if (typeof window === 'undefined') {
    return 'academy-guest-server';
  }

  const existing = window.localStorage.getItem(GUEST_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const generated = createGuestLearningUserId();
  window.localStorage.setItem(GUEST_STORAGE_KEY, generated);
  return generated;
}

export function useLearningCourseRegistry() {
  const [catalog, setCatalog] = useState<LearningCourseSearchResult | null>(null);
  const [summary, setSummary] = useState<LearningCourseEnrollmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCause, setErrorCause] = useState<unknown | null>(null);
  const userId = useMemo(() => resolveLearningUserId(), []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorCause(null);

    const [catalogResult, summaryResult] = await Promise.allSettled([
      listLearningCourses({ limit: 12 }),
      getLearningEnrollmentSummary(userId),
    ]);

    let nextError: string | null = null;
    let nextErrorCause: unknown | null = null;

    if (catalogResult.status === 'fulfilled') {
      setCatalog(catalogResult.value);
    } else {
      setCatalog(null);
      nextError = catalogResult.reason instanceof Error
        ? catalogResult.reason.message
        : 'Unable to load live course registry.';
      nextErrorCause = catalogResult.reason;
    }

    if (summaryResult.status === 'fulfilled') {
      setSummary(summaryResult.value);
    } else {
      setSummary(null);
      if (!nextError) {
        nextError = summaryResult.reason instanceof Error
          ? summaryResult.reason.message
          : 'Unable to load learning enrollment summary.';
        nextErrorCause = summaryResult.reason;
      }
    }

    setError(nextError);
    setErrorCause(nextErrorCause);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    userId,
    catalog,
    summary,
    loading,
    error,
    errorCause,
    refresh,
    status: error ? (catalog || summary ? 'live-fallback' : 'fallback') : 'live',
  } as const;
}
