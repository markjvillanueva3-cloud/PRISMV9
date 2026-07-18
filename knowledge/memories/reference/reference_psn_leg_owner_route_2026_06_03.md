---
name: reference_psn_leg_owner_route_2026_06_03
description: PSN leg-health → owner-slot routing (Bridge#7 loop-closure) — per-prompt health digest now names the slot that owns each concerning leg's fix; local owner mirror + drift-guard test vs collector PSN_LEG_OWNER
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.132Z
aliases: reference_psn_leg_owner_route_2026_06_03
---


U-PSN-LEG-OWNER-ROUTE (slot:alpha, 2026-06-03, branch cad-fusion-live-ms0, commit `33ad35ecb4`). Closes the consumer loop on Bridge#7 of the PSN-SYNERGY-GAP-AUDIT ([[reference_psn_synergy_collect_ms3_2026_06_03]]).

**The gap:** Bridge#7 computed an `ownerSlot` per PSN leg in the snapshot (`scripts/psn-synergy-collect.mjs` `PSN_LEG_OWNER`, line 605/exported 853) but NOTHING consumed it. The one surface the whole fleet reads every prompt — the `psn-leg-state-inject.mjs` UserPromptSubmit health digest — was owner-blind: it surfaced "NN/GNN (#10) [DEGENERATE]" to whichever slot happened to read it, never naming who fixes it.

**The bridge** (`.claude/hooks/psn-leg-state-inject.mjs`): each concerning-leg line now renders ` → owner: \`<slot>\``. Added `PSN_LEG_OWNER_SLOT` (frozen 11-leg mirror), `LEG_LABEL_TO_KEY` (the 6 surfaceable labels → collector keys), `legOwnerForLabel(label)` (pure, null-safe). `formatLegState` appends the owner tag; silent-when-healthy path unchanged. Live: "NN/GNN (#10) [DEGENERATE] … → owner: `india`".

**Why a LOCAL mirror, not an import (R8):** the hook fires per-prompt across 26 slots; importing the 850-line collector at runtime (~16.6ms + readdir/write machinery) is the wrong dependency surface. The mirror is made safe by a DRIFT-GUARD test that imports the collector's `PSN_LEG_OWNER` (test-time only — the collector has an `invokedDirectly` guard so `main()` never runs on import) and `assert.deepEqual`s parity. Reviewers empirically proved it fails on value-drift / added-leg / removed-leg. Single source of truth, enforced by test rather than latency-costly runtime coupling.

**Verification:** +11 tests, 73/73 green. 3-of-3 scrutiny unanimous PASS (arm A holistic, arm B test-integrity, arm C regression/coupling), 0 P0/P1. Arm C confirmed NO downstream tool parses the leg-line (emit-only → owner suffix can't break anything); throw-free + `main()` try/catch→exit0; O(1) import-free at runtime.

**Owner map** (canonical, mirrors collector): obsidian_brain/memories/wiki→alpha · tribal→golf · system_viz→sierra · engines→papa · algorithms/formulas→tango · nn_gnn→india · prism_os→papa · prism_ai→india.

**Doctrine:** serves "build/wire/bridge for other slots so they can focus on domain tasks" — a domain-health regression now auto-routes to its domain owner. Lineage: [[reference_psn_synergy_collect_ms3_2026_06_03]] · [[reference_nn_leg_schema_read_fix_2026_06_02]] · [[feedback_psn_definition]] · [[feedback_commit_to_slot_worktree]].
