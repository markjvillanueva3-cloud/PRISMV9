# CONTEXT-RETENTION/U-CONSOLIDATE-TMP-SWEEP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RETENTION]/U-CONSOLIDATE-TMP-SWEEP (slot:alpha): self-clean killed-mid-write tmp orphans — HIGHVALUE-DISCOVERY #11b

**Commit:** `a6aee37203d2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T00:33:24-05:00
**Tags:** context-retention, u-consolidate-tmp-sweep, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RETENTION]/U-CONSOLIDATE-TMP-SWEEP (slot:alpha): self-clean killed-mid-write tmp orphans — HIGHVALUE-DISCOVERY #11b

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RETENTION]/U-CONSOLIDATE-TMP-SWEEP (slot:alpha): self-clean killed-mid-write tmp orphans — HIGHVALUE-DISCOVERY #11b

writeConsolidated's atomic write unlinks its tmp on a CAUGHT failure, but a
process KILLED between writeFileSync and renameSync (fleet-reaper/OOM on a long
consolidate run) orphans the tmp — the catch never runs. 6 such orphans (0-29KB,
5-19d old, state/shared/handoffs/consolidated/) found 2026-06-09. Add
sweepStaleTmpOrphans(dir, maxAge=1h) called inside writeConsolidated so every run
self-cleans; filter is precise (<slot>.md.tmp-<pid>-<ts> only) and the 1h
threshold is far beyond any in-flight write (<1s) so a concurrent peer's live tmp
is never touched. Live-validated: swept the 6 real orphans → 0 remaining. 26/26
tests (2 new: precise-filter + fail-soft/maxAge). Knob
PRISM_CONSOLIDATE_STALE_TMP_MS.
```

## Files touched (3)
- scripts/handoff-consolidate.mjs      | 24 ++++++++++++++++++++++++
- scripts/handoff-consolidate.test.mjs | 30 ++++++++++++++++++++++++++++++
- 2 files changed, 54 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a6aee37203d2`
- Milestone envelope: `mcp-server/data/milestones/CONTEXT-RETENTION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._