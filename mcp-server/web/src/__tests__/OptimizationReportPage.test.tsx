import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OptimizationReportPage } from '../pages/OptimizationReportPage';
import type { MachineWorkspaceContext } from '../features/machine-workspace/MachineWorkspaceState';

const { ppgOptimizationReport } = vi.hoisted(() => ({
  ppgOptimizationReport: vi.fn(async () => ({
    result: {
      summary: {
        program_name: 'shaft.nc',
        machine_name: 'Haas ST-20Y',
        material_name: '17-4 round bar',
        controller: 'haas',
        total_blocks: 120,
        blocks_optimized: 48,
        optimization_pct: 40,
        cycle_time_original_sec: 240,
        cycle_time_optimized_sec: 198,
        cycle_time_saved_sec: 42,
        cycle_time_saved_pct: 17.5,
        feed_changes: 12,
        rpm_changes: 9,
        max_force_N: 1800,
        avg_force_N: 920,
        max_power_kW: 3.8,
        recommendations: ['Reduce air cutting between roughing passes.'],
        tool_count: 3,
        stages_executed: 38,
        pipeline_duration_ms: 1540,
      },
      per_tool: [],
      recommendations: ['Reduce air cutting between roughing passes.'],
      report_html: '<p>report</p>',
      report_json: '{"ok":true}',
      report_markdown: '# report',
      setup_sheet: {
        setup_sheet: {
          tools: [],
          work_offsets: [{ code: 'G54', use_count: 1 }],
          coolant_required: true,
          cycle_time_est_s: 198,
          safety_notes: [],
        },
      },
      diff: {
        optimized_gcode: 'O1234\n(OPTIMIZED)\nM30',
      },
      comparison: null,
    },
  })),
}));

vi.mock('../api/client', () => ({
  ApiError: class ApiError extends Error {},
  ppgOptimizationReport,
}));

const OPTIMIZATION_WORKSPACE_CONTEXT: MachineWorkspaceContext = {
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
  selectorAuthorityNote: 'JM Die routed optimization should stay aligned with shared release selector truth.',
  programmingAuthority: {
    badge: 'JM Die seeded programming',
    summary: 'JM Die seeded packages loaded for this routed posture.',
    posture: 'fallback-staged',
    note: 'JM Die seeded turning packages keep optimization aligned while release parity converges.',
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
          pathname: '/optimize',
          state: {
            fileName: 'shaft.nc',
            gcode: 'O1234\nG0 X1.\nM30',
            materialName: '17-4 round bar',
            materialGroup: 'stainless',
            machineName: 'Haas ST-20Y',
            controller: 'Haas NGC',
            sourceLabel: 'lathe results',
            workspaceContext: OPTIMIZATION_WORKSPACE_CONTEXT,
          },
        },
      ]}
    >
      <Routes>
        <Route path="/optimize" element={<OptimizationReportPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OptimizationReportPage', () => {
  it('hydrates routed JM Die authority into the optimization form and request payload', async () => {
    renderPage();

    expect(screen.getByText('Shared routed optimization authority')).toBeDefined();
    expect(screen.getAllByText(/Haas ST-20Y/i).length).toBeGreaterThanOrEqual(1);
    expect((screen.getByLabelText('Controller') as HTMLSelectElement).value).toBe('haas');
    expect((screen.getByLabelText('Material') as HTMLInputElement).value).toBe('17-4 round bar');
    expect((screen.getByLabelText('Machine') as HTMLInputElement).value).toBe('Haas ST-20Y');

    fireEvent.click(screen.getByRole('button', { name: 'Optimize Program' }));

    await waitFor(() => {
      expect(ppgOptimizationReport).toHaveBeenCalledWith({
        gcode: 'O1234\nG0 X1.\nM30',
        controller: 'haas',
        aggressiveness: 0.5,
        program_name: 'shaft.nc',
        material: {
          name: '17-4 round bar',
          iso_group: 'M',
          material_group: 'stainless',
        },
        machine: {
          name: 'Haas ST-20Y',
          controller: 'haas',
          machine_id: 'LATHE-01',
          manufacturer: 'Haas',
          kinematics: 'Lathe with Y-axis and live tooling',
        },
      });
    });

    expect(await screen.findByText('shaft.nc')).toBeDefined();
  });
});
