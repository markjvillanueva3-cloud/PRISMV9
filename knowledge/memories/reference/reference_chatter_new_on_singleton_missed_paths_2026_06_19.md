---
name: reference_chatter_new_on_singleton_missed_paths_2026_06_19
description: "ChatterStabilityLobeEngine._computeWithStabilityLobeDiagram (lines 341, 778) still does `new StabilityLobeDiagram()` on a singleton -- the 2026-05-30 U-CHATTER-SLD-RESTORE fix missed these 2 paths; correct fix cascades 19 stale-API errors. Safety-critical."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.514Z
aliases: reference_chatter_new_on_singleton_missed_paths_2026_06_19
---


# Chatter `new`-on-singleton: 2 paths missed by the 2026-05-30 fix (slot:papa 2026-06-19)

**Finding (NOT yet fixed -- reverted to avoid leaving the build broken):** during a papa tsc-fix loop, tsc
flagged `ChatterStabilityLobeEngine.ts(341,26)` and `(778,26)` TS2351 "This expression is not constructable."
Both are `const sldAlg = new StabilityLobeDiagram();` inside `_computeWithStabilityLobeDiagram(...)`.

**Root cause:** `StabilityLobeDiagram` is a SINGLETON instance, not a class --
`src/algorithms/StabilityLobeDiagram.ts:243` `export const StabilityLobeDiagram = new StabilityLobeDiagramImpl();`
So `new StabilityLobeDiagram()` THROWS at runtime, and the safety-critical SDOF chatter path silently falls to a
degraded fallback (mispredicted stability lobes). This is the SAME bug class as the prior fix
**U-CHATTER-SLD-RESTORE (2026-05-30, slot:foxtrot, [[reference_chatter_engine_regression_2026_05_24]])** -- which
fixed the `compute()` call site but MISSED these two `_computeWithStabilityLobeDiagram` paths.

**Why it stayed hidden:** the un-constructable `new` made `sldAlg` error/any-typed, which MASKED all the
downstream method calls. Removing `new` (the correct fix) unmasks **19 errors** in the method body: 15x TS2339
(methods that don't exist on `StabilityLobeDiagramImpl`) + 4x TS2345 (arg types) + `.lobes` result-shape access.
The whole method is built against a STALE StabilityLobeDiagram API; it must be rewritten against the current
`Algorithm<StabilityLobeInput, StabilityLobeOutput>` interface (`.execute(input)` -> `StabilityLobeOutput`).

**Disposition:** safety-critical SDOF chatter calc -> route to the chatter owner (foxtrot/oscar) WITH
physics-review; this is NOT a rush type-fix. Recorded in `state/shared/specs/PAPA-TSC-TRIAGE-2026-06-19.md`
(HIGH-PRIORITY SAFETY FINDING) as the recommended top next-tick item. I reverted my 1-line `new` removal so the
build stayed at 41 errors rather than 58 with a half-rewritten safety path (R12 -- don't ship a broken half-fix).

**Lesson:** when a TS2351 "not constructable" sits on a `new X()` where X is a singleton const, removing `new` is
correct but can unmask a large downstream cascade that the error was hiding (the errored expression was `any`).
Check the downstream method calls BEFORE committing the 1-liner; a fix that takes 2 errors to 20 is not done.
Related: [[reference_chatter_engine_regression_2026_05_24]] (the original, which missed these paths) ·
[[reference_tsc_default_heap_crash_false_green_2026_06_19]] · R12 fail-loud.
