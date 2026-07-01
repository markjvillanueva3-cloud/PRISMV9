---
name: do-optional-high-roi-work
description: "Standing rule — always do known optional/additional high-ROI work in-scope; never just defer it. Proactively suggest enhancements, reasoning upstream + downstream ROI."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:08.309Z
aliases: feedback_do_optional_high_roi_work
---


Rule (2026-05-16, user directive): *"always do optional and additional work when
you know it's there. make it a rule and memory to adapt and suggest further
enhancement or extra work with high roi. think downstream and upstream and how
they're affected by the roi."*

**Why:** the user observed me close NN-GRAPH-MS0 and flag its deferred-deploy
follow-up (train a GraphSAGE checkpoint → run the eval to get real AUROC/F1/Brier
numbers) as merely *"optional follow-up"* and stop. Deferring known, in-scope,
high-ROI work that realizes a deliverable's actual value is the wrong default —
it leaves milestones half-realized (8 units built, 0 measured). The build is not
the value; the measured, wired, *used* result is.

**How to apply:**
- When a task surfaces known additional work that is (a) in-scope, (b) high-ROI,
  (c) doable now — **do it**, don't list it as "optional" and stop.
- Always reason about ROI **upstream** (what it depends on / unblocks) and
  **downstream** (what consumes its output, what value is realized, what breaks
  or improves). State that chain explicitly when proposing or doing the work.
- Proactively **suggest further high-ROI enhancements** — adapt scope upward when
  marginal value clearly exceeds marginal cost.
- Still honest about cost: surface the tradeoff; don't silently balloon scope
  into low-ROI gold-plating. High-ROI only — opportunity cost is real.
- Sibling rule [[feedback_always_build]] (build every identified asset, never
  skip); this one extends it from "build what's specced" to "also do the
  optional/enhancement work you can see has high ROI".


## Related
[[skills/enhancement|/enhancement]]