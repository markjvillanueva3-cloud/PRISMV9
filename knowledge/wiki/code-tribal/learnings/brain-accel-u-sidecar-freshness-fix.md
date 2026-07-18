# BRAIN-ACCEL/U-SIDECAR-FRESHNESS-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BRAIN-ACCEL]/U-SIDECAR-FRESHNESS-FIX (slot:papa): close 2-reviewer P2 - corrupt-lock mtime-reclaim (no permanent wedge) + 2 coverage tests

**Commit:** `9b2958118ff5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T14:53:10-05:00
**Tags:** brain-accel, u-sidecar-freshness-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BRAIN-ACCEL]/U-SIDECAR-FRESHNESS-FIX (slot:papa): close 2-reviewer P2 - corrupt-lock mtime-reclaim (no permanent wedge) + 2 coverage tests

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BRAIN-ACCEL]/U-SIDECAR-FRESHNESS-FIX (slot:papa): close 2-reviewer P2 - corrupt-lock mtime-reclaim (no permanent wedge) + 2 coverage tests

Both per-file reviewers PASSED (no P0/P1) but converged on one P2: a torn/corrupt decision-lock JSON made acquireDecisionLock return false FOREVER (the JSON.parse-throws branch never reached the staleness check), wedging fleet-wide sidecar refresh until manual cleanup. Bounded blast radius (refresh is opportunistic; degrades to pre-commit behavior) but a real self-managed-lock robustness gap.

Fix: on corrupt lock JSON, fall back to the lock file's mtime for the staleness/reclaim decision so a single bad write can't wedge refresh; unreadable mtime still treats as held (conservative). +2 tests (corrupt-fresh held / corrupt-stale reclaimed by mtime; ollamaProbe cached once across N Ollama targets). 15/15 green.

DEFERRED (P2, reviewer A, honest): build-graph-index self-re-execs with an 8GB heap; an opportunistic spawn at Stop could collide with this host's commit-time memory pressure. The 20-min cooldown bounds frequency fleet-wide; a free-RAM gate on the master-index spawn is a follow-up.
```

## Files touched (3)
- scripts/lib/sidecar-freshness.mjs      | 15 +++++++++++----
- scripts/lib/sidecar-freshness.test.mjs | 25 +++++++++++++++++++++++++
- 2 files changed, 36 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- til manual cleanup. Bounded blast radius (refresh is opportunistic; degrades to pre-commit behavior) but a real self-managed-lock robustness gap.
- till treats as held (conservative). +2 tests (corrupt-fresh held / corrupt-stale reclaimed by mtime; ollamaProbe cached once across N Ollama targets). 15/15 green.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9b2958118ff5`
- Milestone envelope: `mcp-server/data/milestones/BRAIN-ACCEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._