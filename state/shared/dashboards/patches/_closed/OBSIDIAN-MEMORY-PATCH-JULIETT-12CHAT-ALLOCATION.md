# OBSIDIAN-MEMORY-PATCH — JULIETT-12CHAT-ALLOCATION-MS0

> PATCH-SIBLING file for the next Obsidian memory editor to splice.
> Written by juliett (claude-de04081e) 2026-05-17 — memory/ namespace was peer-locked by claude-a61bbf34 during iter-3.
> Two new memory files to create when peer claim releases.

---

## File 1: `reference_juliett_12chat_allocation_2026_05_17.md`

```markdown
---
name: reference-juliett-12chat-allocation-2026-05-17
description: 12-chat ROI allocation V1 across alpha..mike; 5-wave ordering; CLEAR-NOT-COMPACT doctrine; per-unit specs convention
metadata:
  type: reference
---

# JULIETT 12-chat allocation (2026-05-17, juliett iter-2)

10-agent post-/compact ROI swarm (A1-A10) → V1 allocation `state/shared/specs/JULIETT-12CHAT-ROI-ALLOCATION-2026-05-17.md`. Distributes 17 units across 12 work slots in 5 waves:

- **W0**: U-WIRE-DOCTRINE-RESOLUTION (operator), U-RGS-RULE-BACKEND-DEV (lima), U-CLEAR-AUTO-RESUME (alpha)
- **W1**: U-MEMORY-COMPRESS-V2 + U-MEMORY-GROWTH-GATE (mike), U-ACTIVATE-BEFORE-BUILD-PRECHECK (alpha), U-PRECOMMIT-PATHSPEC-ONLY (echo)
- **W2**: U-AUTO-MEMORY-WRITE (bravo), U-NEW-TOOL-AUTO-WIRE (charlie), U-DOCTRINE-OBSOLESCENCE-SWEEP (delta) — settings.json serialize
- **W3**: U-GOLF-CRASH-FAILOVER (golf), U-CHECKIN-VAULT-INJECT (delta), U-SLOT-WORKTREE-FORCED-CUTOVER (charlie) — fleet-wide quiesce
- **W4**: 10 hand-picked backend-dev wirings (foxtrot/hotel/india/kilo/lima/mike): DLQ/OTel/Prometheus/ChaosDrill/LatencyBudget/Pact/DistLock/LSHDedup/EntropyTracker/OllamaContextFloor

**CLEAR-NOT-COMPACT doctrine** (new): prefer `/clear` over `/compact` for token headroom; 11 bypass systems documented. Per-unit specs at `state/shared/specs/UNITS/<unit_id>.md` make every unit /clear-pickup-ready.

**Cost downgrades discovered:** 5 of 8 V2.1 Stage-2 BLOCKERS are partially-shipped (V2 watchdog already shipped, alpha-guardian preserved, distill writer works except MEMORY.md index append, OBSOLESCENCE-CLEANUP-MS0 has A4/B1/B2/C1 shipped, vault inject can share search-lib).

See [[reference_juliett_devtools_synergy_map_2026_05_17]] for iter-3 synergy follow-up.

Wiki: `knowledge/wiki/architecture/juliett-12chat-allocation-ms0.md`
```

---

## File 2: `reference_juliett_devtools_synergy_map_2026_05_17.md`

```markdown
---
name: reference-juliett-devtools-synergy-map-2026-05-17
description: 10 synergy units + 5 silent-degrade fixes from iter-3 SYNERGY swarm — composes V1 allocation into integrated devtools stack
metadata:
  type: reference
---

# JULIETT devtools synergy map (2026-05-17, juliett iter-3)

10-agent SYNERGY swarm (S1-S10) → synergy map `state/shared/specs/JULIETT-DEVTOOLS-SYNERGY-MAP-2026-05-17.md`. Sister to V1 allocation (which named units; this names INTEGRATION between units).

## 10 synergy units
| ID | Owner | Cost | Effect |
|---|---|---|---|
| U-HOOK-SYNERGY-CONSOLIDATION | kilo | M | 3 inject hooks → 1; fix error-learn chain |
| U-SKILL-CHAIN-MANIFEST | bravo+foxtrot | M | `tool_chain` frontmatter on 184 skills |
| U-PREBUILD-GATE-COMPOSITE | alpha | M | 8 hooks → 1 with shared ctx |
| U-TELEMETRY-ROLLUP-DASHBOARD | foxtrot | M | 10-stream rolled dashboard |
| U-VAULT-UNIFIED-QUERY | delta | M | 4 inject hooks → 1; fixes 200MB→512MB silent degrade |
| U-DOC-REFLECTION-GATE-WITH-PATCH-SIBLINGS | echo | M | Stop hook auto-writes patch siblings on peer-lock |
| U-OWNERSHIP-UNIFIED-LIB | charlie | L | 4 ownership systems → 1 API |
| U-CLEAR-BYPASS-COMPOSITE | alpha | M | SessionStart `clear` fanout |
| U-RGS-NEXT-INTEGRATE | lima | M | RGS gains perUnitSpec + prerequisites + blocks |
| U-UNIT-SPEC-GENERATOR | juliett | M | Auto-generate 25 specs from V1 |

## 5 silent-degrade fixes (apply BEFORE synergy units)
- **F1**: master-index-search-lib 200MB cap on 331MB graph → silent null returns fleet-wide
- **F2**: session-start-auto-resume `clear` matcher wire missing (code ready, settings missing)
- **F3**: error-pattern-capture 0-fire → entire 3-stage error-learn chain dead
- **F4**: 10 duplicate hook wirings (stress-harness-emit ×4, etc.)
- **F5**: `state/shared/specs/UNITS/` dir didn't exist (fixed this milestone)

## Reconciliations with iter-2
- A6 "RGS plans:{}" → ACTUALLY 648 plans, 46% minimal-fallback (different root cause for U-RGS-RULE-BACKEND-DEV)
- A7 "classifier 100% null" → only L7 ghost; tier-3 IS populated; real problem is silent graph-load fail (S5 F1)

PATCH-SIBLING convention also documented this iter: `state/shared/dashboards/patches/<SURFACE>-PATCH-<unit>.md` for peer-locked surfaces. U-DOC-REFLECTION-GATE elevates to fleet-wide auto-firing.

Wiki: `knowledge/wiki/architecture/juliett-12chat-allocation-ms0.md`
```

---

## Splice instructions

1. Wait for `c:/Users/wompu/.claude/projects/H--PRISM/memory/` peer claims to release (currently claude-a61bbf34)
2. Create both files using the markdown blocks above (strip the wrapping ```markdown fences when writing)
3. Append the 2 index lines from MEMORY-INDEX-PATCH-JULIETT-12CHAT-ALLOCATION.md to MEMORY.md `## Indexed memories` section — **BUT ONLY AFTER U-MEMORY-COMPRESS-V2 ships** (MEMORY.md currently at 97.7% ceiling)
4. Delete this patch file from `state/shared/dashboards/patches/` once spliced
