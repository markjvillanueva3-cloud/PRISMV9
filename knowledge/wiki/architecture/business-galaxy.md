---
title: Business Galaxy — Architecture Map
type: architecture
domain: business
slot: hotel
maintainer: hotel
seeded_by: alpha
created: 2026-06-01
tags: [business, erp, accounting, crm, quote-to-ship, pii, galaxy, hotel]
---

# Business Galaxy — Architecture Map

The business galaxy (owned by **slot:hotel**) is PRISM's enterprise layer: ERP, HR, accounting, CRM, and the quote-to-ship order flow. It is governed by financial-invariant discipline and PII-handling discipline. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/business/MEMORY.md` · doctrine: `mcp-server/src/engines/business/CLAUDE.md`

## Position in the pipeline

```
quoting (charlie) ─► order ─► business (hotel: ERP/accounting/CRM/HR) ─► shop-floor jobs ─► ship + invoice
                                       │
                                       └─ 6 sub-galaxies · financial-invariant + PII discipline
```

Business consumes quotes (charlie) and shop-floor status; it owns the order-to-cash + ERP records. Custom domain-awareness card per the hotel galaxy buildout (superset of the alpha D2 scaffold).

## Engines / surface (canonical counts in the brain)

Per the master-index back-pointer: **355 engines, `prism_business` 879 actions**, financial-invariant + PII discipline. Known P0 anomaly (per the hotel galaxy card): `BusinessSyncEngine.ts` is a 320-byte stub — implement or formally archive per [[feedback_never_delete_only_disable]].

## Tribal injection (wiring gap, 2026-06-01)

The tribal corpus has **1,569 business tips** in `state/shared/tribal-embed-index.json`, but `tribal-by-domain-inject.mjs` `DOMAIN_MAP` lacks a `business` domain, so they never route on a business/ERP/quote prompt. Fix queued: [[reference_tribal_domain_map_gap_2026_06_01]] + patch-sibling `state/shared/dashboards/patches/HOOK-PATCH-TRIBAL-DOMAIN-MAP-EXPAND.md`.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/business/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- [[galaxy-context-federation]] — business is a federation spoke; rolls up to the master brain
- [[feedback_psn_definition]] — hotel is the business brain on the PSN engine axis

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the hotel galaxy card + master-index back-pointer. Domain owner (hotel) refines._
