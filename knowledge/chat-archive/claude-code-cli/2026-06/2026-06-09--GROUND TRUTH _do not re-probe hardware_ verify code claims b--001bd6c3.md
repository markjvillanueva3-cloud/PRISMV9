---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "GROUND TRUTH (do not re-probe hardware; verify code claims by reading files): - "
date: "2026-06-09"
first_ts: "2026-06-09T15:36:17.401Z"
last_ts: "2026-06-09T15:39:27.513Z"
cwd: "H:\\prism"
messages: 36
user_msgs: 15
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_6909faea-a97/agent-af5eeb3c8c8dc79c1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# GROUND TRUTH (do not re-probe hardware; verify code claims by reading files): - 

> **claude-code-cli** | 2026-06-09 | 36 msgs (15 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_6909faea-a97/agent-af5eeb3c8c8dc79c1.jsonl`

## Transcript

### User | 2026-06-09T15:36:17.401Z

GROUND TRUTH (do not re-probe hardware; verify code claims by reading files):
- GPU: NVIDIA RTX PRO 6000 Blackwell Workstation Edition — 96GB VRAM (97887 MiB), currently 39GB used / 57GB free, 6% util
- RAM: 127GB total, ~65GB free · CPU: AMD Ryzen 9 9950X3D 16-core
- Installed Ollama models (name, size): gpt-oss:120b = 65.4GB · qwen2.5-coder:32b = 19.9GB (currently loaded, 37GB VRAM w/ 16384 ctx) · gpt-oss:20b = 13.8GB · llama3.2-vision:11b = 7.8GB · qwen3-vl:8b-instruct = 6.1GB · qwen3-vl:8b = 6.1GB · qwen2.5vl:7b = 6.0GB · moondream:1.8b = 1.7GB · qwen2.5-coder:1.5b = 1.0GB · nomic-embed-text:latest = 0.3GB
- Offload telemetry: PRISM offload ~5% — totals: 5 offloaded / 88 keptOnClaude / 12131 tokensSaved. ollama-route-pretooluse fired 1495x but offloaded only 2 (34500 tok saved). ollama-task-offloader fired 102x, offloaded 5, kept 88, suggested 9. Target offload rate is >=30%.
- Routing engines: mcp-server/src/engines/ModelRoutingEngine.ts, mcp-server/src/engines/AISystemRouterEngine.ts, mcp-server/src/engines/OllamaTaskOffloaderEngine.ts, mcp-server/src/engines/OllamaHookBridgeEngine.ts, mcp-server/src/engines/MultiModelConsensusEngine.ts
- Routing libs: scripts/lib/local-llm-task-router.mjs, scripts/lib/multi-provider-router.mjs, .claude/hooks/lib/ollama-cost-router.mjs, .claude/hooks/lib/ollama-hook-bridge.mjs, scripts/ask-ollama.mjs
- Key hooks: .claude/hooks/ollama-route-pretooluse.mjs, .claude/hooks/ollama-task-offloader.mjs, .claude/hooks/ollama-auto-router.mjs, .claude/hooks/ollama-unified-semantic-router.mjs, .claude/hooks/ollama-reviewer-second-opinion.mjs, .claude/hooks/prompt-rewriter-ollama.mjs
- Dashboards/config: scripts/ollama-offload-dashboard.mjs, mcp-server/scripts/ollama-docker-launcher.mjs, state/shared/DOCKER_RUNTIME_STATE.json, mcp-server/data/state/ollama-offload-stats.json
GOAL: Prove the most powerful available local LLMs actively run + auto-run depending on task; make each of the 10 models auto-used for its best-fit task; raise offload 
... [+24792 chars truncated]

### Assistant | 2026-06-09T15:36:37.146Z

I'll adversarially verify this plan on the capability-fit axis. Let me start by reading the load-bearing files to ground every claim, then probe the model→task assignments and VRAM arithmetic.

### Assistant | 2026-06-09T15:36:38.165Z

[tool_use: Read]

### Assistant | 2026-06-09T15:36:39.262Z

[tool_use: Read]

### Assistant | 2026-06-09T15:36:39.906Z

[tool_use: Read]

### User | 2026-06-09T15:36:40.391Z

[tool_result] 240	    codeTier: 55,
241	    latencyMsTypical: 2200,
242	    inputCostUSDPer1k: 0,
243	    outputCostUSDPer1k: 0,
244	    runsOn: ["home_blackwell"],
245	    tags: ["chat", "vision"],
246	  },
247	
248	  // ── gpt-oss / gemma4 stack (BLACKWELL-MODEL-INTEGRATION-MS0 P2, 2026-06-06) ──
249	  // The post-swap target tiers: gpt-oss:120b is the strongest LOCAL synthesis/
250	  // reasoning voice (true
... [+4792 chars truncated]

### User | 2026-06-09T15:36:42.491Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+3044 chars truncated]

### User | 2026-06-09T15:36:43.548Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ollama-docker-launcher.mjs — Idempotent Docker/Ollama activator
4	 *
5	 * Brings up the PRISM local compute stack:
6	 *   1. Launches Docker Desktop if stopped (Windows-aware)
7	 *   2. Waits for Docker daemon ready (timeout-guarded)
8	 *   3. Brings up requested compose services (default: postgres, prism-server,
9	 *      prometheus, ollama, qdrant) via docker-com
... [+2797 chars truncated]

### Assistant | 2026-06-09T15:36:48.204Z

The catalog comment block (lines 248-308) is more nuanced than the plan claims — the FLOOR is explicitly documented as a deliberate phantom-traffic guard, not merely "stale." Let me verify the key model-pick mechanics and the actual model capabilities. Let me read the ask-ollama mode set, the VLM ensemble, and the offloader.

### Assistant | 2026-06-09T15:36:49.654Z

[tool_use: Read]

### Assistant | 2026-06-09T15:36:49.662Z

[tool_use: Read]

### User | 2026-06-09T15:36:51.545Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\host-aware-synthesis-model.mjs' was already read 10m ago in this session and is unchanged (mtime 1780543245747). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-09T15:36:51.985Z

[tool_result] 70	 * naturally at done_reason:"stop"). Reasoning models (gpt-oss harmony format)
71	 * emit a `thinking` channel BEFORE the final `response`; Ollama's 128-token
72	 * default starves them so `response` returns empty (done_reason:"length").
73	 * 1024 lets a reasoning model finish its chain-of-thought AND emit the answer.
74	 * Verified 2026-06-08: gpt-oss:120b @128 -> empty response; @1024 -> don
... [+6049 chars truncated]

### Assistant | 2026-06-09T15:37:12.277Z

CONFIRMED: `ALL_MODES` = `{summarize, explain, triage, viz, ask}` (ask-ollama.mjs:91-93). The plan's claim that `draft`/`gen-test`/`diff-summary` are absent is verified. The read-guard says host-aware-synthesis-model.mjs is already in context — let me grep it for the model resolution logic, and read the VLM ensemble fuse to verify the OCR model assignments, plus the offloader's SAFE_AUTOEXEC.

### Assistant | 2026-06-09T15:37:13.503Z

[tool_use: Grep]

### Assistant | 2026-06-09T15:37:15.155Z

[tool_use: Grep]

### User | 2026-06-09T15:37:17.068Z

[tool_result] 7:// `qwen2.5-coder:7b` (or `:3b`). On the 96GB RTX PRO 6000 Blackwell that
8:// throttles synthesis quality to a 7B model while `qwen2.5-coder:32b` (20GB)
32: * Fail-soft (R12-honest): returns `[]` on ANY failure (Ollama down, timeout,
37: * @returns {Promise<string[]>}
53:    if (!res || !res.ok) return [];
56:    return models
60:    return [];
70: *      detected host class + installed models.
... [+952 chars truncated]

### User | 2026-06-09T15:37:18.359Z

[tool_result] 1:// scripts/lib/vision-ensemble-fuse.mjs
3:// U-XRAY-VISION-ENSEMBLE — multi-VLM ensemble blueprint OCR with consensus fusion.
6://   The single-model OCR path pins ONE vision model (qwen3-vl:8b-instruct) because the
8://   ~85GB idle in practice) removes that ceiling — it can hold THREE diverse VLM families
9://   GPU-resident at once (qwen3-vl + qwen2.5-vl + llama3.2-vision ≈ 31GB) and serve th
... [+2536 chars truncated]

### Assistant | 2026-06-09T15:37:25.758Z

Now I have the key facts. `resolveSynthesisModel` returns `qwen2.5-coder:32b` as the blackwell-best (line 70-73), NOT gpt-oss:120b — the comment header confirms the 32B is the synthesis default. The ensemble uses 3 VLM families (≈31GB, line 9). Let me verify the actual VLM model identities used in the ensemble, check the offloader SAFE_AUTOEXEC, and confirm the live `/api/ps` / context-length facts.

### Assistant | 2026-06-09T15:37:26.925Z

[tool_use: Read]

### Assistant | 2026-06-09T15:37:28.422Z

[tool_use: Grep]

### User | 2026-06-09T15:37:30.386Z

[tool_result] 395	 * Impure: run an ensemble of VLMs over ONE image CONCURRENTLY, then fuse. The image is read
396	 * + base64'd ONCE and shared across all models (one disk read, N inferences). Every model
397	 * runs in parallel via Promise.all — the Blackwell exploit. One model's failure is recorded
398	 * and excluded from the fuse; the ensemble still produces a result from the survivors.
399	 *
400	 * @para
... [+2836 chars truncated]

### User | 2026-06-09T15:37:31.231Z

[tool_result] 10: * Analyzes incoming prompts and suggests offloading simple tasks to Ollama:
21: * - Max 1 suggestion per 5 minutes per task category
83:// CONFIDENCE_THRESHOLD → recorded as silent suggest instead of offload).
87:  // user's actual orchestration prompts). Higher confidence — catch first.
108:  // PRISM orchestration commands — keep on Claude (multi-tool, slot-binding,
113:  // as orchestration
... [+4172 chars truncated]

### Assistant | 2026-06-09T15:37:37.845Z

Critical confirmation on the offloader: even the SAFE_AUTOEXEC path records `decision: "suggest"` with `mode: "auto-exec-directive"` (lines 576-580) — it emits an imperative directive STRING but never calls Ollama, and never records `decision: "offloaded"`. The plan's diagnosis is correct. Let me confirm the exact SAFE_AUTOEXEC categories and ascertain whether moondream/qwen3-vl context handling is real. Let me read SAFE_AUTOEXEC contents and the ensemble's default model list (caller), then verify live `/api/ps` for the context-length claim.

### Assistant | 2026-06-09T15:37:39.262Z

[tool_use: Read]

### Assistant | 2026-06-09T15:37:41.866Z

[tool_use: Grep]

### User | 2026-06-09T15:37:43.953Z

[tool_result] 362	
363	// U-LIMA-A1: safe-category auto-offload. These offloader categories map to a
364	// concrete `scripts/ask-ollama.mjs` mode — a self-contained file→digest task
365	// with no cross-file reasoning, so the offload is genuinely safe to act on.
366	// For these the hook emits an IMPERATIVE directive ("run this, relay it")
367	// instead of the soft "you could delegate" suggestion — the adopti
... [+1432 chars truncated]

### Assistant | 2026-06-09T15:37:44.991Z

[tool_use: Bash]

### User | 2026-06-09T15:37:47.807Z

[tool_result] scripts\bench-vision-ocr-ab.mjs:30://        [--baseline qwen3-vl:8b-instruct] [--seed-base 7000] [--max-time-sec 300]
scripts\bench-vision-ocr-ab.mjs:76:const VISION_FAMILY_RE = /(^|[:/-])(vl|vision|llava|moondream|minicpm-?v|bakllava)\b|vl:/i;
scripts\bench-vision-ocr-ab.mjs:162:    log(`[ab] NOTE: only the baseline is runnable — verdict will be "stay" (no candidate). Pull a candidate (e.g. qwen
... [+4667 chars truncated]

### User | 2026-06-09T15:37:56.985Z

[tool_result] [
 {
  "name": "nomic-embed-text:latest",
  "sizeGB": "0.3",
  "vramGB": "0.3",
  "ctx": 2048
 },
 {
  "name": "gpt-oss:20b",
  "sizeGB": "13.4",
  "vramGB": "13.4",
  "ctx": 32768
 }
]

### Assistant | 2026-06-09T15:38:06.219Z

Key live finding: gpt-oss:20b is loaded at ctx 32768 (proving the model supports a long context), but nomic-embed-text is loaded at **ctx 2048** — its native max. gpt-oss:120b is NOT currently resident (contradicting one plan claim that it's co-resident, but that's an environmental snapshot, not a plan defect). Let me verify the OCR lib's VLM VRAM facts and the offloader's full classifyPrompt to confirm the wrapper-classification claim, then I have enough.

### Assistant | 2026-06-09T15:38:07.159Z

[tool_use: Read]

### Assistant | 2026-06-09T15:38:08.031Z

[tool_use: Read]

### User | 2026-06-09T15:38:11.359Z

[tool_result] 20	//
21	// PURE: no fs, no fetch. Caller does HTTP + image-bytes load.
22	
23	// qwen3-vl:8b-instruct is the GPU-concurrency unlock (validated 2026-05-31, slot xray):
24	// loads at 8.1GB GPU-RESIDENT (vs qwen2.5vl:7b's 15.3GB which spills to CPU on a 16GB
25	// card once the desktop's ~4.5GB baseline is subtracted → >180s/page timeout). At 8.1GB
26	// it fits CONCURRENTLY with the chat fleet's q
... [+1377 chars truncated]

### User | 2026-06-09T15:38:12.575Z

[tool_result] 330	function classifyPrompt(prompt) {
331	  const p = prompt.toLowerCase();
332	
333	  // Safety-physics pre-gate — see SAFETY_PRE comment above. Normalize first so
334	  // Unicode homoglyphs / zero-width splicing cannot evade the gate.
335	  if (SAFETY_PRE.test(normalizeForSafety(p))) {
336	    return { offloadable: false, category: "safety_physics", savings: 0 };
337	  }
338	
339	  // OLLAMA-DE
... [+859 chars truncated]

### Assistant | 2026-06-09T15:39:27.513Z

I now have all load-bearing facts verified against live code. I have everything I need to deliver the adversarial verdict on the capability-fit + VRAM-budget axes.

Key live-measured facts driving the refutations:
- gpt-oss:20b loads at exactly **13.4 GB** VRAM at ctx 32768 (live `/api/ps`), not the plan's 13.8 GB weights + separate KV — KV is *included* in that 13.4 GB resident figure.
- nomic-embed-text loads at ctx **2048** (its native max) — the plan never assigns it a context but the "32768 universal" framing in §3 is silently wrong for the embedder.
- qwen3-vl:8b-instruct = **8.1 GB GPU-resident at num_ctx 8192** (ollama-vision-extract-lib.mjs:23-31), NOT the plan's "6.1 GB weights + 0.3 KV at 32K."
- qwen2.5vl:7b = **15.3 GB resident** (spills on a 16GB card), per the same comment — wildly above the plan's "6.0 GB."

---

# ADVERSARIAL VERDICT — capability-fit + VRAM-budget axes

The plan's *control-flow/wiring* diagnosis is largely sound (SAFE_AUTOEXEC is suggest-only — confirmed `ollama-task-offloader.mjs:370-381,576-580`; `ALL_MODES` lacks draft/gen-test/diff-summary — confirmed `ask-ollama.mjs:91-93`; FLOOR tiers strand 120b in the scorer — confirmed `ModelRoutingEngine.ts:275-276`). **But on my two assigned axes the plan has hard, disqualifying errors.** REFUTE.

## REFUTED — VRAM arithmetic (the §3 resident set does NOT fit as stated)

**The plan's per-model VRAM figures are wrong in the same direction every time: it uses the `ollama list` *disk* size as the *resident* size, then adds a separately-computed KV on top — but Ollama's resident footprint already includes weights + KV + compute buffers + projector.** The real resident numbers are larger.

Corrected resident footprints from live measurement / repo facts:

| Model | Plan §3 claim | LIVE / repo-measured resident | Source |
|---|---|---|---|
| gpt-oss:20b | 13.8 + KV | **13.4 GB @ ctx 32768 (KV included)** | live `/api/ps` this session |
| qwen3-vl:8b-instruct | 6.4 GB (6.1+0.3 @32K) | **8.1 GB @
... [+9431 chars truncated]
