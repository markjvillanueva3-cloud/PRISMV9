# Size Effect Deep Dive (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Advanced Topic - Master Level

## Description
As chip thickness decreases, the specific cutting force increases non-linearly due to the size effect. This is especially important in finishing and micro-machining.

## Mathematical Model
```
kc_effective = kc1.1 · (h_ref / h)^m
```

Where:
- h_ref = reference chip thickness (usually 0.1mm or 1mm)
- m = size effect exponent (typically 0.1–0.3)

## PRISM Implementation
- Fully implemented in KienzleForceModelEngine
- Critical for h < 0.1mm

## Edge Cases
- h < 0.02mm → kc can more than double
- Micro-milling requires full size effect modeling or results will be significantly under-predicted

## JM Die Notes
- Many finishing operations on hardened steel were force-limited until size effect was properly modeled
- Rule: Always apply size effect correction on finishing passes with h < 0.08mm

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)