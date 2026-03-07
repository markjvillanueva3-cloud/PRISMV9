/**
 * Tests for ERP frontend pages batch 2:
 * PurchaseOrders, GeneralLedger, CapacityPlanning, QualityManagement,
 * HRCompliance, Customers, Exports, Inventory, Scheduling
 */
import { describe, it, expect, vi } from 'vitest';
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
  // Tier 2 extensions
  capacityScheduleJob: vi.fn().mockResolvedValue({ result: {} }),
  capacityWhatIf: vi.fn().mockResolvedValue({ result: {} }),
  glRecordInvoice: vi.fn().mockResolvedValue({ result: {} }),
  glRecordPayment: vi.fn().mockResolvedValue({ result: {} }),
  glRecordPurchase: vi.fn().mockResolvedValue({ result: {} }),
  glRecordPayroll: vi.fn().mockResolvedValue({ result: {} }),
  poThreeWayMatch: vi.fn().mockResolvedValue({ result: { matched: true } }),
  poSpendByCategory: vi.fn().mockResolvedValue({ result: { categories: [] } }),
  integrationExportQB: vi.fn().mockResolvedValue({ result: {} }),
  integrationExportPayrollTax: vi.fn().mockResolvedValue({ result: {} }),
  integrationExportARAging: vi.fn().mockResolvedValue({ result: {} }),
  inventorySafetyStock: vi.fn().mockResolvedValue({ result: {} }),
  inventoryToolOptimize: vi.fn().mockResolvedValue({ result: {} }),
  schedulingSingleMachine: vi.fn().mockResolvedValue({ result: {} }),
  schedulingJohnsons: vi.fn().mockResolvedValue({ result: {} }),
  schedulingCPM: vi.fn().mockResolvedValue({ result: {} }),
  qualityTraceJob: vi.fn().mockResolvedValue({ result: {} }),
  qualityFAIList: vi.fn().mockResolvedValue({ result: [] }),
  hrReviews: vi.fn().mockResolvedValue({ result: { reviews: [] } }),
  customerFollowUps: vi.fn().mockResolvedValue({ result: { follow_ups: [] } }),
  reportingDashboard: vi.fn().mockResolvedValue({ result: {} }),
  reportingPareto: vi.fn().mockResolvedValue({ result: {} }),
  reportingProduction: vi.fn().mockResolvedValue({ result: {} }),
  reportingQuality: vi.fn().mockResolvedValue({ result: {} }),
  reportingFinancial: vi.fn().mockResolvedValue({ result: {} }),
  reportingTrend: vi.fn().mockResolvedValue({ result: {} }),
  getJobProfitability: vi.fn().mockResolvedValue({ result: { profitability: { revenue: 1000, total_cost: 700, profit: 300, margin_percent: 30, cost_breakdown: [] }, variances: [] } }),
  actualCostForecast: vi.fn().mockResolvedValue({ result: { forecasts: [] } }),
  actualCostMarginAlerts: vi.fn().mockResolvedValue({ result: { alerts: [] } }),
  financialBreakeven: vi.fn().mockResolvedValue({ result: { breakeven_units: 769, breakeven_revenue: 115385, margin_of_safety_pct: 23, contribution_margin: 65 } }),
  getToolUsage: vi.fn().mockResolvedValue({ result: { records: [] } }),
  toolReorderAlerts: vi.fn().mockResolvedValue({ result: { alerts: [] } }),
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
    expect(screen.getByText('3-Way Match')).toBeDefined();
    expect(screen.getByText('Spend Analysis')).toBeDefined();
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
    expect(screen.getByText('Record Transaction')).toBeDefined();
  });
});

describe('CapacityPlanningPage', () => {
  it('renders title, tabs, and period selector', async () => {
    const { CapacityPlanningPage } = await import('../pages/CapacityPlanningPage');
    renderPage(CapacityPlanningPage);
    expect(screen.getByText('Capacity Planning')).toBeDefined();
    expect(screen.getByText('Period:')).toBeDefined();
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('Schedule Job')).toBeDefined();
    expect(screen.getByText('What-If Analysis')).toBeDefined();
  });
});

describe('QualityManagementPage', () => {
  it('renders title and quality tabs including trace and FAI', async () => {
    const { QualityManagementPage } = await import('../pages/QualityManagementPage');
    renderPage(QualityManagementPage);
    expect(screen.getByText('Quality Management')).toBeDefined();
    expect(screen.getByText('Quality KPIs')).toBeDefined();
    expect(screen.getByText('Calibration')).toBeDefined();
    expect(screen.getByText('NCRs')).toBeDefined();
    expect(screen.getByText('Traceability')).toBeDefined();
    expect(screen.getByText('FAI')).toBeDefined();
  });
});

describe('HRCompliancePage', () => {
  it('renders title and HR tabs including reviews', async () => {
    const { HRCompliancePage } = await import('../pages/HRCompliancePage');
    renderPage(HRCompliancePage);
    expect(screen.getByText('HR & Compliance')).toBeDefined();
    expect(screen.getByText('HR Dashboard')).toBeDefined();
    expect(screen.getByText('Benefits')).toBeDefined();
    expect(screen.getByText('Training')).toBeDefined();
    expect(screen.getByText('Compliance Alerts')).toBeDefined();
    expect(screen.getByText('Reviews')).toBeDefined();
  });
});

describe('CustomersPage', () => {
  it('renders title and CRM tabs including follow-ups', async () => {
    const { CustomersPage } = await import('../pages/CustomersPage');
    renderPage(CustomersPage);
    expect(screen.getByText('Customers & CRM')).toBeDefined();
    expect(screen.getByText('Customer List')).toBeDefined();
    expect(screen.getByText('Sales Pipeline')).toBeDefined();
    expect(screen.getByText('Top Customers')).toBeDefined();
    expect(screen.getByText('Follow-ups')).toBeDefined();
  });
});

describe('ExportsPage', () => {
  it('renders title and all export tabs', async () => {
    const { ExportsPage } = await import('../pages/ExportsPage');
    renderPage(ExportsPage);
    expect(screen.getByText('Exports & Integration')).toBeDefined();
    expect(screen.getByText('Export Formats')).toBeDefined();
    expect(screen.getByText('Bank Reconciliation')).toBeDefined();
    expect(screen.getByText('QuickBooks')).toBeDefined();
    expect(screen.getByText('Payroll/Tax')).toBeDefined();
    expect(screen.getByText('AR Aging')).toBeDefined();
  });
});

describe('InventoryPage', () => {
  it('renders title and all inventory tabs', async () => {
    const { InventoryPage } = await import('../pages/InventoryPage');
    renderPage(InventoryPage);
    expect(screen.getByText('Inventory Optimization')).toBeDefined();
    expect(screen.getByText('EOQ Calculator')).toBeDefined();
    expect(screen.getByText('ABC Classification')).toBeDefined();
    expect(screen.getByText('Safety Stock')).toBeDefined();
    expect(screen.getByText('Tool Optimize')).toBeDefined();
  });
});

describe('SchedulingPage', () => {
  it('renders title and scheduling tabs', async () => {
    const { SchedulingPage } = await import('../pages/SchedulingPage');
    renderPage(SchedulingPage);
    expect(screen.getByText('Scheduling')).toBeDefined();
    expect(screen.getByText('Job Shop')).toBeDefined();
    expect(screen.getByText('Single Machine')).toBeDefined();
    expect(screen.getByText("Johnson's Rule")).toBeDefined();
    expect(screen.getByText('CPM Network')).toBeDefined();
  });
});

describe('ReportsPage', () => {
  it('renders title and business reports tab', async () => {
    const { ReportsPage } = await import('../pages/ReportsPage');
    renderPage(ReportsPage);
    expect(screen.getByText('Reports')).toBeDefined();
    expect(screen.getByText('Report Generator')).toBeDefined();
    expect(screen.getByText('Business Reports')).toBeDefined();
  });
});

describe('JobProfitabilityPage', () => {
  it('renders title and profitability tabs', async () => {
    const { JobProfitabilityPage } = await import('../pages/JobProfitabilityPage');
    renderPage(JobProfitabilityPage);
    expect(screen.getByText('Job Profitability')).toBeDefined();
    expect(screen.getByText('Job Analysis')).toBeDefined();
    expect(screen.getByText('Cost Forecast')).toBeDefined();
    expect(screen.getByText('Margin Alerts')).toBeDefined();
    expect(screen.getByText('Breakeven')).toBeDefined();
  });
});

describe('ToolingCostPage', () => {
  it('renders title and tabs including reorder alerts', async () => {
    const { ToolingCostPage } = await import('../pages/ToolingCostPage');
    renderPage(ToolingCostPage);
    expect(screen.getByText('Tooling Cost Report')).toBeDefined();
    expect(screen.getByText('Tool Usage')).toBeDefined();
    expect(screen.getByText('Reorder Alerts')).toBeDefined();
  });
});
