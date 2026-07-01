// Apply curated Tier 3 merges — only audit-validated groups, with per-group variant allow-list
// where a group has mixed legitimate + false-positive variants. Same reversible
// rename-into-canonical/_merged_from_<name>/ pattern as prior tiers.

import { readFileSync, existsSync, renameSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "H:/PRISM/JM DIE/Prism JM Die";
const TIERED = "H:/prism/state/shared/jm-die-part-library-tiered.json";

// Whole-group apply: take ALL variants per audit
const WHOLE_GROUPS = new Set([
  "OPTIMAS",
  "ITW SHAKEPROOF",
  "ACUMENT GLOBAL TECHNOLOGIES",
  "MULTITECH INDUSTRIES",
  "WHITESELL",
  "AGRATI",
  "CLENDENIN BROTHERS",
  "AGAWA",
  "MGINC",
  "WRENTHAM TOOL",
  "AFS-TORRANCE-MAIN",
  "REED&PRINCE MFG.CORP",
  "AMGLO KEMLITE",
  "ALLSTAR",
]);

// Partial-apply: per-canonical, explicit list of variant folder names to include.
// Anything not in the list is LEFT AT ROOT for operator review.
const PARTIAL_GROUPS = {
  "VALLEY FASTENER GROUP": new Set(["VALLEY FASTENER", "VALLEYFAS"]),
  "ARCHER": new Set(["RCHERSCREW", "RCHERSCREWPROD"]),
  "BIRMINGHAM FASTENER": new Set(["IRMINGHAMFASTE"]),
};

const tiered = JSON.parse(readFileSync(TIERED, "utf8"));
const tier3 = tiered.tier3_questionable;

const results = {
  groups_attempted: 0,
  groups_skipped_not_in_curated: [],
  variants_moved: 0,
  variants_skipped_not_in_allowlist: 0,
  variants_skipped_already_moved: 0,
  variants_failed: [],
  canonicals_created: 0,
};

for (const group of tier3) {
  const canon = group.canonical;
  const variantNames = group.variants.map(v => v.replace(/\s*\[[^\]]+\]\s*$/, ""));
  const actualVariants = variantNames.filter(v => v !== canon);

  const isWhole = WHOLE_GROUPS.has(canon);
  const partialAllow = PARTIAL_GROUPS[canon];
  if (!isWhole && !partialAllow) {
    results.groups_skipped_not_in_curated.push(canon);
    continue;
  }
  results.groups_attempted++;

  const canonDir = join(ROOT, canon);
  if (!existsSync(canonDir)) {
    try { mkdirSync(canonDir, { recursive: true }); results.canonicals_created++; }
    catch (e) {
      results.variants_failed.push({ canonical: canon, variant: "(canonical mkdir)", error: e.code || e.message });
      continue;
    }
  } else {
    try {
      if (!statSync(canonDir).isDirectory()) {
        results.variants_failed.push({ canonical: canon, variant: "(canonical exists as non-dir)", error: "ENOTDIR" });
        continue;
      }
    } catch (e) {
      results.variants_failed.push({ canonical: canon, variant: "(canonical stat)", error: e.code || e.message });
      continue;
    }
  }

  for (const variant of actualVariants) {
    if (!isWhole && !partialAllow.has(variant)) {
      results.variants_skipped_not_in_allowlist++;
      continue;
    }
    const variantDir = join(ROOT, variant);
    const destDir = join(canonDir, `_merged_from_${variant}`);
    if (!existsSync(variantDir)) { results.variants_skipped_already_moved++; continue; }
    if (existsSync(destDir)) continue;
    try { renameSync(variantDir, destDir); results.variants_moved++; }
    catch (e) {
      results.variants_failed.push({ canonical: canon, variant, error: e.code || e.message });
    }
  }
}

console.log(JSON.stringify({
  ok: results.variants_failed.length === 0,
  ...results,
  groups_skipped_count: results.groups_skipped_not_in_curated.length,
  failure_count: results.variants_failed.length,
}, null, 2));
