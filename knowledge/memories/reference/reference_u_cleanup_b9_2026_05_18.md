---
name: reference_u_cleanup_b9_2026_05_18
description: U-CLEANUP-B9 R4-P1-8 split-conformal drift gate — closes the deferred B9 follow-up; conformal-vs-naive-slope precedence; P1 sentinel false-drift caught by per-file scrutiny
metadata:
  type: reference
---

2026-05-18 charlie (recovered from crashed claude-4f9091a6), commit `405ac15be7`.

**What:** Implemented the R4-P1-8 conformal-prediction-set membership drift
gate in `scripts/golf-reviewer-drift-eval.mjs` that the B9 skeleton (shipped
2026-05-14) explicitly deferred. This was the only code deliverable keeping
`CLEANUP-MS0::U-CLEANUP-B9` pending — the corpus/cron/slope+floor skeleton
already existed.

**Design (R7 — two deviations surfaced, not silently averaged):**
- Unit text named `prism_intelligence:xproc_aps_calibrate/xproc_aps_set` —
  that's `CrossProcessAPSClassificationEngine` (**classification** APS:
  simplex probs + int labels), semantically wrong for a scalar accuracy
  time-series. Correct primitive = scalar split-conformal regression
  (`CrossProcessConformalPredictionEngine`). Implemented as a **pure local
  mirror** of that engine's exact rank rule `k=⌈(N+1)(1−α)⌉` + `k>N`→abstain
  — kept pure because the skeleton documented that a weekly `.mjs` cron
  cannot cheaply reach the MCP dispatcher (no round-trip).
- "instead of naive slope" — slope+floor RETAINED as cold-start fallback
  (conformal needs N≥⌈1/α⌉−1=9 calib rows at α=0.10, matching the engine's
  `MIN_CALIBRATION_FOR_ALPHA`). `primaryGate` reports which governed.
  Conformal supersedes slope when applicable; FLOOR is an always-on
  absolute-safety backstop. One-sided: improvement (above band) never trips.

**Why it matters / bug caught:** Per-file scrutiny round-1 (independent
reviewer) FAILed and caught a real **P1**: `runDriftEval` fed the
`accuracy=0` sentinel into `detectDrift` on non-evaluated runs
(unseeded corpus / unwired reviewer — *the default state until an operator
seeds the corpus*), so conformal+floor screamed a confident false
"DRIFTED" **every cold-start week**. Fix: `skippedDriftVerdict` sentinel +
`reason==="evaluated"` routing guard. Also fixed R12 docstring overclaims
(≈α/2 one-sided miscoverage not 1−α; median plug-in ≠ strict split-
conformal; N≥9 not ≥11 off-by-one) and R9-reconciled the stale flat-OR
test assertions the precedence change provably broke.

**How to apply:** Pure-core + injected-readers cron tools MUST ship a
real-data E2E (cf. [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]]); here
the `FAIL-ON-REVERT` test (unseeded corpus over healthy history →
`drifted:false`) is the P1-1 oracle, and the SUPERSESSION oracle was
mutation-proven (revert→flat-OR flips exactly that test). When a unit text
names a specific engine, verify the engine's *contract* fits the data shape
before wiring — a named primitive can be the wrong primitive.

**Scrutiny:** 5 per-file agents over 2 rounds (R1 FAIL→fixed→R2 PASS) +
3-of-3 Stop gate all PASS. 62/62 tests green via a vitest-API ESM shim
(root `scripts/__tests__` vitest is a pre-existing fleet-wide harness
blockage — vitest only in `mcp-server/node_modules`; documented honestly).

**Honest scope:** corpus seeding stays an explicit operator action by
design (operator-verified verdicts). Side note: an auto-stage hook swept 2
unclaimed-orphan files (`mcp-server/scripts/nim-docker-launcher.{mjs,test
.mjs}`) into `405ac15be7` — no peer claim/handoff ref, harmless absorption
(preserved, not lost), flagged for transparency.

Sister: [[reference_fleet_reaper_ms1]] (golf hygiene), [[feedback_parallel_scrutiny_per_file]].
