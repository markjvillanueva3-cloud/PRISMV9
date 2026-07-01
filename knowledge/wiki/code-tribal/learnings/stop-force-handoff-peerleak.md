---
title: stop-force-handoff peer-leak -- full-UUID-vs-short-chatId
type: lesson
domain: backend-helper
tags: [stop-hook, peer-leak, session-id, full-uuid, chat-slots, handoff, autonomous-fleet, shared-branch]
commit: U-STOP-FORCE-HANDOFF-PEERLEAK
slot: papa
date: 2026-06-25
related: [session-continuity-stack, handoff-files-must-include-topic-suffix]
---

# stop-force-handoff peer-leak -- full-UUID-vs-short-chatId

## Symptom
A papa chat, after finishing its work, was repeatedly force-continued (`stop-force-loop-continue`) onto a
FOREIGN task -- *"Continue from last commit: ROOT CAUSE ... auto-route ... (sierra) ... slot=?"*. Ending the
loop didn't stick (it re-seeded), and the same boilerplate appeared across many fleet `loop-*.json` files.

## Root cause
`stop-force-handoff.mjs` (fleet-wide Stop safety-net) gets `input.session_id` = the **full harness UUID**
(`a30723cc-3de1-...`), but chat-slots.json + handoff files are keyed by the **short** `claude-<8hex>`.
`resolveSlot(fullUuid)` and `findExistingHandoff(fullUuid)` both miss (`f.includes(fullUuid)` fails -- files
only carry `claude-a30723cc`). With no handoff found, the hook synthesized a resume from `git log -1` on the
**shared** `cad-fusion-live-ms0` branch -- i.e. whatever the FLEET last committed (a peer's commit) -- and a
loop seeder turned that into the loop-state task. Two bugs compounded: (1) the id-shape mismatch, (2)
synthesizing "next work" from a shared-branch HEAD that may be a peer's commit.

## Fix
1. `canonicalChatId(raw)` normalizes full-UUID / bare-8-hex -> `claude-<8hex>` (claude-prefixed unchanged;
   null/non-string passthrough), applied to the resolved session id -> slot + handoff resolve correctly.
2. `lastOwnCommitInfo(slot)` slot-scopes the synthesis source: `git log -1 --grep=(slot:<slot>` anchored on
   the OPENING paren so a peer commit merely MENTIONING the slot never false-matches; `synthesizeResume`
   uses the slot-own commit, else a generic non-leaking fallback -- NEVER the shared-branch HEAD.
3. `__isMain` guard so the hook is importable for unit tests.
19/19 tests (canonicalChatId matrix + the never-block contract). Sibling `stop-force-loop-continue.mjs` was
already correct (derives the short id from a full UUID).

## Lesson
Any Stop/handoff/loop hook that matches against chat-slots or handoff filenames MUST canonicalize the
harness `session_id` (full UUID) to the fleet-canonical short `claude-<8hex>` BEFORE matching. And never
derive a chat's "next work" from a shared-branch HEAD commit -- slot-scope every git-derived resume to
`(slot:<slot>`, or it leaks a peer's work. Same class as the 9fcda446a1 handoff-append and be9182dca7
precompact peer-leak fixes -- a recurring fleet pattern on the shared multi-chat branch.
