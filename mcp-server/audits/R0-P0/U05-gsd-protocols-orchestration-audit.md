# R0-P0-U05: GSD + Protocols + Orchestration Audit

**Date:** 2026-02-24
**Status:** COMPLETE
**Auditor:** R4 Scrutinizer (Opus)

---

## 1. GSD_QUICK.md Audit

**File:** `data/docs/gsd/GSD_QUICK.md` (130 lines, v22.0)

### 1.1 Header Counts

| Claim (Line 2) | Actual | Match |
|-----------------|--------|-------|
| 32 dispatchers | 32 | MATCH |
| 382+ verified actions | 541 (U03) | STALE (32% under) |
| 40+ cadence auto-functions | Unverified | PENDING |
| 73 engines | 73 (+index) | MATCH |
| 27+9 hooks | 59-112 (U04) | UNCLEAR methodology |

### 1.2 Decision Tree Action Count Verification

| Dispatcher | GSD Claims | U03 Actual | Delta |
|------------|------------|------------|-------|
| prism_calc | 21 | 91 | **-70** (4.3x undercount) |
| prism_safety | 29 | ~29 | OK |
| prism_data | 14 | 21 | **-7** |
| prism_thread | 12 | 12 | OK |
| prism_toolpath | 8 | 8 | OK |
| prism_session | 30 | 31 | -1 |
| prism_context | 18 | 22 | **-4** |
| prism_doc | 7 | 7 | OK |
| prism_skill_script | 23 | 27 | **-4** |
| prism_hook | 18 | 20 | -2 |
| prism_validate | 7 | 7 | OK |
| prism_omega | 5 | 5 | OK |
| prism_ralph | 3 | 3 | OK |
| prism_orchestrate | 14 | 14 | OK |
| prism_atcs | 10 | 12 | -2 |
| prism_autonomous | 8 | 8 | OK |
| prism_telemetry | 7 | 7 | OK |
| prism_pfp | 6 | 6 | OK |
| prism_memory | 6 | 6 | OK |
| prism_gsd | 6 | 6 | OK |
| prism_dev | 9 | 9 | OK |
| prism_sp | 19 | 19 | OK |
| prism_generator | 6 | 6 | OK |
| prism_manus | 11 | 11 | OK |
| prism_knowledge | 5 | 5 | OK |
| prism_guard | 14 | 14 (as prism_ralph_loop) | NAME MISMATCH |
| prism_autopilot_d | 8 | 8 | OK |
| prism_nl_hook | 8 | 8 | OK |
| prism_compliance | 8 | 8 | OK |
| prism_tenant | 15 | 15 | OK |
| prism_bridge | 13 | 13 | OK |
| prism_intelligence | NOT LISTED | 238 | **MISSING** |

**Key Finding:** prism_intelligence (238 actions, 44% of total) is completely absent from the Decision Tree. This is the single largest dispatcher and it's invisible in GSD.

### 1.3 Changelog Drift

Last changelog entry (v22.1, 2026-02-17) still references "31 dispatchers, 368 actions, 37 engines" from v22.0 entry. The v22.0 header was later updated to "32 dispatchers, 382+ actions, 73 engines" but changelog wasn't corrected.

---

## 2. DEV_PROTOCOL.md Audit

**File:** `data/docs/gsd/DEV_PROTOCOL.md` (175 lines, v7.0)

- References "npm run build (esbuild, NEVER tsc)" — consistent with U01 finding
- References Desktop Commander as fallback — may be stale (DC is an MCP tool from a specific environment)
- Protocol structure is sound: approach routing by complexity, anti-regression rules, build protocol
- **No critical issues found**

---

## 3. GSD Section Files Audit

**Directory:** `data/docs/gsd/sections/` (14 files)

| File | Purpose |
|------|---------|
| buffer.md | Buffer zone advisory |
| d1.md | Diagnostic level 1 |
| d2.md | Diagnostic level 2 |
| d3.md | Diagnostic level 3 |
| d4.md | Diagnostic level 4 |
| end.md | Session end protocol |
| equation.md | Key equations |
| evidence.md | Evidence levels |
| gates.md | Quality gates |
| laws.md | 6 Hard Laws |
| manus.md | Manus integration |
| start.md | Session start protocol |
| tools.md | Tool reference |
| workflow.md | Workflow protocol |

14 section files present. Content verification deferred to individual section relevance.

---

## 4. Orchestration Files Audit

**Directory:** `src/orchestration/` (3 files, 1,815 LOC)

| File | LOC | Purpose |
|------|-----|---------|
| AutoPilot.ts | 796 | Primary orchestration engine |
| AutoPilotV2.ts | 397 | V2 orchestration |
| HookEngine.ts | 622 | Orchestration-level hook engine |

### 4.1 AutoPilot Integration
- GSD_QUICK.md references AutoPilot through `prism_autopilot_d` dispatcher
- Complexity routing defined: SIMPLE/MEDIUM/COMPLEX/MULTI-SESSION/PARALLEL
- AutoPilot loads GSD protocol, current state, brainstorms, executes, validates

### 4.2 Orchestration Wiring
- `orchestrationDispatcher.ts` (14 actions) wires to `AgentExecutor.ts` and `SwarmExecutor.ts`
- `autoPilotDispatcher.ts` (8 actions) wires to `AutoPilot.ts` and `AutoPilotV2.ts`
- All orchestration engines are barrel-exported (U03 verified)

---

## 5. Findings

### CRITICAL

| ID | Finding | Details |
|----|---------|---------|
| U05-C01 | prism_intelligence missing from GSD Decision Tree | 238-action dispatcher (44% of all actions) invisible in GSD. Anyone following GSD has no guidance on when/how to use it. |

### HIGH

| ID | Finding | Details |
|----|---------|---------|
| U05-H01 | GSD action counts stale | Header says 382+, actual is 541. Multiple Decision Tree entries undercount (prism_calc: 21 vs 91, prism_data: 14 vs 21, prism_context: 18 vs 22). |
| U05-H02 | prism_guard name mismatch | GSD says `prism_guard` but actual tool name is `prism_ralph_loop`. References to prism_guard will fail. |

### MEDIUM

| ID | Finding | Details |
|----|---------|---------|
| U05-M01 | GSD changelog drift | Changelog entries reference old counts that were updated in header but not in changelog history. |

### LOW

| ID | Finding | Details |
|----|---------|---------|
| U05-L01 | DEV_PROTOCOL references Desktop Commander | DC is environment-specific and may not be available. |

### INFO

| ID | Finding | Details |
|----|---------|---------|
| U05-I01 | 14 GSD section files present | Expected structure intact. |
| U05-I02 | Orchestration fully wired | AutoPilot, V2, HookEngine all barrel-exported and dispatcher-connected. |
| U05-I03 | Dev Protocol v7.0 is structurally sound | Approach routing, anti-regression, build protocol all reasonable. |
