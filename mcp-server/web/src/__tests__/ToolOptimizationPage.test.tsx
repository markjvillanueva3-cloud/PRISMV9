// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToolOptimizationPage } from '../pages/ToolOptimizationPage';
import type { MachineWorkspaceContext } from '../features/machine-workspace/MachineWorkspaceState';

const mocks = vi.hoisted(() => ({
  ppgToolOptimize: vi.fn(),
  ppgMagazineLayout: vi.fn(),
}));

vi.mock('../api/client', () => ({
  ApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  ppgToolOptimize: mocks.ppgToolOptimize,
  ppgMagazineLayout: mocks.ppgMagazineLayout,
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

function renderPage(initialState: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/tool-optimization', state: initialState }]}>
      <Routes>
        <Route path="/tool-optimization" element={<ToolOptimizationPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ToolOptimizationPage', () => {
  beforeEach(() => {
    mocks.ppgToolOptimize.mockResolvedValue({
      data: {
        optimized_sequence: [
          { operation_id: 'lathe-op-1', tool_id: 'T1', tool_change: true, reason: 'Lead with roughing tool.' },
          { operation_id: 'lathe-op-2', tool_id: 'T2', tool_change: true, reason: 'Finish after roughing.' },
          { operation_id: 'lathe-op-3', tool_id: 'T3', tool_change: true, reason: 'Part off last.' },
        ],
        total_tool_changes: 3,
        changes_saved: 1,
        time_saved_sec: 4.5,
        original_tool_changes: 4,
        reduction_pct: 25,
        warnings: [],
      },
    });
    mocks.ppgMagazineLayout.mockResolvedValue({ data: { assignments: [], total_rotation_time_sec: 0, utilization_pct: 0, sister_placements: [], overflow_tools: [], warnings: [] } });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('hydrates routed JM Die lathe authority and calls the sequence optimizer with routed seeds', async () => {
    const operations = [
      { id: 'lathe-op-1', tool_id: 'T1', tool_diameter_mm: 12, operation_type: 'rough', cutting_time_min: 2.37 },
      { id: 'lathe-op-2', tool_id: 'T2', tool_diameter_mm: 11, operation_type: 'finish', cutting_time_min: 1.13 },
      { id: 'lathe-op-3', tool_id: 'T3', tool_diameter_mm: 3, operation_type: 'partoff', cutting_time_min: 0.7 },
    ];
    const tools = [
      { tool_id: 'T1', diameter_mm: 12, length_mm: 80, is_sister: false, sister_of: '' },
      { tool_id: 'T2', diameter_mm: 11, length_mm: 80, is_sister: false, sister_of: '' },
      { tool_id: 'T3', diameter_mm: 3, length_mm: 80, is_sister: false, sister_of: '' },
    ];

    renderPage({
      sourceLabel: 'lathe results',
      workspaceContext: LATHE_WORKSPACE_CONTEXT,
      operations,
      tools,
    });

    expect(screen.getByText('Shared routed tool-optimization authority')).toBeDefined();
    expect(screen.getAllByText(/Haas ST-20Y/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/magazine layout remains mill-only/i)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Magazine Layout' })).toBeDisabled();
    expect(screen.getByDisplayValue('lathe-op-1')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Optimize Tool Changes' }));

    await waitFor(() => {
      expect(mocks.ppgToolOptimize).toHaveBeenCalledWith({
        operations,
        tools,
      });
    });

    expect(await screen.findByText('4.5s')).toBeDefined();
  });

  it('fails closed for routed wire EDM posture instead of pretending tool optimization support exists', () => {
    renderPage({
      sourceLabel: 'wire edm results',
      workspaceContext: WIRE_WORKSPACE_CONTEXT,
      operations: [],
      tools: [],
    });

    expect(screen.getByText('Shared routed tool-optimization authority')).toBeDefined();
    expect(screen.getAllByText(/Sodick ALN600G/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Tool optimization is not yet supported for this routed wire EDM posture/i)).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Optimize Tool Changes' })).toBeNull();
    expect(mocks.ppgToolOptimize).not.toHaveBeenCalled();
  });
});
