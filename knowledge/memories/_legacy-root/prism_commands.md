---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/prism_commands.md
source_filename: prism_commands.md
content_hash: ae467dca5c63f4bbca7d619e5cd3749228ab05f6f708b19b235c6f0b77284e20
mirror_ts: 2026-05-05T13:00:09.481Z
mirror_engine: ObsidianMemorySyncEngine
---
## CRITICAL SLASH COMMANDS — AUTO-SUGGEST WHEN TRIGGERED

### Learning Commands (HIGHEST PRIORITY)
- `/pdf-learn` — Triggers: pdf, document, manual, catalog, paper, extract
  - AI-powered PDF knowledge extraction into tribal tips/formulas
  - MUST suggest when ANY PDF/document is mentioned

- `/video-learn` — Triggers: video, youtube, tutorial, training, watch
  - AI-powered video knowledge extraction into procedures
  - MUST suggest when ANY video/tutorial is mentioned

- `/shop-knowledge` — Triggers: tribal, shop floor, operator, experience
  - Extract shop floor tribal knowledge

### Forge Commands (ALWAYS /dedup FIRST)
- `/dedup` — Triggers: duplicate, check, before creating
  - MANDATORY check before creating ANY new asset

- `/forge-triple` — Triggers: forge, create engine, build, new engine
  - Create engines + skills + hooks together
  - ALWAYS run /dedup FIRST

### Machine-Specific Commands
- `/wire-edm-studio` — Triggers: wire edm, wedm, mitsubishi edm
- `/lathe-studio` — Triggers: lathe, turning, okuma
- `/machine-harden` — Triggers: harden, strengthen, improve ai

### Optimization Commands
- `/auto-speed-feed` — Triggers: speed, feed, cutting parameters
- `/program-optimize` — Triggers: optimize, improve program
- `/scrutinize` — Triggers: scrutinize, deep review, audit

### Business Commands
- `/quote-to-ship` — Triggers: quote, estimate, job, pricing
- `/smart` — Triggers: smart, ai, intelligent

## AUTO-INVOKE RULES

When these patterns are detected, IMMEDIATELY suggest the command:
1. "pdf" mentioned → `/pdf-learn`
2. "video" mentioned → `/video-learn`
3. "create engine" → `/dedup` then `/forge-triple`
4. "wire edm" → `/wire-edm-studio`
5. "lathe/turning" → `/lathe-studio`

## How to Apply

Every session and subagent MUST know these commands. When user input matches triggers, PROACTIVELY suggest the relevant command.
