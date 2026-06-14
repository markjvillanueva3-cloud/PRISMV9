#!/usr/bin/env node
// tier: T1
/**
 * claude-no-delete-files.mjs — PreToolUse Bash hook.
 *
 * Operator-imposed safety lock (2026-05-19): makes file-deletion IMPOSSIBLE for
 * Claude. Hard-blocks every destructive shell pattern by default. The existing
 * asset-deletion-block + bash-destructive-guard hooks only cover named protected
 * paths or warn-not-block — this hook is the deny-by-default layer on top.
 *
 * Bypass (explicit, audited, operator-only):
 *   PRISM_CLAUDE_DELETE_OK=1 <your command>
 * Every bypass appends one line to state/shared/.claude-delete-bypass.jsonl.
 *
 * Why a separate hook (not an edit to the existing two): the existing guards
 * have nuanced warn/block tiers, blast-dampener, and protected-path scopes
 * that are load-bearing. Inverting their semantics fleet-wide would break
 * legitimate cleanup paths (e.g. node_modules wipes, .tmp rotation). This
 * hook adds a NEW strictly-blocking layer that fails closed by default and
 * only opens with an explicit operator override.
 *
 * @module claude-no-delete-files
 */

import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const AUDIT = "H:/prism/state/shared/.claude-delete-bypass.jsonl";

// Destructive patterns — fail-closed list. ORDER MATTERS: more-specific rules
// (e.g. `git rm`) MUST appear before broader ones (`rm`) so they win.
// First hit returns; see findFirstDestructive().
export const DESTRUCTIVE_PATTERNS = [
  // ── More-specific patterns first ──
  { id: "git-rm", re: /\bgit\s+rm\b/ },
  // ── Shell verbs ──
  { id: "rm", re: /\brm\s+(?:-[a-zA-Z]+\s+)*[^\s|&;<>]/ },
  { id: "rmdir", re: /\brmdir\s+[^\s|&;<>]/ },
  { id: "unlink-shell", re: /\bunlink\s+[^\s|&;<>]/ },
  { id: "remove-item", re: /Remove-Item\b/i },
  { id: "del-windows", re: /(^|\s|;|&&)del\s+(?:\/[a-zA-Z]+\s+)*[^\s|&;<>]/i },
  { id: "truncate", re: /\btruncate\s+(?:-\S+\s+)*[^\s|&;]/ },
  { id: "shred", re: /\bshred\b/ },
  // ── Inline scripting (Node) — bare *Sync verbs catch both `fs.unlinkSync` AND
  // `require('fs').unlinkSync` AND `.unlinkSync` (member call). The *Sync
  // suffix is the disambiguator: only fs has these names. ──
  { id: "fs-unlink-js", re: /\bunlinkSync\s*\(/ },
  { id: "fs-rm-js", re: /\brmSync\s*\(/ },
  { id: "fs-rmdir-js", re: /\brmdirSync\s*\(/ },
  // ── Inline scripting (Python) ──
  { id: "os-remove-py", re: /\bos\.(remove|unlink)\s*\(/ },
  { id: "shutil-rmtree-py", re: /\bshutil\.rmtree\b/ },
  // Silent-truncate: `> existing_file` at the START of a line OR after `; && |`
  // matches `> path` but NOT `>> path` (append) or `2>&1` (redirect).
  { id: "truncate-redirect", re: /(?:^|[;&|])\s*>\s+[^\s>]/ },
  // Pipe nothing to a file → also truncates
  { id: "empty-to-file", re: /:\s*>\s+[^\s>]/ },
];

// Narrow exceptions — paths Claude is allowed to delete without bypass.
// Strict regex matches: must apply to the FULL last token of the command,
// not just appear anywhere (catches `rm /tmp/foo` but not `rm important.ts && cd /tmp/`).
export const NARROW_EXCEPTIONS = [
  /\.tmp(\.[a-zA-Z0-9]+)?$/, // *.tmp / *.tmp.PID — atomic-write tmps
  /\.tmp\.\d+(\s|$)/, // *.tmp.<pid>
  /\.bak-\d{8}/, // *.bak-YYYYMMDD-*
  /\/tmp\/[^\s]+/, // anything under /tmp/
  /\$\{?TMPDIR\}?\//, // $TMPDIR/<x>
  /\bnode_modules\b/, // npm cleanups
  /\.lock(\s|$)/, // .lock files (git-lock-sweeper etc)
  /\.lock\.\w+(\s|$)/, // .lock.* (composite locks)
];

export function commandHasException(command) {
  if (!command) return false;
  return NARROW_EXCEPTIONS.some((re) => re.test(command));
}

export function findFirstDestructive(command) {
  if (!command) return null;
  for (const p of DESTRUCTIVE_PATTERNS) {
    if (p.re.test(command)) return p;
  }
  return null;
}

export function logBypass(audit, command, env) {
  try {
    if (!existsSync(dirname(audit))) mkdirSync(dirname(audit), { recursive: true });
    const entry = {
      ts: new Date().toISOString(),
      command: String(command || "").slice(0, 240),
      env: { user: env.USERNAME || env.USER || null, host: env.COMPUTERNAME || env.HOSTNAME || null },
    };
    appendFileSync(audit, JSON.stringify(entry) + "\n");
    return true;
  } catch {
    return false;
  }
}

export function decide(input, env = process.env) {
  const tool_name = input?.tool_name || input?.tool || "";
  if (tool_name !== "Bash") return { action: "continue" };

  const command = input?.tool_input?.command || input?.input?.command || "";
  if (!command || typeof command !== "string") return { action: "continue" };

  const matched = findFirstDestructive(command);
  if (!matched) return { action: "continue" };

  // Exception path — narrow allow-list bypasses the block without operator override
  if (commandHasException(command)) {
    return { action: "continue", matched: matched.id, exception: true };
  }

  // Bypass — operator-set env var, audited
  if (env.PRISM_CLAUDE_DELETE_OK === "1") {
    return { action: "bypass", matched: matched.id, command };
  }

  return { action: "block", matched: matched.id, command };
}

function buildBlockMessage(matched, command) {
  return [
    "🛑 BLOCKED — Claude is forbidden from deleting files (operator-imposed safety lock 2026-05-19)",
    `  Pattern: ${matched}`,
    `  Command: ${String(command).slice(0, 200)}${command.length > 200 ? "..." : ""}`,
    "",
    "  Per operator directive: this hook makes file-deletion impossible for Claude.",
    "  If you genuinely need to delete a file, ask the operator to set:",
    "    PRISM_CLAUDE_DELETE_OK=1 <your command>",
    "  Every bypass is audited to state/shared/.claude-delete-bypass.jsonl",
  ].join("\n");
}

// ── CLI entry — only when invoked as the hook ──
const isMain = (() => {
  try {
    return import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
           import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
  } catch { return false; }
})();

if (isMain) {
  let input;
  try {
    const raw = readFileSync(0, "utf8");
    input = JSON.parse(raw || "{}");
  } catch {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const result = decide(input);

  if (result.action === "bypass") {
    logBypass(AUDIT, result.command, process.env);
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `⚠ claude-no-delete bypass — pattern=${result.matched} (logged to .claude-delete-bypass.jsonl)`,
      },
    }));
    process.exit(0);
  }

  if (result.action === "block") {
    console.log(JSON.stringify({
      decision: "block",
      reason: buildBlockMessage(result.matched, result.command),
    }));
    process.exit(0);
  }

  console.log(JSON.stringify({ continue: true }));
}
