---
name: reference_tango_engine_algo_assessment_2026_06_15
description: tango engine/algorithm/formula assessment — built inline-physics-constant compliance scanner, found 70 VERIFIED violations + 9 truly-dormant algos. slot tango 2026-06-15.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.219Z
aliases: reference_tango_engine_algo_assessment_2026_06_15
---


**TANGO ENGINE/ALGO/FORMULA ASSESSMENT (slot tango, 2026-06-15)** under operator "/checkin-tango assess and analyze engines, algorithms and formulas. find opportunities for improvements use full system capabilities." ALL MEANS ALL on the full population.

**Population: 3796 engines · 122 algorithms · 6 physics/formula files · 111 dispatchers** (262 engines correctly import physics/constants.ts = compliance baseline).

**Built a reusable scanner** `scripts/assess-engine-algo-improvements.mjs` (commit `1cfacbdce8`) — single-pass, pure-node (NO subprocess fan-out = fork-storm-safe; the fork-storm breaker fired at 683 bash.exe this session). Scans 5 improvement signals: inline-physics-constant, no-test, stub, dormant-algorithm, tiny. **Net-new: NO auditor existed for the CLAUDE.md "never inline Kienzle/Taylor/material constants" safety rule.** Output: `state/shared/ENGINE-ALGO-ASSESSMENT-<date>.json` (advisory+must-human-verify).

**TOP FINDING — 70 VERIFIED inline-physics-constant violations (SAFETY).** Engines re-define Kienzle `kc1.1`/Taylor `C` locally instead of importing `KIENZLE_BY_ISO`/`CANONICAL_TAYLOR`. Verify-on-disk confirmed real (5/5 spot-checked): `CAMPluginSDKEngine` re-defines the whole `{P:{kc1_1:1800},M:{kc1_1:2100},K:{kc1_1:1100}}` table; `AdvancedPostPhysicsEngine` `{steel:{kc11:1800}}`; `AIMLEngine` `const taylorC=400`. **Drift is real + dangerous:** `CryogenicCuttingEngine:170` has a comment that a prior inline `1500/0.26` was below Sandvik/ISO 3685 + corrected to canonical `1800/0.25`; papa hit the same class (`CounterfactualMill` DEFERRED, divergent inlined constants). Routed by domain owner: **cam(kilo)=18, speedfeed(oscar)=11, lathe(whiskey)=5, post(echo)=4, mill(foxtrot)=2, other/cross=25, infra-fixture=5**. Remediation = physics-reviewer per file (compare inline vs canonical; identical→pure refactor-to-import, divergent→SAFETY BUG fix) — **NOT tango's lane to change physics**; surfaced to chat bus + report. Report: `state/shared/specs/TANGO-ENGINE-ALGO-ASSESSMENT-2026-06-15.md` (commit `3ef48a5cb1`).

**Other dimensions:** no-test=1736 but that's an UPPER BOUND (name-match misses integration/dispatcher/grouped tests — do NOT treat as real gaps); stub=0 (the no-stub PreToolUse hook works); tiny=2.

**Algorithm layer is HEALTHY** (R12 — corrected the naive count): 57 of 122 algos lack a dispatcher ref, BUT most are library-layer (consumed by engines). Only **9 truly-dormant** (0 consumers of any kind), and 7 are the KNOWN WIRE-EXEMPT course-forge PDE suite (FiniteDifferenceMethod/FiniteElementMethod1D/ODEIntegrator/OperatorSplittingMethod/LagrangianMechanics/LinearStateSpaceModel/GradientDescent — closures can't cross a JSON dispatcher) + SafeExpressionEvaluator. Only `TSNEAlgorithm` is a genuine review candidate. **Lesson: a raw dispatcher-only orphan count over-states algorithm dormancy 6x; exclude engine-consumed library algos (same nuance as the engine WIRED-VIA-ENGINE fix).**

**Recommended next:** wire the scanner as `prism_dev:physics_const_compliance` (standing CI gate so new inline constants are caught at write-time). Sister: [[reference_tango_dispatcher_register_ghost_2026_06_15]], [[reference_tango_discovery_sweep_2026_06_15]].
