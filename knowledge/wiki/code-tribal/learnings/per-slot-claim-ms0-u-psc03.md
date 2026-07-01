# PER-SLOT-CLAIM-MS0/U-PSC03 — [MAIN] [PER-SLOT-CLAIM-MS0]/U-PSC03+U-PSC06: checkin Step 12 claim integration + concurrent-race E2E oracle — MILESTONE COMPLETE 6/6

**Commit:** `e752b186ebbf` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T16:23:20-05:00
**Tags:** per-slot-claim-ms0, u-psc03, auto-distilled

## Subject
[MAIN] [PER-SLOT-CLAIM-MS0]/U-PSC03+U-PSC06: checkin Step 12 claim integration + concurrent-race E2E oracle — MILESTONE COMPLETE 6/6

## Body
```
[MAIN] [PER-SLOT-CLAIM-MS0]/U-PSC03+U-PSC06: checkin Step 12 claim integration + concurrent-race E2E oracle — MILESTONE COMPLETE 6/6

Final two units. PER-SLOT-CLAIM-MS0 now 6/6 shipped.

U-PSC03 — /checkin Step 12 autonomous-loop integration (checkin.md):
  - Step 1 Pick now passes `--slot $SLOT --chatId "$STABLE"` to /pick-unit, engaging the U-PSC02 peer-claim filter (units another slot actively holds are excluded from the pool).
  - New step 1a Claim: after picking, claim the unit with `--phase building --ttl-ms 5400000` (90min). On `{"ok":false,"conflict"}` (exit 1, peer won the race window) → loop back to step 1, pick next.
  - Step 5 Commit note: post-commit hook (U-PSC04) auto-releases the claim by parsing the `[SCOPE]/U-ID` subject.
  - Step 6 Tick: added heartbeat refresh for long multi-iteration builds so the TTL doesn't lapse mid-work.
  - Knob PRISM_SLOT_TASK_CLAIM_DISABLE=1 documented (reverts to advisory-lane-only).

U-PSC06 — Real-data concurrent-race E2E oracle (.claude/helpers/slot-task-claim.e2e.test.mjs):
  The hermetic unit tests (slot-task-claim.test.mjs, 41 cases) prove the pure functions but call applyClaim() on an in-memory store — they CANNOT exercise the lockfile RMW (the P0-1 fix). This file spawns genuine concurrent CLI processes:
  - **6 concurrent claims on the SAME unit → exactly 1 winner, 5 conflict losers** (the core mutual-exclusion guarantee the whole milestone exists for — proven, not assumed)
  - persisted store shows exactly the winner's claim
  - expired/released claim reclaimable by a peer
  - same-owner re-claim idempotent (heartbeat refresh, forward-phase)
  - wrong-owner release rejected, claim survives
  - 10 concurrent claims on 10 DIFFERENT units → all 10 succeed (lockfile serializes writes without false-blocking distinct units)
  5/5 PASS (2.5s). Encodes the RGS-TOOL-AUTOINVOKE-MS1 lesson: pure-core + injected-readers MUST ship one real-data E2E test — hermetic fakes don't prove production wiring.

PER-SLOT-CLAIM-MS0 final tally (6/6):
  ✓ U-PSC01 storage + lockfile-guarded CLI (3a8741d4f, 41 tests)
  ✓ U-PSC02 pick-unit peer-claim filter (3a8741d4f)
  ✓ U-PSC03 /checkin Step 12 integration (this commit)
  ✓ U-PSC04 post-commit auto-release (b6f24770c, 10 tests)
  ✓ U-PSC05 Stop-time claims advisory (b6f24770c, 8 tests, wired Stop[0].hooks[12])
  ✓ U-PSC06 concurrent-race E2E oracle (this commit, 5 tests)
  Total: 64 tests across 3 commits. 4 P0s + 9 P1s caught by the per-file scrutiny gate on U-PSC01 and fixed before any downstream unit built on it.

The system is live: 11 HTML units (HTML-COMPANION-MS0 × 4 + HTML-PRIMARY-MS0 × 7) claimed to bravo. Peer /pick-unit --chatId invocations now exclude them. Next session's HTML-COMPANION-MS0 work is locked to bravo and survives /compact via the claim TTL + the autonomous-loop heartbeat.

Verification:
  node --test .claude/helpers/slot-task-claim.test.mjs → 41/41
  node --test .claude/helpers/slot-task-claim.e2e.test.mjs → 5/5
  node --test scripts/slot-task-claim-release-on-commit.test.mjs → 10/10
  node --test .claude/hooks/stop-slot-task-claims-advisory.test.mjs → 8/8
```

## Files touched (3)
- .claude/commands/checkin.md                  |  12 ++-
- .claude/helpers/slot-task-claim.e2e.test.mjs | 152 +++++++++++++++++++++++++++
- 2 files changed, 161 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- note: post-commit hook (U-PSC04) auto-releases the claim by parsing the `[SCOPE]/U-ID` subject.
- wrong-owner release rejected, claim survives
- lesson: pure-core + injected-readers MUST ship one real-data E2E test — hermetic fakes don't prove production wiring.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e752b186ebbf`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-CLAIM-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._