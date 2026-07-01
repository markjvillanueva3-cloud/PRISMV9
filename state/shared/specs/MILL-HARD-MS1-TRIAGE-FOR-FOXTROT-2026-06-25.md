# MILL-HARD-MS1 failing-test triage — routed to FOXTROT (mill-hardening domain)

**From:** oscar (SFC) · **For:** foxtrot (Milling Wizard) · **Date:** 2026-06-25 · **Session:** claude-d1c0715f

## TL;DR
`src/__tests__/MILL-HARD-MS1.test.ts` has **~107 failing tests** (verified PRE-EXISTING — 108 before any
oscar commit this session; not regressions). They are **spec-first tests for an INCOMPLETE MILL-HARD-MS1
milestone** — features the test suite specs but `SpeedFeedOrchestratorEngine` never implemented. This is the
**mill-hardening domain (foxtrot)**, NOT oscar-core SFC physics. Oscar triaged + root-caused; foxtrot owns
the build (mill-hardening domain expertise). None are oscar-core Kienzle/Taylor/SFC-physics bugs.

## Root cause — 3 unbuilt output features (probed live against the orchestrator)

### 1. Hardness-aware tool-steel ISO classification (~25 failures)
Tests: `D2 at 30 HRC uses annealed parameters`, `D2 at 58 HRC uses hardened (ISO H)`, `D2 at boundary
(44/45 HRC)`, `A2 ...`, `... detected as tool steel`, etc.
- **Expect:** `result.resolved_material.name.source` contains `tool_steel_annealed` / `hardened` + `<n>HRC`;
  `iso_group.value` = `P` for soft (≤44 HRC), `H` for hard (≥45 HRC).
- **Actual (live probe D2@30HRC):** `name.source = "fuzzy_match:\"D2\"→hardened_steel"`, `iso = H` —
  the orchestrator fuzzy-matches "D2" → hardened_steel **ignoring `hardness_hrc`**, so annealed D2 is
  mis-classified ISO H (kc1.1=3200, over-conservative speed). The hardness-aware tool-steel table
  (D2/A2/O1/S7/H13 annealed-vs-hardened → ISO P/H by HRC threshold) is **NOT built**.
- **Note (real accuracy impact):** this DOES affect SFC accuracy for tool-steel cuts — annealed tool steel
  gets hardened-steel params. Worth building. Material resolution lives in `SpeedFeedOrchestratorEngine`
  (oscar's engine), but the tool-steel-hardness feature is a mill-hardening milestone deliverable.

### 2. `ai_reasoning` output field (~20 failures)
Tests: `Populates ai_reasoning for standard steel cut`, `... decision_trace`, `... explanation`,
`hypotheses array`, `uncertainty analysis`, `risk assessment`, `cost/benefit`, `meta_confidence`,
`counterfactual`, `optimization objectives`, `productivity/quality focus`, `complete for <machine/material>`.
- **Expect:** `result.ai_reasoning` defined with `{decision_trace, explanation, hypotheses, uncertainty,
  risk, cost_benefit, meta_confidence, counterfactual, optimization_objectives, ...}`.
- **Actual (live probe):** `result.ai_reasoning` is **UNDEFINED** — the orchestrator never populates it.
  The whole `ai_reasoning` output structure is **NOT built**.

### 3. Top-level force/MRR output fields (~7 failures)
Tests: `Force increases with axial depth (Fc ∝ ap)`, `Force increases with fz`, `MRR proportional`, etc.
- **Expect:** `result.tangential_force_N` (top-level), scaling ~linearly with ap (ratio 2-6x for ap 1→4mm).
- **Actual:** the orchestrator exposes forces under a different shape (e.g. `sfc.forces` / nested), not a
  top-level `tangential_force_N` — so `undefined > undefined` fails. **Output-field-name mismatch**, not a
  physics bug (the underlying Kienzle force IS computed correctly — verified by oscar's other SFC tests).

### Misc (~remaining): `output_detail full`, `single flute aluminum`, chip-thinning-to-fz — same class
(spec'd output fields / behaviors not exposed by the orchestrator).

## Recommendation for foxtrot
1. **Build the tool-steel hardness table** (D2/A2/O1/S7/H13/... annealed-vs-hardened → ISO P/H by HRC
   threshold ~45) in the orchestrator's `resolveMaterial`, emitting `name.source = tool_steel_<state>:<n>HRC`.
   Coordinate with oscar (material resolution is in `SpeedFeedOrchestratorEngine`) — clone-don't-fork the
   existing heat-treat-regime physics (`CANONICAL_HEAT_TREAT_REGIME` in constants.ts) rather than a new table.
2. **Build the `ai_reasoning` output structure** (decision_trace/explanation/hypotheses/uncertainty/risk/
   cost_benefit/meta_confidence/counterfactual) — likely a thin assembler over existing orchestrator
   intermediates. Confirm the spec is still wanted (it may be a stale aspirational milestone — verify with operator).
3. **Reconcile force output field names** — either expose `tangential_force_N` top-level or update the tests
   to the orchestrator's actual force shape (R9: correct the contract intentionally, don't weaken).
4. If the MILL-HARD-MS1 milestone is stale/abandoned, mark the suite `.skip` with a tracking note + envelope
   update rather than leaving 107 perma-red tests (operator decision).

## What oscar did NOT touch
Oscar made ZERO changes to MILL-HARD-MS1 or the mill-hardening features — purely triaged + routed. Oscar's
session commits (cb40bbba7b, 5684b03311, a5790c3217, 0d95de4286) are HSS-over-speed + tsx-guard fixes, all
verified not to add/remove any MILL-HARD-MS1 failure (failing-set diffed before/after: net change 0 from the
HSS work; the tsx-guard fix is unrelated).
