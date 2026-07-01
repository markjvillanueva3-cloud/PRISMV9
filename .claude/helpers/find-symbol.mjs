#!/usr/bin/env node
/**
 * find-symbol.mjs — single-shot identifier resolver via /system-viz.
 *
 * PRISM-SEARCH-MS0 / U-PSM02 (2026-05-18, slot golf).
 *
 * Wraps `runMasterIndexSearch` from master-index-search-lib.mjs and renders
 * a compact card (text default; --json for piping). Sister to the `/find`
 * skill at .claude/commands/find.md.
 *
 * Karpathy discipline:
 *   CLASSIFY: argv → BM25 query → render
 *   TECHNIQUE: lazy-import lib + slice top-N + format
 *   EDGE CASES: empty query, query too short, no hits, lib import fail,
 *     non-numeric --top, --top out of range, --json with no hits
 *   FAILURE MODES: all wrapped; exits 0 (no hits) or 2 (usage/setup error)
 *     — never throws to the operator
 *
 * Pure-core helpers exported for unit-testing without spinning the lib.
 */

import { argv, stdout, stderr, exit, env } from "node:process";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DEFAULT_TOP = 1;
const MAX_TOP = 5;
const MIN_QUERY_LEN = 2;
const TELEMETRY_PATH = env.PRISM_FIND_SYMBOL_TELEMETRY
  || "H:/prism/state/shared/find-symbol-queries.jsonl";

// ─────────────────────────────────────────────────────────────────────────
// Pure helpers (exported for tests)
// ─────────────────────────────────────────────────────────────────────────

export function parseArgs(args) {
  const out = { query: "", top: DEFAULT_TOP, json: false, help: false };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--json") out.json = true;
    else if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--top") {
      const v = Number(args[++i]);
      if (!Number.isFinite(v) || !Number.isInteger(v) || v < 1 || v > MAX_TOP) {
        return { error: `--top requires integer in [1,${MAX_TOP}], got: ${args[i]}` };
      }
      out.top = v;
    } else if (a.startsWith("--")) {
      return { error: `unknown flag: ${a}` };
    } else {
      positional.push(a);
    }
  }
  out.query = positional.join(" ").trim();
  return out;
}

/** Resolve a hit's file path from id or path field. Pure. */
export function resolveFilePath(hit) {
  if (!hit || typeof hit !== "object") return null;
  if (typeof hit.path === "string" && hit.path.length > 0) return hit.path;
  // node.id often carries a layer:name form (e.g. "engine:KienzleForceEngine")
  // — too lossy to derive a real file path from. Return null when we don't
  // have a concrete file path to render.
  return null;
}

/** Format one hit as text lines. Pure. */
export function renderHit(hit, idx) {
  const layer = hit.layer ? `[${hit.layer}/${hit.status || "?"}]` : "[?]";
  const label = hit.label || hit.id || "?";
  const path = resolveFilePath(hit);
  const info = (hit.info || "").slice(0, 200);
  const score = typeof hit.score === "number" ? ` (score ${hit.score.toFixed(2)})` : "";
  const lines = [`│ #${idx + 1} ${layer} ${label}${score}`];
  if (path) lines.push(`│   path:    ${path}`);
  if (info) lines.push(`│   info:    ${info}`);
  if (Array.isArray(hit.wikiEntries) && hit.wikiEntries.length > 0) {
    const w = hit.wikiEntries.slice(0, 2).map(e => typeof e === "string" ? e : (e?.name || e?.path || "?")).join(", ");
    lines.push(`│   wiki:    ${w}`);
  }
  return lines.join("\n");
}

/** Render the top-N hits as a boxed text card. Pure. */
export function renderCard(query, hits) {
  const header = `┌─ /find ${query} ────────────────────────────────────────`;
  const footer = `└────────────────────────────────────────────────────────`;
  if (!hits || hits.length === 0) {
    return [header, "│ (no hits)", footer].join("\n");
  }
  const body = hits.map(renderHit).join("\n");
  return [header, body, footer].join("\n");
}

function printHelp() {
  stdout.write([
    "find-symbol.mjs — single-shot symbol resolver via /system-viz",
    "",
    "Usage: node find-symbol.mjs <query> [--top N] [--json]",
    `  --top N    surface top-N hits (1..${MAX_TOP}, default ${DEFAULT_TOP})`,
    "  --json     emit raw JSON instead of the rendered card",
    "  -h --help  this help",
    "",
    "Knobs:",
    "  PRISM_FIND_SYMBOL_DISABLE=1   bail with hint (no query)",
    `  PRISM_FIND_SYMBOL_TOP=N       override default top-N (cap ${MAX_TOP})`,
    "",
  ].join("\n"));
}

function recordTelemetry(query, hitCount, isError) {
  try {
    mkdirSync(dirname(TELEMETRY_PATH), { recursive: true });
    const entry = {
      ts: new Date().toISOString(),
      query,
      hitCount,
      isError,
    };
    appendFileSync(TELEMETRY_PATH, JSON.stringify(entry) + "\n");
  } catch {
    /* telemetry is best-effort */
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  if (env.PRISM_FIND_SYMBOL_DISABLE === "1") {
    stderr.write("find-symbol: disabled via PRISM_FIND_SYMBOL_DISABLE=1\n");
    exit(2);
  }
  const parsed = parseArgs(argv.slice(2));
  if (parsed.error) {
    stderr.write(parsed.error + "\n");
    printHelp();
    exit(2);
  }
  if (parsed.help || !parsed.query) {
    printHelp();
    exit(parsed.help ? 0 : 2);
  }
  if (parsed.query.length < MIN_QUERY_LEN) {
    stderr.write(`query too short (min ${MIN_QUERY_LEN} chars)\n`);
    exit(2);
  }

  // Resolve top-N — env override + cap.
  const envTop = Number(env.PRISM_FIND_SYMBOL_TOP);
  const top = parsed.top !== DEFAULT_TOP
    ? parsed.top
    : (Number.isFinite(envTop) && envTop >= 1 && envTop <= MAX_TOP ? envTop : DEFAULT_TOP);

  // Lazy-import to keep startup fast + cope with refactor breakage.
  let runMasterIndexSearch;
  try {
    ({ runMasterIndexSearch } = await import(
      "../../scripts/lib/master-index-search-lib.mjs"
    ));
  } catch (e) {
    stderr.write(`find-symbol: lib import failed — ${e?.message || e}\n`);
    recordTelemetry(parsed.query, 0, true);
    exit(2);
  }

  let hits = [];
  try {
    const result = runMasterIndexSearch(parsed.query, { topK: top });
    hits = Array.isArray(result?.hits) ? result.hits : [];
  } catch (e) {
    stderr.write(`find-symbol: query failed — ${e?.message || e}\n`);
    recordTelemetry(parsed.query, 0, true);
    exit(2);
  }

  recordTelemetry(parsed.query, hits.length, false);

  if (parsed.json) {
    stdout.write(JSON.stringify({ query: parsed.query, top, hits }, null, 2) + "\n");
  } else {
    stdout.write(renderCard(parsed.query, hits) + "\n");
  }
  exit(0);
}

// Direct-invoke guard so the pure helpers can be imported without running main().
const invokedDirectly = argv[1]
  && argv[1].replace(/\\/g, "/").endsWith("find-symbol.mjs");
if (invokedDirectly) {
  void main().catch((e) => {
    stderr.write(`find-symbol: unexpected error — ${e?.message || e}\n`);
    exit(2);
  });
}
