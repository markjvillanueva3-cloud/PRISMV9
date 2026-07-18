---
name: feedback_primary_backend_builders_no_galaxy_gate_block
description: "RULE for the 7 primary backend/infrastructure builder slots -- alpha, bravo, golf, sierra, papa, quebec, india: a galaxy/domain-OWNERSHIP gate must NEVER stop you from building. You ARE the fleet's primary backend builders. Coordinate (chat-bus heads-up + patch-sibling + clone-don't-fork) but do NOT defer-and-wait on another galaxy's owner. (Operator directive 2026-06-09.) Distinct from SAFETY/QUALITY gates (S(x), physics constants, no-stubs, 3-of-3 scrutiny, file-claim coordination) which STILL fully apply."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.440Z
aliases: feedback_primary_backend_builders_no_galaxy_gate_block
---


# Primary backend builders: galaxy gates do NOT block you (operator directive 2026-06-09)

**Applies to the 7 primary backend / infrastructure / cross-cutting builder slots:**
`alpha` (token/efficiency/obsidian), `bravo` (hermes/stub-hunting), `golf`
(fleet-hygiene), `sierra` (system-viz), `papa` (backend-helper), `quebec`
(frontend+phone), `india` (AI/NN/GNN/LoRA/RAG training). These slots' work spans
galaxies by nature -- they are the backend builders, not domain specialists.

**Why:** operator 2026-06-09, after observing alpha route a durable fix (the
find-cache serve-stale OOM fix) to sierra and *wait* instead of building it. "Don't
let other galaxy gates stop you from building -- you're one of the primary backend
builders." A backend builder that defers-and-idles on every cross-galaxy boundary
ships nothing; the fleet stalls on ownership etiquette.

## The rule
A **galaxy / domain-OWNERSHIP gate must NEVER stop one of these 7 slots from
building.** Ownership gates that are now ADVISORY (coordinate, don't defer-and-wait):
- routing-precedence ("foxtrot first for mill", "owner: sierra", a `→ owner:` tag)
- a slot soul's `domain_filter` / "that's not your domain"
- "that's X's core lib / X's lane" (e.g. system-viz-graph.mjs is sierra's, but alpha
  may build in it -- with a heads-up)
- golf's write-allowlist (already UNWIRED; golf is a normal work slot)
- PSN `→ owner` routing hints (they say who *also* knows, not who *exclusively* may touch)

**Build it.** When the work is net-benefit + safe, take the comprehensive route
(R13/R15) across galaxy lines rather than routing-and-waiting.

## What this does NOT relax (R12 -- the precise boundary)
This is about OWNERSHIP gates, NOT safety/quality gates. These STILL fully apply:
- **Safety** -- S(x)/Omega thresholds, units-first, NEVER inline physics constants.
- **Comprehensive-build** -- no stubs/partial/placeholder; real tests (no toBeDefined).
- **Scrutiny** -- per-file 2-arm + end-of-task 3-of-3.
- **Multi-chat coordination** -- post a chat-bus heads-up BEFORE editing a peer's
  surface; on a peer-CLAIMED / in-flight file, patch-sibling or clone-don't-fork --
  never silently clobber a peer's uncommitted work. R8 read-before-write.
- **Slot-worktree commit lane** -- commit from your slot worktree (or `[MAIN]` +
  BOOTSTRAP tag on the shared tree).

So: build across galaxy lines freely; coordinate the *write*; never skip safety/tests.

## How to act on it
1. Hit a cross-galaxy build the fleet needs -> a chat-bus heads-up to the owner
   ("taking X in your lane, here's why") -> build it -> test -> scrutinize -> commit ->
   route the result back to the owner for follow-on (roost wiring, deep integration).
2. Do NOT post "routed to <owner>, waiting" and then idle. Routing is a NOTIFY, not a
   BLOCK, for these 7 slots.

Related: [[feedback_all_slots_free_access]] (any slot may edit settings/hooks/merge),
[[feedback_net_benefit_auto_build]] (net-benefit+safe -> auto-build),
[[feedback_auto_fix_and_blackwell_fleet_enforced]] (fix inline, don't defer),
[[feedback_bravo_golf_papa_quebec_fix_known_failures]] (fix, don't just record),
[[feedback_conflict_fork_rule]] (when a routing hook blocks: patch-sibling/worktree).
Lived example this session: [[reference_opik_self_healing_harness_2026_06_09]]
(alpha pulled sierra's find-cache task + built it on operator direction).
