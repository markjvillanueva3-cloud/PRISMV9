---
type: "chat-session"
source: "claude-code-cli"
session_id: "8b785b10-fc31-4613-8c28-594f7533b4f2"
title: "Review H:/prism/scripts/lib/local-llm-task-router.mjs (a new keystone engine) EN"
date: "2026-06-04"
first_ts: "2026-06-04T17:39:05.678Z"
last_ts: "2026-06-04T17:41:51.503Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/8b785b10-fc31-4613-8c28-594f7533b4f2/subagents/agent-aef7ad0a902d64b9b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Review H:/prism/scripts/lib/local-llm-task-router.mjs (a new keystone engine) EN

> **claude-code-cli** | 2026-06-04 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/8b785b10-fc31-4613-8c28-594f7533b4f2/subagents/agent-aef7ad0a902d64b9b.jsonl`

## Transcript

### User | 2026-06-04T17:39:05.678Z

Review H:/prism/scripts/lib/local-llm-task-router.mjs (a new keystone engine) END-TO-END for correctness. Also read its test H:/prism/scripts/lib/local-llm-task-router.test.mjs and its two composed dependencies (H:/prism/.claude/hooks/lib/ollama-cost-router.mjs `routeModelForTask`, H:/prism/scripts/lib/host-aware-synthesis-model.mjs `fetchInstalledModels`).

Context: this is HERMES-EFFICIENCY-ROUTER U1 — a COMPOSER that, given a task string, returns a routing verdict {taskClass, category, runLocal, ollamaModel, escalateTo, qualityBar, fallbackChain, reason}. It must (1) NEVER run a manufacturing-safety task on a local model (cutting params, feeds/speeds, S(x)/Ω gate, G-code/toolpath validation, tolerance gate, collisions → runLocal:false, escalateTo:"claude"), (2) only ever return an ollamaModel that is in the live installed set (delegate to routeModelForTask; reject phantoms), (3) keep IP-bearing text/extraction local.

Grade PASS/FAIL and flag P0/P1 issues specifically on:
- SAFETY FALSE-NEGATIVES: are there realistic manufacturing-safety task phrasings that would NOT match SAFETY_PATTERNS and thus wrongly run local? (the dangerous failure mode — list any you find)
- Does it genuinely DELEGATE to routeModelForTask (compose) rather than reimplement tier logic?
- The classifier ordering (CLASS_PATTERNS first-match-wins) — any task that misclassifies in a way that matters?
- Invariant-2 enforcement (model ∈ installed) — any path that could return a phantom/uninstalled model with runLocal:true?
- Fail-soft correctness (ollama down / fetch throws / picker returns null).
Be concise: P0/P1 findings with file:line + PASS/FAIL verdict. Do not edit anything.

### Assistant | 2026-06-04T17:39:22.756Z

I'll review this routing engine end-to-end. Let me read all four files in parallel.

### Assistant | 2026-06-04T17:39:23.091Z

[tool_use: Read]

### Assistant | 2026-06-04T17:39:24.197Z

[tool_use: Read]

### Assistant | 2026-06-04T17:39:24.203Z

[tool_use: Read]

### Assistant | 2026-06-04T17:39:24.416Z

[tool_use: Read]

### User | 2026-06-04T17:39:28.008Z

[tool_result] 1	// tier: T4
2	// HERMES-EFFICIENCY-ROUTER / U1 (keystone) — Local-LLM task-routing brain.
3	//
4	// composes: ollama-cost-router (routeModelForTask) + host-aware-synthesis-model
5	//   (fetchInstalledModels) + host-class (detectHostClass). It is a COMPOSER, not a
6	//   new policy — model-tier selection is DELEGATED to routeModelForTask (the
7	//   canonical, Blackwell-tuned, install-truthful pi
... [+10417 chars truncated]

### User | 2026-06-04T17:39:30.235Z

[tool_result] 1	// tier: T4
2	// Tests for scripts/lib/local-llm-task-router.mjs (HERMES-EFFICIENCY-ROUTER U1).
3	//
4	// node:test — hermetic where it must be (DI stubs for fetch/host), but the
5	// "real composition" tests use the ACTUAL routeModelForTask so the wiring is
6	// proven, not mocked (R9: a test that passes against a hardcoded return is
7	// worthless). No real Ollama/GPU/network is touched.
8	//

... [+8055 chars truncated]

### User | 2026-06-04T17:39:30.240Z

[tool_result] 1	// tier: T4
2	// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
3	//
4	// Replaces hardcoded "first-of-preference-list" model selection with a
5	// category → tier → model decision. Smaller / faster models for trivial
6	// tasks (classify, format-convert, prism-inventory); larger / more
7	// capable models for complex codegen / multi-step reasoning.
8	//
9	// C
... [+11864 chars truncated]

### User | 2026-06-04T17:39:30.695Z

[tool_result] 1	// tier: T4
2	// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-MODEL-RESOLVE — host-aware default model
3	// for local synthesis scripts (galaxy roll-ups, system-viz roost summaries,
4	// Obsidian memory consolidation, ask-ollama heavy modes).
5	//
6	// PROBLEM the work order names: every synthesis script hardcodes
7	// `qwen2.5-coder:7b` (or `:3b`). On the 96GB RTX PRO 6000 Blackwell that
8	// throttl
... [+5022 chars truncated]

### Assistant | 2026-06-04T17:39:37.554Z

I have all four files. I already have current knowledge of the two composed dependencies. Let me trace the critical paths, focusing on the safety false-negative analysis (the dangerous failure mode) and the three invariants.

Let me verify a few specific regex behaviors against realistic phrasings before grading.

### Assistant | 2026-06-04T17:39:47.657Z

[tool_use: Bash]

### User | 2026-06-04T17:40:14.581Z

[tool_result] local  "optimize the feedrate for this pocket"                    -> unknown
local  "what RPM should I run for 6061 with a 1/2 endmill"        -> unknown
local  "recommend a depth of cut and stepover for this slot"      -> unknown
local  "is this toolpath safe to run on the VMC"                  -> unknown
local  "review the G-code before I post it to the machine"        -> unknown
local  "calcula
... [+1563 chars truncated]

### Assistant | 2026-06-04T17:40:27.303Z

This is the critical finding — the safety regex has massive false-negatives. The probe confirms it empirically. Let me verify the two highest-impact gaps (codegen-misclassify-as-safety and the "validate cutting" path) and confirm the test suite actually passes, then finalize.

### Assistant | 2026-06-04T17:40:30.353Z

[tool_use: Bash]

### User | 2026-06-04T17:40:40.589Z

[tool_result] # fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 142.5443
---PROBE2---
false-negatives: 9 of 10

### Assistant | 2026-06-04T17:40:48.915Z

All tests pass (16/16), but the suite has a blind spot: it only tests safety phrasings that happen to contain the literal trigger tokens. My probe confirms 9 of 10 realistic escalation-worthy phrasings route LOCAL.

One more check — confirm the codegen ordering interaction with safety (does "write code to validate the toolpath" escalate or run local?), since that's a subtle ordering question.

### Assistant | 2026-06-04T17:40:50.643Z

[tool_use: Bash]

### User | 2026-06-04T17:40:58.278Z

[tool_result] SAFE   codegen        "write a function to validate the toolpath"
SAFE   codegen        "generate code that computes feeds and speeds"
SAFE   unknown        "implement the S(x) safety gate engine"
SAFE   unknown        "refactor the collision check engine"
SAFE   unknown        "write the cutting parameter optimizer"

### Assistant | 2026-06-04T17:41:51.503Z

Good — the safety-first ordering correctly wins when a trigger token is present, even for codegen phrasings. The defect is purely vocabulary coverage in SAFETY_PATTERNS, not the gate architecture. I have everything I need.

## Code Quality Analysis Report

### Summary
- **Overall verdict: FAIL** (one P0 safety false-negative class)
- Files Analyzed: 4 (router + test + 2 composed deps)
- The composer architecture is sound: it genuinely delegates, the install-truth invariant holds, fail-soft is correct. But the safety gate it is built around has a wide vocabulary hole, and that is the one thing this engine exists to get right.

---

### CRITICAL (P0)

**1. SAFETY false-negatives — the safety regex misses the most common manufacturing-safety phrasings**
- File: `H:/prism/scripts/lib/local-llm-task-router.mjs:40-51` (`SAFETY_PATTERNS`)
- Severity: **P0 — this is the exact dangerous failure mode the spec names** ("NEVER run a manufacturing-safety task on a local model").
- Empirically confirmed: **9 of 10** realistic escalation-worthy phrasings route `runLocal:true`. Concrete misses (all returned `runLocal:true`, `escalateTo:null`):
  - `"optimize the feedrate for this pocket"` → unknown/local
  - `"what RPM should I run for 6061 with a 1/2 endmill"` → local
  - `"recommend a depth of cut and stepover for this slot"` → local
  - `"is this toolpath safe to run on the VMC"` → local
  - `"review the G-code before I post it to the machine"` → local
  - `"calculate surface speed for carbide on Inconel"` → local
  - `"speed and feed for 4140"` / `"suggest speeds and feeds"` → local
  - `"compute the IPM for this drill cycle"` → local
  - `"plunge rate for this drill"`, `"DOC and WOC for finishing pass"`, `"does this program crash the machine"`, `"check for rapid moves through the stock"` → local
- Root cause — the patterns are too literal:
  - Pattern `/feeds?\s*(and|&|\/)?\s*speeds?/` requires BOTH words. Bare `feedrate`, `feed rate`, `IPM`, `RPM`, `SFM`, `surface speed`, `cu
... [+6305 chars truncated]
