---
name: feedback_wire_test_validate_all_galaxies
description: "Standing build rule — every build follows WIRE -> TEST -> VALIDATE -> APPLY-TO-ALL-GALAXIES before it is \"done\"; partial/one-galaxy delivery is a [SCOPED] exception only"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.454Z
aliases: feedback_wire_test_validate_all_galaxies
---


Operator directive (2026-06-04, slot:sierra): **"make sure you wire, test and validate then apply to all galaxies anytime you build anything."** This is a standing rule for EVERY build, fleet-wide — codified as CLAUDE.md R15.

**The pipeline — a build is not "done" until all four hold:**
1. **WIRE** — connect the new asset to every dispatcher / consumer / surface that would naturally use it, in the SAME commit (engine -> all natural dispatchers; hook -> settings.json; skill -> commands; CLI -> its query host). Never ship an orphan. Pairs with §ENGINE WIRING ("wire to ALL sources") + `stop_on_unwired_assets`.
2. **TEST** — real tests: reference values or algebraic invariants (NEVER `toBeDefined()` stubs). Happy path + >=3 failure modes (bad input, boundary, resource exhaustion) + >=2 adversarial (NaN/Infinity/empty/oversize). A round-trip THROUGH the dispatcher, not only the engine singleton.
3. **VALIDATE** — run it against LIVE data and prove the result with numbers/evidence, not "looks fine." (For sierra: report node/edge counts + source + freshness.)
4. **APPLY-TO-ALL-GALAXIES** — if the asset is GENERAL (tool, hook, skill, pattern, schema, script), make it cover/serve EVERY galaxy and PROVE the coverage (e.g. node_card resolves eng.mill/lathe/wedm/cad/cam + ghost.galaxy.* + memory_patterns.* — 9/10 namespaces, all 34 galaxies). If GALAXY-SPECIFIC, replicate the pattern to every galaxy that shares the need (clone-don't-fork, per [[feedback_domains_own_ai_training_systems]]).

**Why:** the fleet has repeatedly shipped partial/one-galaxy work that then rots as an orphan or a per-domain divergence. A build that is wired+tested+validated+universal compounds; a half-build is debt. This is the comprehensive-route doctrine (R13) made into an explicit per-build checklist, plus the all-galaxies reach the operator wants by default.

**How to apply:** after building anything, before calling it done, walk the 4 steps and state each one's evidence in the report. Only an explicit operator `[SCOPED]` opts out. Enforcement infra already exists: `comprehensive-build-enforce`, `stop_on_unwired_assets`, per-file 2-arm scrutiny -> 3-of-3 Stop gate. Related: [[feedback_always_build]], [[feedback_always_close_out]], [[feedback_reflect_all_changes_post_update]], [[feedback_net_benefit_auto_build]].
