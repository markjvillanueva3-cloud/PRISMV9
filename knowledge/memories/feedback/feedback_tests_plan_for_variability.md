---
name: feedback_tests_plan_for_variability
description: "All tests must plan for variability and adaptability — span the input space, assert invariants over hardcoded values, tolerate incomplete information"
aliases: feedback_tests_plan_for_variability
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.447Z
---


Every test — unit, integration, and end-to-end — must plan for variability and incomplete information rather than pinning to one canonical configuration.

A test must: (a) span ≥3 spanning configurations via `it.each` (materials, batch sizes, geometries, dialects, machine types — whatever axes the domain varies on); (b) assert algebraic/physical **invariants** (ratios, monotonicity, conservation, reconciliation) over hardcoded reference numbers, so the test survives engine-internal rate/coefficient changes; (c) exercise the **incomplete-information** paths — minimal-required-fields → defaults applied, partial/malformed upstream payloads → shape guards return null → graceful fallback, backend unreachable → offline estimate + source badge; (d) cover failure modes + adversarial inputs (schema rejections, NaN/Infinity bounds, extreme/degenerate geometry) and fail loud, never silently wrong.

**Why:** Real manufacturing inputs vary continuously. A test pinned to one config passes while the code is wrong for 95% of the domain. E2E flows routinely run with incomplete info — the operator hasn't filled every field, the backend is down, an upstream payload drifted shape. A test that assumes "all relevant information is always present" is testing a world that doesn't exist.

**How to apply:** When writing any test, first enumerate the domain's variability axes and pick 3 spanning points. Replace each `expect(x).toBe(<magic number>)` with an invariant that explains *why* that number matters. Add at least one minimal-input case and one backend-absent/partial-payload case. Origin: CALC-RESTORE-MS0 Phase 1A (2026-05-14 user directive). Extends [[feedback_always_build]] and the COMPREHENSIVE-BUILD test-legitimacy gate.
