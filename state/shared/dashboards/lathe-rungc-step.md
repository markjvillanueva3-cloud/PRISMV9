# Rung C-CAD STEP -- real JM STEP geometry -> program closed loop (lathe)

- generated: 2026-06-28T16:19:37.566Z
- geometry: occt-import-js mesh -> rotational profile (NO GPU)
- steps attempted: 2009 | scored: 941 | suspect-skipped: 988 | paired to .MIN: 28
- **full_geometry_loop_closed (STEP subset): true**
- avg SFM in-band: 100% | IPR in-band: 100% | both: 100%
- safety: SAFE 941 / UNSAFE 0 / PARTIAL 0
- tribal advisory: 675 corpus tips, 941 part(s) with surfaced shop tips

> full_geometry_loop_closed (STEP subset) is TRUE only when >=1 STEP went geometry->profile->program AND had >=1 op scored vs the empirical cloud (band_scored_ops>0). Non-revolution bodies (electrodes, molds, toolholders, multi-body OP-setups) are correctly skipped as suspect -- never scored against bad geometry. Material is defaulted (1018/P) since STEP geometry does not carry it -- speeds/feeds scoring is therefore op-archetype-relative, not material-exact.
