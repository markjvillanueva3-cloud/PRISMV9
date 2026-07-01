#!/usr/bin/env node
/**
 * .claude/hooks/prism-ai-memo-coverage-inject.mjs
 *
 * SessionStart hook — surfaces PRISM-AI engine ⇄ memo coverage gaps from
 * `state/shared/.prism-ai-memo-cross-ref-audit.json` (producer:
 * scripts/prism-ai-memo-cross-ref-audit.mjs, iter-13 echo /goal synergy).
 *
 * Iter 14 of the /goal synergize loop (echo, 2026-05-21). Producer/consumer
 * pair after iter-13's audit exposed the 42.9%-coverage blind spots in the
 * operator's memory vault (LoRAAdapter, NeuralKnowledgeSynthesis,
 * VerificationPlugin, CreativeReasoning — no explicit class-name references
 * in 863 memos). This hook makes those blind spots visible to every chat
 * at session start so they get triaged instead of remaining silent.
 *
 * Discipline (mirrors iter-8 wiki-tribal-coverage-inject):
 *   - ADVISORY only, NEVER blocking — exits 0; valid SessionStart envelope
 *   - No spawn — producer runs on-demand (or piggybacked on a Stop hook later)
 *   - Threshold-gated: silent unless `missing >= MISSING_THRESHOLD` (default 1)
 *   - Stale-gated: silent if report > `STALE_MAX_HRS` (default 720 = 30d)
 *   - Fail-soft on every error class — no inject is better than crash
 *
 * Threshold-design rationale (iter-14 deviates from iter-8 on this axis):
 * iter-8 uses a percentage-coverage-gap threshold (`(1 - coverage) >= 0.10`)
 * because the wiki-tribal corpus has ~24,000 files and 0.1% gaps are noise.
 * Here the corpus is 7 engines — even 1 engine missing is operator-relevant
 * (14.3% absolute gap). So this hook uses an ABSOLUTE-COUNT threshold:
 * `missing >= MISSING_THRESHOLD` (default 1). The schema still exposes
 * coverage% in the rendered digest so the operator sees both signals.
 *
 * Knobs:
 *   PRISM_AI_MEMO_INJECT=0              — disable entirely
 *   PRISM_AI_MEMO_MISSING_THRESHOLD=N   — fire when `missing >= N` (default 1)
 *   PRISM_AI_MEMO_TOPK=N                — top-K missing engine names (default 3)
 *   PRISM_AI_MEMO_STALE_HRS=N           — staleness ceiling in hours (default 720)
 *
 * Stdin: standard SessionStart JSON envelope (ignored)
 * Stdout: hookSpecificOutput.additionalContext payload (or {})
 * Exit:   always 0
 */

// tier: T2
// SessionStart hook — PRISM-AI engine memo-coverage drift advisory
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/PRISM";
const AUDIT_PATH = path.join(PRISM_ROOT, "state/shared/.prism-ai-memo-cross-ref-audit.json");
const DEFAULT_MISSING_THRESHOLD = 1; // fire when missing >= 1 (sensitive because corpus is small)
const DEFAULT_TOPK = 3;
const DEFAULT_STALE_HRS = 720;
const MAX_AUDIT_BYTES = 4 * 1024 * 1024; // 4MB — iter-13 first run was ~6KB; very tight cap

function emit(additionalContext) {
  const payload = additionalContext
    ? { hookSpecificOutput: { hookEventName: "SessionStart", additionalContext } }
    : {};
  process.stdout.write(JSON.stringify(payload) + "\n");
  process.exit(0);
}

/**
 * Pure: load + validate the audit report. Returns { audit, ageMs } or null.
 * Hostile-payload guards: size cap + JSON parse + shape check (.stats must
 * be a non-null object with at least `engineCount` AND `missing` keys; the
 * shape check fails closed on any drift in the producer contract).
 */
export function loadAudit(auditPath, nowMs = Date.now()) {
  try {
    if (!existsSync(auditPath)) return null;
    const st = statSync(auditPath);
    if (!Number.isFinite(st.size) || st.size > MAX_AUDIT_BYTES || st.size <= 0) return null;
    const raw = readFileSync(auditPath, "utf8");
    const j = JSON.parse(raw);
    if (!j || typeof j !== "object" || !j.stats || typeof j.stats !== "object") return null;
    // Producer-contract shape check: engineCount + missing keys must be present
    // (covers the iter-7-style "audit JSON shape drift" hazard).
    if (typeof j.stats.engineCount !== "number" || typeof j.stats.missing !== "number") return null;
    const ageMs = Math.max(0, nowMs - st.mtimeMs);
    return { audit: j, ageMs };
  } catch {
    return null;
  }
}

/**
 * Pure: pick top-K missing engine names. Producer emits a deterministic
 * sorted array (alphabetical via listPrismAiEngines), so slicing is stable.
 */
export function pickTopMissing(missing, k = DEFAULT_TOPK) {
  if (!Array.isArray(missing)) return [];
  const limit = Math.max(0, Math.min(20, Number.isFinite(k) ? k : DEFAULT_TOPK));
  return missing.slice(0, limit).map((p) => String(p || ""));
}

/**
 * Pure: render the 3-5 line digest. Returns null when (a) inputs unusable,
 * (b) missing-count below threshold, (c) report stale.
 *
 * The threshold check is ABSOLUTE-COUNT (`missing >= threshold`), not the
 * percentage-gap rule iter-8 uses — see header comment on threshold design.
 */
export function formatDigest(audit, ageMs, opts = {}) {
  if (!audit || !audit.stats) return null;
  const threshold = Number.isFinite(opts.threshold) ? opts.threshold : DEFAULT_MISSING_THRESHOLD;
  const topK = Number.isFinite(opts.topK) ? opts.topK : DEFAULT_TOPK;
  const staleMs = (Number.isFinite(opts.staleHrs) ? opts.staleHrs : DEFAULT_STALE_HRS) * 3600_000;
  if (Number.isFinite(ageMs) && ageMs > staleMs) return null;
  const missing = Number(audit.stats.missing) || 0;
  if (missing < threshold) return null;
  const engineCount = Number(audit.stats.engineCount) || 0;
  const memoCount = Number(audit.stats.memoCount) || 0;
  const coverage = Number(audit.stats.coverage) || 0;
  const samples = pickTopMissing(audit.missingFromMemos, topK);
  const ageHrs = Number.isFinite(ageMs) ? Math.floor(ageMs / 3600_000) : 0;
  const ageLabel = ageHrs < 1 ? "fresh" : `${ageHrs}h old`;
  const coveragePct = (coverage * 100).toFixed(1);
  const lines = [
    `## 🤖 PRISM-AI engine memo coverage (${ageLabel})`,
    `   ⚠ **${missing}** of ${engineCount} PRISM-AI engines lack memo coverage in ${memoCount.toLocaleString()} memos — coverage **${coveragePct}%**.`,
  ];
  if (samples.length > 0) {
    lines.push(`   _Top ${samples.length} blind-spot engine${samples.length === 1 ? "" : "s"}:_`);
    for (const s of samples) lines.push(`     • ${s}`);
  }
  lines.push(`   _Add memos referencing the engine class name. Full report: \`state/shared/.prism-ai-memo-cross-ref-audit.json\`. Disable: \`PRISM_AI_MEMO_INJECT=0\`._`);
  return lines.join("\n");
}

function main() {
  if (process.env.PRISM_AI_MEMO_INJECT === "0") return emit(null);
  const loaded = loadAudit(AUDIT_PATH);
  if (!loaded) return emit(null);
  // Iter-5 P1-1 fix absorbed: empty env must NOT collapse to default, AND
  // explicit `0` must be honored. Two-stage gate (undefined check first,
  // Number.isFinite second) — env="" stays NaN; env="0" stays 0.
  const tEnv = process.env.PRISM_AI_MEMO_MISSING_THRESHOLD;
  const kEnv = process.env.PRISM_AI_MEMO_TOPK;
  const sEnv = process.env.PRISM_AI_MEMO_STALE_HRS;
  const t = tEnv !== undefined && tEnv !== "" ? Number(tEnv) : NaN;
  const k = kEnv !== undefined && kEnv !== "" ? Number(kEnv) : NaN;
  const s = sEnv !== undefined && sEnv !== "" ? Number(sEnv) : NaN;
  const opts = {
    threshold: Number.isFinite(t) ? t : DEFAULT_MISSING_THRESHOLD,
    topK: Number.isFinite(k) ? k : DEFAULT_TOPK,
    staleHrs: Number.isFinite(s) ? s : DEFAULT_STALE_HRS,
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
