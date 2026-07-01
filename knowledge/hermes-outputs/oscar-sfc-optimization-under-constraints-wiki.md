# Optimization Under Constraints (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Advanced Topic - Master Level

## Description
Finding optimal parameters when multiple constraints are active (power, torque, stability, tool life, surface finish, etc.).

## PRISM Approach
- Multi-objective optimization in SpeedFeedOrchestratorEngine
- Constraint prioritization and trade-off analysis
- UQ to understand risk under uncertainty

## Key Constraints
- Machine power and torque
- Chatter stability
- Tool life / cost per part
- Surface finish requirements
- Chip evacuation limits

## JM Die Notes
- Most real jobs are multi-constraint problems
- Best results come from understanding which constraint is active and optimizing around it

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)