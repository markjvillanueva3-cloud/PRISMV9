#!/usr/bin/env node
// KNOWLEDGE-VAULT-MS0/U-VAULT02 — Memory->Wiki promotion engine (slot:sierra, 2026-06-06).
//
// Closes the compounding spine the vault was missing: memories that have
// proven durable (referenced from >=3 places AND >=7 days old) graduate into
// the project-lifetime wiki namespace, per the promotion path defined in
// [[reference_u_vault01_knowledge_vault_schema]]: fleeting -> memory -> WIKI
// -> CLAUDE.md, where this script is the memory->WIKI step.
//
// WHY: per the 2026-06 vault recon, 516 of 597 indexed memory files were
// orphaned with no wiki promotion, so durable knowledge never compounded into
// the queryable wiki. This is the Matuschak "evergreen note" pattern -- promote
// what has earned permanence by USAGE, not by guess.
//
// Cloned from scripts/promote-tribal-to-wiki.mjs (R15 clone-don't-fork): pure-
// core + injected-IO, default dry-run, atomic .tmp+rename writes, skip-if-exists.
// Reference counting uses the SAME alias-aware [[target|alias]] extraction that
// U-VAULT-ALIAS-LINK-FIX corrected in WikiLintEngine.
//
// Promotion gate (all must hold): inboundRefs >= MIN_REFS (default 3),
// ageDays >= MIN_AGE (default 7), type in {feedback, reference, lessons,
// decisions, patterns, mistakes}. project = ephemeral, user = private -> never.
//
// CLI: --apply (write), --backlink (also add memory->wiki pointer, guarded),
//      --json, --min-refs N, --min-age N, --limit N. Default = dry-run.
// Knobs: PRISM_VAULT_PROMOTE_{MIN_REFS,MIN_AGE,LIMIT}.

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

const DEFAULT_MEMORY_ROOT = "H:/prism/knowledge/memories";
const DEFAULT_WIKI_ROOT = "H:/prism/knowledge/wiki";
const DEFAULT_MIN_REFS = 3;
const DEFAULT_MIN_AGE_DAYS = 7;
const MS_PER_DAY = 86_400_000;

// Memory type -> wiki section. Types absent here are NEVER promoted
// (project = ongoing/ephemeral, user = private profile, uncategorized = unsorted).
export const TYPE_TO_WIKI_SECTION = {
  feedback: "lessons",
  reference: "reference",
  lessons: "lessons",
  decisions: "decisions",
  decision: "decisions",
  patterns: "patterns",
  pattern: "patterns",
  mistakes: "lessons",
};

// Alias-aware wikilink matcher. This is a SUPERSET of WikiLintEngine.WIKILINK_RE
// (which the U-VAULT-ALIAS-LINK-FIX made alias-aware): this one ALSO strips a
// `#heading` anchor so a `[[doc#sec]]` ref resolves to the base target `doc`.
// Do NOT "sync" this back to the engine's weaker regex — that would silently
// re-break the anchored-ref counting the tests depend on. Group 1 = link TARGET.
const WIKILINK_RE = /\[\[([^\]|#]+?)(?:#[^\]|]*?)?(?:\|[^\]]*?)?\]\]/g;

export function extractWikilinkTargets(text) {
  const out = [];
  if (typeof text !== "string") return out;
  for (const m of text.matchAll(WIKILINK_RE)) {
    const t = m[1].trim();
    if (t) out.push(t);
  }
  return out;
}

// Normalize an identifier for cross-form matching: lowercase, drop .md, unify -/_.
export function normId(s) {
  return String(s).trim().toLowerCase().replace(/\.md$/i, "").replace(/-/g, "_");
}

// Minimal frontmatter parse: returns { fm, body } or null (unterminated => null).
// Handles flat `type: reference` and nested `metadata:\n  type: reference`,
// plus `aliases: [..]`. Nested keys are flattened (first writer wins).
export function parseMemoryFrontmatter(raw) {
  if (typeof raw !== "string") return null;
  const text = raw.replace(/^﻿/, "");
  if (!text.startsWith("---")) return { fm: {}, body: text };
  const end = text.indexOf("\n---", 3);
  if (end < 0) return null; // unterminated frontmatter -> malformed
  const fmBlob = text.slice(3, end).trim();
  const body = text.slice(end + 4).replace(/^\n+/, "");

  const fm = {};
  for (const line of fmBlob.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = (m[2] ?? "").trim();
    if (val === "") continue;
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val.startsWith("[") && val.endsWith("]")) {
      fm[key] = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
      continue;
    }
    if (!(key in fm)) fm[key] = val; // first writer wins
  }
  return { fm, body };
}

// Resolve a memory's type from filename prefix first (CATEGORY_PREFIXES is the
// authoritative convention), then frontmatter `type`.
export function resolveType(fileName, fm) {
  const base = basename(String(fileName)).toLowerCase();
  const PREFIX = [
    ["feedback_", "feedback"], ["reference_", "reference"], ["project_", "project"],
    ["user_", "user"], ["lesson_", "lessons"], ["lessons_", "lessons"],
    ["decision_", "decisions"], ["decisions_", "decisions"], ["mistake_", "mistakes"],
    ["mistakes_", "mistakes"], ["pattern_", "patterns"], ["patterns_", "patterns"],
  ];
  for (const [p, t] of PREFIX) if (base.startsWith(p)) return t;
  if (fm && typeof fm.type === "string" && fm.type) return fm.type.toLowerCase();
  return "uncategorized";
}

// Every identifier a memory can be referenced by: filename-no-ext, `name:` slug,
// and aliases -- each normalized. Used to attribute inbound [[refs]].
export function memoryIdentifiers(fileName, fm) {
  const ids = new Set();
  ids.add(normId(basename(String(fileName))));
  if (fm && typeof fm.name === "string") ids.add(normId(fm.name));
  if (fm && Array.isArray(fm.aliases)) for (const a of fm.aliases) ids.add(normId(a));
  ids.delete("");
  return ids;
}

export function ageDays(mtimeMs, nowMs) {
  return (nowMs - mtimeMs) / MS_PER_DAY;
}

export function shouldPromote({ type, inboundRefs, ageDaysVal, minRefs, minAge }) {
  if (!(type in TYPE_TO_WIKI_SECTION)) return false;
  if (!Number.isFinite(inboundRefs) || inboundRefs < minRefs) return false;
  if (!Number.isFinite(ageDaysVal) || ageDaysVal < minAge) return false;
  return true;
}

export function wikiSlugFor(fileName, fm) {
  const nm = (fm && typeof fm.name === "string" && fm.name.trim())
    ? fm.name.trim()
    : basename(String(fileName)).replace(/\.md$/i, "");
  return nm.replace(/[^A-Za-z0-9_-]/g, "-").toLowerCase();
}

export function buildWikiEntry({ fileName, fm, body, type, inboundRefs, memoryRelPath }) {
  const section = TYPE_TO_WIKI_SECTION[type];
  if (!section) return null;
  const slug = wikiSlugFor(fileName, fm);
  const title = (fm && (fm.title || fm.name)) ? String(fm.title || fm.name).trim() : slug;
  const memSlug = normId(basename(String(fileName)));
  const promotedAt = new Date().toISOString();
  const wikiFM = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `name: ${slug}`,
    "kind: reference",
    "status: promoted",
    `category: ${section}`,
    "domain: knowledge-vault",
    `promoted_from: ${memoryRelPath}`,
    `promoted_at: ${promotedAt}`,
    `source_refs: ${inboundRefs}`,
    "---",
    "",
  ].join("\n");
  const bodyText = (body || "").trim();
  const hasH1 = /^#\s/.test(bodyText);
  const heading = hasH1 ? "" : `# ${title}\n\n`;
  const sourceLink = `\n\n## Source\n\nPromoted from memory [[${memSlug}]] (referenced ${inboundRefs}x across the vault). The memory remains the editable source of truth.\n`;
  return { slug, section, fileName: `${slug}.md`, content: wikiFM + "\n" + heading + bodyText + sourceLink };
}

// Recursively enumerate *.md under a root, skipping archive/quarantine/dot dirs.
function walkMd(root, { readdirImpl = readdirSync } = {}) {
  const out = [];
  let entries;
  try { entries = readdirImpl(root, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const p = join(root, e.name);
    if (e.isDirectory()) {
      if (/^(_archive|archive|quarantine|\.)/i.test(e.name)) continue;
      out.push(...walkMd(p, { readdirImpl }));
    } else if (e.isFile() && /\.md$/i.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

// Skip non-candidate memory files: index files are aggregations, not atoms.
function isIndexFile(fileName) {
  const b = basename(String(fileName)).toLowerCase();
  return b === "memory.md" || b === "memory-archive.md" || b === "memory-recent.md";
}

export function runMemoryPromotion({
  memoryRoot = DEFAULT_MEMORY_ROOT,
  wikiRoot = DEFAULT_WIKI_ROOT,
  minRefs = DEFAULT_MIN_REFS,
  minAge = DEFAULT_MIN_AGE_DAYS,
  apply = false,
  backlink = false,
  limit = null,
  nowMs = Date.now(),
  readdirImpl = readdirSync,
  readFileImpl = readFileSync,
  statImpl = statSync,
  existsImpl = existsSync,
  writeFileImpl = writeFileSync,
  renameImpl = renameSync,
  mkdirImpl = mkdirSync,
} = {}) {
  const report = {
    minRefs, minAge, apply, backlink, memoryRoot, wikiRoot,
    totalMemories: 0, malformed: 0, skippedType: 0, belowRefs: 0, belowAge: 0,
    skippedExisting: 0, promoted: 0, backlinked: 0, candidates: [], written: [],
  };

  const memFiles = walkMd(memoryRoot, { readdirImpl }).filter((p) => !isIndexFile(p));

  // Pass 1: parse every memory, build id->file map.
  const parsed = new Map();   // fullPath -> { fm, body, type, ids, mtimeMs, raw }
  const idToPath = new Map(); // normId -> fullPath (first writer wins)
  for (const f of memFiles) {
    let raw, st;
    try { raw = readFileImpl(f, "utf8"); st = statImpl(f); }
    catch { report.malformed++; continue; }
    const pf = parseMemoryFrontmatter(raw);
    if (!pf) { report.malformed++; continue; }
    const type = resolveType(f, pf.fm);
    const ids = memoryIdentifiers(f, pf.fm);
    parsed.set(f, { fm: pf.fm, body: pf.body, type, ids, mtimeMs: st.mtimeMs, raw });
    for (const id of ids) if (!idToPath.has(id)) idToPath.set(id, f);
  }
  report.totalMemories = parsed.size;

  // Inbound ref counts: scan memories + wiki for [[refs]] resolving to a memory id.
  const inbound = new Map(); // fullPath -> count of OTHER files referencing it
  const scanFiles = [...memFiles, ...walkMd(wikiRoot, { readdirImpl })];
  for (const f of scanFiles) {
    let raw;
    try { raw = readFileImpl(f, "utf8"); } catch { continue; }
    const seen = new Set(); // dedupe multiple refs from the same file
    for (const target of extractWikilinkTargets(raw)) {
      const dest = idToPath.get(normId(target));
      if (!dest || dest === f) continue; // unresolved or self-ref
      if (seen.has(dest)) continue;
      seen.add(dest);
      inbound.set(dest, (inbound.get(dest) || 0) + 1);
    }
  }

  // Pass 2: apply the promotion gate.
  for (const [f, info] of parsed) {
    if (typeof limit === "number" && report.promoted >= limit) break;
    const refs = inbound.get(f) || 0;
    const aDays = ageDays(info.mtimeMs, nowMs);

    if (!(info.type in TYPE_TO_WIKI_SECTION)) { report.skippedType++; continue; }
    if (refs < minRefs) { report.belowRefs++; continue; }
    if (aDays < minAge) { report.belowAge++; continue; }

    const memRel = f.replace(/\\/g, "/").replace(/^.*\/knowledge\/memories\//, "knowledge/memories/");
    const entry = buildWikiEntry({
      fileName: f, fm: info.fm, body: info.body, type: info.type,
      inboundRefs: refs, memoryRelPath: memRel,
    });
    if (!entry) { report.skippedType++; continue; }

    const targetDir = join(wikiRoot, entry.section);
    const targetPath = join(targetDir, entry.fileName);
    if (existsImpl(targetPath)) { report.skippedExisting++; continue; }

    report.candidates.push({ memory: basename(f), refs, ageDays: Math.round(aDays), target: `${entry.section}/${entry.fileName}` });

    if (apply) {
      if (!existsImpl(targetDir)) mkdirImpl(targetDir, { recursive: true });
      const tmp = `${targetPath}.tmp.${process.pid}`;
      writeFileImpl(tmp, entry.content, "utf8");
      renameImpl(tmp, targetPath);
      report.written.push(targetPath);
      report.promoted++;

      if (backlink) {
        const pointer = `[[${entry.slug}]]`;
        if (!info.raw.includes(pointer)) {
          const augmented = info.raw.replace(/\s*$/, "") +
            `\n\n<!-- promoted-to-wiki: ${pointer} (U-VAULT02, ${entry.section}) -->\n`;
          try {
            const btmp = `${f}.tmp.${process.pid}`;
            writeFileImpl(btmp, augmented, "utf8");
            renameImpl(btmp, f);
            report.backlinked++;
          } catch { /* non-fatal: wiki entry already written */ }
        }
      }
    }
  }

  return report;
}

function clampInt(raw, fallback, min, max) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function parseArgs(argv) {
  const out = { apply: false, backlink: false, json: false, minRefs: null, minAge: null, limit: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--dry-run") out.apply = false;
    else if (a === "--backlink") out.backlink = true;
    else if (a === "--json") out.json = true;
    else if (a === "--min-refs") out.minRefs = parseInt(argv[++i], 10);
    else if (a === "--min-age") out.minAge = parseInt(argv[++i], 10);
    else if (a === "--limit") out.limit = parseInt(argv[++i], 10);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const minRefs = Number.isFinite(args.minRefs) ? args.minRefs
    : clampInt(process.env.PRISM_VAULT_PROMOTE_MIN_REFS, DEFAULT_MIN_REFS, 1, 1000);
  const minAge = Number.isFinite(args.minAge) ? args.minAge
    : clampInt(process.env.PRISM_VAULT_PROMOTE_MIN_AGE, DEFAULT_MIN_AGE_DAYS, 0, 100000);
  const limit = Number.isFinite(args.limit) ? args.limit
    : clampInt(process.env.PRISM_VAULT_PROMOTE_LIMIT, null, 1, 100000);

  const start = Date.now();
  const report = runMemoryPromotion({ minRefs, minAge, apply: args.apply, backlink: args.backlink, limit });
  const elapsedMs = Date.now() - start;

  if (args.json) {
    process.stdout.write(JSON.stringify({ ...report, elapsedMs }, null, 2) + "\n");
    return;
  }

  const verb = args.apply ? "PROMOTED" : "WOULD PROMOTE";
  process.stdout.write(
    `[promote-memory-to-wiki] minRefs=${minRefs} minAge=${minAge}d ` +
    `memories=${report.totalMemories} malformed=${report.malformed} ` +
    `skipType=${report.skippedType} belowRefs=${report.belowRefs} belowAge=${report.belowAge} ` +
    `skipExisting=${report.skippedExisting} ${verb}=${report.candidates.length}` +
    (args.backlink ? ` backlinked=${report.backlinked}` : "") +
    ` elapsed=${elapsedMs}ms\n`,
  );
  if (!args.apply && report.candidates.length > 0) {
    process.stdout.write("  (sample of first 8 candidates:)\n");
    report.candidates.slice(0, 8).forEach((c) => {
      process.stdout.write(`    ${c.memory} (refs ${c.refs}, age ${c.ageDays}d) -> ${c.target}\n`);
    });
    process.stdout.write("  Re-run with --apply (and optional --backlink) to write.\n");
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
    try { process.stderr.write(`[promote-memory-to-wiki] ${err?.stack || err?.message || err}\n`); }
    catch { /* ignore */ }
    process.exit(1);
  }
}
