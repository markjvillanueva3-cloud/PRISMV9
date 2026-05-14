// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CADRegressionDashboardPage } from '../pages/CADRegressionDashboardPage';
import * as api from '../api/cadRegressionDashboard';

vi.mock('../api/cadRegressionDashboard', async () => {
  const actual = await vi.importActual<typeof import('../api/cadRegressionDashboard')>(
    '../api/cadRegressionDashboard',
  );
  return {
    ...actual,
    fetchBatchList: vi.fn(),
    fetchSnapshot: vi.fn(),
  };
});

const mockList = vi.mocked(api.fetchBatchList);
const mockSnap = vi.mocked(api.fetchSnapshot);

const BATCH_ID = '11111111-1111-4111-8111-111111111111';

function renderPage() {
  return render(
    <MemoryRouter>
      <CADRegressionDashboardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  mockList.mockReset();
  mockSnap.mockReset();
});

describe('CADRegressionDashboardPage', () => {
  it('renders header and empty state when no batches are returned', async () => {
    mockList.mockResolvedValue([]);
    mockSnap.mockResolvedValue(null);
    renderPage();
    expect(screen.getByRole('heading', { name: /CAD Regression Dashboard/i })).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText(/No batches available/i)).toBeDefined();
    });
  });

  it('shows batch option and counts when snapshot is returned', async () => {
    mockList.mockResolvedValue([
      {
        batchId: BATCH_ID,
        lifecycle: 'running',
        total: 5,
        completed: 2,
        pctComplete: 40,
        lastCheckpoint: '2026-04-19T18:00:00.000Z',
      },
    ]);
    mockSnap.mockResolvedValue({
      batchId: BATCH_ID,
      schemaVersion: 1,
      lifecycle: 'running',
      pctComplete: 40,
      counts: {
        total: 5,
        pending: 1,
        running: 2,
        pass: 2,
        fail: 0,
        skip: 0,
        error: 0,
      },
      errorBreakdown: {
        format: 0,
        parse: 0,
        generation: 0,
        comparison: 0,
        timeout: 0,
        crash: 0,
        unclassified: 0,
      },
      throughput: {
        avgTerminalDurationMs: 1200,
        windowedCompletedCount: 2,
        windowMinutes: 5,
        filesPerMinute: 0.4,
        etaMs: 4500,
      },
      recentFailures: [],
      createdAt: '2026-04-19T17:00:00.000Z',
      lastCheckpoint: '2026-04-19T18:00:00.000Z',
      updatedAt: '2026-04-19T18:00:00.000Z',
      snapshotAt: '2026-04-19T18:00:05.000Z',
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Running/i)).toBeDefined();
    });
    expect(screen.getByText('Pass')).toBeDefined();
    expect(screen.getByText('Fail')).toBeDefined();
    expect(screen.getAllByText(/Recent failures/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders failure rows from snapshot', async () => {
    mockList.mockResolvedValue([
      {
        batchId: BATCH_ID,
        lifecycle: 'completed',
        total: 2,
        completed: 2,
        pctComplete: 100,
        lastCheckpoint: '2026-04-19T18:00:00.000Z',
      },
    ]);
    mockSnap.mockResolvedValue({
      batchId: BATCH_ID,
      schemaVersion: 1,
      lifecycle: 'completed',
      pctComplete: 100,
      counts: {
        total: 2,
        pending: 0,
        running: 0,
        pass: 1,
        fail: 1,
        skip: 0,
        error: 0,
      },
      errorBreakdown: {
        format: 0,
        parse: 1,
        generation: 0,
        comparison: 0,
        timeout: 0,
        crash: 0,
        unclassified: 0,
      },
      throughput: {
        avgTerminalDurationMs: 500,
        windowedCompletedCount: 2,
        windowMinutes: 5,
        filesPerMinute: 1,
        etaMs: null,
      },
      recentFailures: [
        {
          fileId: 'jm-die-frame.step',
          status: 'fail',
          errorType: 'parse',
          durationMs: 450,
          retries: 0,
          completedAt: '2026-04-19T18:00:00.000Z',
        },
      ],
      createdAt: '2026-04-19T17:00:00.000Z',
      lastCheckpoint: '2026-04-19T18:00:00.000Z',
      updatedAt: '2026-04-19T18:00:00.000Z',
      snapshotAt: '2026-04-19T18:00:05.000Z',
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('jm-die-frame.step')).toBeDefined();
    });
    expect(screen.getByText('parse')).toBeDefined();
  });
});
