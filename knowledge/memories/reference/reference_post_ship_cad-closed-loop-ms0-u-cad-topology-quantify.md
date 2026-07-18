---
name: reference_post_ship_cad-closed-loop-ms0-u-cad-topology-quantify
description: Auto-distilled learnings from shipping CAD-CLOSED-LOOP-MS0/U-CAD-TOPOLOGY-QUANTIFY (commit c265300be). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.791Z
aliases: reference_post_ship_cad-closed-loop-ms0-u-cad-topology-quantify
---


# CAD-CLOSED-LOOP-MS0/U-CAD-TOPOLOGY-QUANTIFY

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-TOPOLOGY-QUANTIFY (slot:delta): quantify topology-Jaccard ceiling + correct prior wrong belief. blisk.stp 95% CARTESIAN_POINT (48956/51418); count-weighted Jaccard is point-density-driven NOT blade/fillet-driven -- best-case 0.995, realistic 0.498. CORRECTS earlier 'add 10 fillets -> 0.80' (negligible vs 49K pts). Topology>=0.80 reachable via control-point density but weak/gameable proxy; meaningful gate = bbox/dims (proven exact) + surface-Hausdorff, never point-count identity (=re-import). R12 honest-numbers refinement

**Shipped:** 2026-06-10T13:56:34-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[cad-closed-loop-ms0-u-cad-topology-quantify]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._