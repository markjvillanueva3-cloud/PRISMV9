#!/usr/bin/env node
// U-P2-GRAPH-SEARCH-MASTERINDEX (SYSTEM-VIZ-BRAIN-MS0, slot=echo, 2026-05-17)
//
// Pure resolver + CLI that takes a /system-viz search-bar free-text query (plus
// optional filters: layers, sources, build classes, utilization/confidence
// floors, result limit) and emits a fully-formed `prism_session:master_index_query`
// invocation payload. The frontend search bar calls this resolver, dispatches
// the returned payload, and renders the result list.
//
// Contract verified against live source on 2026-05-17:
//   • Action lives at `mcp-server/src/tools/dispatchers/sessionDispatcher.ts:1338`
//     dispatcher: `prism_session`, action: `master_index_query`.
//   • Params shape (read from lines 1340-1347):
//       query: string                     // required; `params.query ?? params.q`
//       limit?: number                    // Number()-coerced
//       layers?: string[]                 // Array.isArray gate
//       sources?: string[]                // Array.isArray gate
//       min_utilization?: number          // Number()-coerced
//       min_confidence?: number           // Number()-coerced
//       build_classes?: string[]          // Array.isArray gate
//   • Output: `masterIndexEngine.query(query, opts)` result (ranked hits).
//
// Backend slice of U-P2-GRAPH-SEARCH-MASTERINDEX. Frontend search-bar wiring
// deferred. ZERO dispatcher surface ADDED (read-only contract consumer; same
// pattern as U-P2-COT-REASON-BLAST-RADIUS).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, "..");

// ─── Dispatcher contract (frozen against sessionDispatcher.ts:1338) ─────────
export const SEARCH_DISPATCHER = "prism_session";
export const SEARCH_ACTION = "master_index_query";
export const SEARCH_SOURCE_CONTRACT =
  "sessionDispatcher.ts:1338 → masterIndexEngine.query(query, opts)";

// ─── Defaults ───────────────────────────────────────────────────────────────
export const DEFAULT_LIMIT = 20;
export const MIN_QUERY_LEN = 1;
export const MAX_QUERY_LEN = 1024;
export const MIN_LIMIT = 1;
export const MAX_LIMIT = 500;
export const MIN_UTILIZATION = 0;
export const MAX_UTILIZATION = 1;
export const MIN_CONFIDENCE = 0;
export const MAX_CONFIDENCE = 1;

// Known layer keys (from system-graph): L0..L13, L4a, Lgit. Used for input
// validation against typo'd layer filters. Source: state/shared/CLAUDE-BRIEF.md
// "Layers" line.
export const KNOWN_LAYERS = [
  "L0",
  "L1",
  "L2",
  "L3",
  "L4",
  "L4a",
  "L5",
  "L6",
  "L7",
  "L8",
  "L9",
  "L10",
  "L11",
  "L12",
  "L13",
  "Lgit",
];

// ─── Pure-core resolver ─────────────────────────────────────────────────────
//
// Inputs (all params except `query` are optional):
//   query: string (required, length 1..MAX_QUERY_LEN)
//   limit?: number (clamped to [MIN_LIMIT, MAX_LIMIT], default DEFAULT_LIMIT)
//   layers?: string[] (filtered to KNOWN_LAYERS; unknowns drop with `droppedLayers` advisory)
//   sources?: string[] (passed through after dedup)
//   buildClasses?: string[] (passed through after dedup)
//   minUtilization?: number (clamped to [MIN_UTILIZATION, MAX_UTILIZATION])
//   minConfidence?: number (clamped to [MIN_CONFIDENCE, MAX_CONFIDENCE])
//   now?: number (ms)
//
// Returns: {ok, dispatcher, action, params, advisory, ...} (NOT serialized)
export function buildSearchPayload({
  query = null,
  limit = DEFAULT_LIMIT,
  layers = null,
  sources = null,
  buildClasses = null,
  minUtilization = null,
  minConfidence = null,
  now = null,
} = {}) {
  const nowMs = typeof now === "number" ? now : Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // Required: query must be a non-empty string within length bounds.
  if (typeof query !== "string") {
    return {
      schemaVersion: 1,
      generatedAt: nowIso,
      ok: false,
      error: "MISSING_QUERY",
      message: "query is required (string)",
    };
  }
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LEN) {
    return {
      schemaVersion: 1,
      generatedAt: nowIso,
      ok: false,
      error: "EMPTY_QUERY",
      message: `query must be at least ${MIN_QUERY_LEN} non-whitespace char(s)`,
    };
  }
  if (trimmed.length > MAX_QUERY_LEN) {
    return {
      schemaVersion: 1,
      generatedAt: nowIso,
      ok: false,
      error: "QUERY_TOO_LONG",
      message: `query exceeds MAX_QUERY_LEN=${MAX_QUERY_LEN}`,
    };
  }

  // Per-file scrutiny doctrine lesson (U-P2-COT-REASON-BLAST-RADIUS arm A P1):
  // Number.isFinite() coercion BEFORE clamping so NaN/undefined fall back to
  // default instead of silently bypassing Math.min/max bounds.
  const safeLimit = Number.isFinite(limit) ? limit : DEFAULT_LIMIT;
  const clampedLimit = Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, safeLimit));

  // Filter layers against KNOWN_LAYERS — unknowns surface in droppedLayers for
  // operator awareness (R12 fail-loud, but advisory not hard error).
  let cleanLayers = null;
  let droppedLayers = [];
  if (Array.isArray(layers)) {
    const knownSet = new Set(KNOWN_LAYERS);
    const kept = [];
    const dropped = [];
    const seen = new Set();
    for (const l of layers) {
      if (typeof l !== "string") {
        dropped.push(String(l));
        continue;
      }
      if (seen.has(l)) continue;
      seen.add(l);
      if (knownSet.has(l)) kept.push(l);
      else dropped.push(l);
    }
    if (kept.length > 0) cleanLayers = kept;
    droppedLayers = dropped;
  }

  // sources + buildClasses: dedup + filter non-strings; no allowlist (catalog
  // grows; let masterIndexEngine validate at runtime).
  const cleanArrayOrNull = (arr) => {
    if (!Array.isArray(arr)) return null;
    const seen = new Set();
    const out = [];
    for (const v of arr) {
      if (typeof v !== "string") continue;
      if (seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
    return out.length > 0 ? out : null;
  };
  const cleanSources = cleanArrayOrNull(sources);
  const cleanBuildClasses = cleanArrayOrNull(buildClasses);

  // Utilization/confidence floors — clamped to [0, 1] (probability range).
  // CRITICAL: check null/undefined BEFORE Number() coercion. `Number(null)===0`
  // and `Number(undefined)===NaN`; the former silently emits `min_utilization:0`
  // when caller didn't supply, polluting the params payload. Self-caught bug —
  // 1 test failure surfaced this immediately.
  const clampUnit = (v, lo, hi) => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.max(lo, Math.min(hi, n));
  };
  const cleanMinUtilization = clampUnit(
    minUtilization,
    MIN_UTILIZATION,
    MAX_UTILIZATION,
  );
  const cleanMinConfidence = clampUnit(
    minConfidence,
    MIN_CONFIDENCE,
    MAX_CONFIDENCE,
  );

  // Build params object. Optional fields ABSENT (not undefined) when caller
  // didn't supply or input was malformed (per U-P2-COT-REASON-BLAST-RADIUS
  // doctrine — frontend should see a clean payload, not undefined keys).
  const params = {
    query: trimmed,
    limit: clampedLimit,
  };
  if (cleanLayers) params.layers = cleanLayers;
  if (cleanSources) params.sources = cleanSources;
  if (cleanBuildClasses) params.build_classes = cleanBuildClasses;
  if (cleanMinUtilization !== null) params.min_utilization = cleanMinUtilization;
  if (cleanMinConfidence !== null) params.min_confidence = cleanMinConfidence;

  return {
    schemaVersion: 1,
    generatedAt: nowIso,
    ok: true,
    dispatcher: SEARCH_DISPATCHER,
    action: SEARCH_ACTION,
    sourceContract: SEARCH_SOURCE_CONTRACT,
    params,
    advisory: {
      mustHumanVerify: true,
      droppedLayers,
      queryOriginalLength: query.length,
      queryTrimmedLength: trimmed.length,
      caveat:
        "Payload targets prism_session:master_index_query (sessionDispatcher.ts:1338). Frontend invokes the returned {dispatcher, action, params} as-is — no field remapping required (dispatcher reads params.query ?? params.q). Layers filtered against KNOWN_LAYERS (L0..L13/L4a/Lgit); unknowns surface in droppedLayers (advisory only, not hard error). Utilization/confidence floors clamped to [0,1]. NaN/undefined optional inputs fall back to default instead of bypassing clamp (Math.min/max NaN-bypass lesson from U-P2-COT-REASON-BLAST-RADIUS).",
    },
  };
}

// ─── I/O ────────────────────────────────────────────────────────────────────
export function writePayload(outPath, payload) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, outPath);
  return outPath;
}

// ─── Arg parsing ────────────────────────────────────────────────────────────
export function parseArgs(argv) {
  const out = {
    query: null,
    limit: DEFAULT_LIMIT,
    layers: null,
    sources: null,
    buildClasses: null,
    minUtilization: null,
    minConfidence: null,
    outPath: null,
    frozenTime: null,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--query") out.query = argv[++i];
    else if (a === "--limit") out.limit = Number(argv[++i]);
    else if (a === "--layers") out.layers = (argv[++i] || "").split(",").filter(Boolean);
    else if (a === "--sources") out.sources = (argv[++i] || "").split(",").filter(Boolean);
    else if (a === "--build-classes") out.buildClasses = (argv[++i] || "").split(",").filter(Boolean);
    else if (a === "--min-utilization") out.minUtilization = Number(argv[++i]);
    else if (a === "--min-confidence") out.minConfidence = Number(argv[++i]);
    else if (a === "--out") out.outPath = argv[++i];
    else if (a === "--frozen-time") out.frozenTime = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

const HELP = `system-viz-graph-search — build prism_session:master_index_query payload
  --query <text>            REQUIRED — search query (1..${MAX_QUERY_LEN} chars)
  --limit <n>               result cap (${MIN_LIMIT}..${MAX_LIMIT}, default ${DEFAULT_LIMIT})
  --layers <csv>            layer filter (L0..L13/L4a/Lgit; unknowns dropped)
  --sources <csv>           source filter (passed through)
  --build-classes <csv>     build-class filter (passed through)
  --min-utilization <0..1>  utilization floor
  --min-confidence <0..1>   confidence floor
  --out <path>              write payload to file (else stdout JSON)
  --frozen-time <ISO>       deterministic timestamp
  --help                    show this
`;

// ─── CLI ────────────────────────────────────────────────────────────────────
export async function main(argv = process.argv) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (!args.query) {
    process.stderr.write("ERROR: --query is required\n");
    process.stdout.write(HELP);
    return 2;
  }
  const nowMs = args.frozenTime ? Date.parse(args.frozenTime) : Date.now();
  const payload = buildSearchPayload({
    query: args.query,
    limit: args.limit,
    layers: args.layers,
    sources: args.sources,
    buildClasses: args.buildClasses,
    minUtilization: args.minUtilization,
    minConfidence: args.minConfidence,
    now: Number.isFinite(nowMs) ? nowMs : Date.now(),
  });

  if (args.outPath) {
    writePayload(args.outPath, payload);
    process.stdout.write(
      `graph-search-payload written → ${path.relative(REPO_ROOT, args.outPath)}\n` +
        `  query=${JSON.stringify(args.query)} ${payload.ok ? `limit=${payload.params.limit} layers=${payload.params.layers?.length || 0} dropped=${payload.advisory.droppedLayers.length}` : `error=${payload.error}`}\n`,
    );
  } else {
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  }
  return payload.ok ? 0 : 1;
}

const _invokedAsCli = (() => {
  try {
    if (!process.argv[1]) return false;
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();
if (_invokedAsCli) {
  void main().then((code) => process.exit(code || 0));
}
