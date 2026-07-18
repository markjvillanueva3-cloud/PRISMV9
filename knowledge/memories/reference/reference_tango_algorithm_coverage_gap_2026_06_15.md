---
name: reference_tango_algorithm_coverage_gap_2026_06_15
description: tango VERIFIED the algorithm-dispatcher coverage gap is real but multi-layer (123 modules / metadata registry / ALGORITHM_ACTIONS enum + gateway methods) — did NOT fabricate the work order's "~20 dormant"; queued a precise coverage script as the next build. slot tango 2026-06-15.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.217Z
aliases: reference_tango_algorithm_coverage_gap_2026_06_15
---


**TANGO ALGORITHM-COVERAGE-GAP (slot tango, 2026-06-15, cron /loop iter — NO build, honest checkpoint)** — the work order kept listing "wire the ~20 dormant algorithms to prism_algorithm". I investigated to VERIFY the "~20" (R12: the number was unverified) and to produce romeo a precise wire-list.

**VERIFIED ON-DISK (real findings):**
- **123** algorithm modules in `mcp-server/src/algorithms/*.ts` (excl tests).
- `AlgorithmRegistry.ts` is a LARGE metadata catalog (217 register/field matches; `AlgorithmEntry` indexed by type/safety_class/mfg_relevance/integration_wave/consumer; loads a scan format `{algorithms:{files:[...]}}`).
- `algorithmDispatcher.ts` routes via the `ALGORITHM_ACTIONS` enum (exported, used by `algorithmDispatcher.synergy.test.ts`) -> switch cases -> `algorithmGatewayEngine.<method>()` (executeFFT/spectralAnalysis/digitalFilter/predictChatter/pidControl/kalmanFilter/transferFunction/gradientDescent/conjugateGradient/bfgs/localSearch/...) + `algorithmRegistry` lookups.
- **NO dedicated algorithm-dispatcher coverage tool exists** (`ls scripts/ | grep algorithm.*coverage` = empty) -> building one is dedup-clear.

**WHY NO BUILD THIS ITER (R12 + R6 honesty):** the precise "dormant" diff is NOT a 2-grep filename diff — routing is 3-LAYERED (ALGORITHM_ACTIONS enum + gateway methods + metadata registry), so "dormant" = a module reachable through NONE of the three. My quick greps MISSED format 3x (guessed `ACTIONS` not `ALGORITHM_ACTIONS`; guessed registry id-shape `^  id:{` -> 4; guessed gateway import path -> 0). Per my soul ("trusting-a-meta-tool-that-never-read-the-schema-it-parses" = REFUSED) + R6 (repeated tool failure = spiral signal) I STOPPED rather than fabricate a count from broken greps. The work order's "~20" remains UNVERIFIED — do not cite it as fact.

**PRIOR ART — READ BEFORE REBUILDING (dedup, soul core):** memory recall surfaced [[reference_algorithm_scope_enumeration_audit_2026_05_26]] ("58-Algorithm Scope Enumeration audit", cosine 0.73) + [[reference_tango_ml_dispatcher_wire_2026_05_29]] ("U-ALGO-ML-WIRE, highest-ROI coverage win, no new algorithm code", cosine 0.75). The 2026-05-26 scope-enumeration may ALREADY contain the dormant-algorithm list — READ IT FIRST; if it does, the next iteration SURFACES/refreshes it (not rebuild). Do not re-derive what a prior audit already enumerated.

**QUEUED NEXT BUILD (fresh budget, each-pass-feeds-next — ONLY if the 2026-05-26 audit does NOT already cover it):** `scripts/algorithm-dispatcher-coverage.mjs` (pure lib + test + CLI, mirror hub-blast-radius-rank.mjs). READ THESE FIRST (don't grep-guess): (1) the `ALGORITHM_ACTIONS` array literal in `algorithmDispatcher.ts` (the routable actions); (2) `AlgorithmGatewayEngine.ts` method list + which algorithm modules each method imports/calls; (3) `AlgorithmRegistry.ts` `AlgorithmEntry` structure + the scan-format file list it catalogs. Then diff the 123 `src/algorithms/*.ts` module exports against {gateway-reachable} UNION {registry-cataloged} -> the true dormant set. SURFACE to **romeo** (wiring owner) — tango produces the coverage diff, romeo wires.

**LESSON:** when 3 successive greps miss format, that IS the signal to STOP grepping and either read the schema properly (fresh budget) or checkpoint — never fabricate the metric. A verified "the gap is real + here's exactly what to read next" beats a fabricated "~20 dormant". Sister: [[reference_tango_register_unwired_bridge_dispatcher_2026_06_15]] (dispatcher-layer coverage), [[feedback_tango_dedup_audit_tooling]].
