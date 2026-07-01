# POST-BRIDGE-SYNERGY-MS0/U-EMIT-MAHALANOBIS-OOD-GATE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-EMIT-MAHALANOBIS-OOD-GATE (slot:echo /loop iter52 /yolo): Mahalanobis OOD gate — refuse hallucinated emits via χ² threshold against corpus reference state.

**Commit:** `32c05a6e3dc3` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T07:46:11-05:00
**Tags:** post-bridge-synergy-ms0, u-emit-mahalanobis-ood-gate, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-EMIT-MAHALANOBIS-OOD-GATE (slot:echo /loop iter52 /yolo): Mahalanobis OOD gate — refuse hallucinated emits via χ² threshold against corpus reference state.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-EMIT-MAHALANOBIS-OOD-GATE (slot:echo /loop iter52 /yolo): Mahalanobis OOD gate — refuse hallucinated emits via χ² threshold against corpus reference state.

Closes envelope row 32 (Phase 6 EMIT-side, 2d effort, "refuse hallucinated emits" R12 fail-loud win).

scripts/lib/mahalanobis-ood-gate.mjs — pure-fn library, 16 exports:
- CHI_SQ_CRITICAL table (df=1..6, p ∈ {0.95, 0.99, 0.999}, hand-verifiable
  vs Abramowitz & Stegun Table 26.8 / scipy.stats.chi2.ppf)
- buildReferenceState(corpus) — mean[], stddev[], dim, n, sample variance
  (n-1 divisor, unbiased estimator); rejects zero-variance columns
- mahalanobisDistanceSquared(point, state) — diagonal-covariance d²
  formula: Σᵢ ((xᵢ - μᵢ) / σᵢ)²
- classifyPoint(point, state, options) — PASS/WARN/REFUSE classification
  vs χ² thresholds; allowed=false on REFUSE
- formatComment / formatGateBandText / buildOodGateComment — 5-dialect
  emit (fanuc/haas/heidenhain/mitsubishi/siemens), mirrors iter51
  conformal-pi-emit paren-strip pattern
- emitWithOodGate({point, state, dialect, programLine, options}) — full
  gate pipeline; REFUSE suppresses programLine to null (caller MUST
  either skip emit or escalate to operator approval)

scripts/lib/mahalanobis-ood-gate.test.mjs — 96 tests, 12 suites:
- constants (8) — schema version, MIN_CORPUS_ROWS, defaults, dialects,
  χ² critical-value spot-checks
- chiSquareCritical (10) — table lookups + null on bad input
- buildReferenceState (13) — 1D/2D mean+stddev, zero-variance reject,
  dim/n bounds, NaN/Infinity reject
- mahalanobisDistanceSquared (13) — hand-checked d² values (d²=0/1.6/
  6.4/19.6 in 1D; d²=0/3.2/39.2 in 2D); null on bad input
- mahalanobisDistance (4) — sqrt invariant
- classifyPoint (10) — PASS/WARN/REFUSE thresholds; df=1 + df=2
  variants; custom passLevel respected
- formatComment (11) — 5 dialects + paren-strip (fanuc/haas/mitsubishi
  only strip parens; heidenhain/siemens preserve)
- formatGateBandText (7) — decimal-place control, classification render
- buildOodGateComment (6) — full comment string per dialect
- emitWithOodGate (8) — PASS/WARN/REFUSE outcomes; programLine
  suppression on REFUSE
- regression: classification thresholds (3) — boundary inclusivity
  at passThreshold (PASS) and warnThreshold (WARN)
- regression: schema + dialect invariants (3) — schemaVersion=1 on
  every output; all 5 dialects produce non-null comment

Hand-checked example chain (1D corpus [[1],[2],[3],[4],[5]]):
  mean=[3], stddev=[sqrt(2.5)], df=1
  query [10] → d² = 49/2.5 = 19.6 → d ≈ 4.427
  d² > χ²(0.99, 1) = 6.635 → REFUSE
  emit comment: "( OOD REFUSE  d=4.427  d²=19.600  χ²0.99,df=1=6.635 )"
  (Fanuc paren-strip removes inner parens — nesting-illegal)

Echo-soul: post-processor refuse-gate ONLY. No inline Kc/Vc/Taylor.
The corpus that feeds buildReferenceState comes from upstream
training-set physics — this lib decides whether a candidate emit
point is statistically supported by that corpus.

Substrate chain: complementary to iter51 conformal-pi-emit (which
emits *calibrated bands* on point estimates). iter51 says "here's
the uncertainty"; iter52 says "this point is too far from any
training row — refuse to emit at all". Both R12 fail-loud wins.

@milestone POST-BRIDGE-SYNERGY-MS0/U-EMIT-MAHALANOBIS-OOD-GATE
@phase 6 EMIT-side · @row 32 · @effort 2d
@slot echo · @date 2026-05-27
```

## Files touched (3)
- scripts/lib/mahalanobis-ood-gate.mjs      | 268 ++++++++++++++++
- scripts/lib/mahalanobis-ood-gate.test.mjs | 503 ++++++++++++++++++++++++++++++
- 2 files changed, 771 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 32c05a6e3dc3`
- Milestone envelope: `mcp-server/data/milestones/POST-BRIDGE-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._