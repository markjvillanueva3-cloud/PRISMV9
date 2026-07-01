---
name: zulu-fleet-orchestrator
description: Core skill for ZULU to review fleet state and inject detailed, loop-enforced plans to every slot with no gaps.
version: 1.0.0
---

# zulu-fleet-orchestrator Skill

## Capabilities
- Fleet state review (heartbeat, workboard, gaps, token trends)
- Generation of loop-enforced plans (4-LOOP + RGS + critic + self-review)
- Injection of persistent memory references and token optimization guidelines
- Enforcement of comprehensive building with minute-level detail
- Critic/honesty pattern integration

## Trigger
- Runs automatically on ZULU window launch
- Can be manually triggered via `/zulu-orchestrate`

## Output
- Structured plans pushed to bus and slot-briefs
- Every plan explicitly requires the use of loops and forbids gaps

**Status:** Core skill defined. Ready for implementation.