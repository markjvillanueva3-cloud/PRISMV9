---
name: reference_post_ship_domain-knowledge-u-zulu-all-domain-feeders
description: Auto-distilled learnings from shipping DOMAIN-KNOWLEDGE/U-ZULU-ALL-DOMAIN-FEEDERS (commit a95356c00). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.839Z
aliases: reference_post_ship_domain-knowledge-u-zulu-all-domain-feeders
---


# DOMAIN-KNOWLEDGE/U-ZULU-ALL-DOMAIN-FEEDERS

[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-ZULU-ALL-DOMAIN-FEEDERS (slot:zulu): R15 apply-to-all -- generalize the CAD/CAM GIGO-safe knowledge feeder to ALL manufacturing domains. build-domain-knowledge-feeders.mjs multi-label keyword-classifies the 1210 resource specs -> per-domain GIGO-safe feeders (live run: tooling 312/mill 39/cam 19/lathe 12/cad 12/post-proc 6/speed-feed 4; 80 dead-source dropped per R9; 769 keyword-unclassified -> cadcam-reclassify-ollama content pass refines). Feeders regenerate to state/shared/domain-knowledge/ (gitignored data). 8/8 real tests. Honest finding: resources/ is tooling/mill/cam-heavy; wedm/quality/etc knowledge lives in their own corpora (same as CAD->JM-drawings).

**Shipped:** 2026-06-24T14:54:51-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[domain-knowledge-u-zulu-all-domain-feeders]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._