# Okuma Post Processor — Advanced Features (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Dialect - Master Level

## Key Advanced Features
- OSP control system specifics
- Advanced 5-axis and mill-turn coordination
- Sub-spindle and live tooling synchronization
- High-speed machining mode management
- Tool life management and wear compensation

## PRISM Implementation
- OkumaPostProcessorEngine with full OSP support
- Complex mill-turn post logic
- 5-axis simultaneous with specific safety checks

## Edge Cases
- Sub-spindle synchronization with main spindle
- 5-axis with specific post requirements
- Live tooling with C-axis coordination

## JM Die Notes
- Okuma machines are among the most capable at JM Die
- Rule: Use full post capabilities for complex mill-turn parts

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)