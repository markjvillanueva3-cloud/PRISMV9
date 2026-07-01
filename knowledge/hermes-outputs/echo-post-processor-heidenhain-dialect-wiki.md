# Heidenhain Post Processor Dialect (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Dialect - Master Level

## Key Characteristics
- Used on several high-precision 5-axis machines at JM Die
- Plain text conversational style + ISO G-code
- Extensive use of Q parameters and cycles

## PRISM Handling
- HeidenhainPostProcessorEngine
- Q-parameter management
- Canned cycle translation (CYCLE DEF)

## Edge Cases
- 5-axis with tilted working plane (PLANE SPATIAL)
- TCPM (Tool Center Point Management)
- Datum shift with 3D rotation

## Tribal Notes
- Always use Q parameters for feed and speed on Heidenhain
- JM Die standard: Prefer CYCLE DEF over G81-G89

**Last Updated:** 2026-06-12