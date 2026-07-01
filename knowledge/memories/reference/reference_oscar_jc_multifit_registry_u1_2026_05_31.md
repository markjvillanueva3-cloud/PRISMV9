---
name: oscar-jc-multifit-registry-u1-2026-05-31
description: "JC multi-fit variant registry U-1 shipped (commit 3ac30f2b42) — additive named-fit registry + provenance + fail-loud resolver + °C accessor on johnson-cook-coefficients.ts (slot:oscar)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.690Z
aliases: reference_oscar_jc_multifit_registry_u1_2026_05_31
---


`U-OSC9-JC-CELSIUS-FAMILY-UNIFY` sub-unit **U-1 shipped** (slot:oscar, 2026-05-31, commit `3ac30f2b42`) — the additive multi-fit registry foundation for the JC celsius-family unify (follows the [[oscar-sfc-jc-celsius-family-2026-05-31]] spec; predecessor [[oscar-sfc-jc-single-source-2026-05-31]]).

**What:** appended to canonical `src/physics/johnson-cook-coefficients.ts` (PURELY additive — `JC_COEFFICIENTS`/`findJCMaterial`/`listJCMaterials` byte-unchanged, diff `+399/-0`): types `JCFitRegime`/`JCProvenance`/`JCFitVariant`/`JCResolvedFit`; `JC_FIT_VARIANTS` registry (holds ONLY non-default fits; seeded `Ti6Al4V.HighRate` = 1098/1092/0.93/0.014/1.10, T_melt 1933K=1660°C+273, verified vs UltimateSpeedFeedEngine:1522 + AdvancedPostPhysicsEngine:120); `resolveJCFit(id,variant?)` **fail-loud** (unknown variant→null, NO silent default fallback); `listJCFitVariants` ([] for unknown alloy); °C accessor `jc{KelvinToCelsius,CelsiusToKelvin,MeltingCelsius}` + `JC_KELVIN_CELSIUS_OFFSET=273` (integer, consistent with JC_T_ROOM_K=293=20°C; jcMeltingCelsius(Inconel_718 1609K)=1336°C reproduces spec Class-A anchor).

**Key design point:** each `JCFitVariant` carries its OWN T_melt — the Ti high-rate fit calibrates at 1933K vs Lee-Lin default 1878K, so reusing the default's T_melt would corrupt T*. Variants are addressable BY NAME; the default stays authoritative for every existing 65-key lookup.

**Attribution correction (transcription-audit doctrine paid off):** the spec's "Meyer/Kleponis" guess for the Ti high-rate fit was corrected to **Sima & Özel (2010)** per the AdvancedPostPhysicsEngine module header (the engine DATA lines carry no citation; full reconcile in U-3).

**Tests:** `johnson-cook-fit-variants.test.ts` 20/20 (R9 intent — additive invariance, distinct-variant, fail-loud, provenance integrity, registry closure, °C frame identities). JC suite 60/60. tsc clean. Per-file scrutiny 2+2 PASS (physics arm: transcription 5/5 exact, frame math, S(x) unchanged/not-applicable; integration arm: additivity byte-proven, fail-loud all 8 paths).

**Deferred (U-2..U-5):** absorb Class-A · register Class-C/D + repoint 4 °C engines · reconcile mislabels (LAM 4140↔4130, AdvPost 316↔316L) · cross-engine single-source invariant test. Each its own bounded unit on the now-proven U-1 foundation. Wiki: [[jc-multi-fit-variant-registry]].

**⚠ Fleet git-health finding (for golf):** the post-commit auto-gc on the shared object store reported `bad tree object e36809bbd238e2894fff1e89620be0846c9a1923` + `failed to run repack` / `gc failed`. Diagnosed as a PRE-EXISTING dangling/unreachable corrupt object — `git cat-file -t e36809bb` → "could not get object info"; it is NOT in my commit's reachable set; reachable history is fsck-clean (SessionStart connectivity-only fsck passed). My commit `3ac30f2b42` + tree `cc92419d` + both blobs verified fully readable, so no data loss to my work. The failed repack rewrote nothing (repo unchanged). Needs `git prune` / object-store repair by golf (git-health/[[feedback_golf_owns_reaper|fleet-hygiene]] owner, [[feedback_golf_owns_reaper]]) — the shared store is used by 140+ active loop worktrees, so repair should be coordinated, not unilateral from a work slot.

Relates to [[feedback_check_units_first]] (°C/K frame), [[feedback_verify_actual_contract_not_proxy]], [[feedback_always_fill_gaps]].
