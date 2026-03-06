/**
 * PRISM API Client
 * Connects to F7 Bridge REST endpoints with API key authentication.
 * All responses follow the standard format:
 *   { result, safety: { score, warnings }, meta: { formula_used, uncertainty } }
 */

import type { PrismResponse } from './types';

const API_BASE = '/api/v1';

let apiKey: string | null = null;

export function setApiKey(key: string): void {
  apiKey = key;
}

async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
): Promise<PrismResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, error.error || 'Request failed');
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// === Endpoint methods ===

export async function calculateSpeedFeed(params: {
  material: string;
  operation: string;
  tool_diameter_mm?: number;
  doc_mm?: number;
}): Promise<PrismResponse> {
  return request('POST', '/speed-feed', params);
}

export async function createJobPlan(params: {
  material: string;
  operation: string;
  machine?: string;
  total_stock_mm?: number;
  target_ra_um?: number;
}): Promise<PrismResponse> {
  return request('POST', '/job-plan', params);
}

export async function getMaterial(id: string): Promise<PrismResponse> {
  return request('GET', `/material/${encodeURIComponent(id)}`);
}

export async function getTool(id: string): Promise<PrismResponse> {
  return request('GET', `/tool/${encodeURIComponent(id)}`);
}

export async function decodeAlarm(params: {
  code: string;
  controller: string;
}): Promise<PrismResponse> {
  return request('POST', '/alarm-decode', params);
}

// === ERP Endpoints ===

export async function shiftClockIn(params: {
  employee_id: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/shift-clock-in', params);
}

export async function shiftClockOut(params: {
  employee_id: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/shift-clock-out', params);
}

export async function jobTimeStart(params: {
  employee_id: string;
  job_id: string;
  operation?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/job-time-start', params);
}

export async function jobTimePause(params: {
  employee_id: string;
  job_id: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/job-time-pause', params);
}

export async function jobTimeStop(params: {
  employee_id: string;
  job_id: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/job-time-stop', params);
}

export async function getTimecard(params: {
  employee_id: string;
  period_start: string;
  period_end: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/timecard', params);
}

export async function getAttendance(params: {
  department?: string;
  date?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/attendance', params);
}

export async function listEmployees(): Promise<PrismResponse> {
  return request('GET', '/erp/employees');
}

export async function runPayroll(params: {
  period_start: string;
  period_end: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/payroll-run', params);
}

export async function createInvoice(params: {
  job_id: string;
  markup_percent?: number;
}): Promise<PrismResponse> {
  return request('POST', '/erp/invoice-create', params);
}

export async function listInvoices(params?: {
  status?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/invoices', params ?? {});
}

export async function getJobProfitability(params: {
  job_id: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/job-profitability', params);
}

export async function getToolUsage(params: {
  job_id?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/tool-usage', params ?? {});
}

// === Purchase Orders ===

export async function poCreate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/po-create', params);
}

export async function poApprove(params: { po_id: string; approved_by: string }): Promise<PrismResponse> {
  return request('POST', '/erp/po-approve', params);
}

export async function poReceive(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/po-receive', params);
}

export async function poList(params?: { status?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/po-list', params ?? {});
}

export async function poAPAging(): Promise<PrismResponse> {
  return request('GET', '/erp/po-ap-aging');
}

// === General Ledger ===

export async function glChartOfAccounts(): Promise<PrismResponse> {
  return request('GET', '/erp/gl-accounts');
}

export async function glJournalEntry(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/gl-journal', params);
}

export async function glTrialBalance(params?: { as_of?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/gl-trial-balance', params ?? {});
}

export async function glIncomeStatement(params: { period_start: string; period_end: string }): Promise<PrismResponse> {
  return request('POST', '/erp/gl-income-statement', params);
}

export async function glBalanceSheet(params?: { as_of?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/gl-balance-sheet', params ?? {});
}

// === Capacity Planning ===

export async function capacityMachines(): Promise<PrismResponse> {
  return request('GET', '/erp/capacity-machines');
}

export async function capacityAllLoads(params?: { period_weeks?: number }): Promise<PrismResponse> {
  return request('POST', '/erp/capacity-loads', params ?? {});
}

export async function capacityBottlenecks(params?: { period_weeks?: number }): Promise<PrismResponse> {
  return request('POST', '/erp/capacity-bottlenecks', params ?? {});
}

export async function capacitySummary(): Promise<PrismResponse> {
  return request('GET', '/erp/capacity-summary');
}

// === Quality Management ===

export async function qualitySPCChart(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/quality-spc', params);
}

export async function qualityCalibrationDashboard(): Promise<PrismResponse> {
  return request('GET', '/erp/quality-calibration');
}

export async function qualityNCRList(): Promise<PrismResponse> {
  return request('GET', '/erp/quality-ncr-dashboard');
}

export async function qualityNCRCreate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/quality-ncr-create', params);
}

export async function qualityKPIs(): Promise<PrismResponse> {
  return request('GET', '/erp/quality-kpis');
}

// === HR / Compliance ===

export async function hrBenefitsList(): Promise<PrismResponse> {
  return request('GET', '/erp/hr-benefits');
}

export async function hrPTOBalance(params: { employee_id: string }): Promise<PrismResponse> {
  return request('POST', '/erp/hr-pto-balance', params);
}

export async function hrPTORequest(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/hr-pto-request', params);
}

export async function hrTrainingHistory(params: { employee_id: string }): Promise<PrismResponse> {
  return request('POST', '/erp/hr-training', params);
}

export async function hrTrainingExpiring(params?: { within_days?: number }): Promise<PrismResponse> {
  return request('POST', '/erp/hr-training-expiring', params ?? {});
}

export async function hrComplianceAlerts(): Promise<PrismResponse> {
  return request('GET', '/erp/hr-compliance-alerts');
}

export async function hrDashboard(): Promise<PrismResponse> {
  return request('GET', '/erp/hr-dashboard');
}

// === Customer / CRM ===

export async function customerCreate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/customer-create', params);
}

export async function customerSearch(params: { query: string }): Promise<PrismResponse> {
  return request('POST', '/erp/customer-search', params);
}

export async function customerList(params?: { status?: string; tier?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/customer-list', params ?? {});
}

export async function customerCreditCheck(params: { customer_id: string; order_amount: number }): Promise<PrismResponse> {
  return request('POST', '/erp/customer-credit-check', params);
}

export async function customerPipeline(): Promise<PrismResponse> {
  return request('GET', '/erp/customer-pipeline');
}

export async function customerAnalytics(params: { customer_id: string }): Promise<PrismResponse> {
  return request('POST', '/erp/customer-analytics', params);
}

export async function customerTop(params?: { limit?: number }): Promise<PrismResponse> {
  return request('POST', '/erp/customer-top', params ?? {});
}

// === Integration / Export ===

export async function integrationExportCSV(params: { transactions: Record<string, unknown>[] }): Promise<PrismResponse> {
  return request('POST', '/erp/export-csv', params);
}

export async function integrationReconcileBank(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/reconcile-bank', params);
}

export async function integrationFormats(): Promise<PrismResponse> {
  return request('GET', '/erp/export-formats');
}

// === Inventory ===

export async function inventoryEOQ(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/inventory-eoq', params);
}

export async function inventoryABC(params: { items: Record<string, unknown>[] }): Promise<PrismResponse> {
  return request('POST', '/erp/inventory-abc', params);
}

// === Scheduling ===

export async function schedulingJobShop(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/scheduling-job-shop', params);
}

// === Quoting ===

export async function quotingGenerate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/generate', params);
}

export async function quotingPriceBreaks(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/price-breaks', params);
}

// === Quote Estimator (physics-backed) ===

export async function quoteEstimate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/estimate', params);
}

export async function quoteCompareMaterials(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/compare-materials', params);
}

export async function quoteWhatIf(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/what-if', params);
}

// === Secondary Ops ===

export async function secOpsList(params?: { category?: string }): Promise<PrismResponse> {
  return request('POST', '/quote/sec-ops-list', params ?? {});
}

export async function secOpsQuote(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/sec-ops-quote', params);
}

export async function secOpsBatchQuote(params: { operations: Record<string, unknown>[] }): Promise<PrismResponse> {
  return request('POST', '/quote/sec-ops-batch', params);
}

export async function secOpsFindVendors(params: { operation_id: string }): Promise<PrismResponse> {
  return request('POST', '/quote/sec-ops-vendors', params);
}

export async function secOpsRecommend(params: { material: string; application: string }): Promise<PrismResponse> {
  return request('POST', '/quote/sec-ops-recommend', params);
}

// === Quote Analytics ===

export async function analyticsAccuracy(params?: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/analytics-accuracy', params ?? {});
}

export async function analyticsConversion(): Promise<PrismResponse> {
  return request('GET', '/quote/analytics-conversion');
}

export async function analyticsCalibration(): Promise<PrismResponse> {
  return request('GET', '/quote/analytics-calibration');
}

// === Blueprint to Quote ===

export async function blueprintToQuote(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/blueprint', params);
}

// === Sheet Metal Quote ===

export async function sheetMetalQuote(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/sheet-metal', params);
}

// === Additive Quote ===

export async function additiveQuote(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/additive', params);
}

export async function additiveListMaterials(params?: { technology?: string }): Promise<PrismResponse> {
  return request('POST', '/quote/additive-materials', params ?? {});
}

export async function additiveCompareTech(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/additive-compare', params);
}

// === Injection Mold Quote ===

export async function injectionMoldQuote(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/injection-mold', params);
}

export async function injectionMoldMaterials(): Promise<PrismResponse> {
  return request('GET', '/quote/injection-mold-materials');
}

export async function injectionMoldDfm(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/injection-mold-dfm', params);
}

// === Stock Size Optimizer ===

export async function stockSizeOptimize(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/stock-optimize', params);
}

export async function stockSizeCatalog(params: { material: string }): Promise<PrismResponse> {
  return request('POST', '/quote/stock-catalog', params);
}

export async function stockSizeNesting(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/stock-nesting', params);
}

// === Market Material Pricing ===

export async function materialPriceLookup(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/material-price', params);
}

export async function materialPriceCompare(params: { materials: string[]; form?: string; region?: string }): Promise<PrismResponse> {
  return request('POST', '/quote/material-compare', params);
}

export async function materialSurcharge(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/material-surcharge', params);
}
