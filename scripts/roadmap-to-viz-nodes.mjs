#!/usr/bin/env node
/**
 * roadmap-to-viz-nodes.mjs — MS-VIZ-ROADMAP-BIND
 *
 * The canonical roadmap-unit -> system-viz viz_node_id resolver, plus a
 * reconciler that diffs every milestone-envelope unit against the live graph.
 *
 * The peer's scripts/audit-roadmap-viz-bindings.mjs CLASSIFIES viz_node_ids that
 * already exist in roadmap specs (is this id valid?). This script is the inverse
 * + the gap report: it GENERATES the canonical id for a unit, and RECONCILES the
 * whole milestone set against the graph.
 *
 * resolveVizNodeId(unit) — given a roadmap unit descriptor, emit the canonical
 *   viz_node_id using ONLY real graph namespaces:
 *     engine            -> eng.<domain>.<name>
 *     dispatcher-action -> disp.<dispatcher>.action.<action>
 *     milestone-unit    -> ghost.ms.<milestone>.<unit>   (or ghost.ms.<milestone>)
 *     frontend-page     -> fe.page.<name>          (hyphens stripped)
 *     script            -> script.<name>          (hyphens preserved)
 *     skill             -> skill.project.<name>   (hyphens preserved)
 *
 * reconcileRoadmapVsViz({graphPath, milestonesDir}) — load every milestone
 *   envelope, classify each unit's binding to the graph: BOUND / GHOST /
 *   MISSING-ID / UNRESOLVED.
 *
 * GHOST_NODE_SCHEMA — the formal shape of a ghost.ms.<milestone>.<unit> node.
 *
 * Usage:
 *   node scripts/roadmap-to-viz-nodes.mjs --resolve --kind engine --domain ai --name FooEngine
 *   node scripts/roadmap-to-viz-nodes.mjs --reconcile [--json]
 *   node scripts/roadmap-to-viz-nodes.mjs --schema
 *
 * Exit codes: 0 = ok / clean reconcile · 1 = bad args · 2 = graph missing ·
 *             3 = reconcile found UNRESOLVED units (real drift).
 *
 * NOTE (R7 — flagged duplication): REAL_TOP_PREFIXES below mirrors the same set
 * in scripts/audit-roadmap-viz-bindings.mjs. A future MS-VIZ-ROADMAP-BIND unit
 * should extract scripts/lib/viz-node-taxonomy.mjs and have BOTH import it. Left
 * inline here to avoid editing the working peer script in this pass.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { streamGraphArray, exceedsStringParseCap } from "./lib/graph-io.mjs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");

// --- graph namespace taxonomy: real top-level prefixes (mirror of the audit script) ---
export const REAL_TOP_PREFIXES = new Set([
  "eng", "disp", "core", "fs", "wire", "state", "ghost", "frontend", "fe", "skill",
  "script", "reg", "wiki", "vault", "memory_user", "memory_project", "memory_reference",
  "memory_feedback", "mem", "alg", "datacat", "schema", "ppg", "test", "extract", "tr",
  "p", "jmdie", "formula", "combo", "kn", "boxextract", "memory_uncategorized", "memory__index",
]);

/** Formal schema for a ghost node — an unbuilt roadmap unit rendered in system-viz. */
export const GHOST_NODE_SCHEMA = Object.freeze({
  $schema: "prism/ghost-node/v1",
  description:
    "A ghost node represents an unbuilt roadmap unit (or milestone) in system-viz. " +
    "It lights up into a real engine/dispatcher node once the unit ships.",
  idPattern: "ghost.ms.<milestone-slug>.<unit-slug>",
  milestoneIdPattern: "ghost.ms.<milestone-slug>",
  required: ["id", "type", "milestone"],
  fields: {
    id: "string — ghost.ms.<milestone>.<unit> (lowercase, hyphens kept)",
    type: "literal 'ghost'",
    milestone: "string — the source milestone id",
    unit: "string|null — the source unit id, null for a milestone-level ghost",
    status: "string — pending | in_progress | complete | superseded",
    label: "string — human-readable display label",
  },
});

/** Lowercase, strip everything but [a-z0-9], collapse — for engine/page/script/skill name segments. */
function nameSlug(s) {
  return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Lowercase, keep hyphens, collapse runs — for milestone slugs (matches observed ghost.ms.<slug>). */
function hyphenSlug(s) {
  return String(s == null ? "" : s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Unit slug: trailing-number units -> u<NN> (matches ghost.ms.<ms>.u01); else hyphen-slug. */
function unitSlug(unitId) {
  const raw = String(unitId == null ? "" : unitId);
  const m = raw.match(/(\d+)\s*$/);
  if (m) return "u" + m[1].padStart(2, "0");
  const s = hyphenSlug(raw.replace(/^u-?/i, ""));
  return s || hyphenSlug(raw);
}

/**
 * Resolve a roadmap unit descriptor to its canonical system-viz viz_node_id.
 * @param {object} unit - { kind, name?, domain?, dispatcher?, action?, milestone?, unitId?, page?, script?, skill? }
 * @returns {{vizNodeId:string|null, kind:string, valid:boolean, reason:string}}
 */
export function resolveVizNodeId(unit) {
  if (unit == null || typeof unit !== "object") {
    return { vizNodeId: null, kind: "?", valid: false, reason: "unit descriptor must be an object" };
  }
  const kind = String(unit.kind || "").trim().toLowerCase();
  let id = null;
  let reason = "";

  switch (kind) {
    case "engine": {
      const domain = nameSlug(unit.domain);
      const name = nameSlug(unit.name);
      if (!domain) { reason = "engine requires a non-empty domain"; break; }
      if (!name) { reason = "engine requires a non-empty name"; break; }
      id = `eng.${domain}.${name}`;
      break;
    }
    case "dispatcher-action": {
      const disp = nameSlug(unit.dispatcher);
      const action = nameSlug(unit.action);
      if (!disp) { reason = "dispatcher-action requires a non-empty dispatcher"; break; }
      if (!action) { reason = "dispatcher-action requires a non-empty action"; break; }
      id = `disp.${disp}.action.${action}`;
      break;
    }
    case "milestone-unit": {
      const ms = hyphenSlug(unit.milestone);
      if (!ms) { reason = "milestone-unit requires a non-empty milestone"; break; }
      id = unit.unitId ? `ghost.ms.${ms}.${unitSlug(unit.unitId)}` : `ghost.ms.${ms}`;
      break;
    }
    case "frontend-page": {
      // Live graph: 730 `fe.page.<name>` (SINGULAR) individual-page nodes,
      // hyphen-stripped/collapsed (e.g. fe.page.adminpage) — verified against
      // system-graph.json. (fe.pages.* plural = only 14 page-GROUP nodes, not
      // individual pages — do not emit that namespace here.)
      const page = nameSlug(unit.page || unit.name);
      if (!page) { reason = "frontend-page requires a non-empty page/name"; break; }
      id = `fe.page.${page}`;
      break;
    }
    case "script": {
      // Live graph `script.*` ids preserve hyphens — verified (e.g. script.regen-viz).
      const name = hyphenSlug(unit.script || unit.name);
      if (!name) { reason = "script requires a non-empty script/name"; break; }
      id = `script.${name}`;
      break;
    }
    case "skill": {
      // Live graph: `skill.project.<name>` (3-segment, hyphens preserved) — the
      // 701 project-skill nodes. A separate skill.user.* namespace (~396 nodes)
      // exists for user-scoped skills; this resolver targets project skills.
      const name = hyphenSlug(unit.skill || unit.name);
      if (!name) { reason = "skill requires a non-empty skill/name"; break; }
      id = `skill.project.${name}`;
      break;
    }
    default:
      reason = `unknown kind "${kind}" (expected: engine, dispatcher-action, milestone-unit, frontend-page, script, skill)`;
  }

  if (id == null) return { vizNodeId: null, kind, valid: false, reason };
  const top = id.split(".", 1)[0];
  const valid = REAL_TOP_PREFIXES.has(top);
  return { vizNodeId: id, kind, valid, reason: valid ? "ok" : `top-level prefix "${top}" is not a real graph namespace` };
}

/** Load the set of node ids (lowercased) from a system-graph.json. */
export function loadGraphNodeIds(graphPath) {
  const abs = resolve(REPO, graphPath);
  if (!existsSync(abs)) return null;
  const ids = new Set();
  const addId = (n) => {
    const id = String(n && n.id != null ? n.id : "").toLowerCase();
    if (id) ids.add(id);
  };
  // GRAPH-READ SAFETY (U-VIZ-ROADMAP-BIGREAD): the merged system-graph.json is
  // ~765MB -- over Node's UTF-8 string cap (0x1fffffe8 ~512MB) -- so a naive
  // JSON.parse(readFileSync(...,"utf8")) throws ERR_STRING_TOO_LONG. When the file
  // exceeds the cap, STREAM the top-level `nodes` array (projection, low memory --
  // never materializes the giant string) and collect only the ids. Small fixture /
  // curated graphs (under the cap, possibly the nested {graph:{nodes}} shape the
  // streamer does not cover) take the full-parse path unchanged.
  if (exceedsStringParseCap(statSync(abs).size)) {
    streamGraphArray(abs, "nodes", addId);
    return ids;
  }
  let g;
  try {
    g = JSON.parse(readFileSync(abs, "utf8"));
  } catch (err) {
    throw new Error(`system-graph.json is not valid JSON: ${err?.message || String(err)}`);
  }
  const nodes = g.nodes || g.graph?.nodes || [];
  for (const n of nodes) addId(n);
  return ids;
}

/** Flatten a milestone envelope into a unit list across the known envelope shapes. */
function flattenEnvelopeUnits(env) {
  const out = [];
  const pushUnit = (u, phaseId) => {
    if (!u || typeof u !== "object") return;
    out.push({
      unitId: u.unit_id || u.id || null,
      status: u.status || null,
      vizNodeId: u.viz_node_id || null,
      phase: phaseId || null,
    });
  };
  // shape A: phases:[{units:[...]}]
  if (Array.isArray(env.phases)) {
    for (const p of env.phases) {
      if (p && Array.isArray(p.units)) for (const u of p.units) pushUnit(u, p.id);
    }
  }
  // shape B: phases:{ "0":{units:[...]} }
  else if (env.phases && typeof env.phases === "object") {
    for (const [pid, p] of Object.entries(env.phases)) {
      if (p && Array.isArray(p.units)) for (const u of p.units) pushUnit(u, pid);
    }
  }
  // shape C: units:{ "U-X":{...} }
  if (env.units && typeof env.units === "object" && !Array.isArray(env.units)) {
    for (const [uid, u] of Object.entries(env.units)) {
      pushUnit({ ...u, unit_id: u.unit_id || u.id || uid }, u.phase);
    }
  }
  // shape D: units:[...]
  else if (Array.isArray(env.units)) {
    for (const u of env.units) pushUnit(u);
  }
  return out;
}

/**
 * Reconcile every milestone-envelope unit against the live graph.
 * @returns {{ok:boolean, graphNodeCount:number, envelopes:number, units:number,
 *            byClass:object, unresolved:Array, findings:Array}}
 */
export function reconcileRoadmapVsViz({ graphPath, milestonesDir } = {}) {
  const gp = graphPath || "state/shared/system-viz/system-graph.json";
  const md = resolve(REPO, milestonesDir || "mcp-server/data/milestones");
  const ids = loadGraphNodeIds(gp);
  if (ids == null) {
    return { ok: false, error: `graph missing: ${gp}`, graphNodeCount: 0, envelopes: 0, units: 0, byClass: {}, unresolved: [], findings: [] };
  }
  if (!existsSync(md)) {
    return { ok: false, error: `milestones dir missing: ${md}`, graphNodeCount: ids.size, envelopes: 0, units: 0, byClass: {}, unresolved: [], findings: [] };
  }
  const files = readdirSync(md).filter((f) => f.endsWith(".json")).sort();
  const findings = [];
  let envelopes = 0;
  for (const f of files) {
    let env;
    try {
      env = JSON.parse(readFileSync(resolve(md, f), "utf8"));
    } catch {
      findings.push({ envelope: f, unit: null, class: "BAD-ENVELOPE", detail: "envelope JSON failed to parse — skipped" });
      continue;
    }
    envelopes++;
    const msId = env.id || basename(f, ".json");
    for (const u of flattenEnvelopeUnits(env)) {
      let cls, detail;
      if (!u.vizNodeId) {
        cls = "MISSING-ID";
        detail = "unit has no viz_node_id field";
      } else {
        const lc = String(u.vizNodeId).toLowerCase().replace(/`/g, "").trim();
        if (ids.has(lc)) {
          cls = "BOUND";
          detail = lc;
        } else if (lc.startsWith("ghost.")) {
          cls = "GHOST";
          detail = `${lc} — unbuilt (expected for a pending unit)`;
        } else {
          cls = "UNRESOLVED";
          detail = `${lc} — not a live graph node and not a ghost.* placeholder`;
        }
      }
      findings.push({ envelope: f, milestone: msId, unit: u.unitId, status: u.status, class: cls, detail });
    }
  }
  const byClass = {};
  for (const x of findings) byClass[x.class] = (byClass[x.class] || 0) + 1;
  const unresolved = findings.filter((x) => x.class === "UNRESOLVED");
  return {
    ok: true,
    graphNodeCount: ids.size,
    envelopes,
    units: findings.length,
    byClass,
    unresolved,
    findings,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const out = { mode: null, json: false, kind: null, fields: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--resolve") out.mode = "resolve";
    else if (a === "--reconcile") out.mode = "reconcile";
    else if (a === "--schema") out.mode = "schema";
    else if (a === "--json") out.json = true;
    else if (a === "--kind") out.kind = argv[++i];
    else if (a === "--help" || a === "-h") out.mode = "help";
    else if (a.startsWith("--")) out.fields[a.slice(2)] = argv[++i];
  }
  return out;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.mode || opts.mode === "help") {
    console.error("usage: roadmap-to-viz-nodes [--resolve --kind <k> --<field> <v> ...] [--reconcile [--json]] [--schema]");
    process.exit(opts.mode === "help" ? 0 : 1);
  }

  if (opts.mode === "schema") {
    process.stdout.write(JSON.stringify(GHOST_NODE_SCHEMA, null, 2) + "\n");
    process.exit(0);
  }

  if (opts.mode === "resolve") {
    const r = resolveVizNodeId({ kind: opts.kind, ...opts.fields });
    if (opts.json) process.stdout.write(JSON.stringify(r, null, 2) + "\n");
    else console.log(`${r.vizNodeId || "(unresolved)"}  [${r.valid ? "valid" : "INVALID"}] ${r.reason}`);
    process.exit(r.valid ? 0 : 1);
  }

  // reconcile
  let rep;
  try {
    rep = reconcileRoadmapVsViz({ graphPath: opts.fields.graph, milestonesDir: opts.fields.milestones });
  } catch (err) {
    console.error(`reconcile failed: ${err?.message || String(err)}`);
    process.exit(2);
  }
  if (!rep.ok) {
    console.error(`reconcile error: ${rep.error}`);
    process.exit(2);
  }
  if (opts.json) {
    process.stdout.write(JSON.stringify(rep, null, 2) + "\n");
  } else {
    console.log(`roadmap-to-viz reconcile — ${rep.envelopes} envelopes, ${rep.units} units, graph ${rep.graphNodeCount.toLocaleString()} nodes`);
    for (const [k, v] of Object.entries(rep.byClass).sort()) console.log(`  ${k.padEnd(14)} ${v}`);
    if (rep.unresolved.length) {
      console.log(`  — UNRESOLVED (${rep.unresolved.length}):`);
      for (const x of rep.unresolved.slice(0, 25)) console.log(`      ${String(x.milestone).padEnd(30)} ${String(x.unit || "?").padEnd(28)} ${x.detail}`);
    }
  }
  process.exit(rep.unresolved.length > 0 ? 3 : 0);
}

const isMain = (() => {
  try { return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();
