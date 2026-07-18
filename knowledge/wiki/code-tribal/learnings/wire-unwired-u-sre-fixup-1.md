# WIRE-UNWIRED/U-SRE-FIXUP-1 — [MAIN] [WIRE-UNWIRED]/U-SRE-FIXUP-1: slim-aware test for replay_working_set

**Commit:** `10c0c84c4dbd` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T16:36:36-05:00
**Tags:** wire-unwired, u-sre-fixup-1, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED]/U-SRE-FIXUP-1: slim-aware test for replay_working_set

## Body
```
[MAIN] [WIRE-UNWIRED]/U-SRE-FIXUP-1: slim-aware test for replay_working_set

Per-file scrutiny reviewer B FAIL on U-SRE (commit absorbed into echo's
FORGE-AUDIT subject e5ada2a32c via well-known collision). P0 finding:
`slimResponse()` strips empty arrays per responseSlimmer.ts:24 —
the original test did `[...d.staged, ...d.modified, ...d.untracked]`
which would TypeError on a clean working tree (all three keys absent
after slim). Live PRISM repo always has uncommitted changes so the
test never actually crashed, but the regression risk is real (future
clean-tree CI run reverses verdict for no code reason — same class as
the FLEET-REAPER readDockerHealth top-level-key bug).

Fix: nullish-coalesce staged/modified/untracked to [] at the test boundary
(invariant still executes), AND add an explicit test pinning the
documented slimResponse contract (clean-tree → arrays absent; dirty-tree
→ at least one non-empty). Closes the "hermetic-only" P1 too — the new
test asserts BOTH branches via real round-trip.

Re-ran vitest: 28 → 29 cases, all PASS.

Reviewer B's other concerns:
- "the two helpers _stripHomeDir + _replayMapResult are not the failure
  site" — confirmed; helpers untouched, fix is test-layer only
- "real-data E2E doctrine (MS1 lesson)" — the new slim-contract test IS
  the real-shape fixture (asserts both clean + dirty branches against
  the live working tree)
```

## Files touched (2)
- .../src/__tests__/SessionReplayEngine-wire.test.ts | 39 ++++++++++++++++++----
- 1 file changed, 33 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- till executes), AND add an explicit test pinning the
- lesson)" — the new slim-contract test IS

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 10c0c84c4dbd`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._