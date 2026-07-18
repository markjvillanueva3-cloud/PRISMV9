---
title: "Ollama/qwen reroutes cost-heavy work to save Claude tokens"
name: ollama-qwen-reroutes-cost-heavy-work-to-save-claude-tokens
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_ollama_token_routing.md
promoted_at: 2026-06-06T04:55:50.012Z
source_refs: 12
---

# Ollama/qwen reroutes cost-heavy work to save Claude tokens

User explicitly stated (2026-04-27): "we're utilizing ollama/qwen to reroute tool calls, hooks and other cost heavy features to save on tokens."

**Why:** Claude tokens are paid; Ollama runs free locally on H:/Tools/ollama with qwen2.5-coder:7b. Every routable task moved to Ollama is direct $$ savings AND keeps Claude's context budget for actual reasoning.

**How to apply:**
1. **Hook injections** — relevance-gate via Ollama before injecting heavy context (discipline-expert 600 tok, prompt-rules 330 tok, etc.). Ollama classifies prompt → only inject if relevance >0.6.
2. **Tool call routing** — `OllamaHookBridgeEngine` and `claudemd-ollama-enforcer.mjs` already wired; expand to: code explanation, summarization, docstring gen, classification, error triage, diff summary, test stubs (skills exist: `/ollama-explain`, `/ollama-summarize`, `/ollama-docstring`, `/ollama-classify`, `/ollama-error-triage`, `/ollama-diff-summary`, `/ollama-test-stub`).
3. **Reviewer agents** (hook #6 parallel scrutiny) — first-pass review by Ollama qwen-coder; escalate to Claude `physics-reviewer`/`code-analyzer` only on red flags or critical files.
4. **Karpathy checklist** — Ollama classifies task complexity; only inject the 5-step prompt for COMPLEX tasks.
5. **Discipline expert detection** — Ollama picks 1 discipline pack instead of injecting all 14.
6. **Wiki maintenance** — already 70% Ollama per WIKI_SCHEMA.md. Extend to memory-prune, doc-sync, drift detection.
7. **CLAUDE.md slimming** — every rule we propose to enforce via hook should also have an Ollama relevance gate so it only fires when needed.

**Default routing rule:** if a task can be done by qwen2.5-coder:7b with acceptable quality (classification, summary, lint, format, route, simple code), route to Ollama. Reserve Claude for: deep reasoning, novel synthesis, physics validation, safety decisions, anything requiring 100K+ context understanding.

**Existing infrastructure:**
- `H:/Tools/ollama/` portable install
- `OllamaHookBridgeEngine` in mcp-server
- `/local-health` skill checks stack
- `/offload-stats` skill shows token savings
- 9 `/ollama-*` skills already defined
- `claudemd-ollama-enforcer.mjs` hook (saves 85% on rule selection per CLAUDE.md global)

**Anti-pattern to avoid:** sending an Ollama-routable task to Claude to "be safe." If Ollama output is wrong, the cost is one retry; if Claude is overused, the cost compounds across every session.

## Source

Promoted from memory [[feedback_ollama_token_routing]] (referenced 12x across the vault). The memory remains the editable source of truth.
