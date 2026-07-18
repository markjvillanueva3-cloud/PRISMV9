---
title: PDF-Corpus Galaxy — Architecture Map
type: architecture
domain: pdf-corpus
slot: golf
maintainer: golf
seeded_by: alpha
created: 2026-06-01
tags: [pdf-corpus, pypdf, extraction, provenance, galaxy]
---

# PDF-Corpus Galaxy — Architecture Map

The pdf-corpus galaxy is PRISM's pypdf 8,752-page extraction corpus — page-level JSONL with notability + domain tags. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/pdf-corpus/MEMORY.md` · doctrine: `mcp-server/src/engines/pdf-corpus/CLAUDE.md`

## Role

Per the brain: `PDFProcessingPipelineEngine` (backs `prism_dev` pdf_pipeline actions), `PDFSourceRegistryEngine`. Canonical extractor: `scripts/extract-jm-die-corpus-page-by-page.py` (pypdf, ease-first queue, page-level JSONL — per [[feedback_use_lima_pypdf_page_extractor]], ~76× deeper than pdf-parse). **No claim without provenance** — every emitted tribal entry cites source PDF + page number + extraction date. Feeds academy + ai-training (RAG).

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/pdf-corpus/{CLAUDE,MEMORY}.md`
- [[galaxy-context-federation]] — pdf-corpus is a federation spoke; rolls up to the master brain
- [[feedback_use_lima_pypdf_page_extractor]] · [[feedback_psn_definition]]

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the pdf-corpus galaxy card + master-index back-pointer. Domain owner refines._
