/**
 * erp-screen-action-manifest.mjs — PRISM ERP (QuickBooks-parity) UX screen → dispatcher-action contract.
 *
 * Source: knowledge/wiki/ux-design/qb-parity-erp-ux-design-spec.md §2.11 / §2.12 (design workflow
 * wf_8a7483bf-116; visual identity locked = Direction C Indigo/Graphite).
 *
 * GROUND-TRUTH: the action literals are the MAIN/879-action canonical names. The slot-hotel dispatcher is
 * the stale 441-action copy with OLD names (quote_estimate vs estimate_create; acct_bank_reconcile vs
 * bank_reconcile; etc.). The companion checker (erp-action-contract-check.mjs) greps every literal against
 * the LIVE `case "..."` set across ALL dispatchers in the target tree and reports LIVE / MISSING per
 * screen — the §6.5 pre-wire CI gate. Do NOT bind a frontend client.ts method to a literal reported MISSING.
 *
 * Marketplace note: marketplace_* / supplier_reputation* / geo_* / vendor_catalog_* ARE landed in MAIN's
 * businessDispatcher (slot:hotel, 2026-05-31). The spec's "blocked" means not-yet-exposed via the web
 * client/bridge, NOT engine-absent — the checker confirms dispatcher presence.
 */

export const ERP_SCREEN_ACTION_MANIFEST = {
  schemaVersion: "1.0.0",
  source: "knowledge/wiki/ux-design/qb-parity-erp-ux-design-spec.md §2.11/§2.12",
  verifiedAgainstMain: "2026-05-31 via scripts/erp-action-contract-check.mjs — 165/165 wireable contract actions LIVE across 103 dispatchers (100% after 2 verified renames: material_stock→material_stock_get [dataDispatcher]; daily_flash_report→dr_generate_flash_report [devDispatcher]). 1 documented build-gap: commission_report (Executive dashboard knownGap).",
  groups: {
    "Sales / A/R": [
      { screen: "Sales overview", route: "/sales", actions: ["invoice_aging", "ar_aging_report"] },
      { screen: "Invoices (money-bar list)", route: "/invoices", actions: ["invoice_list", "invoice_create", "invoice_aging", "invoice_from_job", "invoice_payment"] },
      { screen: "Receive payment", route: "/invoices?action=receive", actions: ["receive_payment_apply", "gl_record_payment"] },
      { screen: "Quotes", route: "/quotes", actions: ["estimate_create", "quote_generate", "quote_to_order", "quote_revise", "quote_status_change"] },
      { screen: "Credit memos", route: "/invoices?type=credit-memo", actions: ["credit_memo_create"] },
      { screen: "Sales orders", route: "/sales/orders", actions: ["sales_order_create"] },
      { screen: "Customer statements", route: "/customers?action=statement", actions: ["customer_statement_generate"] },
      { screen: "Finance charges / dunning", route: "/invoices?tab=dunning", actions: ["finance_charge_compute"] },
      { screen: "Customers", route: "/customers", actions: ["customer_create", "customer_get", "customer_list", "customer_credit_check"] },
      { screen: "Products & services", route: "/items", actions: ["item_define", "inventory_price_break_optimize"] },
    ],
    Manufacturing: [
      { screen: "Print-to-quote", route: "/quote-builder", actions: ["quote_generate", "multi_process_quote", "blueprint_to_quote", "quote_quantity_breaks"] },
      { screen: "Jobs & work orders", route: "/jobs", actions: ["order_work_order_create", "quote_to_ship_run", "quote_to_ship_status", "schedule_open_work_orders", "what_if_work_order"] },
      { screen: "Travelers", route: "/travelers", actions: ["traveler_create", "traveler_get", "traveler_scan", "traveler_start_setup", "traveler_start_cycle", "traveler_complete_step", "traveler_get_active"] },
      { screen: "Shop floor", route: "/shop-live", actions: ["capacity_machine_load", "capacity_all_loads"] },
      { screen: "Scheduling & capacity", route: "/scheduling", actions: ["capacity_project", "capacity_earliest_slot", "capacity_schedule_job", "capacity_bottlenecks", "capacity_summary", "capacity_what_if", "batch_capacity"] },
      { screen: "Inventory & materials", route: "/inventory", actions: ["inventory_adjust_quantity", "inventory_reorder_point", "inventory_eoq", "inventory_abc", "inventory_safety_stock", "acct_wip_valuation", "material_stock_get"] },
      { screen: "Marketplace — RFQ inbox", route: "/rfq-inbox", actions: ["marketplace_rank_rfq", "marketplace_final_rank"] },
      { screen: "Marketplace — suppliers", route: "/marketplace/suppliers", actions: ["marketplace_seed_from_hints", "marketplace_lead_list", "marketplace_lead_get", "marketplace_lead_contact", "marketplace_lead_convert", "marketplace_lead_decline", "supplier_reputation", "supplier_reputation_rank", "vendor_catalog_ingest"] },
      { screen: "Marketplace — logistics/escrow", route: "/marketplace/logistics", actions: ["geo_route_cost", "geo_landed_cost", "geo_logistics_score"] },
    ],
    "Expenses / A/P": [
      { screen: "Expenses", route: "/expenses", actions: ["recurring_expense_create", "recurring_expense_list", "recurring_expense_get", "recurring_expense_update_amount", "recurring_expense_forecast", "recurring_expense_monthly_burden", "recurring_expense_deactivate", "gl_record_purchase"] },
      { screen: "Bills (3-way match)", route: "/bills", actions: ["po_three_way_match", "shipping_three_way_match", "po_record_receipt", "vendor_credit_create"] },
      { screen: "Purchase orders", route: "/purchase-orders", actions: ["po_create", "po_approve", "po_receive", "po_list", "po_get", "po_get_status", "po_transition", "po_append_change_order", "po_ap_aging", "po_spend_by_category", "po_receipt_record"] },
      { screen: "Pay bills", route: "/purchase-orders?tab=pay", actions: ["bill_payment_run"] },
      { screen: "Vendors", route: "/vendors", actions: ["vendor_list_all", "supplier_reputation"] },
      // HOTEL-NETPLAT-UI/U-VNET-ROUTE: the sourcing surface over charlie's ingested vendor corpus
      // (VendorCatalogPage.tsx → web/src/api/vendorNetwork.ts → POST /api/v1/business/dispatch, allowlisted).
      { screen: "Vendor catalog (sourcing)", route: "/vendor-catalog", actions: ["vendor_catalog_query", "vendor_rank", "vendor_compute_scorecard", "vendor_list_all"] },
    ],
    Banking: [
      { screen: "Bank transactions (review loop)", route: "/banking", actions: ["bank_feed_import", "bank_deposit_record"] },
      { screen: "Reconcile", route: "/banking?tab=reconcile", actions: ["bank_reconcile", "acct_bank_reconcile", "integration_reconcile_bank"], altNote: "bank_reconcile (MAIN) | acct_bank_reconcile (slot-hotel legacy) — either satisfies" },
    ],
    "Projects / Job P&L": [
      { screen: "Projects (Job P&L at actual)", route: "/profitability", actions: ["profitability_analyze", "profitability_compare", "profitability_sensitivity", "actual_cost_profitability", "costing_job_cost", "gl_record_wip_to_cogs"] },
      { screen: "Tooling cost", route: "/tooling-cost", actions: ["inventory_tool_optimize", "inventory_tool_select"] },
    ],
    Payroll: [
      { screen: "Run payroll", route: "/payroll", actions: ["payroll_run", "payroll_create_period", "payroll_compute_gross", "payroll_pay_stub", "payroll_reconcile_gross", "gl_record_payroll", "benefits_payroll_deductions"] },
      { screen: "Employees", route: "/employees", actions: ["mgr_direct_reports", "mgr_reports_to_chain", "mgr_set_reports_to", "attendance_report", "pto_compute_balance"] },
    ],
    Reports: [
      { screen: "Report center", route: "/reports", actions: ["reporting_dashboard", "reporting_financial", "reporting_pareto", "reporting_production", "reporting_quality", "reporting_trend"] },
      { screen: "P&L", route: "/reports?r=income-statement", actions: ["gl_income_statement"] },
      { screen: "Balance sheet", route: "/reports?r=balance-sheet", actions: ["gl_balance_sheet"] },
      { screen: "Trial balance", route: "/reports?r=trial-balance", actions: ["gl_trial_balance", "fin_invariant_validate_trial_balance"] },
      { screen: "A/R aging", route: "/reports?r=ar-aging", actions: ["ar_aging_report", "invoice_aging", "integration_export_ar_aging"] },
      { screen: "A/P aging", route: "/reports?r=ap-aging", actions: ["po_ap_aging"] },
      { screen: "Sales by customer/item", route: "/reports?r=sales-by-customer", actions: ["financial_report_sales_by_customer"] },
      { screen: "Cash flow", route: "/reports?r=cash-flow", actions: ["cash_flow_project"] },
    ],
    Taxes: [
      { screen: "Sales tax center", route: "/taxes/sales", actions: ["sales_use_tax_calc"] },
      { screen: "Payroll tax & 1099", route: "/taxes/payroll", actions: ["payroll_compute_941", "form_1099nec_generate", "integration_export_payroll_tax"] },
    ],
    Accounting: [
      { screen: "Chart of accounts", route: "/general-ledger", actions: ["gl_chart_of_accounts", "chart_account_add", "gl_record_invoice", "gl_record_purchase"] },
      { screen: "Journal entries", route: "/general-ledger?tab=journal", actions: ["gl_journal_entry", "journal_entry_memorize"] },
      { screen: "Budgets", route: "/budgets", actions: ["budget_create"] },
      { screen: "Audit / validation", route: "/audit-manager", actions: ["accounting_audit", "accounting_validate"] },
    ],
    "Fixed assets / Dashboard": [
      { screen: "Fixed assets & depreciation", route: "/assets", actions: ["asset_register", "asset_list", "asset_compute_depreciation", "asset_depreciation_schedule", "fixed_asset_depreciate", "asset_transfer", "asset_calibration_due"] },
      { screen: "Dashboard", route: "/dashboard", actions: ["invoice_aging", "cash_flow_project", "acct_wip_valuation", "po_three_way_match", "financial_report_sales_by_customer", "sales_use_tax_calc"] },
      { screen: "Executive dashboard", route: "/executive-dashboard", actions: ["reporting_financial", "dr_generate_flash_report"], knownGap: "commission_report has NO live dispatch action (verified 2026-05-31) — commission tracking is a future ERP unit, NOT QuickBooks-parity scope; wire the commission tile when that action is built." },
    ],
  },
  // §2.11 alias rule: a screen action is LIVE if ANY listed literal resolves (handles MAIN-vs-slot-hotel
  // renames like bank_reconcile|acct_bank_reconcile). The checker treats per-screen `altNote` literals as OR.
  aliasGroups: [["bank_reconcile", "acct_bank_reconcile"]],
};
