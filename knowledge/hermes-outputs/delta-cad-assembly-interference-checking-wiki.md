# Assembly Interference Checking (DELTA)

**Galaxy:** DELTA (CAD)
**Status:** Core Capability - Master Level

## Description
Detection of interference between components in assemblies, including static and dynamic (motion) interference.

## PRISM Implementation
- Assembly analysis module in FeatureRecognitionEngine
- Integration with 3D model analysis and DFM workflows

## Key Challenges
- Large assemblies with many components
- Dynamic interference during motion
- Tolerance stack-up effects on interference

## JM Die Notes
- Assembly interference checking is critical for mold and die components with moving parts
- Rule: Always run full assembly interference check before releasing complex tooling designs

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)