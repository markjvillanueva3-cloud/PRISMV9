# PRISM System Variability Index
**Updated**: 2026-04-16T01:03:39.420Z
**SVI**: 7.2 × 10^43
**Reachability (Ψ)**: 40.9%
**Trend**: stable (Δ=0)
**SVI Watch**: stable across 12 targets

## Counts
| Subsystem | Entities | Dims | Variability | Wired% | Reachable |
|-----------|----------|------|-------------|--------|-----------|
| Materials | 3 | 8 | 24 | 85% | 20.4 |
| Tools | 95,608 | 10 | 956,080 | 40% | 382,432 |
| Machines | 910 | 14 | 12,740 | 60% | 7,644 |
| Tribal Tips | 5,124 | 2 | 10,248 | 30% | 3,074.4 |
| Handbooks | 0 | 11 | 0 | 45% | 0 |
| Formulas | 499 | 5 | 2,495 | 70% | 1,746.5 |
| Algorithms | 212 | 4 | 848 | 55% | 466.4 |
| Strategies | 762 | 8 | 6,096 | 50% | 3,048 |
| Engines | 1,752 | 3 | 5,256 | 65% | 3,416.4 |
| Dispatchers | 85 | 1 | 85 | 90% | 76.5 |
| Actions | 2,700 | 1 | 2,700 | 85% | 2,295 |
| Pipelines | 9 | 50 | 450 | 100% | 450 |
| Dialects | 20 | 38 | 760 | 80% | 608 |
| Tests | 1,504 | 3 | 4,512 | 100% | 4,512 |

## Pipelines
| Pipeline | Stages | Registries | Formulas | Dialects | Reach |
|----------|--------|------------|----------|----------|-------|
| PrintToProgram | 12 | materials,tools,machines,strategies | 15 | 20 | 90% |
| Turning | 10 | materials,tools,machines | 12 | 20 | 74% |
| MultiAxis | 14 | materials,tools,machines,strategies | 18 | 15 | 91% |
| MillTurn | 16 | materials,tools,machines,strategies | 20 | 12 | 92% |
| EDM | 8 | materials,machines | 6 | 6 | 38% |
| Grinding | 10 | materials,tools,machines | 8 | 6 | 52% |
| Laser | 8 | materials,machines | 5 | 7 | 37% |
| Waterjet | 8 | materials,machines | 5 | 6 | 36% |
| QuoteToShip | 21 | materials,tools,machines | 10 | 1 | 51% |

## Formula
SVI = ∏(subsystem_variability) ≈ 10^43.86
Ψ = reachable / total = 409,789.6 / 1,002,294 = 40.9%

*Every session should read this file. Every wiring improvement increases Ψ toward 1.0.*