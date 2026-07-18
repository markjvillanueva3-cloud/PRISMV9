---
name: reference_xray_ocr_parse_truncation_fix_2026_06_06
description: "The keystone OCR-loop bug — multi-VLM ensemble lost EVERY print's extraction over one malformed number (truncation×leading-dot + leading-+). Fixed in ollama-vision-extract-lib.mjs."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.275Z
aliases: reference_xray_ocr_parse_truncation_fix_2026_06_06
---


# OCR closed-loop "0 models survived" — whole-print extraction lost at JSON parse (slot:xray, 2026-06-06)

**Symptom:** `blueprint-ocr-training-loop.mjs` reported `0 model(s) survived` / `ensemble all-failed — skip` on EVERY print — including `extrude_punch.png`, which had produced gold labels on 2026-06-04. So the entire closed-loop yielded 0 trainable labels.

**Root cause (the VLM works; the loss is at `parseVisionResponse` in `scripts/lib/ollama-vision-extract-lib.mjs`):** two compounding invalid-JSON number forms VLMs emit, each discarding the WHOLE extraction of a print:
1. **truncation × leading-dot** — `num_predict` cut a dense print mid-`raw_text` → unterminated trailing string → `repairLeadingDotDecimals` BAILS (its fail-safe `return inStr ? text : out` on an open string) → an earlier value-position `.86` survived → `repairTruncatedJson` closed the braces but NOT the notation → `JSON.parse` still failed. The two repairs were composed in the wrong order.
2. **leading `+`** — `"tolerance_upper": +0.015` (a `±` tolerance). JSON allows a leading `-` but NEVER a leading `+`.

VLM output is **stochastic** (temp 0.1, still varies) — the same print sometimes parsed clean, sometimes hit these → intermittent total-loss read as "all-failed".

**Fix (3 parts, structure-first then notation):**
- `repairTruncatedJson` closes an unterminated TRAILING string (`suffix = inStr ? '"' : ""`) + drops a dangling trailing escape (odd `\`) so it can't escape the close quote.
- `parseVisionResponse` catch + `tryParseWithRepair` re-apply `repairLeadingDotDecimals` AFTER `repairTruncatedJson`.
- `repairLeadingDotDecimals` generalized to also strip a value-position leading `+` (exponents `1.5e+3` + string interiors preserved; idempotent).

**Validated:** 61/61 unit tests (7 new, R9-verified by revert); LIVE the same real print now extracts 8-9 dims; closed-loop run = 7/9 trainable (silver) + 2 ambiguous + 2 hallucination-candidates; calibration 0→38 samples. Per-file 2-reviewer scrutiny PASS (0 P0; 1 P1 dangling-escape fixed). Commit `U-XRAY-OCR-PARSE-TRUNCATION-FIX`.

**Same silent-data-loss class as the 2026-06-04 `.171` fix, one truncation deeper.** This was THE blocker to "begin closed-loop training on all JM/Docustrata prints" — the parser, not the VLM or GPU. See [[vlm-ensemble-ocr-and-leading-dot-parse-fix]], [[reference_xray_ocr_closed_loop_2026_06_01]].

**Also confirmed this session:** `scripts/py/gpu_health.py` ALREADY implements the real-matmul + arch_list probe (plan T1.3 was stale). Live on the Blackwell: torch 2.6.0+cu124 (arch_list sm_50..sm_90, no sm_120) → gate correctly REFUSES (`torch_ready:false`, `sm_not_in_arch_list`). The LoRA fine-tune needs **torch ≥2.7/cu128** (a dedicated 3.13 venv, `PRISM_PYTHON_GPU_PATH`); the OCR ensemble runs on Ollama/GPU independently of torch.
