# Swiss and Mill-Turn Strategies (WHISKEY)

**Galaxy:** WHISKEY (Lathe)
**Status:** Core Strategy - Master Level

## Description
Strategies for Swiss-type and mill-turn machines that combine turning and milling operations in a single setup.

## Key Strategies
- Main spindle + sub-spindle coordination
- Live tooling and C-axis milling
- B-axis milling on turning centers
- Multi-axis synchronization

## PRISM Implementation
- MillTurnSwissPipelineEngine
- Integrated post-processing for multi-channel machines

## JM Die Notes
- Swiss and mill-turn work is increasingly common for complex small parts
- Rule: Always simulate full machine kinematics for multi-spindle jobs

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)