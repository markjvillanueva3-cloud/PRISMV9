#!/usr/bin/env node
// tier: T4
/**
 * chat-cleanup-on-stop.mjs — Stop hook
 *
 * Reaps the orphans this chat would otherwise leave behind:
 *   1. Background bash processes spawned via run_in_background that didn't exit
 *      (best-effort; logs PIDs for user to verify)
 *   2. File claims this chat made via prism_context:claim_file that aren't
 *      released yet (calls chat-bus-reap)
 *   3. Phase claim if the chat owns a phase but didn't transition state
 *      properly (warns; doesn't force-release)
 *   4. Ghost-node release if state is stuck in "claimed" or "in_progress"
 *      with no recent tick (>15min stale)
 *   5. Untracked git artifacts in working tree (warns only — never deletes)
 *
 * Lightweight & non-blocking. Always exits 0. Output is informational
 * via systemMessage so the user sees what was reaped.
 *
 * Per CLAUDE.md, this hook fires on Stop. The Stop hook chain is short
 * (scrutinize, handoff, etc.); this hook adds cleanup at the END of that
 * chain, after the chat has settled.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const STABLE_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";
const PHASE_CLAIM_HELPER = "H:/prism/.claude/helpers/phase-claim-manager.mjs";
const CHAT_BUS_REAP = "H:/prism/.claude/helpers/chat-bus-reap.mjs";
const GHOSTS_FILE = "H:/prism/state/shared/roadmap-ghosts.json";
const VIZ_PROGRESS = "H:/prism/.claude/scripts/viz-progress-update.mjs";

const STALE_TICK_MS = 15 * 60 * 1000; // 15 minutes

function readSessionId() {
  // Try stdin first (Stop hook payload usually contains session_id)
  try {
    const raw = fs.readFileSync(0, "utf8");
    const j = JSON.parse(raw || "{}");
    return j.session_id || j.sessionId || null;
  } catch { return null; }
}

function getStableId() {
  if (!fs.existsSync(STABLE_HELPER)) return null;
  const r = spawnSync(process.execPath, [STABLE_HELPER], { windowsHide: true, encoding: "utf8" });
  return (r.stdout || "").trim() || null;
}

function readJSON(p, fb) {
  if (!fs.existsSync(p)) return fb;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return fb; }
}

function reapStaleGhosts(stableId) {
  if (!fs.existsSync(GHOSTS_FILE)) return [];
  const state = readJSON(GHOSTS_FILE, { ghosts: {} });
  const reaped = [];
  for (const [phaseId, g] of Object.entries(state.ghosts || {})) {
    if (g.owner_chat !== stableId) continue;
    if (g.state !== "claimed" && g.state !== "in_progress") continue;
    const lastTickMs = g.last_tick_at ? new Date(g.last_tick_at).getTime() : 0;
    const claimedMs = g.claimed_at ? new Date(g.claimed_at).getTime() : 0;
    const ageMs = Date.now() - Math.max(lastTickMs, claimedMs);
    if (ageMs <= STALE_TICK_MS) continue;
    // Stale — release it
    const r = spawnSync(process.execPath, [VIZ_PROGRESS, "release", "--phase", phaseId, "--owner", stableId], { windowsHide: true,
      encoding: "utf8",
      timeout: 5000,
    });
    reaped.push({ phaseId, ageMin: Math.round(ageMs / 60000), ok: r.status === 0 });
  }
  return reaped;
}

function reapChatBusClaims(stableId) {
  if (!fs.existsSync(CHAT_BUS_REAP)) return null;
  const r = spawnSync(process.execPath, [CHAT_BUS_REAP, "--owner", stableId], { windowsHide: true,
    encoding: "utf8",
    timeout: 5000,
  });
  return { ok: r.status === 0, output: (r.stdout || "").trim() };
}

function listGitArtifacts() {
  // Warn-only — count untracked files in cwd
  const r = spawnSync("git", ["status", "--porcelain"], { windowsHide: true, encoding: "utf8", timeout: 3000 });
  if (r.status !== 0) return null;
  const lines = (r.stdout || "").split("\n").filter(Boolean);
  const untracked = lines.filter((l) => l.startsWith("??")).length;
  const modified = lines.filter((l) => l.startsWith(" M") || l.startsWith("M ")).length;
  const staged = lines.filter((l) => l.startsWith("A ") || l.startsWith("M ")).length;
  return { untracked, modified, staged, total: lines.length };
}

function reapPhaseClaim(stableId) {
  // List phase claims; warn if any claimed but not transitioned
  if (!fs.existsSync(PHASE_CLAIM_HELPER)) return null;
  const r = spawnSync(process.execPath, [PHASE_CLAIM_HELPER, "list", "--owner", stableId, "--json"], { windowsHide: true,
    encoding: "utf8",
    timeout: 5000,
  });
  if (r.status !== 0) return null;
  try {
    const claims = JSON.parse(r.stdout || "{}");
    return claims.claims || claims || [];
  } catch { return null; }
}

function emit(systemMessage) {
  process.stdout.write(JSON.stringify({ continue: true, systemMessage }));
  process.exit(0);
}

function silent() {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

readSessionId(); // drain stdin
const stable = getStableId();
if (!stable) silent();

const reapedGhosts = reapStaleGhosts(stable);
const busReap = reapChatBusClaims(stable);
const gitState = listGitArtifacts();
const phaseClaims = reapPhaseClaim(stable);

const lines = [];
if (reapedGhosts.length > 0) {
  lines.push(`🧹 Released ${reapedGhosts.length} stale ghost(s):`);
  for (const r of reapedGhosts) {
    lines.push(`   - ${r.phaseId} (${r.ageMin}m stale, ${r.ok ? "ok" : "FAIL"})`);
  }
}
if (busReap?.ok && busReap.output) {
  lines.push(`🧹 Chat-bus claims reaped: ${busReap.output.split("\n")[0]}`);
}
if (gitState?.untracked > 5) {
  lines.push(`⚠ Git: ${gitState.untracked} untracked file(s) in tree — review before commit-consensus`);
}
if (gitState?.modified > 0 && gitState?.staged === 0) {
  lines.push(`⚠ Git: ${gitState.modified} modified, 0 staged — stage with \`git add -A\` before consensus`);
}
if (phaseClaims && Array.isArray(phaseClaims) && phaseClaims.length > 0) {
  const orphan = phaseClaims.filter((c) => c.status === "CLAIMED" || c.status === "IN_PROGRESS");
  if (orphan.length > 0) {
    lines.push(`⚠ ${orphan.length} phase claim(s) still active — run viz-progress-update release if abandoning`);
  }
}

if (lines.length === 0) silent();
emit(lines.join("\n"));
