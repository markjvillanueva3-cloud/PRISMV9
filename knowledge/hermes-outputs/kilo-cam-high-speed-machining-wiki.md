# High-Speed Machining Strategies (KILO)

**Galaxy:** KILO (CAM)
**Status:** Core Strategy - Master Level

## Description
High-speed machining (HSM) strategies that use high spindle speeds, low stepover, and optimized engagement to achieve high material removal rates with lower tool wear.

## Key Parameters
- Spindle speed: Often 15,000–40,000+ RPM
- Stepover: 5–15% of diameter
- Feedrate: Significantly higher than conventional
- Engagement angle: Constant and low (typically 10–30°)

## PRISM Implementation
- ToolpathStrategyRegistry includes HSM strategies
- Integrated with SpeedFeedOrchestratorEngine for optimal parameters

## JM Die Notes
- HSM is the default for most roughing and semi-finishing on tool steel
- Requires modern machines with high-speed spindles and good look-ahead

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)