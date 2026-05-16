#!/usr/bin/env node
/**
 * extract-misc-tasks.mjs — Deterministic merge of the 10-agent misc-tasks scan.
 *
 * Spec: MISC-TASKS extraction (slot juliett, forge7, 2026-05-16).
 *
 * The 10 parallel scanner agents each emit one
 * `state/shared/specs/misc-tasks-scan/agent-<N>.json` of candidate
 * "orphaned incomplete work" items. This script merges those 10 files
 * into a single deduplicated, roadmap-cross-referenced inventory:
 * `state/shared/specs/MISC-TASKS-INVENTORY.{json,md,html}`.
 *
 * Pipeline (pure + deterministic — set-ops, NOT model judgement):
 *   1. Load + validate all 10 agent JSONs (fail loud on missing/corrupt).
 *   2. Dedupe: key = unit_id ? 'ID:'+normId : 'T:'+normTitle. Merge groups.
 *   3. Exclude `looks_completed === true` items (they shipped).
 *   4. Cross-reference each remaining item's milestone_or_unit_id against
 *      the KNOWN set (every milestone + unit id in roadmap-index.json,
 *      the 694 milestone envelopes, and MILESTONE_PROGRESS.json). Items
 *      whose id IS known were already formalized into a roadmap/envelope
 *      → excluded. Items with no id, or an unknown id, are the misc set.
 *   5. Emit the inventory in 3 formats.
 *
 * The misc set is exactly the user's target: incomplete work that was
 * never added to any roadmap unit or milestone envelope.
 *
 * Usage:  node scripts/extract-misc-tasks.mjs [--scan-dir <dir>] [--json]
 * Exit:   0 ok · 1 validation/arg error · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const AGENT_COUNT = 10;

// ─── normalization (pure) ────────────────────────────────────────────────

/** Uppercase + trim an id; non-string / empty → "". */
export function normalizeId(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().toUpperCase();
}

/** Lowercase, strip to alphanumeric words, collapse whitespace. */
export function normalizeTitle(raw) {
  if (typeof raw !== "string") return "";
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Filesystem-safe node id fragment — letters/digits/dash/underscore only.
 * Dots are excluded so the `ghost.misc.` prefix is the only `.` in the id;
 * this also makes any `..` collapse to `-` rather than tripping the guard.
 */
export function safeId(raw) {
  const s = String(raw == null ? "" : raw)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 80);
  // Guard against empty / traversal-shaped fragments.
  if (!s || s.includes("..")) return "x";
  return s;
}

/** Dedupe key: id-based when an id exists, else normalized-title-based. */
export function dedupeKey(item) {
  const id = normalizeId(item && item.milestone_or_unit_id);
  if (id) return "ID:" + id;
  return "T:" + normalizeTitle(item && item.title);
}

// ─── KNOWN roadmap/envelope id set ───────────────────────────────────────

/**
 * Build the set of every milestone-id and unit-id already formalized into
 * a roadmap or milestone envelope. Returns a Set of normalized-uppercase ids.
 */
export function buildKnownSet({ roadmapIndex, envelopes, milestoneProgress }) {
  const known = new Set();
  const add = (v) => { const n = normalizeId(v); if (n) known.add(n); };

  // roadmap-index.json → .milestones[].id
  if (roadmapIndex && Array.isArray(roadmapIndex.milestones)) {
    for (const ms of roadmapIndex.milestones) {
      if (ms && ms.id) add(ms.id);
      if (ms && Array.isArray(ms.units)) for (const u of ms.units) if (u && u.id) add(u.id);
    }
  }

  // 694 milestone envelopes → .id (milestone) + .units[].id
  for (const env of envelopes || []) {
    if (!env) continue;
    add(env.id);
    if (Array.isArray(env.units)) for (const u of env.units) if (u && u.id) add(u.id);
  }

  // MILESTONE_PROGRESS.json → .milestones{}.id + .units[].id
  if (milestoneProgress && milestoneProgress.milestones && typeof milestoneProgress.milestones === "object") {
    for (const ms of Object.values(milestoneProgress.milestones)) {
      if (ms && ms.id) add(ms.id);
      if (ms && Array.isArray(ms.units)) for (const u of ms.units) if (u && u.id) add(u.id);
    }
  }

  return known;
}

// ─── merge (pure) ────────────────────────────────────────────────────────

/** Merge a group of duplicate items into one representative record. */
export function mergeGroup(group) {
  // Base = highest-confidence member (stable: first wins on tie).
  let base = group[0];
  for (const it of group) {
    if ((Number(it.confidence) || 0) > (Number(base.confidence) || 0)) base = it;
  }
  const sources = [...new Set(group.map((g) => g.source_path).filter(Boolean))];
  const agents = [...new Set(group.map((g) => g._agent).filter((n) => Number.isFinite(n)))].sort((a, b) => a - b);
  let evidence = "";
  for (const it of group) {
    const e = typeof it.evidence === "string" ? it.evidence : "";
    if (e.length > evidence.length) evidence = e;
  }
  return {
    title: String(base.title || "(untitled)").trim(),
    evidence: evidence.slice(0, 200),
    source_type: base.source_type || "unknown",
    sources,
    source_count: sources.length,
    milestone_or_unit_id: base.milestone_or_unit_id || null,
    suggested_domain: base.suggested_domain || "other",
    confidence: Math.max(...group.map((g) => Number(g.confidence) || 0)),
    looks_completed: group.some((g) => g.looks_completed === true),
    occurrences: group.length,
    found_by_agents: agents,
  };
}

/**
 * Full pipeline. `agentOutputs` = array of parsed agent-N.json objects.
 * Returns { misc, excludedCompleted, excludedRoadmapped, stats }.
 */
export function extractMiscTasks(agentOutputs, knownSet) {
  // 1. Flatten, tagging each item with its source agent.
  const raw = [];
  for (const out of agentOutputs) {
    const n = Number(out && out.agent);
    for (const it of (out && Array.isArray(out.items) ? out.items : [])) {
      if (it && typeof it === "object") raw.push({ ...it, _agent: n });
    }
  }

  // 2. Dedupe into groups.
  const groups = new Map();
  for (const it of raw) {
    const k = dedupeKey(it);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(it);
  }
  const merged = [...groups.values()].map(mergeGroup);

  // 3 + 4. Partition: completed → roadmapped → misc.
  const excludedCompleted = [];
  const excludedRoadmapped = [];
  const misc = [];
  for (const item of merged) {
    if (item.looks_completed) { excludedCompleted.push(item); continue; }
    const id = normalizeId(item.milestone_or_unit_id);
    if (id && knownSet.has(id)) {
      excludedRoadmapped.push({ ...item, matched_known_id: id });
      continue;
    }
    misc.push(item);
  }

  // 5. Deterministic sort: confidence desc, then domain, then title.
  misc.sort((a, b) =>
    (b.confidence - a.confidence) ||
    a.suggested_domain.localeCompare(b.suggested_domain) ||
    a.title.localeCompare(b.title));

  // Assign stable ids. misc_id index is sort-order based (deterministic).
  const usedNodeIds = new Set();
  misc.forEach((item, i) => {
    item.misc_id = "MISC-" + String(i + 1).padStart(3, "0");
    let nid = "ghost.misc." + safeId(item.milestone_or_unit_id || item.title);
    let suffix = 1;
    while (usedNodeIds.has(nid)) { nid = "ghost.misc." + safeId(item.milestone_or_unit_id || item.title) + "-" + (++suffix); }
    usedNodeIds.add(nid);
    item.node_id = nid;
  });

  const tally = (arr, key) => {
    const o = {};
    for (const it of arr) { const v = it[key] || "unknown"; o[v] = (o[v] || 0) + 1; }
    return o;
  };

  const stats = {
    rawItems: raw.length,
    afterDedupe: merged.length,
    excludedCompleted: excludedCompleted.length,
    excludedRoadmapped: excludedRoadmapped.length,
    finalMisc: misc.length,
    byDomain: tally(misc, "suggested_domain"),
    bySourceType: tally(misc, "source_type"),
    knownIdSetSize: knownSet.size,
  };

  return { misc, excludedCompleted, excludedRoadmapped, stats };
}

// ─── rendering ───────────────────────────────────────────────────────────

export function renderMarkdown(inv) {
  const s = inv.stats;
  const lines = [];
  lines.push("# MISC-TASKS INVENTORY — Orphaned Incomplete Work");
  lines.push("");
  lines.push(`> Generated ${inv.generatedAt} · schemaVersion ${inv.schemaVersion}`);
  lines.push("> Orphaned incomplete work — identified across PRISM chats, never finished, never");
  lines.push("> formalized into a roadmap unit or milestone envelope. **Advisory — human-verify**");
  lines.push("> each item before promoting it into the roadmap.");
  lines.push("");
  lines.push("## Stats");
  lines.push("");
  lines.push(`- Raw scanned items: **${s.rawItems}** (10-agent parallel scan)`);
  lines.push(`- After dedupe: **${s.afterDedupe}**`);
  lines.push(`- Excluded (looks completed): **${s.excludedCompleted}**`);
  lines.push(`- Excluded (already in roadmap/envelope): **${s.excludedRoadmapped}**`);
  lines.push(`- **Final misc tasks: ${s.finalMisc}**`);
  lines.push("");
  lines.push("By domain: " + Object.entries(s.byDomain).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(" · "));
  lines.push("");
  lines.push("By source type: " + Object.entries(s.bySourceType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(" · "));
  lines.push("");
  lines.push("## Misc tasks");
  lines.push("");
  lines.push("| ID | Conf | Domain | Title | Unit/MS | Source | Seen |");
  lines.push("|----|------|--------|-------|---------|--------|------|");
  for (const it of inv.items) {
    const title = it.title.replace(/\|/g, "\\|").slice(0, 90);
    lines.push(`| ${it.misc_id} | ${it.confidence.toFixed(2)} | ${it.suggested_domain} | ${title} | ${it.milestone_or_unit_id || "—"} | ${it.source_type} | ${it.occurrences}x |`);
  }
  lines.push("");
  lines.push("## Next phase (deferred)");
  lines.push("");
  lines.push(inv.provenance.nextPhase);
  lines.push("");
  return lines.join("\n");
}

export function renderHtml(inv) {
  const s = inv.stats;
  const esc = (x) => String(x == null ? "" : x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rows = inv.items.map((it) => {
    const copy = esc(`${it.title} — ${it.evidence}`);
    return `<tr data-conf="${it.confidence}" data-domain="${esc(it.suggested_domain)}">
<td>${esc(it.misc_id)}</td><td>${it.confidence.toFixed(2)}</td><td>${esc(it.suggested_domain)}</td>
<td title="${esc(it.evidence)}">${esc(it.title)}</td><td>${esc(it.milestone_or_unit_id || "—")}</td>
<td>${esc(it.source_type)}</td><td>${it.occurrences}x</td>
<td><button onclick="navigator.clipboard.writeText(this.dataset.c)" data-c="${copy}">copy</button></td></tr>`;
  }).join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><title>MISC-TASKS Inventory</title>
<style>
body{font:14px/1.5 system-ui,sans-serif;margin:2rem;background:#0f172a;color:#e2e8f0}
h1{color:#38bdf8}.stat{display:inline-block;background:#1e293b;padding:.4rem .8rem;margin:.2rem;border-radius:6px}
table{border-collapse:collapse;width:100%;margin-top:1rem}th,td{border:1px solid #334155;padding:.4rem .6rem;text-align:left}
th{background:#1e293b;cursor:pointer}tr:nth-child(even){background:#1e293b55}
button{background:#0ea5e9;border:0;color:#fff;padding:.2rem .5rem;border-radius:4px;cursor:pointer}
td:nth-child(4){max-width:32rem}
</style></head><body>
<h1>MISC-TASKS Inventory — Orphaned Incomplete Work</h1>
<p>Generated ${esc(inv.generatedAt)} · schemaVersion ${esc(inv.schemaVersion)} · <b>advisory — human-verify before roadmap promotion</b></p>
<div>
<span class="stat">raw ${s.rawItems}</span><span class="stat">deduped ${s.afterDedupe}</span>
<span class="stat">excl. completed ${s.excludedCompleted}</span><span class="stat">excl. roadmapped ${s.excludedRoadmapped}</span>
<span class="stat" style="background:#0369a1">final misc ${s.finalMisc}</span>
</div>
<table id="t"><thead><tr><th>ID</th><th>Conf</th><th>Domain</th><th>Title</th><th>Unit/MS</th><th>Source</th><th>Seen</th><th></th></tr></thead>
<tbody>${rows}</tbody></table>
<p style="margin-top:1rem;color:#94a3b8">${esc(inv.provenance.nextPhase)}</p>
<script>
document.querySelectorAll('#t th').forEach((th,i)=>th.addEventListener('click',()=>{
 const tb=document.querySelector('#t tbody'),rows=[...tb.rows];
 const asc=th._asc=!th._asc;
 rows.sort((a,b)=>{const x=a.cells[i].innerText,y=b.cells[i].innerText;
  const nx=parseFloat(x),ny=parseFloat(y);
  const c=(!isNaN(nx)&&!isNaN(ny))?nx-ny:x.localeCompare(y);return asc?c:-c;});
 rows.forEach(r=>tb.appendChild(r));
}));
</script></body></html>`;
}

// ─── io + entrypoint ─────────────────────────────────────────────────────

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }

export function loadEnvelopes(dir) {
  const out = [];
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")); } catch { return out; }
  for (const f of files) {
    try { out.push(readJson(path.join(dir, f))); } catch { /* skip corrupt envelope */ }
  }
  return out;
}

export function main(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--scan-dir") args.scanDir = argv[++i];
    else if (argv[i] === "--json") args.json = true;
  }
  const scanDir = args.scanDir || path.join(ROOT, "state/shared/specs/misc-tasks-scan");
  const specsDir = path.join(ROOT, "state/shared/specs");

  // Load + validate the 10 agent outputs — FAIL LOUD.
  const agentOutputs = [];
  const missing = [];
  for (let n = 1; n <= AGENT_COUNT; n++) {
    const p = path.join(scanDir, `agent-${n}.json`);
    if (!fs.existsSync(p)) { missing.push(n); continue; }
    try {
      const j = readJson(p);
      if (!Array.isArray(j.items)) throw new Error(`agent-${n}.json has no items[] array`);
      agentOutputs.push(j);
    } catch (e) {
      console.error(`FATAL: agent-${n}.json — ${e.message}`);
      return 2;
    }
  }
  if (missing.length) {
    console.error(`FATAL: missing agent outputs: ${missing.map((n) => `agent-${n}.json`).join(", ")}`);
    return 1;
  }

  // Cross-reference sources.
  let roadmapIndex = null, milestoneProgress = null;
  try { roadmapIndex = readJson(path.join(ROOT, "mcp-server/data/roadmap-index.json")); }
  catch (e) { console.error(`FATAL: roadmap-index.json — ${e.message}`); return 2; }
  try { milestoneProgress = readJson(path.join(ROOT, "state/shared/MILESTONE_PROGRESS.json")); }
  catch { milestoneProgress = null; /* optional */ }
  const envelopes = loadEnvelopes(path.join(ROOT, "mcp-server/data/milestones"));

  const knownSet = buildKnownSet({ roadmapIndex, envelopes, milestoneProgress });
  const { misc, excludedCompleted, excludedRoadmapped, stats } = extractMiscTasks(agentOutputs, knownSet);

  const inventory = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    provenance: {
      method: "10-agent parallel scan of all PRISM chats + deterministic merge/dedupe/cross-reference",
      scanAgents: AGENT_COUNT,
      perAgent: agentOutputs.map((o) => ({ agent: o.agent, scannedCount: o.scannedCount ?? null, matchedFiles: o.matchedFiles ?? null, items: (o.items || []).length })),
      envelopesCrossReferenced: envelopes.length,
      advisoryOnly: true,
      mustHumanVerify: true,
      nextPhase: "DEFERRED follow-up: combine MISC-TASKS-INVENTORY into the unified roadmap (PRISM-UNIFIED-ROADMAP-v2.md / roadmap-index.json) after human review.",
    },
    stats,
    items: misc,
    excluded: {
      completed: excludedCompleted.map((x) => ({ title: x.title, milestone_or_unit_id: x.milestone_or_unit_id })),
      roadmapped: excludedRoadmapped.map((x) => ({ title: x.title, matched_known_id: x.matched_known_id })),
    },
  };

  fs.writeFileSync(path.join(specsDir, "MISC-TASKS-INVENTORY.json"), JSON.stringify(inventory, null, 2));
  fs.writeFileSync(path.join(specsDir, "MISC-TASKS-INVENTORY.md"), renderMarkdown(inventory));
  fs.writeFileSync(path.join(specsDir, "MISC-TASKS-INVENTORY.html"), renderHtml(inventory));

  if (args.json) {
    console.log(JSON.stringify({ ok: true, ...stats }, null, 2));
  } else {
    console.log(`MISC-TASKS extraction complete:`);
    console.log(`  raw ${stats.rawItems} → deduped ${stats.afterDedupe} → misc ${stats.finalMisc}`);
    console.log(`  excluded: ${stats.excludedCompleted} completed, ${stats.excludedRoadmapped} already-roadmapped`);
    console.log(`  KNOWN id set: ${stats.knownIdSetSize} · envelopes xref: ${envelopes.length}`);
    console.log(`  wrote MISC-TASKS-INVENTORY.{json,md,html}`);
  }
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
