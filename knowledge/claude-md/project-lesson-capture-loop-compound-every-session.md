---
source: project
section: LESSON CAPTURE LOOP — compound every session
slug: lesson-capture-loop-compound-every-session
indexed_at: 2026-04-30T17:23:46.950Z
---

## LESSON CAPTURE LOOP — compound every session

**Capture (fire on these moments):**
- Same root cause fails 2x → `/outcome failure` + `prism_guard:error_ledger_append_and_embed`
- Hook blocks unexpectedly → `/remember` (rule + why-blocked)
- Derived non-trivial formula/constant → `/wiki-ingest concept`
- Almost-duplicated an existing engine → `/generalize` (encode dedup signature)
- Build passes after N retries → `/outcome success` (record what fixed it)
- User correction ("no, do X") → `/remember preference`
- Hook injection surprised you → `/wiki-ingest lesson`

**Retrieve (before acting):**
- Before forging asset → `/wiki-query` + `prism_memory:semantic_search`
- Before deriving formula → grep `wiki/index.md`
- On error → `prism_guard:error_ledger_recall_similar` (k=5)
- Before claiming roadmap unit → `/memory-search` for prior attempts

**Durable tip layer** (3700+ tips, 296 playbook rules) — query BEFORE `/wiki-query` since these cover shop-floor wisdom the wiki doesn't yet index:
- `prism_knowledge:tribal_search` / `tribal_capture` / `tribal_suggest` / `tribal_stats`
- `prism_shop_practice:playbook_advise` / `playbook_antipatterns` / `playbook_lookup` / `playbook_add_rule` / `practice_recommend` / `tree_navigate` (troubleshooting)
- `prism_knowledge:kg_query` / `kg_recommend` / `kg_gap` (knowledge-graph traversal)

**Promotion ladder:** raw observation → tip (`/remember`, `/outcome`, `tribal_capture`) → wiki entry (`/wiki-ingest`, ≥2 occurrences) → pattern (`/generalize`, ≥3 entries shared signature) → hook (deterministic + safety-relevant).

**Reality of automation:** observation→tip is automated; tip→wiki, wiki→pattern, pattern→hook are currently MANUAL — promote them yourself. The `error-pattern-promote.mjs` hook auto-drafts ONLY for the error-ledger lane. **Handoff MUST embed top-3 open lessons.**

Auto-fire hooks: `wiki-precheck-inject.mjs` injects top-3 wiki on UserPromptSubmit; `error-pattern-promote.mjs` drafts lesson stubs on Stop. Telemetry: `mcp-server/data/state/hook-fire-counts.jsonl`.
