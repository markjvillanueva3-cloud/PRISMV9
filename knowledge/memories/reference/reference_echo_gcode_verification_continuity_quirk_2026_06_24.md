---
name: reference_echo_gcode_verification_continuity_quirk_2026_06_24
description: "GCodeVerificationEngine.motion_continuity is a probable defect: it measures each FEED move's LENGTH as a 'gap' (compares each endpoint to the prior endpoint == the move vector), so any program with feed moves >0.1mm reports continuous:false. Locked by a characterization test; flagged for a deliberate future fix."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.560Z
aliases: reference_echo_gcode_verification_continuity_quirk_2026_06_24
---


**U-PP-GCODEVERIFY-TEST** (slot:echo, 2026-06-24, `cad-fusion-live-ms0`). While writing the companion test for `mcp-server/src/engines/GCodeVerificationEngine.ts` (was untested), tracing surfaced a probable defect.

**The quirk — `motion_continuity` measures move LENGTH, not discontinuity:** in `verify()` (engine lines ~185-189), for each feed/arc move the engine computes `d = sqrt((nx-cx)^2 + (ny-cy)^2 + (nz-cz)^2)` where `(cx,cy,cz)` is the PRIOR motion endpoint and `(nx,ny,nz)` is THIS move's endpoint — i.e. `d` is the length of the move itself, not a gap between segments. Any feed move >0.1mm is then pushed to `gaps[]`, so `motion_continuity.continuous` is `false` for essentially any real program (every normal cutting move registers as a "gap"). Rapids are skipped (`!ln.is_rapid`), so only feed/arc moves are mis-flagged.

**Why it's almost certainly wrong:** the field name + `gap_mm` semantics imply detecting toolpath JUMPS (e.g. a feed-START positioned far from where the previous rapid left the tool — a missing rapid/lead-in). The correct comparison is the distance from a feed-START point to the prior RAPID-positioned point, NOT the length of the cut itself. As written, `continuous:true` is only reachable by a program with zero feed moves >0.1mm.

**Scope / blast radius (must verify before fixing):** `motion_continuity` is part of the returned `GCodeVerificationResult`. Before changing the logic, grep every consumer of `gCodeVerificationEngine.verify(...)` and of the `motion_continuity`/`gaps`/`continuous` fields (engine had NO companion test and unknown dispatcher wiring at find-time — confirm whether `gcode_verify` is dispatcher-routed and whether any caller asserts on `continuous`). A fix flips `continuous` from false→true for normal programs, so any consumer treating `continuous===false` as a blocking signal would change behavior.

**What this unit did (no engine change):** added `mcp-server/src/__tests__/GCodeVerificationEngine.test.ts` (19 tests, all green) — happy path + SAFETY-001/002/004 + LIMIT-001/002/003 + SYNTAX-001/004/005 + SYNTAX-002 dialect gating + NOVEL-003/TGAR opt-in + empty-program envelope clamp + a CHARACTERIZATION test that LOCKS the current continuity behavior (`gaps:[{from_line:6,to_line:7,gap_mm:10}]`, `continuous:false` for two 10mm feed moves). The characterization assertion is explicitly marked to FLIP when the defect is fixed. Did NOT start the fix at the session wall (5h session-limit ~12 min out; risky to change shared-result logic with unknown consumers under time pressure).

**Future fix unit (queued):** `U-PP-GCODEVERIFY-CONTINUITY-FIX` — compare feed-START to prior rapid-positioned point (detect a jump where a cut begins away from the last commanded position), update the marked characterization assertion, add a real positive test (a genuine discontinuity → gap) and a negative test (continuous toolpath → no gap). Sibling of the trailing-flush logic gap in `GCodeBidirectionalOptimizerEngine` (U-PP-BIDIR-OPT-TRAILING-FLUSH, same session) — both are "the boundary/edge case the loop body silently mishandles."

**BLAST RADIUS — CLEARED 2026-06-24 (R8, pre-staged for the fix unit):** grepped every consumer of `gCodeVerificationEngine` / `motion_continuity` / `.continuous` / `.gaps` across `mcp-server/src`. Result = the continuity field is currently DEAD (no consumer branches on it):
- `tools/dispatchers/toolpathDispatcher.ts` `case "gcode_verify"` (lines 273-276) just `result = gCodeVerificationEngine.verify(params)` and returns the whole object verbatim — never inspects `continuous`/`gaps`.
- `engines/VirtualMachiningDeepLearningEngine.ts` references `GCodeVerificationEngine` only in JSDoc; it has its OWN `verifyNCCode` static and does NOT call `verify()` — zero coupling.
- `__tests__/camk-ms1-pipeline.test.ts` + `__tests__/training-manual-ai.test.ts` = zero matches on the continuity fields.
- The ONLY assertion on `motion_continuity` is the new characterization test (`GCodeVerificationEngine.test.ts`), explicitly marked to flip on fix.
So the fix is contained: change `verify()` continuity logic + update the one characterization assertion + add positive/negative continuity tests. No dispatcher/engine consumer behavior changes.

**DESIGN NOTES for the fix (do NOT rush a wrong semantic):** (1) decide what "gap" means — a genuine programmed discontinuity is a feed-START whose implied start != the running position; in well-formed ABSOLUTE G-code consecutive moves are always continuous, so a correct fix makes valid programs report `continuous:true, gaps:[]`. (2) LATENT SIBLING BUG: the parser treats ALL coordinates as absolute and ignores G90/G91 modal state — in G91 incremental mode the X/Y/Z values are DELTAS, so envelope + continuity + plunge math are all wrong. The continuity fix should be done WITH G90/G91 awareness (track modal distance mode) or the fix is only half-correct. (3) the field being dead means there is no urgent consumer pressure — do it comprehensively (R13) on fresh budget, not rushed before a session wall.
