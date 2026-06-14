# JM Die Lathe — Print→Program ROUNDTRIP Accuracy (Rung B)

_Generated 2026-06-03T19:17:32.781Z · stratified sample · 24 programs regenerated & scored (0 regen failures, 0 parse errors) · ±35% band · 28479 ms_

> Accuracy = PARAMETER-ENVELOPE AGREEMENT (op-coverage + SFM + IPR within ±band), NOT byte-match. Features are derived from the .MIN itself (no paired print PDF), so a miss reflects PRISM physics/data OR .MIN-derived-input divergence — the per-category punch list says which. This is the real measured number; it is NOT asserted as 100% unless the data earns it (R12).

> ⚠️ **LOWER BOUND, not a "PRISM is X% correct" verdict.** Every part is regenerated as 1018 steel / ISO-P (no per-.MIN material inference yet). Real JM die-shop lathe parts are frequently tool-steel / stainless / hardened, whose true cutting speeds run 2-4x LOWER than 1018. PRISM therefore recommends aggressive P-group speeds against ground-truth cut in harder material, so the SFM (and to a lesser extent IPR) axis SYSTEMATICALLY UNDER-SCORES. The headline % is a LOWER BOUND on PRISM's print->program fidelity, NOT a 'PRISM is X% correct' verdict. Closing this needs material inference (next rung) + a JM shop-profile speed/feed calibration override.

## Headline accuracy (LOWER BOUND — forced 1018 / ISO-P (FORCED — not print-derived; see KNOWN_LIMITATION_material_default))

- **Mean parameter-envelope accuracy: 41.6%** _(op-coverage carries it; SFM/IPR depressed by forced-material default)_
- Median 37.5% · p25 37.5% · p75 42.9%
- corpus: scanned 16558 · regenerated 24 · regen-fail 0 · parse-err 0 · skipped-no-groundtruth 0

## Per-axis agreement (vs JM master .MIN)

| axis | in-band % | n compared |
|----|----|----|
| op coverage | 100 | 66 |
| surface speed (SFM) | 8.5 | 47 |
| feed (IPR) | 6.3 | 63 |

## Data-optimization punch list (most-divergent op categories)

| op category | SFM misses | IPR misses | op-coverage misses |
|----|----|----|----|
| finish | 23 | 23 | 0 |
| rough | 19 | 19 | 0 |
| drill | 1 | 17 | 0 |

_Full data: `state/shared/dashboards/lathe-roundtrip-accuracy.json`. Rung A ground-truth cloud: `lathe-jmdie-param-accuracy.json`._
