/**
 * PRISM Shop API Client
 * ERP, quoting, job management, and shop floor functions.
 * Uses auth token from localStorage (set by AuthContext).
 */

const API_BASE = '/api/v1';

export class ShopApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ShopApiError';
  }
}

// Alias for pages that import ApiError
export const ApiError = ShopApiError;

async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
): Promise<{ result: T; safety?: { score: number; warnings: string[] }; meta?: Record<string, unknown> }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('prism_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ShopApiError(res.status, err.error || 'Request failed');
  }

  return res.json();
}

// ── Core ────────────────────────────────────────────────────────────

export const createJobPlan = (p: {
  material: string;
  operation: string;
  machine?: string;
  total_stock_mm?: number;
  target_ra_um?: number;
}) => request('POST', '/job-plan', p);

// ── ERP: Shift Clock ────────────────────────────────────────────────

export const shiftClockIn = (p: { employee_id: string }) =>
  request('POST', '/erp/shift-clock-in', p);
export const shiftClockOut = (p: { employee_id: string }) =>
  request('POST', '/erp/shift-clock-out', p);
export const jobTimeStart = (p: { employee_id: string; job_id: string; operation?: string }) =>
  request('POST', '/erp/job-time-start', p);
export const jobTimePause = (p: { employee_id: string; job_id: string }) =>
  request('POST', '/erp/job-time-pause', p);
export const jobTimeStop = (p: { employee_id: string; job_id: string }) =>
  request('POST', '/erp/job-time-stop', p);
export const getTimecard = (p: { employee_id: string; period_start: string; period_end: string }) =>
  request('POST', '/erp/timecard', p);
export const getAttendance = (p?: { department?: string; date?: string }) =>
  request('POST', '/erp/attendance', p ?? {});
export const listEmployees = () => request('GET', '/erp/employees');

// ── ERP: Payroll ────────────────────────────────────────────────────

export const runPayroll = (p: { period_start: string; period_end: string }) =>
  request('POST', '/erp/payroll-run', p);

// ── ERP: Invoices ───────────────────────────────────────────────────

export const createInvoice = (p: { job_id: string; markup_percent?: number }) =>
  request('POST', '/erp/invoice-create', p);
export const listInvoices = (p?: { status?: string }) =>
  request('POST', '/erp/invoices', p ?? {});
export const getJobProfitability = (p: { job_id: string }) =>
  request('POST', '/erp/job-profitability', p);
export const getToolUsage = (p?: { job_id?: string }) =>
  request('POST', '/erp/tool-usage', p ?? {});

// ── ERP: Purchase Orders ────────────────────────────────────────────

export const poCreate = (p: Record<string, unknown>) => request('POST', '/erp/po-create', p);
export const poApprove = (p: { po_id: string; approved_by: string }) =>
  request('POST', '/erp/po-approve', p);
export const poReceive = (p: Record<string, unknown>) => request('POST', '/erp/po-receive', p);
export const poList = (p?: { status?: string }) => request('POST', '/erp/po-list', p ?? {});
export const poAPAging = () => request('GET', '/erp/po-ap-aging');
export const poThreeWayMatch = (p: { po_id: string }) =>
  request('POST', '/erp/po-three-way-match', p);
export const poSpendByCategory = (p?: { period?: string }) =>
  request('POST', '/erp/po-spend-by-category', p ?? {});

// ── ERP: General Ledger ─────────────────────────────────────────────

export const glChartOfAccounts = () => request('GET', '/erp/gl-accounts');
export const glJournalEntry = (p: Record<string, unknown>) =>
  request('POST', '/erp/gl-journal', p);
export const glTrialBalance = (p?: { as_of?: string }) =>
  request('POST', '/erp/gl-trial-balance', p ?? {});
export const glIncomeStatement = (p: { period_start: string; period_end: string }) =>
  request('POST', '/erp/gl-income-statement', p);
export const glBalanceSheet = (p?: { as_of?: string }) =>
  request('POST', '/erp/gl-balance-sheet', p ?? {});
export const glRecordInvoice = (p: Record<string, unknown>) =>
  request('POST', '/erp/gl-record-invoice', p);
export const glRecordPayment = (p: Record<string, unknown>) =>
  request('POST', '/erp/gl-record-payment', p);
export const glRecordPurchase = (p: Record<string, unknown>) =>
  request('POST', '/erp/gl-record-purchase', p);
export const glRecordPayroll = (p: Record<string, unknown>) =>
  request('POST', '/erp/gl-record-payroll', p);

// ── ERP: Capacity Planning ──────────────────────────────────────────

export const capacityMachines = () => request('GET', '/erp/capacity-machines');
export const capacityAllLoads = (p?: { period_weeks?: number }) =>
  request('POST', '/erp/capacity-loads', p ?? {});
export const capacityBottlenecks = (p?: { period_weeks?: number }) =>
  request('POST', '/erp/capacity-bottlenecks', p ?? {});
export const capacitySummary = () => request('GET', '/erp/capacity-summary');
export const capacityScheduleJob = (p: Record<string, unknown>) =>
  request('POST', '/erp/capacity-schedule-job', p);
export const capacityWhatIf = (p: Record<string, unknown>) =>
  request('POST', '/erp/capacity-what-if', p);

// ── ERP: Quality Management ─────────────────────────────────────────

export const qualitySPCChart = (p: Record<string, unknown>) =>
  request('POST', '/erp/quality-spc', p);
export const qualityCalibrationDashboard = () =>
  request('GET', '/erp/quality-calibration');
export const qualityNCRList = () => request('GET', '/erp/quality-ncr-dashboard');
export const qualityNCRCreate = (p: Record<string, unknown>) =>
  request('POST', '/erp/quality-ncr-create', p);
export const qualityKPIs = () => request('GET', '/erp/quality-kpis');
export const qualityCalibrationAdd = (p: Record<string, unknown>) =>
  request('POST', '/erp/quality-calibration-add', p);
export const qualityMaterialCert = (p: { heat_lot: string }) =>
  request('POST', '/erp/quality-material-cert', p);
export const qualityTraceHeatLot = (p: { heat_lot: string }) =>
  request('POST', '/erp/quality-trace-heat-lot', p);
export const qualityTraceJob = (p: { job_id: string }) =>
  request('POST', '/erp/quality-trace-job', p);
export const qualityNCRUpdate = (p: Record<string, unknown>) =>
  request('POST', '/erp/quality-ncr-update', p);
export const qualityFAICreate = (p: Record<string, unknown>) =>
  request('POST', '/erp/quality-fai-create', p);
export const qualityFAIList = (p?: { part_number?: string }) =>
  request('POST', '/erp/quality-fai-list', p ?? {});

// ── ERP: HR / Compliance ────────────────────────────────────────────

export const hrBenefitsList = () => request('GET', '/erp/hr-benefits');
export const hrPTOBalance = (p: { employee_id: string }) =>
  request('POST', '/erp/hr-pto-balance', p);
export const hrPTORequest = (p: Record<string, unknown>) =>
  request('POST', '/erp/hr-pto-request', p);
export const hrTrainingHistory = (p: { employee_id: string }) =>
  request('POST', '/erp/hr-training', p);
export const hrTrainingExpiring = (p?: { within_days?: number }) =>
  request('POST', '/erp/hr-training-expiring', p ?? {});
export const hrComplianceAlerts = () => request('GET', '/erp/hr-compliance-alerts');
export const hrDashboard = () => request('GET', '/erp/hr-dashboard');
export const hrEnroll = (p: Record<string, unknown>) => request('POST', '/erp/hr-enroll', p);
export const hrPTOApprove = (p: { request_id: string; approved_by: string }) =>
  request('POST', '/erp/hr-pto-approve', p);
export const hrReviewCreate = (p: Record<string, unknown>) =>
  request('POST', '/erp/hr-review-create', p);
export const hrReviews = (p?: { employee_id?: string }) =>
  request('POST', '/erp/hr-reviews', p ?? {});
export const hrCompensationHistory = (p: { employee_id: string }) =>
  request('POST', '/erp/hr-compensation-history', p);

// ── ERP: Customer / CRM ─────────────────────────────────────────────

export const customerCreate = (p: Record<string, unknown>) =>
  request('POST', '/erp/customer-create', p);
export const customerSearch = (p: { query: string }) =>
  request('POST', '/erp/customer-search', p);
export const customerList = (p?: { status?: string; tier?: string }) =>
  request('POST', '/erp/customer-list', p ?? {});
export const customerCreditCheck = (p: { customer_id: string; order_amount: number }) =>
  request('POST', '/erp/customer-credit-check', p);
export const customerPipeline = () => request('GET', '/erp/customer-pipeline');
export const customerAnalytics = (p: { customer_id: string }) =>
  request('POST', '/erp/customer-analytics', p);
export const customerTop = (p?: { limit?: number }) =>
  request('POST', '/erp/customer-top', p ?? {});
export const customerGet = (p: { customer_id: string }) =>
  request('POST', '/erp/customer-get', p);
export const customerUpdate = (p: Record<string, unknown>) =>
  request('POST', '/erp/customer-update', p);
export const customerLogComm = (p: Record<string, unknown>) =>
  request('POST', '/erp/customer-log-comm', p);
export const customerCommHistory = (p: { customer_id: string }) =>
  request('POST', '/erp/customer-comm-history', p);
export const customerFollowUps = () => request('GET', '/erp/customer-follow-ups');
export const customerCreateOpportunity = (p: Record<string, unknown>) =>
  request('POST', '/erp/customer-create-opportunity', p);
export const customerUpdateOpportunity = (p: Record<string, unknown>) =>
  request('POST', '/erp/customer-update-opportunity', p);

// ── ERP: Integration / Export ───────────────────────────────────────

export const integrationExportCSV = (p: { transactions: Record<string, unknown>[] }) =>
  request('POST', '/erp/export-csv', p);
export const integrationReconcileBank = (p: Record<string, unknown>) =>
  request('POST', '/erp/reconcile-bank', p);
export const integrationFormats = () => request('GET', '/erp/export-formats');
export const integrationExportQB = (p: Record<string, unknown>) =>
  request('POST', '/erp/export-quickbooks', p);
export const integrationExportPayrollTax = (p: Record<string, unknown>) =>
  request('POST', '/erp/export-payroll-tax', p);
export const integrationExportARAging = () =>
  request('GET', '/erp/export-ar-aging');

// ── ERP: Inventory ──────────────────────────────────────────────────

export const inventoryEOQ = (p: Record<string, unknown>) =>
  request('POST', '/erp/inventory-eoq', p);
export const inventoryABC = (p: { items: Record<string, unknown>[] }) =>
  request('POST', '/erp/inventory-abc', p);
export const inventorySafetyStock = (p: Record<string, unknown>) =>
  request('POST', '/erp/inventory-safety-stock', p);
export const inventoryToolOptimize = (p: Record<string, unknown>) =>
  request('POST', '/erp/inventory-tool-optimize', p);

// ── ERP: Scheduling ─────────────────────────────────────────────────

export const schedulingJobShop = (p: Record<string, unknown>) =>
  request('POST', '/erp/scheduling-job-shop', p);
export const schedulingSingleMachine = (p: Record<string, unknown>) =>
  request('POST', '/erp/scheduling-single-machine', p);
export const schedulingJohnsons = (p: Record<string, unknown>) =>
  request('POST', '/erp/scheduling-johnsons', p);
export const schedulingCPM = (p: Record<string, unknown>) =>
  request('POST', '/erp/scheduling-cpm', p);

// ── ERP: Job Lifecycle ──────────────────────────────────────────────

export const jobCreate = (p: Record<string, unknown>) =>
  request('POST', '/erp/job-create', p);
export const jobUpdateStatus = (p: { job_id: string; status: string }) =>
  request('POST', '/erp/job-update-status', p);
export const jobSummary = (p: { job_id: string }) =>
  request('POST', '/erp/job-summary', p);
export const jobDashboard = () => request('GET', '/erp/job-dashboard');

// ── ERP: Order Manager ──────────────────────────────────────────────

export const orderCreate = (p: Record<string, unknown>) =>
  request('POST', '/erp/order-create', p);
export const orderUpdateStatus = (p: { order_id: string; status: string }) =>
  request('POST', '/erp/order-update-status', p);
export const orderList = (p?: { status?: string }) =>
  request('POST', '/erp/order-list', p ?? {});
export const orderWorkOrderCreate = (p: Record<string, unknown>) =>
  request('POST', '/erp/work-order-create', p);
export const orderLogTime = (p: Record<string, unknown>) =>
  request('POST', '/erp/order-log-time', p);
export const orderLogProduction = (p: Record<string, unknown>) =>
  request('POST', '/erp/order-log-production', p);
export const orderMachineQueue = (p?: { machine_id?: string }) =>
  request('POST', '/erp/machine-queue', p ?? {});
export const orderMetrics = () => request('GET', '/erp/order-metrics');

// ── ERP: Purchasing ─────────────────────────────────────────────────

export const purchasingSearch = (p: { material?: string; query?: string }) =>
  request('POST', '/erp/purchasing-search', p);
export const purchasingRecommend = (p: { material: string; quantity?: number }) =>
  request('POST', '/erp/purchasing-recommend', p);
export const purchasingManufacturers = (p?: { material?: string }) =>
  request('POST', '/erp/purchasing-manufacturers', p ?? {});
export const purchasingSummary = () => request('GET', '/erp/purchasing-summary');

// ── ERP: Employee Management ────────────────────────────────────────

export const employeeCreate = (p: Record<string, unknown>) =>
  request('POST', '/erp/employee-create', p);
export const employeeSearch = (p: { query: string }) =>
  request('POST', '/erp/employee-search', p);
export const employeeAddSkill = (p: { employee_id: string; skill: string }) =>
  request('POST', '/erp/employee-add-skill', p);
export const employeeUtilization = (p: { employee_id: string }) =>
  request('POST', '/erp/employee-utilization', p);
export const employeeDeptSummary = (p?: { department?: string }) =>
  request('POST', '/erp/employee-dept-summary', p ?? {});

// ── ERP: Machine Rates ──────────────────────────────────────────────

export const machineRateLookup = (p: { machine_id: string }) =>
  request('POST', '/erp/machine-rate-lookup', p);
export const machineRateList = () => request('GET', '/erp/machine-rate-list');
export const machineRateCompare = (p: { machine_ids: string[] }) =>
  request('POST', '/erp/machine-rate-compare', p);
export const machineRateEffective = (p: { machine_id: string; job_id?: string }) =>
  request('POST', '/erp/machine-rate-effective', p);

// ── ERP: Batch Optimization ─────────────────────────────────────────

export const batchGroup = (p: Record<string, unknown>) =>
  request('POST', '/erp/batch-group', p);
export const batchSequence = (p: Record<string, unknown>) =>
  request('POST', '/erp/batch-sequence', p);
export const batchSetupMatrix = (p: Record<string, unknown>) =>
  request('POST', '/erp/batch-setup-matrix', p);
export const batchCapacity = (p: Record<string, unknown>) =>
  request('POST', '/erp/batch-capacity', p);

// ── ERP: Reporting ──────────────────────────────────────────────────

export const reportingDashboard = () => request('GET', '/erp/reporting-dashboard');
export const reportingPareto = (p: { type: string; period?: string }) =>
  request('POST', '/erp/reporting-pareto', p);
export const reportingProduction = (p?: { period?: string }) =>
  request('POST', '/erp/reporting-production', p ?? {});
export const reportingQuality = (p?: { period?: string }) =>
  request('POST', '/erp/reporting-quality', p ?? {});
export const reportingFinancial = (p?: { period?: string }) =>
  request('POST', '/erp/reporting-financial', p ?? {});
export const reportingTrend = (p: { metric: string; periods?: number }) =>
  request('POST', '/erp/reporting-trend', p);

// ── ERP: Financial Analysis ─────────────────────────────────────────

export const financialNPV = (p: Record<string, unknown>) =>
  request('POST', '/erp/financial-npv', p);
export const financialIRR = (p: Record<string, unknown>) =>
  request('POST', '/erp/financial-irr', p);
export const financialBreakeven = (p: Record<string, unknown>) =>
  request('POST', '/erp/financial-breakeven', p);
export const financialMachineInvestment = (p: Record<string, unknown>) =>
  request('POST', '/erp/financial-machine-investment', p);

// ── ERP: Actual Cost Tracking ───────────────────────────────────────

export const actualCostCalculate = (p: { job_id: string }) =>
  request('POST', '/erp/actual-cost-calculate', p);
export const actualCostVariance = (p: { job_id: string }) =>
  request('POST', '/erp/actual-cost-variance', p);
export const actualCostProfitability = (p?: { period?: string }) =>
  request('POST', '/erp/actual-cost-profitability', p ?? {});
export const actualCostForecast = (p?: { periods?: number }) =>
  request('POST', '/erp/actual-cost-forecast', p ?? {});
export const actualCostMarginAlerts = (p?: { threshold_pct?: number }) =>
  request('POST', '/erp/actual-cost-margin-alerts', p ?? {});
export const actualCostTrend = (p?: { periods?: number }) =>
  request('POST', '/erp/actual-cost-trend', p ?? {});

// ── ERP: Tool Usage ─────────────────────────────────────────────────

export const toolInventoryAdd = (p: Record<string, unknown>) =>
  request('POST', '/erp/tool-inventory-add', p);
export const toolRegrind = (p: { tool_id: string }) =>
  request('POST', '/erp/tool-regrind', p);
export const toolReorderAlerts = () => request('GET', '/erp/tool-reorder-alerts');

// ── Quoting ─────────────────────────────────────────────────────────

export const quotingGenerate = (p: Record<string, unknown>) =>
  request('POST', '/quote/generate', p);
export const quotingPriceBreaks = (p: Record<string, unknown>) =>
  request('POST', '/quote/price-breaks', p);
export const quoteEstimate = (p: Record<string, unknown>) =>
  request('POST', '/quote/estimate', p);
export const quoteCompareMaterials = (p: Record<string, unknown>) =>
  request('POST', '/quote/compare-materials', p);
export const quoteWhatIf = (p: Record<string, unknown>) =>
  request('POST', '/quote/what-if', p);

// ── Secondary Ops ───────────────────────────────────────────────────

export const secOpsList = (p?: { category?: string }) =>
  request('POST', '/quote/sec-ops-list', p ?? {});
export const secOpsQuote = (p: Record<string, unknown>) =>
  request('POST', '/quote/sec-ops-quote', p);
export const secOpsBatchQuote = (p: { operations: Record<string, unknown>[] }) =>
  request('POST', '/quote/sec-ops-batch', p);
export const secOpsFindVendors = (p: { operation_id: string }) =>
  request('POST', '/quote/sec-ops-vendors', p);
export const secOpsRecommend = (p: { material: string; application: string }) =>
  request('POST', '/quote/sec-ops-recommend', p);

// ── Quote Analytics ─────────────────────────────────────────────────

export const analyticsAccuracy = (p?: Record<string, unknown>) =>
  request('POST', '/quote/analytics-accuracy', p ?? {});
export const analyticsConversion = () =>
  request('GET', '/quote/analytics-conversion');
export const analyticsCalibration = () =>
  request('GET', '/quote/analytics-calibration');
export const analyticsRecord = (p: Record<string, unknown>) =>
  request('POST', '/quote/analytics-record', p);
export const analyticsUpdateOutcome = (p: Record<string, unknown>) =>
  request('POST', '/quote/analytics-update-outcome', p);
export const analyticsRecordActuals = (p: Record<string, unknown>) =>
  request('POST', '/quote/analytics-record-actuals', p);

// ── Blueprint to Quote ──────────────────────────────────────────────

export const blueprintToQuote = (p: Record<string, unknown>) =>
  request('POST', '/quote/blueprint', p);
export const blueprintResolveMaterial = (p: { description: string }) =>
  request('POST', '/quote/blueprint-resolve-material', p);

// ── Sheet Metal Quote ───────────────────────────────────────────────

export const sheetMetalQuote = (p: Record<string, unknown>) =>
  request('POST', '/quote/sheet-metal', p);

// ── Additive Quote ──────────────────────────────────────────────────

export const additiveQuote = (p: Record<string, unknown>) =>
  request('POST', '/quote/additive', p);
export const additiveListMaterials = (p?: { technology?: string }) =>
  request('POST', '/quote/additive-materials', p ?? {});
export const additiveCompareTech = (p: Record<string, unknown>) =>
  request('POST', '/quote/additive-compare', p);

// ── Injection Mold Quote ────────────────────────────────────────────

export const injectionMoldQuote = (p: Record<string, unknown>) =>
  request('POST', '/quote/injection-mold', p);
export const injectionMoldMaterials = () =>
  request('GET', '/quote/injection-mold-materials');
export const injectionMoldDfm = (p: Record<string, unknown>) =>
  request('POST', '/quote/injection-mold-dfm', p);

// ── Stock Size Optimizer ────────────────────────────────────────────

export const stockSizeOptimize = (p: Record<string, unknown>) =>
  request('POST', '/quote/stock-optimize', p);
export const stockSizeCatalog = (p: { material: string }) =>
  request('POST', '/quote/stock-catalog', p);
export const stockSizeNesting = (p: Record<string, unknown>) =>
  request('POST', '/quote/stock-nesting', p);

// ── Material Pricing ────────────────────────────────────────────────

export const materialPriceLookup = (p: Record<string, unknown>) =>
  request('POST', '/quote/material-price', p);
export const materialPriceCompare = (
  p: { materials: string[]; form?: string; region?: string },
) => request('POST', '/quote/material-compare', p);
export const materialSurcharge = (p: Record<string, unknown>) =>
  request('POST', '/quote/material-surcharge', p);

// ── Document Learning ───────────────────────────────────────────────

export const docUpload = (p: { file_path: string; title?: string }) =>
  request('POST', '/doc/upload', p);
export const docExtract = (p: { doc_id: string }) =>
  request('POST', '/doc/extract', p);
export const docList = () => request('GET', '/doc/list');
export const docGet = (p: { doc_id: string }) => request('POST', '/doc/get', p);
export const docDelete = (p: { doc_id: string }) => request('POST', '/doc/delete', p);
