/**
 * business-dispatch-allowlist.ts — the curated set of prism_business actions the browser may
 * invoke through POST /api/v1/business/dispatch (createBusinessRouter).
 *
 * ── SECURITY: DENY-BY-DEFAULT ───────────────────────────────────────────────────────────────
 * The prism_business dispatcher exposes ~879 actions, many of which are FINANCIAL
 * (payroll_run, gl_journal_entry, bill_payment_run, marketplace_escrow_deposit) or PII-bearing
 * (employee reads, 1099/941 filings). A generic { action, params } pass-through would hand ALL of
 * them to any authenticated browser session — exactly the hole flagged in the HOTEL-NETPLAT-UI
 * scrutiny. This allowlist is the gate: an action NOT listed here returns 403 from the route.
 *
 * RULE for adding an action:
 *   (a) a frontend client module actually binds it, AND
 *   (b) it is read-mostly and safe for an authenticated ERP user to call directly.
 *   NEVER add a GL-write, payroll, escrow/payout, bill-payment, or raw-PII-export action here —
 *   those belong on a dedicated role-gated route in erp.ts (requireRole), not this generic surface.
 *
 * Schema-versioned for audit. Tested by businessDispatchRoute.test.ts.
 */
export const BUSINESS_DISPATCH_ALLOWLIST_SCHEMA_VERSION = "1.0.0";

export const BUSINESS_DISPATCH_ALLOWLIST: ReadonlySet<string> = new Set<string>([
  // ── VENDOR-NETWORK-MS0 — charlie's vendor-catalog corpus + vendor lifecycle (all READ-ONLY) ──
  "vendor_catalog_query", // browse charlie's ingested vendor corpus, optionally filtered
  "vendor_rank", // ranked vendor leaderboard by composite performance score
  "vendor_compute_scorecard", // one vendor's performance scorecard over a window
  "vendor_list_all", // vendor ids that have tracked PO history

  // ── hotel-portal READS (web/src/api/hotelBusiness.ts → HotelEmployeeHubPage) — all READ-ONLY ──
  // This route is the path hotelBusiness.ts has always targeted (it 404'd until U-VNET-ROUTE mounted
  // the route). Allowlisting its reads makes the Hotel Hub read surface actually reachable.
  "domain_academy_report_path", // employee specialist-ladder report (read)
  "domain_academy_list_domains", // academy domains + tiers catalog (read)
  "domain_academy_list_assignments", // course assignments for an employee/domain (read)
  "handoff_list", // handoff inbox (read)
  "handoff_stalled", // stalled-handoff escalation list (read)

  // ── HOTEL-NETPLAT marketplace READS (web/src/api/marketplace.ts → RFQInboxPage) — all READ-ONLY ──
  "marketplace_rank_rfq", // end-to-end RFQ match + blended supplier rank (the bound entry point)
  "marketplace_lead_list", // supplier-lead directory (filtered)
  "marketplace_lead_get", // one supplier lead
  "supplier_reputation", // one supplier's reputation (Wilson/Beta-Binomial)
  "supplier_reputation_rank", // ranked supplier reputations
  "geo_route_cost", // freight + customs route quote
  "geo_landed_cost", // total landed cost (part + freight + duty)
  "geo_logistics_score", // logistics desirability [0,1]

  // ── LATHE-MASTER U-LTH55 (web/src/pages/LatheERPDashboard.tsx) -- all READ-ONLY analytics ──
  // Per the read rule: each is bound by a FE client + read-only + NOT a GL-write/payroll/escrow/
  // bill-payment/PII-export action. NOTE (hotel review): 3 are financial-AGGREGATE reads
  // (billing/profit/accuracy) -- read-only, no PII, no money-movement; exposed to any authenticated
  // session exactly like the vendor/marketplace BI reads above. If finer read-RBAC is wanted
  // (e.g. manager-only revenue), add a read-role-map -- a separate allowlist-architecture enhancement.
  "lathe_order_pipeline", // order-stage pipeline counts (read)
  "billing_stats", // subscription MRR/ARR/churn aggregate (read metrics; NOT a bill-payment action)
  "lathe_inv_snapshot", // lathe inventory level snapshot (read)
  "lathe_profit_portfolio", // job-profitability pareto (read aggregate)
  "lathe_actual_cost_accuracy", // quote-vs-actual variance stats (read)
  // OPENED (U-HOTEL-ALLOWLIST-WRITE-ENABLE, role-gated -- see BUSINESS_WRITE_ROLE_MAP below):
  //   handoff_counterparty_respond / handoff_manager_approve / handoff_mark_executed / handoff_cancel
  //   -- manager/HR workflow-STATE writes (no GL, no PII, frozen audit trail, idempotent) dispatchable
  //   ONLY behind a per-action manager-tier role gate. They are NOT in this read Set; they live in the
  //   write-map below so a read-only session still cannot invoke them.
  // STILL DEFERRED (verified-safe by the U-...-ENABLE grounding -- add to the write-map by data edit when a UI binds them):
  //   handoff_register_rank/qualification/course_passed, shift_schedule/cancel/register_*, employee_perf_record_signal.
  // STAYS 403 FOREVER (financial / payroll-downstream / PII -- never on this generic surface):
  //   po_approve, hr_pto_approve, pto_approve_request, marketplace_* writes, and the prismBusiness.ts
  //   ~120 actions (order_create / ar_invoice_record / gl_* / payroll_*).
]);

/** True when `action` is safe for the browser to dispatch through /api/v1/business/dispatch. */
export function isBusinessActionAllowed(action: string): boolean {
  return BUSINESS_DISPATCH_ALLOWLIST.has(action);
}

/**
 * BUSINESS_WRITE_ROLE_MAP -- the curated set of prism_business WRITE actions the browser MAY invoke
 * through POST /api/v1/business/dispatch, each gated by a required role (U-HOTEL-ALLOWLIST-WRITE-ENABLE,
 * operator-approved role model 2026-06-09). An action here is dispatchable ONLY when the authenticated
 * session (req.userRoles, set by verifyToken) holds one of the listed roles; otherwise 403. An action
 * in NEITHER this map NOR the read Set above falls straight through to 403 (so every financial/PII write
 * stays unreachable by simply not being listed).
 *
 * SCOPE (v1): the handoff-workflow family only -- all are workflow-STATE transitions (no GL, no PII
 * beyond employee IDs), each writes a frozen append-only audit entry in its engine, and each is
 * status-guarded (a retry throws rather than double-applying). Verified safe by the
 * U-HOTEL-ALLOWLIST-WRITE-ENABLE grounding pass. The HTTP `auditLog` middleware (mounted globally on
 * /api) additionally records user_id + roles for every one of these writes. The route gate is role-only
 * (coarse); each handoff engine method ALSO enforces participant-identity (responder==counterparty,
 * manager segregation-of-duties) -- but from caller-asserted params, a filed follow-up binds it to
 * req.userId server-side.
 *
 * RULE for adding a WRITE action here (STRICTER than the read allowlist):
 *   (a) it mutates ONLY business-workflow state -- NEVER GL/AP/payroll/escrow/bill or any money field,
 *   (b) it touches NO raw PII (employee IDs OK; SSN/card/comp/personal records are NOT),
 *   (c) it is idempotent or status-guarded (a retry must not double-apply), AND
 *   (d) it writes an audit trail. Financial/PII writes belong on a dedicated erp.ts role-gated route.
 */
const MANAGER_TIER_ROLES: readonly string[] = ["lead", "supervisor", "hr_manager", "admin"];

export const BUSINESS_WRITE_ROLE_MAP: ReadonlyMap<string, readonly string[]> = new Map<string, readonly string[]>([
  ["handoff_counterparty_respond", MANAGER_TIER_ROLES],
  ["handoff_manager_approve", MANAGER_TIER_ROLES],
  ["handoff_mark_executed", MANAGER_TIER_ROLES],
  ["handoff_cancel", MANAGER_TIER_ROLES],
]);

/** True when `action` is a role-gated browser-dispatchable WRITE (see BUSINESS_WRITE_ROLE_MAP). */
export function isBusinessWriteAllowed(action: string): boolean {
  return BUSINESS_WRITE_ROLE_MAP.has(action);
}

/** Roles permitted to dispatch write `action`; empty array if it is not a gated write. */
export function businessWriteRolesFor(action: string): readonly string[] {
  return BUSINESS_WRITE_ROLE_MAP.get(action) ?? [];
}
