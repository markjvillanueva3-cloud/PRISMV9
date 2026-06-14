---
title: Shop-Floor Galaxy — Architecture Map
type: architecture
domain: shop-floor
slot: golf
maintainer: golf
seeded_by: alpha
created: 2026-06-01
tags: [shop-floor, machine-status, job-tracking, adaptive, erp, galaxy]
---

# Shop-Floor Galaxy — Architecture Map

The shop-floor galaxy carries live machine status and job state, feeding adaptive control and the ERP. Per its brain, no route/page mutates shop state directly — all job lifecycle, traveler, labor, and approval changes flow through `ShopStateEngine`. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/shop-floor/MEMORY.md` · doctrine: `mcp-server/src/engines/shop-floor/CLAUDE.md`

## Role

Live machine status → adaptive feed/speed override + ERP job tracking. Consumers: quoting (quote-vs-actual reconciliation), business (job/labor), adaptive control. Scope excludes prediction/pre-execution validation (those belong to the cutting + safety galaxies).

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/shop-floor/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- [[galaxy-context-federation]] — shop-floor is a federation spoke; rolls up to the master brain
- [[feedback_psn_definition]] — the shop-floor brain on the PSN engine axis

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the shop-floor galaxy card + master-index back-pointer. Domain owner refines._
