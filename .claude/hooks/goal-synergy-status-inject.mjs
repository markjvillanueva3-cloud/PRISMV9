#!/usr/bin/env node
/**
 * .claude/hooks/goal-synergy-status-inject.mjs
 *
 * SessionStart hook — single-line synergy-health digest from
 * `state/shared/.goal-synergy-status.json` (producer: iter-10 rollup).
 *
 * Iter 11 of the /goal synergize loop. Consolidates the iter-5
 * (knowledge-link-audit) + iter-8 (wiki-tribal-coverage) digests into ONE
 * summary line so the chat context bundle isn't bloated by two near-identical
 * substrate-drift reports. The iter-5 + iter-8 hooks stay as drill-downs for
 * operators who want sample lists.
 *
 * Always-on (no threshold gate — the rollup itself encodes health via the
 * `healthy` flag and `driftSurfaces[]`). Stale-gated (default 720h). When
 * healthy and fresh, emits a brief OK line. When drift detected, emits one
 * line per drift surface.
 *
 * Knobs:
 *   PRISM_GOAL_SYNERGY_INJECT=0      — disable entirely
 *   PRISM_GOAL_SYNERGY_STALE_HRS=N   — staleness ceiling (720h default)
 *   PRISM_GOAL_SYNERGY_SHOW_OK=0     — when healthy, stay silent (default: show)
 *
 * Stdin: standard SessionStart JSON envelope (ignored)
 * Exit:   always 0
 */

// tier: T2
// SessionStart hook — /goal substrate health digest (rollup consumer)
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/PRISM";
const STATUS_PATH = path.join(PRISM_ROOT, "state/shared/.goal-synergy-status.json");
const DEFAULT_STALE_HRS = 720;
const MAX_STATUS_BYTES = 1 * 1024 * 1024; // 1MB — rollup is small (<10KB normally)

function emit(additionalContext) {
  const payload = additionalContext
    ? { hookSpecificOutput: { hookEventName: "SessionStart", additionalContext } }
    : {};
  process.stdout.write(JSON.stringify(payload) + "\n");
  process.exit(0);
}

/** Pure: load + validate the rollup. Returns { status, ageMs } or null. */
export function loadStatus(statusPath, nowMs = Date.now()) {
  try {
    if (!existsSync(statusPath)) return null;
    const st = statSync(statusPath);
    if (!Number.isFinite(st.size) || st.size > MAX_STATUS_BYTES || st.size <= 0) return null;
    const j = JSON.parse(readFileSync(statusPath, "utf8"));
    if (!j || typeof j !== "object" || !j.substrates || typeof j.substrates !== "object") return null;
    return { status: j, ageMs: Math.max(0, nowMs - st.mtimeMs) };
  } catch {
    return null;
  }
}

/**
 * Pure: render the digest. Returns null when status is stale or unusable.
 * Renders an OK line when healthy (unless `showOk: false`), else one summary
 * line per drift surface with the substrate's `summary` field.
 */
export function formatDigest(status, ageMs, opts = {}) {
  if (!status || !status.substrates) return null;
  const staleMs = (Number.isFinite(opts.staleHrs) ? opts.staleHrs : DEFAULT_STALE_HRS) * 3600_000;
  if (Number.isFinite(ageMs) && ageMs > staleMs) return null;
  const showOk = opts.showOk !== false;
  const ageHrs = Number.isFinite(ageMs) ? Math.floor(ageMs / 3600_000) : 0;
  const ageLabel = ageHrs < 1 ? "fresh" : `${ageHrs}h old`;
  const drift = Array.isArray(status.driftSurfaces) ? status.driftSurfaces : [];

  if (status.healthy === true && drift.length === 0) {
    if (!showOk) return null;
    return `## ⚙ /goal synergy health (${ageLabel})\n   ✓ all substrates clean — link-audit + wiki-tribal both within thresholds`;
  }

  const lines = [`## ⚙ /goal synergy health (${ageLabel})`];
  // Iterate substrates in deterministic order. Prefer name-asc for stability.
  const names = Object.keys(status.substrates).sort();
  // The rollup keys substrates by camelCase (linkAudit, wikiTribal) but the
  // driftSurfaces[] array uses kebab-case (link-audit, wiki-tribal) to match
  // the substrate kind argument to extractMetrics. Normalize the comparison
  // by converting the substrate name to kebab-case at lookup time.
  const toKebab = (s) => String(s).replace(/[A-Z]/g, (c, i) => (i === 0 ? c.toLowerCase() : "-" + c.toLowerCase()));
  for (const name of names) {
    const sub = status.substrates[name];
    if (!sub) continue;
    const kebab = toKebab(name);
    if (!sub.present) {
      lines.push(`   ⚠ ${name}: ${sub.summary || "missing audit"} — run the producer first`);
    } else if (drift.includes(name) || drift.includes(kebab)) {
      lines.push(`   ⚠ ${name}: ${sub.summary || "drift"}`);
    } else {
      lines.push(`   ✓ ${name}: ${sub.summary || "clean"}`);
    }
  }
  lines.push(`   _Full: \`state/shared/.goal-synergy-status.json\`. Disable: \`PRISM_GOAL_SYNERGY_INJECT=0\`._`);
  return lines.join("\n");
}

function main() {
  if (process.env.PRISM_GOAL_SYNERGY_INJECT === "0") return emit(null);
  const loaded = loadStatus(STATUS_PATH);
  if (!loaded) return emit(null);
  const sEnv = process.env.PRISM_GOAL_SYNERGY_STALE_HRS;
  const staleEnv = sEnv !== undefined && sEnv !== "" ? Number(sEnv) : NaN;
  const opts = {
    staleHrs: Number.isFinite(staleEnv) ? staleEnv : DEFAULT_STALE_HRS,
    showOk: process.env.PRISM_GOAL_SYNERGY_SHOW_OK !== "0",
  };
  const digest = formatDigest(loaded.status, loaded.ageMs, opts);
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
