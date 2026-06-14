---
name: reference-cte-peer-absorption-2026-05-20
description: "U-CTE02/03/04 shipped under peer attribution — ActionSequenceExtractorEngine + 9 deliverables landed in bravo's TOKEN-AWARENESS commit during shared-tree git index race."
aliases: reference_cte_peer_absorption_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.073Z
---


2026-05-20 alpha (claude-30dbe35a). U-CTE02 + U-CTE03 + U-CTE04 of CAD-TRAINING-EXTRACT-MS0 shipped in commit `e6cbcc3d48` — but attributed to `[MAIN] [TOKEN-AWARENESS-MS0]/U-TA01..12 (slot:bravo)` instead of `[CAD-TRAINING-EXTRACT-MS0]/U-CTE02+03+04 (slot:alpha)`. The shared-tree git index race: while my staged 9 paths sat in the index awaiting commit, peer bravo did `git add -A` for their TOKEN-AWARENESS work and their `git commit` swept up my staged paths. The CODE is durable in git history (verified via `git log --oneline --all -- mcp-server/src/engines/ActionSequenceExtractorEngine.ts` → `e6cbcc3d48`); only the attribution label is wrong.

**9 deliverables shipped:**
- `mcp-server/src/engines/ActionSequenceExtractorEngine.ts` (pure regex transform, WIRE-EXEMPT, schemaVersion 1.0.0)
- `mcp-server/src/__tests__/ActionSequenceExtractorEngine.test.ts` (36 tests PASS)
- `mcp-server/scripts/emit-cad-training-extractions.mjs` (3-spec emitter)
- 6 JSONs in `mcp-server/data/training/`: mastercam-solids-{tips,actions} (95/72), mastercam-wire-edm-{tips,actions} (44/28), inventorcam-milling-{tips,actions} (269/188)

All exceed acceptance thresholds (CTE02: 95/72 vs 25/15 · CTE03: 44/28 vs 40/0 · CTE04: 269 vs 50).

**Why:** the same shared-tree-git-add window class catalogued in [[reference_iter2_html_adopt_misattribution_2026_05_18]] (lima) and [[reference_git_index_saturation_camx11_2026_05_18]] (kilo). The slot-worktree-cutover doctrine ([[reference_slot_worktree_activation_2026_05_16]]) is the canonical fix — chats migrated to `slot/<nato>` worktrees can't have their staged paths absorbed by peers on `H:/prism`.

**How to apply:** when peer-absorption happens, do NOT rewrite history (force-push blocked on shared branch by doctrine). Treat the work as shipped, record the attribution drift here as a memory pointer, and continue. The envelope close-out (`MILESTONE_PROGRESS.shipped` count) still credits the unit because `build-milestone-progress.mjs` reads commit subjects — a follow-up scope tag could be added by the next [[feedback_golf_owns_reaper|golf-slot]] close-out pass via `state/shared/SHIPPED-UNIT-OVERRIDES.json` (if it exists) or accepted as a one-time attribution drift.

**Data-side gate on CTE05+:** CTE05 (5-axis training vol-1/2/3) and CTE06 (contour-5X / geodesic / edge-breaking / iLogic) source docs in `cad-engine/knowledge_store/` are sparse (5-13K each); they fall well below the 60/40-tip acceptance thresholds. iter 3+ on this milestone requires a `/pdf-learn` re-extract pass on the source PDFs before `emit-cad-training-extractions.mjs` can clear acceptance. CTE07 (SolidWorks) + CTE08 (Fusion CAD) source docs are effectively empty (64B / 446B — likely stub placeholders).
