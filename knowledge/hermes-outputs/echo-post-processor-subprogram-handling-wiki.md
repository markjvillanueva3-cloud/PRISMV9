# Subprogram and Macro Handling (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Feature - Master Level

## Description
Proper handling of subprograms (M98/M99, L calls, etc.) and macros during post-processing.

## PRISM Implementation
- Subprogram tracking in the pipeline
- Modal state preservation across subprogram calls
- Proper nesting and return handling

## Dialect Differences
- Fanuc: M98/M99 with P and L
- Haas: Similar to Fanuc with some differences in nesting
- Okuma: Different subprogram syntax
- Heidenhain: LABEL and CALL

## Edge Cases
- Tool changes inside subprograms
- Coordinate system changes inside subprograms
- Modal G-code state after subprogram return

**Last Updated:** 2026-06-12