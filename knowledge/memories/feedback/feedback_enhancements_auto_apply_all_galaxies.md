---
name: enhancements-auto-apply-all-galaxies
description: "FLEET-WIDE rule (operator 2026-06-11): any enhancement, fix, or gap-fill a slot makes to its OWN galaxy/system AUTOMATICALLY applies to ALL other galaxies -- clone-don't-fork, in the same work. Strengthens R15 SS-APPLY-TO-ALL-GALAXIES into an always-on default for every slot."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.424Z
aliases: feedback_enhancements_auto_apply_all_galaxies
---


# Enhancements auto-apply to ALL galaxies (fleet-wide)

## The rule (operator directive 2026-06-11, FLEET-WIDE / galaxy-wide)

**Any enhancement, fix, or gap-fill you make to your OWN galaxy/system AUTOMATICALLY applies to ALL other galaxies.** When you improve your domain -- a new context-retention surface, a hardening, a bug-fix to a shared pattern, a missing-capability fill -- you do NOT leave it galaxy-local. You propagate it to every galaxy that shares the need, in the same work. Clone-don't-fork. This is the always-on default for EVERY slot (alpha..zulu), not an opt-in.

This is R15's fourth leg (WIRE -> TEST -> VALIDATE -> **APPLY-TO-ALL-GALAXIES**) promoted to a standing, automatic rule. See [[feedback_wire_test_validate_all_galaxies]].

## How to apply

For EACH enhancement/fix/gap-fill, decide its reach and act on it in the SAME work:
- **General asset** (tool / hook / skill / script / schema / pattern that serves any galaxy) -> wire it FLEET-WIDE with proven coverage of EVERY galaxy. One canonical copy, all galaxies consume it. (Example: the injection-budget enforcement system governs the whole fleet's injection surface, not just hermes-zulu.)
- **Galaxy-specific asset** (a per-domain improvement that other galaxies also need) -> CLONE it (not fork) into every galaxy that shares the need, adapting only the domain content. (Example: the curated open-tasks LEDGER pattern -- `BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md` -- is a context-retention enhancement every galaxy should have; replicate the structure per galaxy.)
- **Fix to a shared pattern / template** (galaxy-brain template, soul schema, commit discipline) -> apply the fix to ALL instances, not just yours.

Backed by the existing enforcement: `comprehensive-build-enforce` + `stop_on_unwired_assets` + the SS-ENGINE WIRING "wire to ALL sources" gate. Partial / one-galaxy delivery is a `[SCOPED]` exception only, stated explicitly.

## Why

A fix or enhancement built once and left in one galaxy is a latent inconsistency: the other 33 galaxies still carry the old gap/bug. Auto-applying fleet-wide means the fleet improves coherently -- every galaxy compounds the same upgrade -- instead of drifting into 34 divergent variants. The whole point of the galaxy model is shared substrate + per-domain content; an enhancement that doesn't propagate breaks that.

**Why this matters:** coherent fleet-wide improvement, no divergent variants, every galaxy compounds every upgrade. **How to apply:** for every enhancement/fix/gap-fill, state its reach (general=fleet-wire / specific=clone-to-all-sharing-galaxies) and execute it in the same work; `[SCOPED]` is the only exception. Pairs with [[feedback_wire_test_validate_all_galaxies]] + [[feedback_build_comprehensive_route]].
