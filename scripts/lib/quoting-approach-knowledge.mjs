// scripts/lib/quoting-approach-knowledge.mjs
//
// QUOTING auto-firing "approach knowledge" -- slot:zulu 2026-07-01 (for charlie).
//
// The tenth clone of the proven task auto-firing pattern. When a quote is estimated,
// emitted, reconciled against actuals, or a customer is ingested, this surfaces the
// SPECIFIC verified cost/pricing contract the operation must respect -- the margin-floor
// deny, the units-blended-vs-per-unit cost trap, the per-line-vs-per-job FMV grain, and
// the customer-vs-machine-name ingest filters.
//
// SOURCING (R12 -- no fabrication): mined by the charlie-quoting domain-soul agent from
// the real cost/quote engines + scripts + the margin-floor hook, then INDEPENDENTLY
// re-verified (waved-mining verify arm PASS, 2026-07-01) against the cited file:line.
// The 8% margin default + variance-band widths are numeric business thresholds -> GAPS.
// Greenfield domain; op->gate map, no machine axis. FIRST targeted pass over PATHS.md engines.
//
// ASCII-only (ascii-guard). No em-dashes.

// ---- operation taxonomy (the quoting operations an approach encounters) ----
export const QUOTING_OPERATIONS = Object.freeze([
  "quote_emit", "quote_accept", "quote_estimate", "fair_market_value",
  "material_cost_basis", "cost_index_prior", "outbound_price_prior",
  "actual_cost_variance", "customer_ingest", "baseline_bootstrap", "training_status",
]);

// ---- the verified gate map (each gate cites its mined+verify-arm-PASS source) ----
const GATES = Object.freeze({
  margin_floor_gate_should_cost: {
    id: "margin_floor_gate_should_cost",
    rule: "should_cost = sum(stage.cost * max(stage.confidence, CONFIDENCE_FLOOR)); margin_floor = should_cost * (1 + minMarginPct); a quote-emit action DENIES if round2(quotedPrice) < margin_floor (PreToolUse hard-deny)",
    enforcedBy: "cost-bridge-margin-floor-gate.mjs (hard-deny) + scripts/lib/quote-dry-run.mjs computeShouldCost (canonical, KEEP-IN-SYNC)",
    cite: "H:/prism/.claude/hooks/cost-bridge-margin-floor-gate.mjs:17-19,43-58",
    ops: ["quote_emit", "quote_accept", "fair_market_value"],
    confidence: "verified",
  },
  margin_gate_fires_only_when_assessable: {
    id: "margin_gate_fires_only_when_assessable",
    rule: "The margin-floor gate is a SILENT NO-OP (never fabricates a floor) unless BOTH a quoted price AND a cost basis (decomposition[] or should_cost) are present in the action params; on internal error it FAIL-OPENS",
    enforcedBy: "cost-bridge-margin-floor-gate.mjs (assessMargin/extractQuoteCost)",
    cite: "H:/prism/.claude/hooks/cost-bridge-margin-floor-gate.mjs:13-15,72-75,104-109",
    ops: ["quote_emit", "quote_accept"],
    confidence: "verified",
  },
  vendor_cost_index_units_blended_not_per_unit: {
    id: "vendor_cost_index_units_blended_not_per_unit",
    rule: "VendorCostIndexEngine.getCategoryPrior().unitCost.median BLENDS heterogeneous units ($/bar, $/foot, $/piece, per-order) within one category -- it must NEVER be injected into a customer quote as a per-unit cost; safe only for spend/vendor-concentration analysis and cold-start sanity range",
    enforcedBy: "VendorCostIndexEngine.getCategoryPrior (JSDoc contract; callers must not misuse)",
    cite: "H:/prism/mcp-server/src/engines/VendorCostIndexEngine.ts:236-247",
    ops: ["quote_estimate", "cost_index_prior", "material_cost_basis"],
    confidence: "verified",
  },
  material_cost_basis_is_the_units_correct_path: {
    id: "material_cost_basis_is_the_units_correct_path",
    rule: "For MATERIAL category cost, use VendorCostIndexEngine.loadMaterialCostBasis -> usd_per_in3 (density-free, block-form, exact-volume) instead of the blended unitCost.median; material_cost = part_volume_in3 * usd_per_in3, the CONSUMABLE figure is BLOCK-ONLY",
    enforcedBy: "VendorCostIndexEngine.loadMaterialCostBasis + scripts/lib/material-cost-basis-normalize.mjs",
    cite: "H:/prism/mcp-server/src/engines/VendorCostIndexEngine.ts:254-260 + scripts/lib/material-cost-basis-normalize.mjs:11,186,234-241",
    ops: ["quote_estimate", "material_cost_basis"],
    confidence: "verified",
  },
  outbound_price_grain_is_per_line_not_per_job: {
    id: "outbound_price_grain_is_per_line_not_per_job",
    rule: "OutboundPriceIndexEngine's unitPrice distribution is per-PIECE (qty*unit_price=ext_price, unit-homogeneous), while a training-cycle FMV prediction (predicted_fmv_usd) is per-PART-JOB $; never compare predicted_fmv_usd directly against unitPrice -- use the against:'line' (ext_price) grain for a per-part-job comparison",
    enforcedBy: "OutboundPriceIndexEngine (pricePrior against param)",
    cite: "H:/prism/mcp-server/src/engines/OutboundPriceIndexEngine.ts:17-23,477-481,559-561",
    ops: ["fair_market_value", "outbound_price_prior", "training_status"],
    confidence: "verified",
  },
  outbound_price_confidence_gate_excludes_low_none: {
    id: "outbound_price_confidence_gate_excludes_low_none",
    rule: "OutboundPriceIndexEngine defaults to {high, medium} confidence tiers only and NEVER includes low/none-confidence sold-order rows by default (source data's own rule: 'never feed low-confidence prices into a live quote')",
    enforcedBy: "OutboundPriceIndexEngine confidence filter",
    cite: "H:/prism/mcp-server/src/engines/OutboundPriceIndexEngine.ts:25-29",
    ops: ["fair_market_value", "outbound_price_prior"],
    confidence: "verified",
  },
  reconciliation_variance_band_membership: {
    id: "reconciliation_variance_band_membership",
    rule: "Actual-vs-quote reconciliation PASSES IFF totalActual is within [quote.variance_band.low_usd, quote.variance_band.high_usd]; root-cause is the argmax(|contribution|) bucket among material/tool_wear/cycle/setup, not a fixed attribution",
    enforcedBy: "LatheActualCostReconciliationEngine.reconcile (bucketVariance + classifyRootCause)",
    cite: "H:/prism/mcp-server/src/engines/LatheActualCostReconciliationEngine.ts:236-240",
    ops: ["actual_cost_variance"],
    confidence: "verified",
  },
  non_customer_filter_whole_segment_anchor: {
    id: "non_customer_filter_whole_segment_anchor",
    rule: "A JM-Die path-segment classifies as NON-customer ONLY via whole-segment-anchored (^...$) regex alternation (machine builder/model tokens, workflow-stage/numbered-PRISM dirs, project/corpus dirs) -- never a bare substring/word match, because real customers legitimately contain machine-like or generic-sounding words (HOLOTEST, ALCOA POST OFFICE, TURNTECH)",
    enforcedBy: "scripts/quoting-baseline-bootstrap.mjs (isLikelyCustomer + 5-pattern gate chain)",
    cite: "H:/prism/scripts/quoting-baseline-bootstrap.mjs:299-360",
    ops: ["customer_ingest", "baseline_bootstrap"],
    confidence: "verified",
  },
  machine_name_customer_filter_requires_model_evidence: {
    id: "machine_name_customer_filter_requires_model_evidence",
    rule: "A candidate customer name is rejected as a machine-name IFF it matches BOTH a MACHINE_BUILDERS/AMBIGUOUS_BUILDERS token AND a MODEL_FAMILY_TOKENS or alphanumeric MODEL_CODE token in the SAME segment -- an ambiguous builder word alone (Brother, Citizen, Grob) never disqualifies a real customer",
    enforcedBy: "scripts/lib/quoting-baseline-guard.mjs (isMachineNameCustomer)",
    cite: "H:/prism/scripts/lib/quoting-baseline-guard.mjs:55-87",
    ops: ["customer_ingest", "baseline_bootstrap"],
    confidence: "verified",
  },
  docustrata_is_inbound_not_outbound: {
    id: "docustrata_is_inbound_not_outbound",
    rule: "H:/PRISM/Docustrata is an INBOUND print/scan corpus (majority SCAN_GENERIC) and must NEVER be treated as outbound-revenue ground truth for training/pricing; outbound truth is jm-sold-orders.json via OutboundPriceIndexEngine",
    enforcedBy: "quoting galaxy doctrine (no single engine gate; a data-source contract)",
    cite: "H:/prism/mcp-server/src/engines/quoting/CLAUDE.md:89 (gotcha; verify-arm corrected from the wrong :56) + PATHS.md:95-96",
    ops: ["training_status", "fair_market_value"],
    confidence: "verified",
  },
});

// Pre-index ops -> gate ids (cheap lookup, frozen).
const OPS_TO_GATES = (() => {
  const m = {};
  for (const op of QUOTING_OPERATIONS) m[op] = [];
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
  const summary = `${ops.length} quoting operation(s)`;
  return { operations: ops, summary };
}

// UNVERIFIED gaps -- the quoting verify-backlog (inlined shop rates + numeric thresholds + open joins).
// NOT fired; surfaced by the autofire coverage worklist. Safety/business carveout: specialist-confirm first.
export const QUOTING_UNVERIFIED_GAPS = Object.freeze([
  "Lathe reconciliation INLINES shop rates: LatheActualCostReconciliationEngine hard-codes MACHINE_RATE_USD_HR=85 + SETUP_RATE_USD_HR=95 as file-level consts (comment 'must match U-LTH48') instead of importing from jm-die-profile.ts / a canonical rate source -- a live violation of never-inline-shop-rate + a drift risk vs LatheAutoQuoteFromPrintEngine (same consts); charlie/whiskey confirm the canonical source + wire both engines before this could be a GATE. cite=LatheActualCostReconciliationEngine.ts:47-48 (verify PASS)",
  "Variance-band width % thresholds INLINED: the variance-band half-width (8%/12%, tiers high/moderate) defining low_usd/high_usd is set by inline percent literals (25/18/12/8) in LatheAutoQuoteFromPrintEngine rather than a canonical statistical-bounds source; a NUMERIC threshold that gates reconciliation pass/fail -> needs specialist confirmation of its statistical basis (Cpk-linked width) before promotion, never auto-fired. cite=LatheAutoQuoteFromPrintEngine.ts:446,450,454,458 (verify PASS)",
  "Margin-floor default % is env-overridable business threshold: DEFAULT_MIN_MARGIN_PCT=0.08 (8%) is the fallback margin when no explicit minMarginPct/PRISM_QUOTING_MIN_MARGIN_PCT is supplied -- the mechanism (formula + fail-open/deny) is verified + GATE-worthy, but the 8% figure itself needs a business-owner citation beyond the code default (soul refuse-list: margin-floor). cite=.claude/hooks/cost-bridge-margin-floor-gate.mjs:21,25 (verify PASS)",
  "Outbound-price prior grain JOIN still unreconciled: despite the per-line/per-job grain distinction being GATE-worthy, the underlying JOIN between sold-orders and the synthetic training baseline reported match_pct=0 (po_number mostly null, quote_ref OCR garbage) per the engine header -- whether/how a corrected join exists is unverified; specialist checks before any calibration rests on it. cite=OutboundPriceIndexEngine.ts:10-15 (verify PASS)",
  "Freshness-preflight MAPE gate numeric threshold: the historical stale-bootstrap failure mode (MAPE 1880.99% would have silently activated) is real + cited, and quoting-baseline-guard.mjs is the freshness-preflight mechanism, but the specific numeric MAPE/staleness cutoff was NOT opened this session (only its rationale/history) -- specialist confirms the exact live cutoff + enforcement point before it is stated as a GATE. cite=scripts/lib/quoting-baseline-guard.mjs:20-29 (mechanism cited, exact cutoff not opened; verify PASS)",
  "Machining cost-per-part = cycle_time*machine_hour_rate + setup_time*machine_hour_rate/lot_size + material_cost_per_part (the DFMA direct-cost conversion) -- a structural cost identity distinct from the margin/vendor-cost rules. external-source candidate: Boothroyd, Dewhurst & Knight Product Design for Manufacture & Assembly 3e Ch5; class=categorical (cost identity); charlie confirms the rate source (never inline shop rate) before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Setup cost per part = setup_time*machine_hour_rate / lot_size; flag when setup_cost_per_part exceeds ~5% of total part cost (setup-dominated small lots) -- a lot-size-sensitive setup gate absent from the margin-floor logic. external-source candidate: Swift & Booker Manufacturing Process Selection Handbook 2e Ch4; class=numeric-threshold (5% flag, policy); charlie confirms the flag % before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Effective material cost = raw_material_cost / yield_factor where yield_factor = net_part_weight / gross_stock_weight; flag yield < ~0.90 (material-utilization loss) -- yield-adjusted material costing not in the material-cost-basis rule. external-source candidate: Boothroyd, Dewhurst & Knight DFMA 3e Ch6; class=numeric-threshold (yield flag, part-dependent); charlie confirms the yield floor before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Process-selection cost breakpoint: prefer process A over B when annual volume > (fixed_cost_B - fixed_cost_A)/(variable_cost_A - variable_cost_B) (the fixed-vs-variable crossover) -- a quantitative process-choice rule missing from quoting. external-source candidate: Swift & Booker Manufacturing Process Selection Handbook 2e Ch3; class=categorical (crossover formula); charlie confirms the cost inputs before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Wright learning-curve repeat-lot cost: unit_cost_n = unit_cost_1 * n^(log2(LR)) (LR=learning rate); apply on repeat lots, flag when LR < ~0.90 sustained over >3 lots -- repeat-lot learning effect not in the reconciliation/confidence gates. external-source candidate: NASA Cost Estimating Handbook (2020) Ch7 Wright model (OPEN/public); class=numeric-threshold (LR, part/process-dependent); charlie confirms the LR basis before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Tooling cost per part = tool_cost / parts_per_tool_life (parts_per_tool_life from measured/vendor tool-life data) -- FORMULA CORRECTION (soul-caught): the externally-staged form multiplied by a separate wear_rate AND divided by parts_per_tool_life, DOUBLE-COUNTING wear unless wear_rate is independently defined as a distinct scrap/breakage-adjustment fraction; never hand-apply the staged form verbatim. cite=Kalpakjian & Schmid Mfg Eng & Tech 7e Ch20 (machining economics); class=numeric-threshold (rate discipline); charlie confirms parts_per_tool_life sourcing (SFC tool-life data, oscar's domain) before promotion (soul-verified charlie-quoting wf_fab1690e-410, 2026-07-01)",
  "Overhead allocation rate = total_indirect_costs / total_machine_hours (Groover Fundamentals of Modern Manufacturing 6e Ch3) -- this is the missing CANONICAL-DERIVATION formula behind the existing gap#1 (LatheActualCostReconciliationEngine.ts:47-48 inlines MACHINE_RATE_USD_HR=85 / SETUP_RATE_USD_HR=95 with no canonical rate source): once a real total_indirect_costs + total_machine_hours dataset is wired from JM Die books, the inlined rates should derive from THIS formula. Stays unverified until the input dataset exists (refuse-list: inline-shop-rate-or-margin-constants); charlie confirms the data source before promotion (soul-verified charlie-quoting wf_fab1690e-410, 2026-07-01)",
]);

// ---- detect quoting operations from a prompt ----
export function detectOperations(text) {
  if (!isStr(text)) return [];
  const t = text.toLowerCase();
  const found = new Set();
  if (/emit.*quote|quote.*emit|send.*quote|issue.*quote/.test(t)) found.add("quote_emit");
  if (/accept.*quote|quote.*accept|win.*quote|award/.test(t)) found.add("quote_accept");
  if (/estimate|quote.*(?:cost|price)|price.*(?:a )?(?:part|job)|should[\s-]?cost/.test(t)) found.add("quote_estimate");
  if (/fair[\s-]?market|\bfmv\b|market[\s-]?price|predicted[\s-]?price/.test(t)) found.add("fair_market_value");
  if (/material[\s-]?cost|usd[\s-]?per[\s-]?in3|stock[\s-]?cost|per[\s-]?volume/.test(t)) found.add("material_cost_basis");
  if (/cost[\s-]?index|vendor[\s-]?cost|category[\s-]?prior|spend[\s-]?analys/.test(t)) found.add("cost_index_prior");
  if (/outbound[\s-]?price|sold[\s-]?order|price[\s-]?prior/.test(t)) found.add("outbound_price_prior");
  if (/reconcil|actual[\s-]?vs[\s-]?quote|quote[\s-]?vs[\s-]?actual|variance[\s-]?band/.test(t)) found.add("actual_cost_variance");
  if (/customer[\s-]?ingest|ingest.*customer|customer.*(?:filter|classif)/.test(t)) found.add("customer_ingest");
  if (/baseline[\s-]?bootstrap|bootstrap.*(?:quote|baseline)|docustrata[\s-]?ingest/.test(t)) found.add("baseline_bootstrap");
  if (/training[\s-]?status|training[\s-]?cycle|promote.*model|outbound[\s-]?promote/.test(t)) found.add("training_status");
  return [...found];
}

// for tests
export const _internals = { GATES, OPS_TO_GATES };
