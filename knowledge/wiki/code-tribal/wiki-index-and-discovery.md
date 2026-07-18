---
name: wiki-index-and-discovery
category: code-tribal
domain: backend-dev
tags: [wiki, index, leaf-index, embeddings, semantic-search, recall, prism-development, ai-development]
last_updated: 2026-05-18
---

# Wiki Index and Discovery — how entries get found

PRISM has 23981 wiki entries; useless unless a chat finds the right 3 on every prompt. Four indexes plus two recall hooks make this work.

## The four indexes

- index.md  knowledge/wiki/index.md  LLM-curated catalog (770 entries by-hand). Human navigation; some BM25.
- _stats.md  knowledge/wiki/architecture/_stats.md  Counts + breakdowns. Quality dashboard.
- _leaf-index.jsonl  knowledge/wiki/architecture/_leaf-index.jsonl  Per-leaf tokens + path + title (BM25 substrate). Used by wiki-precheck-inject.mjs UserPromptSubmit T2.
- _embeddings.jsonl  knowledge/wiki/architecture/_embeddings.jsonl  14738 int8 nomic-embed vectors (768-d). Used by wiki-precheck-inject paraphrase fallback.

The two _*-jsonl files are the runtime indexes. index.md is human-readable but NOT the primary recall source.

## The two recall hooks

wiki-precheck-inject.mjs (UserPromptSubmit T2): fires on every prompt. Two-stage retrieval: (1) BM25 over _leaf-index.jsonl, keyword overlap, fast ~10ms. (2) Cosine over _embeddings.jsonl, only when BM25 returned fewer than K hits OR scores below threshold; ~50ms but catches paraphrase. Injects results as a wiki-precheck block. Domain bias gives in-domain entries a +4.5 BM25 boost.

wiki-recall-on-read.mjs (PostToolUse:Read): fires when you Read a documented source file. Injects the wiki summary. Skips .md files (would double-recall).

## How regeneration works

regen-wiki-from-viz.mjs 21-stage orchestrator regenerates the indexes: post-commit (git hook), hourly cron, fingerprint gate skips the chain when nothing relevant changed. Re-bootstrapping _embeddings.jsonl requires Ollama nomic-embed-text:latest; fail-soft if Ollama is down.

## How to write entries that surface

Title matters. The title becomes a BM25 token. Use imperative phrasing matching likely query terms.

Frontmatter tags + domain matter. tags are tokenized into BM25 substrate; choose 5-10 spanning topic noun, process verb, discipline. domain: backend-dev makes the entry eligible for the domain-bias boost on backend-dev slots.

First paragraph matters. It is the embedding seed for cosine fallback. Lead noun-heavy; name the topic 1-3 times; do not bury the lede.

Word count sweet spot: 50-150 lines. Under 50, less context for embedding to disambiguate. Over 200, BM25 dilution.

Cross-links: bracket-bracket name brackets to related entries. Reduces apparent-orphan rate. Bidirectional cross-links make the graph denser.

## Frontmatter convention (canonical)

name (matches filename without .md), category (code-tribal/software-engineering/architecture/lessons/patterns/trajectories), domain (backend-dev/mill/lathe/wedm/cad/cam/general), tags array, last_updated, optional sources.

The wiki-lint hook checks that name matches the filename.

## What breaks discovery

- Missing frontmatter: won't tokenize correctly into _leaf-index.jsonl
- Generic title: "Notes on X" does not BM25-match
- No domain tag: misses the in-domain boost
- Stale last_updated: operators may distrust an entry over 6 months stale
- Broken cross-links: noise in the graph; PRISM treats as TODO marker

## Semantic index staleness

_embeddings.jsonl regenerates less often than _leaf-index.jsonl because Ollama embedding is the bottleneck. If the recall hook reports semantic index N hours stale, regen with node scripts/build-wiki-embeddings.mjs. For over 30h stale + Ollama unhealthy, accept BM25-only recall until the embedding cron unblocks.

## The tip-auto-NNNN filter

Auto-ingested unfiltered tribal tips (tip-auto-5033 etc.) are suppressed at the inject seam to avoid noise. The TIP_AUTO_RE regex in tribal-by-domain-inject.mjs does this. Knob PRISM_TRIBAL_INCLUDE_AUTO=1 disables the filter.

## When to write a new entry vs extend an existing one

New entry: the topic does not overlap meaningfully with any existing entry. Extend: the topic is a refinement, edge case, or new example within an existing entry's scope.

R8 dedup-preflight on wiki: grep the wiki tree for the topic noun first. If the noun appears in an entry title, extend it.

## Related

- [[tribal-precontext-architecture]]
- [[obsidian-vault-integration]]
- [[embedding-and-rag-patterns]]
- CLAUDE.md Wiki brain section
- WIKI_SCHEMA.md
