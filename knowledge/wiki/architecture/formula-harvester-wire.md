---
title: FormulaHarvesterEngine → prism_dev wire
type: architecture
unit: U-GAP-TRIBAL-FORMULA-REGISTRY
milestone: FEATURE-GAP-AUDIT-MS0
commit: 4ab0fa591f
created: 2026-05-18
by: claude-ae98bc9f (slot foxtrot)
---

# FormulaHarvesterEngine → prism_dev wire

Closes the FEATURE-GAP-AUDIT orphan: `FormulaHarvesterEngine` (RES-MS1) was
built + tested (19/19) but referenced by **no dispatcher** — the ~107 machining
formulas it harvests from 3 JS knowledge files were unreachable through MCP.

## Surface

`prism_dev` (`devDispatcher.ts`) — 3 read-only actions:

| Action | Engine call | Returns |
|--------|-------------|---------|
| `formula_harvest` | `FormulaHarvesterEngine.harvest()` | full `HarvestResult` (107 formulas + registry entries) |
| `formula_harvest_sources` | `.getSources()` | the 3 source files + `totalExpected` (no disk parse) |
| `formula_harvest_audit` | `.audit()` | count + domain breakdown + `withImplementation`/`withConstants` |

## R12 fail-loud

`HarvestResult` carries `degraded:boolean`, `errors:string[]`, `filesRead:number`.
A missing/unreadable source file no longer silently degrades to a 0-count
success — `harvest()` sets `degraded=true`, populates `errors[]`, and logs a
LOUD "DEGRADED harvest — N/3 ... UNDERCOUNT" error. `audit()` propagates it.
The dispatcher returns the result whole so the signal reaches the caller.

## Knowledge corpus

The 3 source files (`PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js` ~159KB,
`PRISM_ADVANCED_CROSS_DOMAIN_v1.js` ~33KB,
`PRISM_UNIVERSITY_COURSE_REFERENCE_v1.js` ~128KB) live under
`resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/` — git-ignored by
`.git/info/exclude`. They are now force-tracked (commit `4ab0fa591f`) so the
real-data E2E test is a valid oracle on a fresh clone, not machine-local.
`FORMULA_ROOT` is `process.env.PRISM_FORMULA_ROOT ?? PATHS.PRISM_ROOT`-derived.

## Tests

`devDispatcher.formula-harvest-wire.test.ts` — 4 cases, round-trip THROUGH the
dispatcher. Anti-stub: `totalFormulas>50` + `degraded===false` + `filesRead===3`
(only a real disk parse passes; a stub/degraded run fails). Engine's own
`FormulaHarvesterEngine.test.ts` 19/19 still green (additive interface change).
