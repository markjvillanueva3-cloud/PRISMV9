/**
 * HyperMillDataFreshnessHook — Data freshness warning hook
 *
 * HM-REV-MS8/U-HMR48 — Forge-Triple hook declared here.
 *
 * hypermill-data-freshness (WARNING):
 *   Fires pre-toolpath when hyperMILL extraction actions are invoked.
 *   Warns if any extracted data is > 30 days old (hyperMILL may have been updated).
 *   Does NOT block — only emits a warning. The user should re-run extraction.
 *
 * Logic:
 *   1. Check for extraction-metadata.json in the output directory
 *   2. Compute age = now - extracted_at
 *   3. If age > 30 days: emit hookWarning with re-run instruction
 *   4. If metadata missing: emit hookWarning suggesting first extraction run
 *   5. Otherwise: hookSuccess (data is fresh)
 *
 * @module hooks/HyperMillDataFreshnessHook
 * @version 1.0.0 — HM-REV-MS8
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  type HookDefinition,
  type HookContext,
  type HookResult,
  hookSuccess,
  hookWarning,
} from "../engines/HookExecutor.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const FRESHNESS_THRESHOLD_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Actions that trigger the freshness check */
const FRESHNESS_CHECK_ACTIONS = new Set([
  "hypermill_extract_tools",
  "hypermill_extraction_schema",
  "hypermill_extraction_stats",
  "hypermill_extract_macros",
  "hypermill_extract_im_tools",
  "hypermill_macro_schema",
  "hypermill_extract_ac_tools",
  "hypermill_ac_tool_schema",
  "hypermill_extract_metric_cfg",
  "hypermill_cfg_stats",
  "hypermill_cfg_diff",
  "hypermill_data_extract_all",
  "hypermill_data_status",
  "hypermill_data_freshness_check",
  "cam_hypermill_millturn_strategy",
  "cam_hypermill_dental_route",
]);

// ── Hook definition ────────────────────────────────────────────────────────────

const hyperMillDataFreshnessHook: HookDefinition = {
  id: "hypermill-data-freshness",
  name: "hyperMILL Extracted Data Freshness Check",
  description:
    "Warns when extracted hyperMILL database data is > 30 days old. " +
    "hyperMILL installations may be updated, making extracted data stale. " +
    "Run cam:hypermill_data_extract_all to refresh. Non-blocking — warning only.",
  phase: "pre-toolpath",
  category: "enforcement",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: [
    "hypermill", "data-freshness", "extraction", "HM-REV-MS8",
    "demo-db", "macro-db", "metric-cfg",
  ],
  handler: (ctx: HookContext): HookResult => {
    const hookRef = { id: "hypermill-data-freshness", name: "hyperMILL Data Freshness", phase: "pre-toolpath" as const, category: "enforcement" as const, mode: "warning" as const };
    // Only fire for hyperMILL extraction-related actions
    const action = ((ctx.metadata as any)?.action as string | undefined) ?? (ctx.operation ?? "");
    if (!FRESHNESS_CHECK_ACTIONS.has(action)) {
      return hookSuccess(hookRef, "Non-HyperMILL action — skipped", { data: { checked: false } });
    }

    // Determine output directory from params or default
    const outputDir = ((ctx.metadata as any)?.output_dir as string | undefined) ??
      "data/hypermill-extracted";

    const metaPath = path.join(outputDir, "extraction-metadata.json");

    // Case 1: Metadata file missing → first run needed
    if (!fs.existsSync(metaPath)) {
      return hookWarning(hookRef,
        "hyperMILL extraction data has never been run. " +
        "Execute cam:hypermill_data_extract_all to extract all 5 databases. " +
        "Current data may be incomplete.",
        { data: { checked: true, has_metadata: false, output_dir: outputDir, action_to_fix: "cam:hypermill_data_extract_all" } },
      );
    }

    // Case 2: Check age
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as { extracted_at: string };
      const extractedAt = new Date(meta.extracted_at);
      const ageDays = Math.floor((Date.now() - extractedAt.getTime()) / MS_PER_DAY);

      if (ageDays > FRESHNESS_THRESHOLD_DAYS) {
        return hookWarning(hookRef,
          `hyperMILL extracted data is ${ageDays} days old ` +
          `(threshold: ${FRESHNESS_THRESHOLD_DAYS} days). ` +
          `hyperMILL may have been updated — re-run cam:hypermill_data_extract_all ` +
          `to refresh the tool and cycle parameter data.`,
          { data: { checked: true, has_metadata: true, age_days: ageDays, threshold_days: FRESHNESS_THRESHOLD_DAYS, extracted_at: meta.extracted_at, action_to_fix: "cam:hypermill_data_extract_all" } },
        );
      }

      // Data is fresh
      return hookSuccess(hookRef, `hyperMILL data is fresh (${ageDays} days old)`, {
        data: { checked: true, has_metadata: true, age_days: ageDays, threshold_days: FRESHNESS_THRESHOLD_DAYS, extracted_at: meta.extracted_at, is_fresh: true },
      });
    } catch {
      // Metadata unreadable — treat as missing
      return hookWarning(hookRef,
        "hyperMILL extraction metadata is unreadable. " +
        "Run cam:hypermill_data_extract_all to rebuild extraction data.",
        { data: { checked: true, has_metadata: false, output_dir: outputDir } },
      );
    }
  },
};

/** Exported array — added to allHooks in index.ts */
export const hyperMillDataFreshnessHooks: HookDefinition[] = [
  hyperMillDataFreshnessHook,
];

// Named export for direct use in tests and dispatcher
export { hyperMillDataFreshnessHook };
