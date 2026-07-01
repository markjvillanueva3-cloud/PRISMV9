#!/usr/bin/env node
// tier: T3
/**
 * slot-session-sidecar-sessionstart.mjs — SessionStart hook (U-SR02)
 *
 * SLOT-RECOVERY-MS0/U-SR02 (2026-05-25, slot:golf)
 * Spec: state/shared/specs/SLOT-RECOVERY-MS0.md §4
 *
 * Records a session-start event in state/shared/slot-sessions/<slot>.jsonl
 * for the current chat. The shared helper handles the crash-inferred
 * invariant — if the prior session's tail isn't session-end, this helper
 * synthesizes a crash-inferred close BEFORE the new session-start.
 *
 * Order: this hook must fire AFTER session-start-terminal-pin.mjs so the
 * chat's slot binding has already been resolved in chat-slots.json. Wire
 * in settings.json SessionStart chain after session-start-terminal-pin.
 *
 * Knobs: PRISM_SLOT_SESSION_SIDECAR_DISABLE=1 short-circuits.
 *
 * Exit semantics: NEVER blocks SessionStart. All errors are logged + exit 0.
 */

import { readFileSync } from "node:fs";
import {
  isDisabled,
  recordSessionStart,
  resolveSlotForChatId,
  resolveTranscriptPath,
} from "../helpers/slot-session-sidecar.mjs";

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, "utf-8"));
  } catch {
    return null;
  }
}

function main() {
  if (isDisabled()) {
    process.exit(0);
  }
  const payload = readStdin();
  if (!payload || !payload.session_id) {
    process.exit(0);
  }
  const sessionId = String(payload.session_id);
  const chatId = `claude-${sessionId.slice(0, 8)}`;
  const slot = resolveSlotForChatId(chatId);
  if (!slot) {
    // Slot not yet bound — terminal-pin may not have fired yet, or this is
    // the first SessionStart before /checkin. Silently no-op; the next
    // heartbeat will catch the binding once /checkin lands.
    process.exit(0);
  }
  const result = recordSessionStart({
    slot,
    sessionId,
    chatId,
    transcriptPath: resolveTranscriptPath(sessionId),
  });
  if (!result.ok) {
    process.stderr.write(`[slot-session-sidecar-start] ${result.error}\n`);
    process.exit(0);
  }
  if (result.crashInferred) {
    // Surface to the model that the prior session ended uncleanly.
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: `## ⚠ Crash-inferred prior session for slot ${slot}\nThe previous session ended without writing a clean session-end (likely PC shutdown, OOM, or hard kill). A synthetic crash-inferred close has been recorded. The slot's history sidecar is now consistent. _slot-session-sidecar-sessionstart.mjs (SLOT-RECOVERY-MS0/U-SR02)_`,
      },
    }) + "\n");
  }
  process.exit(0);
}

main();
