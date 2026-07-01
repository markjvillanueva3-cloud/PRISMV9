---
name: reference_oscar_sfc_per_vendor_compare_2026_06_09
description: "SFC tri-comparator now surfaces explicit PRISM-vs-G-Wizard / PRISM-vs-HSMAdvisor per-vendor published deltas; finding = PRISM uniformly +67-91% on feed vs all 4 published sources (valid aggressive-roughing strategy, NOT a bug)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.710Z
aliases: reference_oscar_sfc_per_vendor_compare_2026_06_09
---


# SFC per-vendor published comparison (U-OSC-COMPARE-PER-VENDOR, slot:oscar, 2026-06-09)

The standing `/goal` demanded comparison "to gwizard and hsmadvisor **specifically**". The
live closed-app calculators are operator-gated (verified exhaustively: HSMAdvisor cut data is
binary, G-Wizard `tooltables.csv` is a 2-line table index, neither exposes an API or local
cutting-data file). The honest maximum without the operator running the closed apps: surface
each vendor's **published reference table** delta explicitly.

## What shipped
`SpeedFeedTriComparatorEngine` already computed a `per_source[]` breakdown inside the baseline
comparison but discarded everything except the blended median. Added an **additive
`baseline_detail`** field on `TriCompareResult` carrying that `per_source[]` (type derived via
`ReturnType<typeof speedFeedBaselineComparatorEngine.compare>["per_source"]` -- no union
duplication, no behavior change). `sfc-full-sweep-compare.mjs` now extracts the `cnccookbook`
(= CNCCookbook, **the publisher of G-Wizard** -- its rows ARE G-Wizard's published S&F table)
and `hsmadvisor` per-source rows and reports an explicit:

```
PRISM vs G-Wizard & HSMAdvisor -- SPECIFICALLY (each vendor's PUBLISHED S&F reference):
  G-Wizard (CNCCookbook S&F) | 144 datapoints | Vc -4.7% (conservative=SAFE) | fz +101.3% | 76/68
  HSMAdvisor (public table)  |  12 datapoints | Vc -37.8% (conservative=SAFE) | fz +86.9% | 12/0
```

Honestly captioned: this is the PUBLISHED reference, NOT the live closed-app calculator (those
remain the `gwizard`/`hsmadvisor` live `systems[]` adapters that read the installed apps + abstain).

## The finding (comparison earning its keep again)
The per-vendor view immediately exposed: **PRISM's feed-per-tooth is uniformly +67% to +91%
higher than EVERY published source** (not a cnccookbook-is-conservative artifact). Canonical
P/1018/Ø12.7mm/carbide/milling/roughing probe:
- PRISM fz **0.1334mm** (0.00525"/tooth), vc 140 m/min.
- sandvik fz 0.080 (+66.7%), kennametal 0.075 (+77.9%), cnccookbook 0.070 (+90.6%), hsmadvisor 0.080 (+66.7%).

**Verdict: NOT a bug.** 0.00525"/tooth for a 1/2" 4FL carbide endmill roughing 1018 is in the
reputable aggressive-roughing chip-load band (0.004-0.006 in/tooth, Harvey/Helical). PRISM runs
a coherent **low-speed (-35% Vc, safe) / high-feed (+67% fz)** roughing strategy; the published
tables are conservative general-purpose defaults. Chip-thinning does NOT explain it (ae/D=0.378
-> RCTF ~1.03). The fz is the POST-DERATE value -- it already cleared the orchestrator's
force/deflection/holder/stability chain. Auto-detuning to match conservative defaults would be
WRONG (degrades a valid strategy) AND would touch the feed model (physics-reviewer gate per
oscar soul) -- so surfaced, not "fixed" (R12).

**Optional future unit (NOT urgent):** a physics-reviewer fz-model + force-validation audit
could confirm the derate chain isn't systematically under-protecting at the +67% feed band --
but absent evidence of force-envelope violation, the current behavior is defensible.

## Files
- `mcp-server/src/engines/SpeedFeedTriComparatorEngine.ts` -- `baseline_detail` field + attach from `baselineRes`.
- `mcp-server/src/__tests__/SpeedFeedTriComparatorEngine.test.ts` -- 2 tests (per_source sign-correct vs live PRISM + published anchors; null when no baseline). 10/10 green.
- `mcp-server/scripts/sfc-full-sweep-compare.mjs` -- `byVendor` accumulator + per-vendor console section + ledger fields `gwizard_published_vc_delta_pct` / `hsmadvisor_published_vc_delta_pct`.

Related: [[reference_oscar_sfc_live_vendor_compare_2026_06_09]] (live-app gate verified) ·
[[reference_oscar_sfc_hss_overspeed_finding_2026_06_09]] (prior comparison-surfaced finding) ·
[[reference_oscar_sfc_axis_liveness_map_2026_06_09]].
