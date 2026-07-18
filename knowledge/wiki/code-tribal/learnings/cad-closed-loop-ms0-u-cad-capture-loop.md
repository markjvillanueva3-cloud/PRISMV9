# CAD-CLOSED-LOOP-MS0/U-CAD-CAPTURE-LOOP — [MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-CAPTURE-LOOP (slot:india): CLOSE + COMPOUND delta's CAD closed loop -- the capture writer the corpus was missing.

**Commit:** `45ef63b38852` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T23:40:05-05:00
**Tags:** cad-closed-loop-ms0, u-cad-capture-loop, auto-distilled

## Subject
[MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-CAPTURE-LOOP (slot:india): CLOSE + COMPOUND delta's CAD closed loop -- the capture writer the corpus was missing.

## Body
```
[MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-CAPTURE-LOOP (slot:india): CLOSE + COMPOUND delta's CAD closed loop -- the capture writer the corpus was missing.

GAP: the loop MEASURES + CORRECTS + PERSISTS each cycle to a per-run ledger (cad-correction-loop-live-ledger.json: cycle.before.missing + corrections[].op + after.matched), but NOTHING harvested those ledgers -> cad-fix-training-ledger.jsonl had ZERO live writers (its 80 rows were a one-time 2026-05-19 batch) -> corpus frozen, loop could not self-improve.

BUILD: scripts/lib/cad-correction-to-fix-ledger.mjs (pure: correction cycle -> op-enriched fix-ledger rows -- one per before.missing feature, note carries the FIX OP (chamfer-edge 1mm / radial-hole r1.5mm) + the verified after-cycle verdict; richer than the GT-batch rows). scripts/append-cad-corrections-to-fix-ledger.mjs (scans state/shared for correction-loop ledgers, dedup-appends net-new rows keyed part|field|kind|source; rows sourced to the ledger basename -> ADDITIVE to GT-batch rows, idempotent re-runs).

VALIDATED LIVE (R15, the compounding the loop requires): die correction cycle -> fix-ledger 80->82 (2 op-enriched rows appended); re-run -> 0 net-new (idempotent, no double-count); rebuild -> cad-fix dataset 27->29 pairs; assembler folds 'cad-fix-training-corrections: 29 added' -> fleet corpus. A live print correction now flows ALL THE WAY into the fleet LoRA corpus and self-grows per cycle. 16 tests (9 converter + 7 writer, incl idempotency + additive-provenance).

[MAIN-FORCE]: feeds the fleet training corpus (all 34 galaxies). NEXT: presence-only -> dimensional GT for the 100%-accuracy goal; optional cron to run the writer after each delta cycle.
```

## Files touched (7)
- scripts/append-cad-corrections-to-fix-ledger.mjs      | 132 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/append-cad-corrections-to-fix-ledger.test.mjs |  95 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/cad-correction-to-fix-ledger.mjs          | 123 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/cad-correction-to-fix-ledger.test.mjs     | 101 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/cad-fix-training-ledger.jsonl            |  82 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/lora/cad-fix-training-dataset.jsonl      |  29 ++++++++++++++++++++++++++++
- 6 files changed, 562 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 45ef63b38852`
- Milestone envelope: `mcp-server/data/milestones/CAD-CLOSED-LOOP-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._