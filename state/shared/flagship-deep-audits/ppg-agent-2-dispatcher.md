# PPG Deep Audit — Agent 2: Dispatcher

## Executive Summary
PPG dispatcher wiring spans 4 primary dispatchers with 45+ P2P actions. Lathe pipeline shows orphaned duplication (`lathe_p2p_*` vs `turning_print_to_program`); mill/WEDM/multi-axis follow unified patterns. Schema coverage inconsistent.

## PPG Actions by Dispatcher

| Dispatcher | P2P Actions | Lazy Imports | Schema | Tests | Status |
|---|---|---|---|---|---|
| **prism_cam** | print_to_program_full (1) + lathe_p2p_* (45) | Yes (inline) | Partial | LatheP2PPipelineE2E | Mixed |
| **prism_mill** | mill_print_to_program (1) | Yes (lazy) | millActionSchemas | Minimal | Wired |
| **prism_turning** | turning_print_to_program (2) | Yes (lazy) | turningProgramActionSchemas | Minimal | Wired |
| **prism_multiaxis** | multiaxis_print_to_program (2) | Yes (lazy) | multiAxisProgramActionSchemas | Minimal | Wired |
| **prism_edm** | wedm_print_to_program (2) | Yes (lazy) | wedmPipelineActionSchemas | AutoPrintToProgramBridge | Wired |

## Critical Findings

### Orphaned Dual Turning Pipelines (CRITICAL)
- `turningProgramDispatcher.turning_print_to_program` (canonical, working)
- `camDispatcher.lathe_p2p_*` (45 actions, legacy, partially orphaned)
- Both invoke same engines via different entry points
- **Risk**: Inconsistent signoff/costing/reporting downstream

### Schema Gaps
- `lathe_p2p_*` actions lack dedicated schema (uses camActionSchemas fallback)
- Mill/turning/multiaxis missing per-action coverage
- Only E2E via LatheP2PPipelineE2E.test.ts; no per-action unit tests

### Wiring Completeness ✓
- All declared actions have case statements + engine calls: 100%
- Lazy import consistency: 95/100

## Score: 69/100 (C+)
- Wiring: 95/100
- Schema: 65/100
- Tests: 50/100
- Orphan risk: 40/100

## Remediations
1. Consolidate turning pipelines (deprecate `lathe_p2p_*` 45 actions, redirect to `turning_*`)
2. Create `lathe_p2p_ActionSchemas` if keeping back-compat path
3. Add per-action unit tests for mill/turning/multi-axis (currently E2E-only)
4. Deprecate orphaned `print_to_program_full` entry point
