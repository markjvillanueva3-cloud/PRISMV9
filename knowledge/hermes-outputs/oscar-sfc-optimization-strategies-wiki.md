# Optimization Strategies (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Core Topic - Master Level

## Description
Methods to maximize material removal rate (MRR) while respecting tool life, machine limits, and part quality.

## Key Strategies
- Trochoidal / adaptive clearing (constant engagement)
- High-speed machining with low stepover
- Chip thinning compensation
- Optimized entry/exit paths
- Variable helix / variable pitch tools

## PRISM Implementation
- ToolpathStrategyRegistry + SpeedFeedOrchestratorEngine integration
- Per-strategy parameter recommendations with UQ

## JM Die Notes
- Adaptive clearing is the default roughing strategy for most tool steel parts
- Significant tool life improvement observed when engagement is kept under 40%

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)