# Haas Post Processor — Advanced Features (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Dialect - Master Level

## Key Advanced Features
- Next Generation Control (NGC) specifics
- High-speed machining mode management
- Probing and inspection cycle support
- Tool life management and wear compensation
- 5-axis and mill-turn coordination

## PRISM Implementation
- HaasPostProcessorEngine with full NGC support
- Advanced probing and inspection cycle support
- Integration with SpeedFeedOrchestratorEngine

## Edge Cases
- NGC vs classic control differences
- Probing cycle coordinate system handling
- 5-axis with specific post requirements

## JM Die Notes
- Haas machines are very common at JM Die
- Rule: Always output full modal state on every line for safety

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)