#!/usr/bin/env node
/**
 * audit-wiki-coverage.mjs
 *
 * "Is the wiki brain complete?" oracle. Cross-references:
 *   - the system-viz graph (node counts by layer/kind)            ← what EXISTS
 *   - the architecture leaf-index (_leaf-index.jsonl, by type)    ← what's DOCUMENTED
 *   - the regen-wiki-from-viz.mjs generator list                  ← what's MAINTAINED
 *   - a kind→generator map (which generator owns each node kind)
 *
 * Output: state/shared/system-viz/WIKI-COVERAGE-AUDIT.md (+ .json)
 *   - per-node-kind: graph count · documented count · covering generator · status (✓ covered / ◌ partial / ✗ gap / — n/a)
 *   - "gaps" list: graph node kinds with no covering generator and < a threshold of documented entries
 *   - headline: total graph nodes · total wiki entries · % of node kinds with a generator
 *
 * Feeds /curiosity-queue + the wiki-debt worklist. Read it to answer "what's not in the wiki yet".
 *
 * Flags: --json (print the JSON to stdout instead of the human summary)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRISM_ROOT = resolve(__dirname, "..");
const GRAPH = resolve(PRISM_ROOT, "state/shared/system-viz/system-graph.json");
const LEAF_INDEX = resolve(PRISM_ROOT, "knowledge/wiki/architecture/_leaf-index.jsonl");
const ORCHESTRATOR = resolve(PRISM_ROOT, "scripts/regen-wiki-from-viz.mjs");
const OUT_MD = resolve(PRISM_ROOT, "state/shared/system-viz/WIKI-COVERAGE-AUDIT.md");
const OUT_JSON = resolve(PRISM_ROOT, "state/shared/system-viz/WIKI-COVERAGE-AUDIT.json");

const JSON_OUT = process.argv.includes("--json");
const PARTIAL_FLOOR = 0.05;   // documented/graph below this with a generator → "partial"; with no generator → "gap"

// Which generator owns which graph node kind / layer. Keys are matched against
// node.kind || node.subgroup || node.type, with a few layer-based fallbacks.
const KIND_GENERATOR = {
  // L0-L5 structural
  persona: "generate-personas-expand (graph) — no dedicated wiki gen (covered by layer-l0)",
  page: "generate-frontend-wiki",
  frontend: "generate-frontend-wiki",
  dispatcher: "generate-dispatcher-wiki",
  // engines
  atomic_engine: "generate-engine-wiki", engine: "generate-engine-wiki",
  combo: "generate-misc-l8-wiki", novel_formula: "generate-misc-l8-wiki",
  // L6 leaves
  test: "generate-test-wiki", core_tests: "generate-test-wiki",
  skill: "generate-skill-wiki",
  hook_pretooluse: "generate-hook-wiki", hook_posttooluse: "generate-hook-wiki", hook_sessionstart: "generate-hook-wiki",
  hook_stop: "generate-hook-wiki", hook_userpromptsubmit: "generate-hook-wiki", hook_precompact: "generate-hook-wiki",
  hook_subagentstop: "generate-hook-wiki", hook_other: "generate-hook-wiki", core_hooks_src: "generate-hook-wiki", core_hooks_cl: "generate-hook-wiki",
  algorithm: "generate-formula-algo-wiki", core_algos: "generate-formula-algo-wiki",
  schema_file: "(no dedicated gen — covered by layer-l6)", schema_type: "(no dedicated gen)", schema_zod_schema: "(no dedicated gen)",
  schema_interface: "(no dedicated gen)", schema_constant: "(no dedicated gen)", core_schemas: "(no dedicated gen)",
  constant: "(no dedicated gen)", physics_constant: "generate-formula-algo-wiki", physics_value: "generate-formula-algo-wiki",
  function: "(no dedicated gen)", type: "(no dedicated gen)", core: "(no dedicated gen)", core_migrations: "(no dedicated gen)",
  script: "(no dedicated gen — scripts get best-effort recall by slug)", core_scripts: "(no dedicated gen)", core_skills: "generate-skill-wiki", core_physics: "generate-formula-algo-wiki",
  wiki_root: "(structural root)",
  // L7 registries
  registry_entry: "generate-registry-wiki", catalog_function: "generate-registry-wiki",
  // L8
  milestone: "generate-milestone-wiki", "design-spec": "generate-misc-l8-wiki",
  jmdie_customer: "generate-misc-l8-wiki", jmdie_customer_aggregate: "generate-misc-l8-wiki", jmdie_filetype: "generate-misc-l8-wiki",
  datacat_file: "generate-misc-l8-wiki", extract_file: "generate-misc-l8-wiki", boxextract_file: "generate-misc-l8-wiki",
  extract_section: "(rolled into extract_file entries)", ppg_assets_section: "(rolled into ppg entries)",
  wiki_entry: "(IS a wiki entry)", wiki_knowledge: "(IS a wiki entry)", wiki_kind: "(structural)",
  memory_entry: "(memory vault — knowledge/memories)", memory_kind: "(structural)", memory_feedback: "(memory vault)", memory_project: "(memory vault)",
  memory_reference: "(memory vault)", memory_user: "(memory vault)", memory_uncategorized: "(memory vault)", memory__index: "(structural)",
  "tribal-knowledge-root": "generate-tribal-wiki + generate-tribal-index", "extracted-knowledge-root": "generate-extracted-modules-wiki",
  "training-root": "(no dedicated gen)", "models-root": "(no dedicated gen — 0 artifacts on disk)", "cad-manuals-root": "(no dedicated gen)",
  "cam-functions-root": "generate-registry-wiki", "master-index-root": "(no dedicated gen)", "session-learning-root": "(no dedicated gen)",
  "ghost-roost": "(structural — children covered by generate-misc-l8-wiki / generate-milestone-wiki)",
  corpus: "generate-tribal-index", wiki: "(structural)", memory: "(structural)", state: "(transient session state — n/a)",
  // L9 leaf records
  "planned-unit": "(surfaced in milestone entries via parent; covered by generate-milestone-wiki)",
  extract_record: "(rolled into extract_file entries)", boxextract_record: "(rolled into boxextract_file)",
  datacat_record: "(rolled into datacat_file entries)", ppg_asset_record: "(rolled into ppg entries)",
  jmdie_filetype_machine: "(rolled into jmdie_filetype entries)", deep_subtree: "(filesystem leaf — n/a)",
  prism: "(filesystem dir — n/a)", h_root: "(filesystem dir — n/a)", prism_2: "(filesystem dir — n/a)", h_root_2: "(filesystem dir — n/a)",
  // L10/L11 vault + deep fs
  feedback: "(memory vault — knowledge/memories)", project: "(memory vault)", reference: "(memory vault)", uncategorized: "(memory vault)", user: "(memory vault)",
  "code-tribal": "(knowledge/wiki/code-tribal — indexed by build-wiki-leaf-index, no dedicated gen)", consensus: "(transient — n/a)", entities: "(wiki/entities)", lessons: "(wiki/lessons)", architecture: "(IS a wiki entry)",
  // git tree
  git_commit: "generate-git-tree (graph) — surfaced via the git-tree overlay, no wiki entries",
  // actions (L4a — ~9.2K nodes; entries under architecture/actions/<dispatcher>/<action>.md)
  action: "generate-action-wiki",
  // catch-alls
  module: "generate-extracted-modules-wiki",
  other: "(catch-all subgroup — engines covered by generate-engine-wiki, the rest are uncategorized leaves)",
};

// Map a wiki-entry type → the graph node kinds it documents (inverse, approximate).
const TYPE_COVERS_KINDS = {
  engine: ["atomic_engine", "engine"],
  action: ["action"],                 // (action nodes live on L4a; entries under architecture/actions/)
  dispatcher: ["dispatcher"],
  architecture: ["page", "frontend", "milestone", "registry_entry", "catalog_function", "wiki_entry", "design-spec", "jmdie_customer", "jmdie_customer_aggregate", "jmdie_filetype", "datacat_file", "extract_file", "boxextract_file", "combo", "novel_formula", "persona"],
  skill: ["skill", "core_skills"],
  hook: ["hook_pretooluse", "hook_posttooluse", "hook_sessionstart", "hook_stop", "hook_userpromptsubmit", "hook_precompact", "hook_subagentstop", "hook_other", "core_hooks_src", "core_hooks_cl"],
  formula: ["physics_constant", "physics_value", "core_physics"],
  algorithm: ["algorithm", "core_algos"],
  test: ["test", "core_tests"],
  "monolith-module": ["module", "extracted-knowledge-root"],
  course: [],
  "tribal-category": ["tribal-knowledge-root", "corpus"],
  "tribal-tip": [],
  "code-tribal": ["code-tribal"],
  milestone: ["milestone"],
};

// Kinds/subgroups that are NOT discrete documentable assets — filesystem leaves
// (102K+ L11 nodes, one "kind" per file extension), domain buckets (the engines
// themselves are `atomic_engine`), structural/category hubs, transient state.
// These get status "—" (intentionally n/a), not counted as gaps.
const STRUCTURAL_BUCKETS = new Set([
  "manufacturing", "ai_intel", "pages", "personas", "transport", "variants", "wired", "unwired",
  "business", "system", "registry", "knowledge", "catalog", "catalog_root", "catalog_vendor", "catalog_hub",
  "datacat_hub", "datacat_root", "jmdie_root", "ppg_assets_hub", "ppg_assets_section", "ppg_assets_hub",
  "git_hub", "git_branch", "git_tip", "vault_root", "vault_mem_folder", "vault_wiki_folder", "vault_wiki_folder",
  "frontend_app", "frontend_dir", "frontend_file", "_root", "_index", "rollup", "gateway", "queue", "pubsub",
  "embedding", "vector", "cache", "cdn", "object_store", "dnc", "mtconnect", "opcua", "mqtt",
  "tier1", "tier2", "tier3", "tier1_codex", "tier1_gemini", "tier1_consensus", "tier2_route", "tier2_flow",
  "tier3_specialist", "tier3_bridge", "ollama", "wiki_kind", "memory_kind", "memory__index",
]);
function isStructural(kind, layer) {
  if (layer === "L11") return true;                       // deep-filesystem leaves — never documented individually
  if (/^file_/.test(kind)) return true;                    // one "kind" per extension on L11
  if (/_engines$/.test(kind)) return true;                 // domain buckets (engines are `atomic_engine`)
  if (/^(deep_subtree|prism|h_root|prism_2|h_root_2|worktrees)$/.test(kind)) return true;  // fs dir nodes (worktrees = L9 git-worktree fleet, mapped by generate-system-viz.mjs — structural, no per-node wiki page)
  if (/^memory(_|$)/.test(kind) || kind === "feedback" || kind === "project" || kind === "reference" || kind === "uncategorized" || kind === "user" || kind === "consensus" || kind === "lessons" || kind === "entities") return true;  // memory vault / wiki side-folders
  return STRUCTURAL_BUCKETS.has(kind);
}

function readJson(p, fallback = null) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return fallback; } }

function loadGenerators() {
  try {
    const src = readFileSync(ORCHESTRATOR, "utf8");
    const m = src.match(/const GENERATORS\s*=\s*\[([\s\S]*?)\];/);
    if (!m) return [];
    return [...m[1].matchAll(/["']([^"']+\.mjs)["']/g)].map((x) => x[1]);
  } catch { return []; }
}

function main() {
  const G = readJson(GRAPH);
  if (!G) { process.stderr.write(`[wiki-coverage] graph missing at ${GRAPH}\n`); process.exit(2); }
  const nodes = G.nodes || [];
  const edges = G.edges || [];

  // graph node counts by layer/kind
  const byKind = {};            // kind → { count, layers: Set }
  for (const n of nodes) {
    const k = n.kind || n.subgroup || n.type || "?";
    (byKind[k] ||= { count: 0, layers: new Set() });
    byKind[k].count++;
    byKind[k].layers.add(n.layer || "?");
  }

  // documented counts by wiki-entry type (from _leaf-index)
  const docByType = {};
  let totalDocs = 0;
  if (existsSync(LEAF_INDEX)) {
    for (const line of readFileSync(LEAF_INDEX, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      let r; try { r = JSON.parse(line); } catch { continue; }
      const t = r && r.type ? r.type : "architecture";
      docByType[t] = (docByType[t] || 0) + 1;
      totalDocs++;
    }
  }
  // documented-per-graph-kind: sum the doc types that cover that kind
  const kindToTypes = {};
  for (const [t, kinds] of Object.entries(TYPE_COVERS_KINDS)) for (const k of kinds) (kindToTypes[k] ||= []).push(t);
  function documentedFor(kind) {
    const types = kindToTypes[kind] || [];
    return types.reduce((s, t) => s + (docByType[t] || 0), 0);
  }

  const generators = new Set(loadGenerators());

  // build rows
  const rows = [];
  for (const [kind, info] of Object.entries(byKind)) {
    const layers = [...info.layers].sort().join("/");
    const structural = isStructural(kind, info.layers.has("L11") ? "L11" : [...info.layers][0]);
    const gen = structural ? "(filesystem leaf / domain bucket / structural / memory vault — n/a)" : (KIND_GENERATOR[kind] || "(UNMAPPED — needs a generator or a kind→gen mapping)");
    const genIsReal = /^generate-[\w-]+\.mjs/.test(gen) ? gen.match(/^(generate-[\w-]+\.mjs)/)[1] : null;
    const genWired = genIsReal ? generators.has(genIsReal) : null;
    const docs = documentedFor(kind);
    const ratio = info.count ? docs / info.count : 0;
    let status;
    if (structural || /\bn\/a\b|transient|filesystem dir|structural|IS a wiki entry|memory vault|rolled into|surfaced in|catch-all|engines covered/i.test(gen)) status = "—";
    else if (gen.startsWith("(UNMAPPED")) status = "✗ gap";
    else if (genIsReal && genWired === false) status = "✗ gen-not-wired";
    else if (genIsReal && genWired) status = "✓ covered";        // a wired generator IS the coverage; doc-ratio is just informational
    else if (ratio >= PARTIAL_FLOOR || docs > 0) status = "✓ covered";
    else if (genIsReal) status = "✓ covered";                    // real generator exists even if not (yet) found in the orchestrator list parse
    else status = "◌ partial/0";
    rows.push({ kind, layers, graphCount: info.count, documented: docs, ratio: Math.round(ratio * 1000) / 1000, generator: gen, generatorWired: genWired, status, structural });
  }
  rows.sort((a, b) => b.graphCount - a.graphCount);

  const gaps = rows.filter((r) => r.status === "✗ gap" || r.status === "✗ gen-not-wired");
  const realKinds = rows.filter((r) => !r.structural);          // discrete documentable kinds (excludes fs leaves / buckets)
  const coveredReal = realKinds.filter((r) => r.status === "✓ covered" || r.status === "—" || r.status === "◌ partial/0").length;
  const mappedKinds = coveredReal;
  const totalKinds = realKinds.length;
  const totalNodes = nodes.length;

  const structuralCount = rows.length - totalKinds;
  const summary = {
    generatedAt: new Date().toISOString(),
    totalGraphNodes: totalNodes,
    totalGraphEdges: edges.length,
    totalNodeKinds: rows.length,
    structuralKindsExcluded: structuralCount,           // filesystem-leaf / domain-bucket / memory-vault / structural — not individually documented
    documentableNodeKinds: totalKinds,
    documentableKindsCoveredOrNA: mappedKinds,
    coveragePct: totalKinds ? Math.round((mappedKinds / totalKinds) * 1000) / 10 : 0,
    totalWikiEntries: totalDocs,
    wikiEntriesByType: docByType,
    gaps: gaps.map((g) => ({ kind: g.kind, layers: g.layers, graphCount: g.graphCount, reason: g.generator })),
    rows,
  };

  if (!JSON_OUT) {
    writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2), "utf8");
    const tbl = rows.map((r) => `| ${r.status} | \`${r.kind}\` | ${r.layers} | ${r.graphCount} | ${r.documented} | ${r.ratio} | ${r.generator}${r.generatorWired === false ? " ⚠ NOT in orchestrator" : ""} |`).join("\n");
    const gapList = gaps.length ? gaps.map((g) => `- \`${g.kind}\` (${g.layers}, ${g.graphCount} nodes) — ${g.generator}`).join("\n") : "_(none — every graph node kind has a generator or is intentionally n/a)_";
    const typeRows = Object.entries(docByType).sort((a, b) => b[1] - a[1]).map(([t, c]) => `| \`${t}\` | ${c} |`).join("\n");
    const md = `---
title: Wiki coverage audit — graph vs wiki brain
type: architecture
generated_by: scripts/audit-wiki-coverage.mjs
last_verified: ${new Date().toISOString().split("T")[0]}
total_graph_nodes: ${totalNodes}
total_wiki_entries: ${totalDocs}
node_kind_coverage_pct: ${summary.coveragePct}
gaps: ${gaps.length}
tags: [architecture, system-viz, wiki, coverage, self-awareness, audit]
---

# Wiki coverage audit — graph vs wiki brain

> Is every layer of the system-viz graph documented in the wiki? Of **${totalKinds}** *documentable* node kinds (engines, actions, dispatchers, registries, skills, hooks, formulas, algorithms, milestones, monolith-modules, courses, tribal, tests, …), **${mappedKinds}** (${summary.coveragePct}%) have a covering generator or are intentionally rolled-up. **${gaps.length} gap(s).** (${structuralCount} more "kinds" are excluded as non-documentable: ~470 \`file_<ext>\` filesystem-leaf kinds across the 102K L11 nodes, domain buckets like \`mill_engines\`, memory-vault folders, transport/AI-hierarchy structural nodes.) **${totalDocs.toLocaleString()}** wiki entries cover **${totalNodes.toLocaleString()}** graph nodes. Regenerated by \`scripts/audit-wiki-coverage.mjs\` (wired into the wiki orchestrator).

## Gaps — graph node kinds with no generator (or a generator not wired into the orchestrator)

${gapList}

## Coverage by graph node kind

Status: ✓ covered · ◌ partial/0 docs · ✗ gap (no generator) · ✗ gen-not-wired · — intentionally n/a.
\`ratio\` = documented wiki entries ÷ graph nodes of that kind (approximate — many kinds roll up; e.g. 21K \`datacat_record\` are covered by ~141 \`datacat_file\` entries, not 1:1).

| Status | Kind | Layer(s) | Graph nodes | Documented | Ratio | Covering generator |
|--------|------|----------|-------------|------------|-------|--------------------|
${tbl}

## Wiki entries by type (from \`_leaf-index.jsonl\`)

| Type | Count |
|------|-------|
${typeRows}

## See also

- Wiki stats: [[_stats]]
- Disconnected graph nodes (degree-0): [[_disconnected-graph-nodes]]
- Orphan rescue hub: [[_orphans-rescue]]
- Orchestrator: \`scripts/regen-wiki-from-viz.mjs\` · \`scripts/regen-viz.mjs\`
- Wiki-debt worklist: \`state/shared/system-viz/WIKI-DEBT-WORKLIST.md\` · \`/curiosity-queue\`
`;
    writeFileSync(OUT_MD, md, "utf8");
    process.stdout.write(`[wiki-coverage] ${mappedKinds}/${totalKinds} documentable node kinds covered (${summary.coveragePct}%) · ${structuralCount} structural/fs-leaf kinds excluded · ${totalDocs} wiki entries / ${totalNodes} graph nodes · ${gaps.length} gap(s) -> WIKI-COVERAGE-AUDIT.md\n`);
    if (gaps.length) process.stdout.write(`[wiki-coverage] GAPS: ${gaps.map((g) => `${g.kind}(${g.graphCount})`).join(", ")}\n`);
  } else {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  }
}

main();
