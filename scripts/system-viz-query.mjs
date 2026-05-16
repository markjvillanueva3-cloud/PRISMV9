#!/usr/bin/env node
/**
 * system-viz-query — programmatic adapter for the live system graph.
 *
 * Lets rgs / forge / roadmap tools consume system-graph.json without
 * embedding parsing logic. Read-only.
 *
 * Usage:
 *   node scripts/system-viz-query.mjs roadmap-candidates       # unwired + pending + drift
 *   node scripts/system-viz-query.mjs blast-radius <nodeId>    # downstream edges
 *   node scripts/system-viz-query.mjs dispatcher-summary       # categories + counts
 *   node scripts/system-viz-query.mjs coverage-by-domain       # wired-ratio per domain
 *   node scripts/system-viz-query.mjs worktrees                # git worktree fleet grouped by verdict
 *   node scripts/system-viz-query.mjs find <query>             # case-insensitive node search
 *   node scripts/system-viz-query.mjs headline                 # one-line summary
 *
 * Add --json for machine-readable output (default is human-readable).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadGraph, findInGraph } from "./lib/system-viz-graph.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const cmd = args[0];
const params = args.slice(1).filter(a => a !== "--json");
const wantJson = args.includes("--json");

if (!cmd) {
  console.error("usage: system-viz-query <roadmap-candidates|build-order|blast-radius|dispatcher-summary|coverage-by-domain|worktrees|find|headline> [params] [--json]");
  process.exit(2);
}

let G;
try { G = loadGraph(); }
catch (e) {
  console.error(e.message);
  process.exit(3);
}

function out(human, machine) {
  if (wantJson) console.log(JSON.stringify(machine, null, 2));
  else console.log(human);
}

if (cmd === "headline") {
  const h = G.meta.headline; const c = G.meta.counts;
  const human =
`PRISM headline (${G.generatedAt}):
  engines:      ${c.engines.toLocaleString()}  (built ${h.built} / unwired ${h.unwired} = ${Math.round(100*h.built/c.engines)}% wired)
  dispatchers:  ${c.dispatchers}
  actions:      ${c.actions.toLocaleString()}
  tests:        ${c.tests.toLocaleString()}
  formulas:     ${c.formulas}
  wiki:         ${h.wikiEntries}
  pending FE:   ${h.pendingFE}
  drift:        ${h.drift}
  worktrees:    ${G.meta.worktrees ? `${G.meta.worktrees.total} (KEEP ${G.meta.worktrees.KEEP} / MERGE ${G.meta.worktrees.MERGE} / PRUNE ${G.meta.worktrees.PRUNE} / INVESTIGATE ${G.meta.worktrees.INVESTIGATE})` : "—"}
  graph:        ${G.nodes.length}n / ${G.edges.length}e / ${G.layers.length} layers`;
  out(human, { generatedAt: G.generatedAt, ...h, counts: c, nodes: G.nodes.length, edges: G.edges.length, worktrees: G.meta.worktrees ?? null });
}

else if (cmd === "roadmap-candidates") {
  const unwired = G.nodes
    .filter(n => n.layer === "L5" && n.subgroup === "unwired")
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .map(n => ({ kind: "unwired-domain", domain: n.label.split('\n')[0], count: n.count, priority: n.count > 50 ? "high" : "medium" }));
  const pendingMerges = G.nodes
    .filter(n => n.status === "pending_merge")
    .map(n => ({ kind: "pending-frontend-merge", id: n.id, label: n.label, stack: n.stack, priority: "high" }));
  const drift = G.meta.headline.drift;
  const candidates = [...pendingMerges, ...unwired];
  const human =
`Roadmap candidates (${candidates.length}):

PENDING MERGES (highest leverage — already-built work waiting):
${pendingMerges.length === 0 ? "  none" : pendingMerges.map(p => `  • ${p.label.replace(/\n/g,' ')} [${p.stack}]`).join("\n")}

UNWIRED ENGINE DOMAINS (top 10):
${unwired.slice(0,10).map(u => `  • ${u.domain.padEnd(14)} ${String(u.count).padStart(4)} engines  [${u.priority}]`).join("\n")}

DRIFT: ${drift} milestone(s) claim "complete" but git disagrees. Run /envelope-sync.
`;
  out(human, { pendingMerges, unwired, drift });
}

else if (cmd === "blast-radius") {
  const id = params[0];
  if (!id) { console.error("blast-radius needs <nodeId>"); process.exit(2); }
  const node = G.nodes.find(n => n.id === id);
  if (!node) { console.error(`node not found: ${id}`); process.exit(4); }
  const downstream = new Map(); // id -> depth
  const upstream = new Map();
  function walk(start, dir, maxDepth = 4) {
    const visited = new Map([[start, 0]]);
    let frontier = [start];
    for (let depth = 1; depth <= maxDepth; depth++) {
      const next = [];
      for (const f of frontier) {
        const edges = G.edges.filter(e => dir === "down" ? e.from === f : e.to === f);
        for (const e of edges) {
          const target = dir === "down" ? e.to : e.from;
          if (!visited.has(target)) { visited.set(target, depth); next.push(target); }
        }
      }
      frontier = next;
      if (frontier.length === 0) break;
    }
    visited.delete(start);
    return visited;
  }
  const dn = walk(id, "down");
  const up = walk(id, "up");
  const fmt = m => [...m.entries()].sort((a,b) => a[1]-b[1])
    .map(([nid, d]) => `  d${d}  ${(G.nodes.find(n => n.id === nid)?.label ?? nid).split('\n')[0]}`)
    .slice(0, 30).join("\n");
  const human =
`Blast radius for ${node.label.replace(/\n/g,' ')} (${id}):

DOWNSTREAM (${dn.size}):
${fmt(dn) || "  none"}

UPSTREAM (${up.size}):
${fmt(up) || "  none"}
`;
  out(human, {
    node: { id: node.id, label: node.label, layer: node.layer },
    downstream: [...dn.entries()].map(([id, depth]) => ({ id, depth })),
    upstream: [...up.entries()].map(([id, depth]) => ({ id, depth })),
  });
}

else if (cmd === "dispatcher-summary") {
  const dispNodes = G.nodes.filter(n => n.layer === "L4");
  const byCat = {};
  for (const d of dispNodes) (byCat[d.subgroup] ??= []).push(d.label);
  const human =
`Dispatchers (${dispNodes.length} total):
${Object.entries(byCat).map(([cat, list]) =>
  `  [${cat}] (${list.length}):\n    ${list.sort().join(", ")}`
).join("\n\n")}`;
  out(human, byCat);
}

else if (cmd === "coverage-by-domain") {
  const l5 = G.nodes.filter(n => n.layer === "L5");
  const wired = l5.filter(n => n.subgroup === "wired").reduce((s, n) => s + (n.count ?? 0), 0);
  const unwired = l5.filter(n => n.subgroup === "unwired").reduce((s, n) => s + (n.count ?? 0), 0);
  const total = wired + unwired;
  const lines = l5
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .map(n => `  ${(n.subgroup === "wired" ? "✓" : "○")} ${n.label.split('\n')[0].padEnd(14)} ${String(n.count ?? 0).padStart(4)}`);
  const human =
`Coverage by domain (${wired}/${total} = ${Math.round(100*wired/total)}% wired):

${lines.join("\n")}`;
  out(human, { wired, unwired, total, ratio: wired / total, domains: l5.map(n => ({ label: n.label.split('\n')[0], count: n.count, subgroup: n.subgroup })) });
}

else if (cmd === "find") {
  const q = params.join(" ");
  if (!q.trim()) { console.error("find needs <query>"); process.exit(2); }
  const hits = findInGraph(G, q, { limit: 30 });
  const human =
`Found ${hits.length} node(s) matching "${q.toLowerCase()}":
${hits.map(h => `  ${h.layer}/${h.subgroup ?? '_'}  ${h.id.padEnd(28)} ${h.label.split('\n')[0]}`).join("\n")}`;
  out(human, hits);
}

else if (cmd === "worktrees") {
  // Git worktree fleet — the L9 `worktrees` subgroup mapped in by
  // generate-system-viz.mjs (which reuses audit-worktrees.mjs). Grouped by
  // verdict so the land-ready / safe-to-prune trees surface first.
  // U-VIZ-WORKTREE-MAP-EXT (2026-05-15) — DRAINED + PARKED are ghost nodes for
  // archive-tagged worktrees that have been removed from the live fleet but
  // whose history is recoverable via `git checkout <tag>`. Surface them so the
  // drain trail is queryable, not just visible in the 3D map.
  const KNOWN_VERDICTS = ["MERGE", "PRUNE", "INVESTIGATE", "KEEP", "PARKED", "DRAINED"];
  const wts = G.nodes.filter(n => n.layer === "L9" && n.subgroup === "worktrees" && n.id !== "wt.root");
  const summary = (G.meta && G.meta.worktrees) ? G.meta.worktrees : null;
  const byVerdict = { MERGE: [], PRUNE: [], INVESTIGATE: [], KEEP: [], PARKED: [], DRAINED: [] };
  for (const n of wts) {
    // Any node missing a known verdict (stale graph format) falls into
    // INVESTIGATE so it still surfaces rather than being silently dropped.
    const v = KNOWN_VERDICTS.includes(n.verdict) ? n.verdict : "INVESTIGATE";
    byVerdict[v].push(n);
  }
  const liveCount = byVerdict.KEEP.length + byVerdict.MERGE.length + byVerdict.PRUNE.length + byVerdict.INVESTIGATE.length;
  const ghostCount = byVerdict.PARKED.length + byVerdict.DRAINED.length;
  const lines = [];
  lines.push(`Git worktrees (${liveCount} live + ${ghostCount} archived${summary && summary.base ? `, base ${summary.base}` : ""}):`);
  if (summary) {
    lines.push(`  KEEP ${summary.KEEP ?? 0} · MERGE ${summary.MERGE ?? 0} · PRUNE ${summary.PRUNE ?? 0} · INVESTIGATE ${summary.INVESTIGATE ?? 0}`);
    if ((summary.archived_total ?? 0) > 0) {
      lines.push(`  📦 PARKED ${summary.PARKED ?? 0} · DRAINED ${summary.DRAINED ?? 0} (archive-tagged, recoverable)`);
    }
  } else {
    lines.push("  (no meta.worktrees summary — graph predates worktree mapping; regenerate via scripts/generate-system-viz.mjs)");
  }
  lines.push("");
  // MERGE/PRUNE first (actionable: land or remove), INVESTIGATE, KEEP, then
  // archived (PARKED → merge candidates, DRAINED → SHA-only pins) last.
  for (const v of KNOWN_VERDICTS) {
    const rows = byVerdict[v].slice().sort((a, b) => (b.ahead ?? -1) - (a.ahead ?? -1));
    if (!rows.length) continue;
    lines.push(`${v} (${rows.length}):`);
    for (const r of rows) {
      const nm = r.label ? r.label.split("\n")[0] : r.id;
      const br = r.branch || "(detached)";
      const dirty = r.dirtyCount ? ` dirty:${r.dirtyCount}` : "";
      const owner = r.owner && r.owner.alive ? " ⚠ALIVE-OWNER" : "";
      const locked = r.locked ? " 🔒locked" : "";
      // For ghost rows: replace +/- (n/a) with the archive tag + WIP hint.
      if (v === "PARKED" || v === "DRAINED") {
        const tag = r.archive_tag ? ` 📦${r.archive_tag.replace(/^archive\//, "")}` : "";
        const wip = (r.wip_patch_bytes && r.wip_patch_bytes > 0) ? ` WIP:${r.wip_patch_bytes}b` : "";
        const sha = r.archive_sha ? ` sha:${String(r.archive_sha).slice(0, 8)}` : "";
        lines.push(`  · ${nm.padEnd(30)} (archived ${r.archive_date ?? "?"})${tag}${sha}${wip}`);
      } else {
        lines.push(`  · ${nm.padEnd(30)} [${br}]  +${r.ahead ?? "?"}/-${r.behind ?? "?"}${dirty}${owner}${locked}`);
      }
    }
    lines.push("");
  }
  if (wts.length === 0) {
    lines.push("  (no worktree nodes in graph — regenerate via scripts/generate-system-viz.mjs)");
  }
  out(lines.join("\n"), {
    summary,
    count: wts.length,
    liveCount,
    archivedCount: ghostCount,
    worktrees: wts.map(n => ({
      id: n.id,
      name: n.label ? n.label.split("\n")[0] : n.id,
      branch: n.branch ?? null,
      verdict: KNOWN_VERDICTS.includes(n.verdict) ? n.verdict : "INVESTIGATE",
      ahead: n.ahead ?? null,
      behind: n.behind ?? null,
      dirtyCount: n.dirtyCount ?? null,
      locked: !!n.locked,
      detached: !!n.detached,
      path: n.worktreePath ?? null,
      lastCommitIso: n.lastCommitIso ?? null,
      owner: n.owner ?? null,
      reasons: Array.isArray(n.reasons) ? n.reasons : [],
      // U-VIZ-WORKTREE-MAP-EXT — archive enrichment (null on live-only nodes).
      archive_tag: n.archive_tag ?? null,
      archive_status: n.archive_status ?? null,
      archive_date: n.archive_date ?? null,
      archive_sha: n.archive_sha ?? null,
      wip_patch_path: n.wip_patch_path ?? null,
      wip_patch_bytes: n.wip_patch_bytes ?? 0,
      ghost: !!n.ghost,
    })),
  });
}

else if (cmd === "build-order") {
  const r = G.meta?.roadmap;
  if (!r) { console.error("No roadmap metadata in graph; regenerate via scripts/generate-system-viz.mjs"); process.exit(5); }
  const lines = [];
  lines.push(`# PRISM Atomic-First Master Roadmap`);
  lines.push(``);
  lines.push(`Generated from system-viz at ${G.generatedAt}.`);
  lines.push(``);
  lines.push(`**Principle:** ${r.principle}`);
  lines.push(``);
  lines.push(`## Headline state`);
  lines.push(`- Engines: ${G.meta.counts.engines.toLocaleString()} (${G.meta.headline.built} wired = ${Math.round(100 * G.meta.headline.built / G.meta.counts.engines)}%)`);
  lines.push(`- Unwired: ${G.meta.headline.unwired}`);
  lines.push(`- Pending FE: ${G.meta.headline.pendingFE}`);
  lines.push(`- Drift: ${G.meta.headline.drift}`);
  lines.push(``);
  for (const p of r.phases) {
    lines.push(`## Phase ${p.phase} — ${p.name}`);
    lines.push(``);
    lines.push(`> ${p.reason}`);
    lines.push(``);
    if (!p.items?.length) { lines.push(`_No items_`); lines.push(``); continue; }
    for (const it of p.items) {
      if (it.kind === "wire-up") {
        lines.push(`- **${it.domain}** — ${it.engineCount} engines unwired · suggested dispatchers: ${(it.suggestedDispatchers ?? []).join(", ") || "_none_"} · leverage **${it.leverageScore}**`);
      } else if (it.kind === "frontend-merge") {
        lines.push(`- **Merge** \`${it.id}\` (${it.label}) [${it.stack}]`);
      } else if (it.kind === "drift") {
        lines.push(`- **Drift** — ${it.count} milestones to reconcile · ${it.action}`);
      } else if (it.kind === "atomic") {
        lines.push(`- ${it.id} — ${it.label}`);
      } else if (it.kind === "policy") {
        lines.push(`- _Policy_: ${it.note}`);
      } else {
        lines.push(`- ${JSON.stringify(it)}`);
      }
    }
    lines.push(``);
  }
  const md = lines.join("\n");
  if (wantJson) console.log(JSON.stringify(r, null, 2));
  else console.log(md);
}

else {
  console.error(`unknown command: ${cmd}`);
  process.exit(2);
}
