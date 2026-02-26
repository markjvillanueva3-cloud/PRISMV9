# R0-P0-U07: Master Index + State Directory Audit

**Date:** 2026-02-24
**Status:** COMPLETE
**Auditor:** R4 Scrutinizer (Sonnet)

---

## 1. MASTER_INDEX.md Audit

**File:** `data/docs/MASTER_INDEX.md` (369 lines)
**Last updated:** 2026-02-22

### 1.1 Dispatcher Section (Section 1)

- Claims "32 dispatchers, 382+ verified actions"
- Lists 31 dispatchers explicitly (lines 8-100)
- **prism_intelligence is completely absent** — this 238-action dispatcher is not listed anywhere
- Summing listed actions: ~382 (matches claim but excludes prism_intelligence)
- **Actual total with prism_intelligence: 541 actions** (from U03)

### 1.2 Engine Section (Section 4, Line 235)

- Header says "37 files"
- Lists 33 engines + index.ts = 34 entries
- **Actual: 74 .ts files in src/engines/**
- **40 engines missing from MASTER_INDEX** (the entire R3-R11 expansion is unindexed)

### 1.3 Summary Section (Section 14, Lines 346-358)

| Metric | MASTER_INDEX | Actual | Issue |
|--------|--------------|--------|-------|
| Dispatchers | 32 | 32 | OK |
| Actions | 382+ | 541 | Undercount by 159 |
| Engines (header) | 37 | 74 | WRONG |
| Engines (summary) | 73 | 74 | Close but off-by-1 |
| Registries | 9 | 14 | Undercount by 5 |
| Skills | 230 | 61 (SkillRegistry) | 3.8x inflation |
| Tests | 73/74 | 74/74 | Stale (all pass now) |
| Build size | Two values: 5.6MB AND ~3.9MB | 5.1MB | Contradictory |

### 1.4 Registry Section (Section 5)

Lists 19 files but includes duplicate entries:
- `AlarmRegistry.ts` AND `alarm-registry.ts` (2 files, same purpose)
- `MachineRegistry.ts` AND `machine-registry.ts`
- `MaterialRegistry.ts` AND `material-registry.ts`
- `ToolRegistry.ts` AND `tool-registry.ts`

These appear to be old (kebab-case) and new (PascalCase) versions. Need to verify which are active.

---

## 2. CURRENT_STATE.json Audit

**File:** `C:\PRISM\state\CURRENT_STATE.json`
**Version:** 25.0.0
**Last updated:** 2026-02-24T13:48:20

### 2.1 System Counts Verification

| Metric | CURRENT_STATE | Actual | Severity |
|--------|---------------|--------|----------|
| dispatchers | 33 | 32 | MEDIUM (off by 1) |
| actions | "388+" | 541 | HIGH (28% under) |
| engines | 76 | 74 | MEDIUM (off by 2) |
| registries | 9 | 14 | HIGH (36% under) |
| skills | 231 | 61 | CRITICAL (3.8x inflation) |
| skillBundles | 9 | Unverified | - |
| nlHooks | 9 | Unverified | - |
| builtInHooks | 27 | 59-112 | HIGH |
| cadenceFunctions | 40 | Unverified | - |
| build_size | "6.3MB" | 5.1MB | MEDIUM |
| tests_vitest | "74/74" | 74/74 | OK |
| tests_standalone | "53 files (~3900+ tests)" | Unverified | - |

### 2.2 Phase History
All phases P0 through R32 + REORG listed as COMPLETE. This is historical context, not currently verifiable.

### 2.3 Audit Section
References `state/GAP_ANALYSIS_REPORT.md` for full audit findings from 2026-02-23 reorganization.

---

## 3. State Directory Audit

### 3.1 C:\PRISM\state\ (Root State, 162 files)

Key files present:
- ACTION_TRACKER.md, CURRENT_STATE.json, CURRENT_POSITION.md
- ERROR_LOG.jsonl, DECISION_LOG.jsonl, SESSION_JOURNAL.jsonl
- COMPACTION_SURVIVAL.json, HOT_RESUME.md, RECENT_ACTIONS.json
- context_pressure.json, SESSION_MEMORY.json
- Checkpoint files, learning logs, various audit/analysis reports
- EXTERNAL_RESULTS/, SNAPSHOTS/, memory/ subdirectories

### 3.2 C:\PRISM\mcp-server\state\ (MCP Server State, 13 items)

- RALPH_AUDIT.md, SKILL_AUDIT.md
- bridge/, certificates/, compliance/, logs/ — feature state directories
- memory_graph/ — F2 graph data (nodes, edges, index, WAL)
- nl_hooks/ — F6 NL hook state
- telemetry/ — F3 telemetry data
- tenants/, test-tenants/, test-residency/ — F5 multi-tenant state
- results/ — computation results

### 3.3 Split State Problem
State is split across TWO locations:
1. `C:\PRISM\state/` — 162 files, session/runtime state
2. `C:\PRISM\mcp-server/state/` — 13 items, feature/persistent state

No clear documentation on which state goes where. Some files reference one location, some the other.

---

## 4. Findings

### CRITICAL

| ID | Finding | Details |
|----|---------|---------|
| U07-C01 | prism_intelligence (238 actions) absent from MASTER_INDEX | The largest dispatcher is completely unindexed. Anyone relying on MASTER_INDEX is blind to 44% of all actions. |
| U07-C02 | MASTER_INDEX engine section lists 37, actual is 74 | 40 engines missing from the index — the entire R3-R11 engine expansion is undocumented. |

### HIGH

| ID | Finding | Details |
|----|---------|---------|
| U07-H01 | CURRENT_STATE.json skill count 231 vs 61 actual | Systemic inflation in state file, consistent with U04 findings. |
| U07-H02 | Multiple sources have different action counts | MASTER_INDEX=382+, CURRENT_STATE="388+", GSD=382+, Actual=541. No single source of truth. |
| U07-H03 | CURRENT_STATE.json hook count 27 vs 59-112 actual | builtInHooks=27 doesn't match any actual measurement. |

### MEDIUM

| ID | Finding | Details |
|----|---------|---------|
| U07-M01 | Split state directory undocumented | State files in two locations with no clear separation policy. |
| U07-M02 | MASTER_INDEX summary has contradictory build sizes | Claims both "5.6MB" and "~3.9MB" in the same section. Actual: 5.1MB. |
| U07-M03 | Duplicate registry files (PascalCase + kebab-case) | 4 registries appear to have both old and new naming conventions. |
| U07-M04 | CURRENT_STATE.json dispatchers=33 vs 32 actual | Off by 1. May include a removed/renamed dispatcher. |

### LOW

| ID | Finding | Details |
|----|---------|---------|
| U07-L01 | MASTER_INDEX test count 73/74 stale | All 74 tests now pass (U01 verified). |

### INFO

| ID | Finding | Details |
|----|---------|---------|
| U07-I01 | State directory has 162+ files | Large but organized. Historical audit/analysis files present. |
| U07-I02 | Feature state directories organized | bridge/, certificates/, compliance/, nl_hooks/, telemetry/, tenants/ properly separated. |
