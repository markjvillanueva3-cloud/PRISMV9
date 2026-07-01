# JM Die Post Processor Tribal Knowledge (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Practical Knowledge - Master Level

## Key Tribal Insights
- Always output full modal state on every line for Fanuc and Haas machines
- Use G187 for high-speed roughing on Mori Seiki and Mazak
- Probing cycles must be placed before critical finishing operations
- Tool life management is essential on long-running jobs
- Sub-spindle synchronization requires careful timing on mill-turn parts
- Error recovery blocks should be inserted after every major operation

## PRISM Implementation
- Tribal knowledge is injected into PostProcessorPipelineEngine via awareness system
- ZULU ensures these rules are applied during plan generation

## Edge Cases
- Older Fanuc controls have limited high-speed mode support
- Some machines require specific post-processor versions for probing

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)