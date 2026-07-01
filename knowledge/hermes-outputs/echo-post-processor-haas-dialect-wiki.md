# Haas Post Processor Dialect (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Dialect - Master Level

## Key Characteristics
- Very common on JM Die mills
- G-code very close to Fanuc but with some Haas-specific behaviors
- Extensive use of macros and variables

## PRISM Implementation
- HaasPostProcessorEngine
- Macro variable management
- Specific canned cycle and probing support

## Edge Cases
- G28/G53 home positioning differences from Fanuc
- Probing cycles (G65 Pxxxx) with specific variable usage
- High-speed machining modes (G187)

## JM Die Notes
- Haas machines are the most common at JM Die
- Rule: Use G53 for all absolute positioning to avoid work offset issues

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)