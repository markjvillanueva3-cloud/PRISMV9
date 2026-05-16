#!/usr/bin/env node
// tier: T3
/**
 * stop-wiring-audit-suggest.mjs — Stop hook (T3 advisory)
 *
 * AUTOCOMPACT-AUTONOMOUS-MS0 / U-AAM04 — passively suggests `/wiring-audit`
 * when the harness has accumulated orphan hooks, dangling refs, OR a C:↔H:
 * settings mirror drift. Advisory only: NEVER blocks Stop.
 *
 * Trigger logic:
 *   - Stamp-throttled to 1 fire per 4 hours (avoid Stop-chain spam)
 *   - Reads existing state/shared/HOOK_WIRING_AUDIT.json if recent (<24h);
 *     skips computing if the cached audit is fresh AND severity == "ok"
 *   - Otherwise computes a quick audit inline (cheap, no fs walks beyond
 *     the one root) and emits a 1-line additionalContext if severity != ok
 *
 * FIRES ON: Stop
 * BLOCKING: never — advisory side-effect only
 *
 * Knobs:
 *   PRISM_WIRING_AUDIT_SUGGEST_DISABLE=1 — disable entirely (silent continue)
 *   PRISM_WIRING_AUDIT_SUGGEST_VERBOSE=1 — emit even on severity == ok
 *   PRISM_WIRING_AUDIT_SUGGEST_THROTTLE_MS=N — override 4h throttle (default 14400000)
 */
import fs from "node:fs";
import path from "node:path";

const STAMP_FILE = "H:/prism/mcp-server/data/state/.wiring-audit-suggest-last.iso";
const AUDIT_JSON = "H:/prism/state/shared/HOOK_WIRING_AUDIT.json";
const DEFAULT_THROTTLE_MS = 14_400_000;  // 4 hours
const CACHE_FRESH_MS = 86_400_000;       // 24 hours — beyond this, force recompute
const SILENCE = { continue: true, suppressOutput: true };

function emit(obj) { try { process.stdout.write(JSON.stringify({ continue: true, ...obj })); } catch { /* tolerate */ } }

function readStampMs() {
  try {
    const raw = fs.readFileSync(STAMP_FILE, "utf8").trim();
    const t = Date.parse(raw);
    return Number.isFinite(t) ? t : 0;
  } catch { return 0; }
}

function writeStamp() {
  try {
    fs.mkdirSync(path.dirname(STAMP_FILE), { recursive: true });
    fs.writeFileSync(STAMP_FILE, new Date().toISOString(), "utf8");
  } catch { /* tolerate */ }
}

function readCachedAudit() {
  try {
    const raw = fs.readFileSync(AUDIT_JSON, "utf8");
    const j = JSON.parse(raw);
    if (!j || typeof j !== "object") return null;
    const ageMs = Date.now() - Date.parse(j.generatedAtIso || "");
    return { audit: j, ageMs: Number.isFinite(ageMs) ? ageMs : Infinity };
  } catch { return null; }
}

function suggestionLine(audit) {
  const sev = audit.severity === "critical" ? "🔴 CRITICAL"
            : audit.severity === "warn" ? "🟡 WARN"
            : "🟢 OK";
  const lines = [
    `## 🔧 Hook wiring audit — ${sev}`,
    "",
    `- **${audit.hooksOnDisk}** hooks on disk · **${audit.hooksWired}** wired (settings ∪ bundle)`,
    `- **${audit.orphanCount}** orphan hooks (${(audit.orphanRate * 100).toFixed(1)}%) · **${audit.danglingCount}** dangling refs`,
    `- C:↔H: settings mirror: ${audit.mirrorBytes?.equal ? "✓ byte-equal" : "✗ DRIFT"}`,
    "",
    `Run \`node H:/prism/scripts/harness-wiring-audit.mjs\` for the full report (already at \`state/shared/HOOK_WIRING_AUDIT.{json,md}\`).`,
    `Catches the Gap-3-revert + precompact-unwired class of silent-failure bugs proactively.`,
    "_Disable: `PRISM_WIRING_AUDIT_SUGGEST_DISABLE=1`._",
  ];
  return lines.join("\n");
}

(function main() {
  if (process.env.PRISM_WIRING_AUDIT_SUGGEST_DISABLE === "1") { emit({ suppressOutput: true }); return; }
  const throttleMs = Number(process.env.PRISM_WIRING_AUDIT_SUGGEST_THROTTLE_MS) || DEFAULT_THROTTLE_MS;
  const lastMs = readStampMs();
  if (lastMs && Date.now() - lastMs < throttleMs) { emit({ suppressOutput: true }); return; }

  const cached = readCachedAudit();
  // No cache or stale (>24h) → silent continue; the operator will need to
  // run /wiring-audit manually first. Don't compute inline at Stop — we
  // promised never to block, and a full walk is ~100ms but I/O latency
  // on a busy Windows host can hit seconds. Cached-only is the safer arm.
  if (!cached) { emit({ suppressOutput: true }); return; }
  if (cached.ageMs > CACHE_FRESH_MS) { emit({ suppressOutput: true }); return; }

  const verbose = process.env.PRISM_WIRING_AUDIT_SUGGEST_VERBOSE === "1";
  if (cached.audit.severity === "ok" && !verbose) { emit({ suppressOutput: true }); return; }

  // Fire — update stamp before emitting so concurrent Stop fires don't double-emit.
  writeStamp();
  emit({
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext: suggestionLine(cached.audit),
    },
  });
})();
