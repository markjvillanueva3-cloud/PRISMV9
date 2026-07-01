#!/usr/bin/env node
// PSN-ENHANCE-MS0/U-PSN-FILL-GAPS Rule-4 wiki-link backfill.
// Closes the Rule-4 gap from feedback_obsidian_low_token_2nd_brain_protocol:
// "Use [[wiki-links]] for cross-refs inside memory bodies."

import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { buildKnownNameRegex, stripLinkedAndCodeSpans } from "./lib/unlinked-mentions-scan.mjs";
import { parseAliases } from "./lib/memory-index-search-lib.mjs";

const DEFAULT_VAULT_ROOT = "H:/prism/knowledge/memories";
const DEFAULT_NAMESPACES = ["feedback", "reference", "project", "user", "patterns", "mistakes", "inbox"];
const MIN_NAME_LEN = 6;
const MAX_LINKS_PER_BODY = 15;

export function splitFrontmatter(text) {
  if (typeof text !== "string" || !text.startsWith("---")) return { frontmatter: "", body: text || "" };
  const end = text.indexOf("\n---", 3);
  if (end < 0) return { frontmatter: "", body: text };
  const close = text.indexOf("\n", end + 4);
  const sep = close < 0 ? text.length : close + 1;
  return { frontmatter: text.slice(0, sep), body: text.slice(sep) };
}

export function findWrappableMentions(body, re, slugByName, ownSlug) {
  if (typeof body !== "string" || body.length === 0) return [];
  const stripped = stripLinkedAndCodeSpans(body);
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(stripped)) !== null && out.length < MAX_LINKS_PER_BODY) {
    const hitName = m[1];
    if (hitName.length < MIN_NAME_LEN) continue;
    const slug = slugByName.get(hitName.toLowerCase());
    if (!slug || slug === ownSlug) continue;
    out.push({ start: m.index, end: m.index + hitName.length, name: hitName, slug });
  }
  return out;
}

export function wrapMentions(body, mentions) {
  if (mentions.length === 0) return { body, inserted: 0 };
  const sorted = [...mentions].sort((a, b) => b.start - a.start);
  let out = body;
  let inserted = 0;
  for (const m of sorted) {
    const display = m.name;
    const replacement = display.toLowerCase() === m.slug.toLowerCase() ? `[[${m.slug}]]` : `[[${m.slug}|${display}]]`;
    out = out.slice(0, m.start) + replacement + out.slice(m.end);
    inserted++;
  }
  return { body: out, inserted };
}

export function loadMemoryNotes({
  vaultRoot = DEFAULT_VAULT_ROOT,
  namespaces = DEFAULT_NAMESPACES,
  flat = false,
  readdirImpl = readdirSync,
  readImpl = readFileSync,
  existsImpl = existsSync,
} = {}) {
  const dirs = flat ? [{ ns: null, dir: vaultRoot }] : namespaces.map((ns) => ({ ns, dir: join(vaultRoot, ns) }));
  const notes = new Map();
  for (const { dir } of dirs) {
    if (!existsImpl(dir)) continue;
    let names;
    try { names = readdirImpl(dir); } catch { continue; }
    for (const fileName of names) {
      if (!/\.md$/i.test(fileName)) continue;
      if (fileName === "MEMORY.md" || fileName === "MEMORY-ARCHIVE.md") continue;
      if (/^node_/.test(fileName)) continue;
      const fullPath = join(dir, fileName);
      let text;
      try { text = readImpl(fullPath, "utf8"); } catch { continue; }
      const slug = fileName.replace(/\.md$/i, "");
      const { frontmatter, body } = splitFrontmatter(text);
      const aliases = parseAliases(frontmatter.replace(/^---\n?|\n?---\n?$/g, ""));
      notes.set(slug, { path: fullPath, fileName, body, frontmatter, aliases });
    }
  }
  return notes;
}

function writeAtomic(fullPath, text, writeImpl = writeFileSync, renameImpl = renameSync) {
  const tmp = `${fullPath}.tmp.${process.pid}`;
  writeImpl(tmp, text, "utf8");
  renameImpl(tmp, fullPath);
}

export function runWikiLinkBackfill({
  vaultRoot = DEFAULT_VAULT_ROOT,
  namespaces = DEFAULT_NAMESPACES,
  flat = false,
  limit = Infinity,
  dryRun = false,
  notes: notesArg = null,
  readdirImpl = readdirSync,
  readImpl = readFileSync,
  writeImpl = writeFileSync,
  renameImpl = renameSync,
  existsImpl = existsSync,
} = {}) {
  const notes = notesArg || loadMemoryNotes({ vaultRoot, namespaces, flat, readdirImpl, readImpl, existsImpl });
  const stats = { scanned: 0, written: 0, totalLinksInserted: 0, skippedNoMentions: 0 };
  const samples = [];
  const { re, slugByName } = buildKnownNameRegex(notes);

  for (const [slug, meta] of notes) {
    stats.scanned++;
    const mentions = findWrappableMentions(meta.body, re, slugByName, slug);
    if (mentions.length === 0) { stats.skippedNoMentions++; continue; }
    const { body: newBody, inserted } = wrapMentions(meta.body, mentions);
    if (inserted === 0) { stats.skippedNoMentions++; continue; }
    stats.written++;
    stats.totalLinksInserted += inserted;
    if (samples.length < 5) samples.push({ slug, fileName: meta.fileName, inserted, firstMention: mentions[0].name + "->" + mentions[0].slug });
    if (!dryRun) writeAtomic(meta.path, meta.frontmatter + newBody, writeImpl, renameImpl);
    if (stats.written >= limit) break;
  }
  return { stats, samples };
}

function parseArgs(argv) {
  const args = { dryRun: false, limit: Infinity, namespace: null, flat: false, vaultRoot: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--json") args.json = true;
    else if (a === "--flat") args.flat = true;
    else if (a === "--limit") args.limit = Number(argv[++i]) || Infinity;
    else if (a === "--namespace") args.namespace = argv[++i] || null;
    else if (a === "--vault-root") args.vaultRoot = argv[++i] || null;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const namespaces = args.namespace ? [args.namespace] : DEFAULT_NAMESPACES;
  const start = Date.now();
  const result = runWikiLinkBackfill({
    vaultRoot: args.vaultRoot || DEFAULT_VAULT_ROOT,
    namespaces,
    flat: args.flat,
    limit: args.limit,
    dryRun: args.dryRun,
  });
  const elapsedMs = Date.now() - start;
  const summary = { ...result.stats, elapsedMs, dryRun: args.dryRun, samples: result.samples };
  if (args.json) { process.stdout.write(JSON.stringify(summary, null, 2) + "\n"); return; }
  process.stdout.write(`[backfill-wiki-links] ${args.dryRun ? "DRY-RUN" : "APPLIED"} scanned=${summary.scanned} written=${summary.written} links-inserted=${summary.totalLinksInserted} elapsed=${elapsedMs}ms\n`);
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const argv = process.argv[1] || "";
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(argv);
  } catch { return false; }
})();

if (invokedDirect) {
  try { main(); }
  catch (err) { try { process.stderr.write(`[backfill-wiki-links] ${err?.stack || err?.message || err}\n`); } catch { /* ignore */ } process.exit(1); }
}
