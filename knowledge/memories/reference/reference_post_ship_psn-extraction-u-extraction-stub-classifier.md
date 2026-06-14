---
name: reference_post_ship_psn-extraction-u-extraction-stub-classifier
description: Auto-distilled learnings from shipping PSN-EXTRACTION/U-EXTRACTION-STUB-CLASSIFIER (commit 2b16989e3). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.686Z
aliases: reference_post_ship_psn-extraction-u-extraction-stub-classifier
---


# PSN-EXTRACTION/U-EXTRACTION-STUB-CLASSIFIER

[MAIN] [PSN-EXTRACTION]/U-EXTRACTION-STUB-CLASSIFIER (slot:golf iter15): triage classifier for the 727 extraction-priority modules. Scans 4 priority dirs (ai_ml_engines, physics_engines, geometry_engines, databases) and classifies by lines + mockReturns + Math.* op count. Result: 73 scanned · 1 stub (PRISM_PINN_CUTTING — hardcoded mock returns) · 6 thin · 66 substantial. The 66 substantial files are genuine extraction candidates; the stub bin tells future extractors which to skip (NEVER create stub engines per CLAUDE.md). Output: state/shared/EXTRACTION-STUB-CLASSIFIER.json.

**Shipped:** 2026-05-24T14:45:22-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[psn-extraction-u-extraction-stub-classifier]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._