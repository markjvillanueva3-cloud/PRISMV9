---
name: reference_charlie_cron_stage0_corpus_2026_06_11
description: T4 -- quoting-pipeline cron Stage 0 rewired from poisoned bootstrap to clean from-corpus + latent wrapper cwd bug fixed.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.508Z
aliases: reference_charlie_cron_stage0_corpus_2026_06_11
---


**T4 / U-QP-CRON-STAGE0-CORPUS + U-QP-CRON-CWD-FIX** (slot:charlie, 2026-06-11, commits `32e4a12304` + `199db23e78`). The OPEN-THREADS "poisoned source" claim was VERIFIED REAL (not stale): the quoting-pipeline cron Stage 0 (`scripts/install-quoting-pipeline-cron.ps1` line 76) invoked `quoting-baseline-bootstrap.mjs`, which produces **poisoned** records -- machine names (e.g. "Okuma_Multus_B250II") as `customer`, `machine_class` collapsed to all-mill, `material_iso` always null. The clean drop-in `quoting-baseline-from-corpus.mjs` (built iter58, U-QP-CORPUS-BASELINE) reads the canonical `state/shared/databases/jm-{file-inventory,customers}.jsonl` with real per-file attribution -- validated live: 554,999 inventory rows parsed, **473 real customers** (BIRMINGHAM, HOLOKROME, OPTIMAS...), varied machine_class (mill/lathe), 45% material_iso non-null. Rewired Stage 0 -> from-corpus; legacy bootstrap preserved on disk (never-delete).

**Latent bug found completing T4 (auto-fix-inline):** the generated nightly-wrapper had NO `Set-Location` and `New-ScheduledTaskAction` had NO `-WorkingDirectory`, so the scheduled task runs with cwd=`%windir%\system32`. from-corpus (and bootstrap) resolve their input (`state/shared/databases/*.jsonl`) AND output (`baseline-records.json`) **cwd-relative** -> under System32 they don't exist -> Stage 0 fails. Fixed by emitting `Set-Location '$PrismRoot'` at the top of the generated wrapper (U-QP-CRON-CWD-FIX). Validated via installer `-DryRun` (generated wrapper shows `Set-Location 'H:\prism'` + from-corpus Stage0). 19/19 tests, .ps1 PARSE-OK. This latent cwd bug likely meant the nightly task never ran cleanly (cf OPEN-THREADS S3 "needs operator elevated installer re-run to activate").

**HONEST SCOPE (R12):** the cron's Stage 2 (train-cycle) reads a SEPARATE corpus (`baseline-records-corpus-with-real.json` with `--no-write`), not the `baseline-records.json` Stage 0 emits. Stage 0 feeds Stage 1 (docustrata-pipeline). So this cleans Stage 0's output + makes it runnable; the end-to-end training-quality impact depends on Stage 1's downstream flow (not traced this iter). Operator must re-run the elevated installer to regenerate the wrapper with the fix. See [[reference_charlie_floor_spike_guard_2026_06_11]] (iter 1 of same loop).
