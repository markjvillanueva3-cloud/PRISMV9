// Audit folder contents for the Tier 1 merges and Tier 2 candidates.
// For each merge group:
//   - count files (recursive) in canonical and each _merged_from_<variant>
//   - sample first 5 filenames from each
//   - flag if file extensions / naming pattern look completely disjoint (= probably wrong merge)

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "H:/PRISM/JM DIE/Prism JM Die";
const TIERED = "H:/prism/state/shared/jm-die-part-library-tiered.json";

const tiered = JSON.parse(readFileSync(TIERED, "utf8"));

const MAX_FILES_TO_SCAN = 5000;

function walkFiles(dir, out = [], depth = 0) {
  if (out.length >= MAX_FILES_TO_SCAN) return out;
  if (depth > 8) return out;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (out.length >= MAX_FILES_TO_SCAN) break;
    const full = join(dir, e.name);
    try {
      if (e.isDirectory()) walkFiles(full, out, depth + 1);
      else if (e.isFile()) out.push(full);
    } catch { /* ignore */ }
  }
  return out;
}

function summarize(dir) {
  if (!existsSync(dir)) return { exists: false };
  const files = walkFiles(dir);
  const extCounts = {};
  for (const f of files) {
    const e = extname(f).toLowerCase() || "(noext)";
    extCounts[e] = (extCounts[e] || 0) + 1;
  }
  return {
    exists: true,
    fileCount: files.length,
    extensions: Object.entries(extCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    samples: files.slice(0, 5).map(f => f.substring(dir.length + 1).replace(/\\/g, "/")),
  };
}

function auditGroup(group, sourceTier) {
  const canonicalName = group.canonical;
  const canonDir = join(ROOT, canonicalName);
  const variants = group.variants.map(v => v.replace(/\s*\[[^\]]+\]\s*$/, "")).filter(v => v !== canonicalName);

  const report = {
    tier: sourceTier,
    canonical: canonicalName,
    canonical_summary: summarize(canonDir),
    variants: {},
  };

  for (const v of variants) {
    // Two possible locations: root (Tier 2 pre-merge) or inside canonical as _merged_from_ (Tier 1 post-merge)
    const rootLoc = join(ROOT, v);
    const mergedLoc = join(canonDir, `_merged_from_${v}`);
    const loc = existsSync(mergedLoc) ? mergedLoc : (existsSync(rootLoc) ? rootLoc : null);
    if (!loc) {
      report.variants[v] = { exists: false, note: "neither root nor _merged_from_ present" };
    } else {
      report.variants[v] = { location: loc.startsWith(canonDir) ? "merged" : "root", ...summarize(loc) };
    }
  }
  return report;
}

const out = {
  tier1_audits: tiered.tier1_safe
    .filter(g => g.variants.length > 1 || (g.variants.length === 1 && !g.variants[0].endsWith("[exact]")))
    .map(g => auditGroup(g, "tier1")),
  tier2_audits: tiered.tier2_review.map(g => auditGroup(g, "tier2")),
  tier3_audits: (tiered.tier3_questionable || []).map(g => auditGroup(g, "tier3")),
};

console.log(JSON.stringify(out, null, 2));
