---
type: "chat-session"
source: "claude-code-cli"
session_id: "54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6"
title: "Independent second-pass review of ONE Python file: `H:/prism/mcp-server/scripts/"
date: "2026-06-04"
first_ts: "2026-06-04T19:43:04.276Z"
last_ts: "2026-06-04T19:46:13.498Z"
cwd: "H:\\prism\\mcp-server\\scripts"
messages: 19
user_msgs: 7
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/agent-a3cef385abbeb4a57.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent second-pass review of ONE Python file: `H:/prism/mcp-server/scripts/

> **claude-code-cli** | 2026-06-04 | 19 msgs (7 user / 12 assistant) | cwd: H:\prism\mcp-server\scripts
> Raw: `H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/agent-a3cef385abbeb4a57.jsonl`

## Transcript

### User | 2026-06-04T19:43:04.276Z

Independent second-pass review of ONE Python file: `H:/prism/mcp-server/scripts/blueprint_vl_train_lora.py` — a Qwen2.5-VL PEFT LoRA trainer for blueprint OCR. This is PRISM's per-file scrutiny gate (do NOT assume a prior reviewer caught everything). Be rigorous and TERSE.

Weight your review toward what a correctness reviewer might MISS:
- **Integration / contract drift**: it consumes a bundle produced by `H:/prism/mcp-server/src/engines/BlueprintLoRABridgeEngine.ts` exportBundle local-lora format `{prompt:"Print: <pdfPath> Context: <ctx>", completion:<value>}` and runs via `H:/prism/scripts/lib/py-subprocess-bridge.mjs` (NDJSON: stdout JSON-only, logs→stderr, structured result on every exit path). Does the PROMPT_RE regex actually round-trip the EXACT string the bridge emits (note: `Print: ${p.pdfPath} Context: ${p.context}` — what if context itself contains the substring " Context: " or the path contains " Context: "? greedy vs non-greedy `.*?`)? Flag any parse ambiguity.
- **Silent failure / fail-loud (R12)**: any `except: pass`, swallowed error, or path that could emit ok:true on a degenerate result. Is the empty-eval Brier honestly None (not 0)? Is a 0-trainable / all-skipped bundle refused loudly?
- **Honesty (R9)**: the Brier is computed on pseudo-labels (ensemble-distilled). Is that UNMISTAKABLY stamped (brier_basis, eval_gate_satisfied:false) so nobody promotes an adapter on it? Is there any wording that overstates it as a deploy gate?
- **Naming/convention conformance** with the repo (the file header cites the takeover plan; compare claims against reality), inlined magic constants that should be named, security (does it shell out / eval / write outside the output dir?).
- **Resource correctness**: PyMuPDF doc.close() in finally (leak?), image handles, CUDA tree on failure.

CONTEXT: it cannot be executed here (no torch/peft/Blackwell-torch). `--self-test` (pure logic, 13 checks) and the missing_dependency fail-loud path were ALREADY validated live and pas
... [+153 chars truncated]

### Assistant | 2026-06-04T19:43:18.042Z

I'll review the file now.

### Assistant | 2026-06-04T19:43:18.575Z

[tool_use: Read]

### User | 2026-06-04T19:43:21.199Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\scripts\blueprint_vl_train_lora.py' was already read 6s ago in this session and is unchanged (mtime 1780601983276). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### Assistant | 2026-06-04T19:43:24.992Z

The guard says the file is already in context, but I don't actually see its contents in my context. Let me read it with explicit parameters to bypass.

### Assistant | 2026-06-04T19:43:26.563Z

[tool_use: Bash]

### User | 2026-06-04T19:43:52.443Z

[tool_result] 531 /h/prism/mcp-server/scripts/blueprint_vl_train_lora.py

### Assistant | 2026-06-04T19:43:56.131Z

[tool_use: Read]

### User | 2026-06-04T19:44:21.709Z

[tool_result] 1	#!/usr/bin/env python3
2	"""
3	blueprint_vl_train_lora.py — BLACKWELL-AI-MS0 / U-XRAY-VL-TRAINER (slot:xray, acting for india)
4	
5	The REAL Qwen2.5-VL PEFT (LoRA) trainer for the blueprint-vision OCR loop. This is the
6	keystone that `wedm_train_lora.py` never was: that script is a TEXT-ONLY SIMULATION stub
7	(prints fake epoch losses, imports only argparse/json/os, never touches a GPU). This o
... [+14023 chars truncated]

### Assistant | 2026-06-04T19:44:28.814Z

Now the rest of the file including the real train path.

### Assistant | 2026-06-04T19:44:29.201Z

[tool_use: Read]

### User | 2026-06-04T19:44:35.560Z

[tool_result] 270	        return (False, {"reason": "matmul_threw", "error": str(e),
271	                        "hint": "sm_120 needs torch>=2.7/cu128; is_available() is a false positive"})
272	
273	
274	# ════════════════════════════════════════════════════════════════════════════════════════════
275	# DATA — resolve each pdfPath -> pixels (rasterize PDFs; open images directly).
276	# ════════════════════════
... [+14057 chars truncated]

### Assistant | 2026-06-04T19:44:39.725Z

Now let me verify the exact prompt string the bridge emits, to assess the PROMPT_RE round-trip ambiguity. Let me check the bridge engine.

### Assistant | 2026-06-04T19:44:41.035Z

[tool_use: Grep]

### User | 2026-06-04T19:44:58.112Z

[tool_result] 25-
26-// ── Domain ──────────────────────────────────────────────────────────────────
27-
28:export const LORA_PROVIDERS = ["gemini-finetune", "openai-finetune", "modal", "local-lora"] as const;
29-export type LoRAProvider = (typeof LORA_PROVIDERS)[number];
30-
31-export const LORA_CONFIDENCE_TIERS = ["operator_verified", "ensemble_consensus", "single_backend"] as const;
--
35-  pairId: string;
3
... [+1852 chars truncated]

### Assistant | 2026-06-04T19:45:03.919Z

I have confirmed the exact bridge contract. Now let me analyze the critical parse round-trip carefully and check the `anonymizePath` / `anonymizeText` functions, since they shape what can land in the prompt.

### Assistant | 2026-06-04T19:45:05.572Z

[tool_use: Grep]

### User | 2026-06-04T19:45:24.025Z

[tool_result] 285:export function anonymizePath(p: string): string {
286-  // Strip drive letter + customer-name path components. Use lookbehind+lookahead
287-  // so the path separators don't get consumed (otherwise adjacent customer dirs
288-  // share one delimiter and the second name is missed — the test fixture
289-  // `/JM DIE/ALCOA/AB-001/` triggers this exact bug).
290-  return p
291-    .replace(/^[A-
... [+672 chars truncated]

### Assistant | 2026-06-04T19:46:13.498Z

I now have everything needed. Let me reason carefully about the PROMPT_RE round-trip, which is the highest-value finding area.

The bridge emits exactly: `Print: ${pdfPath} Context: ${context}` (single space after each colon, joined verbatim).

The regex is: `^Print:\s*(?P<path>.*?)\s*Context:\s*(?P<context>.*)$` with `re.DOTALL`.

Key analysis of the ambiguity vectors:

1. **Non-greedy `path` (`.*?`) + first `Context:` wins.** Because `path` is non-greedy, the regex anchors on the **first** literal `Context:` it can find. So if the **pdfPath contains " Context: "**, the path group stops early and the real context gets prepended with the leftover path tail. A Windows path can absolutely contain a folder literally named `Context` (e.g. `H:\...\Context\dim.pdf` → after `anonymizePath` → `/.../Context/dim.pdf`). But note: the literal token is `Context:` (with a colon). A directory name can't contain `:` on Windows/POSIX, so a path segment named `Context` would render as `/Context/` not `Context:`. The path tail would need the substring `Context:` exactly — a colon mid-path is illegal on Windows and unusual on POSIX. So path-side collision is near-impossible in practice. Low risk, worth a P2 note.

2. **The `context` group is greedy (`.*`) to end-of-string** — so if the **context itself contains ` Context: `**, that's harmless (greedy grabs all of it into context). Good. The real failure is only if context contains an earlier `Context:` than... no — path is non-greedy so it locks the *first* `Context:`. If the path has no `Context:` (the normal case), the first `Context:` is the real delimiter, and everything after (including any further `Context:` in the context text) is captured. Round-trips correctly. 

3. **`completion` / label** is taken verbatim (`.strip()`) — `groundTruthValue` → no parse. Fine.

Let me confirm the one real residual: empty context. Bridge emits `Print: <path> Context: ` (trailing space, empty context). Regex: `\s*Context:\s*(?P<context>.*)$` → co
... [+5717 chars truncated]
