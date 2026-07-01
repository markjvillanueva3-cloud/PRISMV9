---
name: jm-master-step-is-die-bore-not-electrode-2026-05-27
description: "JM Die master STEP files like TRILOBE C=.219 E=.199.STEP encode DIE BORE geometry, NOT electrode geometry. The filename C/E labels are the die hole the electrode burns INTO; the actual electrode is -0.003\" from those values per JM's spark-gap convention. Validated 2026-05-27 by pair-comparison of master vs parametric output at the same dims."
type: project
source: prism-memory
synced: 2026-06-27T20:30:46.629Z
aliases: reference_jm_master_step_is_die_bore_not_electrode_2026_05_27
---


# JM master STEPs encode DIE BORE, not electrode geometry

**Discovered (slot:delta /loop iter150, 2026-05-27):** by running
`cad-compare-trilobe-pair.mjs` between:
- Master: `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/ELECTRODES/TRILOBE C=.219 E=.199.STEP`
- Parametric: our `plain_trilobe` archetype emitted at the SAME C=0.219, E=0.199

| Measurement   | Master    | Parametric (electrode) | Delta    |
|---------------|-----------|------------------------|----------|
| peak Ø        | 0.2190    | 0.2160                 | -0.00300 |
| valley Ø      | 0.2123    | 0.1960                 | -0.01632 |
| length        | 1.2950"   | 1.2950"                | +0.00000 |

The peak-Ø delta is **exactly the JM total spark gap (-0.003 in)** —
which means the master STEP file is saved at the FULL CIRCUMSCRIBED
diameter (0.219), i.e. the die bore the electrode burns into. The
electrode geometry would be 0.003" smaller on the diameter
(0.0015"/side) to leave the burn gap.

**Why this matters:**
- Filename labels (`C=.219 E=.199`) are DIE specs, not electrode specs.
- The electrode an operator manufactures from that file would have to
  be -0.003 each. JM's parametric Excel macro applies this conversion
  at SolidWorks-time by typing the electrode dims directly into Sheet9.
- Our parametric generator already correctly subtracts the spark gap
  (`sparkGapPerSide: 0.0015` in every spec). When the operator gives
  us a print's C/E values (die bore), we feed those straight in and
  the generator outputs the electrode geometry. Conversion is implicit.

**Valley Ø discrepancy explained:**
- Master measured valley Ø = 0.2123, but filename label E = 0.199.
- A 0.0123 in delta on the valley is too large to be spark gap (0.003).
  It's a B-SPLINE CONTROL POINT BIAS — the master's CARTESIAN_POINTs
  are control points of the trilobe surface, which sit OUTSIDE the
  true valley by exactly `amp * (1 - cos(N * theta_step/2))` where
  theta_step is the sketch's segment angle. The TRUE valley is hit
  only at exact angles theta = (2k+1) * pi / N, and a small N-segment
  spline misses those points. So master STEPs systematically
  over-report valley Ø.
- Our parametric output uses a dense polygon-prism (24 points per
  lobe x 3 lobes = 72 polygon points), which DOES hit the exact
  valley angles, so our valley measurement is precise.

**How to apply:**
- When training a print-to-STEP regression, use filename C/E as TRUTH
  for peak (the master has it dead-on), but skip the master's valley
  measurement (it's biased).
- When generating an electrode for a new die print, feed the print's
  die-bore C/E to the parametric generator UNALTERED. The
  -0.0015/side conversion is automatic.
- When comparing two STEPs, treat valley-Ø deltas <0.02" as
  measurement noise from B-spline control point sampling, not as
  true geometric difference.

# Related memories
- [[reference_ejot_p30247750_exact_dims_2026_05_27]] - the EJOT case where operator gave die-bore dims
- [[reference_cad_master_step_vs_xlsm_independence_2026_05_27]] - xlsm/master are independent
- [[reference_jm_trilobe_example_step_analysis_2026_05_27]] - earlier master analysis
- [[reference_roku_roku_primary_electrode_machine_2026_05_27]] - machine that actually burns these
