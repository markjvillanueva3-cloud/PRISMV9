/**
 * DashboardPage — Unit tests
 *
 * Tests rendering of machine status grid, OEE metrics, job progress,
 * tool life monitoring, and KPI stat cards.
 */
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

const mockDashboardSnapshot = {
  source: 'demo' as const,
  note: 'Dashboard is using the local demo fleet until live machine, job, tool, and telemetry routes are reachable.',
  machines: [
    { id: 'm1', name: 'Haas VF-2', brand: 'Haas', status: 'running', spindle_rpm: 8000, feed_rate: 2400, current_program: 'O1234', uptime_pct: 92 },
    { id: 'm2', name: 'DMG MORI NLX 2500', brand: 'DMG MORI', status: 'running', spindle_rpm: 4500, feed_rate: 180, current_program: 'O5678', uptime_pct: 88 },
    { id: 'm3', name: 'Mazak QTN 200', brand: 'Mazak', status: 'idle', spindle_rpm: 0, feed_rate: 0, current_program: '', uptime_pct: 75 },
    { id: 'm4', name: 'Okuma MU-5000V', brand: 'Okuma', status: 'setup', spindle_rpm: 0, feed_rate: 0, current_program: '', uptime_pct: 82 },
    { id: 'm5', name: 'Doosan DNM 5700', brand: 'Doosan', status: 'alarm', spindle_rpm: 0, feed_rate: 0, current_program: 'O9012', uptime_pct: 68 },
    { id: 'm6', name: 'Haas ST-20', brand: 'Haas', status: 'running', spindle_rpm: 3200, feed_rate: 120, current_program: 'O3456', uptime_pct: 91 },
  ],
  jobs: [
    { id: 'j1', job_number: 'JOB-2401', part_name: 'Hydraulic Manifold', machine: 'Haas VF-2', progress_pct: 72, completed: 36, total: 50, eta_minutes: 85, current_op: 'Op 30 - Pocket' },
    { id: 'j2', job_number: 'JOB-2402', part_name: 'Bearing Housing', machine: 'DMG MORI NLX 2500', progress_pct: 45, completed: 9, total: 20, eta_minutes: 210, current_op: 'Op 20 - Bore' },
    { id: 'j3', job_number: 'JOB-2403', part_name: 'Spindle Adapter', machine: 'Haas ST-20', progress_pct: 90, completed: 18, total: 20, eta_minutes: 22, current_op: 'Op 40 - Thread' },
  ],
  tools: [
    { id: 't1', tool_name: 'EM 12mm 4F TiAlN', machine: 'Haas VF-2', life_remaining_pct: 35, estimated_minutes: 42, wear_rate: 'elevated' as const },
    { id: 't2', tool_name: 'Drill 8.5mm Carbide', machine: 'Haas VF-2', life_remaining_pct: 78, estimated_minutes: 156, wear_rate: 'normal' as const },
    { id: 't3', tool_name: 'CNMG 120408 IC8150', machine: 'DMG MORI NLX 2500', life_remaining_pct: 12, estimated_minutes: 8, wear_rate: 'critical' as const },
    { id: 't4', tool_name: 'Thread Mill M10x1.5', machine: 'Haas ST-20', life_remaining_pct: 65, estimated_minutes: 95, wear_rate: 'normal' as const },
  ],
  oee: { availability: 0.87, performance: 0.82, quality: 0.96, oee: 0.685 },
};

vi.mock('../api/dashboard', () => ({
  loadDashboardSnapshotWithFallback: vi.fn(async () => mockDashboardSnapshot),
}));

// Mock WebSocket hook — dashboard uses live connection
vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(() => ({
    isConnected: false,
    send: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
}));

// Mock SafetyBadge
vi.mock('../components/SafetyBadge', () => ({
  SafetyBadge: ({ score }: { score: number }) => (
    <span data-testid="safety-badge">{(score * 100).toFixed(0)}%</span>
  ),
}));

// Mock NotificationCenter components
vi.mock('../components/NotificationCenter', () => ({
  NotificationBell: ({ count }: { count: number }) => (
    <button data-testid="notification-bell">Notifications ({count})</button>
  ),
  NotificationPanel: () => <div data-testid="notification-panel" />,
  ToastContainer: () => <div data-testid="toast-container" />,
  useNotifications: () => ({
    notifications: [],
    toasts: [],
    panelOpen: false,
    unreadCount: 0,
    setPanelOpen: vi.fn(),
    addNotification: vi.fn(),
    dismissToast: vi.fn(),
    markRead: vi.fn(),
    clearAll: vi.fn(),
  }),
}));

async function renderDashboard(
  services = fixtureOperatingSystemServices,
) {
  const view = render(
    <MemoryRouter>
      <OperatingSystemProvider services={services}>
        <DashboardPageWrapper />
      </OperatingSystemProvider>
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(screen.getByText('Learning fabric')).toBeDefined();
  });
  return view;
}

function DashboardPageWrapper() {
  return <DashboardPageInner />;
}
let DashboardPageInner: React.FC;

// Resolve module before tests
beforeAll(async () => {
  const mod = await import('../pages/DashboardPage');
  DashboardPageInner = mod.DashboardPage;
});

describe('DashboardPage', () => {
  it('renders the dashboard title and header', async () => {
    await renderDashboard();
    expect(screen.getByRole('heading', { name: 'Manufacturing Dashboard' })).toBeDefined();
  });

  it('displays all 6 machines in the status grid', async () => {
    await renderDashboard();
    expect(screen.getAllByText('Haas VF-2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('DMG MORI NLX 2500').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Mazak QTN 200')).toBeDefined();
    expect(screen.getByText('Okuma MU-5000V')).toBeDefined();
    expect(screen.getByText('Doosan DNM 5700')).toBeDefined();
    expect(screen.getAllByText('Haas ST-20').length).toBeGreaterThanOrEqual(1);
  });

  it('shows machine status badges (RUNNING, IDLE, ALARM, SETUP)', async () => {
    await renderDashboard();
    // 3 running machines
    const runningBadges = screen.getAllByText('RUNNING');
    expect(runningBadges.length).toBe(3);
    expect(screen.getByText('IDLE')).toBeDefined();
    expect(screen.getByText('ALARM')).toBeDefined();
    expect(screen.getByText('SETUP')).toBeDefined();
  });

  it('displays KPI stat cards with correct values', async () => {
    await renderDashboard();
    // Machines Running: 3/6
    expect(screen.getByText('Machines Running')).toBeDefined();
    expect(screen.getByText('3/6')).toBeDefined();
    // Active Alarms: 1
    expect(screen.getByText('Active Alarms')).toBeDefined();
    // Active Jobs appears in KPI card and section heading
    expect(screen.getAllByText('Active Jobs').length).toBeGreaterThanOrEqual(1);
    // OEE: 69% (0.685 rounded) — appears in KPI card and OEE gauge
    expect(screen.getAllByText('69%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Overall Equipment Effectiveness')).toBeDefined();
  });

  it('shows OEE gauge labels for all 4 metrics', async () => {
    await renderDashboard();
    expect(screen.getByText('Availability')).toBeDefined();
    expect(screen.getByText('Performance')).toBeDefined();
    expect(screen.getByText('Quality')).toBeDefined();
    // OEE label in gauges section
    const oeeTexts = screen.getAllByText('OEE');
    expect(oeeTexts.length).toBeGreaterThanOrEqual(2); // KPI card + gauge
  });

  it('renders active job rows with progress and ETA', async () => {
    await renderDashboard();
    expect(screen.getByText('JOB-2401')).toBeDefined();
    expect(screen.getByText('Hydraulic Manifold')).toBeDefined();
    expect(screen.getByText('72%')).toBeDefined();
    expect(screen.getByText('ETA: 85min')).toBeDefined();

    expect(screen.getByText('JOB-2402')).toBeDefined();
    expect(screen.getByText('Bearing Housing')).toBeDefined();

    expect(screen.getAllByText('JOB-2403').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Spindle Adapter')).toBeDefined();
    expect(screen.getByText('90%')).toBeDefined();
  });

  it('displays tool life monitor with wear indicators', async () => {
    await renderDashboard();
    expect(screen.getByText('Tool Life Monitor')).toBeDefined();
    expect(screen.getByText('EM 12mm 4F TiAlN')).toBeDefined();
    expect(screen.getByText('35%')).toBeDefined();
    expect(screen.getAllByText('CNMG 120408 IC8150').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('12%')).toBeDefined();
  });

  it('shows running machine details (RPM, feed, program)', async () => {
    await renderDashboard();
    // Haas VF-2 running details
    expect(screen.getByText('8,000')).toBeDefined(); // spindle_rpm toLocaleString
    expect(screen.getByText('O1234')).toBeDefined();
    expect(screen.getByText('92%')).toBeDefined(); // uptime
  });

  it('shows Demo mode when WebSocket is disconnected', async () => {
    await renderDashboard();
    expect(screen.getByText(/Demo fallback/)).toBeDefined();
  });

  it('surfaces the adaptive learning fabric for local and network intelligence', async () => {
    await renderDashboard();
    expect(screen.getByText('Learning payload status')).toBeDefined();
    expect(screen.getByText('Digital Storm Precision')).toBeDefined();
    expect(screen.getByText('24 opt-in shops')).toBeDefined();
  });

  it('shows the operating-system convergence posture panel', async () => {
    await renderDashboard();
    expect(screen.getByText('Operating-system convergence')).toBeDefined();
    expect(
      screen.getByTitle(/Shell search now uses the live operating-system search route with fixture fallback/i),
    ).toBeDefined();
    expect(
      screen.getByTitle(
        /Messages workspace hydration and mailbox identity can now use live operating-system routes with fixture fallback/i,
      ),
    ).toBeDefined();
    expect(
      screen.getAllByTitle(
        /Hot-job read, set, and clear flows now use live operating-system routes with fixture fallback/i,
      ).length,
    ).toBeGreaterThan(0);
  });

  it('surfaces shop hot priorities from the staged hot-job seam', async () => {
    const services = {
      ...fixtureOperatingSystemServices,
      getHotJobs: vi.fn(async () => [
        {
          jobId: 'JOB-HOT-440',
          partNumber: 'Valve Body Rev C',
          customer: 'Helios Motion',
          dueDate: '2026-04-01',
          note: 'Move this packet ahead of the normal queue while management closes the delivery gap.',
          setBy: 'Operations director',
          setAt: '2026-03-29T10:00:00.000Z',
        },
      ]),
      subscribeHotJobs: vi.fn(() => () => undefined),
    };

    await renderDashboard(services);

    expect(screen.getByText('Shop hot priorities')).toBeDefined();
    expect(screen.getByText('Valve Body Rev C')).toBeDefined();
    expect(screen.getByText(/JOB-HOT-440 · Helios Motion/)).toBeDefined();
    expect(screen.getByRole('link', { name: 'Open Jobs desk' }).getAttribute('href')).toContain('/jobs?');
    expect(screen.getByRole('link', { name: 'Open Print to CNC' }).getAttribute('href')).toContain('/print-to-cnc?');
  });
});
