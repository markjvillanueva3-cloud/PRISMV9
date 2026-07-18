---
name: reference_oscar_sfc_fulltune_calib_axis_finding_2026_06_14
description: VERIFIED FINDING (slot:oscar 2026-06-14) — the SFC-FULLTUNE plan's U-FT-11/U-FT-12 premise is STALE. U-OSC9-CALIB-APPLY-WIRE already made the DL write/read/apply segment keys coherent (all iso|_|regime, tool-agnostic). The plan's "add toolMaterial at the apply site" fix would REGRESS the live calib loop. And the CSFH baseline axis (iso,operation) is orthogonal to the DL apply axis (iso,_,cutType=regime), so a naive calib-sync writes to dead buckets. Do NOT build U-FT-11/12 per the stale plan.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.705Z
aliases: reference_oscar_sfc_fulltune_calib_axis_finding_2026_06_14
---


# SFC-FULLTUNE U-FT-11/12 — the plan premise is stale (read code, not the plan)

While preparing to build the "HIGH-risk calib pair" (U-FT-11 + U-FT-12) per
`SFC-FULLTUNE-BUILDOUT-PLAN-2026-06-12.md`, I read the ACTUAL code and found the plan's
premise was invalidated by `U-OSC9-CALIB-APPLY-WIRE` (CSFH unit 12, commit `4ae684e0e2`,
which shipped AFTER the plan was authored). This is the "read the body, not the title"
honesty rule in action -- my own earlier memory (`reference_oscar_sfc_fulltune_pipeline`)
repeated the plan's stale claim verbatim.

## The segment-key axis (verified by reading the code)
`composeSegmentKey({material?, toolMaterial?, regime?})` (`SpeedFeedDeepLearningEngine.ts:444`)
returns `${iso}|${tool}|${regime}` where:
- `iso = resolveISOGroup(material)` (unknown material -> "P")
- `tool = canonToolType(toolMaterial)` -> **"_" when toolMaterial is undefined** (`:422`)
- `regime = canonRegime(regime)` -> **only CutType members (roughing/semi_finishing/finishing)
  accepted, else "_"** (`:429`). NOTE: `regime` here means **CutType**, NOT operation.

Three sites ALL pass `{material, regime}` (toolMaterial OMITTED -> tool="_"):
- DL **write** (recordFeedback): `:1432` `composeSegmentKey({material: context.material, regime: context.regime})`
  -- explicit comment `:1429` "tool-agnostic to match the carbide-assumed model... write-key == read-key".
- DL **read** (predictSpeed/Feed): `:803`, `:889` `composeSegmentKey({material, regime: cutType})`.
- **Apply** (live `prism_calc:speed_feed`): `UltimateSpeedFeedEngine.ts:2842`
  `composeSegmentKey({material: input.material, regime: cutType})` -- comment `:63-64`
  "apply READ-key == the DL recordFeedback WRITE-key (the coherence the loop depends on)".

=> write-key == read-key == apply-key == `iso|_|<cutType>`. **Already coherent.**

## Why the plan's U-FT-12 "fix" is a REGRESSION
Plan U-FT-12 (line 96): "Resolve the toolMaterial write-key vs apply-key mismatch (apply key
currently `iso|_|regime`); ... a segment trained WITH toolMaterial is now read at apply."
This assumes recordFeedback trains tool-SPECIFIC keys. It does NOT (it's tool-agnostic by
design, U-OSC9). Adding `input.tool_material` at the apply site would make the apply key
`iso|<tool>|regime` while the write key stays `iso|_|regime` -> they NEVER match -> the live
calib loop silently stops reading its own learned factors. **Do not apply.**

## Why the plan's U-FT-11 is axis-blocked + dormant
- **Axis mismatch:** CSFH `baseline-params.json` regimes are keyed `(iso_group, OPERATION)`
  (milling/turning/drilling). The DL apply key's regime axis is **CutType** (roughing/finishing).
  `canonRegime("milling") -> "_"`. So a calib-sync that feeds `regime=operation` lands EVERY
  record in the dead `iso|_|_` bucket, which the apply site reads only when cutType is unknown.
  A coherent calib-sync needs **cutType-resolved baselines** (a reducer change: group by
  (iso, cutType) or (iso, operation, cutType)), which the current reducer (U-FT-06) does not emit.
- **No vendor data:** the bare tool-agnostic sweep has `comparable=0` (every cell uncited) ->
  ZERO `confidence=vendor_corroborated` regimes -> calib-sync has nothing to sync. Dormant until
  the sweep carries vendor context (densification via SpeedFeedTriComparatorEngine, separate effort).

## Correct path (supersedes the stale plan units)
- **U-FT-12 -> ship a COHERENCE ANTI-REGRESSION GUARD** (not the regressive key-change):
  a test that LOCKS write-key == apply-key (both `iso|_|regime`) so nobody re-applies the
  stale fix, + the off-flag byte-identity assertion. The `PRISM_SFC_CALIB_APPLY` per-regime
  activation checklist (confidence + >=10 feedback + factor in band) remains valid as a future
  safety refinement but only matters once vendor data exists.
- **U-FT-11 -> needs (a) cutType-resolved baselines (reducer change) + (b) vendor data.** A correct
  build is multi-unit; a naive build is a dormant no-op writing to dead buckets. Defer with this spec.
- **U-FT-13** (tier-2 constant-change proposal, gated) + **U-FT-14** (inline-constant guard test)
  are INDEPENDENT of this axis issue -- buildable now.

Pairs with [[reference_oscar_sfc_fulltune_pipeline_2026_06_14]]. Doctrine: [[feedback_read_full_content_not_titles]].
