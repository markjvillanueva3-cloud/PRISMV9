#!/usr/bin/env node
/**
 * scripts/prune-stale-tribal-entries.mjs — U-VICTOR-C4
 *
 * Reads `state/shared/.wiki-tribal-cross-ref-audit.json` (echo's audit) and
 * removes from `state/shared/tribal-embed-index.json` any entry whose
 * underlying wiki/file source has been deleted (the `staleInTribal` set).
 *
 * Live audit 2026-05-22 reported 10 stale entries — they accumulate slowly
 * but matter: a stale embedding ships rotten retrieval. Audit calls them
 * out; nothing removes them until this script runs.
 *
 * Emits a deletion log to `state/shared/tribal-pruned.jsonl` for audit-trail
 * (every prune is recoverable if a source file is restored — the original
 * tribal entry can be re-embedded).
 *
 * Modes:
 *   --dry-run (default if no flag)  → reports what WOULD be pruned, no writes
 *   --apply                         → actually mutates the index
 *
 * Exit:
 *   0 ok · 1 nothing-to-prune · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Shard-safe, clobber-guarded index IO (was monolith-only JSON.parse(readFileSync)
// + pretty-printed writeFileSync -- a clobber + V8-cap-bloat vector once sharded).
// prune intentionally SHRINKS, so the guarded write passes allowShrink.
// U-TRIBAL-SIBLING-WRITER-SHARD-SAFE 2026-06-10. [[reference_tribal_shard_read_clobber_2026_06_10]]
import { loadTribalIndex } from "./lib/load-tribal-index.mjs";
import { writeTribalIndexGuarded } from "./lib/tribal-index-guarded-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const SCHEMA_VERSION = "1.0.0";

const AUDIT_PATH = path.join(ROOT, "state/shared/.wiki-tribal-cross-ref-audit.json");
const INDEX_PATH = path.join(ROOT, "state/shared/tribal-embed-index.json");
const PRUNE_LOG = path.join(ROOT, "state/shared/tribal-pruned.jsonl");

// ───────────────────────── pure core ─────────────────────────

/**
 * Pure: normalize a path for cross-tree match (mirrors parent producer).
 */
export function normalize(p) {
  const s = String(p || "").replace(/\\/g, "/").toLowerCase("en-US").trim();
  if (!s) return "";
  const stripped = s.replace(/^.*?knowledge\/wiki\//, "");
  if (stripped.split("/").some((seg) => seg === "..")) return "";
  return stripped;
}

/**
 * Pure: pick entries to prune from `entries[]` given the `stalePaths[]` set.
 * Returns `{keep: [...], prune: [...]}`. An entry is pruned iff its tribal
 * wiki path (via the same heuristic as parent producer) matches a stale path.
 */
export function partitionPrune(entries, stalePaths) {
  if (!Array.isArray(entries)) return { keep: [], prune: [] };
  const staleSet = new Set((Array.isArray(stalePaths) ? stalePaths : []).map(normalize).filter(Boolean));
  const keep = [];
  const prune = [];
  for (const e of entries) {
    const wikiPath = extractWikiPath(e);
    if (wikiPath && staleSet.has(wikiPath)) {
      prune.push(e);
    } else {
      keep.push(e);
    }
  }
  return { keep, prune };
}

/**
 * Pure: same shape as parent producer's `tribalWikiPath`. Duplicated to keep
 * this script standalone (no import from a producer that may not be
 * stable across slot worktrees).
 */
export function extractWikiPath(entry) {
  if (!entry || typeof entry !== "object") return "";
  const id = String(entry.id || "");
  if (id.startsWith("wiki:")) return normalize(id.slice(5));
  if ((entry.source === "wiki" || entry.kind === "wiki") && entry.path) {
    return normalize(entry.path);
  }
  for (const cand of [id, String(entry.path || "")]) {
    if (/(^|\/)knowledge\/wiki\//.test(cand.replace(/\\/g, "/").toLowerCase())) {
      const n = normalize(cand);
      if (n) return n;
    }
  }
  return "";
}

// ───────────────────────── I/O shell ─────────────────────────

export function main(argv = []) {
  const apply = argv.includes("--apply");

  let audit, index;
  try {
    audit = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8"));
  } catch (e) {
    console.error(`FATAL: audit read failed — ${e.message}\nRun: node scripts/wiki-tribal-cross-ref-audit.mjs first`);
    return 2;
  }
  try {
    index = loadTribalIndex(INDEX_PATH, fs); // manifest-aware + V8-cap-safe
  } catch (e) {
    console.error(`FATAL: index read failed — ${e.message}`);
    return 2;
  }

  const stalePaths = Array.isArray(audit.staleInTribal) ? audit.staleInTribal : [];
  if (stalePaths.length === 0) {
    console.log("prune-stale-tribal-entries: nothing stale (0 paths in audit) — nothing to do");
    return 1; // exit 1 = nothing-to-prune (distinct from error 2)
  }

  const entries = Array.isArray(index.entries) ? index.entries : [];
  const { keep, prune } = partitionPrune(entries, stalePaths);

  console.log(`prune-stale-tribal-entries:`);
  console.log(`  audit timestamp:    ${audit.generatedAt}`);
  console.log(`  stale paths reported: ${stalePaths.length}`);
  console.log(`  index entries:       ${entries.length}`);
  console.log(`  matched for prune:   ${prune.length}`);
  console.log(`  mode:                ${apply ? "APPLY (mutate)" : "DRY-RUN"}`);

  if (!apply) {
    console.log(`  (sample stale paths: ${stalePaths.slice(0, 5).join(", ")})`);
    console.log(`  rerun with --apply to mutate`);
    return 0;
  }

  // Append-only prune log for audit-trail BEFORE mutation
  try {
    const ts = new Date().toISOString();
    const lines = prune.map((e) => JSON.stringify({ prunedAt: ts, prunedBy: "U-VICTOR-C4", entry: e }));
    fs.appendFileSync(PRUNE_LOG, lines.join("\n") + (lines.length ? "\n" : ""));
  } catch (e) {
    console.error(`FATAL: prune log write failed — ${e.message}`);
    return 2;
  }

  // Mutate: replace entries[] with keep[]
  index.entries = keep;
  index.prunedAt = new Date().toISOString();
  index.prunedCount = (index.prunedCount || 0) + prune.length;
  try {
    // Guarded write: prune INTENTIONALLY shrinks (removes stale entries), so the
    // >50%-loss clobber-guard is bypassed via allowShrink. Compact + shard-aware
    // (the prior `, null, 2` pretty-print bloated the index ~2-3x and is itself a
    // V8-cap risk on the ~500 MB file).
    writeTribalIndexGuarded(index, INDEX_PATH, { allowShrink: true });
    console.log(`  pruned ${prune.length} stale entries`);
    console.log(`  index now has ${index.entries.length} entries (was ${entries.length})`);
    console.log(`  audit log appended to ${PRUNE_LOG}`);
    return 0;
  } catch (e) {
    console.error(`FATAL: index write failed — ${e.message}`);
    return 2;
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main(process.argv.slice(2)));
