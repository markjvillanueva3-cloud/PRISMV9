---
type: "chat-session"
source: "claude-code-cli"
session_id: "be279b4f-04df-4b74-aca2-548840cc346d"
title: "You are the synthesis lead for a PRISM upgrade. OPERATOR DIRECTIVE (authoritativ"
date: "2026-06-11"
first_ts: "2026-06-11T00:21:13.889Z"
last_ts: "2026-06-11T00:23:34.894Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/be279b4f-04df-4b74-aca2-548840cc346d/subagents/workflows/wf_e0b2ef38-5f6/agent-a62f5151160ba82cd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# You are the synthesis lead for a PRISM upgrade. OPERATOR DIRECTIVE (authoritativ

> **claude-code-cli** | 2026-06-11 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/be279b4f-04df-4b74-aca2-548840cc346d/subagents/workflows/wf_e0b2ef38-5f6/agent-a62f5151160ba82cd.jsonl`

## Transcript

### User | 2026-06-11T00:21:13.889Z

You are the synthesis lead for a PRISM upgrade. OPERATOR DIRECTIVE (authoritative): "Make sure vLLM + Ollama + Docker are properly set up. Evaluate our auto Ollama offloading within common dev slash commands (/loop /goal /smart /forge /checkin-nato /startup-nato) -- we need auto-utilization of the BEST available Ollama LLM per task for heavy token savings. Upgrade those slash commands with new loop instructions + agentic coding techniques. Upgrade /smart and wire it into all the other slash commands to auto-enforce model-changing per task for further token savings. Apply to every level + all galaxies: memories, CLAUDE.md, souls.md, wikis, settings."

Five scouts mapped the system. Their reports:

===== SCOUT 1: OFFLOAD MECHANISM =====
I now have everything needed. The critical finding: `PRISM_OLLAMA_ROUTE_AUTO` is NOT in the settings.json env block (lines 5-31) despite the memory claiming it was enabled — confirming the route-pretooluse hook defaults to suggest-only. I have the full picture across all five report sections.

---

1. ROUTING DECISION — what triggers an offload

Offload is automatic at the HOOK layer (not opt-in per task), via two independent always-on hooks, but it is overwhelmingly advisory — almost nothing is force-substituted. There are three distinct routing surfaces:

- (a) Prompt-level classifier — `.claude/hooks/ollama-task-offloader.mjs` (UserPromptSubmit, T4, wired at `settings.json:795`). On every prompt ≥20 chars it runs `classifyPrompt()`: a SAFETY_PRE gate (physics/Kienzle/Taylor → never offload), then `OFFLOADABLE_PATTERNS` (regex → category+savings), then a `KEEP_ON_CLAUDE` fallback labeler. If offloadable AND `savings ≥ 0.80` AND not rate-limited (60s/category) AND Ollama `/api/tags` is reachable, it records `decision:"offload"` and injects an `additionalContext` directive. For four "safe-autoexec" categories (`explanation/summary/git_summary/documentation`) with a detected file target, it emits an IMPERATIVE directive (`⚡ AUTO-OFFLOAD
... [+55143 chars truncated]

### Assistant | 2026-06-11T00:21:21.168Z

This is a large synthesis task. The operator wants a dependency-ordered build plan. Let me verify a few load-bearing claims from the scouts that directly contradict each other before producing the plan, since the plan's correctness depends on resolving them.

The most important conflict: Scout 1 and Scout 5 disagree on whether `PRISM_OLLAMA_ROUTE_AUTO` and related keys are in settings.json. Scout 1 says they're ABSENT from the H: env block; Scout 5 says they're PRESENT at C: lines 10-12 (`PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1`, `PRISM_OLLAMA_ROUTE_AUTO=1`, `PRISM_CODEGEN_MODEL=gpt-oss:120b`). This is foundational — if the AUTO path is already armed, U1 changes completely. Let me verify directly.

### Assistant | 2026-06-11T00:21:24.643Z

[tool_use: Bash]

### Assistant | 2026-06-11T00:21:27.505Z

[tool_use: Bash]

### User | 2026-06-11T00:21:28.685Z

[tool_result] === C: settings env block (lines 1-40) ===
5:    "OLLAMA_MODELS": "H:/Tools/ollama/models",
10:    "PRISM_OLLAMA_OFFLOAD_AUTOEXEC": "1",
11:    "PRISM_OLLAMA_ROUTE_AUTO": "1",
12:    "PRISM_CODEGEN_MODEL": "gpt-oss:120b",
13:    "OLLAMA_URL": "http://127.0.0.1:11434",
16:    "NIM_URL": "http://127.0.0.1:8000/v1",
17:    "NIM_EMBED_URL": "http://127.0.0.1:8010/v1",
18:    "VLLM_URL": "http://127.0.
... [+566 chars truncated]

### User | 2026-06-11T00:21:32.834Z

[tool_result] === live ollama roster ===
"name":"qwen2.5-coder:1.5b"
"name":"gpt-oss:120b"
"name":"qwen2.5-coder:32b"
"name":"gpt-oss:20b"
"name":"qwen3-vl:8b-instruct"
"name":"qwen3-vl:8b"
"name":"qwen2.5vl:7b"
"name":"moondream:1.8b"
"name":"llama3.2-vision:11b"
"name":"nomic-embed-text:latest"
=== ollama offload stats ===

### Assistant | 2026-06-11T00:21:38.106Z

Critical correction confirmed: Scout 1 was WRONG. The keys ARE present in BOTH C: and H: settings.json (`PRISM_OLLAMA_ROUTE_AUTO=1`, `PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1`, `PRISM_CODEGEN_MODEL=gpt-oss:120b`). Scout 5 was right. This means Scout 1's entire "DEFECT — AUTO path not armed" thesis is FALSE — the AUTO path IS armed. Scout 1 likely read a stale snapshot or the wrong line range. The offload-stats grep returned empty (different field names or file moved). Let me verify the stats file and the cost-router function name before finalizing.

### Assistant | 2026-06-11T00:21:40.874Z

[tool_use: Bash]

### User | 2026-06-11T00:21:45.378Z

[tool_result] === stats file head ===
{
  "schemaVersion": "2.0.0",
  "offloaded": 62,
  "keptOnClaude": 603,
  "estimatedTokensSaved": 65143,
  "silentSuggestions": 611,
  "injectedSuggestions": 62,
  "byHook": {
    "ollama-task-offloader": {
      "fired": 781,
      "offloaded": 62,
      "kept": 603,
      "suggested": 116,
      "tokensSaved": 65143
    },
    "grep-index-first": {
      "fired": 1986,
  
... [+721 chars truncated]

### Assistant | 2026-06-11T00:23:34.894Z

Verified. Key facts now confirmed against live state:
- `routeModelForTask({category, available, hardware})` exists at `ollama-cost-router.mjs:150` — the routing core already exists; CORE CAPABILITY is an EXTEND, not a new build.
- `vllm-hook-bridge.mjs` is present (4KB) with availability-cache exports — the vLLM client lane exists.
- Route-pretooluse fired 5730, offloaded 4 despite `PRISM_OLLAMA_ROUTE_AUTO=1` being set — so the dead surface is real, but the cause is NOT an unset knob (Scout 1's thesis). It's the narrow `isGistSafe` allowlist + low nudge take-rate.

I have enough to produce the plan. Final answer follows.

---

# PRISM LOCAL-LLM ROUTING UPGRADE — DEPENDENCY-ORDERED BUILD PLAN

## CRITICAL CORRECTIONS TO SCOUT REPORTS (verified live this session — resolve before building)

1. **Scout 1's central "DEFECT" is FALSE.** `PRISM_OLLAMA_ROUTE_AUTO=1`, `PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1`, `PRISM_CODEGEN_MODEL=gpt-oss:120b` are ALL present in **both** `C:/Users/wompu/.claude/settings.json` AND `H:/.claude/settings.json` (lines 10-12, byte-identical, verified). Scout 5 was correct. The AUTO path **is armed**. Do NOT build "arm the AUTO knob" as a unit — it is done.
2. **The route-pretooluse dead surface is REAL but mis-diagnosed.** It fired 5730, offloaded 4 *with the knob on*. Root cause is the narrow `isGistSafe` allowlist (`.log/.txt/.out` only — all `.json/.jsonl/.csv/.md` digests excluded by design) plus near-0% nudge take-rate — NOT an unset env var. The fix is allowlist/auto-substitute scope, not a knob.
3. **`routeModelForTask({category, available, hardware})` EXISTS** at `.claude/hooks/hooks/lib/ollama-cost-router.mjs:150`. The per-task model router is **already built**. CORE CAPABILITY = EXTEND this function. duplication-guard will (correctly) THROW on any new "model router" engine.
4. **`vllm-hook-bridge.mjs` EXISTS** (`.claude/hooks/lib/vllm-hook-bridge.mjs`, with `resetVllmAvailabilityCache` + availability cache). vLLM client lane is built; it is un
... [+16596 chars truncated]
