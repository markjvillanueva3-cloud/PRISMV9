---
name: reference_post_ship_domain-galaxy-doctrine-ms1-u-galaxy-ms1-g1-per-galaxy-engine-digest
description: Auto-distilled learnings from shipping DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-G1-PER-GALAXY-ENGINE-DIGEST (commit 527fd5be4). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.837Z
aliases: reference_post_ship_domain-galaxy-doctrine-ms1-u-galaxy-ms1-g1-per-galaxy-engine-digest
---


# DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-G1-PER-GALAXY-ENGINE-DIGEST

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOMAIN-GALAXY-DOCTRINE-MS1]/U-GALAXY-MS1-G1-PER-GALAXY-ENGINE-DIGEST (slot:alpha iter25 final-push): NEW scripts/generate-per-galaxy-engine-digest.mjs (115L) — per-galaxy ENGINE_DIGEST.md generator per SCOPE-EXPANSION §Q3 #1. Scans engines/<galaxy>/ subdirs + classifies flat-sibling Engine.ts files via filename-heuristic regex (10 galaxies have prefix patterns: mill/lathe/wedm/quoting/business/academy/post-processor/cad/cam/shop-floor). Emits one ENGINE_DIGEST.md per galaxy at mcp-server/data/docs/galaxies/<galaxy>/ with table-format 1-line-per-engine: name + size + location (subdir/flat) + purpose extracted from top JSDoc. RAN LIVE: **917 engines partitioned across 10 galaxies** — mill:180, lathe:201, wedm:166, post-processor:111, cad:107, cam:68, business:42, quoting:21, academy:12, shop-floor:9. Galaxy-local digest loads only when CWD-relevant (vs monolithic root ENGINE_DIGEST.md loading 150+ engines for every chat regardless) — saves ~3-5K tokens/SessionStart for chats not in that galaxy per the doctrine spec leverage estimate. Cumulative this session: 34 commits + 1 live settings.json + 3 live-classifier outputs (10089 memories + 51849 .md files + 917 engines) + 70 passing tests ~4500L. **15 of 26 MS1 units now complete.**

**Shipped:** 2026-05-26T21:18:33-05:00 by markjvillanueva3-cloud
**Files:** 12 touched

Full distillation: [[domain-galaxy-doctrine-ms1-u-galaxy-ms1-g1-per-galaxy-engine-digest]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._