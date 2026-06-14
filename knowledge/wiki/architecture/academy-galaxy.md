---
title: Academy Galaxy — Architecture Map
type: architecture
domain: academy
slot: lima
maintainer: lima
seeded_by: alpha
created: 2026-06-01
tags: [academy, courses, curriculum, mit-ocw, certification, galaxy, lima]
---

# Academy Galaxy — Architecture Map

The academy galaxy (owned by **slot:lima**) is PRISM Academy: courses, curriculum, lessons, MIT-OCW integration, certification, and the instructor surface. It teaches from the corpus the corpus galaxies aggregate. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/academy/MEMORY.md` · doctrine: `mcp-server/src/engines/academy/CLAUDE.md`

## Role

16 academy engines; courses `course-0a..60` (63 ids) on a 3-leg ship contract; custom `academy-awareness.mjs`. CONSUMER of `mit-curriculum` (course source) + the pypdf corpus (8,752-page extraction). Canonical extractor: `scripts/extract-jm-die-corpus-page-by-page.py` (lima's pypdf page-by-page, per [[feedback_use_lima_pypdf_page_extractor]]).

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/academy/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- [[galaxy-context-federation]] — academy is a federation spoke; rolls up to the master brain
- [[feedback_psn_definition]] — lima is the academy brain on the PSN engine axis

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the lima galaxy card + master-index back-pointer. Domain owner (lima) refines._
