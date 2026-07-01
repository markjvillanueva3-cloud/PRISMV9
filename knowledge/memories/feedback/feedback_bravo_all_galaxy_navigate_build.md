---
name: feedback_bravo_all_galaxy_navigate_build
description: "RULE (operator directive 2026-06-10): bravo navigates and BUILDS in ALL galaxies -- no galaxy/domain-ownership gate blocks bravo anywhere in the fleet. Soul frontmatter carries galaxy_access: all-galaxies. domain_filter stays narrow (recall-relevance + in-domain reviewer trigger, NOT a build gate). Lifting the OWNERSHIP gate does NOT lift SAFETY/scrutiny/coordination gates -- those still fully apply."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.413Z
aliases: feedback_bravo_all_galaxy_navigate_build
---


# Bravo navigates + builds in ALL galaxies (operator directive 2026-06-10)

Bravo (Hermes/Zulu builder + stub-hunting) is no longer scoped to its home galaxy for BUILD/NAVIGATE purposes. It may read, navigate, and build in any of the 34 galaxies the fleet spans.

**Why:** operator 2026-06-10 -- "change memory and rules to lift gates for bravo to navigate and build in all galaxies." Bravo is one of the 7 primary backend/infrastructure builders ([[feedback_primary_backend_builders_no_galaxy_gate_block]]); a domain-ownership gate that makes it defer-and-wait at every galaxy boundary ships nothing. This directive makes that authority explicit in bravo's own soul contract rather than only in the shared 7-builder rule.

**How to apply:**
1. The soul `state/shared/slot-souls/bravo.md` now carries `galaxy_access: all-galaxies` (frontmatter) + an operator-grant bullet. That is the explicit grant.
2. `domain_filter` is deliberately NOT widened to a wildcard. It feeds (a) memory/tribal recall relevance and (b) `soul-escalation-gate.mjs` (which requires an in-domain reviewer subagent for domain-matched edits -- a QUALITY behavior bravo keeps). Widening it to `.*` would make that reviewer gate fire on every edit fleet-wide -- the opposite of lifting a gate.
3. Build across galaxy lines freely; still post a chat-bus heads-up before touching a peer-CLAIMED / in-flight surface (patch-sibling or clone-don't-fork; R8 read-before-write).
4. **What is NOT relaxed (the precise boundary, R12):** SAFETY (S(x)/Omega thresholds, units-first, never inline physics constants), comprehensive-build (no stubs/partial/placeholder, real reference-value tests), scrutiny (per-file 2-arm + end-of-task 3-of-3), and slot-worktree / `[MAIN]`-on-shared-tree commit lane. Lifting the OWNERSHIP gate never lifts a SAFETY gate.

Related: [[feedback_primary_backend_builders_no_galaxy_gate_block]] (the 7-builder rule this makes bravo-explicit), [[feedback_all_slots_free_access]] (any slot edits settings/hooks/merges), [[feedback_net_benefit_auto_build]] (net-benefit + safe -> auto-build), [[feedback_bravo_launches_hermes_obsidian_apps]] (sibling bravo operator grant).
