---
type: "chat-session"
source: "claude-code-cli"
session_id: "501bd704-5c4a-4278-8059-79c78c4f32ed"
title: "Independent second-pass review of `H:\\prism\\scripts\\py\\gpu_health.py` (BLACKWELL"
date: "2026-06-04"
first_ts: "2026-06-04T03:05:21.910Z"
last_ts: "2026-06-04T03:07:43.802Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 6
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/agent-aa4c4d2cb84f1f5af.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent second-pass review of `H:\prism\scripts\py\gpu_health.py` (BLACKWELL

> **claude-code-cli** | 2026-06-04 | 17 msgs (6 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/agent-aa4c4d2cb84f1f5af.jsonl`

## Transcript

### User | 2026-06-04T03:05:21.910Z

Independent second-pass review of `H:\prism\scripts\py\gpu_health.py` (BLACKWELL-AI-MS0 / U-PYGPU-HEALTH). Do NOT assume a prior reviewer caught everything. Read the whole file.

Context: this python script is spawned by a Node TS engine (GpuStackHealthEngine.ts, not yet written) which parses its stdout JSON and exit code to decide whether GPU training units (GNN retrain, QLoRA, reward model) may fire. golf owns installing the GPU python stack (torch cu129/sm_120, bitsandbytes); india owns this gate. The portable interpreter on this host is Python 3.14.5 (no torch — gate correctly RED today); golf will provision a dedicated Python 3.13 GPU venv exposed via PRISM_PYTHON_GPU_PATH.

Weight your review toward what a correctness reviewer might MISS:
1. CONSUMER CONTRACT STABILITY: is the emitted JSON schema stable and self-describing enough for a Node consumer to gate on? Are all the fields a consumer would need (ready, torch_ready, qlora_ready, errors, capability, sm_supported, gpu_matmul_ok) always present in EVERY exit path (including the import-fail and the top-level backstop)? Note: the import-fail path emits the FULL report dict (good); the top-level `except` backstop emits a MINIMAL dict (only some fields). Is that schema divergence a problem for a strict consumer?
2. CROSS-PLATFORM / ENV: Windows-specific concerns. argparse behavior. Does anything assume a path separator, locale, or that stdout is a tty? The script uses ASCII-safe JSON (ensure_ascii default True) — confirm no raw unicode reaches stdout that a PS codepage could mangle. (The stderr lines contain em-dashes — is that acceptable since stderr is non-contract?)
3. FORWARD-COMPAT: when golf DOES install torch cu129/sm_120, will this script actually flip to exit 0 / ready:true? Walk the happy path mentally for a Blackwell (12,0) with a correct wheel. Any way the happy path wrongly stays red (e.g. arch_list format assumptions, get_device_capability returning a tuple of numpy ints, etc.)?
4. bitsandbytes bl
... [+499 chars truncated]

### Assistant | 2026-06-04T03:05:33.110Z

I'll review the GPU health gate script. Let me read the whole file first.

### Assistant | 2026-06-04T03:05:33.289Z

[tool_use: Read]

### User | 2026-06-04T03:05:35.588Z

[tool_result] read-once-guard: 'H:\prism\scripts\py\gpu_health.py' was already read 19s ago in this session and is unchanged (mtime 1780542252141). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-04T03:05:39.049Z

The guard says the file is already in context, but I don't actually have its content. Let me bypass the cache to get it.

### Assistant | 2026-06-04T03:05:40.579Z

[tool_use: Bash]

### User | 2026-06-04T03:05:49.839Z

[tool_result]      1	#!/usr/bin/env python3
     2	"""gpu_health.py — BLACKWELL-AI-MS0 / U-PYGPU-HEALTH (fail-loud GPU readiness gate)
     3	
     4	The canonical, FAIL-LOUD verifier of "can this host actually train on the GPU
     5	right now." It is the single most dangerous silent-failure mode in the whole
     6	Blackwell training stack: a torch wheel built for an older CUDA arch
     7	(cu117/cu121/cu124)
... [+14803 chars truncated]

### Assistant | 2026-06-04T03:05:53.192Z

I have the full file. Let me verify a few API contract claims against the real bitsandbytes and PyTorch APIs before finalizing, since the bnb signature and `get_device_capability` return-type details are load-bearing for items 3 and 4.

### Assistant | 2026-06-04T03:05:55.802Z

[tool_use: WebFetch]

### User | 2026-06-04T03:06:01.868Z

[tool_result] # Function Signatures for `quantize_4bit` and `dequantize_4bit`

## `quantize_4bit`

**Definition:**
```python
def quantize_4bit(
    A: torch.Tensor,
    absmax: Optional[torch.Tensor] = None,
    out: Optional[torch.Tensor] = None,
    blocksize=None,
    compress_statistics=False,
    quant_type="fp4",
    quant_storage=torch.uint8,
) -> tuple[torch.Tensor, QuantState]:
```

**Return value:** A
... [+753 chars truncated]

### Assistant | 2026-06-04T03:06:06.054Z

The bnb signatures confirm `quantize_4bit` returns `(tensor, QuantState)` and `dequantize_4bit(q, state)` positionally maps `state` → `quant_state` — so the script's usage is API-correct for current bnb. Now let me confirm a subtle point about the matmul proof's float16 default dtype and whether `randn` on cuda picks a sane default, plus check the actual portable interpreter behavior for argparse. Let me verify the Python version and that the script at least parses/runs the RED path cleanly on this host.

### Assistant | 2026-06-04T03:06:07.759Z

[tool_use: Bash]

### User | 2026-06-04T03:06:15.376Z

[tool_result] Python 3.14.5
---EXIT---
gpu_health: torch is not importable � GPU training stack absent.
{"schemaVersion": "1.0.0", "ready": false, "torch_ready": false, "qlora_ready": false, "torch_version": null, "cuda_available": false, "device_count": 0, "device_name": null, "capability": null, "expected_capability": [12, 0], "sm_tag": null, "arch_list": [], "sm_supported": false, "capability_matches_expec
... [+432 chars truncated]

### Assistant | 2026-06-04T03:06:20.034Z

This live run is extremely revealing. Note the stderr line: `gpu_health: torch is not importable � GPU training stack absent.` — the em-dash (`—`) in the stderr string got mangled to `�` by the Windows console codepage. The stdout JSON correctly escaped it as `\u2014` (ensure_ascii). This confirms the contract analysis. Let me verify two more things: argparse error behavior (which writes to stderr and exits 2, not via our JSON contract) and that the import-fail path emits the FULL dict while the backstop emits a MINIMAL dict.

### Assistant | 2026-06-04T03:06:22.657Z

[tool_use: Bash]

### User | 2026-06-04T03:06:30.273Z

[tool_result] === bad arg (argparse exit code + no JSON contract) ===
RC=2
--- stderr ---
usage: gpu_health.py [-h] [--expect-capability EXPECT_CAPABILITY]
                     [--require-bnb] [--matmul-dim MATMUL_DIM]
gpu_health.py: error: argument --matmul-dim: invalid int value: 'notanint'

=== --expect-capability garbage (should warn, not crash) ===
warnings: ["could not parse --expect-capability 'blah'"
... [+28 chars truncated]

### Assistant | 2026-06-04T03:07:43.802Z

Confirmed: argparse errors exit code **2** with NO JSON on stdout — a critical contract gap for a strict consumer. The bad `--expect-capability` correctly degrades to a warning. 

I have everything I need. Let me also confirm the matmul dtype concern — the proof uses default float32 (`torch.randn` default), which is fine, but let me verify there's no edge with the `import math` placement and the `traceback` detail line.

I now have a complete picture. Here is my independent second-pass review.

---

## Independent Review — `H:\prism\scripts\py\gpu_health.py`

**Verdict: PASS (with 1 P1 and several P2s the consumer engine must defend against).** The core gate logic is correct, fail-loud, and forward-compatible. The happy path will flip to `ready:true`/exit 0 on a correct Blackwell wheel. The findings below are about **consumer-contract robustness**, not the gating science — but #1 (P1) is a real false-failure mode the Node engine will hit and must be specced to handle, because it cannot be fixed purely in TS.

### P1 — argparse errors break the "always emit JSON + exit 0/1" contract (exit 2, empty stdout)
Lines 79-89, 260-275. The module docstring (lines 34-39) promises: *"Emits exactly one JSON object on stdout (always — even on failure)"* and *"Exit 0 iff ready … Exit 1 on any not-ready condition."* The top-level backstop (261-265) only catches exceptions raised **inside `main()`** — but `argparse` fails **before** the try body's logic and calls `sys.exit(2)` itself, printing a usage message to **stderr with no JSON on stdout**. Verified live:

```
python gpu_health.py --matmul-dim notanint  →  RC=2, stdout empty, usage on stderr
```

A strict Node consumer that does `JSON.parse(stdout)` will throw on empty stdout, and a consumer that gates on `exitCode === 1 ? red : ...` sees an **unexpected exit 2** — neither RED-with-reason nor GREEN. If `GpuStackHealthEngine.ts` is built to fail-closed (`any non-zero → RED`) this is merely cosmetic, but if it distinguishes 0/1 
... [+10267 chars truncated]
