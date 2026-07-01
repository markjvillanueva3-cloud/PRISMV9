# GD&T and Tolerancing (DELTA)

**Galaxy:** DELTA (CAD)
**Status:** Core Capability - Master Level

## Description
Interpretation and application of Geometric Dimensioning and Tolerancing (GD&T) from drawings, including feature control frames, datums, and tolerance zones.

## PRISM Implementation
- GD&T parsing in FeatureRecognitionEngine
- Tolerance zone calculation and DFM impact analysis
- Integration with inspection and metrology workflows

## Key Challenges
- Legacy drawings with mixed GD&T and coordinate tolerancing
- Incomplete or ambiguous datum definitions
- Complex tolerance stack-ups

## JM Die Notes
- Many legacy drawings require interpretation of non-standard GD&T usage
- Rule: Always clarify ambiguous datums with engineering before programming

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)