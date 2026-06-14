---
name: ollama-routing-decisions
category: code-tribal
domain: backend-dev
tags: [ollama, routing, offload, qwen, nomic, prewarm, prism-development, ai-development]
last_updated: 2026-05-18
---

# Ollama Routing Decisions — what to offload, when, how

PRISM's Ollama integration offloads token-heavy mechanical work off Claude. The measured offload rate is 10.9% lifetime / 42.1% adjusted-24h. The gap between "Ollama hooks exist (21)" and "Ollama actually offloads (10.9%)" is the chronic gap. This wiki documents the decisions that close it.

## What SHOULD offload to Ollama

| Task | Why | Skill / model |
|------|-----|---------------|
| Embed text → 768-d vector | Cheap deterministic transform | nomic-embed-text |
| Summarize a known file | Mechanical extraction | /ollama-summarize, qwen2.5-coder:7b |
| Explain code in plain English | Pattern-match work | /ollama-explain |
| Classify a snippet (lang, intent) | Pure classification | /ollama-classify |
| Lint a diff | Rule-application | /ollama-lint |
| Triage error log | Pattern-match | /ollama-triage, /ask-local |
| Docstring generation | Templated extraction | /ollama-docstring |
| Wiki-precheck paraphrase fallback | Cosine over embedded index | embedded automatic |
| Tribal-rerank in-domain boost | Cosine + boost | tribal-rerank.mjs |

What does NOT offload to Ollama (Claude only):
- Judgment calls (which architecture, which fix, what to prioritize)
- Safety decisions (S(x) gates, physics validation)
- Multi-file synthesis with cross-cutting tradeoffs
- New code that introduces invariants

R5: model only for judgment. Ollama is for everything mechanical; Claude is for judgment.

## Model selection by task

| Task | Model | Why |
|------|-------|-----|
| Embedding | nomic-embed-text:latest | 768-d, 8k context, ~5ms cpu-only |
| Quick classify (<100 tokens) | qwen2.5-coder:3b | Fast, fits in RAM warm |
| Summarize / explain (100-2k tokens) | qwen2.5-coder:7b | Balance of quality + cost |
| Code generation (rare) | qwen2.5-coder:14b | Only when 7b underperforms |
| Cross-task agent loop | qwen2.5-coder:7b | Tool-use API support |

Default to 7b unless explicit reason for 3b (latency-sensitive) or 14b (quality-required).

## The cold-load problem

A cold qwen2.5-coder:7b load is ~113s. A warm one is sub-second. PRISM's `ollama-prewarm-on-pipeline.mjs` (UserPromptSubmit T3) detects pipeline triggers (`/forge-audit`, `/rgs`, `/scrutinize`, etc.) and spawns a detached `curl /api/generate` with `keep_alive=10m`.

Implication: if you're about to do Ollama-heavy work, run a pipeline-trigger skill first to prewarm. Otherwise the first inference takes 2 minutes.

## Hook layer — pipeline injection

`ollama-pipeline-injector.mjs` (UserPromptSubmit T2) detects pipeline triggers and injects concrete model + savings recommendations into the prompt. This is doc-not-execution: it tells you WHAT to offload; the offload itself happens via the `/ollama-*` skills or `ask-ollama.mjs` CLI.

The 2026-05-15 OLLAMA-PIPELINE-MS0 commit shipped this; the gap it closed was that hooks fire but DON'T force offloads. Now skill-doc updates carry explicit phase→model routing tables.

## ask-ollama — the active callable

The 2026-05-18 charlie U-OE01 shipped `scripts/ask-ollama.mjs` as the ACTIVE local-Ollama callable Claude invokes via Bash. Modes:

- `viz <query>` — keyword search of the system-viz graph (pure code, no model, ~0 Claude tokens)
- `summarize <file>` — file → Ollama digest
- `explain <file>` — code explanation
- `triage <file>` — error-log diagnosis
- `ask <prompt>` — generic LLM query

Single model `qwen2.5-coder:3b` + `keep_alive` — one warm small model beats 7b cold-load thrash on the memory-pressured host.

Skill: `/ask-local`. Use when token cost matters AND the task is mechanical.

## ollama-prism-bridge — the agent harness (L2)

The 2026-05-18 charlie U-OE-BRIDGE-L2 shipped `ollama-prism-bridge.mjs` — an Ollama model autonomously chains 3 read-only PRISM knowledge tools (`viz_search`, `wiki_lookup`, `read_excerpt`) via `/api/chat` `tools` API. Multi-step investigation costs ~0 Claude tokens.

Read-only by construction (confinePath + frozen tool allowlist + hard loop cap + R12 fail-loud). 86 tests + real-data E2E + main() subprocess oracle.

Skill: `/ollama-bridge`. Use for "where is X / what wires to Y" multi-step investigations.

## Offload telemetry

`mcp-server/data/state/ollama-offload-stats.json` (schemaVersion 2.0.0) tracks lifetime + per-hook offload counts.

```bash
node scripts/ollama-offload-dashboard.mjs           # human-readable
node scripts/ollama-offload-dashboard.mjs --json    # machine-readable
node scripts/ollama-offload-dashboard.mjs --reset   # zero counters
```

Healthy: offload rate ≥ 30% on a session of mixed work. Below 30%: investigate why. `offloaded=0, keptOnClaude>0` = Ollama unreachable or rate-limited.

## The 2026-05-17 schema-blindness bug

The high-roi-skill-rank META tool read `j.totals.{offloaded,keptOnClaude}` against ollama-offload-stats.json schema v2.0.0 which emits those fields top-level. Result: META reported `offloaded=0, kept=0` against a working route. Lesson: always schema-probe via `j.schemaVersion` + `"totals" in j` before assuming shape.

## Health check before offloading

```bash
node scripts/ollama-docker-health.mjs --require ollama
```

Returns 0 if Ollama daemon + critical services up; nonzero with diagnostic JSON otherwise. The pipeline-injector hook runs this before recommending offloads.

If Ollama is down: skills fail-soft (return null or "Ollama unreachable"); the chat falls back to Claude. No silent degradation — fail-loud per R12.

## When the offload-rate is low

Three failure modes:

1. **Tasks aren't actually offload-eligible** — most work in the session IS judgment. Acceptable; offload rate isn't a universal target.
2. **Hooks suggest but don't force** — chat ignores the suggestion. Force the issue: explicitly invoke `/ask-local` or `/ollama-*` for the mechanical tasks.
3. **Ollama unhealthy** — daemon down, model not warm, GPU contention. Diagnose via the health-check.

The "fix" depends on which mode. Don't auto-tune the threshold — improve the operator discipline OR fix infra.

## Knobs

- `PRISM_OLLAMA_PIPELINE_INJECT=0` — disable pipeline-injector hook
- `PRISM_OLLAMA_PREWARM_DISABLE=1` — disable prewarm-on-pipeline
- `OLLAMA_URL` — override default 127.0.0.1:11434
- `PRISM_TRIBAL_DOMAIN_INJECT_DISABLE=1` — disable tribal precontext (one of the Ollama-using hooks)

## Related

- [[deep-reasoning-doctrine]] — Claude vs Ollama tier selection
- [[embedding-and-rag-patterns]] — embedding model choice + cosine
- [[llm-agent-loop-design]] — 4 loop shapes including Ollama harness
- [[token-budget-management]] — Ollama offload IS a budget mechanism
- CLAUDE.md "OLLAMA-PIPELINE-MS0" + "OLLAMA-EXPAND-MS0"
- `scripts/ollama-offload-dashboard.mjs` + `scripts/ask-ollama.mjs`
