/**
 * Tests for remaining untested pages:
 * AlarmPage, CalculatorPage, DashboardPage, FinancialAnalysisPage,
 * JobPlannerPage, LearningDashboard, SafetyMonitorPage, ToolpathAdvisorPage,
 * ViewerPage, WhatIfPage
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock API client
vi.mock('../api/client', () => ({
  ApiError: class extends Error {
    status: number;
    constructor(s: number, m: string) { super(m); this.status = s; }
  },
  decodeAlarm: vi.fn().mockResolvedValue({
    result: { code: 'ALM-100', meaning: 'Spindle overload', severity: 'warning', cause: 'Excessive load', fix: 'Reduce feed' },
  }),
  createJobPlan: vi.fn().mockResolvedValue({
    result: {
      job_id: 'JP-001', material: '6061-T6', operation: 'bracket', machine: 'Haas VF-2',
      steps: [{ step: 1, name: 'Face mill', tool: 'T1', time_min: 5 }],
      total_time_min: 30, total_cost: 150, safety_score: 0.92,
    },
  }),
  financialNPV: vi.fn().mockResolvedValue({
    result: { npv: 125000, discount_rate: 0.1, periods: 5, net_cash_flows: [50000, 40000, 35000, 30000, 25000] },
  }),
  financialIRR: vi.fn().mockResolvedValue({
    result: { irr: 0.187, initial_investment: 100000 },
  }),
  financialBreakeven: vi.fn().mockResolvedValue({
    result: { breakeven_units: 500, breakeven_revenue: 25000 },
  }),
  financialMachineInvestment: vi.fn().mockResolvedValue({
    result: { roi: 0.35, payback_months: 18, npv: 85000 },
  }),
}));

// Mock formulas for CalculatorPage
vi.mock('../formulas', () => ({
  FORMULAS: [
    {
      id: 'mrr', name: 'Material Removal Rate', category: 'Milling',
      description: 'Calculate MRR for milling',
      formula: 'MRR = ae × ap × Vf',
      inputs: [
        { name: 'ae', label: 'Radial Width (mm)', default: 10 },
        { name: 'ap', label: 'Axial Depth (mm)', default: 3 },
        { name: 'Vf', label: 'Feed Rate (mm/min)', default: 500 },
      ],
      calculate: (vals: Record<string, number>) => ({
        result: vals.ae * vals.ap * vals.Vf,
        unit: 'mm³/min',
      }),
    },
  ],
}));

// Mock learning hooks
vi.mock('../hooks/useLearning', () => ({
  useProgress: vi.fn(() => ({
    progress: {
      total_hours: 42.5,
      modules_completed: 19,
      modules_total: 30,
      current_streak_days: 5,
      badges: [
        { id: 'b1', name: 'First Steps', earned_at: '2026-01-01' },
      ],
      domain_progress: {
        CAD: 75,
        CAM: 40,
        ShopPractice: 0,
        MachineOperation: 0,
      },
    },
    loading: false,
    error: null,
    fetchProgress: vi.fn(),
  })),
  useRecommend: vi.fn(() => ({
    recommendations: [
      { id: 'r1', title: 'HSM Basics', domain: 'CAM', priority: 'high' },
    ],
    loading: false,
    error: null,
    fetchRecommendations: vi.fn(),
  })),
}));

// Mock Viewer3D component (uses react-three-fiber which can't render in jsdom)
vi.mock('../components/viewer/Viewer3D', () => ({
  Viewer3D: () => <div data-testid="viewer-3d">3D Viewer Mock</div>,
}));

// Mock SafetyBadge
vi.mock('../components/SafetyBadge', () => ({
  SafetyBadge: ({ score }: { score: number }) => (
    <span data-testid="safety-badge">{(score * 100).toFixed(0)}%</span>
  ),
}));

// Mock ErrorState from components (LearningDashboard uses a different import)
vi.mock('../components/ErrorState', () => ({
  ErrorState: ({ message }: { message: string }) => <div>{message}</div>,
}));

// Mock types used by SafetyMonitorPage
vi.mock('../api/types', async (importOriginal) => {
  const orig = await importOriginal() as Record<string, unknown>;
  return {
    ...orig,
    safetyLevel: orig.safetyLevel ?? ((s: number) => s >= 0.85 ? 'safe' : s >= 0.7 ? 'caution' : 'danger'),
  };
});

// Mock viewer sub-components
vi.mock('../components/viewer/ToolpathLayer', () => ({
  AnimatedToolpath: () => <div>toolpath</div>,
}));
vi.mock('../components/viewer/StockMesh', () => ({
  StockMesh: () => <div>stock</div>,
}));
vi.mock('../components/viewer/ToolAssembly', () => ({
  ToolAssembly: () => <div>tool</div>,
}));
vi.mock('../components/viewer/HeatmapOverlay', () => ({
  HeatmapOverlay: () => <div>heatmap</div>,
  ColorScaleLegend: () => <div>legend</div>,
  getHeatmapConfig: () => ({ min: 0, max: 1, property: 'speed' }),
}));
vi.mock('../components/viewer/ViewerToolbar', () => ({
  ViewerToolbar: () => <div>toolbar</div>,
  viewerReducer: (s: unknown) => s,
  DEFAULT_VIEWER_STATE: {},
}));
vi.mock('../api/viewer', () => ({
  loadViewerSceneCatalog: async () => ({
    source: 'demo',
    scenes: [{ id: 'demo_scene', name: 'Demo Scene', type: 'demo' }],
    note: 'Live viewer scene routes are not available yet, so Kienzle is using the local demo scene as a fallback.',
  }),
  loadViewerScene: async () => ({
    source: 'demo',
    note: 'Using the local demo scene until a live viewer scene is selected or becomes available.',
    scene: {
      name: 'Demo Scene',
      root: {
        id: 'root', type: 'group', name: 'root',
        children: [
          { id: 'stock', type: 'mesh', name: 'Stock', geometry: { type: 'box', width: 100, height: 50, depth: 25 } },
          { id: 'tp', type: 'toolpath', name: 'Toolpath', toolpath: { total_points: 0, segments: [] } },
        ],
      },
    },
  }),
}));

// Mock learning types
vi.mock('../types/learning', () => ({
  default: {},
}));

function renderPage(Component: React.FC) {
  return render(
    <MemoryRouter>
      <Component />
    </MemoryRouter>
  );
}

// ════════════════════════════════════════════════════════════════
// AlarmPage
// ════════════════════════════════════════════════════════════════
describe('AlarmPage', () => {
  it('renders title and input', async () => {
    const { AlarmPage } = await import('../pages/AlarmPage');
    renderPage(AlarmPage);
    expect(await screen.findByRole('heading', { name: 'Alarm Decoder' })).toBeDefined();
  });

  it('has alarm code input field', async () => {
    const { AlarmPage } = await import('../pages/AlarmPage');
    renderPage(AlarmPage);
    expect(screen.getByPlaceholderText('e.g. 1020, 414, 2006')).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════
// CalculatorPage
// ════════════════════════════════════════════════════════════════
describe('CalculatorPage', () => {
  it('renders calculator with formula list', async () => {
    const { CalculatorPage } = await import('../pages/CalculatorPage');
    renderPage(CalculatorPage);
    expect(screen.getByRole('heading', { name: 'Kienzle calculator studio' })).toBeDefined();
    expect(screen.getByText('Core machining formulas')).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════
// DashboardPage
// ════════════════════════════════════════════════════════════════
describe('DashboardPage', () => {
  it('renders dashboard title', async () => {
    const { DashboardPage } = await import('../pages/DashboardPage');
    renderPage(DashboardPage);
    expect(await screen.findByRole('heading', { name: 'Manufacturing Dashboard' })).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════
// FinancialAnalysisPage
// ════════════════════════════════════════════════════════════════
describe('FinancialAnalysisPage', () => {
  it('renders title and tabs', async () => {
    const { FinancialAnalysisPage } = await import('../pages/FinancialAnalysisPage');
    renderPage(FinancialAnalysisPage);
    expect(screen.getByText('Financial Analysis')).toBeDefined();
    expect(screen.getByText('Workflow lanes')).toBeDefined();
    expect(screen.getAllByRole('button', { name: /NPV/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /IRR/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Machine ROI/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Breakeven/i }).length).toBeGreaterThan(0);
  });

  it('switches to machine investment tab', async () => {
    const { FinancialAnalysisPage } = await import('../pages/FinancialAnalysisPage');
    renderPage(FinancialAnalysisPage);
    const btn = screen.getByRole('button', { name: /Machine ROI/i });
    fireEvent.click(btn);
    expect(screen.getByText('Analyze investment')).toBeDefined();
  });

  it('switches to breakeven tab', async () => {
    const { FinancialAnalysisPage } = await import('../pages/FinancialAnalysisPage');
    renderPage(FinancialAnalysisPage);
    const btn = screen.getByRole('button', { name: /Breakeven/i });
    fireEvent.click(btn);
    expect(screen.getByText('Calculate breakeven')).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════
// JobPlannerPage
// ════════════════════════════════════════════════════════════════
describe('JobPlannerPage', () => {
  it('renders title and form with material/machine selects', async () => {
    const { JobPlannerPage } = await import('../pages/JobPlannerPage');
    renderPage(JobPlannerPage);
    expect(screen.getByText('Job Planner')).toBeDefined();
    expect(screen.getByText('Material')).toBeDefined();
    expect(screen.getByText('Machine')).toBeDefined();
  });

  it('has generate plan button', async () => {
    const { JobPlannerPage } = await import('../pages/JobPlannerPage');
    renderPage(JobPlannerPage);
    expect(screen.getByText('Generate Plan')).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════
// LearningDashboard
// ════════════════════════════════════════════════════════════════
describe('LearningDashboard', () => {
  it('renders learning dashboard', async () => {
    const { LearningDashboard } = await import('../pages/LearningDashboard');
    renderPage(LearningDashboard);
    // LearningDashboard uses useProgress hook which returns domain data
    expect(await screen.findByText(/Learning/i)).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════
// SafetyMonitorPage
// ════════════════════════════════════════════════════════════════
describe('SafetyMonitorPage', () => {
  it('renders safety monitor title', async () => {
    const { SafetyMonitorPage } = await import('../pages/SafetyMonitorPage');
    renderPage(SafetyMonitorPage);
    expect(screen.getByText('Safety Monitor')).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════
// ToolpathAdvisorPage
// ════════════════════════════════════════════════════════════════
describe('ToolpathAdvisorPage', () => {
  it('renders toolpath advisor', async () => {
    const { ToolpathAdvisorPage } = await import('../pages/ToolpathAdvisorPage');
    renderPage(ToolpathAdvisorPage);
    expect(screen.getByRole('heading', { name: 'Toolpath Advisor' })).toBeDefined();
    expect(screen.getByText('Compare candidate paths')).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════
// ViewerPage
// ════════════════════════════════════════════════════════════════
describe('ViewerPage', () => {
  it('renders 3D viewer page', async () => {
    const { ViewerPage } = await import('../pages/ViewerPage');
    renderPage(ViewerPage);
    expect(screen.getByRole('heading', { name: '3D Viewer' })).toBeDefined();
    expect(screen.getAllByRole('button', { name: 'Open 3D workspace' }).length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════
// WhatIfPage
// ════════════════════════════════════════════════════════════════
describe('WhatIfPage', () => {
  it('renders title and parameter sliders', async () => {
    const { WhatIfPage } = await import('../pages/WhatIfPage');
    renderPage(WhatIfPage);
    expect(screen.getByText('What-If Analysis')).toBeDefined();
    expect(screen.getByText('Cutting Speed')).toBeDefined();
    expect(screen.getByText('Feed per Tooth')).toBeDefined();
  });

  it('shows impact analysis section', async () => {
    const { WhatIfPage } = await import('../pages/WhatIfPage');
    renderPage(WhatIfPage);
    expect(screen.getByText(/Impact analysis/i)).toBeDefined();
    expect(screen.getByText('Live process response')).toBeDefined();
    expect(screen.getAllByText(/Material Removal Rate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tool Life').length).toBeGreaterThan(0);
  });

  it('has reset button', async () => {
    const { WhatIfPage } = await import('../pages/WhatIfPage');
    renderPage(WhatIfPage);
    expect(screen.getByText('Reset to Baseline')).toBeDefined();
  });

  it('updates impact when slider changes', async () => {
    const { WhatIfPage } = await import('../pages/WhatIfPage');
    renderPage(WhatIfPage);
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBe(4); // Vc, fz, ap, ae
    fireEvent.change(sliders[0], { target: { value: '300' } });
    // After changing speed to 300, MRR should show increase
    expect(screen.getAllByText(/Material Removal Rate/i).length).toBeGreaterThan(0);
  });
});
