# Dynamic Workflow / Harness Support (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Advanced Feature - Master Level

## Description
Support for agents that can write or modify their own post-processing logic (harnesses) on the fly, as described in recent "harness engineering" discussions.

## PRISM Vision
- Allow PostProcessorPipelineEngine to accept dynamic phase additions or modifications
- Support for task-specific harness generation under ZULU guidance
- Safety validation of any dynamically generated code or parameters

## Key Requirements
- All dynamic changes must pass full safety gates (Phase 6)
- Changes must be logged with provenance
- Human or ZULU approval required for production use

## Edge Cases
- Dynamic harness that bypasses a safety gate
- Inconsistent behavior between static and dynamic paths

## JM Die Notes
- Currently all post-processors are static
- Dynamic harness capability is planned for future advanced automation

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)