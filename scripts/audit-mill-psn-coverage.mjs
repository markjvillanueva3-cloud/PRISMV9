#!/usr/bin/env node
// scripts/audit-mill-psn-coverage.mjs
// ------------------------------------
// TOKEN-SAVINGS-PIVOT/U-MILL-PSN-AUDIT (iter23, 2026-05-23, slot:alpha) —
// audits which of PRISM's 57+ mill-domain engines connect to each of the
// 11 PSN (PRISM Synergy Network) legs. Pure read-only enumeration. Output:
// state/shared/MILL-PSN-COVERAGE.{json,md}. Advisory; never modifies engines.
//
// PSN legs per knowledge/memories/feedback/feedback_psn_definition.md:
//   1.  obsidian-brain — knowledge/memories/_index/MEMORY.md cites engine
//   2.  prism-os       — prism_operating_system dispatcher imports engine
//   3.  wiki           — knowledge/wiki/index.md catalog cites engine
//   4.  memories       — knowledge/memories/_index/MEMORY.md cites engine
//   5.  tribal         — state/shared/tribal-embed-index.json cites engine
//   6.  system-viz     — state/shared/system-viz/system-graph.json contains engine
//   7.  engines        — engine file exists on disk (baseline)
//   8.  algorithms     — engine imports from src/algorithms/
//   9.  formulas       — engine imports from src/physics/constants
//   10. nn-gnn         — state/shared/nn-graph/labels.json cites engine
//   11. prism-ai       — AISystemRouterEngine.ts imports engine
//
// Karpathy: CLASSIFY=audit, TECHNIQUE=read pre-built indexes once + substring
// search per engine, EDGE CASES=missing files, malformed JSON, FAILURE MODES=
// corpus walks of 33K wiki files (avoided by reading wiki/index.md catalog only).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { streamTribalEntries } from "./lib/load-tribal-index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRISM = path.resolve(__dirname, "..");

const ENGINE_DIR    = path.join(PRISM, "mcp-server/src/engines");
const WIKI_INDEX    = path.join(PRISM, "knowledge/wiki/index.md");
const MEM_INDEX     = path.join(PRISM, "knowledge/memories/_index/MEMORY.md");
const DISPATCHERS   = path.join(PRISM, "mcp-server/src/tools/dispatchers");
const TRIBAL_FILE   = path.join(PRISM, "state/shared/tribal-embed-index.json");
const SYSTEM_GRAPH  = path.join(PRISM, "state/shared/system-viz/system-graph.json");
const NN_LABELS     = path.join(PRISM, "state/shared/nn-graph/labels.json");
const PRISM_AI_ROUT = path.join(PRISM, "mcp-server/src/engines/AISystemRouterEngine.ts");
const PRISM_OS_DISP = path.join(PRISM, "mcp-server/src/tools/dispatchers/prismOperatingSystemDispatcher.ts");

// ── Pure helpers ──────────────────────────────────────────────────────────
function safeReadDir(dir) {
  try { return fs.readdirSync(dir); } catch { return []; }
}
function safeReadFile(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
}
// Shard-aware searchable tribal blob: the index sharded 2026-06-08 + the monolith
// TRIBAL_FILE is now an absent orphan, so safeReadFile(TRIBAL_FILE) returned "" (mill
// tribal coverage read 0 for every engine). Stream the canonical shards and concatenate
// ONLY the human-text fields (id/title/source/domain/text) -- engine names live there,
// NEVER in the 768-float embedding -- so checkTribal()'s `.includes(engine)` substring
// check is byte-preserved while the blob stays ~10-30MB (the full shard text would
// exceed V8's 512MiB string cap). Fail-soft to "" preserves the prior safeReadFile
// semantics. O(1)-heap per entry (only the light text is retained, not the vectors).
function buildTribalSearchBlob(indexPath) {
  const manifestPath = indexPath.replace(/\.json$/i, "") + ".manifest.json";
  if (!fs.existsSync(indexPath) && !fs.existsSync(manifestPath)) return "";
  const parts = [];
  try {
    streamTribalEntries(indexPath, (e) => {
      parts.push(
        (e.id || "") + " " + (e.title || "") + " " + (e.source || "") + " " +
        (e.domain || "") + " " + (e.text || ""),
      );
    });
  } catch { return ""; }
  return parts.join("\n");
}

// ── Engine inventory (mill-domain filter) ─────────────────────────────────
function listMillEngines() {
  return safeReadDir(ENGINE_DIR)
    .filter((n) => n.endsWith(".ts") && /^Mill(?:ing)?[A-Z]/.test(n))
    .map((n) => n.replace(/\.ts$/, ""))
    .sort();
}

// ── Pre-load all canonical indexes ONCE (then substring per engine) ───────
const _wikiBlob     = safeReadFile(WIKI_INDEX);
const _memBlob      = safeReadFile(MEM_INDEX);
const _tribalBlob   = buildTribalSearchBlob(TRIBAL_FILE);
const _sysVizBlob   = safeReadFile(SYSTEM_GRAPH);
const _nnBlob       = safeReadFile(NN_LABELS);
const _prismAiBlob  = safeReadFile(PRISM_AI_ROUT);
const _prismOsBlob  = safeReadFile(PRISM_OS_DISP);

// Load all dispatcher sources once.
const _dispatcherSrcs = new Map();
for (const f of safeReadDir(DISPATCHERS)) {
  if (!f.endsWith(".ts")) continue;
  _dispatcherSrcs.set(f.replace(/\.ts$/, ""), safeReadFile(path.join(DISPATCHERS, f)));
}

// ── Per-engine leg checks ─────────────────────────────────────────────────
function checkEngineFile(engine) {
  return fs.existsSync(path.join(ENGINE_DIR, `${engine}.ts`));
}
function engineSource(engine) {
  return safeReadFile(path.join(ENGINE_DIR, `${engine}.ts`));
}
function checkImportsAlgorithms(engine) {
  return /from\s+["'][^"']*algorithms\//.test(engineSource(engine));
}
function checkImportsConstants(engine) {
  return /from\s+["'][^"']*physics\/constants/.test(engineSource(engine));
}
function checkWiki(engine)          { return _wikiBlob.includes(engine); }
function checkMemories(engine)      { return _memBlob.includes(engine); }
function checkObsidianBrain(engine) { return _memBlob.includes(engine); } // MEMORY.md is the obsidian-feed index
function checkTribal(engine)        { return _tribalBlob.includes(engine); }
function checkSystemViz(engine)     { return _sysVizBlob.includes(engine); }
function checkNnGnn(engine)         { return _nnBlob.includes(engine); }
function checkPrismAi(engine)       { return _prismAiBlob.includes(engine); }
function checkPrismOs(engine)       { return _prismOsBlob.includes(engine); }
function findDispatcherWiring(engine) {
  const hits = [];
  for (const [name, src] of _dispatcherSrcs) {
    if (src.includes(engine)) hits.push(name);
  }
  return hits;
}

// ── Audit ─────────────────────────────────────────────────────────────────
function audit() {
  const engines = listMillEngines();
  const PSN_LEGS = [
    "obsidian-brain","prism-os","wiki","memories","tribal","system-viz",
    "engines","algorithms","formulas","nn-gnn","prism-ai",
  ];
  const results = [];
  for (const eng of engines) {
    const legs = {
      "obsidian-brain": checkObsidianBrain(eng),
      "prism-os":       checkPrismOs(eng),
      "wiki":           checkWiki(eng),
      "memories":       checkMemories(eng),
      "tribal":         checkTribal(eng),
      "system-viz":     checkSystemViz(eng),
      "engines":        checkEngineFile(eng),
      "algorithms":     checkImportsAlgorithms(eng),
      "formulas":       checkImportsConstants(eng),
      "nn-gnn":         checkNnGnn(eng),
      "prism-ai":       checkPrismAi(eng),
    };
    const dispatchers = findDispatcherWiring(eng);
    const litCount = PSN_LEGS.filter((leg) => legs[leg]).length;
    results.push({
      engine: eng,
      psn_coverage_score: litCount / PSN_LEGS.length,
      legs_lit: litCount,
      legs_total: PSN_LEGS.length,
      dispatchers,
      dispatcher_count: dispatchers.length,
      legs,
      dark_legs: PSN_LEGS.filter((leg) => !legs[leg]),
    });
  }
  const totals = {
    engines_audited: results.length,
    avg_psn_coverage: results.reduce((s, r) => s + r.psn_coverage_score, 0) / Math.max(1, results.length),
    fully_synergized: results.filter((r) => r.legs_lit === PSN_LEGS.length).length,
    fully_dark: results.filter((r) => r.legs_lit === 1).length,
    unwired: results.filter((r) => r.dispatcher_count === 0).length,
  };
  const perLeg = {};
  for (const leg of PSN_LEGS) {
    perLeg[leg] = {
      lit: results.filter((r) => r.legs[leg]).length,
      dark: results.filter((r) => !r.legs[leg]).length,
      coverage_pct: results.filter((r) => r.legs[leg]).length / Math.max(1, results.length),
    };
  }
  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    generatedBy: "scripts/audit-mill-psn-coverage.mjs",
    advisoryOnly: true,
    description: "Per-engine PSN-leg coverage for the mill domain. Index-based: reads wiki/index.md, memories/_index/MEMORY.md, tribal-embed-index.json, system-graph.json, nn-graph/labels.json, AISystemRouterEngine.ts, prismOperatingSystemDispatcher.ts, and engine source. Does NOT walk wiki/memory directory contents (33K md files). Citations in non-indexed leaves are NOT detected — promote them through the index first.",
    psn_legs: PSN_LEGS,
    totals,
    per_leg: perLeg,
    engines: results.sort((a, b) => a.legs_lit - b.legs_lit),
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Mill domain — PSN coverage audit");
  lines.push("");
  lines.push(`_Generated: ${report.generatedAt} · ${report.generatedBy}_`);
  lines.push("");
  lines.push(`Audits all **${report.totals.engines_audited}** mill-domain engines (\`Mill*\` / \`Milling*\` prefix) against the 11 PSN legs.`);
  lines.push("");
  lines.push("## Totals");
  lines.push("");
  lines.push(`- Engines audited: **${report.totals.engines_audited}**`);
  lines.push(`- Avg PSN coverage: **${(report.totals.avg_psn_coverage * 100).toFixed(1)}%**`);
  lines.push(`- Fully synergized (all 11 legs lit): **${report.totals.fully_synergized}**`);
  lines.push(`- Fully dark (only engines-file leg lit): **${report.totals.fully_dark}**`);
  lines.push(`- Unwired (no dispatcher import): **${report.totals.unwired}**`);
  lines.push("");
  lines.push("## Per-leg coverage");
  lines.push("");
  lines.push("| PSN leg | Lit | Dark | Coverage |");
  lines.push("|---|---:|---:|---:|");
  for (const leg of report.psn_legs) {
    const s = report.per_leg[leg];
    lines.push(`| \`${leg}\` | ${s.lit} | ${s.dark} | ${(s.coverage_pct * 100).toFixed(1)}% |`);
  }
  lines.push("");
  lines.push("## Engines with darkest PSN coverage (top 15)");
  lines.push("");
  lines.push("| Engine | Lit legs | Dispatchers | Dark legs |");
  lines.push("|---|---:|---|---|");
  for (const r of report.engines.slice(0, 15)) {
    const disps = r.dispatchers.length === 0 ? "_(none — UNWIRED)_" : r.dispatchers.join(", ");
    lines.push(`| \`${r.engine}\` | ${r.legs_lit}/${r.legs_total} | ${disps} | ${r.dark_legs.join(", ")} |`);
  }
  lines.push("");
  lines.push("## Fully-synergized engines (all 11 legs lit)");
  lines.push("");
  const full = report.engines.filter((r) => r.legs_lit === r.legs_total);
  if (full.length === 0) {
    lines.push("_None — no mill engine connects to all 11 PSN legs._");
  } else {
    for (const r of full) lines.push(`- \`${r.engine}\` (dispatchers: ${r.dispatchers.join(", ") || "_none_"})`);
  }
  lines.push("");
  lines.push("## How to use this report");
  lines.push("");
  lines.push("1. **Find a high-leverage engine with low PSN coverage** (top of darkest table) — these are built but unsynergized; the biggest ROI is here.");
  lines.push("2. **Identify 1-2 dark legs that would multiply value** — wiki + memory entries are cheapest to add; dispatcher wiring is highest leverage if missing.");
  lines.push("3. **Promote citations through the canonical indexes** — this audit reads pre-built indexes, NOT leaf-md files. Adding a leaf wiki page without updating `wiki/index.md` won't move the needle here; that's an indexing gap separate from the engine.");
  lines.push("4. **Re-run this audit after each promotion** to confirm the engine moved from dark→lit on its target legs.");
  lines.push("");
  lines.push("**Advisory only.** Index-based audit: detects engine names cited in canonical PSN-source indexes only. Citations buried in non-indexed leaf .md files are NOT detected. Spot-check the top-15 darkest engines before bulk-promoting — a citation might already exist in a leaf that simply hasn't been catalog-promoted.");
  return lines.join("\n");
}

function main() {
  const report = audit();
  const outJson = path.join(PRISM, "state/shared/MILL-PSN-COVERAGE.json");
  const outMd   = path.join(PRISM, "state/shared/MILL-PSN-COVERAGE.md");
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(outMd, renderMarkdown(report), "utf8");
  console.log(`Mill engines audited: ${report.totals.engines_audited}`);
  console.log(`Avg PSN coverage: ${(report.totals.avg_psn_coverage * 100).toFixed(1)}%`);
  console.log(`Fully synergized: ${report.totals.fully_synergized}`);
  console.log(`Fully dark: ${report.totals.fully_dark}`);
  console.log(`Unwired: ${report.totals.unwired}`);
  console.log(`Wrote: ${path.relative(PRISM, outJson)}`);
  console.log(`Wrote: ${path.relative(PRISM, outMd)}`);
}

export { audit, renderMarkdown, listMillEngines };
main();
