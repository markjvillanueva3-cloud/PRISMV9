// scripts/lib/business-approach-knowledge.mjs
//
// BUSINESS / ERP auto-firing "approach knowledge" -- slot:zulu 2026-07-01 (for hotel).
//
// The ninth clone of the proven task auto-firing pattern. When an ERP/accounting/HR
// operation runs (a journal entry, payroll, a variance, a credit check), this surfaces
// the SPECIFIC verified financial INVARIANT the operation must hold -- double-entry
// balance, normal-balance sign convention, FLSA overtime stacking, segregation of duties.
//
// SOURCING (R12 -- no fabrication): mined by the hotel-business domain-soul agent from the
// real GL/payroll/ERP engines + businessDispatcher, then INDEPENDENTLY re-verified
// (waved-mining verify arm PASS, 2026-07-01) against the cited file:line. The gates are
// mostly ALGEBRAIC INVARIANTS (debit==credit, assets==liab+equity, gross=sum-of-7) --
// categorical, not tunable thresholds; every numeric jurisdiction/policy value is a GAP.
// Greenfield domain; op->gate map, no machine axis. FIRST targeted pass over ~7 of 87 engines.
//
// ASCII-only (ascii-guard). No em-dashes.

// ---- operation taxonomy (the business/ERP operations an approach encounters) ----
export const BUSINESS_OPERATIONS = Object.freeze([
  "gl_journal_entry", "gl_trial_balance", "gl_record_invoice", "gl_record_payment",
  "gl_record_purchase", "gl_record_payroll", "payroll_compute_gross",
  "acct_variance_analysis", "actual_cost_variance", "erp_cost_feedback",
  "business_sync_stats", "erp_quality_gate", "customer_credit_check", "acct_wip_valuation",
  "inventory_reorder_policy", "capital_breakeven_analysis",
]);

// ---- the verified gate map (each gate cites its mined+verify-arm-PASS source) ----
const GATES = Object.freeze({
  gl_journal_entry_balance_invariant: {
    id: "gl_journal_entry_balance_invariant",
    rule: "Every journal entry must satisfy sum(debits) == sum(credits) within BALANCE_TOLERANCE, else the write is REJECTED (throw, not silent-clobber)",
    enforcedBy: "GeneralLedgerEngine.postEntry (BALANCE_TOLERANCE)",
    cite: "mcp-server/src/engines/GeneralLedgerEngine.ts:791-796",
    ops: ["gl_journal_entry", "gl_record_invoice", "gl_record_payment", "gl_record_purchase", "gl_record_payroll"],
    confidence: "verified",
  },
  gl_trial_balance_sign_convention: {
    id: "gl_trial_balance_sign_convention",
    rule: "Trial-balance row balance is NORMAL-BALANCE-signed: debit-normal accounts = debits-credits, credit-normal accounts = credits-debits (never a single unsigned magnitude)",
    enforcedBy: "GeneralLedgerEngine.getTrialBalance",
    cite: "mcp-server/src/engines/GeneralLedgerEngine.ts:381-383,405-406",
    ops: ["gl_trial_balance"],
    confidence: "verified",
  },
  gl_journal_line_no_dual_sided: {
    id: "gl_journal_line_no_dual_sided",
    rule: "A single journal line cannot carry both a nonzero debit AND a nonzero credit, and cannot carry zero for both -- split into two lines",
    enforcedBy: "GeneralLedgerEngine.postEntry",
    cite: "mcp-server/src/engines/GeneralLedgerEngine.ts:782-789",
    ops: ["gl_journal_entry"],
    confidence: "verified",
  },
  balance_sheet_accounting_equation: {
    id: "balance_sheet_accounting_equation",
    rule: "Balance sheet must satisfy total_assets == total_liabilities + total_equity within BALANCE_TOLERANCE",
    enforcedBy: "GeneralLedgerEngine.getBalanceSheet",
    cite: "mcp-server/src/engines/GeneralLedgerEngine.ts:761",
    ops: ["gl_trial_balance", "acct_wip_valuation"],
    confidence: "verified",
  },
  flsa_overtime_stack_order: {
    id: "flsa_overtime_stack_order",
    rule: "Weekly OT stacking is threshold-ordered and mutually exclusive: hours<=weekly_threshold at base_rate, weekly_threshold<hours<=dt_threshold at base_rate*ot_multiplier, hours>dt_threshold at base_rate*double_time_multiplier -- the three bands must not double-count hours (FLSA 29 CFR Part 778)",
    enforcedBy: "EmployeePayrollGrossPayEngine.computeGrossPay (policy SHAPE DEFAULT_OT_POLICY; the numeric thresholds are a GAP)",
    cite: "mcp-server/src/engines/EmployeePayrollGrossPayEngine.ts:16,24,30,107-118",
    ops: ["payroll_compute_gross"],
    confidence: "verified",
  },
  shift_mix_hours_must_sum_to_worked: {
    id: "shift_mix_hours_must_sum_to_worked",
    rule: "shift_mix_hours.day+swing+night must equal regular_hours (worked total) within 0.01hr slack, or gross-pay computation is REJECTED -- prevents a silent partial-shift undercount",
    enforcedBy: "EmployeePayrollGrossPayEngine.computeGrossPay",
    cite: "mcp-server/src/engines/EmployeePayrollGrossPayEngine.ts:123-131",
    ops: ["payroll_compute_gross"],
    confidence: "verified",
  },
  variance_decomposition_identity: {
    id: "variance_decomposition_identity",
    rule: "Standard-costing two-way variance decomposes as total_variance = price_variance + quantity_variance + mix_variance, where price_variance=(actual_rate-standard_rate)*actual_qty and quantity_variance=(actual_qty-standard_qty)*standard_rate and mix_variance is the residual interaction term (algebraic identity, must hold exactly before rounding)",
    enforcedBy: "AccountingHardeningEngine.varianceAnalysis (Horngren Cost Accounting Ch.7-8)",
    cite: "mcp-server/src/engines/AccountingHardeningEngine.ts:8,17,128-133,436-439,454",
    ops: ["acct_variance_analysis", "actual_cost_variance"],
    confidence: "verified",
  },
  cost_feedback_category_taxonomy: {
    id: "cost_feedback_category_taxonomy",
    rule: "Actual-cost feedback to ERP is categorized into EXACTLY 6 categories (labor/material/overhead/subcontract/tooling/scrap) via a fixed enum, never collapsed to one delta -- a single-total report can hide a spike in one category. (This supersedes the stale business/CLAUDE.md:99 paraphrase 'material/labor/machine-hour/overhead/freight', which does not match the on-disk enum)",
    enforcedBy: "ERPCostFeedbackEngine (CostCategorySchema z.enum)",
    cite: "mcp-server/src/engines/ERPCostFeedbackEngine.ts:18,298",
    ops: ["actual_cost_variance", "erp_cost_feedback"],
    confidence: "verified",
  },
  sync_status_severity_ordering: {
    id: "sync_status_severity_ordering",
    rule: "Multi-target sync-status aggregation is WORST-STATUS-WINS over a 6-state total order: not_configured(0) < idle < ok < syncing < degraded < failed(5); 18 ok + 1 failed must aggregate to failed, never alphabetical/first-wins",
    enforcedBy: "BusinessSyncEngine (STATUS_SEVERITY map)",
    cite: "mcp-server/src/engines/BusinessSyncEngine.ts:21-26,52,57-62,138-139",
    ops: ["business_sync_stats"],
    confidence: "verified",
  },
  academy_cpk_tier_gate_monotonic: {
    id: "academy_cpk_tier_gate_monotonic",
    rule: "Machine-domain tier promotion (trainee->operator->setup->programmer->lead) requires observed_cpk >= the tier's qualification_cpk_floor, and floors are MONOTONICALLY NONDECREASING (0, 1.0, 1.33, 1.67, 1.67). The load-bearing invariant (both promote() and the internal auto-promote path): no SELF-promotion and no promotion BELOW the Cpk floor; a Cpk-gated tier is never reached by observed_cpk alone below its floor",
    enforcedBy: "EmployeeMachineDomainAcademyEngine.promote/refreshTier (floors are engine data, not a physics constant)",
    cite: "mcp-server/src/engines/EmployeeMachineDomainAcademyEngine.ts:102-103,166,185,204,221,236,1116-1148,1259-1300",
    ops: ["payroll_compute_gross", "erp_quality_gate"],
    confidence: "verified",
  },
  promotion_segregation_of_duties: {
    id: "promotion_segregation_of_duties",
    rule: "An employee cannot self-promote -- the actor invoking promote() must differ from the employee_id being promoted",
    enforcedBy: "EmployeeMachineDomainAcademyEngine.promote",
    cite: "mcp-server/src/engines/EmployeeMachineDomainAcademyEngine.ts:1126",
    ops: ["erp_quality_gate"],
    confidence: "verified",
  },
  credit_check_approval_relation: {
    id: "credit_check_approval_relation",
    rule: "An order is approved for a customer IFF order_amount <= (credit_limit - current_balance); over_limit_by = max(order_amount - available_credit, 0) is always reported, never suppressed on rejection",
    enforcedBy: "CustomerManagementEngine.checkCredit (wired businessDispatcher.ts:3708-3714)",
    cite: "mcp-server/src/engines/CustomerManagementEngine.ts:295-313",
    ops: ["customer_credit_check"],
    confidence: "verified",
  },
  payroll_gross_pay_component_sum: {
    id: "payroll_gross_pay_component_sum",
    rule: "gross_pay_cents is the EXACT sum of 7 named components (regular+OT+double-time+holiday+PTO-paid+shift-differential+per-op-bonus) computed at cents-resolution (integer rounding PER component, not one final rounding) -- no component may be silently dropped",
    enforcedBy: "EmployeePayrollGrossPayEngine.computeGrossPay",
    cite: "mcp-server/src/engines/EmployeePayrollGrossPayEngine.ts:81-98,115-140",
    ops: ["payroll_compute_gross"],
    confidence: "verified",
  },
  gl_journal_unknown_account_reject: {
    id: "gl_journal_unknown_account_reject",
    rule: "A journal line referencing an account_id absent from ACCOUNT_INDEX (chart of accounts) must be REJECTED before the balance check runs -- structural errors surface before aggregate arithmetic errors",
    enforcedBy: "GeneralLedgerEngine.postEntry",
    cite: "mcp-server/src/engines/GeneralLedgerEngine.ts:776-781",
    ops: ["gl_journal_entry"],
    confidence: "verified",
  },

  // ---- corroborated-promotion gates (soul-verified hotel arm, wf_0524c0db-eaa 2026-07-02) ----
  eoq_reorder_point_identity: {
    id: "eoq_reorder_point_identity",
    rule: "Economic Order Quantity Q = sqrt(2 * annual_demand * order_cost / holding_cost); reorder_point = daily_demand * lead_time_days + safety_stock. Any EOQ or reorder-point computation must use these exact algebraic forms via the canonical engine, never an ad hoc heuristic substitute",
    enforcedBy: "InventoryEOQEngine.calculate + InventoryReorderPointFormula.economicOrderQuantity/reorderPoint",
    cite: "Harris 1913 / Wilson EOQ + Silver-Pyke-Peterson 3e Ch5,7 -- InventoryEOQEngine.ts:83-84,91-92 + InventoryReorderPointFormula.ts:8,16 (soul-verified hotel wf_0524c0db-eaa 2026-07-02)",
    ops: ["inventory_reorder_policy"],
    confidence: "verified",
  },
  breakeven_contribution_margin_identity: {
    id: "breakeven_contribution_margin_identity",
    rule: "Contribution margin = unit_price - unit_variable_cost; breakeven_units = fixed_costs / contribution_margin. Any breakeven or margin analysis must use this exact identity; margin <= 0 yields breakeven = Infinity, never a false finite value",
    enforcedBy: "FinancialAnalysisEngine.calculateBreakEven (non-degenerate-margin guard)",
    cite: "Horngren Cost Accounting 16e Ch3 (CVP/breakeven) -- FinancialAnalysisEngine.ts:190-206 (soul-verified hotel wf_0524c0db-eaa 2026-07-02)",
    ops: ["capital_breakeven_analysis"],
    confidence: "verified",
  },
});

// Pre-index ops -> gate ids (cheap lookup, frozen).
const OPS_TO_GATES = (() => {
  const m = {};
  for (const op of BUSINESS_OPERATIONS) m[op] = [];
  for (const g of Object.values(GATES)) {
    for (const op of g.ops) if (m[op]) m[op].push(g.id);
  }
  return Object.freeze(m);
})();

function isStr(s) { return typeof s === "string" && s.length > 0; }

// ---- the firing entry point ----
export function fireForApproach(ctx) {
  const c = ctx && typeof ctx === "object" ? ctx : {};
  const rawOps = Array.isArray(c.operations) ? c.operations : [];
  const ops = [];
  for (const op of rawOps) {
    if (!isStr(op) || !OPS_TO_GATES[op]) continue;
    const gates = OPS_TO_GATES[op]
      .map((id) => GATES[id])
      .map((g) => ({ id: g.id, rule: g.rule, enforcedBy: g.enforcedBy, cite: g.cite }));
    ops.push({ operation: op, gates });
  }
  const summary = `${ops.length} business/ERP operation(s)`;
  return { operations: ops, summary };
}

// UNVERIFIED gaps -- the business verify-backlog (jurisdiction/policy numbers + PII/wiring gaps).
// NOT fired; surfaced by the autofire coverage worklist. Safety/financial carveout: specialist-confirm first.
export const BUSINESS_UNVERIFIED_GAPS = Object.freeze([
  "Payroll OT threshold values are JURISDICTION data: weekly_threshold_hours=40, dt_threshold=60, ot_multiplier=1.5, double_time_multiplier=2.0, daily_overtime_threshold=Infinity are DEFAULT_OT_POLICY, not universal law -- CA daily OT (8hr) + state double-time triggers vary; a build must NOT assume DEFAULT_OT_POLICY applies to every JM Die shift without HR confirmation. cite=EmployeePayrollGrossPayEngine.ts:44-60 (verify PASS)",
  "Shift-differential percentages are SHOP policy: night/swing 5%/10% are DEFAULT_SHIFT_DIFF_POLICY, configurable, not a verified law -- confirm vs JM Die's actual pay policy. cite=EmployeePayrollGrossPayEngine.ts:62-66 (verify PASS)",
  "Cpk floor numeric values need quality-specialist confirm (SAFETY): floors 1.0/1.33/1.67 (operator/setup/programmer+lead) are baked into EmployeeMachineDomainAcademyEngine per-domain tier tables (~9x) -- safety/quality thresholds; any change routes through the quality galaxy's Cpk-floor doctrine, never edited ad hoc. cite=EmployeeMachineDomainAcademyEngine.ts:166,185,204,221,236 (verify PASS)",
  "ERP vendor-adapter path STALE in CLAUDE.md: business/CLAUDE.md:41 cites mcp-server/src/data/erp-vendor-adapters/<vendor>.ts as a real path -- confirmed ABSENT on disk; the actual roster (JobBOSS/Epicor/ProShop/Global Shop/SAP/Oracle/Generic) is a flat status-tagged array in ERPIntegrationEngine.ts (sap/oracle status:planned not supported); the '4-artifact adapter' rule has no confirmed per-file enforcement -- specialist verifies where (if anywhere) it is checked. cite=ERPIntegrationEngine.ts:13,512-518 (verify PASS)",
  "BALANCE_TOLERANCE is INLINED not canonical: BALANCE_TOLERANCE=0.01 is a private module-level const in GeneralLedgerEngine.ts, not from a shared financial-constants file (no src/finance/constants.ts exists in this galaxy) -- a rounding epsilon, but its value is a THRESHOLD; any change is a numeric-safety change requiring specialist review. cite=GeneralLedgerEngine.ts:218 (verify PASS)",
  "NO confirmed PII-redaction engine in the business galaxy (REFUSE-LIST relevant): grep redact/pii/mask/anonymiz across Business*/Customer*/Employee*/ERP*/GL*/Docustrata* = ZERO hits; the only redaction engine on disk (blueprintRedaction.ts) is in blueprint-vision, not business. CLAUDE.md 12 already says 'enforce manually in every export/log path' -- confirmed true, unresolved; 'dropping-pii-redaction-on-export' is a hard refuse with no enforcing engine to point at. cite=grep mcp-server/src/engines/*.ts + business/CLAUDE.md 12 (verify PASS)",
  "gl_trial_balance NOT enforced before gl_journal_entry: businessDispatcher gl_journal_entry (2920-2931) calls createJournalEntry directly with NO prior gl_trial_balance call -- CLAUDE.md 3 'ALWAYS check gl_trial_balance before gl_journal_entry' is a workflow CONVENTION for callers, not a code-enforced sequencing gate. The real enforced invariant is the debit=credit check inside postEntry (gl_journal_entry_balance_invariant). Do not assume trial-balance-first is machine-enforced. cite=businessDispatcher.ts:2920-2931 vs GeneralLedgerEngine.ts:791-796 (verify PASS)",
  "Applied manufacturing overhead = predetermined overhead rate * actual allocation-base quantity (absorption identity); over/under-applied overhead = applied - actual -- a cost-accounting invariant not covered by the variance-decomposition or GL-balance rules. external-source candidate: Horngren Cost Accounting: A Managerial Emphasis 16e Ch4; class=categorical-invariant; hotel confirms the allocation-base source before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Activity-based-costing driver rate = total activity cost pool / total PRACTICAL capacity of the cost-driver units (practical, not budgeted, capacity -> unused-capacity cost surfaces separately) -- an ABC identity absent from the cost-feedback taxonomy. external-source candidate: Kaplan & Cooper Cost and Effect (1998) Ch3; class=categorical-invariant; hotel confirms the capacity basis before firing (slot:zulu phase-2-2B 2026-07-01)",
  "MRP net requirements = gross requirements - on-hand inventory - scheduled receipts (+ safety stock); planned-order releases are offset by lead time -- MRP netting logic distinct from the shift-mix / sync-status rules. external-source candidate: Vollmann et al. Manufacturing Planning & Control 6e Ch5; class=categorical-invariant; hotel confirms the netting order before firing (slot:zulu phase-2-2B 2026-07-01)",
]);

// ---- detect business/ERP operations from a prompt ----
export function detectOperations(text) {
  if (!isStr(text)) return [];
  const t = text.toLowerCase();
  const found = new Set();
  if (/journal[\s-]?entry|post.*(?:debit|credit)|gl[\s-]?entry|double[\s-]?entry/.test(t)) found.add("gl_journal_entry");
  if (/trial[\s-]?balance|balance[\s-]?sheet/.test(t)) found.add("gl_trial_balance");
  if (/record.*invoice|\bar\b invoice|customer invoice/.test(t)) found.add("gl_record_invoice");
  if (/record.*payment|\bap\b payment|receive[\s-]?payment/.test(t)) found.add("gl_record_payment");
  if (/record.*purchase|\bpo\b|purchase order.*(?:post|record)/.test(t)) found.add("gl_record_purchase");
  if (/record.*payroll|post.*payroll/.test(t)) found.add("gl_record_payroll");
  if (/payroll|gross[\s-]?pay|overtime|shift[\s-]?diff|flsa/.test(t)) found.add("payroll_compute_gross");
  if (/variance[\s-]?analysis|price[\s-]?variance|quantity[\s-]?variance|standard[\s-]?cost/.test(t)) found.add("acct_variance_analysis");
  if (/actual[\s-]?cost|cost[\s-]?variance|actual[\s-]?vs[\s-]?standard/.test(t)) found.add("actual_cost_variance");
  if (/erp[\s-]?cost[\s-]?feed|cost[\s-]?category|cost[\s-]?feedback/.test(t)) found.add("erp_cost_feedback");
  if (/sync[\s-]?stat|integration[\s-]?status|business[\s-]?sync/.test(t)) found.add("business_sync_stats");
  if (/promote|tier[\s-]?up|cpk[\s-]?gate|qualif|quality[\s-]?gate/.test(t)) found.add("erp_quality_gate");
  if (/credit[\s-]?check|credit[\s-]?limit|available[\s-]?credit/.test(t)) found.add("customer_credit_check");
  if (/wip[\s-]?valu|work[\s-]?in[\s-]?process|wip[\s-]?value/.test(t)) found.add("acct_wip_valuation");
  if (/\beoq\b|order[\s-]?quantity|reorder[\s-]?point|safety[\s-]?stock|inventory[\s-]?(?:order|polic)/.test(t)) found.add("inventory_reorder_policy");
  if (/break[\s-]?even|contribution[\s-]?margin|fixed[\s-]?vs[\s-]?variable|cvp\b/.test(t)) found.add("capital_breakeven_analysis");
  return [...found];
}

// for tests
export const _internals = { GATES, OPS_TO_GATES };
