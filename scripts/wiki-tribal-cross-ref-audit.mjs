#!/usr/bin/env node
/**
 * wiki-tribal-cross-ref-audit.mjs — /goal synergy iter 7 (echo, 2026-05-21).
 *
 * Producer-side audit closing the wiki ⇄ tribal cross-reference completeness
 * gap (one of the 8 substrates named in the /goal — wiki + tribal knowledge).
 * Scans `knowledge/wiki/**` (markdown files) and `state/shared/tribal-embed-index.json`
 * to identify:
 *
 *   1. WIKI entries that are NOT in the tribal embedding index — every miss
 *      is a piece of wiki knowledge that won't surface in tribal-by-domain
 *      retrieval (subagent context bundles, memory-rag injections, etc.).
 *
 *   2. TRIBAL entries that point at a wiki path which no longer exists on
 *      disk — every miss is a stale embedding shipping rotten retrieval
 *      to consumers (silent semantic drift, the worse half of the pair).
 *
 * Pure-core / IO shell split (modeled on knowledge-link-audit.mjs):
 *   - normalizeWikiPath(p)        pure path normalizer (posix sep, lowercase)
 *   - audit(wikiPaths, entries)   pure, returns {missingFromTribal, staleInTribal, stats}
 *   - main()                      I/O — walks the tree, reads tribal index, writes report
 *
 * Output: `state/shared/.wiki-tribal-cross-ref-audit.json` (advisory; never auto-fixes)
 * Usage:  node scripts/wiki-tribal-cross-ref-audit.mjs        # write report
 *         node scripts/wiki-tribal-cross-ref-audit.mjs --json # stdout (no write)
 * Exit:   0 ok (incl. zero gaps) · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { streamTribalEntries } from "./lib/load-tribal-index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
// 1.1.0 — `tribalWikiPath` now counts non-`wiki:`-scheme entries (notably the
// `external:` scheme the real wiki embedder produces) that resolve under
// knowledge/wiki/. Output shape is unchanged; the `coverage` metric is
// corrected (was a ~0.8% blind spot; true coverage is ~97%).
export const SCHEMA_VERSION = "1.1.0";

const WIKI_DIR = path.join(ROOT, "knowledge/wiki");
const TRIBAL_INDEX_PATH = path.join(ROOT, "state/shared/tribal-embed-index.json");
const OUT_PATH = path.join(ROOT, "state/shared/.wiki-tribal-cross-ref-audit.json");

// ───────────────────────── pure core ─────────────────────────

/**
 * Pure: normalize a wiki path for cross-tree comparison. Strips the
 * `knowledge/wiki/` prefix (irrelevant for matching), collapses path sep to
 * POSIX, lowercases via `en-US` locale (NOT the default — Turkish dotless-i
 * `"İ".toLowerCase()` returns a different code point in the Turkish locale,
 * which would break the byte-determinism claim on a non-en host). Returns
 * empty string for null/undefined/non-string input or paths that contain
 * `..` segments (path-traversal guard — a tribal entry id like
 * `wiki:../etc/passwd` would otherwise pollute the stale-list with literal
 * nonsense paths). (Reviewer-B P1 fixes, iter-7 scrutiny round.)
 */
export function normalizeWikiPath(p) {
  const s = String(p || "").replace(/\\/g, "/").toLowerCase("en-US").trim();
  if (!s) return "";
  // Strip leading `knowledge/wiki/` so wiki and tribal-entry paths land
  // in the same coordinate space, regardless of how either side stored it.
  const stripped = s.replace(/^.*?knowledge\/wiki\//, "");
  // Path-traversal guard: any `..` segment indicates an attempt to reference
  // outside the wiki subtree. Drop it.
  if (stripped.split("/").some((seg) => seg === "..")) return "";
  return stripped;
}

/**
 * Pure: pull the wiki `path` out of a tribal entry. Tribal entry ids look
 * like `wiki:knowledge/wiki/...` (prefix-tagged); some entries have an
 * explicit `path` field. Memory and other-kind entries return empty string.
 */
export function tribalWikiPath(entry) {
  if (!entry || typeof entry !== "object") return "";
  const id = String(entry.id || "");
  // Tagged ids: `wiki:<path>` → strip prefix.
  if (id.startsWith("wiki:")) return normalizeWikiPath(id.slice(5));
  // Some entries store a raw `path` AND a `source:wiki` discriminator.
  if ((entry.source === "wiki" || entry.kind === "wiki") && entry.path) {
    return normalizeWikiPath(entry.path);
  }
  // Other schemes resolving under `knowledge/wiki/`. The real wiki embedder
  // keys entries `external:<abs-path>`, not `wiki:` — a `wiki:`-only audit
  // read 0.8% while ~97% of the corpus was embedded under `external:`
  // (verified 2026-05-22; those entries are valid, retrievable embeddings —
  // `tribal-rerank` reads embedding/text/domain, never id/source). Guarded on
  // a literal `knowledge/wiki/` segment so a non-wiki id is not miscounted.
  for (const cand of [id, String(entry.path || "")]) {
    // `(^|/)knowledge/wiki/` is a path-SEGMENT match, so a non-wiki id such as
    // `.../some-knowledge/wiki-notes/x.md` cannot false-match a bare substring.
    if (/(^|\/)knowledge\/wiki\//.test(cand.replace(/\\/g, "/").toLowerCase())) {
      const n = normalizeWikiPath(cand);
      if (n) return n;
    }
  }
  return "";
}

/**
 * Pure: cross-reference set-difference between disk wiki files and tribal
 * entries. Returns:
 *   {
 *     missingFromTribal: [paths]  — on disk, absent from index (no embedding)
 *     staleInTribal:     [paths]  — in index, NOT on disk (rotten embedding)
 *     stats: {wikiFiles, tribalWikiEntries, missing, stale, coverage}
 *   }
 * Both arrays are sorted for byte-determinism. `coverage` = (wikiFiles -
 * missing) / wikiFiles when wikiFiles > 0, else 0.
 */
export function audit(wikiPaths, tribalEntries) {
  const onDisk = new Set();
  if (Array.isArray(wikiPaths)) {
    for (const p of wikiPaths) {
      const n = normalizeWikiPath(p);
      if (n) onDisk.add(n);
    }
  }
  const inTribal = new Set();
  if (Array.isArray(tribalEntries)) {
    for (const e of tribalEntries) {
      const n = tribalWikiPath(e);
      if (n) inTribal.add(n);
    }
  }
  const missingFromTribal = [];
  for (const p of onDisk) if (!inTribal.has(p)) missingFromTribal.push(p);
  const staleInTribal = [];
  for (const p of inTribal) if (!onDisk.has(p)) staleInTribal.push(p);
  missingFromTribal.sort();
  staleInTribal.sort();
  const wikiFiles = onDisk.size;
  const coverage = wikiFiles > 0 ? (wikiFiles - missingFromTribal.length) / wikiFiles : 0;
  return {
    missingFromTribal,
    staleInTribal,
    stats: {
      wikiFiles,
      tribalWikiEntries: inTribal.size,
      missing: missingFromTribal.length,
      stale: staleInTribal.length,
      coverage: Number(coverage.toFixed(4)),
    },
  };
}

// ───────────────────────── I/O shell ─────────────────────────

function walkMd(dir, acc = []) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(full, acc);
    else if (e.isFile() && /\.md$/i.test(e.name)) acc.push(full);
  }
  return acc;
}

export function main(argv = []) {
  const json = argv.includes("--json");
  const wikiFiles = walkMd(WIKI_DIR).map((p) => path.relative(ROOT, p).replace(/\\/g, "/"));

  let tribalEntries = [];
  try {
    // Shard-aware, cap-safe read of the CANONICAL tribal index. The index
    // sharded on 2026-06-08 (it crossed V8's 512MiB string cap): the canonical
    // entries now live in tribal-embed-index.shard-NNN.json (manifest-listed),
    // and the old monolith tribal-embed-index.json is now an absent/stale orphan.
    // A plain readFileSync(TRIBAL_INDEX_PATH) here read that orphan (understating
    // the embedded set -- so the coverage headline + the embed-missing-wiki-batch
    // work-list were computed against the wrong file) and now ENOENT/FATALs since
    // the orphan was deleted. streamTribalEntries is manifest-first (reads the
    // shards when the manifest exists, else the monolith) and O(1)-heap, so we
    // project ONLY the four fields tribalWikiPath() needs -- never the 768-float
    // embedding. Same shard-migration fix class as load-tribal-index.mjs (the
    // readIndex monolith-only fix 8bf1873577) + the tribal-rerank stream-fix; this
    // cross-ref audit was the monolith-only reader the migration missed.
    streamTribalEntries(TRIBAL_INDEX_PATH, (e) => {
      tribalEntries.push({ id: e.id, source: e.source, kind: e.kind, path: e.path });
    });
  } catch (e) {
    console.error(`FATAL: tribal index read failed — ${e.message}`);
    return 2;
  }

  const r = audit(wikiFiles, tribalEntries);
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    wikiDir: path.relative(ROOT, WIKI_DIR).replace(/\\/g, "/"),
    tribalIndex: path.relative(ROOT, TRIBAL_INDEX_PATH).replace(/\\/g, "/"),
    ...r,
  };

  if (json) { console.log(JSON.stringify(payload, null, 2)); return 0; }
  try {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
    console.log(`wiki-tribal-cross-ref-audit:`);
    console.log(`  wiki files on disk:    ${r.stats.wikiFiles}`);
    console.log(`  tribal wiki entries:   ${r.stats.tribalWikiEntries}`);
    console.log(`  missing from tribal:   ${r.stats.missing}`);
    console.log(`  stale in tribal:       ${r.stats.stale}`);
    console.log(`  coverage:              ${(r.stats.coverage * 100).toFixed(1)}%`);
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
