# JM Die Lathe — Print→Program Parameter Accuracy (Rung A)

_Generated 2026-06-03T05:31:15.816Z · stratified sample · 800 programs analyzed (0 parse errors) · 119792 ms_

> This measures PRISM-reproducible parameters against JM master-programmer real output. It is NOT a full print->program->post roundtrip (lathe generator adapter is still a stub). Accuracy %s reported by downstream agents are physics-envelope agreement, not byte-match.

## Real-world parameter cloud (what JM master programmers actually run)

**Feed (IPR)** — p05 0.001 · p25 0.0015 · **p50 0.003** · p75 0.005 · p95 0.01 (n=11096)

**Surface speed (SFM, implied from G97 RPM × dia)** — p05 15.393804 · p25 103.044239 · **p50 188.495559** · p75 250 · p95 550 (n=10565)

**Surface speed (SFM, programmed G96 CSS literals — artifact-free)** — p05 100 · p25 150 · **p50 200** · p75 350 · p95 550 (n=1415)

avg tools/program 5.2 · threading 5.6% · part-off 0.1% · drill 71%

## Chip-control reference — feed & speed by operation

| op | feed p50 (IPR) | feed p05–p95 | SFM p50 | SFM p05–p95 | n |
|----|----|----|----|----|----|
| finish | 0.0025 | 0.001–0.005 | 150 | 11.780972–550 | 7961 |
| rough | 0.007 | 0.006–0.02 | 250 | 31.808626–600 | 1982 |
| drill | 0.002 | 0.001–0.02 | 300 | 6.011438–1500 | 1153 |
| rapid | — | —–— | 150 | 37.437312–500 | 0 |

## Safety compliance (G96 CSS ⇒ G50 max-RPM cap)

- G96 (CSS) programs: **759**
- G97 (constant RPM) programs: 775
- G96 WITH G50 cap: 740
- **G96 WITHOUT cap (overspeed risk): 19**
- G50 cap compliance on CSS programs: **97.5%**
- RPM cap distribution (RPM): p50 800 · p95 1500 (n=779)

_Full data: `state/shared/dashboards/lathe-jmdie-param-accuracy.json`_
