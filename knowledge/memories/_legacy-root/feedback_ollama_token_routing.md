---
source: prism-memory
synced: 2026-06-27T20:30:46.438Z
aliases: feedback_ollama_token_routing
---

---
name: Ollama/qwen reroutes cost-heavy work to save Claude tokens
description: PRISM uses local Ollama (qwen2.5-coder:32b default; gpt-oss:120b for deep local reasoning) to reroute tool calls, hook injections, and routine LLM tasks away from Claude API tokens. Always prefer Ollama for tasks that don't need Claude-class reasoning.
type: feedback
originSessionId: 9c056864-b507-4e43-9c29-e96467819e74
---
User explicitly stated (2026-04-27): "we're utilizing ollama/qwen to reroute tool calls, hooks and other cost heavy features to save on tokens."

**Why:** Claude tokens are paid; Ollama runs free locally on H:/Tools/ollama with the Blackwell roster (qwen2.5-coder:32b heavy-code / :1.5b trivial / gpt-oss:120b deep / gpt-oss:20b mid). Every routable task moved to Ollama is direct $$ savings AND keeps Claude's context budget for actual reasoning.

> **Roster note (2026-06-09):** the original :7b default and the 2026-05-06 :14b/deepseek-r1:14b stack were all retired in the 2026-06-04 Blackwell migration (RTX PRO 6000 96GB). Canonical roster + how/when-to-use table: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md`. Supersedes the older claim in `reference_local_llm_routing.md`.

**How to apply:**
1. **Hook injections** — relevance-gate via Ollama before injecting heavy context (discipline-expert 600 tok, prompt-rules 330 tok, etc.). Ollama classifies prompt → only inject if relevance >0.6.
2. **Tool call routing** — `OllamaHookBridgeEngine` and `claudemd-ollama-enforcer.mjs` already wired; expand to: code explanation, summarization, docstring gen, classification, error triage, diff summary, test stubs (skills exist: `/ollama-explain`, `/ollama-summarize`, `/ollama-docstring`, `/ollama-classify`, `/ollama-error-triage`, `/ollama-diff-summary`, `/ollama-test-stub`).
3. **Reviewer agents** (hook #6 parallel scrutiny) — first-pass review by Ollama qwen-coder; escalate to Claude `physics-reviewer`/`code-analyzer` only on red flags or critical files.
4. **Karpathy checklist** — Ollama classifies task complexity; only inject the 5-step prompt for COMPLEX tasks.
5. **Discipline expert detection** — Ollama picks 1 discipline pack instead of injecting all 14.
6. **Wiki maintenance** — already 70% Ollama per WIKI_SCHEMA.md. Extend to memory-prune, doc-sync, drift detection.
7. **CLAUDE.md slimming** — every rule we propose to enforce via hook should also have an Ollama relevance gate so it only fires when needed.

**Default routing rule:** if a task can be done by qwen2.5-coder:32b with acceptable quality (classification, summary, lint, format, route, simple code), route to Ollama (escalate to gpt-oss:120b for deeper local reasoning before reaching for Claude). Reserve Claude for: deep reasoning, novel synthesis, physics validation, safety decisions, anything requiring 100K+ context understanding.

**Existing infrastructure:**
- `H:/Tools/ollama/` portable install
- `OllamaHookBridgeEngine` in mcp-server
- `/local-health` skill checks stack
- `/offload-stats` skill shows token savings
- 9 `/ollama-*` skills already defined
- `claudemd-ollama-enforcer.mjs` hook (saves 85% on rule selection per CLAUDE.md global)

**Anti-pattern to avoid:** sending an Ollama-routable task to Claude to "be safe." If Ollama output is wrong, the cost is one retry; if Claude is overused, the cost compounds across every session.
