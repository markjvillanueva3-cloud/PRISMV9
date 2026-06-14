---
title: Backend-Helper Galaxy — Architecture Map
type: architecture
domain: backend-helper
slot: papa
maintainer: papa
seeded_by: alpha
created: 2026-06-01
tags: [backend-helper, build, tsc, infra, galaxy, papa]
---

# Backend-Helper Galaxy — Architecture Map

The backend-helper galaxy (owned by **slot:papa**) provides build / TSC assist and backend-infra support to every slot. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified content lives here, NOT hand-copied): `mcp-server/src/engines/backend-helper/MEMORY.md` · doctrine: `mcp-server/src/engines/backend-helper/CLAUDE.md`

## Role

Wire-it-as-you-build-it: every new engine ships real tests (algebraic invariants, not stubs) + dispatcher wiring (z.enum + schema + action case) + round-trip E2E. Build-state honesty: `BUILD_STATE.json` "wired" requires actual dispatcher invocation in a test, not just disk presence. Cross-cuts every domain galaxy.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/backend-helper/{CLAUDE,MEMORY}.md`
- [[galaxy-context-federation]] — backend-helper is a federation spoke; rolls up to the master brain
- [[feedback_psn_definition]] — papa is the backend-helper brain on the PSN engine axis

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the papa galaxy card + master-index back-pointer. Domain owner (papa) refines._
