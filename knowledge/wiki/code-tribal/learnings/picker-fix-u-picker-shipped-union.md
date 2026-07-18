# PICKER-FIX/U-PICKER-SHIPPED-UNION — [MAIN] [PICKER-FIX]/U-PICKER-SHIPPED-UNION: union git+envelope as shipped-units source of truth

**Commit:** `c84a0c7cbc21` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T19:03:51-05:00
**Tags:** picker-fix, u-picker-shipped-union, auto-distilled

## Subject
[MAIN] [PICKER-FIX]/U-PICKER-SHIPPED-UNION: union git+envelope as shipped-units source of truth

## Body
```
[MAIN] [PICKER-FIX]/U-PICKER-SHIPPED-UNION: union git+envelope as shipped-units source of truth

claude-098ac2aa flagged slot-queue.mjs --pick returning already-shipped units.
Investigation found TWO real bugs:

1. slot-queue.mjs treated MILESTONE_PROGRESS.m.shipped as an array of unit-ids,
   but the field is a NUMBER (the count). Array.isArray() was always false →
   shipped set always empty → every unit appeared unshipped fleet-wide.

2. priority-queue.mjs read m.units[].shipped correctly but missed units that
   are status:complete in the milestone envelope while git-inference (the
   build-milestone-progress.mjs producer) couldn't tag them. Live drift count:
   936 git-inferred + 1437 envelope-complete = 1611 union, with 675 units
   envelope-only (the bug class). 6 of those 675 are in CLEANUP-MS0 alone.

Fix: new shared helper scripts/lib/shipped-units-source-of-truth.mjs that
unions both signals. Both pickers route through it.

Pre-existing priority-queue.test.mjs (7 cases) honored as the legacy in-memory
mode — buildShippedIds(progress) parses the passed object only (no disk read,
no envelope union). buildShippedIds() (no arg) returns the full disk union.
R12-compliant: arg is honored if passed, not silently ignored.

Per-file scrutiny: code-analyzer PASS (8.5/10, 1 P1 milestone-ID collision
risk + 3 P2 deferred to follow-ups). Independent reviewer initial FAIL on P0
(pre-existing test broken by signature change) -> FIXED via legacy-arg honoring
above; 28/28 tests now PASS.

Tests: 21 hermetic in scripts/lib/shipped-units-source-of-truth.test.mjs incl.
fail-on-revert regression oracles (test 18 union both sources, test 21
literal-bug U-CLEANUP-A1-shipped); 7 pre-existing tests in priority-queue
still pass. Plus inventory at state/shared/specs/ECHO-INCOMPLETE-TASKS-INVENTORY
covering all 20 historic echo handoffs.

Deferred follow-ups (per reviewer findings):
  - mtime memoization for Stop-hook hot-path (P1)
  - U-ID pattern gate to prevent milestone-id collision (P1)
  - slot-domain filter in pickNextUnit({slot}) per JULIETT 12-chat (P2)
  - migrate audit-to-units.mjs + envelope-sync-auto.mjs to union helper (P2)

Verified live: priority-queue --pick --slot echo now returns U-CLEANUP-B9
(genuinely unshipped per envelope) instead of U-CLEANUP-A1 (envelope-complete).
Stop-the-line picker bug cleared.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (6)
- .claude/helpers/priority-queue.mjs                 |  40 +++-
- scripts/lib/shipped-units-source-of-truth.mjs      | 151 ++++++++++++
- scripts/lib/shipped-units-source-of-truth.test.mjs | 255 +++++++++++++++++++++
- scripts/slot-queue.mjs                             |  56 ++---
- .../ECHO-INCOMPLETE-TASKS-INVENTORY-2026-05-17.md  | 102 +++++++++
- 5 files changed, 569 insertions(+), 35 deletions(-)

## Lessons surfaced in commit body
- till pass. Plus inventory at state/shared/specs/ECHO-INCOMPLETE-TASKS-INVENTORY

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c84a0c7cbc21`
- Milestone envelope: `mcp-server/data/milestones/PICKER-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._