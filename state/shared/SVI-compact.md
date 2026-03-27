# PRISM System Variability Index
**Updated**: 2026-03-27T22:50:04.301Z
**SVI**: 1.8 × 10^43
**Reachability (Ψ)**: 40.8%
**Trend**: stable (Δ=0)

## Counts
| Subsystem | Entities | Dims | Variability | Wired% | Reachable |
|-----------|----------|------|-------------|--------|-----------|
| Materials | 3 | 8 | 24 | 85% | 20.4 |
| Tools | 95,608 | 10 | 956,080 | 40% | 382,432 |
| Machines | 910 | 14 | 12,740 | 60% | 7,644 |
| Tribal Tips | 3,700 | 2 | 7,400 | 30% | 2,220 |
| Formulas | 499 | 5 | 2,495 | 70% | 1,746.5 |
| Algorithms | 208 | 4 | 832 | 55% | 457.6 |
| Strategies | 762 | 8 | 6,096 | 50% | 3,048 |
| Engines | 1,245 | 3 | 3,735 | 65% | 2,427.75 |
| Dispatchers | 77 | 1 | 77 | 90% | 69.3 |
| Actions | 2,700 | 1 | 2,700 | 85% | 2,295 |
| Pipelines | 9 | 50 | 450 | 100% | 450 |
| Dialects | 20 | 38 | 760 | 80% | 608 |
| Tests | 816 | 3 | 2,448 | 100% | 2,448 |

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
SVI = ∏(subsystem_variability) ≈ 10^43.25
Ψ = reachable / total = 405,866.55 / 995,837 = 40.8%

*Every session should read this file. Every wiring improvement increases Ψ toward 1.0.*