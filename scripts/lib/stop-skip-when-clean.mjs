// scripts/lib/stop-skip-when-clean.mjs
// -------------------------------------
// TOKEN-SAVINGS-EXPAND/U-PSN-STOP-SKIP-CLEAN (2026-05-23, slot:alpha)
//
// "Clean session" detector — pure-function lib + safe spawnSync probe.
// A session with NO edits, NO untracked files, and NO new commits has
// nothing for end-of-session ledger Stop hooks to record. Skip them.

import { spawnSync } from "node:child_process";

export function classifyCleanness(probe) {
  if (!probe || typeof probe !== "object") return { clean: false, reason: "no-probe" };
  const dirty = !!(probe.hasEdits || probe.hasUntracked || probe.hasCommits);
  if (dirty) {
    const parts = [];
    if (probe.hasEdits) parts.push("edits");
    if (probe.hasUntracked) parts.push("untracked");
    if (probe.hasCommits) parts.push("commits");
    return { clean: false, reason: `dirty (${parts.join("+")})` };
  }
  return { clean: true, reason: "no-edits-no-commits-no-untracked" };
}

export function shouldSkipHook(hookName, cleanVerdict, skipEligible) {
  if (!cleanVerdict?.clean) return { skip: false, reason: "session-dirty" };
  const eligible = Array.isArray(skipEligible)
    ? skipEligible.includes(hookName)
    : skipEligible instanceof Set
    ? skipEligible.has(hookName)
    : false;
  if (!eligible) return { skip: false, reason: "hook-not-skip-eligible" };
  return { skip: true, reason: `clean-session skip: ${cleanVerdict.reason}` };
}

export function probeGitState(cwd = "H:/prism", options = {}) {
  const out = { hasEdits: false, hasUntracked: false, hasCommits: false };
  try {
    const r = spawnSync("git", ["status", "--porcelain"], {
      cwd, encoding: "utf8", timeout: options.timeoutMs ?? 1500, stdio: ["ignore", "pipe", "ignore"],
    });
    if (r.status !== 0 || !r.stdout) return out;
    for (const line of r.stdout.split("\n")) {
      if (!line) continue;
      const code = line.slice(0, 2);
      if (code.startsWith("??")) out.hasUntracked = true;
      else if (code.trim().length > 0) out.hasEdits = true;
    }
  } catch { /* fail-soft */ }
  return out;
}

export const DEFAULT_SKIP_ELIGIBLE = new Set([
  "stop-session-spend-summary",
  "stop-defer-queue-drain",
  "stop-hook-aggregator",
  "session-consolidate-graph",
  "stop-obsidian-memory-feed",
  "stop-wiki-from-nodes-autopopulate",
]);
