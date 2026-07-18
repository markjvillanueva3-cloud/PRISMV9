#!/usr/bin/env node
// tier: T2
/**
 * stale-slot-cron-advisory.mjs -- SESSION-CONTINUITY-FIX/U-STALE-SLOT-CRON-ADVISORY
 * (2026-06-18, slot:alpha)
 *
 * ROOT CAUSE this closes -- the "you keep checking back into <slot>" thrash:
 *   A durable autonomous-loop cron (in `.claude/scheduled_tasks.json`, created
 *   by `/loop` / `/startup-<slot> /loop`) persists across sessions. When the
 *   session that created it later REBINDS to a different slot (e.g. a terminal
 *   churned alpha -> papa -> alpha via /startup-papa), the stale cron keeps
 *   firing `/startup-<oldslot>` -- which force-claims (`--force true`) that slot
 *   into whatever session is active. Nothing reaps it: the prior resolver fixes
 *   (claimSlot one-owner, ps-window-pin, slot-resolve-shared) fixed WHICH slot
 *   RESOLVES, but none touched the SCHEDULER, which is the active re-trigger.
 *
 *   Live example (2026-06-18): cron 1b150d99 `/startup-papa ...` was created by
 *   session 14b038a1 while it was transiently papa; 14b038a1 then rebound to
 *   alpha. The cron fired `/startup-papa` twice an hour into the alpha terminal
 *   forever -- the operator's "keep checking back into papa".
 *
 * WHAT THIS DOES (advisory, never destructive):
 *   A SessionStart hook reads `.claude/scheduled_tasks.json` (durable crons --
 *   the persistent recurrence vector; session-only crons die with the session)
 *   + `chat-slots.json`, parses each cron's TARGET slot from its prompt, and
 *   flags two stale conditions:
 *     1. target-slot-unclaimed -- the cron targets slot S but slots[S] is null
 *        (no live terminal owns S; the cron would force-claim a vacancy).
 *     2. creator-rebound      -- the creating session now owns a DIFFERENT slot
 *        than the cron targets (it churned away; the cron would force-STEAL the
 *        target slot from whoever holds it now).
 *   It EMITS a `CronDelete <id>` plan (the model/operator applies it via the
 *   harness CronDelete tool) -- it never edits the harness scheduler file
 *   directly (same contract as cron-registry-reconcile.mjs: read state, emit a
 *   plan). A node hook cannot call CronDelete; mutating the scheduler's own
 *   state file out-of-band would race the harness.
 *
 * SAFETY (no false-positive deletes):
 *   - Only DURABLE crons are considered (`recurring !== false`); one-shots
 *     auto-delete and are not a cross-session recurrence risk.
 *   - A destructive `CronDelete` command is emitted ONLY when the target slot
 *     was resolved with HIGH confidence (`/startup-<slot>` or `slot:<slot>`).
 *     A low-confidence (bare slot-name) parse yields a soft review note only --
 *     never a destructive command from a fuzzy inference (R12).
 *   - An unresolved target -> never flagged (conservative).
 *   - Verified against the live 5-cron fleet: every durable cron targets a
 *     CLAIMED slot whose owner has not rebound -> 0 flagged (no false positive).
 *
 * Reuses the canonical SLOT_NAMES + canonicalChatId from slot-resolve-shared
 * (no third copy of the fleet list; drift-guarded there against chat-slots.mjs).
 *
 * Knob: PRISM_STALE_SLOT_CRON_ADVISORY_DISABLE=1 (silences the hook entirely).
 *
 * @see .claude/helpers/cron-registry-reconcile.mjs  -- golf-specific sibling (plan-emit contract)
 * @see .claude/hooks/session-start-auto-resume.mjs   -- co-resident SessionStart resolver
 * @see scripts/lib/slot-resolve-shared.mjs           -- canonical SLOT_NAMES + canonicalChatId
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SLOT_NAMES, canonicalChatId } from "../../scripts/lib/slot-resolve-shared.mjs";

const SLOT_SET = new Set(SLOT_NAMES);

// ---- repo-root derivation (.claude/hooks/ -> repo root) ---------------------
function deriveRepoRoot() {
  try {
    return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  } catch {
    return "H:/prism";
  }
}
const REPO = process.env.PRISM_REPO_ROOT || deriveRepoRoot();
const SCHEDULED_TASKS = join(REPO, ".claude/scheduled_tasks.json");
const CHAT_SLOTS = join(REPO, "state/shared/chat-slots.json");

/**
 * Pure: parse the slot a cron prompt REFERENCES (loose). Retained as an exported
 * utility + for the direct reference-parse contract -- it is NOT the thrash gate.
 * `findStaleSlotCrons` gates on `actuatesSlotClaim` (strict, actuation-only); do
 * NOT re-wire this looser parser back into the gate or the over-flagging
 * false-positive returns (it flagged operator build-loop crons; see 2026-06-19
 * golf fix on `actuatesSlotClaim`).
 *   high confidence -- `/startup-<slot>` (the actuating command) or `slot:<slot>`
 *   low  confidence -- exactly ONE distinct slot-name whole-word elsewhere in
 *                      the prompt (e.g. "[ZULU AUTONOMOUS BUILD LOOP ...]")
 * Returns { slot, confidence } or null when no slot resolves (or 2+ ambiguous
 * bare names -- never guess).
 * @param {string} prompt
 * @param {Set<string>} [slotSet]
 * @returns {{slot:string, confidence:"high"|"low"}|null}
 */
export function parseTargetSlot(prompt, slotSet = SLOT_SET) {
  if (!prompt || typeof prompt !== "string") return null;

  // high-confidence 1: the actuating slash command `/startup-<slot>`
  const m1 = prompt.match(/\/startup-([a-z]+)\b/i);
  if (m1 && slotSet.has(m1[1].toLowerCase())) {
    return { slot: m1[1].toLowerCase(), confidence: "high" };
  }

  // high-confidence 2: an explicit `slot:<slot>` attribution (optional space)
  const m2 = prompt.match(/\bslot:\s*([a-z]+)\b/i);
  if (m2 && slotSet.has(m2[1].toLowerCase())) {
    return { slot: m2[1].toLowerCase(), confidence: "high" };
  }

  // low-confidence fallback: exactly ONE distinct slot-name whole-word present.
  // Iterate SLOT_NAMES (deterministic order) so the single-match result is
  // stable. 2+ distinct -> ambiguous -> null (never guess a destructive target).
  const found = [];
  for (const name of slotSet) {
    if (new RegExp(`\\b${name}\\b`, "i").test(prompt)) found.push(name);
  }
  if (found.length === 1) return { slot: found[0], confidence: "low" };
  return null;
}

/**
 * Pure: parse the slot a cron prompt ACTUATES a force-claim on -- i.e. a prompt
 * that runs `/startup-<slot>` or `/checkin-<slot>` (both force-claim the slot with
 * `--force` on fire; the per-slot wrappers are exactly those names). This is the
 * ONLY cron shape that causes the "keep checking back into <slot>" thrash.
 *
 * A cron that merely REFERENCES or is ATTRIBUTED to a slot (`slot:<slot>`, a bare
 * slot name, "[ZULU AUTONOMOUS BUILD LOOP]", "(slot:romeo)") but does NOT actuate
 * a claim is an operator-armed build-loop that simply continues work in whatever
 * idle session picks it up -- the intended fleet mechanism (operator directive
 * "use harnesses, loops and crons"), NEVER a thrash. Gating on actuation is what
 * keeps the advisory from flagging legitimate operator build crons as deletable
 * (false-positive fixed 2026-06-19, slot:golf -- the advisory had told a golf
 * session to review/delete 4 live operator-armed build-loop crons).
 *
 * Returns { slot, confidence:"high" } (actuation is always explicit) or null.
 * @param {string} prompt
 * @param {Set<string>} [slotSet]
 * @returns {{slot:string, confidence:"high"}|null}
 */
export function actuatesSlotClaim(prompt, slotSet = SLOT_SET) {
  if (!prompt || typeof prompt !== "string") return null;
  // `/startup-<slot>` or `/checkin-<slot>` -- the two force-claim slash wrappers.
  // Scan anywhere in the prompt (a cron may run it mid-script, not just at start).
  const m = prompt.match(/\/(?:startup|checkin)-([a-z]+)\b/i);
  if (m && slotSet.has(m[1].toLowerCase())) {
    return { slot: m[1].toLowerCase(), confidence: "high" };
  }
  // Bare actuation: the wrappers expand to `chat-slots.mjs claim --preferSlot
  // <slot> ... --force`, and `/checkin --preferSlot <slot> --force` is the same
  // force-claim without a per-slot wrapper. A cron hand-rolling either form ALSO
  // thrashes. Require BOTH `--preferSlot <slot>` and `--force` (the claim-stealing
  // combo) to avoid matching a benign advisory `--preferSlot` mention.
  if (/--force\b/i.test(prompt)) {
    const mp = prompt.match(/--preferSlot[=\s]+([a-z]+)\b/i);
    if (mp && slotSet.has(mp[1].toLowerCase())) {
      return { slot: mp[1].toLowerCase(), confidence: "high" };
    }
  }
  return null;
}

/**
 * Pure: given the durable task list + parsed chat-slots, return the stale
 * slot-loop crons. Each finding:
 *   { id, targetSlot, confidence, reason, creatorSlot, createdBySessionId, command }
 *   reason  -- "target-slot-unclaimed" | "creator-rebound"
 *   command -- "CronDelete <id>" for HIGH confidence; null for low (soft note)
 *
 * @param {Array} tasks                 .claude/scheduled_tasks.json `.tasks`
 * @param {{slots?:Object}|null} chatSlots
 * @param {{slotSet?:Set<string>, canonicalChatId?:Function}} [opts]
 * @returns {Array<object>}
 */
export function findStaleSlotCrons(tasks, chatSlots, opts = {}) {
  const slotSet = opts.slotSet || SLOT_SET;
  const canon = opts.canonicalChatId || canonicalChatId;
  const out = [];
  if (!Array.isArray(tasks)) return out;

  const slots = (chatSlots && chatSlots.slots) || {};

  // GROUND-TRUTH GUARD: if chat-slots is missing/unreadable/empty we have NO
  // basis to call any cron stale -- flagging every slot cron as "unclaimed"
  // would be a mass false-positive on a transient read failure. Stay silent;
  // the next session (with a populated chat-slots) re-assesses.
  if (Object.keys(slots).length === 0) return out;

  // creating-session (canonical chatId) -> the slot it currently owns
  const ownedSlotByChatId = new Map();
  for (const [name, st] of Object.entries(slots)) {
    if (st && typeof st === "object" && typeof st.chatId === "string" && st.chatId) {
      ownedSlotByChatId.set(st.chatId, name);
    }
  }

  for (const t of tasks) {
    if (!t || typeof t !== "object") continue;
    // Only durable/recurring crons persist across sessions. A one-shot
    // (recurring === false) auto-deletes after it fires -- not a recurrence risk.
    if (t.recurring === false) continue;
    const id = typeof t.id === "string" && t.id ? t.id : null;
    if (!id) continue;

    // THRASH GATE: a cron causes the "keep checking back into <slot>" thrash ONLY
    // if it ACTUATES a force-claim (`/startup-<slot>` / `/checkin-<slot>`). A cron
    // that merely references/labels a slot (operator-armed "[ZULU AUTONOMOUS BUILD
    // LOOP]" / "(slot:romeo)") just continues work in an idle session -- the
    // intended fleet mechanism, NOT a thrash. Gating here (vs the loose
    // parseTargetSlot REFERENCE parser) is what stopped the advisory flagging 4
    // legitimate operator build-loop crons for deletion (2026-06-19, slot:golf).
    const target = actuatesSlotClaim(t.prompt, slotSet);
    if (!target) continue; // non-actuating cron cannot force-claim -> never flag

    const targetEntry = slots[target.slot];
    const targetClaimed = !!(targetEntry && targetEntry.chatId);

    const creatorChatId = canon(t.createdBySessionId);
    const creatorSlot = creatorChatId ? (ownedSlotByChatId.get(creatorChatId) || null) : null;

    // creator-rebound = the creating session now owns a DIFFERENT slot. That is
    // POSITIVE evidence the cron is abandoned (its author moved on; on fire it
    // would force-STEAL the target slot from whoever holds it now).
    const creatorRebound = !!(creatorSlot && creatorSlot !== target.slot);

    let reason = null;
    if (!targetClaimed) {
      // No live terminal owns the target slot -- the cron force-claims a vacancy.
      reason = "target-slot-unclaimed";
    } else if (creatorRebound) {
      // The creating session churned to a different slot -- force-steal risk.
      reason = "creator-rebound";
    }
    if (!reason) continue;

    // A DESTRUCTIVE CronDelete command requires BOTH a high-confidence target
    // parse AND positive abandonment evidence (creator-rebound). A slot that is
    // merely UNCLAIMED right now with NO rebound evidence may just be a terminal
    // that is momentarily closed and will reopen -- emit a soft REVIEW note, not
    // a delete command (arm-B P2 hardening, 2026-06-18, slot:alpha). The live
    // papa-cron case HAD creator-rebound, so it still gets the command.
    const hardEvidence = creatorRebound;
    out.push({
      id,
      targetSlot: target.slot,
      confidence: target.confidence,
      reason,
      creatorRebound,
      creatorSlot,
      createdBySessionId: typeof t.createdBySessionId === "string" ? t.createdBySessionId : null,
      command: (hardEvidence && target.confidence === "high") ? `CronDelete ${id}` : null,
    });
  }
  return out;
}

/**
 * Pure: render the SessionStart advisory text for a set of findings. Returns ""
 * when there is nothing to surface (silent-when-clean).
 * @param {Array<object>} findings
 * @returns {string}
 */
export function renderAdvisory(findings) {
  if (!Array.isArray(findings) || findings.length === 0) return "";
  const lines = [];
  lines.push("## Stale slot-loop cron(s) detected -- action needed");
  lines.push(
    "A durable cron targets a slot the creating session no longer holds -- on its next fire it " +
    "will force-claim that slot (the \"keep checking back into <slot>\" thrash). Apply the plan:",
  );
  lines.push("");
  for (const f of findings) {
    const why = f.reason === "target-slot-unclaimed"
      ? `targets slot \`${f.targetSlot}\` (UNCLAIMED)`
      : `targets slot \`${f.targetSlot}\` but its creator now owns \`${f.creatorSlot}\``;
    const creator = f.createdBySessionId ? ` -- created by session ${String(f.createdBySessionId).slice(0, 8)}` : "";
    if (f.command) {
      lines.push(`- \`${f.command}\` -- ${why}${creator}`);
    } else {
      // command is null either because the target parse was low-confidence OR
      // (P2) the slot is vacant with no creator-rebound evidence (may reopen).
      const softWhy = f.confidence === "low"
        ? "low-confidence target parse"
        : "slot vacant but creator not rebound -- may reopen";
      lines.push(`- REVIEW cron \`${f.id}\` (${softWhy}) -- ${why}${creator}; verify before \`CronDelete ${f.id}\``);
    }
  }
  lines.push("");
  lines.push("_Source: .claude/scheduled_tasks.json vs chat-slots.json. Disable: PRISM_STALE_SLOT_CRON_ADVISORY_DISABLE=1._");
  return lines.join("\n");
}

// ---- I/O wrapper (fail-soft everywhere) ------------------------------------
function safeReadJson(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function main() {
  if (process.env.PRISM_STALE_SLOT_CRON_ADVISORY_DISABLE === "1") {
    process.stdout.write("{}");
    return;
  }
  let advisory = "";
  try {
    const sched = safeReadJson(SCHEDULED_TASKS);
    const tasks = sched && Array.isArray(sched.tasks) ? sched.tasks
                : Array.isArray(sched) ? sched : [];
    const chatSlots = safeReadJson(CHAT_SLOTS);
    const findings = findStaleSlotCrons(tasks, chatSlots);
    advisory = renderAdvisory(findings);
  } catch {
    advisory = ""; // never break SessionStart
  }
  if (!advisory) {
    process.stdout.write("{}");
    return;
  }
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: advisory,
    },
  }));
}

// CLI guard -- only run main() when executed directly (not when imported by tests).
const invokedDirectly = (() => {
  try {
    return resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "");
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  try { main(); } catch { try { process.stdout.write("{}"); } catch { /* nothing */ } }
}
