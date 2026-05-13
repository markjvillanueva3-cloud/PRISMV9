#!/usr/bin/env node
// tier: T3
/**
 * commit-format-validator.mjs — PostToolUse Bash (P6-U02).
 *
 * Validates the commit subject of a just-executed `git commit -m "..."`
 * against the PRISM commit-format convention:
 *
 *   [SCOPE-MS#]/U-ID: title
 *
 * Examples that PASS:
 *   [CAD-INFRA-MS0]/U-CINF12: aliases
 *   [MAIN] [BP-MS0]/U-BLOB1: tests
 *   [AWARE-MS0]/U-AWARE02: saturation arm
 *   [SCOPE-MS#]/U-XYZ: short title  (with literal #)
 *
 * Examples that WARN:
 *   "fix tests"
 *   "[main]/u-xyz: lowercase"
 *   "WIP: refactor"
 *
 * Soft gate (observer tier) — emits a hint via systemMessage, never blocks.
 * The author can fix the next commit's subject without rewriting history.
 *
 * Disable: PRISM_COMMIT_FORMAT_VALIDATOR=0
 */

import { readFileSync } from "node:fs";

const ENABLED = process.env.PRISM_COMMIT_FORMAT_VALIDATOR !== "0";

/**
 * Recognized PRISM commit subject:
 *   - Optional [MAIN] or other top-level qualifier in brackets
 *   - Required [SCOPE-MS#] in brackets (SCOPE uppercase + optional -MS#)
 *   - REQUIRED /U-ID (was optional in v1 — codex 3-of-3 round 2 caught the
 *     looseness; PRISM convention is "[SCOPE]/U-ID: title", not "[SCOPE]: title")
 *   - Required ": title"
 *   - Subject prefix `Revert "...` is also accepted (revert commits)
 *
 * Captures: { topPrefix?, scope, unitId, title }
 */
const SUBJECT_RE =
  /^(\[[A-Z][A-Z0-9_-]*\]\s+)?\[[A-Z][A-Z0-9_-]*\]\/[A-Z]+(?:-[A-Z0-9_]+)*:\s+\S.+$/;

const REVERT_RE = /^Revert\s+".+"$/;

/**
 * True iff the subject line matches the PRISM convention.
 * Pure function exported for unit tests.
 * @param {string} subject the first line of a commit message
 * @returns {boolean}
 */
export function isValidSubject(subject) {
  if (typeof subject !== "string" || subject.length === 0) return false;
  if (subject.length > 200) return false;  // pragmatic length cap
  return SUBJECT_RE.test(subject) || REVERT_RE.test(subject);
}

/**
 * Extract the -m "..." subject from a git commit command. Handles both
 * single-quoted and double-quoted forms. Returns null when no -m flag is
 * present (e.g. interactive editor commits).
 * @param {string} command
 * @returns {string | null}
 */
export function extractCommitSubject(command) {
  if (typeof command !== "string" || command.length === 0) return null;
  if (!/\bgit\s+commit\b/.test(command)) return null;

  // Heredoc / multi-line: try to capture first line after -m "$(cat <<'EOF'
  const heredocMatch = command.match(/-m\s+"\$\(cat\s+<<\s*['"]?EOF['"]?\s*\n([^\n]+)/);
  if (heredocMatch) return heredocMatch[1].trim();

  // Standard -m "subject" or -m 'subject'
  const doubleQuoted = command.match(/-m\s+"([^"\n]+)"/);
  if (doubleQuoted) return doubleQuoted[1].trim();

  const singleQuoted = command.match(/-m\s+'([^'\n]+)'/);
  if (singleQuoted) return singleQuoted[1].trim();

  return null;
}

function passthrough() {
  process.stdout.write(JSON.stringify({ continue: true }));
}

if (process.env.PRISM_COMMIT_FORMAT_VALIDATOR_AS_LIB === "1") {
  // Library mode for tests — no I/O.
} else if (!ENABLED) {
  passthrough();
  process.exit(0);
} else {
  let input;
  try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); }
  catch { passthrough(); process.exit(0); }

  const toolName = String(input?.tool_name || "");
  if (toolName !== "Bash") {
    passthrough();
    process.exit(0);
  }

  const command = String(input?.tool_input?.command || "");
  const subject = extractCommitSubject(command);

  if (subject === null) {
    // Not a git commit -m, or unsupported quoting — silent passthrough.
    passthrough();
    process.exit(0);
  }

  if (isValidSubject(subject)) {
    passthrough();
    process.exit(0);
  }

  process.stdout.write(JSON.stringify({
    continue: true,
    systemMessage:
      `[commit-format-validator] Commit subject does not match PRISM ` +
      `convention "[SCOPE-MS#]/U-ID: title":\n  > ${subject}\n` +
      `Expected something like: [CAD-INFRA-MS0]/U-CINF12: title — or ` +
      `[MAIN] [SCOPE-MS#]/U-ID: title. ` +
      `(disable: PRISM_COMMIT_FORMAT_VALIDATOR=0)`,
  }));
}
