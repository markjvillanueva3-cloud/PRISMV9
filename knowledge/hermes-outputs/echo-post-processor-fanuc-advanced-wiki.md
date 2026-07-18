# Fanuc Post Processor — Advanced Features (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Dialect - Master Level

## Key Advanced Features
- Modal state management and strict address formatting
- Macro (custom G/M code) support
- Probing and inspection cycle integration
- High-speed machining mode management (G187, G5.1)
- Tool life management and wear compensation

## PRISM Implementation
- FanucPostProcessorEngine with full macro and probing support
- Strict modal state tracking to prevent errors
- Integration with SpeedFeedOrchestratorEngine for per-block S/F output

## Edge Cases
- Macro variable conflicts
- Probing cycle coordinate system handling
- High-speed mode compatibility across different Fanuc versions

## JM Die Notes
- Fanuc is the most common control at JM Die
- Rule: Always output full modal state on every line for safety and readability

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)