# QUOTING-SYNERGY-MS0/U-QP-CRON-REAL-CORPUS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-CRON-REAL-CORPUS (slot:charlie /goal /loop iter2): scheduled loop trains on the REAL 47,905-rec corpus + --no-write safety gate

**Commit:** `9970113b3ffa` · **By:** markjvillanueva3-cloud · **At:** 2026-06-02T20:20:53-05:00
**Tags:** quoting-synergy-ms0, u-qp-cron-real-corpus, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-CRON-REAL-CORPUS (slot:charlie /goal /loop iter2): scheduled loop trains on the REAL 47,905-rec corpus + --no-write safety gate

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-CRON-REAL-CORPUS (slot:charlie /goal /loop iter2): scheduled loop trains on the REAL 47,905-rec corpus + --no-write safety gate

The nightly quoting-pipeline wrapper's Stage2 (quoting-train-cycle) trained on
baseline-records-with-synth.json — a 69-record synthetic merge (guard-ADMITTED, so the
scheduled loop wasn't dead, but trivially small), leaving the real 47,905-record JM
corpus (baseline-records-corpus-with-real.json) entirely unused. Repointed Stage2 to the
real corpus (--baseline) with the synth merge as --fallback-corpus belt (re-validated
through the poison-guard; leverages iter1 U-QP-BASELINE-FALLBACK). Stage0/Stage1 still run.

SAFETY (per-file scrutiny P1): added --no-write to both Stage2 branches. The real corpus
is synthetic-revenue-DOMINANT (train-cycle's own advisory: revenue ~= fixed markup over
modeled cost, NOT real outbound; MAPE ~71% = self-consistency). Auto-ACTIVATING a
calibration factor from that into live quotes (active-calibration.json drives quoting) is
unsafe and was reachable on 47,905 records (CoV gates clamp/sanity, NOT revenue-reality).
The loop now TRAINS + measures + feeds PSN (--feed-psn) + drift-alerts (Stage3) WITHOUT
activating. Remove --no-write only when a real-OUTBOUND-validated corpus exists.

OPERATOR: existing installs must re-run install-quoting-pipeline-cron.ps1 ELEVATED to
regenerate run-quoting-pipeline-nightly.ps1 with the real-corpus Stage2.

Installer AST-parse-clean; train-cycle's exact new invocation live-verified (ok:true,
total_predicted=47905, baseline_source=real corpus). 2x per-file scrutiny PASS (1 P1
fixed = the --no-write gate).
```

## Files touched (2)
- scripts/install-quoting-pipeline-cron.ps1 | 21 ++++++++++++++++++---
- 1 file changed, 18 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till run.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9970113b3ffa`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._