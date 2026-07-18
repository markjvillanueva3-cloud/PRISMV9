---
type: "chat-session"
source: "claude-code-cli"
session_id: "b3f47ec7-5613-49ad-a7a9-19371bba1ac7"
title: "Review these two files end-to-end for correctness, edge cases, and adherence to "
date: "2026-06-03"
first_ts: "2026-06-03T18:34:27.990Z"
last_ts: "2026-06-03T18:37:48.411Z"
cwd: "H:\\prism"
messages: 18
user_msgs: 7
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/b3f47ec7-5613-49ad-a7a9-19371bba1ac7/subagents/agent-a0eaf464f4d4a3c5e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Review these two files end-to-end for correctness, edge cases, and adherence to 

> **claude-code-cli** | 2026-06-03 | 18 msgs (7 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b3f47ec7-5613-49ad-a7a9-19371bba1ac7/subagents/agent-a0eaf464f4d4a3c5e.jsonl`

## Transcript

### User | 2026-06-03T18:34:27.990Z

Review these two files end-to-end for correctness, edge cases, and adherence to project conventions. Grade PASS or FAIL and list every P0 (breaks correctness/safety) and P1 (significant) finding with the specific line.

Files:
- H:/prism/scripts/lib/vision-model-select.mjs (the asset)
- H:/prism/scripts/lib/vision-model-select.test.mjs (its tests)

Context/spec it must satisfy:
- It selects the local Ollama VISION model for PRISM's blueprint-OCR path. Today the OCR lib (scripts/lib/ollama-vision-extract-lib.mjs) hardcodes DEFAULT_VISION_MODEL="qwen3-vl:8b-instruct" because the OLD RTX 4080 (16GB) couldn't fit a bigger vision model. The NEW RTX 6000 Blackwell (96GB) removes that ceiling. This lib lets the OCR path upgrade the model ON a big-VRAM host.
- SAFETY INVARIANTS that MUST hold:
  1. THINKING-TRAP GUARD: bare qwen3-vl:* tags (and any -thinking tag) emit a <think> chain and NEVER the JSON the OCR parser needs (think:false is ignored by Ollama for them). The selector must NEVER auto-select one. Only -instruct / non-qwen3vl families are JSON-safe.
  2. AVAILABILITY-GATED + FAIL-SAFE: only auto-upgrade to a model POSITIVELY CONFIRMED present in the ollama /api/tags list. If the tags list is empty (probe failed), must NOT optimistically pick an unconfirmed model (would 404) — must fall back to the safe 8b default.
  3. SAFE FALLBACK / strictly additive: on any host without a confirmed bigger model, behaviour must equal today's (returns qwen3-vl:8b-instruct). SAFE_DEFAULT must be single-sourced from the OCR lib (imported), not re-literal'd.
  4. envOverride (PRISM_VISION_MODEL) is operator-force: honored, but flagged unsafe:true + warning if it's a thinking trap (R12 fail-loud).

Specifically verify:
- isThinkingTrap correctly classifies: qwen3-vl:8b (trap), qwen3-vl:30b (trap), qwen3-vl:8b-instruct (safe), qwen2.5vl:7b (safe), llama3.2-vision:11b (safe), *-thinking (trap). Any false-safe is a P0.
- The fail-safe availability gate (confirmedAvailable) truly require
... [+573 chars truncated]

### Assistant | 2026-06-03T18:34:44.796Z

I'll review both files end-to-end. Let me read them.

### Assistant | 2026-06-03T18:34:45.267Z

[tool_use: Read]

### Assistant | 2026-06-03T18:34:45.659Z

[tool_use: Read]

### User | 2026-06-03T18:34:51.454Z

[tool_result] 1	// scripts/lib/vision-model-select.mjs
2	//
3	// U-XRAY-VISION-PROFILE — profile/VRAM-aware vision-model selection for blueprint OCR.
4	//
5	// WHY THIS EXISTS
6	//   ollama-vision-extract-lib.mjs pins DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct"
7	//   because the old RTX 4080 SUPER (16GB) could not fit a larger vision model
8	//   GPU-resident alongside the chat fleet's coder offload (qwen2.5
... [+16455 chars truncated]

### User | 2026-06-03T18:34:51.577Z

[tool_result] 1	// scripts/lib/vision-model-select.test.mjs
2	// Tests for the profile/VRAM-aware vision-model selector (U-XRAY-VISION-PROFILE).
3	// Pure core only — no GPU, no Ollama. Run: node --test <file>
4	
5	import { test } from "node:test";
6	import assert from "node:assert/strict";
7	
8	import {
9	  isThinkingTrap,
10	  isJsonSafeVisionModel,
11	  classifyProfile,
12	  detectProfileFromEnv,
13	  parseP
... [+11300 chars truncated]

### Assistant | 2026-06-03T18:35:09.588Z

Let me verify the imported `DEFAULT_VISION_MODEL` from the OCR lib actually exists and equals what the tests assert.

### Assistant | 2026-06-03T18:35:10.999Z

[tool_use: Grep]

### Assistant | 2026-06-03T18:35:11.569Z

[tool_use: Bash]

### User | 2026-06-03T18:35:13.224Z

[tool_result] 31:export const DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct";
379:  const model = typeof opts.model === "string" && opts.model ? opts.model : DEFAULT_VISION_MODEL;

### User | 2026-06-03T18:35:35.768Z

[tool_result]   ...
# Subtest: probeTotalVramGB: parses nvidia-smi MiB → GB, max across GPUs
ok 33 - probeTotalVramGB: parses nvidia-smi MiB → GB, max across GPUs
  ---
  duration_ms: 0.3501
  ...
# Subtest: probeTotalVramGB: non-zero exit → null
ok 34 - probeTotalVramGB: non-zero exit → null
  ---
  duration_ms: 0.1353
  ...
# Subtest: probeTotalVramGB: spawn throws (no nvidia-smi) → null, no throw
ok 35 - pro
... [+332 chars truncated]

### Assistant | 2026-06-03T18:35:41.992Z

All 36 tests pass and the import chain is verified. Let me trace the safety invariants concretely against each branch and check the adversarial edge cases the spec calls out.

Let me verify a few specific footguns by reasoning through the code, and check one thing the tests don't cover: whether `Number.isFinite(args.vramGB)` handles a string VRAM passed by a careless caller, and whether the override-trim interacts with whitespace.

### Assistant | 2026-06-03T18:35:53.500Z

[tool_use: Bash]

### User | 2026-06-03T18:36:04.143Z

[tool_result] Exit code 1
node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\mnt\h\prism\scripts\lib\vision-model-select.mjs' imported from C:\Users\wompu\AppData\Local\Temp\probe-vision.mjs
    at finalizeResolution (node:internal/modules/esm/resolve:275:11)
    at moduleResolve (node:internal/modules/esm/resolve:932
... [+574 chars truncated]

### Assistant | 2026-06-03T18:36:07.842Z

Windows path. Let me use the H: drive path directly.

### Assistant | 2026-06-03T18:36:17.433Z

[tool_use: Bash]

### User | 2026-06-03T18:36:50.507Z

[tool_result] vramGB='96' (string)  tier: standard
vramGB=Infinity      tier: standard
empty tags → qwen3-vl:8b-instruct fallback: true
junk-laced tags → qwen3-vl:30b-instruct
whitespace override → qwen3-vl:8b-instruct
padded trap override → "qwen3-vl:8b" unsafe: true missing: false
junk args → qwen3-vl:8b-instruct
negative vram env → {"vramGB":null,"profile":null,"source":"none"}
instruct-thinking trap?: true

... [+75 chars truncated]

### Assistant | 2026-06-03T18:37:48.411Z

Every adversarial probe confirms the safety invariants hold. Let me verify the trap-skip path inside the big-VRAM loop once more (the spec's "any false-safe is a P0" concern) and confirm one subtle thing: whether a trap model appearing in `availableModels` could ever be returned when it's NOT in the preference list — it can't, because the loop only iterates `preference`. The defense is solid.

I have everything I need. Here is my analysis.

## Code Quality Analysis Report — vision-model-select

### Summary
- Overall Quality Score: **9.5/10**
- Files Analyzed: 2 (`vision-model-select.mjs` 316 lines, `vision-model-select.test.mjs` 244 lines)
- Issues Found: 0 P0, 0 P1, 4 P2/P3 (advisory)
- Grade: **PASS**

All 36 tests pass. Every safety invariant in the spec holds under direct adversarial probing. I could not find a way to make `selectVisionModel` throw, auto-select a thinking trap, or optimistically pick an unconfirmed model.

---

### Safety invariants — verified line-by-line

**Invariant 1 — THINKING-TRAP GUARD (`isThinkingTrap`, lines 105-113): PASS, no false-safe.**
- `qwen3-vl:8b` → trap (line 110-111: `startsWith("qwen3-vl:")` && no `-instruct`). Verified true.
- `qwen3-vl:30b` → trap. Verified.
- `qwen3-vl:8b-instruct` / `qwen3-vl:30b-instruct` → safe. Verified.
- `qwen2.5vl:7b`, `llama3.2-vision:11b`, `moondream:1.8b` → safe (not qwen3-vl family, no `-thinking`). Verified.
- `*-thinking` any family → trap (line 108, checked first). Verified `llama3.2-vision:11b-thinking` and even `qwen3-vl:30b-instruct-thinking` (a tag carrying both `-instruct` and `-thinking`) → **trap**, because the `-thinking` check at line 108 short-circuits before the instruct check. This is the correct precedence and a genuine adversarial case the production code gets right.
- Case-insensitivity via `.toLowerCase()` (line 107). Verified `QWEN3-VL:8B` → trap.
- Junk (`null`, `42`, `{}`, `""`) → `false` via the `typeof !== "string"` guard (line 106), never throws. Verified.

The guard is
... [+7250 chars truncated]
