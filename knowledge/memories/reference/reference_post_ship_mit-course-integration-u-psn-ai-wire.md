---
name: reference_post_ship_mit-course-integration-u-psn-ai-wire
description: Auto-distilled learnings from shipping MIT-COURSE-INTEGRATION/U-PSN-AI-WIRE (commit a34daf16f). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.568Z
aliases: reference_post_ship_mit-course-integration-u-psn-ai-wire
---


# MIT-COURSE-INTEGRATION/U-PSN-AI-WIRE

[MAIN] [MIT-COURSE-INTEGRATION]/U-PSN-AI-WIRE (slot:india iter21): wire college-course + resource-PDF AUTOGEN corpus into PRISM AI training-data layer (PSN leg 11 closure). (a) AIResourceLearningEngine.getCollegeCorpus() — pure method returning spec-dir paths + counts (1401/893/2541) + traceability commit shas. (b) aiReasoningDispatcher: new ai_college_corpus_pointers action with lazy import + case handler. (c) aiCapabilityActionSchemas: new z.object passthrough schema + action enum entry + schemas map registration. (d) 15/15 vitest tests covering happy path (3), invariants (5), schema contract (3), adversarial+spanning (4) — exceeds COMPREHENSIVE-BUILD floor. AI training pipelines now route via prism_ai:ai_college_corpus_pointers to discover the iter15..iter20 corpus dirs without hard-coding paths. Closes 'synergize to PSN' leg of /goal.

**Shipped:** 2026-05-24T16:50:20-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[mit-course-integration-u-psn-ai-wire]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._