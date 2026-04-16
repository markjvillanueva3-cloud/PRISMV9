import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProveOutWorkflowPage } from '../pages/ProveOutWorkflowPage';
import type { MachineWorkspaceContext } from '../features/machine-workspace/MachineWorkspaceState';

const { ppgProveOut, ppgProveOutPromote, ppgAirCutDetect } = vi.hoisted(() => ({
  ppgProveOut: vi.fn(async () => ({
    data: {
      gcode: 'O1234\n(PROVE-OUT)\nM30',
      summary: {
        total_lines: 3,
        modified_lines: 1,
        inserted_lines: 1,
        feed_reductions: 1,
        rpm_caps: 1,
        optional_stops_added: 1,
        avg_feed_reduction_pct: 25,
        avg_rpm_reduction_pct: 20,
      },
      estimated_cycle_time_ratio: 1.2,
      warnings: [],
    },
  })),
  ppgProveOutPromote: vi.fn(),
  ppgAirCutDetect: vi.fn(),
}));

vi.mock('../api/client', () => ({
  ApiError: class ApiError extends Error {},
  ppgProveOut,
  ppgProveOutPromote,
  ppgAirCutDetect,
}));

const PROVE_OUT_WORKSPACE_CONTEXT: MachineWorkspaceContext = {
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
  selectorAuthorityNote: 'JM Die routed prove-out should stay aligned with the shared release selector contract.',
  programmingAuthority: {
    badge: 'JM Die seeded programming',
    summary: 'JM Die seeded packages loaded for this routed posture.',
    posture: 'fallback-staged',
    note: 'JM Die seeded turning packages keep prove-out aligned while release parity converges.',
    environmentLabel: 'Fusion 360',
    licenseLabel: 'Live-tooling seat',
    toolpathLabel: 'Turning Probing',
  },
};

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/prove-out',
          state: {
            gcode: 'O1234\nG0 X1.\nM30',
            controller: 'Haas NGC',
            partNumber: 'SHAFT-001',
            machineName: 'Haas ST-20Y',
            sourceLabel: 'lathe results',
            workspaceContext: PROVE_OUT_WORKSPACE_CONTEXT,
          },
        },
      ]}
    >
      <Routes>
        <Route path="/prove-out" element={<ProveOutWorkflowPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProveOutWorkflowPage', () => {
  it('hydrates routed JM Die authority into the prove-out form and request payload', async () => {
    renderPage();

    expect(screen.getByText('Shared routed prove-out authority')).toBeDefined();
    expect(screen.getAllByText(/Haas ST-20Y/i).length).toBeGreaterThanOrEqual(1);
    expect((screen.getByLabelText('Controller') as HTMLSelectElement).value).toBe('haas');
    expect((screen.getByLabelText('Machine') as HTMLInputElement).value).toBe('Haas ST-20Y');
    expect((screen.getByLabelText('Part Number') as HTMLInputElement).value).toBe('SHAFT-001');

    fireEvent.click(screen.getByRole('button', { name: 'Create Prove-Out' }));

    await waitFor(() => {
      expect(ppgProveOut).toHaveBeenCalledWith({
        gcode: 'O1234\nG0 X1.\nM30',
        machine: {
          name: 'Haas ST-20Y',
          controller: 'haas',
          machine_id: 'LATHE-01',
          manufacturer: 'Haas',
          kinematics: 'Lathe with Y-axis and live tooling',
        },
        config: {
          feed_reduction: 0.25,
          rpm_cap: 0.8,
          insert_optional_stops: true,
          add_prove_out_comments: true,
          controller: 'haas',
        },
      });
    });

    expect(await screen.findByText('Lines Modified')).toBeDefined();
  });
});
