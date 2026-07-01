#!/usr/bin/env node
// tier: T2
/**
 * pre-tool-bash-rtk-enforce.mjs — PreToolUse:Bash HARD-ENFORCE rtk wrap
 *
 * U-RTK-ENFORCE (2026-05-24, slot:alpha) — fixes the adoption gap.
 *
 * The existing `rtk-prefix-reminder` advises; this hook DENIES. When a Bash
 * command starts with a known-wrappable base (git/gh/npm/tsc/vitest/etc.)
 * AND is not already wrapped (`rtk` or `command` prefix) AND no opt-out is
 * set, the hook BLOCKS with a clear "re-run with `rtk` prefix" message.
 *
 * This pushes RTK adoption from current ~8% to ~100% for wrappable commands.
 *
 * OPT-OUT (per-command): prefix with `command` (e.g. `command git status` for
 * raw output) — explicit signal that the agent intends unfiltered output.
 *
 * OPT-OUT (session-wide): PRISM_RTK_ENFORCE_DISABLE=1
 *
 * ── ARMING ────────────────────────────────────────────────────────────
 * DEFAULT-OFF. Set `PRISM_RTK_ENFORCE_ENABLE=1` to arm. Fleet-wide rollout
 * is operator-side (per-slot opt-in) since hard-block changes behavior of
 * every peer chat's Bash invocations.
 *
 * Pure helpers exported for tests:
 *   - baseFromCommand(cmd) → string | null
 *   - shouldEnforce(cmd, {opts}) → {enforce, reason, suggested}
 */
import { readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";

const TELEMETRY = "H:/prism/state/shared/dashboards/rtk-enforce.jsonl";

// Bases RTK wraps with proven savings (≥40% reduction). Mirrors
// RTK_SAVINGS_FRACTION from posttool-rtk-adoption-measure.mjs. Cheap
// invocations (--version, --help) are bypassed at the regex layer.
export const RTK_WRAPPABLE_BASES = new Set([
  "git", "gh", "npm", "npx", "yarn", "pnpm",
  "vitest", "tsc", "tsx", "node",
  "docker", "docker-compose",
  "grep", "rg", "find", "cat", "ls",
]);

export function baseFromCommand(cmd) {
  if (!cmd || typeof cmd !== "string") return null;
  const trimmed = cmd.trim();
  // Already-wrapped (rtk or command prefix) → null = no enforcement needed
  if (/^(?:rtk|command)\s+/i.test(trimmed)) return null;
  // Cheap probes — skip
  if (/^\S+\s+(--version|-v|--help|-h)\s*$/i.test(trimmed)) return null;
  const m = trimmed.match(/^([A-Za-z][A-Za-z0-9_-]*)/);
  return m ? m[1].toLowerCase() : null;
}

export function shouldEnforce(cmd, { wrappable = RTK_WRAPPABLE_BASES } = {}) {
  const base = baseFromCommand(cmd);
  if (!base) return { enforce: false, reason: "already-wrapped-or-cheap", suggested: null };
  if (!wrappable.has(base)) return { enforce: false, reason: "non-wrappable", suggested: null };
  return {
    enforce: true,
    reason: `unwrapped-${base}`,
    suggested: `rtk ${cmd.trim()}`,
  };
}

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }
function block(msg) {
  process.stdout.write(JSON.stringify({
    continue: false,
    stopReason: msg,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: msg,
    },
  }));
}

function recordTelemetry(entry) {
  try {
    if (!existsSync(dirname(TELEMETRY))) mkdirSync(dirname(TELEMETRY), { recursive: true });
    appendFileSync(TELEMETRY, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
  } catch { /* fail-soft */ }
}

function main() {
  // Default-OFF: must be explicitly armed. The DISABLE knob is still honored
  // as a kill switch even when armed.
  if (process.env.PRISM_RTK_ENFORCE_ENABLE !== "1") return pass();
  if (process.env.PRISM_RTK_ENFORCE_DISABLE === "1") return pass();
  let input;
  try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { return pass(); }
  if (input.tool_name !== "Bash") return pass();
  const cmd = input?.tool_input?.command;
  const decision = shouldEnforce(cmd);
  recordTelemetry({ kind: decision.enforce ? "blocked" : "passed", reason: decision.reason });
  if (!decision.enforce) return pass();
  const msg = `⚠ RTK ENFORCEMENT — un-wrapped \`${baseFromCommand(cmd)}\` invocation blocked.\n\nRe-run with: \`${decision.suggested}\`\n\nWhy: ${baseFromCommand(cmd)} is in RTK_WRAPPABLE_BASES (60-99% token reduction on verbose output). To bypass intentionally:\n  • \`command ${cmd.trim()}\` — single-command opt-out (preserves raw output)\n  • PRISM_RTK_ENFORCE_DISABLE=1 — session-wide opt-out\n\nAdoption gap fix: U-RTK-ENFORCE 2026-05-24.`;
  block(msg);
}

if (process.argv[1] && process.argv[1].endsWith("pre-tool-bash-rtk-enforce.mjs")) {
  try { main(); } catch { pass(); }
}
