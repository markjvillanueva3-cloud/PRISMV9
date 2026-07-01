# RAG Architectures and Persistent Memory (INDIA)

**Galaxy:** INDIA (AI/NN/GNN/LoRA/RAG Training)
**Status:** Core Technique - Master Level

## Description
Retrieval-Augmented Generation (RAG) combines retrieval from a knowledge base with generation to reduce hallucination and improve factual accuracy. Persistent memory extends this by maintaining long-term, updatable knowledge across sessions.

## Key Architectures
- Naive RAG (retrieve → generate)
- Advanced RAG (query rewriting, reranking, multi-hop retrieval)
- Modular RAG (agentic retrieval, tool use)
- Persistent memory layers that update over time

## PRISM Implementation
- Central to the Obsidian vault + galaxy memory system
- Used heavily in ZULU orchestration and per-slot persistent memory
- Integrated with the awareness injection system

## Edge Cases
- Stale retrieval indexes
- Noisy or conflicting sources
- Tasks requiring synthesis across many documents

## JM Die / PRISM Notes
- The 34 galaxy MEMORY.md files + wiki form a large RAG corpus
- Persistent memory is critical for slots to improve over time

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)