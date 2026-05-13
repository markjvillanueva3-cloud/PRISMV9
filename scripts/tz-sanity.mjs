#!/usr/bin/env node
/**
 * tz-sanity.mjs — CLEANUP-MS0 / U-CLEANUP-TZ-HELPER
 *
 * Time-zone hygiene helper for PRISM's append-only JSONLs and Markdown dashboards.
 *
 * Three concerns, one module:
 *
 *   1. JSONL validator: assert every timestamp field in a JSONL file is a UTC
 *      ISO-8601 string suffixed with `Z`. Drift creeps in when a script does
 *      `new Date().toString()` (local) or `.toISOString().slice(0,-1)` (drops Z).
 *      Cross-host correlations break when two chats on different TZs write
 *      adjacent rows.
 *
 *   2. Dashboard marker: emit a `<!-- timeBasis: UTC -->` HTML comment so a
 *      regenerated dashboard advertises its time basis. The F4 dashboard reads
 *      this; a dashboard without the marker is treated as ambiguous-TZ.
 *
 *   3. F4 dual-render: format an ISO timestamp as both UTC and local for the
 *      dashboards that want both columns (helps the human, machine still gets Z).
 *
 * No engine — this is a pure utility. Imported by hooks/dashboards as needed.
 *
 * CLI:
 *   node scripts/tz-sanity.mjs <path-or-glob>           # scan one file
 *   node scripts/tz-sanity.mjs --dir state/shared --glob "*.jsonl"
 *   node scripts/tz-sanity.mjs --fields ts,timestamp,recorded_at <path>
 *
 * Exit: 0 = clean, 1 = violations found, 2 = bad args / read error.
 *
 * @see U-CLEANUP-TZ-HELPER (envelope was not_started)
 * @see scripts/dashboard-archive-rotate.mjs (companion G13 unit, same conventions)
 */

import { existsSync, readdirSync, statSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { join, basename, isAbsolute, resolve } from "node:path";

/** Max violations rendered per file in human-mode output (full set still returned in JSON). */
const VIOLATION_RENDER_LIMIT = 10;

/** Field names commonly used for timestamps in PRISM JSONLs. */
export const DEFAULT_TIMESTAMP_FIELDS = Object.freeze([
  "ts", "timestamp", "at", "time", "iso",
  "recorded_at", "created_at", "updated_at", "last_seen_at", "claimed_at", "expires_at",
  "completedAt", "lastHeartbeat", "generatedAt",
]);

/** Strict ISO-8601-with-Z (UTC) check. Accepts millisecond precision; rejects offsets. */
const UTC_ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;

/** Accepts `+HH:MM`, `-HHMM`, or any offset — used only to classify the violation. */
const ANY_ISO_OFFSET_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:?\d{2})$/;

/**
 * @param {unknown} value
 * @returns {boolean} true iff value is an ISO-8601 UTC string suffixed with Z.
 */
export function isUtcIso(value) {
  return typeof value === "string" && UTC_ISO_RE.test(value);
}

/**
 * @param {unknown} value
 * @param {string} [label]    Optional label used in the thrown Error.
 * @throws {Error} when `value` is not a UTC-Z ISO string.
 */
export function assertUtcIso(value, label = "value") {
  if (!isUtcIso(value)) {
    const sample = typeof value === "string" ? value : JSON.stringify(value);
    throw new Error(`tz-sanity: ${label} is not UTC-Z ISO-8601: ${sample}`);
  }
}

/**
 * Classifies a value that *looks* like a timestamp but isn't UTC-Z. Used by the
 * scanner to give actionable violation messages without false positives on
 * arbitrary strings.
 *
 * @param {unknown} value
 * @returns {"ok"|"offset"|"local"|"unix"|"non-timestamp"}
 */
export function classifyTimestamp(value) {
  if (typeof value !== "string") {
    // Plausible unix epoch — seconds (≈10 digits, 1e9..1e10) or millis
    // (≈13 digits, 1e12..1e13). Upper bound 1e14 keeps the window open for
    // future dates while excluding obvious flag/count integers.
    if (typeof value === "number" && value > 1_000_000_000 && value < 100_000_000_000_000) {
      return "unix";
    }
    return "non-timestamp";
  }
  if (UTC_ISO_RE.test(value)) return "ok";
  if (ANY_ISO_OFFSET_RE.test(value)) return "offset";
  // Date.toString() looks like "Tue May 13 2026 14:35:51 GMT-0700 (PDT)".
  if (/^\w{3} \w{3} \d{1,2} \d{4} \d{2}:\d{2}:\d{2}\b/.test(value)) return "local";
  return "non-timestamp";
}

/**
 * Streams a JSONL file and reports lines with non-UTC timestamps.
 *
 * @param {string} filePath
 * @param {object} [opts]
 * @param {string[]} [opts.fields]        Field names to check (default: DEFAULT_TIMESTAMP_FIELDS).
 * @param {number}   [opts.maxLines]      Stop after N lines (0 = unlimited).
 * @param {number}   [opts.maxViolations] Stop scanning after N violations (0 = unlimited; default 50).
 * @returns {Promise<{filePath: string, linesScanned: number, violations: Array<{lineNo:number, field:string, value:unknown, kind:string}>}>}
 */
export async function scanJsonlForNonUtc(filePath, opts = {}) {
  const fields = opts.fields ?? DEFAULT_TIMESTAMP_FIELDS;
  const maxLines = opts.maxLines ?? 0;
  const maxViolations = opts.maxViolations ?? 50;

  const result = { filePath, linesScanned: 0, violations: [], readError: null };

  if (!existsSync(filePath)) {
    result.readError = "file-missing";
    return result;
  }

  // Empty file = clean (very common for freshly-created append-only JSONLs).
  try {
    const st = statSync(filePath);
    if (st.size === 0) return result;
  } catch { /* fall through and try to read */ }

  const stream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  let lineNo = 0;
  for await (const rawLine of rl) {
    if (maxLines && lineNo >= maxLines) break;
    lineNo += 1;
    const line = rawLine.replace(/^﻿/, "").trim();
    if (!line) continue;

    let obj;
    try { obj = JSON.parse(line); }
    catch { continue; /* tolerate malformed lines — that's a different lint */ }
    if (typeof obj !== "object" || obj === null) continue;

    for (const f of fields) {
      if (!(f in obj)) continue;
      const v = obj[f];
      const kind = classifyTimestamp(v);
      if (kind === "ok" || kind === "non-timestamp") continue;
      // Only flag plausible-timestamp violations (offset / local / unix), not
      // arbitrary strings that happen to live in a field named "at".
      result.violations.push({ lineNo, field: f, value: v, kind });
      if (maxViolations && result.violations.length >= maxViolations) {
        rl.close();
        stream.destroy();
        return { ...result, linesScanned: lineNo };
      }
    }
  }
  return { ...result, linesScanned: lineNo };
}

/**
 * HTML comment marker advertising a dashboard's time basis. Dashboards regen'd
 * by tools that touch time should include this near the top so F4 (and any
 * human reader) can disambiguate UTC vs local rendering.
 *
 * @param {object} [opts]
 * @param {string} [opts.generatedAt]  ISO-8601 UTC string (default: now).
 * @returns {string} e.g. "<!-- timeBasis: UTC; generatedAt: 2026-05-13T22:35:51Z -->"
 */
export function tzMarker(opts = {}) {
  const ts = opts.generatedAt ?? new Date().toISOString();
  // Defensive: caller may have passed a local-time string. Normalize to Z.
  const safeTs = isUtcIso(ts) ? ts : new Date().toISOString();
  return `<!-- timeBasis: UTC; generatedAt: ${safeTs} -->`;
}

/**
 * @param {string} markdownText
 * @returns {boolean} true iff the text contains a tzMarker() output.
 */
export function hasTzMarker(markdownText) {
  return typeof markdownText === "string" && /<!--\s*timeBasis:\s*UTC\b/i.test(markdownText);
}

/**
 * Dual-render an ISO-8601 timestamp for dashboards that want both columns.
 * F4 (the awareness dashboard) uses this so the human gets local time, the
 * machine still gets the canonical UTC-Z string.
 *
 * @param {string} iso              UTC-Z ISO string.
 * @param {object} [opts]
 * @param {string} [opts.locale]    BCP-47 locale for the local rendering (default: undefined = system).
 * @param {string} [opts.timeZone]  IANA TZ for the local column (default: system).
 * @returns {{utc: string, local: string, display: string} | {error: string, utc: string|null}}
 */
export function formatUtcAndLocal(iso, opts = {}) {
  if (!isUtcIso(iso)) return { error: "not-utc-iso", utc: typeof iso === "string" ? iso : null };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { error: "bad-date", utc: iso };
  let local;
  try {
    local = new Intl.DateTimeFormat(opts.locale, {
      timeZone: opts.timeZone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false, timeZoneName: "short",
    }).format(d);
  } catch (e) {
    local = `(local-render-failed: ${e.message})`;
  }
  return { utc: iso, local, display: `${iso} (${local})` };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const out = {
    targets: [],
    dir: null,
    glob: "*.jsonl",
    fields: null,            // null = use DEFAULT_TIMESTAMP_FIELDS
    maxLines: 0,
    maxViolations: 50,
    json: false,
    showOk: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dir" && argv[i + 1]) out.dir = argv[++i];
    else if (a === "--glob" && argv[i + 1]) out.glob = argv[++i];
    else if (a === "--fields" && argv[i + 1]) {
      out.fields = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (a === "--max-lines" && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      if (Number.isFinite(n) && n >= 0) out.maxLines = n;
    } else if (a === "--max-violations" && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      if (Number.isFinite(n) && n >= 0) out.maxViolations = n;
    } else if (a === "--json") out.json = true;
    else if (a === "--show-ok") out.showOk = true;
    else if (!a.startsWith("--")) out.targets.push(a);
  }
  return out;
}

/** Tiny "glob" that supports only `*` and `?` — no `**`. Sufficient for CLI use. */
function matchSimpleGlob(name, pattern) {
  const re = new RegExp("^" + pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".") + "$");
  return re.test(name);
}

function collectTargets(args) {
  const list = [];
  for (const t of args.targets) {
    const abs = isAbsolute(t) ? t : resolve(process.cwd(), t);
    if (!existsSync(abs)) continue;
    list.push(abs);
  }
  if (args.dir) {
    const absDir = isAbsolute(args.dir) ? args.dir : resolve(process.cwd(), args.dir);
    if (existsSync(absDir)) {
      let entries = [];
      try { entries = readdirSync(absDir, { withFileTypes: true }); } catch { /* tolerate */ }
      for (const ent of entries) {
        if (!ent.isFile()) continue;
        if (!matchSimpleGlob(ent.name, args.glob)) continue;
        list.push(join(absDir, ent.name));
      }
    }
  }
  return list;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = collectTargets(args);
  if (!targets.length) {
    process.stderr.write(
      "tz-sanity: no targets — pass a path, or --dir <d> [--glob <pat>]\n"
    );
    process.exit(2);
  }

  const reports = [];
  for (const t of targets) {
    const r = await scanJsonlForNonUtc(t, {
      fields: args.fields ?? DEFAULT_TIMESTAMP_FIELDS,
      maxLines: args.maxLines,
      maxViolations: args.maxViolations,
    });
    reports.push(r);
  }

  const totalViolations = reports.reduce((acc, r) => acc + r.violations.length, 0);

  if (args.json) {
    process.stdout.write(JSON.stringify({
      ok: totalViolations === 0,
      timeBasis: "UTC",
      scanned: reports.length,
      totalViolations,
      reports,
    }, null, 2) + "\n");
  } else {
    for (const r of reports) {
      if (r.readError) {
        process.stderr.write(`✗ ${basename(r.filePath)}: ${r.readError}\n`);
        continue;
      }
      if (r.violations.length === 0) {
        if (args.showOk) {
          process.stdout.write(`✓ ${basename(r.filePath)} (${r.linesScanned} line(s))\n`);
        }
        continue;
      }
      process.stdout.write(
        `✗ ${basename(r.filePath)} — ${r.violations.length} violation(s) in ${r.linesScanned} line(s)\n`
      );
      for (const v of r.violations.slice(0, VIOLATION_RENDER_LIMIT)) {
        const sample = typeof v.value === "string" ? v.value : JSON.stringify(v.value);
        process.stdout.write(`    L${v.lineNo} field="${v.field}" kind=${v.kind} value=${sample}\n`);
      }
      if (r.violations.length > VIOLATION_RENDER_LIMIT) {
        process.stdout.write(`    … ${r.violations.length - VIOLATION_RENDER_LIMIT} more\n`);
      }
    }
  }

  process.exit(totalViolations === 0 ? 0 : 1);
}

const invokedPath = (process.argv[1] || "").replace(/\\/g, "/");
if (invokedPath.endsWith("tz-sanity.mjs")) {
  void main().catch((e) => {
    process.stderr.write(`tz-sanity: ${e.stack || e.message}\n`);
    process.exit(2);
  });
}
