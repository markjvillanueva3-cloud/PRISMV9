#!/usr/bin/env node
// tier: T4
/**
 * stop_on_session_mistake_digest.mjs — Stop hook (non-blocking)
 *
 * On session end, append a 3-line mistake digest to this chat's per-agent
 * handoff file. Reads:
 *   - error-memory.json entries from this session window
 *   - git reflog for revert/reset/checkout-- ops this session
 *   - tool-deny events from telemetry (best effort)
 *
 * Output: append-only block under "## Mistakes & Learnings" in the handoff.
 * Never blocks — purely informational so the next session inherits lessons.
 */
import { readFileSync, existsSync, appendFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const REPO = "H:/prism";
const ERROR_MEMORY = "H:/prism/mcp-server/data/state/error-memory.json";
const STABLE_ID_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";
const PER_AGENT_HANDOFF = "H:/prism/.claude/helpers/per-agent-handoff.mjs";

function parseInput() {
  try { return JSON.parse(readFileSync(0, "utf8")); } catch { return {}; }
}

function pass(msg = "pass") {
  console.log(JSON.stringify({ continue: true, systemMessage: msg }));
}

function git(args) {
  try {
    return execFileSync("git", ["-C", REPO, ...args], { encoding: "utf8", timeout: 5000 });
  } catch { return ""; }
}

function sessionStartMs(transcriptPath) {
  if (transcriptPath && existsSync(transcriptPath)) {
    try { return statSync(transcriptPath).birthtimeMs || statSync(transcriptPath).ctimeMs; } catch {}
  }
  return Date.now() - 4 * 60 * 60 * 1000; // fallback: last 4h
}

function recentErrors(startMs) {
  if (!existsSync(ERROR_MEMORY)) return [];
  try {
    const mem = JSON.parse(readFileSync(ERROR_MEMORY, "utf8"));
    if (!Array.isArray(mem.errors)) return [];
    return mem.errors.filter((e) => {
      const ts = Date.parse(e?.timestamp || "");
      return !Number.isNaN(ts) && ts >= startMs;
    });
  } catch { return []; }
}

function recentReverts(startMs) {
  const reflog = git(["reflog", "--since", new Date(startMs).toISOString(), "--format=%H %gs"]);
  return reflog
    .split(/\r?\n/)
    .filter((l) => /\b(revert|reset|checkout: moving from|checkout HEAD)\b/i.test(l))
    .slice(0, 5);
}

function buildDigest(errors, reverts) {
  const lines = [];
  if (errors.length > 0) {
    const byType = {};
    for (const e of errors) byType[e.type || "?"] = (byType[e.type || "?"] || 0) + 1;
    const breakdown = Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `${t}×${n}`)
      .join(", ");
    lines.push(`- Errors logged: ${errors.length} (${breakdown})`);
  }
  if (reverts.length > 0) {
    lines.push(`- Recovery ops: ${reverts.length} (revert/reset/checkout)`);
  }
  if (lines.length === 0) return null;
  return lines;
}

async function main() {
  const input = parseInput();
  const start = sessionStartMs(input.transcript_path);

  const errors = recentErrors(start);
  const reverts = recentReverts(start);
  const digestLines = buildDigest(errors, reverts);

  if (!digestLines) return pass("clean-session");

  // Find this chat's handoff file
  let handoffPath = null;
  try {
    const stableId = execFileSync("node", [STABLE_ID_HELPER], { encoding: "utf8", timeout: 3000 }).trim();
    if (stableId) {
      handoffPath = resolve(REPO, "state/shared/handoffs", `HANDOFF-${stableId}.md`);
    }
  } catch {}

  if (!handoffPath || !existsSync(handoffPath)) return pass("no-handoff");

  const stamp = new Date().toISOString();
  const block =
    `\n\n## Mistakes & Learnings (auto-digest @ ${stamp})\n` +
    digestLines.map((l) => l).join("\n") +
    `\n_Source: stop_on_session_mistake_digest.mjs_\n`;

  try {
    appendFileSync(handoffPath, block);
    pass(`digest-appended (errors=${errors.length}, reverts=${reverts.length})`);
  } catch {
    pass("append-failed");
  }
}

main().catch(() => pass("error"));
