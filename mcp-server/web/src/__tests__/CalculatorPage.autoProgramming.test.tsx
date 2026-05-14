// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

let CalculatorPageInner: React.FC;

type RequestLog = { url: string; body: Record<string, unknown> | undefined };

function parseBody(body: BodyInit | null | undefined) {
  if (typeof body !== 'string') return undefined;
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function okJson(payload: unknown) {
  return Promise.resolve({ ok: true, json: async () => payload } as Response);
}

function installFetchMock() {
  const requests: RequestLog[] = [];
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const body = parseBody(init?.body);
    requests.push({ url, body });

    if (url.includes('/api/v1/lathe/upload')) {
      return okJson({
        ok: true,
        detectedRoute: 'cad',
        extractedData: {
          success: true,
          envelope: { max_od_mm: 42, min_id_mm: 18, total_length_mm: 88 },
          features: [
            { id: 'F-1', type: 'od_straight', od_mm: 42, length_mm: 38, position_z_mm: 0 },
            { id: 'F-2', type: 'thread_od', od_mm: 20, length_mm: 18, thread_pitch_mm: 1.5, position_z_mm: 38 },
          ],
          warnings: [],
          non_axi_features: [],
        },
      });
    }

    if (url.includes('/api/v1/turning/program')) {
      return okJson({
        result: {
          success: true,
          part_number: 'shaft',
          material: '4140 PH / Prehard',
          bar_stock_od_mm: 50,
          part_length_mm: 88,
          operations: [{ operation_type: 'od_rough' }],
          total_operations: 1,
          total_tool_changes: 1,
          estimated_cycle_time_sec: 132,
          program_text: 'O1000\nG50 S3000\nG96 S180 M03\nM30\n',
          program_line_count: 4,
          setup_notes: ['Grip 32 mm in the chuck', 'Use T0101 CNMG rougher'],
          confidence_score: 88,
          warnings: [],
        },
      });
    }

    if (url.includes('/api/v1/edm/parse-geometry')) {
      return okJson({
        ok: true,
        data: {
          contours: [
            {
              name: 'Outer profile',
              is_closed: true,
              is_exterior: true,
              area_mm2: 1250,
              perimeter_mm: 160,
              bbox: { min_x: 0, min_y: 0, max_x: 50, max_y: 25 },
              segments: [],
            },
            {
              name: 'Slot window',
              is_closed: true,
              is_exterior: false,
              area_mm2: 180,
              perimeter_mm: 60,
              bbox: { min_x: 10, min_y: 6, max_x: 24, max_y: 18 },
              segments: [],
            },
          ],
        },
      });
    }

    if (url.includes('/api/v1/edm/photo-to-program')) {
      return okJson({
        ok: true,
        data: {
          success: true,
          program_text: 'O9001\nM20\nG92 X0 Y0\nM30\n',
          line_count: 4,
          controller: 'fanuc',
          profiles_cut: 1,
          passes_per_profile: 3,
          estimated_time_min: 34.5,
          predicted_ra_um: 0.42,
          predicted_accuracy_mm: 0.005,
          pass_details: [],
          wire_consumption_m: 96.2,
          setup_sheet: {
            part_name: 'plate',
            part_number: 'PLATE',
            material: 'D2 Tool Steel',
            thickness_mm: 25,
            wire_type: 'brass_0.25',
            wire_diameter_mm: 0.25,
            controller: 'fanuc',
            program_number: 9001,
            num_profiles: 1,
            num_passes: 3,
            total_time_min: 34.5,
            wire_needed_m: 96.2,
            flush_pressure_bar: 1.8,
            submerged: true,
            notes: ['Use submerged strategy'],
          },
          warnings: [],
          stages_completed: ['geometry', 'passes', 'post'],
        },
      });
    }

    if (url.includes('/api/v1/cam/auto-print-to-program')) {
      return okJson({
        result: {
          success: true,
          detected_format: 'dxf',
          detected_process: 'milling',
          part_number: 'electrode',
          material: 'Copper Tungsten EDM Electrode',
          features_detected: 3,
          features_classified: [],
          program_text: 'O7007\nG90 G17 G40 G49 G80\nT1 M06\nS24000 M03\nM30\n',
          program_line_count: 5,
          cycle_time_sec: 410,
          tool_list: [],
          pipeline_used: 'auto_print_to_program',
          confidence_score: 0.82,
          warnings: [],
          stages_completed: ['format_detection', 'dxf_parsing', 'program_generation'],
        },
      });
    }

    return Promise.reject(new Error(`Unhandled request in test: ${url}`));
  }));

  return requests;
}

async function renderCalculator() {
  render(
    <OperatingSystemProvider services={fixtureOperatingSystemServices}>
      <MemoryRouter initialEntries={['/calculator']}>
        <Routes>
          <Route path="/calculator" element={<CalculatorPageInner />} />
        </Routes>
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
  await screen.findByText(/Ultimate Machining Tool/i);
}

async function clickModeButton(label: string) {
  const button = await screen.findByRole('button', {
    name: new RegExp(`switch calculator mode to ${label}`, 'i'),
  });
  await act(async () => {
    fireEvent.click(button);
  });
}

async function findWorkbenchPanel() {
  const title = await screen.findByText(/Print \/ CAD to Program/i);
  const panel = title.closest('section');
  expect(panel).not.toBeNull();
  return panel as HTMLElement;
}

beforeAll(async () => {
  const mod = await import('../pages/CalculatorPage');
  CalculatorPageInner = mod.CalculatorPage;
}, 30000);

beforeEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

describe('CalculatorPage auto-programming workbench', () => {
  it('runs the lathe print-to-program workflow from the calculator page', async () => {
    const requests = installFetchMock();
    await renderCalculator();
    await clickModeButton('Lathe');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /switch calculator mode to lathe/i })).toHaveAttribute('aria-pressed', 'true');
    });
    const panel = await findWorkbenchPanel();
    await waitFor(() => {
      expect(within(panel).queryByLabelText(/upload lathe file input/i)).not.toBeNull();
    });

    const fileInput = within(panel).getByLabelText(/upload lathe file input/i);
    const file = new File(['step-data'], 'shaft.step', { type: 'application/step' });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await screen.findByText(/Loaded 2 lathe features from shaft.step/i);
    await act(async () => {
      fireEvent.click(within(panel).getByRole('button', { name: /3D part/i }));
      fireEvent.click(within(panel).getByRole('button', { name: /Thread Od/i }));
      fireEvent.change(within(panel).getByLabelText(/Radial stock offset/i), { target: { value: '0.2' } });
      fireEvent.change(within(panel).getByLabelText(/Batch quantity/i), { target: { value: '24' } });
      fireEvent.click(within(panel).getByRole('button', { name: /PRISM auto-program/i }));
    });

    await screen.findByText(/Lathe program ready/i);
    expect(screen.getByText(/Download \.NC/i)).toBeDefined();

    const turningRequest = requests.find((entry) => entry.url.includes('/api/v1/turning/program'));
    expect(turningRequest?.body).toMatchObject({
      part_number: 'shaft',
      optimization_target: 'min_cost',
    });
    expect(Array.isArray(turningRequest?.body?.features)).toBe(true);
    expect((turningRequest?.body?.features as unknown[]).length).toBe(1);
  });

  it('runs the wire DXF-to-program workflow from the calculator page', async () => {
    const requests = installFetchMock();
    await renderCalculator();
    await clickModeButton('Wire EDM');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /switch calculator mode to wire edm/i })).toHaveAttribute('aria-pressed', 'true');
    });
    const panel = await findWorkbenchPanel();
    await waitFor(() => {
      expect(within(panel).queryByLabelText(/upload wire edm file input/i)).not.toBeNull();
    });

    const fileInput = within(panel).getByLabelText(/upload wire edm file input/i);
    const file = new File(['0\nSECTION\n2\nENTITIES\n0\nENDSEC\n0\nEOF'], 'plate.dxf', { type: 'application/dxf' });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await screen.findByText(/Loaded 2 wire contours from plate.dxf/i);
    await act(async () => {
      fireEvent.click(within(panel).getByRole('button', { name: /3D part/i }));
      fireEvent.click(within(panel).getByRole('button', { name: /Slot window/i }));
      fireEvent.change(within(panel).getByLabelText(/Origin X/i), { target: { value: '10' } });
      fireEvent.change(within(panel).getByLabelText(/Origin Y/i), { target: { value: '5' } });
      fireEvent.change(within(panel).getByLabelText(/Per-pass offset overrides/i), { target: { value: '0.18, 0.06, 0.02' } });
      fireEvent.click(within(panel).getByRole('button', { name: /PRISM auto-program/i }));
    });

    await screen.findByText(/Wire program ready/i);
    expect(screen.getByText(/Download \.NC/i)).toBeDefined();

    const programRequest = requests.find((entry) => entry.url.includes('/api/v1/edm/photo-to-program'));
    expect(programRequest?.body).toMatchObject({
      contour_indices: [0],
      origin: { x: 10, y: 5 },
      offset_overrides_mm: [0.18, 0.06, 0.02],
      part_name: 'plate',
    });
  });

  it('keeps machine-specific wizard launch buttons inside the embedded programming workbench', async () => {
    installFetchMock();
    await renderCalculator();

    await clickModeButton('Lathe');
    let panel = await findWorkbenchPanel();
    await waitFor(() => {
      expect(within(panel).getByRole('link', { name: /open lathe wizard/i })).toBeDefined();
      expect(within(panel).getByRole('link', { name: /open full print to cnc/i })).toBeDefined();
    });

    await clickModeButton('Wire EDM');
    panel = await findWorkbenchPanel();
    await waitFor(() => {
      expect(within(panel).getByRole('link', { name: /open wire edm wizard/i })).toBeDefined();
      expect(within(panel).getByRole('link', { name: /open full print to cnc/i })).toBeDefined();
    });
  });

  it('runs the sinker EDM electrode packet workflow from the calculator page', async () => {
    const requests = installFetchMock();
    await renderCalculator();
    await clickModeButton('Sinker EDM');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /switch calculator mode to sinker edm/i })).toHaveAttribute('aria-pressed', 'true');
    });
    const panel = await findWorkbenchPanel();
    await waitFor(() => {
      expect(within(panel).queryByLabelText(/upload sinker edm electrode file input/i)).not.toBeNull();
    });

    const fileInput = within(panel).getByLabelText(/upload sinker edm electrode file input/i);
    const file = new File(['0\nSECTION\n2\nENTITIES\n0\nENDSEC\n0\nEOF'], 'electrode.dxf', { type: 'application/dxf' });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await screen.findByText(/Loaded DXF geometry from electrode.dxf/i);
    await act(async () => {
      fireEvent.click(within(panel).getByRole('button', { name: /3D part/i }));
      fireEvent.click(within(panel).getByRole('button', { name: /Legacy reference/i }));
      fireEvent.change(within(panel).getByLabelText(/Spark gap per side/i), { target: { value: '0.06' } });
      fireEvent.change(within(panel).getByLabelText(/Wear allowance/i), { target: { value: '0.02' } });
      fireEvent.change(within(panel).getByLabelText(/Finish passes/i), { target: { value: '3' } });
      fireEvent.change(within(panel).getByLabelText(/Legacy Roku-Roku reference folder/i), { target: { value: 'H:\\PRISM\\JM DIE\\ROKU-ROKU' } });
      fireEvent.click(within(panel).getByRole('button', { name: /PRISM auto-program/i }));
    });

    await screen.findByText(/Electrode NC ready/i);
    expect(screen.getByText(/Holder package: System 3R ER-32\./i)).toBeDefined();

    const electrodeRequest = requests.find((entry) => entry.url.includes('/api/v1/cam/auto-print-to-program'));
    expect(electrodeRequest?.body).toMatchObject({
      format: 'dxf',
      process_type: 'milling',
      process_variant: 'sinker_edm_electrode',
      material_name: 'Copper Tungsten EDM Electrode',
      machine_brand: 'Roku-Roku',
      machine_model: 'HC 658II',
      controller: 'fanuc',
      max_spindle_rpm: 30000,
      holder_package: 'System 3R ER-32',
      fixture_system: 'System 3R',
      electrode_material: 'Copper Tungsten',
      spark_gap_per_side_mm: 0.06,
      wear_allowance_mm: 0.02,
      finish_pass_count: 3,
      legacy_macro_path: 'H:\\Automated Program_Corrected 5-25.xlsm',
      legacy_reference_path: 'H:\\PRISM\\JM DIE\\ROKU-ROKU',
    });
  });
});
