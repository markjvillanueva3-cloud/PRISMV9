---
name: reference_post_ship_build-quality-papa-u-tsc-wedm-neural
description: Auto-distilled learnings from shipping BUILD-QUALITY-PAPA/U-TSC-WEDM-NEURAL (commit 776053cf6). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.789Z
aliases: reference_post_ship_build-quality-papa-u-tsc-wedm-neural
---


# BUILD-QUALITY-PAPA/U-TSC-WEDM-NEURAL

[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-WEDM-NEURAL (slot:papa): clean tsc 103->98 -- WEDMNeuralTraining dropout_rate const-compare (de-narrow literal 0.2 via as-number for the defensive ===0 guard) + tip.body union-narrow ('body' in tip guard, some KB-literal members lack body); WireEDMMachineTechData never.toLowerCase exhaustive-switch default (m as string). DEFER WireEDMMachineTechData 377/396: not-found TechLookupResult needs method:TechMethod but TechMethod has no none member -> proper fix is a discriminated union on found (campaign-flagged careful), NOT a required->optional weakening. NO fabricated value. zero regressions.

**Shipped:** 2026-06-17T19:46:38-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[build-quality-papa-u-tsc-wedm-neural]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._