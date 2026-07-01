---
title: slot-task-claim frozen-12 fleet drift
category: lessons
tags: [slot-system, fleet, regression, silent-breakage]
last_verified: 2026-05-20
source: claude-e6145e8b
---

# slot-task-claim VALID_SLOTS frozen-12 drift

**Commit:** `dfd672046a` (SYSTEM-VIZ-HIGH-ROI-MS0/U-SLOT-TASK-CLAIM-DRIFT, slot sierra, 2026-05-20).

## Symptom
Per-slot task claims (`node .claude/helpers/slot-task-claim.mjs claim --preferSlot sierra ...`)
for any slot beyond the original 12 (`november..zulu`, plus `mike`/`zulu`)
were rejected with exit code 2 ("invalid args"). The reaper, advisory Stop
hook, and `/pick-unit --slot` filtering all silently under-counted the fleet.

## Root cause
`slot-task-claim.mjs` hard-coded `VALID_SLOTS = new Set([... 12 names ...])`.
The fleet expanded 12→26 (`SLOT_NAMES` now 27 entries) on 2026-05-19 via the
SLOT-RECLAIM milestone, but this validator was never updated. The companion
unit test *also* hard-coded `assert.equal(VALID_SLOTS.size, 12)`, so the
suite stayed green — the test encoded the bug.

## Fix
Import the authoritative array: `import { SLOT_NAMES } from "./chat-slots.mjs"`,
then `VALID_SLOTS = new Set(SLOT_NAMES)`. A fail-loud throw guards a
missing/empty export (an empty Set would reject *every* claim — a worse
silent failure). The test now asserts `VALID_SLOTS.size === SLOT_NAMES.length`
— count-agnostic, so the two can never drift again — plus a regression guard
naming the 5 post-expansion slots.

## Rule
Any slot-aware code reads `SLOT_NAMES.length` from `chat-slots.mjs`; never
hard-code the fleet size. A test must not hard-code the same magic number it
is meant to protect — that masks drift instead of catching it. See
[[feedback_fleet_design_10_chats]].
