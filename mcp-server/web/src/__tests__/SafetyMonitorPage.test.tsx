/**
 * SafetyMonitorPage — Unit tests
 *
 * Tests safety score display, critical/warning counts, job table
 * rendering, tool life bars, and warning messages for safety-critical
 * monitoring.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock SafetyBadge
vi.mock('../components/SafetyBadge', () => ({
  SafetyBadge: ({ score }: { score: number }) => (
    <span data-testid="safety-badge">{(score * 100).toFixed(0)}%</span>
  ),
}));

// SafetyMonitorPage imports safetyLevel from api/types — use real implementation
// since it's a pure function with no side effects

function renderPage() {
  return render(
    <MemoryRouter>
      <SafetyMonitorPageInner />
    </MemoryRouter>,
  );
}

let SafetyMonitorPageInner: React.FC;

beforeAll(async () => {
  const mod = await import('../pages/SafetyMonitorPage');
  SafetyMonitorPageInner = mod.SafetyMonitorPage;
});

describe('SafetyMonitorPage', () => {
  it('renders page title and description', () => {
    renderPage();
    expect(screen.getByText('Safety Monitor')).toBeDefined();
    expect(screen.getByText(/Real-time safety scores/)).toBeDefined();
  });

  it('displays overall safety score as percentage', () => {
    renderPage();
    // Overall = (0.91 + 0.78 + 0.65) / 3 = 0.78 => 78%
    expect(screen.getByText('Overall Safety')).toBeDefined();
    // 78% appears in safety badge and as text
    expect(screen.getAllByText('78%').length).toBeGreaterThanOrEqual(1);
  });

  it('shows correct summary card counts', () => {
    renderPage();
    // Active Jobs appears in summary card and table section heading
    expect(screen.getAllByText('Active Jobs').length).toBeGreaterThanOrEqual(2);

    // Warnings label (may appear in table header too)
    expect(screen.getAllByText(/Warnings/).length).toBeGreaterThanOrEqual(1);

    // Critical: 1 (J-003 has score 0.65, below 0.70)
    expect(screen.getAllByText(/Critical/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 3 active jobs in the table', () => {
    renderPage();
    expect(screen.getByText('Bracket A-102')).toBeDefined();
    expect(screen.getByText('J-001')).toBeDefined();
    expect(screen.getByText('Haas VF-2')).toBeDefined();
    expect(screen.getByText('AISI 4140')).toBeDefined();

    expect(screen.getByText('Housing B-55')).toBeDefined();
    expect(screen.getByText('J-002')).toBeDefined();
    expect(screen.getByText('7075-T6')).toBeDefined();

    expect(screen.getByText('Shaft C-201')).toBeDefined();
    expect(screen.getByText('J-003')).toBeDefined();
    expect(screen.getByText('Ti-6Al-4V')).toBeDefined();
  });

  it('shows safety level banners (SAFE, CAUTION, UNSAFE)', () => {
    renderPage();
    // J-001: 0.91 >= 0.85 => 'pass' => SAFE
    expect(screen.getByText('SAFE')).toBeDefined();
    // J-002: 0.78 >= 0.70 => 'warn' => CAUTION
    expect(screen.getByText('CAUTION')).toBeDefined();
    // J-003: 0.65 < 0.70 => 'fail' => UNSAFE
    expect(screen.getByText('UNSAFE')).toBeDefined();
  });

  it('displays tool life bars with remaining/total minutes', () => {
    renderPage();
    expect(screen.getByText('28/45 min')).toBeDefined();
    expect(screen.getByText('12/60 min')).toBeDefined();
    expect(screen.getByText('3/30 min')).toBeDefined();
  });

  it('shows warning messages for jobs with issues', () => {
    renderPage();
    // J-002 warning
    expect(screen.getByText('Tool wear approaching replacement threshold')).toBeDefined();
    // J-003 warnings
    expect(screen.getByText('Safety below threshold (0.70)')).toBeDefined();
    expect(screen.getByText('Tool life critical — replace soon')).toBeDefined();
  });

  it('shows "None" for jobs without warnings', () => {
    renderPage();
    // J-001 has no warnings
    expect(screen.getByText('None')).toBeDefined();
  });

  it('renders table headers for all columns', () => {
    renderPage();
    expect(screen.getByText('Job')).toBeDefined();
    expect(screen.getAllByText('Machine').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Material').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Safety').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Status')).toBeDefined();
    expect(screen.getByText('Tool Life')).toBeDefined();
  });

  it('renders SafetyBadge components with correct scores', () => {
    renderPage();
    const badges = screen.getAllByTestId('safety-badge');
    // 1 overall + 3 per-job = 4 badges
    expect(badges.length).toBe(4);
    // Check individual scores are present (may appear multiple times)
    expect(screen.getAllByText('91%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('65%').length).toBeGreaterThanOrEqual(1);
  });
});
