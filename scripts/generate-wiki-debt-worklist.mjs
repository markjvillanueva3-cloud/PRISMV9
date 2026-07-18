#!/usr/bin/env node
/**
 * generate-wiki-debt-worklist.mjs — turn the docs-coverage overlay into an action queue.
 *
 * The 📚 docs-coverage overlay in the brain viewer shows *where* the knowledge debt
 * is (engines / dispatchers with no wiki page, dimmed). This generator turns that into
 * a *worklist*: scan system-graph.json, find the L4 (dispatcher) + L5 (engine) nodes
 * that are either (a) wholly undocumented — no `node.knowledge.wikiEntries` at all — or
 * (b) weakly covered — fuzzy wiki refs exist but none looks like a dedicated page for
 * this node (its name doesn't appear in any referenced wiki path). Rank both lists by
 * connectivity (in+out edge degree — a proxy for "how much else depends on understanding
 * this") and `node.unlocks.leverageScore` when present. Emit a ranked
 * `state/shared/system-viz/WIKI-DEBT-WORKLIST.md` of `run /wiki-ingest <name>` tasks —
 * a chat with idle budget pops the top item; feeds `/curiosity-queue`.
 *
 * Wired into scripts/regen-viz.mjs (post-merge, runs after the executive briefing).
 * Manual run:  node --max-old-space-size=8192 scripts/generate-wiki-debt-worklist.mjs
 * (the graph is ~119 MB; regen-viz passes the heap flag automatically.)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const OUT = path.join(ROOT, "state", "shared", "system-viz", "WIKI-DEBT-WORKLIST.md");
const TOP_N = 80;                 // per-section cap in the rendered worklist

function nameSlug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, ""); }

function main() {
  let G;
  try { G = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8"))); }
  catch (e) { console.error(`[wiki-debt] cannot read graph: ${e.message}`); process.exit(0); }

  // edge degree (in + out) per node id
  const deg = new Map();
  for (const e of G.edges || []) {
    const a = e.from || e.source, b = e.to || e.target;
    if (a) deg.set(a, (deg.get(a) || 0) + 1);
    if (b) deg.set(b, (deg.get(b) || 0) + 1);
  }

  const cand = G.nodes.filter((n) => (n.layer === "L4" || n.layer === "L5"));
  const rows = [];
  for (const n of cand) {
    const wiki = (n.knowledge && Array.isArray(n.knowledge.wikiEntries)) ? n.knowledge.wikiEntries : [];
    const slug = nameSlug(n.label || n.id);
    // "dedicated page" heuristic: some referenced wiki path/title carries this node's name
    const dedicated = slug.length >= 4 && wiki.some((w) => nameSlug(w.path || "").includes(slug) || nameSlug(w.title || "").includes(slug));
    const tier = wiki.length === 0 ? "none" : (dedicated ? "ok" : "weak");
    if (tier === "ok") continue;
    rows.push({
      id: n.id,
      label: n.label || n.id,
      layer: n.layer,
      kind: n.layer === "L4" ? "dispatcher" : (n.subgroup === "domain_rollup" || n.subgroup === "domain" ? "engine-domain" : "engine"),
      domain: n.domain || "",
      status: n.status || "",
      degree: deg.get(n.id) || 0,
      leverage: (n.unlocks && typeof n.unlocks.leverageScore === "number") ? n.unlocks.leverageScore : 0,
      fuzzyRefs: wiki.length,
      tier,
      file: n.file || (n.layer === "L5" ? `mcp-server/src/engines/${(n.label || "").replace(/[^A-Za-z0-9]/g, "")}.ts` : ""),
    });
  }
  const score = (r) => r.leverage * 1000 + r.degree;
  rows.sort((a, b) => score(b) - score(a));
  const none = rows.filter((r) => r.tier === "none");
  const weak = rows.filter((r) => r.tier === "weak");

  const now = new Date().toISOString();
  const L = [];
  L.push(`# Wiki-Debt Worklist — documentation backlog for the system-viz brain`);
  L.push("");
  L.push(`> Auto-generated ${now} by \`scripts/generate-wiki-debt-worklist.mjs\` (regenerated in the \`/system-viz\` build pass). Companion to the brain viewer's 📚 docs-coverage overlay (\`D\` key) — that overlay shows *where* the debt is; this is *what to do about it*, ranked. Pop the top item, run \`/wiki-ingest <name>\`, commit, regen. Feeds \`/curiosity-queue\`.`);
  L.push("");
  L.push(`**Scope:** L4 dispatchers + L5 engines only (the layers a dedicated wiki page is expected for). **Ranking:** \`leverageScore × 1000 + edge-degree\` (highest = most depended-on). "Dedicated page" = some referenced wiki path/title contains the node's name; "fuzzy refs only" = wiki entries were token-matched to this node but none is *its* page.`);
  L.push("");
  L.push(`| | count |`);
  L.push(`|---|--:|`);
  L.push(`| 🔴 **No wiki at all** (top priority) | ${none.length} |`);
  L.push(`| 🟡 **Fuzzy refs only — no dedicated page** | ${weak.length} |`);
  L.push(`| ✅ Has a dedicated page (not listed) | ${cand.length - rows.length} of ${cand.length} L4+L5 nodes |`);
  L.push("");

  const renderRows = (list, label) => {
    L.push(`## ${label} — top ${Math.min(TOP_N, list.length)} of ${list.length}`);
    L.push("");
    if (!list.length) { L.push(`_(none — every node in this tier is covered)_`); L.push(""); return; }
    L.push(`| # | Node | Kind | Domain | Status | Degree | Leverage | Fuzzy refs | Action |`);
    L.push(`|--:|---|---|---|---|--:|--:|--:|---|`);
    list.slice(0, TOP_N).forEach((r, i) => {
      const cmd = r.kind === "dispatcher" ? `\`/wiki-page ${r.label}\`` : `\`/wiki-ingest ${r.label}\``;
      L.push(`| ${i + 1} | \`${r.label}\` | ${r.kind} | ${r.domain || "—"} | ${r.status || "—"} | ${r.degree} | ${r.leverage || "—"} | ${r.fuzzyRefs} | ${cmd} |`);
    });
    L.push("");
  };
  renderRows(none, "🔴 No wiki at all");
  renderRows(weak, "🟡 Fuzzy refs only");

  L.push(`---`);
  L.push(`*Regenerate by hand: \`node --max-old-space-size=8192 scripts/generate-wiki-debt-worklist.mjs\`. The graph's per-node \`knowledge.wikiEntries\` come from \`scripts/system-viz-obsidian-bridge-v2.mjs\` (refreshed in \`regen-viz --full\`) — if this list looks stale, that's the upstream to re-run.*`);
  L.push("");

  fs.writeFileSync(OUT, L.join("\n"), "utf8");
  console.log(`[wiki-debt] wrote WIKI-DEBT-WORKLIST.md — ${none.length} undocumented + ${weak.length} weakly-covered of ${cand.length} L4+L5 nodes (top by leverage×degree)`);
  if (none[0]) console.log(`[wiki-debt]   #1 priority: ${none[0].label} (${none[0].kind}, degree ${none[0].degree}, leverage ${none[0].leverage || 0})`);
}
main();
