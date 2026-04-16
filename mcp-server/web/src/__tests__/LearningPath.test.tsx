/**
 * LearningPath component — Unit tests
 *
 * Tests learning plan rendering, module timeline, status indicators,
 * progress bars, difficulty badges, and recommendation tags.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock LoadingState and ErrorState
// Mock LoadingState and ErrorState — paths relative to test file,
// vitest resolves to the same module the component imports
vi.mock('../components/LoadingState', () => ({
  LoadingState: ({ label }: { label: string }) => <div data-testid="loading">{label}</div>,
}));
vi.mock('../components/ErrorState', () => ({
  ErrorState: ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
    <div data-testid="error">
      {message}
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

const MOCK_PLAN = {
  path_id: 'LP-001',
  title: 'CNC Fundamentals',
  estimated_hours: 24,
  current_module_id: 'mod-2',
  modules: [
    {
      id: 'mod-1',
      title: 'Machine Safety Basics',
      domain: 'ShopPractice',
      difficulty: 'beginner',
      duration_min: 45,
      prerequisites: [],
      description: 'Essential shop safety procedures and PPE requirements.',
      status: 'completed',
      completion_pct: 100,
    },
    {
      id: 'mod-2',
      title: 'G-Code Fundamentals',
      domain: 'CAM',
      difficulty: 'intermediate',
      duration_min: 90,
      prerequisites: ['mod-1'],
      description: 'Learn basic G-code commands for CNC programming.',
      status: 'in_progress',
      completion_pct: 60,
    },
    {
      id: 'mod-3',
      title: 'Advanced Toolpath Strategies',
      domain: 'CAM',
      difficulty: 'advanced',
      duration_min: 120,
      prerequisites: ['mod-2'],
      description: 'High-speed machining, trochoidal milling, and adaptive clearing.',
      status: 'available',
      completion_pct: 0,
    },
    {
      id: 'mod-4',
      title: '5-Axis Simultaneous Machining',
      domain: 'MachineOperation',
      difficulty: 'advanced',
      duration_min: 180,
      prerequisites: ['mod-3'],
      description: 'Multi-axis strategies and collision avoidance.',
      status: 'locked',
      completion_pct: 0,
    },
  ],
};

// Mock all learning hooks (avoid importing real API modules which can OOM in jsdom)
vi.mock('../hooks/useLearning', () => ({
  useLearningPlan: vi.fn(() => ({
    plan: MOCK_PLAN,
    loading: false,
    error: null,
    generatePlan: vi.fn(),
  })),
  useRecommend: vi.fn(() => ({
    recommendations: [
      { id: 'mod-3', title: 'Advanced Toolpath Strategies', domain: 'CAM', priority: 'high' },
    ],
    loading: false,
    error: null,
    fetchRecommendations: vi.fn(),
  })),
}));

function renderLearningPath() {
  return render(
    <MemoryRouter>
      <LearningPathInner />
    </MemoryRouter>,
  );
}

let LearningPathInner: React.FC;

beforeAll(async () => {
  const mod = await import('../components/learning/LearningPath');
  LearningPathInner = mod.LearningPath;
});

describe('LearningPath', () => {
  it('renders the Learning Path title', async () => {
    renderLearningPath();
    await waitFor(() => {
      expect(screen.getByText('Learning Path')).toBeDefined();
    });
  });

  it('displays plan title and estimated hours', async () => {
    renderLearningPath();
    await waitFor(() => {
      expect(screen.getByText(/CNC Fundamentals/)).toBeDefined();
      expect(screen.getByText(/24h estimated/)).toBeDefined();
    });
  });

  it('renders all 4 modules in order', async () => {
    renderLearningPath();
    await waitFor(() => {
      expect(screen.getByText('Machine Safety Basics')).toBeDefined();
    });
    expect(screen.getByText('G-Code Fundamentals')).toBeDefined();
    expect(screen.getByText('Advanced Toolpath Strategies')).toBeDefined();
    expect(screen.getByText('5-Axis Simultaneous Machining')).toBeDefined();
  });

  it('shows module descriptions', async () => {
    renderLearningPath();
    await waitFor(() => {
      expect(screen.getByText(/Essential shop safety/)).toBeDefined();
    });
    expect(screen.getByText(/Learn basic G-code/)).toBeDefined();
    expect(screen.getByText(/High-speed machining/)).toBeDefined();
  });

  it('marks the current module with "Current" badge', async () => {
    renderLearningPath();
    await waitFor(() => {
      expect(screen.getByText('Current')).toBeDefined();
    });
  });

  it('marks recommended modules with "Recommended" badge', async () => {
    renderLearningPath();
    await waitFor(() => {
      expect(screen.getByText('Recommended')).toBeDefined();
    });
  });

  it('shows difficulty badges (beginner, intermediate, advanced)', async () => {
    renderLearningPath();
    await waitFor(() => {
      expect(screen.getByText('beginner')).toBeDefined();
    });
    expect(screen.getByText('intermediate')).toBeDefined();
    const advancedBadges = screen.getAllByText('advanced');
    expect(advancedBadges.length).toBe(2); // mod-3 and mod-4
  });

  it('shows progress bar for in_progress modules', async () => {
    renderLearningPath();
    await waitFor(() => {
      // mod-2 is in_progress at 60%
      expect(screen.getByText('Progress')).toBeDefined();
      expect(screen.getByText('60%')).toBeDefined();
    });
  });

  it('shows duration for each module', async () => {
    renderLearningPath();
    await waitFor(() => {
      expect(screen.getByText('45 min')).toBeDefined();
    });
    expect(screen.getByText('90 min')).toBeDefined();
    expect(screen.getByText('120 min')).toBeDefined();
    expect(screen.getByText('180 min')).toBeDefined();
  });

  it('shows prerequisite info for locked modules', async () => {
    renderLearningPath();
    await waitFor(() => {
      // mod-4 is locked and requires mod-3
      expect(screen.getByText(/Requires: mod-3/)).toBeDefined();
    });
  });

  it('shows numbered step indicators', async () => {
    renderLearningPath();
    await waitFor(() => {
      expect(screen.getByText('#1')).toBeDefined();
    });
    expect(screen.getByText('#2')).toBeDefined();
    expect(screen.getByText('#3')).toBeDefined();
    expect(screen.getByText('#4')).toBeDefined();
  });
});
