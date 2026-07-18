import {
  camDriveRecipeSchema,
  camDriveDecisionRulesSchema,
  type CamDriveRecipe,
  type CamDriveStep,
  type CamDriveDecisionRules,
} from "../schemas/camDriveRecipeSchema.js";

/**
 * CAMDriveRecipeEngine — autonomous, LLM-free CAM-drive replay.
 *
 * Compiles a parameterized CAM-drive recipe (camDriveRecipeSchema) into concrete
 * Fusion-360-drive calls by evaluating each step's decisionRuleRef against the
 * decision-rule registry + a LIVE geometry probe, then executes the resolved
 * steps through INJECTED deps that the dispatcher adapter wires to the real PRISM
 * engines (CAMDriveGateEngine fuse, Fusion360LiveBridgeEngine, prism_cam physics
 * actions, ActionTraceEngine, OutcomeCaptureBusEngine). No LLM in the loop.
 *
 * Design: workflow cam-drive-automation-map (2026-05-31). Geometric + selection
 * rules are pure (implemented here); physics + gate rules delegate to existing
 * dispatcher actions via deps (R8 — never re-implement, never inline constants).
 *
 * SAFETY: every op_create + post step declares gate.required=true; execute() calls
 * deps.gate() BEFORE actuation and ABORTS the step on a non-cleared verdict. The
 * engine NEVER actuates a machine on its own — deps must be supplied by a caller
 * that has passed the shop-floor scrutiny gate.
 */

/** Live geometry snapshot the rules evaluate against (from /cam/geometry-detail + fixture probe). */
export interface LiveProbe {
  /** part bounding box in inch, [min,max] each [x,y,z]. */
  bbox: { min: [number, number, number]; max: [number, number, number] };
  /** planar faces for parting-plane detection: {areaIn2, normal:[x,y,z], z}. */
  faces?: Array<{ areaIn2: number; normal: [number, number, number]; z: number }>;
  /** fixture geometry in inch. */
  fixture: { jawTopLipZ: number; jawCenterXY: [number, number] };
  /** index of the part body in the design (for setup model assignment). */
  partBodyIndex?: number;
}

/** A tool+holder assembly from a tool-library file. */
export interface ToolCandidate {
  id: string;
  type: string;
  geometry?: { DC?: number; LB?: number; NOF?: number; [k: string]: unknown };
  holder?: { taper?: string; interface?: string[]; [k: string]: unknown };
  startValues?: { presets?: Array<{ fz?: number; vc?: number; [k: string]: unknown }> };
  toolCost?: number;
  toolLifeMin?: number;
  [k: string]: unknown;
}

/** Injected side-effect surface. The dispatcher adapter supplies real implementations. */
export interface CamDriveDeps {
  /** Call a wired prism_cam dispatcher action (e.g. cam_drive_create_operation, cam_kienzle_force). */
  callDispatcher: (action: string, body: Record<string, unknown>) => Promise<Record<string, unknown>>;
  /** Raw Fusion360LiveBridge HTTP call for steps with no dispatcher action (doc/part/stock/mate). */
  bridgeRequest: (httpPath: string, method: string, body: Record<string, unknown>) => Promise<Record<string, unknown>>;
  /** CAMDriveGateEngine.gate() — returns {clearedToActuate, ...}. */
  gate: (input: { system: string; operation: string; params: Record<string, unknown> }) => Promise<{ clearedToActuate: boolean; [k: string]: unknown }>;
  /** ActionTraceEngine.recordTrace() tier-1 edge. */
  recordTrace: (edge: Record<string, unknown>) => void;
  /** Append a tier-2 rich trace line (the executor's own ledger). */
  recordRichTrace: (line: Record<string, unknown>) => void;
  /** OutcomeCaptureBusEngine.record() at run completion. */
  recordOutcome: (outcome: Record<string, unknown>) => void;
  /** Monotonic clock (injected for hermetic tests). */
  now: () => string;
  /** Stable run id (injected for hermetic tests). */
  runId: string;
  /** Optional: re-probe live geometry (for replay reSolveRules). */
  probe?: () => Promise<LiveProbe>;
}

export interface ResolvedStep extends Omit<CamDriveStep, "bodyTemplate"> {
  resolvedBody: Record<string, unknown>;
  ruleOutputs: Record<string, unknown>;
}

export interface ResolvedRecipe {
  recipeId: string;
  units: "inch" | "mm";
  steps: ResolvedStep[];
}

export interface StepRunResult {
  stepId: number;
  stage: string;
  status: "success" | "gated" | "skipped" | "failed" | "aborted";
  gateCleared?: boolean;
  verifyPassed?: boolean;
  result?: Record<string, unknown>;
  error?: string;
  latencyMs: number;
}

export interface RunResult {
  recipeId: string;
  runId: string;
  ok: boolean;
  steps: StepRunResult[];
  abortedAt?: number;
}

const TOKEN_RE = /^\$\{(.+)\}$/;

/**
 * Stages that ACTUATE the machine (cut / NC output) and therefore MUST clear the
 * gate. execute() derives the gate requirement from this set INDEPENDENT of the
 * operator-authored step.gate, so a recipe that omits the gate block on a cutting
 * step cannot bypass the fuse. (safety_validate is itself the gate — excluded to
 * avoid circular gating; setup/stock/doc steps do not cut and are not listed.)
 */
const STAGES_REQUIRING_GATE: ReadonlySet<string> = new Set(["op_create", "post"]);

export class CAMDriveRecipeEngine {
  /**
   * Compile a recipe into a ResolvedRecipe by evaluating every step's
   * decisionRuleRef against the rule registry + live probe, then resolving all
   * ${...} placeholders. LLM-free. Geometric/selection rules are pure; physics
   * rules delegate to existing dispatcher actions via deps.
   *
   * @param recipe parsed CAM-drive recipe (validated against camDriveRecipeSchema)
   * @param decisionRules the decision-rule registry
   * @param probe live geometry snapshot the rules run against
   * @param toolLib spindle-matchable tool+holder candidates
   * @param deps optional — required only if any step references a delegated (physics/gate) rule
   * @returns ResolvedRecipe with concrete bodies + the rule outputs (for the trace)
   */
  static async compile(
    recipe: CamDriveRecipe,
    decisionRules: CamDriveDecisionRules,
    probe: LiveProbe,
    toolLib: ToolCandidate[] = [],
    deps?: CamDriveDeps,
  ): Promise<ResolvedRecipe> {
    camDriveRecipeSchema.parse(recipe);
    camDriveDecisionRulesSchema.parse(decisionRules);
    if (recipe.units !== "inch") {
      throw new Error(
        `CAMDriveRecipeEngine.compile: units='${recipe.units}' not supported — the geometric decision-rule defaults (fixtureClearance, stock oversize) are INCH-tuned. mm recipes require units-aware rule constants first. Refusing rather than silently mis-scaling by 25.4x (R12 + UNITS-FIRST safety rail).`,
      );
    }

    const steps: ResolvedStep[] = [];
    for (const step of recipe.steps) {
      const ruleOutputs: Record<string, unknown> = {};
      for (const ruleId of step.decisionRuleRef) {
        const rule = decisionRules.rules[ruleId];
        if (!rule) {
          throw new Error(`compile: step ${step.stepId} references unknown rule '${ruleId}'`);
        }
        ruleOutputs[ruleId] = await CAMDriveRecipeEngine.evaluateRule(ruleId, rule, {
          recipe,
          probe,
          toolLib,
          step,
        }, deps);
      }
      const ctx = {
        rule: CAMDriveRecipeEngine.flattenRuleOutputs(ruleOutputs),
        project: recipe.project,
        probe,
        part_body: probe.partBodyIndex ?? 0,
        postProcessor: recipe.postProcessor,
      };
      // SAFETY REFINEMENT — an actuating stage MUST declare gate.required=true.
      // Catches a malformed/LLM-authored recipe at compile, before any actuation.
      if (STAGES_REQUIRING_GATE.has(step.stage) && step.gate?.required !== true) {
        throw new Error(
          `compile: step ${step.stepId} stage '${step.stage}' actuates the machine and MUST declare gate.required=true (un-gated actuating step rejected)`,
        );
      }
      const resolvedBody = CAMDriveRecipeEngine.resolveTemplate(step.bodyTemplate, ctx) as Record<string, unknown>;
      const { bodyTemplate: _omit, ...rest } = step;
      steps.push({ ...rest, resolvedBody, ruleOutputs });
    }
    return { recipeId: recipe.recipeId, units: recipe.units, steps };
  }

  /**
   * Execute a ResolvedRecipe step-by-step. Each actuating step: gate (if required)
   * -> actuate (dispatcher action or bridge) -> verify -> trace. Deterministic
   * onFail recovery; emits a learning-loop outcome at completion.
   *
   * @returns RunResult (ok=false + abortedAt on a fatal step)
   */
  static async execute(resolved: ResolvedRecipe, deps: CamDriveDeps): Promise<RunResult> {
    const results: StepRunResult[] = [];
    let ok = true;
    let abortedAt: number | undefined;

    for (const step of resolved.steps) {
      const t0 = Date.parse(deps.now()) || 0;
      const rr: StepRunResult = { stepId: step.stepId, stage: step.stage, status: "success", latencyMs: 0 };

      // OPERATOR-CONFIRM signal: if any consumed rule flagged needsOperatorConfirm
      // (e.g. parting plane fell to mid-height guess), an actuating step MUST gate
      // to the operator — never silently machine on an unconfirmed safety value.
      if (CAMDriveRecipeEngine.stepNeedsOperatorConfirm(step)) {
        rr.status = "gated";
        rr.error = "a decision rule flagged needsOperatorConfirm (e.g. parting plane) — operator confirmation required before actuation";
        CAMDriveRecipeEngine.trace(deps, resolved, step, rr, null);
        ok = false;
        abortedAt = step.stepId;
        results.push(CAMDriveRecipeEngine.stampLatency(rr, t0, deps));
        break;
      }

      // SAFETY GATE — derived from STAGE (defense in depth), not solely operator data.
      // An op_create/post step CANNOT actuate un-gated even if the recipe omitted gate.
      const gateRequired = step.gate?.required === true || STAGES_REQUIRING_GATE.has(step.stage);
      if (gateRequired) {
        const opType = step.resolvedBody.operation_type;
        let verdict: { clearedToActuate: boolean; [k: string]: unknown };
        try {
          verdict = await deps.gate({
            system: step.gate?.system ?? "fusion360",
            operation: step.gate?.catalogOperation ?? (typeof opType === "string" ? opType : step.stage),
            params: step.resolvedBody,
          });
        } catch (gerr) {
          // a throwing gate is a FAIL-CLOSED event — never actuate on gate error
          verdict = { clearedToActuate: false, error: gerr instanceof Error ? gerr.message : String(gerr) };
        }
        rr.gateCleared = verdict.clearedToActuate === true;
        if (!rr.gateCleared) {
          rr.status = "aborted";
          rr.error = `gate blocked: ${JSON.stringify(verdict).slice(0, 300)}`;
          CAMDriveRecipeEngine.trace(deps, resolved, step, rr, null);
          ok = false;
          abortedAt = step.stepId;
          results.push(CAMDriveRecipeEngine.stampLatency(rr, t0, deps));
          break;
        }
      }

      // ACTUATE + VERIFY, with deterministic retry when onFail.policy === 'retry'.
      const ep = step.endpoint ?? {};
      const maxAttempts = step.onFail?.policy === "retry" ? 1 + Math.max(0, step.onFail.maxRetries ?? 0) : 1;
      let done = false;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          let res: Record<string, unknown>;
          if (ep.dispatcherAction) {
            res = await deps.callDispatcher(ep.dispatcherAction, step.resolvedBody);
          } else if (ep.httpPath) {
            res = await deps.bridgeRequest(ep.httpPath, ep.method ?? "POST", step.resolvedBody);
          } else {
            throw new Error(`step ${step.stepId} has neither dispatcherAction nor httpPath`);
          }
          rr.result = res;
          rr.verifyPassed = CAMDriveRecipeEngine.checkVerify(step, res);
          if (!rr.verifyPassed) {
            throw new Error(`verify failed (${step.verify.kind} @ ${step.verify.path})`);
          }
          CAMDriveRecipeEngine.trace(deps, resolved, step, rr, res);
          done = true;
          break;
        } catch (err) {
          rr.error = err instanceof Error ? err.message : String(err);
          // retry only while attempts remain; otherwise fall through to onFail handling
        }
      }

      if (!done) {
        const policy = step.onFail?.policy ?? "abort";
        if (policy === "skip_if_optional" && step.optional) {
          rr.status = "skipped";
          CAMDriveRecipeEngine.trace(deps, resolved, step, rr, null);
        } else if (policy === "gate_to_operator") {
          rr.status = "gated";
          CAMDriveRecipeEngine.trace(deps, resolved, step, rr, null);
          ok = false;
          abortedAt = step.stepId;
          results.push(CAMDriveRecipeEngine.stampLatency(rr, t0, deps));
          break;
        } else {
          // 'abort' OR exhausted 'retry' -> failed
          rr.status = "failed";
          CAMDriveRecipeEngine.trace(deps, resolved, step, rr, null);
          ok = false;
          abortedAt = step.stepId;
          results.push(CAMDriveRecipeEngine.stampLatency(rr, t0, deps));
          break;
        }
      }
      results.push(CAMDriveRecipeEngine.stampLatency(rr, t0, deps));
    }

    // LEARNING-LOOP outcome (negative signal is signal). kind/source/domain are
    // VALID OutcomeCaptureBus enum values (v1.0.0-safe): the replay EMITS a program
    // (a recommendation), paired with the real cut outcome later via lineage_id.
    //
    // U-CAM-LOOP-DOMAIN-ISOLATE (2026-05-31, slot kilo): domain is "cam", NOT "mill".
    // This is the CAM galaxy's engine — every outcome it emits IS a CAM-domain signal.
    // It was previously hardcoded "mill", which routed CAM-drive outcomes into
    // state/outcomes/mill.jsonl and silently merged them into the MILL corpus
    // (corpus pollution → the mill meta-learner trained on CAM data, and CAM had no
    // shard of its own). Emitting "cam" makes OutcomeCaptureBus.pathFor() write the
    // dedicated state/outcomes/cam.jsonl shard. context.cam_system lets the
    // consumer (U-CAM-LOOP-WIRE-CONSUMER) resolve which CAM system produced the run.
    deps.recordOutcome({
      domain: "cam",
      kind: "recommendation_emitted",
      source: "system",
      lineage_id: `${resolved.recipeId}:${deps.runId}`,
      confidence: ok ? 1 : 0,
      context: {
        engine: "CAMDriveRecipeEngine",
        action: "cam_drive_recipe_execute",
        operation: "cam_drive_replay",
        // The CAM-drive adapter actuates Fusion 360 (the :18365 add-in bridge),
        // so the producing CAM system is fusion360. Passthrough key (v1.0.0-safe).
        cam_system: "fusion360",
      },
      actual: {
        postedOk: ok,
        gateBlocks: results.filter((r) => r.status === "aborted" || r.status === "gated").length,
        stepsRun: results.length,
      },
      ts: deps.now(),
    });

    return { recipeId: resolved.recipeId, runId: deps.runId, ok, steps: results, abortedAt };
  }

  /**
   * Replay a recipe: reSolveRules=true re-probes live geometry + recompiles (true
   * generalization to a moved/resized part); false replays the recorded bodies.
   */
  static async replay(
    recipe: CamDriveRecipe,
    decisionRules: CamDriveDecisionRules,
    probe: LiveProbe,
    toolLib: ToolCandidate[],
    deps: CamDriveDeps,
    opts: { reSolveRules?: boolean } = {},
  ): Promise<RunResult> {
    const liveProbe = opts.reSolveRules && deps.probe ? await deps.probe() : probe;
    const resolved = await CAMDriveRecipeEngine.compile(recipe, decisionRules, liveProbe, toolLib, deps);
    return CAMDriveRecipeEngine.execute(resolved, deps);
  }

  // ── rule evaluation (pure geometric/selection; physics delegated) ──────────

  /** Evaluate one decision rule. Returns the rule's output object. */
  static async evaluateRule(
    ruleId: string,
    rule: CamDriveDecisionRules["rules"][string],
    ctx: { recipe: CamDriveRecipe; probe: LiveProbe; toolLib: ToolCandidate[]; step: CamDriveStep },
    deps?: CamDriveDeps,
  ): Promise<Record<string, unknown>> {
    const { probe, toolLib } = ctx;
    const [minX, minY, minZ] = probe.bbox.min;
    const [maxX, maxY, maxZ] = probe.bbox.max;
    const [jawCx, jawCy] = probe.fixture.jawCenterXY;
    const num = (v: unknown, d: number): number => (typeof v === "number" && Number.isFinite(v) ? v : d);

    switch (ruleId) {
      case "place.center_bbox":
        return { tx: round4(jawCx - (minX + maxX) / 2), ty: round4(jawCy - (minY + maxY) / 2) };
      case "place.seat_bottom_riser": {
        const clearance = num((rule.params as Record<string, unknown> | undefined)?.fixtureClearance, 0.5);
        return { tz: round4(probe.fixture.jawTopLipZ + clearance - minZ), fixtureClearance: clearance };
      }
      case "parting.geometry_driven": {
        const areaFrac = num((rule.params as Record<string, unknown> | undefined)?.AREA_FRAC, 0.35);
        const footprint = Math.abs((maxX - minX) * (maxY - minY));
        const zFaces = (probe.faces ?? []).filter((f) => Math.abs(Math.abs(f.normal[2]) - 1) < 1e-3);
        let partingZ = minZ + 0.5 * (maxZ - minZ);
        let fromFace = false;
        if (zFaces.length && footprint > 0) {
          const best = zFaces.reduce((a, b) => (b.areaIn2 > a.areaIn2 ? b : a));
          if (best.areaIn2 >= areaFrac * footprint && best.z > minZ && best.z < maxZ) {
            partingZ = best.z;
            fromFace = true;
          }
        }
        return { partingZ: round4(partingZ), fromFace, needsOperatorConfirm: !fromFace };
      }
      case "stock.oversize": {
        const p = (rule.params as Record<string, unknown> | undefined) ?? {};
        const radial = num(p.radial, 0.04), top = num(p.top, 0.06), bottom = num(p.bottom, 0);
        return {
          min: [round4(minX - radial), round4(minY - radial), round4(minZ - bottom)],
          max: [round4(maxX + radial), round4(maxY + radial), round4(maxZ + top)],
        };
      }
      case "wcs.stock_bottom_center": {
        const p = (rule.params as Record<string, unknown> | undefined) ?? {};
        const radial = num(p.radial, 0.04), bottom = num(p.bottom, 0);
        return { x: round4(jawCx), y: round4(jawCy), z: round4(minZ - bottom), _note: "stock-bottom-center", radial };
      }
      case "strategy.by_feature": {
        const table = (rule as Record<string, unknown>).table as Record<string, string[]> | undefined;
        const ft = String(ctx.step.featureRef ?? "").toLowerCase();
        let ops: string[] = [];
        if (table) {
          for (const key of Object.keys(table)) {
            if (ft.includes(key)) { ops = table[key]; break; }
          }
        }
        return { operations: ops };
      }
      case "tool.spindle_match": {
        const taper = String((ctx.recipe.project as Record<string, unknown>).machine ?? "").toUpperCase();
        const wantCat40 = taper.includes("CAT40") || taper.includes("BIG-PLUS") || taper.includes("M460V");
        const matched = toolLib.filter((t) => {
          const h = t.holder ?? {};
          const hTaper = String(h.taper ?? "").toUpperCase();
          return wantCat40 ? (hTaper.includes("CAT40") || hTaper.includes("BT40") || (h.interface ?? []).some((i) => String(i).toUpperCase().includes("BIG"))) : true;
        });
        return { candidates: matched.map((t) => t.id), count: matched.length };
      }
      case "tool.rank_costeff_mrr": {
        // default EACH weight individually (a partial {mrr:0.5} must not yield NaN scores)
        const wRaw = ((rule.params as Record<string, unknown> | undefined)?.weights as Record<string, unknown> | undefined) ?? {};
        const wMrr = num(wRaw.mrr, 0.5), wCost = num(wRaw.cost, 0.4), wDefl = num(wRaw.defl, 0.1);
        if (!toolLib.length) return { selected: null, reason: "no tool candidates" };
        const scored = toolLib
          .map((t) => {
            const dc = num(t.geometry?.DC, 0);
            const lb = num(t.geometry?.LB, 1);
            const life = num(t.toolLifeMin, 1), cost = num(t.toolCost, 1);
            const mrr = dc; // proxy: larger DC -> more material/rev (full MRR resolved at feed step)
            const costEff = life / Math.max(cost, 1e-6);
            const defl = (lb * lb * lb) / Math.max(dc * dc * dc * dc, 1e-9); // ~ L^3/D^4 stiffness proxy
            return { id: t.id, score: wMrr * mrr + wCost * costEff - wDefl * defl, dc };
          })
          .filter((s) => Number.isFinite(s.score));
        if (!scored.length) return { selected: null, reason: "no finite-scored candidate" };
        scored.sort((a, b) => b.score - a.score || b.dc - a.dc);
        return { selected: scored[0].id, ranked: scored.slice(0, 3) };
      }
      // PHYSICS + GATE rules delegate to existing dispatcher actions (R8; never inline constants)
      case "feed.kienzle":
      case "feed.taylor_vc":
      case "feed.chipload_rpm":
      case "feed.deflection_clamp": {
        if (!deps) return { delegated: true, dispatcherAction: physicsActionFor(ruleId), resolvedAt: "execute" };
        const action = physicsActionFor(ruleId);
        const out = await deps.callDispatcher(action, {
          material_iso: (ctx.recipe.project as Record<string, unknown>).isoGroup,
          bbox_in: probe.bbox,
        });
        return { delegated: action, ...out };
      }
      case "gate.catalog_validate":
        return { delegated: "cam_drive_gate", enforcedAtExecute: true };
      default:
        // unknown rule kind: surface, do not silently pass (R12)
        throw new Error(`evaluateRule: no evaluator for rule '${ruleId}' (kind ${rule.kind})`);
    }
  }

  /** Flatten {ruleId: output} into a nested object so ${rule.place.center_bbox.tx} resolves. */
  static flattenRuleOutputs(ruleOutputs: Record<string, unknown>): Record<string, unknown> {
    const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);
    const nested: Record<string, unknown> = {};
    for (const [ruleId, out] of Object.entries(ruleOutputs)) {
      const parts = ruleId.split(".");
      for (const seg of parts) {
        if (FORBIDDEN.has(seg)) throw new Error(`flattenRuleOutputs: forbidden rule-id segment '${seg}' in '${ruleId}' (prototype-pollution guard)`);
      }
      let cur = nested;
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = (cur[parts[i]] as Record<string, unknown>) ?? {};
        cur = cur[parts[i]] as Record<string, unknown>;
      }
      cur[parts[parts.length - 1]] = out;
    }
    return nested;
  }

  /** True if any consumed rule output flagged needsOperatorConfirm — a safety signal
   *  (e.g. the parting plane fell to a mid-height guess) that must force an operator gate. */
  static stepNeedsOperatorConfirm(step: ResolvedStep): boolean {
    for (const out of Object.values(step.ruleOutputs ?? {})) {
      if (out && typeof out === "object" && (out as Record<string, unknown>).needsOperatorConfirm === true) return true;
    }
    return false;
  }

  /** Recursively resolve ${dot.path} placeholders against ctx. Pure-token -> typed value; embedded -> string. */
  static resolveTemplate(node: unknown, ctx: Record<string, unknown>): unknown {
    if (typeof node === "string") {
      const m = node.match(TOKEN_RE);
      if (m) {
        const val = getPath(ctx, m[1]);
        return val === undefined ? node : val;
      }
      return node.replace(/\$\{([^}]+)\}/g, (_s, p) => {
        const v = getPath(ctx, p);
        if (v === undefined) return `\${${p}}`;
        if (v !== null && typeof v === "object") {
          throw new Error(
            `resolveTemplate: embedded token \${${p}} resolved to a ${Array.isArray(v) ? "array" : "object"} — use a standalone "\${${p}}" token, not embedded in a string (an [object Object] in an actuation body is silent param corruption)`,
          );
        }
        return String(v);
      });
    }
    if (Array.isArray(node)) return node.map((n) => CAMDriveRecipeEngine.resolveTemplate(n, ctx));
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) out[k] = CAMDriveRecipeEngine.resolveTemplate(v, ctx);
      return out;
    }
    return node;
  }

  /** Evaluate a step's verify assertion against the actuation result. */
  static checkVerify(step: Pick<CamDriveStep, "verify">, res: Record<string, unknown>): boolean {
    const v = step.verify;
    const actual = getPath(res, v.path);
    switch (v.kind) {
      case "field_truthy": return Boolean(actual);
      case "status_success": return res.success === true || actual === true || actual === "success";
      case "field_equals": return actual === v.expected;
      case "field_gte": return typeof actual === "number" && typeof v.expected === "number" && actual >= v.expected;
      case "job_complete": return actual === "complete" || actual === "completed" || res.complete === true;
      default: return false;
    }
  }

  private static stampLatency(rr: StepRunResult, t0: number, deps: CamDriveDeps): StepRunResult {
    const t1 = Date.parse(deps.now()) || t0;
    rr.latencyMs = Math.max(0, t1 - t0);
    return rr;
  }

  private static trace(deps: CamDriveDeps, resolved: ResolvedRecipe, step: ResolvedStep, rr: StepRunResult, res: Record<string, unknown> | null): void {
    const ep = step.endpoint ?? {};
    deps.recordTrace({
      ts: deps.now(),
      tool: "Fusion360LiveBridge",
      target: ep.dispatcherAction ? `prism_cam:${ep.dispatcherAction}` : `bridge:${ep.httpPath ?? "?"}`,
      action: `cam_drive_${step.stage}`,
    });
    deps.recordRichTrace({
      schemaVersion: "1.0.0",
      recipeId: resolved.recipeId,
      runId: deps.runId,
      stepId: step.stepId,
      stage: step.stage,
      endpoint: ep,
      body: step.resolvedBody,
      decisionInputs: { rulesApplied: step.decisionRuleRef, ruleOutputs: step.ruleOutputs },
      gate: { cleared: rr.gateCleared },
      result: res ?? { status: rr.status, error: rr.error },
      verify: { kind: step.verify.kind, path: step.verify.path, passed: rr.verifyPassed === true },
      onFailFired: rr.status === "failed" || rr.status === "gated" || rr.status === "aborted",
      latencyMs: rr.latencyMs,
      ts2: deps.now(),
    });
  }
}

function physicsActionFor(ruleId: string): string {
  switch (ruleId) {
    case "feed.kienzle": return "cam_kienzle_force";
    case "feed.taylor_vc": return "cam_taylor_tool_life";
    case "feed.chipload_rpm": return "cam_feedrate_chipload";
    case "feed.deflection_clamp": return "cam_tool_deflection";
    default: return "cam_parameter_validate";
  }
}

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), obj);
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}
