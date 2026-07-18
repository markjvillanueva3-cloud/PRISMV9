---
title: Bug-Hunting Galaxy — Architecture Map
type: architecture
domain: bug-hunting
slot: uniform
maintainer: uniform
seeded_by: alpha
created: 2026-06-01
tags: [bug-hunting, silent-no-op, route-verify, r12, galaxy, uniform]
---

# Bug-Hunting Galaxy — Architecture Map

The bug-hunting galaxy (owned by **slot:uniform**) hunts silent no-ops + route-verification failures across the fleet. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified content lives here, NOT hand-copied): `mcp-server/src/engines/bug-hunting/MEMORY.md` · doctrine: `mcp-server/src/engines/bug-hunting/CLAUDE.md`

## Role

Repro must check the ACTUAL contract, not a proxy (per [[feedback_verify_actual_contract_not_proxy]]) — `JSON.parse`, not byte-length; PowerShell 5.1 codepage mangles non-ASCII stdout. CLAUDE.md `## Recent regressions` is the rolling bug memory (Boris back-flow) — uniform writes there for every found bug. Classic R12 fail-loud violation: engine returns `{ok:true, fallback:...}` on real failure → inject failing dep, assert `ok=false` or throw.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/bug-hunting/{CLAUDE,MEMORY}.md`
- [[galaxy-context-federation]] — bug-hunting is a federation spoke; rolls up to the master brain
- [[feedback_verify_actual_contract_not_proxy]] · [[feedback_psn_definition]]

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the uniform galaxy card + master-index back-pointer. Domain owner (uniform) refines._
