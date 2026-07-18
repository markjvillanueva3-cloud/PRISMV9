# Electrode Design and Wear Compensation (MIKE)

**Galaxy:** MIKE (Wire)
**Status:** Core Capability - Master Level

## Description
Design and preparation of electrodes for sinker EDM, including wear compensation strategies and multi-electrode approaches.

## Key Considerations
- Electrode material selection (graphite grades, copper)
- Wear compensation (uniform wear, orbital, multiple electrodes)
- Undersize/oversize calculations
- Electrode holder and alignment systems

## PRISM Implementation
- Electrode design rules in DFMFeedbackEngine
- Integration with Wire/Sinker EDMProgramAssemblerEngine

## JM Die Notes
- Multiple electrode strategy is standard for deep or complex cavities
- Rule: Design at least 3 electrodes (rough, semi-finish, finish) for cavities deeper than 20mm

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)