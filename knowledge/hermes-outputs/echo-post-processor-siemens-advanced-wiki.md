# Siemens Post Processor — Advanced Features (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Dialect - Master Level

## Key Advanced Features
- ShopMill and ShopTurn conversational integration
- Advanced 5-axis and mill-turn coordination
- Probing and inspection cycle support
- High-speed machining mode management
- Tool and workpiece measurement cycles

## PRISM Implementation
- SiemensPostProcessorEngine with full ShopMill/ShopTurn support
- Complex 5-axis and mill-turn post logic
- Probing cycle integration with quality engines

## Edge Cases
- ShopMill to ISO conversion quirks
- 5-axis with specific post requirements
- Live tooling with C-axis coordination

## JM Die Notes
- Siemens machines require careful handling of conversational vs G-code modes
- Rule: Prefer G-code output for consistency with other machines

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)