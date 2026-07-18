# POST-BRIDGE-SYNERGY-MS0/U-EMIT-CLOSED-FORM-TROCHOIDAL-ARC — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-EMIT-CLOSED-FORM-TROCHOIDAL-ARC (slot:echo /loop iter54 /yolo): closed-form trochoidal arc emit — single G2/G3 per petal replaces 36-72 linear segments.

**Commit:** `17cd6f22a7e8` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T12:25:00-05:00
**Tags:** post-bridge-synergy-ms0, u-emit-closed-form-trochoidal-arc, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-EMIT-CLOSED-FORM-TROCHOIDAL-ARC (slot:echo /loop iter54 /yolo): closed-form trochoidal arc emit — single G2/G3 per petal replaces 36-72 linear segments.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-EMIT-CLOSED-FORM-TROCHOIDAL-ARC (slot:echo /loop iter54 /yolo): closed-form trochoidal arc emit — single G2/G3 per petal replaces 36-72 linear segments.

Closes envelope row 35 (Phase 6 EMIT-side, 3d effort, 10× speedup on high-feed-mill emit).

scripts/lib/trochoidal-arc-emit.mjs — pure-fn library, 16 exports:
- trochoidalRadiusMm(W, D) — (W-D)/2 with MIN_RADIUS_MM=0.05 floor
- loopsForSlotLength(L, r, s) — floor((L-2r)/s), capped at MAX_LOOPS=100000
- pathLengthPerLoopMm(r, s) — 2π·r + s
- totalPathLengthMm(W, L, D, s) — (n+1)·2π·r + n·s (matches block-emit accounting)
- buildTrochoidalArcBlocks(...) — emits [arc, linear, arc, linear, ...]
  · n step-overs → n+1 petals (i=0..n inclusive)
  · each arc: full G3/G2 circle, center walks +s per loop in +X
- formatArcLine / formatLinearLine / formatBlock — dialect-aware emit
- emitTrochoidalArcProgram(...) — header comment + arc/linear lines

scripts/lib/trochoidal-arc-emit.test.mjs — 71 tests, 12 suites.

Hand-checked anchor chain (W=10mm, D=6mm, L=10mm, s=0.5mm):
  r = (10-6)/2 = 2 mm
  n_steps = floor((10-4)/0.5) = 12
  n_petals = 13
  perLoop = 2π·2 + 0.5 = 4π + 0.5 ≈ 13.0664 mm
  total = 13·4π + 12·0.5 = 52π + 6 ≈ 169.3628 mm
  emit = 1 header + 13 arcs + 12 linears = 26 lines

Why "closed-form": naive linearized trochoidal posts emit 36-72 G1
segments per petal (one per 5-10° of arc) → for 13 petals that's ~468
linear blocks vs 26 closed-form blocks. ~18× line-count reduction +
controller-side smooth motion (no look-ahead starvation pause-and-replan
stutter on every petal). The regression test asserts the 26-line bound.

Echo-soul compliant: pure geometric kinematic. NO inline cutting physics
(Vc / Kc / Taylor / wear). Feed-rate / spindle / coolant are upstream
INPUTS — this lib only computes arc geometry + dialect-aware G-code.

Dialect emit:
- fanuc / haas / mitsubishi: G3 X.. Y.. I.. J.. (paren-strip in comments)
- siemens: G3 X.. Y.. I.. J.. (ISO syntax)
- heidenhain: G3 X.. Y.. I.. J.. in ISO mode (cycle-mode CC/C would be
  P1 follow-up; ISO acceptable on modern TNCs)

@milestone POST-BRIDGE-SYNERGY-MS0/U-EMIT-CLOSED-FORM-TROCHOIDAL-ARC
@phase 6 EMIT-side · @row 35 · @effort 3d
@slot echo · @date 2026-05-27
```

## Files touched (3)
- scripts/lib/trochoidal-arc-emit.mjs      | 310 ++++++++++++++++++++++
- scripts/lib/trochoidal-arc-emit.test.mjs | 441 +++++++++++++++++++++++++++++++
- 2 files changed, 751 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 17cd6f22a7e8`
- Milestone envelope: `mcp-server/data/milestones/POST-BRIDGE-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._