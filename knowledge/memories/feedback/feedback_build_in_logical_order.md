---
name: feedback_build_in_logical_order
description: "Standing rule: always build in LOGICAL (dependency) order — the thing others build on first, the verifiable core before the integration/inline. Sequence multi-unit builds so each unit is independently testable and builds on proven prior units. Complements always-build (don't skip) + always-close-out (finish)."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.418Z
aliases: feedback_build_in_logical_order
---


**Standing rule (operator directive 2026-05-29): always build in LOGICAL order. FLEET-WIDE — every slot, every galaxy, not domain-specific.**

When a task decomposes into multiple units/files, sequence them by **dependency**, not by convenience or by what's most visible. Build the thing other units build ON before the units that consume it; build the **verifiable core before the integration/inline**; never build a downstream unit on top of an unproven upstream one.

**Why:** out-of-order building is the #1 source of compound error + rework. If you inline/integrate before the core is proven, every bug in the core propagates into the integration and you debug two layers at once. If you build a consumer before its dependency, you either stub the dependency (forbidden) or block. Logical order means every unit ships on a *proven* foundation, each is independently testable, and a failure is localized to the unit you're on — not smeared across the stack. It also makes checkpoints clean: each completed unit is a coherent, shippable milestone, never a half-built layer.

**How to apply:**
1. **Enumerate + topologically sort first.** Before writing, list the units and their dependency edges. Build a leaf (no unmet deps) → work up to the root. Write the order into the spec/handoff (e.g. "Unit 1 core → Unit 2 factors → Unit 3 data → Unit 4 inline → Unit 5 fork").
2. **Core before integration.** Build the pure, tested logic as a standalone module FIRST (zero risk to production); inline/wire/integrate it only after it's proven. (Exemplar: `prism-paths-feed.mjs` built + tested as pure node before any production `.cps` inline — see [[reference_echo_prismpaths_feed_core]].)
3. **Each unit independently testable + shippable.** A unit is "done" only when it ships on a proven foundation with its own tests green. Don't start unit N+1 until unit N is committed + verified.
4. **If you discover a mis-ordered dependency mid-build, STOP and re-sequence** — surface it (R7/R12), don't power through by stubbing the missing dependency.
5. **Pairs with:** [[feedback_build_comprehensive_route]] (at a crossroads, always the most comprehensive route — no shortcuts) + [[feedback_always_build]] (build everything, never skip) + [[feedback_always_close_out]] (finish every unit) + [[feedback_parallel_scrutiny_per_file]] (scrutinize each file before the next). Logical-order answers *what sequence*; comprehensive-route answers *which option*; those answer *don't skip* / *finish* / *verify each step*.
