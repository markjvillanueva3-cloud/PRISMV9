#!/usr/bin/env node
// scripts/wiki-broken-link-propose-fix.mjs
// -----------------------------------------
// TOKEN-SAVINGS-PIVOT/U-PSN-WIKI-LINK-SWEEP (iter15-#4, 2026-05-23, slot:alpha)
//
// Gap-fill #4 of the 5-fill PSN goal: 4136 broken `[[name]]` wiki-link
// tokens of 97K (4.2%). Each broken link is a missed brain-recall hit.
//
// This script scans wiki/memory markdown for `[[name]]` tokens, builds a
// directory of existing entry slugs, and proposes Levenshtein-rename
// candidates for unresolvable links. Advisory-only — emits a JSON punch
// list; never modifies wiki source files.
//
// Output: state/shared/dashboards/wiki-broken-link-proposals-2026-05-23.json

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";

const WIKI_ROOT = "H:/prism/knowledge/wiki";
const MEMORY_ROOT = "H:/prism/knowledge/memories";
const OUTPUT = "H:/prism/state/shared/dashboards/wiki-broken-link-proposals-2026-05-23.json";

export const LINK_RE = /\[\[([^\]|]+?)(?:\|[^\]]+)?\]\]/g;

/**
 * Pure: extract all `[[name]]` tokens from a string.
 */
export function extractLinks(content) {
  if (typeof content !== "string") return [];
  const out = [];
  for (const m of content.matchAll(LINK_RE)) {
    out.push(m[1].trim());
  }
  return out;
}

/**
 * Pure: compute the Levenshtein distance between two strings (iterative,
 * bounded). Returns Infinity if max bound exceeded (early-exit optimization).
 */
export function levenshtein(a, b, maxDistance = 10) {
  if (typeof a !== "string" || typeof b !== "string") return Infinity;
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maxDistance) return Infinity;
  const dp = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
      if (dp[j] < rowMin) rowMin = dp[j];
    }
    if (rowMin > maxDistance) return Infinity;
  }
  return dp[b.length];
}

/**
 * Pure: find best rename candidates for a broken link.
 * Returns top-K closest existing slugs by Levenshtein distance.
 */
export function proposeRenames(brokenLink, existingSlugs, topK = 3, maxDistance = 6) {
  if (typeof brokenLink !== "string" || !brokenLink) return [];
  if (!(existingSlugs instanceof Set)) return [];
  const candidates = [];
  for (const slug of existingSlugs) {
    const d = levenshtein(brokenLink, slug, maxDistance);
    if (d <= maxDistance) candidates.push({ slug, distance: d });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates.slice(0, topK);
}

function walkMarkdown(root) {
  const out = [];
  function walk(d) {
    let entries;
    try { entries = readdirSync(d); } catch { return; }
    for (const name of entries) {
      const full = join(d, name);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) walk(full);
      else if (name.endsWith(".md")) out.push(full);
    }
  }
  walk(root);
  return out;
}

function fileToSlug(filePath) {
  return basename(filePath, ".md");
}

function main() {
  const wikiFiles = walkMarkdown(WIKI_ROOT);
  const memoryFiles = walkMarkdown(MEMORY_ROOT);
  const allFiles = [...wikiFiles, ...memoryFiles];

  // Build slug directory
  const existingSlugs = new Set(allFiles.map(fileToSlug));

  const broken = [];
  let totalLinks = 0;

  for (const file of allFiles) {
    let content;
    try { content = readFileSync(file, "utf8"); } catch { continue; }
    const links = extractLinks(content);
    totalLinks += links.length;
    for (const link of links) {
      if (!existingSlugs.has(link)) {
        const proposals = proposeRenames(link, existingSlugs);
        if (proposals.length > 0) {
          broken.push({ file: file.replace(/\\/g, "/"), link, proposals });
        }
      }
    }
  }

  const out = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    auditedDirs: [WIKI_ROOT, MEMORY_ROOT],
    totalFiles: allFiles.length,
    totalLinkTokens: totalLinks,
    brokenWithProposals: broken.length,
    proposals: broken.slice(0, 500), // cap for output size
  };

  if (!existsSync(dirname(OUTPUT))) mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(out, null, 2), "utf8");

  console.log(`✓ wiki-broken-link-propose-fix complete`);
  console.log(`  Scanned: ${allFiles.length} files, ${totalLinks} link tokens`);
  console.log(`  Broken-with-proposals: ${broken.length} (capped at 500 in output)`);
  console.log(`  Output: ${OUTPUT}`);
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith("wiki-broken-link-propose-fix.mjs")) {
  process.exit(main());
}
