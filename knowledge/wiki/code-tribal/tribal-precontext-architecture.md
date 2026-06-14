---
name: tribal-precontext-architecture
category: code-tribal
domain: backend-dev
tags: [tribal-knowledge, llm-agent, prompt-engineering, rag, semantic-search, embedding]
last_updated: 2026-05-18
---

# Tribal Precontext Architecture (Domain-Biased RAG for LLM Agents)

PRISM's tribal-precontext pipeline surfaces the right historical lessons to the right chat-slot at the right time, automatically. **6 layers compose into a single UserPromptSubmit injection** that adds top-K tribal hits to every prompt without operator action.

## The 6 layers

```
L0  knowledge/memories/                    ← human-curated + auto-captured lessons (~3700+ tips)
L1  state/shared/tribal-embed-index.json   ← 424 entries × 768-d nomic-embed-text vectors
L2  .claude/scripts/tribal-rerank.mjs      ← Ollama-embed query + cosine top-K + domain boost
L3  .claude/hooks/tribal-by-domain-inject  ← UserPromptSubmit: derive slot domain → rerank → inject
L4  state/shared/tribal-citation-log.jsonl ← every fired query logged (decay measurement)
L5  hook-fire-counts.jsonl                 ← injection telemetry per chat per domain
```

L0 is the source of truth. L1 is the embedding index (rebuilt periodically). L2 is the query engine. L3 is the chat-side injector. L4–L5 are the feedback loops that measure which entries actually fire.

## How a single prompt becomes a tribal injection

1. User types a prompt. `tribal-by-domain-inject.mjs` (UserPromptSubmit T2) reads stdin.
2. `getDomainTokens({chatId})` derives the active slot's domain tokens from `chat-slots.json` (topic + branch) and `CURRENT_POSITION.md` H1.
3. `inferTribalDomain(tokens)` maps the token set to one of 7 enums via first-match-wins iteration over `DOMAIN_MAP`: `mill | lathe | wedm | cad | cam | backend-dev | general`. Order is load-bearing — manufacturing tokens take precedence over backend-dev so a "mill + hook" topic still routes to mill.
4. Hook spawns `tribal-rerank.mjs --query "<prompt>" --domain <inferred> --k 3 --json --no-cite`.
5. Rerank: Ollama embeds the prompt (nomic-embed-text, 768-d), cosine-scores against all 424 entries; entries with `e.domain === <inferred>` get a 2× boost; top-K returned.
6. Hook formats top-3 as a markdown block, injects into the prompt's `additionalContext` field via `{hookSpecificOutput:{hookEventName:"UserPromptSubmit", additionalContext: ...}}`.
7. Claude reads the injected hits before generating; the relevant prior lessons enter the context window automatically.

## Domain inference — the load-bearing ordering

```js
const DOMAIN_MAP = [
  { domain: "mill",        match: new Set([…mfg tokens…]) },
  { domain: "lathe",       match: new Set([…]) },
  { domain: "wedm",        match: new Set([…]) },
  { domain: "cad",         match: new Set([…]) },
  { domain: "cam",         match: new Set([…]) },
  { domain: "backend-dev", match: new Set(["backend", "hook", "ollama", "lora", "gnn", "neural", "llm", "embedding", "kernel", "slot", "fleet", "synergy", …]) },
];
```

First-match-wins. A pure mill chat (`MILL-HARDEN-MS3` topic) routes to mill. A pure backend-dev chat (`BACKEND-DEV-LOOP` topic) routes to backend-dev. A `mill + hook` topic still routes to mill (mfg wins). **Token-set overlap MUST be zero** between domain sets — verified by a regression test.

## Why domain inference matters (the 2× boost)

The rerank's 2× in-domain weight is the difference between *cosine top-K from a noisy 424-entry pool* and *cosine top-K from a curated 34-entry pool*. A backend-dev chat asking "how do I make this hook idempotent?" gets:

- WITHOUT boost: a mill chatter tip, a CAM strategy tip, a lathe groove tip, two backend-dev tips — relevant entries buried.
- WITH boost: the two backend-dev tips ranked #1 + #2.

The boost is small (2×) but compounds with the right index curation.

## Curation — the multi-source upstream

Backend-dev tribal knowledge flows from FIVE upstream sources:

- **Auto-memory** — Stop hook auto-captures lessons (e.g. "missing file → copy it back") into `knowledge/memories/feedback/`.
- **Wiki pages** — `knowledge/wiki/{code-tribal,software-engineering,lessons,patterns}/` curated by Claude.
- **PRISM rules** — `CLAUDE.md` §"CLAUDE.md RULES 5–12" canonical doctrine.
- **Recent regressions** — `CLAUDE.md` §"## Recent regressions" — every fix becomes a tribal entry.
- **External — MIT-OCW, Karpathy LLM-Wiki, prior chat handoffs.**

The `tribal-embed-index.mjs --bootstrap` walks all five and produces L1. Re-bootstrapping picks up new entries; until then, only the existing 424 are searchable.

## The "exhaust" build — what coverage looks like

A well-tuned backend-dev domain has:

- ≥30% of memory entries domain-tagged backend-dev (vs the 18% baseline pre-2026-05-18)
- ≥5 high-density wiki pages per topic (R12 patterns, atomic-write, scrutiny gate, agent loops, prompt design)
- A citation log showing the boost actually fires (`grep '"domain":"backend-dev"' state/shared/tribal-citation-log.jsonl | wc -l`)
- Telemetry showing the injection lands ≥1 hit ≥50% of the time on backend-dev prompts

The 2026-05-18 lima wiring shipped the first prerequisite. Subsequent iters expand the second.

## Knobs

- `PRISM_TRIBAL_DOMAIN_INJECT_DISABLE=1` — no-op the hook.
- `PRISM_TRIBAL_DOMAIN_INJECT_K=N` — top-K (default 3, max 10).
- `PRISM_TRIBAL_DOMAIN_INJECT_VERBOSE=1` — log skip-reasons to telemetry.
- `PRISM_TRIBAL_INCLUDE_AUTO=1` — include `tip-auto-NNNN` auto-ingested noise (default suppressed).

## Related

- [[karpathy-12-rule-discipline]] — R5 (use LLM for judgment) + R6 (token budgets) doctrine that motivates the architecture
- [[ollama-routing-strategy]] — sibling: which tasks route off Claude to local Ollama
- `.claude/hooks/tribal-by-domain-inject.mjs` — the hook
- `.claude/scripts/tribal-rerank.mjs` — the rerank engine
- CLAUDE.md §"BACKEND-DEV-LOOP / U-TRIBAL-BACKEND-DEV-WIRE" 2026-05-18 — wiring landed
