---
name: reference-u-camx22-fix-silent-skip-2026-05-18
description: U-CAMX22-FIX-SILENT-SKIP — sync AutoSpeedFeed in PrintToProgram pipeline; commit commingled peer U-CAMX10
aliases: reference_u_camx22_fix_silent_skip_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.234Z
---


2026-05-18, slot juliett (claude-cdfb103c), commit `05c57a0289`. Completed
juliett's remaining CAMX-MS0.3 work from earlier today's session: the explicit
in-code follow-up to U-CAMX22-VISIBLE-SKIP.

**The bug:** `AutoSpeedFeedEngine.optimize()` was `async` ONLY because it
`await import()`-lazy-loaded UltimateSpeedFeedEngine + PostProcessorFeedOptimizer.
`PrintToProgramPipelineEngine.runFullPipeline` is sync → could not await it →
emitted UNOPTIMIZED base G-code with an auditable skip (U-CAMX22-VISIBLE-SKIP
made it visible; this unit fixes it).

**Fix (pure extraction + wiring, NO S/F physics changed):**
- `AutoSpeedFeedEngine.ts`: static-import both orchestrated engines (verified
  zero circular dep + zero module-top-level side-effects). Extract synchronous
  `_optimizeImpl(input,usfe,ppfo)` core = former `optimize()` body verbatim.
  `optimize()` stays async + delegates (backward-compat for analyze/
  batchCalculate + ~10 callers); new `optimizeSync()` + `prewarm()`; async
  getters retained, dynamic `await import()` gone.
- `PrintToProgramPipelineEngine.ts`: call site → `asfe.optimizeSync()`. R12
  try/catch fallback-to-base-G-code preserved.

**Per-file 2-reviewer gate:** round1 A=PASS / B=FAIL(P1). P1 = activating real
optimization made emitted `text` diverge from the pre-opt `blocks`
`runSafetyChecks()` validates, and the engine's RPM/power clamps were inert
(call site omitted machine limits). **Fix:** `asfInput` now passes
`machine_max_rpm: maxRPM` + `machine_power_kw: maxPower` (same envelope vars fed
to runSafetyChecks) → engine's own clamps (AutoSpeedFeedEngine.ts:354-357 RPM,
:502-513 power) bound optimized S/F to the machine envelope BEFORE emission.
round2 A=PASS / B=PASS. P2 (parity test tautological / no golden S/F) assessed
by BOTH reviewers as mis-scoped for an extraction refactor — a golden S/F
asserts a *different* engine's (UltimateSpeedFeedEngine) physics; the synthetic
test harness provably cannot trigger real optimization without JM-Die
material-DB keys (all materials → cutting_lines=0 in a standalone probe). The
sync↔async parity invariant IS the correct guard for an extraction (fails iff
`_optimizeImpl` diverges between callers). Logged non-blocking.

**Test:** `AutoSpeedFeedEngine.camx22-sync.test.ts` 17/17 — parity invariant
(byte-identical gcode + deep-equal stats incl. productivity/high-aggressiveness),
structural contract, edge cases, source-grep fail-on-revert (dynamic-import
gone, optimizeSync wired, P1 machine-limit pass-through, R12 fallback). Combined
with PrintToProgramPipelineEngine.test.ts: 29/29. tsc-clean both files.

**Commingle (documented collision class):** commit `05c57a0289` ALSO contains
peer `claude-c0eb54b9`'s uncommitted U-CAMX10 CrossCamRecommenderEngine wiring
in PrintToProgramPipelineEngine.ts (~140 of the 165 insertions). Cause:
shared-main-tree `git add -- <path>` stages the full working-tree file incl.
peer's uncommitted hunks. SAME class as [[reference_cross_chat_commit_misattribution_2026_05_18]]
(hotel→juliett). Work CORRECT on disk + git, banner imprecise. Did NOT rewrite
history (branch diverged 265 ahead, peer-destructive — per established
doctrine). Peer alerted via chat bus. Future commit-subject audit:
`05c57a0289` = U-CAMX22-FIX-SILENT-SKIP (juliett) + U-CAMX10 (c0eb54b9).
Structural prevention = slot-worktree migration ([[reference_slot_worktree_activation_2026_05_16]]).

Verify: `git -C H:/prism show 05c57a0289 --stat` → 3 files;
`cd H:/prism/mcp-server && npx vitest run src/__tests__/AutoSpeedFeedEngine.camx22-sync.test.ts` → 17/17.
