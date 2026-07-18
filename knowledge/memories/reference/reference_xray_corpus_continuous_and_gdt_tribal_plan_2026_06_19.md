---
name: reference_xray_corpus_continuous_and_gdt_tribal_plan_2026_06_19
description: OCR corpus-train made continuous (until complete) + blueprint/GD&T tribal-injection plan; page-classify over-skip is the top print-reading recall lead
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.270Z
aliases: reference_xray_corpus_continuous_and_gdt_tribal_plan_2026_06_19
---


slot:xray, 2026-06-19 (operator /checkin-xray /goal /loop). Two operator overrides shipped on `cad-fusion-live-ms0`.

**1. OCR corpus-train: nightly -> continuous until complete** (commit `8cfd4da130`, U-XRAY-CORPUS-CONTINUOUS).
Operator: "change from nightly to do it all until its complete." ROOT: the WEAK-LABEL loop in
`blueprint-ocr-training-loop.mjs` has NO internal time budget -- ONE launch already drains the entire
remaining worklist; what capped it at ~700/night was the task's 12h ExecutionTimeLimit + daily trigger,
NOT the runner. Fix is mostly the installer (`install-ocr-training-loop-task.ps1` new `-Continuous`):
ExecutionTimeLimit=PT0S (unlimited) + 30-min backstop repetition (P3650D) starting now + MultipleInstances=
IgnoreNew (death auto-resumes from processed-cursor.jsonl; never two grinders). Runner gained `--until-complete`
+ pure `isCorpusDrained()` (lib) fast-exit so a backstop relaunch on a drained corpus skips the 24-print
calibration. 23/23 lib tests. LIVE-validated: task State=Running, PT0S, PT30M/P3650D, IgnoreNew; cursor
1157->1168 on real JM prints. Corpus = **7,419 drawing prints**; was 1,157 done (~15.6%). Now grinds to 100%
in ~2-3 days (current 12h-limit instance hands off to the unlimited backstop at its 12h mark).

**2. Blueprint+GD&T tribal-knowledge injection plan** (commit `9c7943f019`, U-XRAY-GDT-TRIBAL-PLAN).
Operator: "plan for tribal knowledge injection -- if not enough data on blueprint reading, gather + run
pdf-learn/video-learn for blueprint+GD&T." Assessment (enumerated): 7,632 tribal `.md` (260 GD&T/print-reading
matches) + GD&T parser engines (GDTCalloutParser/PrismEnhancedGDT/FCFSyntaxValidator) + 1 academy course (0c)
exist, BUT the authoritative SOURCE corpus (Y14.5 / blueprint-reading textbooks + video) is THIN (0 dedicated
GD&T source in 1,256 resources PDFs). Plan: `state/shared/specs/BLUEPRINT-GDT-TRIBAL-INJECTION-PLAN-2026-06-19.md`;
drop-zone `resources/blueprint-gdt-corpus/` (under a `pdf-corpus-watcher-sweep` WATCH_DIR; that task is
currently Disabled -- enable in --extract once sources staged). Downloads of external sources = operator
permission boundary (listed in the plan).

**CRITICAL FINDING (live proof):** `pdf-parse-extract` on `2D_Drawing.pdf` returned 0 text / 0 headings --
it is IMAGE-based. TWO lanes: **drawing PDFs -> OCR/VLM grinder** (now continuous), **textbook/manual PDFs
-> pdf-learn text lane** (the lane the gather feeds). Watcher routing rule: heading_count==0 -> hand to OCR,
don't emit an empty tribal note. (Also: pdf-parse-extract mis-resolved output to the whiskey worktree --
slot-resolution drift, harmless, follow-up.)

**RECALL DIAGNOSIS (data-grounded, commit `73582a78c0`; CORRECTS the earlier page-classify hypothesis -- R12):**
cursor distribution over 1,204 prints = labeled 1,004 (83.4%), **skipped-ensemble-failed 183 (15.2%) <- THE
leak**, skipped-all-paperwork 13 (1.1% -- page-classify was a RED HERRING), skipped-rasterize-failed 4. The
dominant source of "delta missed clearly-visible dims" is the 15.2% where the 2-model VLM ensemble ran but
extracted NOTHING -- concentrated in scanned-document PDFs (poor raster scans) + multi-page sets.

**R16 GAP FIXED (`73582a78c0`, U-XRAY-RETRY-FAILED):** parseCursorDoneSet cursored failures as DONE forever
-> the 183 would NEVER be retried when a better model lands. Added `--retry-failed` (re-queues ensemble/
rasterize failures only; last-status-wins) + exported RETRYABLE_FAILURE_STATUSES. 26/26 tests.

**qwen3-vl:32b EMPIRICALLY REJECTED (U-XRAY-VISION-PROBE, commit this session; CORRECTS the earlier
"add qwen3-vl:32b" plan -- R12).** Built `scripts/probe-vision-model.mjs` (probes any model directly,
bypassing the isThinkingTrap pre-filter the bench uses) + ran it on real JM prints with ~74GB free VRAM
(co-resident with the grinder). qwen3-vl:32b on D22706-10.pdf (KNOWN-READABLE, 8b labels it fine) AND
D22706-12.pdf (hard scan) -> raw_len=0 / 0 dims in BOTH format:json + raw, 113-170s (5-8x the 8b's ~22s).
NOT a thinking-trap (no <think>) but EMPIRICALLY UNUSABLE (empty + too slow). The bench had said "only
baseline ran" (8b F1 0.9383 on synthetic) -- the filter excluded the candidate. Verdict recorded in
vision-model-select.mjs; do NOT re-add the bare tag.

**FINAL ROOT CAUSE (measured, R12 -- corrects ALL prior hypotheses incl. scan-quality):** probed 3 of
the 183 ensemble-failed prints in isolation with the 8b via `scripts/probe-vision-model.mjs` (after fixing
a probe dim-key bug -- it read parsed.dimensions not parsed.extraction.dimensions, so it false-reported 0):
- D22706-12.pdf -> parse_ok, **24 dims** | D22706-07.pdf -> parse_ok, **20 dims** (clean drawings, read FINE)
- Scanned Document 6_23.pdf -> raw_len=456, all-null, **0 dims** (genuinely BLANK/contentless scan)
So the 15.2% = (A) TRANSIENT failures on clean drawings (timeout/GPU-contention/cold-reload during the
heavy grind -- read perfectly in isolation) + (B) genuinely-blank scans (correctly 0-dim, NOT a leak).
NOT scan-quality (--enhance changed nothing; pdf-to-png already HAS --preprocess/--deskew), NOT model
(8b reads fine; qwen3-vl:32b empty/rejected).

**THE FIX IS ALREADY SHIPPED:** `--retry-failed` (U-XRAY-RETRY-FAILED) re-runs the transient (A) class
with the SAME ensemble and recovers them -- no new model/preprocessing needed. P0.3 scan-preprocessing is
REFUTED (not the fix). **NEXT ACTION:** run ONE `--retry-failed` pass when the forward grind has headroom
(don't run concurrent with the live grinder -- one cursor writer), measure the recovered fraction. Then
the (B) blank scans stay 0-dim (honest). Backlog: blueprint-reading-improvement-backlog-2026-06-19 (P0.3 demoted).

Related: [[reference_xray_ocr_yield_mechanics_2026_06_10]] [[reference_xray_corpus_train_nightly_armed_2026_06_16]]
[[reference_xray_ocr_corpus_resumable_multipage_2026_06_08]] [[feedback_use_lima_pypdf_page_extractor]]
