#!/usr/bin/env node
/**
 * .claude/kernel/mirror-gen.mjs — U-CK05 (COMMAND-KERNEL-MS0)
 *
 * Generated-mirror generators: `wiki/os/<kind>/<slug>.md` → `state/shared/os-mirrors/<kind>.json`.
 *
 * DOCTRINE PIVOT (R7 surface conflicts + R8 read before write):
 *   U-CK05's envelope named `chat-slots.json` / `atomic-roadmap.json` /
 *   `SLASH_COMMAND_REGISTRY.json` as mirror targets. Reading those files
 *   shows they hold LIVE RUNTIME STATE (active slot PIDs, heartbeats,
 *   dynamic milestone status). They are NOT regeneratable from static
 *   os/ markdown without clobbering runtime — `atomic-roadmap.json`
 *   does not even exist on disk; `chat-slots.json` and
 *   `roadmap-index.json` are authoritative state stores.
 *   The principled implementation emits CATALOG mirrors under
 *   `state/shared/os-mirrors/<kind>.json`. Runtime state files are
 *   untouched. Catalog mirrors are downstream of os/ markdown; the
 *   wiki is the single source of truth for the OS abstraction.
 *
 * Output shape per kind:
 *   {
 *     "generated-from-os": "<git-sha>",
 *     "generated-at": "<iso8601>",
 *     "generator": ".claude/kernel/mirror-gen.mjs",
 *     "source-kind": "commands" | "pipelines" | ...,
 *     "source-dir": "knowledge/wiki/os/commands/",
 *     "entity-count": N,
 *     "entities": [ { slug, file, ...frontmatter fields } ],
 *     "WARNING": "Generated mirror — do NOT hand-edit. Re-run: node .claude/kernel/mirror-gen.mjs"
 *   }
 *
 * Determinism contract:
 *   - All object keys sorted (sortKeysDeep) before serialization.
 *   - Entities sorted by slug.
 *   - `generated-at` is regenerated each run UNLESS --frozen-time is passed.
 *   - With --frozen-time, two consecutive runs produce byte-identical files.
 *
 * CLI:
 *   node .claude/kernel/mirror-gen.mjs
 *   node .claude/kernel/mirror-gen.mjs --frozen-time 2026-05-17T00:00:00Z
 *   node .claude/kernel/mirror-gen.mjs --out-dir /tmp/os-mirrors --os-dir /tmp/os
 *
 * Knob:
 *   PRISM_ROOT — override prism root (default: ../../ from this file).
 *
 * Security:
 *   Uses execFileSync (no shell) — git is invoked with positional argv
 *   only, no shell interpolation. Per CLAUDE.md security-hook guidance.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PRISM_ROOT = process.env.PRISM_ROOT
  ? path.resolve(process.env.PRISM_ROOT)
  : path.resolve(__dirname, "..", "..");
const DEFAULT_OS_DIR = path.join(DEFAULT_PRISM_ROOT, "knowledge", "wiki", "os");
const DEFAULT_OUT_DIR = path.join(DEFAULT_PRISM_ROOT, "state", "shared", "os-mirrors");

/**
 * Per-entity byte cap. Frontmatter is the only thing read; body is
 * discarded after parse. A 256KB cap is ~50x larger than the largest
 * sane wiki/os/ entity today. A file above this is flagged + skipped
 * (R12 fail-loud) so an accidental binary paste / log dump cannot OOM
 * a regen sweep across 10k entities.
 */
const MAX_ENTITY_BYTES = 256 * 1024;

/** Canonical 6 kinds per knowledge/wiki/os/_schema.md (U-CK04). */
export const KINDS = ["commands", "pipelines", "processes", "runqueue", "sessions", "syscalls"];

/** Kind → ordered list of frontmatter fields to mirror (per schema). */
const FIELDS_BY_KIND = {
  commands: ["title", "status", "date", "milestone", "unit", "author", "mirrors_skill", "triggers", "dispatcher_actions"],
  pipelines: ["title", "status", "date", "milestone", "unit", "author", "trigger", "cron", "composed_of"],
  processes: ["title", "status", "date", "milestone", "unit", "author", "slot", "pin", "lifecycle"],
  runqueue: ["title", "status", "date", "milestone", "unit", "author", "source", "filter"],
  sessions: ["title", "status", "date", "milestone", "unit", "author", "id_anchor", "survives"],
  syscalls: ["title", "status", "date", "milestone", "unit", "author", "kernel_handler", "params_schema", "composes"],
};

/**
 * Minimal YAML frontmatter parser sufficient for the os/ schema (R8: do
 * not pull a runtime YAML dep for scalar + bracketed-list values).
 *
 * FLAT-ONLY BY DESIGN: indented lines (nested-object continuations,
 * multi-line scalar blocks, multi-line `-` lists) are silently dropped.
 * The wiki/os/ schema MUST stay flat — see knowledge/wiki/os/_schema.md.
 * If a kind ever needs nested values, swap in a real YAML parser AND
 * add an AJV-validated kind-aware schema; do not retrofit nested
 * support into this parser. (Per Arm B P1 finding 2026-05-17.)
 *
 * Returns null when the file has no `---\n…---` frontmatter block.
 */
export function parseFrontmatter(src) {
  if (typeof src !== "string") return null;
  if (!src.startsWith("---\n") && !src.startsWith("---\r\n")) return null;
  const startLen = src.startsWith("---\r\n") ? 5 : 4;
  // Find closing fence at column 0 — `\n---` followed by EOL or EOF.
  const endIdx = findClosingFence(src, startLen);
  if (endIdx < 0) return null;
  const body = src.slice(startLen, endIdx);
  const result = {};
  for (const rawLine of body.split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) continue;
    // Flat schema: indented lines silently dropped (documented above).
    if (/^\s/.test(rawLine)) continue;
    const m = rawLine.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!m) continue;
    const [, key, rawValue] = m;
    // Strip trailing inline comment (` #…`) — quote-aware: tracks `'`/`"`
    // state and bracket depth so embedded `#` inside a quoted or
    // bracketed value is preserved. (Per Arm A P1 finding 2026-05-17.)
    const value = stripInlineComment(rawValue).trim();
    if (value === "" || value === "null" || value === "~") {
      result[key] = null;
      continue;
    }
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      result[key] = inner ? splitListPreservingQuotes(inner).map((x) => stripQuotes(x.trim())) : [];
      continue;
    }
    result[key] = stripQuotes(value);
  }
  return result;
}

/**
 * Strip a trailing ` #…` comment from a scalar value while preserving
 * any `#` that appears inside a `'`/`"` quoted string or a `[...]`
 * bracketed list. R12 honest: NEVER mutates inside a quoted region.
 */
function stripInlineComment(value) {
  let inSingle = false;
  let inDouble = false;
  let bracketDepth = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (!inSingle && !inDouble) {
      if (ch === "[") bracketDepth++;
      else if (ch === "]" && bracketDepth > 0) bracketDepth--;
    }
    if (!inDouble && ch === "'" && bracketDepth === 0) inSingle = !inSingle;
    else if (!inSingle && ch === '"' && bracketDepth === 0) inDouble = !inDouble;
    else if (!inSingle && !inDouble && bracketDepth === 0 && ch === "#" && i > 0 && /\s/.test(value[i - 1])) {
      return value.slice(0, i);
    }
  }
  return value;
}

/**
 * Split a comma-separated list payload while honoring quoted regions —
 * `"a, b", "c"` → `['"a, b"', '"c"']` (NOT `['"a', 'b"', '"c"']`).
 * Quote state machine; brackets nest (defensive, though the outer `[]`
 * is already stripped by the caller). Per Arm A P1 finding 2026-05-17.
 */
function splitListPreservingQuotes(payload) {
  const out = [];
  let buf = "";
  let inSingle = false;
  let inDouble = false;
  let bracketDepth = 0;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload[i];
    if (!inSingle && !inDouble) {
      if (ch === "[") bracketDepth++;
      else if (ch === "]" && bracketDepth > 0) bracketDepth--;
      else if (bracketDepth === 0 && ch === ",") {
        out.push(buf);
        buf = "";
        continue;
      }
    }
    if (!inDouble && ch === "'") inSingle = !inSingle;
    else if (!inSingle && ch === '"') inDouble = !inDouble;
    buf += ch;
  }
  if (buf.length > 0 || out.length > 0) out.push(buf);
  return out;
}

function findClosingFence(src, fromOffset) {
  // Match a line of exactly `---` (optional trailing whitespace).
  const re = /(^|\r?\n)---[ \t]*(\r?\n|$)/g;
  re.lastIndex = fromOffset;
  const m = re.exec(src);
  if (!m) return -1;
  // Return the offset of the start of the fence (the `---`), not the leading newline.
  return m.index + (m[1] ? m[1].length : 0);
}

function stripQuotes(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/**
 * Walk knowledge/wiki/os/<kind>/ for each canonical kind and return
 * { kind: [entity, ...] } with frontmatter projected per FIELDS_BY_KIND.
 * Entities are sorted by slug for determinism.
 *
 * - Skips files starting with `_` (`_schema.md`, `_command-schema.md`).
 * - Skips files that do not parse as `.md` with frontmatter (logged to
 *   `warnings[]`; never throws — one bad entry should not kill the run).
 */
export function listOsEntities(osDir = DEFAULT_OS_DIR, kinds = KINDS, opts = {}) {
  const readFileImpl = opts.readFileImpl || ((p) => fs.readFileSync(p, "utf8"));
  const readdirImpl = opts.readdirImpl || ((p) => fs.readdirSync(p));
  const existsImpl = opts.existsImpl || ((p) => fs.existsSync(p));
  const out = {};
  const warnings = [];
  for (const kind of kinds) {
    const dir = path.join(osDir, kind);
    out[kind] = [];
    if (!existsImpl(dir)) {
      warnings.push({ kind, reason: "kind-dir-missing", dir });
      continue;
    }
    const names = readdirImpl(dir).slice().sort();
    const statImpl = opts.statImpl || ((p) => fs.statSync(p));
    for (const name of names) {
      if (!name.endsWith(".md")) continue;
      if (name.startsWith("_")) continue;
      const slug = name.slice(0, -3);
      const filePath = path.join(dir, name);
      // Per-entity byte cap (R12 fail-loud) — see MAX_ENTITY_BYTES rationale.
      try {
        const sz = statImpl(filePath).size;
        if (sz > MAX_ENTITY_BYTES) {
          warnings.push({ kind, slug, reason: "entity-too-large", sizeBytes: sz, maxBytes: MAX_ENTITY_BYTES });
          continue;
        }
      } catch (e) {
        warnings.push({ kind, slug, reason: "stat-failed", error: String(e?.message || e) });
        continue;
      }
      let src;
      try {
        src = readFileImpl(filePath);
      } catch (e) {
        warnings.push({ kind, slug, reason: "read-failed", error: String(e?.message || e) });
        continue;
      }
      const fm = parseFrontmatter(src);
      if (!fm) {
        warnings.push({ kind, slug, reason: "no-frontmatter" });
        continue;
      }
      const entry = { slug, file: path.relative(osDir, filePath).replace(/\\/g, "/") };
      for (const field of FIELDS_BY_KIND[kind] || []) {
        if (fm[field] !== undefined) entry[field] = fm[field];
      }
      // Slug consistency check (R12: surface frontmatter ↔ filename mismatches).
      if (fm.slug !== undefined && fm.slug !== slug) {
        entry["_warning_slug_mismatch"] = { filename_slug: slug, frontmatter_slug: fm.slug };
      }
      out[kind].push(entry);
    }
    out[kind].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  }
  return { entities: out, warnings };
}

/**
 * Resolve the current git HEAD commit sha for traceability.
 * Uses execFileSync (no shell interpolation) — git argv is positional.
 */
export function gitCommitSha(prismRoot = DEFAULT_PRISM_ROOT, opts = {}) {
  const execFileImpl = opts.execFileImpl || ((cmd, args, cwd) =>
    execFileSync(cmd, args, { cwd, stdio: ["ignore", "pipe", "ignore"] }).toString());
  try {
    return execFileImpl("git", ["rev-parse", "HEAD"], prismRoot).trim();
  } catch {
    return "unknown";
  }
}

/** Build the per-kind mirror payload (deterministic ordering applied at write time). */
export function buildMirror(kind, entries, { commitSha, generatedAt }) {
  return {
    "generated-from-os": commitSha,
    "generated-at": generatedAt,
    generator: ".claude/kernel/mirror-gen.mjs",
    "source-kind": kind,
    "source-dir": `knowledge/wiki/os/${kind}/`,
    "entity-count": entries.length,
    entities: entries,
    WARNING: "Generated mirror — do NOT hand-edit. Re-run: node .claude/kernel/mirror-gen.mjs",
  };
}

/** Build the top-level index.json catalog-of-catalogs. */
export function buildIndex(summary, { commitSha, generatedAt }) {
  const kinds = {};
  const mirrors = {};
  for (const [k, v] of Object.entries(summary)) {
    kinds[k] = v.count;
    mirrors[k] = v.relOutFile;
  }
  return {
    "generated-from-os": commitSha,
    "generated-at": generatedAt,
    generator: ".claude/kernel/mirror-gen.mjs",
    kinds,
    mirrors,
    WARNING: "Generated mirror — do NOT hand-edit. Re-run: node .claude/kernel/mirror-gen.mjs",
  };
}

/** Deep-sort plain-object keys for byte-stable JSON across runs. Arrays preserve order. */
export function sortKeysDeep(x) {
  if (Array.isArray(x)) return x.map(sortKeysDeep);
  if (x && typeof x === "object" && x.constructor === Object) {
    const out = {};
    for (const k of Object.keys(x).sort()) out[k] = sortKeysDeep(x[k]);
    return out;
  }
  return x;
}

/**
 * Atomic JSON write — sorted keys, trailing newline.
 * Returns the serialized JSON string.
 */
export function writeDeterministic(outFile, obj, opts = {}) {
  const writeFileImpl = opts.writeFileImpl || ((p, data) => {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    // Race-safe across same-ms same-process concurrent runs (Arm A P1):
    // crypto-random suffix guarantees no tmp-name collision even when
    // PID + Date.now() match exactly (cron + hook firing simultaneously).
    const tmp = p + ".tmp-" + process.pid + "-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, p);
  });
  const sorted = sortKeysDeep(obj);
  const json = JSON.stringify(sorted, null, 2) + "\n";
  writeFileImpl(outFile, json);
  return json;
}

/**
 * Top-level orchestrator. Pure-core friendly: readers + writer are
 * injectable for hermetic tests; the default impls hit the real FS.
 */
export function runMirrorGen({
  osDir = DEFAULT_OS_DIR,
  outDir = DEFAULT_OUT_DIR,
  prismRoot = DEFAULT_PRISM_ROOT,
  frozenTime = null,
  readers = {},
  writeFileImpl = null,
} = {}) {
  const { entities, warnings } = listOsEntities(osDir, KINDS, readers);
  const commitSha = gitCommitSha(prismRoot, readers);
  const generatedAt = frozenTime || new Date().toISOString();
  const summary = {};
  for (const [kind, kindEntries] of Object.entries(entities)) {
    const mirror = buildMirror(kind, kindEntries, { commitSha, generatedAt });
    const outFile = path.join(outDir, `${kind}.json`);
    writeDeterministic(outFile, mirror, writeFileImpl ? { writeFileImpl } : {});
    summary[kind] = {
      count: kindEntries.length,
      outFile,
      relOutFile: path.relative(prismRoot, outFile).replace(/\\/g, "/"),
    };
  }
  // index.json — catalog of catalogs.
  const index = buildIndex(summary, { commitSha, generatedAt });
  const indexFile = path.join(outDir, "index.json");
  writeDeterministic(indexFile, index, writeFileImpl ? { writeFileImpl } : {});
  return {
    summary,
    index: { file: indexFile, relFile: path.relative(prismRoot, indexFile).replace(/\\/g, "/") },
    commitSha,
    generatedAt,
    warnings,
  };
}

// ---------- CLI entrypoint ----------
function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--frozen-time" && argv[i + 1]) opts.frozenTime = argv[++i];
    else if (a === "--out-dir" && argv[i + 1]) opts.outDir = path.resolve(argv[++i]);
    else if (a === "--os-dir" && argv[i + 1]) opts.osDir = path.resolve(argv[++i]);
    else if (a === "--json") opts._json = true;
    else if (a === "--help" || a === "-h") opts._help = true;
  }
  return opts;
}

function printHelp() {
  console.log(`mirror-gen.mjs — U-CK05 generated-mirror generator

USAGE
  node .claude/kernel/mirror-gen.mjs [options]

OPTIONS
  --os-dir <path>       Override source dir (default: knowledge/wiki/os)
  --out-dir <path>      Override output dir (default: state/shared/os-mirrors)
  --frozen-time <iso>   Use a fixed generated-at timestamp (for determinism tests)
  --json                Print full result JSON (default: human summary)
  --help, -h            Show this help

ENVIRONMENT
  PRISM_ROOT            Override prism repo root

The 6 mirror catalogs emitted: commands, pipelines, processes, runqueue,
sessions, syscalls — plus index.json. Each carries a generated-from-os
git SHA header so hand-edits are detectable.`);
}

// CLI guard: this main block runs only when the file is invoked directly.
const invokedAsCli = (() => {
  if (!process.argv[1]) return false;
  try {
    return path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (invokedAsCli) {
  const opts = parseArgs(process.argv.slice(2));
  if (opts._help) {
    printHelp();
    process.exit(0);
  }
  try {
    const res = runMirrorGen(opts);
    if (opts._json) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.log(`mirror-gen: HEAD=${res.commitSha.slice(0, 9)} generatedAt=${res.generatedAt}`);
      for (const [kind, info] of Object.entries(res.summary)) {
        console.log(`  ${kind.padEnd(10)} ${String(info.count).padStart(4)}  ${info.relOutFile}`);
      }
      console.log(`  index      ----  ${res.index.relFile}`);
      if (res.warnings.length > 0) {
        console.log(`  warnings: ${res.warnings.length}`);
        for (const w of res.warnings) console.log(`    - ${w.kind}/${w.slug || ""}: ${w.reason}`);
      }
    }
    process.exit(0);
  } catch (e) {
    console.error(`mirror-gen failed: ${e?.message || e}`);
    if (process.env.PRISM_MIRROR_GEN_DEBUG === "1") console.error(e?.stack);
    process.exit(1);
  }
}
