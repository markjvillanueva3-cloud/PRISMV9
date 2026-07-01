# High-Speed Machining Modes (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Feature - Master Level

## Description
Support for high-speed machining modes (G187, G5.1, G120, etc.) and related look-ahead, smoothing, and feedrate control features.

## Key Capabilities
- High-speed mode activation and configuration
- Look-ahead and corner rounding control
- Feedrate override and acceleration management
- Integration with SpeedFeedOrchestratorEngine

## PRISM Implementation
- High-speed mode logic in PostProcessorPipelineEngine
- Automatic mode selection based on operation type
- Integration with physics and safety engines

## JM Die Notes
- High-speed modes are critical for modern machines
- Rule: Always match high-speed mode to the operation and material

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)