# Block-by-Block Speed/Feed Variability (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Feature - Master Level

## Description
Per-block override of spindle speed and feedrate based on real-time physics, engagement, and safety constraints.

## PRISM Implementation
- PostProcessorPipelineEngine Phase 3 (Block-by-block)
- Integration with SpeedFeedOrchestratorEngine
- Per-block S(x) safety scoring

## Key Rules
- Never exceed machine power limit
- Maintain minimum chip thickness
- Respect chatter stability lobes
- Tool wear compensation

## Dialect Differences
- Fanuc: G50/G51 scaling + S override
- Siemens: $AC_SVELO + TRAORI interaction
- Heidenhain: Q parameters for dynamic S/F

**Last Updated:** 2026-06-12