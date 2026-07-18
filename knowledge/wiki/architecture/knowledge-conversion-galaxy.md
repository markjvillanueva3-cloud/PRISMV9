---
title: Knowledge-Conversion Galaxy — Architecture Map
type: architecture
domain: knowledge-conversion
slot: golf
maintainer: golf
seeded_by: alpha
created: 2026-06-01
tags: [knowledge-conversion, mit, monolith, router, advisory-ledger, galaxy]
---

# Knowledge-Conversion Galaxy — Architecture Map

The knowledge-conversion galaxy converts MIT-OCW + monolith sources into PRISM assets via a 6-node-type forge router. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified content lives here, NOT hand-copied): `mcp-server/src/engines/knowledge-conversion/MEMORY.md` · doctrine: `mcp-server/src/engines/knowledge-conversion/CLAUDE.md`

## Role

3-lane router (direct-wire / port-verify / 6-node forge-queue). Phase-0 audit: `scripts/audit-monolith-port-state.mjs` (advisory ledger). Round-trip test: `mcp-server/src/__tests__/knowledge-conversion-roundtrip.test.ts`. **NEVER auto-emit engines** — the router emits an ADVISORY ledger only (`advisoryOnly + mustHumanVerify`), never writes source. R12 fail-loud: validators throw on malformed input; unknown asset kinds DISCARD with audit-trail rationale, never silent-drop. See root CLAUDE.md §KNOWLEDGE-CONVERSION-MS0.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/knowledge-conversion/{CLAUDE,MEMORY}.md`
- [[galaxy-context-federation]] — knowledge-conversion is a federation spoke; rolls up to the master brain
- [[knowledge-conversion-ms0]] · [[feedback_psn_definition]]

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the knowledge-conversion galaxy card + master-index back-pointer. Domain owner refines._
