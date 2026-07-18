#!/usr/bin/env node
// tier: T2
/**
 * prompt-rules-inject.mjs — UserPromptSubmit hook
 *
 * Fires on every user prompt. Injects a tiny, cache-friendly "operating
 * rules" brief into the conversation context so Claude stays on task,
 * follows Karpathy discipline, and avoids drift/hallucination even late
 * in long sessions.
 *
 * Design:
 *   - The STATIC portion of the brief is identical byte-for-byte on every
 *     prompt → hits the Anthropic prompt cache, so cost ≈ 0 after turn 1.
 *   - A tiny DYNAMIC tail shows the session's active claim + last commit,
 *     giving the model an anchor for "what are we in the middle of?".
 *   - Complements session-reorient-inject.mjs (which fires every 15 prompts
 *     with a larger brief). This one is a per-prompt nudge, not a reset.
 *   - Hard-capped at 1400 chars (~350 tokens) so injection stays cheap.
 *
 * Output: {"continue": true, "hookSpecificOutput": {"hookEventName":
 * "UserPromptSubmit", "additionalContext": "<brief>"}} — the harness
 * appends `additionalContext` to the prompt context. On failure: {"continue": true} only.
 * (Previously used `message:` which Claude Code silently ignored — bug fixed 2026-04-23.)
 *
 * Skip policy:
 *   - If the user prompt starts with "/" (slash command), skip — slash
 *     commands have their own context and the brief would be redundant.
 *   - If PRISM_DISABLE_RULES_INJECT=1, skip.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

// Rate-limit: the STATIC_BRIEF hits Anthropic prompt cache in theory but
// in practice gets re-injected every turn as a fresh system-reminder.
// Cap at once per RATE_WINDOW_MS per stable session to stop the bleed.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_FILE = path.join(os.tmpdir(), "prism-hook-state", "prompt-rules-inject.last.json");
function loadRate() { try { return JSON.parse(fs.readFileSync(RATE_FILE, "utf8")); } catch { return {}; } }
function saveRate(s) {
  try {
    const d = path.dirname(RATE_FILE);
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(RATE_FILE, JSON.stringify(s));
  } catch { /* ignore */ }
}

const STABLE_ID_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";
const CLAIMS_ROOT = "H:/prism/mcp-server/data/claims";
const HANDOFF_DIR = "H:/prism/state/shared/handoffs";
const MAX_CHARS = 1400;

const STATIC_BRIEF = [
  "## ★ Operating Rules (auto-injected — cache-cached after turn 1)",
  "",
  "**Karpathy discipline** — think → simplify → surgical → goal-driven.",
  "Before writing code: (1) CLASSIFY problem type, (2) name TECHNIQUE, (3) list EDGE CASES, (4) anticipate FAILURE MODES, then write code that handles all of them from line 1. No TODO/FIXME/empty-catch/stubs. Every changed line must trace to the user's request.",
  "",
  "**Anti-drift** — finish in-progress work before starting new work. Check `TaskList` before spawning new tasks. Commit format: `[SCOPE]/U-ID: title`. Physics constants only from `src/physics/constants.ts`. Check `ENGINE_DIGEST.md` before creating any new engine. `duplicationGuardEngine.mustCheckBeforeCreating()` if in doubt.",
  "",
  "**Token budget** — parallel independent tool calls in ONE message · `rtk <cmd>` for bash · MCP dispatcher actions > reimplementation · `Glob`/`Grep` over bash find/grep · `Read` with `offset`/`limit` on large files · don't re-read files you just wrote · delegate broad research to Agent with Explore subagent.",
  "",
  "**Safety gates (TIERED — see `state/shared/omega-thresholds.json`)** — shop-floor output (G-code, feed/speed → real machine): Ω≥0.95, S(x)≥0.98 (five-sigma). Production release: Ω≥0.90, S(x)≥0.95 (four-sigma). Proven-out: Ω≥0.85, S(x)≥0.90. Sim/explore: Ω≥0.70. **Default to `shop_floor` tier when in doubt.** Never inline Kienzle/Taylor/material constants.",
  "",
  "**Authoritative rules** — `H:/prism/CLAUDE.md` (project) + `H:/.claude/CLAUDE.md` (user) are canonical. Slash commands MUST obey both.",
  "",
].join("\n");

function readStdin() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

function currentSessionId() {
  try {
    const r = spawnSync(process.execPath, [STABLE_ID_HELPER], { windowsHide: true, encoding: "utf-8", timeout: 1500 });
    return (r.stdout || "").trim() || null;
  } catch { return null; }
}

function activeClaimFor(sid) {
  if (!sid || !fs.existsSync(CLAIMS_ROOT)) return null;
  try {
    for (const dir of fs.readdirSync(CLAIMS_ROOT)) {
      const p = `${CLAIMS_ROOT}/${dir}/claim.json`;
      if (!fs.existsSync(p)) continue;
      const claim = JSON.parse(fs.readFileSync(p, "utf-8"));
      const owner = String(claim.claimed_by || claim.holder || claim.by || "");
      if (owner.includes(sid) && claim.status !== "completed") {
        return { unit: claim.unit_id || dir, title: claim.title || "", status: claim.status || "in_progress" };
      }
    }
  } catch { /* ignore */ }
  return null;
}

function latestCommit() {
  try {
    const r = spawnSync("git", ["log", "-1", "--pretty=format:%s"], { windowsHide: true, encoding: "utf-8", timeout: 1500, cwd: process.cwd() });
    if (r.status === 0) return (r.stdout || "").trim().slice(0, 120);
  } catch { /* ignore */ }
  return null;
}

function buildDynamic(sid) {
  const parts = [];
  const claim = activeClaimFor(sid);
  if (claim) parts.push(`**Active claim**: \`${claim.unit}\` — ${claim.title} (${claim.status})`);
  const commit = latestCommit();
  if (commit) parts.push(`**Last commit**: ${commit}`);
  if (parts.length === 0) return "";
  return "\n## Session state\n" + parts.join("\n") + "\n";
}

function main() {
  if (process.env.PRISM_DISABLE_RULES_INJECT === "1") {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const raw = readStdin();
  let prompt = "";
  try {
    const j = raw ? JSON.parse(raw) : {};
    prompt = String(j.prompt || j.user_prompt || "").trim();
  } catch { /* ignore */ }

  // For slash commands, inject a compact CLAUDE.md-reference header instead
  // of the full brief. The command's own template provides the action-specific
  // context; we just need to remind that CLAUDE.md rules are authoritative.
  if (prompt.startsWith("/")) {
    const slashBrief = [
      "## ★ Slash-command execution rules",
      "Project `H:/prism/CLAUDE.md` + user `H:/.claude/CLAUDE.md` are authoritative.",
      "Follow Karpathy discipline (classify → simplify → surgical → goal-driven). No stubs, no inline physics constants.",
      "Safety tier: default to `shop_floor` (Ω≥0.95, S(x)≥0.98) unless the command explicitly says otherwise. See `state/shared/omega-thresholds.json`.",
      "Check existing engines via `ENGINE_DIGEST.md` before creating; `duplicationGuardEngine.mustCheckBeforeCreating()` for any new asset.",
    ].join("\n");
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: slashBrief,
      },
    }));
    return;
  }

  const sid = currentSessionId();

  // Rate-limit: skip full brief if we've injected for this session recently.
  const now = Date.now();
  const rateState = loadRate();
  const rateKey = sid || "anon";
  const lastAt = rateState[rateKey] ?? 0;
  if (now - lastAt < RATE_WINDOW_MS) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  rateState[rateKey] = now;
  for (const k of Object.keys(rateState)) {
    if (now - rateState[k] > RATE_WINDOW_MS * 10) delete rateState[k];
  }
  saveRate(rateState);

  const dynamic = buildDynamic(sid);
  let brief = STATIC_BRIEF + dynamic;
  if (brief.length > MAX_CHARS) brief = brief.slice(0, MAX_CHARS) + "\n[… truncated]";

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: brief,
    },
  }));
}

try { main(); } catch { console.log(JSON.stringify({ continue: true })); }
