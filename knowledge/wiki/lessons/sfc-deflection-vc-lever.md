---
title: SFC deflection/force constraints reduce fz, not Vc (the Vc-collapse bug)
type: lesson
domain: speed-feed
slot: oscar
date: 2026-06-23
commit: ec0ce2ea26
tags: [sfc, physics, kienzle, deflection, safety-clamp, regression]
---

# SFC: a safety/parameter clamp must reduce the lever the violated quantity depends on

## What happened
`SpeedFeedOrchestratorEngine.compute()` (the SFC physics hub feeding the 11.2M variability
corpus + `sfc_nine_axis`) resolved a failed safety check with one undifferentiated scalar:

```js
reductionFactor = min over ALL failed checks of (limit / value);
Vc *= reductionFactor;          // collapse cutting speed
fz *= Math.sqrt(reductionFactor);
```

The `sfc-engine-parity-probe.mjs` showed the core 2-7x BELOW published carbide bands whenever
deflection bound. Live 1045 (12mm tool, 36mm stickout, ap=6): deflection 291% was the **sole**
failing check, yet Vc was crushed 204 -> 33.4 m/min (6x) and deflection **still ended at 291%**.

## Why it's wrong (physics)
- Cutting force: `Fc = kc1_1 * ap * fz^(1-mc)` -- no Vc term.
- Deflection: `delta = Fc * L^3 / (3 E I)` -- function of Fc, hence ap/fz, **not Vc**.
- Workholding: `Fc < 0.7 * clamp` -- **not Vc**.
- Torque: `T = Fc * D / 2000` -- Vc cancels because `rpm = 1000*Vc/(pi*D)` scales with Vc.
- Power: `P = Fc * Vc / 60000` -- the **only** constraint genuinely driven by Vc.
- rpm: `rpm = 1000*Vc/(pi*D)` -- driven by Vc.

So reducing Vc to fix a deflection/workholding/torque violation is **ineffective** (the violation
persists -- under-protection) and **destructive** (publishes a 2-7x-too-slow cut, wrong tool life).

## The fix (commit ec0ce2ea26)
Route each binding check to its physically effective lever:
1. force-driven {deflection, workholding, torque} -> reduce **fz** by `r^(1/(1-mc))`
   (Kienzle: to cut Fc by r, fz scales by r^(1/(1-mc)) -- NOT `Math.sqrt`, which under-reduces).
2. feed_rate (`Vf = fz*z*rpm`, linear in fz) -> reduce **fz**.
3. rpm -> **clamp Vc** to `maxRPM*pi*D/1000`.
4. power (couples to Fc AND Vc) -> resolved **LAST**: recompute P after the fz cuts (which already
   lowered Fc); only then reduce **Vc** by `powerLimit/P`.

## Validated
Parity probe page/core ratio 2-7x -> 1.0-1.33x; core now IN published carbide bands for all 6 ISO
groups (P 200, M 120, N 305, K 180, S 50, H 226). Regression lock `sfc-deflection-vc-lever.test.ts`
(Vc deflection-independence + fz absorbs the constraint + power lever still clamps). physics-reviewer
adjudicated the original FAIL/CRITICAL.

## Generalizable rule
A clamp/derate must act on the variable the violated quantity is a function of. Identify the
dependency (`d(quantity)/d(lever)`) before choosing the lever -- a scalar "reduce everything by the
worst ratio" silently mismatches levers and can both fail to protect and destroy a correct output.

## Related
- Memory: [[reference_oscar_sfc_deflection_vc_lever_2026_06_23]]
- [[feedback_audit_consumers_when_moving_logic_into_engine]]
- Sibling pre-existing (next): nine-axis MRR-scaling + runout-life in `UltimateSpeedFeedEngine`.
