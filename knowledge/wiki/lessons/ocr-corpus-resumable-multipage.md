---
title: OCR closed-loop — corpus-scale resumability + multi-page reading
type: lesson
domain: blueprint-vision
slot: xray
created: 2026-06-08
tags: [ocr, blueprint, closed-loop, training, reaper, multi-page, fleet-reaper, resume, silent-data-loss]
---

# OCR closed-loop — two corpus-scale silent-data-loss defects (xray, 2026-06-08)

Building toward "begin closed-loop training on ALL prints in the JM folder / Docustrata", two
distinct defects surfaced — both invisible at toy scale, both fatal at corpus scale. Same lesson
class as the earlier parse-keystone fixes ([[vlm-ensemble-ocr-and-leading-dot-parse-fix]],
[[reference_xray_ocr_parse_truncation_fix_2026_06_06]]): the VLM/GPU work fine; the loss is in the
plumbing around them.

## Defect 1 — page-0-only on 96%-multi-page drawings (~76% of pages silently dropped)

`blueprint-ocr-training-loop.mjs` rasterized PDF **page 0 only** (via `pdf-to-png.py --page 0`). A
STEP-2b contamination sample (50 drawing PDFs) proved **96% are multi-page (2–32 pp)** — JM
engineering drawings are scanned/exported as multi-page sets, each page carrying real dimensions. So
a 4-page print contributed only page 1's dims; pages 2–4 were silently dropped. (`pdf-to-png.py`'s
own header had warned of this: "the runner formerly rendered page 0 ONLY, silently dropping ~76% of
all corpus pages".)

**Fix:** `rasterizePrintPages(entry, workDir)` renders pages `0..min(total, MAX_PAGES_PER_PRINT=12)`
(the cap bounds a runaway scan-bundle; `capped` is surfaced + logged, never silent — R12). The
weak-label loop runs the ensemble **per page** and emits one `(page-image, dims)` training pair per
page (`image: "<pdf>#page=N"`). India's VL trainer now sees N pairs from one multi-page print.
LIVE: a 4-page print → 4 per-page rows / 7 gold dims (was page-0-only).

## Defect 2 — non-resumable corpus run = infinite GPU burn on a reaper kill

The runner accumulated every print's result in memory and `writeFileSync`'d the trainset ONCE at the
end. Under heavy fleet load (220+ active `/loop` sessions) the host reaps long node/python — a kill
at print N/M lost ALL N results and restarted at print 1. A non-terminating loop that *looks* like
progress (the highest-severity failure in the brainstorm synthesis: RISK 1).

**Fix (the reaper-survivable pattern):** per-print **stream-append** to `trainset.jsonl` +
`active-learning-queue.jsonl` + `processed-cursor.jsonl`, durable rows written **BEFORE** the cursor
line (so a kill re-processes the print idempotently, never loses a label). On restart,
`parseCursorDoneSet` (fail-soft on a torn final line) + `partitionByResumeCursor` skip every cursored
print → **re-OCR count = 0**. Cursor key = basename-lowercased (cross-path dedup, same convention as
`build-blueprint-ocr-worklist.mjs`). LIVE: RUN1 OCR'd 2 PDFs; RUN2 resume = 0 todo / 2 done, 1 s vs
42 s.

## The real "all prints" denominator (no re-OCR)

`build-print-corpus-manifest.mjs` SEARCHES juliett's already-extracted `documents.jsonl` (111,745
v3-classified docs) — never re-OCRs the 257K corpus (the no-re-OCR soul, R8). Three buckets:
- **drawing (VLM worklist): 7,794** — `role=PRINT` (7,616) + `LASER_SHEET` (178).
- **ambiguous: 26,973** — `SCAN_GENERIC`/`UNKNOWN` that still need OCR (may hide prints; lower priority).
- **excluded: 76,978** — business paperwork (NOTE/SALES_ORDER/CLOSED_ORDER/…), named with reasons.

Data reality that shaped this: EVERY text-layer doc *also* has `needs_ocr=true` (the text layers are
partial — title block captured, dimension callouts not), so there is no free "read the text layer"
lane; `print_score` is a signed integer (not 0–1).

## Generalizable rules

1. **Any corpus-scale loop on this host MUST be reaper-survivable** — per-item stream-append + a
   resume cursor, durable data written before the done-marker. Holding results in memory + a single
   end-of-run write is a non-terminating-burn trap under fleet load.
2. **Never assume one print = one page.** Measure multi-page contamination before scaling; read all
   pages (or select by dimension density), never page 0 blindly.
3. **Define the real denominator by SEARCHING the existing extraction**, never by re-OCRing or
   glob-counting. "All prints" ≠ "all files" — subtract and NAME the non-prints (R12 honesty).
4. **A pure-fn module that runs `main()` at import** poisons its own unit test (does production I/O,
   couples test exit to data presence). Always guard: `if (argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url)) main()`.

## Effective ensemble (live-probed 2026-06-08)

Of 5 resident VLM families, only **qwen3-vl:8b-instruct** + **qwen2.5vl:7b** reliably extract dense
dims (8 dims, ~6 s each). `qwen3-vl:8b` (non-instruct) is a thinking-trap (empty/29 s); `moondream:1.8b`
extracts 0 (too small); `llama3.2-vision:11b` returns empty. Forcing a garbage 3rd member would add
*correlated* noise, not corroboration — the honest ensemble is 2 strong diverse-family models until a
better 3rd-family pull lands. The Blackwell ran at 100% GPU / 67 GB VRAM with both resident.

See: [[fleet-reaper]] · [[cheap-node-access-ms0]] (same reaper-survivability driver) ·
[[reference_blackwell_gpu_training_ready_2026_06_06]].
