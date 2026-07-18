# Probing and Inspection Cycles (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Feature - Master Level

## Description
Support for in-process probing and inspection cycles (tool length, tool wear, workpiece alignment, feature measurement).

## Key Capabilities
- Tool length and diameter measurement
- Workpiece alignment and datum setting
- Feature measurement and SPC data collection
- Automatic tool wear compensation
- Integration with quality and metrology engines

## PRISM Implementation
- Probing cycle library in PostProcessorPipelineEngine
- Integration with QualityFeedbackEngine and MetrologyEngine
- Automatic parameter adjustment based on probe results

## JM Die Notes
- Probing is heavily used on complex and high-tolerance parts
- Rule: Always include probing cycles for critical features and first-article inspection

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)