---
title: WEDM Galaxy — Architecture Map
type: architecture
domain: wedm
slot: mike
maintainer: mike
seeded_by: alpha
created: 2026-06-01
tags: [wedm, wire-edm, discharge, dielectric, multi-pass, wire-wizard, galaxy, mike]
---

# WEDM Galaxy — Architecture Map

The WEDM galaxy (owned by **slot:mike**) is the **Wire Wizard** — PRISM's deepest single domain. Wire-EDM discharge physics, dielectric/flushing, recast control, wire-break prediction, taper + multi-pass/skim-pass strategy. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/wedm/MEMORY.md` · doctrine: `mcp-server/src/engines/wedm/CLAUDE.md`

## Position in the pipeline

```
CAD/print  ─►  CAM (kilo) / direct  ─►  WEDM physics + strategy (mike)  ─►  wedm post (echo dialects)
                                              │
                                              └─ discharge / dielectric / flushing / recast / multi-pass
```

WEDM is largely self-contained (its own strategy + post dialects). Filename heuristic: `wedm, edm, wire-edm, sinker, discharge, dielectric, flushing, recast, wire-break, wire-tension, taper-cut, no-core, multi-pass, skim-pass, micro-edm`.

## Engines / surface (canonical counts in the brain)

Per the WEDM-AGI status (root CLAUDE.md §WEDM AGI): **62 engines + 101 tests + 23 skills + 14 formulas + 46 tribal tips + 5 controller dialects + 5 MIT courses + 26 indexed JM Die programs** (SVI ψ 0.875; regenerate via `wedm_generate_digest.ts`). Full domain atlas (backend + knowledge nodes + archive paths + posts): [[reference_wire_domain_atlas_for_mike_2026_05_27]]. 15 cited discharge gotchas live in the brain.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/wedm/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- Status detail: `knowledge/wiki/architecture/wedm-status.md`
- [[galaxy-context-federation]] — wedm is a federation spoke; rolls up to the master brain
- [[feedback_psn_definition]] — mike is the WEDM brain on the PSN engine + formula axes

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the mike galaxy card + master-index back-pointer + root CLAUDE.md §WEDM AGI. Domain owner (mike) refines._
