#!/usr/bin/env node
/**
 * populate-command-frontmatter.mjs (COMMAND-KERNEL-MS0 / U-CK15)
 * ---------------------------------------------------------------
 * Enrich .claude/commands/*.md frontmatter with high-precision
 * `composes_with` and `consumes` fields, inferred from the body.
 *
 *  - composes_with: `/<slash-slug>` references in body, intersected
 *    with the installed-skill registry (project + global). Filters
 *    self-refs. Schema requires `/<lowercase-kebab>` shape.
 *  - consumes:      `prism_<X>:<action>` dispatcher-action mentions
 *    in body. High-confidence (the literal contract surface), so
 *    populated even without explicit "reads from" prose.
 *  - produces:      NOT inferred heuristically (high false-positive
 *    risk in prose). Left to manual annotation. Reported as
 *    `manual-only` in the coverage dashboard.
 *
 * Invariants:
 *  - Additive only. Existing `composes_with` / `consumes` keys are
 *    NEVER overwritten (R8 read-before-write).
 *  - Output frontmatter must validate against
 *    `.claude/schemas/command-frontmatter.schema.json` — fail-loud
 *    R12 on inference that violates schema (e.g. non-kebab slug).
 *  - Empty inference → do NOT add the key (avoid bare `consumes: []`
 *    noise).
 *
 * Usage:
 *   node scripts/populate-command-frontmatter.mjs --dry-run
 *   node scripts/populate-command-frontmatter.mjs --apply
 *   node scripts/populate-command-frontmatter.mjs --apply --field composes_with
 *   node scripts/populate-command-frontmatter.mjs --apply --corpus H:/prism/.claude/commands
 *
 * Exit codes: 0 ok · 1 invalid args · 2 inference produced
 * schema-invalid value (R12 fail-loud — would corrupt frontmatter).
 *
 * SHIPPED by claude-df944902 (slot bravo) 2026-05-19.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/* ─────────────────────── pure-core (testable) ─────────────────────── */

const SLASH_REF_RE = /(?<![a-z0-9-])\/([a-z][a-z0-9-]*(?::[a-z0-9-]+)?)\b/g;
// Allow digits in dispatcher name (prism_5axis) and action name (foo_v2) — real PRISM dispatchers
// have digits (Arm B P0 finding 2026-05-19 — without digits, prism_5axis:* silently dropped).
const DISPATCHER_ACTION_RE = /\bprism_[a-z0-9_]+:[a-z0-9_]+\b/g;
const SLUG_RE = /^[a-z][a-z0-9-]*(:[a-z0-9-]+)?$/;
// CRLF + BOM tolerant: strip BOM first (`stripFrontmatterPrelude`), then normalize CRLF→LF for the
// match, then operate on the LF-normalized text. Round-trip preserves original line endings of body
// via `restoreLineEndings`. Anchor `^---` accepts both CRLF and LF after normalization.
const FM_RE = /^---\n([\s\S]*?)\n---\n?/;
const FIELD_ALLOWLIST = new Set(["composes_with", "consumes"]); // produces is manual-only.
const ALLOWED_TIMEOUT_MS = 30000;

/**
 * Extract `/slash` references in body, intersect with `knownSlugs`,
 * drop `selfSlug`. Returns sorted unique array of `/<slug>`.
 */
export function inferComposesWith(body, { knownSlugs, selfSlug } = {}) {
  if (typeof body !== "string" || body.length === 0) return [];
  const known = knownSlugs instanceof Set ? knownSlugs : new Set(knownSlugs ?? []);
  const out = new Set();
  for (const m of body.matchAll(SLASH_REF_RE)) {
    const slug = m[1];
    if (selfSlug && slug === selfSlug) continue;
    if (!known.has(slug)) continue;
    if (!SLUG_RE.test(slug)) continue;
    out.add("/" + slug);
  }
  return [...out].sort();
}

/**
 * Extract `prism_<X>:<action>` mentions. Returns sorted unique array.
 */
export function inferConsumes(body) {
  if (typeof body !== "string" || body.length === 0) return [];
  const out = new Set();
  for (const m of body.matchAll(DISPATCHER_ACTION_RE)) out.add(m[0]);
  return [...out].sort();
}

/**
 * Detect line-ending style of a file. Returns `"crlf"` or `"lf"`.
 * Used to round-trip the body's line endings after frontmatter rewrite.
 */
export function detectLineEnding(text) {
  if (typeof text !== "string" || text.length === 0) return "lf";
  return text.includes("\r\n") ? "crlf" : "lf";
}

/**
 * Strip a leading UTF-8 BOM if present. Required before any `^---` match —
 * editors on Windows may add `﻿` and the anchor would never fire,
 * causing the populator to wrap the entire file (including its existing
 * frontmatter) inside a NEW frontmatter — silent corruption.
 */
export function stripBom(text) {
  if (typeof text !== "string" || text.length === 0) return text;
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

/**
 * Parse leading frontmatter block; CRLF + BOM tolerant. Returns
 * `{frontmatter, body, hasFrontmatter, eol}` — `eol` is the original
 * line-ending style (used by `rebuildFile` to round-trip). The
 * frontmatter inner text is LF-normalized for downstream regex
 * stability; the body is sliced from the post-BOM-strip text so
 * its line endings survive byte-for-byte.
 *
 * The CRLF+LF-tolerant regex is the source of truth — there is no
 * separate LF-only path (eliminates the previous draft's dead
 * branch).
 */
const FM_RE_EOL = /^---(?:\r\n|\n)([\s\S]*?)(?:\r\n|\n)---(?:\r\n|\n)?/;
export function parseFrontmatter(text) {
  if (typeof text !== "string") return { frontmatter: "", body: "", hasFrontmatter: false, eol: "lf" };
  const stripped = stripBom(text);
  const eol = detectLineEnding(stripped);
  const m = stripped.match(FM_RE_EOL);
  if (!m) return { frontmatter: "", body: stripped, hasFrontmatter: false, eol };
  return {
    frontmatter: m[1].replace(/\r\n/g, "\n"),
    body: stripped.slice(m[0].length),
    hasFrontmatter: true,
    eol,
  };
}

/**
 * Does a frontmatter YAML block already declare `key:` at top-level?
 * Conservative — top-level only (no nested-key collisions).
 */
export function hasFrontmatterKey(fm, key) {
  if (typeof fm !== "string" || !key) return false;
  const re = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:`, "m");
  return re.test(fm);
}

/**
 * Emit a YAML array-of-strings block, double-quoted (safe for refs
 * containing `:` or `/`). Returns "" for empty `values`. R12 throws
 * (Arm A P0 finding 2026-05-19) on values containing newlines (would
 * produce a multi-line quoted scalar — schema violation) and escapes
 * backslashes BEFORE quotes (otherwise `\"` becomes a backspace+`"`).
 */
export function emitYamlStringArray(key, values) {
  if (!Array.isArray(values) || values.length === 0) return "";
  const lines = [`${key}:`];
  for (const v of values) {
    const s = String(v);
    if (/[\r\n]/.test(s)) {
      throw new Error(`emitYamlStringArray: value contains newline (key=${key}, value=${JSON.stringify(s)})`);
    }
    // Backslash MUST be escaped first; in a double-quoted YAML scalar `\b` is the backspace escape,
    // so a literal `\b` in input must become `\\b` in output to round-trip.
    const escaped = s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    lines.push(`  - "${escaped}"`);
  }
  return lines.join("\n") + "\n";
}

/**
 * Merge `additions` (keyed YAML blocks already-emitted as strings)
 * into the frontmatter YAML text, additively. When
 * `noOverwrite=true` and the key exists, the addition is dropped.
 * Returns the new frontmatter YAML text (no `---` delimiters).
 */
export function mergeFrontmatterYaml(rawFm, additions, { noOverwrite = true } = {}) {
  let fm = typeof rawFm === "string" ? rawFm : "";
  if (fm.length > 0 && !fm.endsWith("\n")) fm += "\n";
  for (const [key, block] of Object.entries(additions)) {
    if (!block) continue;
    if (noOverwrite && hasFrontmatterKey(fm, key)) continue;
    fm += block;
  }
  return fm.replace(/\n+$/, "\n").replace(/\n$/, "");
}

/**
 * Reassemble a file: `---\n<fm>\n---\n<body>`. Handles
 * empty-frontmatter case by wrapping with the delimiters. The `eol`
 * arg (lf|crlf) round-trips the original file's line endings. The
 * frontmatter block is always emitted with the host eol so the
 * whole file stays consistent.
 */
export function rebuildFile(frontmatter, body, eol = "lf") {
  const nl = eol === "crlf" ? "\r\n" : "\n";
  const fm = (frontmatter || "").replace(/\n+$/, "");
  // Re-emit frontmatter with the host eol (input fm uses LF after parse-normalize).
  const fmWithEol = eol === "crlf" ? fm.replace(/\n/g, "\r\n") : fm;
  const bodyClean = body.startsWith("\n") || body.startsWith("\r\n")
    ? body.replace(/^\r?\n/, "")
    : body;
  return `---${nl}${fmWithEol}${nl}---${nl}${bodyClean}`;
}

/**
 * One-stop transform: given file text, additions, and options,
 * return the new text. Throws (R12) if any inferred slug or
 * dispatcher action violates its schema regex. Empty-additions on
 * a no-frontmatter file returns the ORIGINAL text byte-identical
 * (Arm A P1 2026-05-19 — was emitting a degenerate empty `---`
 * block).
 */
export function transformFileText(text, additions, opts = {}) {
  validateAdditions(additions);
  const { frontmatter, body, hasFrontmatter, eol } = parseFrontmatter(text);
  const newFm = mergeFrontmatterYaml(frontmatter, additions, opts);
  if (newFm === frontmatter && hasFrontmatter) return text; // no-op
  // Empty additions + no existing frontmatter → byte-identical (don't fabricate `---\n\n---`).
  if (!hasFrontmatter && newFm.replace(/\s+/g, "") === "") return text;
  return rebuildFile(newFm, body, eol);
}

/**
 * R12: throw if an inferred value violates its schema regex. Validates
 * BOTH `composes_with` (slash-prefix kebab) AND `consumes` (the
 * `prism_<name>:<action>` shape, digit-tolerant). Asymmetric validation
 * was Arm A P0 2026-05-19 — `validateAdditions` named itself
 * generically but only checked one key.
 */
function validateAdditions(additions) {
  for (const [key, block] of Object.entries(additions || {})) {
    if (!block) continue;
    const items = [...block.matchAll(/^\s*-\s*"([^"]+)"/gm)].map(m => m[1]);
    if (key === "composes_with") {
      for (const s of items) {
        if (!/^\/[a-z][a-z0-9-]*(:[a-z0-9-]+)?$/.test(s)) {
          throw new Error(`schema-invalid composes_with slug: ${JSON.stringify(s)}`);
        }
      }
    } else if (key === "consumes") {
      for (const s of items) {
        // consumes accepts dispatcher actions (high-confidence inference) OR file paths /
        // arbitrary strings (manual annotation). Only fail-loud on the dispatcher-action shape
        // when it almost-matches but is malformed (catches inference bugs without rejecting
        // legitimate manual file-path entries).
        if (s.startsWith("prism_") && !/^prism_[a-z0-9_]+:[a-z0-9_]+$/.test(s)) {
          throw new Error(`schema-invalid consumes dispatcher: ${JSON.stringify(s)}`);
        }
      }
    }
  }
}

/* ─────────────────────── I/O shell (not tested directly) ─────────────────────── */

function loadKnownSlugs(dirs) {
  const slugs = new Set();
  for (const d of dirs) {
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) {
      if (!f.endsWith(".md")) continue;
      const slug = f.replace(/\.md$/, "");
      if (SLUG_RE.test(slug)) slugs.add(slug);
    }
  }
  return slugs;
}

function listCommandFiles(dirs) {
  const out = [];
  for (const d of dirs) {
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) {
      if (!f.endsWith(".md")) continue;
      const p = join(d, f);
      try { if (!statSync(p).isFile()) continue; } catch { continue; }
      out.push(p);
    }
  }
  return out;
}

export function parseArgs(argv) {
  const args = {
    apply: false, dryRun: true,
    fields: new Set(["composes_with", "consumes"]),
    corpus: ["H:/prism/.claude/commands", "H:/.claude/commands"],
    reportPath: "H:/prism/state/shared/dashboards/command-frontmatter-coverage.md",
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") { args.apply = true; args.dryRun = false; }
    else if (a === "--dry-run") { args.apply = false; args.dryRun = true; }
    else if (a === "--field") {
      const fields = (argv[++i] || "").split(",").map(s => s.trim()).filter(Boolean);
      for (const f of fields) {
        if (!FIELD_ALLOWLIST.has(f)) {
          throw new Error(`unknown --field value: ${JSON.stringify(f)} (allowed: ${[...FIELD_ALLOWLIST].join(",")})`);
        }
      }
      args.fields = new Set(fields);
    }
    else if (a === "--corpus") { args.corpus = (argv[++i] || "").split(",").map(s => s.trim()).filter(Boolean); }
    else if (a === "--report") { args.reportPath = argv[++i] ?? ""; }
    else if (a === "--json") { args.json = true; }
    else if (a === "--help" || a === "-h") { args.help = true; }
    else { throw new Error(`unknown arg: ${a}`); }
  }
  return args;
}

function helpText() {
  return `populate-command-frontmatter — U-CK15 (COMMAND-KERNEL-MS0)

  --dry-run            scan + report, don't write (default)
  --apply              write changes additively
  --field LIST         comma-list: composes_with,consumes (default: both)
  --corpus DIRS        comma-list of dirs (default: project + global)
  --report PATH        coverage report .md target
  --json               machine-readable report on stdout
  -h, --help           this text
`;
}

function inferForFile(path, knownSlugs, fields) {
  const text = readFileSync(path, "utf8");
  const { body } = parseFrontmatter(text);
  const selfSlug = basename(path).replace(/\.md$/, "");
  const result = { path, selfSlug, additions: {}, counts: {} };
  if (fields.has("composes_with")) {
    const list = inferComposesWith(body, { knownSlugs, selfSlug });
    result.counts.composes_with = list.length;
    if (list.length > 0) result.additions.composes_with = emitYamlStringArray("composes_with", list);
  }
  if (fields.has("consumes")) {
    const list = inferConsumes(body);
    result.counts.consumes = list.length;
    if (list.length > 0) result.additions.consumes = emitYamlStringArray("consumes", list);
  }
  return result;
}

function buildReportMd(summary, perFile) {
  const lines = [];
  lines.push(`# Command Frontmatter Coverage — U-CK15`);
  lines.push(``);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`**Corpus:** ${summary.scanned} command(s) scanned across ${summary.corpus.length} dir(s).`);
  lines.push(``);
  lines.push(`| Field | Already-set | Inferred (this run) | After run | % |`);
  lines.push(`|-------|-------------|---------------------|-----------|---|`);
  for (const k of ["composes_with", "consumes", "produces"]) {
    const s = summary.fields[k] || { existing: 0, inferred: 0 };
    const after = s.existing + s.inferred;
    const pct = summary.scanned > 0 ? Math.round((after / summary.scanned) * 100) : 0;
    lines.push(`| ${k} | ${s.existing} | ${s.inferred} | ${after} | ${pct}% |`);
  }
  lines.push(``);
  lines.push(`> \`produces\` is manual-only (high-FPR heuristically) — operator-annotated, not inferred.`);
  lines.push(``);
  lines.push(`## Top 20 newly-enriched commands`);
  lines.push(``);
  const ranked = perFile
    .filter(r => (r.counts.composes_with || 0) + (r.counts.consumes || 0) > 0)
    .sort((a, b) => (b.counts.composes_with + b.counts.consumes) - (a.counts.composes_with + a.counts.consumes))
    .slice(0, 20);
  for (const r of ranked) {
    lines.push(`- \`${r.selfSlug}\` — composes_with:${r.counts.composes_with || 0} consumes:${r.counts.consumes || 0}`);
  }
  return lines.join("\n") + "\n";
}

export async function main(argv) {
  let args;
  try { args = parseArgs(argv); } catch (err) {
    process.stderr.write(`populate-command-frontmatter: ${err.message}\n${helpText()}`);
    process.exit(1);
  }
  if (args.help) { process.stdout.write(helpText()); return 0; }

  const knownSlugs = loadKnownSlugs(args.corpus);
  const files = listCommandFiles(args.corpus);
  const perFile = [];
  const summary = {
    corpus: args.corpus, scanned: files.length,
    fields: {
      composes_with: { existing: 0, inferred: 0 },
      consumes:      { existing: 0, inferred: 0 },
      produces:      { existing: 0, inferred: 0 },
    },
    applied: args.apply, dryRun: args.dryRun,
  };

  // Split error counters (Arm B P1 2026-05-19 — was conflating R12 schema-invalid throws with IO
  // errors under one "writeFails" label, misdiagnosing operators).
  let schemaInvalidCount = 0;
  let ioErrorCount = 0;
  for (const path of files) {
    const text = readFileSync(path, "utf8");
    const { frontmatter } = parseFrontmatter(text);
    for (const k of ["composes_with", "consumes", "produces"]) {
      if (hasFrontmatterKey(frontmatter, k)) summary.fields[k].existing++;
    }
    const inf = inferForFile(path, knownSlugs, args.fields);
    perFile.push(inf);
    if (inf.counts.composes_with > 0 && !hasFrontmatterKey(frontmatter, "composes_with")) summary.fields.composes_with.inferred++;
    if (inf.counts.consumes      > 0 && !hasFrontmatterKey(frontmatter, "consumes"))      summary.fields.consumes.inferred++;
    if (Object.keys(inf.additions).length === 0) continue;
    if (!args.apply) continue;
    try {
      const newText = transformFileText(text, inf.additions, { noOverwrite: true });
      if (newText !== text) writeFileSync(path, newText, "utf8");
    } catch (err) {
      const msg = String(err && err.message || err);
      if (/schema-invalid/i.test(msg)) schemaInvalidCount++;
      else ioErrorCount++;
      process.stderr.write(`populate-command-frontmatter: ${path}: ${msg}\n`);
    }
  }
  summary.schemaInvalidCount = schemaInvalidCount;
  summary.ioErrorCount = ioErrorCount;

  // Write the report BEFORE exit-non-zero so the operator sees WHICH files contributed (Arm A P2).
  const reportMd = buildReportMd(summary, perFile);
  if (args.reportPath) {
    try { writeFileSync(args.reportPath, reportMd, "utf8"); }
    catch (err) { process.stderr.write(`populate-command-frontmatter: dashboard write skipped: ${err.message}\n`); }
  }
  if (args.json) process.stdout.write(JSON.stringify({ summary, perFileCount: perFile.length }, null, 2) + "\n");
  else process.stdout.write(reportMd);

  if (schemaInvalidCount > 0) return 2;            // R12 fail-loud — schema-invalid emission.
  if (ioErrorCount > 0)      return 3;             // I/O failures (perm, ENOENT) — distinguishable.
  return 0;
}

const __invokedAsCli = (() => {
  try { return import.meta.url === pathToFileURL(resolve(process.argv[1] || "")).href; }
  catch { return false; }
})();
if (__invokedAsCli) {
  main(process.argv.slice(2)).then(c => process.exit(c)).catch(err => {
    process.stderr.write(`populate-command-frontmatter: ${err.stack || err.message}\n`);
    process.exit(1);
  });
}
