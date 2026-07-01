---
title: SFC orchestrator computes turning Vc from the TOOL diameter, not the WORKPIECE diameter
aliases:
  - orchestrator turning broken
  - turning Vc tool vs workpiece diameter
  - SpeedFeedOrchestrator turning bug
tags: [lesson, speed-feed, turning, oscar, regression, r9]
created: 2026-06-21
slot: oscar
---

# SFC orchestrator: turning Vc uses tool diameter, not workpiece diameter

## The bug
`SpeedFeedOrchestratorEngine.compute()` (the PRODUCTION SFC web-UI engine, via `prism_calc:sf_orchestrate`)
computes the spindle-rpm / cutting-speed relationship from the **tool** diameter for **every**
operation: its "Core Speed/Feed Physics" step starts `const D = tool.diameter_mm.value` (`SpeedFeedOrchestratorEngine.ts:2574`)
and uses that `D` in `rpm = 1000*Vc/(PI*D)` (`:2667`). There is NO operation branch to use
`workpiece_diameter_mm` for turning.

For **turning**, cutting speed is the surface speed at the WORKPIECE outer diameter, so Vc/rpm must
be computed from `workpiece_diameter_mm` — not the single-point tool. Result: turning Vc collapses
to ~1-2 m/min (live probe: steel OD turning rough -> **Vc 1.8 m/min** vs the correct ~185).

Turning is **JM Die's primary domain** (35K lathe `.MIN` programs), so this is a live, high-severity
production correctness bug — the SFC app does not "work 100%" for turning.

## What is verified vs not (fact-checked 2026-06-21)
**VERIFIED:** the orchestrator computes turning rpm/Vc from `tool.diameter_mm` (`:2574`/`:2667`), no
`workpiece_diameter_mm` branch. The engine is correct — explicit turning rpm branch
`UltimateSpeedFeedEngine.ts:2246-2248` (`rpm = Vc*1000/(PI*workpiece_diameter_mm)`) + dedicated
`*_turning_*` tables (~`:770`). Live probe with `workpiece_diameter_mm=50`: orchestrator Vc 1.8 vs
engine Vc 185. So the bug manifests whenever a workpiece diameter reaches the orchestrator.

**NOT fully traced (do not overstate):** the full production data-flow. `calcDispatcher.ts:6795-6797`
dispatches `sf_orchestrate` as a RAW `params` pass-through (the `workpiece_diameter_mm` at
`calcDispatcher.ts:8651` is the `turning_force` action, a different engine). `web/src/utils/calculatorSpeedFeedContract.ts:781`
DERIVES `workpiece_diameter_mm` from stock geometry (`Math.max(stockY,stockZ)`), not directly from the
`SpeedFeedPage.tsx:621` "Part dia mm" field. Whether a typical UI turning request actually delivers a
workpiece diameter to `compute()` (and how often a real user hits the bug) is the first thing to trace
in the fix.

## Why it survived CI (R9 root cause)
The existing orchestrator turning tests (`speed-feed-orchestrator-dedicated.test.ts:112-150`) set
`tool_diameter_mm` but **no** `workpiece_diameter_mm`, and assert only RELATIVE behavior — cache
monotonicity, rpm clamp, safety-pass — **never** that the turning Vc is physically correct from the
workpiece diameter. A test that cannot fail when the turning physics is wrong does not encode intent
(R9), so a 60x Vc error passed. Guard added: `UltimateSpeedFeed-turning-correctness.test.ts` encodes
the intent (rpm == 1000*Vc/(PI*D_workpiece); rpm scales inversely with workpiece diameter).

## The fix
NOT a one-line orchestrator patch — the whole core-physics step assumes milling (`D=tool`, `z=flutes`,
per-tooth `fz`). The right fix is the operator-approved **convergence**: delegate core physics to
`UltimateSpeedFeedEngine` (which already handles turning). Land it WITH an intent-encoding orchestrator
turning test. Tracked: `U-SFC-ORCH-TURNING`. Memory: [[reference_oscar_orchestrator_turning_broken_2026_06_21]].

## Lesson (generalizable)
A milling-centric engine reused for turning silently produces wrong results whenever a single field
(workpiece vs tool diameter) carries different physical meaning per operation. And relative/clamp
tests (monotonicity, "<= max") never catch an absolute-physics error — an operation that has distinct
physics needs an intent-encoding test that asserts the actual formula relationship.
