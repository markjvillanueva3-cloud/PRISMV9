/**
 * PRISM MCP Server — Quote Compatibility Routes
 *
 * The frontend still calls bare /api/v1/quote/* endpoints while the backend
 * evolved into /quotes, /erp/quote, and dispatcher-backed specialty routes.
 * This router preserves the bare-path contract so current web desks can
 * converge on the live backend without a broad client rewrite.
 */
import { Router } from "express";
import type { Response } from "express";
import type { CallToolFn } from "./index.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

type QuoteMeta = {
  formula_used: string;
  uncertainty: number;
};

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isErrorPayload(value: unknown): value is { error: string } {
  return isObjectLike(value) && typeof value["error"] === "string" && Object.keys(value).length === 1;
}

/**
 * U-QUOTE-COMPAT-REDACT -- strip the shop's internal cost/margin stack from a quote-builder
 * result before it leaves the UNAUTHENTICATED compat surface. quote.ts is mounted under /api
 * (optionalToken -- never rejects anonymous), so the quote-builder routes that return
 * QuoteEstimatorEngine.estimate's full QuoteEstimateResult (quoting_generate, quote_estimate) would
 * otherwise hand an anonymous caller costs.machining.machine_rate_hr (the shop $/hr rate),
 * costs.overhead.rate_pct, costs.total_cost, and pricing.margin_pct -- the internal margin
 * stack a customer must never see (charlie soul: emitting-customer-quote-without-margin-floor-gate).
 *
 * The customer-facing quote is PRESERVED: quote_id / part_name / quantity / dates,
 * pricing.unit_price + pricing.total_price + pricing.adjustments, and lead_time. An AUTHENTICATED
 * request (req.userId set by optionalToken) gets the full breakdown unchanged, and the admin-gated
 * /api/v1/erp/quote/* path (erp.ts, verifyToken) is untouched. Redaction NEVER changes the emitted
 * price or the margin-floor gate -- it only hides internal fields from anonymous callers.
 *
 * GRACEFUL-SHAPE contract (per-file scrutiny arm B P1): the `costs` object is kept PRESENT but
 * EMPTIED (sub-fields removed), NOT deleted -- the FE consumer `adaptQuoteEstimate`
 * (web/src/api/client.ts) hard-gates `if (!e.costs || !e.pricing) return null`, and a null there
 * makes QuoteBuilderPage throw a 502 on its whole estimate tab. Keeping `costs` as a truthy empty
 * object means the FE's `num(undefined) -> 0` path renders a benign $0 breakdown (no real cost/rate
 * value leaks) instead of crashing the page for a token-less viewer. (UX polish -- a proper
 * "log in to see cost breakdown" state -- is a quebec frontend follow-up; see OPEN-THREADS.)
 *
 * Field map verified against QuoteEstimatorEngine.ts QuoteEstimateResult (lines 124-202).
 * Pure + total (clones, never mutates the engine result); non-quote shapes pass through untouched.
 */
// Margin internals carried inside the nested `pricing` block (QuoteEstimateResult / SheetMetal / Additive).
const REDACTED_PRICING_KEYS = ["margin_pct", "below_margin_floor", "margin_floor_pct"] as const;

// Nested internal-cost blocks emptied to a truthy `{}` (kept present so an FE `!e.<key>` presence-guard
// does not null-throw). `costs` = the per-line cost breakdown; `uncertainty` = CI95 bands whose
// `estimated_cost`/`ci95_low`/`ci95_high` ARE raw per-part cost-basis dollars (QuoteEstimatorEngine.ts:215);
// `cost_breakdown` = InstantQuoteResult's internal stack (machining.machine_rate_hr = shop $/hr,
// overhead.rate_pct = margin %, total_cost_per_part, every sub-block `.total`) on the anon
// /api/v1/quotes/instant route (U-QUOTES-INSTANT-REDACT, R16 sibling of this unit); `breakdown` +
// `inputs` = IntelligenceEngine.processCost's shape (IntelligenceEngine.ts:1104-1119) on the anon
// /api/v1/cost/{estimate,quote} + /api/v1/pipeline/quote routes (U-COST-ROUTE-REDACT) -- `breakdown` is a
// per-op cost ARRAY (`isObjectLike([])` is true -> replaced with `{}`, safe) and `inputs` holds
// `machine_rate_per_hour` (the shop $/hr rate). Additive: a result shape that lacks a given key is
// untouched, so this single set covers the /quote, /quotes, /cost AND /pipeline surfaces. No shipped
// customer surface carries a top-level `breakdown`/`inputs` key (QuoteEstimateResult uses nested `costs`;
// InstantQuoteResult uses `cost_breakdown`), so the two new keys match ONLY processCost. NOTE:
// InstantQuoteResult's TOP-LEVEL `ci95_low`/`ci95_high` are customer PRICE bounds (not cost basis) --
// deliberately NOT redacted; only the nested `cost_breakdown` block is.
const REDACTED_NESTED_BLOCKS = ["costs", "uncertainty", "cost_breakdown", "breakdown", "inputs"] as const;

// FLAT top-level internal-cost / margin keys -- the injection-mold shape (InjectionMoldQuoteEngine) is FLAT
// (no nested `costs`), surfacing the same internal stack at the top level. Deleted outright when anon.
// The `*_per_part` trio (total_cost_per_part / tool_cost_per_part / setup_cost_per_part) is
// IntelligenceEngine.processCost's flat internal cost (machine_cost already present) on the anon
// /api/v1/cost/{estimate,quote} + /api/v1/pipeline/quote routes (U-COST-ROUTE-REDACT). Customer-facing
// keys (unit_price, total_price, price_per_part, mold_cost_usd/lead_weeks/life_shots, num_cavities,
// lead_time, quote_id, ...) are NOT in this set, so a flat customer quote survives.
const REDACTED_FLAT_KEYS = [
  "material_cost", "machine_rate_hr", "machine_cost", "secondary_ops_cost",
  "overhead_cost", "unit_cost", "total_cost", "amortized_tool_per_part", "margin_pct",
  "total_cost_per_part", "tool_cost_per_part", "setup_cost_per_part",
] as const;

export function redactInternalMarginFields(result: unknown): unknown {
  if (!isObjectLike(result)) return result;
  // Detect every internal-bearing shape this surface emits:
  //   - nested QuoteEstimateResult / SheetMetal / Additive  -> `costs`/`pricing` (and `uncertainty`) blocks
  //   - FLAT InjectionMold                                   -> top-level cost/margin keys (REDACTED_FLAT_KEYS)
  const hasPricing = isObjectLike(result["pricing"]);
  const hasNestedBlock = REDACTED_NESTED_BLOCKS.some((k) => isObjectLike(result[k]));
  const hasFlatKey = REDACTED_FLAT_KEYS.some((k) => k in result);
  // Nothing internal present (price_breaks array, error payload, projected customer shape) -> untouched.
  if (!hasPricing && !hasNestedBlock && !hasFlatKey) return result;

  const clone: Record<string, unknown> = { ...result };
  // Empty (not delete) each nested internal block -- every sub-field is internal cost basis. The key
  // stays a truthy `{}` so an FE consumer's `!e.costs` presence-guard does not null-throw (graceful-shape).
  for (const k of REDACTED_NESTED_BLOCKS) {
    if (isObjectLike(result[k])) clone[k] = {};
  }
  // Keep the customer-facing pricing (unit/total/adjustments); strip only the margin internals.
  if (hasPricing) {
    const pricing: Record<string, unknown> = { ...(result["pricing"] as Record<string, unknown>) };
    for (const k of REDACTED_PRICING_KEYS) delete pricing[k];
    clone["pricing"] = pricing;
  }
  // Delete the FLAT internal cost/margin keys (injection-mold shape) outright -- there is no FE
  // presence-guard on these flat fields, so deletion (vs empty) is safe and leaks nothing.
  for (const k of REDACTED_FLAT_KEYS) {
    if (k in clone) delete clone[k];
  }
  return clone;
}

function sendCompatResponse(res: Response, result: unknown): void {
  if (isErrorPayload(result)) {
    res.status(500).json({
      ok: false,
      error: result.error,
      result: null,
      data: null,
    });
    return;
  }

  const safety = isObjectLike(result) && isObjectLike(result["safety"])
    ? result["safety"]
    : { score: 1, warnings: [] };
  const meta = isObjectLike(result) && isObjectLike(result["meta"])
    ? result["meta"]
    : ({ formula_used: "quote-route-compat", uncertainty: 0 } satisfies QuoteMeta);

  res.json({
    ok: true,
    result,
    data: result,
    safety,
    meta,
  });
}

/**
 * U-QUOTE-COMPAT-REDACT (3-of-3 arm A P0): redact-aware envelope unwrap.
 *
 * The prism_business dispatcher returns its payload as a SLIMMED MCP text envelope
 * `{ type: "text", text: "<JSON of the engine result>" }` (businessDispatcher.ts slimResponse) with
 * NO `content[]` wrapper, so the production `callTool` (index.ts: `result?.content?.[0]?.text`) cannot
 * peel it and hands the route the RAW `{ type, text }` object -- NOT the bare engine result. (The FE
 * `unwrapQuotingBody` parses the `text` itself; see reference_charlie_estimate_flow_envelope_nested_fix.)
 *
 * So redaction MUST parse the envelope first, redact the real engine object, then RE-WRAP it back into
 * the identical `{ type, text }` shape -- otherwise `redactInternalMarginFields` runs on `{type,text}`
 * (which has no costs/pricing/flat keys), no-ops, and the full cost/margin stack leaks inside `text`.
 * Returns the input unchanged when it is not a text envelope (defensive: a future bare-object callTool
 * still gets redacted by the direct branch below).
 */
export function redactThroughEnvelope(result: unknown): unknown {
  if (isObjectLike(result) && result["type"] === "text" && typeof result["text"] === "string") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(result["text"]);
    } catch {
      return result; // not JSON -> leave the envelope untouched (cannot have a quote shape)
    }
    const redacted = redactInternalMarginFields(parsed);
    if (redacted === parsed) return result; // nothing redacted -> avoid a needless re-stringify
    return { ...(result as Record<string, unknown>), text: JSON.stringify(redacted) };
  }
  // Bare object (or anything else): redact directly.
  return redactInternalMarginFields(result);
}

/**
 * Resolve whether the AUTHENTICATED caller is entitled to the CAD/CAM option
 * (paid feature -> the generated CNC program paths + setup sheet). FAILS CLOSED:
 * the entitlement comes ONLY from the verified token's permissions, never from
 * the request body (a body-supplied `cadcam_paid` would let any authed user
 * self-grant the paid feature -- the same self-assertion class the
 * actor_role-from-token rule already closes). Returns false when no permission
 * record proves the entitlement, so the CAD/CAM fields stay withheld until a
 * real entitlement source (job/customer record) is wired.
 *
 * @param req - the verifyToken-authenticated request (req.userPermissions set)
 * @returns true ONLY when the token carries a cadcam entitlement permission
 */
function resolveCadCamEntitlement(req: { userPermissions?: unknown }): boolean {
  const perms = Array.isArray(req.userPermissions) ? (req.userPermissions as unknown[]) : [];
  return perms.some((p) => typeof p === "string" && (p === "cadcam" || p === "cadcam_paid" || p === "quote:cadcam"));
}

/**
 * @param sensitive When true, this route returns a QuoteEstimateResult-shaped body whose internal
 *   cost/margin stack must be redacted for UNAUTHENTICATED callers (U-QUOTE-COMPAT-REDACT). An
 *   authenticated request (req.userId set by the /api optionalToken middleware) gets the full body.
 */
function quotePost(callTool: CallToolFn, action: string, sensitive = false) {
  return async (req: any, res: Response) => {
    try {
      const result = await callTool("prism_business", action, req.body ?? {});
      // Anon = no req.userId (optionalToken only sets it for a valid Bearer). Redact the internal
      // cost/margin stack so an anonymous caller never sees shop $/hr rates or margin_pct; the
      // customer-facing price + lead time are preserved. redactThroughEnvelope unwraps the
      // prism_business {type,text} envelope, redacts, and re-wraps so the wire shape is unchanged.
      const safe = sensitive && !req.userId ? redactThroughEnvelope(result) : result;
      sendCompatResponse(res, safe);
    } catch (e: any) {
      res.status(500).json({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        result: null,
        data: null,
      });
    }
  };
}

/**
 * U-SHEETMETAL-FLAT-ADAPT (slot:charlie 2026-06-29, 3-of-3 arm C P1 follow-up).
 *
 * SheetMetalQuoteEngine returns a NESTED result (`pricing.unit_price`, `costs.material.total`,
 * `lead_time.total_standard_days`), but SheetMetalQuotePage reads a FLAT shape
 * (`result.unit_price`, `result.material_cost`, `result.total`, `result.lead_time_days`) and
 * calls `.toFixed(2)` on them -> `undefined.toFixed` TypeError = dead/crashing pricing panel.
 * (Same flat/nested dead-panel class as CostEstimatorPage / estimate-flow in this slot's memory.)
 *
 * This unwraps the `{type,text}` envelope, maps the nested engine result to the flat keys the
 * page reads -- mapping ONLY fields the engine actually computes (no fabricated values, R12) --
 * and returns the flat object as `result`. Cost-breakdown fields (`material_cost` etc.) are
 * present only when `costs` survived (authed); for an anon caller `redactInternalMarginFields`
 * empties `costs` to `{}`, so the breakdown bars stay absent (cost basis stays redacted) while
 * the customer-facing `unit_price` / `total` / `lead_time_days` still render.
 */
export function adaptSheetMetalFlat(result: unknown): unknown {
  // Peel the prism_business {type,text} envelope to the bare engine object.
  let engineObj: unknown = result;
  if (isObjectLike(result) && result["type"] === "text" && typeof result["text"] === "string") {
    try { engineObj = JSON.parse(result["text"]); } catch { return result; }
  }
  if (!isObjectLike(engineObj)) return result;
  if (isErrorPayload(engineObj)) return result; // dispatcher error -> let sendCompatResponse 500 it

  const pricing = isObjectLike(engineObj["pricing"]) ? engineObj["pricing"] : {};
  const costs = isObjectLike(engineObj["costs"]) ? engineObj["costs"] : {};
  const leadTime = isObjectLike(engineObj["lead_time"]) ? engineObj["lead_time"] : {};
  const costTotal = (k: string): number | undefined => {
    const node = isObjectLike(costs[k]) ? costs[k] : undefined;
    return node && typeof node["total"] === "number" ? (node["total"] as number) : undefined;
  };

  // Flat object the page reads. Keep the nested keys too so any nested consumer is unaffected.
  const flat: Record<string, unknown> = {
    ...engineObj,
    unit_price: pricing["unit_price"] ?? null,
    total: pricing["total_price"] ?? null,
    lead_time_days: leadTime["total_standard_days"] ?? null,
  };
  // Cost-breakdown bars: only when the cost stack survived (authed). Anon = redacted-empty -> omit
  // so the page's `breakdown` filter naturally skips them (no $undefined bar).
  const material = costTotal("material");
  const cutting = costTotal("cutting");
  const bending = costTotal("bending");
  const finishing = costTotal("finishing");
  if (material !== undefined) flat["material_cost"] = material;
  if (cutting !== undefined) flat["cutting_cost"] = cutting;
  if (bending !== undefined) flat["bending_cost"] = bending;
  // finishing can legitimately be null (no finish) -> 0 so the bar renders cleanly when present.
  if (material !== undefined) flat["finishing_cost"] = finishing ?? 0;
  return flat;
}

function quoteGet(callTool: CallToolFn, action: string) {
  return async (_req: any, res: Response) => {
    try {
      const result = await callTool("prism_business", action, {});
      sendCompatResponse(res, result);
    } catch (e: any) {
      res.status(500).json({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        result: null,
        data: null,
      });
    }
  };
}

export function createQuoteRouter(callTool: CallToolFn): Router {
  const router = Router();

  // U-QUOTE-COMPAT-REDACT: ONLY the two routes that return QuoteEstimatorEngine.estimate's FULL
  // QuoteEstimateResult (internal `costs` block + `pricing.margin_pct`) are sensitive. `sensitive=true`
  // redacts that internal stack for unauthenticated callers (the customer-facing price is preserved).
  // The other three quote routes project to customer-facing fields only and are NOT sensitive
  // (verified against the engine return shapes, QuoteEstimatorEngine.ts):
  //   - quoting_price_breaks -> .price_breaks = Array<{qty,unit_price,total,lead_days}> (:230)
  //   - quote_compare_materials -> compareMaterials() = Array<{material,unit_price,total,lead_days,dfm}> (:513)
  //   - quote_what_if -> whatIf() = Array<{scenario,unit_price,delta_pct}> (:532)
  // (redactInternalMarginFields is also defensively a pass-through on those non-QuoteEstimateResult shapes.)
  router.post("/generate", quotePost(callTool, "quoting_generate", true));
  router.post("/price-breaks", quotePost(callTool, "quoting_price_breaks"));

  router.post("/estimate", quotePost(callTool, "quote_estimate", true));
  router.post("/compare-materials", quotePost(callTool, "quote_compare_materials"));
  router.post("/what-if", quotePost(callTool, "quote_what_if"));

  router.post("/analytics-record", quotePost(callTool, "analytics_record"));
  router.post("/analytics-update-outcome", quotePost(callTool, "analytics_update_outcome"));
  router.post("/analytics-record-actuals", quotePost(callTool, "analytics_record_actuals"));
  router.post("/analytics-accuracy", quotePost(callTool, "analytics_accuracy"));
  router.get("/analytics-conversion", quoteGet(callTool, "analytics_conversion"));
  router.get("/analytics-calibration", quoteGet(callTool, "analytics_calibration"));

  router.post("/blueprint", quotePost(callTool, "blueprint_to_quote"));
  router.post("/blueprint-resolve-material", quotePost(callTool, "blueprint_resolve_material"));

  router.post("/sec-ops-list", quotePost(callTool, "sec_ops_list"));
  router.post("/sec-ops-quote", quotePost(callTool, "sec_ops_quote"));
  router.post("/sec-ops-batch", quotePost(callTool, "sec_ops_batch_quote"));
  router.post("/sec-ops-vendors", quotePost(callTool, "sec_ops_find_vendors"));
  router.post("/sec-ops-recommend", quotePost(callTool, "sec_ops_recommend"));

  // U-QUOTE-COMPAT-REDACT (3-of-3 arm C): these 3 discrete-process quote routes ALSO return the internal
  // cost/margin stack (sheet_metal/additive -> nested costs+pricing.margin_pct; injection_mold -> FLAT
  // machine_rate_hr/overhead_cost/total_cost/margin_pct) on the same anon /api/v1/quote router, so they
  // are `sensitive=true` too. redactInternalMarginFields handles both the nested and the flat shape.
  // U-SHEETMETAL-FLAT-ADAPT: dedicated handler -> redact-if-anon THEN flat-adapt nested->flat
  // so the page's `result.unit_price.toFixed()` reads work (was a crashing dead panel).
  router.post("/sheet-metal", async (req: any, res: Response) => {
    try {
      const result = await callTool("prism_business", "sheet_metal_quote", req.body ?? {});
      const redacted = !req.userId ? redactThroughEnvelope(result) : result;
      sendCompatResponse(res, adaptSheetMetalFlat(redacted));
    } catch (e: unknown) {
      res.status(500).json({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        result: null,
        data: null,
      });
    }
  });

  router.post("/additive", quotePost(callTool, "additive_quote", true));
  router.post("/additive-materials", quotePost(callTool, "additive_list_materials"));
  router.post("/additive-compare", quotePost(callTool, "additive_compare_technologies"));

  router.post("/injection-mold", quotePost(callTool, "injection_mold_quote", true));
  router.get("/injection-mold-materials", quoteGet(callTool, "injection_mold_materials"));
  router.post("/injection-mold-dfm", quotePost(callTool, "injection_mold_dfm"));

  router.post("/stock-optimize", quotePost(callTool, "stock_size_optimize"));
  router.post("/stock-catalog", quotePost(callTool, "stock_size_catalog"));
  router.post("/stock-nesting", quotePost(callTool, "stock_size_nesting"));

  router.post("/material-price", quotePost(callTool, "material_price_lookup"));
  router.post("/material-compare", quotePost(callTool, "material_price_compare"));
  router.post("/material-surcharge", quotePost(callTool, "material_surcharge"));

  // ── ERP AUTOFEED (QUOTING-ERP-AUTOFEED) ──
  // These surfaces carry the FULL ERP/department/management field-map +
  // employee-PII (portal tasks). There is NO legitimate anonymous view, so
  // they are verifyToken-gated (not redact-when-anon) -- mirroring the
  // hotel-portal lesson (PII + privileged writes have no anon view).
  //
  // /erp-autofeed = READ-ONLY projection of a completed pipeline result.
  router.post("/erp-autofeed", verifyToken, async (req: any, res: Response) => {
    try {
      // ENTITLEMENT FAILS CLOSED: cadcam_paid MUST NOT be self-asserted by the
      // caller (it would let any authed user obtain the CNC program paths +
      // setup sheet without paying -- mirrors the actor_role-from-token rule).
      // Strip any body-supplied cadcam_paid; source it server-side from the
      // verified job/customer entitlement record. No record source is wired
      // yet, so it stays withheld (fail closed) until one is -- R12: better to
      // withhold a paid feature than leak it on a self-asserted flag.
      const { cadcam_paid: _ignored, ...safeBody } = (req.body ?? {}) as Record<string, unknown>;
      const cadcamEntitled = resolveCadCamEntitlement(req);
      const body = cadcamEntitled ? { ...safeBody, cadcam_paid: true } : safeBody;
      res.json(await callTool("prism_business", "quote_to_ship_erp_autofeed", body));
    } catch (e: unknown) {
      res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e), data: null });
    }
  });
  // /erp-commit = MATERIALIZES the job (shop-floor job + ERP work order +
  // portal tasks). A privileged WRITE -> verifyToken + a supervisory role
  // (the writer engine ALSO fails closed on actor_role; this is defence in
  // depth). The route forwards the authenticated user's role to the engine.
  router.post("/erp-commit", verifyToken, requireRole("lead", "supervisor", "manager", "admin"), async (req: any, res: Response) => {
    try {
      // The engine gates on actor_role; derive it from the VERIFIED token's
      // roles (req.userRoles, set by verifyToken) -- a caller cannot self-assert
      // a role the token does not carry. Pick the first write-privileged role.
      const writeRoles = ["admin", "manager", "supervisor", "lead", "planner"];
      const userRoles: string[] = Array.isArray(req.userRoles) ? req.userRoles : [];
      const actorRole = writeRoles.find((r) => userRoles.includes(r)) ?? null;
      const body = { ...(req.body ?? {}), actor_role: actorRole };
      res.json(await callTool("prism_business", "quote_to_ship_erp_commit", body));
    } catch (e: unknown) {
      res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e), data: null });
    }
  });

  return router;
}
