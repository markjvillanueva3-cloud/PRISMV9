---
title: PDF-Corpus-Mill Galaxy — Architecture Map
type: architecture
domain: pdf-corpus-mill
slot: golf
maintainer: golf
seeded_by: alpha
created: 2026-06-01
tags: [pdf-corpus-mill, mill-pdf, haas, mazak, extraction, galaxy]
---

# PDF-Corpus-Mill Galaxy — Architecture Map

The pdf-corpus-mill galaxy is the mill-scoped PDF extraction corpus (Haas / Mazak manuals → extracted bridge). It inherits the pdf-corpus invariants. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified content lives here, NOT hand-copied): `mcp-server/src/engines/pdf-corpus-mill/MEMORY.md` · doctrine: `mcp-server/src/engines/pdf-corpus-mill/CLAUDE.md`

## Role

`scripts/generate-milling-extracted-pdf-bridge.mjs` — the mill-scoped emitter (mill PDF → extracted-bridge). Atlas: `mcp-server/src/engines/pdf-corpus-mill/PATHS.md` (H:/-wide mill-PDF path atlas). **Inherit pdf-corpus invariants — do not fork them.** Use lima's canonical pypdf page-by-page extractor, NOT heading-anchor parsing (per [[feedback_use_lima_pypdf_page_extractor]]). Feeds the mill galaxy (foxtrot) + ai-training.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/pdf-corpus-mill/{CLAUDE,MEMORY,PATHS}.md`
- [[galaxy-context-federation]] — pdf-corpus-mill is a federation spoke; rolls up to the master brain
- [[pdf-corpus-galaxy]] — parent corpus · [[mill-galaxy]] — consumer · [[feedback_psn_definition]]

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the pdf-corpus-mill galaxy card + master-index back-pointer. Domain owner refines._
