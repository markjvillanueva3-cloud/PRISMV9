# Fanuc Post Processor Dialect (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Dialect - Master Level

## Key Characteristics
- G-code dialect used on majority of JM Die mills and lathes
- Strict block format requirements
- Specific canned cycle behavior (G73, G83, G84, etc.)

## PRISM Handling
- FanucPostProcessorEngine
- Strict address ordering (N, G, X, Y, Z, F, S, T, M)
- Modal G-code tracking
- Subprogram (M98/M99) support

## Edge Cases
- G28/G30 home positions with tool length compensation
- G50/G51 scaling with coordinate rotation
- Threading with G76/G92 on lathes

## Tribal Notes
- Always force G40/G49/G80 at tool change
- JM Die standard: All programs must end with M30 on separate line

**Last Updated:** 2026-06-12