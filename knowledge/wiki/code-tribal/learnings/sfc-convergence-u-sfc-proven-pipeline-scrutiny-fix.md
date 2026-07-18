# SFC-CONVERGENCE/U-SFC-PROVEN-PIPELINE-SCRUTINY-FIX — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-PROVEN-PIPELINE-SCRUTINY-FIX (slot:oscar): fix 3 P1 data-integrity findings from 3-of-3 scrutiny (A+C FAIL)

**Commit:** `d469dfce8e39` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T13:37:40-05:00
**Tags:** sfc-convergence, u-sfc-proven-pipeline-scrutiny-fix, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-PROVEN-PIPELINE-SCRUTINY-FIX (slot:oscar): fix 3 P1 data-integrity findings from 3-of-3 scrutiny (A+C FAIL)

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-PROVEN-PIPELINE-SCRUTINY-FIX (slot:oscar): fix 3 P1 data-integrity findings from 3-of-3 scrutiny (A+C FAIL)

3-of-3 scrutiny (arms A+C FAIL, B PASS) caught 3 real P1s in the extraction harness:

1. outliersFlagged SHAPE MISMATCH (all 3 arms): the aggregator returns outliersFlagged
   as an Array<{source,value,expected,reason}>, but buildProvenStore persisted it as
   `?? 0` -> the store field (documented/consumed as a count) carried the full array.
   fix: store the COUNT (array.length); test fixture now uses the real array shape and
   asserts the count (R9 -- was green on a scalar the engine never emits). Live: 83 (number).

2. --resume MISSING-CURSOR SILENT WIPE (arm C): the guard `RESUME && existsSync(cursor)`
   fell through to the truncate branch when --resume ran with no cursor -> wiped the
   samples ledger. Triggerable by a relative-cwd path resolution. fix: (a) anchor STATE_DIR
   to the script's mcp-server root (cwd-independent); (b) on --resume NEVER wipe -- if the
   cursor is missing but samples exist, FAIL LOUD (R12) rather than guess. Live: throws.

3. MID-WRITE ROW DUPLICATION (arm C): rows append BEFORE the cursor mark, so a crash
   between leaves orphan rows; on resume the file re-processes and re-appends -> aggregate
   double-counts (no dedup). fix: new pure filterCommittedRows() drops rows whose source
   file is not in the cursor done-set, applied via atomic temp+rename on resume -> resume
   is now idempotent. Live: fresh 616 samples -> resume identical 616 (was a dup risk).

13/13 tests (10 + 3 filterCommittedRows). All 3 fixes validated live. Non-outward-facing.
```

## Files touched (3)
- mcp-server/scripts/extract-jm-proven-speedfeed.mjs      | 56 +++++++++++++++++++++++++++++++++++++++++++++++++++-----
- mcp-server/scripts/extract-jm-proven-speedfeed.test.mjs | 35 +++++++++++++++++++++++++++++++++--
- 2 files changed, 84 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d469dfce8e39`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._