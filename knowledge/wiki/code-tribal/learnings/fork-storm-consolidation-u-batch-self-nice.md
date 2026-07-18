# FORK-STORM-CONSOLIDATION/U-BATCH-SELF-NICE — [MAIN-FORCE] [FORK-STORM-CONSOLIDATION]/U-BATCH-SELF-NICE (slot:india): Phase-3 -- heavy india batch jobs yield CPU to interactive work

**Commit:** `1a40c35a6904` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T00:25:20-05:00
**Tags:** fork-storm-consolidation, u-batch-self-nice, auto-distilled

## Subject
[MAIN-FORCE] [FORK-STORM-CONSOLIDATION]/U-BATCH-SELF-NICE (slot:india): Phase-3 -- heavy india batch jobs yield CPU to interactive work

## Body
```
[MAIN-FORCE] [FORK-STORM-CONSOLIDATION]/U-BATCH-SELF-NICE (slot:india): Phase-3 -- heavy india batch jobs yield CPU to interactive work

No PRISM scheduled task sets a low OS priority, so the heavy india batch jobs
(GNN retrain ~550MB graph load + eval; node/galaxy embed bursts) compete with
interactive Claude hooks for CPU on the shared Blackwell host. New decoupled
helper scripts/lib/batch-self-nice.mjs::nicifySelf() drops the calling process
to Windows BELOW_NORMAL_PRIORITY_CLASS via os.setPriority so the OS scheduler
lets interactive work preempt it (CPU-priority only; GPU/heap unaffected, which
is the right axis -- interactive contention is CPU + disk-queue). Decoupled from
reaper-self-io-priority.mjs (that helper gates on reaper knobs; a batch job must
not be un-throttled by a reaper kill-switch -- R7). Own knob
PRISM_BATCH_NICE_DISABLE=1; fail-OPEN (a throttle that can't engage never crashes
the job); idempotent; exit-restores NORMAL; non-win32 no-op.

Wired into the 3 india ai-training heavy entry points: nn-graph-retrain-lifecycle
(before runLifecycle, after status/help guards -- only real runs throttle, no
interaction with the heap reexec), build-node-embeddings + build-galaxy-node-
embeddings (top of main; the latter also runs as a retrain step-2c child).
Left tribal-embed-index to its owner (tribal-knowledge domain; india excludes
tribal-tip storage; most regression-prone). NO elevation needed -- a process
lowering its OWN priority requires no admin (unlike Set-ScheduledTask on the
live SYSTEM tasks), so the scheduled-task -Priority edit is redundant and skipped.

VALIDATED: 7/7 hermetic tests (happy/disable/non-win32/throw-fail-open/exit-
restore/idempotent-once/fallback); os.setPriority 0->10 confirmed live; all 3
scripts node --check OK; retrain --status exit 0 (import resolves, fast path
intact).
```

## Files touched (6)
- scripts/build-galaxy-node-embeddings.mjs |  5 +++++
- scripts/build-node-embeddings.mjs        |  4 ++++
- scripts/lib/batch-self-nice.mjs          | 65 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/batch-self-nice.test.mjs     | 94 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/nn-graph-retrain-lifecycle.mjs   |  6 ++++++
- 5 files changed, 174 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1a40c35a6904`
- Milestone envelope: `mcp-server/data/milestones/FORK-STORM-CONSOLIDATION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._