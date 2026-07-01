---
title: "GCodeVerificationEngine motion_continuity measures move LENGTH, not discontinuity"
type: lesson
domain: post-processor
slot: echo
unit: U-PP-GCODEVERIFY-TEST
commit_flag: true
created: 2026-06-24
tags: [gcode, verification, characterization-test, dead-field, g90-g91, latent-bug]
related:
  - "[[reference_echo_gcode_verification_continuity_quirk_2026_06_24]]"
  - "[[post-pdf-node-ms0-u-pipeline-close-out]]"
---

# Lesson — `motion_continuity` is a move-length meter, not a gap detector

## What was found
While writing the first companion test for `mcp-server/src/engines/GCodeVerificationEngine.ts` (it had none), tracing the `verify()` body surfaced a probable defect in the `motion_continuity` block (engine lines ~185-189).

For each feed/arc move the engine computes
`d = sqrt((nx-cx)^2 + (ny-cy)^2 + (nz-cz)^2)`
where `(cx,cy,cz)` is the **prior motion endpoint** and `(nx,ny,nz)` is **this move's endpoint** — i.e. `d` is the **length of the move itself**, not a gap between disjoint segments. Any feed move >0.1mm is then pushed to `gaps[]`, so `motion_continuity.continuous` is `false` for essentially **any** real program (every normal cutting move registers as a "gap"). Rapids are skipped (`!ln.is_rapid`), so only feed/arc moves are mis-counted.

## Why it matters / why it's wrong
The field name + `gap_mm` semantics imply detecting toolpath **jumps** (a cut that begins away from where the tool was last commanded — a missing rapid/lead-in). The correct comparison is a feed-**start** vs the prior commanded position. As written, `continuous:true` is only reachable by a program with zero feed moves >0.1mm — making the field noise.

## Decision (R12/R13) — characterize now, fix on fresh budget
Did **not** change engine logic under a 5h session wall. Instead:
1. Added 19 reference-value tests (`mcp-server/src/__tests__/GCodeVerificationEngine.test.ts`), all green — happy path + SAFETY-001/002/004 + LIMIT-001/002/003 + SYNTAX-001/004/005 + dialect-gated SYNTAX-002 + NOVEL-003/TGAR opt-in + empty-program envelope clamp.
2. Locked the current continuity behavior with a clearly-marked **CHARACTERIZATION** test (`gaps:[{from_line:6,to_line:7,gap_mm:10}]`, `continuous:false` for two 10mm feed moves) — explicitly marked to flip when the fix lands.

## Blast radius — CLEARED (the field is dead)
Grepped every consumer of `gCodeVerificationEngine` / `motion_continuity` / `.continuous` / `.gaps` across `mcp-server/src`:
- `tools/dispatchers/toolpathDispatcher.ts` `case "gcode_verify"` returns `verify()` verbatim — never inspects continuity.
- `engines/VirtualMachiningDeepLearningEngine.ts` references it only in JSDoc; has its own `verifyNCCode` — no coupling.
- `__tests__/camk-ms1-pipeline.test.ts` + `__tests__/training-manual-ai.test.ts` — zero matches.
- Only the new characterization test asserts on it.

So a fix that flips `continuous` changes **no** consumer behavior — `U-PP-GCODEVERIFY-CONTINUITY-FIX` is contained + low-risk.

## LATENT SIBLING BUG (fix together)
The parser treats **all** coordinates as absolute and ignores **G90/G91 modal state**. In G91 incremental mode the X/Y/Z words are **deltas**, so the work-envelope, continuity, and rapid-plunge (SAFETY-001) math are all wrong. The continuity fix must track distance mode (G90/G91) or it is only half-correct.

## Takeaway
A "continuity/gap" metric must compare a segment's **start** to the previously-commanded position — never a segment's own endpoint to its own start (that just measures the segment). And any G-code coordinate math must be **modal-aware** (G90 absolute vs G91 incremental) before trusting envelope/plunge/continuity. Sibling of `GCodeBidirectionalOptimizerEngine` U-PP-BIDIR-OPT-TRAILING-FLUSH (same class: the loop body silently mishandles a boundary case).
