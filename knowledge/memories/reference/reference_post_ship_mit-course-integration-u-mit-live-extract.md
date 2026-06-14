---
name: reference_post_ship_mit-course-integration-u-mit-live-extract
description: Auto-distilled learnings from shipping MIT-COURSE-INTEGRATION/U-MIT-LIVE-EXTRACT (commit ebed8f6ce). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.567Z
aliases: reference_post_ship_mit-course-integration-u-mit-live-extract
---


# MIT-COURSE-INTEGRATION/U-MIT-LIVE-EXTRACT

[MAIN] [MIT-COURSE-INTEGRATION]/U-MIT-LIVE-EXTRACT (slot:india iter13): first end-to-end live extraction (MIT 2.830) + resolver bug fix. (1) WebFetch + WebSearch against ocw.mit.edu/courses/2-830j-control-of-manufacturing-processes-sma-6303-spring-2008 confirmed real syllabus content: Montgomery 5th ed textbook ISBN 9780471656319 (Statistical Quality Control), instructors Hardt + Boning, prereqs 2.010/15.075, Lec 9 covers EWMA+CUSUM (validates PRISM EWMAEngine + CUSUMEngine lineage). (2) Bug surfaced: v1 resolver missed cross-listing slug fragment for joint courses — WebFetch 404+redirect-loop until WebSearch found the real URL. (3) Fixed: added crossListing field to ResolveInput, slug now [courseId, title, crossListing, term].filter.join. (4) Tests: 23 -> 26 PASS (added 3 joint-course cases). (5) Wiki updated with verified syllabus + bug note + lima follow-up list of 14 joint-course candidates to populate cross_listing frontmatter for.

**Shipped:** 2026-05-23T22:29:19-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[mit-course-integration-u-mit-live-extract]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._