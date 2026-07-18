/**
 * CADPrintRegeneratorEngine — CAD-DRAW-MAX-MS1/U-PRINT-REGEN-LIVE
 *
 * Third and final perception-layer follow-up named in the round-trip
 * pipeline. Satisfies the `printGenerator` contract: given a generated
 * CAD model (DrawAnyPartResult), emit a structured "regenerated print"
 * representation (PrintDimension[] + textual summary) that can be
 * directly compared against the original print's extracted dimensions.
 *
 * v1 strategy: re-use {@link CADModelDimensionExtractorEngine} as the
 * dimension source (the regenerated print IS the dimensions implied by
 * the op log) + emit a Markdown drawing summary so an operator can
 * visually compare against the source print.
 *
 * v2 (named follow-up `U-PRINT-REGEN-VECTOR`): emit an actual vector
 * drawing (SVG/DXF/PDF) — requires the hyperCAD-S drawing-export call.
 * Held back here to keep the v1 ship focused.
 *
 * Pure + hermetic (no I/O, no live CAD session). Same input = same output.
 *
 * Refs: CADRoundTripValidationEngine (consumer); CADModelDimensionExtractorEngine
 *       (delegated to for dim extraction).
 */

import type { DrawAnyPartResult } from "./CADDrawAnyPartOrchestratorEngine.js";
import type { PrintDimension } from "./CADRoundTripValidationEngine.js";
import { cadModelDimensionExtractorEngine } from "./CADModelDimensionExtractorEngine.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface RegeneratedPrint {
  /** The dimensions that would appear on the regenerated drawing. */
  dimensions: ReadonlyArray<PrintDimension>;
  /** Human-readable Markdown summary suitable for operator review. */
  markdownSummary: string;
  /** Source DrawAnyPartResult metadata (provenance). */
  sourceMeta: { stopReason: string; iterations: number; opCount: number; exportedSuccessfully: boolean };
  /** Schema version for forward-compat. */
  schemaVersion: 1;
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

/** Group dims by label for the Markdown summary. Pure. */
export function groupDimsByLabel(dims: ReadonlyArray<PrintDimension>): Record<string, PrintDimension[]> {
  const out: Record<string, PrintDimension[]> = {};
  for (const d of dims) {
    (out[d.label] = out[d.label] ?? []).push(d);
  }
  return out;
}

/**
 * Render a structured regenerated-print summary as Markdown. Pure;
 * exported for direct testing. Layout deliberately mirrors a real
 * dimensioned drawing's title-block + dim-table format so operator
 * comparison is straightforward.
 */
export function renderRegeneratedPrintMarkdown(
  dims: ReadonlyArray<PrintDimension>,
  meta: RegeneratedPrint["sourceMeta"],
): string {
  const lines: string[] = [];
  lines.push("# Regenerated Print");
  lines.push("");
  lines.push("## Title block");
  lines.push("");
  lines.push(`- Source: PRISM round-trip pipeline (CAD-DRAW-MAX-MS1)`);
  lines.push(`- Operations executed: ${meta.opCount}`);
  lines.push(`- Iterations: ${meta.iterations}`);
  lines.push(`- Exported successfully: ${meta.exportedSuccessfully ? "yes" : "NO"}`);
  lines.push(`- Stop reason: ${meta.stopReason}`);
  lines.push(`- Total dimensions: ${dims.length}`);
  lines.push("");
  lines.push("## Dimension table");
  lines.push("");
  if (dims.length === 0) {
    lines.push("_(no dimensions extracted)_");
  } else {
    lines.push("| ID | Label | Value | Unit | Tolerance |");
    lines.push("|---|---|---:|---|---|");
    for (const d of dims) {
      const tol = d.tolerance ? `${d.tolerance.lower.toFixed(4)} / ${d.tolerance.upper.toFixed(4)}` : "—";
      lines.push(`| ${d.id} | ${d.label} | ${d.value.toFixed(4)} | ${d.unit ?? "in"} | ${tol} |`);
    }
  }
  lines.push("");
  lines.push("## By label (group view)");
  lines.push("");
  const grouped = groupDimsByLabel(dims);
  const labels = Object.keys(grouped).sort();
  if (labels.length === 0) {
    lines.push("_(no labeled dimensions)_");
  } else {
    for (const label of labels) {
      const vals = grouped[label].map(d => d.value.toFixed(4)).join(", ");
      lines.push(`- **${label}** (×${grouped[label].length}): ${vals}`);
    }
  }
  return lines.join("\n") + "\n";
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADPrintRegeneratorEngine {
  /**
   * Full regenerated-print emission. Pure aggregation over the dim
   * extractor + Markdown renderer. Returns both the dim list (for the
   * round-trip engine's diff step) and the Markdown summary (for
   * operator review).
   */
  async regenerate(draw: DrawAnyPartResult): Promise<RegeneratedPrint> {
    const dims = await cadModelDimensionExtractorEngine.extract(draw ?? { opLog: [], steps: [], exportedSuccessfully: false, stopReason: "exported", iterations: 0 });
    const sourceMeta: RegeneratedPrint["sourceMeta"] = {
      stopReason: draw?.stopReason ?? "(no draw)",
      iterations: draw?.iterations ?? 0,
      opCount: Array.isArray(draw?.opLog) ? draw.opLog.length : 0,
      exportedSuccessfully: draw?.exportedSuccessfully ?? false,
    };
    const markdownSummary = renderRegeneratedPrintMarkdown(dims, sourceMeta);
    return { dimensions: dims, markdownSummary, sourceMeta, schemaVersion: 1 };
  }

  /**
   * Satisfies the `printGenerator.generate` contract of the round-trip
   * engine: returns ONLY the dimension list (the round-trip engine doesn't
   * consume the Markdown summary directly — that's for operator review).
   */
  async generate(draw: DrawAnyPartResult): Promise<ReadonlyArray<PrintDimension>> {
    const result = await this.regenerate(draw);
    return result.dimensions;
  }
}

export const cadPrintRegeneratorEngine = new CADPrintRegeneratorEngine();
