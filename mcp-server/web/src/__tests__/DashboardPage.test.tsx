/**
 * DashboardPage — Unit tests
 *
 * Tests rendering of machine status grid, OEE metrics, job progress,
 * tool life monitoring, and KPI stat cards.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPageWrapper />
    </MemoryRouter>,
  );
}

// Lazy import to allow mocks to be set up first
let DashboardPage: React.FC;
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
  it('renders the dashboard title and header', () => {
    renderDashboard();
    expect(screen.getByText('Manufacturing Dashboard')).toBeDefined();
  });

  it('displays all 6 machines in the status grid', () => {
    renderDashboard();
    expect(screen.getByText('Haas VF-2')).toBeDefined();
    expect(screen.getByText('DMG MORI NLX 2500')).toBeDefined();
    expect(screen.getByText('Mazak QTN 200')).toBeDefined();
    expect(screen.getByText('Okuma MU-5000V')).toBeDefined();
    expect(screen.getByText('Doosan DNM 5700')).toBeDefined();
    expect(screen.getByText('Haas ST-20')).toBeDefined();
  });

  it('shows machine status badges (RUNNING, IDLE, ALARM, SETUP)', () => {
    renderDashboard();
    // 3 running machines
    const runningBadges = screen.getAllByText('RUNNING');
    expect(runningBadges.length).toBe(3);
    expect(screen.getByText('IDLE')).toBeDefined();
    expect(screen.getByText('ALARM')).toBeDefined();
    expect(screen.getByText('SETUP')).toBeDefined();
  });

  it('displays KPI stat cards with correct values', () => {
    renderDashboard();
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

  it('shows OEE gauge labels for all 4 metrics', () => {
    renderDashboard();
    expect(screen.getByText('Availability')).toBeDefined();
    expect(screen.getByText('Performance')).toBeDefined();
    expect(screen.getByText('Quality')).toBeDefined();
    // OEE label in gauges section
    const oeeTexts = screen.getAllByText('OEE');
    expect(oeeTexts.length).toBeGreaterThanOrEqual(2); // KPI card + gauge
  });

  it('renders active job rows with progress and ETA', () => {
    renderDashboard();
    expect(screen.getByText('JOB-2401')).toBeDefined();
    expect(screen.getByText('Hydraulic Manifold')).toBeDefined();
    expect(screen.getByText('72%')).toBeDefined();
    expect(screen.getByText('ETA: 85min')).toBeDefined();

    expect(screen.getByText('JOB-2402')).toBeDefined();
    expect(screen.getByText('Bearing Housing')).toBeDefined();

    expect(screen.getByText('JOB-2403')).toBeDefined();
    expect(screen.getByText('Spindle Adapter')).toBeDefined();
    expect(screen.getByText('90%')).toBeDefined();
  });

  it('displays tool life monitor with wear indicators', () => {
    renderDashboard();
    expect(screen.getByText('Tool Life Monitor')).toBeDefined();
    expect(screen.getByText('EM 12mm 4F TiAlN')).toBeDefined();
    expect(screen.getByText('35%')).toBeDefined();
    expect(screen.getByText('CNMG 120408 IC8150')).toBeDefined();
    expect(screen.getByText('12%')).toBeDefined();
  });

  it('shows running machine details (RPM, feed, program)', () => {
    renderDashboard();
    // Haas VF-2 running details
    expect(screen.getByText('8,000')).toBeDefined(); // spindle_rpm toLocaleString
    expect(screen.getByText('O1234')).toBeDefined();
    expect(screen.getByText('92%')).toBeDefined(); // uptime
  });

  it('shows Demo mode when WebSocket is disconnected', () => {
    renderDashboard();
    expect(screen.getByText(/Demo/)).toBeDefined();
  });
});
