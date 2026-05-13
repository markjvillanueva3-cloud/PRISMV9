#!/usr/bin/env node
// tier: T2
/**
 * harness-audit-staleness — SessionStart hook.
 *
 * Surfaces a non-blocking reminder if the harness security audit hasn't run
 * cleanly in the last 7 days. Reads timestamp from
 * mcp-server/data/state/HARNESS_AUDIT_LAST_RUN.json (written by /harness-security-audit).
 *
 * Adopted from `everything-claude-code/AgentShield` cadence pattern (MIT, 2026-04-27).
 */

import { shouldSkipHook as _hp_shouldSkip } from "../helpers/hook-profile.mjs";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const STALE_AFTER_DAYS = 7;
const STATE_FILE = "mcp-server/data/state/HARNESS_AUDIT_LAST_RUN.json";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function findProjectRoot() {
  // Walk up from cwd looking for the marker file `.claude/settings.json`
  let cur = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return process.cwd();
}

function getLastRunDays(projectRoot) {
  const p = path.join(projectRoot, STATE_FILE);
  if (!fs.existsSync(p)) return Infinity;
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf-8"));
    if (!data.last_clean_run) return Infinity;
    const lastMs = new Date(data.last_clean_run).getTime();
    if (!Number.isFinite(lastMs)) return Infinity;
    const ageMs = Date.now() - lastMs;
    return ageMs / (1000 * 60 * 60 * 24);
  } catch {
    return Infinity;
  }
}

async function main() {
  if (_hp_shouldSkip("harness-audit-staleness")) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Quick stdin drain (SessionStart payload not needed)
  readStdinSafe();

  const root = findProjectRoot();
  const days = getLastRunDays(root);
  if (days <= STALE_AFTER_DAYS) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const ageMsg = days === Infinity
    ? "never run on this checkout"
    : `${Math.round(days)} days since last clean run`;

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext:
        `🔒 Harness security audit is stale (${ageMsg}). ` +
        `Run \`/harness-security-audit\` to scan settings.json, hooks, .mcp.json, and CLAUDE.md ` +
        `for leaked secrets, permission overreach, and softened safety gates.`,
    },
  }));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && path.resolve(fileURLToPath(import.meta.url)) === invokedPath) {
  main().catch(() => {
    console.log(JSON.stringify({ continue: true }));
  });
}

export const metadata = {
  id: "harness-audit-staleness",
  event: "SessionStart",
  blocking: false,
};
