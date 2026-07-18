/**
 * PRISM MCP Server — SFC (Speed & Feed Calculator) Routes
 * Consolidates existing SFC endpoints from index.ts into a proper router
 */
import { Router } from "express";
import { requireFields } from "../middleware/validation.js";
import { requireTier } from "../middleware/tierGate.js";
import { recordFeatureUse } from "../middleware/attachUserPlan.js";
import type { CallToolFn } from "./index.js";

/**
 * Field-name bridge for POST /api/v1/sfc/deflection. The SFC web frontend
 * (web/src/api/sfc.ts `DeflectionRequest` -> useSfcDeflection) posts `stickout`
 * (the machinist term), but the backend `prism_calc:deflection` schema
 * (calcActionSchemas.ts) requires `overhang_length` -- the SAME physical quantity:
 * the cantilever length L in the deflection formula delta = F * L^3 / (3 * E * I).
 * Without this map every frontend deflection call fails Zod validation
 * ("overhang_length: expected number, received undefined"), verified live on :3100.
 *
 * Deflection-SCOPED on purpose: a global `stickout -> overhang_length` normalizer
 * alias would break the OTHER calc actions whose schemas legitimately use `stickout`
 * (calcActionSchemas.ts:1715/1746/1763). Non-destructive: only fills `overhang_length`
 * from `stickout` when the caller did not already supply `overhang_length`.
 * @param body the raw request body
 * @returns a shallow copy with overhang_length bridged from stickout when needed
 */
export function bridgeDeflectionParams(body: unknown): Record<string, unknown> {
  const b: Record<string, unknown> = (body && typeof body === "object") ? { ...(body as Record<string, unknown>) } : {};
  if ((b.overhang_length === undefined || b.overhang_length === null) && b.stickout != null) {
    b.overhang_length = b.stickout;
  }
  return b;
}

/**
 * Field-name + shape bridge for POST /api/v1/sfc/cycle-time. The SFC web frontend
 * (web/src/api/sfc.ts `CycleTimeRequest` -> useSfcCycleTime) posts
 * {feed_rate, cut_length, num_passes?, approach_distance?, overtravel?, rapid_rate?},
 * but the backend `prism_calc:cycle_time` schema (calcActionSchemas.ts:313) requires
 * {cutting_distance, cutting_feedrate} (+ optional rapid_distance, rapid_rate).
 * Without this map every frontend cycle-time call fails Zod validation (verified live
 * on :3100). The backend field structure encodes the standard cycle-time decomposition,
 * so the mapping is engineering-standard (NOT a guess):
 *   - cutting_feedrate <- feed_rate                         (1:1 synonym)
 *   - cutting_distance <- cut_length * (num_passes || 1)    (total feed travel; each pass cuts cut_length)
 *   - rapid_distance   <- (approach_distance||0)+(overtravel||0)  (non-cutting traverse moves)
 *   - rapid_rate is already the same field name (passes through)
 * Cycle-time-SCOPED (NOT a global alias: feed_rate is used by OTHER calc actions with
 * its own meaning). Non-destructive: only fills a backend field the caller did not supply.
 * ASSUMPTIONS (documented per R12): num_passes multiplies cut_length; approach+overtravel
 * are non-cutting (rapid) moves. If the redesign's cycle-time input model differs, adjust here.
 * @param body raw request body
 * @returns a shallow copy with the backend cycle_time shape bridged in
 */
export function bridgeCycleTimeParams(body: unknown): Record<string, unknown> {
  const b: Record<string, unknown> = (body && typeof body === "object") ? { ...(body as Record<string, unknown>) } : {};
  if ((b.cutting_feedrate === undefined || b.cutting_feedrate === null) && b.feed_rate != null) {
    b.cutting_feedrate = b.feed_rate;
  }
  if ((b.cutting_distance === undefined || b.cutting_distance === null) && typeof b.cut_length === "number") {
    const passes = (typeof b.num_passes === "number" && b.num_passes > 0) ? b.num_passes : 1;
    b.cutting_distance = b.cut_length * passes;
  }
  if ((b.rapid_distance === undefined || b.rapid_distance === null) && (b.approach_distance != null || b.overtravel != null)) {
    b.rapid_distance = (Number(b.approach_distance) || 0) + (Number(b.overtravel) || 0);
  }
  return b;
}

/**
 * Response normalizer for POST /api/v1/sfc/calculate. The web client
 * (web/src/api/sfc.ts `Wrapped<SfcCalculateResult>`, consumed by useSfc -> SfcCalculatorPage /
 * ResultsDisplay / ComparisonView / CalculationHistory) reads `result.{cutting_speed, spindle_speed,
 * feed_per_tooth, feed_rate, safety, meta}` (web/src/types/sfc.ts). But the dispatcher path
 * `prism_product:sfc_calculate` -> ProductEngine.sfcCalculate returns a DOUBLY-nested, differently-named
 * payload: `{ action, result: { cutting_speed_m_min, spindle_rpm, feed_per_tooth_mm, table_feed_mm_min,
 * safety_score, safety_status, ... } }`. So `res.json({ result })` made the page read
 * `result.cutting_speed` (undefined) off `{action, result}` -- EVERY primary field rendered undefined and
 * ResultsDisplay crashed on `result.feed_rate.toFixed(1)`. Verified live on :3100 2026-06-26 (slot:bravo).
 *
 * This unwraps the inner engine result and maps its field names to the documented SfcCalculateResult
 * contract. Route-SCOPED (HTTP boundary only): the MCP dispatcher shape `{action, result}` is UNCHANGED,
 * so its other consumers (blueprintExtractionRouter, documentExtractionRouter, calcDispatcher) are
 * unaffected. Non-destructive + defensive: a `{error}` / `{blocked}` envelope or an already-flat result
 * (no inner `.result`) passes straight through untouched so the FE silent-zero/blocked guards still fire.
 *
 * @param raw the parsed callTool payload for sfc_calculate (`{action, result:{...}}` on success)
 * @returns `{ result, safety, meta }` shaped for the web SfcCalculateResult contract
 */
export function normalizeSfcCalculateResponse(raw: unknown): Record<string, unknown> {
  // Pass failure/gate envelopes through unchanged -- the FE guards (assertNoEnvelopeError /
  // assertNotBlocked) must still see {error}/{blocked} to surface the real backend reason.
  if (!raw || typeof raw !== "object") return { result: raw };
  const top = raw as Record<string, unknown>;
  if (top.error !== undefined || top.blocked === true) return top;

  // Unwrap the dispatcher's {action, result:{...physics}} -> the inner physics object. Fall back to the
  // top object if there is no inner `.result` (an already-flat payload), so this never loses data.
  const inner = (top.result && typeof top.result === "object")
    ? (top.result as Record<string, unknown>)
    : top;

  // Map the engine's *_m_min / *_rpm / *_mm field names to the web SfcCalculateResult contract. `??`
  // keeps any value the engine already published under the contract name (forward-compatible).
  const result: Record<string, unknown> = {
    cutting_speed: inner.cutting_speed ?? inner.cutting_speed_m_min,
    spindle_speed: inner.spindle_speed ?? inner.spindle_rpm,
    feed_per_tooth: inner.feed_per_tooth ?? inner.feed_per_tooth_mm,
    feed_rate: inner.feed_rate ?? inner.table_feed_mm_min,
  };

  // Safety: prefer a structured {score,status,factors}; else assemble from the engine's flat
  // safety_score / safety_status / safety_warnings so the page's safety panel renders.
  const safetyObj = (inner.safety && typeof inner.safety === "object")
    ? inner.safety as Record<string, unknown>
    : (inner.safety_score !== undefined || inner.safety_status !== undefined)
      ? { score: inner.safety_score, status: inner.safety_status, warnings: inner.safety_warnings }
      : undefined;
  if (safetyObj) result.safety = safetyObj;

  // Meta: carry the rich engine outputs the page surfaces in secondary panels (power/torque/tool-life/
  // Ra/MRR/uncertainty/sustainability/formulas) plus the page's power-budget read (`meta.power_kw`).
  const meta: Record<string, unknown> = {
    power_kw: inner.power_kW ?? inner.power_kw,
    torque_nm: inner.torque_Nm ?? inner.torque_nm,
    cutting_force_n: inner.cutting_force_N,
    tool_life_min: inner.tool_life_min,
    optimal_speed_m_min: inner.optimal_speed_m_min,
    surface_roughness_ra_um: inner.surface_roughness_Ra_um,
    surface_finish_grade: inner.surface_finish_grade,
    mrr_cm3_min: inner.mrr_cm3_min,
    depth_of_cut_mm: inner.depth_of_cut_mm,
    width_of_cut_mm: inner.width_of_cut_mm,
    uncertainty: inner.uncertainty,
    sustainability: inner.sustainability,
    formulas_used: inner.formulas_used,
    tier: inner.tier,
  };
  result.meta = meta;

  return { result, safety: safetyObj, meta };
}

/** Creates sfc router.
 * @param callTool - call tool
 * @returns router
 */
export function createSfcRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/sfc/calculate — Core speed & feed calculation
  // U-COMM-03: tier-gated (free = 10/day; starter+ unlimited). requireTier reads
  // req.user.plan/usage (set by attachUserPlan); recordFeatureUse counts on success.
  router.post("/calculate", requireFields("material", "operation"), requireTier("speed_feed"), async (req, res, next) => {
    try {
      const result = await callTool("prism_product", "sfc_calculate", req.body);
      // Only meter a SUCCESSFUL calc (scrutiny P1): callTool returns {error} with
      // HTTP 200 on dispatcher/engine failure (it does not throw), so a failed
      // calc must NOT count against the user's daily cap.
      if (result && !(result as { error?: unknown }).error) recordFeatureUse(req, "speed_feed");
      // Normalize the dispatcher's doubly-nested {action, result:{...engine field names}} into the
      // web SfcCalculateResult contract (cutting_speed/spindle_speed/feed_per_tooth/feed_rate +
      // safety + meta). Without this the standalone page read undefined for every primary field and
      // ResultsDisplay crashed on result.feed_rate.toFixed (see normalizeSfcCalculateResponse).
      res.json(normalizeSfcCalculateResponse(result));
    } catch (e) { next(e); }
  });

  // POST /api/v1/sfc/cycle-time — Cycle time estimation
  // Bridge the frontend's {feed_rate, cut_length, num_passes, ...} -> the backend's
  // {cutting_feedrate, cutting_distance, ...} (see bridgeCycleTimeParams). Without it
  // every frontend cycle-time call fails Zod validation (verified live on :3100).
  router.post("/cycle-time", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "cycle_time", bridgeCycleTimeParams(req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/sfc/engagement — Tool engagement analysis
  router.post("/engagement", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "engagement", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/sfc/deflection — Tool deflection check
  // Bridge the frontend's `stickout` -> the backend's required `overhang_length`
  // (same quantity; see bridgeDeflectionParams). Without it every frontend
  // deflection call fails Zod validation (verified live on :3100).
  router.post("/deflection", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "deflection", bridgeDeflectionParams(req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/sfc/power-torque — Power and torque calculation
  router.post("/power-torque", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "power_torque", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/sfc/surface-finish — Surface finish prediction
  router.post("/surface-finish", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "surface_finish", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/sfc/tool-life — Tool life estimation
  router.post("/tool-life", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "tool_life", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/sfc/kienzle -- Kienzle specific cutting force (the Kienzle Tool Crib namesake calc).
  // calcApi.kienzle (web/src/api/calc.ts) targeted this path before it existed -- a dead wire until now.
  router.post("/kienzle", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "kienzle_force", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/sfc/kienzle-coefficients -- the kc1.1/mc coefficient table per ISO group (no params).
  router.get("/kienzle-coefficients", async (_req, res, next) => {
    try {
      const result = await callTool("prism_calc", "kienzle_coefficients", {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/sfc/mrr -- material removal rate. calcApi.mrr targeted this dead path until now.
  router.post("/mrr", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "mrr", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
