// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLearningCourseRegistry } from '../hooks/useLearningCourseRegistry';

vi.mock('../features/operating-system/shellSession', () => ({
  loadShellSession: () => ({
    kind: 'admin',
    identityId: 'planner@jmdie.test',
    email: 'planner@jmdie.test',
    updatedAt: '2026-03-30T00:00:00Z',
  }),
}));

function makeResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ ok: true, data }),
  };
}

describe('useLearningCourseRegistry', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL) => {
        const url = String(input);

        if (url.includes('/api/v1/learning/courses')) {
          return Promise.resolve(
            makeResponse({
              total: 2,
              courses: [
                {
                  id: 'course-1',
                  title: 'VF-2 Setup Ladder',
                  domain: 'MachineOperation',
                  difficulty: 'beginner',
                  modules: [
                    { idx: 0, title: 'Work holding', estimated_minutes: 20, has_checkpoint: true },
                  ],
                  prerequisites: [],
                  tags: ['vf2'],
                  machine_type: 'VMC',
                  estimated_hours: 0.5,
                  is_published: true,
                  created_at: '2026-03-29T00:00:00Z',
                  updated_at: '2026-03-29T00:00:00Z',
                },
              ],
              facets: {
                domains: { MachineOperation: 2 },
                difficulties: { beginner: 2 },
                machine_types: { VMC: 2 },
                materials: {},
                cam_systems: {},
                process_types: { milling: 2 },
              },
            }) as Response,
          );
        }

        if (url.includes('/api/v1/learning/my-progress')) {
          return Promise.resolve(
            makeResponse({
              user_id: 'planner@jmdie.test',
              total_enrolled: 1,
              in_progress: 1,
              completed: 0,
              dropped: 0,
              avg_score: 0,
              enrollments: [
                {
                  course_id: 'course-1',
                  course_title: 'VF-2 Setup Ladder',
                  status: 'in_progress',
                  progress_pct: 50,
                },
              ],
            }) as Response,
          );
        }

        throw new Error(`Unexpected fetch in useLearningCourseRegistry test: ${url}`);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hydrates live course registry and enrollment summary', async () => {
    const { result } = renderHook(() => useLearningCourseRegistry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.status).toBe('live');
      expect(result.current.catalog?.total).toBe(2);
      expect(result.current.summary?.total_enrolled).toBe(1);
      expect(result.current.catalog?.courses[0].title).toBe('VF-2 Setup Ladder');
    });
  });

  it('fails closed to fallback posture when live learning routes are unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('learning routes unavailable'))));

    const { result } = renderHook(() => useLearningCourseRegistry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.status).toBe('fallback');
      expect(result.current.catalog).toBeNull();
      expect(result.current.summary).toBeNull();
      expect(result.current.error).toMatch(/learning routes unavailable/i);
    });
  });
});
