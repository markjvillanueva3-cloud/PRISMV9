# Heidenhain Post Processor — Advanced Features (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Dialect - Master Level

## Key Advanced Features
- Plain text + ISO G-code dual mode
- Extended canned cycles and probing
- High-speed machining mode management
- 5-axis simultaneous with specific safety checks
- Tool and workpiece measurement cycles

## PRISM Implementation
- HeidenhainPostProcessorEngine with full plain text and ISO support
- Advanced probing and inspection cycle support
- Integration with quality and metrology engines

## Edge Cases
- Plain text vs ISO output decisions
- Probing cycle coordinate system handling
- 5-axis with specific post requirements

## JM Die Notes
- Heidenhain machines are used for high-precision work at JM Die
- Rule: Use plain text output for conversational-style programs when appropriate

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)