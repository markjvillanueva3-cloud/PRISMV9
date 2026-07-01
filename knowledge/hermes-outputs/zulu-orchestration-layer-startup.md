# ZULU Orchestration Layer — Startup Behavior

**Date:** 2026-06-12
**Mode:** YOLO Autonomous

## On Launch (Dedicated ZULU Window)

1. Automatically run `/checkin-zulu`
2. Perform full fleet state review using:
   - live-fleet-heartbeat.jsonl (last 24h)
   - AGENT_WORKBOARD.md
   - zulu-master-galaxy-bridge.md
   - Open units / gaps from previous sessions
   - Token usage trends
3. Generate and inject detailed, loop-enforced plans to every slot
4. Enforce the following loops in every plan:
   - 4-LOOP (Build → Scrutinize → Gap Fill → Tie Up)
   - RGS Loop (Research → Generate → Synthesize)
   - Self-review / meta-improvement loop
   - Critic / honesty loop
5. Include persistent memory references and token optimization guidelines
6. Push plans via bus + slot-briefs with minute-level detail

## Output Style
- Terse, outcome-first, user voice
- No gaps allowed
- Comprehensive coverage required
- Explicit loop enforcement at every step

**Status:** Design complete. Ready for implementation.