---
name: reference_cad_capture_loop_2026_06_11
description: "Closed + compounded delta's CAD closed loop - the capture writer that harvests live correction cycles into the training ledger (2026-06-11 slot:india, commit 45ef63b388)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.493Z
aliases: reference_cad_capture_loop_2026_06_11
---


# CAD closed loop CLOSED + COMPOUNDING - the capture writer (2026-06-11, slot:india)

**The gap (the real closed-loop blocker, flagged across two Stop-hook iterations).** Delta's CAD loop
MEASURES (before/after scorePct), CORRECTS (`cycle.corrections[].op`), and PERSISTS each cycle to a
per-run ledger (`state/shared/cad-correction-loop-live-ledger.json`) -- but NOTHING harvested those
ledgers. `cad-fix-training-ledger.jsonl` had ZERO live writers; its 80 rows were a one-time 2026-05-19
batch. So the corpus was frozen: it could be re-batched but never self-grew per print. The earlier
units ([[reference_cad_gt_feature_priors_2026_06_11]] positive priors,
[[reference_delta_cad_fix_ledger_train_shipped_2026_06_11]] the ledger->pairs converter) built the
read+train side but left the CAPTURE side open.

**Shipped (commit `45ef63b388`, [MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-CAPTURE-LOOP):**
- `scripts/lib/cad-correction-to-fix-ledger.mjs` -- pure: correction cycle -> op-enriched fix-ledger
  rows (one per `cycle.before.missing` feature). The note carries the FIX OPERATION
  (chamfer-edge 1mm / radial-hole r1.5mm, from `corrections[].op`) + the verified after-cycle verdict
  -- a RICHER signal than the GT-batch rows ("missing X" alone). Deterministic ts (from the ledger).
- `scripts/append-cad-corrections-to-fix-ledger.mjs` -- the WRITER: scans `state/shared` for
  correction-loop ledgers (cad-*.json with `cycle.before.missing`), dedup-appends net-new rows keyed
  `part|field|kind|source`. Rows sourced to the ledger basename -> ADDITIVE to the GT-batch rows (not a
  same-feature collision), idempotent re-runs. `--apply` / dry-run / `--json`.

**VALIDATED LIVE (R15 -- the compounding the Stop hook demanded, proven with numbers):**
die correction cycle -> fix-ledger **80 -> 82** (2 op-enriched rows appended); re-run -> **0 net-new**
(idempotent, no double-count); rebuild -> cad-fix dataset **27 -> 29 pairs**; assembler folds
`cad-fix-training-corrections: 29 added` -> fleet LoRA corpus (training_ready true, 34 galaxies). A live
print correction now flows ALL THE WAY into the corpus the CAD-gen fine-tune consumes, and self-grows
on every future cycle. 16 tests (9 converter + 7 writer, incl idempotency + additive-provenance).

**Closed-loop status.** print -> OCR -> dims -> CAD-gen -> compare(before/after) -> CORRECT(op) ->
**[capture writer: NEW]** -> fix-ledger -> pairs -> fleet corpus -> retrain. Capture stage now CLOSED.

**Remaining for "100% accuracy 100% everytime":**
1. Presence-only -> DIMENSIONAL ground truth (values + tolerances), not just feature presence -- the
   accuracy ceiling. Needs dimensional GT extraction (the GT catalogs are presence_only today).
2. Optional cron / post-cycle hook to run the writer after each `cad-fusion-correction-loop-live.mjs`
   run so capture is automatic (today it's a manual/scheduled scan -- the mechanism is in place).
3. Only 1 correction-loop ledger exists today (die); growth scales as delta runs the live :18365 loop
   for the other 10 classes (each adds net-new rows via this writer).
