# PRISM System Variability Index
**Updated**: 2026-05-02T20:04:49.407Z
**SVI**: 2.4 × 10^42
**Reachability (Ψ)**: 97.7%
**Trend**: stable (Δ=0)
**SVI Watch**: standalone refresh (no watch targets)

## Counts
| Subsystem | Entities | Dims | Variability | Wired% | Reachable |
|-----------|----------|------|-------------|--------|-----------|
| Materials | 3 | 8 | 24 | 95% | 22.8 |
| Tools | 95,608 | 10 | 956,080 | 98% | 936,958.4 |
| Machines | 910 | 14 | 12,740 | 95% | 12,103 |
| Tribal Tips | 3,700 | 2 | 7,400 | 80% | 5,920 |
| Handbooks | 0 | 11 | 0 | 78% | 0 |
| Formulas | 499 | 5 | 2,495 | 95% | 2,370.25 |
| Algorithms | 208 | 4 | 832 | 85% | 707.2 |
| Strategies | 762 | 8 | 6,096 | 90% | 5,486.4 |
| Engines | 1,245 | 3 | 3,735 | 88% | 3,286.8 |
| Dispatchers | 77 | 1 | 77 | 98% | 75.46 |
| Actions | 2,700 | 1 | 2,700 | 96% | 2,592 |
| Pipelines | 9 | 50 | 450 | 100% | 450 |
| Dialects | 20 | 38 | 760 | 95% | 722 |
| Tests | 111 | 3 | 333 | 100% | 333 |

## Pipelines
| Pipeline | Stages | Registries | Formulas | Dialects | Reach |
|----------|--------|------------|----------|----------|-------|
| PrintToProgram | 26 | materials,tools,machines,strategies | 18 | 20 | 94% |
| Turning | 10 | materials,tools,machines | 12 | 20 | 78% |
| MultiAxis | 14 | materials,tools,machines,strategies | 18 | 15 | 93% |
| MillTurn | 16 | materials,tools,machines,strategies | 20 | 12 | 93% |
| EDM | 8 | materials,machines | 6 | 6 | 72% |
| Grinding | 10 | materials,tools,machines | 8 | 6 | 68% |
| Laser | 8 | materials,machines | 5 | 7 | 58% |
| Waterjet | 8 | materials,machines | 5 | 6 | 55% |
| QuoteToShip | 21 | materials,tools,machines | 12 | 1 | 72% |

## Formula
SVI = ∏(subsystem_variability) ≈ 10^42.38
Ψ = reachable / total = 971,027.31 / 993,722 = 97.7%

*Every session should read this file. Every wiring improvement increases Ψ toward 1.0.*