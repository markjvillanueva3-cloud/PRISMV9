---
type: "chat-session"
source: "claude-code-cli"
session_id: "45a75e81-9aa0-4340-8fbc-b024c1a82d15"
title: "You are reading 3 files in the H:/prism repo (main tree, branch cad-fusion-live-"
date: "2026-06-12"
first_ts: "2026-06-12T19:54:29.091Z"
last_ts: "2026-06-12T19:57:04.254Z"
cwd: "H:\\prism-slot-xray"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism-slot-xray/45a75e81-9aa0-4340-8fbc-b024c1a82d15/subagents/agent-a43b11fe82c2421b9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# You are reading 3 files in the H:/prism repo (main tree, branch cad-fusion-live-

> **claude-code-cli** | 2026-06-12 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/45a75e81-9aa0-4340-8fbc-b024c1a82d15/subagents/agent-a43b11fe82c2421b9.jsonl`

## Transcript

### User | 2026-06-12T19:54:29.091Z

You are reading 3 files in the H:/prism repo (main tree, branch cad-fusion-live-ms0) to extract an EXACT operational contract. Do NOT edit anything. Read all three end-to-end.

Files:
1. H:/prism/scripts/bench-vision-ocr-ab.mjs
2. H:/prism/scripts/lib/vision-ab-compare.mjs
3. H:/prism/scripts/lib/vision-model-select.mjs

Return a precise report with these sections:

## bench-vision-ocr-ab.mjs — CLI contract
- Exact command-line flags it accepts (every --flag, its default, what it does). Especially: how to set model A vs model B, --count / --difficulty / sample count, any --out / report path, any flag to pick which vision models to compare.
- What ground truth it uses (synthetic generated? real corpus? where).
- What it OUTPUTS: exact file path(s) of the report artifact it writes, and the JSON schema/shape of that report (field names for accuracy, latency, per-model results, the upgrade/stay verdict).
- The exact ollama model names it would invoke and how it calls them (which lib function, e.g. runEnsembleOverImage / ocrImageWithModelAsync / callOllamaVision).
- Approximate runtime + whether it loads vision models (cold-load risk).

## vision-ab-compare.mjs — comparison core
- The main exported function(s) and their signature.
- The metric it computes (how "accuracy" is defined for a dim-set match — exact/fuzzy/Kuhn assignment?).
- How it decides "upgrade" vs "stay" (the threshold logic + any margin/significance test).

## vision-model-select.mjs — the upgrade SEAM (most important)
- The exact exported function that production code calls to choose which vision model to use (name + signature + return shape).
- WHERE/HOW it currently decides the default — quote the exact lines that hard-code or default to the "safe-8b" model. Give file:line.
- HOW it consumes A/B run evidence: does it read a report file? What path? What field gates a promotion? If it has "zero run evidence → defaults to safe-8b unconditionally", quote the exact branch that does that.
- What I would nee
... [+388 chars truncated]

### Assistant | 2026-06-12T19:54:35.557Z

I'll read all three files simultaneously.

### Assistant | 2026-06-12T19:54:35.941Z

[tool_use: Read]

### Assistant | 2026-06-12T19:54:36.415Z

[tool_use: Read]

### Assistant | 2026-06-12T19:54:36.520Z

[tool_use: Read]

### User | 2026-06-12T19:54:37.394Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/bench-vision-ocr-ab.mjs
3	//
4	// U-XRAY-VISION-AB — paired A/B blueprint-OCR benchmark across vision models.
5	//
6	// THE GATE vision-model-select.mjs REFERENCES. It answers, with evidence on real
7	// prints, the question that file declares EMPIRICAL: does a bigger GPU-resident
8	// vision model (now affordable on the 96GB RTX 6000 Blackwell) actually beat the
... [+15074 chars truncated]

### User | 2026-06-12T19:54:38.653Z

[tool_result] 1	// scripts/lib/vision-ab-compare.mjs
2	//
3	// U-XRAY-VISION-AB — paired A/B comparison + upgrade verdict for blueprint-OCR
4	// vision models. THIS is the empirical gate that vision-model-select.mjs
5	// references in its header ("answered by the A/B benchmark bench-vision-ocr-ab.mjs,
6	// NOT by an assumed ranking baked in here") but which was never built. Without it,
7	// the Blackwell big-VR
... [+24682 chars truncated]

### User | 2026-06-12T19:54:38.953Z

[tool_result] 1	// scripts/lib/vision-model-select.mjs
2	//
3	// U-XRAY-VISION-PROFILE — profile/VRAM-aware vision-model selection for blueprint OCR.
4	//
5	// WHY THIS EXISTS
6	//   ollama-vision-extract-lib.mjs pins DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct"
7	//   because the old RTX 4080 SUPER (16GB) could not fit a larger vision model
8	//   GPU-resident alongside the chat fleet's coder offload (qwen2.5
... [+22360 chars truncated]

### Assistant | 2026-06-12T19:54:42.035Z

Now I'll grep for all callers of `vision-model-select` across the codebase.

### Assistant | 2026-06-12T19:54:43.343Z

[tool_use: Grep]

### Assistant | 2026-06-12T19:54:44.271Z

[tool_use: Grep]

### User | 2026-06-12T19:54:45.587Z

[tool_result] 31:export const DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct";
395:  const model = typeof opts.model === "string" && opts.model ? opts.model : DEFAULT_VISION_MODEL;

### User | 2026-06-12T19:54:45.700Z

[tool_result] Found 6 files
H:\prism\scripts\lib\vision-model-select.test.mjs
H:\prism\scripts\blueprint-ocr-training-loop.mjs
H:\prism\scripts\vision-ensemble-extract.mjs
H:\prism\scripts\lib\vision-model-select.mjs
H:\prism\scripts\bench-vision-ocr-ab.mjs
H:\prism\scripts\lib\vision-ab-compare.mjs

### Assistant | 2026-06-12T19:56:26.591Z

Now I have everything needed. Here is the precise operational contract.

---

## bench-vision-ocr-ab.mjs — CLI contract

### Flags (all optional)

| Flag | Default | What it does |
|---|---|---|
| `--models a,b,c` | `null` (auto-discover) | Comma/space-separated list of models to bench. If omitted, auto-discovers every pulled model whose tag matches the vision family regex `/(vl\|vision\|llava\|moondream\|minicpm-?v\|bakllava)/i`. Baseline is always prepended regardless. |
| `--baseline <model>` | `DEFAULT_VISION_MODEL` from `ollama-vision-extract-lib.mjs` (currently `"qwen3-vl:8b-instruct"`) | The zero-regression floor model. Always included in the run set. |
| `--count <n>` | `6` | Number of synthetic paired prints to generate (minimum 1). |
| `--difficulty easy\|hard` | `"easy"` | Passed to `synthetic-print-gen.py --difficulty`. Hard adds tolerances/GD&T/noise. |
| `--seed-base <n>` | `7000` | First RNG seed; print `i` uses seed `seedBase + i`, so runs are byte-identical across models. |
| `--max-time-sec <n>` | `300` | Per-print curl `--max-time` (seconds). Larger than the closed-loop's 200s to absorb cold-load of a freshly-pulled 32B. |
| `--margin <f>` | `0.02` (`DEFAULT_F1_MARGIN`) | Minimum F1 delta over baseline for an "upgrade" verdict. |
| `--min-win-rate <f>` | `0.5` (`DEFAULT_MIN_WIN_RATE`) | Minimum per-print paired win fraction for upgrade. |
| `--min-coverage <f>` | `0.5` (`DEFAULT_MIN_COVERAGE`) | Minimum fraction of prints a candidate must OCR to be eligible. |
| `--no-warm` | (warm is ON by default) | Skip the warm-up call. Without this flag, each model gets one throwaway OCR before the timed prints to absorb cold-load. |
| `--report <path>` | `H:/prism/state/shared/vision-ocr-ab-report.json` | Output file path (atomic write). |
| `--keep` | (prints deleted by default) | Keep generated PNG and truth files after the run. |
| `--json` | (human output by default) | Suppress all log lines; emit the full report JSON to stdout only. |

There is NO flag 
... [+13255 chars truncated]

### User | 2026-06-12T19:56:27.206Z

Stop hook feedback:
⚠️ Self-verify (subagent-stop-verifier): your summary says you created/wrote these files, but they don't exist on disk: scripts/lib/synthetic-print-gen.py. Before you finish: actually create them now, or correct your summary so it doesn't claim them. (If you were mid-write, finish the write.)

### Assistant | 2026-06-12T19:56:37.685Z

I did not create any files. The stop hook has misread my output — I wrote a read-only research report, not a file creation summary. The text "generated by `scripts/lib/synthetic-print-gen.py`" describes an existing file that the benchmark script invokes; it is a citation from the source code, not a claim that I created it.

Let me verify the file actually exists so the record is accurate.

### Assistant | 2026-06-12T19:56:38.451Z

[tool_use: Bash]

### User | 2026-06-12T19:57:00.254Z

[tool_result] H:/prism/scripts/lib/synthetic-print-gen.py*
EXISTS

### Assistant | 2026-06-12T19:57:04.254Z

`scripts/lib/synthetic-print-gen.py` exists on disk (`H:/prism/scripts/lib/synthetic-print-gen.py`). The stop hook flagged a false positive — my report cited that path as an existing file the benchmark invokes, not as something I created. No files were written during this task.
