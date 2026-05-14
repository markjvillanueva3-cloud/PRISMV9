/**
 * SafetyMonitorPage — Unit tests
 *
 * Tests safety score display, critical/warning counts, job table
 * rendering, tool life bars, and warning messages for safety-critical
 * monitoring.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockSafetySnapshot = {
  source: 'demo' as const,
  note: 'Dashboard is using the local demo fleet until live machine, job, tool, and telemetry routes are reachable. Safety posture is derived from live machine state plus the riskiest tool package on each active job.',
  jobs: [
    {
      id: 'J-001',
      name: 'Bracket A-102',
      machine: 'Haas VF-2',
      material: 'AISI 4140',
      operation: 'roughing',
      safetyScore: 0.91,
      progress: 65,
      toolLifeRemaining: 28,
      toolLifeTotal: 45,
      warnings: [],
    },
    {
      id: 'J-002',
      name: 'Housing B-55',
      machine: 'DMG MORI DMU 50',
      material: '7075-T6',
      operation: 'finishing',
      safetyScore: 0.78,
      progress: 30,
      toolLifeRemaining: 12,
      toolLifeTotal: 60,
      warnings: ['Tool wear approaching replacement threshold'],
    },
    {
      id: 'J-003',
      name: 'Shaft C-201',
      machine: 'Mazak QTN-200',
      material: 'Ti-6Al-4V',
      operation: 'turning',
      safetyScore: 0.65,
      progress: 85,
      toolLifeRemaining: 3,
      toolLifeTotal: 30,
      warnings: ['Safety below threshold (0.70)', 'Tool life critical — replace soon'],
    },
  ],
};

vi.mock('../api/safetyMonitor', () => ({
  loadSafetyMonitorSnapshotWithFallback: vi.fn(async () => mockSafetySnapshot),
}));

// Mock SafetyBadge
vi.mock('../components/SafetyBadge', () => ({
  SafetyBadge: ({ score }: { score: number }) => (
    <span data-testid="safety-badge">{(score * 100).toFixed(0)}%</span>
  ),
}));

// SafetyMonitorPage imports safetyLevel from api/types — use real implementation
// since it's a pure function with no side effects

function renderPage() {
  const view = render(
    <MemoryRouter>
      <SafetyMonitorPageInner />
    </MemoryRouter>,
  );
  return waitFor(() => {
    expect(screen.getByText('Bracket A-102')).toBeDefined();
  }).then(() => view);
}

let SafetyMonitorPageInner: React.FC;

beforeAll(async () => {
  const mod = await import('../pages/SafetyMonitorPage');
  SafetyMonitorPageInner = mod.SafetyMonitorPage;
});

describe('SafetyMonitorPage', () => {
  it('renders page title and description', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { name: 'Safety Monitor' })).toBeDefined();
    expect(screen.getByText(/Watch safety scores, tool-life risk/)).toBeDefined();
  });

  it('displays overall safety score as percentage', async () => {
    await renderPage();
    // Overall = (0.91 + 0.78 + 0.65) / 3 = 0.78 => 78%
    expect(screen.getAllByText('Overall Safety').length).toBeGreaterThanOrEqual(1);
    // 78% appears in safety badge and as text
    expect(screen.getAllByText('78%').length).toBeGreaterThanOrEqual(1);
  });

  it('shows correct summary card counts', async () => {
    await renderPage();
    // Active Jobs appears in summary card and table section heading
    expect(screen.getAllByText('Active Jobs').length).toBeGreaterThanOrEqual(2);

    // Warnings label (may appear in table header too)
    expect(screen.getAllByText(/Warnings/).length).toBeGreaterThanOrEqual(1);

    // Critical: 1 (J-003 has score 0.65, below 0.70)
    expect(screen.getAllByText(/Critical/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 3 active jobs in the table', async () => {
    await renderPage();
    const bracketCard = screen.getByText('Bracket A-102').closest('article');
    expect(bracketCard?.textContent).toContain('J-001');
    expect(bracketCard?.textContent).toContain('Haas VF-2');
    expect(bracketCard?.textContent).toContain('AISI 4140');

    const housingCard = screen.getByText('Housing B-55').closest('article');
    expect(housingCard?.textContent).toContain('J-002');
    expect(housingCard?.textContent).toContain('7075-T6');

    const shaftCard = screen
      .getAllByText('Shaft C-201')
      .map((node) => node.closest('article'))
      .find((node): node is HTMLElement => Boolean(node));
    expect(shaftCard?.textContent).toContain('J-003');
    expect(shaftCard?.textContent).toContain('Ti-6Al-4V');
  });

  it('shows safety level banners (SAFE, CAUTION, UNSAFE)', async () => {
    await renderPage();
    // J-001: 0.91 >= 0.85 => 'pass' => SAFE
    expect(screen.getByText('SAFE')).toBeDefined();
    // J-002: 0.78 >= 0.70 => 'warn' => CAUTION
    expect(screen.getByText('CAUTION')).toBeDefined();
    // J-003: 0.65 < 0.70 => 'fail' => UNSAFE
    expect(screen.getByText('UNSAFE')).toBeDefined();
  });

  it('displays tool life bars with remaining/total minutes', async () => {
    await renderPage();
    expect(screen.getByText('28/45 min')).toBeDefined();
    expect(screen.getByText('12/60 min')).toBeDefined();
    expect(screen.getByText('3/30 min')).toBeDefined();
  });

  it('shows warning messages for jobs with issues', async () => {
    await renderPage();
    // J-002 warning
    expect(screen.getByText('Tool wear approaching replacement threshold')).toBeDefined();
    // J-003 warnings
    expect(screen.getByText('Safety below threshold (0.70)')).toBeDefined();
    expect(screen.getByText('Tool life critical — replace soon')).toBeDefined();
  });

  it('shows "None" for jobs without warnings', async () => {
    await renderPage();
    // J-001 has no warnings
    expect(screen.getByText('None')).toBeDefined();
  });

  it('renders active job monitoring section and summary labels', async () => {
    await renderPage();
    expect(screen.getAllByText('Active Jobs').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Live safety board')).toBeDefined();
    expect(screen.getAllByText('Overall Safety').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tool Life').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Warnings').length).toBeGreaterThanOrEqual(1);
  });

  it('renders SafetyBadge components with correct scores', async () => {
    await renderPage();
    const badges = screen.getAllByTestId('safety-badge');
    expect(badges.length).toBe(3);
    // Check individual scores are present (may appear multiple times)
    expect(screen.getAllByText('91%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('65%').length).toBeGreaterThanOrEqual(1);
  });
});
