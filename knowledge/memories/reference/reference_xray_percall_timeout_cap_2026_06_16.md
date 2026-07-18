---
name: reference_xray_percall_timeout_cap_2026_06_16
description: "Root-caused + fixed the overnight closed-loop OCR run HANG: the training loop passes --max-time-sec 18000 (the 5h run WINDOW) and that value leaked into the per-VLM-CALL curl --max-time at vision-ensemble-fuse.mjs ocrImageWithModelAsync, so one wedged Ollama call (qwen2.5-coder:32b VRAM contention) froze the whole night instead of dropping that one page. Fix: PER_CALL_MAX_TIME_SEC=600 ceiling. Proven LIVE (curls show --max-time=600). slot:xray 2026-06-16."
type: reference
slot: xray
source: prism-memory
synced: 2026-06-27T20:30:47.276Z
aliases: reference_xray_percall_timeout_cap_2026_06_16
---


# Per-call VLM timeout cap -- the overnight-hang fix (commit d2e20e2e46) -- slot:xray 2026-06-16

## THE HANG (observed)
The reaper-immune nightly OCR run (`PRISM OCR Training Loop` task) wedged: node PID alive at
14MB RSS, log stale, GPU at **1% util** while 83GB VRAM was held, and 2 curl procs stuck with
`--max-time 18000`. The run was dead for the night with cursor at 0.

## ROOT CAUSE (vision-ensemble-fuse.mjs)
`run-ocr-training-loop-overnight.ps1` passes `--max-time-sec 18000` = the **5h run WINDOW**. That
value flowed down through the loop into `ocrImageWithModelAsync`, which used it verbatim as the
per-CALL curl `--max-time`:
`curlAsync(["-s","--max-time", String(a.maxTimeSec || DEFAULT_MAX_TIME_SEC), ...])`.
So a single VLM call that wedged (Ollama busy -- a peer had loaded qwen2.5-coder:32b @ 54GB,
co-resident VRAM pressure) would block for **up to 5 HOURS** instead of failing fast. One wedged
call = the whole overnight run hung. `DEFAULT_MAX_TIME_SEC` was a sane 300, but the explicit
window override blew past it; NO test asserted the per-call timeout.

## THE FIX (commit d2e20e2e46)
`const PER_CALL_MAX_TIME_SEC = 600;` + at the call site:
`const perCallSec = Math.min(Number(a.maxTimeSec) || DEFAULT_MAX_TIME_SEC, PER_CALL_MAX_TIME_SEC);`
A stalled call now dies at ~10min and the run advances (drops that one page, retried next night --
the loop is per-print resumable). Cap is a CEILING not a floor: a caller asking for a shorter
timeout (e.g. 120s) is honored verbatim. +3 regression tests (18000->600 cap / unset->300 default /
120->120 passthrough); 29/29 vision-ensemble-fuse tests green.

## LIVE PROOF (R12 -- not just tested, verified on the running process)
Re-triggered the scheduled task with the fix in place. While CALIBRATE ran I read the live curl
command lines: BOTH ensemble VLM curls (qwen3-vl:8b-instruct + qwen2.5vl:7b) showed
`--max-time = 600`, NOT 18000. GPU at 82-88% util (vs 1% when hung), node alive. The hang class
cannot recur in this run.

## OBSERVABILITY GOTCHA (for the next chat verifying the run)
`ocr-training-loop-live.log` (at `state/shared/ocr-training-loop-live.log`, one level ABOVE the
`ocr-training-loop/` subdir) is **block-buffered** -- node holds ~4-8KB of stdout before flushing,
so a stale log mtime is NOT a hang verdict. Ground-truth liveness = GPU util + active curl count +
node-alive, NOT the log. Hung looks like: GPU ~1% util + curls stuck + log frozen. Healthy looks
like: GPU 80%+ util + 2 active curls (the 2-model ensemble) + node alive.

## STATE AT FIX TIME
Re-run is FRESH: `corpus-train/{processed-cursor,trainset,active-learning-queue}.jsonl` all 0 bytes
(the hung run never emitted past calibration -- nothing wasted). Old pre-stepbore state backed up at
`state/shared/ocr-training-loop/corpus-train-pre-stepbore-backup-20260616/` (never delete). The run
now carries BOTH fixes: the stepped-bore prompt fix ([[reference_xray_stepped_bore_prompt_fix_rerun_2026_06_16]],
commit 84a78522f8) AND this per-call cap. Over ~11 nights it re-OCRs all 7142 distinct prints.

Sibling: [[reference_xray_stepped_bore_prompt_fix_rerun_2026_06_16]] (the prompt fix that triggered
this re-run) + [[reference_xray_ocr_yield_mechanics_2026_06_10]] (pipeline mechanics).
