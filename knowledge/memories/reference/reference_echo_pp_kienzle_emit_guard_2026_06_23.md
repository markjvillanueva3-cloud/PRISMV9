---
name: reference_echo_pp_kienzle_emit_guard_2026_06_23
description: "Echo built U-PP-KIENZLE-EMIT-REGRESSION — 8-test R9 lock that PostProcessorPipelineEngine Stage-1.1 emits force == canonical kienzleForce of its reported kc1.1/mc (post-processor analogue of oscar's SFC inline-constant divergence guard)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.564Z
aliases: reference_echo_pp_kienzle_emit_guard_2026_06_23
---


**U-PP-KIENZLE-EMIT-REGRESSION** (slot:echo, 2026-06-23, commit `7cf0427bfb` on `cad-fusion-live-ms0`).

The post-processor pipeline emits the F/S a real machine runs, so an inline-constant
divergence in its physics emit reaches the shop floor — the post-processor analogue of
oscar's 2026-06-23 SFC `MATERIAL_HARDNESS` divergence ([[reference_oscar_sfc_material_table_divergence_2026_06_23]]),
where an engine carried its own inline kc/Taylor table diverging from `constants.ts` and
published values ~4x off while isolated identity tests stayed green.

**File:** `mcp-server/src/__tests__/PostProcessorPipelineEngine.kienzle-emit.test.ts` (8/8 green).
Locks `PostProcessorPipelineEngine` Stage 1.1 (`1.1_base_speed_feed`):
- `block.forces.Fc_N` == canonical `kienzleForce(reported kc1.1, mc, ap, emitted fz)` exactly.
- `kc1.1` is sourced from `CANONICAL_KIENZLE` (per-ISO P/M/K distinct + ordered) or a verbatim
  `MaterialContext` (has `id`) — never an inline divergent table.
- Coating(TiAlN=0.85)+wear(VB0.3→1.5) K-factor composition == base × ∏K.

**Contract facts learned (grounded in source, reuse these):**
- Stage 1.1: `kc1_1_base = material.kc1_1 ?? getCanonicalKc(iso)` (924); `kc1_1 = base × K_coolant ×
  K_coating × K_gamma × K_kappa × K_wear × K_edge` (980); `finalFc = kienzleForce(kc1_1, mc, max(0.1,
  blockAp), max(0.001, finalFz))` → `block.forces` (1219/1232). Stage `data` returns
  `{ kc1_1, mc, correction_factors: { kc1_1_base, kc1_1_corrected, K_* } }` (1250).
- `blockAp = |cut_z − prev_z|` (a G0 sets prev_z, the next G1 cut yields the ap).
- `_resolveContexts` (4238) uses `input.material` VERBATIM **only when it has both `iso_group` AND
  `id`**; otherwise by-name resolution canonicalizes kc1.1 to the ISO group (an input `kc1_1` without
  `id` is dropped). Same likely applies to tool overrides — pass full context to keep values.
- Stage flags default-ON (`s.X !== false`); disable downstream force-mutating stages
  (constitutive 1.2, engagement/chip-thinning/line-by-line Phase-2, dimensional_verification Phase-4)
  to isolate the Stage-1.1 emitted force for exact-equality asserts.

**Pattern:** an exact-equality assert that reads the engine's OWN reported constant and recomputes the
force via the canonical helper catches a wrong FORMULA; the divergent-CONSTANT catch needs an external
reference (verbatim-override survives + per-ISO distinctness vs `CANONICAL_KIENZLE`). Use both.

**Commit lane note:** the legacy `[BOOTSTRAP-SLOT-ENFORCE]` shared-tree bypass is NEUTERED;
`slot-commit-enforce` now only honors `[MAIN-FORCE]` (or a real slot worktree). Shared-tree index is
peer-contended — stage+commit ATOMICALLY in one command (a peer commit between `git add` and
`git commit` wipes your staging). [[feedback_commit_to_slot_worktree]]
