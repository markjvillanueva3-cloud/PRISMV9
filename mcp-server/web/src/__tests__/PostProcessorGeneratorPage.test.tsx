// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PostProcessorGeneratorPage } from '../pages/PostProcessorGeneratorPage';
import type { MachineWorkspaceContext } from '../features/machine-workspace/MachineWorkspaceState';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

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

const LATHE_WORKSPACE_CONTEXT: MachineWorkspaceContext = {
  mode: 'lathe',
  machineLabel: 'Haas ST-20Y',
  machineId: 'LATHE-01',
  machineManufacturer: 'Haas',
  machineKinematics: 'Lathe with Y-axis and live tooling',
  controllerId: 'haas',
  controllerLabel: 'Haas NGC',
  materialLabel: '17-4 round bar',
  materialGroup: 'stainless',
  stockDiameterMm: 38,
  stockLengthMm: 120,
  stockThicknessMm: 38,
  targetRaUm: 1.6,
  holderStyle: 'capto-c6',
  programReleasePath: '/program-release?source=lathe-upload&machineId=LATHE-01',
  selectorAuthorityNote: 'JM Die seeded lathe route stays aligned with the shared release selector contract.',
  programmingAuthority: {
    badge: 'JM Die seeded programming',
    summary: 'JM Die seeded packages loaded for this routed posture.',
    posture: 'fallback-staged',
    note: 'JM Die seeded packages loaded for this routed turning posture while exact machine release parity finishes converging.',
    environmentLabel: 'Fusion 360',
    licenseLabel: 'Live-tooling seat',
    toolpathLabel: 'Turning Probing',
  },
};

const WIRE_WORKSPACE_CONTEXT: MachineWorkspaceContext = {
  mode: 'wire_edm',
  machineLabel: 'Sodick ALN600G',
  machineId: 'WEDM-01',
  machineManufacturer: 'Sodick',
  machineKinematics: 'Wire EDM',
  controllerId: 'sodick',
  controllerLabel: 'Sodick LN2W',
  materialLabel: 'D2',
  materialGroup: 'tool steel',
  stockDiameterMm: 0,
  stockLengthMm: 80,
  stockThicknessMm: 24,
  targetRaUm: 1.1,
  holderStyle: 'fine-wire',
  programReleasePath: '/program-release?source=wire-edm-upload&machineId=WEDM-01',
  selectorAuthorityNote: 'Sodick ALN600G is the canonical JM Die wire EDM registry entry.',
  programmingAuthority: {
    badge: 'JM Die curated programming',
    summary: 'JM Die curated wire packages are active for this routed posture.',
    posture: 'curated-service',
    note: 'JM Die curated wire packages keep this results view aligned with the routed machine registry while Program Release parity converges.',
    environmentLabel: 'Cimatron',
    licenseLabel: 'Taper + skim',
    toolpathLabel: 'Wire Profile',
  },
};

function renderPage(
  initialEntry:
    | string
    | {
        pathname: string;
        search?: string;
        state?: unknown;
      } = '/ppg',
) {
  const entries = [initialEntry];
  render(
    <OperatingSystemProvider services={fixtureOperatingSystemServices}>
      <MemoryRouter initialEntries={entries}>
        <Routes>
          <Route path="/ppg" element={<PostProcessorGeneratorPage />} />
        </Routes>
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
}

function parseRelativeUrl(href: string) {
  return new URL(href, 'https://prism.local');
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
        operations: ['facing', 'drilling', 'probing', 'turning_profile'],
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

  it('hydrates routed JM Die lathe authority and pre-fills post defaults from results context', async () => {
    renderPage({
      pathname: '/ppg',
      search: '?source=lathe&recordType=Lathe%20Result&recordId=Shaft-001&controller=haas_ngc&machinePosture=lathe&operation=turning_profile',
      state: {
        sourceLabel: 'lathe results',
        workspaceContext: LATHE_WORKSPACE_CONTEXT,
        fileName: 'Shaft-001.nc',
        machineModel: 'Haas ST-20Y',
        controller: 'Haas NGC',
        machinePosture: 'lathe',
        operation: 'turning_profile',
        camSystem: 'fusion_360',
        programName: 'SHAFT_001',
        gcode: 'O1001\nM30',
      },
    });

    expect(screen.getByText('Shared routed post authority')).toBeDefined();
    expect(screen.getAllByText(/Haas ST-20Y/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/This post workflow now inherits the same JM Die machine, controller, selector, and programming posture from lathe results/i),
    ).toBeDefined();

    await waitFor(() => {
      expect((screen.getByLabelText('Machine posture') as HTMLSelectElement).value).toBe('lathe');
      expect((screen.getByLabelText('Controller') as HTMLSelectElement).value).toBe('haas_ngc');
      expect((screen.getByLabelText('Operation') as HTMLSelectElement).value).toBe('turning_profile');
      expect((screen.getByLabelText('CAM software') as HTMLSelectElement).value).toBe('fusion_360');
    });
  });

  it('keeps the routed JM Die machine authority when PPG hands back into Print to CNC', async () => {
    renderPage({
      pathname: '/ppg',
      search: '?source=lathe&recordType=Lathe%20Result&recordId=Shaft-001&controller=haas_ngc&machinePosture=lathe&operation=turning_profile',
      state: {
        sourceLabel: 'lathe results',
        workspaceContext: LATHE_WORKSPACE_CONTEXT,
        fileName: 'Shaft-001.nc',
        machineModel: 'Haas ST-20Y',
        controller: 'Haas NGC',
        machinePosture: 'lathe',
        operation: 'turning_profile',
        camSystem: 'fusion_360',
        programName: 'SHAFT_001',
        gcode: 'O1001\nM30',
      },
    });

    await waitFor(() => {
      expect((screen.getByLabelText('Machine posture') as HTMLSelectElement).value).toBe('lathe');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate Post' }));

    const releaseLink = await screen.findByRole('link', { name: 'Open Print to CNC packet' });
    const releaseUrl = parseRelativeUrl(releaseLink.getAttribute('href') ?? '/print-to-cnc');

    expect(releaseUrl.pathname).toBe('/print-to-cnc');
    expect(releaseUrl.searchParams.get('source')).toBe('ppg');
    expect(releaseUrl.searchParams.get('focusType')).toBe('packet');
    expect(releaseUrl.searchParams.get('machineId')).toBe('st20-turn');
    expect(releaseUrl.searchParams.get('machineFamilyId')).toBe('lathe');
    expect(releaseUrl.searchParams.get('machineManufacturer')).toBe('haas');
  });

  it('fails closed for routed wire EDM posture instead of pretending post generation support exists', async () => {
    renderPage({
      pathname: '/ppg',
      search: '?source=wire-edm&recordType=Wire%20EDM%20Result&recordId=profile',
      state: {
        sourceLabel: 'wire edm results',
        workspaceContext: WIRE_WORKSPACE_CONTEXT,
        unsupportedReason:
          'Post processor generation is not yet supported for this routed wire EDM posture. PRISM keeps this surface fail-closed until the canonical EDM post and controller contract is extracted.',
      },
    });

    expect(screen.getByText('Shared routed post authority')).toBeDefined();
    expect(screen.getAllByText(/Sodick ALN600G/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Post processor generation is not yet supported for this routed wire EDM posture/i),
    ).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Generate Post' })).toBeNull();

    await waitFor(() => {
      expect(mocks.ppgControllers).toHaveBeenCalled();
      expect(mocks.ppgOperations).toHaveBeenCalled();
    });
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
      expect(screen.getByText('Post library')).toBeDefined();
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
