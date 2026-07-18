# CAD-CLOSED-LOOP-MS0/U-CAD-FIX-LEDGER-TRAIN — [MAIN] [CAD-CLOSED-LOOP-MS0]/U-CAD-FIX-LEDGER-TRAIN (slot:india): CLOSE delta's CAD persist->retrain arc on REAL data. Delta's closed loop persisted 80 verified corrections to cad-fix-training-ledger.jsonl (the DELTA-CONTEXT-LEDGER 'doesn't exist' was STALE -- it DOES, R12) but NOTHING consumed them -> corrections evaporated. New converter (cad-fix-ledger-to-training.mjs, 8/8 tests) reads the REAL ledger schema {part,field,wrong,right,trainsCadGen} -> CAD-gen Alpaca pairs (gate: trainsCadGen; kind-aware, extensible) + producer + advisory source registration -> assembler auto-folds (manifest-driven). VALIDATED LIVE: 80 corrections -> 27 unique CAD-gen pairs (53 dup, 0 invalid) across 5 parts (die/plate/casing/extrude_punch/bracket); fleet corpus 1192->1219, trainingReady true. The CAD generator's LoRA now trains on its own measured mistakes -> self-improving ACROSS sessions (the open arc). Grounded in delta's real compare()/correction-loop output -- no fabricated schema (the L2/L3 lesson).

**Commit:** `e49851323db9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T21:35:45-05:00
**Tags:** cad-closed-loop-ms0, u-cad-fix-ledger-train, auto-distilled

## Subject
[MAIN] [CAD-CLOSED-LOOP-MS0]/U-CAD-FIX-LEDGER-TRAIN (slot:india): CLOSE delta's CAD persist->retrain arc on REAL data. Delta's closed loop persisted 80 verified corrections to cad-fix-training-ledger.jsonl (the DELTA-CONTEXT-LEDGER 'doesn't exist' was STALE -- it DOES, R12) but NOTHING consumed them -> corrections evaporated. New converter (cad-fix-ledger-to-training.mjs, 8/8 tests) reads the REAL ledger schema {part,field,wrong,right,trainsCadGen} -> CAD-gen Alpaca pairs (gate: trainsCadGen; kind-aware, extensible) + producer + advisory source registration -> assembler auto-folds (manifest-driven). VALIDATED LIVE: 80 corrections -> 27 unique CAD-gen pairs (53 dup, 0 invalid) across 5 parts (die/plate/casing/extrude_punch/bracket); fleet corpus 1192->1219, trainingReady true. The CAD generator's LoRA now trains on its own measured mistakes -> self-improving ACROSS sessions (the open arc). Grounded in delta's real compare()/correction-loop output -- no fabricated schema (the L2/L3 lesson).

## Body
```
[MAIN] [CAD-CLOSED-LOOP-MS0]/U-CAD-FIX-LEDGER-TRAIN (slot:india): CLOSE delta's CAD persist->retrain arc on REAL data. Delta's closed loop persisted 80 verified corrections to cad-fix-training-ledger.jsonl (the DELTA-CONTEXT-LEDGER 'doesn't exist' was STALE -- it DOES, R12) but NOTHING consumed them -> corrections evaporated. New converter (cad-fix-ledger-to-training.mjs, 8/8 tests) reads the REAL ledger schema {part,field,wrong,right,trainsCadGen} -> CAD-gen Alpaca pairs (gate: trainsCadGen; kind-aware, extensible) + producer + advisory source registration -> assembler auto-folds (manifest-driven). VALIDATED LIVE: 80 corrections -> 27 unique CAD-gen pairs (53 dup, 0 invalid) across 5 parts (die/plate/casing/extrude_punch/bracket); fleet corpus 1192->1219, trainingReady true. The CAD generator's LoRA now trains on its own measured mistakes -> self-improving ACROSS sessions (the open arc). Grounded in delta's real compare()/correction-loop output -- no fabricated schema (the L2/L3 lesson).
```

## Files touched (5)
- scripts/build-cad-fix-training-dataset.mjs        |  80 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/build-fleet-training-corpus-inventory.mjs |  15 +++++++++++++++
- scripts/lib/cad-fix-ledger-to-training.mjs        | Bin 0 -> 4889 bytes
- scripts/lib/cad-fix-ledger-to-training.test.mjs   |  90 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 185 insertions(+)

## Lessons surfaced in commit body
- wrong,right,trainsCadGen} -> CAD-gen Alpaca pairs (gate: trainsCadGen; kind-aware, extensible) + producer + advisory source registration -> assembler auto-folds (manifest-driven). VALIDATED LIVE: 80 corrections -> 27 unique CAD-gen pairs (53 dup, 0 invalid) across 5 parts (die/plate/casing/extrude_punch/bracket); fleet corpus 1192->1219, trainingReady true. The CAD generator's LoRA now trains on its ow
- lesson).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e49851323db9`
- Milestone envelope: `mcp-server/data/milestones/CAD-CLOSED-LOOP-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._