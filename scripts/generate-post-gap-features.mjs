#!/usr/bin/env node
/**
 * generate-post-gap-features.mjs — system-viz augmentation: JM Die enhanced
 * post-processor gap surface.
 *
 * Spec: FEATURE-GAP-AUDIT-MS0 / U-JMDIE-POST-GAPS-VIZ-ROOST (slot:india, 2026-05-22).
 *
 * Closes the documented follow-up `(c) /system-viz roost integration for the
 * gap surface` from [[reference_india_post_gaps_2026_05_22]]. The prior
 * /loop shipped `JMDiePostProcessorLearningEngine.gapReport()` + the
 * `jmdie_post_gaps` dispatcher action (commit 119c432034); this generator
 * surfaces the SAME data as a `/system-viz` ghost roost — corpus-wide gaps
 * color-coded by severity + per-post gaps color-coded by family-lag count.
 *
 * Pattern: identical to `generate-priority-queue-features.mjs` (consolidate-
 * roadmaps inventory → augmentation JSON consumed by merge-augmentations.mjs).
 *
 * Sources:
 *   - .cps corpus at `H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/`
 *   - detection lib: `scripts/lib/jmdie-post-gap-detect.mjs` (mirrors engine)
 *
 * Output: `state/shared/system-viz/post-gap-augmentation.json`
 *
 * Registered in `scripts/regen-viz.mjs` FAST[] + spliced by
 * `scripts/merge-augmentations.mjs`.
 *
 * Usage: node scripts/generate-post-gap-features.mjs
 * Exit:  0 ok · 1 corpus missing (writes empty augmentation, fail-soft) · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildProfile, buildGapReport } from "./lib/jmdie-post-gap-detect.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const POST_GAP_ROOST_ID = "ghost.post_gap_surface";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const CORPUS_GAP_LAYER = "L9";
export const POST_GAP_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 220;

// Severity thresholds — coverage-driven. Lower coverage = bigger gap.
export const SEVERITY_SEVERE_MAX = 0.20;   // coverage <= 0.20 → severe
export const SEVERITY_MODERATE_MAX = 0.40; // 0.20 < coverage < 0.40 → moderate
// 0.40 <= coverage < CORPUS_THRESHOLD → mild (cap implicit from threshold).
// Family-lag count thresholds.
export const POST_LAG_MAX = 2; // 1-2 missing → lag; 3+ → deep lag.

// Color palette.
export const COLOR_SEVERE = "#dc2626";    // red-600
export const COLOR_MODERATE = "#f59e0b";  // amber-500
export const COLOR_MILD = "#3b82f6";      // blue-500
export const COLOR_POST_HEALTHY = "#10b981"; // green-500: zero family-lag
export const COLOR_POST_LAG = "#f59e0b";     // amber: 1-POST_LAG_MAX
export const COLOR_POST_DEEP_LAG = "#dc2626"; // red: > POST_LAG_MAX

/** Coverage → severity color for corpus-wide gap nodes. */
export function severityColor(coverage) {
  const c = Number.isFinite(coverage) ? coverage : 0;
  if (c <= SEVERITY_SEVERE_MAX) return COLOR_SEVERE;
  if (c < SEVERITY_MODERATE_MAX) return COLOR_MODERATE;
  return COLOR_MILD;
}

/** family-lag count → severity color for per-post nodes. */
export function postSeverityColor(lagCount) {
  const n = Number.isInteger(lagCount) ? lagCount : 0;
  if (n === 0) return COLOR_POST_HEALTHY;
  if (n <= POST_LAG_MAX) return COLOR_POST_LAG;
  return COLOR_POST_DEEP_LAG;
}

/**
 * Filesystem-safe node id fragment. Rejects path-traversal patterns BEFORE
 * stripping (the post-strip `..` check is dead because the strip removes dots).
 */
export function safeId(raw) {
  const input = String(raw == null ? "" : raw);
  if (input.includes("..")) return "x";
  const s = input
    .toLowerCase().replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-").replace(/^[-_]+|[-_]+$/g, "").slice(0, 80);
  return s ? s : "x";
}

/** Candidate corpus directories — first existing one wins. */
export const SOURCE_CANDIDATES = [
  path.resolve(ROOT, "..", "JM DIE", "PRISM MODIFIED POST PROCESSORS"),
  path.resolve(ROOT, "JM DIE", "PRISM MODIFIED POST PROCESSORS"),
  // Final fallback: hard-coded canonical drive path (mirrors engine).
  "H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS",
];

/**
 * Resolve the first existing .cps corpus dir.
 * @returns {string | null}
 */
export function resolveCorpusDir() {
  for (const d of SOURCE_CANDIDATES) {
    try {
      if (fs.existsSync(d) && fs.statSync(d).isDirectory()) return d;
    } catch { /* try next */ }
  }
  return null;
}

/**
 * Read every .cps file in the corpus dir → profile array. Fail-soft per-file
 * (an unreadable file is skipped with a stderr warning, not a hard fail).
 *
 * @param {string} corpusDir
 * @returns {Array<{file:string, family:string, markers:Record<string,boolean>, enhancementCount:number}>}
 */
export function readCorpusProfiles(corpusDir) {
  const profiles = [];
  let entries;
  try { entries = fs.readdirSync(corpusDir); }
  catch (e) {
    console.error(`warn: corpus readdir failed (${corpusDir}): ${e.message}`);
    return profiles;
  }
  for (const name of entries.sort()) {
    if (!/\.cps$/i.test(name)) continue;
    const full = path.join(corpusDir, name);
    let content;
    try { content = fs.readFileSync(full, "utf8"); }
    catch (e) {
      console.error(`warn: skip unreadable ${name}: ${e.message}`);
      continue;
    }
    profiles.push(buildProfile({ file: name, content }));
  }
  return profiles;
}

/**
 * Pure: assemble ghost nodes from a gap report. Caller owns I/O.
 *
 * @param {ReturnType<typeof buildGapReport>} report
 * @param {Iterable<string>} existingNodeIds - ids already in the graph
 * @returns {{newNodes: Array<object>, newEdges: Array<object>, stats: object}}
 */
export function generate(report, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set
    ? new Set(existingNodeIds)
    : new Set(existingNodeIds || []);
  const newNodes = [];
  let roostEmitted = 0;

  const profileCount = report && Number.isFinite(report.profileCount) ? report.profileCount : 0;
  const corpus = Array.isArray(report?.corpusWideGaps) ? report.corpusWideGaps : [];
  const posts = Array.isArray(report?.postGaps) ? report.postGaps : [];
  const familyCounts = report && report.familyCounts ? report.familyCounts : {};

  // Roost.
  if (!ids.has(POST_GAP_ROOST_ID)) {
    const familySummary = Object.entries(familyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`).join(" ");
    const severeCount = corpus.filter((g) => g.coverage <= SEVERITY_SEVERE_MAX).length;
    const moderateCount = corpus.filter((g) => g.coverage > SEVERITY_SEVERE_MAX && g.coverage < SEVERITY_MODERATE_MAX).length;
    const mildCount = corpus.filter((g) => g.coverage >= SEVERITY_MODERATE_MAX).length;
    const lagCount = posts.filter((p) => Array.isArray(p.missingFamilyPatterns) && p.missingFamilyPatterns.length > 0).length;
    newNodes.push({
      id: POST_GAP_ROOST_ID,
      label: "JM Die Post-Processor Gap Surface",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${profileCount} .cps posts · families ${familySummary} · corpus-wide gaps: ${severeCount} severe / ${moderateCount} moderate / ${mildCount} mild · ${lagCount} posts lagging family. Source: jmdie_post_gaps action + engine gapReport(). See [[reference_india_post_gaps_2026_05_22]].`.slice(0, 400),
    });
    ids.add(POST_GAP_ROOST_ID);
    roostEmitted = 1;
  }

  // Corpus-wide gap children — one per enhancement below threshold.
  let corpusEmitted = 0;
  for (const g of corpus) {
    const eid = "ghost.post_gap.corpus." + safeId(g.enhancement);
    if (ids.has(eid)) continue;
    const cov = Number.isFinite(g.coverage) ? g.coverage : 0;
    const pct = (cov * 100).toFixed(1) + "%";
    const presentList = Array.isArray(g.presentIn) ? g.presentIn : [];
    const absentList = Array.isArray(g.absentFrom) ? g.absentFrom : [];
    newNodes.push({
      id: eid,
      label: `gap · ${g.enhancement} · ${pct}`.slice(0, MAX_LABEL),
      layer: CORPUS_GAP_LAYER,
      ghost: true,
      status: "ghost",
      kind: "post-gap-corpus",
      parent: POST_GAP_ROOST_ID,
      color: severityColor(cov),
      coverage: cov,
      enhancement: g.enhancement,
      info: `[${pct} coverage · ${presentList.length}/${profileCount} posts carry · ${absentList.length} missing] presentIn=[${presentList.join(", ")}] · absentFrom=[${absentList.slice(0, 4).join(", ")}${absentList.length > 4 ? "…" : ""}]`.slice(0, 400),
    });
    ids.add(eid);
    corpusEmitted++;
  }

  // Per-post children — one per .cps profile.
  let postEmitted = 0;
  for (const p of posts) {
    const pid = "ghost.post_gap.post." + safeId(p.file);
    if (ids.has(pid)) continue;
    const missing = Array.isArray(p.missingFamilyPatterns) ? p.missingFamilyPatterns : [];
    const score = Number.isFinite(p.valueScore) ? p.valueScore : 0;
    const ec = Number.isFinite(p.enhancementCount) ? p.enhancementCount : 0;
    newNodes.push({
      id: pid,
      label: `${p.file} · ${ec}/15 · ${missing.length} lag`.slice(0, MAX_LABEL),
      layer: POST_GAP_LAYER,
      ghost: true,
      status: "ghost",
      kind: "post-gap-unit",
      parent: POST_GAP_ROOST_ID,
      color: postSeverityColor(missing.length),
      family: p.family || "unknown",
      valueScore: score,
      enhancementCount: ec,
      missingCount: missing.length,
      info: `[family ${p.family || "unknown"} · valueScore ${score.toFixed(3)} · ${ec}/15 markers · ${missing.length} family-lag] missingFamilyPatterns=[${missing.join(", ")}]`.slice(0, 400),
    });
    ids.add(pid);
    postEmitted++;
  }

  return {
    newNodes,
    newEdges: [],
    stats: {
      roostEmitted,
      profileCount,
      corpusEmitted,
      postEmitted,
      severeCount: corpus.filter((g) => g.coverage <= SEVERITY_SEVERE_MAX).length,
      moderateCount: corpus.filter((g) => g.coverage > SEVERITY_SEVERE_MAX && g.coverage < SEVERITY_MODERATE_MAX).length,
      mildCount: corpus.filter((g) => g.coverage >= SEVERITY_MODERATE_MAX).length,
    },
  };
}

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "post-gap-augmentation.json");

export function main() {
  const corpusDir = resolveCorpusDir();
  if (!corpusDir) {
    // Fail-soft: write an empty augmentation so merge-augmentations still
    // succeeds + downstream viz shows a no-data roost rather than crashing.
    const empty = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "corpus-missing",
      warning: `corpus dir not found; tried: ${SOURCE_CANDIDATES.join(" | ")}`,
      newNodes: [],
      newEdges: [],
      stats: { roostEmitted: 0, profileCount: 0, corpusEmitted: 0, postEmitted: 0 },
    };
    try { fs.mkdirSync(VIZ_DIR, { recursive: true }); } catch { /* noop */ }
    try { fs.writeFileSync(OUT_PATH, JSON.stringify(empty, null, 2)); }
    catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }
    console.error(`warn: corpus not found — wrote empty augmentation to ${OUT_PATH}`);
    return 1;
  }

  let profiles, report;
  try { profiles = readCorpusProfiles(corpusDir); }
  catch (e) { console.error(`FATAL: corpus read failed — ${e.message}`); return 2; }
  try { report = buildGapReport(profiles); }
  catch (e) { console.error(`FATAL: gap report failed — ${e.message}`); return 2; }

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(report, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: corpusDir,
      newNodes, newEdges, stats,
    };
  } catch (e) { console.error(`FATAL: generate failed — ${e.message}`); return 2; }

  try { fs.mkdirSync(VIZ_DIR, { recursive: true }); } catch { /* noop */ }
  try { fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2)); }
  catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  roost:            ${result.stats.roostEmitted}`);
  console.log(`  profileCount:     ${result.stats.profileCount}`);
  console.log(`  corpusEmitted:    ${result.stats.corpusEmitted}`);
  console.log(`  postEmitted:      ${result.stats.postEmitted}`);
  console.log(`  severity:         severe=${result.stats.severeCount} moderate=${result.stats.moderateCount} mild=${result.stats.mildCount}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
