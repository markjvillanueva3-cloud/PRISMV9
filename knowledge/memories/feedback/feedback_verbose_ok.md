---
name: Verbose responses OK — utilize 1M context
description: User prefers expansive, thorough work over terse responses; use the full 1M context window
type: feedback
originSessionId: d41ee4f8-64e2-4a78-80d7-0b57e2a2fd67
---
Do not throttle response length or tool-call prose to hit short-response caps. Use the full 1M context window freely.

**Why:** User explicitly said "take the limit off for usage, lets try to utilize the 1M" on 2026-04-19. The default ≤25-word-between-tools / ≤100-word-final caps are too tight for the ambitious PRISM roadmap work — exhaustive analysis, parallelized tool calls, and detailed reasoning are preferred over brevity.

**How to apply:**
- Read multiple files in parallel without trimming for token savings.
- Give complete status updates and plans rather than one-line summaries.
- Spawn agents for broad exploration and let them return full reports.
- Default to `build:verify` checks and full test runs, not spot checks.
- Still avoid noise — verbosity means *more signal*, not filler. Don't narrate internal deliberation.
