---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c91e392-f5b8-473b-bddc-c0de161b8ee0"
title: "You are the ADVERSARIAL lens. Attack every plan. Where does \"run the loop on all"
date: "2026-06-08"
first_ts: "2026-06-08T15:23:48.261Z"
last_ts: "2026-06-08T15:27:03.237Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/workflows/wf_bcafd428-ce6/agent-a5082307bc3296bc5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# You are the ADVERSARIAL lens. Attack every plan. Where does "run the loop on all

> **claude-code-cli** | 2026-06-08 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/workflows/wf_bcafd428-ce6/agent-a5082307bc3296bc5.jsonl`

## Transcript

### User | 2026-06-08T15:23:48.261Z

You are the ADVERSARIAL lens. Attack every plan. Where does "run the loop on all prints" silently fail or lie? (silver-pseudo-labels mistaken for gold; calibration done on synthetic prints not generalizing to real scanned drawings; multi-page docs polluting the trainset; reaper killing the run mid-corpus; GPU OOM with 5 resident models; the loop reporting "trained" when it only labeled). What MUST be measured with numbers to prove it actually worked?


PRISM xray-slot work order (ultracode, autonomous /loop): "upgrade our OCR and blueprint reading capabilities utilizing new GPU and CPU. wire, tested and validated then begin closed loop training on all prints in the jm folder/docustra."

DECISION: What does "begin closed-loop training on ALL prints in the JM folder / Docustrata" concretely mean, and in what order should it execute?

GROUND TRUTH (verified live this session, 2026-06-08):
- HARDWARE: 1× NVIDIA RTX PRO 6000 Blackwell (96GB VRAM class), torch 2.11.0+cu128, sm_120, bnb 4bit OK, qlora_ready=true. 32 logical CPU cores. Ollama has 5 VLM families resident-capable: qwen3-vl:8b(-instruct), qwen2.5vl:7b, llama3.2-vision:11b, moondream:1.8b, plus gpt-oss:20b + qwen2.5-coder:32b.
- CORPUS: Docustrata = 257,992 files total; 111,745 indexed documents; 73,506 v3-enriched; 56,887 have a TEXT LAYER (already-extracted text, no OCR needed); 73,506 flagged documents_needing_ocr; 38,251 JM-die files indexed; 76,205 blueprint-program joins exist. Total ~95.6 GB. Indexes live at mcp-server/data/jm-die-database/manifest.json + H:/PRISM/Docustrata/.index/ (blueprint-program-join-full-v5.jsonl etc).
- SAMPLE REALITY: a tail of the live extraction ledger shows many corpus items are MULTI-PAGE SCANNED DOCUMENTS (e.g. a 29-page "Scanned Document" producing dimensions:[] confidence 0.5) — i.e. NOT clean single-print engineering drawings. The blueprint-worklist builder already heuristically filters out manuals/catalogs/invoices/quotes/POs and keeps drawing-ish PDFs (15KB–6MB single 
... [+2102 chars truncated]

### Assistant | 2026-06-08T15:24:12.427Z

I'm the adversarial lens. My job is to find where "run the closed loop on all prints" silently fails or lies. Let me verify the ground-truth claims against the live system before attacking — an adversarial review built on fabricated assumptions is worthless.

### Assistant | 2026-06-08T15:24:15.022Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:24:16.579Z

[tool_use: Bash]

### User | 2026-06-08T15:24:35.576Z

[tool_result] -rwxr-xr-x 1 wompu 197611 12086 Jun  4 11:58 H:/prism/scripts/blueprint-ocr-training-loop.mjs*
-rw-r--r-- 1 wompu 197611 11493 Jun  4 12:17 H:/prism/scripts/lib/ocr-training-loop-lib.mjs
-rw-r--r-- 1 wompu 197611 23948 Jun  4 08:54 H:/prism/scripts/lib/vision-ensemble-fuse.mjs
---worklist---
H:/prism/scripts/build-blueprint-ocr-worklist.mjs
H:/prism/scripts/build-blueprint-ocr-worklist.test.mjs
H:
... [+46 chars truncated]

### User | 2026-06-08T15:24:36.277Z

[tool_result] total 814193
drwxr-xr-x 1 wompu 197611        0 May 31 12:34 ./
drwxr-xr-x 1 wompu 197611        0 May 29 10:35 ../
-rw-r--r-- 1 wompu 197611     2413 May  8 20:07 FUTURE_WORK_GCODE_EXTRACTION.md
drwxr-xr-x 1 wompu 197611        0 Jun  8 00:36 __pycache__/
drwxr-xr-x 1 wompu 197611        0 Jun  8 00:36 _phase10_mineru_work/
-rw-r--r-- 1 wompu 197611 10231251 May  9 20:30 blueprint-program-join-fu
... [+2661 chars truncated]

### Assistant | 2026-06-08T15:24:44.067Z

Verified: architecture files exist (note the worklist filename differs — `jm-corpus-worklist-fixed.txt` is not at the claimed root; `build-blueprint-ocr-worklist.mjs` is the builder). Index files confirmed. Let me check two load-bearing claims: the calibration core's actual tiering logic, and whether the loop has any resumability/checkpoint.

### Assistant | 2026-06-08T15:24:46.547Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:24:47.202Z

[tool_use: Bash]

### User | 2026-06-08T15:25:05.623Z

[tool_result] 9:// given its agreement? This lib answers it empirically, then grades labels:
12://      AGREEMENT FRACTION f = k/n_models). Calibrating on the FRACTION (not raw count k) is the key
16://      (more agreement ⇒ not less accurate). Only prints with n_models≥2 contribute (a 1-model run
18://   2. TIER — map each real pseudo-label's f → expected accuracy → gold/silver/bronze/reject. A label
19://   
... [+3904 chars truncated]

### User | 2026-06-08T15:25:07.535Z

[tool_result] 10://   2. WEAK-LABEL — run the ensemble over REAL prints (operator-supplied PNGs / a dir) → tier each
11://      pseudo-label by the calibration → gold/silver = trainable supervised labels for india's LoRA;
12://      bronze/reject/ambiguous/hallucination → active-learning queue (operator-confirm), NEVER
19:// operator-supplied set, never the 257K corpus.
27:import { existsSync, mkdirSync, writeF
... [+1387 chars truncated]

### Assistant | 2026-06-08T15:25:13.410Z

Now I have the verified ground truth. Two findings already destroy the comfortable framing: **the calibration is validated on "synthetic perfect-GT" (line 173, explicit in the code's own note), and the runner has ZERO checkpoint/resume/append** — it `writeFileSync`s the whole trainset at the end in one shot (lines 166-168), with a `for...of` loop over PNGs and no per-item persistence. Let me confirm the calibration-source claim and the OOM/reaper reality.

### Assistant | 2026-06-08T15:25:15.934Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:25:17.722Z

[tool_use: Bash]

### User | 2026-06-08T15:25:30.234Z

[tool_result] 7://   1. CALIBRATE — generate perfect-GT synthetic prints (mixed difficulty) → multi-VLM ensemble →
8://      measure P(consensus dim CORRECT | corroboration k) → isotonic calibration (the validated
10://   2. WEAK-LABEL — run the ensemble over REAL prints (operator-supplied PNGs / a dir) → tier each
11://      pseudo-label by the calibration → gold/silver = trainable supervised labels for india'
... [+2951 chars truncated]

### User | 2026-06-08T15:25:31.243Z

[tool_result] 6://   The single-model OCR path pins ONE vision model (qwen3-vl:8b-instruct) because the
7://   old RTX 4080 (16GB) could hold only one resident. The RTX PRO 6000 Blackwell (96GB,
9://   GPU-resident at once (qwen3-vl + qwen2.5-vl + llama3.2-vision ≈ 31GB) and serve them
10://   CONCURRENTLY. This lib runs N independent VLMs over the SAME print in parallel and
35://   concurrent multi-model trans
... [+280 chars truncated]

### Assistant | 2026-06-08T15:27:03.237Z

Verification complete. Every adversarial claim below is now grounded in the actual code, not the optimistic framing in the work order. Here is my attack.

---

# ADVERSARIAL LENS — where "run the closed loop on all prints" silently fails or lies

I read the actual code. The framing in the work order is optimistic in ways the code itself contradicts. Here are the silent failures and lies, ordered by blast radius, each with the kill-shot evidence and the number that must be measured to disprove it.

## ATTACK 1 — THE CALIBRATION IS TRAINED ON SYNTHETIC PRINTS AND HAS NEVER SEEN A SCANNED DRAWING (highest severity, code-confirmed)

This is not a hypothetical — the code says it in its own comment. `blueprint-ocr-training-loop.mjs:7-8`: *"CALIBRATE — generate perfect-GT synthetic prints (mixed difficulty)"*. `:173`: *"Gold/silver are calibration-tiered (validated on synthetic perfect-GT)"*.

The entire trust hierarchy — gold/silver/bronze/reject — is a function `expectedAccuracy(f)` (`ocr-training-loop-lib.mjs:77-93`) whose isotonic curve was fit on **clean machine-rendered synthetic prints**. Then it is applied verbatim to label REAL scanned JM-die drawings. The known reality (ground truth, this session): the corpus tail is 29-page scanned documents producing `dimensions:[]` at confidence 0.5. Scanned drawings have skew, JPEG artifacts, handwritten markups, stamps, fax-degradation, blueprint-blue washout — **none of which exist in the synthetic calibration set.**

**The lie this produces:** "f=1.0 → gold (0.85 accurate)" is TRUE on synthetic prints and may be FALSE on scanned ones. Two VLMs can both confidently mis-read a faxed `.171` as `.111` and *agree* — high f, minted gold, dead wrong. Agreement is not correctness when the error is correlated (same blur fools both models the same way). The calibration assumes errors are independent across models; on degraded scans they are correlated by the degradation itself.

**MUST MEASURE (the only thing that disproves it):**
-
... [+12781 chars truncated]
