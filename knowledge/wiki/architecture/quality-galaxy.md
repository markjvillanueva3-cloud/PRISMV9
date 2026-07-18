---
title: Quality Galaxy — Architecture Map
type: architecture
domain: quality
slot: golf
maintainer: golf
seeded_by: alpha
created: 2026-06-01
tags: [quality, cpk, spc, fai, cmm, galaxy]
---

# Quality Galaxy — Architecture Map

The quality galaxy owns Cpk / SPC gates and FAI for mill / lathe / wedm + business. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/quality/MEMORY.md` · doctrine: `mcp-server/src/engines/quality/CLAUDE.md`

## Role

Cpk / SPC / CMM / FAI gates across the cutting domains + business. CAM bridges per the brain: `HyperMillSPCBridge`, `MastercamSPCBridge`, `HyperMillFAIBridge`, `MastercamFAIBridge`. Domain test filter: `npx vitest run -t "Quality|SPC|Cpk|CMM"`. Never inline physics/safety constants — import from `mcp-server/src/physics/constants.ts`.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/quality/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- [[galaxy-context-federation]] — quality is a federation spoke; rolls up to the master brain
- [[feedback_psn_definition]] — the quality brain on the PSN engine axis

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the quality galaxy card + master-index back-pointer. Domain owner refines._
