#!/usr/bin/env node
/**
 * scripts/audit-tribal-coverage-by-domain.mjs — U-VICTOR-A1
 *
 * Per-domain extension of `wiki-tribal-cross-ref-audit.mjs`. The existing
 * producer emits a GLOBAL coverage number (97.15% as of 2026-05-22); it
 * does not say WHICH operator-named domains contain the missing entries.
 * That coarseness means a chat working on `shop-floor` can't tell whether
 * shop-floor specifically is at 50% or 99%.
 *
 * This script consumes the existing audit JSON + the on-disk wiki tree, runs
 * the pure `classifyDomain` over both sets, and emits per-domain coverage
 * to `state/shared/.wiki-tribal-coverage-by-domain.json` (schema 1.0.0).
 *
 * Strictly additive — does NOT modify the existing audit producer (slot
 * worktrees are commit-isolated; merge conflicts on the producer hurt every
 * other slot using it).
 *
 * Pure-core / IO shell split (mirrors the parent producer):
 *   - byDomainCoverage(onDiskPaths, missingPaths) → pure, returns
 *     {<dom>: {wikiFiles, missing, coverage, sampleMissing[<=5]}}
 *   - main() — reads inputs, writes report
 *
 * Output: state/shared/.wiki-tribal-coverage-by-domain.json
 * Usage:  node scripts/audit-tribal-coverage-by-domain.mjs        # write report
 *         node scripts/audit-tribal-coverage-by-domain.mjs --json # stdout only
 * Exit:   0 ok · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyDomain, domainSlugs } from "./lib/wiki-domain-classifier.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const SCHEMA_VERSION = "1.0.0";

const WIKI_DIR = path.join(ROOT, "knowledge/wiki");
const PARENT_AUDIT = path.join(ROOT, "state/shared/.wiki-tribal-cross-ref-audit.json");
const OUT_PATH = path.join(ROOT, "state/shared/.wiki-tribal-coverage-by-domain.json");

const SAMPLE_LIMIT = 5; // bound JSON size; first 5 missing per domain is enough to start triage

// ───────────────────────── pure core ─────────────────────────

/**
 * Pure: same path normalizer as parent producer — strip knowledge/wiki/ prefix,
 * lowercase via en-US locale (Turkish-i guard), reject `..` segments.
 * Duplicated here intentionally (the producer doesn't export it cleanly across
 * commit-isolated slot worktrees; copy beats accidental coupling).
 */
export function normalize(p) {
  const s = String(p || "").replace(/\\/g, "/").toLowerCase("en-US").trim();
  if (!s) return "";
  const stripped = s.replace(/^.*?knowledge\/wiki\//, "");
  if (stripped.split("/").some((seg) => seg === "..")) return "";
  return stripped;
}

/**
 * Pure: compute per-domain coverage from the on-disk wiki list + the missing
 * list. Returns `{<domain>: {wikiFiles, missing, coverage, sampleMissing[]}}`.
 *
 * Coverage per domain = (wikiFiles - missing) / wikiFiles, or 1.0 if the
 * domain has zero wiki files (vacuous truth — no signal). NaN cannot escape:
 * the wikiFiles=0 case is short-circuited.
 *
 * sampleMissing is bounded to SAMPLE_LIMIT entries — first-N after sort, so
 * the output is byte-deterministic across runs even when the missing set is
 * large (parent producer reports 692 missing today — without the cap, the
 * per-domain JSON would explode in size).
 *
 * Every slug from domainSlugs() is in the output even with zero counts —
 * byte-deterministic for diffs across consecutive audits.
 */
export function byDomainCoverage(onDiskPaths, missingPaths) {
  const result = Object.create(null);
  for (const d of domainSlugs()) {
    result[d] = { wikiFiles: 0, missing: 0, coverage: 1, sampleMissing: [] };
  }

  const onDisk = Array.isArray(onDiskPaths) ? onDiskPaths : [];
  for (const p of onDisk) {
    const n = normalize(p);
    if (!n) continue;
    const d = classifyDomain(n);
    result[d].wikiFiles += 1;
  }

  const missing = Array.isArray(missingPaths) ? missingPaths : [];
  // Sort missing for byte-deterministic sampleMissing across runs.
  const sortedMissing = [...missing].sort();
  for (const p of sortedMissing) {
    const n = normalize(p);
    if (!n) continue;
    const d = classifyDomain(n);
    result[d].missing += 1;
    if (result[d].sampleMissing.length < SAMPLE_LIMIT) {
      result[d].sampleMissing.push(n);
    }
  }

  for (const d of Object.keys(result)) {
    const r = result[d];
    r.coverage =
      r.wikiFiles > 0 ? Number(((r.wikiFiles - r.missing) / r.wikiFiles).toFixed(4)) : 1;
  }

  return result;
}

/**
 * Pure: rank domains by coverage ascending (lowest first — "worst-domain"
 * triage order). Ties broken by wikiFiles descending (a thin-coverage domain
 * with many files is higher priority than one with few). Stable.
 */
export function rankWorst(byDomain) {
  const entries = Object.entries(byDomain || {});
  // Skip domains with zero files — vacuous 1.0 coverage isn't actionable.
  return entries
    .filter(([, v]) => v && v.wikiFiles > 0)
    .sort((a, b) => {
      const cd = a[1].coverage - b[1].coverage;
      if (cd !== 0) return cd;
      return b[1].wikiFiles - a[1].wikiFiles;
    });
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

  // Parent audit must exist — if not, surface the regen instruction loudly
  // (R12 fail-loud — silent missing-parent would emit empty per-domain).
  let parent;
  try {
    parent = JSON.parse(fs.readFileSync(PARENT_AUDIT, "utf8"));
  } catch (e) {
    console.error(
      `FATAL: parent audit not found at ${PARENT_AUDIT} — run:\n` +
      `  node H:/prism/scripts/wiki-tribal-cross-ref-audit.mjs\n` +
      `(reason: ${e.message})`
    );
    return 2;
  }

  const missingPaths = Array.isArray(parent.missingFromTribal) ? parent.missingFromTribal : [];
  const onDisk = walkMd(WIKI_DIR).map((p) => path.relative(ROOT, p).replace(/\\/g, "/"));

  const byDomain = byDomainCoverage(onDisk, missingPaths);
  const worstRanked = rankWorst(byDomain).slice(0, 10).map(([dom, v]) => ({
    domain: dom,
    coverage: v.coverage,
    wikiFiles: v.wikiFiles,
    missing: v.missing,
  }));

  const payload = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    parentAuditAt: parent.generatedAt || null,
    parentCoverage: parent.stats?.coverage ?? null,
    domainCount: domainSlugs().length,
    byDomain,
    worstRanked,
  };

  if (json) { console.log(JSON.stringify(payload, null, 2)); return 0; }
  try {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
    console.log(`audit-tribal-coverage-by-domain:`);
    console.log(`  parent audit:        ${parent.generatedAt}`);
    console.log(`  parent coverage:     ${(parent.stats?.coverage * 100 || 0).toFixed(1)}%`);
    console.log(`  domains classified:  ${domainSlugs().length}`);
    console.log(`  worst (lowest-cov first, top 5):`);
    for (const w of worstRanked.slice(0, 5)) {
      console.log(
        `    ${w.domain.padEnd(15)} cov=${(w.coverage * 100).toFixed(1)}% ` +
        `(${w.missing}/${w.wikiFiles} missing)`
      );
    }
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
