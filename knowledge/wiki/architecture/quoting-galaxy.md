---
title: Quoting Galaxy — Architecture Map
type: architecture
domain: quoting
slot: charlie
maintainer: charlie
seeded_by: alpha
created: 2026-06-01
tags: [quoting, quote, pricing, cost-estimation, docustrata, galaxy, charlie]
---

# Quoting Galaxy — Architecture Map

The quoting galaxy (owned by **slot:charlie**) turns a print/order into a price: print-to-quote, multi-process quote routing, quote-vs-actual reconciliation, and DocuStrata pricing. It feeds the business order flow. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/quoting/MEMORY.md` · doctrine: `mcp-server/src/engines/quoting/CLAUDE.md`

## Position in the pipeline

```
CAD/print (delta/xray) ─► quoting (charlie: cost + margin + multi-process) ─► business order (hotel)
                                  │
                                  └─ quote-vs-actual reconciliation ◄─ shop-floor + ERP actuals
```

Quoting consumes geometry/features from CAD and historicals from business/shop-floor; it produces the quote that seeds the order. ~78 cost/quote engines (per the charlie galaxy card); QUOTING-SYNERGY-MS0 iters 9–59 history.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/quoting/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- [[galaxy-context-federation]] — quoting is a federation spoke; rolls up to the master brain
- [[feedback_psn_definition]] — charlie is the quoting brain on the PSN engine axis

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the charlie galaxy card + master-index back-pointer. Domain owner (charlie) refines._
