---
name: reference_post_ship_cad-closed-loop-ms0-u-cad-fix-ledger-train
description: Auto-distilled learnings from shipping CAD-CLOSED-LOOP-MS0/U-CAD-FIX-LEDGER-TRAIN (commit e49851323). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.790Z
aliases: reference_post_ship_cad-closed-loop-ms0-u-cad-fix-ledger-train
---


# CAD-CLOSED-LOOP-MS0/U-CAD-FIX-LEDGER-TRAIN

[MAIN] [CAD-CLOSED-LOOP-MS0]/U-CAD-FIX-LEDGER-TRAIN (slot:india): CLOSE delta's CAD persist->retrain arc on REAL data. Delta's closed loop persisted 80 verified corrections to cad-fix-training-ledger.jsonl (the DELTA-CONTEXT-LEDGER 'doesn't exist' was STALE -- it DOES, R12) but NOTHING consumed them -> corrections evaporated. New converter (cad-fix-ledger-to-training.mjs, 8/8 tests) reads the REAL ledger schema {part,field,wrong,right,trainsCadGen} -> CAD-gen Alpaca pairs (gate: trainsCadGen; kind-aware, extensible) + producer + advisory source registration -> assembler auto-folds (manifest-driven). VALIDATED LIVE: 80 corrections -> 27 unique CAD-gen pairs (53 dup, 0 invalid) across 5 parts (die/plate/casing/extrude_punch/bracket); fleet corpus 1192->1219, trainingReady true. The CAD generator's LoRA now trains on its own measured mistakes -> self-improving ACROSS sessions (the open arc). Grounded in delta's real compare()/correction-loop output -- no fabricated schema (the L2/L3 lesson).

**Shipped:** 2026-06-11T21:35:45-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[cad-closed-loop-ms0-u-cad-fix-ledger-train]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._