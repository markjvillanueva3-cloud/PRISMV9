---
type: "chat-session"
source: "claude-code-cli"
session_id: "f593aee3-12cf-4e8a-a566-8411386cc606"
title: "LENS 2 — DELTA CAD TASK TAXONOMY → OLLAMA-SUITABILITY (per CLAUDE.md R5: model-f"
date: "2026-06-09"
first_ts: "2026-06-09T16:09:47.887Z"
last_ts: "2026-06-09T16:11:49.748Z"
cwd: "H:\\prism"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/f593aee3-12cf-4e8a-a566-8411386cc606/subagents/workflows/wf_28042811-3c4/agent-a6ca3fc9bd67ec605.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# LENS 2 — DELTA CAD TASK TAXONOMY → OLLAMA-SUITABILITY (per CLAUDE.md R5: model-f

> **claude-code-cli** | 2026-06-09 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/f593aee3-12cf-4e8a-a566-8411386cc606/subagents/workflows/wf_28042811-3c4/agent-a6ca3fc9bd67ec605.jsonl`

## Transcript

### User | 2026-06-09T16:09:47.887Z

LENS 2 — DELTA CAD TASK TAXONOMY → OLLAMA-SUITABILITY (per CLAUDE.md R5: model-for-judgment-only).

Goal: enumerate the FULL set of recurring task types delta (CAD slot) performs, then classify each as OLLAMA-SUITABLE (mechanical: summarize/classify/extract/explain/draft) vs CLAUDE-ONLY (geometry correctness, safety S(x), deep cross-domain reasoning) vs HYBRID (Ollama draft → Claude verify).

Sources to read: `state/shared/delta-context-briefing-2026-06-09.md` (delta's reconstructed work history — the recurring operations are listed there), `mcp-server/src/engines/cad/CLAUDE.md` + `MEMORY.md` + `TOOLBELT.md`, and the delta CAD-domain awareness (STEP analysis, feature-recognition, regen-compare, blueprint-OCR ground-truth, validation-rubric scoring, electrode gen, doc-reflection/digest, tribal-tip extraction, commit/handoff drafting, code-explain).

Output a TABLE: task type · frequency(hi/med/lo) · classification(OLLAMA/CLAUDE/HYBRID) · why · rough token-cost-if-on-Claude. Enumerate the ENTIRE space (do not stop at 3). Be honest where Ollama is risky.

### Assistant | 2026-06-09T16:10:08.344Z

I'll read the source files to enumerate delta's recurring CAD task space before classifying.

### Assistant | 2026-06-09T16:10:08.345Z

[tool_use: Read]

### Assistant | 2026-06-09T16:10:08.350Z

[tool_use: Read]

### Assistant | 2026-06-09T16:10:08.353Z

[tool_use: Read]

### User | 2026-06-09T16:10:22.286Z

[tool_result] 1	# CAD Galaxy — Domain-local CLAUDE.md (galactic center)
2	
3	> **Bibryam Context Cascade pattern.** Auto-loads when Claude edits under `mcp-server/src/engines/cad/`. Root `/CLAUDE.md` covers PRISM-wide doctrine; the `engines/CLAUDE.md` baseline covers dev/build/search-first discipline; THIS file covers cad-domain surface only. **Owning slot: delta** (CAD specialist — see PATHS.md maintainership 
... [+16390 chars truncated]

### User | 2026-06-09T16:10:27.326Z

[tool_result] 1	<!-- delta context briefing — reconstructed 2026-06-09 from 26 raw session transcripts via scripts/lib/transcript-digest.mjs + bounded-3 workflow wf_66199e81-28f. NOTE: the embedded line saying the synthesis workflow "never completed" reflects a mid-run snapshot of THIS session; the resume succeeded 26/26. -->
2	
3	I'll produce this briefing now. The session digests are already provided in full 
... [+22456 chars truncated]

### User | 2026-06-09T16:10:27.435Z

[tool_result] 1	# CAD Galaxy MEMORY.md — per-domain memory cascade index (2026-05-27)
2	
3	> Per SCOPE-EXPANSION §Q2. Auto-loads when editing under `engines/cad/`. STUB / awaiting U-GALAXY-MS1-C1 migration + cad-soul slot assignment.
4	
5	## Master-brain link
6	- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="cad" topK=20`
7	- **DOWN (pu
... [+6892 chars truncated]

### Assistant | 2026-06-09T16:10:38.121Z

I have the delta context briefing, the cad galaxy CLAUDE.md, and MEMORY.md. I'll read the TOOLBELT.md for the dispatcher/skill surface (the third leg of the task), then produce the taxonomy.

### Assistant | 2026-06-09T16:10:38.361Z

[tool_use: Read]

### User | 2026-06-09T16:10:44.216Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\cad\TOOLBELT.md' was already read 24s ago in this session and is unchanged (mtime 1781018402792). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-09T16:11:49.748Z

The read-once guard says TOOLBELT.md is already in context (likely auto-injected as part of the cad galaxy cascade). I have the three sources the task requires. I have enough to produce the complete taxonomy now.

Let me reason through the full task space from the briefing's §1-5 (chronological arc, milestones, recurring lessons, assets built) plus the galaxy CLAUDE.md domain scope, classifying each by R5 (model-for-judgment-only).

---

LENS 2 — DELTA CAD TASK TAXONOMY → OLLAMA-SUITABILITY

Legend: **OLLAMA** = mechanical text op (summarize/classify/extract/explain/draft), no geometry-correctness or S(x) stake. **CLAUDE** = geometry/dimensional correctness, safety (collision/clearance/units), or deep cross-domain reasoning where a wrong answer scraps a part or crashes a machine. **HYBRID** = Ollama drafts → Claude verifies the load-bearing core. Token costs are rough per-invocation on Claude.

| # | Task type | Freq | Class | Why | ~Claude tok/call |
|---|-----------|------|-------|-----|------------------|
| **A. Geometry / model correctness** ||||||
| 1 | STEP/AP203/AP242 **parse** (entity counts, coord ranges, radii) | hi | **HYBRID** | Parsing is deterministic — belongs in `cad-step-parse-lib.mjs`/`cad-analyze-step.mjs` code (R5: not a model job). Ollama can *narrate* the parsed result; Claude verifies only when a dim feeds a safety margin. | 2–6K |
| 2 | STEP/neutral-format **emit** (build the geometry) | hi | **CLAUDE** | Wrong entity → wrong solid → scrap. The `.171"`/leading-dot + truncation parse bugs (Recent regressions) prove silent geometry loss is the dominant failure. Emit math is correctness-critical. | 5–15K |
| 3 | **Feature recognition** from BREP (pocket/hole/slot/fillet ID) | hi | **CLAUDE** | The STEP-no-history ceiling → must *recognize* authoring features, not read them. Mis-ID feeds wrong CAM strategy. Deep geometric reasoning; Ollama hallucinates topology. | 4–10K |
| 4 | **Geometric similarity / diff** (CADGeometryComparisonEngine) | med |
... [+7767 chars truncated]
