#!/usr/bin/env node
/**
 * command-migrate.mjs
 *
 * OBSIDIAN-INTELLIGENCE work is unrelated — this is
 * COMMAND-KERNEL-MS0/U-CK07: the codemod that prepares the
 * `.claude/commands/*.md` corpus for the U-CK08 migration.
 *
 * It does TWO things:
 *   1. DETECT + LIST anti-patterns per command (the `--dry-run` headline):
 *        - hardcoded-count       — a literal inventory count baked into
 *          prose ("3245 engines") that rots; CLAUDE.md mandates reading
 *          the live source instead.
 *        - hardcoded-path        — an absolute `H:/prism/...` or
 *          `C:\Users\...` path baked into a command.
 *        - session-id-boilerplate— a copy-pasted stable-session-id
 *          derivation snippet.
 *        - boilerplate-hash      — a multi-line block duplicated verbatim
 *          across ≥ MIN_BOILERPLATE_COMMANDS commands (corpus-level).
 *   2. APPLY a SAFE, mechanical frontmatter normalization (`--apply`):
 *        - ensure a `name:` field (kebab slug derived from the filename)
 *          when absent;
 *        - normalize `key: value` spacing + trim trailing whitespace
 *          inside the frontmatter block.
 *      It does NOT auto-rewrite prose counts/paths — that is unsafe to do
 *      mechanically and is deferred to the human-supervised U-CK08 pass.
 *      The anti-patterns are DETECTED + REPORTED, never silently rewritten.
 *
 * Safety contract (the unit's exit conditions):
 *   - idempotent  — re-running `--apply` on an already-migrated command
 *     produces a byte-identical file (no change recorded).
 *   - reversible  — every change is a plain git-tracked text edit; the
 *     codemod only ever touches the frontmatter block, never the body.
 *   - fails soft  — one unparseable command is reported as `ok:false` and
 *     SKIPPED; the batch continues and every other command still migrates.
 *   - dry-run-first — `--dry-run` is the DEFAULT; `--apply` is explicit.
 *
 * Pure-core / side-effect split (B3/B5/B6 family):
 *   - migrateCommand({text,filename}, opts) — PURE: detect + normalize one
 *     command's text. No I/O. The hermetic-test surface.
 *   - runMigration({commandsDir, apply}) — scans the dir, does the
 *     corpus-level boilerplate pass, writes files on `--apply`.
 *
 * @milestone COMMAND-KERNEL-MS0/U-CK07
 */

import {
  readFileSync, writeFileSync, readdirSync, existsSync, lstatSync,
} from "node:fs";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..", "..");
const DEFAULT_COMMANDS_DIR = join(PRISM_ROOT, ".claude", "commands");

// ---------- Constants --------------------------------------------------------

const FENCE = "---";
/** Inventory nouns whose preceding literal number is a rot-prone count. */
const COUNT_NOUNS = "engines?|dispatchers?|hooks?|skills?|actions?|commands?|units?|agents?";
const COUNT_RE = new RegExp(`\\b\\d{2,}\\s+(?:${COUNT_NOUNS})\\b`, "i");
/** Absolute Windows / MSYS / repo-root paths that should be relative. */
const PATH_RE = /(?:[A-Za-z]:[\\/]|\/[a-z]\/prism\b|H:\/prism\b|C:\\Users)/i;
/** The stable-session-id derivation snippet that gets copy-pasted. */
const SESSION_ID_RE = /stable-session-id\.mjs|STABLE=\$\(node /;
/** Corpus-level boilerplate: a window seen in ≥ this many commands. */
const MIN_BOILERPLATE_COMMANDS = 4;
const BOILERPLATE_WINDOW_LINES = 5;

// ---------- Helpers (pure) ---------------------------------------------------

/** Derive the kebab-case command slug from a `.md` filename. */
function slugFromFilename(filename) {
  return basename(String(filename || ""), ".md").toLowerCase().replace(/[^a-z0-9:-]/g, "-");
}

/**
 * Split a command file into its YAML frontmatter block and body. The
 * frontmatter is the leading `---\n ... \n---\n` fence. Returns
 * `hasFrontmatter:false` when the file does not open with a fence.
 */
function parseFrontmatter(text) {
  const src = typeof text === "string" ? text : "";
  // EOL-aware: split on either line ending and remember the dominant one,
  // so migrating a CRLF command rebuilds it as CRLF (not silently flipped
  // to LF — a body-wide change that would break reversibility). The bare
  // "\n" split used to leave a trailing "\r" on every line, so the 8% of
  // the corpus that is CRLF was misclassified as having no frontmatter
  // at all — U-CK07 scrutiny Arm-B P1.
  const eol = src.includes("\r\n") ? "\r\n" : "\n";
  const lines = src.split(/\r?\n/);
  if (lines[0] !== FENCE) {
    return { hasFrontmatter: false, fmLines: [], body: src, closeIdx: -1, eol };
  }
  let closeIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === FENCE) { closeIdx = i; break; }
  }
  if (closeIdx === -1) {
    // Opening fence with no close — malformed; treat as no frontmatter.
    return { hasFrontmatter: false, fmLines: [], body: src, closeIdx: -1, malformed: true, eol };
  }
  return {
    hasFrontmatter: true,
    fmLines: lines.slice(1, closeIdx),
    body: lines.slice(closeIdx + 1).join(eol),
    closeIdx,
    eol,
  };
}

/** Parse `key: value` pairs (top-level only) from frontmatter lines. */
function frontmatterKeys(fmLines) {
  const keys = new Set();
  for (const line of fmLines) {
    const m = line.match(/^([A-Za-z][\w-]*):/);
    if (m) keys.add(m[1]);
  }
  return keys;
}

/**
 * Detect per-line anti-patterns in a command's text (count / path /
 * session-id). Corpus-level boilerplate is layered in by runMigration.
 */
function detectAntiPatterns(text) {
  const out = [];
  const lines = String(text || "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (COUNT_RE.test(line)) {
      out.push({ type: "hardcoded-count", line: i + 1, snippet: line.trim().slice(0, 100) });
    }
    if (PATH_RE.test(line)) {
      out.push({ type: "hardcoded-path", line: i + 1, snippet: line.trim().slice(0, 100) });
    }
    if (SESSION_ID_RE.test(line)) {
      out.push({ type: "session-id-boilerplate", line: i + 1, snippet: line.trim().slice(0, 100) });
    }
  }
  return out;
}

/**
 * SAFE, idempotent frontmatter normalization for one command:
 *   - add `name: <slug>` when the field is absent;
 *   - collapse `key:value` / `key:   value` → `key: value`;
 *   - trim trailing whitespace on frontmatter lines.
 * The body is NEVER touched. Re-running on a normalized file is a no-op.
 *
 * @returns {{ text: string, changes: string[] }}
 */
function normalizeFrontmatter(text, slug) {
  const fm = parseFrontmatter(text);
  if (!fm.hasFrontmatter) {
    // No safe mechanical fix — synthesizing a description would be a
    // fabrication. Report it; leave the file untouched.
    return { text: String(text ?? ""), changes: [] };
  }
  const changes = [];
  let fmLines = fm.fmLines.map((line) => {
    const norm = line
      .replace(/^([A-Za-z][\w-]*):\s*(.*?)\s*$/, (_m, k, v) => (v ? `${k}: ${v}` : `${k}:`))
      .replace(/\s+$/, "");
    if (norm !== line) changes.push(`normalized frontmatter line: ${line.trim().slice(0, 60)}`);
    return norm;
  });
  // `name` must be present AND non-empty (CK06 schema). Absent OR blank →
  // set it to the filename-derived slug (the canonical default). A
  // present, non-empty but mismatched name is left alone — rewriting a
  // possibly-intentional name is unsafe (detect-only; deferred to CK08).
  const emptyNameIdx = fmLines.findIndex((l) => /^name:\s*$/.test(l));
  if (emptyNameIdx !== -1) {
    fmLines[emptyNameIdx] = `name: ${slug}`;
    changes.push(`set empty name: ${slug}`);
  } else if (!frontmatterKeys(fmLines).has("name")) {
    fmLines = [`name: ${slug}`, ...fmLines];
    changes.push(`added name: ${slug}`);
  }
  if (changes.length === 0) return { text: String(text ?? ""), changes: [] };
  const rebuilt = [FENCE, ...fmLines, FENCE, fm.body].join(fm.eol);
  return { text: rebuilt, changes };
}

/**
 * Migrate ONE command (pure). Detects anti-patterns and applies the safe
 * frontmatter normalization. Never throws — a malformed input is returned
 * as `ok:false` with an error string (fail-soft).
 *
 * @param input  { text, filename }
 * @param opts   { apply }  — apply=false (default) → detect only.
 */
function migrateCommand(input, opts = {}) {
  const filename = input && typeof input.filename === "string" ? input.filename : "";
  const slug = slugFromFilename(filename);
  let text;
  try {
    text = typeof input.text === "string" ? input.text : "";
  } catch (e) {
    return { ok: false, slug, filename, error: `bad input: ${e instanceof Error ? e.message : String(e)}`, antiPatterns: [], changes: [], migrated: "" };
  }
  if (text.length === 0) {
    return { ok: false, slug, filename, error: "empty command file", antiPatterns: [], changes: [], migrated: text };
  }
  const fm = parseFrontmatter(text);
  const antiPatterns = detectAntiPatterns(text);
  let migrated = text;
  let changes = [];
  if (opts.apply) {
    const norm = normalizeFrontmatter(text, slug);
    migrated = norm.text;
    changes = norm.changes;
  } else {
    // Dry-run still computes what WOULD change, without producing output.
    changes = normalizeFrontmatter(text, slug).changes;
  }
  const warnings = [];
  if (!fm.hasFrontmatter) {
    warnings.push(fm.malformed ? "malformed frontmatter (unclosed fence)" : "no frontmatter block");
  } else {
    // `description` must be present AND non-empty (CK06 schema). A blank
    // value passes a bare key-presence check, so test the value too — a
    // description cannot be mechanically synthesized, so this is warn-only.
    const descLine = fm.fmLines.find((l) => /^description:/.test(l));
    if (!descLine || /^description:\s*$/.test(descLine)) {
      warnings.push("missing/empty required `description` (cannot synthesize — needs a human)");
    }
  }
  return { ok: true, slug, filename, error: null, antiPatterns, changes, warnings, migrated };
}

/** Normalize a body line for boilerplate hashing (whitespace-insensitive). */
function normLine(line) {
  return line.replace(/\s+/g, " ").trim();
}

/**
 * Corpus-level boilerplate detection: hash every BOILERPLATE_WINDOW_LINES
 * window of each command's body; a hash appearing in ≥
 * MIN_BOILERPLATE_COMMANDS distinct commands is boilerplate.
 *
 * @param docs  [{ slug, body }]
 * @returns     Map<slug, Array<{type:"boilerplate-hash", hash, count}>>
 */
function detectBoilerplate(docs) {
  const hashToCommands = new Map();
  const commandWindows = new Map();
  for (const d of docs) {
    const lines = String(d.body || "").split("\n");
    const windows = [];
    for (let i = 0; i + BOILERPLATE_WINDOW_LINES <= lines.length; i++) {
      const block = lines.slice(i, i + BOILERPLATE_WINDOW_LINES).map(normLine).filter(Boolean);
      if (block.length < BOILERPLATE_WINDOW_LINES) continue; // skip blank-heavy windows
      const hash = createHash("sha256").update(block.join("\n")).digest("hex").slice(0, 12);
      windows.push(hash);
      const set = hashToCommands.get(hash) ?? new Set();
      set.add(d.slug);
      hashToCommands.set(hash, set);
    }
    commandWindows.set(d.slug, windows);
  }
  const result = new Map();
  for (const d of docs) {
    const flagged = [];
    const seen = new Set();
    for (const hash of commandWindows.get(d.slug) ?? []) {
      if (seen.has(hash)) continue;
      const count = (hashToCommands.get(hash) ?? new Set()).size;
      if (count >= MIN_BOILERPLATE_COMMANDS) {
        flagged.push({ type: "boilerplate-hash", hash, count });
        seen.add(hash);
      }
    }
    result.set(d.slug, flagged);
  }
  return result;
}

// ---------- Side-effecting runner -------------------------------------------

/**
 * Scan a commands directory, migrate every `*.md` (fail-soft per command),
 * and — on `apply` — write the normalized files back.
 *
 * @param opts  { commandsDir, apply }
 * @returns     { commands: [...], summary }
 */
function runMigration(opts = {}) {
  const dir = resolve(opts.commandsDir || DEFAULT_COMMANDS_DIR);
  const apply = opts.apply === true;
  const commands = [];
  if (!existsSync(dir)) {
    return { commands, summary: { dir, total: 0, ok: 0, failed: 0, applied: 0, error: "commands dir not found" } };
  }
  let entries = [];
  try {
    entries = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  } catch (e) {
    return { commands, summary: { dir, total: 0, ok: 0, failed: 0, applied: 0, error: `readdir failed: ${e instanceof Error ? e.message : String(e)}` } };
  }

  // Pass 1 — read + per-command migrate (fail-soft).
  const docs = [];
  for (const f of entries) {
    const full = join(dir, f);
    let result;
    try {
      if (lstatSync(full).isSymbolicLink()) {
        result = { ok: false, slug: slugFromFilename(f), filename: f, error: "symlink skipped", antiPatterns: [], changes: [], migrated: "" };
      } else {
        result = migrateCommand({ text: readFileSync(full, "utf8"), filename: f }, { apply });
      }
    } catch (e) {
      // Fail soft — one bad command never halts the batch.
      result = { ok: false, slug: slugFromFilename(f), filename: f, error: `read failed: ${e instanceof Error ? e.message : String(e)}`, antiPatterns: [], changes: [], migrated: "" };
    }
    result._full = full;
    commands.push(result);
    if (result.ok) docs.push({ slug: result.slug, body: parseFrontmatter(result.migrated || "").body });
  }

  // Pass 2 — corpus-level boilerplate, merged into each command's findings.
  const boilerplate = detectBoilerplate(docs);
  for (const c of commands) {
    if (!c.ok) continue;
    c.antiPatterns = [...c.antiPatterns, ...(boilerplate.get(c.slug) ?? [])];
  }

  // Pass 3 — write (apply only), idempotent: skip when text is unchanged.
  let applied = 0;
  if (apply) {
    for (const c of commands) {
      if (!c.ok || c.changes.length === 0) continue;
      try {
        const current = readFileSync(c._full, "utf8");
        if (current === c.migrated) continue; // idempotent no-op
        writeFileSync(c._full, c.migrated, "utf8");
        applied++;
      } catch (e) {
        c.ok = false;
        c.error = `write failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    }
  }

  const okCount = commands.filter((c) => c.ok).length;
  return {
    commands,
    summary: {
      dir, total: commands.length, ok: okCount, failed: commands.length - okCount,
      applied, mode: apply ? "apply" : "dry-run",
      antiPatternTotal: commands.reduce((n, c) => n + c.antiPatterns.length, 0),
    },
  };
}

// ---------- CLI --------------------------------------------------------------

function runCli(argv) {
  const apply = argv.includes("--apply");
  const dirArg = argv.indexOf("--dir");
  const commandsDir = dirArg !== -1 && argv[dirArg + 1] ? argv[dirArg + 1] : DEFAULT_COMMANDS_DIR;
  const { commands, summary } = runMigration({ commandsDir, apply });
  const L = [`command-migrate: ${summary.mode} — ${summary.dir}`];
  if (summary.error) L.push(`  ERROR: ${summary.error}`);
  for (const c of commands) {
    if (!c.ok) { L.push(`  ✗ ${c.filename}: ${c.error}`); continue; }
    if (c.antiPatterns.length === 0 && c.changes.length === 0 && (!c.warnings || c.warnings.length === 0)) continue;
    L.push(`  ${c.filename}`);
    for (const w of c.warnings || []) L.push(`    warn: ${w}`);
    for (const ap of c.antiPatterns) {
      L.push(`    anti-pattern: ${ap.type}${ap.line ? ` @L${ap.line}` : ""}${ap.count ? ` (×${ap.count} commands)` : ""}`);
    }
    for (const ch of c.changes) L.push(`    ${apply ? "applied" : "would apply"}: ${ch}`);
  }
  L.push(`  total ${summary.total} · ok ${summary.ok} · failed ${summary.failed} · anti-patterns ${summary.antiPatternTotal} · ${apply ? `applied ${summary.applied}` : "dry-run (no writes)"}`);
  process.stdout.write(L.join("\n") + "\n");
  // Exit non-zero only on a hard runner error — anti-patterns are advisory.
  process.exit(summary.error ? 1 : 0);
}

// ---------- Exports ----------------------------------------------------------

export {
  migrateCommand,
  runMigration,
  parseFrontmatter,
  normalizeFrontmatter,
  detectAntiPatterns,
  detectBoilerplate,
};

/** @internal — exported for the test suite only. */
export const _internals = {
  slugFromFilename,
  frontmatterKeys,
  normLine,
  COUNT_RE,
  PATH_RE,
  SESSION_ID_RE,
  MIN_BOILERPLATE_COMMANDS,
  BOILERPLATE_WINDOW_LINES,
};

// CLI invocation guard.
if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  runCli(process.argv.slice(2));
}
