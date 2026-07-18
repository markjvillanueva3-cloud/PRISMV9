---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are the synthesis lead. Below are 4 concrete BUILD SPECS for PRISM brain-acc"
date: "2026-06-09"
first_ts: "2026-06-09T19:04:06.711Z"
last_ts: "2026-06-09T19:05:09.598Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_108e7c01-acd/agent-ab2e36de8af8cafe5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# You are the synthesis lead. Below are 4 concrete BUILD SPECS for PRISM brain-acc

> **claude-code-cli** | 2026-06-09 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_108e7c01-acd/agent-ab2e36de8af8cafe5.jsonl`

## Transcript

### User | 2026-06-09T19:04:06.711Z

You are the synthesis lead. Below are 4 concrete BUILD SPECS for PRISM brain-acceleration items (other-lane; papa is separately building the F1 tribal shard-writer). Produce a build-ready appendix in markdown:

## Appendix: build-ready specs (4 items)
For each item: a 4-6 line condensed spec — Goal | Lane | First file to touch (file:line) | The change | Test bar | Risk/back-compat | Effort. Preserve any "ALREADY EXISTS" findings prominently (those are the cheapest wins). End with a 3-line dependency-ordered build sequence across these items + papa's F1.

Keep it dense and directly actionable. This appends to state/shared/specs/BRAIN-ACCELERATION-OPPORTUNITIES-2026-06-09.md.

===== ITEM: token-autoroute =====
## T1 BUILD SPEC — Route-Suggest Advisory → Enforcement for Safe Deterministic Ops

**Goal (1 line):** Fix the `hasFileTarget` enforcement gap in `ollama-task-offloader.mjs` so that high-confidence summarize/explain ops auto-execute against Ollama without requiring an explicit file reference in the prompt, lifting enforced offload from 8% toward the 30% target.

**Axis:** token | **Lane:** alpha

---

### 1. Current State

**R8 Dedup finding — the auto-execute path ALREADY EXISTS:**

- ALREADY EXISTS: `H:/prism/.claude/hooks/ollama-task-offloader.mjs:376-381` — `SAFE_AUTOEXEC` Map mapping `{explanation→"explain", summary→"summarize", git_summary→"summarize", documentation→"explain"}`
- ALREADY EXISTS: `H:/prism/.claude/hooks/ollama-task-offloader.mjs:405-426` — `buildOffloadDirective()` emits imperative `AUTO-OFFLOAD` directive when `SAFE_AUTOEXEC.has(category) && hasFileTarget`
- ALREADY EXISTS: `H:/prism/.claude/hooks/ollama-task-offloader.mjs:393-397` — `detectFileTarget()` returns true only if prompt contains a file extension (`.ts`, `.mjs`, etc.), path separator, or "this/the file|module" phrase

**The enforcement gap:** `buildOffloadDirective()` at line 405 checks `mode && hasFileTarget`. When `hasFileTarget=false`, it falls to the `else` branch and emits 
... [+65354 chars truncated]

### Assistant | 2026-06-09T19:05:09.598Z

I'll produce the build-ready appendix. The four specs are already detailed; my job is to condense each into a dense 4-6 line spec, preserve the "ALREADY EXISTS" findings prominently, and add a dependency-ordered build sequence including papa's F1.

## Appendix: build-ready specs (4 items)

### T1 — token-autoroute: fileless summarize/git_summary auto-offload
- **Goal:** Lift enforced Ollama offload from ~8% toward 30% by auto-executing high-confidence `summary`/`git_summary` ops that lack a file reference (e.g. "summarize the last 10 commits"). | **Lane:** alpha
- **ALREADY EXISTS (cheapest win):** the auto-exec path is fully built — `SAFE_AUTOEXEC` Map (`ollama-task-offloader.mjs:376-381`), `buildOffloadDirective()` AUTO-OFFLOAD emit (`:405-426`), `isOllamaAvailable()` reachability gate (`:256-270`, called `:384`). Route-suggest side is already optimally advisory-gated (`mcp-route-suggest.mjs:47-49,277-283`) — NOT actionable. The gap is one boolean.
- **First file:** `H:/prism/.claude/hooks/ollama-task-offloader.mjs:413` (`buildOffloadDirective` condition).
- **The change:** add `AUTO_EXEC_CATEGORIES=new Set(["summary","git_summary"])`; change `if (mode && hasFileTarget)` → `if (mode && (hasFileTarget || AUTO_EXEC_CATEGORIES.has(category)))`; extend telemetry bump at `:576` to count fileless auto-offloads (`byCategory.fileless_auto_offload`). ~3 lines. Do NOT touch `routeModelForTask`/`isOllamaAvailable`/`detectHostClass`/roster (peer 928a8226).
- **Test bar:** 7 cases through the full UPS-hook wire path — T-H1/2/3 (summary/git_summary/file-target → `AUTO-OFFLOAD`), T-F1/2/3 (explanation/documentation/Ollama-down stay advisory), T-A1/2 (`SAFETY_PRE` blocks "delete all tests", `SAFE_AUTOEXEC`-miss falls back soft).
- **Risk/back-compat:** additive `||`; ambiguous "summarize the plan" fails loud via `ask-ollama.mjs` exit-2 (R12-OK); `Set.has()` O(1) on already-gated path (no latency); new stats key is additive. Diff against peer branch before commit; chat-bus post.
-
... [+7283 chars truncated]
