// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FeatureTogglePage } from '../pages/FeatureTogglePage';
import type { MachineWorkspaceContext } from '../features/machine-workspace/MachineWorkspaceState';

const mocks = vi.hoisted(() => ({
  ppgFeatureSelect: vi.fn(),
}));

vi.mock('../api/client', () => ({
  ApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  ppgFeatureSelect: mocks.ppgFeatureSelect,
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
  programReleasePath: '/print-to-cnc?source=lathe-upload&machineId=LATHE-01',
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
  programReleasePath: '/print-to-cnc?source=wire-edm-upload&machineId=WEDM-01',
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

function renderPage(initialState: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/features', state: initialState }]}>
      <Routes>
        <Route path="/features" element={<FeatureTogglePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('FeatureTogglePage', () => {
  beforeEach(() => {
    mocks.ppgFeatureSelect.mockResolvedValue({
      data: {
        selected_features: [
          {
            id: 'safe-start',
            name: 'Safe Start',
            category: 'safety',
            enabled: true,
            score: 92,
            reason: 'Shared routed posture supports a safe-start block.',
            gcode_impact: 'G17 G40 G49 G80',
            time_impact_pct: 0,
            risk_level: 'none',
            interactions: [],
          },
        ],
        rejected_features: [
          {
            id: 'look-ahead',
            name: 'Look Ahead',
            category: 'hsm',
            enabled: false,
            score: 40,
            reason: 'Deferred until exact machine parity is confirmed.',
            gcode_impact: 'controller-specific',
            time_impact_pct: -1.2,
            risk_level: 'low',
            interactions: [],
          },
        ],
        feature_interactions: [],
        controller_config: {
          controller: 'haas',
          safe_start_block: 'G17 G40 G49 G80',
          smoothing_mode: 'standard',
          five_axis_mode: 'off',
          decimal_places: 4,
        },
        estimated_improvement: {
          cycle_time_pct: -3.1,
          surface_quality_pct: 2.4,
          tool_life_pct: 1.5,
          safety_score: 95,
        },
        confidence: 0.91,
        rationale: 'Shared routed posture approved the recommended baseline feature set.',
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('hydrates routed JM Die lathe authority into controller and ISO defaults', async () => {
    renderPage({
      controller: 'Haas NGC',
      materialName: '17-4 round bar',
      materialGroup: 'stainless',
      sourceLabel: 'lathe results',
      workspaceContext: LATHE_WORKSPACE_CONTEXT,
    });

    expect(screen.getByText('Shared routed feature authority')).toBeDefined();
    expect(screen.getAllByText(/Haas ST-20Y/i).length).toBeGreaterThanOrEqual(1);

    await waitFor(() => {
      expect((screen.getByLabelText('Controller') as HTMLSelectElement).value).toBe('haas');
      expect((screen.getByLabelText('ISO Group') as HTMLSelectElement).value).toBe('M');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Evaluate Features' }));

    await waitFor(() => {
      expect(mocks.ppgFeatureSelect).toHaveBeenCalledWith(expect.objectContaining({
        controller: 'haas',
        iso_group: 'M',
      }));
    });

    expect(await screen.findByText(/Shared routed posture approved the recommended baseline feature set\./i)).toBeDefined();
  });

  it('maps routed wire EDM controller and material posture onto the feature-selection engine', async () => {
    renderPage({
      controller: 'Sodick LN2W',
      materialName: 'D2',
      materialGroup: 'tool steel',
      sourceLabel: 'wire edm results',
      workspaceContext: WIRE_WORKSPACE_CONTEXT,
    });

    expect(screen.getByText('Shared routed feature authority')).toBeDefined();
    expect(screen.getAllByText(/Sodick ALN600G/i).length).toBeGreaterThanOrEqual(1);

    await waitFor(() => {
      expect((screen.getByLabelText('Controller') as HTMLSelectElement).value).toBe('sodick');
      expect((screen.getByLabelText('ISO Group') as HTMLSelectElement).value).toBe('H');
    });

    expect(screen.getByText(/mapped to "sodick" for the feature-selection engine/i)).toBeDefined();
    expect(screen.getByText(/mapped to ISO "H" for the feature-selection engine/i)).toBeDefined();
  });
});
