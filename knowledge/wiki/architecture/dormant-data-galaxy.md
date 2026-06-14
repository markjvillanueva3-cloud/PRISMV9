---
title: Dormant-Data Galaxy — Architecture Map
type: architecture
domain: dormant-data
slot: victor
maintainer: victor
seeded_by: alpha
created: 2026-06-01
tags: [dormant-data, orphan-data, ledger, anti-reextract, galaxy, victor]
---

# Dormant-Data Galaxy — Architecture Map

The dormant-data galaxy (owned by **slot:victor**) maintains the dormant / orphan-data ledger — data assets that exist but aren't yet wired or consumed. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified content lives here, NOT hand-copied): `mcp-server/src/engines/dormant-data/MEMORY.md` · doctrine: `mcp-server/src/engines/dormant-data/CLAUDE.md`

## Role

`mustNotReExtract` THROWS — every routing checks `extraction-log.json` first (re-extraction wastes Anthropic spend + collides with prior wirings). Ledger `state/shared/dormant-data-ledger.jsonl` is append-only: never rewrite/delete; status mutations land as new lines with a `prior_sha` pointer. Tribal tips route by SLOT AFFINITY, not pure keyword.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/dormant-data/{CLAUDE,MEMORY}.md`
- [[galaxy-context-federation]] — dormant-data is a federation spoke; rolls up to the master brain
- [[feedback_psn_definition]] — victor is the dormant-data brain on the PSN engine axis

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the victor galaxy card + master-index back-pointer. Domain owner (victor) refines._
