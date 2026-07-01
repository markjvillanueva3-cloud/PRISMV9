#!/usr/bin/env node
/**
 * heuristic-classifier.mjs — give every directory a category + utilization verdict.
 *
 * The agent census only deeply classified the top 1000 dirs per slice (~5,292 of
 * 54,855 total). This pass uses name patterns + extension distribution + mtime
 * to assign a verdict to EVERY remaining dir, so layer-3 coverage hits 100%.
 *
 * Inputs:
 *   state/shared/system-viz/h-drive-dir-index.json   (every dir on H: + counts/exts/mtime)
 *   state/shared/system-viz/file-coverage-v2-augmentation.json (LLM verdicts to defer to)
 *
 * Output:
 *   state/shared/system-viz/heuristic-classification.json
 *   {
 *     generatedAt, totals: {classified, byCategory, byUtilization, hybridDeferred},
 *     bySubtree: { <root>: { dirCount, byCat, byUtil } },
 *     directories: [{ path, category, utilization, evidence, source: "agent"|"heuristic" }]
 *   }
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const DIR_INDEX = path.join(VIZ_DIR, "h-drive-dir-index.json");
const COV_V2 = path.join(VIZ_DIR, "file-coverage-v2-augmentation.json");
const OUT = path.join(VIZ_DIR, "heuristic-classification.json");

if (!fs.existsSync(DIR_INDEX)) {
  console.error(`missing: ${DIR_INDEX}`);
  process.exit(2);
}

const dirIdx = JSON.parse(fs.readFileSync(DIR_INDEX, "utf8"));
const covV2 = fs.existsSync(COV_V2) ? JSON.parse(fs.readFileSync(COV_V2, "utf8")) : null;

// === BUILD AGENT-VERDICT MAP (defer to LLM where it exists) ===
const agentVerdicts = new Map();
if (covV2?.directories) {
  for (const d of covV2.directories) {
    if (d.path) agentVerdicts.set(d.path.replace(/\\/g, "/"), {
      category: d.category, utilization: d.utilization,
      evidence: d.evidence, source: "agent",
    });
  }
}

// === HEURISTIC RULES ===
// Tuned thresholds — the magic numbers here are calibration, not arbitrary.
const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const ACTIVE_AGE_DAYS = 14;       // touched within 14d → active
const INACTIVE_AGE_DAYS = 90;     // touched within 90d → partial; older → inactive
const ORPHAN_AGE_DAYS = 365;      // older than 1yr + no signals → orphaned

// Path-name → category (regex, first match wins)
const NAME_RULES = [
  // ARCHIVE patterns
  [/(?:^|\/)(_?archive|archives|archived|backup|backups|\.bak|\.archive|legacy|old|deprecated|obsolete|graveyard|attic)(?:\/|$)/i, "archive"],
  [/-archived-\d/, "archive"],
  [/^_?ORPHAN/i, "archive"],
  [/^found\.\d+/i, "archive"],
  // CACHE patterns (regenerable runtime state)
  [/(?:^|\/)(\.cache|node_modules|\.next|\.turbo|\.vercel|\.vite|\.parcel-cache|__pycache__|\.pytest_cache|\.tox|target|coverage|\.nyc_output|\.idea|\.vscode)(?:\/|$)/i, "cache"],
  [/(?:^|\/)tmp(?:\/|$)/i, "cache"],
  [/(?:^|\/)temp(?:\/|$)/i, "cache"],
  // GENERATED — pipeline output
  [/(?:^|\/)(dist|build|out|output|generated|\.output|public\/build|target\/release)(?:\/|$)/i, "generated"],
  [/(?:^|\/)\.git(?:\/|$)/i, "generated"],   // git internals
  // TESTS / SOURCE
  [/(?:^|\/)(__tests__|__mocks__|tests?|spec|specs|fixtures)(?:\/|$)/i, "source"],
  [/(?:^|\/)(src|lib|core|engines|dispatchers|hooks|helpers|scripts|modules|components|pages|server|api|cli|bin)(?:\/|$)/i, "source"],
  // DATA
  [/(?:^|\/)(data|datasets|corpus|programs|materials|tools|machines|registries|catalogs?|fixtures-data|samples)(?:\/|$)/i, "data"],
  [/(?:^|\/)(state|store|stores|snapshots|history|logs?)(?:\/|$)/i, "data"],
  // CONFIG
  [/(?:^|\/)(config|configs|settings|env|deploy|deployment|k8s|infra)(?:\/|$)/i, "config"],
  [/(?:^|\/)\.(claude|claude-octopus|github|gitlab|circleci)(?:\/|$)/i, "config"],
  // DOCS
  [/(?:^|\/)(docs?|documentation|wiki|knowledge|guides?|tutorials?|examples?|notes?|memories?)(?:\/|$)/i, "docs"],
  [/(?:^|\/)readme/i, "docs"],
];

// Extension-distribution → category (used when path-name doesn't match)
function categorizeByExt(byExt = {}, fileCount = 0) {
  if (fileCount < 3) return "unknown";
  // Sum up known buckets
  let source = 0, data = 0, docs = 0, config = 0, asset = 0, cache = 0;
  for (const [ext, n] of Object.entries(byExt)) {
    if (/^\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|c|cpp|h|hpp|cs|rb|php|swift|kt|scala|sh|ps1|nim)$/.test(ext)) source += n;
    else if (/^\.(json|jsonl|csv|tsv|xml|yaml|yml|toml|ini|nc|min|mcx-?\d?|cps|f3d|sldprt|ipt|iam|step|stp|iges|igs|stl|dwg|dxf)$/.test(ext)) data += n;
    else if (/^\.(md|markdown|rst|txt|pdf|docx?|xlsx?|pptx?)$/.test(ext)) docs += n;
    else if (/^\.(env|conf|config|properties|lock|toml)$/.test(ext)) config += n;
    else if (/^\.(png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|webp|mp4|webm|mp3|wav)$/.test(ext)) asset += n;
    else if (/^\.(map|cache|tsbuildinfo|log)$/.test(ext)) cache += n;
  }
  const buckets = { source, data, docs, config, cache };
  buckets.docs += asset;   // assets count as docs/static
  // Pick dominant; require ≥40% to be confident
  const total = source + data + docs + config + cache;
  if (total === 0) return "unknown";
  const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] / total >= 0.4) return sorted[0][0];
  return "unknown";
}

// Mtime + file-count → utilization
function utilizationFor(rec) {
  const newestAge = rec.newestMtime ? (NOW - rec.newestMtime) / DAY : Number.POSITIVE_INFINITY;
  // Empty dirs go straight to ghost/orphan territory
  if (rec.fileCount === 0) return "orphaned";
  // Fresh activity within 2 weeks → active
  if (newestAge <= ACTIVE_AGE_DAYS) return "active";
  // Touched within 90d → partial (recent enough to matter)
  if (newestAge <= INACTIVE_AGE_DAYS) return "partial";
  // 90-365d → inactive
  if (newestAge <= ORPHAN_AGE_DAYS) return "inactive";
  // > 1 year and no fresh files → orphaned
  return "orphaned";
}

function nameRuleMatch(absPath) {
  for (const [re, cat] of NAME_RULES) {
    if (re.test(absPath)) return cat;
  }
  return null;
}

// === CLASSIFY ===
const out = {
  generatedAt: new Date().toISOString(),
  schemaVersion: "1.0.0",
  totals: { classified: 0, byCategory: {}, byUtilization: {}, hybridDeferred: 0, fromAgent: 0, fromHeuristic: 0 },
  bySubtree: {},
  directories: [],
};

for (const rec of dirIdx.dirs || []) {
  const p = (rec.path || "").replace(/\\/g, "/");
  if (!p) continue;

  let category, utilization, evidence, source;
  const agent = agentVerdicts.get(p);
  if (agent) {
    category = agent.category;
    utilization = agent.utilization;
    evidence = agent.evidence || "agent verdict";
    source = "agent";
    out.totals.fromAgent++;
  } else {
    // Heuristic path
    category = nameRuleMatch(p) || categorizeByExt(rec.byExt, rec.fileCount);
    utilization = utilizationFor(rec);
    const newestAge = rec.newestMtime ? Math.round((NOW - rec.newestMtime) / DAY) : -1;
    evidence = `heuristic: name+ext match → ${category}; newest ${newestAge}d → ${utilization} (${rec.fileCount} files)`;
    source = "heuristic";
    out.totals.fromHeuristic++;
  }

  out.totals.classified++;
  out.totals.byCategory[category] = (out.totals.byCategory[category] || 0) + 1;
  out.totals.byUtilization[utilization] = (out.totals.byUtilization[utilization] || 0) + 1;

  // Subtree rollup
  const m = p.match(/^[Hh]:\/([^\/]+)/);
  const root = m ? m[1] : "(root)";
  const st = (out.bySubtree[root] ??= { dirCount: 0, byCategory: {}, byUtilization: {}, totalBytes: 0 });
  st.dirCount++;
  st.totalBytes += rec.totalBytes || 0;
  st.byCategory[category] = (st.byCategory[category] || 0) + 1;
  st.byUtilization[utilization] = (st.byUtilization[utilization] || 0) + 1;

  // Cap stored per-dir records to keep JSON sane (top by file count)
  out.directories.push({
    path: p,
    category,
    utilization,
    evidence,
    source,
    fileCount: rec.fileCount,
    totalBytes: rec.totalBytes,
    newestMtime: rec.newestMtime,
  });
}

// Sort + cap per-dir record list — the rollup is what matters for graph
out.directories.sort((a, b) => (b.fileCount || 0) - (a.fileCount || 0));
const FULL_DIR_COUNT = out.directories.length;
out.directories = out.directories.slice(0, 5000);
out.totals.directoriesEmittedInBody = out.directories.length;
out.totals.directoriesTotal = FULL_DIR_COUNT;

fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`wrote ${OUT}`);
console.log(`  classified: ${out.totals.classified.toLocaleString()} dirs`);
console.log(`    from agent: ${out.totals.fromAgent}`);
console.log(`    from heuristic: ${out.totals.fromHeuristic}`);
console.log(`  by category:`, out.totals.byCategory);
console.log(`  by utilization:`, out.totals.byUtilization);
console.log(`  subtrees rolled up: ${Object.keys(out.bySubtree).length}`);
console.log(`  emitted in body: ${out.directories.length}/${FULL_DIR_COUNT} (top by fileCount)`);
