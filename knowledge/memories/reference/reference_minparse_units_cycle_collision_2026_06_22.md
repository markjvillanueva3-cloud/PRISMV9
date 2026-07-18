---
name: reference_minparse_units_cycle_collision_2026_06_22
description: "Okuma MIN parser mapped G70/G71 to inch/mm (obsolete Fanuc convention) — a roughing-cycle block silently corrupted header.units to \"mm\" for inch programs (25.4× hazard); fixed + JM-corpus-validated (slot:alpha 2026-06-22)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.660Z
aliases: reference_minparse_units_cycle_collision_2026_06_22
---


# Okuma MIN parser G70/G71 units↔cycle collision (U-MINPARSE-UNITS-CYCLE-FIX, slot:alpha 2026-06-22)

**Commit:** `25f1ee33fa` `[SAFETY-UNITS]/U-MINPARSE-UNITS-CYCLE-FIX` on `cad-fusion-live-ms0`. 25/25 tests, 3-of-3 PASS (zero findings; arm B empirically proved the oracle by revert).

## The bug (a real 25.4× UNITS-FIRST hazard)
`MINFileParserEngine.ts` G-code switch mapped `case 70: st.units="inch"` / `case 71: st.units="mm"` (the obsolete pre-G20/G21 **Fanuc** units convention). But on **Okuma OSP lathes** G70/G71/G72 are **LAP turning cycles** (G70 finish, G71 longitudinal-rough, G72 facing-rough) — and the engine's separate `cannedForOp` scan (`:408`, `[70,71,72,74,75,76,81,83,84,...].includes(g)`) already (correctly) records them as `canned_cycles`. So **every roughing-cycle block also ran `case 71 → st.units="mm"`** → `unitsFirst` latched to "mm" (`:415`, first-wins) → `header.units` corrupted to "mm" for an inch program. Surfaced as an esbuild `duplicate-case` warning (70/71 appeared in BOTH the units arm and the canned-cycle arm; the latter was dead — first-match wins).

## How it was caught + validated
- Surfaced by running the authoritative `npm run build` (esbuild `duplicate-case` warning) — **the build was GREEN (no tsc errors); the warning was the signal.** Lesson: read build WARNINGS, not just errors.
- **Live-data validated (R15) on the JM corpus:** ~1500 real Okuma `.MIN` files had **0× G20/G21** and **72× G71** — every G71 a roughing cycle (`G71 X.. Z.. B60 D.003 U.001 H.. F.. J.. M33 M73`), never a standalone units command. So real JM **inch** programs with a G71 were being read as **mm**. (34,993 .MIN files total in JM DIE.)
- The pre-existing `basicTwoOp` test fixture MASKED the bug because it has `G20` BEFORE `G71` → the first-wins `unitsFirst` lock latched "inch" before the G71 mm-flip. The bug only manifests when G70/G71 appears with NO prior G20/G21 (the real JM case). New regression oracles use exactly that.

## The fix
Removed lines 170-171 (the G70/G71→units mapping). Now: units come ONLY from G20/G21 (`:168-169`, unchanged); G70/G71/G72 are classified ONLY as canned cycles (`cannedForOp` scan + the now-non-duplicate cycle case); undeclared-units MIN files honestly report `header.units="unknown"` (schema enum permits it; defer to the JM inch default downstream — UNITS-FIRST: never fabricate "mm"). Dissolves the duplicate-case warning. Downstream `header.units` is passive training metadata only (`TrainingExampleAssemblerEngine`) — no `=== "mm"` scaling branch — so "unknown" is strictly safer (verified by arm C).

## Lessons
- **Build WARNINGS can flag latent safety bugs**, not just style — a `duplicate-case` here was a units-corruption hazard. Don't ignore them.
- **Validate a domain/safety claim against the real corpus**, not just reasoning — the JM `.MIN` scan (0× G20/G21, 72× G71-as-cycle) is what made the units-vs-cycle call safe to ship autonomously.
- A G-code that has DIFFERENT meaning across controller dialects (Fanuc G70/G71=units vs Okuma G70/G71=cycles) is a units-collision trap — the parser must commit to ONE dialect's semantics (this is the Okuma `.MIN` parser → Okuma semantics).

## TODO for golf (root CLAUDE.md is golf-only-edit-gated)
Promote a one-line entry to root `H:/prism/CLAUDE.md` `## Recent regressions` pointing at commit `25f1ee33fa` + this memory. (Alpha cannot edit root CLAUDE.md — golf-only guard.)
