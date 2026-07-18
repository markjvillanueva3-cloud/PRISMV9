# TESTING-INFRA-MS0/U-AXIS2-3-4 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TESTING-INFRA-MS0]/U-AXIS2-3-4 (slot:tango /goal-5-axis iter1-4): 3 testing-harness engines — post-proc matrix + SFC at-scale + 3-domain wizard pipeline

**Commit:** `68b62b1152e8` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T23:04:07-05:00
**Tags:** testing-infra-ms0, u-axis2-3-4, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TESTING-INFRA-MS0]/U-AXIS2-3-4 (slot:tango /goal-5-axis iter1-4): 3 testing-harness engines — post-proc matrix + SFC at-scale + 3-domain wizard pipeline

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TESTING-INFRA-MS0]/U-AXIS2-3-4 (slot:tango /goal-5-axis iter1-4): 3 testing-harness engines — post-proc matrix + SFC at-scale + 3-domain wizard pipeline

Three complementary testing-infrastructure engines for /goal-5-axis (3 of 5 axes; Axis 5 CAD/CAM-gen pending, Axis 1 cross-cutting PSN/system-viz wiring split off):

Axis 2 — PostProcessorMatrixTestHarnessEngine (24/24 vitest PASS): sweeps (controller × machine_config × cam × units) 9×8×3×2=432 default cells, audits via PostProcessorDialectValidatorEngine + capability gating. Wired prism_dev:post_processor_matrix_test. Complementary to P0-U06 corpus generator (india 2026-05-25): P0-U06 = STRUCTURAL coverage; this = DIALECT-COHERENCE lens. Same surface, orthogonal axis.

Per-file scrutiny (2 parallel reviewers per CLAUDE.md gate) shipped P0/P1 fixes inline:
- P0 (converged): dialect_audit_block precedes capability_block (safety > correctness; cross-vendor leakage outranks feature-not-on-machine). Joint-violation test asserts both signals.
- P0 (arm B): wired prism_dev action in same commit.
- P1 (arm A): generator-returned code bounded 5 MB (DoS guard); rejects non-string, whitespace-only, oversized with fail-loud.
- P1 (converged): pass_rate.confidence sqrt-curves at 432-cell full matrix (was: linear at 20 = dishonest); Wilson 95% half-width uncertainty per AtomicValue.
- P1 (arm B): per-controller injection test sweep — 7 controllers each catch a canonical foreign-controller token.

Documented gap: catches lexical foreign macros (VNC, CYCL, R-params); does NOT catch numeric-precision dialect drift (decimals, leading-zero, modal defaults, feed-units) — future PostProcessorNumericDialectEngine.

Axis 3 — SpeedFeedAtScaleHarnessEngine (22/22 vitest PASS): sweeps (ISO × op × cut × dia × material × flutes × units) and validates 6 physics invariants per cell: I1 RPM=(Vc·1000)/(π·D) ±0.5%; I2 feed=RPM·fz·N or RPM·fpr ±1.0%; I3 Fc>0 + Fc<50kN sanity; I4 P≤machine_power_kw when armed; I5 every numeric finite; I6 confidence∈[0,1]. Callback-based compute; default uses canonical Machinery's Handbook formulas + kc1.1+mc from constants.ts (no inlined physics). Includes runKienzleApScalingProbe() CI smoke (Fc=0 → pass=false).

Axis 4 — DomainWizardPipelineTestEngine (18/18 vitest PASS): stage-by-stage assertion driver for mill/lathe/wire-EDM print-to-program pipelines. Adapter callbacks keep harness composable. Per-domain: S1 stage completeness; S2 stage ordering; S3 cross-stage handoffs (tool_id at strategy MUST appear in post_emit payload; wire_diameter_mm for wire-EDM); S4 per-stage + total latency budgets (5s mill/lathe, 8s wire); S5 final program non-empty. Canonical 6-stage pipeline (cad_parse → feature_recognize → strategy_select → toolpath_synthesize → post_emit → gcode_validate).

Cross-axis shared design: AtomicValue {value, unit, uncertainty, source, confidence}; Wilson 95% half-width on every pass_rate; sqrt-curve confidence; verdict precedence documented inline; compute callbacks decouple engines from heavy SFC/CAM/EDM dep graphs; ZERO inlined physics constants in compute paths.

Files (7): PostProcessorMatrixTestHarnessEngine.{ts,test.ts}, SpeedFeedAtScaleHarnessEngine.{ts,test.ts}, DomainWizardPipelineTestEngine.{ts,test.ts}, devDispatcher.ts (+1 action).

64/64 vitest PASS. tsc clean for new code (pre-existing TS2352 in unrelated WEDMParams case retained).
```

## Files touched (12)
- .../DomainWizardPipelineTestEngine.test.ts         | 271 +++++++++++
- .../EmployeeBenefitsEnrollmentEngine.test.ts       | 222 +++++++++
- .../PostProcessorMatrixTestHarnessEngine.test.ts   | 375 +++++++++++++++
- .../SpeedFeedAtScaleHarnessEngine.test.ts          | 338 ++++++++++++++
- .../src/engines/DomainWizardPipelineTestEngine.ts  | 424 +++++++++++++++++
- .../engines/EmployeeBenefitsEnrollmentEngine.ts    | 178 +++++++
- .../PostProcessorMatrixTestHarnessEngine.ts        | 510 +++++++++++++++++++++
- .../src/engines/SpeedFeedAtScaleHarnessEngine.ts   | 489 ++++++++++++++++++++
- .../src/tools/dispatchers/businessDispatcher.ts    |  26 ++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  10 +
_(+2 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 68b62b1152e8`
- Milestone envelope: `mcp-server/data/milestones/TESTING-INFRA-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._