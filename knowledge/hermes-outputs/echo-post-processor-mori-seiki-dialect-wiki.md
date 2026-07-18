# Mori Seiki Post Processor Dialect (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Dialect - Master Level

## Key Characteristics
- Used on several high-end turning and milling centers
- MAPPS control system
- Strong 5-axis and mill-turn support

## PRISM Implementation
- MoriSeikiPostProcessorEngine
- MAPPS-specific variable and cycle handling
- Advanced 5-axis and mill-turn coordination

## Edge Cases
- Complex mill-turn synchronization
- 5-axis simultaneous with specific post requirements
- Sub-spindle and live tooling management

## JM Die Notes
- Mori Seiki machines are among the most capable at JM Die
- Rule: Use full 5-axis post capabilities for complex parts

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)