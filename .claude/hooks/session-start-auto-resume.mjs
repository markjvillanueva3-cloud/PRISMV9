#!/usr/bin/env node
// tier: T0
/**
 * session-start-auto-resume.mjs — Auto-resume after /compact.
 *
 * Problem this solves:
 *   The user observed inconsistent post-compact auto-continue behaviour —
 *   sometimes a fresh post-compact session resumes work without needing
 *   "continue", sometimes it stalls until the user prompts manually. The
 *   inconsistency is because no hook deterministically injects the per-chat
 *   handoff RESUME directive on the SessionStart:compact event.
 *
 *   This hook fixes that: on every SessionStart with source=compact, it
 *   reads the per-chat handoff for this session's stable id and injects the
 *   RESUME directive as additionalContext so the next turn is anchored to
 *   the prior chat's exit state.
 *
 * Wiring:
 *   Wired under a `matcher: "compact"` arm in SessionStart (which only fires
 *   on the compact trigger). Belt-and-suspenders: the hook also self-gates
 *   on stdin.source === "compact" so it's safe to wire under an empty arm.
 *
 * Failure mode policy:
 *   ANY failure (no handoff, parse error, stale handoff, missing helper) is
 *   silent — emits {continue:true,suppressOutput:true}. Auto-resume is a
 *   convenience; we must never block SessionStart over it.
 *
 * Knobs:
 *   PRISM_AUTO_RESUME_DISABLE=1   — disable entirely (emit silent continue)
 *   PRISM_AUTO_RESUME_MAX_AGE_MIN — drop handoffs older than this (default 240)
 *
 * Designed for the 10-chat fleet (alpha..india work slots + juliett hygiene;
 * back-compat: alpha..foxtrot work + golf hygiene). The stable id resolution
 * is fleet-size-agnostic — it uses the first 8 hex of session_id directly.
 */

import fs from "node:fs";
import { spawnSync } from "node:child_process";

const HELPER = "H:/prism/.claude/helpers/per-agent-handoff.mjs";
// Use process.execPath (the real node binary running THIS hook) — never the
// portable-node bash shim, since spawnSync can't exec a #!/bin/bash script on
// Windows. The env override is for tests that want a different node version.
const NODE_BIN = process.env.PRISM_NODE_BIN || process.execPath;

// Constants
const DEFAULT_MAX_AGE_MIN = 240;             // 4 hour staleness threshold
const HELPER_TIMEOUT_MS = 8000;              // per-agent-handoff.mjs read budget
const SESSION_ID_HEX_LEN = 8;                // stable id = first 8 hex of UUID
const MIN_RESUME_BODY_LEN = 8;               // shorter than this = empty placeholder
const MAX_INJECTED_RESUME_BYTES = 6000;      // cap to avoid blowing context

const MAX_AGE_MIN = Number(process.env.PRISM_AUTO_RESUME_MAX_AGE_MIN || DEFAULT_MAX_AGE_MIN);
const SILENCE = { continue: true, suppressOutput: true };

function readStdinSync() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

function emit(o) { process.stdout.write(JSON.stringify(o)); }

function safeSpawn(args, opts = {}) {
  try {
    return spawnSync(NODE_BIN, args, { encoding: "utf-8", timeout: HELPER_TIMEOUT_MS, ...opts });
  } catch { return { status: 1, stdout: "", stderr: "" }; }
}

function getHandoff(stableId) {
  if (!fs.existsSync(HELPER)) return null;
  const r = safeSpawn([HELPER, "read", "--terminal", stableId]);
  if (!r || r.status !== 0 || !r.stdout) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
}

function extractResume(content) {
  if (!content || typeof content !== "string") return null;
  // Markdown handoff format: `## RESUME` section.
  const m = content.match(/##\s*RESUME\s*\n([\s\S]*?)(?:\n##\s|\n```|\n---\s*$|$)/i);
  if (!m) return null;
  const body = m[1].trim();
  if (!body || body.length < MIN_RESUME_BODY_LEN) return null;
  // Cap injected size — RESUMEs longer than the cap get truncated with a marker.
  if (body.length > MAX_INJECTED_RESUME_BYTES) {
    return body.slice(0, MAX_INJECTED_RESUME_BYTES) + "\n\n…[truncated — full RESUME in handoff file]";
  }
  return body;
}

function ageMinutesFromFrontmatter(content) {
  if (!content) return null;
  const m = content.match(/written_at:\s*['"]?([0-9T:.\-Z]+)['"]?/);
  if (!m) return null;
  const t = Date.parse(m[1]);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 60000;
}

function stableIdFromSession(sid) {
  if (!sid || typeof sid !== "string") return null;
  // Stable id = "claude-" + leading 8 hex chars of UUID
  const hex = sid.replace(/[^0-9a-f]/gi, "").toLowerCase().slice(0, SESSION_ID_HEX_LEN);
  if (hex.length !== SESSION_ID_HEX_LEN) return null;
  return `claude-${hex}`;
}

function main() {
  if (process.env.PRISM_AUTO_RESUME_DISABLE === "1") { emit(SILENCE); return; }

  const stdin = readStdinSync() || {};
  // Source detection — Claude Code passes `source` in SessionStart stdin
  // (startup | resume | compact | clear). Self-gate so the hook is harmless
  // if wired under an empty matcher.
  const source = stdin.source || stdin.trigger || "";
  if (source !== "compact") { emit(SILENCE); return; }

  const stable = stableIdFromSession(stdin.session_id);
  if (!stable) { emit(SILENCE); return; }

  const handoff = getHandoff(stable);
  if (!handoff?.ok || !handoff?.content) { emit(SILENCE); return; }

  const age = ageMinutesFromFrontmatter(handoff.content);
  if (age != null && age > MAX_AGE_MIN) {
    // Handoff exists but is stale — surface a soft hint, don't auto-resume
    emit({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: `## 🔁 Post-compact handoff is STALE (${Math.round(age)}m old, threshold ${MAX_AGE_MIN}m)\n\nThe per-chat handoff file (${handoff.file || "?"}) is older than the auto-resume threshold. Treat this as a fresh session — re-read CLAUDE.md context, run /checkin, then decide next action.`,
      },
    });
    return;
  }

  const resume = extractResume(handoff.content);
  if (!resume) { emit(SILENCE); return; }

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: [
        `## 🔁 AUTO-RESUME after /compact (per-chat handoff)`,
        ``,
        `Handoff file: ${handoff.file || "?"}`,
        `Age: ${age != null ? Math.round(age) + "m" : "unknown"}`,
        ``,
        `**Resume directive:**`,
        ``,
        resume,
        ``,
        `*Proceed without asking unless the directive conflicts with the user's most recent message. If the user already gave a fresh instruction in their first post-compact message, that takes priority.*`,
      ].join("\n"),
    },
  });
}

try { main(); } catch { emit(SILENCE); }
