#!/usr/bin/env node
/**
 * .claude/hooks/wiki-tribal-coverage-inject.mjs
 *
 * SessionStart hook — surfaces wiki↔tribal coverage drift from
 * `state/shared/.wiki-tribal-cross-ref-audit.json` (producer:
 * scripts/wiki-tribal-cross-ref-audit.mjs, iter-7 echo /loop /goal synergy).
 *
 * Iter 8 of the /goal synergize loop (echo, 2026-05-21). Producer/consumer
 * pair after iter-7's audit exposed the 99.2% coverage gap. This hook makes
 * the gap visible to every chat at session start instead of silent until an
 * operator manually runs the audit.
 *
 * Discipline (mirrors knowledge-link-audit-inject):
 *   - ADVISORY only, NEVER blocking — exits 0; valid SessionStart envelope
 *   - No spawn — producer runs on-demand or via cron piggyback
 *   - Threshold-gated: silent unless `(1 - coverage) >= GAP_THRESHOLD` (default 0.10)
 *   - Stale-gated: silent if report > `STALE_MAX_HRS` (default 720 = 30d)
 *   - Fail-soft on every error class — no inject is better than crash
 *
 * Knobs:
 *   PRISM_WIKI_TRIBAL_INJECT=0         — disable entirely
 *   PRISM_WIKI_TRIBAL_GAP_THRESHOLD=N  — (1-coverage) gate (0.10)
 *   PRISM_WIKI_TRIBAL_TOPK=N           — top-K missing samples (3)
 *   PRISM_WIKI_TRIBAL_STALE_HRS=N      — staleness ceiling in hours (720)
 *   PRISM_WIKI_TRIBAL_DEDUP=0          -- keep the global "Top N missing" list even
 *                                        when the per-domain block will render
 *                                        (default ON: drop the redundant samples;
 *                                        the per-domain block carries actionable ones)
 *
 * Token-efficiency dedup (U-WIKI-TRIBAL-DEDUP, bravo 2026-06-10): this GLOBAL
 * hook and `wiki-tribal-coverage-per-domain-inject.mjs` both render at
 * SessionStart. Our unique signal is the fleet-wide coverage headline; our
 * "Top N missing" list is the LOW-signal half (deterministic-sorted global
 * files, not tied to any slot's work) whereas the per-domain block's samples
 * are actionable. When the per-domain block will render, we drop our sample
 * list (keep the headline). Fail-safe: any prediction error -> keep samples.
 *
 * Stdin: standard SessionStart JSON envelope (ignored)
 * Stdout: hookSpecificOutput.additionalContext payload (or {})
 * Exit:   always 0
 */

// tier: T2
// SessionStart hook — wiki/tribal coverage drift advisory
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// U-WIKI-TRIBAL-DEDUP: import the per-domain sibling's PURE gate functions so we
// can predict whether its block will render, without duplicating its logic (DRY).
// The sibling's I/O runs only under its own `__isMain` guard, so importing it
// here has no side effects.
import {
  loadReport as loadPerDomainReport,
  pickWorst as pickWorstDomains,
  DEFAULT_THRESHOLD as PD_THRESHOLD,
  DEFAULT_STALE_HRS as PD_STALE_HRS,
  REPORT_PATH as PD_REPORT_PATH,
} from "./wiki-tribal-coverage-per-domain-inject.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/PRISM";
const AUDIT_PATH = path.join(PRISM_ROOT, "state/shared/.wiki-tribal-cross-ref-audit.json");
const DEFAULT_GAP_THRESHOLD = 0.10;
const DEFAULT_TOPK = 3;
const DEFAULT_STALE_HRS = 720;
const MAX_AUDIT_BYTES = 64 * 1024 * 1024; // 64MB — iter-7 first run was ~1.5MB at 23.8K missing; cap for safety

function emit(additionalContext) {
  const payload = additionalContext
    ? { hookSpecificOutput: { hookEventName: "SessionStart", additionalContext } }
    : {};
  process.stdout.write(JSON.stringify(payload) + "\n");
  process.exit(0);
}

/**
 * Pure: load + validate the audit report. Returns { audit, ageMs } or null.
 * Hostile-payload guards: size cap + JSON parse + shape check.
 */
export function loadAudit(auditPath, nowMs = Date.now()) {
  try {
    if (!existsSync(auditPath)) return null;
    const st = statSync(auditPath);
    if (!Number.isFinite(st.size) || st.size > MAX_AUDIT_BYTES || st.size <= 0) return null;
    const raw = readFileSync(auditPath, "utf8");
    const j = JSON.parse(raw);
    if (!j || typeof j !== "object" || !j.stats || typeof j.stats !== "object") return null;
    const ageMs = Math.max(0, nowMs - st.mtimeMs);
    return { audit: j, ageMs };
  } catch {
    return null;
  }
}

/**
 * Pure: compute coverage gap. Safe against missing/zero/non-finite inputs.
 * Returns gap in [0, 1] (1 = total drift, 0 = full coverage).
 */
export function coverageGap(stats) {
  if (!stats || typeof stats !== "object") return 0;
  const cov = Number(stats.coverage);
  if (!Number.isFinite(cov)) return 0;
  if (cov < 0) return 1;     // pathological — treat as total drift
  if (cov > 1) return 0;     // pathological — treat as no drift
  return 1 - cov;
}

/**
 * Pure: pick top-K missing samples. Producer already sorts deterministically.
 */
export function pickTopMissing(missing, k = DEFAULT_TOPK) {
  if (!Array.isArray(missing)) return [];
  const limit = Math.max(0, Math.min(20, Number.isFinite(k) ? k : DEFAULT_TOPK));
  return missing.slice(0, limit).map((p) => String(p || ""));
}

/**
 * Pure: render the 3-4 line digest. Returns null when (a) inputs unusable,
 * (b) below threshold, (c) report stale.
 */
export function formatDigest(audit, ageMs, opts = {}) {
  if (!audit || !audit.stats) return null;
  const threshold = Number.isFinite(opts.threshold) ? opts.threshold : DEFAULT_GAP_THRESHOLD;
  const topK = Number.isFinite(opts.topK) ? opts.topK : DEFAULT_TOPK;
  const staleMs = (Number.isFinite(opts.staleHrs) ? opts.staleHrs : DEFAULT_STALE_HRS) * 3600_000;
  if (Number.isFinite(ageMs) && ageMs > staleMs) return null;
  const gap = coverageGap(audit.stats);
  if (gap < threshold) return null;
  const missing = Number(audit.stats.missing) || 0;
  const stale = Number(audit.stats.stale) || 0;
  const wikiFiles = Number(audit.stats.wikiFiles) || 0;
  const coverage = Number(audit.stats.coverage) || 0;
  // U-WIKI-TRIBAL-DEDUP: when the per-domain sibling block will render, suppress
  // our redundant global sample list (keep the unique headline). Pure: the I/O
  // prediction happens in main(); here we just honor the resolved boolean.
  const suppressSamples = opts.suppressSamples === true;
  const samples = suppressSamples ? [] : pickTopMissing(audit.missingFromTribal, topK);
  const ageHrs = Number.isFinite(ageMs) ? Math.floor(ageMs / 3600_000) : 0;
  const ageLabel = ageHrs < 1 ? "fresh" : `${ageHrs}h old`;
  const coveragePct = (coverage * 100).toFixed(1);
  const lines = [
    `## 📚 Wiki↔Tribal coverage (${ageLabel})`,
    `   ⚠ **${missing.toLocaleString()}** of ${wikiFiles.toLocaleString()} wiki files lack tribal embedding — coverage **${coveragePct}%**${stale > 0 ? ` · ${stale} stale tribal entries` : ""}.`,
  ];
  if (samples.length > 0) {
    lines.push(`   _Top ${samples.length} missing:_`);
    for (const s of samples) lines.push(`     • ${s}`);
  }
  lines.push(`   _Re-embed via tribal-index regen. Full report: \`state/shared/.wiki-tribal-cross-ref-audit.json\`. Disable: \`PRISM_WIKI_TRIBAL_INJECT=0\`._`);
  return lines.join("\n");
}

/**
 * U-WIKI-TRIBAL-DEDUP: predict whether the per-domain sibling hook will render
 * its block this SessionStart. When TRUE, this global hook drops its redundant
 * "Top N missing" list. Honors the SAME knobs the sibling honors so the
 * prediction can't diverge from the sibling's actual gate. Fail-safe: any
 * error -> false -> we KEEP our samples (legacy behavior, never a regression).
 * `reportPath`/`nowMs` are injectable for hermetic tests.
 */
export function perDomainWillRender(reportPath = PD_REPORT_PATH, nowMs = Date.now()) {
  try {
    if (process.env.PRISM_WIKI_TRIBAL_PER_DOMAIN_INJECT === "0") return false;
    const loaded = loadPerDomainReport(reportPath, nowMs);
    if (!loaded || !loaded.report) return false;
    const tEnv = process.env.PRISM_WIKI_TRIBAL_PER_DOMAIN_THRESHOLD;
    const sEnv = process.env.PRISM_WIKI_TRIBAL_PER_DOMAIN_STALE_HRS;
    const tNum = tEnv !== undefined && tEnv !== "" ? Number(tEnv) : NaN;
    const sNum = sEnv !== undefined && sEnv !== "" ? Number(sEnv) : NaN;
    const threshold = Number.isFinite(tNum) ? tNum : PD_THRESHOLD;
    const staleHrs = Number.isFinite(sNum) ? sNum : PD_STALE_HRS;
    if (loaded.ageMs / 3_600_000 > staleHrs) return false;
    return pickWorstDomains(loaded.report.byDomain, threshold, 3).length > 0;
  } catch {
    return false;
  }
}

function main() {
  if (process.env.PRISM_WIKI_TRIBAL_INJECT === "0") return emit(null);
  const loaded = loadAudit(AUDIT_PATH);
  if (!loaded) return emit(null);
  // Mirrors iter-5 P1-1 fix: empty env var must NOT collapse to default,
  // and explicit `0` must be honored. Uses Number.isFinite gate, undefined check.
  const tEnv = process.env.PRISM_WIKI_TRIBAL_GAP_THRESHOLD;
  const kEnv = process.env.PRISM_WIKI_TRIBAL_TOPK;
  const sEnv = process.env.PRISM_WIKI_TRIBAL_STALE_HRS;
  const t = tEnv !== undefined && tEnv !== "" ? Number(tEnv) : NaN;
  const k = kEnv !== undefined && kEnv !== "" ? Number(kEnv) : NaN;
  const s = sEnv !== undefined && sEnv !== "" ? Number(sEnv) : NaN;
  // U-WIKI-TRIBAL-DEDUP: drop our redundant global sample list when the
  // per-domain sibling will render (default ON; PRISM_WIKI_TRIBAL_DEDUP=0 keeps
  // legacy always-show-samples). The I/O prediction lives here, not in the pure
  // formatDigest.
  const dedupEnabled = process.env.PRISM_WIKI_TRIBAL_DEDUP !== "0";
  const opts = {
    threshold: Number.isFinite(t) ? t : DEFAULT_GAP_THRESHOLD,
    topK: Number.isFinite(k) ? k : DEFAULT_TOPK,
    staleHrs: Number.isFinite(s) ? s : DEFAULT_STALE_HRS,
    suppressSamples: dedupEnabled && perDomainWillRender(),
  };
  const digest = formatDigest(loaded.audit, loaded.ageMs, opts);
  if (!digest) return emit(null);
  emit(digest);
}

function isInvokedDirectly() {
  if (typeof process.argv[1] !== "string") return false;
  try {
    const here = fileURLToPath(import.meta.url);
    const argv = path.resolve(process.argv[1]);
    return path.relative(here, argv) === "";
  } catch {
    return false;
  }
}

if (isInvokedDirectly()) {
  try { main(); } catch { emit(null); }
}
