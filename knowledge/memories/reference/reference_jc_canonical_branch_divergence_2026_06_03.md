---
name: jc-canonical-branch-divergence-2026-06-03
description: "Johnson-Cook single-source canonical exists on slot/oscar (6952af30b9) but NOT on cad-fusion-live-ms0 — don't re-fix per-branch DB canonicalizations independently; check git+memory first"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.625Z
aliases: reference_jc_canonical_branch_divergence_2026_06_03
---


While tackling the "canonicalize the material/Johnson-Cook database" goal on branch `cad-fusion-live-ms0` (slot:juliett, 2026-06-03), I nearly re-built a JC single-source consolidation that **oscar already shipped 2 days earlier**.

**The trap:** `cad-fusion-live-ms0` still carries 3 divergent JC tables (`JohnsonCookEngine.ts` inline `DB` 60-key exact-match, `algorithms/JohnsonCookModel.ts` `JC_DATABASE` 63-key, deprecated `JohnsonCookConstitutiveEngine.ts` 5-key). From this branch's snapshot the fragmentation looks unfixed. But `slot/oscar` commit `6952af30b9` (U-OSC9-JC-SINGLE-SOURCE, 2026-05-31) already created the canonical `mcp-server/src/physics/johnson-cook-coefficients.ts` (65-key lossless union, `JC_COEFFICIENTS`/`findJCMaterial`/`JC_T_ROOM_K`), re-exported from constants.ts as `JOHNSON_COOK_PARAMETERS`, both engines re-pointed, 47/47 tests. Verified absent here: `git merge-base --is-ancestor 6952af30b9 HEAD` = NO; file does not exist; `git branch --contains` = only `slot/oscar`.

**Why:** the 26-slot fleet works in parallel branches/worktrees. A "database gap" visible on your branch may already be canonically fixed on a peer's slot branch. Re-fixing independently FORKS a competing canonical → guaranteed merge conflict + duplicated work (violates R8 read-first, dedup-guard, R7 surface-don't-average).

**How to apply:** before deep-diving ANY shared database/canonical consolidation, (1) `memory_search` the topic (the recall hook surfaced oscar's memory mid-edit — heed it), (2) `git log --all --oneline -S<symbol>` / `git branch -a --contains` to see if a peer slot already shipped it, (3) if peer-shipped elsewhere, ROUTE the forward-merge to the integrator (chat-bus) and pivot — do NOT re-implement. Caught here by the memory-relevance inject firing on the JohnsonCookEngine.ts edit. Related: [[feedback_always_fill_gaps]] (own+route, don't log-drop), [[feedback_conflict_fork_rule]], oscar's [[reference_oscar_sfc_jc_single_source_2026_05_31]]. Oscar's open routed follow-up `U-OSC9-JC-CELSIUS-FAMILY-UNIFY` (4 engines with °C-frame inline JC) still needs units-frame reconciliation — also oscar/speed-feed domain.
