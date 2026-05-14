#!/usr/bin/env node
/**
 * orphan-inventory.mjs — Built-but-unwired audit punch list
 *
 * OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-INVENTORY.
 * Extended by CLEANUP-MS0/U-CLEANUP-F1 — see §F1 EXTENSION below.
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
 * § F1 EXTENSION (U-CLEANUP-F1):
 *   - Calls WiringPotentialEngine.analyzeBatch over the BUILD_STATE
 *     unwired-engine sample to produce a RANKED-CANDIDATE column —
 *     each unwired engine gets a wiring-potential score so a wiring
 *     sweep can pick the highest-leverage targets first.
 *   - Caps the rendered dashboard at OUTPUT_CAP_BYTES (200 KB) — past
 *     the cap, the markdown is truncated with a "[...truncated]" marker
 *     so the file never blows the chat-bus-inject budget.
 *   - Writes a companion state/shared/ORPHAN-INVENTORY-summary.md — a
 *     <5 KB digest (counts + top-10 ranked candidates) safe to inject.
 *   - The WiringPotential call is BEST-EFFORT + injectable (`analyzeBatch`
 *     seam): if the engine can't be loaded (no dist build), the ranked
 *     column degrades to "—" and the rest of the inventory still renders.
 *
 * Usage:
 *   node scripts/orphan-inventory.mjs            # writes md + summary.md
 *   node scripts/orphan-inventory.mjs --json     # machine-readable
 *   node scripts/orphan-inventory.mjs --top 50   # cap at 50 (default 100)
 *   node scripts/orphan-inventory.mjs --no-rank  # skip WiringPotential ranking
 */

import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = "H:/prism";
const GRAPH_PATH = path.join(ROOT, "state/shared/system-viz/system-graph.json");
const BUILD_STATE_PATH = path.join(ROOT, "state/shared/BUILD_STATE.json");
const OUTPUT_PATH = path.join(ROOT, "state/shared/ORPHAN-INVENTORY.md");
const SUMMARY_PATH = path.join(ROOT, "state/shared/ORPHAN-INVENTORY-summary.md");

const HIGH_DEGREE_PCTILE = 0.85;
const LOW_DEGREE = 1;
const EXCLUDED_LAYERS = new Set(["L9", "L11"]);
const DEFAULT_TOP_K = 100;

// F1: hard cap on the rendered dashboard so it never blows the
// chat-bus-inject / context-window budget. 200 KB per envelope spec.
export const OUTPUT_CAP_BYTES = 200 * 1024;
// F1: the summary digest is meant to be cheap to inject — keep it small.
export const SUMMARY_TOP_RANKED = 10;

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

/**
 * F1: parse the CLI flags. Extracted to a testable function so the F1
 * extension can be unit-tested without spawning the script.
 */
export function parseArgs(argv) {
  const out = { json: false, topK: DEFAULT_TOP_K, rank: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--no-rank") out.rank = false;
    else if (a === "--top") {
      const n = parseInt(argv[i + 1], 10);
      out.topK = Number.isFinite(n) && n > 0 ? n : DEFAULT_TOP_K;
      i++;
    }
  }
  return out;
}

/**
 * F1: rank the BUILD_STATE unwired engines via WiringPotentialEngine.analyzeBatch.
 *
 * Best-effort + injectable. The default path attempts to dynamically import
 * the built engine from `mcp-server/dist`. If the engine isn't available
 * (no dist build, or the export shape changed), this returns a map of
 * `{ engineName -> null }` and the caller renders "—" in the ranked column —
 * the rest of the inventory is unaffected.
 *
 * Test seam: `opts.analyzeBatch` lets a unit test inject a fake batch analyzer
 * so the F1 extension is hermetically testable.
 *
 * @param {Array<{name:string}>} unwiredEngines
 * @param {{ analyzeBatch?: (names:string[]) => Promise<Array<{name:string,score:number,rationale?:string}>> }} [opts]
 * @returns {Promise<{ source: string, byName: Record<string, {score:number|null,rationale:string|null}> }>}
 */
export async function rankUnwiredEngines(unwiredEngines, opts = {}) {
  const names = (unwiredEngines ?? [])
    .map((e) => (e && typeof e.name === "string" ? e.name : null))
    .filter(Boolean);
  const byName = {};
  for (const n of names) byName[n] = { score: null, rationale: null };

  if (names.length === 0) return { source: "empty", byName };

  // Injected seam (tests + future MCP-routed callers).
  if (typeof opts.analyzeBatch === "function") {
    try {
      const results = await opts.analyzeBatch(names);
      if (Array.isArray(results)) {
        for (const r of results) {
          if (r && typeof r.name === "string" && r.name in byName) {
            const score = Number.isFinite(r.score) ? r.score : null;
            byName[r.name] = { score, rationale: typeof r.rationale === "string" ? r.rationale : null };
          }
        }
      }
      return { source: "injected", byName };
    } catch {
      return { source: "injected_error", byName };
    }
  }

  // Default path: try to load the built WiringPotentialEngine. Best-effort —
  // a missing dist build degrades the ranked column to "—" without failing
  // the whole inventory run.
  //
  // Test seam: `opts.distPath` lets a unit test point at a guaranteed-missing
  // path so the `engine_not_built` branch is exercised deterministically and
  // fast — importing the real dist engine pulls the whole engine dependency
  // graph (~15s) which would otherwise time out the test.
  try {
    const distPath = opts.distPath ?? path.join(ROOT, "mcp-server/dist/engines/WiringPotentialEngine.js");
    if (!existsSync(distPath)) return { source: "engine_not_built", byName };
    // @vite-ignore: this is a runtime file:// path resolved at call time —
    // Vite must NOT try to statically analyse / bundle it (it isn't a module
    // graph dependency; it's a best-effort optional dist load).
    const mod = await import(/* @vite-ignore */ pathToFileUrl(distPath));
    const engine = mod.wiringPotentialEngine ?? mod.default ?? null;
    if (!engine || typeof engine.analyzeBatch !== "function") {
      return { source: "engine_no_analyzeBatch", byName };
    }
    const results = await engine.analyzeBatch(names);
    if (Array.isArray(results)) {
      for (const r of results) {
        if (r && typeof r.name === "string" && r.name in byName) {
          const score = Number.isFinite(r.score) ? r.score : null;
          byName[r.name] = { score, rationale: typeof r.rationale === "string" ? r.rationale : null };
        }
      }
    }
    return { source: "engine", byName };
  } catch {
    return { source: "engine_load_error", byName };
  }
}

function pathToFileUrl(p) {
  // Minimal Windows-safe file:// URL builder for dynamic import().
  const resolved = path.resolve(p).replace(/\\/g, "/");
  return resolved.startsWith("/") ? `file://${resolved}` : `file:///${resolved}`;
}

/**
 * F1: enforce the OUTPUT_CAP_BYTES dashboard cap. If the rendered markdown
 * exceeds the cap, truncate at a line boundary and append a marker so a
 * reader knows the file was cut. Pure.
 */
export function applyOutputCap(markdown, capBytes = OUTPUT_CAP_BYTES) {
  const buf = Buffer.from(markdown, "utf-8");
  if (buf.length <= capBytes) return { markdown, truncated: false, bytes: buf.length };
  // Truncate to capBytes minus room for the marker, then back up to a newline.
  const marker = `\n\n---\n_⚠ Output capped at ${Math.round(capBytes / 1024)} KB — ${buf.length - capBytes} bytes truncated. Run with --json for the full set._\n`;
  const markerBytes = Buffer.byteLength(marker, "utf-8");
  let slice = buf.subarray(0, Math.max(0, capBytes - markerBytes)).toString("utf-8");
  const lastNl = slice.lastIndexOf("\n");
  if (lastNl > 0) slice = slice.slice(0, lastNl);
  return { markdown: slice + marker, truncated: true, bytes: Buffer.byteLength(slice + marker, "utf-8") };
}

/**
 * F1: render the companion summary digest — counts + the top ranked wiring
 * candidates. Designed to stay under ~5 KB so it's cheap to inject. Pure.
 */
export function renderSummary(inv) {
  const lines = [];
  lines.push(`# Orphan Inventory — summary digest`);
  lines.push("");
  lines.push(`> Generated ${inv.generatedAt} · companion to ORPHAN-INVENTORY.md`);
  lines.push("");
  lines.push(`- Graph orphans: **${inv.totalOrphans}**`);
  const bs = inv.buildState ?? {};
  const unwired = bs.unwiredEngines ?? [];
  lines.push(`- BUILD_STATE unwired-engine sample: **${unwired.length}**`);
  if (inv.ranking) {
    lines.push(`- WiringPotential ranking source: \`${inv.ranking.source}\``);
    const ranked = unwired
      .map((u) => ({ name: u.name, ...(inv.ranking.byName[u.name] ?? { score: null }) }))
      .filter((r) => Number.isFinite(r.score))
      .sort((a, b) => b.score - a.score);
    lines.push(`- Ranked candidates with a score: **${ranked.length}**`);
    lines.push("");
    if (ranked.length > 0) {
      lines.push(`## Top ${Math.min(SUMMARY_TOP_RANKED, ranked.length)} wiring candidates (by WiringPotential score)`);
      lines.push("");
      for (const r of ranked.slice(0, SUMMARY_TOP_RANKED)) {
        const rationale = r.rationale ? ` — _${r.rationale}_` : "";
        lines.push(`- **${r.name}** · score \`${r.score.toFixed(3)}\`${rationale}`);
      }
    } else {
      lines.push("");
      lines.push(`_No scored candidates — WiringPotentialEngine ${inv.ranking.source === "engine_not_built" ? "not built (run npm run build:fast)" : "returned no scores"}._`);
    }
  }
  lines.push("");
  lines.push(`---`);
  lines.push(`_Full punch list: \`state/shared/ORPHAN-INVENTORY.md\` · regenerate: \`node scripts/orphan-inventory.mjs\`_`);
  return lines.join("\n");
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

export function buildInventory(topK = DEFAULT_TOP_K) {
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

export function renderMarkdown(inv) {
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
    // F1: pull the WiringPotential ranking map (if present) so each engine
    // can carry a ranked-candidate score column.
    const rankByName = inv.ranking?.byName ?? {};
    if (inv.ranking) {
      lines.push(`**WiringPotential ranking** — source \`${inv.ranking.source}\`. ` +
        `Engines below carry a \`score\` column when the engine returned one ` +
        `(higher = better wiring candidate).`);
      lines.push("");
    }

    const dispatchers = Object.keys(bs.byDispatcher).sort();
    for (const disp of dispatchers) {
      const list = bs.byDispatcher[disp];
      if (!list.length) continue;
      const heading = disp === "_unsuggested" ? "(no suggestion — manual review)" : `**${disp}**`;
      lines.push(`### ${heading} — ${list.length} engine(s)`);
      // F1: within each dispatcher group, sort by WiringPotential score desc
      // so the highest-leverage candidates surface first.
      const sortedList = [...list].sort((a, b) => {
        const sa = rankByName[a.name]?.score;
        const sb = rankByName[b.name]?.score;
        const na = Number.isFinite(sa) ? sa : -1;
        const nb = Number.isFinite(sb) ? sb : -1;
        return nb - na;
      });
      for (const u of sortedList) {
        const reason = u.suggestionReason ? ` _(${u.suggestionReason})_` : "";
        const mtime = u.mtime ? ` · mtime ${u.mtime.slice(0, 10)}` : "";
        const rk = rankByName[u.name];
        const scoreCol = rk && Number.isFinite(rk.score)
          ? ` · **score \`${rk.score.toFixed(3)}\`**`
          : (inv.ranking ? ` · score —` : "");
        lines.push(`- **${u.name}**${scoreCol}${reason}${mtime}`);
      }
      lines.push("");
    }
  }

  lines.push(`---`);
  lines.push(`_Drill: \`/master-index <orphan-name>\` for full provenance · \`/utilization-dashboard\` for the full classifier output · \`/awareness-snapshot\` for the rolled-up digest._`);
  lines.push(`_Thresholds: high-degree ≥${inv.thresholds.inHigh} (in) / ≥${inv.thresholds.outHigh} (out) at ${Math.round(inv.thresholds.highPctile * 100)}th pct; low ≤${inv.thresholds.lowDegree}._`);
  return lines.join("\n");
}

/**
 * F1: full run — build inventory, attach WiringPotential ranking, render,
 * cap, write both the dashboard and the summary digest. Returns a stats
 * object; throws nothing (errors surface in the returned `error` field).
 *
 * Test seam: `opts.analyzeBatch` + `opts.writeFile` injectable.
 */
export async function runOrphanInventory(opts = {}) {
  const topK = opts.topK ?? DEFAULT_TOP_K;
  const rank = opts.rank !== false;
  const inv = buildInventory(topK);
  if (inv.error) return { error: inv.error, path: inv.path };

  // F1: WiringPotential ranking over the BUILD_STATE unwired-engine sample.
  if (rank) {
    inv.ranking = await rankUnwiredEngines(inv.buildState?.unwiredEngines ?? [], opts);
  }

  if (opts.json) return { json: true, inventory: inv };

  const rawMd = renderMarkdown(inv);
  const capped = applyOutputCap(rawMd, opts.capBytes ?? OUTPUT_CAP_BYTES);
  const summary = renderSummary(inv);

  const writer = opts.writeFile ?? ((p, body) => writeFileSync(p, body));
  writer(OUTPUT_PATH, capped.markdown);
  writer(SUMMARY_PATH, summary);

  const hinted = inv.orphans.filter((o) => o.suggestedDispatcher).length;
  const rankedCount = inv.ranking
    ? Object.values(inv.ranking.byName).filter((v) => Number.isFinite(v.score)).length
    : 0;
  return {
    ok: true,
    outputPath: OUTPUT_PATH,
    summaryPath: SUMMARY_PATH,
    totalOrphans: inv.totalOrphans,
    shown: inv.cappedAt,
    hinted,
    rankingSource: inv.ranking?.source ?? "skipped",
    rankedCount,
    truncated: capped.truncated,
    bytes: capped.bytes,
    summaryBytes: Buffer.byteLength(summary, "utf-8"),
  };
}

// F1: guarded entry block — was a top-level imperative block, now gated so
// the module can be imported by tests without side effects.
const __filename = fileURLToPath(import.meta.url);
const __entry = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (__entry && __filename === __entry) {
  const cli = parseArgs(process.argv.slice(2));
  runOrphanInventory(cli).then((res) => {
    if (res.error) {
      process.stderr.write(`[orphan-inventory] ${res.error}: ${res.path ?? ""}\n`);
      process.exit(1);
    }
    if (res.json) {
      process.stdout.write(JSON.stringify(res.inventory, null, 2));
      process.exit(0);
    }
    process.stdout.write(
      `wrote ${res.outputPath}${res.truncated ? " (capped)" : ""}\n` +
      `wrote ${res.summaryPath} (${res.summaryBytes} bytes)\n` +
      `  total orphans: ${res.totalOrphans} (showing ${res.shown})\n` +
      `  heuristic-hinted: ${res.hinted}/${res.shown}\n` +
      `  WiringPotential ranking: ${res.rankingSource} (${res.rankedCount} scored)\n`,
    );
    process.exit(0);
  }).catch((e) => {
    process.stderr.write(`[orphan-inventory] fatal: ${e instanceof Error ? e.stack ?? e.message : String(e)}\n`);
    process.exit(1);
  });
}
