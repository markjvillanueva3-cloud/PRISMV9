// cimco-nav-map.mjs — PRISM ↔ CIMCO Edit 2026 full blind-navigation map (loader + query API).
//
// "Plot the ENTIRE CIMCO app for full blind navigation so we can drive it to prove out posts."
// Where cimco-control-map.mjs holds the small, hand-curated, high-confidence COMMAND_CATALOG
// (action→channel+invocation recipe), THIS module is the EXHAUSTIVE surface index: every menu,
// dialog, tab, setup screen, and toolbar command an agent can drive WITHOUT screenshots, keyed
// by the automation channel (file > sql/dnc-api > cli > uia) PRISM should use to drive it blind.
//
// Provenance: the surface data in `state/shared/cimco/nav-map.json` was extracted by the
// `cimco-blind-nav-plot` multi-agent Workflow (wf_ffa343d5, slot:echo, 2026-06-03) — 11 cluster
// agents read the 154 decompiled CHM help pages (`resources/cimco-2026/_extracted/edit_us/`,
// CIMCO Edit 2026.01.10), 5 verifier agents proved the post-proving critical paths navigable,
// 1 synthesis agent assembled procedures + blind-nav gaps. This .mjs is the canonical LOADER /
// QUERY API over that curated artifact — it does NOT re-extract (the extraction was a one-time
// agent pass; re-run the Workflow to regenerate). Mirrors the bridge-reads-index-JSON pattern of
// CimcoVerificationBridgeEngine (which reads machine/post/tool-index.json the same fail-soft way).
//
// HONEST about reach: the SETUP+INPUT half (open NC, author .setup stock/fixture sidecar, normalize
// NC, author MachineCfg) + the SHIP half (FTP) are file/CLI/FTP blind-driveable. The VERDICT half
// (Machine Simulation run + Simulation Report read + in-app File-Compare) is UIA-ONLY on the live
// licensed app with no documented export — that is the keystone gap (→ SPINE-2 UIA report reader).
//
// Wiki: [[cimco-verification-simulation-integration]] · sibling: scripts/cimco-control-map.mjs
// Tests: scripts/cimco-nav-map.test.mjs. Data: state/shared/cimco/nav-map.json.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");

/** Default nav-map.json location (env override mirrors the bridge's PRISM_CIMCO_INDEX_DIR). */
export const NAV_MAP_PATH = process.env.PRISM_CIMCO_NAV_MAP || resolve(REPO, "state/shared/cimco/nav-map.json");

/** Automation channels a surface can be driven through, ranked most→least robust (R5). */
export const CHANNELS = Object.freeze({
  FILE: "file", // read/write a CIMCO file format directly (.nc/.setup/.mcfg/.tmlib) — most robust, no GUI
  SQL: "sql", // bundled MariaDB datastore (NC-Base/DNC-Max/MDC-Max)
  DNC_API: "dnc-api", // DNC-Max / FTP client / serial transmission
  CLI: "cli", // launch a CIMCO exe with command-line args
  UIA: "uia", // UI-Automation of the GUI (read element text, no screenshots) — fallback
});
const CHANNEL_SET = new Set(Object.values(CHANNELS));
/** Robustness rank for a channel (1 = strongest/most-blind-automatable). */
export const CHANNEL_RANK = Object.freeze({ file: 1, sql: 2, "dnc-api": 3, cli: 4, uia: 5 });

const REQUIRED_SURFACE_KEYS = ["id", "label", "channel", "sourcePage"];

/**
 * Load + parse the nav-map. FAIL-LOUD: a missing/corrupt map throws (a blind-nav driver must never
 * silently operate on an empty map — that would look like "no surfaces" = "nothing to drive").
 * @param {string|object} [src] - .json path, or an already-parsed object. Defaults to NAV_MAP_PATH.
 * @returns {object} the parsed nav-map.
 */
export function loadNavMap(src = NAV_MAP_PATH) {
  if (src && typeof src === "object") return src;
  const p = String(src);
  if (!existsSync(p)) {
    throw new Error(`cimco nav-map not found: ${p} (regenerate via the cimco-blind-nav-plot Workflow → scripts/_navmap ingest)`);
  }
  let raw;
  try {
    raw = readFileSync(p, "utf8");
  } catch (e) {
    throw new Error(`cimco nav-map not readable: ${p} (${e.code || e.message})`);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`cimco nav-map not valid JSON: ${p} (${e.message})`);
  }
}

/** Surfaces array (defensive — always returns an array). */
function surfacesOf(map) {
  return map && Array.isArray(map.surfaces) ? map.surfaces : [];
}

/**
 * Validate the nav-map structure. Returns {valid, errors, warnings} — never throws (validation
 * itself must not crash a caller probing an untrusted map).
 */
export function validateNavMap(map) {
  const errors = [];
  const warnings = [];
  if (!map || typeof map !== "object") {
    return { valid: false, errors: ["nav-map is not an object"], warnings };
  }
  if (!map.schemaVersion) warnings.push("missing schemaVersion");
  const surfaces = surfacesOf(map);
  if (!Array.isArray(map.surfaces)) errors.push("surfaces is not an array");
  if (surfaces.length === 0) warnings.push("nav-map has zero surfaces");

  const ids = new Set();
  let unknownChannel = 0;
  let missingKeys = 0;
  for (const s of surfaces) {
    if (!s || typeof s !== "object") {
      errors.push("a surface is not an object");
      continue;
    }
    for (const k of REQUIRED_SURFACE_KEYS) {
      if (s[k] == null || s[k] === "") {
        missingKeys++;
        break;
      }
    }
    if (s.id != null) {
      if (ids.has(s.id)) errors.push(`duplicate surface id: ${s.id}`);
      ids.add(s.id);
    }
    if (s.channel != null && !CHANNEL_SET.has(s.channel)) unknownChannel++;
  }
  if (missingKeys > 0) errors.push(`${missingKeys} surface(s) missing a required key (${REQUIRED_SURFACE_KEYS.join("/")})`);
  if (unknownChannel > 0) errors.push(`${unknownChannel} surface(s) have an unknown channel (not one of ${[...CHANNEL_SET].join("/")})`);

  return { valid: errors.length === 0, errors, warnings, surfaceCount: surfaces.length, uniqueIds: ids.size };
}

/**
 * Query navigable surfaces.
 * @param {object} map - loaded nav-map.
 * @param {{channel?:string, area?:string, proofRelevant?:boolean, text?:string, limit?:number}} [opts]
 * @returns {{count:number, truncated:boolean, surfaces:Array}}
 */
export function queryNav(map, opts = {}) {
  let rows = surfacesOf(map);
  const channel = (opts.channel ?? "").trim().toLowerCase();
  const area = (opts.area ?? "").trim().toLowerCase();
  const text = (opts.text ?? "").trim().toLowerCase();
  if (channel) rows = rows.filter((s) => String(s.channel ?? "").toLowerCase() === channel);
  if (area) rows = rows.filter((s) => String(s.area ?? "").toLowerCase().includes(area));
  if (opts.proofRelevant === true) rows = rows.filter((s) => s.postProvingRelevance != null && s.postProvingRelevance !== "");
  if (text) {
    rows = rows.filter((s) =>
      [s.id, s.label, s.action, s.area, s.path].some((f) => String(f ?? "").toLowerCase().includes(text)),
    );
  }
  const total = rows.length;
  const limit = opts.limit && opts.limit > 0 ? opts.limit : total;
  return { count: total, truncated: total > limit, surfaces: rows.slice(0, limit) };
}

/** Resolve a single surface by id. Returns the surface or null. */
export function resolveNav(map, id) {
  if (id == null) return null;
  return surfacesOf(map).find((s) => s.id === id) || null;
}

/** Recompute the channel distribution from the surfaces (do NOT trust a cached field). */
export function channelDistribution(map) {
  const dist = {};
  for (const s of surfacesOf(map)) {
    const c = String(s.channel ?? "?");
    dist[c] = (dist[c] || 0) + 1;
  }
  return dist;
}

/** Surfaces that matter for proving a post (open/load/sim/report/compare/ship). */
export function proofRelevantSurfaces(map) {
  return surfacesOf(map).filter((s) => s.postProvingRelevance != null && s.postProvingRelevance !== "");
}

/** Critical-path navigability verdicts (from the Workflow's verifier agents). */
export function criticalPaths(map) {
  return Array.isArray(map?.criticalPathVerdicts) ? map.criticalPathVerdicts : [];
}

/**
 * Blind-nav readiness rollup: how many post-proving critical paths are navigable, plus the
 * honest blind-nav gaps. The single load-bearing truth for "can PRISM drive CIMCO to prove a post?"
 */
export function blindNavReadiness(map) {
  const verdicts = criticalPaths(map);
  const navigable = verdicts.filter((v) => v.navigable === true).length;
  const synth = map?.synthesis || {};
  return {
    criticalPathsTotal: verdicts.length,
    criticalPathsNavigable: navigable,
    fullyNavigable: verdicts.length > 0 && navigable === verdicts.length,
    paths: verdicts.map((v) => ({ pathName: v.pathName, navigable: v.navigable, confidence: v.confidence ?? null, missingSteps: v.missingSteps ?? [] })),
    blindNavGaps: Array.isArray(synth.blindNavGaps) ? synth.blindNavGaps : [],
    postProvingReadiness: synth.postProvingReadiness ?? null,
    recommendedNextUnits: Array.isArray(synth.recommendedNextUnits) ? synth.recommendedNextUnits : [],
  };
}

/** Step-by-step blind-nav procedures for the proving workflow (from synthesis). */
export function criticalProcedures(map) {
  const synth = map?.synthesis || {};
  return Array.isArray(synth.criticalProcedures) ? synth.criticalProcedures : [];
}

/** Compact summary (the headline an agent reads first). */
export function summary(map) {
  const surfaces = surfacesOf(map);
  const readiness = blindNavReadiness(map);
  return {
    surfaceCount: surfaces.length,
    proofRelevant: proofRelevantSurfaces(map).length,
    channelDistribution: channelDistribution(map),
    clusters: Array.isArray(map?.clusters) ? map.clusters.map((c) => ({ cluster: c.cluster, count: c.count })) : [],
    criticalPathsNavigable: `${readiness.criticalPathsNavigable}/${readiness.criticalPathsTotal}`,
    blindNavGapCount: readiness.blindNavGaps.length,
    generatedFrom: map?.generatedFrom ?? null,
    provenance: map?.generatedBy ?? null,
  };
}

// ─── CLI (argv-guarded, mirrors cimco-control-map.mjs) ───────────────────────
function _arg(argv, flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

function _main(argv) {
  const cmd = argv[0];
  let map;
  try {
    map = loadNavMap();
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n`);
    return 1;
  }
  if (cmd === "summary" || cmd === "catalog" || !cmd) {
    process.stdout.write(JSON.stringify(summary(map), null, 2) + "\n");
    return 0;
  }
  if (cmd === "query") {
    const out = queryNav(map, {
      channel: _arg(argv, "--channel"),
      area: _arg(argv, "--area"),
      proofRelevant: argv.includes("--proof"),
      text: _arg(argv, "--text"),
      limit: Number(_arg(argv, "--limit")) || undefined,
    });
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    return 0;
  }
  if (cmd === "resolve") {
    const s = resolveNav(map, argv[1]);
    if (!s) { process.stderr.write(`no surface with id: ${argv[1]}\n`); return 1; }
    process.stdout.write(JSON.stringify(s, null, 2) + "\n");
    return 0;
  }
  if (cmd === "procedures") {
    process.stdout.write(JSON.stringify(criticalProcedures(map), null, 2) + "\n");
    return 0;
  }
  if (cmd === "readiness" || cmd === "gaps") {
    process.stdout.write(JSON.stringify(blindNavReadiness(map), null, 2) + "\n");
    return 0;
  }
  if (cmd === "verify" || cmd === "validate") {
    const v = validateNavMap(map);
    process.stdout.write(JSON.stringify(v, null, 2) + "\n");
    return v.valid ? 0 : 1;
  }
  process.stderr.write("usage: cimco-nav-map.mjs {summary | query [--channel c] [--area a] [--proof] [--text t] [--limit n] | resolve <id> | procedures | readiness | verify}\n");
  return 2;
}

const _argv1 = process.argv[1];
if (_argv1 && (_argv1.endsWith("cimco-nav-map.mjs") || _argv1.endsWith("cimco-nav-map"))) {
  process.exit(_main(process.argv.slice(2)));
}
