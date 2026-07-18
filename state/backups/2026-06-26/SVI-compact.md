# PRISM System Variability Index
**Updated**: 2026-06-26T10:51:47.767Z
**SVI**: 1.6 × 10^46
**Reachability (Ψ)**: 100.0%
**Trend**: stable (Δ=0)
**SVI Watch**: stable across 12 targets

## Counts
| Subsystem | Entities | Dims | Variability | Wired% | Reachable |
|-----------|----------|------|-------------|--------|-----------|
| Materials | 9 | 8 | 72 | 100% | 72 |
| Tools | 95,608 | 10 | 956,080 | 100% | 956,080 |
| Machines | 910 | 14 | 12,740 | 100% | 12,740 |
| Tribal Tips | 13,399 | 2 | 26,798 | 100% | 26,798 |
| Handbooks | 0 | 11 | 0 | 100% | 0 |
| Formulas | 499 | 5 | 2,495 | 100% | 2,495 |
| Algorithms | 696 | 4 | 2,784 | 100% | 2,784 |
| Strategies | 762 | 8 | 6,096 | 100% | 6,096 |
| Engines | 3,672 | 3 | 11,016 | 100% | 11,016 |
| Dispatchers | 107 | 1 | 107 | 100% | 107 |
| Actions | 2,700 | 1 | 2,700 | 100% | 2,700 |
| Pipelines | 9 | 50 | 450 | 100% | 450 |
| Dialects | 20 | 38 | 760 | 100% | 760 |
| Tests | 4,866 | 3 | 14,598 | 100% | 14,598 |

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
SVI = ∏(subsystem_variability) ≈ 10^46.2
Ψ = reachable / total = 1,036,696 / 1,036,696 = 100.0%

*Every session should read this file. Every wiring improvement increases Ψ toward 1.0.*