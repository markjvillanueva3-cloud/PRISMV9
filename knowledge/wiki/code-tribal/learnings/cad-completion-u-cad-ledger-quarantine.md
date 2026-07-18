# CAD-COMPLETION/U-CAD-LEDGER-QUARANTINE — [MAIN-FORCE] [CAD-COMPLETION]/U-CAD-LEDGER-QUARANTINE (slot:delta): quarantine 118 pre-fix FALSE-fail records poisoning the CAD closed-loop steering ledger

**Commit:** `1b9e34213255` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T03:22:54-05:00
**Tags:** cad-completion, u-cad-ledger-quarantine, auto-distilled

## Subject
[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-LEDGER-QUARANTINE (slot:delta): quarantine 118 pre-fix FALSE-fail records poisoning the CAD closed-loop steering ledger

## Body
```
[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-LEDGER-QUARANTINE (slot:delta): quarantine 118 pre-fix FALSE-fail records poisoning the CAD closed-loop steering ledger

BLAST-RADIUS of the cad-analyze-step.mjs fix (ee9cbb03de): the CADTrialErrorLearningEngine steering
ledger (mcp-server/data/state/cad-failure-ledger.jsonl) had accumulated learningSignal:"fail" for
EVERY generation before the analyzer existed -- 118 of 123 records are CERTAIN false-fails (the
analyzer that sets the signal was missing -> uniform exit 1). The gen lane's reverse-arrow
(loadLearnedRisk) READS this ledger to steer generation, so the corrupt history was steering the model
away from EVERYTHING. Not heuristic: a `fail` with timestamp < the analyzer-fix commit time
(2026-06-26T07:48:31Z) could only exist when the analyzer was absent (dry-run confirmed 0 post-cutoff
fails).

TOOL: scripts/cad-ledger-quarantine.mjs -- REVERSIBLE (nothing deleted): backs up the full ledger +
writes the 118 quarantined records to a sidecar, then atomically rewrites the live ledger to the 5
trustworthy records (4 pass + 1 real error/no-STEP). Brain-clobber-safe (per the 2026-06-08/10
regressions): fail-LOUD read (never fail-open-empty), backup-verify-before-rewrite, atomic temp+rename,
clobber guards (REFUSE if keep-count 0 or >10% unparseable -- a torn read must never nuke the ledger),
post-write count verify. KEEP errs toward preserving (undateable/non-fail records always kept).

APPLIED + verified on live data: ledger 123 -> 5 records, backup + quarantine sidecar on disk
(reversible). 9/9 hermetic tests (pre/post-cutoff boundary, pass/error always-keep, undateable-keep,
unparseable, the never-empty-the-ledger guard). The steering signal is now honest. Distinct ledger from
cad-fix-training-ledger.jsonl (corrections, india's U-CAD-FIX-LEDGER-TRAIN) -- R8 dedup-checked.
```

## Files touched (3)
- scripts/cad-ledger-quarantine.mjs      | 118 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/cad-ledger-quarantine.test.mjs |  67 +++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 185 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1b9e34213255`
- Milestone envelope: `mcp-server/data/milestones/CAD-COMPLETION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._