---
type: "chat-session"
source: "claude-code-cli"
session_id: "f593aee3-12cf-4e8a-a566-8411386cc606"
title: "LENS 4 — ADVERSARIAL / SAFETY: where Ollama routing would HARM delta (CAD). Defa"
date: "2026-06-09"
first_ts: "2026-06-09T16:14:47.725Z"
last_ts: "2026-06-09T16:18:24.440Z"
cwd: "H:\\prism"
messages: 28
user_msgs: 11
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/f593aee3-12cf-4e8a-a566-8411386cc606/subagents/workflows/wf_28042811-3c4/agent-aa1e83a000d09350c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# LENS 4 — ADVERSARIAL / SAFETY: where Ollama routing would HARM delta (CAD). Defa

> **claude-code-cli** | 2026-06-09 | 28 msgs (11 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/f593aee3-12cf-4e8a-a566-8411386cc606/subagents/workflows/wf_28042811-3c4/agent-aa1e83a000d09350c.jsonl`

## Transcript

### User | 2026-06-09T16:14:47.725Z

LENS 4 — ADVERSARIAL / SAFETY: where Ollama routing would HARM delta (CAD). Default skeptical.

Goal: find every place routing delta work to a local Ollama model would degrade correctness or safety, and define the guardrails.

Consider: geometry/BREP topology correctness, GD&T/PMI parsing (hallucination → wrong tolerance), STEP unit disambiguation (inch vs mm = 25.4× scale error), collision/clearance margins feeding `prism_safety` S(x) gates, ISO286 fit values (delta soul REFUSES inline/heuristic fits), feature-recognition (soul refuses silent fallback). A small local model hallucinating a dimension or a fit is a scrap/crash risk.

Read `mcp-server/src/engines/cad/CLAUDE.md` §5 gotchas + the delta soul refuses. Output: a RED-LINE list (NEVER route to Ollama) + a GUARDRAIL list (verify-Ollama-output-before-trust, conformal bounds, keep safety gates on Claude, human-confirm < threshold). Be genuinely critical — this lens exists to stop a careless offload.

### Assistant | 2026-06-09T16:14:52.293Z

I'll execute this adversarial/safety lens. Let me read the delta CAD soul and §5 gotchas first.

### Assistant | 2026-06-09T16:14:52.918Z

[tool_use: Read]

### User | 2026-06-09T16:14:55.025Z

[tool_result] 1	# CAD Galaxy — Domain-local CLAUDE.md (galactic center)
2	
3	> **Bibryam Context Cascade pattern.** Auto-loads when Claude edits under `mcp-server/src/engines/cad/`. Root `/CLAUDE.md` covers PRISM-wide doctrine; the `engines/CLAUDE.md` baseline covers dev/build/search-first discipline; THIS file covers cad-domain surface only. **Owning slot: delta** (CAD specialist — see PATHS.md maintainership 
... [+16390 chars truncated]

### Assistant | 2026-06-09T16:15:01.598Z

I have the delta CAD soul and §5 gotchas. Let me check the delta slot soul refuse-list and the actual collision/safety surface to ground the red-lines in real code rather than assumptions.

### Assistant | 2026-06-09T16:15:05.577Z

[tool_use: Bash]

### Assistant | 2026-06-09T16:15:05.591Z

[tool_use: Grep]

### User | 2026-06-09T16:15:05.682Z

[tool_result] <tool_use_error>Path does not exist: H:/prism/.claude/slot-souls. Note: your current working directory is H:\prism.</tool_use_error>

### User | 2026-06-09T16:15:17.284Z

[tool_result] ---SEP---

### Assistant | 2026-06-09T16:15:23.826Z

The slot-souls dir doesn't exist at that path. Let me locate the delta soul and the collision engine.

### Assistant | 2026-06-09T16:15:24.941Z

[tool_use: Bash]

### User | 2026-06-09T16:16:10.112Z

[tool_result] ---SOULS---
H:/prism/state/shared/slot-souls/delta.html
H:/prism/state/shared/slot-souls/delta.md
---SOULDIR---
H:/prism/.claude/souls

### Assistant | 2026-06-09T16:16:13.735Z

[tool_use: Read]

### User | 2026-06-09T16:16:15.590Z

[tool_result] 1	---
2	slot: delta
3	role: cad-specialist
4	voice: geometry-first
5	tone: careful
6	escalation_path: validate-brep-topology-before-mutate; defer-tolerance-to-physics-reviewer
7	refuse_list:
8	  - inline-iso286-fit-values
9	  - silent-feature-recognition-fallback
10	  - dropping-pmi-data-on-import
11	preferred_subagent_type: code-analyzer
12	domain_filter: cad|geometry|brep|step|iges|sketch|featur
... [+1557 chars truncated]

### Assistant | 2026-06-09T16:16:21.221Z

I have the delta soul refuse-list. Now let me ground the collision/safety surface and the S(x) gate threshold in actual code so the red-lines cite real numbers.

### Assistant | 2026-06-09T16:16:22.727Z

[tool_use: Grep]

### User | 2026-06-09T16:16:22.729Z

[tool_result] <tool_use_error>Path does not exist: H:/prism/mcp-server/src/engines/cad/CollisionDetectionEngine.ts. Note: your current working directory is H:\prism.</tool_use_error>

### Assistant | 2026-06-09T16:16:28.261Z

[tool_use: Bash]

### User | 2026-06-09T16:16:41.855Z

[tool_result] ---SIZE-CHECK (stub?)---

### Assistant | 2026-06-09T16:16:46.436Z

Both engines aren't at the cad/ path. Let me locate them precisely.

### Assistant | 2026-06-09T16:16:47.837Z

[tool_use: Bash]

### User | 2026-06-09T16:17:10.310Z

[tool_result] H:/prism/mcp-server/src/engines/CADFeatureRecognitionEngine.ts
H:/prism/mcp-server/src/engines/CollisionDetectionEngine.ts
---FR-SIZE---
134 H:/prism/mcp-server/src/engines/CADFeatureRecognitionEngine.ts

### Assistant | 2026-06-09T16:17:15.808Z

Engines are flat in `src/engines/`, not the cad subdir. CADFeatureRecognitionEngine is only 134 lines — possibly a real-but-thin implementation or restored stub. Let me check both the S(x) gate threshold and the FR engine's actual behavior to ground the red-lines.

### Assistant | 2026-06-09T16:17:17.722Z

[tool_use: Grep]

### Assistant | 2026-06-09T16:17:18.091Z

[tool_use: Read]

### User | 2026-06-09T16:17:23.373Z

[tool_result] 1	/**
2	 * CADFeatureRecognitionEngine — heuristic CAD-feature recognizer.
3	 *
4	 * STUB-RESCUE (slot:bravo 2026-05-27, U-STUB-HUNT-10). Original returned
5	 * hardcoded {features:[], confidence:0.5}. Real implementation accepts a
6	 * simple geometry shape and recognizes 5 canonical mill-domain features:
7	 * hole, pocket, slot, fillet, chamfer — via boundary/curvature heuristics.
8	 * routes/mi
... [+1927 chars truncated]

### User | 2026-06-09T16:17:23.625Z

[tool_result] No matches found

### Assistant | 2026-06-09T16:18:24.440Z

I have enough grounded evidence. Key confirmed facts:
- CADFeatureRecognitionEngine is a **heuristic** recognizer with confidence tiers (HIGH 0.9 / MED 0.7 / LOW 0.4) and explicit `confidence:0.5` stub-history — recognition is already a probabilistic surface, not exact.
- Delta soul refuse-list: `inline-iso286-fit-values`, `silent-feature-recognition-fallback`, `dropping-pmi-data-on-import`; safety tier Ω≥0.95, S(x)≥0.98.
- §5 gotcha #8: CollisionDetectionEngine clearance margins are "the one place where a wrong geometry constant becomes a machine crash."
- §SAFETY RAILS: units mismatch = 25.4× scale error; physics constants never inlined.
- Engine rule: "never silentCatch in engines" — fail loud.

I have what I need for a grounded RED-LINE + GUARDRAIL list. Output follows.

---

# LENS 4 — ADVERSARIAL / SAFETY: Ollama routing on delta (CAD)

**Posture: default-deny.** Delta's outputs are the *upstream origin* of the print-to-program pipeline (cad/CLAUDE.md §7) — every error compounds downstream into cam → post → cut. A small local model (qwen2.5-coder:7b / deepseek-r1:14b) that hallucinates a dimension, a fit, or a unit doesn't produce a bad summary — it produces **scrap or a machine crash**. The delta soul already encodes three hard refuses that map directly onto Ollama failure modes; this lens makes the refuses routing-aware.

Grounding (verified this session): `src/engines/CADFeatureRecognitionEngine.ts:1-17` is an admitted heuristic recognizer (`CONFIDENCE_HIGH=0.9 / MED=0.7 / LOW=0.4`, stub-history `confidence:0.5`); `state/shared/slot-souls/delta.md:7-9,33-37` refuse-list; `cad/CLAUDE.md` §5#8 (collision = crash surface), §5#6 + root §SAFETY RAILS (25.4× units error); `mcp-server/src/engines/.claude/CLAUDE.md` "never silentCatch in engines / fail loud."

---

## RED-LINE LIST — NEVER route to Ollama (no guardrail makes this safe)

These are determinism-or-safety surfaces. Ollama's value is *fuzzy text*; these need *exact values or formal correctness*. A wrong
... [+7748 chars truncated]
