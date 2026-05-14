import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const routeMocks = vi.hoisted(() => {
  return {
    callThreadRoute: vi.fn(async () => ({
      source: 'live' as const,
      result: { tap_drill: 0.4219, unit: 'in' },
    })),
    callPipelineRoute: vi.fn(async () => ({
      source: 'live' as const,
      result: { stage: 'full', quote_total: 1820, program_id: 'PGM-77' },
    })),
    callIntegrationRoute: vi.fn(async () => ({
      source: 'live' as const,
      result: { recommendation: 'Fusion 360 Manufacturing Extension', score: 0.91 },
    })),
  };
});

vi.mock('../api/orphanRoutes', () => ({
  callThreadRoute: routeMocks.callThreadRoute,
  callPipelineRoute: routeMocks.callPipelineRoute,
  callIntegrationRoute: routeMocks.callIntegrationRoute,
  OrphanRouteError: class OrphanRouteError extends Error {},
}));

import { ThreadCalcPage } from '../pages/ThreadCalcPage';
import { PipelinePage } from '../pages/PipelinePage';
import { IntegrationsPage } from '../pages/IntegrationsPage';

describe('orphan route pages', () => {
  it('renders ThreadCalcPage and runs a thread route', async () => {
    render(
      <MemoryRouter>
        <ThreadCalcPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Tap Drill/i }));

    await waitFor(() => {
      expect(routeMocks.callThreadRoute).toHaveBeenCalledWith(
        'tap-drill',
        expect.objectContaining({
          standard: 'UN',
          fit_class: '2B',
        }),
      );
    });

    expect(screen.getByText(/0.4219/)).toBeDefined();
  });

  it('renders PipelinePage and runs the full pipeline', async () => {
    render(
      <MemoryRouter>
        <PipelinePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Run Full/i }));

    await waitFor(() => {
      expect(routeMocks.callPipelineRoute).toHaveBeenCalledWith(
        'full',
        expect.objectContaining({
          material: 'Ti-6Al-4V',
          machine: 'Okuma MU-5000V',
        }),
      );
    });

    expect(screen.getByText(/PGM-77/)).toBeDefined();
  });

  it('renders IntegrationsPage and runs the CAM recommendation route', async () => {
    render(
      <MemoryRouter>
        <IntegrationsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /CAM Recommendation/i }));

    await waitFor(() => {
      expect(routeMocks.callIntegrationRoute).toHaveBeenCalledWith(
        'cam',
        expect.objectContaining({
          job_id: 'JOB-2401',
          cam_system: 'Fusion 360',
        }),
      );
    });

    expect(screen.getByText(/Fusion 360 Manufacturing Extension/)).toBeDefined();
  });
});
