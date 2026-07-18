// Apply ONLY Tier 1 merges from jm-die-part-library-tiered.json.
// Reversible: each variant folder is renamed into <canonical>/_merged_from_<variant>/
// rather than deleted or content-merged. Operator can undo with a simple rename back.
//
// Single-variant groups (canonical alone) are skipped — no merge required.
// Self-reference (variant name == canonical) is skipped defensively.
//
// Errors per folder are caught; the script continues to the next. Final report
// includes successes, skips, and per-folder failures (OS error codes from lock issues).

import { readFileSync, existsSync, renameSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "H:/PRISM/JM DIE/Prism JM Die";
const TIERED = "H:/prism/state/shared/jm-die-part-library-tiered.json";

const tiered = JSON.parse(readFileSync(TIERED, "utf8"));
const tier1 = tiered.tier1_safe;

const results = {
  groups_attempted: 0,
  groups_with_merges: 0,
  variants_moved: 0,
  variants_skipped_self: 0,
  variants_skipped_singleton: 0,
  variants_failed: [],
  canonicals_created: 0,
};

for (const group of tier1) {
  results.groups_attempted++;
  const canonicalName = group.canonical;
  const canonDir = join(ROOT, canonicalName);

  // Extract just the folder names (strip "[matchKind]" suffix)
  const variantNames = group.variants.map(v => v.replace(/\s*\[[^\]]+\]\s*$/, ""));

  // Variants other than the canonical itself
  const actualVariants = variantNames.filter(v => v !== canonicalName);
  if (actualVariants.length === 0) {
    results.variants_skipped_singleton++;
    continue;
  }
  results.groups_with_merges++;

  // Ensure canonical folder exists
  if (!existsSync(canonDir)) {
    try {
      mkdirSync(canonDir, { recursive: true });
      results.canonicals_created++;
    } catch (e) {
      results.variants_failed.push({
        canonical: canonicalName,
        variant: "(canonical mkdir)",
        error: e.code || e.message,
      });
      continue;
    }
  } else {
    // Sanity: canonical must be a directory
    try {
      if (!statSync(canonDir).isDirectory()) {
        results.variants_failed.push({
          canonical: canonicalName,
          variant: "(canonical exists as non-directory)",
          error: "ENOTDIR",
        });
        continue;
      }
    } catch (e) {
      results.variants_failed.push({
        canonical: canonicalName,
        variant: "(canonical stat)",
        error: e.code || e.message,
      });
      continue;
    }
  }

  for (const variant of actualVariants) {
    if (variant === canonicalName) {
      results.variants_skipped_self++;
      continue;
    }
    const variantDir = join(ROOT, variant);
    const destDir = join(canonDir, `_merged_from_${variant}`);

    if (!existsSync(variantDir)) {
      // Already moved in a prior run, or never existed — count as skipped
      results.variants_skipped_self++;
      continue;
    }
    if (existsSync(destDir)) {
      // Already merged previously; treat as success-noop
      continue;
    }

    try {
      renameSync(variantDir, destDir);
      results.variants_moved++;
    } catch (e) {
      results.variants_failed.push({
        canonical: canonicalName,
        variant,
        error: e.code || e.message,
      });
    }
  }
}

console.log(JSON.stringify({
  ok: results.variants_failed.length === 0,
  ...results,
  failure_count: results.variants_failed.length,
}, null, 2));
