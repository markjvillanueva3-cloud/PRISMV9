/**
 * documentExtractionRouter -- the "apply document reading to the prism features that can use it" fan-out.
 *
 * WHY (blueprint-extraction-consumer-application-map-2026-06-24, section 3): the DOCUMENT-reading path
 * dead-ends -- office/OCR extraction of speeds/feeds/tool-codes/materials/procedures reaches the engines
 * but never reaches a consumer. `DocumentExtractionContract` (the keystone) gave it a stable shape; THIS
 * router is the executable fan-out: given a validated contract it decides which document-knowledge
 * consumer each extracted entry can drive, with per-consumer payloads and -- for the COMMITMENT consumer
 * (tribal_capture, which writes authoritative shop knowledge) -- a confirm-gate on below-floor entries.
 * The sibling of `blueprintExtractionRouter` for unstructured documents.
 *
 * Pure -- no I/O. The caller obtains + validates the contract first (office_process ->
 * document_extract_contract), then routes it here.
 *
 * @module engines/blueprint-vision/documentExtractionRouter
 * @since   U-XRAY-DOCUMENT-EXTRACT-ROUTER (2026-06-24, slot xray)
 */

import {
  DOCUMENT_EXTRACTION_CONTRACT_VERSION,
  type DocumentExtractionContract,
  type DocEntry,
} from "../../schemas/DocumentExtractionContract.js";

// ============================================================================
// CONSTANTS
// ============================================================================

export const DOCUMENT_ROUTING_PLAN_VERSION = "1.0.0";

/**
 * `commitment`: the consumer writes durable state from the entries -- `tribal_capture` adds authoritative
 * shop knowledge to the corpus, so a below-floor (regex-heuristic) entry must NOT auto-capture without
 * operator confirmation (else it pollutes the corpus). `advisory`: a read/lookup/calc the operator reviews
 * (tool-crib inventory lookup, speeds/feeds) -- never confidence-gated.
 */
export type DocConsumerKind = "commitment" | "advisory";

// ============================================================================
// TYPES
// ============================================================================

export interface DocConsumerRoute {
  consumer: string;
  dispatcher: string;
  action: string;
  kind: DocConsumerKind;
  eligible: boolean;
  reason: string;
  requires_confirmation: boolean;
  blocking_fields: number;
  payload: Record<string, unknown>;
}

export interface DocumentRoutingPlan {
  schemaVersion: string;
  contract_version: string;
  source?: string;
  doc_type: string;
  routes: DocConsumerRoute[];
  summary: {
    n_eligible: number;
    n_ready: number;
    n_blocked_on_confirm: number;
    n_ineligible: number;
    n_needs_confirm: number;
  };
}

export interface RouteDocumentOpts {
  /** omit ineligible routes from `routes` when false (summary counts still reflect all). default true */
  includeIneligible?: boolean;
}

// ============================================================================
// INTERNAL -- defensive entry access (total: never throws on a malformed contract)
// ============================================================================

function entries(c: DocumentExtractionContract): DocEntry[] {
  return Array.isArray(c?.entries) ? c.entries : [];
}
/** entries whose kind is in the wanted set. */
function entriesOfKind(c: DocumentExtractionContract, kinds: readonly string[]): DocEntry[] {
  const want = new Set(kinds);
  return entries(c).filter((e) => e && want.has(e.kind));
}
function nNeedsConfirm(es: DocEntry[]): number {
  return es.filter((e) => e?.needs_confirm === true).length;
}
function values(es: DocEntry[]): string[] {
  // guard the value shape for full parity with the module's total posture (a direct unvalidated call
  // could carry a value-less entry; the wired path is Zod-validated so value is a guaranteed string).
  return es.map((e) => e.value).filter((v): v is string => typeof v === "string");
}

// ============================================================================
// CONSUMER TABLE -- data-driven; a new consumer is one entry. Actions disk-verified 2026-06-24:
//   prism_calc:tool_crib_inventory · prism_product:sfc_calculate · prism_knowledge:tribal_capture
//   · prism_calc:tool_catalog_lookup · prism_business:material_price_lookup (U-XRAY-DOC-ROUTER-XGALAXY)
// ============================================================================

interface DocConsumerSpec {
  consumer: string;
  dispatcher: string;
  action: string;
  kind: DocConsumerKind;
  /** the entry kinds this consumer routes (drives eligibility + blocking). */
  kinds: readonly string[];
  build: (matched: DocEntry[], c: DocumentExtractionContract) => { reason: string; payload: Record<string, unknown> };
}

const DOC_CONSUMERS: readonly DocConsumerSpec[] = Object.freeze([
  // ADVISORY: look the extracted tool codes up against tool-crib inventory (read-only)
  {
    consumer: "tool_crib_lookup",
    dispatcher: "prism_calc",
    action: "tool_crib_inventory",
    kind: "advisory",
    kinds: ["tool_code"],
    build: (m) => ({
      reason: m.length ? `${m.length} tool code(s) -> inventory-checkable` : "no tool codes in the document",
      payload: { tool_codes: values(m) },
    }),
  },
  // ADVISORY: compute speeds/feeds from extracted material(s) (+ any reference speed/feed values)
  {
    consumer: "speed_feed",
    dispatcher: "prism_product",
    action: "sfc_calculate",
    kind: "advisory",
    kinds: ["material"],
    build: (m, c) => ({
      reason: m.length ? `material(s) ${values(m).join(", ")} -> speeds/feeds computable` : "no material in the document",
      payload: { materials: values(m), speeds: values(entriesOfKind(c, ["speed"])), feeds: values(entriesOfKind(c, ["feed"])) },
    }),
  },
  // --- cross-galaxy doc consumers wired 2026-06-24 (U-XRAY-DOC-ROUTER-XGALAXY), both advisory + disk-verified ---
  // ADVISORY: look up extracted tool codes against the cutting-tool CATALOG (spec/geometry) -- sibling of
  // tool_crib_lookup (on-hand inventory): catalog answers "what is this tool", inventory "do we have it".
  {
    consumer: "tool_catalog_lookup",
    dispatcher: "prism_calc",
    action: "tool_catalog_lookup",
    kind: "advisory",
    kinds: ["tool_code"],
    build: (m) => ({
      reason: m.length ? `${m.length} tool code(s) -> catalog spec lookup` : "no tool codes in the document",
      payload: { tool_codes: values(m) },
    }),
  },
  // ADVISORY: price the extracted material(s) (catalog/spec/manual docs often name a stock material)
  {
    consumer: "material_price_lookup",
    dispatcher: "prism_business",
    action: "material_price_lookup",
    kind: "advisory",
    kinds: ["material"],
    build: (m) => ({
      reason: m.length ? `material(s) ${values(m).join(", ")} -> price-lookable` : "no material in the document",
      payload: { materials: values(m) },
    }),
  },
  // COMMITMENT: capture procedure/note text into the tribal-knowledge corpus (authoritative shop knowledge)
  {
    consumer: "tribal_capture",
    dispatcher: "prism_knowledge",
    action: "tribal_capture",
    kind: "commitment",
    kinds: ["procedure", "note"],
    build: (m) => ({
      reason: m.length ? `${m.length} procedure/note entr(y/ies) -> tribal-capturable` : "no procedure/note text in the document",
      payload: { entries: m.map((e) => ({ kind: e.kind, value: e.value, confidence: e.confidence })) },
    }),
  },
]);

// ============================================================================
// ROUTER
// ============================================================================

/**
 * Route a validated `DocumentExtractionContract` to every document-knowledge consumer it can drive.
 * Deterministic + pure. Eligibility = the consumer's entry kinds are present. For the `commitment`
 * consumer (tribal_capture) `requires_confirmation` is true whenever a routed entry is below the confirm
 * floor (`needs_confirm`); `blocking_fields` counts them. Advisory consumers never confidence-gate.
 */
export function routeDocumentToConsumers(
  contract: DocumentExtractionContract,
  opts: RouteDocumentOpts = {},
): DocumentRoutingPlan {
  const includeIneligible = opts.includeIneligible !== false;

  const allRoutes: DocConsumerRoute[] = DOC_CONSUMERS.map((spec) => {
    const matched = entriesOfKind(contract, spec.kinds);
    const eligible = matched.length > 0;
    const { reason, payload } = spec.build(matched, contract);
    const blocking = spec.kind === "commitment" ? nNeedsConfirm(matched) : 0;
    const requires_confirmation = spec.kind === "commitment" && eligible && blocking > 0;
    return {
      consumer: spec.consumer,
      dispatcher: spec.dispatcher,
      action: spec.action,
      kind: spec.kind,
      eligible,
      reason,
      requires_confirmation,
      blocking_fields: blocking,
      payload,
    };
  });

  const nEligible = allRoutes.filter((r) => r.eligible).length;
  const nBlocked = allRoutes.filter((r) => r.eligible && r.requires_confirmation).length;

  // recompute from entries (never mirror the summary -- the gate count can't drift from the banner)
  const nNeedsConfirmTotal = nNeedsConfirm(entries(contract));

  const plan: DocumentRoutingPlan = {
    schemaVersion: DOCUMENT_ROUTING_PLAN_VERSION,
    contract_version: typeof contract?.schemaVersion === "string" ? contract.schemaVersion : DOCUMENT_EXTRACTION_CONTRACT_VERSION,
    doc_type: typeof contract?.doc_type === "string" ? contract.doc_type : "unknown",
    routes: includeIneligible ? allRoutes : allRoutes.filter((r) => r.eligible),
    summary: {
      n_eligible: nEligible,
      n_ready: nEligible - nBlocked,
      n_blocked_on_confirm: nBlocked,
      n_ineligible: allRoutes.length - nEligible,
      n_needs_confirm: nNeedsConfirmTotal,
    },
  };
  if (typeof contract?.source === "string" && contract.source) plan.source = contract.source;
  return plan;
}
