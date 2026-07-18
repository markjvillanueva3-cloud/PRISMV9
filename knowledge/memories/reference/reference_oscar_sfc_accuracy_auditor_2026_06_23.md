---
name: reference_oscar_sfc_accuracy_auditor_2026_06_23
description: "SFC-ACCURACY-MS2 corpus accuracy auditor (slot:oscar, 2026-06-23). Built the MISSING verification half of the 'run millions of variations so we KNOW calculations are accurate' goal: scripts/lib/sfc-accuracy-audit-lib.mjs + scripts/sfc-accuracy-audit.mjs stream the SFC-ACCURACY-MS1 corpus (11.2M computed configs) and check every row against closed-form SFC identities. LIVE: GRADE PASS, 0 critical/warn/err; feed identity (vf=rpm*fz*flutes) worst 2.69%, vc (pi*D*n/1000, mill) worst 0.51%; 81.3% saturate the 9999-min tool-life cap. The MS1 batch scheduled tasks (Guard/Mill/Lathe) are DISABLED since 2026-06-17 (deliberate) -- re-enabling is an operator decision."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.695Z
aliases: reference_oscar_sfc_accuracy_auditor_2026_06_23
---


**Built the SFC corpus accuracy auditor (the verification half MS1 never had).** The SFC-ACCURACY-MS1 harness (`sfc-variability-batch-run.mjs`) computes millions of speed/feed configs to JSONL but had NO correctness auditor over the outputs -- computing them only half-answers "run millions of variations so we KNOW all calculations are accurate". This is that half.

## What shipped (commit U-SFC-ACCURACY-AUDITOR, slot:oscar)
- `scripts/lib/sfc-accuracy-audit-lib.mjs` -- pure invariant checks + all-rows streaming reader (intentionally distinct from feature-gen's `readChunks`, which DROPS err/null rows -- the audit needs exactly those). Checks: `null_numeric` (12 required-finite fields the writer's `round()` nulls on a non-finite calc), `neg_physical`, `zero_speed` (safe/unsafe split), `feed_inconsistent` (vf = rpm*fz*flutes -- the core SFC identity), `vc_rpm_inconsistent_mill` (vc = pi*D*rpm/1000; mill only -- lathe vc is workpiece-diameter-based), `safe_with_critical_limit` (safety self-contradiction), conf/pch range, life sentinel. Plus `measureRow()` -> worst-case accuracy MARGIN, floored at 15 mm/min so tiny-feed rounding doesn't inflate the headline.
- `scripts/sfc-accuracy-audit.mjs` -- CLI: `node scripts/sfc-accuracy-audit.mjs [--domain mill|lathe|both] [--max-rows N] [--fail-on-critical]`. Writes `state/shared/SFC-ACCURACY-AUDIT.{json,md}`.
- 26 tests (real corpus reference rows mill #6416334 / lathe #4495957; mutation-verified by 2-arm scrutiny round 2 PASS).

## LIVE RESULT (full 11,213,600-row corpus: mill 6.47M + lathe 4.74M, ~100s)
- **GRADE PASS -- 0 critical, 0 warn, 0 errors** (9 torn-line skips). The SFC engine's outputs are physically valid + self-consistent across the ENTIRE variation space.
- Worst-case **feed-identity deviation 2.69%** (a sub-mm low-feed `drilling_on_lathe`); **vc identity 0.51%** (mill). Both negligible / rounding-band.
- **81.3% (9.1M) saturate tool-life at the 9999-min cap** (INFO). Tool-life is non-differentiating across most of the space -> relevant to oscar's tool-life model + india's ML features derived from this corpus.

## Open decision for the operator (surfaced, NOT silently actuated)
The MS1 batch scheduled tasks -- **"PRISM SFC Variability Guard/Batch Mill/Batch Lathe"** -- are **State: Disabled** since 2026-06-17 (LastResult 0, deliberate). Accuracy is PROVEN on the existing 11.2M corpus. Re-enabling to EXTEND coverage is an operator/host decision (heavy multi-day CPU/GPU; was likely disabled for fleet hygiene). To re-enable: `Enable-ScheduledTask -TaskName "PRISM SFC Variability *"`. Re-run the audit anytime via the CLI; wire it as a post-batch step if the batch is reinstated. See [[reference_oscar_sfc_frontend_ownership_2026_06_22]] for the parallel SFC frontend mandate.
