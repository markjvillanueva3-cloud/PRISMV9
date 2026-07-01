# Collision Avoidance and Simulation (KILO)

**Galaxy:** KILO (CAM)
**Status:** Core Capability - Master Level

## Description
Detection and avoidance of collisions between tool, holder, machine components, and part/fixture during toolpath generation and verification.

## PRISM Implementation
- Collision detection in ToolpathStrategyRegistry and simulation engines
- Integration with machine kinematics for accurate 5-axis simulation
- Automatic toolpath modification or warning when collision is detected

## Key Challenges
- Accurate machine and fixture models
- 5-axis collision detection complexity
- Balancing collision avoidance with optimal engagement

## JM Die Notes
- Full machine simulation is mandatory for all 5-axis and mill-turn work
- Rule: Never trust a toolpath without full collision verification on complex parts

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)