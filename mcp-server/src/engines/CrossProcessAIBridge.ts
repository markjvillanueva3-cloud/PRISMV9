/**
 * CrossProcessAIBridge — unified AI orchestration across mill, lathe, and
 * wire-EDM master orchestrators.
 *
 * Each process has its own canonical AI orchestrator with a different
 * request shape:
 *   - mill  → MillMasterOrchestratorFacadeEngine.orchestrate (MillOrchestrationRequest)
 *   - lathe → LatheMasterOrchestratorFacadeEngine.orchestrate (LatheOrchRequest)
 *   - wedm  → WEDMCompleteOrchestrationEngine.generateCompleteProgram (WEDMOrchestrationInput)
 *
 * The bridge classifies a free-form intent + context to pick the right process,
 * then routes to the matching orchestrator with the caller-supplied
 * process-specific request body. Upstream consumers (PRISMSelfAwarenessEngine,
 * MillingAGI, CrossDisciplinaryDeepLearningEngine) don't need to know which
 * orchestrator handles their job.
 *
 * Three pure static entry points:
 *   1. classify(intent, context?) — keyword-scored process classification
 *   2. orchestrate(req) — classify + dispatch (or dry-run preview)
 *   3. listClassifierKeywords() — keyword catalog for self-introspection
 *
 * Classification uses a weighted keyword scorer over the intent string and
 * optional context (features list, material, explicit process override).
 * Per-process keyword bundles are conservative — strong manufacturing-domain
 * signals only, not generic words. An explicit `process` field always wins.
 *
 * Dry-run mode (`dry_run: true`) returns the classification + would-dispatch-to
 * engine name without invoking the underlying orchestrator. This is the
 * routing-preview that upstream AI consumers use to gate expensive runs.
 *
 * @engine CrossProcessAIBridge
 * @milestone XPROC-AI-01
 * @see MillMasterOrchestratorFacadeEngine.orchestrate
 * @see LatheMasterOrchestratorFacadeEngine.orchestrate
 * @see WEDMCompleteOrchestrationEngine.generateCompleteProgram
 * @see CrossProcessSpeedFeedBridge — sibling SF bridge (XPROC-SFC-01)
 * @see CrossProcessPostBridge — sibling post bridge (XPROC-POST-01)
 * @see CrossProcessFeatureBridge — sibling feature bridge (XPROC-FEAT-01)
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const AI_SUPPORTED_PROCESSES = ["mill", "lathe", "wedm"] as const;
export type AIProcessId = (typeof AI_SUPPORTED_PROCESSES)[number];

/**
 * Per-process keyword catalog for the classifier.
 * Each keyword is a strong domain signal — generic words are excluded so
 * the score doesn't get noisy from common verbs (cut, make, do, etc.).
 *
 * Sources verified against shop-floor vocabulary:
 *   - mill: standard 3-axis / 5-axis vocabulary + machine families (VMC/VMX/HMC)
 *   - lathe: turning vocabulary + machine families (lathe/turret/swiss)
 *   - wedm: wire-EDM-specific terms (no overlap with conventional cutting)
 */
const CLASSIFIER_KEYWORDS: Readonly<Record<AIProcessId, readonly string[]>> = Object.freeze({
  mill: Object.freeze([
    "mill",
    "milling",
    "pocket",
    "face",
    "facing",
    "endmill",
    "end mill",
    "ballnose",
    "vmc",
    "vmx",
    "hmc",
    "hurco",
    "haas",
    "fadal",
    "okk",
    "5-axis",
    "five axis",
    "3-axis",
    "three axis",
    "trochoidal",
    "adaptive clear",
    "slot mill",
    "thread mill",
    "rigid tap",
    "chamfer mill",
    "engrave",
  ]),
  lathe: Object.freeze([
    "lathe",
    "turn",
    "turning",
    "boring bar",
    "od groove",
    "id groove",
    "chuck",
    "collet",
    "css",
    "constant surface speed",
    "swiss",
    "screw machine",
    "okuma",
    "mazak",
    "doosan",
    "nakamura",
    "tornos",
    "single point thread",
    "thread chasing",
    "facing op",
    "od rough",
    "od finish",
    "id rough",
    "id finish",
    "parting",
    "subspindle",
    "sub-spindle",
    "live tooling",
    "y-axis lathe",
  ]),
  wedm: Object.freeze([
    "wire edm",
    "wedm",
    "wire-edm",
    "edm wire",
    "spark erosion",
    "skim pass",
    "skim passes",
    "rough skim",
    "taper cut",
    "4-axis taper",
    "wire path",
    "wire offset",
    "brass wire",
    "moly wire",
    "tungsten wire",
    "diffusion annealed",
    "mitsubishi mv",
    "sodick",
    "makino edm",
    "agiecharmilles",
    "fanuc edm",
    "start hole",
    "wire break",
    "dielectric",
    "deionized water",
    "flush pressure",
    "submerged cut",
  ]),
});

const FEATURE_TO_PROCESS_BIAS: Readonly<Record<string, AIProcessId>> = Object.freeze({
  pocket_2d: "mill",
  pocket_3d: "mill",
  slot: "mill",
  hole_drill: "mill",
  hole_thread_internal: "mill",
  hole_thread_external: "lathe",
  groove_external: "lathe",
  groove_internal: "lathe",
  profile_2d: "wedm",
  face_milling: "mill",
  boring: "lathe",
  chamfer: "mill",
});

const CONFIDENCE_KEYWORD_BOOST = 0.15;
const CONFIDENCE_FEATURE_BOOST = 0.20;
const CONFIDENCE_EXPLICIT = 1.0;
const CONFIDENCE_DEFAULT_FALLBACK = 0.10;

// ============================================================================
// TYPES
// ============================================================================

export interface ClassifyContext {
  process?: AIProcessId;
  features?: ReadonlyArray<string>;
  material?: string;
}

export interface ProcessClassification {
  process: AIProcessId;
  confidence: number;
  matched_signals: string[];
  alternative_processes: Array<{ process: AIProcessId; confidence: number }>;
  notes: string[];
}

export interface AIOrchestrateRequest {
  intent: string;
  process?: AIProcessId;
  features?: ReadonlyArray<string>;
  material?: string;
  /** Process-specific opaque request body — passed through to the matched orchestrator */
  mill_request?: Record<string, unknown>;
  lathe_request?: Record<string, unknown>;
  wedm_request?: Record<string, unknown>;
  /** When true, return classification + routing decision without invoking the orchestrator */
  dry_run?: boolean;
}

export interface AIOrchestrateResult {
  classification: ProcessClassification;
  routed_to: string;
  dry_run: boolean;
  /** Engine response — present only when dry_run is false */
  orchestrator_response?: unknown;
  warnings: string[];
  notes: string[];
}

export interface ClassifierKeywordCatalog {
  process: AIProcessId;
  signals: readonly string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class CrossProcessAIBridge {
  /**
   * Classify a free-form intent string into a process via keyword scoring +
   * optional context bias. Returns the top-ranked process plus runner-up
   * alternatives sorted by confidence descending.
   *
   * Resolution order:
   *   1. Explicit `context.process` override → confidence = 1.0
   *   2. Per-process keyword scoring against intent (lowercased)
   *   3. Feature-list bias (each feature contributes its canonical process)
   *   4. Default fallback to mill when no signal matches
   *
   * Throws on:
   *   - non-string intent
   *   - empty / whitespace-only intent
   *   - context.process outside AI_SUPPORTED_PROCESSES
   *
   * @param intent — natural-language job description (e.g. "make a pocket in 4140")
   * @param context — optional process override / feature list / material
   * @returns ProcessClassification with sorted alternatives
   */
  static classify(intent: string, context?: ClassifyContext): ProcessClassification {
    if (typeof intent !== "string") {
      throw new Error("CrossProcessAIBridge.classify: intent must be a string");
    }
    const intentTrimmed = intent.trim();
    if (intentTrimmed.length === 0) {
      throw new Error("CrossProcessAIBridge.classify: intent must be non-empty");
    }
    if (
      context?.process !== undefined &&
      !(AI_SUPPORTED_PROCESSES as readonly string[]).includes(context.process)
    ) {
      throw new Error(
        `CrossProcessAIBridge.classify: context.process "${String(context.process)}" not in [${AI_SUPPORTED_PROCESSES.join(", ")}]`,
      );
    }

    if (context?.process) {
      return {
        process: context.process,
        confidence: CONFIDENCE_EXPLICIT,
        matched_signals: [`explicit_process_override=${context.process}`],
        alternative_processes: [],
        notes: ["classification skipped — caller provided explicit process override"],
      };
    }

    const intentLower = intentTrimmed.toLowerCase();
    const scores: Record<AIProcessId, { score: number; signals: string[] }> = {
      mill: { score: 0, signals: [] },
      lathe: { score: 0, signals: [] },
      wedm: { score: 0, signals: [] },
    };

    for (const proc of AI_SUPPORTED_PROCESSES) {
      const kws = CLASSIFIER_KEYWORDS[proc];
      for (const kw of kws) {
        if (intentLower.includes(kw.toLowerCase())) {
          scores[proc].score += CONFIDENCE_KEYWORD_BOOST;
          scores[proc].signals.push(`keyword:${kw}`);
        }
      }
    }

    if (context?.features) {
      for (const f of context.features) {
        const biased = FEATURE_TO_PROCESS_BIAS[f.toLowerCase()];
        if (biased) {
          scores[biased].score += CONFIDENCE_FEATURE_BOOST;
          scores[biased].signals.push(`feature:${f}`);
        }
      }
    }

    let topProc: AIProcessId = "mill";
    let topScore = -1;
    for (const proc of AI_SUPPORTED_PROCESSES) {
      if (scores[proc].score > topScore) {
        topScore = scores[proc].score;
        topProc = proc;
      }
    }

    const isFallback = topScore <= 0;
    const finalConfidence = isFallback ? CONFIDENCE_DEFAULT_FALLBACK : Math.min(1.0, topScore);

    const alternatives = AI_SUPPORTED_PROCESSES.filter((p) => p !== topProc)
      .map((p) => ({ process: p, confidence: Math.min(1.0, scores[p].score) }))
      .sort((a, b) => b.confidence - a.confidence);

    const notes: string[] = [`intent_length=${intentTrimmed.length}`];
    if (isFallback) {
      notes.push("no keyword or feature signals matched — defaulted to mill (low confidence)");
    }
    if (context?.material) {
      notes.push(`material=${context.material}`);
    }

    return {
      process: topProc,
      confidence: finalConfidence,
      matched_signals: scores[topProc].signals,
      alternative_processes: alternatives,
      notes,
    };
  }

  /**
   * Classify the intent, then route to the matching orchestrator with the
   * caller-supplied process-specific request body. Use `dry_run: true` to
   * preview the routing decision without invoking the underlying engine.
   *
   * Throws on:
   *   - missing or empty `intent`
   *   - explicit `process` override outside AI_SUPPORTED_PROCESSES
   *   - matched process has no corresponding request body
   *     (mill → mill_request, lathe → lathe_request, wedm → wedm_request)
   *
   * @param req — orchestration request with intent + process-specific bodies
   * @returns AIOrchestrateResult with classification + (live) orchestrator response
   */
  static async orchestrate(req: AIOrchestrateRequest): Promise<AIOrchestrateResult> {
    if (!req || typeof req !== "object") {
      throw new Error("CrossProcessAIBridge.orchestrate: request object required");
    }
    if (typeof req.intent !== "string") {
      throw new Error("CrossProcessAIBridge.orchestrate: intent must be a string");
    }
    if (req.intent.trim().length === 0) {
      throw new Error("CrossProcessAIBridge.orchestrate: intent must be non-empty");
    }
    if (
      req.process !== undefined &&
      !(AI_SUPPORTED_PROCESSES as readonly string[]).includes(req.process)
    ) {
      throw new Error(
        `CrossProcessAIBridge.orchestrate: process "${String(req.process)}" not in [${AI_SUPPORTED_PROCESSES.join(", ")}]`,
      );
    }

    const classification = this.classify(req.intent, {
      process: req.process,
      features: req.features,
      material: req.material,
    });

    const proc = classification.process;
    const dryRun = req.dry_run === true;

    const engineNameByProcess: Record<AIProcessId, string> = {
      mill: "MillMasterOrchestratorFacadeEngine.orchestrate",
      lathe: "LatheMasterOrchestratorFacadeEngine.orchestrate",
      wedm: "WEDMCompleteOrchestrationEngine.generateCompleteProgram",
    };
    const routedTo = engineNameByProcess[proc];

    const warnings: string[] = [];
    const notes: string[] = [
      `routed_to=${routedTo}`,
      `dry_run=${dryRun}`,
      `confidence=${classification.confidence.toFixed(2)}`,
    ];
    if (classification.confidence < 0.30 && !req.process) {
      warnings.push(
        `low classification confidence (${classification.confidence.toFixed(2)}) — caller should pass an explicit process override or richer intent`,
      );
    }

    if (dryRun) {
      return { classification, routed_to: routedTo, dry_run: true, warnings, notes };
    }

    if (proc === "mill") {
      if (!req.mill_request) {
        throw new Error(
          "CrossProcessAIBridge.orchestrate: mill route requires `mill_request` (MillOrchestrationRequest body)",
        );
      }
      const { millMasterOrchestratorFacadeEngine } = await import(
        "./MillMasterOrchestratorFacadeEngine.js"
      );
      const out = await millMasterOrchestratorFacadeEngine.orchestrate(
        req.mill_request as unknown as Parameters<typeof millMasterOrchestratorFacadeEngine.orchestrate>[0],
      );
      return {
        classification,
        routed_to: routedTo,
        dry_run: false,
        orchestrator_response: out,
        warnings,
        notes,
      };
    }

    if (proc === "lathe") {
      if (!req.lathe_request) {
        throw new Error(
          "CrossProcessAIBridge.orchestrate: lathe route requires `lathe_request` (LatheOrchRequest body)",
        );
      }
      const { latheMasterOrchestratorFacadeEngine } = await import(
        "./LatheMasterOrchestratorFacadeEngine.js"
      );
      const out = await latheMasterOrchestratorFacadeEngine.orchestrate(
        req.lathe_request as unknown as Parameters<typeof latheMasterOrchestratorFacadeEngine.orchestrate>[0],
      );
      return {
        classification,
        routed_to: routedTo,
        dry_run: false,
        orchestrator_response: out,
        warnings,
        notes,
      };
    }

    // proc === "wedm"
    if (!req.wedm_request) {
      throw new Error(
        "CrossProcessAIBridge.orchestrate: wedm route requires `wedm_request` (WEDMOrchestrationInput body)",
      );
    }
    const { wedmCompleteOrchestrationEngine } = await import(
      "./WEDMCompleteOrchestrationEngine.js"
    );
    const out = await wedmCompleteOrchestrationEngine.generateCompleteProgram(
      req.wedm_request as unknown as Parameters<
        typeof wedmCompleteOrchestrationEngine.generateCompleteProgram
      >[0],
    );
    return {
      classification,
      routed_to: routedTo,
      dry_run: false,
      orchestrator_response: out,
      warnings,
      notes,
    };
  }

  /**
   * Snapshot of the per-process classifier keyword catalog. Useful for AI
   * consumers self-introspecting on what signals the bridge listens for.
   *
   * @returns array of { process, signals } — keywords in registration order
   */
  static listClassifierKeywords(): ClassifierKeywordCatalog[] {
    return AI_SUPPORTED_PROCESSES.map((proc) => ({
      process: proc,
      signals: [...CLASSIFIER_KEYWORDS[proc]],
    }));
  }
}
