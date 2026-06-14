#!/usr/bin/env node
/**
 * .claude/hooks/knowledge-link-audit-inject.mjs
 *
 * SessionStart hook — surfaces wiki↔memory broken-link drift from
 * `state/shared/.knowledge-link-audit.json` (producer:
 * scripts/knowledge-link-audit.mjs, fired weekly by handoff-memory-seed-stop.mjs).
 *
 * Iter 5 of the /goal synergize loop (echo, 2026-05-21). Closes the
 * deferred Reviewer-B P1-1 from iter 4 ([[reference_u_knowledge_link_audit_wire_2026_05_20]]):
 * the audit was producer-only — broken-link counts crossed every threshold
 * (4136/97673 = 4.2%) with no chat-visible surface. This is the consumer.
 *
 * Discipline (mirrors substrate-health-inject):
 *   - ADVISORY only, NEVER blocking — emits additionalContext + exits 0
 *   - No spawn — producer already runs on the 7d Stop-hook cron
 *   - Threshold-gated: silent below `THRESHOLD_RATIO` (default 2%)
 *   - Stale-gated: silent if report > `STALE_MAX_HRS` (default 30d) —
 *     prevents stale alerts from a long-dead producer
 *   - Fail-soft on every error class — no inject is better than crashed inject
 *
 * Knobs:
 *   PRISM_KNOWLEDGE_LINK_AUDIT_INJECT=0     — disable entirely
 *   PRISM_KNOWLEDGE_LINK_AUDIT_THRESHOLD=N  — broken/total ratio gate (0.02)
 *   PRISM_KNOWLEDGE_LINK_AUDIT_TOPK=N       — top-K broken samples (3)
 *   PRISM_KNOWLEDGE_LINK_AUDIT_STALE_HRS=N  — staleness ceiling in hours (720)
 *
 * Stdin: standard SessionStart JSON envelope (ignored)
 * Stdout: hookSpecificOutput.additionalContext payload (or {})
 * Exit:   always 0
 */

// tier: T2
// SessionStart hook — wiki/memory broken-link drift advisory
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/PRISM";
const AUDIT_PATH = path.join(PRISM_ROOT, "state/shared/.knowledge-link-audit.json");
const DEFAULT_THRESHOLD = 0.02;
const DEFAULT_TOPK = 3;
const DEFAULT_STALE_HRS = 720; // 30d — generous; producer runs weekly
const MAX_AUDIT_BYTES = 16 * 1024 * 1024; // 16MB — first real run was 680KB; cap at 16MB

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
 * Pure: compute broken-ratio. Safe against missing/zero/non-finite inputs.
 */
export function brokenRatio(stats) {
  if (!stats || typeof stats !== "object") return 0;
  const total = Number(stats.linksTotal);
  const broken = Number(stats.linksBroken);
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isFinite(broken) || broken < 0) return 0;
  return broken / total;
}

/**
 * Pure: pick top-K broken samples. Producer already sorts deterministically
 * (by `from` then `link`). We just take the prefix and project to display
 * tuples. Defensive against non-array / missing fields.
 */
export function pickTopBroken(broken, k = DEFAULT_TOPK) {
  if (!Array.isArray(broken)) return [];
  const limit = Math.max(0, Math.min(20, Number.isFinite(k) ? k : DEFAULT_TOPK));
  return broken.slice(0, limit).map((b) => ({
    from: String(b && b.from || "?"),
    link: String(b && b.link || "?"),
  }));
}

/**
 * Pure: render the 3-4 line digest. Returns null when (a) inputs unusable,
 * (b) below threshold, (c) report stale. Caller treats null as silent skip.
 */
export function formatDigest(audit, ageMs, opts = {}) {
  if (!audit || !audit.stats) return null;
  const threshold = Number.isFinite(opts.threshold) ? opts.threshold : DEFAULT_THRESHOLD;
  const topK = Number.isFinite(opts.topK) ? opts.topK : DEFAULT_TOPK;
  const staleMs = Number.isFinite(opts.staleHrs) ? opts.staleHrs * 3600_000 : DEFAULT_STALE_HRS * 3600_000;
  // Stale gate: producer is supposed to run weekly; if we haven't heard from it
  // in `staleHrs`, the report is suspect — don't escalate stale numbers.
  if (Number.isFinite(ageMs) && ageMs > staleMs) return null;
  const ratio = brokenRatio(audit.stats);
  if (ratio < threshold) return null;
  const broken = Number(audit.stats.linksBroken) || 0;
  const total = Number(audit.stats.linksTotal) || 0;
  const files = Number(audit.stats.filesScanned) || 0;
  const samples = pickTopBroken(audit.broken, topK);
  const ageHrs = Number.isFinite(ageMs) ? Math.floor(ageMs / 3600_000) : 0;
  const ageLabel = ageHrs < 1 ? "fresh" : `${ageHrs}h old`;
  const ratioPct = (ratio * 100).toFixed(1);
  const lines = [
    `## 🔗 Wiki↔Memory link integrity (${ageLabel})`,
    `   ⚠ **${broken.toLocaleString()}** broken of ${total.toLocaleString()} \`[[name]]\` tokens across ${files.toLocaleString()} md files (**${ratioPct}%**).`,
  ];
  if (samples.length > 0) {
    lines.push(`   _Top ${samples.length}:_`);
    for (const s of samples) lines.push(`     • \`${s.link}\` ← ${s.from}`);
  }
  lines.push(`   _Full: \`state/shared/.knowledge-link-audit.json\` · regen \`node scripts/knowledge-link-audit.mjs\` · disable \`PRISM_KNOWLEDGE_LINK_AUDIT_INJECT=0\`._`);
  return lines.join("\n");
}

function main() {
  if (process.env.PRISM_KNOWLEDGE_LINK_AUDIT_INJECT === "0") return emit(null);
  const loaded = loadAudit(AUDIT_PATH);
  if (!loaded) return emit(null);
  // Number.isFinite (not `|| DEFAULT`) preserves the legitimate env value 0:
  //   THRESHOLD=0 → surface every broken link
  //   TOPK=0      → render header+ratio with no sample bullets
  //   STALE_HRS=0 → always stale (silent) — operator opt-out
  // Cross-checked by both reviewers (iter-5 P1-1). Mirrors formatDigest L102-105.
  const tEnv = Number(process.env.PRISM_KNOWLEDGE_LINK_AUDIT_THRESHOLD);
  const kEnv = Number(process.env.PRISM_KNOWLEDGE_LINK_AUDIT_TOPK);
  const sEnv = Number(process.env.PRISM_KNOWLEDGE_LINK_AUDIT_STALE_HRS);
  const opts = {
    threshold: Number.isFinite(tEnv) ? tEnv : DEFAULT_THRESHOLD,
    topK: Number.isFinite(kEnv) ? kEnv : DEFAULT_TOPK,
    staleHrs: Number.isFinite(sEnv) ? sEnv : DEFAULT_STALE_HRS,
  };
  const digest = formatDigest(loaded.audit, loaded.ageMs, opts);
  if (!digest) return emit(null);
  emit(digest);
}

// Hermetic test guard — only auto-run main() when invoked as a script.
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
