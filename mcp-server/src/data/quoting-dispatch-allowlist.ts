/**
 * quoting-dispatch-allowlist.ts -- the cost-basis / sensitive-pricing actions the browser must
 * NEVER reach through the generic POST /api/v1/quoting (and /api/mcp/quoting) dispatch handler.
 *
 * -- SECURITY: DENY-LIST on the generic dispatch surface (U-MKTPRICE01) --------------------------
 * The quoting router's generic `router.post("/")` forwards an arbitrary `{ action, params }` to
 * prism_quoting with only `optionalToken` (which never rejects an anonymous request). That made the
 * real INTERNAL cost-basis actions below reachable UNAUTHENTICATED via `{ action: "cost_index_prior" }`
 * -- the leak the U-MKTPRICE01 scrutiny (arm C) caught. This deny-set is the gate: the generic
 * handler returns 403 for any action listed here.
 *
 * These actions surface the SHOP'S OWN cost basis / real sold-price distribution -- they must never
 * leave the operator boundary. The dedicated typed verbs that DO serve them
 * (POST /api/v1/quoting/cost-index-prior, /outbound-price-prior) are separately gated behind
 * verifyToken + requireRole("admin") in quoting.ts, mirroring the admin-only margin/financial routes
 * in erp.ts (revenue-forecast / cash-flow / margin-trends). So the ONLY path to cost basis is an
 * authenticated admin session; the generic public surface cannot reach it at all.
 *
 * WHY A DENY-LIST (not an allow-list) HERE: the broad quoting action set is overwhelmingly
 * operator-facing advisory tooling already bound by SHIPPED token-less operator pages
 * (QuotingWorkbenchPage / QuotingCalibrationHealthPage / JMDie* panels call training_status,
 * closed_loop_*, jm_die_*, three_view_pricing, etc. via raw fetch with no Bearer token). A
 * deny-by-default ALLOW-list on the generic handler would 403 every one of those shipped pages.
 * The genuinely sensitive set is small and closed, and -- verified at build time -- has ZERO
 * token-less frontend callers, so denying exactly this set closes the leak and breaks nothing.
 * (Contrast business-dispatch-allowlist.ts, which is allow-by-default because prism_business exposes
 * ~879 financial/PII actions where the safe subset is the small, curated one.)
 *
 * RULE for adding an action to the deny-set:
 *   (a) it returns the shop's OWN cost basis, procurement spend, real outbound sold-price
 *       distribution, internal $/hr-or-$/kWh rate, or total revenue (NOT a customer-safe
 *       projection like quoting_public_quote, NOT rate/count telemetry with no raw $), AND
 *   (b) it has NO token-less frontend caller (a shipped page POSTing it through the generic
 *       handler) -- confirm with a grep over web/src before adding, or you will silently 403 a
 *       live page.
 *   A customer-safe action (quoting_public_*, quote_packet_generate) is NEVER added here.
 *
 * DELIBERATELY EXCLUDED (do NOT "complete the set" by adding these -- U-MKTPRICE02 audit, R12):
 *   - `closed_loop_outcome_digest` fails BOTH rules: it returns only loop behavior distribution
 *     (per-verdict rates/counts, NO raw $ -- fails rule a) AND it has a SHIPPED token-less caller
 *     (`web/src/pages/QuotingCalibrationHealthPage.tsx` POSTs it via `/api/mcp/quoting` with no
 *     Bearer -- fails rule b). Denying it would 403 a live operator page for zero security gain.
 *   - `quoting_secondary_ops_price` (the PLAIN variant, caller-supplied overrides only) returns
 *     internal secondary-op cost ($) BUT has a SHIPPED token-less caller
 *     (`web/src/pages/QuotingWorkbenchPage.tsx`) -- fails rule b. It needs an auth-MIGRATION (move the
 *     page to an admin-gated verb), NOT a blunt deny that 403s the page. Logged in OPEN-THREADS.
 *     NOTE: its `_for_profile` sibling (merges the shop's STORED rates, NO caller) IS denied below.
 *   - `quoting_shop_profile_list` returns profile IDs only (no $) -- not a cost-basis action.
 *
 * Schema-versioned for audit. Tested by quotingDispatchDeny.test.ts (round-tripped through the route).
 */
export const QUOTING_DISPATCH_DENY_SCHEMA_VERSION = "1.1.3";

/**
 * Internal cost-basis / real-sold-price actions DENIED on the generic browser dispatch surface.
 * Reachable ONLY through their dedicated verifyToken + requireRole("admin") typed verbs.
 */
export const QUOTING_GENERIC_DISPATCH_DENY_SET: ReadonlySet<string> = new Set<string>([
  // U-QP-COST-BASIS-WIRE -- the shop's real AP procurement cost basis (jm-vendor-cost-index).
  "cost_index_prior",
  // U-QP-COST-BASIS-NORMALIZE -- units-correct per-grade $/in3 material cost basis (jm-material-cost-basis).
  "material_cost_basis",
  // U-QP-OUTBOUND-PRICE-PRIOR -- the shop's real outbound sold-price distribution (jm-sold-orders).
  "outbound_price_prior",
  // U-QP-OUTBOUND-PRICE-CALIB -- predicted-vs-real-outbound distribution match (exposes the real price set).
  "outbound_price_calibration",
  // U-QP-OUTBOUND-PROMOTE-GATE -- block decision over the real sold-price alignment (PRICE-grain).
  "outbound_promote_check",
  // QUOTING-COST-SAVINGS-WIRE -- the shop's internal ROI / cost-savings ledger.
  "cost_savings",
  // ── U-MKTPRICE02 (T-MKTPRICE-FOLLOWUP) -- 5 more cost-side actions the 3 U-MKTPRICE01 reviewers
  //    flagged still generic-reachable. Each verified to return raw cost basis with NO token-less caller. ──
  // QUOTING-CLOSED-LOOP-MS0 -- returns outcomes[] = real QuoteOutcomeRecord with per-job estimated_cost + actuals.
  "closed_loop_provenance_check",
  // QUOTING-SYNERGY-MS0 -- base_rate_usd_per_hr / adjustedRate / deltaPerHr = the shop's internal $/hr machine rate.
  "quoting_dynamic_shop_rate",
  // QUOTING-SYNERGY-MS0 -- cost_usd + rate_usd_per_kwh = the shop's own electricity rate.
  "quoting_shop_electricity_cost",
  // QUOTING-SYNERGY-MS0 -- total_utilities_cost_usd + per-utility cost basis.
  "quoting_shop_utilities_cost",
  // JM-DIE-FINANCIAL-BASELINE-MS0 -- total_revenue_usd + by_customer / by_year revenue breakdown.
  "jm_die_financial_baseline",
  // QUOTING-SYNERGY-MS0 -- the FULL ShopProfile = electricity_usd_per_kwh + setup/default/per-machine
  //   + per-labor-tier $/hr rate basis (the RAW rates the electricity/utilities/dynamic-rate actions
  //   above only DERIVE from). `quoting_shop_profile_list` stays OUT (returns profile ids only, no $).
  "quoting_shop_profile_get",
  // QUOTING-SYNERGY-MS0 -- the _FOR_PROFILE variant merges the shop's STORED secondary_op_overrides
  //   (the shop's own per-op rates) into total_secondary_ops_usd + per-op setup/per_part cost.
  "quoting_secondary_ops_price_for_profile",
  // U-QP-SECONDARY-OPS-AUTH-MIGRATION (2026-07-01) -- the PLAIN variant returns total_secondary_ops_usd
  //   = the shop's real per-op cost basis (setup_usd/per_part_usd summed). It HAD a token-less caller
  //   (QuotingWorkbenchPage), so it was previously left OUT to avoid 403-ing the page. Now MIGRATED:
  //   denied on the generic surface (403 anon) + reachable via the verifyToken typed verb
  //   POST /secondary-ops-price (any signed-in operator -- a workbench figure, not admin-tier). The FE
  //   page attaches its Bearer token; anon callers get 401 + a benign "sign in for cost" state. Closes
  //   the LAST open member of the anon cost-basis leak class (U-MKTPRICE01/02, U-QUOTE-COMPAT-REDACT,
  //   U-QUOTES-INSTANT-REDACT, U-COST-ROUTE-REDACT).
  "quoting_secondary_ops_price",
  // QUOTING-SYNERGY-MS0 -- returns per_hour_savings_usd = (stored incumbent rate_usd_per_hr - CALLER-supplied
  //   candidate_rate). Since the subtrahend is caller-known, posting candidate_rate=0 recovers the shop's
  //   EXACT stored $/hr machine rate by trivial algebra; it also echoes default_machine_rate in warnings[] +
  //   incumbentRate in rationale. A trivially-invertible raw rate, NOT a derived/advisory figure. No token-less
  //   caller. (Caught by the 3-of-3 gate arm C -- my "borderline derived" deferral was wrong.)
  "quoting_machine_invest_roi",
  // U-QP-CONSUMABLE-COST-BASIS (2026-07-01) -- returns the shop's own procurement cost basis per consumable
  //   type (jm-tool-purchases.json spend/count = $/line-item) + the reconciliation fold-back. Satisfies both
  //   deny-rules: (a) it is the shop's OWN tooling procurement spend (the tool-side twin of material_cost_basis),
  //   (b) NO token-less frontend caller -- this is an internal/admin-only prior (verified: zero web/src callers).
  //   Reachable ONLY via the admin verb POST /tool-cost-basis (verifyToken + requireRole("admin")).
  "tool_cost_basis",
]);

/**
 * True when `action` is an internal cost-basis action that must NOT be dispatched through the
 * generic /api/v1/quoting (or /api/mcp/quoting) handler. The generic route returns 403 when true.
 */
export function isQuotingGenericDispatchDenied(action: string): boolean {
  return QUOTING_GENERIC_DISPATCH_DENY_SET.has(action);
}
