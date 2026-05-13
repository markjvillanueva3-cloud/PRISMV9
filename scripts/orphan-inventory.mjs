#!/usr/bin/env node
/**
 * orphan-inventory.mjs — Built-but-unwired audit punch list
 *
 * OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-INVENTORY.
 *
 * Reads system-graph.json + applies the same classifier as iter 2's
 * MasterIndexEngine.classifyAllNodes() to find "orphan" nodes (low
 * in-degree + low out-degree + has wiki/memory docs). Groups them by
 * layer and by heuristic dispatcher hint (name-based pattern matching
 * — e.g. "Cutting"/"Force"/"Kienzle" → prism_calc).
 *
 * Output: state/shared/ORPHAN-INVENTORY.md — a structured punch list
 * the model can consume via /orphan-inventory or a wiring sweep can
 * iterate over. Each entry: id, label, layer, wiki entries, suggested
 * dispatcher target with rationale.
 *
 * Usage:
 *   node scripts/orphan-inventory.mjs           # writes md
 *   node scripts/orphan-inventory.mjs --json    # machine-readable
 *   node scripts/orphan-inventory.mjs --top 50  # cap at 50 (default 100)
 */

import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const GRAPH_PATH = path.join(ROOT, "state/shared/system-viz/system-graph.json");
const BUILD_STATE_PATH = path.join(ROOT, "state/shared/BUILD_STATE.json");
const OUTPUT_PATH = path.join(ROOT, "state/shared/ORPHAN-INVENTORY.md");

const HIGH_DEGREE_PCTILE = 0.85;
const LOW_DEGREE = 1;
const EXCLUDED_LAYERS = new Set(["L9", "L11"]);
const DEFAULT_TOP_K = 100;

const args = process.argv.slice(2);
const wantJson = args.includes("--json");
const topIdx = args.indexOf("--top");
const topK = topIdx >= 0 ? Math.max(1, parseInt(args[topIdx + 1], 10) || DEFAULT_TOP_K) : DEFAULT_TOP_K;

/**
 * Heuristic dispatcher hint for an orphan, based on name patterns.
 * Returns { dispatcher, rationale } or null if no clear match.
 */
const DISPATCHER_HEURISTICS = [
  { re: /\b(kienzle|cutting.?force|specific.?energy|chip.?load|mrr|tool.?force)\b/i, dispatcher: "prism_calc", reason: "force/physics" },
  { re: /\b(speed.?feed|sfm|rpm|chip.?thinning)\b/i, dispatcher: "prism_calc", reason: "speed/feed" },
  { re: /\b(taylor|tool.?life|wear|weibull)\b/i, dispatcher: "prism_calc", reason: "tool-life" },
  { re: /\b(thermal|heat|temperature|cryogenic)\b/i, dispatcher: "prism_calc", reason: "thermal" },
  { re: /\b(deflection|stiffness|cantilever|natural.?frequency)\b/i, dispatcher: "prism_calc", reason: "mechanics" },
  { re: /\b(chatter|stability.?lobe|regen|damping)\b/i, dispatcher: "prism_calc", reason: "stability" },
  { re: /\b(surface.?finish|ra\b|roughness|integrity)\b/i, dispatcher: "prism_calc", reason: "surface" },
  { re: /\b(safety|collision|envelope|s\(x\))\b/i, dispatcher: "prism_safety", reason: "safety gate" },
  { re: /\b(lathe|turning|okuma|mazak|grooving|threading.?cycle)\b/i, dispatcher: "prism_turning", reason: "turning domain" },
  { re: /\b(mill|milling|3.?axis|2\.5d)\b/i, dispatcher: "prism_cam", reason: "milling domain" },
  { re: /\b(5.?axis|multi.?axis|tilt|swivel)\b/i, dispatcher: "prism_5axis", reason: "5-axis" },
  { re: /\b(wedm|wire.?edm|sodick)\b/i, dispatcher: "prism_cam", reason: "wire-EDM (cam tree)" },
  { re: /\b(grind|sinker.?edm|laser|waterjet)\b/i, dispatcher: "prism_cam", reason: "specialty machining" },
  { re: /\b(cad|geometry|feature.?recogn|step|iges|dxf|stl|nurbs)\b/i, dispatcher: "prism_cad", reason: "CAD/geometry" },
  { re: /\b(post|gcode|fanuc|haas|siemens|controller)\b/i, dispatcher: "prism_cam", reason: "post-processor" },
  { re: /\b(quote|cost|estimat|business|invoice|erp)\b/i, dispatcher: "prism_intelligence", reason: "business/ERP" },
  { re: /\b(material|registry|tribal|catalog|database)\b/i, dispatcher: "prism_data", reason: "data/registry" },
  { re: /\b(memory|recall|qdrant|embed|semantic)\b/i, dispatcher: "prism_memory", reason: "memory layer" },
  { re: /\b(hook|coordination|chat.?bus|claim)\b/i, dispatcher: "prism_session", reason: "session/coordination" },
  { re: /\b(reason|deep.?learn|ml|neural|trans?former|llm)\b/i, dispatcher: "prism_ai", reason: "reasoning/ML" },
  { re: /\b(test|vitest|fixture|mock)\b/i, dispatcher: "prism_dev", reason: "dev/test" },
  { re: /\b(monitor|metric|telemetry|dashboard)\b/i, dispatcher: "prism_telemetry", reason: "telemetry" },
];

function suggestDispatcher(label, id) {
  const text = `${label} ${id}`;
  for (const h of DISPATCHER_HEURISTICS) {
    if (h.re.test(text)) {
      return { dispatcher: h.dispatcher, reason: h.reason };
    }
  }
  return null;
}

function safeJson(p) {
  try {
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf8"));
  } catch { return null; }
}

function entryName(e) {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    if (typeof e.name === "string") return e.name;
    if (typeof e.path === "string") return e.path;
  }
  return "";
}

function pctile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(Math.floor(sorted.length * p), sorted.length - 1)];
}

function buildInventory() {
  const graph = safeJson(GRAPH_PATH);
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return { error: "graph missing or malformed", path: GRAPH_PATH };
  }

  const inDeg = new Map();
  const outDeg = new Map();
  for (const e of graph.edges) {
    if (!e || typeof e.from !== "string" || typeof e.to !== "string") continue;
    inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);
    outDeg.set(e.from, (outDeg.get(e.from) ?? 0) + 1);
  }

  const filtered = graph.nodes.filter((n) =>
    n && typeof n.id === "string" && !EXCLUDED_LAYERS.has(n.layer ?? ""));
  const inHigh = pctile(filtered.map((n) => inDeg.get(n.id) ?? 0), HIGH_DEGREE_PCTILE);
  const outHigh = pctile(filtered.map((n) => outDeg.get(n.id) ?? 0), HIGH_DEGREE_PCTILE);

  // Collect orphans only.
  const orphans = [];
  for (const n of filtered) {
    const inD = inDeg.get(n.id) ?? 0;
    const outD = outDeg.get(n.id) ?? 0;
    const wiki = (n.knowledge?.wikiEntries ?? []).map(entryName).filter(Boolean);
    const mem = (n.knowledge?.memoryEntries ?? []).map(entryName).filter(Boolean);
    const hasDocs = wiki.length > 0 || mem.length > 0;
    const isLowIn = inD <= LOW_DEGREE;
    const isLowOut = outD <= LOW_DEGREE;
    if (isLowIn && isLowOut && hasDocs && !(inD >= inHigh && inD > LOW_DEGREE)) {
      const hint = suggestDispatcher(n.label ?? n.id, n.id);
      orphans.push({
        id: n.id,
        label: (n.label ?? n.id).split("\n")[0].slice(0, 80),
        layer: n.layer ?? "?",
        status: n.status ?? "?",
        inDeg: inD,
        outDeg: outD,
        wikiTop: wiki.slice(0, 3),
        memTop: mem.slice(0, 2),
        suggestedDispatcher: hint?.dispatcher ?? null,
        suggestionReason: hint?.reason ?? null,
      });
    }
  }

  // Sort: layer asc, then label asc.
  orphans.sort((a, b) => a.layer.localeCompare(b.layer) || a.label.localeCompare(b.label));

  // Group by layer for the markdown render.
  const byLayer = {};
  for (const o of orphans) {
    if (!byLayer[o.layer]) byLayer[o.layer] = [];
    byLayer[o.layer].push(o);
  }

  // Group by suggested dispatcher for the dispatcher-prioritized view.
  const byDispatcher = {};
  for (const o of orphans) {
    const key = o.suggestedDispatcher ?? "_unsuggested";
    if (!byDispatcher[key]) byDispatcher[key] = [];
    byDispatcher[key].push(o);
  }

  // ACTIONABLE LAYER: BUILD_STATE.NEEDS_WIRING.sample_engines — these are
  // real engine files on disk that no dispatcher imports. Unlike the graph
  // orphans above (which are mostly L7 registry / L8 state pseudo-nodes),
  // these are concrete engine classes ready to be wired.
  const buildState = safeJson(BUILD_STATE_PATH);
  const buildStateSample = buildState?.NEEDS_WIRING?.sample_engines ?? [];
  const buildStateTopDomains = buildState?.NEEDS_WIRING?.top_domains ?? [];
  const buildStateSummary = buildState?.NEEDS_WIRING?.summary ?? null;

  // Normalize each entry to a stable shape + group by suggested dispatcher.
  const unwiredEngines = buildStateSample
    .map((e) => {
      if (typeof e !== "object" || !e) return null;
      const name = typeof e.name === "string" ? e.name : null;
      if (!name) return null;
      // BUILD_STATE pre-computes its own suggestedDispatcher heuristic; if
      // it returned UNKNOWN, fall through to our own DISPATCHER_HEURISTICS
      // so a second opinion gets surfaced when the first lacked confidence.
      const buildStateSuggestion =
        typeof e.suggestedDispatcher === "string" && !/^unknown/i.test(e.suggestedDispatcher)
          ? e.suggestedDispatcher
          : null;
      const ourHint = !buildStateSuggestion ? suggestDispatcher(name, name) : null;
      return {
        name,
        suggestedDispatcher: buildStateSuggestion ?? ourHint?.dispatcher ?? null,
        suggestionReason:
          buildStateSuggestion ? "BUILD_STATE.NEEDS_WIRING heuristic" :
          ourHint?.reason ?? null,
        mtime: typeof e.mtime === "string" ? e.mtime : null,
        path: typeof e.path === "string" ? e.path : null,
      };
    })
    .filter(Boolean);

  const unwiredByDispatcher = {};
  for (const u of unwiredEngines) {
    const key = u.suggestedDispatcher ?? "_unsuggested";
    if (!unwiredByDispatcher[key]) unwiredByDispatcher[key] = [];
    unwiredByDispatcher[key].push(u);
  }

  return {
    generatedAt: new Date().toISOString(),
    graphMtime: existsSync(GRAPH_PATH) ? new Date(statSync(GRAPH_PATH).mtimeMs).toISOString() : null,
    totalOrphans: orphans.length,
    cappedAt: Math.min(orphans.length, topK),
    orphans: orphans.slice(0, topK),
    byLayer,
    byDispatcher,
    thresholds: { inHigh, outHigh, lowDegree: LOW_DEGREE, highPctile: HIGH_DEGREE_PCTILE },
    // BUILD_STATE-derived actionable section.
    buildState: {
      summary: buildStateSummary,
      topDomains: buildStateTopDomains,
      unwiredEngines,
      byDispatcher: unwiredByDispatcher,
      mtime: existsSync(BUILD_STATE_PATH)
        ? new Date(statSync(BUILD_STATE_PATH).mtimeMs).toISOString()
        : null,
    },
  };
}

function renderMarkdown(inv) {
  const lines = [];
  lines.push(`# PRISM Orphan Inventory — built-but-unwired audit punch list`);
  lines.push("");
  lines.push(`> Generated **${inv.generatedAt}** · graph mtime ${inv.graphMtime ?? "—"}`);
  lines.push(`> Total orphans: **${inv.totalOrphans}** · showing top **${inv.cappedAt}**`);
  lines.push(`> Source: \`scripts/orphan-inventory.mjs\` · regenerate any time`);
  lines.push("");
  lines.push(`## What is an "orphan"?`);
  lines.push(`A node with **low in-degree (≤1)** AND **low out-degree (≤1)** but **has wiki/memory documentation**. Someone documented it (so it's intentional, not random) but the graph shows no callers/callees. **Most likely candidates for wiring** rather than deletion.`);
  lines.push("");
  lines.push(`## By suggested dispatcher (heuristic name-based grouping)`);
  lines.push("");
  const dispatcherKeys = Object.keys(inv.byDispatcher).sort((a, b) =>
    (inv.byDispatcher[b].length) - (inv.byDispatcher[a].length));
  for (const dk of dispatcherKeys) {
    const arr = inv.byDispatcher[dk];
    const label = dk === "_unsuggested" ? "(no heuristic match — manual review)" : `**${dk}**`;
    lines.push(`### ${label} — ${arr.length} orphan(s)`);
    for (const o of arr.slice(0, 20)) {
      const docs = [...o.wikiTop, ...o.memTop].slice(0, 2).join(", ");
      const reason = o.suggestionReason ? ` _(${o.suggestionReason})_` : "";
      lines.push(`- \`${o.layer}/${o.status}\` **${o.label}** — id=\`${o.id}\`${reason}`);
      if (docs) lines.push(`  - docs: ${docs}`);
    }
    if (arr.length > 20) lines.push(`- _...+${arr.length - 20} more_`);
    lines.push("");
  }
  lines.push(`## By layer`);
  lines.push("");
  const layerKeys = Object.keys(inv.byLayer).sort();
  for (const lk of layerKeys) {
    const arr = inv.byLayer[lk];
    lines.push(`- ${lk}: ${arr.length} orphan(s)`);
  }
  lines.push("");

  // BUILD_STATE-derived actionable wiring section.
  const bs = inv.buildState;
  if (bs && bs.unwiredEngines && bs.unwiredEngines.length > 0) {
    lines.push("");
    lines.push(`## 🔌 Actionable unwired engines (from BUILD_STATE.NEEDS_WIRING)`);
    lines.push("");
    lines.push(`> ${bs.summary ?? "No summary."} BUILD_STATE mtime: ${bs.mtime ?? "?"}`);
    lines.push("");
    lines.push(`Unlike graph orphans above (mostly L7 registry / L8 state pseudo-nodes), these are concrete engine class files on disk with NO dispatcher importing them. Each has a pre-computed dispatcher suggestion — pick one, add action enum + schema + case branch.`);
    lines.push("");
    if (Array.isArray(bs.topDomains) && bs.topDomains.length > 0) {
      lines.push(`**Top unwired domains** (full graph, not just sample): ${bs.topDomains.slice(0, 8).map((d) => `${d.domain} (${d.count})`).join(" · ")}`);
      lines.push("");
    }
    const dispatchers = Object.keys(bs.byDispatcher).sort();
    for (const disp of dispatchers) {
      const list = bs.byDispatcher[disp];
      if (!list.length) continue;
      const heading = disp === "_unsuggested" ? "(no suggestion — manual review)" : `**${disp}**`;
      lines.push(`### ${heading} — ${list.length} engine(s)`);
      for (const u of list) {
        const reason = u.suggestionReason ? ` _(${u.suggestionReason})_` : "";
        const mtime = u.mtime ? ` · mtime ${u.mtime.slice(0, 10)}` : "";
        lines.push(`- **${u.name}**${reason}${mtime}`);
      }
      lines.push("");
    }
  }

  lines.push(`---`);
  lines.push(`_Drill: \`/master-index <orphan-name>\` for full provenance · \`/utilization-dashboard\` for the full classifier output · \`/awareness-snapshot\` for the rolled-up digest._`);
  lines.push(`_Thresholds: high-degree ≥${inv.thresholds.inHigh} (in) / ≥${inv.thresholds.outHigh} (out) at ${Math.round(inv.thresholds.highPctile * 100)}th pct; low ≤${inv.thresholds.lowDegree}._`);
  return lines.join("\n");
}

const inv = buildInventory();
if (inv.error) {
  process.stderr.write(`[orphan-inventory] ${inv.error}: ${inv.path ?? ""}\n`);
  process.exit(1);
}

if (wantJson) {
  process.stdout.write(JSON.stringify(inv, null, 2));
  process.exit(0);
}

const md = renderMarkdown(inv);
writeFileSync(OUTPUT_PATH, md);
const hinted = inv.orphans.filter((o) => o.suggestedDispatcher).length;
process.stdout.write(
  `wrote ${OUTPUT_PATH}\n` +
  `  total orphans: ${inv.totalOrphans} (showing ${inv.cappedAt})\n` +
  `  heuristic-hinted: ${hinted}/${inv.cappedAt}\n` +
  `  thresholds: in≥${inv.thresholds.inHigh} out≥${inv.thresholds.outHigh}\n`,
);
process.exit(0);
