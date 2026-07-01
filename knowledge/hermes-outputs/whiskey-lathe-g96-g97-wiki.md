# G96/G97 Constant Surface Speed (WHISKEY)

**Galaxy:** WHISKEY (Lathe)
**Status:** Core Feature - Master Level

## Description
G96 maintains constant surface speed by varying spindle RPM as diameter changes. G97 locks spindle speed.

## PRISM Implementation
- TurningPrintToProgramEngine supports both modes
- Automatic G96/G97 selection based on operation type and diameter range

## Key Considerations
- G96 is preferred for most turning operations
- G97 is required for threading, grooving, and parting to maintain consistent chip load
- Safety limits on maximum RPM

## JM Die Notes
- G96 is default for roughing and finishing
- Rule: Always use G97 for threading and parting operations

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)