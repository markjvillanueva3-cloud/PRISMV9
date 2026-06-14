---
name: speed-feed_synthesis
description: "[auto-synth · verify] Compounding synthesis of the speed-feed domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: speed-feed
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:49:49.696Z
  sourceHash: 624349c0e6d2
  advisoryOnly: true
  mustHumanVerify: true
---

# speed-feed — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Canonical cutting‑force constants** live exclusively in `physics/constants.ts` and are never inlined; they drive every Fc, power, and MRR calculation ([reference/reference_oscar_sfc_canonical_kc_per_iso]).
- **Slot‑bootstrap enforcement** appears in every shipped OSCAR SFC unit to pin tool‑material relationships, persist calibrations, and apply vendor‑specific overrides (e.g., hyperMILL macro D) ([reference/reference_post_ship_bridge-deep-u-bridge-sfc-hypermill], [reference/reference_post_ship_oscar-sfc-9axis-ms0-u-osc-axis-gap-rootcause]).
- **Closed‑loop training**: a per‑(ISO × mode) Vc calibration model is derived from live sweep ledgers, persisted, and fed back into the SFC ↔ HSMAdvisor ↔ G‑Wizard loop ([reference/reference_oscar_sfc_closed_loop_training_2026_06_08], [reference/reference_oscar_sfc_close_loop_2026_05_31]).
- **Vendor baseline comparison** is performed automatically; PRISM consistently shows a +67–91 % feed advantage over four published sources, surfacing explicit deltas per vendor ([reference/reference_oscar_sfc_per_vendor_compare_2026_06_09]).
- **Database bridging via Juliett** stores massive tool catalogs and outcome caches, applying the same persistence discipline across all SFC galaxies ([reference/reference_oscar_sfc_juliett_database_bridge_2026_05_29]).
- **Radial‑depth % parameter is inert** in both MRR layers; the fix clamps it to force coupling rather than treating it as a duty‑cycle factor ([reference/reference_oscar_radial_pct_inert_rootcause_2026_06_10]).

## Key decisions & rules
- **Physics invariants (6 non‑negotiable)** must be respected in every engine/algorithm; they are documented in the GSD and enforced by slot history ([reference/reference_oscar_sfc_gsd_2026_05_29]).
- **Never inline kc values** – always import from `physics/constants.ts` ([reference/reference_oscar_sfc_canonical_kc_per_iso]).
- **Pin tool‑material mapping** at slot bootstrap to avoid runtime mismatches ([reference/reference_post_ship_oscar-sfc-9axis-ms0-u-osc-axis-gap-rootcause]).
- **Persist calibration models per ISO × mode** after each live sweep; use the persisted model for subsequent feed calculations ([reference/reference_oscar_sfc_closed_loop_training_2026_06_08]).
- **Apply hyperMILL macro overrides (D)** when bridging from BRIDGE‑DEEP to SFC, ensuring macro compatibility ([reference/reference_post_ship_bridge-deep-u-bridge-sfc-hypermill]).
- **Fix EPERM ledger leak and orphaned engines** before any front‑end changes; closed‑loop validation must succeed first ([reference/reference_oscar_sfc_backend_closed_loop_2026_06_08]).
- **Clamp radial_depth_pct** to a constant (force‑clamp) because both MRR layers ignore it, eliminating the erroneous duty‑cycle assumption ([reference/reference_oscar_radial_pct_inert_rootcause_2026_06_10]).
- **Raise commit‑pressure thresholds** as per the root‑fix on 98 % commit maxout to keep the STOP PRESSURE GATE from triggering ([reference/reference_commit_pressure_rootfix_2026_06_10]).

## Open threads
- **Radial depth handling:** while clamping fixes the inert behavior, a formal integration test in the 401‑assertion suite is pending to confirm no side effects ([reference/reference_oscar_sfc_test_gauntlet_401]).
- **Vendor divergence remediation:** candidates identified for N‑aluminum and M/H/K turning‑finishing gaps remain under evaluation; concrete action items are not yet assigned ([reference/reference_oscar_sfc_divergence_investigation_2026_05_27]).
- **Extended vendor baseline comparison:** current analysis covers four sources; expanding to additional catalogs could refine the +67–91 % feed advantage metric ([reference/reference_oscar_sfc_per_vendor_compare_2026_06_09]).
- **Critical resource root expansion:** new galaxies may require updates to the canonical registry; process for safe extension is documented but not yet exercised for post‑May‑2026 builds ([reference/reference_critical_resource_roots_2026_05_30]).
- **Commit pressure gate tuning:** after the recent fix, monitoring is needed to ensure the raised thresholds do not mask other performance regressions ([reference/reference_commit_pressure_rootfix_2026_06_10]).
