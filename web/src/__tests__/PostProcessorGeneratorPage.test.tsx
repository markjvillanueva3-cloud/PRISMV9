// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PostProcessorGeneratorPage } from '../pages/PostProcessorGeneratorPage';

const mocks = vi.hoisted(() => ({
  ppgControllers: vi.fn(),
  ppgOperations: vi.fn(),
  ppgGenerate: vi.fn(),
  ppgProgram: vi.fn(),
  ppgValidate: vi.fn(),
  ppgCompare: vi.fn(),
}));

vi.mock('../api/client', () => ({
  ApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  ppgControllers: mocks.ppgControllers,
  ppgOperations: mocks.ppgOperations,
  ppgGenerate: mocks.ppgGenerate,
  ppgProgram: mocks.ppgProgram,
  ppgValidate: mocks.ppgValidate,
  ppgCompare: mocks.ppgCompare,
}));

function renderPage(initialEntry = '/ppg') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/ppg" element={<PostProcessorGeneratorPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PostProcessorGeneratorPage', () => {
  beforeEach(() => {
    mocks.ppgControllers.mockResolvedValue({
      data: {
        controllers: ['Haas NGC', 'Fanuc 31i', 'Siemens 840D'],
      },
    });
    mocks.ppgOperations.mockResolvedValue({
      data: {
        operations: ['facing', 'drilling', 'probing'],
      },
    });
    mocks.ppgGenerate.mockResolvedValue({
      data: {
        post_name: 'VF2_PRODUCTION',
        controller: 'Haas NGC',
        cam_system: 'Fusion 360',
        operation: 'drilling',
        machine_model: 'Haas VF-2SS',
        program_line_count: 42,
        capabilities: ['Safe start'],
        preview: 'O1001\nM30',
      },
    });
    mocks.ppgProgram.mockResolvedValue({
      data: {
        post_name: 'VF2_PRODUCTION',
        controller: 'Haas NGC',
        cam_system: 'Fusion 360',
        operation: 'drilling',
        machine_model: 'Haas VF-2SS',
        program_line_count: 42,
        capabilities: ['Safe start'],
        preview: 'O1001\nM30',
      },
    });
    mocks.ppgValidate.mockResolvedValue({
      data: {
        status: 'ready',
        score: 0.93,
        warnings: [],
        passes: ['Work offset call detected.'],
      },
    });
    mocks.ppgCompare.mockResolvedValue({
      data: {
        delta_summary: ['Different canned-cycle syntax'],
        baseline_notes: ['Legacy-friendly'],
        target_notes: ['Native high-end cycle support'],
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the workspace and honors cross-link query parameters', async () => {
    renderPage('/ppg?operation=drilling&controller=fanuc_31i&machinePosture=5_axis_trunnion');

    expect(screen.getByRole('heading', { name: 'Post Processor Generator' })).toBeDefined();
    await waitFor(() => {
      expect((screen.getByLabelText('Operation') as HTMLSelectElement).value).toBe('drilling');
      expect((screen.getByLabelText('Controller') as HTMLSelectElement).value).toBe('fanuc_31i');
      expect((screen.getByLabelText('Machine posture') as HTMLSelectElement).value).toBe('5_axis_trunnion');
    });
    expect(screen.getByRole('button', { name: 'Generate Post' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Validate Program' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Compare Controllers' })).toBeDefined();
  });

  it('falls back to the local controller and operation catalog when the live catalog fails', async () => {
    mocks.ppgControllers.mockRejectedValueOnce(new Error('controllers offline'));
    mocks.ppgOperations.mockRejectedValueOnce(new Error('operations offline'));

    renderPage('/ppg');

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Haas NGC' })).toBeDefined();
      expect(screen.getByRole('option', { name: 'Facing' })).toBeDefined();
    });
  });

  it('surfaces missing required capability gates in the generated release posture', async () => {
    renderPage('/ppg?machinePosture=5_axis_trunnion');

    await waitFor(() => {
      expect(screen.getByLabelText('RTCP / TCPM')).toBeDefined();
    });

    const rtcp = screen.getByLabelText('RTCP / TCPM') as HTMLInputElement;
    expect(rtcp.checked).toBe(true);
    fireEvent.click(rtcp);
    expect(rtcp.checked).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Generate Post' }));

    await waitFor(() => {
      expect(screen.getByText(/Missing required machine or controller gates: RTCP \/ TCPM/i)).toBeDefined();
    });
  });

  it('shows a generated post brief and downstream packet handoffs after generation', async () => {
    renderPage('/ppg?operation=drilling');

    await waitFor(() => {
      expect(screen.getByLabelText('Operation')).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Operation'), { target: { value: 'drilling' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Post' }));

    await waitFor(() => {
      expect(screen.getAllByText('VF2_PRODUCTION')[0]).toBeDefined();
      expect(screen.getAllByText('Safe start')[0]).toBeDefined();
      expect(screen.getAllByText(/O1001/)[0]).toBeDefined();
    });

    const releaseLink = screen.getByRole('link', { name: 'Open Print to CNC packet' }) as HTMLAnchorElement;
    const quoteLink = screen.getByRole('link', { name: 'Stage quote packet' }) as HTMLAnchorElement;
    const captureLink = screen.getByRole('link', { name: 'Capture prove-out evidence' }) as HTMLAnchorElement;
    const shopFloorLink = screen.getByRole('link', { name: 'Start shop-floor prove-out' }) as HTMLAnchorElement;
    expect(releaseLink.getAttribute('href')).toContain('/print-to-cnc?');
    expect(releaseLink.getAttribute('href')).toContain('source=ppg');
    expect(releaseLink.getAttribute('href')).toContain('focusType=packet');
    expect(quoteLink.getAttribute('href')).toContain('/quote-builder?');
    expect(quoteLink.getAttribute('href')).toContain('source=ppg');
    expect(captureLink.getAttribute('href')).toContain('/capture?');
    expect(captureLink.getAttribute('href')).toContain('source=ppg');
    expect(shopFloorLink.getAttribute('href')).toContain('/shop-clock?');
    expect(shopFloorLink.getAttribute('href')).toContain('source=ppg');
  });

  it('uses the multi-operation generator path when the packet strategy changes', async () => {
    renderPage('/ppg');

    await waitFor(() => {
      expect(screen.getByLabelText('Program style')).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Program style'), {
      target: { value: 'multi_operation' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Post' }));

    await waitFor(() => {
      expect(mocks.ppgProgram).toHaveBeenCalledTimes(1);
      expect(screen.getAllByText('VF2_PRODUCTION')[0]).toBeDefined();
    });
    expect(mocks.ppgGenerate).not.toHaveBeenCalled();
  });

  it('renders the validation desk with readiness output', async () => {
    renderPage('/ppg');

    await waitFor(() => {
      expect(screen.getByLabelText('Program text')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Validate Program' }));

    await waitFor(() => {
      expect(screen.getAllByText('READY')[0]).toBeDefined();
      expect(screen.getAllByText('93%')[0]).toBeDefined();
      expect(screen.getByText(/Work offset call detected/)).toBeDefined();
    });
  });

  it('shows the library lane with controller fit and tier guidance', async () => {
    renderPage('/ppg');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Library' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Library' }));

    await waitFor(() => {
      expect(screen.getByText('Library review')).toBeDefined();
      expect(screen.getByText('Selected controller fit')).toBeDefined();
      expect(screen.getAllByText(/Recommended now/i)[0]).toBeDefined();
    });
  });

  it('falls back to local compare output when the compare API fails', async () => {
    mocks.ppgCompare.mockRejectedValueOnce(new Error('compare offline'));
    renderPage('/ppg?machinePosture=5_axis_trunnion');

    await waitFor(() => {
      expect(screen.getByLabelText('Machine posture')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Compare Controllers' }));

    await waitFor(() => {
      expect(screen.getByText(/Unable to compare live right now/i)).toBeDefined();
      expect(screen.getByText(/RTCP \/ tilted-workplane behavior before release/i)).toBeDefined();
    });
  });

  it('flags high-risk simulation posture before a controller compare is staged', async () => {
    renderPage('/ppg?machinePosture=5_axis_trunnion');

    await waitFor(() => {
      expect(screen.getByText(/Current posture still needs multiaxis or sync-specific controller review before simulation trust is credible/i)).toBeDefined();
    });
  });

  it('uses local validation fallback with release-gate warnings when validation fails', async () => {
    mocks.ppgValidate.mockRejectedValueOnce(new Error('validate offline'));
    renderPage('/ppg?machinePosture=5_axis_trunnion');

    await waitFor(() => {
      expect(screen.getByLabelText('RTCP / TCPM')).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText('RTCP / TCPM'));
    fireEvent.change(screen.getByLabelText('Program text'), { target: { value: 'O1001\nM30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate Program' }));

    await waitFor(() => {
      expect(screen.getByText(/Showing a local readiness review instead/i)).toBeDefined();
      expect(screen.getByText(/Program looks unusually short for a prove-out packet/i)).toBeDefined();
      expect(screen.getAllByText(/Missing required machine or controller gates: RTCP \/ TCPM/i).length).toBeGreaterThan(0);
    });
  });
});
