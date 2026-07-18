---
title: Corpus-Aggregation Galaxy — Architecture Map
type: architecture
domain: corpus-aggregation
slot: golf
maintainer: golf
seeded_by: alpha
created: 2026-06-01
tags: [corpus-aggregation, harvest, ingestion, pdf, mit, tribal, galaxy]
---

# Corpus-Aggregation Galaxy — Architecture Map

The corpus-aggregation galaxy harvests + routes scanned resources (PDF + MIT + tribal) into the academy + NN training corpora. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/corpus-aggregation/MEMORY.md` · doctrine: `mcp-server/src/engines/corpus-aggregation/CLAUDE.md`

## Role

Per the brain: `HarvestPipelineEngine` (per-type harvesting from scanned resources), `IngestionOrchestratorEngine` (route scanned files to domain engines), `KnowledgeIngestionOrchestratorEngine`, `ContentIngestionPipelineEngine` (unified knowledge ingestion), `TribalCorpusOrchestratorEngine`. Feeds academy (teaching) + ai-training (NN/RAG). Upstream of `pdf-corpus` / `mit-curriculum` / `tribal-knowledge`.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/corpus-aggregation/{CLAUDE,MEMORY}.md`
- [[galaxy-context-federation]] — corpus-aggregation is a federation spoke; rolls up to the master brain
- [[feedback_psn_definition]] — the corpus-aggregation brain on the PSN engine axis

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the corpus-aggregation galaxy card + master-index back-pointer. Domain owner refines._
