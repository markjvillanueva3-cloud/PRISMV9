/**
 * Wire EDM Pages — Component Tests
 * U-PROD-18: Frontend component tests for WEDM P2P
 *
 * Tests WireEdmWizardPage and WireEdmUploadPage
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock wedmErpApi
vi.mock('../api/wedmErp', () => ({
  wedmErpApi: {
    estimate: vi.fn(() => Promise.resolve({
      ok: true,
      data: {
        cost_estimate: { total: 150 },
        quote: { total: 180, line_items: [] },
      },
    })),
    quantityBreaks: vi.fn(() => Promise.resolve({
      ok: true,
      data: {
        quantity_breaks: [
          { quantity: 1, unit_price: 180, total_price: 180, savings_pct_vs_qty1: 0 },
          { quantity: 5, unit_price: 160, total_price: 800, savings_pct_vs_qty1: 11.1 },
          { quantity: 10, unit_price: 140, total_price: 1400, savings_pct_vs_qty1: 22.2 },
        ],
      },
    })),
    jobCreate: vi.fn(() => Promise.resolve({
      ok: true,
      data: { job: { jobId: 'JOB-2026-0042' } },
    })),
  },
}));

// Mock API client
vi.mock('../api/client', () => ({
  solveWireEdmWizard: vi.fn(() => Promise.resolve({
    cutting_speed_mm_min: 2.5,
    wire_tension_N: 15,
    pulse_on_us: 8,
    pulse_off_us: 12,
    peak_current_A: 12,
    servo_voltage_V: 45,
    kerf_width_mm: 0.28,
    estimated_time_min: 45,
    passes: [
      { type: 'rough', offset_mm: 0.14 },
      { type: 'skim', offset_mm: 0.13 },
    ],
  })),
  wireEdmOcr: vi.fn(() => Promise.resolve({
    text: 'Extracted text from drawing',
    confidence: 0.95,
    dimensions: [{ label: 'Width', value: 50, unit: 'mm' }],
  })),
  wireEdmParseGeometry: vi.fn(() => Promise.resolve({
    contours: [
      { id: 'C1', is_closed: true, perimeter_mm: 200 },
    ],
    bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
    total_perimeter_mm: 200,
  })),
  tribalSearch: vi.fn(() => Promise.resolve({
    tips: [
      { id: 'tip1', title: 'Wire tension for tool steel', body: 'Use 12-15N wire tension for D2 tool steel', category: 'wedm', confidence: 0.85 },
      { id: 'tip2', title: 'Thick section flushing', body: 'Increase flush pressure for parts over 50mm', category: 'wedm', confidence: 0.90 },
    ],
  })),
  wedmSafetyEnvelope: vi.fn(() => Promise.resolve({
    data: {
      score: 0.92,
      level: 'safe',
      factors: [
        { name: 'current_density', value: 8.5, threshold: 12, status: 'ok' },
        { name: 'wire_tension', value: 14, threshold: 20, status: 'ok' },
      ],
      last_updated: '2026-04-18T10:30:00Z',
      violations: [],
    },
  })),
  wedmAutonomyStatus: vi.fn(() => Promise.resolve({
    data: {
      level: 2,
      level_label: 'L2 Partial',
      confidence: 0.85,
      can_promote: true,
      active_rules: ['wire_break_detection', 'servo_adjust'],
    },
  })),
  // U-WEDM-LIVE-ROUTES: the PRODUCTION shape -- the 5 components the degradation model
  // actually tracks (the old wire_spool/guide/power_feed mock matched no engine).
  wedmRulStatus: vi.fn(() => Promise.resolve({
    data: {
      components: [
        { component: 'guide_wear', label: 'Wire Guides', rul_pct: 60, hours_remaining: 180, band: 'planned' },
        { component: 'wire_erosion', label: 'Wire Erosion', rul_pct: 75, hours_remaining: null, band: 'healthy' },
        { component: 'filter_capacity', label: 'Filter Capacity', rul_pct: 45, hours_remaining: 135, band: 'soon' },
        { component: 'filter_clogging', label: 'Filter Clogging', rul_pct: 88, hours_remaining: null, band: 'healthy' },
        { component: 'wire_fatigue', label: 'Wire Fatigue', rul_pct: 92, hours_remaining: null, band: 'healthy' },
      ],
      worst_component: 'filter_capacity',
      worst_band: 'soon',
      last_updated: '2026-04-18T10:30:00Z',
    },
  })),
  wedmMaintenanceStatus: vi.fn(() => Promise.resolve({
    data: {
      items: [
        { id: 'm1', component: 'Wire Guide', type: 'predictive', due_date: '2026-04-25', priority: 'medium', description: 'Replace upper wire guide', estimated_downtime_min: 30 },
        { id: 'm2', component: 'Dielectric Filter', type: 'scheduled', due_date: '2026-04-28', priority: 'low', description: 'Filter replacement', estimated_downtime_min: 15 },
      ],
      next_scheduled: '2026-04-25T09:00:00Z',
      overdue_count: 0,
    },
  })),
  wedmCodePreview: vi.fn(() => Promise.resolve({
    data: {
      program: `; Wire EDM Program
O0001
N10 G21 G90 G40
N20 E5 C3 T8 H12
N30 G92 X0.0 Y0.0
N40 M60
N50 G01 X10.0 Y0.0 F2.5
N60 G01 X10.0 Y10.0
N70 G01 X0.0 Y10.0
N80 G01 X0.0 Y0.0
N90 M61
N100 M30`,
      controller: 'mitsubishi',
      line_count: 12,
      estimated_time_min: 45.2,
      registers: { E: 5, C: 3, T: 8, H: 12 },
    },
  })),
  wedmApprovalStatus: vi.fn(() => Promise.resolve({
    data: {
      approved: false,
      requires_approval: true,
      approval_reason: 'Operator approval required for ERP actions',
    },
  })),
  wedmRequestApproval: vi.fn(() => Promise.resolve({
    data: {
      approved: true,
      approver: 'John Smith',
      approved_at: '2026-04-19T10:30:00Z',
      requires_approval: true,
    },
  })),
  ApiError: class ApiError extends Error {},
}));

// Mock workspace components
vi.mock('../components/workspace/WorkspaceRecoveryScaffold', () => ({
  WorkspaceRecoveryScaffold: ({ children, title, description }: {
    children: React.ReactNode;
    title: string;
    description: string;
  }) => (
    <div data-testid="workspace-scaffold">
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
}));

vi.mock('../components/workspace/WorkspacePrimitives', () => ({
  ActionButton: ({ children, onClick, disabled, tone, ...rest }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    tone?: string;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} disabled={disabled} data-tone={tone} {...rest}>
      {children}
    </button>
  ),
  Field: ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
  Input: ({ value, onChange, inputMode }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    inputMode?: string;
  }) => (
    <input value={value} onChange={onChange} data-inputmode={inputMode} />
  ),
  Select: ({ value, onChange, children, ...rest }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    children: React.ReactNode;
  }) => (
    <select value={value} onChange={onChange} {...rest}>
      {children}
    </select>
  ),
  PanelCard: ({ title, subtitle, children }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="panel-card">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </div>
  ),
  StatusPill: ({ label, tone }: { label: string; tone: string }) => (
    <span data-testid="status-pill" data-tone={tone}>{label}</span>
  ),
}));

// Lazy imports
let WireEdmWizardPage: React.FC;
let WireEdmUploadPage: React.FC;

beforeAll(async () => {
  const wizard = await import('../pages/WireEdmWizardPage');
  WireEdmWizardPage = wizard.WireEdmWizardPage;
  const upload = await import('../pages/WireEdmUploadPage');
  WireEdmUploadPage = upload.WireEdmUploadPage;
});

function wrap(ui: React.ReactElement, initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="*" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

// ============================================================================
// WireEdmWizardPage Tests
// ============================================================================
describe('WireEdmWizardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders wizard page with title', () => {
    wrap(<WireEdmWizardPage />);
    expect(screen.getByText('Wire EDM Wizard')).toBeInTheDocument();
  });

  it('renders input fields for material, thickness, quantity, tolerance', () => {
    wrap(<WireEdmWizardPage />);

    expect(screen.getByText('Material')).toBeInTheDocument();
    expect(screen.getByText('Thickness (mm)')).toBeInTheDocument();
    expect(screen.getByText('Quantity')).toBeInTheDocument();
    expect(screen.getByText('Tolerance (in)')).toBeInTheDocument();
  });

  it('has default material value', () => {
    wrap(<WireEdmWizardPage />);

    const select = screen.getByTestId('material-select');
    expect(select).toHaveValue('A2 Tool Steel');
  });

  it('shows solve button', () => {
    wrap(<WireEdmWizardPage />);
    expect(screen.getByText('Solve wizard')).toBeInTheDocument();
  });

  it('shows status pill in ready state initially', () => {
    wrap(<WireEdmWizardPage />);

    const statusPill = screen.getByTestId('status-pill');
    expect(statusPill).toHaveTextContent('Ready');
    expect(statusPill).toHaveAttribute('data-tone', 'emerald');
  });

  it('calls solveWireEdmWizard on button click', async () => {
    const { solveWireEdmWizard } = await import('../api/client');
    wrap(<WireEdmWizardPage />);

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(solveWireEdmWizard).toHaveBeenCalled();
    });
  });

  it('displays solution after successful solve', async () => {
    wrap(<WireEdmWizardPage />);

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      // Should show "View Results" button after solve
      expect(screen.getByText('View Results →')).toBeInTheDocument();
    });
  });

  it('shows working status while solving', async () => {
    wrap(<WireEdmWizardPage />);

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    // During loading, status should show Working
    const statusPill = screen.getByTestId('status-pill');
    expect(statusPill).toBeInTheDocument();
  });

  it('renders notes textarea', () => {
    wrap(<WireEdmWizardPage />);
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('accepts launch state from navigation', () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            materialName: 'D2 Tool Steel',
            stockThicknessMm: 25,
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Material should be D2 Tool Steel from state (now a select)
    const select = screen.getByTestId('material-select');
    expect(select).toHaveValue('D2 Tool Steel');
  });
});

// ============================================================================
// WireEdmUploadPage Tests
// ============================================================================
describe('WireEdmUploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload page with title', () => {
    wrap(<WireEdmUploadPage />);
    expect(screen.getByText('Wire EDM Upload')).toBeInTheDocument();
  });

  it('renders file name input', () => {
    wrap(<WireEdmUploadPage />);
    expect(screen.getByText('File Name')).toBeInTheDocument();
  });

  it('has default file name', () => {
    wrap(<WireEdmUploadPage />);

    const inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('wire-edm-input.txt');
  });

  it('renders source text textarea', () => {
    wrap(<WireEdmUploadPage />);
    expect(screen.getByText('Source Text')).toBeInTheDocument();
  });

  it('shows OCR and geometry buttons', () => {
    wrap(<WireEdmUploadPage />);

    expect(screen.getByText('Run OCR')).toBeInTheDocument();
    expect(screen.getByText('Parse geometry')).toBeInTheDocument();
  });

  it('disables buttons when no source text', () => {
    wrap(<WireEdmUploadPage />);

    const ocrButton = screen.getByText('Run OCR');
    const geometryButton = screen.getByText('Parse geometry');

    expect(ocrButton).toBeDisabled();
    expect(geometryButton).toBeDisabled();
  });

  it('enables buttons when source text is entered', () => {
    wrap(<WireEdmUploadPage />);

    const textarea = screen.getByPlaceholderText(/Paste OCR source text/);
    fireEvent.change(textarea, { target: { value: 'test content' } });

    const ocrButton = screen.getByText('Run OCR');
    const geometryButton = screen.getByText('Parse geometry');

    expect(ocrButton).not.toBeDisabled();
    expect(geometryButton).not.toBeDisabled();
  });

  it('calls wireEdmOcr on OCR button click', async () => {
    const { wireEdmOcr } = await import('../api/client');
    wrap(<WireEdmUploadPage />);

    const textarea = screen.getByPlaceholderText(/Paste OCR source text/);
    fireEvent.change(textarea, { target: { value: 'test content' } });

    const ocrButton = screen.getByText('Run OCR');
    fireEvent.click(ocrButton);

    await waitFor(() => {
      expect(wireEdmOcr).toHaveBeenCalled();
    });
  });

  it('calls wireEdmParseGeometry on parse button click', async () => {
    const { wireEdmParseGeometry } = await import('../api/client');
    wrap(<WireEdmUploadPage />);

    const textarea = screen.getByPlaceholderText(/Paste OCR source text/);
    fireEvent.change(textarea, { target: { value: 'test geometry data' } });

    const parseButton = screen.getByText('Parse geometry');
    fireEvent.click(parseButton);

    await waitFor(() => {
      expect(wireEdmParseGeometry).toHaveBeenCalled();
    });
  });

  it('shows continue to wizard button after geometry parse', async () => {
    wrap(<WireEdmUploadPage />);

    const textarea = screen.getByPlaceholderText(/Paste OCR source text/);
    fireEvent.change(textarea, { target: { value: 'test geometry data' } });

    const parseButton = screen.getByText('Parse geometry');
    fireEvent.click(parseButton);

    await waitFor(() => {
      expect(screen.getByText('Continue to Wizard →')).toBeInTheDocument();
    });
  });

  it('shows status pill in ready state initially', () => {
    wrap(<WireEdmUploadPage />);

    const statusPill = screen.getByTestId('status-pill');
    expect(statusPill).toHaveTextContent('Ready');
  });

  it('renders panel cards', () => {
    wrap(<WireEdmUploadPage />);

    const panels = screen.getAllByTestId('panel-card');
    expect(panels.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// Navigation Flow Tests
// ============================================================================
describe('Wire EDM Navigation Flow', () => {
  it('wizard page has View Results navigation button after solve', async () => {
    wrap(<WireEdmWizardPage />);

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      const viewResultsButton = screen.getByText(/View Results/);
      expect(viewResultsButton).toBeInTheDocument();
      expect(viewResultsButton).toHaveAttribute('data-tone', 'cyan');
    });
  });

  it('upload page has Continue to Wizard navigation after geometry parse', async () => {
    wrap(<WireEdmUploadPage />);

    const textarea = screen.getByPlaceholderText(/Paste OCR source text/);
    fireEvent.change(textarea, { target: { value: 'test data' } });

    const parseButton = screen.getByText('Parse geometry');
    fireEvent.click(parseButton);

    await waitFor(() => {
      const continueButton = screen.getByText('Continue to Wizard →');
      expect(continueButton).toBeInTheDocument();
      expect(continueButton).toHaveAttribute('data-tone', 'cyan');
    });
  });
});

// ============================================================================
// WireEdmWizardPage DXF Upload Tests (U-P2PFS29)
// ============================================================================
describe('WireEdmWizardPage DXF Upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders DXF drop zone', () => {
    wrap(<WireEdmWizardPage />);
    expect(screen.getByTestId('dxf-drop-zone')).toBeInTheDocument();
  });

  it('renders geometry upload panel', () => {
    wrap(<WireEdmWizardPage />);
    expect(screen.getByText('Geometry upload')).toBeInTheDocument();
  });

  it('shows drop instructions when no file uploaded', () => {
    wrap(<WireEdmWizardPage />);
    expect(screen.getByText(/Drop DXF\/DWG\/SVG here/)).toBeInTheDocument();
  });

  it('shows file input for DXF files', () => {
    wrap(<WireEdmWizardPage />);
    const input = screen.getByTestId('dxf-file-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('accept', '.dxf,.dwg,.svg');
  });

  it('displays geometry summary when geometry is in launch state', () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [
                { id: 'C1', is_closed: true, perimeter_mm: 200 },
                { id: 'C2', is_closed: false, perimeter_mm: 50 },
              ],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 250,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('geometry-summary')).toBeInTheDocument();
    // Check for closed/open label showing "1 closed, 1 open"
    expect(screen.getByText(/1 closed, 1 open/)).toBeInTheDocument();
    // Check perimeter label exists
    expect(screen.getByText('Perimeter')).toBeInTheDocument();
  });

  it('shows geometry summary with contour count', () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 200,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Geometry summary should be displayed
    expect(screen.getByTestId('geometry-summary')).toBeInTheDocument();
    // Contour label
    expect(screen.getByText('Contours')).toBeInTheDocument();
  });

  it('calls wireEdmParseGeometry when DXF file is uploaded via input', async () => {
    const { wireEdmParseGeometry } = await import('../api/client');
    wrap(<WireEdmWizardPage />);

    const input = screen.getByTestId('dxf-file-input');
    const file = new File(['test content'], 'test.dxf', { type: 'application/octet-stream' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(wireEdmParseGeometry).toHaveBeenCalled();
    });
  });

  it('shows clear button when geometry is loaded', () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 200,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('includes geometry in solve request when available', async () => {
    const { solveWireEdmWizard, wireEdmParseGeometry } = await import('../api/client');
    vi.mocked(wireEdmParseGeometry).mockResolvedValue({
      contours: [{ id: 'C1', is_closed: true, perimeter_mm: 100 }],
      bounding_box: { min_x: 0, min_y: 0, max_x: 25, max_y: 25 },
      total_perimeter_mm: 100,
    });

    wrap(<WireEdmWizardPage />);

    // Upload a DXF file
    const input = screen.getByTestId('dxf-file-input');
    const file = new File(['test'], 'test.dxf', { type: 'application/octet-stream' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(wireEdmParseGeometry).toHaveBeenCalled();
    });

    // Now solve
    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(solveWireEdmWizard).toHaveBeenCalledWith(
        expect.objectContaining({
          geometry: expect.objectContaining({
            total_perimeter_mm: 100,
          }),
        })
      );
    });
  });
});

// ============================================================================
// WireEdmWizardPage Material Dropdown Tests (U-P2PFS30)
// ============================================================================
describe('WireEdmWizardPage Material Dropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders material select dropdown', () => {
    wrap(<WireEdmWizardPage />);
    const select = screen.getByTestId('material-select');
    expect(select).toBeInTheDocument();
    expect(select.tagName.toLowerCase()).toBe('select');
  });

  it('shows skim pass recommendation panel', () => {
    wrap(<WireEdmWizardPage />);
    expect(screen.getByTestId('skim-pass-recommendation')).toBeInTheDocument();
  });

  it('displays AI Skim Pass Recommendation heading', () => {
    wrap(<WireEdmWizardPage />);
    expect(screen.getByText('AI Skim Pass Recommendation')).toBeInTheDocument();
  });

  it('shows recommended passes label', () => {
    wrap(<WireEdmWizardPage />);
    expect(screen.getByText('Recommended Passes')).toBeInTheDocument();
  });

  it('shows target Ra label', () => {
    wrap(<WireEdmWizardPage />);
    expect(screen.getByText('Target Ra')).toBeInTheDocument();
  });

  it('changes skim pass recommendation when material changes', () => {
    wrap(<WireEdmWizardPage />);

    const select = screen.getByTestId('material-select');

    // Change to Tungsten Carbide (which has more skim passes)
    fireEvent.change(select, { target: { value: 'Tungsten Carbide' } });

    // Should show carbide-specific recommendation
    expect(screen.getByText(/Decay Factor/)).toBeInTheDocument();
  });
});

// ============================================================================
// WireEdmWizardPage Tribal Tips Tests (U-P2PFS31)
// ============================================================================
describe('WireEdmWizardPage Tribal Tips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tribal knowledge panel', async () => {
    wrap(<WireEdmWizardPage />);
    await waitFor(() => {
      expect(screen.getByText('Tribal Knowledge')).toBeInTheDocument();
    });
  });

  it('calls tribalSearch on mount', async () => {
    const { tribalSearch } = await import('../api/client');
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(tribalSearch).toHaveBeenCalled();
    });
  });

  it('displays tribal tips after loading', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('tribal-tips-list')).toBeInTheDocument();
    });

    expect(screen.getByText('Wire tension for tool steel')).toBeInTheDocument();
  });

  it('shows tip confidence when available', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      // Check within the tribal tips list for the 85% confidence
      const tipsList = screen.getByTestId('tribal-tips-list');
      expect(tipsList).toHaveTextContent('85%');
    });
  });

  it('reloads tips when material changes', async () => {
    const { tribalSearch } = await import('../api/client');
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(tribalSearch).toHaveBeenCalledTimes(1);
    });

    const select = screen.getByTestId('material-select');
    fireEvent.change(select, { target: { value: 'Tungsten Carbide' } });

    await waitFor(() => {
      expect(tribalSearch).toHaveBeenCalledTimes(2);
    });
  });

  it('shows empty message when no tips found', async () => {
    const { tribalSearch } = await import('../api/client');
    vi.mocked(tribalSearch).mockResolvedValue({ tips: [] });

    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('tribal-tips-empty')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// WireEdmWizardPage Safety Badge + Autonomy Indicator Tests (U-P2PFS32)
// ============================================================================
describe('WireEdmWizardPage Safety Badge + Autonomy Indicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders status bar', async () => {
    wrap(<WireEdmWizardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('wedm-status-bar')).toBeInTheDocument();
    });
  });

  it('calls wedmSafetyEnvelope on mount', async () => {
    const { wedmSafetyEnvelope } = await import('../api/client');
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(wedmSafetyEnvelope).toHaveBeenCalled();
    });
  });

  it('calls wedmAutonomyStatus on mount', async () => {
    const { wedmAutonomyStatus } = await import('../api/client');
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(wedmAutonomyStatus).toHaveBeenCalled();
    });
  });

  it('displays safety badge after loading', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('safety-badge')).toBeInTheDocument();
    });
  });

  it('displays autonomy indicator after loading', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('autonomy-indicator')).toBeInTheDocument();
    });
  });

  it('shows safety score percentage', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      // 0.92 → 92%
      expect(screen.getByText('92')).toBeInTheDocument();
    });
  });

  it('shows S(x) Safe label for safe level', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(screen.getByText('S(x) Safe')).toBeInTheDocument();
    });
  });

  it('shows autonomy level label', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(screen.getByText('L2 Partial')).toBeInTheDocument();
    });
  });

  it('shows autonomy confidence percentage', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      // 0.85 → 85% - check within the autonomy indicator
      const indicator = screen.getByTestId('autonomy-indicator');
      expect(indicator).toHaveTextContent('85%');
    });
  });

  it('shows ready badge when can_promote is true', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Ready/)).toBeInTheDocument();
    });
  });

  it('shows loading state initially before data arrives', async () => {
    const { wedmSafetyEnvelope, wedmAutonomyStatus, wedmRulStatus, wedmMaintenanceStatus } = await import('../api/client');

    // Make API calls hang
    vi.mocked(wedmSafetyEnvelope).mockImplementation(() => new Promise(() => {}));
    vi.mocked(wedmAutonomyStatus).mockImplementation(() => new Promise(() => {}));
    vi.mocked(wedmRulStatus).mockImplementation(() => new Promise(() => {}));
    vi.mocked(wedmMaintenanceStatus).mockImplementation(() => new Promise(() => {}));

    wrap(<WireEdmWizardPage />);

    // Should show loading indicators
    expect(screen.getByTestId('safety-badge-loading')).toBeInTheDocument();
    expect(screen.getByTestId('autonomy-indicator-loading')).toBeInTheDocument();
  });
});

// ============================================================================
// WireEdmWizardPage RUL Gauge + Maintenance Advisory Tests (U-P2PFS33)
// ============================================================================
describe('WireEdmWizardPage RUL Gauge + Maintenance Advisory', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Restore ALL mocks needed for component mount (not just RUL/maintenance)
    const {
      tribalSearch,
      wedmSafetyEnvelope,
      wedmAutonomyStatus,
      wedmRulStatus,
      wedmMaintenanceStatus,
    } = await import('../api/client');

    vi.mocked(tribalSearch).mockResolvedValue({
      tips: [
        { id: 'tip1', title: 'Wire tension for tool steel', body: 'Use 12-15N', category: 'wedm', confidence: 0.85 },
      ],
    } as any);
    vi.mocked(wedmSafetyEnvelope).mockResolvedValue({
      data: {
        score: 0.92,
        level: 'safe',
        factors: [],
        last_updated: '2026-04-18T10:30:00Z',
        violations: [],
      },
    } as any);
    vi.mocked(wedmAutonomyStatus).mockResolvedValue({
      data: {
        level: 2,
        level_label: 'L2 Partial',
        confidence: 0.85,
        can_promote: true,
        active_rules: [],
      },
    } as any);
    // U-WEDM-LIVE-ROUTES production shape (see module mock above).
    vi.mocked(wedmRulStatus).mockResolvedValue({
      data: {
        components: [
          { component: 'guide_wear', label: 'Wire Guides', rul_pct: 60, hours_remaining: 180, band: 'planned' },
          { component: 'wire_erosion', label: 'Wire Erosion', rul_pct: 75, hours_remaining: null, band: 'healthy' },
          { component: 'filter_capacity', label: 'Filter Capacity', rul_pct: 45, hours_remaining: 135, band: 'soon' },
          { component: 'filter_clogging', label: 'Filter Clogging', rul_pct: 88, hours_remaining: null, band: 'healthy' },
          { component: 'wire_fatigue', label: 'Wire Fatigue', rul_pct: 92, hours_remaining: null, band: 'healthy' },
        ],
        worst_component: 'filter_capacity',
        worst_band: 'soon',
        last_updated: '2026-04-18T10:30:00Z',
      },
    } as any);
    vi.mocked(wedmMaintenanceStatus).mockResolvedValue({
      data: {
        items: [
          { id: 'm1', component: 'Wire Guide', type: 'predictive', due_date: '2026-04-25', priority: 'medium', description: 'Replace upper wire guide', estimated_downtime_min: 30 },
          { id: 'm2', component: 'Dielectric Filter', type: 'scheduled', due_date: '2026-04-28', priority: 'low', description: 'Filter replacement', estimated_downtime_min: 15 },
        ],
        next_scheduled: '2026-04-25T09:00:00Z',
        overdue_count: 0,
      },
    } as any);
  });

  it('renders RUL + maintenance panel', async () => {
    wrap(<WireEdmWizardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('rul-maintenance-panel')).toBeInTheDocument();
    });
  });

  it("renders '--' confidence when absent (the PRODUCTION wire: the live route never emits confidence)", async () => {
    const { wedmAutonomyStatus } = await import('../api/client');
    // The real /wedm-live/autonomy adapter intentionally omits confidence (no honest
    // source field in AutonomyStatusSnapshot) -- this is the only branch prod exercises.
    vi.mocked(wedmAutonomyStatus).mockResolvedValue({
      data: { level: 2, level_label: 'L2 Partial', can_promote: false, active_rules: [] },
    } as any);
    wrap(<WireEdmWizardPage />);
    await waitFor(() => {
      expect(screen.getByText('Confidence')).toBeInTheDocument();
      expect(screen.getByText('--')).toBeInTheDocument();
    });
  });

  it('calls wedmRulStatus on mount', async () => {
    const { wedmRulStatus } = await import('../api/client');
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(wedmRulStatus).toHaveBeenCalled();
    });
  });

  it('calls wedmMaintenanceStatus on mount', async () => {
    const { wedmMaintenanceStatus } = await import('../api/client');
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(wedmMaintenanceStatus).toHaveBeenCalled();
    });
  });

  it('displays RUL gauge after loading', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('rul-gauge')).toBeInTheDocument();
    });
  });

  it('displays maintenance advisory after loading', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('maintenance-advisory')).toBeInTheDocument();
    });
  });

  it('shows RUL heading', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(screen.getByText('Remaining Useful Life (RUL)')).toBeInTheDocument();
    });
  });

  it('shows maintenance heading', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(screen.getByText('Maintenance Advisory')).toBeInTheDocument();
    });
  });

  it('shows per-component RUL percentages (the degradation model components)', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      const rulGauge = screen.getByTestId('rul-gauge');
      expect(rulGauge).toHaveTextContent('Wire Guides');
      expect(rulGauge).toHaveTextContent('60%');
      expect(rulGauge).toHaveTextContent('Filter Capacity');
      expect(rulGauge).toHaveTextContent('45%');
    });
  });

  it('shows hours remaining, and the honest not-aging state when there is no usage feed', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      const rulGauge = screen.getByTestId('rul-gauge');
      expect(rulGauge).toHaveTextContent(/180h remaining/);
      expect(rulGauge).toHaveTextContent(/not aging \(no usage feed\)/);
    });
  });

  it('maps RUL bands to condition chips (planned->fair, soon->worn, healthy->good)', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      const rulGauge = screen.getByTestId('rul-gauge');
      expect(rulGauge).toHaveTextContent('good');
      expect(rulGauge).toHaveTextContent('fair');
      expect(rulGauge).toHaveTextContent('worn');
    });
  });

  it('shows maintenance items', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(screen.getByText('Wire Guide')).toBeInTheDocument();
      expect(screen.getByText('Dielectric Filter')).toBeInTheDocument();
    });
  });

  it('shows maintenance item description', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(screen.getByText('Replace upper wire guide')).toBeInTheDocument();
    });
  });

  it('shows maintenance type badge', async () => {
    wrap(<WireEdmWizardPage />);

    await waitFor(() => {
      expect(screen.getByText('Predictive')).toBeInTheDocument();
      expect(screen.getByText('Scheduled')).toBeInTheDocument();
    });
  });

  it('shows loading state for RUL when data not loaded', async () => {
    const { wedmRulStatus } = await import('../api/client');
    vi.mocked(wedmRulStatus).mockImplementation(() => new Promise(() => {}));

    wrap(<WireEdmWizardPage />);

    expect(screen.getByTestId('rul-gauge-loading')).toBeInTheDocument();
  });

  it('shows loading state for maintenance when data not loaded', async () => {
    const { wedmMaintenanceStatus } = await import('../api/client');
    vi.mocked(wedmMaintenanceStatus).mockImplementation(() => new Promise(() => {}));

    wrap(<WireEdmWizardPage />);

    expect(screen.getByTestId('maintenance-advisory-loading')).toBeInTheDocument();
  });
});

// ============================================================================
// WireEdmWizardPage Controller Code Preview Tests (U-P2PFS34)
// ============================================================================
describe('WireEdmWizardPage Controller Code Preview', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Restore all mocks needed for component mount
    const {
      tribalSearch,
      solveWireEdmWizard,
      wedmSafetyEnvelope,
      wedmAutonomyStatus,
      wedmRulStatus,
      wedmMaintenanceStatus,
      wedmCodePreview,
    } = await import('../api/client');

    vi.mocked(tribalSearch).mockResolvedValue({
      tips: [],
    } as any);
    vi.mocked(solveWireEdmWizard).mockResolvedValue({
      cutting_speed_mm_min: 2.5,
      wire_tension_N: 15,
      pulse_on_us: 8,
      pulse_off_us: 12,
      peak_current_A: 12,
      servo_voltage_V: 45,
      kerf_width_mm: 0.28,
      estimated_time_min: 45,
      passes: [
        { type: 'rough', offset_mm: 0.14 },
        { type: 'skim', offset_mm: 0.13 },
      ],
    } as any);
    vi.mocked(wedmSafetyEnvelope).mockResolvedValue({
      data: { score: 0.92, level: 'safe', factors: [], violations: [] },
    } as any);
    vi.mocked(wedmAutonomyStatus).mockResolvedValue({
      data: { level: 2, level_label: 'L2 Partial', confidence: 0.85, can_promote: true, active_rules: [] },
    } as any);
    vi.mocked(wedmRulStatus).mockResolvedValue({
      data: {
        // U-WEDM-LIVE-ROUTES production shape (5 real degradation components).
        components: [
          { component: 'guide_wear', label: 'Wire Guides', rul_pct: 60, hours_remaining: 180, band: 'planned' },
          { component: 'wire_erosion', label: 'Wire Erosion', rul_pct: 75, hours_remaining: null, band: 'healthy' },
          { component: 'filter_capacity', label: 'Filter Capacity', rul_pct: 45, hours_remaining: 135, band: 'soon' },
          { component: 'filter_clogging', label: 'Filter Clogging', rul_pct: 88, hours_remaining: null, band: 'healthy' },
          { component: 'wire_fatigue', label: 'Wire Fatigue', rul_pct: 92, hours_remaining: null, band: 'healthy' },
        ],
        worst_component: 'filter_capacity',
        worst_band: 'soon',
        last_updated: '2026-04-18T10:30:00Z',
      },
    } as any);
    vi.mocked(wedmMaintenanceStatus).mockResolvedValue({
      data: { items: [], next_scheduled: null, overdue_count: 0 },
    } as any);
    vi.mocked(wedmCodePreview).mockResolvedValue({
      data: {
        program: `; Wire EDM Program
O0001
N10 G21 G90 G40
N20 E5 C3 T8 H12
N30 G92 X0.0 Y0.0
N40 M60
N50 G01 X10.0 Y0.0 F2.5
N60 G01 X10.0 Y10.0
N70 G01 X0.0 Y10.0
N80 G01 X0.0 Y0.0
N90 M61
N100 M30`,
        controller: 'mitsubishi',
        line_count: 12,
        estimated_time_min: 45.2,
        registers: { E: 5, C: 3, T: 8, H: 12 },
      },
    } as any);
  });

  it('shows code preview panel after solve', async () => {
    wrap(<WireEdmWizardPage />);

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByTestId('code-preview-panel')).toBeInTheDocument();
    });
  });

  it('calls wedmCodePreview after solve', async () => {
    const { wedmCodePreview } = await import('../api/client');
    wrap(<WireEdmWizardPage />);

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(wedmCodePreview).toHaveBeenCalled();
    });
  });

  it('shows register display badges', async () => {
    wrap(<WireEdmWizardPage />);

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      const registerDisplay = screen.getByTestId('register-display');
      expect(registerDisplay).toHaveTextContent('E5');
      expect(registerDisplay).toHaveTextContent('C3');
      expect(registerDisplay).toHaveTextContent('T8');
      expect(registerDisplay).toHaveTextContent('H12');
    });
  });

  it('shows copy button', async () => {
    wrap(<WireEdmWizardPage />);

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByTestId('copy-button')).toBeInTheDocument();
    });
  });

  it('shows collapse button', async () => {
    wrap(<WireEdmWizardPage />);

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByTestId('collapse-button')).toBeInTheDocument();
    });
  });

  it('shows code display with syntax highlighting', async () => {
    wrap(<WireEdmWizardPage />);

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      const codeDisplay = screen.getByTestId('code-display');
      expect(codeDisplay).toBeInTheDocument();
      expect(codeDisplay).toHaveTextContent('O0001');
      expect(codeDisplay).toHaveTextContent('G21');
    });
  });

  it('collapses code display when collapse button clicked', async () => {
    wrap(<WireEdmWizardPage />);

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByTestId('code-display')).toBeInTheDocument();
    });

    const collapseButton = screen.getByTestId('collapse-button');
    fireEvent.click(collapseButton);

    await waitFor(() => {
      expect(screen.queryByTestId('code-display')).not.toBeInTheDocument();
    });
  });

  it('shows loading state while generating code', async () => {
    const { wedmCodePreview } = await import('../api/client');
    vi.mocked(wedmCodePreview).mockImplementation(() => new Promise(() => {}));

    wrap(<WireEdmWizardPage />);

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByTestId('code-preview-loading')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// WireEdmWizardPage ERP Panel Tests (U-P2PFS35)
// ============================================================================
describe('WireEdmWizardPage ERP Panel', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Restore all mocks needed for component mount
    const {
      tribalSearch,
      solveWireEdmWizard,
      wireEdmParseGeometry,
      wedmSafetyEnvelope,
      wedmAutonomyStatus,
      wedmRulStatus,
      wedmMaintenanceStatus,
      wedmCodePreview,
      wedmApprovalStatus,
      wedmRequestApproval,
    } = await import('../api/client');

    const { wedmErpApi } = await import('../api/wedmErp');

    vi.mocked(tribalSearch).mockResolvedValue({
      tips: [],
    } as any);
    vi.mocked(solveWireEdmWizard).mockResolvedValue({
      cutting_speed_mm_min: 2.5,
      passes: [{ type: 'rough', offset_mm: 0.14 }],
    } as any);
    vi.mocked(wireEdmParseGeometry).mockResolvedValue({
      contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
      bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
      total_perimeter_mm: 200,
    } as any);
    vi.mocked(wedmSafetyEnvelope).mockResolvedValue({
      data: { score: 0.92, level: 'safe', factors: [], violations: [] },
    } as any);
    vi.mocked(wedmAutonomyStatus).mockResolvedValue({
      data: { level: 2, level_label: 'L2 Partial', confidence: 0.85, can_promote: true, active_rules: [] },
    } as any);
    vi.mocked(wedmRulStatus).mockResolvedValue({
      data: {
        // U-WEDM-LIVE-ROUTES production shape (5 real degradation components).
        components: [
          { component: 'guide_wear', label: 'Wire Guides', rul_pct: 60, hours_remaining: 180, band: 'planned' },
          { component: 'wire_erosion', label: 'Wire Erosion', rul_pct: 75, hours_remaining: null, band: 'healthy' },
          { component: 'filter_capacity', label: 'Filter Capacity', rul_pct: 45, hours_remaining: 135, band: 'soon' },
          { component: 'filter_clogging', label: 'Filter Clogging', rul_pct: 88, hours_remaining: null, band: 'healthy' },
          { component: 'wire_fatigue', label: 'Wire Fatigue', rul_pct: 92, hours_remaining: null, band: 'healthy' },
        ],
        worst_component: 'filter_capacity',
        worst_band: 'soon',
        last_updated: '2026-04-18T10:30:00Z',
      },
    } as any);
    vi.mocked(wedmMaintenanceStatus).mockResolvedValue({
      data: { items: [], next_scheduled: null, overdue_count: 0 },
    } as any);
    vi.mocked(wedmCodePreview).mockResolvedValue({
      data: {
        program: 'O0001\nG21 G90',
        controller: 'mitsubishi',
        line_count: 2,
        estimated_time_min: 10,
        registers: { E: 5, C: 3, T: 8, H: 12 },
      },
    } as any);
    vi.mocked(wedmApprovalStatus).mockResolvedValue({
      data: { approved: true, requires_approval: false },
    } as any);
    vi.mocked(wedmRequestApproval).mockResolvedValue({
      data: { approved: true, approver: 'John Smith', approved_at: '2026-04-19T10:30:00Z', requires_approval: true },
    } as any);
    vi.mocked(wedmErpApi.estimate).mockResolvedValue({
      ok: true,
      data: {
        cost_estimate: { total: 150 },
        quote: { total: 180, line_items: [] },
      },
    } as any);
    vi.mocked(wedmErpApi.quantityBreaks).mockResolvedValue({
      ok: true,
      data: {
        quantity_breaks: [
          { quantity: 1, unit_price: 180, total_price: 180, savings_pct_vs_qty1: 0 },
          { quantity: 5, unit_price: 160, total_price: 800, savings_pct_vs_qty1: 11.1 },
          { quantity: 10, unit_price: 140, total_price: 1400, savings_pct_vs_qty1: 22.2 },
        ],
      },
    } as any);
    vi.mocked(wedmErpApi.jobCreate).mockResolvedValue({
      ok: true,
      data: { job: { jobId: 'JOB-2026-0042' } },
    } as any);
  });

  it('shows ERP panel after solve with geometry', async () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 200,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByTestId('erp-panel')).toBeInTheDocument();
    });
  });

  it('shows Create Quote button', async () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 200,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByText(/Create Quote/)).toBeInTheDocument();
    });
  });

  it('shows Push to Job button', async () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 200,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByText(/Push to Job/)).toBeInTheDocument();
    });
  });

  it('calls estimate and quantityBreaks on Create Quote click', async () => {
    const { wedmErpApi } = await import('../api/wedmErp');

    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 200,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByText(/Create Quote/)).toBeInTheDocument();
    });

    const createQuoteButton = screen.getByText(/Create Quote/);
    fireEvent.click(createQuoteButton);

    await waitFor(() => {
      expect(wedmErpApi.estimate).toHaveBeenCalled();
      expect(wedmErpApi.quantityBreaks).toHaveBeenCalled();
    });
  });

  it('shows quantity breaks table after Create Quote', async () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 200,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByText(/Create Quote/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Create Quote/));

    await waitFor(() => {
      expect(screen.getByTestId('quantity-breaks-table')).toBeInTheDocument();
    });
  });

  it('calls jobCreate on Push to Job click', async () => {
    const { wedmErpApi } = await import('../api/wedmErp');

    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 200,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByText(/Push to Job/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Push to Job/));

    await waitFor(() => {
      expect(wedmErpApi.jobCreate).toHaveBeenCalled();
    });
  });

  it('shows created job info after Push to Job', async () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 200,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByText(/Push to Job/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Push to Job/));

    await waitFor(() => {
      expect(screen.getByTestId('created-job-info')).toBeInTheDocument();
      expect(screen.getByText('JOB-2026-0042')).toBeInTheDocument();
    });
  });

  it('shows View Job button after job creation', async () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 200,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByText(/Push to Job/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Push to Job/));

    await waitFor(() => {
      expect(screen.getByText(/View Job/)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// WireEdmWizardPage Approval Gate + Studio Handoff Tests (U-P2PFS36)
// ============================================================================
describe('WireEdmWizardPage Approval Gate + Studio Handoff', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const {
      tribalSearch,
      solveWireEdmWizard,
      wireEdmParseGeometry,
      wedmSafetyEnvelope,
      wedmAutonomyStatus,
      wedmRulStatus,
      wedmMaintenanceStatus,
      wedmCodePreview,
      wedmApprovalStatus,
      wedmRequestApproval,
    } = await import('../api/client');

    const { wedmErpApi } = await import('../api/wedmErp');

    vi.mocked(tribalSearch).mockResolvedValue({ tips: [] } as any);
    vi.mocked(solveWireEdmWizard).mockResolvedValue({
      cutting_speed_mm_min: 2.5,
      passes: [{ type: 'rough', offset_mm: 0.14 }],
    } as any);
    vi.mocked(wireEdmParseGeometry).mockResolvedValue({
      contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
      bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
      total_perimeter_mm: 200,
    } as any);
    vi.mocked(wedmSafetyEnvelope).mockResolvedValue({
      data: { score: 0.92, level: 'safe', factors: [], violations: [] },
    } as any);
    vi.mocked(wedmAutonomyStatus).mockResolvedValue({
      data: { level: 2, level_label: 'L2 Partial', confidence: 0.85, can_promote: true, active_rules: [] },
    } as any);
    vi.mocked(wedmRulStatus).mockResolvedValue({
      data: {
        // U-WEDM-LIVE-ROUTES production shape (5 real degradation components).
        components: [
          { component: 'guide_wear', label: 'Wire Guides', rul_pct: 60, hours_remaining: 180, band: 'planned' },
          { component: 'wire_erosion', label: 'Wire Erosion', rul_pct: 75, hours_remaining: null, band: 'healthy' },
          { component: 'filter_capacity', label: 'Filter Capacity', rul_pct: 45, hours_remaining: 135, band: 'soon' },
          { component: 'filter_clogging', label: 'Filter Clogging', rul_pct: 88, hours_remaining: null, band: 'healthy' },
          { component: 'wire_fatigue', label: 'Wire Fatigue', rul_pct: 92, hours_remaining: null, band: 'healthy' },
        ],
        worst_component: 'filter_capacity',
        worst_band: 'soon',
        last_updated: '2026-04-18T10:30:00Z',
      },
    } as any);
    vi.mocked(wedmMaintenanceStatus).mockResolvedValue({
      data: { items: [], next_scheduled: null, overdue_count: 0 },
    } as any);
    vi.mocked(wedmCodePreview).mockResolvedValue({
      data: {
        program: 'O0001\nG21 G90',
        controller: 'mitsubishi',
        line_count: 2,
        estimated_time_min: 10,
        registers: { E: 5, C: 3, T: 8, H: 12 },
      },
    } as any);
    vi.mocked(wedmApprovalStatus).mockResolvedValue({
      data: { approved: false, requires_approval: true },
    } as any);
    vi.mocked(wedmRequestApproval).mockResolvedValue({
      data: { approved: true, approver: 'John Smith', approved_at: '2026-04-19T10:30:00Z', requires_approval: true },
    } as any);
    vi.mocked(wedmErpApi.estimate).mockResolvedValue({
      ok: true,
      data: { cost_estimate: { total: 150 }, quote: { total: 180, line_items: [] } },
    } as any);
    vi.mocked(wedmErpApi.quantityBreaks).mockResolvedValue({
      ok: true,
      data: { quantity_breaks: [] },
    } as any);
    vi.mocked(wedmErpApi.jobCreate).mockResolvedValue({
      ok: true,
      data: { job: { jobId: 'JOB-2026-0042' } },
    } as any);
  });

  it('shows Open in Studio button', async () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 200,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByTestId('open-studio-button')).toBeInTheDocument();
    });
  });

  it('shows approval gate when requires approval', async () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 200,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByTestId('approval-gate')).toBeInTheDocument();
    });
  });

  it('hides ERP actions when not approved', async () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 200,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByTestId('approval-gate')).toBeInTheDocument();
    });

    // ERP actions should not be visible
    expect(screen.queryByTestId('erp-actions')).not.toBeInTheDocument();
  });

  it('calls wedmRequestApproval on Request Approval click', async () => {
    const { wedmRequestApproval } = await import('../api/client');

    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 200,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByText('Request Approval')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Request Approval'));

    await waitFor(() => {
      expect(wedmRequestApproval).toHaveBeenCalled();
    });
  });

  it('shows approval confirmed badge after approval', async () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 200,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByText('Request Approval')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Request Approval'));

    await waitFor(() => {
      expect(screen.getByTestId('approval-confirmed')).toBeInTheDocument();
      expect(screen.getByText(/Approved by John Smith/)).toBeInTheDocument();
    });
  });

  it('shows ERP actions after approval', async () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/wire-edm/wizard',
          state: {
            geometry: {
              contours: [{ id: 'C1', is_closed: true, perimeter_mm: 200 }],
              bounding_box: { min_x: 0, min_y: 0, max_x: 50, max_y: 50 },
              total_perimeter_mm: 200,
            },
          },
        }]}
      >
        <Routes>
          <Route path="/wire-edm/wizard" element={<WireEdmWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    const solveButton = screen.getByText('Solve wizard');
    fireEvent.click(solveButton);

    await waitFor(() => {
      expect(screen.getByText('Request Approval')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Request Approval'));

    await waitFor(() => {
      expect(screen.getByTestId('erp-actions')).toBeInTheDocument();
      expect(screen.getByText(/Create Quote/)).toBeInTheDocument();
      expect(screen.getByText(/Push to Job/)).toBeInTheDocument();
    });
  });
});
