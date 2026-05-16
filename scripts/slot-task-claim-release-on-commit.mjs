#!/usr/bin/env node
// slot-task-claim-release-on-commit.mjs — PER-SLOT-CLAIM-MS0/U-PSC04 (2026-05-16)
//
// Auto-release slot-task claims when a commit ships work for those units.
// Parses the latest commit subject for `[MILESTONE]/U-ID` patterns; if any
// match an active claim owned by this slot+chatId, release the claim.
//
// WIRED via .git/hooks/post-commit (managed block, runs in background, ignored exit).
// Reads the resolved slot+chatId from chat-slots.json — claims released only
// for the chat that just committed. Peer claims untouched.
//
// FAIL-MODES:
//   - commit subject has no [MILESTONE]/U-ID pattern → silent no-op
//   - matched unit not claimed by anyone → silent (already released, expected
//     after a successful commit)
//   - matched unit claimed by a PEER → log to stderr but don't try to release
//     (wrong_owner) — the peer presumably collided on a unit name
//   - slot-task-claim CLI not found → silent no-op (don't break the commit)
//   - any other error → log to stderr, exit 0 (post-commit is best-effort)

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const ROOT = "H:/prism";
const CHAT_SLOTS_PATH = `${ROOT}/state/shared/chat-slots.json`;
const CLAIM_CLI = `${ROOT}/.claude/helpers/slot-task-claim.mjs`;

// Match `[SCOPE-MS#]/U-XX` or `[MAIN] [SCOPE-MS#]/U-XX` or combined `U-XX+U-YY+U-ZZ`.
// Group 1 = milestone, group 2 = unit-id string (may contain `+` for combined).
const SUBJECT_RE = /\[([A-Z][A-Z0-9-]{1,80})\]\/([A-Za-z0-9_+.-]{1,200})/g;

function getCommitSubject() {
  const r = spawnSync("git", ["-C", ROOT, "log", "-1", "--pretty=%s"], { encoding: "utf8" });
  if (r.status !== 0) return null;
  return (r.stdout || "").trim();
}

function getOwnerIdentity() {
  // Find the slot whose chatId is most-recently active (last heartbeat).
  // This is best-effort — if chat-slots.json is missing or stale, we skip.
  if (!existsSync(CHAT_SLOTS_PATH)) return null;
  let parsed;
  try { parsed = JSON.parse(readFileSync(CHAT_SLOTS_PATH, "utf8")); } catch { return null; }
  const slots = parsed?.slots;
  if (!slots || typeof slots !== "object") return null;
  let best = null;
  let bestTime = 0;
  for (const [slotName, slot] of Object.entries(slots)) {
    if (!slot?.chatId || !slot?.lastHeartbeat) continue;
    const t = Date.parse(slot.lastHeartbeat);
    if (Number.isFinite(t) && t > bestTime) {
      bestTime = t;
      best = { slot: slotName, chatId: slot.chatId };
    }
  }
  return best;
}

/**
 * Parse all [MILESTONE]/U-ID patterns from a commit subject, expanding
 * combined `U-A+U-B` into separate unit IDs.
 *
 * @returns Array<string> — full `MILESTONE::U-ID` strings, deduped
 */
export function parseUnitsFromSubject(subject) {
  if (typeof subject !== "string" || subject.length === 0) return [];
  const out = new Set();
  let m;
  SUBJECT_RE.lastIndex = 0;
  while ((m = SUBJECT_RE.exec(subject)) !== null) {
    const milestone = m[1];
    const idChunk = m[2];
    // Split on `+` to handle combined commits like `U-MEMORY-COMPRESS+PERSLOT-WRAP`
    // Each chunk is a single unit ID stem.
    const chunks = idChunk.split("+").map((s) => s.trim()).filter(Boolean);
    for (const chunk of chunks) {
      // The chunk may end with `:` and trailing text — drop everything after `:`
      const id = chunk.split(":")[0].trim();
      if (id.length > 0) out.add(`${milestone}::${id}`);
    }
  }
  return [...out];
}

function releaseClaim(slot, chatId, unitId) {
  const r = spawnSync(process.execPath, [CLAIM_CLI, "release", "--slot", slot, "--chatId", chatId, "--unit", unitId], { encoding: "utf8" });
  // exit 0 = released or not-claimed; exit 1 = wrong_owner; exit >1 = error
  let parsed = null;
  try { parsed = JSON.parse(r.stdout || ""); } catch { /* ignore */ }
  return { status: r.status, json: parsed, stderr: (r.stderr || "").trim() };
}

function main() {
  if (!existsSync(CLAIM_CLI)) return 0;
  const subject = getCommitSubject();
  if (!subject) return 0;
  const units = parseUnitsFromSubject(subject);
  if (units.length === 0) return 0;
  const owner = getOwnerIdentity();
  if (!owner) {
    // Couldn't resolve slot/chatId; can't release safely. Surface but don't fail.
    console.error(`slot-task-claim-release-on-commit: no resolvable slot owner for "${subject.slice(0, 80)}"`);
    return 0;
  }
  let released = 0;
  let skipped = 0;
  for (const unit of units) {
    const r = releaseClaim(owner.slot, owner.chatId, unit);
    if (r.status === 0 && r.json?.ok === true) {
      released++;
    } else if (r.status === 0 && r.json?.reason === "not_claimed") {
      // Expected — claim either never existed or was already released.
      skipped++;
    } else if (r.status === 1 && r.json?.reason === "wrong_owner") {
      console.error(`slot-task-claim-release-on-commit: ${unit} owned by peer (${r.json?.existing?.slot}/${r.json?.existing?.chatId?.slice(7, 15)}) — not releasing`);
    } else if (r.stderr) {
      console.error(`slot-task-claim-release-on-commit: ${unit} → ${r.stderr.slice(0, 200)}`);
    }
  }
  if (released > 0) {
    console.error(`slot-task-claim-release-on-commit: released ${released}/${units.length} claim(s) for ${owner.slot}/${owner.chatId.slice(7, 15)} (skipped ${skipped})`);
  }
  return 0;
}

// Run only when invoked as CLI; tests import parseUnitsFromSubject directly.
import { fileURLToPath } from "node:url";
import path from "node:path";
function isCli() {
  if (!process.argv[1]) return false;
  try {
    return fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
  } catch { return false; }
}
if (isCli()) process.exit(main());
