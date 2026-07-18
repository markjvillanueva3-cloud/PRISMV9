---
name: reference_subagent_ollama_parity_2026_06_12
description: "Subagent parity audit (operator ask, slot:zulu 2026-06-12): spawned agents DID get full PRISM-system awareness via SubagentStart bundle, but ZERO Ollama routing (all nudges are UserPromptSubmit-only, which never fires in subagents). Fixed single-point in spawned-agent-context-lib.mjs (132e9ff8bc)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.213Z
aliases: reference_subagent_ollama_parity_2026_06_12
---


# Subagent Ollama/PRISM-system parity (slot:zulu, 2026-06-12)

Operator: "check parallel/spawned agents are set up to utilize Ollama and our systems the same way you do."

## What already held (no fix needed)
- `subagent-start-context.mjs` (SubagentStart, matcher `*`, the ONLY hook in that block) injects `buildSpawnedAgentAdditionalContext` -> PSN 11-leg surfaces, slot soul, galaxy domain pack, live scale, BUILD_STATE, per-task master-index + tribal + Obsidian-memo presearch, doctrine pointers, token economy (rtk). Covers Agent-tool, Workflow `agent()`, and named-agent spawns alike.
- `subagent-model-enforce.mjs` (PreToolUse Agent/Task, strict) DENIES mechanical tasks explicitly dispatched to opus/fable -> dispatch-side model routing enforced.
- PreToolUse/PostToolUse guards + graph-context injects fire on subagent tool calls (session-level).

## The gap (fixed, 132e9ff8bc)
- **Every Ollama routing nudge is UserPromptSubmit-only** (`task-start-substrate-inject`, `ollama-pipeline-injector`, `ollama-nav-enforce-inject`, MODEL-ROUTING) — verified wired ONLY under UserPromptSubmit in all three settings.json -> **never fires inside a subagent**.
- The bundle's sole Ollama mention was `aiSystemRouterEngine.route(task)` — a .ts engine API a bash-capable subagent cannot call. Agent definitions (`.claude/agents/*.md`): 0 Ollama refs across all 18.
- Fix: two Operating-rules bullets in `scripts/agents/spawned-agent-context-lib.mjs` — executable `ask-ollama.mjs` rule (`{summarize|explain|triage} <file>` / `{ask|viz|rerank} "<query>"`, lineup qwen2.5-coder:32b / gpt-oss:120b / qwen2.5-coder:1.5b) + fail-loud Ollama-down contract (**PARENT owns the sonnet fallback ladder**, subagents never silently absorb a mechanical batch). 5 tests in `spawned-agent-ollama-routing.test.mjs` incl. drift guard cross-checking advertised modes against ask-ollama's exported `ALL_MODES`.

## Rule for future audits
When asking "do subagents get X?", check WHICH hook event carries X: SubagentStart + PreToolUse/PostToolUse reach subagents; **UserPromptSubmit and SessionStart do NOT**. Anything doctrine-critical living only on UserPromptSubmit is invisible to the entire agent fleet. (P3 logged: `subagent-start-context.mjs:14` header says 3s timeout, settings wires 5000ms — doc drift, pre-existing.)
