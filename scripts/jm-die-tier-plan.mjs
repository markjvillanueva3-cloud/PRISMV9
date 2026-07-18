// Tier the JM Die consolidation plan by match-kind safety.
//   Tier 1 (safe-to-apply): only exact + prefix matches
//   Tier 2 (review-recommended): exact + prefix + lev-core
//   Tier 3 (manual-verify): token-core involved (substring matching prone to false positives)
import { readFileSync, writeFileSync } from "node:fs";

const plan = JSON.parse(readFileSync("H:/prism/state/shared/jm-die-part-library-plan.json", "utf8"));
const tiers = { tier1_safe: [], tier2_review: [], tier3_questionable: [] };

for (const g of plan.duplicateGroups) {
  const kinds = new Set(g.variants.map(v => v.matchKind));
  const entry = {
    canonical: g.canonical,
    variantCount: g.variants.length,
    variants: g.variants.map(v => `${v.name} [${v.matchKind}]`),
  };
  const onlyMechanical = [...kinds].every(k => k === "exact" || k === "prefix");
  const okWithLev = [...kinds].every(k => k === "exact" || k === "prefix" || k === "lev-core");
  if (onlyMechanical) tiers.tier1_safe.push(entry);
  else if (okWithLev) tiers.tier2_review.push(entry);
  else tiers.tier3_questionable.push(entry);
}

const summary = {
  tier1_safe_groups: tiers.tier1_safe.length,
  tier1_folders_to_merge: tiers.tier1_safe.reduce((s, g) => s + g.variantCount, 0),
  tier2_review_groups: tiers.tier2_review.length,
  tier2_folders: tiers.tier2_review.reduce((s, g) => s + g.variantCount, 0),
  tier3_questionable_groups: tiers.tier3_questionable.length,
  tier3_folders: tiers.tier3_questionable.reduce((s, g) => s + g.variantCount, 0),
  junk_count: plan.junkFolders.length,
  singletons: plan.singletons.length,
};

writeFileSync("H:/prism/state/shared/jm-die-part-library-tiered.json", JSON.stringify(tiers, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log("\n--- TIER 1 (SAFE) groups ---");
for (const g of tiers.tier1_safe) {
  console.log(`${g.canonical}  <-  ${g.variants.length} variants: ${g.variants.join(", ")}`);
}
