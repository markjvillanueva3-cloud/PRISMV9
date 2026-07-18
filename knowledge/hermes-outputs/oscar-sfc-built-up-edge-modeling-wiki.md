# Built-Up Edge Modeling (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Advanced Topic - Master Level

## Description
Built-up edge (BUE) occurs when workpiece material adheres to the cutting edge, changing effective geometry and increasing forces unpredictably.

## Conditions for BUE
- Low cutting speeds
- Certain material/coating combinations (especially aluminum and some stainless)
- Insufficient rake angle

## PRISM Implementation
- SpeedFeedOrchestratorEngine includes BUE risk assessment
- Warning + parameter adjustment recommendations when BUE risk is high

## Edge Cases
- BUE can cause sudden force increases of 20–40%
- Often leads to poor surface finish and accelerated tool wear

## JM Die Notes
- BUE is a common issue on aluminum and certain stainless jobs at low speeds
- Rule: Increase speed or use more positive rake when BUE risk is flagged

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)