/**
 * Core Pages — Unit tests
 *
 * Tests AlarmPage, ReportsPage, JobPlannerPage, ToolpathAdvisorPage, WhatIfPage.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock API client
vi.mock('../api/client', () => ({
  decodeAlarm: vi.fn(() => Promise.resolve({
    result: {
      code: '1020',
      description: 'Servo alarm: X-axis overflow',
      severity: 'critical',
      causes: ['Axis travel exceeded', 'Encoder malfunction'],
      remediation: ['Check axis limits', 'Inspect encoder cable'],
    },
    safety: { score: 0.9, warnings: [] },
    meta: { formula_used: '', uncertainty: 0 },
  })),
  reportingDashboard: vi.fn(),
  reportingPareto: vi.fn(),
  reportingProduction: vi.fn(),
  reportingQuality: vi.fn(),
  reportingFinancial: vi.fn(),
  reportingTrend: vi.fn(),
  createJobPlan: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

// Mock SafetyBadge
vi.mock('../components/SafetyBadge', () => ({
  SafetyBadge: ({ score }: { score: number }) => (
    <span data-testid="safety-badge">{(score * 100).toFixed(0)}%</span>
  ),
}));

// Mock LoadingState/ErrorState
vi.mock('../components/LoadingState', () => ({
  LoadingState: ({ label }: { label?: string }) => (
    <div role="status">{label ?? 'Loading...'}</div>
  ),
  ErrorState: ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
    <div role="alert">
      <p>{message}</p>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

// Lazy imports
let AlarmPage: React.FC;
let ReportsPage: React.FC;
let JobPlannerPage: React.FC;
let ToolpathAdvisorPage: React.FC;
let WhatIfPage: React.FC;

beforeAll(async () => {
  const alarm = await import('../pages/AlarmPage');
  AlarmPage = alarm.AlarmPage;
  const reports = await import('../pages/ReportsPage');
  ReportsPage = reports.ReportsPage;
  const jobPlanner = await import('../pages/JobPlannerPage');
  JobPlannerPage = jobPlanner.JobPlannerPage;
  const toolpath = await import('../pages/ToolpathAdvisorPage');
  ToolpathAdvisorPage = toolpath.ToolpathAdvisorPage;
  const whatIf = await import('../pages/WhatIfPage');
  WhatIfPage = whatIf.WhatIfPage;
});

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

// ============================================================================
// AlarmPage
// ============================================================================
describe('AlarmPage', () => {
  it('renders the title and form elements', () => {
    wrap(<AlarmPage />);
    expect(screen.getByText('Alarm Decoder')).toBeDefined();
    expect(screen.getByLabelText('Alarm Code')).toBeDefined();
    expect(screen.getByLabelText('Controller')).toBeDefined();
    expect(screen.getByText('Decode Alarm')).toBeDefined();
  });

  it('has all 6 controller options', () => {
    wrap(<AlarmPage />);
    const select = screen.getByLabelText('Controller') as HTMLSelectElement;
    const options = Array.from(select.options).map(o => o.value);
    expect(options).toEqual(['fanuc', 'haas', 'siemens', 'mazak', 'okuma', 'heidenhain']);
  });

  it('disables decode button when alarm code is empty', () => {
    wrap(<AlarmPage />);
    const btn = screen.getByText('Decode Alarm') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('enables decode button when alarm code is entered', () => {
    wrap(<AlarmPage />);
    const input = screen.getByLabelText('Alarm Code') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1020' } });
    const btn = screen.getByText('Decode Alarm') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

// ============================================================================
// ReportsPage
// ============================================================================
describe('ReportsPage', () => {
  it('renders the title and description', () => {
    wrap(<ReportsPage />);
    expect(screen.getByText('Reports')).toBeDefined();
    expect(screen.getByText('Generate safety audits, setup sheets, and cost estimates.')).toBeDefined();
  });

  it('shows Report Generator and Business Reports tabs', () => {
    wrap(<ReportsPage />);
    expect(screen.getByText('Report Generator')).toBeDefined();
    expect(screen.getByText('Business Reports')).toBeDefined();
  });

  it('displays report type selector with 3 options', () => {
    wrap(<ReportsPage />);
    const select = screen.getByLabelText('Report Type') as HTMLSelectElement;
    expect(select.options.length).toBe(3);
    expect(select.options[0].text).toBe('Safety Audit Report');
    expect(select.options[1].text).toBe('Setup Sheet');
    expect(select.options[2].text).toBe('Cost Estimate');
  });

  it('generates a safety audit report when clicking Generate Report', () => {
    wrap(<ReportsPage />);
    fireEvent.click(screen.getByText('Generate Report'));
    // "Safety Audit Report" appears in both select option and generated section
    expect(screen.getAllByText('Safety Audit Report').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Overall Safety Score')).toBeDefined();
    expect(screen.getByText('Safety Checks')).toBeDefined();
    expect(screen.getByText('Recommendations')).toBeDefined();
  });

  it('shows Export as Text button after generating a report', () => {
    wrap(<ReportsPage />);
    fireEvent.click(screen.getByText('Generate Report'));
    expect(screen.getByText('Export as Text')).toBeDefined();
  });
});

// ============================================================================
// JobPlannerPage
// ============================================================================
describe('JobPlannerPage', () => {
  it('renders the title and description', () => {
    wrap(<JobPlannerPage />);
    expect(screen.getByText('Job Planner')).toBeDefined();
    expect(screen.getByText('Generate multi-pass machining plans with safety analysis.')).toBeDefined();
  });

  it('has Material, Part Type, and Machine selectors', () => {
    wrap(<JobPlannerPage />);
    expect(screen.getByLabelText('Material')).toBeDefined();
    expect(screen.getByLabelText('Part Type')).toBeDefined();
    expect(screen.getByLabelText('Machine')).toBeDefined();
  });

  it('displays 8 material options', () => {
    wrap(<JobPlannerPage />);
    const select = screen.getByLabelText('Material') as HTMLSelectElement;
    expect(select.options.length).toBe(8);
    expect(select.options[0].text).toBe('AISI 4140');
    expect(select.options[6].text).toBe('Ti-6Al-4V');
  });

  it('displays 4 machine options', () => {
    wrap(<JobPlannerPage />);
    const select = screen.getByLabelText('Machine') as HTMLSelectElement;
    expect(select.options.length).toBe(4);
    expect(select.options[0].text).toBe('Haas VF-2');
  });

  it('has a Generate Plan button', () => {
    wrap(<JobPlannerPage />);
    expect(screen.getByText('Generate Plan')).toBeDefined();
  });
});

// ============================================================================
// ToolpathAdvisorPage
// ============================================================================
describe('ToolpathAdvisorPage', () => {
  it('renders the title and description', () => {
    wrap(<ToolpathAdvisorPage />);
    expect(screen.getByText('Toolpath Advisor')).toBeDefined();
    expect(screen.getByText('Get strategy recommendations for your machining feature.')).toBeDefined();
  });

  it('has feature type selector with 6 options', () => {
    wrap(<ToolpathAdvisorPage />);
    const select = screen.getByLabelText('Feature Type') as HTMLSelectElement;
    expect(select.options.length).toBe(6);
    const vals = Array.from(select.options).map(o => o.value);
    expect(vals).toEqual(['pocket', 'slot', 'contour', 'facing', 'drilling', 'threading']);
  });

  it('shows 3 strategy cards when Get Strategies is clicked (pocket)', () => {
    wrap(<ToolpathAdvisorPage />);
    fireEvent.click(screen.getByText('Get Strategies'));
    expect(screen.getByText('Trochoidal Milling')).toBeDefined();
    expect(screen.getByText('Adaptive Clearing')).toBeDefined();
    expect(screen.getByText('Contour-Parallel (Zigzag)')).toBeDefined();
  });

  it('displays strategy pros/cons and ratings', () => {
    wrap(<ToolpathAdvisorPage />);
    fireEvent.click(screen.getByText('Get Strategies'));
    // 3 strategy cards each have Advantages/Trade-offs headings
    expect(screen.getAllByText('Advantages').length).toBe(3);
    expect(screen.getAllByText('Trade-offs').length).toBe(3);
    expect(screen.getByText('Excellent tool life')).toBeDefined();
    expect(screen.getByText('Longer cycle time')).toBeDefined();
  });

  it('marks the first strategy as recommended', () => {
    wrap(<ToolpathAdvisorPage />);
    fireEvent.click(screen.getByText('Get Strategies'));
    expect(screen.getByText(/Recommended/)).toBeDefined();
  });

  it('shows slot strategies when feature is changed', () => {
    wrap(<ToolpathAdvisorPage />);
    const select = screen.getByLabelText('Feature Type') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'slot' } });
    fireEvent.click(screen.getByText('Get Strategies'));
    expect(screen.getByText('Plunge Roughing')).toBeDefined();
    expect(screen.getByText('Helical Interpolation')).toBeDefined();
    expect(screen.getByText('Side Milling')).toBeDefined();
  });
});

// ============================================================================
// WhatIfPage
// ============================================================================
describe('WhatIfPage', () => {
  it('renders the title and description', () => {
    wrap(<WhatIfPage />);
    expect(screen.getByText('What-If Analysis')).toBeDefined();
    expect(screen.getByText(/Explore how parameter changes affect/)).toBeDefined();
  });

  it('displays all 4 parameter sliders', () => {
    wrap(<WhatIfPage />);
    expect(screen.getByText('Cutting Speed')).toBeDefined();
    expect(screen.getByText('Feed per Tooth')).toBeDefined();
    expect(screen.getByText('Axial Depth')).toBeDefined();
    expect(screen.getByText('Radial Width')).toBeDefined();
  });

  it('displays all 5 impact metrics at baseline', () => {
    wrap(<WhatIfPage />);
    expect(screen.getByText('Material Removal Rate')).toBeDefined();
    expect(screen.getByText('Tool Life')).toBeDefined();
    expect(screen.getByText('Spindle Power')).toBeDefined();
    expect(screen.getByText('Cost per Part')).toBeDefined();
    expect(screen.getByText('Safety Score')).toBeDefined();
  });

  it('has a Reset to Baseline button', () => {
    wrap(<WhatIfPage />);
    expect(screen.getByText('Reset to Baseline')).toBeDefined();
  });

  it('shows Parameters and Impact Analysis headings', () => {
    wrap(<WhatIfPage />);
    expect(screen.getByText('Parameters')).toBeDefined();
    expect(screen.getByText('Impact Analysis')).toBeDefined();
  });
});
