#!/usr/bin/env node
/**
 * generate-hotel-domain-features.mjs — system-viz augmentation: hotel domain.
 *
 * Emits 3 ghost roosts (one per axis of the hotel-domain operations stack):
 *   - ghost.business_frontend     — every prism_business / prism_shop action
 *   - ghost.shop_safety           — OSHA / ISO / compliance / cert / audit surface
 *   - ghost.realtime_accounting   — GL / AR / AP / payroll / customer-analytics / shop-rate / burden-rate
 *
 * Each roost gets child nodes for the actions belonging to it, classified by
 * keyword prefix from the live businessDispatcher.ts + shopDispatcher.ts
 * z.enum lists.
 *
 * Modeled on scripts/generate-priority-queue-features.mjs (same augmentation
 * pattern: pure generate() + roost + child nodes; registered in regen-viz.mjs
 * FAST[] + merge-augmentations.mjs splice).
 *
 * @milestone HOTEL/U-HOTEL-DOMAIN-ROOSTS (2026-05-25, slot:hotel iter5)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const SCHEMA_VERSION = "1.0.0";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const ACTION_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 220;

export const ROOST_BUSINESS = "ghost.business_frontend";
export const ROOST_SAFETY = "ghost.shop_safety";
export const ROOST_ACCOUNTING = "ghost.realtime_accounting";

export const COLOR_BUSINESS = "#8b5cf6";
export const COLOR_SAFETY = "#ef4444";
export const COLOR_ACCOUNTING = "#0ea5e9";

const SAFETY_PATTERNS = [
  /^osha_/i,
  /^iso/i,
  /^safety_/i,
  /^compliance_/i,
  /^as9100/i,
  /^capa_/i,
  /^cert_/i,
  /^audit_/i,
  /^itar_/i,
  /^training_/i,
  /^loto_/i,
  /^sds_/i,
  /^ppe_/i,
  /^near_miss_/i,
  /^quality_(fai|spc|ncr|calibration)/i,
];

const ACCOUNTING_PATTERNS = [
  /^gl_/i,
  /^ar_/i,
  /^ap_/i,
  /^po_/i,
  /^payroll_/i,
  /^invoice_/i,
  /^docustrata_/i,
  /^customer_(revenue|growth|normalize|trends|concentration)/i,
  /^cost_/i,
  /^burden_rate_/i,
  /^adaptive_shop_rate_/i,
  /^cash_flow_/i,
  /^make_vs_buy_/i,
  /^job_cost_/i,
  /^margin_/i,
  /^capacity_(machines|loads|bottlenecks)/i,
  /^business_doc_extract/i,
  /^realtime_financial/i,
];

const BUSINESS_PATTERNS = [
  /^quote_/i,
  /^order_/i,
  /^customer_/i,
  /^vendor_/i,
  /^employee_/i,
  /^emp_/i,                  // catches emp_op_*, emp_concurrent_*, emp_wizard_*, emp_insert_*, emp_sf_*, emp_calc_*, emp_doc_*, emp_blueprint_*, emp_dnc_*, emp_scan_*, emp_*_task, emp_*_message, emp_*_delegation, emp_*_priority, emp_acl_*, emp_office_*
  /^shop_/i,
  /^schedule_/i,
  /^scheduling_/i,
  /^dispatch_/i,
  /^capacity_/i,
  /^distribution_/i,
  /^estimate_/i,
  /^bid_/i,
  /^pricing_/i,
  /^role_academy_/i,           // HOTEL/U-EMPLOYEE-ROLE-ACADEMY-INJECTION — role→curriculum bridge
  /^management_review_/i,      // HOTEL/U-MANAGEMENT-REVIEW — ISO 9001 §9.3
  /^internal_audit_/i,         // HOTEL/U-INTERNAL-AUDIT-CALENDAR — ISO 9001 §9.2
  /^employee_perf_/i,          // HOTEL/U-EMPLOYEE-PERFORMANCE-FEEDBACK — self-learning loop
  /^shift_/i,                   // HOTEL/U-EMPLOYEE-SHIFT-SCHEDULE — daily roster + coverage gaps
  /^pto_/i,                     // HOTEL/U-EMPLOYEE-PTO-ACCRUAL — paid-time-off ledger + request workflow
  /^digest_/i,                  // HOTEL/U-EMPLOYEE-DAILY-DIGEST — phone-ready daily synergy capstone
  /^manager_dashboard_/i,       // HOTEL/U-MANAGER-DAILY-DASHBOARD — foreman team rollup
  /^swap_/i,                    // HOTEL/U-EMPLOYEE-SHIFT-SWAP — peer-to-peer shift swap workflow
  /^nc_/i,                      // HOTEL/U-NONCONFORMANCE-CORRECTIVE-ACTION — ISO §10.2 NCR + 8D
  /^complaint_/i,               // HOTEL/U-CUSTOMER-COMPLAINT-INTAKE — inbound complaint channel
  /^jm_die_sim_/i,              // HOTEL/U-JM-DIE-ERP-SIMULATION — E2E synergy proof / regression harness
  /^expense_/i,                 // HOTEL/U-EMPLOYEE-EXPENSE-REIMBURSEMENT — expense claim → payroll bridge
  /^vendor_/i,                  // HOTEL/U-VENDOR-PERFORMANCE-TRACKER — ISO §8.4 supplier evaluation
  /^benefits_/i,                // HOTEL/U-EMPLOYEE-BENEFITS-ENROLLMENT — health/dental/vision/401k/life
  /^exec_summary_/i,            // HOTEL/U-EXECUTIVE-SUMMARY — C-suite weekly rollup
  /^inspection_/i,              // HOTEL/U-INSPECTION-REPORT — QC inspection reports (FAI/in-process/final/incoming) → NCR bridge
  /^shipping_/i,                // HOTEL/U-SHIPPING-RECEIVING-LOG — inbound/outbound + 3-way match (PO/receipt/invoice)
  /^timeclock_/i,               // HOTEL/U-EMPLOYEE-TIMECLOCK — punch FSM + daily/weekly minute totals + FLSA OT
];

/** Classify a single action into one of the 3 roosts. */
export function classifyAction(action) {
  const s = String(action || "").trim();
  if (!s) return null;
  for (const re of SAFETY_PATTERNS) if (re.test(s)) return { roost: ROOST_SAFETY, color: COLOR_SAFETY, axis: "safety" };
  for (const re of ACCOUNTING_PATTERNS) if (re.test(s)) return { roost: ROOST_ACCOUNTING, color: COLOR_ACCOUNTING, axis: "accounting" };
  for (const re of BUSINESS_PATTERNS) if (re.test(s)) return { roost: ROOST_BUSINESS, color: COLOR_BUSINESS, axis: "business" };
  return null;
}

/** Filesystem-safe id fragment. */
export function safeId(raw) {
  const s = String(raw == null ? "" : raw)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 80);
  return !s || s.includes("..") ? "x" : s;
}

/**
 * Read the action list from a dispatcher file. Supports two patterns:
 *   1. inline:  z.enum([ "a", "b", ... ])
 *   2. const:   const ACTIONS = [ "a", "b", ... ];    z.enum(ACTIONS)
 * Always grabs the LARGEST string-literal array block to avoid catching
 * a small unrelated literal-array elsewhere in the file.
 */
export function readZEnumActions(dispatcherPath) {
  const src = fs.readFileSync(dispatcherPath, "utf8");
  // Strategy: find every `[` and bracket-match to find each array span;
  // count `"..."` literals inside; pick the array with the most string literals.
  let bestActions = [];
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== "[") continue;
    let depth = 0;
    let end = -1;
    for (let j = i; j < src.length; j++) {
      const ch = src[j];
      if (ch === "[") depth++;
      else if (ch === "]") {
        depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end < 0) continue;
    const body = src.slice(i + 1, end);
    // Only consider arrays that look like action lists (snake_case strings).
    const re = /"([a-z][a-z0-9_]*)"/gi;
    const actions = [];
    let m;
    while ((m = re.exec(body)) !== null) actions.push(m[1]);
    if (actions.length > bestActions.length) bestActions = actions;
    // Skip past this array to avoid quadratic re-scan.
    i = end;
  }
  return bestActions;
}

/**
 * Pure generator: read action lists, classify, emit roosts + children.
 *
 * @param {object} opts { businessDispatcherPath, shopDispatcherPath }
 * @param {Set<string>|string[]} existingNodeIds
 * @returns {{ newNodes, newEdges, stats }}
 */
export function generate(opts = {}, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const stats = { roostEmitted: 0, actions_classified: 0, by_axis: { safety: 0, accounting: 0, business: 0, unmatched: 0 } };

  const businessPath = opts.businessDispatcherPath ?? path.join(ROOT, "mcp-server/src/tools/dispatchers/businessDispatcher.ts");
  const shopPath = opts.shopDispatcherPath ?? path.join(ROOT, "mcp-server/src/tools/dispatchers/shopDispatcher.ts");

  const actions = [];
  if (fs.existsSync(businessPath)) {
    for (const a of readZEnumActions(businessPath)) actions.push({ action: a, dispatcher: "prism_business" });
  }
  if (fs.existsSync(shopPath)) {
    for (const a of readZEnumActions(shopPath)) actions.push({ action: a, dispatcher: "prism_shop" });
  }

  const buckets = new Map([
    [ROOST_BUSINESS, []],
    [ROOST_SAFETY, []],
    [ROOST_ACCOUNTING, []],
  ]);
  for (const a of actions) {
    const c = classifyAction(a.action);
    if (!c) {
      stats.by_axis.unmatched++;
      continue;
    }
    buckets.get(c.roost).push({ ...a, color: c.color, axis: c.axis });
    stats.by_axis[c.axis]++;
    stats.actions_classified++;
  }

  const roostDefs = [
    {
      id: ROOST_BUSINESS,
      label: "Business Frontend (customer / order / quote / employee / vendor)",
      color: COLOR_BUSINESS,
      info: `${buckets.get(ROOST_BUSINESS).length} business-frontend actions. ${ROOST_BUSINESS} surfaces every non-machining capability.`,
    },
    {
      id: ROOST_SAFETY,
      label: "Shop Safety + Compliance (OSHA / ISO / CAPA / cert / audit)",
      color: COLOR_SAFETY,
      info: `${buckets.get(ROOST_SAFETY).length} safety-compliance actions. ${ROOST_SAFETY} surfaces OSHA + ISO + CAPA + cert + LOTO + SDS + training records.`,
    },
    {
      id: ROOST_ACCOUNTING,
      label: "Real-time Accounting (GL / AR / AP / payroll / shop-rate / Docustrata)",
      color: COLOR_ACCOUNTING,
      info: `${buckets.get(ROOST_ACCOUNTING).length} accounting actions. ${ROOST_ACCOUNTING} surfaces GL + AR/AP aging + payroll + analytics + burden-rate + adaptive shop-rate + Docustrata bridge.`,
    },
  ];
  for (const def of roostDefs) {
    if (ids.has(def.id)) continue;
    newNodes.push({
      id: def.id,
      label: def.label,
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      color: def.color,
      info: def.info,
    });
    ids.add(def.id);
    stats.roostEmitted++;
  }

  const sortFn = (a, b) => a.dispatcher.localeCompare(b.dispatcher) || a.action.localeCompare(b.action);
  for (const [roostId, items] of buckets) {
    items.sort(sortFn);
    for (const it of items) {
      const nid = `${roostId}.${safeId(it.dispatcher + "-" + it.action)}`;
      if (ids.has(nid)) continue;
      newNodes.push({
        id: nid,
        label: `${it.dispatcher} :: ${it.action}`.slice(0, MAX_LABEL),
        layer: ACTION_LAYER,
        ghost: true,
        status: "ghost",
        kind: "hotel-action",
        parent: roostId,
        color: it.color,
        axis: it.axis,
        dispatcher: it.dispatcher,
        action: it.action,
        info: `[${it.axis}] ${it.dispatcher} action — invoke via dispatcher with action="${it.action}"`.slice(0, MAX_INFO),
      });
      ids.add(nid);
    }
  }

  return { newNodes, newEdges: [], stats };
}
