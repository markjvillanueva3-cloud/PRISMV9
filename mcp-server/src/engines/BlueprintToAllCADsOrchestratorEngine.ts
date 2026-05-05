/**
 * BlueprintToAllCADsOrchestratorEngine — image-to-6-CAD end-to-end pipeline
 * (CAD-COMPLETE-MS0/U-CADC-BPRINT-OCR-ORCH-01)
 *
 * Composes BlueprintVisionOCREngine + printToAllCADsOrchestrator. Closes the
 * last gap from claude-bf484a46's resume directive: "wire BlueprintVisionOCREngine
 * output → bridge in an end-to-end pipeline action".
 *
 * Two-mode entry surface:
 *   - vision  : runs Claude Vision OCR on an image then orchestrates 6 CAD scripts
 *   - analysis: skips OCR, takes a pre-built BlueprintAnalysis (test/CI/cached path)
 *
 * Per-stage timing + warnings preserved end-to-end. Per-CAD failures are
 * isolated by the inner orchestrator (one CAD can fail without aborting the
 * others); top-level OCR failure is fatal because no analysis means nothing to
 * orchestrate.
 *
 * Pipeline (vision mode):
 *   image → BlueprintVisionOCREngine.analyzeBlueprint() → BlueprintVisionResult
 *         → printToAllCADsOrchestrator.buildAllScripts()
 *         → BlueprintToAllCADsResult { ocr, perCAD, summary, timing }
 *
 * @engine BlueprintToAllCADsOrchestratorEngine
 * @dispatcher cadDispatcher (action: blueprint_to_all_cads)
 * @milestone CAD-COMPLETE-MS0 / U-CADC-BPRINT-OCR-ORCH-01
 */

import {
  blueprintVisionOCREngine,
  BlueprintVisionOCREngine,
  type BlueprintVisionInput,
  type BlueprintVisionResult,
  type ImageSource,
  type ExtractedProfile,
} from "./BlueprintVisionOCREngine.js";
import {
  printToAllCADsOrchestrator,
  type OrchestratorOutput,
  type CADTarget,
  type OrchestratorInput as InnerOrchestratorInput,
} from "./PrintToAllCADsOrchestrator.js";
import type { BlueprintAnalysis } from "./BlueprintOCREngine.js";

// ── Constants ────────────────────────────────────────────────────────────────

const ENGINE_VERSION = "1.0.0";

// ── Public types ─────────────────────────────────────────────────────────────

/** Input shape — exactly one of `image` or `analysis` must be supplied */
export interface BlueprintToAllCADsInput {
  /** Vision mode — runs Claude Vision OCR on this image */
  image?: ImageSource;
  /** Analysis mode — uses this BlueprintAnalysis directly, skipping OCR */
  analysis?: BlueprintAnalysis;
  /** Profiles to pass through to the orchestrator (paired with analysis or merged with vision) */
  profiles?: ExtractedProfile[];
  /** Vision config (only honored in image mode) */
  vision?: {
    expected_units?: "mm" | "inch";
    blueprint_type?: BlueprintVisionInput["blueprint_type"];
    extract_geometry?: boolean;
    model?: string;
  };
  /** Subset of CAD targets to emit (default: all 6) */
  targets?: readonly CADTarget[];
  /** Output directory for generated scripts */
  outputDir?: string;
  /** Override default depth for cylindrical primitives (mm) */
  defaultDepth?: number;
  /** Override part name (otherwise derived from title block) */
  partName?: string;
  /** Override units (otherwise from title block / image) */
  units?: "mm" | "in";
}

export interface BlueprintToAllCADsResult {
  /** OCR stage output (null in analysis mode) */
  ocr: BlueprintVisionResult | null;
  /** Source mode actually used */
  mode: "vision" | "analysis";
  /** 6-CAD orchestration result */
  cads: OrchestratorOutput;
  /** Per-stage timing in ms */
  timing: {
    ocrMs: number;
    orchestrateMs: number;
    totalMs: number;
  };
  /** Aggregate provenance */
  provenance: {
    engineVersion: string;
    ocrTokensUsed: number;
    ocrModel: string | null;
    timestamp: string;
  };
  /** Stage-level warnings (OCR + orchestrator) */
  warnings: string[];
}

export interface BlueprintToAllCADsValidation {
  valid: boolean;
  errors: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function validateInput(input: unknown): BlueprintToAllCADsValidation {
  const errors: string[] = [];
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["input is not an object"] };
  }
  const i = input as BlueprintToAllCADsInput;
  const hasImage = i.image !== undefined && i.image !== null;
  const hasAnalysis = i.analysis !== undefined && i.analysis !== null;

  if (!hasImage && !hasAnalysis) {
    errors.push("input requires exactly one of `image` (vision mode) or `analysis` (analysis mode)");
  }
  if (hasImage && hasAnalysis) {
    errors.push("input must NOT supply BOTH `image` and `analysis` — pick one mode");
  }
  if (hasImage) {
    const src = i.image as ImageSource;
    if (typeof src !== "object" || src === null || !("type" in src)) {
      errors.push("image must be an ImageSource object with a `type` field");
    } else if (src.type !== "base64" && src.type !== "file" && src.type !== "url") {
      errors.push(`image.type must be base64|file|url, got "${(src as { type: unknown }).type}"`);
    } else if (src.type === "file" && (!("path" in src) || typeof src.path !== "string" || src.path.length === 0)) {
      errors.push("image.type='file' requires a non-empty string path");
    } else if (src.type === "base64" && (!("data" in src) || typeof src.data !== "string" || src.data.length === 0)) {
      errors.push("image.type='base64' requires non-empty base64 data");
    }
  }
  if (i.targets !== undefined && !Array.isArray(i.targets)) {
    errors.push("targets must be an array of CADTarget when supplied");
  }
  if (i.defaultDepth !== undefined) {
    if (typeof i.defaultDepth !== "number" || !Number.isFinite(i.defaultDepth) || i.defaultDepth <= 0) {
      errors.push("defaultDepth must be a finite positive number when supplied");
    }
  }
  return { valid: errors.length === 0, errors };
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class BlueprintToAllCADsOrchestratorEngine {
  readonly version = ENGINE_VERSION;

  /** Inner OCR engine (DI for testability) */
  private readonly ocr: Pick<BlueprintVisionOCREngine, "analyzeBlueprint">;

  constructor(deps?: { ocr?: Pick<BlueprintVisionOCREngine, "analyzeBlueprint"> }) {
    this.ocr = deps?.ocr ?? blueprintVisionOCREngine;
  }

  validate(input: unknown): BlueprintToAllCADsValidation {
    return validateInput(input);
  }

  /**
   * Run OCR (if image given) then dispatch to the 6-CAD orchestrator.
   * @throws on validation failure
   */
  async run(input: BlueprintToAllCADsInput): Promise<BlueprintToAllCADsResult> {
    const v = validateInput(input);
    if (!v.valid) {
      throw new Error(`BlueprintToAllCADsOrchestrator: ${v.errors.join("; ")}`);
    }

    const startTotal = Date.now();
    const warnings: string[] = [];
    let ocr: BlueprintVisionResult | null = null;
    let analysis: BlueprintAnalysis;
    let profiles: ExtractedProfile[] | undefined = input.profiles;
    let mode: "vision" | "analysis";

    let ocrMs = 0;
    if (input.image) {
      mode = "vision";
      const ocrStart = Date.now();
      ocr = await this.ocr.analyzeBlueprint({
        image: input.image,
        expected_units: input.vision?.expected_units,
        blueprint_type: input.vision?.blueprint_type,
        extract_geometry: input.vision?.extract_geometry ?? true,
        model: input.vision?.model,
      });
      ocrMs = Date.now() - ocrStart;
      analysis = {
        dimensions: ocr.dimensions,
        gdt_frames: ocr.gdt_frames,
        title_block: ocr.title_block,
        notes: ocr.notes,
        summary: ocr.summary,
      };
      profiles = profiles ?? ocr.profiles;
    } else {
      mode = "analysis";
      analysis = input.analysis as BlueprintAnalysis;
    }

    const orchestrateStart = Date.now();
    const innerInput: InnerOrchestratorInput = {
      analysis,
      profiles,
      targets: input.targets ? [...input.targets] : undefined,
      outputDir: input.outputDir,
      defaultDepth: input.defaultDepth,
      partName: input.partName,
      units: input.units,
    };
    const cads = printToAllCADsOrchestrator.buildAllScripts(innerInput);
    const orchestrateMs = Date.now() - orchestrateStart;
    const totalMs = Date.now() - startTotal;

    // Aggregate orchestrator-side warnings (per-CAD warnings collapse into top-level list)
    for (const r of cads.results) {
      if (r.output?.warnings?.length) {
        for (const w of r.output.warnings) warnings.push(`[${r.target}] ${w}`);
      }
      if (r.error) warnings.push(`[${r.target}] FAILED: ${r.error}`);
    }

    return {
      ocr,
      mode,
      cads,
      timing: { ocrMs, orchestrateMs, totalMs },
      provenance: {
        engineVersion: ENGINE_VERSION,
        ocrTokensUsed: ocr?.tokens_used ?? 0,
        ocrModel: ocr ? input.vision?.model ?? "claude-sonnet-4-20250514" : null,
        timestamp: new Date().toISOString(),
      },
      warnings,
    };
  }

  /** Capabilities surface for clients to introspect */
  capabilities(): {
    version: string;
    modes: readonly ["vision", "analysis"];
    maxTargets: number;
    visionRequiresApiKey: boolean;
  } {
    return {
      version: ENGINE_VERSION,
      modes: ["vision", "analysis"] as const,
      maxTargets: 6,
      visionRequiresApiKey: true,
    };
  }
}

export const blueprintToAllCADsOrchestratorEngine = new BlueprintToAllCADsOrchestratorEngine();
