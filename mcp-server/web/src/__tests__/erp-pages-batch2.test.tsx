/**
 * Tests for ERP frontend pages batch 2:
 * PurchaseOrders, GeneralLedger, CapacityPlanning, QualityManagement,
 * HRCompliance, Customers, Exports, Inventory, Scheduling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock API client
vi.mock('../api/client', () => ({
  ApiError: class extends Error { status: number; constructor(s: number, m: string) { super(m); this.status = s; } },
  poList: vi.fn().mockResolvedValue({ result: { orders: [] } }),
  poCreate: vi.fn().mockResolvedValue({ result: {} }),
  poApprove: vi.fn().mockResolvedValue({ result: {} }),
  poAPAging: vi.fn().mockResolvedValue({ result: { current: 1000, days_30: 500, days_60: 200, days_90_plus: 100, total: 1800, items: [] } }),
  glChartOfAccounts: vi.fn().mockResolvedValue({ result: { accounts: [{ number: '1000', name: 'Cash', type: 'asset', balance: 50000 }] } }),
  glTrialBalance: vi.fn().mockResolvedValue({ result: { accounts: [{ number: '1000', name: 'Cash', debit: 50000, credit: 0 }], total_debits: 50000, total_credits: 50000, balanced: true } }),
  glIncomeStatement: vi.fn().mockResolvedValue({ result: { period_start: '2026-01-01', period_end: '2026-03-06', revenue: [{ account: 'Sales', amount: 100000 }], expenses: [{ account: 'COGS', amount: 60000 }], total_revenue: 100000, total_expenses: 60000, net_income: 40000 } }),
  glBalanceSheet: vi.fn().mockResolvedValue({ result: { as_of: '2026-03-06', assets: [{ account: 'Cash', balance: 50000 }], liabilities: [{ account: 'AP', balance: 10000 }], equity: [{ account: 'RE', balance: 40000 }], total_assets: 50000, total_liabilities: 10000, total_equity: 40000 } }),
  capacityAllLoads: vi.fn().mockResolvedValue({ result: { loads: [{ machine_id: 'M1', machine_name: 'Haas VF-2', total_hours: 30, capacity_hours: 40, utilization_pct: 75, jobs: [] }] } }),
  capacityBottlenecks: vi.fn().mockResolvedValue({ result: { bottlenecks: [] } }),
  capacitySummary: vi.fn().mockResolvedValue({ result: { total_machines: 8, avg_utilization: 72, active_jobs: 5 } }),
  qualityKPIs: vi.fn().mockResolvedValue({ result: { first_pass_yield: 97, scrap_rate: 1.5, ncr_count: 2, calibration_compliance: 98, fai_count: 12 } }),
  qualityCalibrationDashboard: vi.fn().mockResolvedValue({ result: { calibrations: [] } }),
  qualityNCRList: vi.fn().mockResolvedValue({ result: { ncrs: [] } }),
  hrDashboard: vi.fn().mockResolvedValue({ result: { total_enrolled: 25, total_employer_benefit_cost: 12500, avg_pto_balance: 80, training_compliance_pct: 95, pending_reviews: 3, compliance_alerts: 1 } }),
  hrBenefitsList: vi.fn().mockResolvedValue({ result: [{ id: 'BP-001', name: 'Medical PPO', type: 'health', provider: 'Blue Cross', employer_contribution: 450, employee_contribution: 150 }] }),
  hrComplianceAlerts: vi.fn().mockResolvedValue({ result: [] }),
  hrTrainingExpiring: vi.fn().mockResolvedValue({ result: [] }),
  listEmployees: vi.fn().mockResolvedValue({ result: [] }),
  customerList: vi.fn().mockResolvedValue({ result: [{ id: 'CUST-0001', name: 'Acme', company: 'Acme Corp', contact_name: 'John', email: 'j@a.com', phone: '555', credit_limit: 50000, current_balance: 12000, pricing_tier: 'preferred', status: 'active', tags: [] }] }),
  customerSearch: vi.fn().mockResolvedValue({ result: [] }),
  customerPipeline: vi.fn().mockResolvedValue({ result: { stages: [{ stage: 'quoted', count: 3, value: 45000, weighted_value: 18000 }], total_pipeline: 45000, weighted_pipeline: 18000, win_rate: 60, avg_deal_size: 15000 } }),
  customerTop: vi.fn().mockResolvedValue({ result: [] }),
  integrationFormats: vi.fn().mockResolvedValue({ result: [{ format: 'QuickBooks IIF', description: 'Intuit interchange', use_case: 'Import to QB' }, { format: 'CSV', description: 'Generic CSV', use_case: 'Spreadsheets' }] }),
  integrationReconcileBank: vi.fn().mockResolvedValue({ result: { statement_date: '2026-02-28', bank_balance: 50000, book_balance: 48500, adjusted_bank: 48500, adjusted_book: 48500, reconciled: true, difference: 0 } }),
  inventoryEOQ: vi.fn().mockResolvedValue({ result: { eoq: 224, annual_order_cost: 223, annual_holding_cost: 224, total_cost: 447, orders_per_year: 4.5 } }),
  inventoryABC: vi.fn().mockResolvedValue({ result: { items: [], summary: [] } }),
  schedulingJobShop: vi.fn().mockResolvedValue({ result: { schedule: [{ job_id: 'J-001', machine: 'CNC-1', start: 0, end: 120 }], makespan: 300, utilization: 0.78 } }),
}));

function renderPage(Component: React.FC) {
  return render(
    <MemoryRouter>
      <Component />
    </MemoryRouter>
  );
}

describe('PurchaseOrdersPage', () => {
  it('renders title and tabs', async () => {
    const { PurchaseOrdersPage } = await import('../pages/PurchaseOrdersPage');
    renderPage(PurchaseOrdersPage);
    expect(screen.getByText('Purchase Orders')).toBeDefined();
    expect(screen.getByText('Orders')).toBeDefined();
    expect(screen.getByText('AP Aging')).toBeDefined();
    expect(screen.getByText('New PO')).toBeDefined();
  });
});

describe('GeneralLedgerPage', () => {
  it('renders title and GL tabs', async () => {
    const { GeneralLedgerPage } = await import('../pages/GeneralLedgerPage');
    renderPage(GeneralLedgerPage);
    expect(screen.getByText('General Ledger')).toBeDefined();
    expect(screen.getByText('Chart of Accounts')).toBeDefined();
    expect(screen.getByText('Trial Balance')).toBeDefined();
    expect(screen.getByText('Income Statement')).toBeDefined();
    expect(screen.getByText('Balance Sheet')).toBeDefined();
  });
});

describe('CapacityPlanningPage', () => {
  it('renders title and period selector', async () => {
    const { CapacityPlanningPage } = await import('../pages/CapacityPlanningPage');
    renderPage(CapacityPlanningPage);
    expect(screen.getByText('Capacity Planning')).toBeDefined();
    expect(screen.getByText('Period:')).toBeDefined();
  });
});

describe('QualityManagementPage', () => {
  it('renders title and quality tabs', async () => {
    const { QualityManagementPage } = await import('../pages/QualityManagementPage');
    renderPage(QualityManagementPage);
    expect(screen.getByText('Quality Management')).toBeDefined();
    expect(screen.getByText('Quality KPIs')).toBeDefined();
    expect(screen.getByText('Calibration')).toBeDefined();
    expect(screen.getByText('NCRs')).toBeDefined();
  });
});

describe('HRCompliancePage', () => {
  it('renders title and HR tabs', async () => {
    const { HRCompliancePage } = await import('../pages/HRCompliancePage');
    renderPage(HRCompliancePage);
    expect(screen.getByText('HR & Compliance')).toBeDefined();
    expect(screen.getByText('HR Dashboard')).toBeDefined();
    expect(screen.getByText('Benefits')).toBeDefined();
    expect(screen.getByText('Training')).toBeDefined();
    expect(screen.getByText('Compliance Alerts')).toBeDefined();
  });
});

describe('CustomersPage', () => {
  it('renders title and CRM tabs', async () => {
    const { CustomersPage } = await import('../pages/CustomersPage');
    renderPage(CustomersPage);
    expect(screen.getByText('Customers & CRM')).toBeDefined();
    expect(screen.getByText('Customer List')).toBeDefined();
    expect(screen.getByText('Sales Pipeline')).toBeDefined();
    expect(screen.getByText('Top Customers')).toBeDefined();
  });
});

describe('ExportsPage', () => {
  it('renders title and export tabs', async () => {
    const { ExportsPage } = await import('../pages/ExportsPage');
    renderPage(ExportsPage);
    expect(screen.getByText('Exports & Integration')).toBeDefined();
    expect(screen.getByText('Export Formats')).toBeDefined();
    expect(screen.getByText('Bank Reconciliation')).toBeDefined();
  });
});

describe('InventoryPage', () => {
  it('renders title and inventory tabs', async () => {
    const { InventoryPage } = await import('../pages/InventoryPage');
    renderPage(InventoryPage);
    expect(screen.getByText('Inventory Optimization')).toBeDefined();
    expect(screen.getByText('EOQ Calculator')).toBeDefined();
    expect(screen.getByText('ABC Classification')).toBeDefined();
  });
});

describe('SchedulingPage', () => {
  it('renders title and run button', async () => {
    const { SchedulingPage } = await import('../pages/SchedulingPage');
    renderPage(SchedulingPage);
    expect(screen.getByText('Job Shop Scheduling')).toBeDefined();
    expect(screen.getByText('Run Schedule')).toBeDefined();
  });
});
