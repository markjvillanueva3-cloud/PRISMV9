# Size Effect in Kienzle Model (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Core Correction - Master Level

## Description
When chip thickness (h) becomes very small (< 0.1mm), the specific cutting force (kc) increases significantly due to the size effect.

## Correction Formula
kc_effective = kc1.1 · (h0 / h)^m_size

Where:
- h0 = Reference chip thickness (usually 0.1 or 1mm)
- m_size = Size effect exponent (0.1–0.3)

## PRISM Implementation
- SpeedFeedOrchestratorEngine applies size effect automatically
- Critical for finishing passes and micro-machining

## Edge Cases
- h < 0.02mm → Size effect can double kc
- Micro-milling requires full size effect modeling

**Last Updated:** 2026-06-12