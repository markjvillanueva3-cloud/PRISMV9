#!/usr/bin/env node
/**
 * awareness-snapshot.mjs — one-shot PRISM awareness report
 *
 * OBSIDIAN-PRISM-OS-MS0/U-AWARENESS-SNAPSHOT.
 *
 * Dogfoods MasterIndexEngine.classifyAllNodes() + BUILD_STATE.json +
 * MILESTONE_PROGRESS.json into a single human-readable + agent-readable
 * report at `state/shared/AWARENESS-SNAPSHOT.md`. Designed to be:
 *   - Cron-able (regenerates on schedule for cross-session pickup)
 *   - Cheap (mtime-friendly inputs, no external service required)
 *   - Self-contained (one .mjs file, no compiled deps)
 *
 * Outputs a 60-line markdown digest answering:
 *   "What's built? What's wired? What's not being used? What's drifted?"
 *
 * Inputs (all pre-existing, this script does NOT regenerate them):
 *   - state/shared/system-viz/system-graph.json  (110K nodes)
 *   - state/shared/BUILD_STATE.json
 *   - state/shared/MILESTONE_PROGRESS.json
 *
 * Output: state/shared/AWARENESS-SNAPSHOT.md (overwritten on each run).
 *
 * Usage:
 *   node scripts/awareness-snapshot.mjs
 *   node scripts/awareness-snapshot.mjs --json   # machine-readable, no md write
 *
 * Exit 0 on success; exit 1 if no input files are readable.
 */

import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const GRAPH_PATH = path.join(ROOT, "state/shared/system-viz/system-graph.json");
// U-GCF-AWARENESS-FAILSOFT (alpha 2026-06-01): smaller fallback when the merged graph exceeds V8's string limit.
const ARCH_GRAPH_PATH = path.join(ROOT, "state/shared/system-viz/architecture-graph.json");
const BUILD_STATE_PATH = path.join(ROOT, "state/shared/BUILD_STATE.json");
const MILESTONE_PROGRESS_PATH = path.join(ROOT, "state/shared/MILESTONE_PROGRESS.json");
// U-GCF-AWARENESS-WIRE: galaxy-context federation feed-up artifacts (fail-soft inputs)
const GALAXY_DIGEST_PATH = path.join(ROOT, "state/shared/galaxy-cards/MASTER-DIGEST.json");
const GALAXY_KNOWS_PATH = path.join(ROOT, "state/shared/galaxy-cards/KNOWS-MAP.json");
const OUTPUT_PATH = path.join(ROOT, "state/shared/AWARENESS-SNAPSHOT.md");

const HIGH_DEGREE_PCTILE = 0.85;
const LOW_DEGREE = 1;
const TOP_K = 15;
const EXCLUDED_LAYERS = new Set(["L9", "L11"]);

const wantJson = process.argv.includes("--json");

// ---------- helpers ----------

function safeJson(p) {
  try {
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf8"));
  } catch { return null; }
}

function pctile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function entryName(e) {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    if (typeof e.name === "string") return e.name;
    if (typeof e.path === "string") return e.path;
  }
  return "";
}

// Orphan vs ghost — AUTO-INVOCATION-MS0/U-AIM03 fix (2026-05-16).
//
// Previous rule: hasDocs (= node had any wiki/memory edge) → orphan, else ghost.
// Problem: the wiki-edge augmenter attaches inconsistently; nearly every built
// engine had zero wiki edges → classified as ghost. AWARENESS-SNAPSHOT.md
// reported 281,683 ghost / 0 orphan across a 372K-node graph (F4 in
// state/shared/specs/STALE-NODES-AUDIT-2026-05-16.md). Every chat read "0
// orphans" via awareness-snapshot-inject and concluded nothing needed
// documenting — when reality was 1,348 wired engines without wiki entries.
//
// New rule: a node is an ORPHAN when it's BUILT (status === "built" OR
// has-source-file evidence) AND has low in/out degree — i.e., real artifact
// on disk that nothing references. That's the actual punch list. Ghost is
// the residual: low-degree AND not built (e.g., filesystem leaves, prose-
// roadmap units that never landed). Doc presence is a secondary signal —
// kept in the returned shape for callers that want it but no longer
// load-bearing for the binary orphan/ghost split.
function isBuiltArtifact(node) {
  if (node?.status === "built") return true;
  // Fallback heuristics for graphs missing the status field:
  const id = String(node?.id || "");
  // built engine/hook/skill/dispatcher/script identifiers have a path-style or
  // dotted-namespace shape pointing into the repo.
  if (/\b(engines?|hooks?|scripts?|dispatchers?|skills?|helpers?)\b/i.test(id)) return true;
  // Filesystem layer L12 is fs leaves (millions of files); these are ghosts by definition.
  if (node?.layer === "L12") return false;
  return false;
}

function classify(node, inDeg, outDeg, hasDocs, inHigh, outHigh) {
  const isHighIn = inDeg >= inHigh && inDeg > LOW_DEGREE;
  const isHighOut = outDeg >= outHigh && outDeg > LOW_DEGREE;
  const isLowIn = inDeg <= LOW_DEGREE;
  const isLowOut = outDeg <= LOW_DEGREE;
  if (isHighIn && isHighOut) return "hub";
  if (isHighIn && isLowOut) return "sink";
  if (isHighOut && isLowIn) return "source";
  if (isLowIn && isLowOut) {
    return isBuiltArtifact(node) ? "orphan" : "ghost";
  }
  return "normal";
}

/**
 * AWARENESS-READINESS (2026-05-19) — pure: derive "ready to use" figures from
 * BUILD_STATE.COVERAGE_BY_DOMAIN.
 *
 * "Built" alone is NOT "usable" — an engine with no dispatcher reference
 * (NEEDS_WIRING) is on disk but cannot be invoked. Ready-to-use = built ∩
 * wired. That is the figure an operator actually needs: what capability is
 * live RIGHT NOW, vs. what is built-but-dark.
 *
 * @param {object|null} buildState — parsed BUILD_STATE.json
 * @returns {{readyToUse:number, builtButUnwired:number, totalBuilt:number,
 *   coveragePct:number, topUnwiredDomains:Array}|null} — null when
 *   COVERAGE_BY_DOMAIN is absent/empty (caller surfaces a degraded warning).
 */
export function computeReadiness(buildState) {
  const cov = buildState?.COVERAGE_BY_DOMAIN;
  if (!cov || !Array.isArray(cov.rows) || cov.rows.length === 0) return null;
  let wired = 0, unwired = 0, total = 0;
  for (const r of cov.rows) {
    wired += Number(r?.wired) || 0;
    unwired += Number(r?.unwired) || 0;
    total += Number(r?.total) || 0;
  }
  // Domains with the biggest unwired backlog — the "wire these next" punch
  // list, ranked by how much dark capability each unlocks.
  const topUnwiredDomains = [...cov.rows]
    .filter((r) => (Number(r?.unwired) || 0) > 0)
    .sort((a, b) => (Number(b?.unwired) || 0) - (Number(a?.unwired) || 0))
    .slice(0, 8)
    .map((r) => ({
      domain: String(r?.domain ?? "?"),
      wired: Number(r?.wired) || 0,
      unwired: Number(r?.unwired) || 0,
      total: Number(r?.total) || 0,
      coveragePct: Number(r?.coverage_pct) || 0,
    }));
  return {
    readyToUse: wired,
    builtButUnwired: unwired,
    totalBuilt: total,
    coveragePct: total > 0 ? Math.round((wired / total) * 100) : 0,
    topUnwiredDomains,
  };
}

// ---------- core ----------

function buildSnapshot() {
  const warnings = [];
  let graph = safeJson(GRAPH_PATH);
  let graphSource = "system-graph.json";
  let graphDegraded = false;
  // U-GCF-AWARENESS-FAILSOFT (alpha 2026-06-01): the merged system-graph.json (~663MB) exceeds V8's
  // readFileSync string limit (0x1fffffe8) -> safeJson returns null -> awareness was frozen 8 days. Fall back
  // to the smaller architecture-graph.json (generate-system-viz base, ~50K nodes) so awareness stays FRESH
  // (utilization DEGRADED to the architecture subset, loudly flagged). sierra's streaming graph-read supersedes this.
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    const fallback = safeJson(ARCH_GRAPH_PATH);
    if (fallback && Array.isArray(fallback.nodes) && Array.isArray(fallback.edges)) {
      graph = fallback;
      graphSource = "architecture-graph.json";
      graphDegraded = true;
      warnings.push("system-graph.json unreadable (663MB > V8 string limit) — utilization computed from architecture-graph.json (DEGRADED: ~50K-node architecture subset, NOT the full merged graph; counts undercount orphans/ghosts). Fix: streaming graph-read (sierra).");
    }
  }
  const buildState = safeJson(BUILD_STATE_PATH);
  const progress = safeJson(MILESTONE_PROGRESS_PATH);

  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return { error: "no readable graph (system-graph.json + architecture-graph.json both unavailable)", path: GRAPH_PATH };
  }

  // --- Edge degrees ---
  const inDegree = new Map();
  const outDegree = new Map();
  for (const e of graph.edges) {
    if (!e || typeof e.from !== "string" || typeof e.to !== "string") continue;
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    outDegree.set(e.from, (outDegree.get(e.from) ?? 0) + 1);
  }

  // --- Filter graph to semantic layers ---
  const filtered = graph.nodes.filter((n) =>
    n && typeof n.id === "string" &&
    !EXCLUDED_LAYERS.has(n.layer ?? "")
  );

  const inDegrees = filtered.map((n) => inDegree.get(n.id) ?? 0);
  const outDegrees = filtered.map((n) => outDegree.get(n.id) ?? 0);
  const inHigh = pctile(inDegrees, HIGH_DEGREE_PCTILE);
  const outHigh = pctile(outDegrees, HIGH_DEGREE_PCTILE);

  // --- Classify ---
  const totals = { hub: 0, sink: 0, source: 0, orphan: 0, ghost: 0, normal: 0 };
  const byLayer = {};
  const rows = [];

  for (const n of filtered) {
    const inD = inDegree.get(n.id) ?? 0;
    const outD = outDegree.get(n.id) ?? 0;
    const wikiCount = (n.knowledge?.wikiEntries ?? []).filter((e) => entryName(e)).length;
    const memCount = (n.knowledge?.memoryEntries ?? []).filter((e) => entryName(e)).length;
    const hasDocs = wikiCount > 0 || memCount > 0;
    const cls = classify(n, inD, outD, hasDocs, inHigh, outHigh);

    totals[cls] += 1;
    const layerKey = n.layer ?? "?";
    if (!byLayer[layerKey]) byLayer[layerKey] = { hub: 0, sink: 0, source: 0, orphan: 0, ghost: 0, normal: 0 };
    byLayer[layerKey][cls] += 1;

    rows.push({
      id: n.id,
      label: (n.label ?? n.id).split("\n")[0].slice(0, 80),
      layer: layerKey,
      status: n.status ?? "?",
      inDeg: inD,
      outDeg: outD,
      cls,
      hasDocs,
    });
  }

  const topHubs = rows.filter((r) => r.cls === "hub")
    .sort((a, b) => (b.inDeg + b.outDeg) - (a.inDeg + a.outDeg))
    .slice(0, TOP_K);
  const topOrphans = rows.filter((r) => r.cls === "orphan")
    .sort((a, b) => b.inDeg + b.outDeg - (a.inDeg + a.outDeg))
    .slice(0, TOP_K);
  const topGhostsByLayer = {};
  for (const r of rows) {
    if (r.cls !== "ghost") continue;
    if (!topGhostsByLayer[r.layer]) topGhostsByLayer[r.layer] = 0;
    topGhostsByLayer[r.layer] += 1;
  }

  // --- Drift summary from MILESTONE_PROGRESS ---
  let driftCount = 0;
  let topDrift = [];
  if (progress?.milestones) {
    const drifted = progress.milestones.filter((m) => m.drift && m.drift !== "n/a" && m.drift !== "consistent");
    driftCount = drifted.length;
    topDrift = drifted
      .sort((a, b) => (b.shipped ?? 0) - (a.shipped ?? 0))
      .slice(0, 5)
      .map((m) => ({ id: m.id, claimed: m.claimedStatus, derived: m.derivedStatus, shipped: m.shipped, total: m.total }));
  } else {
    warnings.push("MILESTONE_PROGRESS.json unavailable");
  }

  // --- BUILD_STATE headline ---
  const headline = buildState?.headline ?? {};
  const buildSummary = {
    builtEngines: headline.built_engines ?? "?",
    builtWithWiki: headline.built_with_wiki ?? "?",
    needsWiring: headline.needs_wiring ?? "?",
    needsBuilding: headline.needs_building_active_units ?? "?",
    pendingFE: headline.needs_frontend_merge_count ?? "?",
    drift: headline.drift_milestones ?? "?",
  };

  // --- Readiness: "ready to use" = built ∩ wired (BUILD_STATE COVERAGE_BY_DOMAIN) ---
  const readiness = computeReadiness(buildState);
  if (!readiness) {
    warnings.push("BUILD_STATE.COVERAGE_BY_DOMAIN unavailable — readiness section degraded");
  }

  // Galaxy federation feed-up (U-GCF-AWARENESS-WIRE): surface the hub-and-spoke roll-up so a fresh
  // chat learns the salience-ranked digest + who-knows-what map exist. Fail-soft: missing files → null.
  const galaxyDigest = safeJson(GALAXY_DIGEST_PATH);
  const galaxyKnows = safeJson(GALAXY_KNOWS_PATH);
  if (!galaxyDigest && !galaxyKnows) {
    warnings.push("galaxy federation (MASTER-DIGEST/KNOWS-MAP) unavailable — federation section degraded");
  }
  const federation = (!galaxyDigest && !galaxyKnows) ? null : (() => {
    const ranked = Array.isArray(galaxyDigest?.ranked) ? galaxyDigest.ranked : [];
    return {
      galaxyCount: Number(galaxyDigest?.galaxyCount) || ranked.length || (Number(galaxyKnows?.totalGalaxies) || 0),
      generatedAt: galaxyDigest?.generatedAt || galaxyKnows?.generatedAt || null,
      knowsTokens: Number(galaxyKnows?.tokenCount) || 0,
      knowsTopics: Number(galaxyKnows?.topTopics) || 0,
      topGalaxies: ranked.slice(0, 5).map((r) => ({ galaxy: String(r?.galaxy ?? "?"), salience: Number(r?.salience) || 0, role: String(r?.role ?? "") })),
    };
  })();

  return {
    generatedAt: new Date().toISOString(),
    graphSource,
    graphDegraded,
    graphMtime: existsSync(GRAPH_PATH) ? new Date(statSync(GRAPH_PATH).mtimeMs).toISOString() : null,
    inputs: {
      graph: existsSync(GRAPH_PATH),
      buildState: existsSync(BUILD_STATE_PATH),
      progress: existsSync(MILESTONE_PROGRESS_PATH),
    },
    graph: {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      filteredNodes: filtered.length,
      inHighThreshold: inHigh,
      outHighThreshold: outHigh,
    },
    utilizationTotals: totals,
    byLayer,
    topHubs,
    topOrphans,
    ghostsByLayer: topGhostsByLayer,
    drift: { count: driftCount, top: topDrift },
    buildSummary,
    readiness,
    federation,
    warnings,
  };
}

export function renderMarkdown(s) {
  const lines = [];
  lines.push(`# PRISM Awareness Snapshot`);
  lines.push("");
  lines.push(`> Generated **${s.generatedAt}** · graph mtime ${s.graphMtime ?? "—"}`);
  lines.push(`> One-shot session warmup: built/wired/utilized/drifted in 60 lines.`);
  lines.push(`> Regenerate: \`node scripts/awareness-snapshot.mjs\` · or via \`/awareness-snapshot\` skill.`);
  lines.push("");
  lines.push(`## Headline (from BUILD_STATE)`);
  const b = s.buildSummary;
  lines.push(`- **${b.builtEngines}** engines built · **${b.builtWithWiki}** with wiki entry`);
  lines.push(`- **${b.needsWiring}** engines on disk with no dispatcher reference (NEEDS_WIRING)`);
  lines.push(`- **${b.needsBuilding}** roadmap units pending across active milestones`);
  lines.push(`- **${b.pendingFE}** frontend merge(s) pending · **${b.drift}** envelope drift case(s)`);
  lines.push("");
  lines.push(`## Ready to use (built AND wired — invokable now)`);
  if (s.readiness) {
    const r = s.readiness;
    lines.push(`- **${r.readyToUse}** engines wired & ready to use — invokable via a dispatcher right now.`);
    lines.push(`- **${r.builtButUnwired}** engines built but UNWIRED — on disk, NOT invokable until wired.`);
    lines.push(`- **${r.coveragePct}%** dispatcher coverage (${r.readyToUse} of ${r.totalBuilt} domain-tracked engines wired).`);
    lines.push(`  > _"domain-tracked" buckets every engine file by domain; the Headline's "engines built" uses a narrower scan — different denominators, each correct in its own frame._`);
    if (r.topUnwiredDomains.length > 0) {
      lines.push(`- Largest unwired backlog — wire these to unlock the most capability:`);
      for (const d of r.topUnwiredDomains) {
        lines.push(`  - **${d.domain}**: ${d.wired}/${d.total} wired (${d.coveragePct}%) · ${d.unwired} unwired`);
      }
    }
  } else {
    lines.push(`_BUILD_STATE.COVERAGE_BY_DOMAIN unavailable — regenerate: \`node scripts/build-state-snapshot.mjs\`._`);
  }
  lines.push("");
  lines.push(`## Graph utilization (filtered to semantic layers L0..L8 + L10)`);
  lines.push(`Scanned **${s.graph.filteredNodes.toLocaleString()}** of **${s.graph.nodes.toLocaleString()}** nodes (excluded L9 fs-root + L11 fs-leaves).`);
  lines.push(`HIGH-degree threshold: in≥${s.graph.inHighThreshold} · out≥${s.graph.outHighThreshold} (≥${Math.round(HIGH_DEGREE_PCTILE * 100)}th percentile).`);
  lines.push("");
  const t = s.utilizationTotals;
  lines.push(`| Class | Count | What it means |`);
  lines.push(`|-------|-------|---------------|`);
  lines.push(`| **hub** | ${t.hub} | high in + high out — central infrastructure |`);
  lines.push(`| **sink** | ${t.sink} | high in + low out — well-used utility |`);
  lines.push(`| **source** | ${t.source} | low in + high out — driver / orchestrator |`);
  lines.push(`| **orphan** | ${t.orphan} | low in + low out, BUILT artifact — built but under-utilized (punch list) |`);
  lines.push(`| **ghost** | ${t.ghost} | low in + low out, not-built — dead-code / fs-leaf / unrealized roadmap candidate |`);
  lines.push(`| **normal** | ${t.normal} | functioning, ordinary usage |`);
  lines.push("");
  lines.push(`## Top hubs (most-connected — central nervous system)`);
  if (s.topHubs.length === 0) {
    lines.push(`_None — no nodes meet the hub criteria at current thresholds._`);
  } else {
    for (const h of s.topHubs.slice(0, 10)) {
      lines.push(`- [${h.layer}/${h.status}] **${h.label}** (in ${h.inDeg} · out ${h.outDeg})`);
    }
  }
  lines.push("");
  lines.push(`## Top orphans (built + documented + unwired — fix candidates)`);
  if (s.topOrphans.length === 0) {
    lines.push(`_None — no orphans found._`);
  } else {
    for (const o of s.topOrphans.slice(0, 10)) {
      lines.push(`- [${o.layer}/${o.status}] **${o.label}** (in ${o.inDeg} · out ${o.outDeg})`);
    }
  }
  lines.push("");
  lines.push(`## Ghost density by layer (dead-code candidates per layer)`);
  const ghostEntries = Object.entries(s.ghostsByLayer).sort((a, b) => b[1] - a[1]);
  if (ghostEntries.length === 0) {
    lines.push(`_None._`);
  } else {
    for (const [layer, count] of ghostEntries.slice(0, 10)) {
      lines.push(`- ${layer}: ${count}`);
    }
  }
  lines.push("");
  lines.push(`## Galaxy Federation (hub-and-spoke context roll-up)`);
  if (s.federation) {
    const f = s.federation;
    lines.push(`- **${f.galaxyCount}** galaxy brains rolled up · KNOWS-MAP indexes **${f.knowsTokens}** capability tokens / **${f.knowsTopics}** top topics.`);
    lines.push(`- Feed-up digest \`state/shared/galaxy-cards/MASTER-DIGEST.md\` — inject ONE ranked digest instead of re-reading 34 galaxy brains.`);
    lines.push(`- Who-knows-what: \`node scripts/galaxy-knows-map.mjs who <topic>\` (1 lookup → which galaxy holds context on X).`);
    if (f.topGalaxies.length > 0) {
      lines.push(`- Top galaxies by salience:`);
      for (const g of f.topGalaxies) lines.push(`  - **${g.galaxy}** (salience ${g.salience.toFixed(2)}) — ${g.role}`);
    }
  } else {
    lines.push(`_Galaxy federation artifacts unavailable — regenerate: \`node scripts/galaxy-rollup.mjs build\` + \`node scripts/galaxy-knows-map.mjs build\`._`);
  }
  lines.push("");
  lines.push(`## Milestone drift (envelope vs git reality)`);
  lines.push(`**${s.drift.count}** milestone(s) drifted. Top by shipped count:`);
  if (s.drift.top.length === 0) {
    lines.push(`_None — all envelopes consistent with git._`);
  } else {
    for (const d of s.drift.top) {
      lines.push(`- **${d.id}** — claimed \`${d.claimed}\` / derived \`${d.derived}\` (${d.shipped}/${d.total} shipped)`);
    }
  }
  lines.push("");
  if (s.warnings.length > 0) {
    lines.push(`## Warnings`);
    for (const w of s.warnings) lines.push(`- ${w}`);
    lines.push("");
  }
  lines.push(`---`);
  lines.push(`_Sources: \`state/shared/system-viz/system-graph.json\`, \`state/shared/BUILD_STATE.json\`, \`state/shared/MILESTONE_PROGRESS.json\`, \`state/shared/galaxy-cards/MASTER-DIGEST.json\`, \`KNOWS-MAP.json\`._`);
  lines.push(`_Drill-down: \`/master-index <query>\` (search) · \`/utilization-dashboard\` (full per-node classification) · \`/system-viz\` (3D viewer)._`);
  return lines.join("\n");
}

// ---------- main ----------

function runMain() {
  const snap = buildSnapshot();
  if (snap.error) {
    process.stderr.write(`[awareness-snapshot] ${snap.error}: ${snap.path ?? ""}\n`);
    process.exit(1);
  }

  if (wantJson) {
    process.stdout.write(JSON.stringify(snap, null, 2));
    process.exit(0);
  }

  const md = renderMarkdown(snap);
  writeFileSync(OUTPUT_PATH, md);
  process.stdout.write(
    `wrote ${OUTPUT_PATH}\n` +
    `  ready-to-use:${snap.readiness?.readyToUse ?? "?"}  unwired:${snap.readiness?.builtButUnwired ?? "?"}  ` +
    `coverage:${snap.readiness?.coveragePct ?? "?"}%\n` +
    `  hubs:${snap.utilizationTotals.hub}  sinks:${snap.utilizationTotals.sink}  ` +
    `sources:${snap.utilizationTotals.source}  orphans:${snap.utilizationTotals.orphan}  ` +
    `ghosts:${snap.utilizationTotals.ghost}  normal:${snap.utilizationTotals.normal}\n` +
    `  drift:${snap.drift.count}  scanned:${snap.graph.filteredNodes}/${snap.graph.nodes}\n`,
  );
  process.exit(0);
}

// Run only when invoked as a script — not when a test imports computeReadiness
// / renderMarkdown. buildSnapshot() reads the ~370 MB system graph and writes
// the snapshot file; running it on a mere import would be slow + destructive.
// FAIL-OPEN: if the argv/import.meta probe throws, default to running.
const __isMain = (() => {
  try {
    const argv1 = (process.argv[1] || "").replace(/\\/g, "/");
    const argv1Base = argv1.split("/").pop() || "";
    return argv1Base.length > 0
      && import.meta.url.replace(/\\/g, "/").endsWith(argv1Base);
  } catch { return true; }
})();
if (__isMain) runMain();
