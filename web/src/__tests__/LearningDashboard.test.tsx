// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LearningDashboard } from '../pages/LearningDashboard';

const mockUseLearningCourseRegistry = vi.fn(() => ({
  userId: 'planner@digitalstorm.test',
  catalog: {
    total: 3,
    courses: [
      {
        id: 'course-1',
        title: 'VF-2 Setup Ladder',
        description: 'Structured machine setup progression.',
        domain: 'MachineOperation',
        difficulty: 'beginner',
        modules: [
          { idx: 0, title: 'Work holding', estimated_minutes: 20, has_checkpoint: true },
          { idx: 1, title: 'Offsets', estimated_minutes: 25, has_checkpoint: true },
        ],
        prerequisites: [],
        tags: ['vf2', 'setup'],
        machine_type: 'VMC',
        material_focus: '6061',
        cam_system: 'Fusion 360',
        process_type: 'milling',
        estimated_hours: 1.5,
        is_published: true,
        created_at: '2026-03-29T00:00:00Z',
        updated_at: '2026-03-29T00:00:00Z',
      },
    ],
    facets: {
      domains: { MachineOperation: 3 },
      difficulties: { beginner: 2, intermediate: 1 },
      machine_types: { VMC: 3 },
      materials: { '6061': 2 },
      cam_systems: { 'Fusion 360': 2 },
      process_types: { milling: 3 },
    },
  },
  summary: {
    user_id: 'planner@digitalstorm.test',
    total_enrolled: 2,
    in_progress: 1,
    completed: 1,
    dropped: 0,
    avg_score: 92,
    enrollments: [
      {
        course_id: 'course-1',
        course_title: 'VF-2 Setup Ladder',
        status: 'in_progress',
        progress_pct: 50,
      },
    ],
  },
  loading: false,
  error: null,
  refresh: vi.fn(),
  status: 'live',
}));

function makeResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ ok: true, data }),
  };
}

vi.mock('../hooks/useLearning', () => ({
  useProgress: () => ({
    progress: {
      modules_completed: 12,
      modules_total: 40,
      total_hours: 28.5,
      current_streak_days: 7,
      domain_progress: {
        CAD: 42,
        CAM: 55,
        ShopPractice: 63,
        MachineOperation: 38,
      },
      badges: [{ id: 'badge-1', name: 'First Shift', description: '', earned_at: '2026-03-01', icon: 'badge' }],
    },
    loading: false,
    error: null,
    fetchProgress: vi.fn(),
  }),
  useRecommend: () => ({
    recommendations: [
      {
        id: 'mod-1',
        title: 'Adaptive setup strategy',
        domain: 'CAM',
        duration_min: 35,
        difficulty: 'advanced',
      },
    ],
    loading: false,
    error: null,
    fetchRecommendations: vi.fn(),
  }),
}));

vi.mock('../hooks/useCourses', () => ({
  useCourses: () => ({
    stats: {
      coursesTotal: 18,
    },
  }),
}));

vi.mock('../hooks/useLearningCourseRegistry', () => ({
  useLearningCourseRegistry: () => mockUseLearningCourseRegistry(),
}));

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL) => {
      const url = String(input);
      if (url.includes('/api/v1/learning/progress')) {
        return Promise.resolve(
          makeResponse({
            total_hours: 28.5,
            modules_completed: 12,
            modules_total: 40,
            current_streak_days: 7,
            domain_progress: {
              CAD: 42,
              CAM: 55,
              ShopPractice: 63,
              MachineOperation: 38,
            },
            daily_history: [],
            badges: [{ id: 'badge-1', name: 'First Shift', description: '', earned_at: '2026-03-01', icon: 'badge' }],
          }) as Response,
        );
      }

      if (url.includes('/api/v1/learning/recommend')) {
        return Promise.resolve(
          makeResponse([
            {
              id: 'mod-1',
              title: 'Adaptive setup strategy',
              domain: 'CAM',
              duration_min: 35,
              difficulty: 'advanced',
              prerequisites: [],
              description: 'Tune setups faster.',
              status: 'available',
              completion_pct: 0,
            },
          ]) as Response,
        );
      }

      throw new Error(`Unexpected fetch call in LearningDashboard test: ${url}`);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LearningDashboard', () => {
  beforeEach(() => {
    mockUseLearningCourseRegistry.mockReturnValue({
      userId: 'planner@digitalstorm.test',
      catalog: {
        total: 3,
        courses: [
          {
            id: 'course-1',
            title: 'VF-2 Setup Ladder',
            description: 'Structured machine setup progression.',
            domain: 'MachineOperation',
            difficulty: 'beginner',
            modules: [
              { idx: 0, title: 'Work holding', estimated_minutes: 20, has_checkpoint: true },
              { idx: 1, title: 'Offsets', estimated_minutes: 25, has_checkpoint: true },
            ],
            prerequisites: [],
            tags: ['vf2', 'setup'],
            machine_type: 'VMC',
            material_focus: '6061',
            cam_system: 'Fusion 360',
            process_type: 'milling',
            estimated_hours: 1.5,
            is_published: true,
            created_at: '2026-03-29T00:00:00Z',
            updated_at: '2026-03-29T00:00:00Z',
          },
        ],
        facets: {
          domains: { MachineOperation: 3 },
          difficulties: { beginner: 2, intermediate: 1 },
          machine_types: { VMC: 3 },
          materials: { '6061': 2 },
          cam_systems: { 'Fusion 360': 2 },
          process_types: { milling: 3 },
        },
      },
      summary: {
        user_id: 'planner@digitalstorm.test',
        total_enrolled: 2,
        in_progress: 1,
        completed: 1,
        dropped: 0,
        avg_score: 92,
        enrollments: [
          {
            course_id: 'course-1',
            course_title: 'VF-2 Setup Ladder',
            status: 'in_progress',
            progress_pct: 50,
          },
        ],
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
      status: 'live',
    });
  });

  it('shows shop-specific and network learning posture', async () => {
    render(
      <MemoryRouter>
        <LearningDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Shop-specific learning with network lift')).toBeDefined();
      expect(screen.getByText('Learning convergence')).toBeDefined();
      expect(screen.getByText(/Learning fabric: Live \+ fallback/)).toBeDefined();
      expect(screen.getByText('Digital Storm Precision')).toBeDefined();
      expect(screen.getByText('24 opt-in shops')).toBeDefined();
      expect(screen.getByText('What this shop should get better at automatically')).toBeDefined();
      expect(screen.getByText('Mounted course progression')).toBeDefined();
      expect(screen.getByText('Live course registry and enrollments')).toBeDefined();
      expect(screen.getAllByText('VF-2 Setup Ladder').length).toBeGreaterThan(0);
      expect(screen.getByText('Published courses')).toBeDefined();
    });
  });

  it('keeps the dashboard usable when the live learning snapshot falls back', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('learning routes unavailable'))));
    mockUseLearningCourseRegistry.mockReturnValue({
      userId: 'academy-guest-fallback',
      catalog: null,
      summary: null,
      loading: false,
      error: 'Learning progression routes unavailable',
      refresh: vi.fn(),
      status: 'fallback',
    });

    render(
      <MemoryRouter>
        <LearningDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Learning Dashboard')).toBeDefined();
      expect(screen.getByText('Learning convergence')).toBeDefined();
      expect(screen.getByText('Digital Storm Precision')).toBeDefined();
      expect(screen.getByText('24 opt-in shops')).toBeDefined();
      expect(screen.getByText(/Mounted course routes did not return data/)).toBeDefined();
    });
  });
});
