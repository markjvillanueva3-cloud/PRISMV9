---
title: "Obsidian-as-second-brain low-token operating protocol"
name: obsidian-as-second-brain-low-token-operating-protocol
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_obsidian_low_token_2nd_brain_protocol.md
promoted_at: 2026-06-06T04:55:49.843Z
source_refs: 7
---

# Obsidian-as-second-brain low-token operating protocol

Operating protocol for [[Obsidian]] as PRISM's 2nd brain at low token cost. Synthesis of internal assessment + April 2026 external validation (see [[reference_karpathy_llm_wiki_external_validation]]).

**The 7 rules:**

1. **Keyword-gate vault recall.** Don't auto-inject vault context on every prompt — pay only on memory-recall keywords (see [[reference_memory_rag_keyword_triggers]]). Wider triggers = compounding 4s+scan cost per prompt.
   *Status: in place via `memory-rag-inject.mjs`.*

2. **Atomic notes, one concept per file.** Filename prefix determines vault subdir. Keep memories single-purpose so categorization stays clean.
   *Status: in place — `categorize()` in `memory-mirror-to-vault.mjs`.*

3. **Tag aggressively via filename prefix.** `feedback_*`, `project_*`, `reference_*`, `mistakes_*`, `patterns_*`, `user_*`. Anything else lands in `uncategorized/` (lossy).
   *Status: in place but [[reference_obsidian_vault_subdirs]] flags `lessons/` and `decisions/` as never-routed gaps.*

4. **Use `[[wiki-links]]` for cross-refs inside memory bodies.** Vault parses them; the link graph compounds for free.
   *Status: gap — most existing memories are link-free prose. See [[feedback_use_wiki_links_in_memories]].*

5. **Don't re-inject the same memory twice in a session.** A memory shown once is in conversation context already; re-injection is pure cost.
   *Status: gap — `memory-rag-inject.mjs` does not currently track per-session injected hashes. Future fix: small SQLite/JSON of (sessionId, memoryHash) at hook level.*

6. **Ollama owns ≥70% of vault maintenance.** Summarize, lint, suggest cross-refs, embed — all routed to local qwen2.5-coder:14b / deepseek-r1:14b. Claude owns synthesis, contradiction resolution, schema evolution.
   *Status: in place — see Ollama 69.2% offload baseline in [[reference_token_savings_baseline]].*

7. **Index navigation > embedding search at this scale.** ≤1K entries (we have 722) → wiki index.md is faster and cheaper than vector search. Embedding (Qdrant) is supplementary; on-disk mirror is the durability win.
   *Status: in place — Qdrant offline today and the system still functions because mirror is non-fatal.*

**Why:** External web research (Karpathy LLM-Wiki, April 2026 viral pattern) validates rules 1, 2, 3, 6, 7. Rules 4 and 5 are PRISM-specific gaps surfaced during the 2026-05-07 assessment session — fixable at zero infra cost (rule 4 is authoring discipline; rule 5 is a small hook patch).

**How to apply:**

- New memory? Atomic + correct filename prefix + ≤4 wiki-links inside body.
- Want recall? Use a trigger keyword in your prompt.
- Building a maintenance pass over the vault? Route to Ollama via the offloader hooks, not Claude.
- See [[ObsidianMemoryRagEngine]], [[ObsidianVaultSyncEngine]], `WIKI_SCHEMA.md` for the underlying mechanics.

## Related
- [[project_biz_track]]
- [[reference_system_viz]]

## Source

Promoted from memory [[feedback_obsidian_low_token_2nd_brain_protocol]] (referenced 7x across the vault). The memory remains the editable source of truth.
