#!/usr/bin/env node
// tier: T0
// hooks/pre-commit-conflict-sim.mjs
//
// PreToolUse:Bash hook. Fires on `git commit` and `git push` commands.
// Runs helpers/conflict-predictor.mjs against origin/<base>. If conflicts
// predicted, HARD BLOCKS the commit/push with continueOnError:false and
// surfaces the conflicting files + peer chat owners.
//
// Hybrid enforcement (per design): hard-block on predicted git conflicts
// (the highest-stakes case), soft-warn on phase-claim violations.
//
// Hook input (stdin JSON):
//   { tool_name: "Bash", tool_input: { command: "..." }, ... }
//
// Hook output (stdout JSON):
//   { continue: true|false, decision: "approve"|"block", reason: "..." }

import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRISM_ROOT = path.resolve(__dirname, "..", "..");
const PREDICTOR = path.join(PRISM_ROOT, ".claude", "helpers", "conflict-predictor.mjs");

const COMMANDS_TO_CHECK = [
  /\bgit\s+commit\b/,
  /\bgit\s+push\b/,
];

const COMMANDS_TO_SKIP = [
  /--no-verify\b/,                    // user explicitly opting out
  /\bgit\s+commit\s+--amend\b/,       // amends are local-only by definition
  /\bgit\s+push\s+--dry-run\b/,
  /\bgit\s+push\s+.*\boriginhttps?:\/\//, // odd cases
];

const PREDICTOR_TIMEOUT_MS = 15_000;

function readHookInput() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function approve(reason = "") {
  process.stdout.write(JSON.stringify({ continue: true, decision: "approve", reason }) + "\n");
  process.exit(0);
}

function block(reason) {
  process.stdout.write(JSON.stringify({
    continue: false,
    decision: "block",
    reason,
    systemMessage: reason
  }) + "\n");
  process.exit(0);
}

function shouldCheck(command) {
  if (!command) return false;
  if (COMMANDS_TO_SKIP.some(rx => rx.test(command))) return false;
  return COMMANDS_TO_CHECK.some(rx => rx.test(command));
}

function runPredictor() {
  if (!fs.existsSync(PREDICTOR)) {
    return { skip: true, reason: "predictor missing" };
  }
  try {
    const out = execSync(`node "${PREDICTOR}" check --json`, {
      cwd: PRISM_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: PREDICTOR_TIMEOUT_MS,
    });
    return { ok: true, result: JSON.parse(out) };
  } catch (e) {
    // Exit code 1 = conflict predicted (predictor's contract)
    const out = e.stdout?.toString() || "";
    if (e.status === 1 && out.trim()) {
      try { return { ok: true, result: JSON.parse(out) }; } catch {}
    }
    return { ok: false, err: e.message, exitCode: e.status };
  }
}

const input = readHookInput();
if (!input) approve("no input");

const command = input?.tool_input?.command || "";
if (!shouldCheck(command)) approve("not a commit/push command");

const probe = runPredictor();
if (probe.skip) approve(`skipped: ${probe.reason}`);
if (!probe.ok) {
  // Predictor errored (e.g. not in a repo, fetch failed) — let the commit proceed
  // rather than block on infra problems. Note in stderr for telemetry.
  process.stderr.write(`[pre-commit-conflict-sim] predictor errored (exit ${probe.exitCode}); allowing\n`);
  approve(`predictor errored: ${probe.err?.split("\n")[0] || ""}`);
}

const r = probe.result;
if (!r.conflict) approve(`no conflicts on ${r.base || "origin/main"}`);

// Conflict predicted → BLOCK with full detail
const fileLines = (r.annotated || r.conflict_files || []).slice(0, 10).map(f => {
  if (typeof f === "string") return `  - ${f}`;
  const owner = f.owner ? ` [owner: ${f.owner}, phase: ${f.phase || "-"}]` : "";
  return `  - ${f.file}${owner}`;
});

const more = (r.conflict_files?.length || 0) > 10 ? `  ...and ${(r.conflict_files.length - 10)} more\n` : "";

block(
  `❌ COMMIT/PUSH BLOCKED — conflict predicted vs ${r.base || "origin/main"}\n\n` +
  `Conflicting files:\n${fileLines.join("\n")}\n${more}\n` +
  `Action: run \`/sync-rebase\` to fetch + rebase before retrying.\n` +
  `If a peer chat owns one of these files (see [owner: ...]), coordinate via /chat or /broadcast first.\n` +
  `Bypass (emergency only): append \`--no-verify\` to your git command.`
);
