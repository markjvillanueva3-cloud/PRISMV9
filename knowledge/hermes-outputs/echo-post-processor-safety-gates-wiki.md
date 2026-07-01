# Post Processor Safety Gates (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Feature - Master Level

## Description
Multi-layer safety system that validates every block before output.

## PRISM Implementation
- Phase 6 (Safety) of PostProcessorPipelineEngine
- S(x) safety scoring per block
- Hard stops on power, force, and stability limits

## Key Gates
- Maximum spindle speed per machine
- Maximum feedrate
- Power limit check
- Chatter stability check
- Tool reach and collision

## Dialect Variations
- Fanuc: Strict modal state tracking
- Siemens: TRAORI safety integration
- Heidenhain: Q-parameter validation

**Last Updated:** 2026-06-12