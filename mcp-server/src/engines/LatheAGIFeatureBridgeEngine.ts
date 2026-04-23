/**
 * LatheAGIFeatureBridgeEngine — U-LTH58 (LATHE-MASTER PX-S1)
 *
 * Central AGI bridge. P1..P5 call one API — `reason(feature, context)` —
 * and the bridge routes to the appropriate sub-reasoner, composes a trace,
 * and returns a standardized result:
 *
 *   { prediction, confidence, explanation, novel_insights, trace }
 *
 * Five supported features (one per P-phase):
 *   - speed_feed       (P1) — Kienzle/Taylor-anchored parameter prediction
 *   - postgen          (P2) — controller-specific G-code dialect selection
 *   - masterpost       (P3) — kinematic-aware post selection
 *   - print_to_program (P4) — feature-to-strategy mapping with reasoning
 *   - erp              (P5) — quote/schedule/PO decisions with cost bounds
 *
 * Sub-reasoners:
 *   Each feature owns a reasoner function returning a domain-specific
 *   prediction. The bridge normalizes the output shape and appends the
 *   reasoning trace (≥ 5 steps guaranteed by construction).
 *
 * Observability:
 *   Every call appends an `AGICallRecord` for Continuous Learning (U-LTH59)
 *   and audit, persisted to state/shared/lathe-agi-bridge-state.json.
 *
 * Physics references:
 *   - Kienzle (src/physics/constants.ts CANONICAL_KIENZLE)
 *   - Taylor tool life (CANONICAL_TAYLOR)
 *
 * @milestone LATHE-MASTER U-LTH58
 */

import { z } from "zod";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { atomicWriteJson } from "../utils/atomicSessionWrite.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_TRACE_STEPS = 5;
const DEFAULT_CONFIDENCE_FLOOR = 0.50;
const MAX_CALL_HISTORY = 500;

// ============================================================================
// SCHEMAS
// ============================================================================

export const AGI_FEATURES = ["speed_feed", "postgen", "masterpost", "print_to_program", "erp"] as const;
export type AGIFeature = (typeof AGI_FEATURES)[number];

export const AGIReasonInputSchema = z.object({
  feature: z.enum(AGI_FEATURES),
  context: z.record(z.string(), z.any()),
  request_id: z.string().optional(),
});
export type AGIReasonInput = z.infer<typeof AGIReasonInputSchema>;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export interface TraceStep {
  step: number;
  kind: "observation" | "inference" | "physics" | "caveat" | "decision";
  description: string;
}

export interface AGIReasonResult<TPred = Record<string, unknown>> {
  feature: AGIFeature;
  prediction: TPred;
  confidence: number;
  explanation: string;
  novel_insights: string[];
  trace: TraceStep[];
  generated_at: string;
  request_id: string;
}

export interface AGICallRecord {
  id: string;
  feature: AGIFeature;
  request_id: string;
  confidence: number;
  step_count: number;
  insight_count: number;
  at: string;
}

export interface AGIBridgeState {
  schemaVersion: 1;
  calls: AGICallRecord[];
  next_seq: number;
  updated_at: string;
}

// ============================================================================
// ENGINE
// ============================================================================

const DEFAULT_STATE_PATH = "H:/prism/state/shared/lathe-agi-bridge-state.json";

class LatheAGIFeatureBridgeEngine {
  private state: AGIBridgeState;
  private readonly statePath: string;

  constructor(statePath: string = DEFAULT_STATE_PATH) {
    this.statePath = statePath;
    this.state = this.loadState();
  }

  /** Dispatch reasoning for the requested feature. */
  reason(input: AGIReasonInput): AGIReasonResult {
    const parsed = AGIReasonInputSchema.parse(input);
    const reqId = parsed.request_id ?? `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    let result: AGIReasonResult;
    switch (parsed.feature) {
      case "speed_feed":
        result = this.reasonSpeedFeed(parsed.context, reqId);
        break;
      case "postgen":
        result = this.reasonPostgen(parsed.context, reqId);
        break;
      case "masterpost":
        result = this.reasonMasterpost(parsed.context, reqId);
        break;
      case "print_to_program":
        result = this.reasonPrintToProgram(parsed.context, reqId);
        break;
      case "erp":
        result = this.reasonERP(parsed.context, reqId);
        break;
    }

    if (result.trace.length < MIN_TRACE_STEPS) {
      throw new Error(
        `LatheAGIFeatureBridgeEngine: trace for ${parsed.feature} has ${result.trace.length} steps, need ≥ ${MIN_TRACE_STEPS}`,
      );
    }

    this.recordCall({
      id: `call_${this.state.next_seq.toString().padStart(8, "0")}`,
      feature: parsed.feature,
      request_id: reqId,
      confidence: result.confidence,
      step_count: result.trace.length,
      insight_count: result.novel_insights.length,
      at: new Date().toISOString(),
    });

    return result;
  }

  /** Retrieve recent AGI call history (for Continuous Learning audits). */
  history(filter?: { feature?: AGIFeature; limit?: number }): AGICallRecord[] {
    const list = filter?.feature
      ? this.state.calls.filter((c) => c.feature === filter.feature)
      : this.state.calls;
    const limit = filter?.limit ?? 100;
    return list.slice(-limit);
  }

  /** Aggregate confidence stats by feature. */
  confidenceStats(): Record<AGIFeature, { count: number; mean_confidence: number; min: number; max: number }> {
    const acc: Partial<Record<AGIFeature, { count: number; mean_confidence: number; min: number; max: number }>> = {};
    for (const feature of AGI_FEATURES) {
      const forFeature = this.state.calls.filter((c) => c.feature === feature);
      if (forFeature.length === 0) {
        acc[feature] = { count: 0, mean_confidence: 0, min: 0, max: 0 };
        continue;
      }
      const confs = forFeature.map((c) => c.confidence);
      acc[feature] = {
        count: forFeature.length,
        mean_confidence: round3(confs.reduce((s, x) => s + x, 0) / confs.length),
        min: round3(Math.min(...confs)),
        max: round3(Math.max(...confs)),
      };
    }
    return acc as Record<AGIFeature, { count: number; mean_confidence: number; min: number; max: number }>;
  }

  // ==========================================================================
  // FEATURE REASONERS
  // ==========================================================================

  private reasonSpeedFeed(ctx: Record<string, unknown>, reqId: string): AGIReasonResult {
    const iso = (ctx.iso_group as ISOGroup) ?? "P";
    if (!CANONICAL_KIENZLE[iso]) {
      throw new Error(`LatheAGIFeatureBridgeEngine.reasonSpeedFeed: invalid iso_group '${iso}'`);
    }
    const kienzle = CANONICAL_KIENZLE[iso];
    const taylor = CANONICAL_TAYLOR[iso];
    const ap = Number(ctx.ap_mm ?? 2.0);
    const fz = Number(ctx.fz_mm ?? 0.3);
    const vcHint = Number(ctx.vc_hint_m_min ?? 180);

    if (!Number.isFinite(ap) || !Number.isFinite(fz) || !Number.isFinite(vcHint) || ap <= 0 || fz <= 0 || vcHint <= 0) {
      throw new Error("LatheAGIFeatureBridgeEngine.reasonSpeedFeed: ap/fz/vc must be positive finite numbers");
    }

    // Fc = kc1_1 · ap · fz^(1 - mc)
    const fc = kienzle.kc1_1 * ap * Math.pow(fz, 1 - kienzle.mc);
    // Tool life at hinted Vc: T = (C / Vc)^(1/n)
    const toolLifeMin = Math.max(1, Math.pow(taylor.C / vcHint, 1 / taylor.n));

    const confidence = this.scoreConfidence([
      { ok: Number.isFinite(fc) && fc > 0, w: 0.4 },
      { ok: Number.isFinite(toolLifeMin) && toolLifeMin > 1, w: 0.3 },
      { ok: ap <= 5 && fz <= 0.5, w: 0.2 },
      { ok: vcHint >= 50 && vcHint <= 1000, w: 0.1 },
    ]);

    const novel: string[] = [];
    if (toolLifeMin < 5) novel.push(`Taylor life ${toolLifeMin.toFixed(1)} min < 5 — consider reducing Vc`);
    if (fc > 3000) novel.push(`Cutting force ${fc.toFixed(0)} N is high — check spindle torque margin`);

    const trace: TraceStep[] = [
      { step: 1, kind: "observation", description: `ISO group ${iso}; kc1.1=${kienzle.kc1_1}, mc=${kienzle.mc}` },
      { step: 2, kind: "physics", description: `Kienzle: Fc = ${kienzle.kc1_1} × ${ap} × ${fz}^(1-${kienzle.mc}) = ${fc.toFixed(1)} N` },
      { step: 3, kind: "physics", description: `Taylor: T = (${taylor.C}/${vcHint})^(1/${taylor.n}) = ${toolLifeMin.toFixed(1)} min` },
      { step: 4, kind: "inference", description: `Confidence ${(confidence * 100).toFixed(0)}% from 4 weighted sanity checks` },
      { step: 5, kind: "decision", description: `Recommend Vc≈${vcHint} m/min, fz=${fz}, ap=${ap}` },
    ];

    return this.finalize({
      feature: "speed_feed",
      prediction: { vc_m_min: vcHint, fz_mm: fz, ap_mm: ap, fc_n: round2(fc), tool_life_min: round2(toolLifeMin) },
      confidence,
      explanation: `Kienzle Fc=${fc.toFixed(0)} N @ ${ap}×${fz}mm on ${iso}. Taylor life ${toolLifeMin.toFixed(1)} min.`,
      novel_insights: novel,
      trace,
      reqId,
    });
  }

  private reasonPostgen(ctx: Record<string, unknown>, reqId: string): AGIReasonResult {
    const controller = String(ctx.controller ?? "fanuc").toLowerCase();
    const knownControllers = new Set(["fanuc", "haas", "okuma_osp", "mitsubishi", "mazak", "siemens", "generic"]);
    const resolved = knownControllers.has(controller) ? controller : "generic";

    const confidence = controller === resolved ? 0.9 : DEFAULT_CONFIDENCE_FLOOR;
    const novel = controller !== resolved ? [`Unknown controller '${controller}' — falling back to generic dialect`] : [];

    const trace: TraceStep[] = [
      { step: 1, kind: "observation", description: `Requested controller: '${controller}'` },
      { step: 2, kind: "inference", description: `Known dialects: ${[...knownControllers].join(", ")}` },
      { step: 3, kind: "inference", description: `Resolved → '${resolved}' (exact match: ${controller === resolved})` },
      { step: 4, kind: "caveat", description: resolved === "okuma_osp" ? "Okuma OSP uses G181/G180 for peck drill (non-Fanuc)" : "Fanuc-family syntax" },
      { step: 5, kind: "decision", description: `Use '${resolved}' dialect with confidence ${(confidence * 100).toFixed(0)}%` },
    ];

    return this.finalize({
      feature: "postgen",
      prediction: { controller: resolved, file_extension: this.extForController(resolved) },
      confidence,
      explanation: `Controller ${resolved} dialect selected.`,
      novel_insights: novel,
      trace,
      reqId,
    });
  }

  private reasonMasterpost(ctx: Record<string, unknown>, reqId: string): AGIReasonResult {
    const machineType = String(ctx.machine_type ?? "turret_lathe").toLowerCase();
    const hasLiveTool = Boolean(ctx.has_live_tool ?? false);
    const hasSubSpindle = Boolean(ctx.has_sub_spindle ?? false);
    const hasYAxis = Boolean(ctx.has_y_axis ?? false);

    const kinematicComplexity =
      (hasLiveTool ? 1 : 0) + (hasSubSpindle ? 1 : 0) + (hasYAxis ? 1 : 0);

    const postPattern =
      machineType.includes("swiss") ? "swiss_multichannel"
      : machineType.includes("mill_turn") ? "mill_turn_5ax"
      : kinematicComplexity >= 2 ? "twin_spindle_post"
      : "basic_2ax_lathe";

    const confidence = this.scoreConfidence([
      { ok: kinematicComplexity <= 3, w: 0.5 },
      { ok: machineType.length > 0, w: 0.3 },
      { ok: postPattern !== "basic_2ax_lathe" || kinematicComplexity === 0, w: 0.2 },
    ]);

    const novel: string[] = [];
    if (postPattern === "swiss_multichannel") novel.push("Swiss post requires channel-aware synchronization");
    if (kinematicComplexity >= 2 && postPattern === "basic_2ax_lathe") novel.push("Complex kinematics with basic post — under-utilizing capabilities");

    const trace: TraceStep[] = [
      { step: 1, kind: "observation", description: `Machine type: ${machineType}, live_tool=${hasLiveTool}, sub_spindle=${hasSubSpindle}, y_axis=${hasYAxis}` },
      { step: 2, kind: "inference", description: `Kinematic complexity score: ${kinematicComplexity}/3` },
      { step: 3, kind: "inference", description: `Pattern ${postPattern} selected by rule chain` },
      { step: 4, kind: "caveat", description: "Post must match channel count + spindle model" },
      { step: 5, kind: "decision", description: `Use post pattern '${postPattern}'` },
    ];

    return this.finalize({
      feature: "masterpost",
      prediction: { post_pattern: postPattern, kinematic_complexity: kinematicComplexity },
      confidence,
      explanation: `Post pattern ${postPattern} for ${machineType} (complexity ${kinematicComplexity}).`,
      novel_insights: novel,
      trace,
      reqId,
    });
  }

  private reasonPrintToProgram(ctx: Record<string, unknown>, reqId: string): AGIReasonResult {
    const featureType = String(ctx.feature_type ?? "od_turn").toLowerCase();
    const toleranceMm = Number(ctx.tolerance_mm ?? 0.05);
    const raTarget = Number(ctx.ra_um_target ?? 1.6);
    const iso = (ctx.iso_group as ISOGroup) ?? "P";

    if (!Number.isFinite(toleranceMm) || toleranceMm <= 0) {
      throw new Error("reasonPrintToProgram: tolerance_mm must be positive finite");
    }

    const isTight = toleranceMm < 0.02;
    const isFine = raTarget < 0.8;
    const strategy = isTight || isFine ? "finish_single_pass" : "rough_then_finish";
    const confidence = isTight || isFine ? 0.85 : 0.9;

    const novel: string[] = [];
    if (isTight) novel.push(`Tight tolerance ${toleranceMm} mm — consider dedicated finish pass with wiper insert`);
    if (iso === "S") novel.push("Superalloy: reduce Vc by 40% vs steel, use ceramic insert");

    const trace: TraceStep[] = [
      { step: 1, kind: "observation", description: `Feature ${featureType}, tol ${toleranceMm} mm, Ra ${raTarget} μm, ISO ${iso}` },
      { step: 2, kind: "inference", description: `Tolerance tight? ${isTight}, finish fine? ${isFine}` },
      { step: 3, kind: "inference", description: `Strategy ${strategy} picked from precision gates` },
      { step: 4, kind: "caveat", description: "Tool nose radius must be ≤ tolerance/4 for Abbe compliance" },
      { step: 5, kind: "decision", description: `Strategy: ${strategy}` },
    ];

    return this.finalize({
      feature: "print_to_program",
      prediction: { strategy, feature_type: featureType, iso_group: iso },
      confidence,
      explanation: `${strategy} for ${featureType} on ${iso} (tol ${toleranceMm}, Ra ${raTarget}).`,
      novel_insights: novel,
      trace,
      reqId,
    });
  }

  private reasonERP(ctx: Record<string, unknown>, reqId: string): AGIReasonResult {
    const quotedUnit = Number(ctx.quoted_unit_usd ?? 0);
    const actualUnit = Number(ctx.actual_unit_usd ?? 0);
    const quantity = Number(ctx.quantity ?? 1);

    if (!Number.isFinite(quotedUnit) || !Number.isFinite(actualUnit) || !Number.isFinite(quantity)) {
      throw new Error("reasonERP: quoted_unit_usd, actual_unit_usd, and quantity must be finite");
    }
    if (quotedUnit <= 0 || quantity <= 0) {
      throw new Error("reasonERP: quoted_unit_usd and quantity must be positive");
    }

    const variancePct = ((actualUnit - quotedUnit) / quotedUnit) * 100;
    const absVariance = Math.abs(variancePct);
    const action = absVariance < 10 ? "accept"
      : absVariance < 20 ? "flag_review"
      : "block_until_approval";
    const confidence = 1 - Math.min(0.5, absVariance / 100);

    const novel: string[] = [];
    if (variancePct > 15) novel.push(`Chronic under-quoting (+${variancePct.toFixed(1)}%) — raise baseline margin by half the delta`);
    if (variancePct < -10) novel.push(`Over-quoting (${variancePct.toFixed(1)}%) — customer may perceive high-priced vs competition`);

    const trace: TraceStep[] = [
      { step: 1, kind: "observation", description: `Quoted $${quotedUnit}/unit × ${quantity}, actual $${actualUnit}/unit` },
      { step: 2, kind: "physics", description: `Variance = (${actualUnit} − ${quotedUnit}) / ${quotedUnit} × 100 = ${variancePct.toFixed(2)}%` },
      { step: 3, kind: "inference", description: `|variance|=${absVariance.toFixed(2)}% maps to action '${action}'` },
      { step: 4, kind: "caveat", description: "Apply half-delta adjustment only after 3+ consistent samples to avoid over-fitting" },
      { step: 5, kind: "decision", description: `Action: ${action} (confidence ${(confidence * 100).toFixed(0)}%)` },
    ];

    return this.finalize({
      feature: "erp",
      prediction: { action, variance_pct: round2(variancePct), lot_delta_usd: round2((actualUnit - quotedUnit) * quantity) },
      confidence,
      explanation: `ERP variance ${variancePct.toFixed(2)}% → ${action}.`,
      novel_insights: novel,
      trace,
      reqId,
    });
  }

  // ==========================================================================
  // INTERNALS
  // ==========================================================================

  private finalize(args: {
    feature: AGIFeature;
    prediction: Record<string, unknown>;
    confidence: number;
    explanation: string;
    novel_insights: string[];
    trace: TraceStep[];
    reqId: string;
  }): AGIReasonResult {
    return {
      feature: args.feature,
      prediction: args.prediction,
      confidence: round3(args.confidence),
      explanation: args.explanation,
      novel_insights: args.novel_insights,
      trace: args.trace,
      generated_at: new Date().toISOString(),
      request_id: args.reqId,
    };
  }

  private scoreConfidence(checks: Array<{ ok: boolean; w: number }>): number {
    let total = 0;
    let hit = 0;
    for (const check of checks) {
      total += check.w;
      if (check.ok) hit += check.w;
    }
    if (total <= 0) return DEFAULT_CONFIDENCE_FLOOR;
    return Math.max(DEFAULT_CONFIDENCE_FLOOR, hit / total);
  }

  private extForController(controller: string): string {
    const map: Record<string, string> = {
      fanuc: ".nc", haas: ".nc", okuma_osp: ".min",
      mitsubishi: ".nc", mazak: ".eia", siemens: ".mpf", generic: ".nc",
    };
    return map[controller] ?? ".nc";
  }

  private recordCall(call: AGICallRecord): void {
    this.state.calls.push(call);
    this.state.next_seq++;
    if (this.state.calls.length > MAX_CALL_HISTORY) {
      this.state.calls.splice(0, this.state.calls.length - MAX_CALL_HISTORY);
    }
    this.persist();
  }

  private loadState(): AGIBridgeState {
    if (!existsSync(this.statePath)) return this.freshState();
    try {
      const raw = readFileSync(this.statePath, "utf-8");
      const parsed = JSON.parse(raw) as AGIBridgeState;
      if (parsed.schemaVersion !== 1) {
        throw new Error(`unsupported schemaVersion ${parsed.schemaVersion}`);
      }
      return parsed;
    } catch {
      const backupPath = `${this.statePath}.corrupt.bak`;
      try {
        const raw = readFileSync(this.statePath, "utf-8");
        atomicWriteJson(backupPath, { backup_at: new Date().toISOString(), raw });
      } catch { /* ignore */ }
      return this.freshState();
    }
  }

  private freshState(): AGIBridgeState {
    return {
      schemaVersion: 1,
      calls: [],
      next_seq: 1,
      updated_at: new Date().toISOString(),
    };
  }

  private persist(): void {
    this.state.updated_at = new Date().toISOString();
    const dir = dirname(this.statePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    atomicWriteJson(this.statePath, this.state);
  }

  __resetForTests(): void {
    this.state = this.freshState();
    this.persist();
  }

  __getState(): Readonly<AGIBridgeState> {
    return this.state;
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }

export const latheAGIFeatureBridgeEngine = new LatheAGIFeatureBridgeEngine();
export { LatheAGIFeatureBridgeEngine };
