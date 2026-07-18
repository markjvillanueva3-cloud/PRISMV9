# Mazak Post Processor — Advanced Features (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Dialect - Master Level

## Key Advanced Features
- Mazatrol conversational + G-code hybrid
- Specific canned cycle and probing behavior
- Live tooling and sub-spindle synchronization
- High-speed machining mode management

## PRISM Implementation
- MazakPostProcessorEngine
- Mazatrol to G-code translation layer
- Probing and inspection cycle support

## Edge Cases
- Mazatrol to ISO conversion quirks
- Live tooling with C-axis coordination
- High-speed machining modes (G187)

## JM Die Notes
- Mazak machines require careful handling of conversational vs G-code modes
- Rule: Prefer G-code output for consistency with other machines

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)