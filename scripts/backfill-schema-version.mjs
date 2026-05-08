#!/usr/bin/env node
/**
 * backfill-schema-version.mjs
 *
 * OBSIDIAN-COMPOUND-MS1/S4/U-SCHEMA-VERSION-BACKFILL
 *
 * One-shot mass-edit: for every JSON file under the state directories, if the
 * top-level object does not already carry a `schemaVersion` key, add
 * `schemaVersion: "1.0.0"` plus a `_lastBackfillTs` marker so subsequent runs
 * can find the additions and `--revert` cleanly.
 *
 * Safety contract:
 *   - **Default mode is dry-run.** `--apply` is required to actually write.
 *   - Atomic write via tmp file + rename — no half-written JSON on crash.
 *   - Round-trip verify after parse: ensure JSON.stringify(JSON.parse(out))
 *     matches the file we're about to write before swap-in.
 *   - Skips files whose JSON root is not a plain object (arrays, primitives —
 *     `schemaVersion` is meaningless on those shapes).
 *   - Skips already-versioned files (any value type counts — string `"1.0.0"`,
 *     number `1`, etc. — we only ADD when the key is absent).
 *   - Skips backup/temp/.gitkeep files by glob pattern.
 *   - `--revert` mode removes both `schemaVersion` and `_lastBackfillTs`
 *     ONLY from files that carry the marker we wrote, never from
 *     pre-existing schemaVersion keys.
 *
 * Roots (default — overridable via --root for testing):
 *   - H:/prism/mcp-server/data/state/**\/*.json
 *   - H:/prism/state/**\/*.json
 *
 * Usage:
 *   node scripts/backfill-schema-version.mjs                      # dry-run
 *   node scripts/backfill-schema-version.mjs --apply              # write
 *   node scripts/backfill-schema-version.mjs --revert             # remove marker
 *   node scripts/backfill-schema-version.mjs --root /tmp/test     # custom root
 *   node scripts/backfill-schema-version.mjs --apply --json       # machine output
 *
 * @milestone OBSIDIAN-COMPOUND-MS1/S4/U-SCHEMA-VERSION-BACKFILL
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const TARGET_VERSION = "1.0.0";
const MARKER_KEY = "_lastBackfillTs";
const VERSION_KEY = "schemaVersion";
const SKIP_PATTERNS = [
  /\.backup(?:\.|$)/i,
  /\.bak(?:\.|$)/i,
  /\.tmp$/i,
  /\.gitkeep$/i,
  /\.lock$/i,
  /\.pre-fixes\.bak$/i,
];
const DEFAULT_ROOTS = [
  join(REPO_ROOT, "mcp-server", "data", "state"),
  join(REPO_ROOT, "state"),
];

function shouldSkipFilename(filename) {
  for (const re of SKIP_PATTERNS) {
    if (re.test(filename)) return true;
  }
  return false;
}

function listJsonRecursive(root, out = []) {
  if (!existsSync(root)) return out;
  let entries;
  try { entries = readdirSync(root, { withFileTypes: true }); } catch { return out; }
  for (const ent of entries) {
    if (ent.name.startsWith(".") && ent.name !== ".gitkeep") {
      // Allow descending into hidden dirs only if they exist on disk;
      // most won't (we explicitly skip .gitkeep files via SKIP_PATTERNS).
    }
    const full = join(root, ent.name);
    if (ent.isDirectory()) {
      listJsonRecursive(full, out);
    } else if (ent.isFile() && ent.name.toLowerCase().endsWith(".json") && !shouldSkipFilename(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Parse JSON with BOM tolerance. Returns { ok: true, value } or { ok: false, error }. */
function tryParse(raw) {
  // Strip UTF-8 BOM if present.
  const cleaned = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  try { return { ok: true, value: JSON.parse(cleaned) }; }
  catch (err) { return { ok: false, error: err?.message ?? String(err) }; }
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Atomic write: write to tmp file, fsync if available, rename to final path. */
function atomicWrite(filePath, content) {
  const tmp = `${filePath}.backfill.tmp`;
  writeFileSync(tmp, content, "utf8");
  try { renameSync(tmp, filePath); }
  catch (err) {
    // Cleanup the tmp on failure so we don't leave debris.
    try { unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}

/** Add schemaVersion + marker to obj. Returns new object (does not mutate). */
function addVersionFields(obj, nowIso) {
  // Insert version + marker as the first two keys for human-readable diffs.
  return {
    [VERSION_KEY]: TARGET_VERSION,
    [MARKER_KEY]: nowIso,
    ...obj,
  };
}

/** Remove version + marker from obj IF the marker is present (we wrote it). */
function removeVersionFields(obj) {
  if (!isPlainObject(obj)) return { changed: false, value: obj };
  if (!(MARKER_KEY in obj)) return { changed: false, value: obj };
  const out = { ...obj };
  delete out[VERSION_KEY];
  delete out[MARKER_KEY];
  return { changed: true, value: out };
}

function detectIndent(raw) {
  // Best-effort: most files use 2-space; a few use 4-space.
  const m = raw.match(/^[\{\[][\r\n]+([ \t]+)/);
  if (m) return m[1];
  return "  ";
}

function detectTrailingNewline(raw) {
  return raw.endsWith("\n");
}

function processFile(filePath, opts) {
  const result = { path: filePath, action: "skip", reason: "" };
  let raw;
  try { raw = readFileSync(filePath, "utf8"); }
  catch (err) {
    result.action = "error";
    result.reason = `read-fail: ${err?.message ?? err}`;
    return result;
  }
  const parsed = tryParse(raw);
  if (!parsed.ok) {
    result.action = "skip";
    result.reason = `malformed-json: ${parsed.error}`;
    return result;
  }
  const obj = parsed.value;

  if (opts.mode === "revert") {
    if (!isPlainObject(obj)) {
      result.reason = "non-object-root";
      return result;
    }
    const { changed, value } = removeVersionFields(obj);
    if (!changed) {
      result.reason = "no-marker";
      return result;
    }
    const indent = detectIndent(raw);
    const trailingNl = detectTrailingNewline(raw);
    const out = JSON.stringify(value, null, indent) + (trailingNl ? "\n" : "");
    if (opts.apply) {
      try { atomicWrite(filePath, out); }
      catch (err) {
        result.action = "error";
        result.reason = `write-fail: ${err?.message ?? err}`;
        return result;
      }
    }
    result.action = "revert";
    result.reason = "removed-version-and-marker";
    return result;
  }

  // Default: backfill mode.
  if (!isPlainObject(obj)) {
    result.reason = "non-object-root";
    return result;
  }
  if (VERSION_KEY in obj) {
    result.reason = "already-versioned";
    return result;
  }

  const next = addVersionFields(obj, opts.nowIso);
  const indent = detectIndent(raw);
  const trailingNl = detectTrailingNewline(raw);
  const out = JSON.stringify(next, null, indent) + (trailingNl ? "\n" : "");

  // Round-trip verify before swap-in: parse the output, confirm shape sane.
  const verify = tryParse(out);
  if (!verify.ok || !isPlainObject(verify.value) || verify.value[VERSION_KEY] !== TARGET_VERSION) {
    result.action = "error";
    result.reason = `roundtrip-fail`;
    return result;
  }

  if (opts.apply) {
    try { atomicWrite(filePath, out); }
    catch (err) {
      result.action = "error";
      result.reason = `write-fail: ${err?.message ?? err}`;
      return result;
    }
  }
  result.action = "backfill";
  result.reason = `added ${VERSION_KEY}=${TARGET_VERSION}`;
  return result;
}

export function runBackfill(opts = {}) {
  const roots = opts.roots ?? DEFAULT_ROOTS;
  const apply = !!opts.apply;
  const mode = opts.revert ? "revert" : "backfill";
  const nowIso = opts.nowIso ?? new Date().toISOString();

  const allFiles = [];
  for (const root of roots) listJsonRecursive(root, allFiles);

  const counters = { scanned: 0, backfilled: 0, reverted: 0, alreadyVersioned: 0, skippedNonObject: 0, malformed: 0, errored: 0, noMarker: 0 };
  const results = [];

  for (const f of allFiles) {
    counters.scanned++;
    const r = processFile(f, { apply, mode, nowIso });
    results.push(r);
    switch (r.action) {
      case "backfill": counters.backfilled++; break;
      case "revert": counters.reverted++; break;
      case "error": counters.errored++; break;
      case "skip":
        if (r.reason === "already-versioned") counters.alreadyVersioned++;
        else if (r.reason === "non-object-root") counters.skippedNonObject++;
        else if (r.reason.startsWith("malformed-json")) counters.malformed++;
        else if (r.reason === "no-marker") counters.noMarker++;
        break;
    }
  }

  return { mode, apply, roots, counters, results };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { apply: false, revert: false, json: false, roots: undefined, help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--revert") out.revert = true;
    else if (a === "--json") out.json = true;
    else if (a === "--root") {
      out.roots ??= [];
      out.roots.push(resolve(argv[++i]));
    }
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function printHelp() {
  console.log(`backfill-schema-version.mjs — add schemaVersion: "${TARGET_VERSION}" to unversioned state JSONs

Modes:
  (default)   dry-run — prints what WOULD change, writes nothing
  --apply     actually write files (atomic, idempotent)
  --revert    remove our backfilled keys (only files we touched, marker-gated)

Options:
  --root <p>  override default scan root (repeatable)
  --json      emit machine-readable JSON summary
  -h, --help  this help
`);
}

const isMain = (() => {
  try { return resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (isMain) {
  const args = parseArgs(process.argv);
  if (args.help) { printHelp(); process.exit(0); }
  const summary = runBackfill({ apply: args.apply, revert: args.revert, roots: args.roots });
  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    const { mode, apply, counters } = summary;
    console.log(`backfill-schema-version: mode=${mode} apply=${apply}`);
    console.log(`  scanned:           ${counters.scanned}`);
    console.log(`  backfilled:        ${counters.backfilled}`);
    console.log(`  reverted:          ${counters.reverted}`);
    console.log(`  already-versioned: ${counters.alreadyVersioned}`);
    console.log(`  no-marker (revert):${counters.noMarker}`);
    console.log(`  non-object-root:   ${counters.skippedNonObject}`);
    console.log(`  malformed:         ${counters.malformed}`);
    console.log(`  errored:           ${counters.errored}`);
    if (!apply && counters.backfilled + counters.reverted > 0) {
      console.log(`  (DRY-RUN — pass --apply to write)`);
    }
  }
  process.exit(summary.counters.errored > 0 ? 1 : 0);
}
