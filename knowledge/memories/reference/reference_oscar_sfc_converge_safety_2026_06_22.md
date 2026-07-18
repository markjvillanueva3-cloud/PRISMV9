---
name: reference_oscar_sfc_converge_safety_2026_06_22
description: "SFC convergence under-report fixed (slot:oscar, 2026-06-22, commit 21583dfe59). PRISM_SFC_CONVERGE=1 published delegated UltimateSpeedFeedEngine physics but left spindle_rpm/MRR/deflection + the whole safety_checks/limiting_factors panel computed on the orchestrator's LOWER values -> 5.5x-20x safety under-report (25kW recommendation on a 1.5kW machine read 1.28kW). Fix: safety-gate the delegation (publish only if within machine limits), resync all derived+safety+uncertainty+alternatives to published physics, else fall back. Was the blocker to convergence-default-on."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.699Z
aliases: reference_oscar_sfc_converge_safety_2026_06_22
---


# SFC convergence under-report — fixed (slot:oscar, 2026-06-22)

**Commit `21583dfe59` [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-CONVERGE-SAFETY.**

## The bug (R12-quantified, traced live)
`SpeedFeedOrchestratorEngine.compute()` has a flag-gated convergence path (`PRISM_SFC_CONVERGE=1`,
built by SFC-CONVERGENCE P1/P2) that delegates core physics to `UltimateSpeedFeedEngine.calculate()`.
It overrode only the **8 headline scalars** (Vc/fz/Vf/Fc/power/torque/life/Ra) but the result still
reported `spindle_rpm`/`mrr_cm3min`/`deflection_um` from the orchestrator's values AND the entire
`safety_checks`/`limiting_factors` panel computed on the orchestrator's **lower inline physics**.
Result with the flag ON was internally inconsistent + the safety panel **under-reported load**:
- haas vf-2 base cut: published Vc=160 m/min while spindle_rpm=1530 (1530 rpm => Vc=57.7, not 160);
  power_kw=12.5 while the power safety check read 2.25 kW (**5.5x under-report**); MRR/deflection stale.
- weak 1.5 kW machine + heavy cut: published a **25.3 kW / 94.9 Nm** recommendation while the power
  check read 1.28 kW (**~20x under-report**) — a machine-wrecking over-publish with a near-green panel.

This was BOTH the blocker to flipping convergence default-on AND a latent safety bug whenever the flag
was set. Same decoupling class as the radial-engagement regression `69146aa9c1` (forces drifting from
the clamps that read them).

## The fix (additive; flag-OFF provably byte-identical)
1. **SAFETY GATE** in the delegation block: publish the delegated recommendation ONLY when within the
   SAME machine limits the orchestrator clamps to (power/torque/rpm/deflection/feed/workholding, all
   resolved in Step 4). On accept → resync `safety_checks` + all 6 `limiting_factors`
   (utilization + per-factor severity bands: rpm>90, defl>70, rest>80) to the delegated values. On
   breach/invalid-shape/exception → fall back to the orchestrator's already-clamped, self-consistent
   result, recording the reason in `formulas_used` (R12 fail-loud).
2. **CONSISTENCY**: new `convergeRpm`/`convergeMRR`/`convergeDefl_mm` derived locals (init to
   orchestrator finals -> flag-off byte-identical) feed `spindle_rpm`/`mrr_cm3min`/`deflection_um`.
   `computeFullUncertainty` + `alternatives` anchored on `convergeVc`/`convergeFz` so the uncertainty
   band, stability assessment, and "balanced/recommended" alternative describe the published cut.

## Validation
- Live probe: ACCEPT (light finishing, within limits) vs REJECT/fallback (aggressive base over-torque;
  weak machine 25kW>1.2kW logged + safe fallback).
- 22 tests pass: 6 converge-flag (test 2 rewritten — aggressive base now SAFELY falls back, was
  asserting the buggy over-publish) + 7 new invariant tests (`SpeedFeedOrchestrator-converge-safety.test.ts`:
  I1 Vc=pi*D*rpm/1000, I2 MRR=ap*ae*Vf/1000, I3 safety-value==published-physics) + 9 boring/turning
  regression. 0 tsc errors.
- JM fleet x material sweep (production flag-off path): **30/30 PASS** — material-aware (Vc by ISO
  P72/N255-377/M37/S11/K98/H14), self-consistent, safety-honest. Confirms the material-blind bug
  (`reference_oscar_speedfeed_material_blind_diagnosis_2026_06_01`) stays fixed.

## Lesson
When a delegation/override changes an engine's HEADLINE outputs, EVERY downstream field derived from
the pre-override values (rpm, MRR, deflection, the safety panel, uncertainty band, alternatives) must
be re-pointed at the new values or it silently desyncs — and for a SAFETY panel that desync is an
UNDER-REPORT (it shows the lower pre-override load). Gate a less-conservative delegated recommendation
against the same machine limits the conservative path clamps to; never publish what you won't certify
safe. Sibling of [[feedback_audit_consumers_when_moving_logic_into_engine]].

## Open follow-ups (queued, not built)
- **Convergence default-on** is an operator decision + needs broad JM-fleet/material validation (even
  the base haas aggressive cut rejects on torque, so default-on mostly helps light cuts). NOT flipped.
- **4/5 JM mill machines use the generic 15 kW default** (only `haas vf-2` resolves real specs); Hurco
  VM30i / Okuma M460V-5AX / Haas OM-2 / Roku-Roku need real spec registration for accurate clamps
  (foxtrot/juliett machine-DB; do NOT fabricate specs — safety-relevant).
- **P2 deferred**: playbook deflection warning trigger uses pre-reduction `deflection_um` (pre-existing
  flag-off inconsistency); `rpmClamped` recommendation text can be stale on the accept path.
- **Residual**: uncertainty CIs use the orchestrator's UQ force model at the delegated operating point
  (anchored on published Vc/fz, but the force-model center is still orchestrator-Kienzle, not the
  delegated engine's). Deeper convergence = a future unit.

Builds on [[reference_oscar_sfc_two_engine_divergence_2026_06_21]] (which flagged the divergence;
this fix makes the convergence path safe + consistent).
