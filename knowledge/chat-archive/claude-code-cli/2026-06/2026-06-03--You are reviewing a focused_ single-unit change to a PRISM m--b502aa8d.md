---
type: "chat-session"
source: "claude-code-cli"
session_id: "b502aa8d-3a90-4735-9eed-98f2a773f4e2"
title: "You are reviewing a focused, single-unit change to a PRISM manufacturing-intelli"
date: "2026-06-03"
first_ts: "2026-06-03T17:56:46.638Z"
last_ts: "2026-06-03T17:57:39.789Z"
cwd: "H:\\prism\\mcp-server"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/b502aa8d-3a90-4735-9eed-98f2a773f4e2/subagents/agent-a8005af1f70c4311b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# You are reviewing a focused, single-unit change to a PRISM manufacturing-intelli

> **claude-code-cli** | 2026-06-03 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/b502aa8d-3a90-4735-9eed-98f2a773f4e2/subagents/agent-a8005af1f70c4311b.jsonl`

## Transcript

### User | 2026-06-03T17:56:46.638Z

You are reviewing a focused, single-unit change to a PRISM manufacturing-intelligence engine. Read these files END-TO-END:

1. H:\prism\mcp-server\src\engines\ModelRoutingEngine.ts  (the changed engine)
2. H:\prism\mcp-server\src\schemas\orchestrationActionSchemas.ts  (only the `local_model_route` action schema near line 365-380 changed — the `hardware` z.enum)

UNIT SPEC (U-BW-ROUTE-PROFILE, milestone BLACKWELL-TOKEN-SYNERGY-MS0):
A new RTX PRO 6000 Blackwell 96GB GPU was installed on this machine. Ollama now runs large local models on the GPU (free, ~220 tok/s warm). This unit teaches the ModelRoutingEngine (a pure scoring function that decides ollama-vs-cloud per request) about the GPU so it routes code + substantial reasoning to the FREE local 32B instead of paid Claude — a token-saving measure.

Changes made:
- Added `"home_blackwell"` to the `HardwareProfile` union type.
- Added 4 real GPU-class local models to DEFAULT_MODEL_CATALOG: qwen2.5-coder:32b (vram 20, qualityTier 83, codeTier 90), deepseek-r1:14b (vram 9, qualityTier 80), qwen2.5-coder:14b (vram 9, qualityTier 72, codeTier 82), qwen3-vl:8b (vram 6, qualityTier 66). VRAM values come from the live `ollama /api/tags` (these models are confirmed pulled).
- Added `home_blackwell` to the `runsOn` of every entry that previously listed `home_4080` (superset invariant: Blackwell runs everything a 4080 can).
- Added `home_blackwell` to the schema z.enum.

VERIFY THESE INVARIANTS (flag any violation as P0/P1):
1. SAFETY (most important): NO local (backend:"ollama") model has qualityTier >= 85. The `canServe()` safety_critical tier floor is 85 — any local model at >=85 would let a local model serve a safety-critical manufacturing decision (force/collision/workholding), which design rule #1 forbids. Confirm the highest local tier is 83.
2. The schema z.enum values EXACTLY match the HardwareProfile union members (home_blackwell, home_4080, work_3080, cloud_only).
3. runsOn superset correctness: any model runnable 
... [+689 chars truncated]

### Assistant | 2026-06-03T17:56:59.562Z

I'll review the changed files end-to-end against the unit spec invariants.

### Assistant | 2026-06-03T17:57:00.050Z

[tool_use: Read]

### Assistant | 2026-06-03T17:57:00.719Z

[tool_use: Read]

### User | 2026-06-03T17:57:02.695Z

[tool_result] 1	/**
2	 * ModelRoutingEngine — Phase 0.19 U-LLM7
3	 *
4	 * Decide which LLM backend/model should service a given request so simple
5	 * queries take the local Ollama path (free, on-prem, fast once warm) and
6	 * only queries that genuinely need frontier reasoning fall back to the paid
7	 * Claude/OpenAI APIs. Pure scoring function: the engine does NO network I/O
8	 * — callers feed it request fea
... [+28270 chars truncated]

### User | 2026-06-03T17:57:03.047Z

[tool_result] 340	    problem: z.string().min(1).describe("Problem statement"),
341	    domain: z.string().min(1).describe("AI capability domain"),
342	    constraints: z.array(z.string()).describe("Constraints (may be empty array)"),
343	    context: z.record(z.string(), z.unknown()).describe("Context map (may be empty object)"),
344	    preferred_modes: z.array(z.string()).optional().describe("Preferred reaso
... [+4024 chars truncated]

### Assistant | 2026-06-03T17:57:39.789Z

I have both files read end-to-end. Let me verify each invariant systematically.

**Invariant 1 — SAFETY (no local model qualityTier >= 85):** Scanning every `backend: "ollama"` entry:
- qwen2.5-coder:32b → 83 (line 142)
- deepseek-r1:14b → 80 (line 154)
- qwen2.5-coder:14b → 72 (line 167)
- qwen3-vl:8b → 66 (line 180)
- phi3:14b → 62, mistral:7b → 55, qwen2.5-coder:7b → 52, mistral:7b-q4 → 48, phi3:3.8b → 44, llama3.2:3b → 40, nomic-embed-text → 60

Highest local = **83** (the new 32B). All ollama < 85. The `canServe()` floor (line 563: `req.taskKind === "safety_critical" && m.qualityTier < 85`) correctly rejects every local model. PASS.

**Invariant 2 — schema z.enum == HardwareProfile union:** Union (lines 43-47): `home_blackwell, home_4080, work_3080, cloud_only`. Schema (line 376): `["home_blackwell", "home_4080", "work_3080", "cloud_only"]`. Exact match, same order, no extras/omissions. PASS.

**Invariant 3 — runsOn superset:** Every model with `home_4080` in runsOn also lists `home_blackwell` (deepseek-r1:14b L159, qwen2.5-coder:14b L172, qwen3-vl:8b L185, phi3:14b L203, mistral:7b L216, qwen2.5-coder:7b L229, llama3.2:3b L270, nomic + all cloud). The 32B (line 146) is `["home_blackwell"]`-only — correct, 20GB won't fit a 16GB 4080. No model lists home_4080 without home_blackwell. PASS.

**Invariant 4 — no inlined physics constants / no stubs / no broken exhaustive switches:** No physics constants here (routing engine, N/A as expected). No stub/placeholder — full scoring logic intact. Checked every consumer of `HardwareProfile`: `RoutingContext.hardware`, `canServe` (`m.runsOn.includes(ctx.hardware)` — membership test, not switch), `getBackendStatus`, `getStats`. **No exhaustive `switch` on `HardwareProfile` anywhere** — the new union member introduces no non-exhaustiveness. PASS.

**Invariant 5 — ModelSpec shape complete on new entries:** `codeTier` is optional (line 60); all other fields required. Checking the 4 new entries:
- qwen2.5-coder:32b (136-148): id
... [+2855 chars truncated]
