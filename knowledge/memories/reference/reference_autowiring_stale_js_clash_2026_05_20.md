---
name: autowiring-stale-js-clash-2026-05-20
description: "U-EFF23 Box-restore put 3 stale .js engine files in src/engines/ shadowing their .ts; peer commit c845cb3551 removed them, exposing 3 pre-existing QualityScoreEngine bugs."
aliases: reference_autowiring_stale_js_clash_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.475Z
---


# Stale .js artifacts shadowing .ts engines — auto_wiring clash (2026-05-20, slot alpha)

## Root cause
Commit `98c9f585d7 [MAIN]/U-EFF23: restore 2020 src files from Box canonical` mass-restored
2020 source files from a Box backup. 3 of them were **stale compiled `.js` engine files** that
landed in `src/engines/` next to their live `.ts`: `AutoWiringEngine.js`, `QualityScoreEngine.js`,
`QualityDashboardEngine.js` — the ONLY 3 of ~2600 engines with a committed `.js`.

## The clash
Dispatchers import engines as `import "../engines/Foo.js"`. esbuild **and** vitest resolve a
literal `.js` on disk in preference to the `.ts`. So `prism_dev:auto_wiring_scan`,
`quality_score`, `quality_dashboard` — and their tests — silently ran the **stale half-size
`.js`** (e.g. AutoWiringEngine `.js` 165 lines vs `.ts` 497). Not a build error; a silent
wrong-code bug. The legacy `.js` also declared `const __filename`/`const __dirname` (esbuild
auto-injects these → potential duplicate-symbol clash) — hence the handoff's "__filename clash".

## Fix (shipped by a peer)
`c845cb3551 [MAIN] [CLOSE-OUT-PUNCHLIST]/U-AUTOWIRING-STALE-JS-CLASH` removed all 3 `.js`.
Build verified clean (esbuild then resolves `.js`→`.ts` like the other ~2600 engines).

## Exposed pre-existing defects (follow-up — NOT yet fixed)
Removing the stale `.js` made vitest resolve to the real `.ts`, surfacing 3 latent
`QualityScoreEngine.test.ts` failures the stale `.js` had masked:
1. **Off-by-one** (test lines 29, 180 — `scored_engines === total_engines`): `src/engines/
   WEDMLoRADatasetBuilderEngine.ts` is an **empty file**. QualityScoreEngine counts it in
   `total_engines` (it's a `.ts`) but `safeRead`→`""`→`if(!content)continue` skips it from
   scoring. 3293 vs 3292.
2. **W-credit** (test line 98): test asserts `SpeedFeedOrchestrator` gets `exported_in_index:
   true`, but `SpeedFeedOrchestrator` does NOT appear in `src/engines/index.ts` (grep count 0).
   `exported_in_index:false` is correct engine behavior — the **test premise is stale**.

Resolution = a separate unit: (a) build or remove the empty `WEDMLoRADatasetBuilderEngine.ts`,
(b) point the W-credit test at an engine genuinely in index.ts. Not bolted onto the reorient
session per autonomous-loop drift discipline.

## Lesson
A committed `.js` next to its `.ts` in `src/engines/` is a silent-shadow hazard — esbuild and
vitest both pick the literal `.js`. Mass file-restores (Box canonical) must exclude compiled
artifacts. Removing a shadow `.js` can flip tests red because the test was last green against
the *stale* engine — always run the engine's tests after de-shadowing.
