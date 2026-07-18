---
name: reference_post_ship_domain-galaxy-doctrine-ms1-u-galaxy-ms1-b3-weekly-synthesis-populater
description: Auto-distilled learnings from shipping DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-B3-WEEKLY-SYNTHESIS-POPULATER (commit 52ff8005c). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.836Z
aliases: reference_post_ship_domain-galaxy-doctrine-ms1-u-galaxy-ms1-b3-weekly-synthesis-populater
---


# DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-B3-WEEKLY-SYNTHESIS-POPULATER

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOMAIN-GALAXY-DOCTRINE-MS1]/U-GALAXY-MS1-B3-WEEKLY-SYNTHESIS-POPULATER (slot:alpha iter27 yolo per directive): NEW scripts/weekly-memory-synthesis.mjs (94L) — populates the consumer the existing prism_memory:weekly_synthesis_get MCP action reads from but nothing previously populated (per SCOPE-EXPANSION §Q6 #3 / HERMES-MEMORY-VAULT-MS0 U-HMEMV06). Scans last-7-day memories by mtime, classifies by Domain-Galaxy via C1 routing JSON if present (else universal bucket), groups by galaxy + sorts newest-first per group, emits ISO-8601-weekly synthesis MD at knowledge/memories/weekly-synthesis/<YYYY-WW>.md with up to 20 entries per galaxy + age-days + kind + first-heading extraction. RAN LIVE: 2026-W22.md generated, **10091 entries across 5 galaxy buckets** (universal heaviest as expected pre-C1-migration; per-galaxy buckets populate as memory migration ships). HMEMV06 closed at script-layer; weekly cron registration deferred to operator. Cumulative this session: 41 commits ~5150L. **20 of 26 MS1 units now complete.**

**Shipped:** 2026-05-26T21:31:48-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[domain-galaxy-doctrine-ms1-u-galaxy-ms1-b3-weekly-synthesis-populater]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._