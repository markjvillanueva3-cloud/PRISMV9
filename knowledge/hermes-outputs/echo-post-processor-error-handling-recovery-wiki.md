# Error Handling and Recovery (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Feature - Master Level

## Description
Robust error handling, safety checks, and recovery mechanisms in post processors.

## Key Capabilities
- Modal state validation
- Axis limit and collision checking
- Tool life and wear monitoring
- Automatic recovery from common errors
- Safety interlocks and warnings

## PRISM Implementation
- Comprehensive error checking in PostProcessorPipelineEngine
- Integration with SafetyEngine and ChainFailureRecoveryEngine
- Automatic insertion of safety blocks and warnings

## JM Die Notes
- Error handling has prevented many crashes and scrapped parts
- Rule: Always include safety checks and clear error messages

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)