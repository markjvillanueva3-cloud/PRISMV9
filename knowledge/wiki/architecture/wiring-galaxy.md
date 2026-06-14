---
title: Wiring Galaxy — Architecture Map
type: architecture
domain: wiring
slot: romeo
maintainer: romeo
seeded_by: alpha
created: 2026-06-01
tags: [wiring, engine-dispatcher, closure, audit, galaxy, romeo]
---

# Wiring Galaxy — Architecture Map

The wiring galaxy (owned by **slot:romeo**) drives engine→dispatcher wiring closure — turning on-disk engines into invokable dispatcher actions. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified content lives here, NOT hand-copied): `mcp-server/src/engines/wiring/MEMORY.md` · doctrine: `mcp-server/src/engines/wiring/CLAUDE.md`

## Role

Table-driven `ACTION_MAP` is canonical — `audit-unwired-engines.mjs` reads each dispatcher's action enum directly (don't reinvent the scanner; consume its JSON). Wiring batch cap = 5 engines per commit (keeps the 3-of-3 scrutiny gate tractable). Round-trip tests live in `mcp-server/src/__tests__/` (NOT `src/engines/__tests__/` — `stop_on_unwired_assets` only scans the former).

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/wiring/{CLAUDE,MEMORY}.md`
- [[galaxy-context-federation]] — wiring is a federation spoke; rolls up to the master brain
- [[feedback_psn_definition]] — romeo is the wiring brain on the PSN engine axis

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the romeo galaxy card + master-index back-pointer. Domain owner (romeo) refines._
