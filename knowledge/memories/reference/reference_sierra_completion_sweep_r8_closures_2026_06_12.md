---
name: reference_sierra_completion_sweep_r8_closures_2026_06_12
description: "Sierra completion-sweep iteration 2 (U-SCS-VERIFY-SWEEP, commit 656ccfa7c3) R8-closed 3 of 7 \"open\" A-items in SIERRA-REMAINING-TASKS-2026-06-12.md as already-done stale claims -- A1 envelope-graph generator already shipped+wired (751 live nodes), A4 crossSubstrateEdges already folded into the live graph, A6 memory-rag-inject working-as-designed. Do NOT rebuild these. Genuine open set is now A2/A3/A5/A7, with A5 (node-card prefetch cold-tier skip) the one in-slot build left."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.190Z
aliases: reference_sierra_completion_sweep_r8_closures_2026_06_12
---


# Sierra completion-sweep R8 closures -- U-SCS-VERIFY-SWEEP (2026-06-12, slot:sierra, commit 656ccfa7c3)

The completion-sweep goal ("complete everything sierra built, fully wired, gap-filled, not
dormant") iteration 2 proved that 3 of the 7 inventory A-items were **stale-open** -- already
shipped, just claimed open in a thread-9-era handoff. The point of a completion sweep is as much
proving done-ness as building; every false-open removed IS progress to the DONE-gate. Do NOT
rebuild these:

- **A1 -- envelope->graph-node generator.** Inventory said "752 envelopes have no node, NEXT
  BUILD." Reality: `scripts/generate-milestone-envelope-atomic.mjs` already exists, wired
  `regen-viz.mjs:165`, spliced `merge-augmentations.mjs` (load L191, merge L2733 as
  `milestoneEnvelopeAtomic`); **751 live `ms-envelope.*` L6 nodes** in find-cache. The "752" was
  the CANONICAL envelope count; the slot worktree only sees 138 files because it lags ~3635
  commits. Sister of the shipped scripts-lib coverage generator (2d532ffa22).
- **A4 -- crossSubstrateEdges fold.** Already folded: `merge-augmentations.mjs` loads
  `cross-substrate-edges-augmentation.json` (L217), folds roost nodes + owned-by-slot edges
  (L956-957), stamps `G.meta.crossSubstrateEdges` (L984). A cheap head-4KB stamp-check reads false
  ONLY because graph `meta` is appended at the END of the 711MB file -- not evidence of absence.
- **A6 -- memory-rag-inject "0/0/0".** Working as designed: it is a recall-keyword-gated FALLBACK
  that DEFERS to the always-on `memory-index-precheck-inject` sibling (documented L27-34). ~0
  injection = correct dedup, not a defect. Lib+sidecar+vault healthy (precheck sibling injects 3
  real hits live; vault 16,954 ref files + 9.4MB sidecar). Recall capability is LIVE via the sibling.

## Genuine open set after this sweep (4)
A2 dead-pixel verify (CANONICAL-only -- needs the 12GB-heap graph the slot lacks), A3
SYSTEM-VIZ-HIGH-ROI G-item triage, **A5 node-card prefetch CAG cold-tier skip (the one in-slot
.mjs BUILD left)**, A7 zulu-link scope. Lesson: a lagging slot worktree (no graph, no
node_modules) makes most system-viz "open" items either already-shipped-on-canonical or
canonical-only-to-verify -- R8 each before building. Pairs with
[[reference_viz_nodecard_slot_fallback_2026_06_11]] and
[[reference_corpus_query_substrate_resolution_fix_2026_06_11]].
