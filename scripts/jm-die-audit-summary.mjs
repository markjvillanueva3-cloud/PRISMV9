// Read the audit JSON and produce a single-line-per-variant summary table for human eyeball.
// Flags potential FALSE MERGES: variant has zero common file-extension family with canonical.

import { readFileSync } from "node:fs";

const data = JSON.parse(readFileSync("H:/prism/state/shared/jm-die-folder-audit.json", "utf8"));

function topExts(extArr) {
  if (!extArr || extArr.length === 0) return "(none)";
  return extArr.slice(0, 3).map(([e, n]) => `${e}:${n}`).join(",");
}

function commonExtFamily(canonExts, varExts) {
  if (!canonExts || !varExts) return false;
  const cSet = new Set(canonExts.map(([e]) => e));
  return varExts.some(([e]) => cSet.has(e));
}

function emit(label, audits) {
  console.log(`\n=== ${label} (${audits.length} groups) ===`);
  console.log(`canonical / variant | files | top-3-ext | common-with-canon?`);
  console.log(`---`);
  for (const a of audits) {
    const cs = a.canonical_summary;
    if (!cs.exists) {
      console.log(`${a.canonical} | (canonical missing on disk)`);
      continue;
    }
    console.log(`★ ${a.canonical} | ${cs.fileCount} files | ${topExts(cs.extensions)}`);
    for (const [vname, v] of Object.entries(a.variants)) {
      if (!v.exists) {
        console.log(`  ▸ ${vname} | MISSING (${v.note || "?"})`);
        continue;
      }
      const common = commonExtFamily(cs.extensions, v.extensions);
      const flag = common ? "✓" : "⚠ NO-COMMON-EXT";
      const loc = v.location === "merged" ? "[merged]" : "[root]";
      console.log(`  ▸ ${vname} ${loc} | ${v.fileCount} files | ${topExts(v.extensions)} | ${flag}`);
    }
  }
}

emit("TIER 1 — already applied", data.tier1_audits);
emit("TIER 2 — candidates", data.tier2_audits);
emit("TIER 3 — candidates (substring-matched, high false-positive risk)", data.tier3_audits || []);
