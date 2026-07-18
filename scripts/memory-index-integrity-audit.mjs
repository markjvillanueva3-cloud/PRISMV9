#!/usr/bin/env node
/**
 * memory-index-integrity-audit.mjs — producer audit for the memory-vault
 * index-integrity substrate.
 *
 * Iter 19 of the /goal synergize loop (echo, 2026-05-21). Audits the
 * "memories" substrate's discoverability: the memory vault
 * (`knowledge/memories/{feedback,reference,project,user,patterns,
 * mistakes,inbox,...}/*.md`) is indexed by `_index/MEMORY.md`, which
 * carries one `[Title](basename.md)` pointer per indexed memory. Two
 * silent-rot failure modes this audit catches:
 *
 *   - BROKEN POINTER — a MEMORY.md link whose target basename resolves to
 *     no file in the vault. The memory it pointed at was renamed/removed;
 *     the index entry is now a dead link.
 *   - ORPHAN MEMORY — a memory `.md` file that NO index pointer references.
 *     The memory exists but is undiscoverable from the index (it can still
 *     be found by the BM25 memory-index-search, but the human-readable
 *     index is blind to it).
 *
 * The index uses BARE basenames (`feedback_foo.md`), while the files live
 * in typed subdirs (`feedback/feedback_foo.md`) — so resolution is by
 * basename across all subdirs, not by path.
 *
 * Pure-core / IO-shell split:
 *   - parseIndexLinks(indexContent)   pure: markdown → [{title, target}]
 *   - audit(indexLinks, fileBasenames) pure: → audit shape
 *   - collectMemoryFiles / main        IO: walk vault, read index, write report
 *
 * Output: state/shared/.memory-index-integrity-audit.json
 * Schema mirrors iter-7 / iter-13 producer shape (stats + lists) so a
 * future SessionStart consumer + viz roost splice without contract drift.
 *
 * Usage:  node scripts/memory-index-integrity-audit.mjs        # write report
 *         node scripts/memory-index-integrity-audit.mjs --json # stdout only
 * Exit:   0 ok · 1 index missing · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const SCHEMA_VERSION = "1.0.0";

const MEMORY_ROOT = path.join(ROOT, "knowledge/memories");
const INDEX_PATH = path.join(MEMORY_ROOT, "_index/MEMORY.md");
const OUT_PATH = path.join(ROOT, "state/shared/.memory-index-integrity-audit.json");

/** Hard cap on broken/orphan names in the report (digest cost cap). */
export const MAX_LIST = 50;
/** Index files that are NOT orphan-eligible — they ARE the index, not memories. */
export const NON_ORPHAN_BASENAMES = Object.freeze(
  new Set(["MEMORY.md", "MEMORY-ARCHIVE.md", "README.md"]),
);

/**
 * Pure: extract markdown link targets from index content. Matches
 * `[Title](target.md)` — only `.md` targets, only relative (no `http`,
 * no absolute). Returns [{title, target}] where target is the bare link
 * string as written (basename, possibly with a relative prefix).
 */
export function parseIndexLinks(indexContent) {
  const text = String(indexContent || "");
  const out = [];
  // [text](target) — non-greedy; target must end in .md and not be a URL.
  const re = /\[([^\]]*)\]\(([^)]+?\.md)\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const title = m[1].trim();
    const target = m[2].trim();
    if (/^[a-z]+:\/\//i.test(target)) continue; // skip URLs
    out.push({ title, target });
  }
  return out;
}

/**
 * Pure: build the audit aggregate.
 *
 * @param indexLinks      [{title, target}] from parseIndexLinks
 * @param fileBasenames   Set/array of every memory-file basename in the vault
 *
 * brokenPointers: index links whose basename is not in the vault.
 * orphans:        vault basenames referenced by NO index link (minus the
 *                 index files themselves).
 */
export function audit(indexLinks, fileBasenames) {
  const links = Array.isArray(indexLinks) ? indexLinks : [];
  const files = fileBasenames instanceof Set
    ? fileBasenames
    : new Set(Array.isArray(fileBasenames) ? fileBasenames : []);

  // Normalize a link target to its bare basename for resolution.
  const toBasename = (t) => String(t || "").replace(/\\/g, "/").split("/").pop() || "";

  const referenced = new Set();
  const broken = [];
  for (const link of links) {
    const base = toBasename(link.target);
    if (!base) continue;
    referenced.add(base);
    if (!files.has(base)) {
      broken.push({ title: link.title || "", target: link.target });
    }
  }

  const orphans = [];
  for (const base of files) {
    if (NON_ORPHAN_BASENAMES.has(base)) continue;
    if (!referenced.has(base)) orphans.push(base);
  }
  orphans.sort();

  const indexLinkCount = links.length;
  const memoryFileCount = files.size;
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    stats: {
      indexLinks: indexLinkCount,
      memoryFiles: memoryFileCount,
      brokenPointers: broken.length,
      orphans: orphans.length,
      // coverage = fraction of (non-index) memory files reachable from the index
      coverage: memoryFileCount > 0
        ? Number(((memoryFileCount - orphans.length) / memoryFileCount).toFixed(4))
        : 0,
    },
    brokenPointers: broken.slice(0, MAX_LIST),
    orphans: orphans.slice(0, MAX_LIST),
  };
}

/** IO: recursively collect every *.md basename under the memory vault. */
export function collectMemoryFiles(memoryRoot) {
  const out = new Set();
  if (!memoryRoot || !fs.existsSync(memoryRoot)) return out;
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith(".md")) out.add(e.name);
    }
  }
  walk(memoryRoot);
  return out;
}

export function main(argv = []) {
  const json = argv.includes("--json");
  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`FATAL: ${INDEX_PATH} missing — memory index not found`);
    return 1;
  }
  let indexContent;
  try { indexContent = fs.readFileSync(INDEX_PATH, "utf8"); }
  catch (e) { console.error(`FATAL: index read failed — ${e.message}`); return 2; }

  const indexLinks = parseIndexLinks(indexContent);
  const fileBasenames = collectMemoryFiles(MEMORY_ROOT);
  const payload = audit(indexLinks, fileBasenames);

  if (json) { console.log(JSON.stringify(payload, null, 2)); return 0; }
  try {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
    console.log(`memory-index-integrity-audit: ${payload.stats.indexLinks} index links · ${payload.stats.memoryFiles} memory files`);
    console.log(`  broken pointers: ${payload.stats.brokenPointers}`);
    console.log(`  orphan memories: ${payload.stats.orphans} (${(payload.stats.coverage * 100).toFixed(1)}% index coverage)`);
    console.log(`  wrote ${OUT_PATH}`);
    return 0;
  } catch (e) {
    console.error(`FATAL: write failed — ${e.message}`);
    return 2;
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main(process.argv.slice(2)));
