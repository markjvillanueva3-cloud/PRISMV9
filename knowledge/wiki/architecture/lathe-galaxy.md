---
title: Lathe Galaxy — Architecture Map
type: architecture
domain: lathe
slot: whiskey
maintainer: whiskey
seeded_by: alpha
created: 2026-06-01
tags: [lathe, turning, css, chuck-jaw, lathe-wizard, galaxy, whiskey]
---

# Lathe Galaxy — Architecture Map

The lathe galaxy (owned by **slot:whiskey**) is the **Lathe Wizard** — physics-first turning intelligence with safety at its core (G50 max-RPM / CSS, chuck-jaw clamping limits). Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/lathe/MEMORY.md` · doctrine: `mcp-server/src/engines/lathe/CLAUDE.md`

## Position in the pipeline

```
CAD (delta) ─► CAM lathe strategy (kilo/echo pick) ─► lathe physics + safety (whiskey) ─► turning post (echo)
                            │                                  │
         feed/speed (oscar) ┘                                  └─ G50/CSS · chuck-jaw · self-improving AI → india substrate
```

Lathe ↔ mill (mill-turn: `Fusion360MillTurnBridgeEngine`, `HyperMillMillTurnBridge`). The lathe self-improving AI wires to the india training substrate (per the fleet "domains own their AI training" rule).

## Engines / surface (canonical counts in the brain)

Per the master-index back-pointer: **~238 engines + `turningDispatcher`** (+5 DB actions wired). Soul designation (physics-first, 5 refuses, lathe domain_filter): [[reference_whiskey_lathe_soul_designation_2026_05_27]]. Physics + safety constants import ONLY from `mcp-server/src/physics/constants.ts` — never inline.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/lathe/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- [[galaxy-context-federation]] — lathe is a federation spoke; rolls up to the master brain
- [[feedback_domains_own_ai_training_systems]] — whiskey owns the lathe self-improving AI (cloned from india)
- [[feedback_psn_definition]] — whiskey is the lathe brain on the PSN engine axis

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the whiskey galaxy card + master-index back-pointer. Domain owner (whiskey) refines._
