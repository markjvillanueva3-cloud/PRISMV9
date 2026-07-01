#!/usr/bin/env node
/**
 * regen-wiki-index-meta.mjs — refresh the STALE metadata in knowledge/wiki/index.md
 *
 * OBSIDIAN-VAULT-OPS / U-VAULT-INDEX-META.
 *
 * The bug: knowledge/wiki/index.md carries `last_verified: 2026-05-08` in its
 * frontmatter and a "Last bootstrap: 2026-05-08 — 770 entries total" prose line.
 * Neither is ever refreshed — the file is a frozen bootstrap artifact and its
 * canonical owner (WikiIndexMaintainerEngine.writeIndex) only re-stamps on an
 * upsert(), which the daily regen chain never triggers. So the index has read
 * "770 entries / 2026-05-08" for a month while the wiki grew past 1,100 entries.
 *
 * Why NOT just re-emit via the engine: WikiIndexMaintainerEngine.read() →
 * parseIndex() round-trips only ~809 of the ~1,128 visible [[ ]] entry lines
 * (the structured-entry parser is stricter than the rendered catalog). A
 * read→writeIndex "refresh" would therefore SHRINK the index and lose ~319
 * entries — data loss, not a fix (verified 2026-06-08). So this script does the
 * SURGICAL thing: it rewrites ONLY the two stale metadata lines in place and
 * leaves every entry line byte-identical.
 *
 * What it stamps from LIVE data:
 *   - frontmatter `last_verified:` → today (UTC date)
 *   - the `Last bootstrap: … N entries total …` prose line → a `Last refreshed:
 *     <today> — <N> catalog entries` line, where N is the real count of rendered
 *     `- [[slug]]` entry lines currently in the file.
 *
 * Fail-loud (R12): if index.md is missing, or neither stale line is found, it
 * exits non-zero and writes nothing — it never silently "succeeds" on a file
 * that doesn't match the expected shape.
 *
 * Usage: node scripts/regen-wiki-index-meta.mjs [--dry-run] [--quiet]
 * Idempotent: a second run with the date unchanged is a no-op (no write).
 * Exported pure core `computeIndexMeta(content, today)` for unit tests.
 */

import fs from "node:fs";

const INDEX_PATH = "H:/prism/knowledge/wiki/index.md";

// Pure core: given the index.md content + today's date string, return
// { changed, next, entryCount } without touching disk. Exported for tests.
export function computeIndexMeta(content, today) {
  // Count rendered catalog entries — lines like "- [[slug]] — …".
  const entryCount = (content.match(/^- \[\[/gm) || []).length;

  let next = content;

  // 1) frontmatter last_verified (only the first occurrence, inside the --- block).
  const fmRe = /^last_verified:\s*.*$/m;
  const hasFm = fmRe.test(next);
  if (hasFm) next = next.replace(fmRe, `last_verified: ${today}`);

  // 2) the stale bootstrap prose line → a refreshed line with the live count.
  //    Matches the frozen "Last bootstrap: <date> — <n> entries total …" shape.
  const bootRe = /^Last bootstrap:.*$/m;
  const hasBoot = bootRe.test(next);
  if (hasBoot) {
    next = next.replace(
      bootRe,
      `Last refreshed: ${today} — ${entryCount} catalog entries (metadata stamp by regen-wiki-index-meta; entry bodies unchanged).`,
    );
  }

  // Also keep an already-refreshed line current on subsequent runs.
  const refreshedRe = /^Last refreshed:.*$/m;
  if (!hasBoot && refreshedRe.test(next)) {
    next = next.replace(
      refreshedRe,
      `Last refreshed: ${today} — ${entryCount} catalog entries (metadata stamp by regen-wiki-index-meta; entry bodies unchanged).`,
    );
  }

  return {
    changed: next !== content,
    next,
    entryCount,
    stampedFrontmatter: hasFm,
    stampedProse: hasBoot || refreshedRe.test(content),
  };
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const quiet = process.argv.includes("--quiet");
  const log = quiet ? () => {} : console.log;

  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`regen-wiki-index-meta: index not found at ${INDEX_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(INDEX_PATH, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  const { changed, next, entryCount, stampedFrontmatter, stampedProse } =
    computeIndexMeta(content, today);

  // Fail loud: the file did not match the expected metadata shape at all.
  if (!stampedFrontmatter && !stampedProse) {
    console.error(
      "regen-wiki-index-meta: neither `last_verified:` frontmatter nor a " +
        "`Last bootstrap:`/`Last refreshed:` line found — index.md is not in the " +
        "expected shape. Wrote nothing (R12 fail-loud).",
    );
    process.exit(2);
  }

  if (!changed) {
    log(`regen-wiki-index-meta: already current (${entryCount} entries, ${today}) — no write.`);
    return;
  }

  if (dryRun) {
    log(`[DRY] regen-wiki-index-meta: would stamp last_verified=${today}, entryCount=${entryCount}.`);
    return;
  }

  fs.writeFileSync(INDEX_PATH, next);
  log(`regen-wiki-index-meta: stamped last_verified=${today}, ${entryCount} catalog entries.`);
}

// Only run main when invoked directly (not when imported by a test).
import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
