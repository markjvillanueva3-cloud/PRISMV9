# Tool Nose Radius Compensation (TNRC) (WHISKEY)

**Galaxy:** WHISKEY (Lathe)
**Status:** Core Feature - Master Level

## Description
TNRC (G41/G42) compensates for the tool nose radius so the programmed path follows the desired part geometry rather than the tool center.

## PRISM Implementation
- TurningPrintToProgramEngine supports TNRC with proper offset calculation
- Automatic nose radius selection based on tool and operation

## Key Considerations
- Correct nose radius must be entered in tool offset
- Lead-in/lead-out paths must account for compensation direction
- G40 cancellation at end of operation

## JM Die Notes
- TNRC is used on virtually all turning operations
- Rule: Always verify nose radius compensation direction before running

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)