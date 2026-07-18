# Wire EDM Strategies and Dialects (MIKE)

**Galaxy:** MIKE (Wire)
**Status:** Core Strategy - Master Level

## Description
Wire EDM operations including roughing, finishing, and skim passes with multiple dialects and machine-specific behaviors.

## Key Strategies
- Multi-pass strategy (rough + multiple skims)
- Wire offset and compensation
- Flushing and wire tension management
- Taper and 4-axis strategies

## PRISM Implementation
- WireProgramAssemblerEngine supports 6 dialects
- Integrated with electrode/wire wear models

## JM Die Notes
- Multi-pass strategy is standard for all precision wire work
- Rule: Always use at least 3 passes (rough + 2 skims) for tolerances tighter than ±0.01mm

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)