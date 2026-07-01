#!/usr/bin/env node
/**
 * .claude/hooks/wiki-tribal-coverage-per-domain-inject.mjs — U-VICTOR-A2
 *
 * SessionStart sibling of `wiki-tribal-coverage-inject.mjs` (echo iter-8).
 * Parent hook surfaces the GLOBAL coverage gap; this one surfaces the
 * **worst per-domain** gaps so a slot whose work-area is ORANGE-tier (e.g.
 * shop-floor at 50%) sees it without having to manually run the audit.
 *
 * Reads `state/shared/.wiki-tribal-coverage-by-domain.json` (produced by
 * `scripts/audit-tribal-coverage-by-domain.mjs`, U-VICTOR-A1) and surfaces
 * top-K domains whose coverage is below the per-domain threshold.
 *
 * Discipline (mirrors parent hook):
 *   - ADVISORY only, NEVER blocking — exits 0; valid SessionStart envelope
 *   - Threshold-gated: silent unless any domain coverage < PER_DOMAIN_THRESHOLD
 *   - Stale-gated: silent if report > STALE_MAX_HRS
 *   - Fail-soft on every error class — no inject is better than crash
 *
 * Knobs:
 *   PRISM_WIKI_TRIBAL_PER_DOMAIN_INJECT=0      — disable entirely
 *   PRISM_WIKI_TRIBAL_PER_DOMAIN_THRESHOLD=N   — coverage gate (default 0.50)
 *   PRISM_WIKI_TRIBAL_PER_DOMAIN_TOPK=N        — top-K worst surfaced (default 3)
 *   PRISM_WIKI_TRIBAL_PER_DOMAIN_STALE_HRS=N   — staleness ceiling (default 168 = 7d)
 *
 * Stdin: standard SessionStart JSON envelope (ignored)
 * Stdout: hookSpecificOutput.additionalContext payload (or {})
 * Exit:   always 0
 */

// tier: T3
// SessionStart hook — per-domain wiki/tribal coverage drift advisory
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/PRISM";
// Exported so the sibling GLOBAL hook (wiki-tribal-coverage-inject.mjs) can
// predict whether THIS per-domain block will render and drop its redundant
// global "Top N missing" list when it would (U-WIKI-TRIBAL-DEDUP, bravo 2026-06-10).
export const REPORT_PATH = path.join(PRISM_ROOT, "state/shared/.wiki-tribal-coverage-by-domain.json");

export const DEFAULT_THRESHOLD = 0.50; // surface a domain only if coverage < 50%
export const DEFAULT_TOPK = 3;
export const DEFAULT_STALE_HRS = 168; // 7d — generous since the producer cadence is not enforced yet
const MAX_REPORT_BYTES = 8 * 1024 * 1024; // 8MB — by-domain report is small

function emit(additionalContext) {
  const payload = additionalContext
    ? { hookSpecificOutput: { hookEventName: "SessionStart", additionalContext } }
    : {};
  process.stdout.write(JSON.stringify(payload) + "\n");
  process.exit(0);
}

/**
 * Pure: load + size-cap + parse report. Returns { report, ageMs } or null.
 */
export function loadReport(reportPath, nowMs = Date.now()) {
  try {
    if (!existsSync(reportPath)) return null;
    const st = statSync(reportPath);
    if (!Number.isFinite(st.size) || st.size > MAX_REPORT_BYTES || st.size <= 0) return null;
    const raw = readFileSync(reportPath, "utf8");
    const j = JSON.parse(raw);
    if (!j || typeof j !== "object" || !j.byDomain || typeof j.byDomain !== "object") return null;
    const ageMs = Math.max(0, nowMs - st.mtimeMs);
    return { report: j, ageMs };
  } catch {
    return null;
  }
}

/**
 * Pure: rank the worst-N domains under the per-domain threshold. Mirrors
 * `rankWorst` in the audit-by-domain producer (lowest coverage first, ties
 * broken by wikiFiles desc). Skips domains with 0 wiki files (vacuous 1.0).
 */
export function pickWorst(byDomain, threshold = DEFAULT_THRESHOLD, topK = DEFAULT_TOPK) {
  if (!byDomain || typeof byDomain !== "object") return [];
  const entries = Object.entries(byDomain).filter(([, v]) => {
    if (!v || typeof v !== "object") return false;
    if (!Number.isFinite(v.wikiFiles) || v.wikiFiles <= 0) return false;
    if (!Number.isFinite(v.coverage) || v.coverage >= threshold) return false;
    return true;
  });
  entries.sort((a, b) => {
    const cd = a[1].coverage - b[1].coverage;
    if (cd !== 0) return cd;
    return b[1].wikiFiles - a[1].wikiFiles;
  });
  return entries.slice(0, Math.max(1, topK));
}

/**
 * Pure: format the additionalContext payload for SessionStart. Returns null
 * when there is nothing to surface (silent — parent hook still runs).
 *
 * COUPLING (U-WIKI-TRIBAL-DEDUP): the GLOBAL sibling
 * `wiki-tribal-coverage-inject.mjs#perDomainWillRender` predicts whether THIS
 * block renders by re-deriving the same gate (loadReport + age + pickWorst).
 * If you add a NEW early-return gate here, mirror it in perDomainWillRender,
 * or the global hook may drop its sample list while this block stays silent.
 */
export function formatPayload({ report, ageMs }, threshold, topK, staleHrs) {
  if (!report) return null;
  const ageHrs = ageMs / 3_600_000;
  if (ageHrs > staleHrs) return null;

  const worst = pickWorst(report.byDomain, threshold, topK);
  if (worst.length === 0) return null;

  const lines = [
    `## 🧭 Wiki↔Tribal coverage — per-domain worst-${worst.length} (audit ${ageHrs.toFixed(1)}h old)`,
    ``,
  ];
  for (const [dom, v] of worst) {
    lines.push(
      `- **${dom}** — ${(v.coverage * 100).toFixed(1)}% covered ` +
      `(${v.missing}/${v.wikiFiles} missing)` +
      (Array.isArray(v.sampleMissing) && v.sampleMissing.length
        ? `; sample: ${v.sampleMissing[0]}`
        : ``)
    );
  }
  lines.push(``);
  lines.push(
    `_Source: \`state/shared/.wiki-tribal-coverage-by-domain.json\` (U-VICTOR-A1). ` +
    `Disable: PRISM_WIKI_TRIBAL_PER_DOMAIN_INJECT=0._`
  );
  return lines.join("\n");
}

// ───────────────────────── I/O shell ─────────────────────────

function envNum(name, def) {
  const v = process.env[name];
  if (v === undefined || v === null || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

const __isMain = (() => {
  try {
    return process.argv[1] && path.normalize(process.argv[1]) === path.normalize(fileURLToPath(import.meta.url));
  } catch { return false; }
})();

if (__isMain) {
  // Knob short-circuit
  if (process.env.PRISM_WIKI_TRIBAL_PER_DOMAIN_INJECT === "0") emit(null);

  const threshold = envNum("PRISM_WIKI_TRIBAL_PER_DOMAIN_THRESHOLD", DEFAULT_THRESHOLD);
  const topK = envNum("PRISM_WIKI_TRIBAL_PER_DOMAIN_TOPK", DEFAULT_TOPK);
  const staleHrs = envNum("PRISM_WIKI_TRIBAL_PER_DOMAIN_STALE_HRS", DEFAULT_STALE_HRS);

  // Best-effort drain of stdin to avoid EPIPE (matches parent hook conventions)
  try { process.stdin.resume(); process.stdin.on("data", () => {}); } catch {}

  const loaded = loadReport(REPORT_PATH);
  if (!loaded) emit(null);

  const payload = formatPayload(loaded, threshold, topK, staleHrs);
  emit(payload);
}
