---
name: my-hooks-ollama-integration
description: Per-hook decision matrix for Ollama routing — which of the 5 hooks shipped this session benefit from local-LLM offload and which are already lean.
type: project
originSessionId: 2a125756-5751-4129-a9cc-b48330e2b9d8
---
# Ollama integration matrix for shipped hooks

User asked: "make sure all hooks we've made are active and feeding into ollama for token saving measures without the loss of benefits."

## Hooks shipped this session

| Hook | Event | Output size | Ollama useful? | Why |
|------|-------|-------------|----------------|-----|
| `iterate-retrieve-suggest.mjs` | PreToolUse Agent/Task | ~80 tokens | NO | Pattern is regex on subagent_type + query shape. Already deterministic + lean. |
| `harness-audit-staleness.mjs` | SessionStart | ~50 tokens | NO | Just reads timestamp + emits reminder. No LLM judgment needed. |
| `error-block-capture.mjs` | PostToolUse | 0 tokens (silent) | NO | Stateless writer. Regex extracts hook_id and trigger from block reason. |
| `error-block-prewarn.mjs` | PreToolUse | ~80-150 tokens | MAYBE later | Currently uses 21-token-keyword regex. Ollama could add semantic matching ("Promise without await") beyond keywords, BUT adds 200-2000ms latency vs hook timeout=1500ms. **Deferred.** |
| `scrutinize-before-stop.mjs` | Stop | ~600 tokens block reason | NO | Block message is critical actionable instructions; compressing risks losing actionable info. The instructions are stable across sessions — cacheable on the model side, not Ollama's job. |

## How my hooks ALREADY save tokens (without Ollama)

1. **PRISM_HOOK_PROFILE** (Asset 2 — `e60b7d151`) — env var `minimal` skips 5 advisory hooks emitting ~600 tokens/UserPromptSubmit. Loss-of-benefit guard: hard-blocks always fire (MINIMAL_ALLOWLIST).
2. **All 5 of my hooks honor the gate** via `_hp_shouldSkip(name)` early-exit, so flipping to `minimal` cuts their cost too — except `scrutinize-before-stop` which is in the allowlist (universal review enforcement).
3. **Lean by design** — every hook is regex/state-check. No LLM calls in the hot path.

## Hooks that DO benefit from Ollama (already wired by other chats)

The Ollama-routing hooks pre-existing in the harness:
- `ollama-auto-router.mjs`, `ollama-context-aggregator.mjs`, `ollama-prism-intelligence.mjs`,
  `ollama-route-recommender.mjs`, `ollama-session-continuity.mjs`,
  `ollama-terminal-watcher.mjs`, `ollama-unified-semantic-router.mjs`,
  `ollama-obsidian-rag.mjs`, `claudemd-ollama-enforcer.mjs`

Those route classification/summarization/route-recommendation through local qwen2.5-coder:7b — they're the ones doing the heavy LLM offload. My hooks are designed to NOT need an LLM.

## Future Ollama integration candidate

If `error-block-prewarn` proves under-matching (genuine new patterns escaping the 21-keyword filter), upgrade path:
1. Pre-classify content via fast regex (current behavior)
2. If no match AND content > 200 chars, route through Ollama with prompt: "Does this code resemble any of these blocked patterns? [list past blocks]. Yes/No + reason"
3. Cap latency at 1000ms; on timeout, fall through silently

Not built — wait for evidence the keyword filter misses real recurrences.
