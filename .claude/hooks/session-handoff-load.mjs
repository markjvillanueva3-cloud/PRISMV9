#!/usr/bin/env node
// tier: T4
/**
 * session-handoff-load.mjs — SessionStart hook
 *
 * AUTO-LOADS THIS chat's per-agent handoff at session start so the user
 * does not need to run /startup just to recover the RESUME directive.
 *
 * Resolution order for the chat instance ID:
 *   1. payload.session_id (Claude Code SessionStart payload)
 *   2. process.env.CLAUDE_SESSION_ID
 *   3. stable-session-id.mjs (PID-anchored fallback — unreliable with concurrent chats)
 *
 * Resolution order for handoff file (delegated to per-agent-handoff.mjs cmdRead):
 *   a. exact HANDOFF-<instance>-<topic>.md (if --topic provided — derived from current branch)
 *   b. exact HANDOFF-<instance>.md
 *   c. newest HANDOFF-<instance>-*.md (topic-suffixed variant for THIS instance)
 *   d. fuzzy: latest HANDOFF in same family (LAST RESORT — flagged with `family-latest`)
 *
 * On (d) older than 15 min, the hook does not surface a stale handoff to avoid
 * cross-chat contamination — instead emits "Fresh session — no handoff for this chat"
 * so the user knows /startup was needed.
 *
 * This hook only EMITS context via systemMessage. It never blocks. It is
 * advisory, fail-open. SessionStart blocking is reserved for setup gates.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const HELPER = "H:/prism/.claude/helpers/per-agent-handoff.mjs";
const STABLE_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";
// Use the same node binary that's running this hook — guaranteed to exist
// and is the one Claude Code's settings.json wires up. Avoids ENOENT on
// Windows where shell-script wrappers without .cmd suffix aren't directly
// invokable via spawnSync.
const NODE_BIN = process.env.PORTABLE_NODE_BIN || process.execPath;
// PRISM-STAB-MS0/U-B4 (2026-05-09): family-latest fuzzy fallback eliminated.
// Setting this to 0 means: never load a handoff that didn't match THIS chat
// exactly (by instance ID and optional topic). The legacy 15-min window was a
// half-measure that still permitted cross-chat contamination during the
// vulnerable interval. Override to non-zero to restore legacy behavior.
const STALE_FAMILY_FALLBACK_MAX_MIN = Number(process.env.PRISM_HANDOFF_FAMILY_FALLBACK_MIN || 0);

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function deriveTopic() {
  // Prefer current branch basename. Branches use the form work/<topic>, meta/<topic>,
  // feat/<topic>; topic enforcement (enforce-handoff-topic.mjs) writes the SAME suffix
  // on Stop, so this gives us a stable read key.
  try {
    const r = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { windowsHide: true,
      cwd: "H:/prism",
      encoding: "utf-8",
      timeout: 3000,
    });
    if (r.status === 0 && r.stdout) {
      const branch = r.stdout.trim();
      const segs = branch.split("/").filter(Boolean);
      if (segs.length > 0) return segs[segs.length - 1].slice(0, 32);
    }
  } catch {
    /* fall through */
  }
  return null;
}

function resolveInstance(payload) {
  if (payload?.session_id) {
    const raw = String(payload.session_id);
    if (raw.startsWith("claude-")) return raw;
    return "claude-" + raw.slice(0, 8);
  }
  if (process.env.CLAUDE_SESSION_ID) {
    const raw = String(process.env.CLAUDE_SESSION_ID);
    if (raw.startsWith("claude-")) return raw;
    return "claude-" + raw.slice(0, 8);
  }
  try {
    const r = spawnSync(NODE_BIN, [STABLE_HELPER], { windowsHide: true,
      encoding: "utf-8",
      timeout: 3000,
    });
    if (r.status === 0 && r.stdout) return r.stdout.trim();
  } catch {
    /* fall through */
  }
  return null;
}

function readHandoff(instance, topic) {
  const args = ["read", "--terminal", instance];
  if (topic) {
    args.push("--topic", topic);
  }
  try {
    const r = spawnSync(NODE_BIN, [HELPER, ...args], { windowsHide: true,
      encoding: "utf-8",
      timeout: 5000,
    });
    if (r.status !== 0 || !r.stdout) return null;
    return JSON.parse(r.stdout.trim());
  } catch {
    return null;
  }
}

function extractResume(markdown) {
  if (!markdown) return null;
  // Match "## RESUME" through the next "## " header or EOF
  const m = markdown.match(/##\s+RESUME\s*\n([\s\S]*?)(?=\n##\s+|$)/i);
  if (!m) return null;
  return m[1].trim();
}

function main() {
  const raw = readStdinSafe();
  let payload = {};
  try {
    if (raw) payload = JSON.parse(raw);
  } catch {
    /* ignore — payload may be missing in some integrations */
  }

  const instance = resolveInstance(payload);
  if (!instance) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const topic = deriveTopic();
  const handoff = readHandoff(instance, topic);

  if (!handoff || !handoff.ok) {
    process.stdout.write(JSON.stringify({
      continue: true,
      systemMessage: `📂 Handoff: fresh session — no prior handoff for ${instance}`,
    }));
    return;
  }

  // PRISM-STAB-MS0/U-B4: family-latest fallback (fuzzy match across chats in
  // the same family) eliminated by default. STALE_FAMILY_FALLBACK_MAX_MIN=0
  // means "any family-latest match is rejected — only exact instance matches
  // count". This guarantees no cross-chat contamination on simultaneous
  // /compact storms. Set PRISM_HANDOFF_FAMILY_FALLBACK_MIN=15 to restore the
  // legacy "load if <15min old" behavior if needed.
  const isFamilyFallback = handoff.matchedBy === "family-latest";
  const ageMin = Number(handoff.age_minutes ?? 0);
  if (isFamilyFallback && ageMin >= STALE_FAMILY_FALLBACK_MAX_MIN) {
    process.stdout.write(JSON.stringify({
      continue: true,
      systemMessage:
        STALE_FAMILY_FALLBACK_MAX_MIN === 0
          ? `📂 Handoff: fresh session for ${instance} (no exact handoff for this chat; family-latest fallback disabled by U-B4 to prevent cross-chat contamination — run /handoff in the originating chat to recover its state)`
          : `📂 Handoff: fresh session for ${instance} (family fallback was ${ageMin}m old — skipped to avoid cross-chat contamination)`,
    }));
    return;
  }

  const resume = extractResume(handoff.content);
  const lines = [];
  lines.push(`📂 Handoff loaded: ${handoff.file} (${handoff.matchedBy}${ageMin ? `, ${ageMin}m old` : ""})`);
  if (resume) {
    // Cap at 400 chars so SessionStart context stays slim
    const trimmed = resume.length > 400 ? resume.slice(0, 397) + "..." : resume;
    lines.push(`▶ RESUME: ${trimmed}`);
  } else {
    lines.push("(no RESUME section — read full handoff via per-agent-handoff.mjs)");
  }

  process.stdout.write(JSON.stringify({
    continue: true,
    systemMessage: lines.join("\n"),
  }));
}

try {
  main();
} catch {
  process.stdout.write(JSON.stringify({ continue: true }));
}
