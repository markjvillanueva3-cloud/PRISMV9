---
name: reference_post_nonfinite_emit_sweep_complete_2026_06_26
description: POST-NONFINITE-SWEEP COMPLETE 2026-06-26 (slot:echo) -- the non-finite (NaN/Infinity) coordinate-emit bug class is guarded across the ENTIRE clean post-engine population (9 engines incl pre-existing). Convention + per-engine commits + the full-population audit method.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.729Z
aliases: reference_post_nonfinite_emit_sweep_complete_2026_06_26
---


# POST-NONFINITE-SWEEP -- complete across the clean post-engine population (2026-06-26, slot:echo)

**Bug class:** a non-finite (NaN / +-Infinity) numeric op field formatted directly into an emitted G-code token (`X${coord.toFixed(3)}`, `F${feed}`, `S${rpm}`, `D${offset}`, `.replace("{a}", angle.toFixed(3))`, or a `formatCoord` helper) produces a literal `XNaN` / `ZInfinity` / `FNaN` / `SInfinity` / `DNaN` the CNC control **rejects (or mis-executes)**. The ubiquitous `feat?.x || default` and `op.x ?? default` idioms catch falsy `0`/`undefined` but **NOT** `Infinity` (truthy + non-null); `?? ` also misses `NaN`. A derived value (`finalZ = startZ - target_depth`, `Math.ceil(Infinity/step)` pass loop) inherits the non-finite-ness or even spins an **unbounded loop**.

**Fix convention (every engine):** detect non-finite at the emit boundary -> **warn loudly + skip-the-move / halt-the-op / omit-the-token**, NEVER silently substitute a wrong-but-valid coord (a silent `X0.000` could rapid a turret/electrode to centerline / into the part). For a pure-string helper with **no warnings channel** (FiveAxis `getCoordRotation`), sanitize to a safe `0.000` AND append a loud `(WARNING: NON-FINITE ... - REVIEW)` comment. **BYTE-IDENTICAL for finite inputs** in every case (proven by every pre-existing suite staying green). Tests assert the dangerous EXECUTABLE token absent (`/[XYZFS...](NaN|Infinity)/`), NOT bare "NaN" -- the ERROR comment intentionally echoes `field=value` as the fail-loud signal (R12).

**Engines guarded (9):**
| Engine | Commit | Shape |
|---|---|---|
| RokuRokuFanuc31iMill | `4259b15e63` (pre-existing) | coord loop |
| HaasNGCMill | `c5fd2e27b5` (pre-existing) | coord loop |
| OkumaOSPMill | `59eae092f5` | generateToolpath raw coords + spindle S/F |
| HurcoV11Mill | `e502cfc993` | generateToolpath + generateSpindleStart |
| MitsubishiMV1200R WEDM | `4eae3443f2` | generateProfile + start + wire offset |
| PPOkumaTurning | `aec3dab6e6` | main-loop field guard (7 per-op methods) |
| PPWireEDM | `d34456a31d` | formatCoord sites + offset |
| FiveAxisPost | `ca64e2f6d6` | getCoordRotation .replace template (sanitize+flag) |
| PPSinkerEDM | `ce31781ef6` | main-loop field guard (formatCoord, plunge Z) |
| **OkumaB250 Lathe** | **in-flight PEER** | `nonFiniteOperationFields` -- DO NOT double-build |

**Audit method (the lesson):** "never claim completeness without an exhaustive search" -- my FIRST audit (memo's 5 engines) and a narrow `coord.*toFixed` regex BOTH undercounted. A broader `git status`-cross-referenced grep over ALL `*PostEngine.ts`/`*MasterPostEngine.ts` for `[XYZ]${`/`formatCoord`/`.replace("{a}"` + a `Number.isFinite` guard-count found 4 more each pass (PPOkumaTurning, then PPWireEDM+FiveAxis, then PPSinker). **CrossCAMPostEngine is a FALSE POSITIVE** -- a toolpath ANALYZER whose `.toFixed` are `parseFloat(metric.toFixed(n))` rounding, not coordinate emits. Final re-audit: 0 clean+vulnerable emitters remain.

**Fleet-wide sibling:** the whiskey live-tooling fix in `TurningPrintToProgramEngine` (`3bae0bbdca`, `finiteOr`/`finitePos` + a 200-pass cap on an Infinity-pocket loop) is the SAME class on the print-to-program emitter -- this is a genuine fleet-wide pattern, not isolated. See [[reference_echo_nonfinite_emit_bugclass_2026_06_25]] (the original 5-engine audit) + [[reference_echo_inflight_uncommitted_stale_memos_2026_06_26]] (why OkumaB250 is off-limits) + [[feedback_never_claim_absence_without_deep_search]].
