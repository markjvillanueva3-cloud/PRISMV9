# Okuma Post Processor Dialect (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Dialect - Master Level

## Key Characteristics
- Used on several turning and milling centers at JM Die
- OSP-P and OSP-300/500 controls
- Specific canned cycle syntax and variable usage

## PRISM Implementation
- OkumaPostProcessorEngine
- OSP-specific variable management (V, W, etc.)
- Canned cycle translation with safety checks

## Edge Cases
- G71/G72 rough turning cycles with tool nose radius
- G73 pattern repeating cycle
- Sub-spindle and live tooling coordination

## JM Die Notes
- Okuma programs require specific end-of-program formatting
- Rule: Always reset tool offsets and coordinate systems at end of operation

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)