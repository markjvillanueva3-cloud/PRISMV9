import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SetupSheetPage } from '../pages/SetupSheetPage';
import type { MachineWorkspaceContext } from '../features/machine-workspace/MachineWorkspaceState';

const { ppgSetupSheetAuto } = vi.hoisted(() => ({
  ppgSetupSheetAuto: vi.fn(async () => ({
    result: {
      setup_sheet: {
        program_number: 'O1234',
        part_number: 'SHAFT-001',
        operation_name: 'Turning',
        tools: [],
        work_offsets: [],
        coolant_required: true,
        cycle_time_est_s: 180,
        extents: {
          x_min: 0,
          x_max: 20,
          y_min: 0,
          y_max: 20,
          z_min: -30,
          z_max: 5,
        },
        safety_notes: [],
        operations: [],
        controller: 'haas',
      },
      markdown: '# Setup Sheet',
    },
  })),
}));

vi.mock('../api/client', () => ({
  ApiError: class ApiError extends Error {},
  ppgSetupSheetAuto,
}));

const SETUP_WORKSPACE_CONTEXT: MachineWorkspaceContext = {
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
  selectorAuthorityNote: 'JM Die routed lathe setup should stay aligned with shared release selector truth.',
  programmingAuthority: {
    badge: 'JM Die seeded programming',
    summary: 'JM Die seeded packages loaded for this routed posture.',
    posture: 'fallback-staged',
    note: 'JM Die seeded turning packages keep setup generation aligned while release parity converges.',
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
          pathname: '/setup-sheet',
          state: {
            fileName: 'shaft.nc',
            gcode: 'O1234\nG0 X1.\nM30',
            partNumber: 'SHAFT-001',
            machineName: 'Haas ST-20Y',
            controller: 'Haas NGC',
            sourceLabel: 'lathe results',
            workspaceContext: SETUP_WORKSPACE_CONTEXT,
          },
        },
      ]}
    >
      <Routes>
        <Route path="/setup-sheet" element={<SetupSheetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SetupSheetPage', () => {
  it('hydrates routed JM Die authority into the setup-sheet form and request payload', async () => {
    renderPage();

    expect(screen.getByText('Shared routed setup authority')).toBeDefined();
    expect(screen.getAllByText(/Haas ST-20Y/i).length).toBeGreaterThanOrEqual(1);
    expect((screen.getByLabelText('Controller') as HTMLSelectElement).value).toBe('haas');
    expect((screen.getByLabelText('Part Number') as HTMLInputElement).value).toBe('SHAFT-001');
    expect((screen.getByLabelText('Machine') as HTMLInputElement).value).toBe('Haas ST-20Y');

    fireEvent.click(screen.getByRole('button', { name: 'Generate Setup Sheet' }));

    await waitFor(() => {
      expect(ppgSetupSheetAuto).toHaveBeenCalledWith({
        gcode: 'O1234\nG0 X1.\nM30',
        controller: 'haas',
        part_number: 'SHAFT-001',
        machine_name: 'Haas ST-20Y',
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });
    });

    expect(await screen.findByText('O1234')).toBeDefined();
  });
});
