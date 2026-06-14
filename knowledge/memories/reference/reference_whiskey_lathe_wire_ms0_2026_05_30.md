---
name: reference_whiskey_lathe_wire_ms0_2026_05_30
description: "LATHE-WIRE-MS0 — wired zero-coverage lathe backend gaps (alarm, eccentric) + 1 fixed crash + 2 deferred findings (slot/whiskey 2026-05-30)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.054Z
aliases: reference_whiskey_lathe_wire_ms0_2026_05_30
---


# LATHE-WIRE-MS0 — zero-coverage lathe backend wiring (slot:whiskey, 2026-05-30)

After the LATHE-LORA-MS0 AI tier ([[reference_whiskey_lathe_lora_tier_complete_2026_05_30]]), continued with backend-dev wiring (P0 per [[feedback_high_roi_backend_first_slot_queue]]). A schema-bounded recon Workflow (wf_6060c5cd-2b0, 3 agents) ranked 5 candidates against the live slot.

**SHIPPED (2 units, all on prism_turning, per-file scrutiny PASS):**
- **U-LATHE-ALARM-WIRE** `7da5c97a44` — 7-action alarm-diagnostics surface → AlarmDiagnosticsEngine (was ZERO lathe alarm path; 267 Okuma OSP codes; already in dataDispatcher = proven callable). lathe_alarm_{lookup,search,fix_procedure,list_by_controller,controllers,difficulty,summary}. Controller defaults OKUMA (100% Okuma fleet). Read-only, no new IP (re-exposes in-repo DB). 10/10 tests; 2-reviewer PASS.
- **U-LATHE-ECCENTRIC-WIRE** `03beb58790` — eccentric/trilobe turning surface → EccentricTurningEngine (was unwired). lathe_eccentric_{generate,validate,controllers}. generate SURFACES validateInput problems (safety-first: >3000 RPM polar-interp limit can't be silently skipped). 9/9 tests; 3-reviewer PASS (incl physics).
- **U-LATHE-CHUCK-JAW-WIRE** `4f8302de22` — chuck-jaw gripping-force safety surface → ChuckJawForceEngine. lathe_chuck_jaw_{force,validate} (closes a zero-coverage SAFETY gap on a 100%-chuck-clamped fleet). **Shipped together with a SAFETY-BUG FIX (see below).** 7/7 tests incl. fail-on-revert regression oracle; **3-reviewer PASS** (physics-confirm + wiring + independent-who-re-derived-the-algebra-by-hand).

**SAFETY-BUG FINDING — FIXED (R12, physics-reviewed):** `ChuckJawForceEngine.is_safe` was **degenerate — structurally false for EVERY rotating job**. `sf = effectiveGrip/requiredGrip = SAFETY_FACTOR_MIN − jawCentrifugal/requiredGrip`, so `is_safe = (sf >= SAFETY_FACTOR_MIN(2.5))` DOUBLE-COUNTED the 2.5× already baked into `requiredWithSafety` (demanding ~6.25× base grip) → `sf < 2.5` for any rpm>0 → is_safe could only be true at rpm=0. A safety gate that flags 100% of rotating jobs unsafe = safety theater (operators ignore it). Fixed `ChuckJawForceEngine.ts:154`: `sf >= SAFETY_FACTOR_MIN` → `sf >= 1.0` (the safety-factored grip must SURVIVE centrifugal loss with the base requirement covered). The 2.5× ISO 10218 margin stays fully enforced at `requiredWithSafety` — physics-reviewer CONFIRMED correctness-not-softening; `maxSafeRpm` was already solved at the sf=1.0 boundary so it's now consistent. Regression-guarded: a safe 2kg/800rpm part (sf≈2.47) must report is_safe=true (was false pre-fix) + a 3mm-grip/4000rpm danger case (sf≈0.18) must report false. **Note: the FRICTION_COEFFICIENTS map I flagged as an "inconsistency" turned out to be DEAD CODE (defined, never referenced) — the inline μ fallback is the real, defensible source; the actual blocker was this degenerate verdict, found only by reading the math.**

**BUG FINDING — FIXED (R12):** EccentricTurningEngine.ts:145 had a dead fallback `|| CANONICAL_MATERIAL_DB.steel_1045` — the DB is keyed `"1045"` (constants.ts:127), so `.steel_1045` was undefined → ANY off-DB material (notably GRAPHITE, the engine's own documented material per the `ap=0.020 // graphite` comment) threw `TypeError reading kc1_1 of undefined`. The eccentric wire would have ACTIVATED this dormant crash. Fixed → `["1045"]`; physics-review PASS (kc1_1=1800/mc=0.25 finite, no formula touched, conservative for soft materials). Regression-guarded by a graphite generate test.

**DEFERRED (next-session work, with reasons):**
- **U-LATHE-CATALOG-ADAPTER-WIRE** (galaxy-brain P0 #2) — recon agent failed structured-output; ROI scan flagged it as an internal facade wire with inline-constant adjacency. Verify catalogConsumerAdapter exists + resolve() signature in-slot before wiring.
- **Monolith{SurfaceFinish,ToolTypes,HyperMillFixture} + registries** (P1) — NOT in slot worktree (cross-tree on H:/prism); inline-constant risk. Cross-tree dependency, not in-slot wireable.

**LATENT FINDING (pre-existing, NOT mine, deferred — physics-reviewer flagged):** `buildMaterialPhysics` (constants.ts:988) looks up `AISI_CUTTING_COEFFICIENTS[partial.name]` using the full descriptive name (`"AISI 1045 Carbon Steel"`), but that table is keyed by short codes (`"1045"`, line 945) → the per-material AISI override arm NEVER hits for any `_RAW_MATERIAL_DB` entry; every material silently uses the per-ISO `CANONICAL_KIENZLE` value instead of its tuned AISI value (e.g. 4140 gets P=1800 not its tuned 1950). Doesn't affect 1045 (both 1800). Worth a separate unit — affects kc accuracy fleet-wide for non-P-default materials.
