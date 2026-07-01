---
title: Tribal-Knowledge Galaxy — Architecture Map
type: architecture
domain: tribal-knowledge
slot: golf
maintainer: golf
seeded_by: alpha
created: 2026-06-01
tags: [tribal-knowledge, shop-floor-wisdom, tip-store, shared-substrate, galaxy]
---

# Tribal-Knowledge Galaxy — Architecture Map

The tribal-knowledge galaxy is PRISM's shop-floor wisdom layer — the shared tip store every other galaxy emits to and consumes from. It is a substrate, not a leaf. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/tribal-knowledge/MEMORY.md` · doctrine: `mcp-server/src/engines/tribal-knowledge/CLAUDE.md`

## Role

`TribalKnowledgeEngine` (core tip store, auto-categorization) + `TribalKnowledgeAdvisorEngine` (parameter advisor). Every galaxy (mill/lathe/wedm/all) writes + reads tips. Injection surface: `tribal-by-domain-inject.mjs` routes domain-biased tips from `state/shared/tribal-embed-index.json` — but its `DOMAIN_MAP` is missing speed-feed/database/business (gap: [[reference_tribal_domain_map_gap_2026_06_01]]). Never inline physics constants.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/tribal-knowledge/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- [[galaxy-context-federation]] — tribal-knowledge is a federation spoke; rolls up to the master brain
- [[feedback_psn_definition]] — the tribal-knowledge brain (PSN leg #5)

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the tribal-knowledge galaxy card + master-index back-pointer. Domain owner refines._
