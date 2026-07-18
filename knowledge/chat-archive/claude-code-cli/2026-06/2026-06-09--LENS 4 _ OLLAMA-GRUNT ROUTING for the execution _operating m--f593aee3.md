---
type: "chat-session"
source: "claude-code-cli"
session_id: "f593aee3-12cf-4e8a-a566-8411386cc606"
title: "LENS 4 — OLLAMA-GRUNT ROUTING for the execution (operating model). DELTA (CAD) /"
date: "2026-06-09"
first_ts: "2026-06-09T23:37:21.853Z"
last_ts: "2026-06-09T23:39:42.852Z"
cwd: "H:\\prism"
messages: 16
user_msgs: 7
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/f593aee3-12cf-4e8a-a566-8411386cc606/subagents/workflows/wf_7909e40d-9ee/agent-a175680418aa53f81.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# LENS 4 — OLLAMA-GRUNT ROUTING for the execution (operating model). DELTA (CAD) /

> **claude-code-cli** | 2026-06-09 | 16 msgs (7 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/f593aee3-12cf-4e8a-a566-8411386cc606/subagents/workflows/wf_7909e40d-9ee/agent-a175680418aa53f81.jsonl`

## Transcript

### User | 2026-06-09T23:37:21.853Z

LENS 4 — OLLAMA-GRUNT ROUTING for the execution (operating model). DELTA (CAD) /goal — 3 clears:
1. Finish ALL remaining delta phases/units/tasks (CAD domain).
2. Upgrade delta's existing systems for the new Blackwell box (RTX PRO 6000 96GB GPU + 9950X3D 32T + 136GB RAM + NVMe) — the gap is UTILIZATION not capacity (GPU-resident models, high concurrency, generous heaps, GPU embeddings/vision).
3. FINAL CLEAR: fully finished closed-loop learning for generating HIGHLY COMPLEX CAD models (print/intent -> real CAD-app-driven solid -> compare -> correct -> learn).
Operating model: ultracode (workflows) for planning/deep-reasoning/orchestration; Ollama local LLM (gpt-oss:120b / qwen2.5-coder:32b / gpt-oss:20b / qwen3-vl:8b) for grunt work (search, reads, mechanical coding/building it's qualified for); Claude for judgment/wiring/safety/synthesis.

Key inputs to READ before planning (do not re-derive):
- state/shared/delta-context-briefing-2026-06-09.md — delta's reconstructed work history + CONSOLIDATED OPEN THREADS (the authoritative remaining-work source).
- state/shared/delta-ollama-efficiency-plan-2026-06-09.md — the Ollama routing plan (models, surfaces, red-lines).
- mcp-server/src/engines/cad/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md — delta galaxy doctrine.
- state/shared/BUILD_STATE.md + the envelope-drift list (CAMK/CAMX milestones) for pending units.

For the delta work ahead, specify which sub-task TYPES route to Ollama grunt (search/read/mechanical-code/summarize/classify/OCR-extract) vs stay Claude (geometry/safety/wiring/synthesis/deep-reasoning) vs ultracode-workflow (planning/multi-agent). Read the ollama plan's red-lines (NEVER route geometry/units/fits/PMI/S(x)). Give a concrete routing table: task-type · route · model/surface · guardrail. Then name the 3-5 highest-leverage Ollama wirings that ACCELERATE the goal (e.g. GPU vision-OCR for corpus reading, gpt-oss:120b for corpus summarization, ollama-prism-bridge for code search). Operationalize "Ollama for grunt,
... [+19 chars truncated]

### Assistant | 2026-06-09T23:37:25.658Z

I'll start by reading the key inputs before planning. Let me load all the authoritative sources in parallel.

### Assistant | 2026-06-09T23:37:26.141Z

[tool_use: Read]

### Assistant | 2026-06-09T23:37:27.291Z

[tool_use: Read]

### Assistant | 2026-06-09T23:37:27.656Z

[tool_use: Read]

### Assistant | 2026-06-09T23:37:28.100Z

[tool_use: Read]

### User | 2026-06-09T23:37:30.358Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\cad\TOOLBELT.md' was already read 5m ago in this session and is unchanged (mtime 1781018402792). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-09T23:37:33.657Z

[tool_result] 1	# CAD Galaxy — Domain-local CLAUDE.md (galactic center)
2	
3	> **Bibryam Context Cascade pattern.** Auto-loads when Claude edits under `mcp-server/src/engines/cad/`. Root `/CLAUDE.md` covers PRISM-wide doctrine; the `engines/CLAUDE.md` baseline covers dev/build/search-first discipline; THIS file covers cad-domain surface only. **Owning slot: delta** (CAD specialist — see PATHS.md maintainership 
... [+16390 chars truncated]

### User | 2026-06-09T23:37:33.686Z

[tool_result] 1	<!-- delta context briefing — reconstructed 2026-06-09 from 26 raw session transcripts via scripts/lib/transcript-digest.mjs + bounded-3 workflow wf_66199e81-28f. NOTE: the embedded line saying the synthesis workflow "never completed" reflects a mid-run snapshot of THIS session; the resume succeeded 26/26. -->
2	
3	I'll produce this briefing now. The session digests are already provided in full 
... [+22456 chars truncated]

### User | 2026-06-09T23:37:33.695Z

[tool_result] 1	<!-- delta Ollama-efficiency plan — workflow wf_28042811-3c4, bounded-3, 4 lenses + synth, 2026-06-09 -->
2	
3	I'll produce the operator-facing plan now. I have all four lens reports and have resolved disagreements in favor of the adversarial/safety lens (lens 4).
4	
5	# Delta CAD — Ollama Local-LLM Efficiency Plan
6	
7	**Slot:** delta (CAD galaxy) · **Date:** 2026-06-09 · **Standing directive:*
... [+14978 chars truncated]

### Assistant | 2026-06-09T23:37:39.117Z

I have everything I need. The two plan documents are already authoritative on models, surfaces, and red-lines. The question asks me to operationalize "Ollama for grunt, strongest models" — specifically the routing table by sub-task TYPE and the highest-leverage wirings that accelerate the 3 delta clears. Let me check the TOOLBELT content I already have and the offload telemetry to ground the routing, then synthesize.

### Assistant | 2026-06-09T23:37:40.539Z

[tool_use: Grep]

### Assistant | 2026-06-09T23:37:42.799Z

[tool_use: Bash]

### User | 2026-06-09T23:38:05.175Z

[tool_result] No matches found

### User | 2026-06-09T23:38:41.150Z

[tool_result] {
  "totals": {
    "offloaded": 13,
    "keptOnClaude": 212,
    "estimatedTokensSaved": 25458,
    "silentSuggestions": 115,
    "injectedSuggestions": 13
  },
  "byHook": {
    "ollama-task-offloader": {
      "fired": 250,
      "offloaded": 13,
      "kept": 212,
      "suggested": 25,
      "tokensSaved": 25458
    },
    "grep-index-first": {
      "fired": 887,
      "suggested": 157
    }
... [+607 chars truncated]

### Assistant | 2026-06-09T23:39:42.852Z

Telemetry confirms the gap: offload rate is 13/(13+212) = 5.8% on the task-offloader, far below the 30% target, and `gpt-oss:120b`/`qwen2.5-coder:32b` are both live. The models in the plan match the live `/api/tags` exactly. I have everything needed to produce the routing specification.

This is the LENS 4 deliverable — the operating-model routing for delta's execution. Here it is.

---

# LENS 4 — OLLAMA-GRUNT ROUTING for DELTA (CAD) /goal execution

**Operating doctrine:** *Ollama for grunt, strongest models for that grunt; Claude for judgment/wiring/safety/synthesis; ultracode-workflow for planning/multi-agent.* Default-DENY on geometry. Live offload = ~5.8% (target ≥30%); the gap is entirely in mechanical text ops delta still keeps on Claude. Models verified live `/api/tags` 2026-06-09.

---

## 1. The three-way split (the operating model in one line each)

- **Ollama (grunt)** — bounded, mechanical, no correctness/safety stake: search · read · summarize · classify · OCR-extract(draft) · explain · diff-summary · triage · docstring · gloss. Strongest model qualified for *that* grunt (gpt-oss:120b for big-context reasoning-grunt, qwen2.5-coder:32b as default coder floor, gpt-oss:20b for speed-classify, qwen3-vl:8b for vision).
- **Claude (judgment)** — geometry emit · units/fit/PMI/tolerance · S(x)/collision margins · dispatcher wiring · contradiction resolution · final synthesis · the PASS/FAIL gate on any compare.
- **ultracode-workflow (orchestration)** — planning the corpus runs, the merge of `slot/delta`, the multi-agent scrutiny fan-out, the closed-loop milestone decomposition. Bounded concurrency ≤3 (26-reader rate-limit was the lesson).

---

## 2. CONCRETE ROUTING TABLE — task-type · route · model/surface · guardrail

### A. SEARCH / READ (the cheapest, highest-frequency grunt)

| Task-type | Route | Model / surface | Guardrail |
|-----------|-------|-----------------|-----------|
| "where/how does X wire in cad galaxy?" graph investigation | **Ollama** |
... [+9128 chars truncated]
