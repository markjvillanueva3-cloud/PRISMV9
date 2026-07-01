---
name: feedback-when-to-use-hybrid-retrieval
description: Decision aid for when to reach for /hybrid (or prism_session:hybrid_search MCP action) vs Grep/Glob/Agent/master_index_query/individual substrate queries. Hybrid is the right call when the answer could live in ANY of 4 PSN substrates and pinpointing upfront is harder than fanning out + fusing.
type: feedback
slot: sierra
source: prism-memory
synced: 2026-06-27T20:30:46.452Z
aliases: feedback_when_to_use_hybrid_retrieval
---


## The rule

When a chat (or operator) needs to *find something* in PRISM, the decision is between five retrieval surfaces:

| surface | when |
|---|---|
| **Read** | path is known |
| **Grep / Glob** | exact symbol/string/glob pattern is known |
| **Agent (Explore)** | open-ended exploration that needs 3+ rounds |
| **`prism_session:master_index_query`** | one named surface — system-graph only |
| **`/hybrid` or `prism_session:hybrid_search`** | answer could live in ANY of: memory vault, system-graph, episode store, Qdrant vectors |

**Reach for /hybrid when:**
- User asks "where is X" / "what handles Y" / "is there a Z" and the answer could live in code, docs, commit history, OR semantically-similar engines
- The query is fuzzy ("RAG", "hybrid retrieval", "vector substrate") — semantic similarity (Qdrant) wins where exact-match (Grep) fails
- Building RAG-style context — `/hybrid` returns top-K with per-source provenance for prompt assembly
- Cross-substrate sanity check — does memory + wiki + graph + vectors all agree?

**Don't reach for /hybrid when:**
- The path is known → just Read
- The symbol is known → Grep
- Only the freshest answer matters → `git log` (hybrid is durable knowledge, not recency)
- One specific surface is right → call it directly (`master_index_query`, `memory_search`, etc. — cheaper than 4-way fan-out)

## Why: hybrid normalizes score-scale drift

Each substrate produces different score units:
- memory-index BM25 → raw tf-idf-ish (0..15+)
- master-index BM25 → similar but indexed over engines/wikis
- episode-store predicate → token-overlap count (0..N)
- Qdrant cosine → 0..1

RRF (Reciprocal Rank Fusion, k=60) normalizes these to a rank-based scalar so docs appearing in multiple substrates rise to the top regardless of which substrate's score is "loudest." Cross-substrate agreement = trust signal.

## How to apply

**Why:** the sierra hybrid retrieval batch (iters 17-26, 2026-05-25) shipped 4 dense substrates + the lib + CLI + skill + MCP action. Auto-invocation depends on chats knowing WHEN to reach for it — a tool that exists but never auto-fires is wasted compounding.

**How to apply:**
1. Operator question matching the "Reach for /hybrid when" patterns → invoke `/hybrid` skill OR call `prism_session:hybrid_search` via MCP
2. Chats with the MCP server connected should prefer the MCP action (cheaper than shell-out via CLI)
3. Chats without MCP available fall through to `node H:/prism/scripts/prism-hybrid.mjs --query "..."` (CLI)
4. The 4 substrate toggles (`--no-memory`, `--no-master`, `--no-episode`, `--no-vector` / `no_memory: true` etc. via MCP) let you A/B test which substrate matters for a given query class
5. Inspect `surfaces` in each result — cross-substrate agreement is the trust signal

## Concrete examples

| User query | Tool | Why |
|---|---|---|
| "where is the Kienzle constant defined" | Read `src/physics/constants.ts` | path known |
| "find all uses of KienzleForceModel" | Grep | exact symbol known |
| "what handles wire-EDM stability" | `/hybrid` or `master_index_query` | could be engine, wiki, formula |
| "what do we have on RAG / hybrid retrieval" | `/hybrid` | semantic — vectors + episodes win |
| "what's the latest commit on cad-fusion-live-ms0" | `git log` | recency |
| "find anything about Brij Pandey's AI Infrastructure Master Tree" | `/hybrid` | fuzzy, could be in any of: memos, wiki, episode-store |

## Cross-refs

- [[reference_psn_hybrid_retrieval_wire_2026_05_25]] — iter 18 (the lib + CLI + skill)
- [[reference_psn_hybrid_retrieval_wiki_2026_05_25]] — iter 25 (wiki architecture entry)
- [[psn-hybrid-retrieval-substrate]] — wiki entry (canonical architecture doc)
- [[feedback_psn_definition]] — canonical 11-leg PSN taxonomy (hybrid spans legs 4 + 6 + 10 + 12)
