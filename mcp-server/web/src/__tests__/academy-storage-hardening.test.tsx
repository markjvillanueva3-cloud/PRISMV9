// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCourses } from '../hooks/useCourses';

describe('Academy storage hardening', () => {
  it('ignores malformed academy progress shapes from older localStorage state', () => {
    localStorage.setItem('prism_academy_progress_v2', JSON.stringify({
      completedLessons: [],
      completedCourses: { legacy: true },
      startedCourses: 'not-an-array',
    }));

    expect(() => renderHook(() => useCourses())).not.toThrow();
    const { result } = renderHook(() => useCourses());

    expect(result.current.stats.lessonsCompleted).toBe(0);
    expect(result.current.stats.coursesStarted).toBe(0);
    expect(result.current.progress.startedCourses.size).toBe(0);
  });
});
