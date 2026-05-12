---
name: PRISM Critical Commands
description: Essential slash commands that ALL sessions MUST know and AUTO-SUGGEST when triggers detected
type: reference
originSessionId: 3d6ed651-0899-4914-a085-33693ca5f94d
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
