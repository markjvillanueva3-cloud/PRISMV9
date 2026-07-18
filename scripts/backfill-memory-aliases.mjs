#!/usr/bin/env node
// PSN-ENHANCE-MS0/U-PSN-ALIASES-BACKFILL (2026-05-24): bulk-add aliases:[]
// frontmatter to memory files so the iter-9 W_ALIAS scorer actually has
// signal to score against. Today coverage is 6 of 9266 records — operator-by-
// operator adds. This script lifts it to ~all-eligible-feedback in one pass.
//
// Algorithm (deterministic, no LLM, idempotent):
//   1. Walk knowledge/memories/{feedback,reference,project,user,patterns,
//      mistakes,inbox}/*.md
//   2. Skip files that already have `aliases:` in frontmatter (idempotent —
//      operator-curated aliases are NEVER overwritten)
//   3. Skip files without a frontmatter block (`---` opener)
//   4. Generate 3-5 alias variants from filename slug + name: frontmatter:
//        a. Strip namespace prefix (feedback_, reference_, etc.)
//        b. Strip trailing date pattern (_YYYY_MM_DD$)
//        c. kebab-case form (s/_/-/g)
//        d. upper-snake form (UPPER_CASE_WITH_UNDERSCORES)
//        e. title-case-with-acronym-detection (3-4-char tokens uppercased)
//        f. name: from frontmatter (if differs from slug)
//   5. Dedupe case-insensitive; skip if zero aliases generated
//   6. Inject `aliases: [a, b, c]` immediately AFTER the description: line
//      (or after name: if no description:)
//   7. Atomic write via tmp+rename
//
// Flags:
//   --dry-run       Show what would change, don't write
//   --limit N       Stop after N files (smoke testing)
//   --namespace X   Only process this namespace (default: all)
//   --json          Machine-readable output
//
// Exit codes: 0 success (writes or dry-run), 1 hard error.

import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { parseAliases } from "./lib/memory-index-search-lib.mjs";

const DEFAULT_VAULT_ROOT = "H:/prism/knowledge/memories";
const DEFAULT_NAMESPACES = ["feedback", "reference", "project", "user", "patterns", "mistakes", "inbox"];
const DATE_SUFFIX_RE = /_\d{4}[-_]\d{2}[-_]\d{2}(?:_\d{4})?$/;
const MAX_ALIASES_PER_FILE = 6;

// Tokens shorter than ACRONYM_LEN that aren't in COMMON_WORDS get UPPERCASED
// in title-case (psk → PSK, ms0 → MS0, ai → AI). Words in COMMON_WORDS get
// regular Title-Case treatment.
const ACRONYM_LEN = 4;
const COMMON_WORDS = new Set([
  "auto", "with", "into", "from", "this", "that", "self", "high", "low",
  "next", "last", "free", "full", "deep", "fast", "slow", "real", "true",
  "main", "post", "pre",
]);

// Strip the namespace-type prefix from the slug. The bare `feedback`/
// `reference` token at the very start adds zero signal — it's the directory.
function stripNamespacePrefix(slug, namespace) {
  if (typeof slug !== "string") return slug;
  const pfx = `${namespace}_`;
  if (slug.toLowerCase().startsWith(pfx)) return slug.slice(pfx.length);
  return slug;
}

function stripDateSuffix(slug) {
  if (typeof slug !== "string") return slug;
  return slug.replace(DATE_SUFFIX_RE, "");
}

function titleCaseToken(tok) {
  if (typeof tok !== "string" || tok.length === 0) return tok;
  if (tok.length <= ACRONYM_LEN && !COMMON_WORDS.has(tok.toLowerCase())) {
    return tok.toUpperCase();
  }
  return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase();
}

export function generateAliases({ slug, namespace, name, description }) {
  if (typeof slug !== "string" || slug.length === 0) return [];
  const stripped = stripDateSuffix(stripNamespacePrefix(slug, namespace || ""));
  if (stripped.length < 3) return [];

  const tokens = stripped.split(/[_-]/).filter((t) => t.length > 0);
  if (tokens.length === 0) return [];

  const variants = [];

  // a. kebab-case (the canonical wikilink form per cyrilXBT pattern)
  variants.push(tokens.join("-"));

  // b. upper-snake (often used in milestone/unit IDs: PSN-ENHANCE-MS0, U-FOO-BAR)
  variants.push(tokens.map((t) => t.toUpperCase()).join("-"));

  // c. title-case with acronym detection (PSK Kernel, AGI Orchestrator)
  variants.push(tokens.map(titleCaseToken).join(" "));

  // d. all-lower kebab (some callers query lower-cased)
  variants.push(tokens.map((t) => t.toLowerCase()).join("-"));

  // e. name: from frontmatter if differs from slug (curated authoritative form)
  if (typeof name === "string" && name.length >= 3) {
    const nLower = name.toLowerCase();
    if (nLower !== slug.toLowerCase() && nLower !== tokens.join("-").toLowerCase()) {
      variants.push(name);
    }
  }

  // Dedupe case-insensitive, first-occurrence wins, skip if matches the bare
  // slug (the slug IS the name — alias of self adds nothing).
  const slugLower = slug.toLowerCase();
  const seen = new Set([slugLower]);
  const out = [];
  for (const v of variants) {
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (trimmed.length === 0) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= MAX_ALIASES_PER_FILE) break;
  }
  return out;
}

function parseFrontmatterRaw(body) {
  if (typeof body !== "string" || !body.startsWith("---")) {
    return null;
  }
  const end = body.indexOf("\n---", 3);
  if (end < 0) return null;
  return { fm: body.slice(3, end), rest: body.slice(end + 4) };
}

function extractName(fm) {
  const m = fm.match(/^\s*name:\s*(.+?)\s*$/m);
  if (!m) return null;
  return m[1].trim().replace(/^["'](.+)["']$/, "$1");
}

function extractDescription(fm) {
  const m = fm.match(/^\s*description:\s*(.+?)\s*$/m);
  if (!m) return null;
  return m[1].trim();
}

// Injects the aliases line into the frontmatter at the best position:
//   - immediately AFTER description: if present
//   - else immediately AFTER name: if present
//   - else at the END of the frontmatter (before the closing ---)
// Returns the new full body (frontmatter + rest).
export function injectAliasesLine(body, aliases) {
  if (!Array.isArray(aliases) || aliases.length === 0) return body;
  const parsed = parseFrontmatterRaw(body);
  if (!parsed) return body;
  const aliasesLine = `aliases: [${aliases.join(", ")}]`;
  const lines = parsed.fm.split("\n");
  let injectAt = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*description:/.test(lines[i])) { injectAt = i + 1; break; }
  }
  if (injectAt === lines.length) {
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*name:/.test(lines[i])) { injectAt = i + 1; break; }
    }
  }
  lines.splice(injectAt, 0, aliasesLine);
  const newFm = lines.join("\n");
  return `---${newFm}\n---${parsed.rest}`;
}

export function planBackfillFile({ fullPath, namespace, fileName, readImpl = readFileSync }) {
  let body;
  try { body = readImpl(fullPath, "utf8"); } catch { return { skipped: "read-error" }; }
  const parsed = parseFrontmatterRaw(body);
  if (!parsed) return { skipped: "no-frontmatter" };
  // Idempotent: don't touch files that already have aliases (operator-curated
  // is sacred — we only fill in the blanks).
  if (parseAliases(parsed.fm).length > 0) return { skipped: "already-aliased" };
  const slug = fileName.replace(/\.md$/i, "");
  const name = extractName(parsed.fm);
  const description = extractDescription(parsed.fm);
  const aliases = generateAliases({ slug, namespace, name, description });
  if (aliases.length === 0) return { skipped: "no-aliases-generated" };
  const newBody = injectAliasesLine(body, aliases);
  if (newBody === body) return { skipped: "injection-no-op" };
  return { aliases, newBody };
}

function writeAtomic(fullPath, body, writeImpl = writeFileSync, renameImpl = renameSync) {
  const tmp = `${fullPath}.tmp.${process.pid}`;
  writeImpl(tmp, body, "utf8");
  renameImpl(tmp, fullPath);
}

// Infer namespace from filename prefix when running --flat against the C:
// source directory (no subdirs there — filenames carry the namespace).
function inferNamespaceFromFilename(fileName) {
  const m = fileName.match(/^([a-z]+)_/);
  if (!m) return "uncategorized";
  const ns = m[1].toLowerCase();
  if (DEFAULT_NAMESPACES.includes(ns)) return ns;
  return "uncategorized";
}

export function runBackfill({
  vaultRoot = DEFAULT_VAULT_ROOT,
  namespaces = DEFAULT_NAMESPACES,
  flat = false,
  limit = Infinity,
  dryRun = false,
  readdirImpl = readdirSync,
  readImpl = readFileSync,
  writeImpl = writeFileSync,
  renameImpl = renameSync,
  existsImpl = existsSync,
} = {}) {
  const stats = {
    scanned: 0, written: 0,
    skippedAlreadyAliased: 0, skippedNoFrontmatter: 0, skippedNoAliasesGenerated: 0,
    skippedReadError: 0, skippedInjectionNoOp: 0,
  };
  const samples = [];
  // Flat mode: vaultRoot itself contains *.md files (the C: source flat layout
  // C:\Users\<user>\.claude\projects\H--prism\memory\). Namespace is inferred
  // from filename prefix (feedback_/reference_/project_/...). Single-pass walk.
  // Namespaced mode: walk each ns subdir under vaultRoot (the H: tracked vault).
  const dirs = flat ? [{ ns: null, dir: vaultRoot }] : namespaces.map((ns) => ({ ns, dir: join(vaultRoot, ns) }));

  outer:
  for (const { ns: explicitNs, dir } of dirs) {
    if (!existsImpl(dir)) continue;
    let names;
    try { names = readdirImpl(dir); } catch { continue; }
    for (const fileName of names) {
      if (!/\.md$/i.test(fileName)) continue;
      if (fileName === "MEMORY.md" || fileName === "MEMORY-ARCHIVE.md") continue;
      // Skip auto-generated graph→memory pointer files: they're regenerated
      // by the feeder and EPERM-lock during regen passes (race-prone). The
      // alias signal on synthetic pointers is also low value — the upstream
      // graph node id already encodes the searchable name.
      if (/^node_/.test(fileName)) continue;
      const ns = explicitNs ?? inferNamespaceFromFilename(fileName);
      stats.scanned++;
      const fullPath = join(dir, fileName);
      void explicitNs; // referenced via `ns` above; silence lint
      const plan = planBackfillFile({ fullPath, namespace: ns, fileName, readImpl });
      if (plan.skipped === "read-error") stats.skippedReadError++;
      else if (plan.skipped === "no-frontmatter") stats.skippedNoFrontmatter++;
      else if (plan.skipped === "already-aliased") stats.skippedAlreadyAliased++;
      else if (plan.skipped === "no-aliases-generated") stats.skippedNoAliasesGenerated++;
      else if (plan.skipped === "injection-no-op") stats.skippedInjectionNoOp++;
      else {
        stats.written++;
        if (samples.length < 5) samples.push({ namespace: ns, fileName, aliases: plan.aliases });
        if (!dryRun) writeAtomic(fullPath, plan.newBody, writeImpl, renameImpl);
        if (stats.written >= limit) break outer;
      }
    }
  }
  return { stats, samples };
}

function parseArgs(argv) {
  const args = { dryRun: false, limit: Infinity, namespace: null, json: false, vaultRoot: null, flat: false };
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
  const result = runBackfill({
    vaultRoot: args.vaultRoot || DEFAULT_VAULT_ROOT,
    namespaces,
    flat: args.flat,
    limit: args.limit,
    dryRun: args.dryRun,
  });
  const elapsedMs = Date.now() - start;
  const summary = { ...result.stats, elapsedMs, dryRun: args.dryRun, namespaces, samples: result.samples };
  if (args.json) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
    return;
  }
  process.stdout.write(
    `[backfill-memory-aliases] ${args.dryRun ? "DRY-RUN" : "APPLIED"} `
    + `scanned=${summary.scanned} written=${summary.written} `
    + `skipped-already-aliased=${summary.skippedAlreadyAliased} `
    + `skipped-no-frontmatter=${summary.skippedNoFrontmatter} `
    + `skipped-no-aliases-generated=${summary.skippedNoAliasesGenerated} `
    + `skipped-read-error=${summary.skippedReadError} `
    + `elapsed=${elapsedMs}ms\n`,
  );
  if (summary.samples.length > 0) {
    process.stdout.write(`[backfill-memory-aliases] samples:\n`);
    for (const s of summary.samples) {
      process.stdout.write(`  ${s.namespace}/${s.fileName} → [${s.aliases.join(", ")}]\n`);
    }
  }
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
  catch (err) {
    try { process.stderr.write(`[backfill-memory-aliases] ${err?.stack || err?.message || err}\n`); }
    catch { /* ignore */ }
    process.exit(1);
  }
}
