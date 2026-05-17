---
title: JULIETT-12CHAT-ALLOCATION-MS0
type: architecture
status: in-progress
shipped: 2026-05-17
owner_slot: juliett
related:
  - rgs-tool-autoinvoke-ms0
  - rgs-tool-autoinvoke-ms1
  - per-slot-claim-ms0
  - session-continuity-stack
  - slot-worktree-architecture
---

# JULIETT-12CHAT-ALLOCATION-MS0

12-chat ROI allocation milestone shipped 2026-05-17 by juliett. Three sister artifacts:

1. **V1 allocation file** — `state/shared/specs/JULIETT-12CHAT-ROI-ALLOCATION-2026-05-17.md` (5-wave ordering, per-slot assignment matrix, 11-system CLEAR-NOT-COMPACT bypass map)
2. **Synergy map** — `state/shared/specs/JULIETT-DEVTOOLS-SYNERGY-MAP-2026-05-17.md` (10 synergy units + 5 silent-degrade fixes)
3. **Per-unit specs** — `state/shared/specs/UNITS/<unit_id>.md` (5 hand-bootstrapped; 20 more pending U-UNIT-SPEC-GENERATOR)

## Goal

Coordinate up-to-13-chat fleet (alpha..mike work slots + golf hygiene) on the highest-ROI backend-dev work, with each unit /clear-pickup-ready via on-disk state (no conversational memory required).

## Key architectural choices

### CLEAR-NOT-COMPACT doctrine
Prefer `/clear` over `/compact` for maximum token headroom. Every unit's state lives in:
- per-agent handoff RESUME directive
- per-unit spec (`state/shared/specs/UNITS/`)
- Obsidian memory (`C:/Users/wompu/.claude/projects/H--PRISM/memory/`)
- /system-viz graph queries
- master-index + awareness inject
- chat-bus + slot-task-claim + chat-slots
- RGS tool-plan sidecar

11 bypass systems documented in V1 §1 enable a fresh chat to pick up a unit cold after /clear.

### PATCH-SIBLING convention
When a target doc surface (CLAUDE.md, MEMORY.md, Obsidian memory file) is peer-locked, write a PATCH sibling under `state/shared/dashboards/patches/` for the next owner to splice. Documented as a sibling discipline; S6 synergy unit U-DOC-REFLECTION-GATE-WITH-PATCH-SIBLINGS elevates this to a fleet-wide auto-firing Stop hook.

### Hand-bootstrap to unblock CLEAR
S10 finding: `state/shared/specs/UNITS/` dir did not exist before this milestone. Hand-wrote 5 highest-priority W0+W1 unit specs to make CLEAR-pickup functional immediately without waiting on the generator unit.

## 10 synergy units (one per S1-S10 agent)

| ID | Owner | Cost | Effect |
|----|-------|------|--------|
| U-HOOK-SYNERGY-CONSOLIDATION (S1) | kilo | M | 3 inject hooks → 1; fix error-learn chain; dedupe 10 wirings |
| U-SKILL-CHAIN-MANIFEST (S2) | bravo+foxtrot | M | `tool_chain` frontmatter on all 184 skills; RGS ingestion |
| U-PREBUILD-GATE-COMPOSITE (S3) | alpha | M | 8 hooks → 1 with shared ctx; 8× spawn reduction |
| U-TELEMETRY-ROLLUP-DASHBOARD (S4) | foxtrot | M | 10-stream rolled dashboard + slot health badge |
| U-VAULT-UNIFIED-QUERY (S5) | delta | M | 4 inject hooks → 1; fixes 200MB→512MB silent degrade |
| U-DOC-REFLECTION-GATE-WITH-PATCH-SIBLINGS (S6) | echo | M | Stop hook auto-writes patch siblings on peer-lock |
| U-OWNERSHIP-UNIFIED-LIB (S7) | charlie | L | 4 ownership systems → 1 API front door |
| U-CLEAR-BYPASS-COMPOSITE (S8) | alpha | M | SessionStart `clear` matcher → fanout 12 surfaces |
| U-RGS-NEXT-INTEGRATE (S9) | lima | M | RGS plans gain perUnitSpec + prerequisites + blocks |
| U-UNIT-SPEC-GENERATOR (S10) | juliett | M | Auto-generates 25 per-unit specs from V1 allocation |

## 5 silent-degradation fixes (synergy F1-F5)

Pre-synergy 1-line fixes that defeat the synergy units' value if left unfixed:

- **F1**: `master-index-search-lib` 200MB cap silently fails on 331MB graph
- **F2**: `session-start-auto-resume` accepts `clear` source in code but settings.json wires only `compact`
- **F3**: `error-pattern-capture` 0-fire (broken matcher) → entire 3-stage error-learn loop dead
- **F4**: 10 duplicate hook wirings (`stress-harness-emit` ×4, etc.) — C:/H: settings.json merge drift
- **F5**: `state/shared/specs/UNITS/` dir didn't exist — fixed this milestone

## References

- V1 allocation: `state/shared/specs/JULIETT-12CHAT-ROI-ALLOCATION-2026-05-17.md`
- Synergy map: `state/shared/specs/JULIETT-DEVTOOLS-SYNERGY-MAP-2026-05-17.md`
- V2.1 deltas (iter-2 scrutiny): `state/shared/specs/JULIETT-PLAN-V2.1-SCRUTINY-DELTAS-2026-05-17.md`
- Sister wikis: `rgs-tool-autoinvoke-ms0.md`, `per-slot-claim-ms0.md`, `session-continuity-stack.md`, `slot-worktree-architecture.md`
- Memory: [[reference_juliett_12chat_allocation_2026_05_17]] (pending splice via OBSIDIAN-MEMORY-PATCH)
