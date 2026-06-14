---
name: reference_sierra_fast_splice_dual_registration
description: Every ghost-roost generator needs BOTH regen-viz FAST[] AND merge-augmentations splice — both or neither.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.936Z
aliases: reference_sierra_fast_splice_dual_registration
---


**Dual-registration rule for ghost-roost generators (system-viz).** There are ~48 `scripts/generate-*-features.mjs` generators (priority-queue, misc-tasks, bridge-synergy, feature-gap, domain-pipeline, chat-slot-nodes, …). Each emits an augmentation file under `state/shared/system-viz/augmentations/`. For that augmentation to actually appear in the merged graph it must be registered in TWO places:
1. `scripts/regen-viz.mjs` FAST[] stage list (so the generator runs), AND
2. `scripts/merge-augmentations.mjs` splice block (so its output is merged in).

One without the other = ghost data the merge **silently discards** (no error). This is the most common "I added a roost but it's not in the graph" bug.

**Why:** the two scripts are decoupled — running a generator does not auto-splice; the splicer only knows roosts it's explicitly told about.

**How to apply:** when adding a roost, grep both files for an existing roost name, copy BOTH registration sites. Verify with `node scripts/system-viz-query.mjs find <roost-noun>` after regen. See [[reference_sierra_regen_pipeline_stages]].
