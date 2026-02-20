# PRISM Priority Roadmap
> Last Updated: 2026-02-15 (Session 60)
> Status: ACTIVE

## COMPLETED

### P0: Full System Activation — DONE (2026-02-14)
- 31/31 dispatchers verified live, 126 skills, 62 hooks, Ω=0.77
- Build: clean 3.9MB, 35/35 tests pass
- Opus 4.6 config wired, security foundation applied
- 3 of 4 P0 critical findings fixed (alarm_decode, safety validator, compliance)

### R1-MS0: Registry Audit + P0 Fixes — DONE (2026-02-14)
- Dispatcher fixes deployed and verified
- Thread coarse notation limitation documented (low priority)

### Material Expansion — DONE (2026-02-14)
- 532 → 3,430 materials at 100% parameter fill (127 params each)
- All 7 ISO groups + X_SPECIALTY: P=1356, X=655, M=496, N=476, H=324, S=87, K=36
- Composites, plastics, ceramics, armor, tool steel HRC variations
- Validated via prism_calc cutting_force + tool_life

### P0-003: Formulas Registry — DONE (500 loaded)
### P0-002: Machines Registry — DONE (402 loaded, 48.8% of 824 target)
### Session 44-45: Automation Layer — DONE (15 enhancements)

## Tier 1 — Active (R1 Phase)

### 1. R1-MS1: Material Loading Gap Fix
- **Why**: 3,430 materials on disk but only 2,942 loading (488 gap = 14.2% missing)
- **Effort**: ~1 session. Diagnose loader, fix path/parsing issues.
- **Status**: NEXT UP

### 2. R1-MS2: Machine/Tool/Alarm Dual-Path Resolution
- **Why**: Tools (1,944) and alarms (10,033) exist in knowledge engine but NOT in their
  respective registry files. Machines at 48.8%. Same dual-path problem that caused
  the original material registry issues.
- **Effort**: ~1-2 sessions. Align knowledge engine data with registry files OR
  wire registries to read from knowledge engine directly.
- **Status**: BLOCKED BY R1-MS1

### 3. R1-MS3: Pipeline Integration
- **Why**: End-to-end data flow from state files → registries → dispatchers must work.
- **Effort**: ~1 session. Wire + verify.
- **Status**: BLOCKED BY R1-MS2

### 4. R2: Safety Test Matrix
- **Why**: 50-calc test matrix + AI edge cases. Validates all calculations against
  loaded registry data. Can't run until registries are correctly populated.
- **Effort**: ~1 session (per roadmap estimate).
- **Status**: BLOCKED BY R1 COMPLETE

## Tier 2 — Architectural

### 5. P2-001: Append-Only State
- **Why**: Compaction still loses work. Immutable event log + replay = never lose progress.
- **Effort**: ~2 sessions.

### 6. P0-001: Hook Bridge (Python ↔ TypeScript)
- **Why**: 462 Python scripts can't be triggered by TS hooks.
- **Effort**: ~1 session.

### 7. D1: Wire Everything
- Script registration, hook activation, skill auto-loading.
- Depends on registry loading being stable first.

## Tier 3 — Future Phases

### 8. R3: Data Campaigns (stub — expand at R3 start)
### 9. R4: Enterprise Foundation (stub — expand at R4 start)
### 10. R5: Visual Platform (stub — expand at R5 start)
### 11. R6: Production Hardening (stub — expand at R6 start, requires R3+R4+R5)

## Tier 4 — Defer
- Obsidian integration, Excel tools, session cleanup — lowest priority
- Context compression (partially solved by autoContextCompress + pullBack)
- ILP Combination Engine — optimization, not critical path
- Tool Masking — safety improvement, not blocking
