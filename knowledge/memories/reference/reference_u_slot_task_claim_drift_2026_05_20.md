---
name: reference-u-slot-task-claim-drift-2026-05-20
description: "2026-05-20 sierra commit dfd672046a — slot-task-claim.mjs VALID_SLOTS hard-coded to 12; fleet is 26. Now imports SLOT_NAMES from chat-slots.mjs. Silent-breakage class: post-expansion slots' claims rejected as invalid args."
aliases: reference_u_slot_task_claim_drift_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.244Z
---


## SYSTEM-VIZ-HIGH-ROI-MS0 / U-SLOT-TASK-CLAIM-DRIFT

**Shipped:** 2026-05-20 (slot sierra, /loop), commit `dfd672046a`.

**Bug.** `.claude/helpers/slot-task-claim.mjs` froze `VALID_SLOTS` to a 12-name
Set (`alpha..lima`). The fleet expanded 12→26 on 2026-05-19 ([[reference_slot_reclaim_2026_05_19|SLOT-RECLAIM]],
`SLOT_NAMES` is now 27 incl. `zulu`). Every per-slot task claim for a
post-expansion slot (`november..zulu`, including `sierra` itself) was
silently rejected as invalid args (exit 2). Pure silent-breakage —
`slot-task-claim` passed its own tests because the test *also* hard-coded
`size === 12`, encoding the bug.

**Fix.** `import { SLOT_NAMES } from "./chat-slots.mjs"`; `VALID_SLOTS =
new Set(SLOT_NAMES)`; fail-loud throw if the export is missing/empty
(degrading to an empty Set would reject *every* claim). Test rewritten to
assert `VALID_SLOTS.size === SLOT_NAMES.length` (count-agnostic — can never
drift again) + a regression guard for the 5 post-expansion slots
(`mike/november/sierra/zulu/zulu`). The original 12-name presence check
survives as an anti-regression literal. 42/42 unit + 5/5 e2e PASS; 3-of-3
scrutiny PASS (no P0/P1).

**Lesson.** Same class as the SLOT_NAMES 13→26 doctrine sweep
([[reference_fleet_doctrine_26_2026_05_19]]) and
[[feedback_fleet_design_10_chats]]: any slot-aware code MUST read
`SLOT_NAMES.length` from `chat-slots.mjs`, never hard-code the fleet size.
A test that hard-codes the same magic number masks the drift instead of
catching it.
