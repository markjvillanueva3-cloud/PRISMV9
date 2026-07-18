# Adaptive Clearing Strategy (KILO)

**Galaxy:** KILO (CAM)
**Status:** Core Strategy - Master Level

## Description
Modern high-speed roughing strategy that maintains constant tool engagement through trochoidal and adaptive motion.

## Key Parameters
- Stepover: 5–15% of diameter (much lower than traditional)
- Engagement angle: Constant (typically 20–40°)
- Feedrate: Significantly higher than conventional

## PRISM Implementation
- ToolpathStrategyRegistry includes adaptive clearing
- Integrated with SpeedFeedOrchestratorEngine for per-block S/F

## Advantages
- Much higher MRR than traditional roughing
- Lower tool wear due to consistent load
- Better chip evacuation

## JM Die Notes
- Preferred strategy for all pocketing and profiling in tool steel
- Requires modern control with look-ahead

**Last Updated:** 2026-06-12