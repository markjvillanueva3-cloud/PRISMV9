---
title: "Ollama offload token-savings baseline"
name: ollama-offload-token-savings-baseline
kind: reference
status: promoted
category: reference
domain: knowledge-vault
promoted_from: knowledge/memories/reference/reference_token_savings_baseline.md
promoted_at: 2026-06-06T04:55:56.418Z
source_refs: 3
---

# Ollama offload token-savings baseline

Snapshot taken 2026-05-07 (since reset 2026-04-28, ~10 days):

```
Totals:           offloaded=207  kept-on-Claude=92  tokens saved=40984
Offload rate:     69.2%  (207 / 299 routed tasks)

Per-hook fire counts:
  ollama-context-aggregator      fired=89   offload=0    keep=26  suggest=63
  ollama-engine-api-extractor    fired=186  offload=186  keep=0   suggest=0
  ollama-task-offloader          fired=120  offload=21   keep=66  suggest=33
  ollama-obsidian-rag            fired=16   offload=0    keep=0   suggest=16
```

**Observations to remember:**

- `ollama-engine-api-extractor` is the workhorse — every fire offloads (likely cache-hit path or deterministic task type).
- `ollama-task-offloader` is selective: ~17% offload rate; suggests classifier is correctly conservative on non-trivial code reasoning.
- **`ollama-obsidian-rag` is suggest-only**: 16 fires, 0 actual offloads, 16 suggestions surfaced. The hook proposes recall opportunities but never executes the routing — possible config issue, intentional advisory mode, or unreached vault state. Worth investigating before declaring vault RAG fully wired.
- **`ollama-context-aggregator`** also never offloads (0/89) — keeps work on Claude (26) or merely suggests (63). Either Claude-only by design or the trigger predicates are misaligned.

**How to apply:**

- Healthy floor is ≥30% offload rate per `H:/prism/scripts/ollama-offload-dashboard.mjs` advisory rules. We are well above (69.2%).
- If rate drops, first check `http://127.0.0.1:11434/api/tags` then `H:/.claude/cache/ollama-rate-limit.json` — pattern is "offloaded=0, keptOnClaude>0" means classifier sees tasks but Ollama is unreachable.
- When a per-hook line shows fired>0 / offload=0 / suggest>0, it's an advisory-only hook — wiring opportunity, not a regression.
- Source: `node H:/prism/scripts/ollama-offload-dashboard.mjs` (state at `mcp-server/data/state/ollama-offload-stats.json`, schemaVersion 2.0.0).

## Source

Promoted from memory [[reference_token_savings_baseline]] (referenced 3x across the vault). The memory remains the editable source of truth.
