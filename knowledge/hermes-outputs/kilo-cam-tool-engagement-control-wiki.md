# Tool Engagement Control (KILO)

**Galaxy:** KILO (CAM)
**Status:** Core Strategy - Master Level

## Description
Maintaining consistent radial and axial engagement throughout the toolpath to stabilize cutting forces and improve tool life.

## Key Techniques
- Adaptive clearing / trochoidal
- Constant engagement angle
- Corner peeling / looping
- Ramping and helical entry

## PRISM Implementation
- ToolpathStrategyRegistry with engagement control
- Real-time engagement calculation in physics engine
- Integration with SpeedFeedOrchestratorEngine

## Tribal Notes
- JM Die strongly prefers constant engagement strategies for all roughing
- Avoids the common failure mode of sudden engagement spikes in corners

**Last Updated:** 2026-06-12