# 5-Axis Toolpath Strategies (KILO)

**Galaxy:** KILO (CAM)
**Status:** Core Strategy - Master Level

## Description
Toolpath strategies that take advantage of 5-axis simultaneous movement for better access, optimized engagement, and reduced setups.

## Key Strategies
- 5-axis contouring
- Swarf milling
- 5-axis adaptive clearing
- Tilted workplane strategies
- Collision avoidance with rotary axes

## PRISM Implementation
- ToolpathStrategyRegistry supports 5-axis strategies
- Integration with 5-axis post-processors and machine kinematics

## JM Die Notes
- 5-axis strategies are essential for complex mold and die work
- Rule: Always verify collision-free toolpaths with full machine simulation

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)