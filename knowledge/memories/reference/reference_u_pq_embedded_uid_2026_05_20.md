---
name: u-pq-embedded-uid-2026-05-20
description: "2026-05-20 mike — fix shipped-units union for phase-letter envelope ids (A1/A2/B1/...). Canonical U-ID is embedded in the title (e.g. id:A2, title:'U-REREAD-SIGNAL-FINISH — ...'). The U-only id-gate skipped these, so 23 envelope-completed OBSIDIAN-INTELLIGENCE-MS3 units leaked back into priority-queue pickup. Symmetric extractUnitIdsFromUnit on both ends closes the leak."
aliases: reference_u_pq_embedded_uid_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.242Z
---


**Unit:** [MAIN] [PICKER-LEAK-FIX]/U-PQ-EMBEDDED-UID (slot:mike), 2026-05-20.

**Bug class:** Picker leak — silent close-out re-served. Sibling regression to the 2026-05-17 picker-fix arc ([[reference_picker_shipped_union_slot_domain_2026_05_17]]).

**Root cause:** `scripts/lib/shipped-units-source-of-truth.mjs` filtered envelope `id` fields by `UNIT_ID_RE = /^U-/i`. OBSIDIAN-INTELLIGENCE-MS3 uses **phase-letter ids** (`A1`, `A2`, `B1`, `B2`, ...) with the canonical U-ID carried in the **title** (e.g. `id:"A2"`, `title:"U-REREAD-SIGNAL-FINISH — wire Write|Edit|MultiEdit matcher..."`). `collectCompletedFromEnvelope` skipped every phase-letter id silently, so 23/25 envelope-completed OBSIDIAN units leaked back into pickup. `priority-queue.mjs --pick --slot mike --top 5` re-served `A2`, `B1`, `B2` at the top of the queue despite their envelope status `completed`.

**Fix (3-file commit, pathspec-defended):**
1. `scripts/lib/shipped-units-source-of-truth.mjs` — new exported helper `extractUnitIdsFromUnit(node)` that pulls every canonical U-ID from `id`/`title`/`name`/`description`. `collectCompletedFromEnvelope` uses it on every `status:complete-ish` node, so envelope phase-letter completes correctly contribute their title-embedded U-ID to the shipped set.
2. `.claude/helpers/priority-queue.mjs` `rankUnits` — symmetric: extracts U-IDs from each candidate's `unit_id`/`title`/`name`/`description` and tests EVERY recovered id against the shipped set. Phase-letter candidate `A2` whose title carries `U-REREAD-SIGNAL-FINISH` is now correctly excluded when the shipped set contains either id.
3. `scripts/lib/shipped-units-source-of-truth.test.mjs` — 8 new hermetic cases:
   - `extractUnitIdsFromUnit` — U-shaped id verbatim
   - `extractUnitIdsFromUnit` — phase-letter id with U-ID in title → returns title id only
   - `extractUnitIdsFromUnit` — both U-id and embedded U-id when distinct
   - `extractUnitIdsFromUnit` — non-U id with no embedded U-id → empty set
   - `extractUnitIdsFromUnit` — null / undefined / non-object input never throws
   - `collectCompletedFromEnvelope` — phase-letter `status:complete` unit surfaces via title
   - `collectCompletedFromEnvelope` — pre-existing U-shaped id behavior preserved (regression)
   - `collectCompletedFromEnvelope` — milestone-level non-U id with `status:complete` is still rejected (preserves the 2026-05-17 milestone-id-collision guard)

**Verification:**
- `node --test scripts/lib/shipped-units-source-of-truth.test.mjs` — **55/55 PASS** (47 baseline preserved + 8 new).
- Live: `node .claude/helpers/priority-queue.mjs --pick --slot mike --top 8` no longer surfaces `A2`/`B1`/`B2`/`B3`. `A1` (envelope `in_progress`) and `U-CK11` (pending) correctly remain.

**Files on disk + staged (not yet committed):**
- `H:/prism/scripts/lib/shipped-units-source-of-truth.mjs` (+~30 LOC: new helper + walk update + doctrine comment)
- `H:/prism/.claude/helpers/priority-queue.mjs` (+~10 LOC: import + symmetric extraction in `rankUnits` filter)
- `H:/prism/scripts/lib/shipped-units-source-of-truth.test.mjs` (+~70 LOC: 8 new tests)
- `git diff --cached --stat -- <these 3 paths>` → `9 files changed, 642 insertions(+), 12 deletions(-)` (the 6 extras are peer-staged files that the pathspec commit will NOT absorb)

**Commit blocker:** persistent `.git/index.lock` contention from 5+ active peer chats. Same class of structural blocker documented in [[reference_slot_golf_destructive_reset_2026_05_20]]. Spent >1 extra tick on retries per [[feedback_autonomous_loop_drift_discipline]] — escalated to memory + handoff per doctrine.

**Recovery in next tick / next chat (≤1 command once lock window opens):**
```bash
rtk git -C H:/prism commit -m "[MAIN] [PICKER-LEAK-FIX]/U-PQ-EMBEDDED-UID (slot:mike): recover canonical U-ID from title for phase-letter envelope units

OBSIDIAN-INTELLIGENCE-MS3 carries phase-letter ids (A1, A2, B1, ...) with the
canonical U-ID embedded in the title (e.g. id:'A2', title:'U-REREAD-SIGNAL-FINISH — ...').
The shipped-set's U-only id-gate filtered these out, so 23 envelope-completed
units leaked back into pickup. Symmetric extraction on both ends of the matcher.

- shipped-units-source-of-truth.mjs: new export extractUnitIdsFromUnit()
- priority-queue.mjs rankUnits: also extracts U-IDs from candidate titles
- 8 new hermetic tests (55/55 PASS total, 47 baseline + 8 new)

Live verification: A2/B1/B2 (envelope-completed) no longer surface; A1 (in_progress) + U-CK11 (pending) correctly remain." -- scripts/lib/shipped-units-source-of-truth.mjs scripts/lib/shipped-units-source-of-truth.test.mjs .claude/helpers/priority-queue.mjs
```

If the staged content was nuked by the lock-sweeper (the sweeper unstages whatever was staged at sweep-time), re-stage first:
```bash
rtk git -C H:/prism add scripts/lib/shipped-units-source-of-truth.mjs scripts/lib/shipped-units-source-of-truth.test.mjs .claude/helpers/priority-queue.mjs
```

**Tribal lesson:** The shipped-set source-of-truth library SHOULD have an extractor for embedded ids in titles — not all PRISM milestones follow `id:"U-..."` convention. The 2026-05-17 fix arc ([[reference_picker_shipped_union_slot_domain_2026_05_17]]) addressed the union-from-envelope path but missed this second-axis leak. Going forward, any new milestone envelope that uses non-U-prefixed unit ids MUST embed the canonical U-ID in title/name/description for the picker to filter completes correctly. Alternative: standardize all envelopes to use U-prefixed unit ids (larger refactor, deferred).

**Functional status of fix:** The fix is **ALREADY ACTIVE** in the on-disk helpers — `priority-queue.mjs` re-imports `extractUnitIdsFromUnit` from `shipped-units-source-of-truth.mjs` on every invocation, so the next `--pick` correctly hides envelope-completed phase-letter units even WITHOUT the commit landing. The commit-to-git is just durability for the change.

**Sister memories:**
- [[reference_picker_shipped_union_slot_domain_2026_05_17]] — prior picker-fix arc (envelope status union)
- [[reference_slot_golf_destructive_reset_2026_05_20]] — same lock-contention blocker class
- [[feedback_autonomous_loop_drift_discipline]] — cap anomaly investigation
- [[feedback_high_roi_backend_first_slot_queue]] — picker hygiene IS high-ROI backend-dev work
