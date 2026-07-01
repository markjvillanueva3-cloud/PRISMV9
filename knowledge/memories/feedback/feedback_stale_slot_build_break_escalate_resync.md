---
name: feedback_stale_slot_build_break_escalate_resync
description: "A 'Could not resolve' build:fast error on a slot worktree behind cad-fusion-live-ms0 is un-merged divergence, NOT a missing-engine gap — don't rebuild the duplicate; YOU self-merge your own galaxy UP (golf is no longer the integrator)."
type: feedback
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.445Z
aliases: feedback_stale_slot_build_break_escalate_resync
---


# A slot's `build:fast` "Could not resolve" is un-merged divergence — self-merge, don't rebuild

When a `slot/<nato>` worktree lags `cad-fusion-live-ms0`, `npm run build:fast` (esbuild) reports `Could not resolve "…/SomeEngine.js"` for engines wired into a dispatcher upstream but not present in-slot. A naive read ("engine missing → build it") is WRONG: the engine almost always already exists, complete and contract-matching, on the shared/main tree. Building a fresh one **duplicates a shipped file** (R8 + DuplicationGuard violation) and guarantees an integration conflict.

> **CORRECTION (2026-05-31):** this memory originally said "escalate a golf-led resync." That is SUPERSEDED. Per the operator doctrine *"each chat galaxy no longer needs golf, you're all responsible for your own galaxies"* ([[feedback_each_slot_merges_own_galaxy]]), **golf is NOT the integrator — YOU self-merge your own galaxy.** The diagnostic below ("don't rebuild — it's divergence") is unchanged; the cure is self-merge, not escalate.

**Why:** fleet work lands on `cad-fusion-live-ms0`; slot worktrees lag. Verified on slot/whiskey 2026-05-31: `build:fast` failed with 3 `Could not resolve` errors (`LatheLiveToolingPlannerEngine.js` + 2× `ideaBlockSchema.js`) — ALL exist on main, absent only in the lagging slot. Beware stale LOCAL refs: slot/whiskey read "219 ahead/1658 behind LOCAL cad-fusion-live-ms0" but only "636 ahead/1 behind ORIGIN" — the LOCAL main was 2118 ahead of origin with un-pushed fleet self-merges. Tango hit the same stale-worktree class 2026-05-29 → FLEET-WIDE.

**How to apply (any slot):**
1. **On any `Could not resolve` build:fast error, check BOTH trees first** — `ls <slot>/…/X.ts` and `command git show cad-fusion-live-ms0:mcp-server/src/engines/X.ts` (use `command git show`, NOT rtk). Exists upstream → it is un-merged divergence, not a buildable gap. **STOP — do not rebuild it.**
2. **`git fetch` before trusting any "N behind" number** — a stale LOCAL `cad-fusion-live-ms0` inflates the "behind" count with un-pushed peer self-merges. Measure vs `origin/cad-fusion-live-ms0` too.
3. **Doc files** (`engines/<g>/{CLAUDE,MEMORY}.md`, souls) → recover+extend per [[feedback-foxtrot-galaxy-recover-not-rebuild]]. **Engines/source wired into a dispatcher** → self-merge YOUR additive commits UP via clobber-safe cherry-pick (PINNED-BASE) + wire actions into MAIN's canonical dispatcher, per [[feedback_each_slot_merges_own_galaxy]]. NEVER `git merge slot→MAIN`.
4. **Until self-merged:** in-slot validation = `vitest`-per-file (bundle-independent); treat the slot's own build:fast RED as expected divergence, not a regression. The gate is the MERGED-MAIN build.
5. **Never force a duplicate build to "produce a unit."** When the safe in-slot build surface is tapped out (adversarial dedup over BOTH trees confirms it), the honest action is self-merge the un-integrated work — not manufacture a duplicate. R12 > "always build."
6. **Self-merge is a careful, full-context op — do not rush under a tight token budget (R6).** Defer to fresh headroom; the deferral is to YOURSELF (you own the galaxy), not golf.

Sibling: [[feedback-foxtrot-galaxy-recover-not-rebuild]] (doc-file case) · canonical merge mechanism + clobber-safety lessons: [[feedback_each_slot_merges_own_galaxy]] · whiskey instance + runbook: [[reference_whiskey_slot_stale_build_red_cross_tree_2026_05_31]].
