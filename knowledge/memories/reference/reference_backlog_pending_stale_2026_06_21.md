---
name: reference_backlog_pending_stale_2026_06_21
description: "The never-idle BACKLOG rung is feeding STALE/SHIPPED units fleet-wide (verified slot:india 2026-06-21). BUILD_STATE.NEEDS_BUILDING.top_pending_units lists units already in git as 'not yet in git'. Concrete proof: U-CW-07 (MS-CRITWIRE 'wire GilbertEconomicSpeedEngine -> prism_calc') is listed pending but was SHIPPED 2026-05-20 (FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-GILBERT): engine+2 tests built, calcDispatcher enum line 1083 + 3 real handlers (gilbert_econ_speed_{compute,compare_vc,stats}) lines 9603-9642, 25/25 tests pass. ALWAYS verify a backlog unit's git/disk state before building it (the unit may be done). Sibling staleness this session: fabricated test triage + month-old Ollama-down."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.476Z
aliases: reference_backlog_pending_stale_2026_06_21
---


**CONTEXT:** slot:india autonomous /loop, fresh post-compact 2026-06-21. After FIXES (gated) + WIRINGS (needs_wiring=0) rungs, descended the never-idle ladder to BACKLOG (`state/shared/BUILD_STATE.json` `NEEDS_BUILDING.top_pending_units`, summary "3879 units across 730 milestones not yet in git"). Picked the cleanest india-pickable candidate honoring the ANY-DOMAIN override (non-safety-critical, exposes an already-built engine, no physics-judgment): **U-CW-07 (MS-CRITWIRE): "Wire GilbertEconomicSpeedEngine (254ln, unwired) -> prism_calc (lathe_cost)"**.

**VERIFIED ALREADY-SHIPPED (R8 read-before-build caught it):**
- `src/engines/GilbertEconomicSpeedEngine.ts` EXISTS (9.2KB, singleton `gilbertEconomicSpeedEngine`).
- Tests EXIST + PASS: `GilbertEconomicSpeedEngine.test.ts` + `GilbertShimEquivalence.test.ts` = **25/25**.
- WIRED to `calcDispatcher.ts`: enum entries line 1083 (`gilbert_econ_speed_compute/compare_vc/stats`), real case handlers lines 9603-9642 with lazy import. Commit banner: `FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-GILBERT (2026-05-20)`.
- So U-CW-07 ("wire it") is **DONE** -- the BUILD_STATE pending list is a month stale for it (and the `gilbert_econ_speed_*` actions ALREADY exist, so a literal "wire it" would create a DUPLICATE -- DuplicationGuard would THROW).

**GENERALIZABLE (R8 + R12 + the existing [[feedback_read_full_content_not_titles]] / MILESTONE_PROGRESS "subtract shipped" doctrine):** a BACKLOG "pending"/"not yet in git" tag is NOT evidence a unit is open. The milestone-progress -> BUILD_STATE pending list lags git (envelope status not reconciled against the actual commits). **Before building ANY backlog/pending unit: grep the engine/action on disk + git-log the unit id + check the dispatcher enum.** If the engine+action+tests exist, the unit is done -- skip it (building it = a duplicate that DuplicationGuard blocks). This is why slots descending to BACKLOG keep "finding work" that is actually shipped.

**FIX (fleet, NOT done this turn -- flagged for golf/sierra hygiene or a deliberate regen):** `node scripts/build-milestone-progress.mjs` + `node scripts/build-state-snapshot.mjs` reconcile envelope-status vs git-log; the pending list is stale because these have not been regenerated recently (BUILD_STATE generatedAt 2026-06-21T03:02 but its source milestone-progress envelopes still mark shipped units pending). Regenerating would drop the false-pending units.

**SESSION META-FINDING (3 stale/fabricated fleet artifacts, all verified this window):**
1. `reference_fleet_test_sweep_triage_2026_06_21` -- 2 FABRICATED red rows (PRISMSelfAwareness 31/31 green not 114/134 fail; businessDispatcher 197/197 green, ghost files don't exist). Corrected.
2. `reference_ollama_chat_live_healthy_2026_06_21` -- month-old "Ollama DOWN" is actually UP (17 models, /api/chat works).
3. THIS -- BACKLOG pending list lists shipped units (U-CW-07) as open.
The common lesson: **VERIFY fleet-tracking artifacts (triage memories, BUILD_STATE pending, spec status snapshots) against live git/disk/runtime before acting -- they go stale/wrong and feed phantom work** (task-freshness + R12 + R8).

**SIBLINGS:** [[reference_fleet_test_sweep_triage_2026_06_21]] · [[reference_ollama_chat_live_healthy_2026_06_21]] · [[reference_india_ai_test_reds_backlog_2026_06_21]].
