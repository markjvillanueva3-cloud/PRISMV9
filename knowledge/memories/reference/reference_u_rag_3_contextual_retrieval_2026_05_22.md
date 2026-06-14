---
name: u-rag-3-contextual-retrieval-2026-05-22
description: "U-RAG-3 PENDING — Contextual Retrieval (Anthropic technique: prepend Ollama-generated 1-2 sentence context blurb to each chunk before embedding; −35-49% failed retrieval). Needs a fresh embed pass after U-RAG-1 audit fix."
aliases: reference_u_rag_3_contextual_retrieval_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.020Z
---


# U-RAG-3 — Contextual Retrieval (PENDING)

## What it is

Anthropic-published technique that materially improves retrieval precision: before embedding each chunk, prepend an LLM-generated 1-2 sentence context blurb that names the surrounding document + section. The chunk's embedding then carries document-level context, not just chunk-local content. Reported impact: −35-49% failed retrieval rate.

## Why it's PENDING

- The canonical wiki embedder `scripts/embed-wiki-into-tribal-index.mjs` keys `id = "external:" + winPath` and embeds raw chunks (no blurb prefix).
- U-RAG-1 confirmed coverage is already ~97.2% under the `external:` scheme (the "0.8%" was an audit blind spot, not a real gap — see [[reference_tribal_index_keyscheme_clobber_2026_05_22]]).
- Adding context blurbs requires modifying the embedder to call Ollama (qwen2.5-coder, per the spec — Ollama-offload-able) for each chunk and then re-embedding the corpus. That's a slow pass (~24K files × Ollama call + embed call ≈ hours).
- The U-RAG-2 lexical rerank works on the corpus as-is; U-RAG-3 is additive, not blocking.

## Acceptance (per spec)

Stored chunks carry a `context` prefix; the U-RAG-5 eval harness shows lift vs the U-RAG-1+U-RAG-2 baseline.

## Design sketch

1. Modify `embed-wiki-into-tribal-index.mjs` to optionally accept `--with-context` and call Ollama qwen2.5-coder for a per-chunk blurb (cached per file-path mtime).
2. Prepend blurb to chunk text before passing to `nomic-embed-text`.
3. Tag each indexed entry with a `context_version: "v1"` so the eval harness can A/B vs uncontextualized entries.
4. Wired-in via a fresh embed pass run from a long-running session (NOT inside a /loop iteration).

## See also

- Spec: `state/shared/specs/RAG-UPGRADE-MS0.md`
- [[reference_rag_upgrade_ms0_2026_05_22]] — milestone tracker
- [[reference_u_rag_2_two_stage_rerank_2026_05_22]] — sister unit (orthogonal — rerank operates on whatever's indexed)
