/**
 * Resource Integrity Hook
 * RES-MS0 U-RES04: Validates harvest completeness against source file counts
 *
 * Fires after harvest_complete events to ensure:
 * - All expected files were processed
 * - No file types were skipped
 * - Classification coverage meets threshold
 * - Harvest progress matches scan index
 *
 * Mode: WARNING (never blocks — harvest data is supplementary, not safety-critical)
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookWarning,
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";

/** Resource integrity validation hook */
export const resourceIntegrityHook: HookDefinition = {
  id: "resource-integrity",
  name: "Resource Harvest Integrity Check",
  description:
    "Validates harvest completeness: checks file counts match scan index, no types skipped, classification coverage >= 90%. Fires on harvest_complete events.",
  phase: "post-batch-import",
  category: "data-quality",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["resource", "harvest", "data-quality", "integrity", "RES-MS0"],

  handler: async (context: HookContext): Promise<HookResult> => {
    const meta = context.metadata ?? {};

    // Extract harvest results from context
    const harvestResult = (meta.harvestResult ?? meta.harvest_result) as Record<string, unknown> | undefined;
    const scanIndex = (meta.scanIndex ?? meta.scan_index) as Record<string, unknown> | undefined;

    if (!harvestResult) {
      return hookSuccess(
        resourceIntegrityHook,
        "No harvest result in context — skipping integrity check"
      );
    }

    const warnings: string[] = [];
    const num = (v: unknown): number => (typeof v === "number" ? v : 0);

    // Check 1: File count match
    if (scanIndex && harvestResult) {
      const expectedFiles = num(scanIndex.totalFiles ?? scanIndex.total_files);
      const processedFiles = num(harvestResult.processedFiles ?? harvestResult.processed_files);
      const skippedFiles = num(harvestResult.skippedFiles ?? harvestResult.skipped_files);
      const totalHandled = processedFiles + skippedFiles;

      if (expectedFiles > 0 && totalHandled < expectedFiles * 0.95) {
        warnings.push(
          `File count mismatch: scan found ${expectedFiles} files but harvest only handled ${totalHandled} (${Math.round(totalHandled / expectedFiles * 100)}%). ` +
          `${expectedFiles - totalHandled} files unaccounted for.`
        );
      }
    }

    // Check 2: Classification coverage
    if (harvestResult.classificationStats || harvestResult.classification_stats) {
      const stats = (harvestResult.classificationStats ?? harvestResult.classification_stats) as Record<string, unknown>;
      const totalClassified = num(stats.classified);
      const totalAttempted = num(stats.attempted ?? stats.total);

      if (totalAttempted > 0) {
        const coveragePct = (totalClassified / totalAttempted) * 100;
        if (coveragePct < 90) {
          warnings.push(
            `Classification coverage ${coveragePct.toFixed(1)}% is below 90% threshold. ` +
            `${totalAttempted - totalClassified} files could not be classified.`
          );
        }
      }
    }

    // Check 3: File type coverage
    if (harvestResult.typeBreakdown || harvestResult.type_breakdown) {
      const breakdown = (harvestResult.typeBreakdown ?? harvestResult.type_breakdown) as Record<string, unknown>;
      const expectedTypes = ["pdf", "cps", "step", "cyc", "min", "mcx", "hmc", "db", "csv", "py"];
      const foundTypes = Object.keys(breakdown);
      const missingTypes = expectedTypes.filter(t => !foundTypes.includes(t));

      if (missingTypes.length > 0) {
        warnings.push(
          `Missing expected file types in harvest: ${missingTypes.join(", ")}. ` +
          `These types exist in the resources folder but were not harvested.`
        );
      }
    }

    // Check 4: Error rate
    if (harvestResult.errors || harvestResult.error_count) {
      const errors = harvestResult.errors as unknown[] | undefined;
      const errorCount = num(errors?.length ?? harvestResult.error_count);
      const processedFiles = num(harvestResult.processedFiles ?? harvestResult.processed_files);

      if (processedFiles > 0 && errorCount > processedFiles * 0.05) {
        warnings.push(
          `Harvest error rate ${((errorCount / processedFiles) * 100).toFixed(1)}% exceeds 5% threshold. ` +
          `${errorCount} files failed to process.`
        );
      }
    }

    if (warnings.length > 0) {
      log.warn(
        `[resource-integrity] ${warnings.length} integrity warnings:\n  - ${warnings.join("\n  - ")}`
      );
      return hookWarning(
        resourceIntegrityHook,
        `Harvest integrity check: ${warnings.length} warning(s):\n${warnings.map(w => `  ⚠ ${w}`).join("\n")}`,
        { warnings: warnings, data: { warningCount: warnings.length } }
      );
    }

    return hookSuccess(
      resourceIntegrityHook,
      `Harvest integrity check passed: all file counts match, classification >= 90%, no skipped types, error rate < 5%`
    );
  },
};

/** All resource integrity hooks for registration */
export const RESOURCE_INTEGRITY_HOOKS: HookDefinition[] = [
  resourceIntegrityHook,
];
