/**
 * PRISM API Client
 * Connects to F7 Bridge REST endpoints with API key authentication.
 * All responses follow the standard format:
 *   { result, safety: { score, warnings }, meta: { formula_used, uncertainty } }
 */

import type {
  DataResponse,
  InstantQuoteHistory,
  InstantQuoteStatus,
  InstantQuoteLeadTimeOption,
  InstantQuoteQuantityBreak,
  InstantQuoteResult,
  InstantQuoteShareToken,
  PrismResponse,
} from './types';
import {
  ApiError,
  fetchJson,
  toApiError,
} from './requestCore';

export {
  ApiError,
  describeApiError,
  fetchJson,
  isRetryableApiError,
  toApiError,
  type ApiErrorKind,
  type ApiErrorPresentation,
} from './requestCore';

const API_BASE = '/api/v1';

let apiKey: string | null = null;

export function setApiKey(key: string): void {
  apiKey = key;
}

export function getRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
): Promise<PrismResponse<T>> {
  return fetchJson<PrismResponse<T>>(`${API_BASE}${path}`, {
    method,
    headers: getRequestHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    fallbackMessage: 'PRISM request failed',
  });
}

async function requestData<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
): Promise<DataResponse<T>> {
  return fetchJson<DataResponse<T>>(`${API_BASE}${path}`, {
    method,
    headers: getRequestHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    fallbackMessage: 'PRISM data request failed',
  });
}

function readPayloadMessage(payload: unknown, fallbackMessage: string) {
  if (typeof payload === 'object' && payload !== null) {
    if ('error' in payload && typeof payload.error === 'string' && payload.error.trim().length > 0) {
      return payload.error;
    }

    if ('message' in payload && typeof payload.message === 'string' && payload.message.trim().length > 0) {
      return payload.message;
    }
  }

  return fallbackMessage;
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
  return request('POST', '/job/plan', params);
}

export interface LatheWizardSubmitResponse {
  ok?: boolean;
  jobId?: string;
  error?: string;
  message?: string;
}

export interface LatheResultRouteResponse {
  status: number;
  payload: Record<string, unknown> | null;
}

export async function getLatheResult(jobId: string): Promise<LatheResultRouteResponse> {
  try {
    const response = await fetch(`${API_BASE}/lathe/result/${encodeURIComponent(jobId)}`, {
      method: 'GET',
      headers: getRequestHeaders(),
    });
    const payload = await response.json().catch(() => null);

    if (response.status === 202) {
      return {
        status: response.status,
        payload: payload as Record<string, unknown> | null,
      };
    }

    if (!response.ok) {
      throw new ApiError(response.status, readPayloadMessage(payload, 'Lathe result request failed'), {
        kind: 'http',
        retryable: response.status === 408 || response.status === 429 || response.status >= 500,
      });
    }

    return {
      status: response.status,
      payload: payload as Record<string, unknown> | null,
    };
  } catch (error) {
    throw toApiError(error, 'Lathe result request failed');
  }
}

export async function uploadLatheFile(params: {
  fileName: string;
  fileData: string;
  fileType: 'photo' | 'cad' | 'pdf';
}): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(`${API_BASE}/lathe/upload`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(params),
    fallbackMessage: 'Lathe upload request failed',
  });
}

export async function submitLatheWizard(params: Record<string, unknown>): Promise<LatheWizardSubmitResponse> {
  return fetchJson<LatheWizardSubmitResponse>(`${API_BASE}/lathe/wizard-submit`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(params),
    fallbackMessage: 'Lathe wizard request failed',
  });
}

export async function solveWireEdmWizard(params: Record<string, unknown>): Promise<PrismResponse<Record<string, unknown>>> {
  return request<Record<string, unknown>>('POST', '/edm/calculator-solve', params);
}

export async function wireEdmParseGeometry(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(`${API_BASE}/edm/parse-geometry`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(params),
    fallbackMessage: 'Wire EDM geometry parse request failed',
  });
}

export async function wireEdmOcr(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(`${API_BASE}/edm/ocr`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(params),
    fallbackMessage: 'Wire EDM OCR request failed',
  });
}

/** U-P2PFS31: Search tribal knowledge filtered by material/operation */
export interface TribalTip {
  id: string;
  title: string;
  body: string;
  category?: string;
  source?: string;
  confidence?: number;
  material_groups?: string[];
  operation_types?: string[];
}

export async function tribalSearch(params: {
  query?: string;
  material?: string;
  operation?: string;
  category?: string;
  limit?: number;
}): Promise<{ tips: TribalTip[] }> {
  const result = await fetchJson<{ ok?: boolean; tips?: TribalTip[]; results?: TribalTip[] }>(`${API_BASE}/learning/tribal`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(params),
    fallbackMessage: 'Tribal knowledge search failed',
  });
  return { tips: result.tips ?? result.results ?? [] };
}

// === Milling Endpoints ===

export interface MillingWizardSubmitResponse {
  ok?: boolean;
  jobId?: string;
  result?: Record<string, unknown>;
  error?: string;
  message?: string;
}

export async function uploadMillingFile(params: {
  fileName: string;
  fileData: string;
  fileType: 'photo' | 'cad' | 'pdf' | 'stl';
}): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(`${API_BASE}/milling/upload`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(params),
    fallbackMessage: 'Milling upload request failed',
  });
}

export async function submitMillingWizard(
  params: Record<string, unknown>,
): Promise<MillingWizardSubmitResponse> {
  return fetchJson<MillingWizardSubmitResponse>(`${API_BASE}/milling/wizard-submit`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(params),
    fallbackMessage: 'Milling wizard submit request failed',
  });
}

export async function getMillingResult(jobId: string): Promise<{ status: number; payload: Record<string, unknown> | null }> {
  try {
    const response = await fetch(`${API_BASE}/milling/result/${encodeURIComponent(jobId)}`, {
      method: 'GET',
      headers: getRequestHeaders(),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok && response.status !== 202) {
      throw new ApiError(
        response.status,
        readPayloadMessage(payload, 'Milling result request failed'),
        { kind: 'http', retryable: response.status === 408 || response.status === 429 || response.status >= 500 },
      );
    }
    return { status: response.status, payload: payload as Record<string, unknown> | null };
  } catch (error) {
    throw toApiError(error, 'Milling result request failed');
  }
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
  handoff_notes?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/shift-clock-out', params);
}

export async function jobTimeStart(params: {
  employee_id: string;
  job_id: string;
  operation?: string;
  process_type?: string;
  machine_id?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/job-time-start', params);
}

export async function jobTimePause(params: {
  employee_id: string;
  job_id: string;
  operation?: string;
  reason: string;
  reason_category?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/job-time-pause', params);
}

export async function jobTimeStop(params: {
  employee_id: string;
  job_id: string;
  operation?: string;
  good_parts?: number;
  scrap_count?: number;
  scrap_reason?: string;
  improvement_note?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/job-time-stop', params);
}

export async function getTimecard(params: {
  employee_id: string;
  period_start?: string;
  period_end?: string;
  start_date?: string;
  end_date?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/timecard', {
    employee_id: params.employee_id,
    start_date: params.start_date ?? params.period_start,
    end_date: params.end_date ?? params.period_end,
  });
}

export async function getAttendance(params: {
  department?: string;
  date?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/attendance', params);
}

export async function dailyFlashReport(params: {
  date: string;
}): Promise<PrismResponse> {
  const query = new URLSearchParams({ date: params.date });
  return request('GET', `/erp/flash-report?${query.toString()}`);
}

export async function listEmployees(): Promise<PrismResponse> {
  return request('GET', '/erp/employees');
}

export async function createPayrollPeriod(params: {
  start_date: string;
  end_date: string;
  pay_date: string;
  type: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
}): Promise<PrismResponse> {
  return request('POST', '/erp/payroll-period', params);
}

export async function runPayroll(params: {
  period_id: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/payroll-run', params);
}

export async function finalizePayroll(periodId: string): Promise<PrismResponse> {
  return request('POST', `/erp/payroll-finalize/${encodeURIComponent(periodId)}`, {});
}

export async function getEmployeeYTD(employeeId: string, year: number): Promise<PrismResponse> {
  return request('GET', `/erp/employee-ytd/${encodeURIComponent(employeeId)}/${year}`);
}

export async function updateTimecardStatus(params: {
  employee_id: string;
  week_start: string;
  status: string;
  change_reason?: string;
}): Promise<PrismResponse> {
  return request('PATCH', '/erp/timecard-status', params);
}

export async function updateEmployeeStatus(params: {
  employee_id: string;
  new_status: string;
  change_reason: string;
  return_date?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/employee-status', params);
}

export async function getTimecardAuditLog(
  employeeIdOrParams: string | {
    employee_id: string;
    start_date?: string;
    end_date?: string;
    page?: number;
  },
  startDate?: string,
  endDate?: string,
  page?: number,
): Promise<PrismResponse> {
  const employeeId = typeof employeeIdOrParams === 'string' ? employeeIdOrParams : employeeIdOrParams.employee_id;
  const effectiveStartDate = typeof employeeIdOrParams === 'string' ? startDate : employeeIdOrParams.start_date;
  const effectiveEndDate = typeof employeeIdOrParams === 'string' ? endDate : employeeIdOrParams.end_date;
  const effectivePage = typeof employeeIdOrParams === 'string' ? page : employeeIdOrParams.page;
  const params = new URLSearchParams({ employeeId });
  if (effectiveStartDate) params.set('start_date', effectiveStartDate);
  if (effectiveEndDate) params.set('end_date', effectiveEndDate);
  if (effectivePage) params.set('page', String(effectivePage));
  return request('GET', `/erp/timecard-audit-log?${params.toString()}`);
}

export async function getWhoClockedIn(departmentId?: string): Promise<PrismResponse> {
  const q = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : '';
  return request('GET', `/erp/who-clocked-in${q}`);
}

export async function getActiveMachineJobs(departmentId?: string): Promise<PrismResponse> {
  const q = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : '';
  return request('GET', `/erp/active-machine-jobs${q}`);
}

export async function getShopFloorSnapshot(): Promise<unknown> {
  return fetchJson<unknown>('/api/shop/snapshot', {
    method: 'GET',
    headers: getRequestHeaders(),
    fallbackMessage: 'Shop floor snapshot request failed',
  });
}

export async function getShopFloorJobs(limit = 20): Promise<unknown> {
  const query = new URLSearchParams({ limit: String(limit) });
  return fetchJson<unknown>(`/api/shop/jobs?${query.toString()}`, {
    method: 'GET',
    headers: getRequestHeaders(),
    fallbackMessage: 'Shop floor jobs request failed',
  });
}

export async function getShiftCountdown(): Promise<PrismResponse> {
  return request('GET', '/erp/shift-countdown');
}

export async function getDowntimePareto(params: {
  department_id: string;
  start_date: string;
  end_date: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/downtime-pareto', params);
}

export async function getEmployeeCertifications(employeeId: string): Promise<PrismResponse> {
  return request('GET', `/erp/employee-certifications/${encodeURIComponent(employeeId)}`);
}

export async function employeeLearningPathLegacy(params: {
  employee_id: string;
  role: string;
}): Promise<PrismResponse> {
  return request('POST', '/learning/employee-learning-path', params);
}

// ── BIZ-MS3: Lean Manufacturing APIs ─────────────────────────────────────────

export async function kaizenSuggestions(params?: {
  status?: string;
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<PrismResponse> {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.employeeId) q.set('employeeId', params.employeeId);
  if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params?.dateTo) q.set('dateTo', params.dateTo);
  const qs = q.toString();
  return request('GET', `/erp/kaizen-suggestions${qs ? `?${qs}` : ''}`);
}

export async function kaizenScore(suggestionId: string, score: {
  impact: number;
  effort: number;
  estimatedSavings: number;
  scoredBy: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/kaizen-score', { suggestion_id: suggestionId, ...score });
}

export async function kaizenUpdateStatus(suggestionId: string, status: string, updatedBy: string, notes?: string): Promise<PrismResponse> {
  return request('POST', '/erp/kaizen-status', { suggestion_id: suggestionId, status, updated_by: updatedBy, notes });
}

export async function getValueStreamData(jobId: string): Promise<PrismResponse> {
  return request('GET', `/erp/value-stream/${encodeURIComponent(jobId)}`);
}

export async function getKanbanBoard(departmentId?: string): Promise<PrismResponse> {
  const q = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : '';
  return request('GET', `/erp/kanban-board${q}`);
}

export async function updateKanbanCard(cardId: string, column: string): Promise<PrismResponse> {
  return request('POST', '/erp/kanban-move', { card_id: cardId, column });
}

export async function getRootCauseIncidents(params?: {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
}): Promise<PrismResponse> {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params?.dateTo) q.set('dateTo', params.dateTo);
  if (params?.departmentId) q.set('departmentId', params.departmentId);
  const qs = q.toString();
  return request('GET', `/erp/root-cause-incidents${qs ? `?${qs}` : ''}`);
}

export async function submitRootCauseAnalysis(incidentId: string, analysis: {
  why1: string;
  why2: string;
  why3: string;
  why4?: string;
  why5?: string;
  root_cause: string;
  corrective_action: string;
  assigned_to: string;
  due_date: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/root-cause-analysis', { incident_id: incidentId, ...analysis });
}

export async function getA3Report(reportId: string): Promise<PrismResponse> {
  return request('GET', `/erp/a3-report/${encodeURIComponent(reportId)}`);
}

export async function createA3Report(params: {
  title: string;
  problem_statement: string;
  owner: string;
  department?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/a3-report', params);
}

export async function updateA3Section(reportId: string, section: string, content: string): Promise<PrismResponse> {
  return request('POST', `/erp/a3-report/${encodeURIComponent(reportId)}/section`, { section, content });
}

export async function analyticsOEETrend(params: {
  machine_id?: string;
  days?: number;
}): Promise<PrismResponse> {
  return request('POST', '/erp/oee-trend', params);
}

export async function analyticsOEELosses(params: {
  machine_id?: string;
  date?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/oee-losses', params);
}

// ── BIZ-MS4: Sales, Pipeline & Procurement APIs ─────────────────────────────

export async function rfqCreate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/rfq-create', params);
}
export async function rfqList(params?: { status?: string; assignee_id?: string }): Promise<PrismResponse> {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.assignee_id) q.set('assignee_id', params.assignee_id);
  const qs = q.toString();
  return request('GET', `/erp/rfq-list${qs ? `?${qs}` : ''}`);
}
export async function rfqAssign(rfqId: string, assigneeId: string): Promise<PrismResponse> {
  return request('POST', '/erp/rfq-assign', { rfq_id: rfqId, assignee_id: assigneeId });
}
export async function rfqUpdateStatus(rfqId: string, status: string): Promise<PrismResponse> {
  return request('POST', '/erp/rfq-status', { rfq_id: rfqId, status });
}
export async function pipelineForecast(): Promise<PrismResponse> {
  return request('GET', '/erp/pipeline-forecast');
}
export async function pipelineStages(): Promise<PrismResponse> {
  return request('GET', '/erp/pipeline-stages');
}
export async function commissionReport(params?: { period?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/commission-report', params ?? {});
}
export async function creditReview(customerId: string): Promise<PrismResponse> {
  return request('GET', `/erp/credit-review/${encodeURIComponent(customerId)}`);
}
export async function creditReviewAll(): Promise<PrismResponse> {
  return request('GET', '/erp/credit-review-all');
}
export async function vendorScorecard(vendorId: string): Promise<PrismResponse> {
  return request('GET', `/erp/vendor-scorecard/${encodeURIComponent(vendorId)}`);
}
export async function vendorList(): Promise<PrismResponse> {
  return request('GET', '/erp/vendor-list');
}
export async function equipmentAssets(): Promise<PrismResponse> {
  return request('GET', '/erp/equipment-assets');
}
export async function maintenanceWorkOrders(): Promise<PrismResponse> {
  return request('GET', '/erp/maintenance-work-orders');
}
export async function maintenanceWorkOrderComplete(params: {
  wo_id: string;
  labor_hours: number;
  notes?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/maintenance-work-orders/complete', params);
}
export async function pmSchedules(): Promise<PrismResponse> {
  return request('GET', '/erp/pm-schedules');
}
export async function pmGenerateWorkOrder(alertId: string): Promise<PrismResponse> {
  return request('POST', '/erp/pm-generate-work-order', { alert_id: alertId });
}
export async function receivingList(): Promise<PrismResponse> {
  return request('GET', '/erp/receiving-list');
}
export async function receivingLog(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/receiving-log', params);
}
export async function receivingInspect(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/receiving-inspect', params);
}
export async function shippingCreateBOL(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/shipping-create-bol', params);
}
export async function shippingList(): Promise<PrismResponse> {
  return request('GET', '/erp/shipping-list');
}
export async function shippingAddTracking(orderId: string, trackingNumber: string, carrier: string): Promise<PrismResponse> {
  return request('POST', '/erp/shipping-add-tracking', { order_id: orderId, tracking_number: trackingNumber, carrier });
}
export async function shippingComplete(orderId: string): Promise<PrismResponse> {
  return request('POST', '/erp/shipping-complete', { order_id: orderId });
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

export async function operationsKPIs(): Promise<PrismResponse> {
  return request('GET', '/erp/operations-kpis');
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

// === Billing ===

export async function billingStatus(): Promise<PrismResponse> {
  return request('GET', '/billing/status');
}

export async function billingCreateCheckout(params: { plan: string }): Promise<PrismResponse> {
  return request('POST', '/billing/create-checkout', params);
}

export async function billingPortal(params: { customerId: string }): Promise<PrismResponse> {
  return request('POST', '/billing/portal', params);
}

export async function billingPurchasePost(params: { controller: string; type: string }): Promise<PrismResponse> {
  return request('POST', '/billing/purchase-post', params);
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

// === Job Lifecycle ===

export async function jobCreate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/job-create', params);
}

export async function jobUpdateStatus(params: { job_id: string; status: string }): Promise<PrismResponse> {
  return request('POST', '/erp/job-update-status', params);
}

export async function jobSummary(params: { job_id: string }): Promise<PrismResponse> {
  return request('POST', '/erp/job-summary', params);
}

export async function jobDashboard(): Promise<PrismResponse> {
  return request('GET', '/erp/job-dashboard');
}

// === Order Manager ===

export async function orderCreate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/order-create', params);
}

export async function orderUpdateStatus(params: { order_id: string; status: string }): Promise<PrismResponse> {
  return request('POST', '/erp/order-update-status', params);
}

export async function orderList(params?: { status?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/order-list', params ?? {});
}

export async function orderWorkOrderCreate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/work-order-create', params);
}

export async function orderLogTime(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/order-log-time', params);
}

export async function orderLogProduction(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/order-log-production', params);
}

export async function orderMachineQueue(params?: { machine_id?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/machine-queue', params ?? {});
}

export async function orderMetrics(): Promise<PrismResponse> {
  return request('GET', '/erp/order-metrics');
}

// === Purchasing Directory ===

export async function purchasingSearch(params: { material?: string; query?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/purchasing-search', params);
}

export async function purchasingRecommend(params: { material: string; quantity?: number }): Promise<PrismResponse> {
  return request('POST', '/erp/purchasing-recommend', params);
}

export async function purchasingManufacturers(params?: { material?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/purchasing-manufacturers', params ?? {});
}

export async function purchasingSummary(): Promise<PrismResponse> {
  return request('GET', '/erp/purchasing-summary');
}

// === Employee Management ===

export async function employeeCreate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/employee-create', params);
}

export async function employeeSearch(params: { query: string }): Promise<PrismResponse> {
  return request('POST', '/erp/employee-search', params);
}

export async function employeeAddSkill(params: { employee_id: string; skill: string }): Promise<PrismResponse> {
  return request('POST', '/erp/employee-add-skill', params);
}

export async function employeeUtilization(params: { employee_id: string }): Promise<PrismResponse> {
  return request('POST', '/erp/employee-utilization', params);
}

export async function employeeDeptSummary(params?: { department?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/employee-dept-summary', params ?? {});
}

export async function employeeUpdate(params: {
  employee_id: string;
  updates: Record<string, unknown>;
}): Promise<PrismResponse> {
  return request('POST', '/erp/employee-update', params);
}

export async function jobTimeResume(params: {
  employee_id: string;
  job_id: string;
  operation?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/job-time-resume', params);
}

export async function getActiveJobs(employeeId: string): Promise<PrismResponse> {
  return request('GET', `/erp/active-jobs/${encodeURIComponent(employeeId)}`);
}

export async function whoClockedIn(): Promise<PrismResponse> {
  return request('GET', '/erp/who-clocked-in');
}

export async function getJobLaborCost(params: {
  employee_id: string;
  job_id: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/job-labor-cost', params);
}

export async function getShiftHandoff(employeeId: string): Promise<PrismResponse> {
  return request('GET', `/erp/shift-handoff/${encodeURIComponent(employeeId)}`);
}

export async function employeeLearningPath(params: {
  employee_id: string;
  role?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/employee-learning-path', params);
}

export async function employeeLearningComplete(params: {
  employee_id: string;
  course_id: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/employee-learning-complete', params);
}

export async function employeeCertifications(employeeId: string): Promise<PrismResponse> {
  return request('GET', `/erp/employee-certifications/${encodeURIComponent(employeeId)}`);
}

// === Machine Rates ===

export async function machineRateLookup(params: { machine_id: string }): Promise<PrismResponse> {
  return request('POST', '/erp/machine-rate-lookup', params);
}

export async function machineRateList(): Promise<PrismResponse> {
  return request('GET', '/erp/machine-rate-list');
}

export async function machineRateCompare(params: { machine_ids: string[] }): Promise<PrismResponse> {
  return request('POST', '/erp/machine-rate-compare', params);
}

export async function machineRateEffective(params: {
  machine_id: string;
  oee_level?: 'worldClass' | 'typical' | 'poor';
}): Promise<PrismResponse> {
  return request('POST', '/erp/machine-rate-effective', params);
}

// === Batch Optimization ===

export async function batchGroup(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/batch-group', params);
}

export async function batchSequence(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/batch-sequence', params);
}

export async function batchSetupMatrix(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/batch-setup-matrix', params);
}

export async function batchCapacity(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/batch-capacity', params);
}

// === Reporting ===

export async function reportingDashboard(): Promise<PrismResponse> {
  return request('GET', '/erp/reporting-dashboard');
}

export async function reportingPareto(params: { type: string; period?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/reporting-pareto', params);
}

export async function reportingProduction(params?: { period?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/reporting-production', params ?? {});
}

export async function reportingQuality(params?: { period?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/reporting-quality', params ?? {});
}

export async function reportingFinancial(params?: { period?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/reporting-financial', params ?? {});
}

export async function reportingTrend(params: { metric: string; periods?: number }): Promise<PrismResponse> {
  return request('POST', '/erp/reporting-trend', params);
}

// === Financial Analysis ===

export async function financialNPV(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/financial-npv', params);
}

export async function financialIRR(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/financial-irr', params);
}

export async function financialBreakeven(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/financial-breakeven', params);
}

export async function financialMachineInvestment(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/financial-machine-investment', params);
}

// === Actual Cost Tracking ===

export async function actualCostCalculate(params: { job_id: string }): Promise<PrismResponse> {
  return request('POST', '/erp/actual-cost-calculate', params);
}

export async function actualCostVariance(params: { job_id: string }): Promise<PrismResponse> {
  return request('POST', '/erp/actual-cost-variance', params);
}

export async function actualCostProfitability(params?: { period?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/actual-cost-profitability', params ?? {});
}

export async function actualCostForecast(params?: { periods?: number }): Promise<PrismResponse> {
  return request('POST', '/erp/actual-cost-forecast', params ?? {});
}

export async function actualCostMarginAlerts(params?: { threshold_pct?: number }): Promise<PrismResponse> {
  return request('POST', '/erp/actual-cost-margin-alerts', params ?? {});
}

export async function actualCostTrend(params?: { periods?: number }): Promise<PrismResponse> {
  return request('POST', '/erp/actual-cost-trend', params ?? {});
}

// === Tool Usage (extended) ===

export async function toolInventoryAdd(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/tool-inventory-add', params);
}

export async function toolRegrind(params: { tool_id: string }): Promise<PrismResponse> {
  return request('POST', '/erp/tool-regrind', params);
}

export async function toolReorderAlerts(): Promise<PrismResponse> {
  return request('GET', '/erp/tool-reorder-alerts');
}

// === Quality (extended) ===

export async function qualityCalibrationAdd(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/quality-calibration-add', params);
}

export async function qualityMaterialCert(params: { heat_lot: string }): Promise<PrismResponse> {
  return request('POST', '/erp/quality-material-cert', params);
}

export async function qualityTraceHeatLot(params: { heat_lot: string }): Promise<PrismResponse> {
  return request('POST', '/erp/quality-trace-heat-lot', params);
}

export async function qualityTraceJob(params: { job_id: string }): Promise<PrismResponse> {
  return request('POST', '/erp/quality-trace-job', params);
}

export async function qualityNCRUpdate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/quality-ncr-update', params);
}

export async function qualityFAICreate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/quality-fai-create', params);
}

export async function qualityFAIList(params?: { part_number?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/quality-fai-list', params ?? {});
}

// === HR (extended) ===

export async function hrEnroll(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/hr-enroll', params);
}

export async function hrPTOApprove(params: { request_id: string; approved_by: string }): Promise<PrismResponse> {
  return request('POST', '/erp/hr-pto-approve', params);
}

export async function hrReviewCreate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/hr-review-create', params);
}

export async function hrReviews(params?: { employee_id?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/hr-reviews', params ?? {});
}

export async function hrCompensationHistory(params: { employee_id: string }): Promise<PrismResponse> {
  return request('POST', '/erp/hr-compensation-history', params);
}

// === Customer (extended) ===

export async function customerGet(params: { customer_id: string }): Promise<PrismResponse> {
  return request('POST', '/erp/customer-get', params);
}

export async function customerUpdate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/customer-update', params);
}

export async function customerLogComm(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/customer-log-comm', params);
}

export async function customerCommHistory(params: { customer_id: string }): Promise<PrismResponse> {
  return request('POST', '/erp/customer-comm-history', params);
}

export async function customerFollowUps(): Promise<PrismResponse> {
  return request('GET', '/erp/customer-follow-ups');
}

export async function customerCreateOpportunity(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/customer-create-opportunity', params);
}

export async function customerUpdateOpportunity(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/customer-update-opportunity', params);
}

// === Integration (extended) ===

export async function integrationExportQB(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/export-quickbooks', params);
}

export async function integrationExportPayrollTax(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/export-payroll-tax', params);
}

export async function integrationExportARAging(): Promise<PrismResponse> {
  return request('GET', '/erp/export-ar-aging');
}

// === Inventory (extended) ===

export async function inventorySafetyStock(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/inventory-safety-stock', params);
}

export async function inventoryToolOptimize(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/inventory-tool-optimize', params);
}

// === Scheduling (extended) ===

export async function schedulingSingleMachine(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/scheduling-single-machine', params);
}

export async function schedulingJohnsons(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/scheduling-johnsons', params);
}

export async function schedulingCPM(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/scheduling-cpm', params);
}

// === Capacity (extended) ===

export async function capacityScheduleJob(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/capacity-schedule-job', params);
}

export async function capacityWhatIf(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/capacity-what-if', params);
}

// === GL (extended) ===

export async function glRecordInvoice(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/gl-record-invoice', params);
}

export async function glRecordPayment(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/gl-record-payment', params);
}

export async function glRecordPurchase(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/gl-record-purchase', params);
}

export async function glRecordPayroll(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/gl-record-payroll', params);
}

// === PO (extended) ===

export async function poThreeWayMatch(params: { po_id: string }): Promise<PrismResponse> {
  return request('POST', '/erp/po-three-way-match', params);
}

export async function poSpendByCategory(params?: { period?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/po-spend-by-category', params ?? {});
}

// === Quote Analytics (extended) ===

export async function analyticsRecord(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/analytics-record', params);
}

export async function analyticsUpdateOutcome(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/analytics-update-outcome', params);
}

export async function analyticsRecordActuals(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/analytics-record-actuals', params);
}

// === Blueprint (extended) ===

export async function blueprintResolveMaterial(params: { description: string }): Promise<PrismResponse> {
  return request('POST', '/quote/blueprint-resolve-material', params);
}

// === Quoting ===

export async function quotingGenerate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/generate', params);
}

export async function quotingPriceBreaks(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/quote/price-breaks', params);
}

export async function quoteInstant(params: Record<string, unknown>): Promise<DataResponse<InstantQuoteResult>> {
  return requestData('POST', '/quotes/instant', params);
}

export async function quoteQtyBreaks(
  params: Record<string, unknown>,
): Promise<DataResponse<InstantQuoteQuantityBreak[]>> {
  return requestData('POST', '/quotes/qty-breaks', params);
}

export async function quoteLeadTime(
  params: Record<string, unknown>,
): Promise<DataResponse<InstantQuoteLeadTimeOption[]>> {
  return requestData('POST', '/quotes/lead-time', params);
}

export async function quoteHistory(quoteId: string): Promise<DataResponse<InstantQuoteHistory>> {
  return requestData('GET', `/quotes/${encodeURIComponent(quoteId)}/history`);
}

export async function quoteStatusChange(params: {
  quote_id: string;
  to_status: InstantQuoteStatus;
  changed_by?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}): Promise<PrismResponse> {
  const { quote_id, ...payload } = params;
  return request('POST', `/quotes/${encodeURIComponent(quote_id)}/status`, payload);
}

export async function quoteShareToken(
  quoteId: string,
  expiresInDays?: number,
): Promise<DataResponse<InstantQuoteShareToken>> {
  const query = expiresInDays ? `?expires_in_days=${encodeURIComponent(String(expiresInDays))}` : '';
  return requestData('GET', `/quotes/${encodeURIComponent(quoteId)}/share${query}`);
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

// === DFM ===

export async function dfmQuick(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/dfm/quick', params);
}

export async function dfmAnalyze(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/dfm/analyze', params);
}

export async function dfmToleranceCheck(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/dfm/tolerance-check', params);
}

export async function dfmCostImpact(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/dfm/cost-impact', params);
}

export async function dfmRules(): Promise<PrismResponse> {
  return request('GET', '/dfm/rules');
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

// === Post Processor Generator ===

export async function ppgGenerate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/template', params);
}

/** PPG-VAR-MS0 U01: Call real 38-stage PostProcessorPipelineEngine */
export async function ppgPipelineProcess(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/pipeline', params);
}

/** PPG-VAR-MS0 U03: Search materials from MaterialRegistry */
export async function ppgMaterialSearch(query: string): Promise<PrismResponse> {
  return request('POST', '/ppg/material/search', { query });
}

/** PPG-SHIP-MS0 U-SH14: Search tools from ToolRegistry (75K tools) */
export async function ppgToolSearch(params: { query?: string; type?: string; manufacturer?: string; limit?: number; offset?: number }): Promise<PrismResponse> {
  return request('POST', '/data/tool/search', params);
}

/** PPG-SHIP-MS0 U-SH15: Get holder catalog */
export async function ppgHolderCatalog(params?: { brand?: string; type?: string; interface_type?: string }): Promise<PrismResponse> {
  return request('POST', '/data/holder/catalog', params ?? {});
}

export async function ppgProgram(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/program', params);
}

export async function ppgValidate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/validate', params);
}

export async function ppgCompare(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/compare', params);
}

export async function ppgControllers(): Promise<PrismResponse> {
  return request('GET', '/ppg/controllers');
}

export async function ppgOperations(): Promise<PrismResponse> {
  return request('GET', '/ppg/operations');
}

export async function ppgMachineManufacturers(): Promise<PrismResponse> {
  return request('GET', '/ppg/machine/manufacturers');
}

export async function ppgMachineFingerprint(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/machine/fingerprint', params);
}

export async function ppgMachineFeatures(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('GET', '/ppg/machine/features', params);
}

export async function ppgDownload(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/download', params);
}

export async function ppgSetupSheet(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/download/setup-sheet', params);
}

export async function ppgManifest(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/download/manifest', params);
}

export async function ppgProveOut(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/prove-out', params);
}

export async function ppgValidateLimits(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/validate-limits', params);
}

export async function ppgValidationReport(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/validation-report', params);
}

export async function ppgLibrarySearch(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/library/search', params);
}

export async function ppgLibraryFacets(): Promise<PrismResponse> {
  return request('GET', '/ppg/library/facets');
}

export async function ppgLibraryDetail(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/library/detail', params);
}

export async function ppgRoiCalculate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/roi', params);
}

// PP-MS8: Non-Traditional Process Posts
export async function ppgEdmGenerate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/edm/generate', params);
}

export async function ppgEdmControllers(): Promise<PrismResponse> {
  return request('GET', '/ppg/edm/controllers');
}

export async function ppgLaserGenerate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/laser/generate', params);
}

export async function ppgWaterjetGenerate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/waterjet/generate', params);
}

export async function ppgSheetControllers(): Promise<PrismResponse> {
  return request('GET', '/ppg/sheet/controllers');
}

// PP-MS7: Coolant, Probing, Subprogram
export async function ppgCoolantConfig(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/coolant/config', params);
}

export async function ppgCoolantControllers(): Promise<PrismResponse> {
  return request('GET', '/ppg/coolant/controllers');
}

export async function ppgProbeWcs(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/probe/wcs', params);
}

export async function ppgProbeInspect(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/probe/inspect', params);
}

export async function ppgProbeTool(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/probe/tool', params);
}

export async function ppgSubprogramAnalyze(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/subprogram/analyze', params);
}

export async function ppgSubprogramDetect(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/subprogram/detect', params);
}

export async function ppgTelemetryRecord(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/telemetry', params);
}

export async function ppgTelemetryFunnel(): Promise<PrismResponse> {
  return request('GET', '/ppg/telemetry/funnel');
}

// === PPG Setup Sheet + Cycle Time (PP-REV-MS1) ===

export async function ppgSetupSheetAuto(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/setup-sheet', params);
}

export async function ppgCycleTime(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/cycle-time', params);
}

export async function ppgCycleTimeCompare(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/cycle-time-compare', params);
}

// === PPG Tool Optimization + Magazine (PP-REV-MS2) ===

export async function ppgToolOptimize(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/tool-optimize', params);
}

export async function ppgMagazineLayout(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/magazine-layout', params);
}

// === PPG Optimization Report (PP-REV-MS0-S2) ===

export async function ppgOptimizationReport(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/optimization-report', params);
}

export async function ppgFeatureSelect(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/feature-select', params);
}

export async function ppgProveOutPromote(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/prove-out/promote', params);
}

export async function ppgAirCutDetect(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ppg/air-cut/detect', params);
}

export async function ppgHistory(): Promise<PrismResponse> {
  return request('GET', '/ppg/history');
}

export async function ppgProgramsCatalog(): Promise<PrismResponse> {
  return request('GET', '/ppg/programs/catalog');
}

export async function ppgProgramsList(controller: string, offset = 0, limit = 50, search = ''): Promise<PrismResponse> {
  const params = new URLSearchParams({ controller, offset: String(offset), limit: String(limit), search });
  return request('GET', `/ppg/programs/list?${params}`);
}

export async function ppgProgramLoad(filePath: string): Promise<PrismResponse> {
  return request('GET', `/ppg/programs/load?path=${encodeURIComponent(filePath)}`);
}

export async function ppgProgramsStats(): Promise<PrismResponse> {
  return request('GET', '/ppg/programs/stats');
}

// === External Integration API ===

export async function apiOptimize(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ext/optimize', params);
}

export async function apiFeedback(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/ext/feedback', params);
}

export async function apiMachineLearning(machineId: string, controller?: string): Promise<PrismResponse> {
  const query = controller ? `?controller=${controller}` : '';
  return request('GET', `/ext/machines/${machineId}/learning${query}`);
}

// === Document Learning ===

export async function docUpload(params: { file_path: string; title?: string }): Promise<PrismResponse> {
  return request('POST', '/doc/upload', params);
}

export async function docExtract(params: { doc_id: string }): Promise<PrismResponse> {
  return request('POST', '/doc/extract', params);
}

export async function docList(): Promise<PrismResponse> {
  return request('GET', '/doc/list');
}

export async function docGet(params: { doc_id: string }): Promise<PrismResponse> {
  return request('POST', '/doc/get', params);
}

export async function docDelete(params: { doc_id: string }): Promise<PrismResponse> {
  return request('POST', '/doc/delete', params);
}

// === Machine Live ===

export async function machineLiveList(params?: { protocol?: string; status?: string }): Promise<PrismResponse> {
  return request('POST', '/machine-live/list', params ?? {});
}

export async function machineLiveStatus(params: { machine_id: string }): Promise<PrismResponse> {
  return request('POST', '/machine-live/status', params);
}

export async function machineLiveAdaptive(params: { machine_id?: string }): Promise<PrismResponse> {
  return request('POST', '/machine-live/adaptive', params);
}

export async function machineLiveMaintenance(params: { machine_id: string }): Promise<PrismResponse> {
  return request('POST', '/machine-live/maintenance', params);
}

export async function machineLiveTwin(params: { machine_id?: string }): Promise<PrismResponse> {
  return request('POST', '/machine-live/twin', params);
}

export async function machineLiveAcknowledge(params: { machine_id?: string; alert_id?: string; acknowledged_by?: string }): Promise<PrismResponse> {
  return request('POST', '/machine-live/acknowledge', params);
}

export async function machineLiveConnect(params: { machine_id: string; timeout_ms?: number }): Promise<PrismResponse> {
  return request('POST', '/machine-live/connect', params);
}

// === Realtime ===

export async function realtimeEmit(params: {
  type: string;
  room?: string;
  payload?: Record<string, unknown>;
}): Promise<PrismResponse> {
  return request('POST', '/realtime/emit', params);
}

export async function realtimeStats(): Promise<PrismResponse> {
  return request('GET', '/realtime/stats');
}

// === Wire EDM Live Status (U-P2PFS32) ===

export interface WedmSafetyEnvelopeStatus {
  score: number; // 0-1, S(x) safety score
  level: 'safe' | 'warning' | 'critical';
  factors: Array<{
    name: string;
    value: number;
    threshold: number;
    status: 'ok' | 'warn' | 'fail';
  }>;
  last_updated: string;
  violations?: string[];
}

export async function wedmSafetyEnvelope(params?: { machine_id?: string }): Promise<DataResponse<WedmSafetyEnvelopeStatus>> {
  return requestData('POST', '/wedm-live/safety-envelope', params ?? {});
}

export interface WedmAutonomyStatus {
  level: 0 | 1 | 2 | 3 | 4 | 5; // L0 (manual) to L5 (full autonomy)
  level_label: string;
  confidence: number;
  can_promote: boolean;
  promote_blocked_by?: string[];
  active_rules: string[];
  last_handoff?: string;
}

export async function wedmAutonomyStatus(params?: { machine_id?: string }): Promise<DataResponse<WedmAutonomyStatus>> {
  return requestData('POST', '/wedm-live/autonomy', params ?? {});
}

// === Wire EDM RUL + Maintenance (U-P2PFS33) ===

export interface WedmRulStatus {
  wire_spool: {
    remaining_pct: number;
    remaining_meters: number;
    estimated_cuts_remaining: number;
  };
  upper_guide: {
    rul_pct: number;
    hours_remaining: number;
    condition: 'good' | 'fair' | 'worn' | 'replace';
  };
  lower_guide: {
    rul_pct: number;
    hours_remaining: number;
    condition: 'good' | 'fair' | 'worn' | 'replace';
  };
  power_feed: {
    rul_pct: number;
    cycles_remaining: number;
  };
  last_updated: string;
}

export async function wedmRulStatus(params?: { machine_id?: string }): Promise<DataResponse<WedmRulStatus>> {
  return requestData('POST', '/wedm-live/rul', params ?? {});
}

export interface WedmMaintenanceItem {
  id: string;
  component: string;
  type: 'scheduled' | 'predictive' | 'overdue';
  due_date: string;
  due_hours?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimated_downtime_min?: number;
}

export interface WedmMaintenanceStatus {
  items: WedmMaintenanceItem[];
  next_scheduled: string | null;
  overdue_count: number;
}

export async function wedmMaintenanceStatus(params?: { machine_id?: string }): Promise<DataResponse<WedmMaintenanceStatus>> {
  return requestData('POST', '/wedm-live/maintenance', params ?? {});
}

// === Wire EDM Controller Code Preview (U-P2PFS34) ===

export interface WedmCodePreviewParams {
  material: string;
  thickness_mm: number;
  cutting_speed_mm_min?: number;
  peak_current_A?: number;
  pulse_on_us?: number;
  pulse_off_us?: number;
  wire_tension_N?: number;
  servo_voltage_V?: number;
  passes?: Array<{ type: string; offset_mm: number }>;
}

export interface WedmCodePreviewResult {
  program: string;
  controller: 'mitsubishi' | 'fanuc' | 'agie' | 'sodick';
  line_count: number;
  estimated_time_min: number;
  registers: {
    E: number;
    C: number;
    T: number;
    H: number;
  };
}

export async function wedmCodePreview(params: WedmCodePreviewParams): Promise<DataResponse<WedmCodePreviewResult>> {
  return requestData('POST', '/edm/code-preview', params);
}

// === Auto-Forge ===

export async function autoForge(params: {
  name: string;
  description: string;
  domain?: string;
  methods?: Array<{ name: string; description?: string; params?: Array<{ name: string; type: string; optional?: boolean }>; return_type?: string; is_async?: boolean }>;
  dry_run?: boolean;
}): Promise<PrismResponse> {
  return request('POST', '/dev/forge', params);
}

export async function autoForgeSummary(params: {
  name: string;
  description: string;
  domain?: string;
}): Promise<PrismResponse> {
  return request('POST', '/dev/forge/summary', params);
}

// === Resource Census ===

export async function resourceCensus(params?: {
  location?: 'prism' | 'archive' | 'box';
  type?: string;
}): Promise<PrismResponse> {
  return request('POST', '/dev/resource-census', params ?? {});
}

export async function resourceCensusRead(): Promise<PrismResponse> {
  return request('GET', '/dev/resource-census/read');
}

export async function resourceCensusSummary(): Promise<PrismResponse> {
  return request('GET', '/dev/resource-census/summary');
}

// === PDF Pipeline ===

export async function pdfPipelineClassify(params?: {
  max_pdfs?: number;
}): Promise<PrismResponse> {
  return request('POST', '/dev/pdf-pipeline/classify', params ?? {});
}

export async function pdfPipelineExtract(params?: {
  category?: string;
  batch_size?: number;
}): Promise<PrismResponse> {
  return request('POST', '/dev/pdf-pipeline/extract', params ?? {});
}

export async function pdfPipelineRead(): Promise<PrismResponse> {
  return request('GET', '/dev/pdf-pipeline/read');
}

export async function pdfPipelineSummary(): Promise<PrismResponse> {
  return request('GET', '/dev/pdf-pipeline/summary');
}

// ── SQ3-0: Machine data hardening ──
export async function machineHardenAudit(machineId?: string): Promise<PrismResponse> {
  return request('POST', '/dev/machine-harden/audit', { machine_id: machineId });
}
export async function machineHardenEnrich(machineId?: string, dryRun = true): Promise<PrismResponse> {
  return request('POST', '/dev/machine-harden/enrich', { machine_id: machineId, dry_run: dryRun });
}
export async function machineHardenValidate(machineId?: string): Promise<PrismResponse> {
  return request('POST', '/dev/machine-harden/validate', { machine_id: machineId });
}
export async function machineHardenRead(): Promise<PrismResponse> {
  return request('GET', '/dev/machine-harden/read');
}
export async function machineHardenSummary(): Promise<PrismResponse> {
  return request('GET', '/dev/machine-harden/summary');
}

// === EMP-MS0 Phase 5-6: Lean / Manufacturing Excellence ===

export async function analyticsOEE(params?: { machine_id?: string; period?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/analytics/oee', params ?? {});
}

export async function analyticsPredictive(params?: { machine_id?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/analytics/predictive', params ?? {});
}

export async function analyticsBottleneck(params?: { period_weeks?: number }): Promise<PrismResponse> {
  return request('POST', '/erp/analytics/bottleneck', params ?? {});
}

export async function attendanceReport(params: { start_date: string; end_date: string; department?: string }): Promise<PrismResponse> {
  return request('POST', '/erp/attendance', params);
}

export async function qualityNCRDashboard(): Promise<PrismResponse> {
  return request('GET', '/erp/quality-ncr-dashboard');
}

// === BIZ-MS5: Preventive Maintenance ===

export async function pmScheduleCreate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/pm-schedule-create', params);
}
export async function pmScheduleList(filters?: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/pm-schedule-list', filters ?? {});
}
export async function pmWorkOrderGenerate(scheduleId: string, scheduledDate: string): Promise<PrismResponse> {
  return request('POST', '/erp/pm-work-order-generate', { schedule_id: scheduleId, scheduled_date: scheduledDate });
}
export async function pmWorkOrderList(filters?: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/pm-work-order-list', filters ?? {});
}
export async function pmWorkOrderAssign(workOrderId: string, assignedTo: string): Promise<PrismResponse> {
  return request('POST', '/erp/pm-work-order-assign', { work_order_id: workOrderId, assigned_to: assignedTo });
}
export async function pmComplete(workOrderId: string, params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/pm-complete', { work_order_id: workOrderId, ...params });
}
export async function pmOverdueAlerts(): Promise<PrismResponse> {
  return request('GET', '/erp/pm-overdue-alerts');
}

// === BIZ-MS5: Equipment Assets ===

export async function assetRegister(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/asset-register', params);
}
export async function assetList(filters?: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/asset-list', filters ?? {});
}
export async function assetDepreciation(assetId: string): Promise<PrismResponse> {
  return request('GET', `/erp/asset-depreciation/${encodeURIComponent(assetId)}`);
}
export async function assetTransfer(assetId: string, params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/asset-transfer', { asset_id: assetId, ...params });
}
export async function assetDueCalibrations(daysAhead?: number): Promise<PrismResponse> {
  return request('POST', '/erp/asset-due-calibrations', daysAhead ? { days_ahead: daysAhead } : {});
}

// === BIZ-MS5: Calibration ===

export async function calibrationSchedule(): Promise<PrismResponse> {
  return request('GET', '/erp/calibration-schedule');
}

export async function gageRRStudies(): Promise<PrismResponse> {
  return request('GET', '/erp/gage-rr-studies');
}

export async function calibrationRecord(params: {
  gage_id: string;
  performed_by: string;
  result: 'pass' | 'fail' | 'conditional';
  certificate_ref?: string;
  notes?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/calibration-record', params);
}

export async function calScheduleList(): Promise<PrismResponse> {
  return request('GET', '/erp/cal-schedule-list');
}
export async function calRecord(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/cal-record', params);
}
export async function calOverdueAlerts(): Promise<PrismResponse> {
  return request('GET', '/erp/cal-overdue-alerts');
}
export async function calLockout(gageId: string, reason: string): Promise<PrismResponse> {
  return request('POST', '/erp/cal-lockout', { gage_id: gageId, reason });
}
export async function calUnlock(gageId: string): Promise<PrismResponse> {
  return request('POST', '/erp/cal-unlock', { gage_id: gageId });
}
export async function calGrrRecord(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/cal-grr-record', params);
}

// === BIZ-MS5: OSHA Compliance ===

export async function oshaIncidents(): Promise<PrismResponse> {
  return request('GET', '/erp/osha-incidents');
}

export async function oshaIncidentReport(params: {
  incident_date: string;
  employee_name: string;
  department: string;
  incident_type: string;
  description: string;
  medical_treatment: boolean;
  days_away: number;
  recordable: boolean;
}): Promise<PrismResponse> {
  return request('POST', '/erp/osha-incidents', params);
}

export async function osha300LogFeed(year: number): Promise<PrismResponse> {
  const query = new URLSearchParams({ year: String(year) });
  return request('GET', `/erp/osha-300-log?${query.toString()}`);
}

export async function oshaSafetyTraining(): Promise<PrismResponse> {
  return request('GET', '/erp/safety-training');
}

export async function oshaPpeRecords(): Promise<PrismResponse> {
  return request('GET', '/erp/ppe-records');
}

export async function oshaIncidentCreate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/osha-incident-create', params);
}
export async function oshaLog300(year: number): Promise<PrismResponse> {
  return request('POST', '/erp/osha-log-300', { year });
}
export async function oshaNearMiss(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/osha-near-miss', params);
}
export async function oshaPpeAssign(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/osha-ppe-assign', params);
}

// === BIZ-MS5: NCR 8D Workflow ===

export async function ncr8dCreate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/ncr-8d-create', params);
}
export async function ncr8dAdvance(reportId: string, disciplineData: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/ncr-8d-advance', { report_id: reportId, ...disciplineData });
}
export async function ncr8dReport(reportId: string): Promise<PrismResponse> {
  return request('GET', `/erp/ncr-8d-report/${encodeURIComponent(reportId)}`);
}

// === BIZ-MS5: Audit Manager ===

export async function auditSchedules(): Promise<PrismResponse> {
  return request('GET', '/erp/audit-schedules');
}
export async function auditSchedule(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/audit-schedule', params);
}
export async function auditFindings(): Promise<PrismResponse> {
  return request('GET', '/erp/audit-findings');
}
export async function auditFindingCreate(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/audit-finding-create', params);
}
export async function auditCapaCreate(findingId: string, params?: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/audit-capa-create', { finding_id: findingId, ...params });
}
export async function managementReviewPackage(params: {
  start_date: string;
  end_date: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/management-review-package', params);
}
export async function auditMgmtReview(periodStart: string, periodEnd: string): Promise<PrismResponse> {
  return request('POST', '/erp/audit-mgmt-review', { period_start: periodStart, period_end: periodEnd });
}

// === BIZ-MS5: E2 Integration ===

export async function e2Connect(config: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/e2-connect', config);
}
export async function e2SyncStatus(): Promise<PrismResponse> {
  return request('GET', '/erp/e2-sync-status');
}
export async function e2SyncNow(): Promise<PrismResponse> {
  return request('POST', '/erp/e2-sync-now', {});
}

// === BIZ-MS5: QBO Deep Sync ===

export async function qboSyncInvoices(): Promise<PrismResponse> {
  return request('POST', '/erp/qbo-sync-invoices', {});
}
export async function qboSyncPayments(): Promise<PrismResponse> {
  return request('POST', '/erp/qbo-sync-payments', {});
}
export async function qboReconcile(): Promise<PrismResponse> {
  return request('POST', '/erp/qbo-reconcile', {});
}

// === BIZ-MS5: Notifications ===

export async function notifySend(params: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/notify-send', params);
}
export async function notifyPreferencesGet(employeeId: string): Promise<PrismResponse> {
  return request('GET', `/erp/notify-preferences/${encodeURIComponent(employeeId)}`);
}
export async function notifyPreferencesSet(employeeId: string, prefs: Record<string, unknown>): Promise<PrismResponse> {
  return request('POST', '/erp/notify-preferences-set', { employee_id: employeeId, ...prefs });
}
export async function notifyGetInApp(employeeId: string): Promise<PrismResponse> {
  return request('GET', `/erp/notify-in-app/${encodeURIComponent(employeeId)}`);
}
export async function notifyMarkRead(employeeId: string, notificationId: string): Promise<PrismResponse> {
  return request('POST', '/erp/notify-mark-read', { employee_id: employeeId, notification_id: notificationId });
}
export async function notifyUnreadCount(employeeId: string): Promise<PrismResponse> {
  return request('GET', `/erp/notify-unread-count/${encodeURIComponent(employeeId)}`);
}

// 2026-05-26 (slot golf, tsc-fix): wedmRequestApproval is called by WireEdmWizardPage:426
// (production code) and mocked by WireEdmPages.test.tsx. The real backend route was never
// wired. Per R12 fail-loud — production try/catch at WireEdmWizardPage:432 already routes
// failure to setErpError('Failed to request approval'), so user-visible failure is honest.
// Tests bypass via vi.fn(). Future U-WEB-WEDM-REQUEST-APPROVAL implements the real route.
export async function wedmRequestApproval(_params: { reason: string }): Promise<PrismResponse<{ status: string; ticketId?: string }>> {
  throw new Error('NOT_IMPLEMENTED: wedmRequestApproval was never wired — see U-WEB-WEDM-REQUEST-APPROVAL');
}

// 2026-05-27 (slot golf, GOAL-TSC-FIX iter6): wedmApprovalStatus + WedmApprovalStatus
// referenced by WireEdmWizardPage but never landed. Same fail-loud pattern.
// Future U-WEB-WEDM-APPROVAL-STATUS wires the real route.
export interface WedmApprovalStatus {
  status: 'pending' | 'approved' | 'rejected' | string;
  ticketId?: string;
  // camelCase + snake_case both accepted — backend returns snake_case but some
  // frontend call sites use camelCase. Future U-WEB-API-CASE-NORMALIZE picks one.
  approvedBy?: string;
  approvedAt?: string;
  approver?: string;
  approved_at?: string;
  approved?: boolean;
  requires_approval?: boolean;
  reason?: string;
  [key: string]: unknown;
}

export async function wedmApprovalStatus(_ticketId?: string): Promise<PrismResponse<WedmApprovalStatus>> {
  throw new Error('NOT_IMPLEMENTED: wedmApprovalStatus was never wired — see U-WEB-WEDM-APPROVAL-STATUS');
}
