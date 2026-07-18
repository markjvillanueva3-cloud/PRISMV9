# Persistent Memory Patterns (ALPHA)

**Galaxy:** ALPHA (Token Optimization + Obsidian + Memory)
**Status:** Core Capability - Master Level

## Description
Patterns for maintaining long-term, updatable memory across sessions so agents improve over time and retain context.

## Key Patterns
- Per-slot and per-galaxy memory stores
- Structured lesson logging (what worked, what failed, why)
- Memory retrieval and injection at context construction time
- Self-review loops that update memory

## PRISM Implementation
- Central to ZULU orchestration and per-slot persistent memory
- Integrated with the awareness injection system

## Edge Cases
- Memory bloat and retrieval noise
- Staleness of old lessons

## JM Die Notes
- Persistent memory is essential for slots to improve over time
- Rule: Every major unit should produce at least one documented lesson

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)