---
title: Turning accuracy oracle + Lathe-Wizard validation gap
tags: [oscar, turning, lathe, accuracy-oracle, silent-wrong, validation, safety]
slot: oscar
date: 2026-07-03
related: [sfc-accuracy-u-osc-sweep-power-oracle, turning-accuracy-u-osc-turning-oracle]
---

# Turning accuracy oracle + Lathe-Wizard validation gap

**Lesson (slot:oscar, 2026-07-03).** A large combinatorial sweep that only classifies results as *finite + positive + monotone* proves "not obviously broken", NOT "numerically correct". The lathe wizard already had a 12.6M-combo harness (whiskey) doing exactly that — so the highest-leverage accuracy gap in the fleet was the **silent-wrong identity oracle**, absent for turning. Ported oscar's validated milling oracle to turning (clone-don't-fork).

## The turning identity oracle (`mcp-server/scripts/lib/turning-sweep-oracle.ts`)
Re-derive the load-bearing identities from the engine's OWN outputs, without calling the engine, so a dropped unit factor / omitted term / decoupled value surfaces as a divergence instead of passing silently. Four live-validated identities + cross-cell:

1. **RPM** `n = 1000*Vc/(pi*D)` — hard check with **clamp-aware forgiveness**: turning runs G96 CSS with a G50 rpm cap, so `rpm < 1000*Vc/(pi*D)` is a *legitimate clamp*, not a bug — forgive ONLY at `machine_max/min_rpm`, never blanket. (A live 6061 cell at the 4000-rpm cap would false-flag without this.)
2. **Power** `Pc = Fc*Vc/(60000*eta)`, **eta=0.85** — the spindle-efficiency term is MANDATORY for turning; omitting it false-flags ~15% on EVERY cell. (Milling used raw `Fc*Vc/60000`; turning does not.) Confirmed live: 1045 cell `1386*220/51000 = 5.98 kW` = engine's reported P.
3. **Force** `Fc = kc1_1*ap*f^(1-mc)` — IPR feed, single-point (no `fz*z`); `kc1_1/mc` read from `result.material_properties`.
4. **Tool life** `T = (C/Vc)^(1/n)` — pure Taylor; **self-consistency by construction** (recompute with the engine's own exposed `taylor_C/taylor_n`, forgive its own display rounding: whole-min for life>=1, 3-sig-fig for <1, the sub-1-min fix that stopped high-Vc lives collapsing to 0).
- **Cross-cell** HSS<carbide + ISO-speed-ordering: reuse `makeCrossCellOracle` verbatim (import, don't fork).
- **DROP** chip-thinning — single-point turning has no radial-thinning analogue.
- **Torque `Fc*D/2000` + MRR `ap*f*Vc`**: field-blocked (the facade doesn't emit `predicted_torque_Nm`/`predicted_mrr_cm3_min`). Per **R12, LOG them as field-absent advisories, never silently skip** — a coverage gap must be visible, not hidden.

## Coverage verdict (6-miner assessment)
PRISM's machining-physics CORE is genuinely deep AND wired (15/16 math domains; Kienzle/Merchant/Oxley/Taylor/Johnson-Cook/Usui/Jaeger/SLD/RCSA/deflection/chuck-jaw/collision all grep+live-test confirmed against real dispatcher wiring, not docstrings). The gap was never coverage — it was **accuracy validation** + a few run-only-discoverable defects.

## SAFETY-CRITICAL bug-finding (gates any lathe-validity claim)
`TurningProgramAssemblerEngine.ts:1568-1587` passes wrong field names to `ChuckJawForceEngine` via an `as any` cast -> `gripping_diameter` undefined -> NaN -> **fallback `safety_factor=10` (always-safe)**. Chuck-ejection ejection physics is BYPASSED in production (reachable via `turningDispatcher:794`). A validation run would certify clamp-safety off a fabricated constant. **A lathe-wizard validation cannot claim validity until this is fixed** (whiskey + physics-reviewer + operator). Lesson: an `as any` at an engine boundary silently swallows a field-name mismatch — a fabricated safety pass is worse than a crash.

## Handoff pattern
oscar builds the standalone oracle FILE (new, non-hot, no lane contention); the owning slot (whiskey) wires it into its sweep + runs the full-scale validation + emits the blocked fields. Cross-slot accuracy work decomposes cleanly this way. See memory [[reference_machining_physics_coverage_lathe_validation_2026_07_03]].

## WIRED + VALIDATED (2026-07-03, oscar, commit `468a605131`)
The oracle is now integrated (oscar did the wiring too, whiskey being idle). A pure tested bridge `mcp-server/scripts/lib/lathe-wizard-accuracy.ts` maps the facade result → `turningPerCellOracle`; the sweep runs it on every success cell with a separate `accuracy` dashboard block and a combined fail-loud verdict.

**Result: 0 accuracy-oracle violations across a 1,000,000-cell strided sample (7.02% of the 14.2M space, spans all categorical dims).** power/force/tool-life/rpm identities numerically correct. The Lathe Wizard's core physics is numerically validated, not just "not obviously broken".

### The clamp-forgiveness lesson (the 3457→0 fix)
The first wired run flagged **3457 `turning_rpm_inconsistent` — all false positives.** Root cause: the facade hard-clamps rpm to a DEFAULT band `Math.max(50, Math.min(6000, rpm))` (`calculateRPM:471`), applied after the optional machine-max clamp. The oracle only forgave against the caller-supplied `machine.max_rpm`, which is `undefined` for many JM lathes → every small-dia/high-Vc cell false-flagged the legitimate 6000 ceiling. Fix: forgive the **EFFECTIVE band `[50, min(max_rpm ?? 6000, 6000)]`**, forgiveness kept CONDITIONAL (an rpm pinned at 6000 with the ideal below the ceiling is still flagged — proven by an adversarial test). **General lesson: a ported accuracy oracle must mirror the engine-under-test's EFFECTIVE clamp — including hidden internal defaults — not just the caller-supplied ceiling.** The milling oracle had no hidden default, so the naive port missed it.

### SCOPE (adversarial-verified — do NOT overclaim)
A 7-agent verification Workflow (`wf_c798762f`) scoped the "numerically validated" claim down to **internal self-consistency** and caught a real coverage bug:
- The oracle takes the facade's OWN Vc/feed/doc as GIVEN — it only proves rpm/power/force/life are consistent with them, NOT that Vc/feed/doc were derived correctly. A wrong iso/coolant/strategy factor propagates self-consistently with 0 divergence. Upstream-derivation validation is the separate vendor-parity gauntlet's job. Report the wizard **internally self-consistent**, not "physics-validated".
- **rpm-coverage bug (fixed same session):** the first cut skipped the rpm identity on boring/drilling/facing ops (copying invariant I6's op-gating) on a premise the refuter disproved — `calculateRPM:690` uses the workpiece OD unconditionally (`tool.diameter_mm` is dead). Removing the exclusion extended rpm coverage from ~54% → 100% of tool×op combos (still 0 violations). Lesson: don't copy another instrument's op-gating without verifying its premise against the engine-under-test.
- Known limit: the 1N force / power absolute floors can mask a ~5–11% relative error at the thinnest grid corner (~9N Fc).

### Data gap surfaced (whiskey/shop-config)
Several JM lathes lack `max_rpm` in `ShopConfigurationEngine`, so the sweep falls to the facade default 6000 and does NOT exercise true per-machine ceilings — a per-machine validity claim needs those populated. Memory [[reference_lathe_wizard_accuracy_oracle_wired_2026_07_03]].
