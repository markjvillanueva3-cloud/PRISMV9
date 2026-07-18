# TEST-HERMETICITY/U-FIRE2-RACE-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TEST-HERMETICITY]/U-FIRE2-RACE-FIX (slot:alpha): close 2nd-round 3-of-3 blocker — shared-file race in #4 doctrine rate-limiter

**Commit:** `98312e8a08c9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T01:07:08-05:00
**Tags:** test-hermeticity, u-fire2-race-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TEST-HERMETICITY]/U-FIRE2-RACE-FIX (slot:alpha): close 2nd-round 3-of-3 blocker — shared-file race in #4 doctrine rate-limiter

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TEST-HERMETICITY]/U-FIRE2-RACE-FIX (slot:alpha): close 2nd-round 3-of-3 blocker — shared-file race in #4 doctrine rate-limiter

The re-dispatched 3-of-3 ran the doctrine-gate test under PARALLEL load (the
prior env-only fix passed serially but the reviewers caught a deeper race): the
doctrine rate-limit state file is a process-GLOBAL shared file written by every
fleet slot via non-atomic read-modify-write. A concurrent fleet/parallel-test
write clobbered a peer's session key → fire-2 falsely re-emitted (~72% fail under
5-way load). Reviewer C correctly flagged this is a PRODUCTION flaw too (the #4
gate could over-fire on the 26-slot fleet).

Two fixes: (1) PRODUCTION — make _saveDoctrineSeen atomic (per-PID temp+rename,
mirrors the telemetry sidecar 6 lines below, R11) so no torn read; residual
lost-update is bounded+harmless for a best-effort dedup (worst case 1 extra fire,
still ~25x fewer than pre-#4). (2) TEST — _DOCTRINE_RATE_FILE is now env-
overridable (PRISM_DOCTRINE_RATE_FILE); the test points it at a UNIQUE per-process
path so nothing else can touch it.

Proven under the reviewers' own method: doctrine-gate 0/30 fail under 5-way
parallel (was ~72%); #11b 0/16 under 4-way parallel; existing route-suggest test
unchanged (23/5, the 5 Grep fails pre-existing/unrelated).
```

## Files touched (3)
- .claude/hooks/__tests__/mcp-route-suggest-doctrine-gate.test.mjs | 12 +++++++++++-
- .claude/hooks/mcp-route-suggest.mjs                              | 18 +++++++++++++++---
- 2 files changed, 26 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- till ~25x fewer than pre-#4). (2) TEST — _DOCTRINE_RATE_FILE is now env-

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 98312e8a08c9`
- Milestone envelope: `mcp-server/data/milestones/TEST-HERMETICITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._