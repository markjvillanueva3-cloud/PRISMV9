---
name: reference-lathe-cycle-time-levers-2026-05-27
description: Cycle-time reduction levers for CNC lathe programs distilled from iter94 corpus (Okuma 80% reduction case study + Cycle Time Reduction Secrets p2). Practical knobs the wizard should expose ranked by typical magnitude.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.636Z
aliases: reference_lathe_cycle_time_levers_2026_05_27
---


# CNC lathe cycle-time levers

Ranked by typical magnitude per the iter94 corpus (Okuma case + CT-Reduction-Secrets-p2):

## Tier 1: structural (often 30-80% reduction)
1. **Eliminate sub-spindle handoff dead time** — overlap sub-spindle pickoff with main-spindle finishing (subsystem-sync programming).
2. **Run two operations simultaneously** — turret-2 chamfering on main while turret-1 backs out (dual-turret balancing); requires Y-axis on at least one turret.
3. **Replace tool changes with multi-edge inserts** — 8-edge round buttons + 4-edge negative-rake CNMG for rough + finish on the same insert face.
4. **Convert 2-op (lathe+mill) to 1-op (mill-turn)** — eliminates rechucking + re-zeroing; cycle-time goes from N_lathe+N_mill+setup → N_max.

## Tier 2: parametric (often 10-30%)
5. **Push speed under CSS to material-grade ceiling** — most amateur programs run 50-70% of insert-grade rating because of fear; vendor curves are conservative + carbide manufacturers publish "test fmax/Vmax" higher than catalog "recommended."
6. **Optimize rapid retracts** — G00 to safe-Z, not to home; saves 0.5-3s per tool block over a 30-block program.
7. **Compress G71 roughing margin** — most programs leave 0.020"/0.010" finish stock; aggressive grades + good rigidity can do 0.005"/0.002" leaving the rough cut as the semi-finish.
8. **G96 vs G97 selection** — G96 CSS for diameters varying >2× max:min; G97 fixed RPM for short single-diameter cuts (no spin-up dead time).

## Tier 3: micro (typically 2-10%)
9. **Reduce dwell/pause time** — `G04 X0.5` at thread-bottom often unnecessary if the spindle is rigid.
10. **Pre-position next tool while current cuts** — `T0202 M06` in a pocket-call; queued during current cut on multi-tool lathes.
11. **Run synchronized turret indexing** — if both turrets active, turret-1 indexes during turret-2's cut.

## Anti-patterns (the 80% in "amateur" programs surfaced in ALCOA baseline)

- ❌ Single-edge insert use (1 of 4 edges) — pays 4× insert cost + 4× index time
- ❌ Fixed G97 for variable-diameter parts (under-runs small diameters by 5-10× possible RPM)
- ❌ Excessive G00 paths to far-home between every tool
- ❌ Dwell-everywhere (`G04 X0.3` between every block "for safety")
- ❌ Finish-pass at roughing feed (timid finishing → time-wasted + surface-finish bad)

## How the wizard should apply this

When generating a program:
1. Score the candidate program against these levers
2. Surface a "potential cycle-time delta" estimate when each lever is violated
3. Operator can accept/reject lever-by-lever (R12 fail-loud — never silently change without surface)

## Related

- [[lathe-baseline-ALCOA-2026-05-26]] — baseline showed 0% insert-coverage (no rotation strategy) — Tier-1 lever-3 is the primary win
- [[reference_whiskey_lathe_corpus_state_2026_05_27_iter101]] — session corpus including iter94 cycle-time material
- [[feedback_box_programs_amateur]] — operator's framing of the original JM-Die programs
- LatheCSSOptimizerEngine + LatheCAMIntelligenceEngine should expose these levers as candidate-program scores
