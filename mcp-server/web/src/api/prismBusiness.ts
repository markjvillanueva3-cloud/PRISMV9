/**
 * PRISM Business Suite API Client (hotel iter9, 2026-05-24)
 *
 * Thin REST wrapper over the `prism_business` MCP dispatcher — covers
 * quoting / orders / customer-portal / costing / scheduling / reporting /
 * purchasing / financial / employee / inventory. Server mounts at
 * /api/v1/business/dispatch (follow-up: U-BUSINESS-EXPRESS-ROUTES).
 *
 * Same single-envelope pattern as employeePortal.ts: POST {action, params}
 * → dispatcher returns `result` verbatim.
 */

const API_BASE = '/api/v1/business';

export class PrismBusinessApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'PrismBusinessApiError';
  }
}

async function call<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('prism_auth_token') : null;
  const res = await fetch(`${API_BASE}/dispatch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, params }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new PrismBusinessApiError(res.status, text);
  }
  return (await res.json()) as T;
}

// ─── Customer Portal (JM Die accounts) ───────────────────────────────────────
export const portalCreateToken = (p: Record<string, unknown>) => call('portal_create_token', p);
export const portalListTokens = (p: { entity_id: string }) => call<{ ok: boolean; tokens: PortalToken[] }>('portal_list_tokens', p);
export const portalRevokeToken = (p: { token: string }) => call('portal_revoke_token', p);
export const portalQuoteView = (p: Record<string, unknown>) => call<{ ok: boolean; quote: PortalQuote }>('portal_quote_view', p);
export const portalQuoteRespond = (p: Record<string, unknown>) => call('portal_quote_respond', p);
export const portalOrderStatus = (p: Record<string, unknown>) => call<{ ok: boolean; status: PortalOrderStatus }>('portal_order_status', p);
export const portalListMessages = (p: Record<string, unknown>) => call<{ ok: boolean; messages: PortalMessage[] }>('portal_list_messages', p);
export const portalSendMessage = (p: Record<string, unknown>) => call('portal_send_message', p);
export const portalMarkRead = (p: Record<string, unknown>) => call('portal_mark_read', p);
export const portalListQualityDocs = (p: { job_id: string }) => call<{ ok: boolean; docs: QualityDoc[] }>('portal_list_quality_docs', p);

// ─── Quoting ────────────────────────────────────────────────────────────────
export const quotingGenerate = (p: Record<string, unknown>) => call<{ ok: boolean; quote: GeneratedQuote }>('quoting_generate', p);
export const quotingPriceBreaks = (p: Record<string, unknown>) => call<{ ok: boolean; tiers: PriceTier[] }>('quoting_price_breaks', p);

// ─── Costing ────────────────────────────────────────────────────────────────
export const costingJobCost = (p: Record<string, unknown>) => call<{ ok: boolean; cost: JobCost }>('costing_job_cost', p);
export const costingMaterial = (p: Record<string, unknown>) => call('costing_material', p);
export const costingMachining = (p: Record<string, unknown>) => call('costing_machining', p);

// ─── Orders ─────────────────────────────────────────────────────────────────
export const orderList = (p?: Record<string, unknown>) => call<{ ok: boolean; orders: Order[] }>('order_list', p ?? {});
export const orderCreate = (p: Record<string, unknown>) => call('order_create', p);
export const orderUpdateStatus = (p: Record<string, unknown>) => call('order_update_status', p);
export const orderMachineQueue = (p?: Record<string, unknown>) => call<{ ok: boolean; queue: MachineQueueEntry[] }>('order_machine_queue', p ?? {});
export const orderMetrics = (p?: Record<string, unknown>) => call<{ ok: boolean; metrics: OrderMetrics }>('order_metrics', p ?? {});

// ─── Financial / Accounting ─────────────────────────────────────────────────
export const financialNpv = (p: Record<string, unknown>) => call<{ ok: boolean; npv: number; details: Record<string, unknown> }>('financial_npv', p);
export const financialIrr = (p: Record<string, unknown>) => call<{ ok: boolean; irr: number; details: Record<string, unknown> }>('financial_irr', p);
export const financialBreakeven = (p: Record<string, unknown>) => call<{ ok: boolean; breakeven: number; details: Record<string, unknown> }>('financial_breakeven', p);
export const financialMachineInvestment = (p: Record<string, unknown>) => call('financial_machine_investment', p);

// ─── Reporting ──────────────────────────────────────────────────────────────
export const reportingDashboard = (p?: Record<string, unknown>) => call<{ ok: boolean; dashboard: Dashboard }>('reporting_dashboard', p ?? {});
export const reportingFinancial = (p?: Record<string, unknown>) => call<{ ok: boolean; report: FinancialReport }>('reporting_financial', p ?? {});
export const reportingProduction = (p?: Record<string, unknown>) => call<{ ok: boolean; report: ProductionReport }>('reporting_production', p ?? {});

// ─── Job lifecycle ──────────────────────────────────────────────────────────
export const jobDashboard = (p?: Record<string, unknown>) => call<{ ok: boolean; dashboard: JobDashboard }>('job_dashboard', p ?? {});
export const jobSummary = (p: { job_id: string }) => call<{ ok: boolean; summary: JobSummary }>('job_summary', p);

// ─── Amortization / Depreciation (G8 — hotel iter12) ────────────────────────
export const amortizationPayment = (p: { principal: number; rate_periodic: number; n_periods: number }) =>
  call<{ payment: number }>('amortization_payment', p);
export const amortizationSchedule = (p: { principal: number; rate_annual: number; n_periods: number; periods_per_year?: number }) =>
  call<AmortizationSchedule>('amortization_schedule', p);
export const amortizationStraightLine = (p: { cost: number; salvage: number; life_years: number }) =>
  call<DepreciationSchedule>('amortization_straight_line', p);

// ─── Recurring Expenses (G8 — hotel iter12) ─────────────────────────────────
export const recurringExpenseCreate = (p: RecurringExpenseCreateInput) =>
  call<RecurringExpense>('recurring_expense_create', p as unknown as Record<string, unknown>);
export const recurringExpenseGet = (p: { id: string }) =>
  call<{ expense: RecurringExpense | null }>('recurring_expense_get', p);
export const recurringExpenseList = (p?: { active?: boolean; category?: RecurringCategory }) =>
  call<{ expenses: RecurringExpense[] }>('recurring_expense_list', (p ?? {}) as Record<string, unknown>);
export const recurringExpenseUpdateAmount = (p: { id: string; new_amount: number }) =>
  call<RecurringExpense>('recurring_expense_update_amount', p);
export const recurringExpenseDeactivate = (p: { id: string }) =>
  call<RecurringExpense>('recurring_expense_deactivate', p);
export const recurringExpenseMonthlyBurden = () =>
  call<MonthlyBurdenReport>('recurring_expense_monthly_burden', {});
export const recurringExpenseForecast = (p: { id: string; lookahead_periods: number }) =>
  call<DueDateForecast>('recurring_expense_forecast', p);

// ─── Additional Types (hotel iter12) ────────────────────────────────────────
export interface AmortizationRow {
  period: number;
  payment: number;
  principal_payment: number;
  interest_payment: number;
  remaining_balance: number;
}
export interface AmortizationSchedule {
  principal: number;
  rate_annual: number;
  rate_periodic: number;
  n_periods: number;
  periods_per_year: number;
  payment: number;
  total_paid: number;
  total_interest: number;
  rows: AmortizationRow[];
}
export interface DepreciationRow {
  year: number;
  depreciation: number;
  accumulated: number;
  book_value: number;
}
export interface DepreciationSchedule {
  cost: number;
  salvage: number;
  life_years: number;
  annual_depreciation: number;
  rows: DepreciationRow[];
}
export type RecurringFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type RecurringCategory = 'utility' | 'subscription' | 'insurance' | 'lease' | 'service' | 'membership' | 'other';
export interface RecurringExpense {
  id: string;
  vendor_name: string;
  vendor_id?: string;
  category: RecurringCategory;
  description: string;
  amount: number;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string;
  auto_renew: boolean;
  memo: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}
export interface RecurringExpenseCreateInput {
  vendor_name: string;
  vendor_id?: string;
  category: RecurringCategory;
  description: string;
  amount: number;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string;
  auto_renew?: boolean;
  memo?: string;
}
export interface MonthlyBurdenReport {
  total_monthly: number;
  total_annual: number;
  by_category: Record<RecurringCategory, number>;
  active_count: number;
  ledger_balanced: boolean;
  fetched_at: string;
}
export interface DueDateForecast {
  expense_id: string;
  vendor_name: string;
  amount: number;
  next_due_dates: string[];
}

// ─── Inventory ROP / EOQ / Safety Stock (G11 — hotel iter13) ────────────────
export const inventoryEoq = (p: { annual_demand: number; order_cost: number; holding_cost: number }) =>
  call<{ eoq: number }>('inventory_eoq', p);
export const inventorySafetyStock = (p: { std_dev_demand: number; lead_time_days: number; service_level: number }) =>
  call<{ safety_stock: number }>('inventory_safety_stock', p);
export const inventoryReorderPoint = (p: { avg_daily_demand: number; lead_time_days: number; safety_stock: number }) =>
  call<{ reorder_point: number }>('inventory_reorder_point', p);
export const inventoryTotalCost = (p: { annual_demand: number; order_cost: number; holding_cost: number; order_quantity: number }) =>
  call<{ total_cost: number }>('inventory_total_cost', p);
export const inventoryReorderPolicy = (p: {
  annual_demand: number; order_cost: number; holding_cost: number;
  avg_daily_demand: number; std_dev_demand: number;
  lead_time_days: number; service_level: number;
}) => call<ReorderPolicy>('inventory_reorder_policy', p);

// ─── AR Aging (G13 — hotel iter13) ──────────────────────────────────────────
export const arInvoiceRecord = (p: { customer_id: string; invoice_date: string; amount: number }) =>
  call<Invoice>('ar_invoice_record', p);
export const arPaymentRecord = (p: { invoice_id: string; payment_amount: number }) =>
  call<Invoice>('ar_payment_record', p);
export const arInvoiceGet = (p: { id: string }) =>
  call<{ invoice: Invoice | null }>('ar_invoice_get', p);
export const arInvoiceList = (p?: { customer_id?: string; status?: 'open' | 'paid' | 'partial' }) =>
  call<{ invoices: Invoice[] }>('ar_invoice_list', (p ?? {}) as Record<string, unknown>);
export const arAgingReport = (p: { as_of: string }) =>
  call<AgingReport>('ar_aging_report', p);

export interface ReorderPolicy {
  eoq: number;
  safety_stock: number;
  reorder_point: number;
  avg_daily_demand: number;
  service_level: number;
  z_score: number;
  std_dev_demand: number;
  lead_time_days: number;
  expected_orders_per_year: number;
  expected_days_between_orders: number;
}
export interface Invoice {
  id: string;
  customer_id: string;
  invoice_date: string;
  amount: number;
  paid: number;
  open_balance: number;
  status: 'open' | 'paid' | 'partial';
  created_at: string;
  updated_at: string;
}
export type AgingBucket = 'current' | '1_30' | '31_60' | '61_90' | '91_plus';
export interface AgingReport {
  as_of: string;
  total_open_ar: number;
  by_bucket: Record<AgingBucket, number>;
  by_customer: Record<string, number>;
  invoice_count_open: number;
  ledger_balanced: boolean;
  dso_days: number | null;
  bad_debt_allowance: number;
  fetched_at: string;
}

// ─── Price-break optimization + ABC classification (G11ext+G12 — hotel iter14) ──
export interface PriceTierInput { min_qty: number; price_per_unit: number }
export interface PriceBreakResult {
  optimal_qty: number;
  optimal_tier_index: number;
  optimal_price_per_unit: number;
  optimal_total_cost: number;
  candidates: Array<{
    tier_index: number; min_qty: number; price_per_unit: number;
    candidate_qty: number; candidate_qty_source: string;
    total_cost: number; ordering_cost: number; holding_cost_annual: number; purchase_cost_annual: number;
  }>;
}
export const inventoryPriceBreakOptimize = (p: {
  annual_demand: number; order_cost: number; holding_rate: number; tiers: PriceTierInput[];
}) => call<PriceBreakResult>('inventory_price_break_optimize', p as unknown as Record<string, unknown>);

export type ABCClass = 'A' | 'B' | 'C';
export interface ABCItemInput { id: string; value: number }
export interface ABCClassifyResult {
  rows: Array<{ id: string; value: number; rank: number; cumulative_value: number; cumulative_pct: number; abc_class: ABCClass }>;
  total_value: number;
  thresholds: { a: number; b: number };
  counts: Record<ABCClass, number>;
  totals: Record<ABCClass, number>;
  pct_of_total: Record<ABCClass, number>;
  ledger_balanced: boolean;
  fetched_at: string;
}
export const abcClassify = (p: { items: ABCItemInput[]; thresholds?: { a?: number; b?: number } }) =>
  call<ABCClassifyResult>('abc_classify', p as unknown as Record<string, unknown>);

// ─── Tool-life economic replacement (G10 — hotel iter15) ────────────────────
export interface ToolCostInputApi {
  tool_price: number; regrind_cost: number; edges_per_tool: number;
  changeout_min: number; labor_rate_per_min: number; machine_rate_per_min: number;
}
export interface ToolLifeCostResult {
  cost_per_cut_minute: number;
  tool_cost_per_min: number;
  changeout_cost_per_min: number;
  components: { edge_amortized_cost: number; changeout_total_cost: number };
}
export interface ToolLifeEconomicResult extends ToolLifeCostResult {
  t_economic_min: number;
  scrap_risk_per_hr: number;
  expected_scrap_cost_per_min: number;
}
export interface ToolLifeReplacementRow {
  sample_index: number; actual_life_min: number;
  cost_per_cut_minute: number; pct_above_economic: number;
  flag: 'below_economic' | 'near_economic' | 'above_economic';
}
export const toolLifeCostPerMinute = (p: { tool: ToolCostInputApi; t_cut_min: number }) =>
  call<ToolLifeCostResult>('tool_life_cost_per_minute', p as unknown as Record<string, unknown>);
export const toolLifeEconomicLife = (p: { tool: ToolCostInputApi; scrap_risk_per_hr: number; part_value_avg: number }) =>
  call<ToolLifeEconomicResult>('tool_life_economic_life', p as unknown as Record<string, unknown>);
export const toolLifeReplacementSchedule = (p: { tool: ToolCostInputApi; scrap_risk_per_hr: number; part_value_avg: number; actual_lives_min: number[] }) =>
  call<{ rows: ToolLifeReplacementRow[] }>('tool_life_replacement_schedule', p as unknown as Record<string, unknown>);

// ─── Critical Path Method scheduling (G5 — hotel iter16) ────────────────────
export interface CpmTaskInput {
  id: string;
  duration: number;
  predecessor_ids?: string[];
  label?: string;
}
export interface CpmScheduledTask {
  id: string;
  label?: string;
  duration: number;
  predecessor_ids: string[];
  successor_ids: string[];
  earliest_start: number;
  earliest_finish: number;
  latest_start: number;
  latest_finish: number;
  total_slack: number;
  is_critical: boolean;
}
export interface CpmResult {
  tasks: CpmScheduledTask[];
  topological_order: string[];
  project_duration: number;
  critical_path: string[];
  fetched_at: string;
}
export const cpmSchedule = (p: { tasks: CpmTaskInput[] }) =>
  call<CpmResult>('cpm_schedule', p as unknown as Record<string, unknown>);

// ─── BOM Explosion + Cost Rollup (G4 — hotel iter17) ────────────────────────
export interface BomComponentApi { child_id: string; qty_per_parent: number }
export interface BomPartApi {
  id: string; description?: string; unit_cost?: number;
  components?: BomComponentApi[];
}
export interface BomExplosionRowApi {
  part_id: string; description?: string; depth: number;
  qty_required: number; unit_cost: number; extended_cost: number;
}
export interface BomExplosionApiResult {
  root_id: string; top_qty: number;
  rows: BomExplosionRowApi[]; total_parts_count: number; fetched_at: string;
}
export interface BomCostRollupApiResult {
  root_id: string; top_qty: number;
  unit_cost: number; total_cost: number;
  by_level: Array<{ depth: number; cost: number; part_count: number }>;
  ledger_balanced: boolean; fetched_at: string;
}
export const bomExplode = (p: { parts: BomPartApi[]; root_id: string; top_qty: number }) =>
  call<BomExplosionApiResult>('bom_explode', p as unknown as Record<string, unknown>);
export const bomCostRollup = (p: { parts: BomPartApi[]; root_id: string; top_qty: number }) =>
  call<BomCostRollupApiResult>('bom_cost_rollup', p as unknown as Record<string, unknown>);
export const bomCycleCheck = (p: { parts: BomPartApi[]; root_id: string }) =>
  call<{ has_cycle: boolean; cycle_message: string | null }>('bom_cycle_check', p as unknown as Record<string, unknown>);

// ─── Job Routing Templates (G7 — hotel iter18) ──────────────────────────────
export interface RoutingOperationApi {
  seq: number; op_code: string; description: string; work_center_id: string;
  setup_time_min: number; run_time_per_part_min: number;
}
export interface RoutingTemplateApi {
  id: string; name: string; part_family: string;
  operations: RoutingOperationApi[]; created_at: string; updated_at: string;
}
export interface InstantiatedRoutingApi {
  template_id: string; template_name: string; part_id: string; qty: number;
  rows: Array<{ seq: number; op_code: string; description: string; work_center_id: string;
    setup_time_min: number; run_time_per_part_min: number; total_time_min: number }>;
  total_estimated_time_min: number; total_setup_min: number; total_run_min: number;
  rows_balanced: boolean; fetched_at: string;
}
export const routingTemplateCreate = (p: { name: string; part_family: string; operations: RoutingOperationApi[] }) =>
  call<RoutingTemplateApi>('routing_template_create', p as unknown as Record<string, unknown>);
export const routingTemplateGet = (p: { id: string }) =>
  call<{ template: RoutingTemplateApi | null }>('routing_template_get', p);
export const routingTemplateList = (p?: { part_family?: string }) =>
  call<{ templates: RoutingTemplateApi[] }>('routing_template_list', (p ?? {}) as Record<string, unknown>);
export const routingTemplateInstantiate = (p: { template_id: string; part_id: string; qty: number }) =>
  call<InstantiatedRoutingApi>('routing_template_instantiate', p);

// ─── Vendor Quote → Purchase Order lifecycle (G3 — hotel iter19) ────────────
export interface VendorQuoteLineItemApi { sku: string; description: string; quoted_qty: number; unit_price: number }
export interface VendorQuoteApi {
  id: string; vendor_id: string; vendor_name: string;
  line_items: VendorQuoteLineItemApi[]; valid_until: string;
  status: 'open' | 'converted' | 'expired';
  total_value: number; created_at: string; updated_at: string;
}
export interface PurchaseOrderLineItemApi {
  sku: string; description: string; ordered_qty: number; unit_price: number;
  received_qty: number; extended_cost: number;
}
export type POStatusApi = 'open' | 'partially_received' | 'fully_received' | 'matched' | 'cancelled';
export interface PurchaseOrderApi {
  id: string; source_quote_id: string; vendor_id: string; vendor_name: string;
  line_items: PurchaseOrderLineItemApi[]; status: POStatusApi;
  total_ordered_value: number; total_received_value: number;
  created_at: string; updated_at: string;
}
export interface ThreeWayMatchApiResult {
  po_id: string; po_total: number; receipt_total: number; invoice_total: number;
  matched: boolean; variance: number; message: string; fetched_at: string;
}
export const vendorQuoteRecord = (p: { vendor_id: string; vendor_name: string; valid_until: string; line_items: VendorQuoteLineItemApi[] }) =>
  call<VendorQuoteApi>('vendor_quote_record', p as unknown as Record<string, unknown>);
export const vendorQuoteToPO = (p: { quote_id: string; requested_qtys: Record<string, number> }) =>
  call<PurchaseOrderApi>('vendor_quote_to_po', p as unknown as Record<string, unknown>);
export const poReceiptRecord = (p: { po_id: string; receipt_lines: Array<{ sku: string; received_qty: number }> }) =>
  call<PurchaseOrderApi>('po_receipt_record', p as unknown as Record<string, unknown>);
export const poThreeWayMatch = (p: { po_id: string; invoice_total: number }) =>
  call<ThreeWayMatchApiResult>('po_three_way_match', p);
export const vendorQuoteGet = (p: { id: string }) =>
  call<{ quote: VendorQuoteApi | null }>('vendor_quote_get', p);
export const vendorQuoteList = (p?: { vendor_id?: string; status?: 'open' | 'converted' | 'expired' }) =>
  call<{ quotes: VendorQuoteApi[] }>('vendor_quote_list', (p ?? {}) as Record<string, unknown>);
export const poGet = (p: { id: string }) =>
  call<{ po: PurchaseOrderApi | null }>('po_get', p);
export const poList = (p?: { vendor_id?: string; status?: POStatusApi }) =>
  call<{ pos: PurchaseOrderApi[] }>('po_list', (p ?? {}) as Record<string, unknown>);

// ─── Invoice OCR parser + X12 EDI parser (G2+G6 parser halves — hotel iter20) ──
export interface ParsedInvoiceApi {
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  vendor_name_guess: string | null;
  line_items: Array<{ description: string; qty: number | null; unit_price: number | null; line_total: number }>;
  subtotal: number | null;
  tax: number | null;
  grand_total: number | null;
  ledger_balanced: boolean;
  ledger_variance: number;
  parser_warnings: string[];
  fetched_at: string;
}
export interface X12InterchangeApi {
  isa_control: string; sender_id: string; receiver_id: string;
  delimiters: { element_separator: string; sub_element_separator: string; segment_terminator: string };
  groups: Array<{
    gs_id: string; gs_control: string;
    transactions: Array<{
      st_id: string; st_control: string;
      segments: Array<{ tag: string; elements: Array<{ position: number; value: string; sub_elements?: string[] }>; raw: string }>;
    }>;
  }>;
  fetched_at: string;
}
export const invoiceTextParse = (p: { text: string }) =>
  call<ParsedInvoiceApi>('invoice_text_parse', p);
export const x12ParseInterchange = (p: { raw: string }) =>
  call<X12InterchangeApi>('x12_parse_interchange', p);

// ─── Prospective customer sales pipeline (hotel iter21) ─────────────────────
export type ProspectStatusApi = 'cold' | 'researched' | 'first_contact' | 'engaged' | 'quoted' | 'won' | 'lost';
export type WorkTypeApi = 'cnc_milling' | 'cnc_turning' | 'wire_edm' | 'progressive_die' | 'stamping_die_repair' | 'fixture_design' | 'prototype_machining' | 'production_run';
export interface ProspectContactApi {
  primary_contact_name: string; title: string; email: string;
  phone?: string; linkedin_url?: string; best_time_to_reach?: string;
}
export interface ProspectApi {
  id: string; company_name: string; industry: string; city: string; state: string;
  estimated_annual_machining_spend_usd?: number;
  work_types_relevant: WorkTypeApi[];
  relevance_score: number; why_relevant: string;
  contact: ProspectContactApi; contact_memo: string;
  status: ProspectStatusApi;
  first_contact_at?: string; quoted_at?: string; closed_at?: string;
  created_at: string; updated_at: string;
}
export interface ComposedEmailApi {
  subject: string; body: string; signature: string;
  prospect_id: string; recipient_email: string;
  work_type_hooks: string[]; prism_differentiators_cited: string[]; fetched_at: string;
}
export interface ApproachGuideApi {
  prospect_id: string;
  spin_questions: { situation: string[]; problem: string[]; implication: string[]; need_payoff: string[] };
  bant_qualifiers: { budget: string; authority: string; need: string; timeline: string };
  follow_up_cadence_days: number[]; first_quote_trigger: string;
  cialdini_hooks: string[]; fetched_at: string;
}
export interface QuotePromptApi {
  prospect_id: string; required_questions: string[]; optional_questions: string[];
  warning_if_skipped: string[]; fetched_at: string;
}
export const prospectCreate = (p: { company_name: string; industry: string; city: string; state: string;
  estimated_annual_machining_spend_usd?: number; work_types_relevant: WorkTypeApi[];
  relevance_score: number; why_relevant: string; contact: ProspectContactApi; contact_memo?: string }) =>
  call<ProspectApi>('prospect_create', p as unknown as Record<string, unknown>);
export const prospectGet = (p: { id: string }) =>
  call<{ prospect: ProspectApi | null }>('prospect_get', p);
export const prospectList = (p?: { status?: ProspectStatusApi; work_type?: WorkTypeApi; min_relevance?: number }) =>
  call<{ prospects: ProspectApi[] }>('prospect_list', (p ?? {}) as Record<string, unknown>);
export const prospectAdvanceStatus = (p: { id: string; new_status: ProspectStatusApi }) =>
  call<ProspectApi>('prospect_advance_status', p);
export const prospectPipelineReport = () =>
  call<{ by_status: Record<ProspectStatusApi, { count: number; est_spend_total: number }>;
    total_prospects: number; total_pipeline_value_usd: number; fetched_at: string }>('prospect_pipeline_report', {});
export const prospectSeedJmDie = () =>
  call<{ loaded_ids: string[]; count: number }>('prospect_seed_jm_die', {});
export const prospectFirstContactEmail = (p: { id: string }) =>
  call<ComposedEmailApi>('prospect_first_contact_email', p);
export const prospectSalesApproachGuide = (p: { id: string }) =>
  call<ApproachGuideApi>('prospect_sales_approach_guide', p);
export const prospectFirstQuotePrompts = (p: { id: string }) =>
  call<QuotePromptApi>('prospect_first_quote_prompts', p);

// ─── JM Die team user profiles + RBAC (hotel iter23) ────────────────────────
export type UserRoleApi =
  | 'owner' | 'shop_foreman' | 'asst_shop_foreman' | 'cnc_manager_developer'
  | 'sales_quoting' | 'hr_office_manager' | 'receptionist_purchasing' | 'shipping_receiving';
export interface RedactedUserProfileApi {
  id: string; legal_name: string; display_name: string; role: UserRoleApi;
  work_email: string;
  personal_email_redacted: string | null;
  personal_phone_redacted: string | null;
  responsibilities: string[]; owned_domains: string[]; permissions: string[];
  is_backup_for: string | null; notes: string | null; created_at: string;
}
export interface UserProfileSummaryApi {
  id: string; legal_name: string; display_name: string; role: UserRoleApi;
  work_email: string; responsibilities: string[]; owned_domains: string[];
  permission_count: number; is_backup_for: string | null; created_at: string;
}
export interface CoverageReportApi {
  total_features: number; covered_features: number;
  uncovered: string[];
  per_user: Array<{ id: string; permission_count: number }>;
}
export const userProfileGet = (p: { id: string }) =>
  call<{ profile: UserProfileSummaryApi | null }>('user_profile_get', p);
export const userProfileGetRedacted = (p: { id: string }) =>
  call<{ profile: RedactedUserProfileApi | null }>('user_profile_get_redacted', p);
export const userProfileList = (p?: { role?: UserRoleApi; owned_domain?: string }) =>
  call<{ profiles: RedactedUserProfileApi[] }>('user_profile_list', (p ?? {}) as Record<string, unknown>);
export const userProfileSeedJmTeam = () =>
  call<{ loaded_ids: string[]; skipped_ids: string[]; total: number }>('user_profile_seed_jm_team', {});
export const userProfileCheckPermission = (p: { user_id: string; feature: string }) =>
  call<{ user_id: string; feature: string; allowed: boolean }>('user_profile_check_permission', p);
export const userProfileSetActive = (p: { id: string }) =>
  call<{ active_user_id: string; prior_active_user_id: string | null }>('user_profile_set_active', p);
export const userProfileGetActive = () =>
  call<{ active_user: RedactedUserProfileApi | null }>('user_profile_get_active', {});
export const userProfileCoverageReport = () =>
  call<CoverageReportApi>('user_profile_coverage_report', {});

// ─── Email PDF/print intake — Tuesday extraction (hotel iter24) ────────────
export interface InboxConfigApi {
  user_id: string; email_address: string;
  imap_host: string; imap_port: number; use_tls: boolean;
  password_env_var: string;
  folder: string; search_since_days: number;
  output_bucket: string; pictures_allowed: boolean;
}
export interface BatchUserRowApi {
  user_id: string;
  status: 'ok' | 'no_credentials' | 'no_pictures_perm' | 'timeout' | 'error';
  extracted: number; skipped_duplicates: number;
  error_message?: string;
}
export interface BatchRunResultApi {
  ran_at: string; is_tuesday: boolean;
  per_user: BatchUserRowApi[];
  total_extracted: number; total_skipped_duplicates: number; total_users_attempted: number;
}
export const emailIntakeRegisterInbox = (p: InboxConfigApi) =>
  call<{ registered: string; total_inboxes: number }>('email_intake_register_inbox', p as unknown as Record<string, unknown>);
export const emailIntakeListInboxes = () =>
  call<{ inboxes: InboxConfigApi[] }>('email_intake_list_inboxes', {});
export const emailIntakeSeedJmTeam = () =>
  call<{ registered_ids: string[]; skipped_ids: string[]; total: number }>('email_intake_seed_jm_team', {});
export const emailIntakeShouldRunNow = () =>
  call<{ should_run: boolean }>('email_intake_should_run_now', {});
export const emailIntakeRunBatch = (p?: { force_run_ignoring_tuesday?: boolean; timeout_ms_per_user?: number }) =>
  call<BatchRunResultApi>('email_intake_run_batch', (p ?? {}) as Record<string, unknown>);
export const emailIntakeRunDry = () =>
  call<BatchRunResultApi>('email_intake_run_dry', {});

// ─── Intake artifact processor — PDF auto-populate (hotel iter25) ──────────
export interface ParsedToolApi {
  raw_text: string;
  category: 'drill' | 'end_mill' | 'tap' | 'reamer' | 'insert' | 'boring_bar' | 'unknown';
  diameter_mm?: number; diameter_in?: number; flute_count?: number;
  material?: string; coating?: string; confidence: number;
}
export interface ParsedInventoryItemApi {
  raw_text: string;
  category: 'raw_stock' | 'fastener' | 'consumable' | 'part_in_process' | 'unknown';
  description: string; quantity?: number; unit?: string;
  material_spec?: string; confidence: number;
}
export interface ParsedPartApi {
  raw_text: string; part_number: string;
  drawing_number?: string; revision?: string; customer?: string; confidence: number;
}
export interface ProcessedResultApi {
  artifact_sha256: string; source_user_id: string; source_filename: string;
  processed_at: string;
  tools_extracted: ParsedToolApi[];
  inventory_extracted: ParsedInventoryItemApi[];
  parts_extracted: ParsedPartApi[];
  tools_routed: number; inventory_routed: number; parts_routed: number;
  review_queue_count: number; errors: string[];
}
export const intakeProcessArtifact = (p: { artifact: unknown; bytes_base64: string }) =>
  call<ProcessedResultApi>('intake_process_artifact', p as unknown as Record<string, unknown>);
export const intakeProcessorHistory = () =>
  call<{ history: ProcessedResultApi[] }>('intake_processor_history', {});
export const intakeProcessorSummary = () =>
  call<{
    total_processed: number; total_tools_routed: number;
    total_inventory_routed: number; total_parts_routed: number;
    total_review_queue: number; total_errors: number;
  }>('intake_processor_summary', {});
export const intakeProcessorDiagnostics = () =>
  call<{
    tooling_proposed: number; inventory_proposed: number;
    parts_proposed: number; review_queued: number;
  }>('intake_processor_diagnostics', {});

// ─── Vision diagnostic — chip/part/tool photo (hotel iter26) ────────────────
export type ProcessTypeApi = 'roughing' | 'finishing' | 'drilling' | 'tapping';
export type VisionSubjectApi = 'chip' | 'part' | 'tool' | 'mixed';
export interface DiagnosedIssueApi {
  issue_code: string; description: string; root_cause: string;
  severity: 'info' | 'warning' | 'critical';
  confidence: number; subject: VisionSubjectApi;
}
export interface ParameterAdjustmentApi {
  speed_multiplier: number; feed_multiplier: number; doc_multiplier: number;
  stepover_multiplier: number; coolant_flow_multiplier: number;
  recommendations: string[];
}
export interface VisionDiagnosticResultApi {
  image_sha256: string; process_type: ProcessTypeApi;
  observations: unknown[];
  issues: DiagnosedIssueApi[];
  queued_low_confidence: DiagnosedIssueApi[];
  adjustment: ParameterAdjustmentApi;
  overall_confidence: number;
  requires_operator_confirmation: boolean;
  warnings: string[]; diagnosed_at: string;
}
export const visionDiagnoseImage = (p: {
  bytes_base64: string; process_type: ProcessTypeApi; subject_hint?: VisionSubjectApi;
}) => call<VisionDiagnosticResultApi>('vision_diagnose_image', p as unknown as Record<string, unknown>);

// ─── Types (mirror dispatcher return shapes — partial) ──────────────────────
export interface PortalToken { id: string; token: string; entity_id: string; created_at: string; revoked: boolean }
export interface PortalQuote { quote_id: string; status: string; total: number; line_items?: Array<{ description: string; quantity: number; unit_price: number }> }
export interface PortalOrderStatus { order_id: string; status: string; progress_pct?: number; eta?: string }
export interface PortalMessage { id: string; body: string; sender_type: string; sender_name: string; created_at: string; read?: boolean }
export interface QualityDoc { id: string; type: string; uploaded_at: string }
export interface GeneratedQuote { total: number; line_items: Array<{ description: string; cost: number }>; margin?: number }
export interface PriceTier { quantity: number; unit_price: number; total: number }
export interface JobCost { material: number; labor: number; overhead: number; total: number; per_part?: number }
export interface Order { id: string; status: string; customer?: string; total?: number; due_date?: string }
export interface MachineQueueEntry { machine_id: string; jobs: Array<{ job_id: string; status: string }> }
export interface OrderMetrics { open: number; in_progress: number; complete: number; on_time_pct?: number }
export interface Dashboard { open_orders: number; revenue_mtd?: number; on_time_pct?: number; [k: string]: unknown }
export interface FinancialReport { revenue: number; cogs: number; gross_margin?: number; period: string }
export interface ProductionReport { jobs_completed: number; on_time?: number; scrap_rate?: number }
export interface JobDashboard { active: number; due_today?: number; overdue?: number }
export interface JobSummary { job_id: string; status: string; progress_pct?: number; cost_to_date?: number }
