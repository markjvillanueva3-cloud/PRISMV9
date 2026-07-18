# Interrupted Cutting Model (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Advanced Topic - Master Level

## Description
Interrupted cutting (e.g., milling with entry/exit, facing with gaps, or turning with keyways) causes force spikes and increased tool wear not captured by continuous cutting models.

## Key Effects
- Sudden force increases on entry
- Reduced tool life due to thermal cycling
- Higher risk of chipping and fracture

## PRISM Implementation
- SpeedFeedOrchestratorEngine includes interrupted cutting factor
- Dynamic feed reduction on entry/exit paths

## Edge Cases
- High lead angle + interrupted cutting = very high risk
- Ceramic tools are especially sensitive to interruption

## JM Die Notes
- Many tool failures on facing and profiling operations were due to ignoring interrupted cutting effects
- Rule: Reduce feed 20-30% on entry/exit for interrupted operations

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)