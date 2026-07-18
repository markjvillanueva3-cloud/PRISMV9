#!/usr/bin/env node
/**
 * populate-5h-quota.mjs -- Alternate 5h-usage populator for token-awareness sidecars.
 *
 * PROBLEM: Claude Code on this host does NOT emit `rate_limits.five_hour` in its
 * statusLine stdin JSON, so `quota.fiveHour.pct` is null in every
 * `state/shared/token-budget-<slot>.json` sidecar. The account-switch-restart-
 * coordinator reads that field and fails loud (FIVE_HOUR_SOURCE_UNAVAILABLE) when
 * all slots report null -- blocking account auto-switch entirely.
 *
 * SOLUTION: Parse the rolling-5h token usage directly from Claude Code's own
 * conversation JSONL files (~/.claude/projects/**\/*.jsonl) -- the same corpus
 * ccusage uses. Compute the usage fraction against a documented, env-overridable
 * ceiling and write it into `quota.fiveHour.pct` in the sidecar, leaving all other
 * sidecar fields untouched (atomic merge-write).
 *
 * TOKEN ACCOUNTING (R12 -- honest):
 *   ccusage `blocks` counts `inputTokens + outputTokens + cacheCreationInputTokens +
 *   cacheReadInputTokens` as `totalTokens` in a 5h block. We use the same formula.
 *   However Anthropic's actual rate-limit window may count differently (e.g. cache
 *   reads at 1/10 weight). We do NOT know the exact formula -- the ceiling and formula
 *   are best-effort until Claude Code emits rate_limits.five_hour natively. The
 *   purpose is to give the coordinator a FINITE number so the switch triggers
 *   approximately correctly, rather than never triggering at all.
 *
 * 5H CEILING (PRISM_FIVE_HOUR_TOKEN_CEILING env or DEFAULT_FIVE_HOUR_CEILING):
 *   The exact ceiling is not publicly documented and varies by account plan. The
 *   default (88_000_000) is derived empirically from ccusage observations on this
 *   host (claude-opus-4-8 + claude-sonnet-4-6 fleet; current 5h block hit ~102M
 *   tokens total). Set PRISM_FIVE_HOUR_TOKEN_CEILING=<N> to override.
 *   Until Claude Code emits the field natively, treat the % as approximate (+/-15%).
 *
 * SIDECAR MERGE CONTRACT:
 *   Reads the existing sidecar, patches ONLY `quota.fiveHour.{pct, resetsAt,
 *   source}`, leaves every other field (ctx, zone, cumulative, offload, etc.)
 *   untouched. Atomic write (.tmp -> rename). Fail-soft on missing sidecar (logs
 *   to stderr, exits 0) -- never blocks the fleet.
 *
 * USAGE:
 *   node scripts/populate-5h-quota.mjs [--slot <name>] [--all] [--json] [--dry-run]
 *   PRISM_FIVE_HOUR_TOKEN_CEILING=<N>   token ceiling (default 88_000_000)
 *   PRISM_FIVE_HOUR_PROJECTS_DIR=<path> override ~/.claude/projects scan root
 *   PRISM_FIVE_HOUR_DISABLE=1           no-op (safety exit)
 *
 * Can also be imported as a pure library (no I/O from the pure functions).
 *
 * @module populate-5h-quota
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ---- constants ---------------------------------------------------------------

/**
 * Default 5h token ceiling. Empirically derived from ccusage observations on this
 * host (fleet hitting ~102M tokens/5h block). Set PRISM_FIVE_HOUR_TOKEN_CEILING to
 * override.
 *
 * R12 HONESTY: This is an approximation. The true Anthropic ceiling is not publicly
 * documented and may differ by plan. This default is intentionally conservative
 * (set below observed peak) so the coordinator triggers BEFORE the actual limit.
 */
export const DEFAULT_FIVE_HOUR_CEILING = 88_000_000;

/** Rolling window: 5 hours in ms. */
export const WINDOW_MS = 5 * 60 * 60 * 1000;

/** Source tag written into the sidecar for diagnostics. */
export const SOURCE_TAG = "populate-5h-quota:jsonl-rolling-sum";

// ---- pure core (no I/O) ------------------------------------------------------

/**
 * Parse the ceiling from an env object. Falls back to DEFAULT_FIVE_HOUR_CEILING.
 * Pure.
 *
 * @param {object} env  process.env or injected equivalent
 * @returns {number}
 */
export function ceilingFromEnv(env = process.env) {
  const v = parseInt(env?.PRISM_FIVE_HOUR_TOKEN_CEILING, 10);
  if (Number.isFinite(v) && v > 0) return v;
  return DEFAULT_FIVE_HOUR_CEILING;
}

/**
 * Compute the rolling 5h token sum from an array of usage records.
 *
 * Each record is expected to be a parsed JSONL line with:
 *   { type: 'assistant', timestamp: ISO-string, message: { usage: { input_tokens,
 *     output_tokens, cache_read_input_tokens, cache_creation_input_tokens } } }
 *
 * Malformed / missing fields are skipped gracefully (R12: never silently inflate).
 * Records outside the window are excluded. Exactly-on-the-boundary records ARE
 * included (ts >= cutoff).
 *
 * Total = input + output + cacheCreation + cacheRead (same formula as ccusage blocks).
 *
 * @param {object[]} records       Parsed JSONL record objects (any type, non-assistant ignored)
 * @param {number}   nowMs         Current time in ms (injectable for tests)
 * @param {number}   [windowMs]    Rolling window in ms (default WINDOW_MS)
 * @returns {{ total: number, input: number, output: number, cacheRead: number, cacheCreate: number, counted: number }}
 */
export function computeRollingSum(records, nowMs, windowMs = WINDOW_MS) {
  const cutoff = nowMs - windowMs;
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheCreate = 0;
  let counted = 0;

  for (const rec of records) {
    // Only assistant turns carry usage
    if (!rec || rec.type !== "assistant") continue;

    // Parse timestamp -- must be within the window
    const ts = rec.timestamp ? new Date(rec.timestamp).getTime() : NaN;
    if (!Number.isFinite(ts) || ts < cutoff) continue;

    const u = rec.message?.usage;
    if (!u || typeof u !== "object") continue;

    const i = Number(u.input_tokens) || 0;
    const o = Number(u.output_tokens) || 0;
    const cr = Number(u.cache_read_input_tokens) || 0;
    const cc = Number(u.cache_creation_input_tokens) || 0;

    // Skip obviously corrupt records (all zeroes with no content)
    if (i === 0 && o === 0 && cr === 0 && cc === 0) continue;

    input += i;
    output += o;
    cacheRead += cr;
    cacheCreate += cc;
    counted++;
  }

  return {
    total: input + output + cacheRead + cacheCreate,
    input,
    output,
    cacheRead,
    cacheCreate,
    counted,
  };
}

/**
 * Compute the 5h usage fraction (0..1) from a rolling sum and a ceiling.
 * Returns null if ceiling <= 0 or total is not finite.
 * Clamps to [0, 1] -- the fleet may exceed the ceiling (overusage is 1.0, not >1).
 *
 * @param {number} total
 * @param {number} ceiling
 * @returns {number|null}
 */
export function computePct(total, ceiling) {
  if (!Number.isFinite(total) || !Number.isFinite(ceiling) || ceiling <= 0) return null;
  const raw = total / ceiling;
  if (!Number.isFinite(raw)) return null;
  return Math.max(0, Math.min(1, raw));
}

/**
 * Merge a computed fiveHour reading into an existing sidecar document.
 * Returns a NEW object (never mutates input). Only touches `quota.fiveHour`.
 *
 * If the sidecar has no `quota` field at all (quota=null means the sidecar writer
 * had no rate_limits from Claude Code), we create the minimal quota envelope.
 * The `sevenDay` sub-field is left untouched if present, initialized to null if absent.
 *
 * @param {object|null} existing   Existing sidecar doc (null = start fresh)
 * @param {object}      reading    { pct: number|null, resetsAt: string|null, computedAt: string|null }
 * @returns {object}               Updated sidecar doc
 */
export function mergeFiveHourIntoSidecar(existing, reading) {
  const doc = existing ? { ...existing } : {};

  // Build the fiveHour object
  const fiveHour = {
    pct: reading.pct,
    resetsAt: reading.resetsAt ?? null,
    source: SOURCE_TAG,
    computedAt: reading.computedAt ?? null,
  };

  if (doc.quota && typeof doc.quota === "object") {
    // Preserve sevenDay + any future fields; only overwrite fiveHour
    doc.quota = { ...doc.quota, fiveHour };
  } else {
    // quota was null (Claude Code not emitting rate_limits) -- create the envelope
    doc.quota = {
      fiveHour,
      sevenDay: { pct: null, resetsAt: null },
    };
  }

  return doc;
}

// ---- I/O helpers (injectable via opts for tests) -----------------------------

/**
 * Enumerate all .jsonl file paths under a projects directory tree.
 * Scans all immediate subdirectories of `projectsRoot` for *.jsonl files.
 * Skips unreadable directories (fail-soft).
 *
 * @param {string}  projectsRoot  e.g. ~/.claude/projects
 * @param {object}  [_fs]         injectable fs (tests)
 * @returns {string[]}            absolute .jsonl paths
 */
export function enumerateJsonlFiles(projectsRoot, _fs = fs) {
  const paths = [];
  let subdirs;
  try {
    subdirs = _fs.readdirSync(projectsRoot, { withFileTypes: true });
  } catch {
    return paths;
  }
  for (const entry of subdirs) {
    if (!entry.isDirectory()) continue;
    const sub = path.join(projectsRoot, entry.name);
    let files;
    try {
      files = _fs.readdirSync(sub);
    } catch {
      continue;
    }
    for (const f of files) {
      if (f.endsWith(".jsonl")) paths.push(path.join(sub, f));
    }
  }
  return paths;
}

/**
 * Load all JSONL records from a list of file paths that were modified within
 * `windowMs` of `nowMs` (mtime pre-filter to avoid reading thousands of old files).
 * Malformed lines are skipped. Fail-soft per file.
 *
 * @param {string[]} filePaths
 * @param {number}   nowMs
 * @param {number}   windowMs
 * @param {object}   [_fs]
 * @returns {object[]}  parsed records (may be large)
 */
export function loadRecentRecords(filePaths, nowMs, windowMs = WINDOW_MS, _fs = fs) {
  const cutoff = nowMs - windowMs;
  const records = [];
  for (const fp of filePaths) {
    // mtime pre-filter: skip files not touched in window (fast inode read, no data)
    try {
      if (_fs.statSync(fp).mtimeMs < cutoff) continue;
    } catch {
      continue;
    }

    let content;
    try {
      content = _fs.readFileSync(fp, "utf8");
    } catch {
      continue;
    }
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        records.push(JSON.parse(line));
      } catch {
        // malformed -- skip
      }
    }
  }
  return records;
}

/**
 * Read an existing sidecar file. Returns null if missing or unparseable.
 * Fail-soft.
 *
 * @param {string} sidecarPath
 * @param {object} [_fs]
 * @returns {object|null}
 */
export function readSidecar(sidecarPath, _fs = fs) {
  try {
    return JSON.parse(_fs.readFileSync(sidecarPath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Atomic write: write to a .tmp sibling, then rename. The temp file uses
 * PID + timestamp suffix to avoid collisions from concurrent callers.
 *
 * @param {string} filePath
 * @param {object} doc
 * @param {object} [_fs]
 */
export function atomicWriteSidecar(filePath, doc, _fs = fs) {
  const dir = path.dirname(filePath);
  _fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );
  _fs.writeFileSync(tmp, JSON.stringify(doc, null, 2));
  _fs.renameSync(tmp, filePath);
}

// ---- orchestration -----------------------------------------------------------

/**
 * Resolve the projects directory to scan. Injectable via opts for tests.
 *
 * @param {object} opts
 * @param {string} [opts.projectsDir]  explicit override
 * @param {object} [opts.env]          process.env-like object
 * @returns {string}
 */
export function resolveProjectsDir(opts = {}) {
  if (opts.projectsDir) return opts.projectsDir;
  if (opts.env?.PRISM_FIVE_HOUR_PROJECTS_DIR) return opts.env.PRISM_FIVE_HOUR_PROJECTS_DIR;
  if (process.env.PRISM_FIVE_HOUR_PROJECTS_DIR) return process.env.PRISM_FIVE_HOUR_PROJECTS_DIR;
  // Default: ~/.claude/projects
  return path.join(os.homedir(), ".claude", "projects");
}

/**
 * Resolve the sidecar directory.
 *
 * @param {object} opts
 * @param {string} [opts.sidecarDir]
 * @param {string} [opts.prismRoot]
 * @returns {string}
 */
export function resolveSidecarDir(opts = {}) {
  if (opts.sidecarDir) return opts.sidecarDir;
  return path.join(opts.prismRoot || "H:/prism", "state", "shared");
}

/**
 * Main orchestration: compute the rolling 5h pct and write it into the sidecar(s).
 *
 * Returns a result object. Never throws (fail-soft on I/O errors; fail-loud
 * semantics are left to the coordinator which reads the sidecar).
 *
 * @param {object}    opts
 * @param {string[]}  [opts.slots]          explicit slot list (default: scan all token-budget-*.json)
 * @param {string}    [opts.sidecarDir]     override sidecar directory
 * @param {string}    [opts.projectsDir]    override ~/.claude/projects
 * @param {string}    [opts.prismRoot]      repo root (default H:/prism)
 * @param {number}    [opts.ceiling]        token ceiling override
 * @param {object}    [opts.env]            env override (tests)
 * @param {boolean}   [opts.dryRun]         skip write (compute only)
 * @param {number}    [opts.nowMs]          clock override (tests)
 * @param {object[]|null} [opts._records]   pre-loaded records (tests -- skips file I/O)
 * @param {object}    [opts._fs]            injectable fs (tests)
 * @returns {Promise<{ok:boolean, pct:number|null, total:number, ceiling:number,
 *           counted:number, slotsWritten:number, slotsSkipped:number, dryRun:boolean,
 *           error?:string, breakdown?:object, computedAt?:string, source:string}>}
 */
export async function populateFiveHourQuota(opts = {}) {
  const _fs = opts._fs || fs;
  const nowMs = opts.nowMs ?? Date.now();
  const dryRun = opts.dryRun === true;
  const ceiling =
    Number.isFinite(opts.ceiling) && opts.ceiling > 0
      ? opts.ceiling
      : ceilingFromEnv(opts.env || process.env);

  // 1. Load records (or use injected test records)
  let records;
  if (Array.isArray(opts._records)) {
    records = opts._records;
  } else {
    const projectsDir = resolveProjectsDir(opts);
    const filePaths = enumerateJsonlFiles(projectsDir, _fs);
    records = loadRecentRecords(filePaths, nowMs, WINDOW_MS, _fs);
  }

  // 2. Compute rolling sum + pct
  const sum = computeRollingSum(records, nowMs, WINDOW_MS);
  const pct = computePct(sum.total, ceiling);
  const computedAt = new Date(nowMs).toISOString();

  const reading = { pct, resetsAt: null, computedAt };

  // 3. Determine which sidecars to write
  const sidecarDir = resolveSidecarDir(opts);
  let slotFiles = [];
  try {
    if (Array.isArray(opts.slots) && opts.slots.length) {
      slotFiles = opts.slots.map((s) => ({
        slot: s,
        file: path.join(sidecarDir, `token-budget-${s}.json`),
      }));
    } else {
      // Scan for all token-budget-*.json files
      slotFiles = _fs
        .readdirSync(sidecarDir)
        .filter((f) => /^token-budget-[a-z]+\.json$/.test(f))
        .map((f) => ({
          slot: f.replace(/^token-budget-|\.json$/g, ""),
          file: path.join(sidecarDir, f),
        }));
    }
  } catch (e) {
    return {
      ok: false,
      pct,
      total: sum.total,
      ceiling,
      counted: sum.counted,
      slotsWritten: 0,
      slotsSkipped: 0,
      dryRun,
      source: SOURCE_TAG,
      error: `sidecar dir unreadable: ${e.message}`,
    };
  }

  // 4. Merge + write into each sidecar
  let slotsWritten = 0;
  let slotsSkipped = 0;
  for (const { slot, file } of slotFiles) {
    const existing = readSidecar(file, _fs);
    if (!existing) {
      // Sidecar doesn't exist yet for this slot -- skip (don't create one;
      // the sidecar writer hook creates them; we only update existing ones)
      slotsSkipped++;
      continue;
    }
    const updated = mergeFiveHourIntoSidecar(existing, reading);
    if (!dryRun) {
      try {
        atomicWriteSidecar(file, updated, _fs);
        slotsWritten++;
      } catch (e) {
        process.stderr.write(
          `[populate-5h-quota] write failed for slot=${slot}: ${e.message}\n`
        );
        slotsSkipped++;
      }
    } else {
      slotsWritten++; // dry-run: count as "would have written"
    }
  }

  return {
    ok: true,
    pct,
    total: sum.total,
    ceiling,
    counted: sum.counted,
    breakdown: {
      input: sum.input,
      output: sum.output,
      cacheRead: sum.cacheRead,
      cacheCreate: sum.cacheCreate,
    },
    slotsWritten,
    slotsSkipped,
    dryRun,
    computedAt,
    source: SOURCE_TAG,
  };
}

// ---- CLI ---------------------------------------------------------------------

function parseArgs(argv) {
  const a = { slots: [], dryRun: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--dry-run") {
      a.dryRun = true;
    } else if (t === "--json") {
      a.json = true;
    } else if (t === "--slot") {
      if (argv[i + 1]) a.slots.push(argv[++i]);
    } else if (t === "--ceiling") {
      a.ceiling = Number(argv[++i]);
    } else if (t === "--sidecar-dir") {
      a.sidecarDir = argv[++i];
    } else if (t === "--projects-dir") {
      a.projectsDir = argv[++i];
    } else if (t === "--prism-root") {
      a.prismRoot = argv[++i];
    }
  }
  return a;
}

async function main() {
  if (process.env.PRISM_FIVE_HOUR_DISABLE === "1") process.exit(0);

  const args = parseArgs(process.argv.slice(2));

  const result = await populateFiveHourQuota({
    slots: args.slots.length ? args.slots : [],
    dryRun: args.dryRun,
    ceiling: Number.isFinite(args.ceiling) ? args.ceiling : undefined,
    sidecarDir: args.sidecarDir || undefined,
    projectsDir: args.projectsDir || undefined,
    prismRoot: args.prismRoot || undefined,
  });

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    const pctStr = result.pct !== null ? `${(result.pct * 100).toFixed(1)}%` : "null";
    const mode = result.dryRun ? " [DRY-RUN]" : "";
    const b = result.breakdown ?? {};
    process.stdout.write(
      `[populate-5h-quota] 5h usage: ${pctStr}` +
        ` (${result.total.toLocaleString()} / ${result.ceiling.toLocaleString()} tokens,` +
        ` ${result.counted} records in window)${mode}\n` +
        `  breakdown: input=${String(b.input)} output=${String(b.output)}` +
        ` cacheRead=${String(b.cacheRead)} cacheCreate=${String(b.cacheCreate)}\n` +
        `  sidecars: wrote=${result.slotsWritten} skipped=${result.slotsSkipped}\n`
    );
    if (!result.ok) {
      process.stderr.write(`[populate-5h-quota] ERROR: ${result.error}\n`);
    }
  }

  process.exit(result.ok ? 0 : 1);
}

const _isMain =
  typeof process.argv[1] === "string" &&
  path.basename(process.argv[1]) === "populate-5h-quota.mjs";

if (_isMain) {
  void main().catch((e) => {
    process.stderr.write(`[populate-5h-quota] fatal: ${e?.stack || String(e)}\n`);
    process.exit(1);
  });
}
