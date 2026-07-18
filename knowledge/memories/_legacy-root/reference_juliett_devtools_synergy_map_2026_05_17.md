---
name: reference-juliett-devtools-synergy-map-2026-05-17
description: 10 synergy units + 5 silent-degrade fixes from iter-3 SYNERGY swarm — composes V1 allocation into integrated devtools stack
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.477Z
aliases: reference_juliett_devtools_synergy_map_2026_05_17
---


# JULIETT devtools synergy map (2026-05-17, juliett iter-3 + iter-3.5)

10-agent SYNERGY swarm (S1-S10) + 5-agent FAN-OUT (T1-T5) → `state/shared/specs/JULIETT-DEVTOOLS-SYNERGY-MAP-2026-05-17.md` + `state/shared/specs/JULIETT-FAN-OUT-T1-T5-ADDENDUM-2026-05-17.md`. Sister to V1 allocation (which named units; this names INTEGRATION between units).

## 15 units shipped across iter-3 + iter-3.5
| ID | Owner | Cost | Effect |
|---|---|---|---|
| U-HOOK-SYNERGY-CONSOLIDATION (S1) | kilo | M | 3 inject hooks → 1; fix error-learn chain |
| U-SKILL-CHAIN-MANIFEST (S2) | bravo+foxtrot | M | `tool_chain` frontmatter on 184 skills |
| U-PREBUILD-GATE-COMPOSITE (S3) | alpha | M | 8 hooks → 1 with shared ctx |
| U-TELEMETRY-ROLLUP-DASHBOARD (S4) | foxtrot | M | 10-stream rolled dashboard |
| U-VAULT-UNIFIED-QUERY (S5) | delta | M | 4 inject hooks → 1; fixes 200MB→512MB silent degrade |
| U-DOC-REFLECTION-GATE-WITH-PATCH-SIBLINGS (S6) | echo | M | Stop hook auto-writes patch siblings on peer-lock |
| U-OWNERSHIP-UNIFIED-LIB (S7) | charlie | L | 4 ownership systems → 1 API |
| U-CLEAR-BYPASS-COMPOSITE (S8) | alpha | M | SessionStart `clear` fanout |
| U-RGS-NEXT-INTEGRATE (S9) | lima | M | RGS gains perUnitSpec + prerequisites + blocks |
| U-UNIT-SPEC-GENERATOR (S10) | juliett | M | Auto-generate 25 specs from V1 |
| U-SCHEDULED-TASK-AUDIT (T1) | golf | S | Disable 3 obsolete reapers (PID-race risk) |
| U-CLOSE-OUT-TRIAGE-CAMP (T2) | foxtrot/hotel | S | 3 CAMP verified all operator-deferred |
| U-DOCKER-FREE-FALLBACK (T3) | bravo | M | Docker wedged → master-index BM25-only fleet-wide |
| U-WIRE-OLLAMA-AGGREGATOR-2 (T4) | bravo | S | Wire context-aggregator NOT bundle-7 |
| U-SVU-P1-LOADGRAPH-CACHE + U-SVU-CLASSIFIER-FIX (T5) | alpha | M+M | MS1 punchlist + classifier degeneracy |

## 5 silent-degrade fixes (apply BEFORE synergy units)
- **F1**: master-index-search-lib 200MB cap on 331MB graph → silent null returns fleet-wide
- **F2**: session-start-auto-resume `clear` matcher missing in settings.json (code is ready)
- **F3**: error-pattern-capture 0-fire → entire 3-stage error-learn chain dead
- **F4**: 10 duplicate hook wirings (stress-harness-emit ×4, etc.)
- **F5**: `state/shared/specs/UNITS/` dir didn't exist (fixed this milestone)

## Reconciliations with iter-2
- A6 "RGS plans:{}" → ACTUALLY 648 plans, 46% minimal-fallback (different root cause)
- A7 "classifier 100% null" → only L7 ghost; tier-3 IS populated; real problem is silent graph-load fail (S5 F1)

## PATCH-SIBLING convention codified
`state/shared/dashboards/patches/<SURFACE>-PATCH-<unit>.md` for peer-locked surfaces. U-DOC-REFLECTION-GATE-WITH-PATCH-SIBLINGS elevates to fleet-wide auto-firing.

Wiki: `knowledge/wiki/architecture/juliett-12chat-allocation-ms0.md`


## Related
[[skills/shared|/shared]] • [[skills/specs|/specs]] • [[skills/hotel|/hotel]] • [[skills/dashboards|/dashboards]] • [[skills/patches|/patches]] • [[skills/wiki|/wiki]] • [[skills/architecture|/architecture]] • [[skills/juliett-|/juliett-]]