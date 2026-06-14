---
name: reference_xray_ocr_corpus_resumable_multipage_2026_06_08
description: "The OCR closed-loop made corpus-scale-ready: reaper-survivable resume cursor + ALL-page rasterization (96% of JM drawings are multi-page) + the real 7794-print denominator from juliett's index (no re-OCR). slot:xray 2026-06-08."
type: reference
slot: xray
source: prism-memory
synced: 2026-06-09T14:54:11.072Z
aliases: reference_xray_ocr_corpus_resumable_multipage_2026_06_08
---


# OCR closed-loop → corpus-scale-ready (resumable + multi-page + real denominator) — slot:xray 2026-06-08

Operator (xray /loop /goal): "upgrade OCR/blueprint reading utilizing new GPU and CPU. wire, tested,
validated then begin closed loop training on all prints in the jm folder/docustra." Built the
corpus-scale plumbing that the parse-keystone fixes ([[reference_xray_ocr_parse_truncation_fix_2026_06_06]])
had unblocked. A `brainstorm-path-forward` workflow decided scope: "all prints" = run the loop at
corpus scale over juliett's INDEX, NOT re-OCR 257K (the no-re-OCR soul), silver + SHADOW only.

## Shipped (2 commits)
- **`b76b4d55ab` U-XRAY-OCR-LOOP-RESUMABLE** — reaper-survivable corpus loop. 4 pure lib fns in
  `ocr-training-loop-lib.mjs` (`printCursorKey`/`parseCursorDoneSet`/`formatCursorLine`/`partitionByResumeCursor`,
  8 tests, mutation-verified). Runner PHASE 2 stream-appends trainset/queue/`processed-cursor.jsonl`
  per-print (durable rows BEFORE cursor). `rasterizeIfPdf`→`rasterizePrintPages` wires `pdf-to-png.py`.
  `--worklist`/`--fresh` flags. LIVE: RUN1 OCR'd 2 real JM PDFs, RUN2 resume re-OCR=0 (1s vs 42s).
- **`265e8a6e41` U-XRAY-CORPUS-MANIFEST-MULTIPAGE** — `build-print-corpus-manifest.mjs` (SEARCHES
  juliett's `documents.jsonl` 111,745 docs → drawing 7794 / ambiguous 26973 / excluded 76978, +9
  tests) + ALL-page rasterization (cap 12, `capped` logged) emitting one (page-image,dims) pair per
  page. LIVE: 4pp print → 4 rows / 7 gold dims. Per-file 2-reviewer fixed run-as-main-guard×3 +
  downstream key+page last-wins dedup in `xray-trainset-to-lora.mjs`.

## Key facts (verified live this session)
- **Env unblocked**: bootstrapped pip + trl + qwen-vl-utils + pillow + pymupdf + torchvision in
  `H:/Tools/python-gpu` — full Qwen2.5-VL trainer import chain GREEN on the Blackwell (torch
  2.11.0+cu128, sm_120, CUDA). T4.1 no longer needs the operator. (I did it myself per
  [[feedback_all_slots_free_access]] + india's U-GPU-STACK-PROVISION precedent.)
- **96% of JM drawing PDFs are multi-page** (2–32 pp) — page-0-only dropped ~76% of dim-bearing pages.
- **Effective ensemble = 2 models**: qwen3-vl:8b-instruct + qwen2.5vl:7b (8 dims, ~6s each). The
  other 3 resident families fail dense dims (qwen3-vl:8b non-instruct = thinking-trap; moondream =
  too small; llama3.2-vision = empty). A 3rd-family slot needs a better future pull.
- **No real-scan operator-verified GOLD dims exist** (only presence-only CNC-derived GT + synthetic
  CAD GT). So deploy stays SHADOW-only; the loop's active-learning queue IS the gold-verification
  candidate set (the input to creating gold). Domain-shift gate (STEP 4) deferred until operator gold.
- Blackwell at 100% GPU / 67 GB VRAM with both VLMs resident — "utilizing new GPU" proven live.

## Run a corpus-scale pass
```
node scripts/build-print-corpus-manifest.mjs --emit-worklist --worklist-bucket drawing
node scripts/blueprint-ocr-training-loop.mjs --calibrate-count 8 \
  --models "qwen3-vl:8b-instruct,qwen2.5vl:7b" \
  --worklist state/shared/ocr-training-loop/corpus-worklist-drawing.txt \
  --out-dir state/shared/ocr-training-loop/<run> --max-time-sec 120
# resumable: re-run resumes from processed-cursor.jsonl (re-OCR=0); --fresh to start over.
```

Wiki: [[ocr-corpus-resumable-multipage]]. Related: [[reference_blackwell_gpu_training_ready_2026_06_06]],
[[reference_xray_ocr_parse_truncation_fix_2026_06_06]], [[vlm-ensemble-ocr-and-leading-dot-parse-fix]],
[[fleet-reaper]].
