#!/usr/bin/env node
/**
 * build-wiring-domain-dict.mjs — Wiring Domain Dictionary (CLEANUP-MS0/U-CLEANUP-G16)
 *
 * Weekly scan that surfaces the top-N **engine prefixes that lack a
 * matching dispatcher** — these are the highest-leverage targets for
 * new dispatcher wiring (each unmatched prefix represents N orphan
 * engines that no MCP action surface can reach).
 *
 * Prefix extraction: each engine filename `<PascalCase>{Engine,Service,...}.ts`
 * yields a prefix = the leading uppercase-letter run (e.g. `AGISafetyContainment`
 * → `AGI`, `LatheCollision` → `Lathe`, `KienzleForceModel` → `Kienzle`).
 *
 * Dispatcher matching: dispatcher filenames are normalized via the suffix
 * `<lower>Dispatcher.ts` → the engine prefix is "matched" iff its lowercase
 * form is the **exact** dispatcher name OR appears as a hyphen/word component.
 *
 * The output is a candidate list — Mark promotes manually by moving
 * entries from `candidates[]` to `promoted{prefix: dispatcherTarget}`.
 * Subsequent runs preserve `promoted` + per-candidate `first_seen` so
 * trend lines remain stable.
 *
 * Read-only / advisory-only. Exit 0 always.
 *
 * Output:
 *   - state/shared/wiring-domain-dict.json (machine + operator-readable)
 *   - state/shared/WIRING_DOMAIN_DICT.md   (human dashboard)
 *
 * Usage:
 *   node scripts/build-wiring-domain-dict.mjs
 *   node scripts/build-wiring-domain-dict.mjs --json
 *   node scripts/build-wiring-domain-dict.mjs --top 5 --frozen-time 2026-05-13T22:00:00Z
 *   node scripts/build-wiring-domain-dict.mjs --engines-dir <dir> --dispatchers-dir <dir>
 *
 * Spec: mcp-server/data/milestones/CLEANUP-MS0.json U-CLEANUP-G16.
 */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  readdirSync,
  mkdirSync,
  existsSync,
  statSync,
} from "node:fs";
import { join, dirname, isAbsolute as pathIsAbsolute, resolve, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = resolve(__dirname, "..");
const DEFAULT_ENGINES_DIR = "mcp-server/src/engines";
const DEFAULT_DISPATCHERS_DIR = "mcp-server/src/tools/dispatchers";
const DEFAULT_OUT_JSON = "state/shared/wiring-domain-dict.json";
const DEFAULT_OUT_MD = "state/shared/WIRING_DOMAIN_DICT.md";

// Default top-N candidates to surface per run. Spec asks "top-3" but the
// CLI supports widening so an operator can audit deeper without re-running.
const DEFAULT_TOP_N = 3;

// Sample size per candidate: number of representative engine names to attach.
const SAMPLE_ENGINES_PER_CANDIDATE = 5;

// Suffixes we strip BEFORE prefix extraction (the engine "kind" is noise).
const ENGINE_KIND_SUFFIXES = ["Engine", "Service", "Manager", "Hook", "Adapter", "Helper", "Bridge", "Coordinator", "Orchestrator", "Pipeline", "Predictor", "Estimator", "Validator", "Generator", "Detector", "Selector", "Calculator"];

// Dispatcher filename suffix — the leading lowercase-camel chunk before
// `Dispatcher.ts` is the dispatcher's "domain name".
const DISPATCHER_FILE_SUFFIX = /^([a-z][a-z0-9_]*)Dispatcher\.ts$/i;

// Manual aliases — prefix → expected dispatcher domain (Mark-curated).
// Empty by default; promoted entries populate this at runtime.
const DEFAULT_ALIASES = {};

// Single-letter / very short prefixes are non-actionable (e.g. an engine
// named `XEngine.ts` extracting prefix `X` is not a useful candidate).
const MIN_PREFIX_LEN = 2;

// ──────────────────────────────────────────────────────────────────────
// argv
// ──────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const args = {
    json: false,
    frozenTime: null,
    enginesDir: null,
    dispatchersDir: null,
    top: DEFAULT_TOP_N,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--frozen-time") args.frozenTime = argv[++i];
    else if (a === "--engines-dir") args.enginesDir = argv[++i];
    else if (a === "--dispatchers-dir") args.dispatchersDir = argv[++i];
    else if (a === "--top") {
      const n = Number(argv[++i]);
      args.top = Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_TOP_N;
    }
  }
  if (!args.frozenTime && process.env.PRISM_AUDIT_FROZEN_TIME) {
    args.frozenTime = process.env.PRISM_AUDIT_FROZEN_TIME;
  }
  return args;
}

// ──────────────────────────────────────────────────────────────────────
// Prefix extraction — pure
// ──────────────────────────────────────────────────────────────────────

/**
 * Extract the engine domain prefix from a filename. Returns null if the
 * filename doesn't look like a TS module or the prefix is too short.
 *
 * Examples:
 *   AGISafetyContainmentEngine.ts → "AGI"
 *   LatheCollisionDetector.ts     → "Lathe"
 *   KienzleForceModel.ts          → "Kienzle"
 *   PRISMSelfAwarenessEngine.ts   → "PRISM"
 *   index.ts                      → null
 *   foo.test.ts                   → null
 */
export function extractEnginePrefix(filename) {
  if (!filename || typeof filename !== "string") return null;
  if (!filename.endsWith(".ts")) return null;
  const stem = filename.slice(0, -3);
  if (stem === "index") return null;
  if (stem.endsWith(".test")) return null;
  if (stem.endsWith(".d")) return null;
  if (!/^[A-Z]/.test(stem)) return null;
  // Strip a known kind suffix so the prefix scan focuses on the domain root.
  let head = stem;
  for (const suffix of ENGINE_KIND_SUFFIXES) {
    if (head.endsWith(suffix) && head.length > suffix.length) {
      head = head.slice(0, -suffix.length);
      break;
    }
  }
  // Prefix priority:
  //   1. acronym-boundary: ([A-Z]{2,})([A-Z][a-z])   → e.g. "AGISafety…" → "AGI"
  //                                                          (the trailing uppercase
  //                                                          starts the NEXT word)
  //   2. PascalCase chunk: ^[A-Z][a-z]+               → e.g. "LatheCollision"  → "Lathe"
  //   3. all-caps tail-less stem: ^[A-Z]{2,}$         → e.g. "PRISM"           → "PRISM"
  //   4. else null
  const acronymBoundary = head.match(/^([A-Z]{2,})([A-Z][a-z])/);
  if (acronymBoundary) return acronymBoundary[1];
  const pascal = head.match(/^[A-Z][a-z]+/);
  if (pascal) return pascal[0];
  const allUpper = head.match(/^[A-Z]+$/);
  if (allUpper && allUpper[0].length >= MIN_PREFIX_LEN) return allUpper[0];
  return null;
}

/**
 * Extract a dispatcher's domain name from its filename.
 * Examples:
 *   latheDispatcher.ts             → "lathe"
 *   cadFusionLiveDispatcher.ts     → "cad"
 *   aiReasoningDispatcher.ts       → "ai"
 *   awarenessMiddleware.test.ts    → null
 */
export function extractDispatcherDomain(filename) {
  if (!filename || typeof filename !== "string") return null;
  if (!filename.endsWith("Dispatcher.ts")) return null;
  if (filename.includes(".test.")) return null;
  const m = filename.match(DISPATCHER_FILE_SUFFIX);
  if (!m) return null;
  // Take the leading lowercase chunk as the canonical domain. For
  // `cadFusionLiveDispatcher`, that's `cad`; the rest is sub-scoping.
  const camel = m[1];
  const lead = camel.match(/^[a-z]+/);
  return lead ? lead[0] : camel;
}

// ──────────────────────────────────────────────────────────────────────
// Directory scans
// ──────────────────────────────────────────────────────────────────────

export function scanEngines(absDir) {
  if (!existsSync(absDir)) return { ok: false, reason: `engines dir not found: ${absDir}` };
  let entries;
  try { entries = readdirSync(absDir); }
  catch (err) { return { ok: false, reason: `readdir failed: ${String(err && err.message || err)}` }; }
  const engines = [];
  for (const e of entries) {
    const prefix = extractEnginePrefix(e);
    if (prefix) engines.push({ filename: e, prefix });
  }
  return { ok: true, engines };
}

export function scanDispatchers(absDir) {
  if (!existsSync(absDir)) return { ok: false, reason: `dispatchers dir not found: ${absDir}` };
  let entries;
  try { entries = readdirSync(absDir); }
  catch (err) { return { ok: false, reason: `readdir failed: ${String(err && err.message || err)}` }; }
  const dispatchers = new Set();
  for (const e of entries) {
    const domain = extractDispatcherDomain(e);
    if (domain) dispatchers.add(domain);
  }
  return { ok: true, dispatchers };
}

// ──────────────────────────────────────────────────────────────────────
// Matching
// ──────────────────────────────────────────────────────────────────────

/**
 * Group engines by prefix, partition into matched vs unmatched against
 * the dispatcher domain set + the curated alias map.
 */
export function groupByPrefix(engines, dispatchers, aliases = DEFAULT_ALIASES) {
  const buckets = new Map();
  for (const e of engines) {
    if (!buckets.has(e.prefix)) buckets.set(e.prefix, []);
    buckets.get(e.prefix).push(e.filename);
  }
  const matched = [];
  const unmatched = [];
  for (const [prefix, files] of buckets) {
    const lower = prefix.toLowerCase();
    const isMatched = dispatchers.has(lower) || aliases[prefix] != null;
    const entry = {
      prefix,
      engine_count: files.length,
      sample_engines: files.slice(0, SAMPLE_ENGINES_PER_CANDIDATE).map((f) => f.replace(/\.ts$/, "")),
    };
    if (isMatched) matched.push({ ...entry, dispatcher: aliases[prefix] || lower });
    else unmatched.push(entry);
  }
  unmatched.sort((a, b) => b.engine_count - a.engine_count || a.prefix.localeCompare(b.prefix));
  matched.sort((a, b) => b.engine_count - a.engine_count || a.prefix.localeCompare(b.prefix));
  return { matched, unmatched };
}

// ──────────────────────────────────────────────────────────────────────
// Existing-dict merge — preserve promoted{} + per-candidate first_seen
// ──────────────────────────────────────────────────────────────────────

export function loadExistingDict(absPath) {
  if (!existsSync(absPath)) return { schemaVersion: 1, promoted: {}, candidates: [] };
  let parsed;
  try {
    const raw = readFileSync(absPath, "utf8");
    parsed = JSON.parse(raw);
  } catch {
    return { schemaVersion: 1, promoted: {}, candidates: [] };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { schemaVersion: 1, promoted: {}, candidates: [] };
  }
  return {
    schemaVersion: parsed.schemaVersion || 1,
    promoted: parsed.promoted && typeof parsed.promoted === "object" && !Array.isArray(parsed.promoted) ? parsed.promoted : {},
    candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
  };
}

export function mergeCandidates(existing, current, generatedAt) {
  const existingByPrefix = new Map();
  for (const c of existing.candidates) existingByPrefix.set(c.prefix, c);
  return current.map((c) => {
    const prior = existingByPrefix.get(c.prefix);
    return {
      prefix: c.prefix,
      engine_count: c.engine_count,
      sample_engines: c.sample_engines,
      first_seen: prior && prior.first_seen ? prior.first_seen : generatedAt,
      last_seen: generatedAt,
      previous_engine_count: prior ? prior.engine_count : null,
      delta_since_last: prior ? c.engine_count - prior.engine_count : null,
    };
  });
}

// ──────────────────────────────────────────────────────────────────────
// Top-level orchestrator
// ──────────────────────────────────────────────────────────────────────

function resolveAbsPath(repo, override, fallback) {
  if (!override) return join(repo, fallback);
  return pathIsAbsolute(override) ? override : join(repo, override);
}

function emptyDictShape() {
  return {
    schemaVersion: 1,
    counts: { engines_scanned: 0, dispatchers_scanned: 0, prefixes_matched: 0, prefixes_unmatched: 0 },
    promoted: {},
    candidates: [],
    matched_summary: [],
    unmatched_summary: [],
  };
}

export async function buildDict(opts = {}) {
  const repo = opts.repo || DEFAULT_REPO;
  const enginesDir = resolveAbsPath(repo, opts.enginesDir, DEFAULT_ENGINES_DIR);
  const dispatchersDir = resolveAbsPath(repo, opts.dispatchersDir, DEFAULT_DISPATCHERS_DIR);
  const outJsonPath = resolveAbsPath(repo, opts.outJson, DEFAULT_OUT_JSON);
  const generatedAt = opts.frozenTime || new Date().toISOString();
  const top = typeof opts.top === "number" && opts.top > 0 ? Math.floor(opts.top) : DEFAULT_TOP_N;

  const eng = scanEngines(enginesDir);
  if (!eng.ok) {
    return {
      ok: false,
      reason: `engines: ${eng.reason}`,
      generated_at: generatedAt,
      engines_dir: enginesDir.replace(/\\/g, "/"),
      dispatchers_dir: dispatchersDir.replace(/\\/g, "/"),
      ...emptyDictShape(),
    };
  }
  const disp = scanDispatchers(dispatchersDir);
  if (!disp.ok) {
    return {
      ok: false,
      reason: `dispatchers: ${disp.reason}`,
      generated_at: generatedAt,
      engines_dir: enginesDir.replace(/\\/g, "/"),
      dispatchers_dir: dispatchersDir.replace(/\\/g, "/"),
      ...emptyDictShape(),
    };
  }
  const existing = loadExistingDict(outJsonPath);
  const grouped = groupByPrefix(eng.engines, disp.dispatchers, existing.promoted);
  const topCandidates = grouped.unmatched.slice(0, top);
  const merged = mergeCandidates(existing, topCandidates, generatedAt);

  return {
    ok: true,
    schemaVersion: 1,
    generated_at: generatedAt,
    engines_dir: enginesDir.replace(/\\/g, "/"),
    dispatchers_dir: dispatchersDir.replace(/\\/g, "/"),
    counts: {
      engines_scanned: eng.engines.length,
      dispatchers_scanned: disp.dispatchers.size,
      prefixes_matched: grouped.matched.length,
      prefixes_unmatched: grouped.unmatched.length,
    },
    promoted: existing.promoted,
    candidates: merged,
    matched_summary: grouped.matched.slice(0, 10).map((m) => ({ prefix: m.prefix, dispatcher: m.dispatcher, engine_count: m.engine_count })),
    unmatched_summary: grouped.unmatched.slice(0, 20).map((u) => ({ prefix: u.prefix, engine_count: u.engine_count })),
  };
}

// ──────────────────────────────────────────────────────────────────────
// Markdown render
// ──────────────────────────────────────────────────────────────────────

export function renderMarkdown(report) {
  if (!report.ok) {
    return `# WIRING_DOMAIN_DICT\n\n**ERROR:** ${report.reason}\n\nGenerated: ${report.generated_at}\n`;
  }
  const lines = [];
  lines.push("# Wiring Domain Dictionary");
  lines.push("");
  lines.push(`> Generated: ${report.generated_at}`);
  lines.push(`> Source: \`scripts/build-wiring-domain-dict.mjs\``);
  lines.push(`> Engines: ${report.counts.engines_scanned} files in \`${report.engines_dir}\``);
  lines.push(`> Dispatchers: ${report.counts.dispatchers_scanned} domains in \`${report.dispatchers_dir}\``);
  lines.push("");
  lines.push(`Matched prefixes: **${report.counts.prefixes_matched}**`);
  lines.push(`Unmatched prefixes: **${report.counts.prefixes_unmatched}**`);
  lines.push("");
  lines.push("## Top candidates (unmatched — wire next)");
  lines.push("");
  if (report.candidates.length === 0) {
    lines.push("_No unmatched prefixes found this run._");
  } else {
    lines.push("| Prefix | Engine count | Δ vs prior | First seen | Sample engines |");
    lines.push("|--------|-------------:|----------:|------------|----------------|");
    for (const c of report.candidates) {
      const delta = c.delta_since_last == null ? "—" : (c.delta_since_last > 0 ? `+${c.delta_since_last}` : `${c.delta_since_last}`);
      const sample = c.sample_engines.slice(0, 3).join(", ");
      lines.push(`| \`${c.prefix}\` | ${c.engine_count} | ${delta} | ${c.first_seen} | ${sample} |`);
    }
  }
  lines.push("");
  lines.push("## Promoted (Mark-curated)");
  lines.push("");
  const promotedKeys = Object.keys(report.promoted);
  if (promotedKeys.length === 0) {
    lines.push("_No prefixes promoted yet. Move entries from `candidates[]` into `promoted{prefix: dispatcherTarget}` once you've decided on a dispatcher._");
  } else {
    lines.push("| Prefix | Dispatcher target |");
    lines.push("|--------|-------------------|");
    for (const k of promotedKeys.sort()) lines.push(`| \`${k}\` | \`${report.promoted[k]}\` |`);
  }
  lines.push("");
  lines.push("## Top matched prefixes (already wired)");
  lines.push("");
  if (report.matched_summary.length === 0) {
    lines.push("_None._");
  } else {
    lines.push("| Prefix | Dispatcher | Engine count |");
    lines.push("|--------|------------|-------------:|");
    for (const m of report.matched_summary) lines.push(`| \`${m.prefix}\` | \`${m.dispatcher}\` | ${m.engine_count} |`);
  }
  lines.push("");
  lines.push("> Advisory only — `candidates` are heuristic suggestions; Mark promotes manually.");
  return lines.join("\n");
}

// ──────────────────────────────────────────────────────────────────────
// Atomic write — same idiom as siblings
// ──────────────────────────────────────────────────────────────────────

export function writeAtomic(absPath, content) {
  const dir = dirname(absPath);
  mkdirSync(dir, { recursive: true });
  const tmp = `${absPath}.tmp-${process.pid}-${Date.now()}-${randomBytes(3).toString("hex")}`;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, absPath);
}

// ──────────────────────────────────────────────────────────────────────
// CLI entry
// ──────────────────────────────────────────────────────────────────────

export async function runCli(argv = process.argv, opts = {}) {
  const args = parseArgs(argv);
  const repo = opts.repo || DEFAULT_REPO;
  const report = await buildDict({
    repo,
    enginesDir: args.enginesDir || opts.enginesDir,
    dispatchersDir: args.dispatchersDir || opts.dispatchersDir,
    frozenTime: args.frozenTime,
    top: args.top,
    outJson: opts.outJson,
  });

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return report;
  }

  const outJson = join(repo, DEFAULT_OUT_JSON);
  const outMd = join(repo, DEFAULT_OUT_MD);
  try {
    writeAtomic(outJson, JSON.stringify(report, null, 2) + "\n");
    writeAtomic(outMd, renderMarkdown(report));
  } catch (err) {
    process.stderr.write(`build-wiring-domain-dict: write failed — ${String(err && err.message || err)}\n`);
    process.exitCode = 0;
  }

  if (report.ok) {
    process.stdout.write(
      `wiring-domain-dict: engines=${report.counts.engines_scanned} dispatchers=${report.counts.dispatchers_scanned} matched=${report.counts.prefixes_matched} unmatched=${report.counts.prefixes_unmatched} top-${report.candidates.length}=${report.candidates.map((c) => `${c.prefix}(${c.engine_count})`).join(",")}\n`,
    );
  } else {
    process.stdout.write(`wiring-domain-dict: not ok — ${report.reason}\n`);
  }
  return report;
}

const invokedDirectly = (() => {
  try {
    if (!process.argv[1]) return false;
    return pathToFileURL(process.argv[1]).href === import.meta.url;
  } catch {
    return false;
  }
})();
if (invokedDirectly) {
  void runCli().catch((err) => {
    process.stderr.write(`build-wiring-domain-dict: unhandled — ${String(err && err.stack || err)}\n`);
    process.exitCode = 0;
  });
}
