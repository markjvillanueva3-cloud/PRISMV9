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
 */

import { readFileSync } from "node:fs";

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
  // Strip leading FOO=bar style assignments
  while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(work)) {
    work = work.replace(/^\S+\s+/, "");
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
 */
export function buildReminder(baseCmd) {
  const safe = String(baseCmd ?? "command").slice(0, 32);
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
  const payload = await readStdin();
  const cmd = payload?.tool_input?.command;
  const decision = shouldRemind(cmd);
  if (!decision.remind) {
    emit(null);
    return;
  }
  emit(buildReminder(decision.base));
}

if (process.argv[1]?.endsWith("rtk-prefix-reminder.mjs")) {
  main().catch(() => emit(null));
}
