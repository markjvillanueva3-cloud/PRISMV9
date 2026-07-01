---
name: reference_papa_stop_force_handoff_peerleak_fix_2026_06_25
description: stop-force-handoff.mjs Stop hook force-continued papa onto a PEER's work (sierra "auto-route") via a full-UUID-vs-short-chatId peer-leak. It got session_id as the FULL harness UUID but chat-slots+handoffs are keyed by short claude-<8hex>, so resolveSlot+findExistingHandoff missed -> slot='?' + handoff-not-found -> it SYNTHESIZED a resume from git-log-1 on the SHARED branch (a peer commit). Fixed: canonicalChatId + slot-scoped synthesis (lastOwnCommitInfo greps (slot:<slot>) + __isMain guard. Committed U-STOP-FORCE-HANDOFF-PEERLEAK, 19/19 tests.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.722Z
aliases: reference_papa_stop_force_handoff_peerleak_fix_2026_06_25
---


# stop-force-handoff peer-leak (full-UUID-vs-short-chatId) -- fixed 2026-06-25 (slot:papa)

## Symptom
After completing my work, `stop-force-loop-continue` repeatedly force-continued THIS papa chat onto a
FOREIGN task: "Continue from last commit: ROOT CAUSE ... auto-route ... (sierra) ... slot=?". Ending the
loop didn't help -- it re-seeded. The same boilerplate text appeared across MANY fleet `loop-*.json` files.

## Root cause
`.claude/hooks/stop-force-handoff.mjs` (Stop hook, fleet-wide safety net) receives `input.session_id` =
the FULL harness UUID (`a30723cc-3de1-4276-...`), but chat-slots.json AND handoff files are keyed by the
SHORT `claude-<8hex>` form. So `resolveSlot(fullUuid)` -> null (slot shows `?`) and
`findExistingHandoff(fullUuid)` -> null (the `f.includes(fullUuid)` match fails because files only carry
`claude-a30723cc`). With no handoff found, the hook fell to `synthesizeResume`, which built a resume from
`git log -1` on the SHARED `cad-fusion-live-ms0` branch -- whatever the FLEET last committed (a sierra
auto-route commit) -- and wrote it as a forced handoff. A loop seeder then turned that resume into the
loop-state task. Same full-UUID-vs-short class as the 9fcda446a1 handoff-append + e81dec5cba env-anchor fixes.

## Fix (committed [MAIN-FORCE] U-STOP-FORCE-HANDOFF-PEERLEAK)
1. `canonicalChatId(raw)` (exported, pure): full-uuid / bare-8-hex -> `claude-<8hex>`; `claude-`-prefixed
   unchanged; null/non-string passthrough. Applied to `resolveSessionId` output so slot + handoff resolve.
2. `lastOwnCommitInfo(slot)`: slot-scope the synthesis source -- `git log -1 --grep=(slot:<slot>` (anchored
   on the OPENING paren so a peer commit MENTIONING the slot, "(slot:india rescuing slot:papa)", never
   false-matches). `synthesizeResume` uses the slot-own commit; else a generic NON-leaking fallback --
   NEVER the shared-branch HEAD.
3. `__isMain` guard at the entry so the hook is importable for unit tests (it self-runs main()+exits otherwise).
Verified: `git log -1 --grep=(slot:papa` returns a papa commit (not sierra); live hook now defers to my fresh
handoff (helper `writer_banned: fresh-live-chat-resume-exists`). 19/19 tests (incl canonicalChatId matrix +
never-block contract). Sibling `stop-force-loop-continue.mjs` was already correct (derives short id at line 151).

## Lesson
A Stop/handoff hook that resolves slot/handoff/loop state MUST canonicalize the harness `session_id`
(full UUID) to the fleet-canonical short `claude-<8hex>` BEFORE matching -- and NEVER synthesize "next work"
from a shared-branch HEAD commit (peer-leak); slot-scope every git-derived resume to `(slot:<slot>`.
Cleanup: ended the foreign loop-state + removed the bug-artifact handoffs (`HANDOFF-Claude-<fulluuid>-unknown-*`).

Linked: [[reference_hs01_env_anchor_fleetwide_2026_06_10]] · [[reference_session_continuity_agentic_2026_06_10]]
(the be9182dca7 shared-tree git-log peer-leak fix this mirrors).
