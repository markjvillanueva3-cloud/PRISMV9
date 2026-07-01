# Builder Emulation and Primary Builder Patterns (BRAVO)

**Galaxy:** BRAVO (Hermes/Zulu Build + Stub Hunting)
**Status:** Core Capability - Master Level

## Description
Techniques for making AI agents behave like expert human builders — comprehensive, loop-enforced, gap-free, and self-improving.

## Key Patterns
- Primary Builder Emulation (prism_builder functions)
- Loop-enforced planning (4-LOOP, RGS)
- Critic/honesty integration
- Persistent memory of lessons
- No-gaps, comprehensive building standard

## PRISM Implementation
- `prism_builder:emulate_primary_builder` and related functions
- ZULU orchestration layer

## Edge Cases
- Overly rigid enforcement can slow down simple tasks
- Need for human override on edge cases

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)