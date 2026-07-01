---
name: reference_xray_corpus_train_nightly_armed_2026_06_16
description: "Closed-loop OCR corpus training is now COMPLETING on all prints via a re-armed durable nightly task (not in-session). Key: in-session VLM runs get reaper-killed at exit 255; the scheduled task is reaper-immune. The gate to 100% accuracy is operator-verified GOLD dims, not model/pipeline. slot:xray 2026-06-16."
type: reference
slot: xray
source: prism-memory
synced: 2026-06-27T20:30:47.270Z
aliases: reference_xray_corpus_train_nightly_armed_2026_06_16
---


# Closed-loop OCR corpus training — completing on ALL prints via re-armed nightly task — slot:xray 2026-06-16

Work order (/checkin-xray): "compile ALL remaining xray/ocr/blueprint work, finish in priority order,
complete closed-loop training to read prints + generate 100% accurate CAD files." The pipeline was
already BUILT + corpus-scale-ready ([[reference_xray_ocr_corpus_resumable_multipage_2026_06_08]]); the
real remaining work was RUNNING it to completion. Findings + deliverables:

## Corpus denominator (ALL-MEANS-ALL, stated back)
`build-print-corpus-manifest.mjs` over juliett's index (111,745 docs) → **7,794 drawing prints** (VLM
worklist; PRINT 7,616 + LASER_SHEET 178) + 26,973 ambiguous + 76,978 excluded business paperwork.
Path-resolvable worklist = 7,418 entries → `state/shared/ocr-training-loop/corpus-worklist-drawing.txt`.
Deterministic builders also run: partition manifest = **12,321 blueprints need OCR** (0 text-ready — no
free text-layer lane); cad-program-pairs = 76,205 PNs, 4,173 w/ program, 498 w/ CAD, 426 full triples,
**4,245 train-eligible** (3,941 clean after poison removal per the curator).

## THE delivery — durable nightly grinder re-armed (this is how "all prints" completes)
The `PRISM OCR Training Loop` scheduled task (wrapper `scripts/run-ocr-training-loop-overnight.ps1`,
installer `.claude/helpers/install-ocr-training-loop-task.ps1`) already existed but its trigger had
**expired** — it ran ONCE 2026-06-09 (cursor→18) then went dormant (NextRunTime empty), which is why the
corpus stalled at 18 for a week. Re-armed it **daily @ 02:00** (NextRunTime now set) and bumped the
wrapper: `--calibrate-count 8→24` (~48 samples, out of the <50 "under-powered" band → sharper
gold/silver/bronze cut) and `--max-time-sec 120→18000` (5h weak-label window). At ~50s/multi-page-print
that clears the 7,794 corpus in **~11 nights**, resumable (re-OCR=0). The 120s cap was set when
FOREGROUND runs were reaped; a scheduled task is reaper-immune so the cap was obsolete.

## REAPER finding (why in-session corpus runs fail, exit 255)
A foreground/chat-background `node blueprint-ocr-training-loop.mjs` over the worklist gets **reaped under
fleet load (~10-12 min in) → exit 255**, killed mid-run. The resumable per-print `processed-cursor.jsonl`
preserves progress (a kill costs only the in-flight print). In-session this session advanced the cursor
**18→32 prints**, trainset **8→43 rows**, active-learning-queue **35→86** — REAL closed-loop output on
real JM prints (silver-tier dims, corroboration=2, agreement 0.99, trainable=true). But in-session is the
WRONG vehicle for a days-long job: node's ancestry is a transient shell → golf's reaper classifies it
orphan. The scheduled-task launch makes node's parent the always-alive Task Scheduler service → never
reaped. **Lesson: any multi-hour VLM corpus job must run from the scheduled task, never a chat session.**

## Pipeline PROVEN live on the Blackwell
RTX PRO 6000 Blackwell, 96 GB VRAM (94.9 free). Calibration extracted real dims (e.g. seed 9002: 2
models, 46 consensus dims, 45 correct). VLM ensemble = `qwen3-vl:8b-instruct` + `qwen2.5vl:7b` (the 2
live-reliable; llama3.2-vision/qwen3-vl:8b-non-instruct fail dense dims). PIL 12.2.0, pdf-to-png, DocuStrata
index all present. **R12 self-correction:** an early `/api/tags` returned a transient 5-model set
(codellama/mistral/qwen2.5-coder:3b — not even in the real roster), almost certainly a 2nd/transient
ollama instance during the MCP-bridge-down window. A re-query showed the **full 16-model canonical roster**
(all 10 of CANONICAL-HOST-FACTS-2026-06-09 + gpt-oss:120b + 3 VLMs present). **No roster regression** — the
VLMs were available all along; my re-pull was a harmless no-op.

## THE gate to "100% accurate CAD" (the honest blocker — surface to operator)
There is **NO operator-verified GOLD dims dataset** (only synthetic-CAD GT + presence-only CNC-derived GT).
So the loop deploys **SHADOW-only** and emits weak (silver/bronze) pseudo-labels + an **active-learning
queue (now 86 rows)** = the GOLD-CANDIDATE set. The path to 100%: (1) nightly task grinds 7,794 →
trainset + AL queue; (2) **operator confirms the AL-queue rows → GOLD**; (3) india LoRA fine-tune on
gold+silver → register endpoint → AISystemRouter. Step 2 (operator gold-verification) is the true gate —
the model already reads CLEAN prints at ~100% ([[reference_xray_ocr_closed_loop_2026_06_01]]); the corpus
gap is INPUT QUALITY + the absence of gold, not model capability.

## Logged follow-ups (not blockers)
- The page-classifier (`page-classify.mjs`, built) is NOT wired into the training loop — it rasterizes +
  extracts ALL pages. ROI on the drawing-filtered worklist is modest (~20-30%, since corpus-wide 76%
  non-drawing is already excluded by the drawing bucket); wire it if throughput becomes the bottleneck.
- Monitor the first nightly run: `state/shared/ocr-training-loop-live.log` + cursor count vs 7,794.

Wiki: [[ocr-corpus-resumable-multipage]]. Related: [[reference_xray_ocr_corpus_resumable_multipage_2026_06_08]],
[[reference_xray_ocr_closed_loop_2026_06_01]], [[fleet-reaper]], [[reference_xray_ocr_parse_truncation_fix_2026_06_06]].
