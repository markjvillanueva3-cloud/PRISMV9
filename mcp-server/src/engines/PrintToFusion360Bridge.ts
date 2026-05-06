/**
 * PrintToFusion360Bridge — Blueprint OCR → Fusion 360 Python script
 * (CAD-COMPLETE-MS0/U-CADC-FUS-PRINT-01)
 *
 * Thin wrapper: delegates blueprint→ops translation to the shared
 * PrintToCADTranslator, then hands the op stream to fusion360CodeGeneratorEngine
 * for Python emission.
 *
 * @engine PrintToFusion360Bridge
 * @dispatcher cadDispatcher (action: print_to_fusion360)
 * @milestone CAD-COMPLETE-MS0 / U-CADC-FUS-PRINT-01
 */

import {
  fusion360CodeGeneratorEngine,
  type Fusion360GenerationContext,
} from "./Fusion360CodeGeneratorEngine.js";
import {
  translateBlueprintToOps,
  validateTranslatorInput,
  PRINT_BRIDGE_SUPPORTED_OPS,
  type TranslatorInput,
  type ValidationResult,
} from "./PrintToCADTranslator.js";
import type { CADOperationKind } from "../interfaces/ICADCodeGenerator.js";
import type { ExtractedDimension } from "./BlueprintOCREngine.js";

const BRIDGE_VERSION = "1.0.0";
const LABEL = "PrintToFusion360Bridge";

export interface PrintToFusion360Input extends TranslatorInput {
  outputDir?: string;
  targetVersion?: "2023" | "2024" | "2025";
}

/**
 * One detail-view sub-analysis. Detail views are magnified insets ("DETAIL A
 * SCALE 4:1") that show angular features and small radii that don't fit the
 * macro orthographic projection. Detail dimensions take priority over macro
 * dimensions when their location_hint matches.
 */
export interface DetailView {
  /** Identifier from the drawing (e.g. "A", "B"). */
  id: string;
  /** Magnification factor parsed from "SCALE N:1" callout. */
  scale?: number;
  /** Macro features this detail elaborates (matched by location_hint). */
  refers_to?: string[];
  /** Dimensions visible only in the detail view. */
  dimensions: ExtractedDimension[];
}

/** Result of merging macro + detail dimensions. */
export interface MergedAnalysis {
  /** Final dimension list — detail callouts have replaced macro callouts where overlapping. */
  dimensions: ExtractedDimension[];
  /** Number of macro dimensions REPLACED by detail callouts. */
  replaced: number;
  /** Number of detail-only dimensions APPENDED to macro stream. */
  appended: number;
  /** Detail IDs whose `refers_to` did not match any macro feature. */
  orphan_details: string[];
}

export interface PrintToFusion360Output {
  script: string;
  filename: string;
  opsEmitted: number;
  unsupported: string[];
  warnings: string[];
  partName: string;
  material: string | null;
  units: "mm" | "in";
  parameters: Record<string, { value: number | string | boolean; unit: string; description?: string }>;
  provenance: {
    source: "blueprint_analysis" | "profiles" | "dimensions_only" | "mixed";
    dimensionCount: number;
    profileCount: number;
    bridgeVersion: string;
    generatorVersion: string;
    timestamp: string;
  };
}

export class PrintToFusion360Bridge {
  readonly version = BRIDGE_VERSION;

  validate(input: PrintToFusion360Input): ValidationResult {
    return validateTranslatorInput(input);
  }

  buildBridgeScript(input: PrintToFusion360Input): PrintToFusion360Output {
    const t = translateBlueprintToOps(input, LABEL);

    const ctx: Fusion360GenerationContext = {
      projectName: t.partName,
      units: t.units === "in" ? "in" : "mm",
      outputDir: input.outputDir,
      targetVersion: input.targetVersion ?? "2024",
      componentName: t.partName,
    };
    const script = fusion360CodeGeneratorEngine.buildScript(t.ops, ctx);

    const warnings = [...t.warnings];
    for (const w of script.warnings) {
      warnings.push(`[generator/${w.kind}@op${w.opIndex}] ${w.message}`);
    }

    let body = script.body;
    if (t.material) {
      body += `\n# Material (from blueprint title block): ${t.material}\n`;
    }
    body += `# PRISM PrintToFusion360Bridge v${BRIDGE_VERSION} — ${t.ops.length} ops, ${t.validProfileCount} profiles, ${t.dimensionCount} dims\n`;

    const parameters: PrintToFusion360Output["parameters"] = {};
    for (const [name, info] of script.parameters) {
      parameters[name] = info;
    }

    return {
      script: body,
      filename: script.filename || `${t.partName}.py`,
      opsEmitted: t.ops.length,
      unsupported: t.unsupported,
      warnings,
      partName: t.partName,
      material: t.material,
      units: t.units,
      parameters,
      provenance: {
        source: t.source,
        dimensionCount: t.dimensionCount,
        profileCount: t.profileCount,
        bridgeVersion: BRIDGE_VERSION,
        generatorVersion: "1.0.0",
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Merge a macro analysis with a list of detail-view sub-analyses.
   *
   * Match rule (replace): a detail dim and a macro dim are considered the
   * "same callout" when their `location_hint` strings normalize-equal (case-
   * insensitive, whitespace-collapsed). The detail's nominal/tolerance/raw_text
   * replaces the macro entry — detail views are higher resolution per ASME Y14.3.
   *
   * Append rule (new): a detail dim with no macro counterpart is appended.
   * This is how PRISM picks up angular features (1° face taper, 8° flange
   * chamfer) that exist only in the magnified inset.
   *
   * Pure function — no I/O. Caller decides how to feed merged dims back into
   * the translator.
   */
  mergeDetailViews(
    macroDims: ExtractedDimension[],
    details: DetailView[],
  ): MergedAnalysis {
    const norm = (s: string | undefined): string =>
      (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

    const macroByHint = new Map<string, number>();
    for (let i = 0; i < macroDims.length; i++) {
      const h = norm(macroDims[i]?.location_hint);
      if (h.length > 0) macroByHint.set(h, i);
    }
    const macroFeatureNames = new Set<string>();
    for (const d of macroDims) {
      const hint = norm(d.location_hint);
      const txt = norm(d.raw_text);
      if (hint.length > 0) macroFeatureNames.add(hint);
      if (txt.length > 0) macroFeatureNames.add(txt);
    }

    const merged = [...macroDims];
    let replaced = 0;
    let appended = 0;
    const orphanDetails: string[] = [];

    for (const detail of details) {
      let detailMatched = !detail.refers_to || detail.refers_to.length === 0;
      if (detail.refers_to) {
        for (const ref of detail.refers_to) {
          if (macroFeatureNames.has(norm(ref))) {
            detailMatched = true;
            break;
          }
        }
      }
      if (!detailMatched) orphanDetails.push(detail.id);

      for (const dDim of detail.dimensions) {
        const hint = norm(dDim.location_hint);
        const macroIdx = hint.length > 0 ? macroByHint.get(hint) : undefined;
        if (macroIdx !== undefined) {
          merged[macroIdx] = {
            ...dDim,
            id: macroDims[macroIdx]?.id ?? dDim.id,
          };
          replaced++;
        } else {
          merged.push(dDim);
          appended++;
        }
      }
    }

    return {
      dimensions: merged,
      replaced,
      appended,
      orphan_details: orphanDetails,
    };
  }

  /**
   * Like buildBridgeScript, but accepts a list of detail-view sub-analyses.
   * Detail dims override macro dims by matching location_hint, detail-only
   * dims are appended, merge counts are surfaced in `detail_merge` for audit.
   *
   * Pass `details = []` for buildBridgeScript-equivalent behaviour.
   */
  buildBridgeScriptWithDetails(
    input: PrintToFusion360Input,
    details: DetailView[],
  ): PrintToFusion360Output & {
    detail_merge: { replaced: number; appended: number; orphan_details: string[] };
  } {
    const macroDims = input.dimensions ?? input.analysis?.dimensions ?? [];
    const merged = this.mergeDetailViews(macroDims, details);
    const enrichedInput: PrintToFusion360Input = {
      ...input,
      dimensions: merged.dimensions,
    };
    const base = this.buildBridgeScript(enrichedInput);
    return {
      ...base,
      detail_merge: {
        replaced: merged.replaced,
        appended: merged.appended,
        orphan_details: merged.orphan_details,
      },
    };
  }

  supportedOperations(): readonly CADOperationKind[] {
    return PRINT_BRIDGE_SUPPORTED_OPS;
  }
}

export const printToFusion360Bridge = new PrintToFusion360Bridge();
