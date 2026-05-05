/**
 * PrintToAllCADsOrchestrator — Blueprint OCR → Scripts for all 5 priority CADs
 * (CAD-COMPLETE-MS0/U-CADC-PRINT-ORCHESTRATOR-01)
 *
 * One BlueprintAnalysis input → script artifacts for Fusion 360, Mastercam,
 * Inventor, SolidWorks, Esprit (in priority order). Per-CAD failures are
 * isolated: a failure in one bridge does NOT abort the others. This is the
 * end-to-end OCR→draw entry point that proves PRISM can drive the whole CAD
 * fleet from a single blueprint.
 *
 * Pipeline (per-target):
 *   BlueprintAnalysis → PrintToCADTranslator → CADOperation[] → host code-gen
 *   → script body + provenance
 *
 * Aggregation:
 *   - per-CAD result captured even on failure (with error message + stack-free)
 *   - summary counts: succeeded, failed, totalOps, totalLines
 *   - bridges run in PRIORITY ORDER (Fusion → hyperCAD-S adapter? skip → MC → Inv → SW → Esprit)
 *
 * @engine PrintToAllCADsOrchestrator
 * @dispatcher cadDispatcher (action: print_to_all_cads)
 * @milestone CAD-COMPLETE-MS0 / U-CADC-PRINT-ORCHESTRATOR-01
 */

import { printToFusion360Bridge, type PrintToFusion360Output } from "./PrintToFusion360Bridge.js";
import { printToMastercamBridge, type PrintToMastercamOutput } from "./PrintToMastercamBridge.js";
import { printToInventorBridge, type PrintToInventorOutput } from "./PrintToInventorBridge.js";
import { printToSolidWorksBridge, type PrintToSolidWorksOutput } from "./PrintToSolidWorksBridge.js";
import { printToEspritBridge, type PrintToEspritOutput } from "./PrintToEspritBridge.js";
import type { TranslatorInput } from "./PrintToCADTranslator.js";

// ── Constants ────────────────────────────────────────────────────────────────

const ORCHESTRATOR_VERSION = "1.0.0";

/** CAD targets supported by this orchestrator, in priority order. */
export const ALL_CAD_TARGETS = [
  "fusion360",
  "mastercam",
  "inventor",
  "solidworks",
  "esprit",
] as const;
export type CADTarget = (typeof ALL_CAD_TARGETS)[number];

// ── Types ────────────────────────────────────────────────────────────────────

export interface OrchestratorInput extends TranslatorInput {
  /** Subset of CAD targets to run; defaults to all 5. */
  targets?: ReadonlyArray<CADTarget>;
  /** Output dir hint forwarded to bridges that accept it. */
  outputDir?: string;
}

type BridgeOutput =
  | PrintToFusion360Output
  | PrintToMastercamOutput
  | PrintToInventorOutput
  | PrintToSolidWorksOutput
  | PrintToEspritOutput;

export interface PerCADResult {
  target: CADTarget;
  ok: boolean;
  /** Present when ok=true */
  output?: BridgeOutput;
  /** Present when ok=false */
  error?: string;
  /** Wall time for just this target */
  durationMs: number;
}

export interface OrchestratorOutput {
  results: PerCADResult[];
  summary: {
    targetsRequested: number;
    succeeded: number;
    failed: number;
    totalOpsEmitted: number;
    totalScriptLines: number;
    totalDurationMs: number;
  };
  warnings: string[];
  orchestratorVersion: string;
  timestamp: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function dedupeTargets(targets: ReadonlyArray<CADTarget> | undefined): CADTarget[] {
  if (!targets || targets.length === 0) return [...ALL_CAD_TARGETS];
  const seen = new Set<CADTarget>();
  for (const t of targets) {
    if ((ALL_CAD_TARGETS as readonly string[]).includes(t)) {
      seen.add(t);
    }
  }
  // Preserve priority order from ALL_CAD_TARGETS
  return ALL_CAD_TARGETS.filter((t) => seen.has(t));
}

function runBridge(target: CADTarget, input: OrchestratorInput): BridgeOutput {
  switch (target) {
    case "fusion360":
      return printToFusion360Bridge.buildBridgeScript({
        ...input,
        outputDir: input.outputDir,
      });
    case "mastercam":
      return printToMastercamBridge.buildBridgeScript({
        ...input,
        outputDir: input.outputDir,
      });
    case "inventor":
      return printToInventorBridge.buildBridgeScript({
        ...input,
        outputPath: input.outputDir,
      });
    case "solidworks":
      return printToSolidWorksBridge.buildBridgeScript({
        ...input,
        outputDir: input.outputDir,
      });
    case "esprit":
      return printToEspritBridge.buildBridgeScript({
        ...input,
        outputDir: input.outputDir,
      });
  }
}

function countLines(script: string): number {
  if (!script) return 0;
  return script.split(/\r?\n/).length;
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export class PrintToAllCADsOrchestrator {
  readonly version = ORCHESTRATOR_VERSION;

  /**
   * Validate input. Same shape as a single bridge — orchestrator just adds the
   * `targets` parameter and rejects empty target subsets.
   */
  validate(input: OrchestratorInput): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    if (!input || typeof input !== "object") {
      return { valid: false, warnings: ["input is not an object"] };
    }
    const hasAnalysis = !!input.analysis;
    const hasProfiles = Array.isArray(input.profiles) && input.profiles.length > 0;
    const hasDimensions =
      (Array.isArray(input.dimensions) && input.dimensions.length > 0) ||
      (input.analysis &&
        Array.isArray(input.analysis.dimensions) &&
        input.analysis.dimensions.length > 0);
    if (!hasAnalysis && !hasProfiles && !hasDimensions) {
      return {
        valid: false,
        warnings: ["input must include at least one of: analysis, profiles, dimensions"],
      };
    }
    if (input.targets !== undefined) {
      if (!Array.isArray(input.targets)) {
        return { valid: false, warnings: ["targets must be an array of CAD names"] };
      }
      const valid = dedupeTargets(input.targets);
      if (valid.length === 0) {
        return {
          valid: false,
          warnings: [
            `targets must contain at least one of: ${ALL_CAD_TARGETS.join(", ")}`,
          ],
        };
      }
      const unknown = input.targets.filter(
        (t) => !(ALL_CAD_TARGETS as readonly string[]).includes(t),
      );
      if (unknown.length > 0) {
        warnings.push(`unknown targets ignored: ${unknown.join(", ")}`);
      }
    }
    return { valid: true, warnings };
  }

  /**
   * Run all (or a subset of) CAD bridges against a single blueprint analysis.
   * Per-CAD failures are isolated.
   */
  buildAllScripts(input: OrchestratorInput): OrchestratorOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(
        `PrintToAllCADsOrchestrator: ${validation.warnings.join("; ") || "invalid input"}`,
      );
    }
    const orchStart = Date.now();
    const targets = dedupeTargets(input.targets);
    const results: PerCADResult[] = [];
    let totalOps = 0;
    let totalLines = 0;

    for (const target of targets) {
      const tStart = Date.now();
      try {
        const output = runBridge(target, input);
        const lines = countLines(output.script);
        totalOps += output.opsEmitted;
        totalLines += lines;
        results.push({
          target,
          ok: true,
          output,
          durationMs: Date.now() - tStart,
        });
      } catch (err) {
        results.push({
          target,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - tStart,
        });
      }
    }

    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.length - succeeded;

    return {
      results,
      summary: {
        targetsRequested: targets.length,
        succeeded,
        failed,
        totalOpsEmitted: totalOps,
        totalScriptLines: totalLines,
        totalDurationMs: Date.now() - orchStart,
      },
      warnings: validation.warnings,
      orchestratorVersion: ORCHESTRATOR_VERSION,
      timestamp: new Date().toISOString(),
    };
  }

  /** All CAD targets the orchestrator can drive. */
  supportedTargets(): readonly CADTarget[] {
    return ALL_CAD_TARGETS;
  }
}

export const printToAllCADsOrchestrator = new PrintToAllCADsOrchestrator();
