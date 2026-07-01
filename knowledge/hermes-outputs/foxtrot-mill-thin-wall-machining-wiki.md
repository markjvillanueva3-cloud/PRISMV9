# Thin Wall Machining (FOXTROT)

**Galaxy:** FOXTROT (Mill)
**Status:** Core Strategy - Master Level

## Description
Strategies for machining thin-walled parts without distortion or vibration, including support structures, optimized engagement, and deflection compensation.

## Key Techniques
- Low engagement angles to reduce force
- Support structures or fixtures
- Climb milling direction management
- Toolpath strategies that avoid full engagement
- Deflection compensation in finishing

## PRISM Implementation
- Thin wall detection in FeatureRecognitionEngine
- Specialized thin wall strategies in ToolpathStrategyRegistry
- Deflection modeling in SpeedFeedOrchestratorEngine

## JM Die Notes
- Thin wall work is common in mold and die components
- Rule: Never use full radial engagement on walls thinner than 4mm without support

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)