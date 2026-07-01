# 3-Axis Milling Strategies (FOXTROT)

**Galaxy:** FOXTROT (Mill)
**Status:** Core Strategy - Master Level

## Description
Standard 3-axis milling strategies for pocketing, profiling, facing, and drilling operations.

## Key Strategies
- Adaptive / trochoidal clearing for roughing
- High-speed machining with low stepover
- Conventional vs climb milling selection
- Rest machining and semi-finishing
- Finishing with constant Z or 3D contour

## PRISM Implementation
- Milling Wizard + ToolpathStrategyRegistry
- Integrated with SpeedFeedOrchestratorEngine for optimal parameters

## JM Die Notes
- Adaptive clearing is the default for most pocketing in tool steel
- Climb milling is preferred for most operations except when using older machines or specific coatings

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)