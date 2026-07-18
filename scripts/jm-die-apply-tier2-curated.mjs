// Apply curated Tier 2 merges — only the 3 groups with clean Lev-1/2 OCR fixes.
// Skipped (operator-review): ALLFAST/ALLEYFAST (different company), BARNES/BAES
// (BAES too generic), AKKO/AEPO (AKKO folder absent, Lev across unrelated tokens).
//
// Same reversible move pattern as apply-tier1: variant → canonical/_merged_from_<name>/

import { readFileSync, existsSync, renameSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "H:/PRISM/JM DIE/Prism JM Die";
const TIERED = "H:/prism/state/shared/jm-die-part-library-tiered.json";
const CURATED_CANONICALS = new Set(["FORGO", "CUSTOM", "HOWMET AEROSPACE"]);

const tiered = JSON.parse(readFileSync(TIERED, "utf8"));
const groups = tiered.tier2_review.filter(g => CURATED_CANONICALS.has(g.canonical));

const results = {
  groups_attempted: groups.length,
  variants_moved: 0,
  variants_skipped_already_moved: 0,
  variants_failed: [],
  canonicals_created: 0,
};

for (const group of groups) {
  const canonicalName = group.canonical;
  const canonDir = join(ROOT, canonicalName);
  const variantNames = group.variants.map(v => v.replace(/\s*\[[^\]]+\]\s*$/, ""));
  const actualVariants = variantNames.filter(v => v !== canonicalName);

  if (!existsSync(canonDir)) {
    try { mkdirSync(canonDir, { recursive: true }); results.canonicals_created++; }
    catch (e) {
      results.variants_failed.push({ canonical: canonicalName, variant: "(canonical mkdir)", error: e.code || e.message });
      continue;
    }
  } else {
    try {
      if (!statSync(canonDir).isDirectory()) {
        results.variants_failed.push({ canonical: canonicalName, variant: "(canonical exists as non-dir)", error: "ENOTDIR" });
        continue;
      }
    } catch (e) {
      results.variants_failed.push({ canonical: canonicalName, variant: "(canonical stat)", error: e.code || e.message });
      continue;
    }
  }

  for (const variant of actualVariants) {
    const variantDir = join(ROOT, variant);
    const destDir = join(canonDir, `_merged_from_${variant}`);
    if (!existsSync(variantDir)) { results.variants_skipped_already_moved++; continue; }
    if (existsSync(destDir)) { continue; }
    try { renameSync(variantDir, destDir); results.variants_moved++; }
    catch (e) {
      results.variants_failed.push({ canonical: canonicalName, variant, error: e.code || e.message });
    }
  }
}

console.log(JSON.stringify({
  ok: results.variants_failed.length === 0,
  ...results,
  failure_count: results.variants_failed.length,
  skipped_questionable: ["ALLFAST FASTENING SYSTEMS (ALLEYFAST)", "BARNES INDUSTRIES (BAES)", "AKKO (AEPO)"],
}, null, 2));
