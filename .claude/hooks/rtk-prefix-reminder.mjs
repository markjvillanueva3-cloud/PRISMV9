#!/usr/bin/env node
// tier: T1
/**
 * rtk-prefix-reminder.mjs — PreToolUse:Bash
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P6-U02: enforces the CLAUDE.md "Use rtk prefix
 * on bash" rule. When the agent runs a verbose command (git/gh/npm/vitest/
 * tsc/docker), inject an advisory note suggesting the rtk wrapper for
 * 60–99% token reduction.
 *
 * NEVER blocks. Advisory only — `continue:true` always.
 * Skipped when:
 *   - command already starts with `rtk ` (or `command rtk`)
 *   - command is preceded by `command ` (intentional bypass)
 *   - command runs `rtk` itself (rtk init, rtk help, rtk subcommands)
 *   - PRISM_RTK_REMINDER_OFF=1 (escape hatch)
 *   - command is short / not in the verbose-command whitelist
 *
 * Pure helpers exported for tests:
 *   - VERBOSE_COMMANDS (whitelist of base command names)
 *   - normalizeCommand(cmd) — strip leading `command ` / pipes / sudo
 *   - shouldRemind(cmd, env?) — main decision function
 *   - buildReminder(baseCmd) — format the advisory string
 *
 * Stdin: PreToolUse Bash event {tool_input:{command}}.
 * Output: {continue:true, hookSpecificOutput?: {additionalContext}}
 *
 * ⚠ LOAD-BEARING BEYOND THE ADVISORY (2026-07-02): main() hosts the fleet's
 * ENOSPC self-heal (lib/emergency-c-temp-sweep.mjs) -- the ONLY in-band
 * recovery when C: fills and every shell tool call dies fleet-wide. Do NOT
 * disable/replace this hook without moving that call into bash-bundle.mjs
 * main() (the proper long-term home). See wiki [[enospc-hook-hosted-self-heal]].
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

// 2026-05-18 (slot kilo, post-/compact): rate-limit ported from the legacy
// rtk-auto-suggest.mjs. The original P6-U02 hook nagged on EVERY verbose-
// command Bash call — at ~140 tokens/advisory across hundreds of calls/session
// that's worse than the dead `rtk hook claude` noise I just removed. Pure
// helpers (shouldNagNow / recordNag) exported for tests. PRISM_RTK_REMINDER_OFF=1
// still bypasses entirely; PRISM_RTK_REMINDER_RATE_MS=N overrides the 120000ms
// default window (set to 0 to disable rate-limiting for testing).
const RATE_FILE = join(tmpdir(), "prism-hook-state", "rtk-prefix-reminder.last.json");
const RATE_WINDOW_MS_DEFAULT = 120_000;
const RATE_PRUNE_MULT = 10;

export function loadRateState() {
  try { return JSON.parse(readFileSync(RATE_FILE, "utf8")); } catch { return {}; }
}
export function saveRateState(state) {
  try {
    const d = dirname(RATE_FILE);
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
    writeFileSync(RATE_FILE, JSON.stringify(state));
  } catch { /* fail-soft: rate-state is best-effort, never block on tmpfs */ }
}
export function shouldNagNow(baseCmd, state, now, windowMs) {
  const last = state[baseCmd] || 0;
  return (now - last) >= windowMs;
}
export function recordNag(baseCmd, state, now, windowMs) {
  state[baseCmd] = now;
  const pruneOlderThan = windowMs * RATE_PRUNE_MULT;
  for (const k of Object.keys(state)) {
    if (now - state[k] > pruneOlderThan) delete state[k];
  }
  return state;
}

// Commands whose default output is verbose enough that rtk's truncation /
// summarization wins meaningful tokens. Conservative list — only commands
// where rtk has a documented wrapper.
export const VERBOSE_COMMANDS = Object.freeze([
  "git",
  "gh",
  "npm",
  "npx",
  "yarn",
  "pnpm",
  "vitest",
  "tsc",
  "tsx",
  "node",        // node ./scripts/foo.mjs CLI runs are often noisy
  "docker",
  "docker-compose",
  "grep",        // dedicated rtk wrapper exists; redundant with our Grep tool too
  "rg",
  "find",
  "cat",
  "ls",          // `ls -laR` and similar cases
]);

const VERBOSE_SET = new Set(VERBOSE_COMMANDS);

/**
 * Strip the parts of a shell command that don't determine the "base command":
 *   - leading `command ` (POSIX bypass)
 *   - leading `sudo `
 *   - leading env-var assignments (FOO=bar BAR=baz git status)
 * Returns { base, original, isAlreadyRtk, hasCommandBypass }.
 */
export function normalizeCommand(cmd) {
  if (typeof cmd !== "string") return { base: "", original: "", isAlreadyRtk: false, hasCommandBypass: false };
  const original = cmd.trim();
  if (original.length === 0) return { base: "", original, isAlreadyRtk: false, hasCommandBypass: false };

  // Detect `command rtk …` and plain `rtk …`
  const rtkLeading = /^(?:command\s+)?rtk(?:\s|$)/i.test(original);
  if (rtkLeading) {
    return { base: "rtk", original, isAlreadyRtk: true, hasCommandBypass: false };
  }

  // Detect `command <something>` bypass — user is explicitly opting out of any wrapper.
  const cmdBypass = /^command\s+/i.test(original);

  // Tokenize from the start, eating env-var assignments + sudo
  let work = original;
  if (cmdBypass) work = work.replace(/^command\s+/i, "");
  work = work.replace(/^sudo\s+/i, "");
  // Strip leading FOO=bar style assignments. Progress guard: a whitespace-free
  // assignment ("FOO=bar", "V=1;cmd") never matches the replace regex -- without
  // the bail-out this loop spins forever and hangs the PreToolUse hook until the
  // harness timeout kills it (scrutiny P1, U-GOLF-ENOSPC-SELFHEAL 2026-07-02).
  while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(work)) {
    const next = work.replace(/^\S+\s+/, "");
    if (next === work) { work = ""; break; }
    work = next;
    if (work.length === 0) break;
  }

  // Pull the first whitespace-delimited token; strip path prefixes (./scripts/foo.sh)
  const firstToken = work.split(/\s+/)[0] ?? "";
  const baseFromToken = firstToken.split(/[\\/]/).pop() ?? firstToken;
  // Drop a trailing `.exe` / `.cmd` / `.bat` so `git.exe` matches `git`.
  const base = baseFromToken.replace(/\.(?:exe|cmd|bat|ps1)$/i, "").toLowerCase();
  return { base, original, isAlreadyRtk: false, hasCommandBypass: cmdBypass };
}

/**
 * Decide whether to emit the rtk-prefix advisory for a given Bash command.
 * Returns { remind: boolean, reason: string, base: string }.
 */
export function shouldRemind(cmd, env = process.env) {
  if (env?.PRISM_RTK_REMINDER_OFF === "1") {
    return { remind: false, reason: "off-switch", base: "" };
  }
  const norm = normalizeCommand(cmd);
  if (!norm.original) {
    return { remind: false, reason: "empty-command", base: "" };
  }
  if (norm.isAlreadyRtk) {
    return { remind: false, reason: "already-rtk", base: "rtk" };
  }
  if (norm.hasCommandBypass) {
    return { remind: false, reason: "command-bypass", base: norm.base };
  }
  // Don't nag on ultra-short commands ("ls" alone is usually fine)
  if (norm.original.length < 5) {
    return { remind: false, reason: "trivially-short", base: norm.base };
  }
  if (!VERBOSE_SET.has(norm.base)) {
    return { remind: false, reason: "non-verbose-command", base: norm.base };
  }
  return { remind: true, reason: "verbose-command-no-rtk", base: norm.base };
}

/**
 * Format the advisory string injected into the hook's additionalContext.
 *
 * Tool-selection redirects for `cat` and `ls`: CLAUDE.md "Tool selection" rule
 * explicitly says prefer the harness Read tool over `cat` and Glob over `ls`.
 * For these two base commands, surface the harness-native redirect (zero
 * Bash framing, structured output) instead of suggesting `rtk cat`/`rtk ls`.
 * Closes the per-file scrutiny Reviewer A P2 from the 2026-05-18 dedup.
 */
export function buildReminder(baseCmd) {
  const safe = String(baseCmd ?? "command").slice(0, 32);
  if (safe === "cat") {
    return [
      "💡 Tool selection: prefer the Read tool over `cat` — line numbers, range support",
      "   (offset/limit), no Bash output framing. CLAUDE.md \"Tool selection\" rule.",
      "   Disable for this session: PRISM_RTK_REMINDER_OFF=1.",
    ].join("\n");
  }
  if (safe === "ls") {
    return [
      "💡 Tool selection: prefer the Glob tool over `ls` — sorted by mtime, no terminal",
      "   formatting parse. CLAUDE.md \"Tool selection\" rule. Use Bash `ls` only for",
      "   metadata (-la, stat). Disable for this session: PRISM_RTK_REMINDER_OFF=1.",
    ].join("\n");
  }
  return [
    `💡 RTK prefix suggested: \`rtk ${safe} ...\``,
    `   60–99% token reduction on verbose output. Skip with \`command ${safe} ...\` to bypass.`,
    `   Disable for this session: PRISM_RTK_REMINDER_OFF=1. /rtk-setup if rtk is missing.`,
  ].join("\n");
}

async function readStdin() {
  try {
    const raw = readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function emit(extra) {
  const out = { continue: true };
  if (extra) {
    out.hookSpecificOutput = {
      hookEventName: "PreToolUse",
      additionalContext: extra,
    };
  }
  process.stdout.write(JSON.stringify(out) + "\n");
  process.exit(0);
}

async function main() {
  // FLEET-HYGIENE/U-GOLF-ENOSPC-SELFHEAL (2026-07-02): when C: is full the
  // harness cannot write its Bash output-capture file and the agent loses ALL
  // shell access -- but PreToolUse hooks still run. This guarded sweep frees
  // consumed harness temp outputs so the very Bash call that triggered this
  // hook can complete. No-op when C: has space (statfs low-water guard) or the
  // module is absent. Knob: PRISM_EMERGENCY_C_SWEEP_DISABLE=1.
  try { (await import("./lib/emergency-c-temp-sweep.mjs")).emergencySweep(); } catch { /* fail-soft */ }
  const payload = await readStdin();
  const cmd = payload?.tool_input?.command;
  const decision = shouldRemind(cmd);
  if (!decision.remind) {
    emit(null);
    return;
  }
  // Rate-limit: at most one advisory per base command family per window.
  // Without this, the hook nagged on EVERY verbose-command call (~140 tok/advisory
  // × hundreds of calls/session). PRISM_RTK_REMINDER_RATE_MS=0 disables rate-limit.
  const windowMs = Number.parseInt(process.env.PRISM_RTK_REMINDER_RATE_MS ?? "", 10);
  const effectiveWindow = Number.isFinite(windowMs) && windowMs >= 0 ? windowMs : RATE_WINDOW_MS_DEFAULT;
  if (effectiveWindow > 0) {
    const state = loadRateState();
    const now = Date.now();
    if (!shouldNagNow(decision.base, state, now, effectiveWindow)) {
      emit(null);
      return;
    }
    saveRateState(recordNag(decision.base, state, now, effectiveWindow));
  }
  emit(buildReminder(decision.base));
}

if (process.argv[1]?.endsWith("rtk-prefix-reminder.mjs")) {
  main().catch(() => emit(null));
}
