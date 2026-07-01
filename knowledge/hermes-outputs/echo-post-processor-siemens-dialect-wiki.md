# Siemens Post Processor Dialect (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Dialect - Master Level

## Key Characteristics
- Used on several 5-axis machines at JM Die
- TRAORI / TRAORI2 transformation
- Specific canned cycle syntax (CYCLE81, CYCLE82, etc.)

## PRISM Handling
- SiemensPostProcessorEngine
- TRAORI mode tracking
- ShopMill / ShopTurn compatibility layer

## Edge Cases
- 5-axis simultaneous with TRAORI
- Swivel head kinematics
- CYCLE drilling with chip breaking

## Tribal Notes
- Always reset TRAORI at end of operation
- JM Die standard: Use CYCLE calls instead of G81-G89 where possible

**Last Updated:** 2026-06-12