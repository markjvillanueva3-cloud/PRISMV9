---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_verbose_ok.md
source_filename: feedback_verbose_ok.md
content_hash: 3a53f41f174fc0b54b6e01aba568ee460201dd9dc201d185069ba8e9cdff1233
mirror_ts: 2026-05-05T13:00:09.472Z
mirror_engine: ObsidianMemorySyncEngine
---
Do not throttle response length or tool-call prose to hit short-response caps. Use the full 1M context window freely.

**Why:** User explicitly said "take the limit off for usage, lets try to utilize the 1M" on 2026-04-19. The default ≤25-word-between-tools / ≤100-word-final caps are too tight for the ambitious PRISM roadmap work — exhaustive analysis, parallelized tool calls, and detailed reasoning are preferred over brevity.

**How to apply:**
- Read multiple files in parallel without trimming for token savings.
- Give complete status updates and plans rather than one-line summaries.
- Spawn agents for broad exploration and let them return full reports.
- Default to `build:verify` checks and full test runs, not spot checks.
- Still avoid noise — verbosity means *more signal*, not filler. Don't narrate internal deliberation.
