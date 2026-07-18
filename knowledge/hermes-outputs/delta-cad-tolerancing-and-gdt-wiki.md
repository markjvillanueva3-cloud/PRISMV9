# Tolerancing and GD&T (DELTA)

**Galaxy:** DELTA (CAD)
**Status:** Core Capability - Master Level

## Description
Interpretation and application of dimensional and geometric tolerancing from drawings and models.

## Key Capabilities
- GD&T parsing and validation
- Tolerance stack-up analysis
- Datum reference frame management
- Feature control frame interpretation

## PRISM Implementation
- GD&T module in FeatureRecognitionEngine
- Integration with DFMFeedbackEngine for tolerance impact analysis

## JM Die Notes
- Many legacy drawings use mixed tolerancing standards
- Rule: Always clarify ambiguous datums and tolerances with engineering before programming

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)