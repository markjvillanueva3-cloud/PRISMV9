---
name: ollama-fallback-sonnet-agents
description: "FLEET-WIDE RULE: if Ollama fails/is-reaped/starved, the fallback for read/search/summarize/classify/lint is a SONNET AGENT (not Opus). Only reasoning/planning/heavy-coding/building escalate to Opus/higher. Token-savings tier ladder."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.437Z
aliases: feedback_ollama_fallback_sonnet_agents
---


**Operator directive 2026-06-11: "if ollama doesn't work, make sonnet agents the fall back and have them route the same way ollama would've for token savings. make this a memory and rule fleet wide that if ollama fails or is reaped, the fall back is sonnet agents for reading, searching and summarizing. only use higher models for reasoning, planning and heavy coding and building."**

## The rule (fleet-wide, every slot)
Three-tier model ladder for MECHANICAL work (reading, searching, summarizing, classifying, linting, docstrings, diff-summary, error-triage):
1. **Ollama (local, free)** -- qwen2.5-coder:32b default / nomic-embed for embeds / gpt-oss for deep-local. FIRST choice.
2. **Sonnet agent (cheap) -- THE FALLBACK.** If Ollama fails, is reaped, is starved, or `:11434` is down -> spawn/route to a SONNET subagent that does the SAME read/search/summarize task. Route it the same way Ollama would have.
3. **Opus / higher (expensive)** -- ONLY for reasoning, planning, deep synthesis, judgment, safety, and heavy coding/building. NEVER for mechanical read/search/summarize.

The forbidden path: **Ollama-fail -> silently escalate to the session's Opus.** That is the current default ("it silently falls back to Claude" per CLAUDE.md) and it BURNS TOKENS -- it promotes the cheapest class of work straight to the most expensive model.

## Why
Cost ladder: Ollama (free) << Sonnet (cheap) << Opus (expensive). Mechanical work has no judgment content, so the cheapest capable tier should own it. When Ollama is unavailable the correct degradation is ONE step down the cost ladder (-> Sonnet), not all the way up to Opus. Reproduced 2026-06-11: under fleet big-model load (qwen2.5-coder:32b 54GB + gpt-oss:20b 13GB = 67.6GB/96GB resident) nomic-embed + qwen STARVED, embed timed out 45s -> recall/summarize would have silently fallen to Opus. That is exactly when this fallback rule must hold. See [[reference_cold_embed_recall_starvation_2026_06_11]].

## How to apply
- **In Workflows:** mine/read/search/summarize agents = `model:'sonnet'` (offload); synthesis/judgment/planning = inherit (Opus). Already the pattern in zulu-master-context-regen.
- **In the routing code:** `ask-ollama.mjs` / `OllamaHookBridgeEngine` / `aiSystemRouterEngine.route()` -- when Ollama is unreachable for a mechanical task class, the fallback tier must be a Sonnet agent, NOT the session default.
- **WIRED 2026-06-11 (slot:zulu, commit c03ed4d1cd) -- the BATCH fan-out path now enforces this, not just doctrine.** `scripts/lib/ollama-fanout.mjs` gained `ollamaFanoutWithFallback` + `classifyFanoutFailure` + `buildFanoutFallbackSignal`: when the local fan-out hits a CONNECTION-class failure (Ollama down/reaped/5xx/timeout, distinguished from CONTENT-class empty-response/4xx which means Ollama ran), it emits `fallback{needed,lane:'sonnet',tasks,directive}` -- a deterministic routing decision (R5; a lib can't spawn an Agent, so it hands the caller the Sonnet directive, parity with `ask-ollama.buildFallbackSignal` which already did this for the SINGLE-query path). lane is `'sonnet'` SPECIFICALLY, never `'opus'` (test-asserted). Wired into `audit-galaxy-soul-claude-quality.mjs` (the canonical consumer) -> surfaces the Sonnet directive instead of "0/N graded". 18 tests, live-validated (DOWN->lane=sonnet/all-tasks, UP->no-fallback). REMAINING (not yet wired): the other `ollamaFanout` callers (`generate-galaxy-soul-enrichment.mjs`) + the single-query routers should adopt `ollamaFanoutWithFallback`/honor the signal; the lib is shared so adoption is a 1-line swap.
- **As an agent (me):** when I would have offloaded a read/search/summarize to Ollama and it is down, I spawn a Sonnet subagent (Agent tool, `model:'sonnet'`) for it -- I do NOT do it myself on Opus.
- Pairs with [[feedback_ollama_token_routing]] (the Ollama-first routing) + R5 (model only for judgment) + R6 (token budgets are not advisory).
