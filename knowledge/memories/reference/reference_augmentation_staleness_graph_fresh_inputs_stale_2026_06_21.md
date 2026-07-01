---
name: reference_augmentation_staleness_graph_fresh_inputs_stale_2026_06_21
description: "system-viz graph-health reports GREEN/fresh while its FAST[] augmentation inputs silently rot for days — the graph re-merges from stale inputs. Froze octopus consensus-of edges at 1."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.474Z
aliases: reference_augmentation_staleness_graph_fresh_inputs_stale_2026_06_21
---


# Augmentation staleness — graph "fresh" but inputs days-stale (slot:sierra, 2026-06-21)

**Finding (system-viz domain, R12 class "looks-fresh-but-isnt"):** the `sierra-graph-health`
hook + `/system-viz` report GREEN ("last good regen 2.8h ago, 770MB, pending=0") — but
GREEN here means **the merged `system-graph.json` was re-merged recently**, NOT that the
underlying augmentation inputs are fresh. `regen-viz.mjs` re-merges the graph from whatever
augmentation `.json` files exist on disk; if a FAST[] generator silently fails (the runner
logs `failed++` and CONTINUES — `regen-viz.mjs:223-228`, no timeout/no abort), its
augmentation freezes at the last good run while the merge keeps folding the STALE file. The
graph re-merges, find-cache refreshes, drift-gate certifies "clean" (stale != truncated), so
health goes GREEN over rotting inputs.

**Evidence (2026-06-21):** augmentation mtimes scattered across days while graph was 2.8h fresh:
- `cross-substrate-edges-augmentation.json` — Jun-17 09:03 (4 days stale)
- most FAST augmentations — Jun-15 22:27 / Jun-16 22:43
- only `octopus-consensus`/`molecules`/`obsidian`/`file-coverage` — Jun-21 (recent)
- `.last-regen-failure.json` — a `augment molecules` stage abort (`readGraphStreaming` ->
  `JSON.parse`, exit 1) — a merge/post-merge stage failure that aborts before later stages.

**Impact:** froze `consensus-of` cross-substrate edges at **1** (only hermes-zulu) while **13**
domains had gained octopus outcome ledgers — the octopus PSN-leg (multi-model consensus) was
barely connected in the queryable graph. Fixed by regenerating: `consensus-of 1 -> 13/13
linked` (see [[reference_cross_substrate_synergy_ms0_2026_06_03]], commit
`[SIERRA-VIZ]/U-XSUB-CONSENSUS-REFRESH`). Regeneration also surfaced a latent embeds-test
defect (a `/\.` shape proxy wrongly rejecting 27 real flat-id Obsidian-vault/untracked
category roots once the 768d pool grew to cover them) — corrected to the authoritative
graph-membership invariant.

**Why it matters:** every fleet consumer (master-index, awareness, node-card, pre-*-graph
hooks) reads this graph; a GREEN health badge is NOT a freshness guarantee for the edges.
A frozen generator is invisible today.

**Follow-up unit (not yet built):** a per-augmentation freshness guard — at regen, compare
each FAST[] augmentation mtime to a threshold (or to the run's `NOW`) and surface a LOUD
per-generator staleness list (which generator last succeeded when), so a silently-failing
generator is fail-loud, not masked by a fresh re-merge. Pairs with the existing
`cross-substrate-warnings.json` degradation sidecar pattern. Sibling of
[[feedback_wire_test_validate_all_galaxies]] (the VALIDATE leg: prove freshness with mtimes,
never "looks fine").
