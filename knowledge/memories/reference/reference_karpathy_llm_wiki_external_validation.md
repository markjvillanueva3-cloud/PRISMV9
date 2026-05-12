---
name: Karpathy LLM-Wiki external validation
description: External web research (April 2026) validates PRISM's existing wiki architecture. RAG-quality retrieval at near-zero token cost via index navigation alone, no embeddings needed at our scale.
type: reference
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
PRISM already implements [[Karpathy LLM-Wiki]] at `H:/prism/knowledge/wiki/` (722 entries: 575 engines + 90 dispatchers + 57 memories) under `WIKI_SCHEMA.md`. Web research from April 2026 confirms this is the externally-validated approach.

**External signal:**

- Karpathy's LLM-Wiki write-up went viral 2026-04: ~325K views in 48h.
- Open-source mirrors and protocols emerged within days: `github.com/NicholasSpisak/second-brain`, `aimaker.substack.com/p/llm-wiki-obsidian-knowledge-base-andrej-karphaty`, `moksoft.com/blog/ai-agents-token-optimization-obsidian-llm-second-brain`.
- Core claim: ~100 articles + ~400K words = RAG-quality retrieval at near-zero marginal token cost via **index navigation alone**, no embeddings needed at this scale.

**How to apply:**

- Don't propose replacing PRISM's wiki with a vector store / embedding-only approach. The wiki + index is the validated low-token pattern.
- For ≤1K entries, an LLM-readable index file (`wiki/index.md`) outperforms semantic-search tooling on cost. We have 722 — well inside the regime where index navigation wins.
- Embedding (Qdrant via [[prism_memory]] `remember`) is supplementary, not the primary retrieval path. The PostToolUse mirror tries to embed but skips silently when Qdrant is unreachable (`embed-skip(qdrant not connected)`) — that's by design, on-disk mirror is the durability win.
- Ollama owns ≥70% of wiki maintenance (summarize, suggest cross-refs, lint candidates, embed). Claude owns synthesis, contradiction resolution, schema evolution. Same split applies to memories — don't burn Claude tokens on routine vault chores.
- See [[WIKI_SCHEMA]] for PRISM's protocol; see [[feedback_obsidian_low_token_2nd_brain_protocol]] for the operating playbook synthesis.

**Sources cited (April 2026 web search):**

- moksoft.com/blog/ai-agents-token-optimization-obsidian-llm-second-brain
- github.com/NicholasSpisak/second-brain
- aimaker.substack.com/p/llm-wiki-obsidian-knowledge-base-andrej-karphaty
