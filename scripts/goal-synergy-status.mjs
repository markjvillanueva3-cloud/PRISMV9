#!/usr/bin/env node
/**
 * goal-synergy-status.mjs — /goal synergy iter 10 (echo, 2026-05-21).
 *
 * Meta-status roll-up: reads the two substrate-drift audits shipped earlier
 * in this /loop (knowledge-link-audit iter-4 + wiki-tribal-cross-ref-audit
 * iter-7) and emits a single combined status file. Future operators and
 * downstream consumers read ONE file instead of two; the natural next iter
 * is a SessionStart hook that surfaces the combined health line.
 *
 * Pure-core / IO shell split:
 *   - extractMetrics(audit, key)         pure — pull a normalized {ok, stat} record
 *   - rollup({linkAudit, wikiTribal})    pure — aggregate into a status object
 *   - main()                             IO — read files, write report
 *
 * Output: `state/shared/.goal-synergy-status.json`
 * Usage:  node scripts/goal-synergy-status.mjs        # write
 *         node scripts/goal-synergy-status.mjs --json # stdout (no write)
 * Exit:   0 ok (any/all sources may be missing — emit `present: false`) · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
// 1.1.0 (iter-17): additive — third substrate `aiMemoXref`. N-1 compatible:
// consumers (iter-11 inject, iter-12 meta-roost) iterate substrates
// generically and gate on shape, not the exact version string.
export const SCHEMA_VERSION = "1.1.0";

const LINK_AUDIT_PATH = path.join(ROOT, "state/shared/.knowledge-link-audit.json");
const WIKI_TRIBAL_PATH = path.join(ROOT, "state/shared/.wiki-tribal-cross-ref-audit.json");
const AI_MEMO_PATH = path.join(ROOT, "state/shared/.prism-ai-memo-cross-ref-audit.json");
const OUT_PATH = path.join(ROOT, "state/shared/.goal-synergy-status.json");

/**
 * Pure: pull a normalized substrate record from an audit. Returns `null` if
 * the audit is missing or malformed. Shape:
 *   { present: true, generatedAt, stats: { ... }, summary: "<one-liner>" }
 */
export function extractMetrics(audit, kind) {
  if (!audit || typeof audit !== "object" || !audit.stats) return null;
  const s = audit.stats;
  if (kind === "link-audit") {
    const total = Number(s.linksTotal) || 0;
    const broken = Number(s.linksBroken) || 0;
    const ratio = total > 0 ? broken / total : 0;
    return {
      present: true,
      generatedAt: String(audit.generatedAt || ""),
      stats: {
        linksTotal: total,
        linksBroken: broken,
        filesScanned: Number(s.filesScanned) || 0,
        brokenRatio: Number(ratio.toFixed(4)),
      },
      summary: `${broken.toLocaleString()} broken / ${total.toLocaleString()} wiki-style tokens (${(ratio * 100).toFixed(1)}%)`,
    };
  }
  if (kind === "wiki-tribal") {
    const wikiFiles = Number(s.wikiFiles) || 0;
    const missing = Number(s.missing) || 0;
    const coverage = Number(s.coverage);
    const cov = Number.isFinite(coverage) ? Math.max(0, Math.min(1, coverage)) : 0;
    return {
      present: true,
      generatedAt: String(audit.generatedAt || ""),
      stats: {
        wikiFiles,
        missing,
        stale: Number(s.stale) || 0,
        coverage: Number(cov.toFixed(4)),
      },
      summary: `${missing.toLocaleString()} / ${wikiFiles.toLocaleString()} wiki files lack tribal embedding (${(cov * 100).toFixed(1)}% coverage)`,
    };
  }
  if (kind === "ai-memo-xref") {
    // iter-17: prism-ai engine ⇄ memo coverage substrate (iter-13 producer).
    // Audit stats shape: { engineCount, memoCount, missing, coverage }.
    const engineCount = Number(s.engineCount) || 0;
    const missing = Number(s.missing) || 0;
    const memoCount = Number(s.memoCount) || 0;
    const coverage = Number(s.coverage);
    const cov = Number.isFinite(coverage) ? Math.max(0, Math.min(1, coverage)) : 0;
    return {
      present: true,
      generatedAt: String(audit.generatedAt || ""),
      stats: {
        engineCount,
        missing,
        memoCount,
        coverage: Number(cov.toFixed(4)),
      },
      summary: `${missing} / ${engineCount} PRISM-AI engines lack memo coverage (${(cov * 100).toFixed(1)}% coverage)`,
    };
  }
  return null;
}

/**
 * Pure: combine the two substrate records into a single roll-up.
 * Either field may be null (audit missing) → reports `present: false` for
 * that substrate. The top-level `healthy` is true ONLY when both audits
 * are present AND below their default drift thresholds.
 */
export function rollup({ linkAudit, wikiTribal, aiMemoXref }) {
  const linkRec = extractMetrics(linkAudit, "link-audit");
  const wikiRec = extractMetrics(wikiTribal, "wiki-tribal");
  const aiMemoRec = extractMetrics(aiMemoXref, "ai-memo-xref");
  // Default drift thresholds — match the iter-5 + iter-8 hook defaults so
  // the SessionStart digest threshold and this rollup health flag agree.
  const LINK_DRIFT_THRESHOLD = 0.02;
  const WIKI_DRIFT_THRESHOLD = 0.10; // (1 - coverage)
  const AI_MEMO_DRIFT_THRESHOLD = 0.10; // (1 - coverage), same form as wiki-tribal
  const linkHealthy = linkRec ? linkRec.stats.brokenRatio < LINK_DRIFT_THRESHOLD : false;
  const wikiHealthy = wikiRec ? (1 - wikiRec.stats.coverage) < WIKI_DRIFT_THRESHOLD : false;
  const aiMemoHealthy = aiMemoRec ? (1 - aiMemoRec.stats.coverage) < AI_MEMO_DRIFT_THRESHOLD : false;
  const missingSub = { present: false, generatedAt: "", stats: null, summary: "missing audit" };
  return {
    substrates: {
      linkAudit: linkRec || missingSub,
      wikiTribal: wikiRec || missingSub,
      aiMemoXref: aiMemoRec || missingSub,
    },
    // healthy ONLY when ALL THREE audits are present AND below threshold —
    // a missing audit (any substrate) cannot be certified healthy.
    healthy: linkHealthy && wikiHealthy && aiMemoHealthy,
    // driftSurfaces uses kebab-case substrate kinds (link-audit, wiki-tribal,
    // ai-memo-xref) — the iter-11 consumer normalizes camel↔kebab at lookup.
    driftSurfaces: [
      ...(linkRec && !linkHealthy ? ["link-audit"] : []),
      ...(wikiRec && !wikiHealthy ? ["wiki-tribal"] : []),
      ...(aiMemoRec && !aiMemoHealthy ? ["ai-memo-xref"] : []),
    ],
  };
}

function loadOptional(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return null; }
}

export function main(argv = []) {
  const json = argv.includes("--json");
  const linkAudit = loadOptional(LINK_AUDIT_PATH);
  const wikiTribal = loadOptional(WIKI_TRIBAL_PATH);
  const aiMemoXref = loadOptional(AI_MEMO_PATH);
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    ...rollup({ linkAudit, wikiTribal, aiMemoXref }),
  };
  if (json) { console.log(JSON.stringify(payload, null, 2)); return 0; }
  try {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
    console.log(`goal-synergy-status: healthy=${payload.healthy} · drift=[${payload.driftSurfaces.join(", ") || "none"}]`);
    console.log(`  link-audit:   ${payload.substrates.linkAudit.summary}`);
    console.log(`  wiki-tribal:  ${payload.substrates.wikiTribal.summary}`);
    console.log(`  ai-memo-xref: ${payload.substrates.aiMemoXref.summary}`);
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
