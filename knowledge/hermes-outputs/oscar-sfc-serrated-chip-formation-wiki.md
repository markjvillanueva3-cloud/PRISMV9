# Serrated Chip Formation (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Advanced Topic - Master Level

## Description
Serrated (or saw-tooth) chips occur in difficult-to-machine materials (titanium, nickel alloys, hardened steel) and cause force fluctuations that can excite vibrations.

## Key Characteristics
- Periodic force variation
- Higher average forces than continuous chips
- Increased tool wear and risk of chipping

## PRISM Implementation
- SpeedFeedOrchestratorEngine includes serrated chip risk assessment
- Recommends lower engagement or adjusted speeds when risk is high

## Edge Cases
- Very common in titanium and nickel superalloys
- Can be mitigated with high-pressure coolant and specific coatings

## JM Die Notes
- Serrated chip formation is a major consideration on any S-group or H-group work
- Rule: Reduce engagement and increase coolant pressure when serrated chips are expected

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)