# Tool Life Management and Wear Compensation (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Feature - Master Level

## Description
Support for tool life monitoring, wear compensation, and automatic tool change / offset adjustment.

## Key Capabilities
- Tool life tracking and prediction
- Wear compensation and offset adjustment
- Automatic tool change and pre-setting
- Integration with ToolRegistry and wear models

## PRISM Implementation
- Tool life logic in PostProcessorPipelineEngine
- Integration with SpeedFeedOrchestratorEngine and wear models
- Automatic offset and compensation insertion

## JM Die Notes
- Tool life management has significantly improved uptime and quality
- Rule: Always track tool life and apply wear compensation on critical features

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)