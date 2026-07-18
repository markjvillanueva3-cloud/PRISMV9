---
type: "chat-session"
source: "claude-code-cli"
session_id: "501bd704-5c4a-4278-8059-79c78c4f32ed"
title: "Review the file `H:\\prism\\scripts\\py\\gpu_health.py` END TO END for correctness a"
date: "2026-06-04"
first_ts: "2026-06-04T03:05:07.061Z"
last_ts: "2026-06-04T03:08:05.644Z"
cwd: "H:\\prism"
messages: 23
user_msgs: 9
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/agent-a614d53f415ad3690.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Review the file `H:\prism\scripts\py\gpu_health.py` END TO END for correctness a

> **claude-code-cli** | 2026-06-04 | 23 msgs (9 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/agent-a614d53f415ad3690.jsonl`

## Transcript

### User | 2026-06-04T03:05:07.061Z

Review the file `H:\prism\scripts\py\gpu_health.py` END TO END for correctness as a FAIL-LOUD GPU readiness gate. This is BLACKWELL-AI-MS0 / U-PYGPU-HEALTH.

SPEC / CONTRACT it must satisfy:
- It is the canonical verifier of "can this host train on GPU right now." Its entire reason to exist is to prevent the silent-CPU-fallback failure: a torch wheel built for the wrong CUDA arch reports `torch.cuda.is_available()==True` then runs every kernel on CPU at ~1/50th speed. The gate must catch this LOUDLY.
- Hard requirements for "ready" (exit 0): torch importable + cuda_available + the DEVICE's own compute-capability sm tag (e.g. sm_120 for Blackwell (12,0)) present in `torch.cuda.get_arch_list()` + a REAL gpu matmul op that executes and yields a finite result.
- bitsandbytes 4-bit op is a SEPARATE reported capability (`bnb_4bit_ok`: null when not installed) and must NOT make the foundational gate permanently red (GNN/embed/reward jobs don't use bnb). Only `--require-bnb` couples it to exit 0.
- MUST emit exactly one JSON object on stdout ALWAYS (even on every failure path), exit 0 iff ready, exit 1 otherwise with JSON populated. stdout reserved for the JSON contract; stderr for human diagnostics only. Never a bare traceback to stdout, never exit 0 on a CPU-only wheel.
- Verified live: on Python 3.14.5 with no torch it exits 1 with `errors:["torch_not_importable..."]`, ready:false. Correct.

FOCUS your review on:
1. Are there ANY code paths that exit 0 (or fall through to exit 0) when the GPU is not genuinely training-ready? (the cardinal sin)
2. Are there ANY paths that fail to emit the stdout JSON, or emit it twice, or write non-JSON to stdout?
3. Is the sm-tag-in-arch-list check correct for the capability→tag mapping ((12,0)->sm_120, (8,9)->sm_89, (9,0)->sm_90)? Any off-by mapping?
4. Exception handling: any place a torch/cuda exception could escape uncaught and produce a bare traceback instead of structured JSON+exit1?
5. The bnb logic: is `qlora_ready`/`ready`/`--re
... [+374 chars truncated]

### Assistant | 2026-06-04T03:05:14.119Z

I'll review this GPU health gate file end to end. Let me read it.

### Assistant | 2026-06-04T03:05:14.204Z

[tool_use: Read]

### User | 2026-06-04T03:05:17.602Z

[tool_result] 1	#!/usr/bin/env python3
2	"""gpu_health.py — BLACKWELL-AI-MS0 / U-PYGPU-HEALTH (fail-loud GPU readiness gate)
3	
4	The canonical, FAIL-LOUD verifier of "can this host actually train on the GPU
5	right now." It is the single most dangerous silent-failure mode in the whole
6	Blackwell training stack: a torch wheel built for an older CUDA arch
7	(cu117/cu121/cu124) will report ``torch.cuda.is_availa
... [+13875 chars truncated]

### Assistant | 2026-06-04T03:05:20.117Z

Now let me verify my analysis of a couple of subtle points. First, the sm-tag mapping correctness against real PyTorch `get_arch_list()` output format, and second the argparse error path.

### Assistant | 2026-06-04T03:05:21.109Z

[tool_use: WebSearch]

### Assistant | 2026-06-04T03:05:22.270Z

[tool_use: Bash]

### User | 2026-06-04T03:05:45.408Z

[tool_result] Web search results for query: "torch.cuda.get_arch_list() output format sm_90 sm_120 sm_89 compute capability tag"

I'll search for information about the `torch.cuda.get_arch_list()` output format and CUDA compute capability tags.

Links: [{"title":"`sm_89` not listed in the `torch.cuda.get_arch_list()` - PyTorch Forums","url":"https://discuss.pytorch.org/t/sm-89-not-listed-in-the-torch-cuda-get-a
... [+5039 chars truncated]

### User | 2026-06-04T03:05:52.748Z

[tool_result] test
test2

### Assistant | 2026-06-04T03:05:55.834Z

This confirms a critical issue. Let me verify the sm_89 concern more carefully and check how the Node bridge / engine consumes this, to understand if the warning-only argparse path matters. Let me look at the consumer.

### Assistant | 2026-06-04T03:05:58.655Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:05:59.926Z

[tool_use: Grep]

### User | 2026-06-04T03:06:10.138Z

[tool_result] (12,0) -> sm_120
(8,9)  -> sm_89
(9,0)  -> sm_90
(10,0) -> sm_100
(8,6)  -> sm_86
(7,5)  -> sm_75
(12,1) -> sm_121

### User | 2026-06-04T03:06:14.456Z

[tool_result] No files found

### Assistant | 2026-06-04T03:06:17.835Z

The mapping `sm_{major}{minor}` is correct for all the documented cases: (12,0)→sm_120, (8,9)→sm_89, (9,0)→sm_90, (10,0)→sm_100. The format `f"sm_{major}{minor}"` concatenates the digits, which matches PyTorch's actual tag format. Let me check the consumer engine and verify the argparse exit-2 behavior.

### Assistant | 2026-06-04T03:06:19.310Z

[tool_use: Grep]

### Assistant | 2026-06-04T03:06:21.467Z

[tool_use: Bash]

### User | 2026-06-04T03:06:42.495Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T03:06:47.898Z

[tool_result] SystemExit code: 2
--- stderr ---
usage: -c [-h] [--matmul-dim MATMUL_DIM]
-c: error: argument --matmul-dim: invalid int value: 'notanint'
--- stdout would have been empty (argparse writes to stderr) ---

### Assistant | 2026-06-04T03:06:52.812Z

I've confirmed the key facts I need. The argparse `exit 2` path is significant — it writes usage to stderr and exits 2 with NO JSON on stdout, breaking the "always emit JSON" contract. Let me do one targeted confirmation on a subtle robustness point regarding the matmul detail line and the exception name fallback, then write the review. The grep timed out but I have enough to assess the file itself, which is the scope of the review.

Let me verify one more subtle point: the `gpu_matmul_detail` traceback line and whether `str(exc)` can ever be empty in a way that matters.

### Assistant | 2026-06-04T03:06:55.327Z

[tool_use: Bash]

### User | 2026-06-04T03:07:00.799Z

[tool_result] detail repr: 'RuntimeError: boom'
str(exc) or class: boom

### Assistant | 2026-06-04T03:08:05.644Z

I have everything I need. The traceback extraction works, the sm mapping is correct, and I've confirmed the argparse contract break. Let me write up the review.

---

## Code Quality Analysis Report — `H:\prism\scripts\py\gpu_health.py`

### Summary
- Overall Quality Score: 8.5/10
- Files Analyzed: 1 (276 lines)
- Verdict: **PASS** (with one P1 contract-edge gap worth fixing)
- The core fail-loud design is sound. The cardinal sin — exit 0 on a CPU-only/wrong-arch wheel — is **correctly prevented**. The sm-tag mapping is correct. There is **one real contract-violation path** (argparse error → exit 2, no JSON) that is P1, not P0, because it is operator/bridge-config error, not a "broken stack passing as ready."

I walked all eight exit points: torch-import-fail (134), cuda-unavailable (158), get_device_capability-raise (177), sm-not-in-arch-list (188), matmul-fail (210), require-bnb-fail (255), success (257), and the top-level backstop (275). Plus the implicit argparse exit (89).

---

### Focus-area findings

**1. Any path that exits 0 when the GPU is not training-ready? (the cardinal sin)**
No. This is correct and is the file's strongest property. `ready` is set **only** at line 249 from `torch_ready`, and `torch_ready` is set at line 213 **only after** all four hard gates pass in sequence with early `_emit_and_exit(report,1)` on each failure:
- torch import (126–134)
- cuda_available AND device_count≥1 (151–158)
- device capability resolved (161–177)
- `sm_supported` = device sm-tag ∈ arch_list (167, 179–188)
- real matmul executes + finite (191–210)

There is no fall-through: every failure path calls `_emit_and_exit(..., 1)` which `sys.exit`s, so reaching line 213 is unconditional proof of GPU readiness. The bnb capability is correctly decoupled (line 246/249 — `ready` ignores `bnb_4bit_ok`). 

**2. Any path that fails to emit stdout JSON / emits twice / writes non-JSON to stdout?**

- **P1 — argparse error path emits NO JSON and exits 2.** `parser.parse_args()` (
... [+9063 chars truncated]
