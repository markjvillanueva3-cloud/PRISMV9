# Mazak Post Processor Dialect (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Dialect - Master Level

## Key Characteristics
- Used on several turning and milling centers at JM Die
- Mazatrol conversational + G-code hybrid
- Specific canned cycle and probing behavior

## PRISM Implementation
- MazakPostProcessorEngine
- Mazatrol to G-code translation layer
- Probing and inspection cycle support

## Edge Cases
- Mazatrol to ISO conversion quirks
- Live tooling and sub-spindle coordination
- High-speed machining modes

## JM Die Notes
- Mazak machines require careful handling of conversational vs G-code modes
- Rule: Prefer G-code output for consistency with other machines

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)