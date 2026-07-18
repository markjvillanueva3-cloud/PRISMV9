/**
 * CAMPrintToProgramOrchestratorEngine — CAM-AI-TRAINING-MS0/U-CAMT-P2P
 *
 * Kilo's print-to-program specialty engine: chains the Phase-A..B+CLICK
 * stack end-to-end so a single call resolves a textual feature description
 * into an executable click recipe.
 *
 * Pipeline:
 *   text description → CAMFeatureClassClassifierEngine.classify
 *                   → CAMOperationSelectorEngine.select
 *                   → CAMTemplateGeneratorEngine.generate
 *                   → CAMClickSequenceEngine.buildSequence
 *
 * The result carries every stage's intermediate so the caller (or audit)
 * can trace why a particular click recipe was chosen.
 *
 * Per kilo slot-soul:
 *   - validate PMI/feature extraction BEFORE selecting CAM op
 *   - surface ambiguities, do NOT silent-fallback
 *   - preserve tolerance stack (forwarded into template overrides)
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import { camFeatureClassClassifierEngine, type ClassificationResult } from "./CAMFeatureClassClassifierEngine.js";
import { camOperationSelectorEngine, type OperationSelection } from "./CAMOperationSelectorEngine.js";
import { camTemplateGeneratorEngine, type CamTemplate } from "./CAMTemplateGeneratorEngine.js";
import { CAMClickSequenceEngine, type ClickSequence, type CatalogLoader } from "./CAMClickSequenceEngine.js";
import type { CamSystem } from "./CAMOperationTaxonomyEngine.js";

export interface P2PResult {
  /** Was the orchestration able to produce a click recipe? */
  ok: boolean;
  /** Soft-fail reason when ok=false. */
  reason?: string;
  /** Stage 1 — feature classification. */
  classification: ClassificationResult;
  /** Stage 2 — op selection. */
  selection: OperationSelection | null;
  /** Stage 3 — template generation. */
  template: CamTemplate | null;
  /** Stage 4 — click sequence (only present when ok=true). */
  clickSequence: ClickSequence | null;
}

export interface P2POptions {
  /** Target CAM system. */
  system: CamSystem;
  /** Parameter overrides (e.g. tolerance-stack-driven values). */
  overrides?: Record<string, number | string | boolean>;
}

export class CAMPrintToProgramOrchestratorEngine extends BaseEngine {
  private readonly loader: CatalogLoader | null;

  constructor(loader: CatalogLoader | null = null) {
    const info: EngineInfo = {
      name: "CAMPrintToProgramOrchestratorEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Kilo's end-to-end blueprint-text → CAM click-recipe orchestrator.",
    };
    super(info);
    this.loader = loader;
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "orchestrate",      description: "End-to-end text → click recipe", actions: ["cam_p2p_orchestrate"] },
      { name: "explain",          description: "Trace all 4 pipeline stages",     actions: ["cam_p2p_explain"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMPrintToProgramOrchestratorEngine", note: "use typed methods" };
  }

  /**
   * End-to-end orchestration. Returns ok=true only when every stage
   * succeeds; partial failures surface the reason + the intermediates
   * (kilo refuses silent-fallback on ambiguous callouts).
   */
  orchestrate(description: string, opts: P2POptions): P2PResult {
    // Stage 1: classify
    const classification = camFeatureClassClassifierEngine.classify(description);
    if (!classification.feature) {
      return {
        ok: false,
        reason: "classification_failed: no feature class matched text",
        classification, selection: null, template: null, clickSequence: null,
      };
    }

    // Stage 2: select op
    const selection = camOperationSelectorEngine.select(classification.feature);
    if (!selection.best) {
      return {
        ok: false,
        reason: `op_selection_failed: no canonical CAM op for feature class ${classification.feature}`,
        classification, selection, template: null, clickSequence: null,
      };
    }

    // Stage 3: generate template
    const template = camTemplateGeneratorEngine.generate(
      selection.best,
      opts.system,
      classification.feature,
      { overrides: opts.overrides ?? {} },
    );
    if (!template) {
      return {
        ok: false,
        reason: `template_failed: ${opts.system} does not support ${selection.best}`,
        classification, selection, template: null, clickSequence: null,
      };
    }

    // Stage 4: click sequence
    const clickEngine = new CAMClickSequenceEngine(this.loader);
    const clickSequence = clickEngine.buildSequence(template);
    if (clickSequence.steps.length === 0) {
      return {
        ok: false,
        reason: `click_failed: ${clickSequence.warnings[0] ?? "no click steps emitted"}`,
        classification, selection, template, clickSequence,
      };
    }

    return { ok: true, classification, selection, template, clickSequence };
  }
}

export const camPrintToProgramOrchestratorEngine = new CAMPrintToProgramOrchestratorEngine();
