#!/usr/bin/env node
/**
 * convert-wiki-index-plain-md.mjs — P3-U02
 *
 * Converts knowledge/wiki/index.md entries to dual-format: keep [[wikilinks]]
 * (Obsidian graph navigation) AND linkify the trailing source:<path> field as
 * source:[<basename>](<path>) so GitHub renders a clickable source link.
 *
 * The ENTRY_LINE_RE in WikiIndexMaintainerEngine captures source as `\S+`,
 * which matches `[name](path/with/no/whitespace)` — round-trip safe.
 *
 * Idempotent: lines that already have `source:[name](path)` are left alone.
 *
 * Usage:
 *   node scripts/convert-wiki-index-plain-md.mjs                  # apply
 *   node scripts/convert-wiki-index-plain-md.mjs --dry-run        # preview only
 *   node scripts/convert-wiki-index-plain-md.mjs --verify         # check shape, no write
 *   node scripts/convert-wiki-index-plain-md.mjs --in <path>      # custom input path
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, basename, extname } from "node:path";

const DEFAULT_INDEX_PATH = "knowledge/wiki/index.md";

// Match the WikiIndexMaintainerEngine ENTRY_LINE_RE shape but with a wider
// source-token capture (we need to substitute it). Anchored on `source:` so
// non-source lines are skipped entirely.
const ENTRY_WITH_SOURCE_RE =
  /^(-\s+\[\[[^\]]+\]\]\s+—\s+.*?\s+\|\s+category:[\w-]+\s+\|\s+sources:\d+\s+\|\s+confidence:[\d.]+\s+\|\s+last_verified:\d{4}-\d{2}-\d{2}\s+\|\s+source:)(\S+)(\s*)$/u;

// Detect already-linkified `source:[label](path)` so we don't double-convert.
const ALREADY_LINKIFIED_RE = /^\[[^\]]+\]\([^)]+\)$/u;

function linkifySourceToken(rawToken) {
  // Already linkified? leave alone.
  if (ALREADY_LINKIFIED_RE.test(rawToken)) return rawToken;
  // basename without extension (e.g., "AISystemRouterEngine" from
  // "src/engines/AISystemRouterEngine.ts").
  const base = basename(rawToken, extname(rawToken));
  return `[${base}](${rawToken})`;
}

function convertLine(line) {
  const m = line.match(ENTRY_WITH_SOURCE_RE);
  if (!m) return { line, changed: false };
  const linkified = linkifySourceToken(m[2]);
  if (linkified === m[2]) return { line, changed: false };
  return { line: `${m[1]}${linkified}${m[3]}`, changed: true };
}

function convert(content) {
  const out = [];
  let entryLines = 0;
  let convertedLines = 0;
  let unchangedEntries = 0;
  for (const raw of content.split(/\r?\n/u)) {
    const isEntry = /^- \[\[/.test(raw);
    if (isEntry) entryLines += 1;
    const r = convertLine(raw);
    out.push(r.line);
    if (r.changed) convertedLines += 1;
    else if (isEntry) unchangedEntries += 1;
  }
  return { text: out.join("\n"), stats: { entryLines, convertedLines, unchangedEntries } };
}

function verify(content) {
  // Count lines that look like entries vs lines that match the strict regex
  // (without source) vs lines that match with source.
  const ENTRY_LINE_RE_NO_SOURCE = /^-\s+\[\[[^\]]+\]\]\s+—\s+.*?\s+\|\s+category:[\w-]+\s+\|\s+sources:\d+\s+\|\s+confidence:[\d.]+\s+\|\s+last_verified:\d{4}-\d{2}-\d{2}(?:\s+\|\s+source:\S+)?\s*$/u;
  let totalEntryLines = 0;
  let regexValid = 0;
  let withLinkifiedSource = 0;
  let withRawSource = 0;
  let withoutSource = 0;
  for (const line of content.split(/\r?\n/u)) {
    if (!line.startsWith("- [[")) continue;
    totalEntryLines += 1;
    if (ENTRY_LINE_RE_NO_SOURCE.test(line)) regexValid += 1;
    const m = line.match(/\|\s+source:(\S+)/u);
    if (!m) {
      withoutSource += 1;
    } else if (ALREADY_LINKIFIED_RE.test(m[1])) {
      withLinkifiedSource += 1;
    } else {
      withRawSource += 1;
    }
  }
  return { totalEntryLines, regexValid, withLinkifiedSource, withRawSource, withoutSource };
}

// CLI
const args = process.argv.slice(2);
function getFlag(name) {
  return args.includes(`--${name}`);
}
function getOpt(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i < 0 || i + 1 >= args.length) return fallback;
  return args[i + 1];
}

const inPath = resolve(getOpt("in", DEFAULT_INDEX_PATH));
const dryRun = getFlag("dry-run");
const verifyOnly = getFlag("verify");

const content = readFileSync(inPath, "utf-8");

if (verifyOnly) {
  const v = verify(content);
  process.stdout.write(JSON.stringify(v, null, 2) + "\n");
  process.exit(0);
}

const { text, stats } = convert(content);
process.stdout.write(JSON.stringify({ inPath, dryRun, ...stats }, null, 2) + "\n");

if (!dryRun) {
  writeFileSync(inPath, text, "utf-8");
}
