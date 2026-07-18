# JM Die Lathe — Print→Program Parameter Accuracy (Rung A)

_Generated 2026-06-26T17:27:54.585Z · full sample · 34993 programs analyzed (0 parse errors) · 9877 ms_

> This measures PRISM-reproducible parameters against JM master-programmer real output. It is NOT a full print->program->post roundtrip (lathe generator adapter is still a stub). Accuracy %s reported by downstream agents are physics-envelope agreement, not byte-match.

## Real-world parameter cloud (what JM master programmers actually run)

**Feed (IPR)** — p05 0.001 · p25 0.002 · **p50 0.0033** · p75 0.006 · p95 0.01 (n=662415)

**Surface speed (SFM, implied from G97 RPM × dia)** — p05 11.623893 · p25 100 · **p50 182.212374** · p75 284.722542 · p95 1500 (n=646020)

**Surface speed (SFM, programmed G96 CSS literals — artifact-free)** — p05 100 · p25 150 · **p50 250** · p75 450 · p95 1500 (n=57263)

avg tools/program 5.4 · threading 3% · part-off 0% · drill 66.7%

## Chip-control reference — feed & speed by operation

| op | feed p50 (IPR) | feed p05–p95 | SFM p50 | SFM p05–p95 | n |
|----|----|----|----|----|----|
| finish | 0.003 | 0.001–0.005 | 150 | 10.262536–1500 | 452934 |
| rough | 0.008 | 0.006–0.02 | 250 | 11.519173–1500 | 167042 |
| drill | 0.002 | 0.001–0.01 | 1500 | 6.652322–1500 | 42439 |
| rapid | — | —–— | 200 | 41.887902–904.614484 | 0 |

## Safety compliance (G96 CSS ⇒ G50 max-RPM cap)

- G96 (CSS) programs: **31347**
- G97 (constant RPM) programs: 32956
- G96 WITH G50 cap: 30802
- **G96 WITHOUT cap (overspeed risk): 545**
- G50 cap compliance on CSS programs: **98.3%**
- RPM cap distribution (RPM): p50 1000 · p95 1500 (n=34268)

_Full data: `state/shared/dashboards/lathe-jmdie-param-accuracy.json`_
