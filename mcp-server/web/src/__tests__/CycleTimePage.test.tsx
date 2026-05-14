// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CycleTimePage } from '../pages/CycleTimePage';
import type { MachineWorkspaceContext } from '../features/machine-workspace/MachineWorkspaceState';

const mocks = vi.hoisted(() => ({
  ppgCycleTime: vi.fn(),
  ppgCycleTimeCompare: vi.fn(),
}));

vi.mock('../api/client', () => ({
  ApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  ppgCycleTime: mocks.ppgCycleTime,
  ppgCycleTimeCompare: mocks.ppgCycleTimeCompare,
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

function renderPage(initialEntry: { pathname: string; state?: unknown }) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/cycle-time" element={<CycleTimePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CycleTimePage', () => {
  beforeEach(() => {
    mocks.ppgCycleTime.mockResolvedValue({
      data: {
        total_seconds: 200,
        total_formatted: '3m 20s',
        cutting_time: 120,
        rapid_time: 40,
        tool_change_time: 20,
        dwell_time: 0,
        spindle_time: 0,
        acceleration_overhead: 8,
        corner_decel_overhead: 4,
        block_processing_overhead: 5,
        servo_settling_overhead: 3,
        total_cutting_distance_mm: 4200,
        total_rapid_distance_mm: 1800,
        line_count: 128,
        tool_change_count: 3,
        machine_profile: 'Haas ST-20Y',
        breakdown_by_tool: [],
      },
    });
    mocks.ppgCycleTimeCompare.mockResolvedValue({
      data: {
        fastest_machine: 'Haas ST-20Y',
        slowest_machine: 'DMG DMU 50',
        time_spread_seconds: 18,
        time_spread_pct: 9,
        machines: [],
        insights: [],
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('hydrates routed JM Die authority into cycle time defaults and request payload', async () => {
    renderPage({
      pathname: '/cycle-time',
      state: {
        fileName: 'shaft.nc',
        gcode: 'G0 X0\nM30',
        controller: 'Haas NGC',
        machineName: 'Haas ST-20Y',
        sourceLabel: 'lathe results',
        workspaceContext: LATHE_WORKSPACE_CONTEXT,
      },
    });

    expect(screen.getByText('Shared routed cycle time authority')).toBeDefined();
    expect(screen.getAllByText(/Haas ST-20Y/i).length).toBeGreaterThanOrEqual(1);

    await waitFor(() => {
      expect((screen.getByLabelText('G-code input') as HTMLTextAreaElement).value).toBe('G0 X0\nM30');
      expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('haas');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Estimate Cycle Time' }));

    await waitFor(() => {
      expect(mocks.ppgCycleTime).toHaveBeenCalledWith(expect.objectContaining({
        gcode: 'G0 X0\nM30',
        controller: 'haas',
        include_breakdown: true,
        machine_profile: 'Haas ST-20Y',
      }));
    });

    expect(await screen.findByText('3m 20s')).toBeDefined();
  });

  it('maps routed wire EDM controllers onto the cycle-time controller catalog', async () => {
    renderPage({
      pathname: '/cycle-time',
      state: {
        fileName: 'profile.nc',
        gcode: 'M90\nM02',
        controller: 'Sodick LN2W',
        machineName: 'Sodick ALN600G',
        sourceLabel: 'wire edm results',
        workspaceContext: WIRE_WORKSPACE_CONTEXT,
      },
    });

    expect(screen.getByText('Shared routed cycle time authority')).toBeDefined();
    expect(screen.getAllByText(/Sodick ALN600G/i).length).toBeGreaterThanOrEqual(1);

    await waitFor(() => {
      expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('sodick');
    });

    expect(screen.getByText(/mapped to "sodick" for the cycle-time engine/i)).toBeDefined();
  });
});
