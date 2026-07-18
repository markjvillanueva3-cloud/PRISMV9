/**
 * blueprintExtractionRouter -- the executable "apply this extraction to ALL prism features" backbone.
 *
 * WHY (blueprint-vision-app-integration-plan-2026-06-23): xray owns a versioned, mm-canonical
 * `BlueprintExtractionContract` (the stable shape app consumers bind to). The contract NORMALIZES a
 * single part's extraction, but nothing turned it into ACTION: "this part has dims + GD&T + a customer
 * title-block -> it can feed a quote, a print-to-program, an inspection plan, AND it carries PII to
 * redact." This module is that missing fan-out: given ONE validated contract it deterministically
 * decides WHICH downstream prism feature each extraction can drive, computes the per-consumer call
 * payload, and -- for the COMMITMENT consumers (quote = money, program = machine motion, inspection =
 * acceptance) -- gates them behind the operator-confirm of any below-floor field. The app's
 * upload->extract->route flow calls ONE action (`prism_cad:blueprint_extract_route`) and gets the
 * complete, confirm-gated fan-out plan.
 *
 * NOT a duplicate of `ExtractionIntelligenceRouter` (engines/ExtractionIntelligenceRouter.ts): that
 * routes extracted KNOWLEDGE (tribal tips / formulas / standards) to CODEBASE WIRING TARGETS (inject
 * into a tip collection, add to a registry) -- knowledge-base population. THIS routes a single part's
 * structured EXTRACTION CONTRACT to MANUFACTURING FEATURE consumers for that part -- per-part data
 * application. Different input (a contract vs. knowledge content), different output (a per-part call
 * plan vs. a wiring action).
 *
 * Pure -- no I/O, no GPU, no producer run. The caller obtains + validates the contract first (via the
 * producer dispatcher -> `blueprint_extract_contract`), then routes it here.
 *
 * @module engines/blueprint-vision/blueprintExtractionRouter
 * @since   U-XRAY-EXTRACT-CONSUMER-ROUTER (2026-06-24, slot xray)
 */

import {
  BLUEPRINT_EXTRACTION_CONTRACT_VERSION,
  type BlueprintExtractionContract,
  type ContractDimension,
  type ContractCallout,
} from "../../schemas/BlueprintExtractionContract.js";
import { redactExtraction, redactText, type RedactionAudit } from "./blueprintRedaction.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Routing-plan envelope version (independent of the contract version it consumes). */
export const BLUEPRINT_ROUTING_PLAN_VERSION = "1.0.0";

/**
 * Consumer KIND governs the confirm-gate:
 *  - `commitment`: a downstream COMMITMENT is made on the extracted fields -- a quote (money), a
 *    program (machine motion / scrap risk), an inspection plan (part acceptance). These MUST NOT
 *    proceed on a field whose confidence is below the contract's confirm floor; the router marks them
 *    `requires_confirmation` whenever a depended-on field is `needs_confirm`.
 *  - `advisory`: an analysis/derivation step (feature recognition, CAD reconstruction, material
 *    resolution) whose output a human reviews before any commitment -- never confirm-gated here.
 *  - `privacy`: redaction -- a precursor that REMOVES customer identity; gated by PII presence, never
 *    by field confidence.
 */
export type ConsumerKind = "commitment" | "advisory" | "privacy";

// ============================================================================
// TYPES
// ============================================================================

/** One downstream prism feature an extraction can drive. */
export interface ConsumerRoute {
  /** stable human id (e.g. "quote", "print_to_program") */
  consumer: string;
  /** MCP dispatcher that owns the action (e.g. "prism_business") */
  dispatcher: string;
  /** the dispatcher action to invoke (disk-verified 2026-06-24) */
  action: string;
  kind: ConsumerKind;
  /** can this extraction feed this consumer at all? */
  eligible: boolean;
  /** why eligible / why not (operator-facing) */
  reason: string;
  /** commitment consumer depending on >=1 below-floor field -> true (must operator-confirm first) */
  requires_confirmation: boolean;
  /** count of depended-on fields with needs_confirm=true (0 for non-commitment kinds) */
  blocking_fields: number;
  /** the contract-derived call payload (the app route adapts these to the action's exact params) */
  payload: Record<string, unknown>;
}

export interface ExtractionRoutingPlan {
  schemaVersion: string;
  /** the contract schemaVersion this plan was derived from (drift trip-wire) */
  contract_version: string;
  source?: string;
  /** true when `redactPayloads` was applied -- every payload + source is PII-redacted (safe to surface externally) */
  redacted?: boolean;
  routes: ConsumerRoute[];
  summary: {
    /** routes that can be driven by this extraction */
    n_eligible: number;
    /** eligible AND not blocked on operator confirmation -- drivable NOW */
    n_ready: number;
    /** eligible commitment consumers waiting on operator-confirm of a below-floor field */
    n_blocked_on_confirm: number;
    /** routes this extraction cannot drive (missing required fields) */
    n_ineligible: number;
    /** mirror of contract.summary.n_needs_confirm (the upstream cause of any confirm-gate) */
    n_needs_confirm: number;
  };
}

export interface RouteExtractionOpts {
  /** when false, ineligible routes are omitted from `routes` (summary counts still reflect all). default true */
  includeIneligible?: boolean;
  /**
   * When true, EVERY consumer payload (+ `plan.source`) is run through `redactExtraction` so the WHOLE
   * plan carries no customer identity -- making it safe to surface / serialize / log EXTERNALLY. The
   * DEFAULT plan (false) keeps the raw `title_block`/`source` in the non-privacy payloads, which the
   * INTERNAL commitment/advisory consumers (quote/program/job/material_resolve) legitimately need to drive
   * their action; this opt-in is for an external view where that must not leak. Eligibility / confirm-gates
   * are unaffected (redaction changes payload CONTENT only). default false.
   */
  redactPayloads?: boolean;
}

// ============================================================================
// INTERNAL -- defensive contract field access (the lib never throws on a malformed contract;
// the dispatcher validates first, but a defensive read keeps this pure-function total).
// ============================================================================

function dims(c: BlueprintExtractionContract): ContractDimension[] {
  return Array.isArray(c?.dimensions) ? c.dimensions : [];
}
function gdt(c: BlueprintExtractionContract): ContractCallout[] {
  return Array.isArray(c?.gdt) ? c.gdt : [];
}
function notes(c: BlueprintExtractionContract): ContractCallout[] {
  return Array.isArray(c?.notes) ? c.notes : [];
}
function profiles(c: BlueprintExtractionContract): ContractCallout[] {
  return Array.isArray(c?.profiles) ? c.profiles : [];
}
function surfaceFinishes(c: BlueprintExtractionContract): ContractCallout[] {
  return Array.isArray(c?.surface_finishes) ? c.surface_finishes : [];
}
/** count of needs_confirm fields among a set (the confirm-gate driver). */
function nNeedsConfirm(fields: Array<{ needs_confirm?: boolean }>): number {
  return fields.filter((f) => f?.needs_confirm === true).length;
}
function material(c: BlueprintExtractionContract): string | undefined {
  const m = c?.title_block?.material;
  return typeof m === "string" && m.trim() ? m.trim() : undefined;
}
/**
 * Distinct FIELD PATHS that carried PII, derived from a `redactExtraction` audit -- for the
 * operator-facing redact reason. We name the field PATHS ("title_block.customer", "notes[0].value",
 * "source"), NEVER the cleartext PII value: the redact ROUTE must not echo the customer name (the prior
 * `("${cust}")` reason leaked it). Deterministic order (audit order, de-duped). A redaction whose audit
 * carries no `field` (defensive -- redactExtraction always sets one) is labelled "(text)".
 */
function piiFieldPaths(redactions: readonly RedactionAudit[]): string[] {
  const seen = new Set<string>();
  for (const r of Array.isArray(redactions) ? redactions : []) {
    seen.add(typeof r?.field === "string" && r.field ? r.field : "(text)");
  }
  return [...seen];
}

// ============================================================================
// CONSUMER TABLE -- data-driven so a new consumer is one entry, not a new code path.
// Each builder returns {eligible, reason, blocking, payload}; the router applies the kind's
// confirm-gate uniformly. Actions are disk-verified (cadDispatcher/businessDispatcher/camDispatcher/
// qualityDispatcher/calcDispatcher/turningDispatcher, 2026-06-24).
// ============================================================================

interface ConsumerSpec {
  consumer: string;
  dispatcher: string;
  action: string;
  kind: ConsumerKind;
  build: (c: BlueprintExtractionContract) => {
    eligible: boolean;
    reason: string;
    /** count of below-floor fields this consumer DEPENDS ON (only meaningful for commitment kind) */
    blocking: number;
    payload: Record<string, unknown>;
  };
}

const CONSUMERS: readonly ConsumerSpec[] = Object.freeze([
  // --- PRIVACY precursor: redact customer identity (the explicit operator "auto redaction" ask) ---
  {
    consumer: "redact",
    dispatcher: "prism_cad",
    action: "blueprint_redact",
    kind: "privacy",
    // COMPREHENSIVE PII detection (U-XRAY-REDACT-ROUTER-COMPREHENSIVE-PII). The prior eligibility was
    // `Boolean(title_block.customer)` -- a privacy FALSE-NEGATIVE in the under-protection direction: a part
    // whose only PII is in a NOTE ("MADE FOR SEMBLEX"), in the `source` print PATH (paths routinely embed
    // the customer / part number), or in a NON-`customer` title-block identity field (company / vendor /
    // part_number / work_order / drawn_by ...) reported "nothing to redact" -- while that SAME un-redacted
    // title_block / source then flowed into the quote / print_to_program / job_create payloads. We delegate
    // to the shared `redactExtraction`, which walks the WHOLE contract (all ~30 CUSTOMER_IDENTITY_KEYS +
    // notes/gdt/profile/finish free text + the source path) and returns a complete audit -- a part is
    // eligible for redaction iff that audit is non-empty. `redactExtraction` is pure + GPU-free, so we run
    // it here and AUTO-DELIVER the redacted artifact in the payload: redaction is now automatic, not an
    // action the app must remember to call. Over-redaction is the lib's concern (common-word customers like
    // ACME/FORM are excluded from the free-text tier), so a legit "ACME THREAD" note never false-flags.
    build: (c) => {
      const { extraction: redacted, redactions } = redactExtraction(c);
      const fields = piiFieldPaths(redactions);
      const hasPii = redactions.length > 0;
      return {
        eligible: hasPii,
        // name the FIELD PATHS, never the cleartext PII value -- the redact route must not echo the customer
        // name. (NB: the other consumer payloads still carry the raw title_block/source as their INTERNAL
        // action input by design -- quote/program/job legitimately need the customer; redaction is a
        // precursor for EXTERNAL sharing, so the no-echo guarantee is scoped to THIS privacy route.)
        reason: hasPii
          ? `${redactions.length} PII span(s) across ${fields.length} field(s) [${fields.slice(0, 6).join(", ")}${fields.length > 6 ? ", ..." : ""}] -> auto-redacted`
          : "no customer-identity / part-number PII detected -> nothing to redact",
        blocking: 0,
        // The payload carries the AUTO-REDACTED extraction + the masked field paths + the audit span count.
        // It deliberately does NOT echo the raw contract back (which would re-leak the un-redacted PII into
        // the plan). `blueprint_redact` is idempotent, so an app re-redact of `redacted_extraction` is a
        // safe no-op; the structured redaction is already done. The image-region (title-block mask box)
        // redaction stays the region-classifier -> renderer path (it needs page pixels the contract lacks).
        payload: { redacted_extraction: redacted, pii_fields: fields, n_redactions: redactions.length },
      };
    },
  },
  // --- ADVISORY: resolve material from the title-block / notes (precursor to quote) ---
  {
    consumer: "material_resolve",
    dispatcher: "prism_business",
    action: "blueprint_resolve_material",
    kind: "advisory",
    build: (c) => {
      const mat = material(c);
      const hasTb = c?.title_block != null && typeof c.title_block === "object";
      const hasNotes = notes(c).length > 0;
      const eligible = Boolean(mat) || hasTb || hasNotes;
      return {
        eligible,
        reason: mat
          ? `material declared in title-block ("${mat}") -- resolve/normalize it`
          : eligible
            ? "title-block / notes present -- material may be resolvable"
            : "no title-block or notes -- no material source",
        blocking: 0,
        payload: { title_block: c?.title_block, notes: notes(c) },
      };
    },
  },
  // --- ADVISORY: recognize features from the extracted dimensions ---
  {
    consumer: "feature_recognize",
    dispatcher: "prism_cad",
    action: "feature_recognize",
    kind: "advisory",
    build: (c) => {
      const nd = dims(c).length;
      return {
        eligible: nd > 0,
        reason: nd > 0 ? `${nd} dimension(s) -> features recognizable` : "no dimensions -> nothing to recognize",
        blocking: 0,
        payload: { dimensions: dims(c), gdt: gdt(c) },
      };
    },
  },
  // --- ADVISORY: reconstruct CAD models from the extraction (delta consumes the result) ---
  {
    consumer: "cad_reconstruct",
    dispatcher: "prism_cad",
    action: "blueprint_to_all_cads",
    kind: "advisory",
    build: (c) => {
      const nd = dims(c).length;
      return {
        eligible: nd > 0,
        reason: nd > 0 ? `${nd} dimension(s) -> CAD reconstruction viable` : "no dimensions -> cannot reconstruct geometry",
        blocking: 0,
        payload: { dimensions: dims(c), gdt: gdt(c), title_block: c?.title_block },
      };
    },
  },
  // --- machining-prep chain (stock -> fixture -> tool -> speeds/feeds), all ADVISORY recommendation
  //     engines the operator reviews before the program (the gated commitment) ---
  // ADVISORY: optimize raw stock size from the part envelope
  {
    consumer: "stock_optimize",
    dispatcher: "prism_business",
    action: "stock_size_optimize",
    kind: "advisory",
    build: (c) => {
      const nd = dims(c).length;
      return {
        eligible: nd > 0,
        reason: nd > 0 ? `${nd} dimension(s) -> part envelope -> stock size optimizable` : "no dimensions -> no envelope for stock sizing",
        blocking: 0,
        payload: { dimensions: dims(c), material: material(c) },
      };
    },
  },
  // ADVISORY: recommend workholding/fixture from the part envelope + material (safety-relevant recommendation)
  {
    consumer: "fixture_design",
    dispatcher: "prism_calc",
    action: "fixture_design_recommend",
    kind: "advisory",
    build: (c) => {
      const nd = dims(c).length;
      return {
        eligible: nd > 0,
        reason: nd > 0 ? `${nd} dimension(s) -> part envelope -> workholding recommendable` : "no dimensions -> no envelope for workholding",
        blocking: 0,
        payload: { dimensions: dims(c), material: material(c) },
      };
    },
  },
  // ADVISORY: recommend cutting tools from feature geometry + material
  {
    consumer: "tool_select",
    dispatcher: "prism_calc",
    action: "tool_select_recommend",
    kind: "advisory",
    build: (c) => {
      const nd = dims(c).length;
      return {
        eligible: nd > 0,
        reason: nd > 0 ? `${nd} dimension(s) -> feature geometry -> tools recommendable` : "no dimensions -> no feature geometry for tool selection",
        blocking: 0,
        payload: { dimensions: dims(c), material: material(c) },
      };
    },
  },
  // ADVISORY: compute speeds/feeds from the extracted material (+ geometry / surface finish target)
  {
    consumer: "speed_feed",
    // prism_product:sfc_calculate is the Speed & Feed Calculator (ProductEngine.calculateSpeedFeed ->
    // vc/rpm/fz/power/tool_life). NOT prism_calc:sfc_calculate, which is the Surface-Finish engine
    // (Ra/Rz) -- the action name is overloaded across two dispatchers with opposite meanings.
    dispatcher: "prism_product",
    action: "sfc_calculate",
    kind: "advisory",
    build: (c) => {
      const mat = material(c);
      return {
        eligible: Boolean(mat),
        reason: mat ? `material "${mat}" -> speeds/feeds computable` : "no material -> speeds/feeds need a material",
        blocking: 0,
        payload: { material: mat, dimensions: dims(c), surface_finishes: surfaceFinishes(c) },
      };
    },
  },
  // --- COMMITMENT: quote the part (money) -- charlie owns the math; gate on dim confirmation ---
  {
    consumer: "quote",
    dispatcher: "prism_business",
    action: "blueprint_to_quote",
    kind: "commitment",
    build: (c) => {
      const nd = dims(c).length;
      const mat = material(c);
      const eligible = nd > 0 || Boolean(mat);
      return {
        eligible,
        reason: eligible
          ? `${nd} dimension(s)${mat ? ` + material "${mat}"` : ""} -> quotable`
          : "no dimensions and no material -> not quotable",
        blocking: nNeedsConfirm(dims(c)), // never quote on an unconfirmed dimension
        payload: { dimensions: dims(c), material: mat, title_block: c?.title_block, source: c?.source },
      };
    },
  },
  // --- COMMITMENT: print -> CAM program (machine motion / scrap risk) -- kilo owns the toolpath ---
  {
    consumer: "print_to_program",
    dispatcher: "prism_cam",
    action: "print_to_program_full",
    kind: "commitment",
    build: (c) => {
      const nd = dims(c).length;
      return {
        eligible: nd > 0,
        reason: nd > 0 ? `${nd} dimension(s) -> toolpath drivable` : "no dimensions -> cannot drive a program",
        blocking: nNeedsConfirm(dims(c)), // never machine an unconfirmed dimension
        payload: { dimensions: dims(c), material: material(c), title_block: c?.title_block, source: c?.source },
      };
    },
  },
  // --- COMMITMENT: inspection plan (part acceptance) -- GD&T is the driver; gate on dim+gdt confirm ---
  {
    consumer: "inspection_plan",
    dispatcher: "prism_quality",
    action: "blueprint_inspection_plan",
    kind: "commitment",
    build: (c) => {
      const ng = gdt(c).length;
      const nd = dims(c).length;
      const eligible = ng > 0 || nd > 0;
      return {
        eligible,
        reason: eligible
          ? `${ng} GD&T callout(s) + ${nd} dimension(s) -> inspection plannable`
          : "no GD&T and no dimensions -> nothing to inspect",
        // inspection commits acceptance on BOTH the dims it measures and the GD&T it checks
        blocking: nNeedsConfirm(dims(c)) + nNeedsConfirm(gdt(c)),
        payload: { dimensions: dims(c), gdt: gdt(c), source: c?.source },
      };
    },
  },
  // --- COMMITMENT: AS9102 first-article inspection form (signed acceptance record) -- a below-floor
  //     characteristic must NOT auto-populate a formal form, so gate on dim+gd&t confirmation ---
  {
    consumer: "fai_run",
    dispatcher: "prism_quality",
    action: "fai_run",
    kind: "commitment",
    build: (c) => {
      const ng = gdt(c).length;
      const nd = dims(c).length;
      const eligible = ng > 0 || nd > 0;
      return {
        eligible,
        reason: eligible
          ? `${nd} dimension(s) + ${ng} GD&T callout(s) -> AS9102 characteristics auto-populatable`
          : "no dimensions and no GD&T -> no characteristics for a first-article form",
        blocking: nNeedsConfirm(dims(c)) + nNeedsConfirm(gdt(c)),
        payload: { dimensions: dims(c), gdt: gdt(c), title_block: c?.title_block },
      };
    },
  },
  // --- ADVISORY: SPC process-capability (Cpk/Ppk) from the extracted nominal+tolerance limits ---
  {
    consumer: "spc_calculate",
    dispatcher: "prism_quality",
    action: "spc_calculate",
    kind: "advisory",
    build: (c) => {
      const nd = dims(c).length;
      return {
        eligible: nd > 0,
        reason: nd > 0 ? `${nd} dimension(s) -> nominal/tolerance limits -> Cpk/Ppk computable` : "no dimensions -> no nominal/tolerance for capability",
        blocking: 0,
        payload: { dimensions: dims(c) },
      };
    },
  },
  // --- business consumers (advisory pre-population/lookup) ---
  // ADVISORY: material cost lookup from the extracted material (+ envelope for volume)
  {
    consumer: "material_price_lookup",
    dispatcher: "prism_business",
    action: "material_price_lookup",
    kind: "advisory",
    build: (c) => {
      const mat = material(c);
      return {
        eligible: Boolean(mat),
        reason: mat ? `material "${mat}" -> price lookup (+ envelope for volume)` : "no material -> nothing to price",
        blocking: 0,
        payload: { material: mat, dimensions: dims(c) },
      };
    },
  },
  // ADVISORY: pre-populate a work order / job from the extracted part data
  {
    consumer: "job_create",
    dispatcher: "prism_business",
    action: "job_create",
    kind: "advisory",
    build: (c) => {
      const nd = dims(c).length;
      const mat = material(c);
      const eligible = nd > 0 || Boolean(mat);
      return {
        eligible,
        reason: eligible
          ? `${nd} dimension(s)${mat ? ` + material "${mat}"` : ""} -> job pre-populatable`
          : "no dimensions and no material -> nothing to seed a job",
        blocking: 0,
        payload: { dimensions: dims(c), material: mat, title_block: c?.title_block },
      };
    },
  },
  // --- COMMITMENT: CMM probe-sequence plan (acceptance measurement) -- gate on dim+gd&t confirm like inspection ---
  {
    consumer: "cmm_plan_path",
    dispatcher: "prism_calc",
    action: "cmm_plan_path",
    kind: "commitment",
    build: (c) => {
      const ng = gdt(c).length;
      const nd = dims(c).length;
      const eligible = ng > 0 || nd > 0;
      return {
        eligible,
        reason: eligible
          ? `${nd} dimension(s) + ${ng} GD&T callout(s) -> CMM probe sequence plannable`
          : "no dimensions and no GD&T -> nothing to probe",
        blocking: nNeedsConfirm(dims(c)) + nNeedsConfirm(gdt(c)),
        payload: { dimensions: dims(c), gdt: gdt(c) },
      };
    },
  },
  // ==========================================================================
  // GAP-MATRIX consumers wired 2026-06-24 (slot xray, U-XRAY-EXTRACT-ROUTER-GAP-CLOSE):
  // the remaining verified-on-disk candidates from
  // blueprint-extraction-consumer-application-map-2026-06-24 section 2. Each action was
  // disk-confirmed before listing (xray #1 refuse). All advisory -- analysis/derivation a
  // human reviews before any commitment, so none confirm-gate. Eligibility is uniformly
  // dims>0 (the part envelope is the substance each consumes; title-block enriches payloads).
  // ==========================================================================
  // ADVISORY: CAM-orchestrated tool pick -- the prism_cam sibling of `tool_select`
  // (prism_calc:tool_select_recommend); routes feature geometry through the CAM tool
  // orchestrator (camDispatcher smart_tool_select) instead of the calc recommender.
  {
    consumer: "smart_tool_select",
    dispatcher: "prism_cam",
    action: "smart_tool_select",
    kind: "advisory",
    build: (c) => {
      const nd = dims(c).length;
      return {
        eligible: nd > 0,
        reason: nd > 0 ? `${nd} dimension(s) -> feature geometry -> CAM tool selection` : "no dimensions -> no feature geometry for CAM tool selection",
        blocking: 0,
        payload: { dimensions: dims(c), material: material(c) },
      };
    },
  },
  // ADVISORY: stock-removal allowance envelope -- distinct from `stock_optimize` (which sizes
  // the raw blank); this derives per-surface removal from the part profile + tolerance.
  {
    consumer: "stock_allowance",
    dispatcher: "prism_calc",
    action: "stock_allowance",
    kind: "advisory",
    build: (c) => {
      const nd = dims(c).length;
      return {
        eligible: nd > 0,
        reason: nd > 0 ? `${nd} dimension(s) + profiles/gd&t -> stock-removal allowance computable` : "no dimensions -> no envelope for stock allowance",
        blocking: 0,
        payload: { dimensions: dims(c), profiles: profiles(c), gdt: gdt(c) },
      };
    },
  },
  // ADVISORY: lathe jaw/collet pick from OD/ID + length + material -- the turning sibling of
  // `fixture_design` (general/mill workholding). turningDispatcher selectJaw 7-jaw decision tree.
  {
    consumer: "lathe_workholding",
    dispatcher: "prism_turning",
    action: "lathe_workholding_select_jaw",
    kind: "advisory",
    build: (c) => {
      const nd = dims(c).length;
      return {
        eligible: nd > 0,
        reason: nd > 0 ? `${nd} dimension(s) -> OD/ID + length -> lathe jaw/collet recommendable` : "no dimensions -> no envelope for lathe workholding",
        blocking: 0,
        payload: { dimensions: dims(c), material: material(c) },
      };
    },
  },
  // ADVISORY: operator setup-sheet auto-fill from the title-block + features + dims.
  {
    consumer: "setup_sheet",
    dispatcher: "prism_cam",
    action: "setup_sheet_generate",
    kind: "advisory",
    build: (c) => {
      const nd = dims(c).length;
      return {
        eligible: nd > 0,
        reason: nd > 0 ? `${nd} dimension(s) + title-block -> operator setup sheet auto-fillable` : "no dimensions -> nothing to populate a setup sheet",
        blocking: 0,
        payload: { title_block: c?.title_block, dimensions: dims(c), gdt: gdt(c) },
      };
    },
  },
]);

// ============================================================================
// ROUTER
// ============================================================================

/**
 * Route a validated `BlueprintExtractionContract` to every downstream prism feature it can drive.
 *
 * Deterministic + pure. For each consumer: eligibility (does the extraction carry the required
 * fields?), the per-consumer payload (a subset of the contract the consuming route adapts to the
 * action's params), and -- for `commitment` consumers only -- `requires_confirmation` whenever a
 * depended-on field is below the contract's confirm floor (`needs_confirm`). `blocking_fields` is the
 * count of those below-floor fields, so the UI can say "3 dimensions need confirmation before quoting".
 *
 * @param contract a contract already validated via `validateBlueprintExtractionContract`
 * @param opts.includeIneligible omit ineligible routes from `routes` when false (default true)
 */
export function routeExtractionToConsumers(
  contract: BlueprintExtractionContract,
  opts: RouteExtractionOpts = {},
): ExtractionRoutingPlan {
  const includeIneligible = opts.includeIneligible !== false;

  const allRoutes: ConsumerRoute[] = CONSUMERS.map((spec) => {
    const r = spec.build(contract);
    // confirm-gate applies ONLY to commitment consumers; advisory/privacy never block on confidence.
    const blocking = spec.kind === "commitment" ? r.blocking : 0;
    const requires_confirmation = spec.kind === "commitment" && r.eligible && blocking > 0;
    return {
      consumer: spec.consumer,
      dispatcher: spec.dispatcher,
      action: spec.action,
      kind: spec.kind,
      eligible: r.eligible,
      reason: r.reason,
      requires_confirmation,
      blocking_fields: blocking,
      payload: r.payload,
    };
  });

  // EXTERNAL-SAFE plan: when redactPayloads, run every consumer payload through the same redactExtraction
  // the redact route uses, so the WHOLE plan carries no customer identity. The DEFAULT plan keeps raw
  // title_block/source in the non-privacy payloads (the internal quote/program/job consumers need the
  // customer to drive their action); this opt-in is for an external view/serialization where it must not
  // leak. Eligibility/confirm-gates are untouched (computed above from the unredacted contract); only
  // payload + reason CONTENT changes. The reasons normally echo only material grades + dim counts, but a
  // customer name MISLABELED into the `material` field would otherwise leak through a reason that
  // interpolates `material(c)` -- so the reason is ALSO scrubbed via redactText (defense-in-depth; a clean
  // grade/count reason is unchanged). Redacting the privacy route's own payload is idempotent (already masked).
  const routesOut: ConsumerRoute[] = opts.redactPayloads
    ? allRoutes.map((r) => ({ ...r, reason: redactText(r.reason).text, payload: redactExtraction(r.payload).extraction }))
    : allRoutes;

  // n_needs_confirm is recomputed from the ACTUAL field flags (not mirrored from the upstream
  // summary) so the plan's displayed cause can never disagree with the array-derived confirm-gate --
  // matches finalizeContract's own rollup; on a live contract the two are identical (2-arm scrutiny P2).
  const nNeedsConfirmTotal =
    nNeedsConfirm(dims(contract)) +
    nNeedsConfirm(gdt(contract)) +
    nNeedsConfirm(notes(contract)) +
    nNeedsConfirm(profiles(contract)) +
    nNeedsConfirm(surfaceFinishes(contract));

  // summary counts ALWAYS reflect the full consumer set (independent of includeIneligible).
  const nEligible = allRoutes.filter((r) => r.eligible).length;
  const nBlocked = allRoutes.filter((r) => r.eligible && r.requires_confirmation).length;
  const nReady = nEligible - nBlocked;
  const nIneligible = allRoutes.length - nEligible;

  const plan: ExtractionRoutingPlan = {
    schemaVersion: BLUEPRINT_ROUTING_PLAN_VERSION,
    contract_version: typeof contract?.schemaVersion === "string" ? contract.schemaVersion : BLUEPRINT_EXTRACTION_CONTRACT_VERSION,
    routes: includeIneligible ? routesOut : routesOut.filter((r) => r.eligible),
    summary: {
      n_eligible: nEligible,
      n_ready: nReady,
      n_blocked_on_confirm: nBlocked,
      n_ineligible: nIneligible,
      n_needs_confirm: nNeedsConfirmTotal,
    },
  };
  if (typeof contract?.source === "string" && contract.source) {
    // the source print path routinely embeds the customer/part number -> redact it on the external-safe plan.
    plan.source = opts.redactPayloads ? redactText(contract.source).text : contract.source;
  }
  if (opts.redactPayloads) plan.redacted = true;
  return plan;
}
