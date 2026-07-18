---
name: reference_sierra_vault_health_reasongate_2026_06_18
description: "Sierra added a REASON confidence-gate to vault-health's contradiction headline (commit c5e135a528, 2026-06-18, branch cad-fusion-live-ms0) so reason-less NLI 'contradict' verdicts (low-confidence false positives) no longer drive spurious WARNs. The doctrine-contradiction NLI lint (gpt-oss:20b) sometimes returns verdict='contradict' with an EMPTY/trivial reason -- the prompt MANDATES a one-line reason, so an empty one is non-compliant low-confidence output (observed live: feedback_ai_upgrade_broadcast_protocol <> feedback_sierra_no_gates_full_reign -- a mild semantic tension, NOT a contradiction). Previously vault-health WARNed on the raw totals.contradictions count -> false positives -> spurious operator-decisions. Fix: the contradiction headline reads the report's per-finding contradictions[] array and counts only findings whose reason.trim().length >= MIN_REASON_LEN(10) as CONFIRMED (the WARN value); reason-less ones surface in the detail as '; N low-confidence' but never escalate severity/overall. Falls back to totals.contradictions when no per-finding array present (back-compat, all prior tests unchanged). Live-verified: a real 2-contradiction report (1 reasoned edit-tool A<>B + 1 empty-reason) now reads WARN(1) + '1 low-confidence' (was WARN(2)). +4 tests (21 total). Independent code-analyzer PASS 0 P0/P1. Sibling of the lowCoverage guard -- both make the contradiction dashboard HONEST (lowCoverage: don't certify clean at 0.7% scanned; reasongate: don't WARN on unreasoned NLI noise)."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.202Z
aliases: reference_sierra_vault_health_reasongate_2026_06_18
---


# Sierra: vault-health contradiction reason confidence-gate (2026-06-18)

Autonomous vault-ops cron tick. Triggered by the 2nd contradiction from the fresh 148-pair scan being
a FALSE POSITIVE (empty NLI reason). Built the gate that prevents the recurring false-positive class.

## The false-positive pattern
The NLI lint (gpt-oss:20b) prompt MANDATES a one-line reason for each verdict. But it sometimes
returns `verdict:"contradict"` with `reason:""`. `runNliLint` counts ANY contradict verdict, so an
empty-reason one inflates the count. Observed: `feedback_ai_upgrade_broadcast_protocol` ("every galaxy
OWNS its AI training") <> `feedback_sierra_no_gates_full_reign_2026_06_10` ("sierra not blocked by
domain-ownership gates") -- a MILD tension (a galaxy can own its training AND sierra build cross-galaxy
ungated), flagged as a hard contradiction with NO reason. The empty reason IS the low-confidence tell.

## Built: reason confidence-gate in vault-health (commit c5e135a528)
The contradiction headline now reads the report's per-finding `contradictions[]` array and counts only
findings with `reason.trim().length >= MIN_REASON_LEN(10)` as CONFIRMED (the WARN value `v`). Reason-less
findings -> `lowConf`, surfaced in the detail as "; N low-confidence" but NEVER escalating severity or
`overall`. Back-compat: when the report has no per-finding array, falls back to `totals.contradictions`
(the legacy totals-only shape -> all 17 prior tests behave identically; the Array.isArray guard makes
the fallback strict). +4 tests (reasoned-WARNs, all-reason-less->ok, no-array-fallback, MIN_REASON_LEN
boundary). Live: 2-contradiction report -> WARN(1 confirmed: edit-tool A<>B) + "1 low-confidence".

## Why narrow (vault-health only, NOT the shared NLI engine)
Gated in MY consumer (vault-health reads the existing `reason` field per finding) rather than editing
the shared `lint-wiki-contradictions.mjs` runNliLint -- avoids a blast radius to bravo's wiki lint while
achieving the trustworthy memory-contradiction WARN. The engine still records all verdicts; vault-health
decides which COUNT.

## The contradiction-honesty trio (all shipped this arc)
1. needsScan (prior) -- a 0-pairs-checked / no-model run is never a clean OK.
2. lowCoverage [[reference_sierra_vault_health_lowcov_2026_06_18]] -- a clean-0 at <50% coverage is not a clean bill.
3. reasongate (this) -- an unreasoned NLI verdict is low-confidence, not a confirmed contradiction.
Together: the contradiction dashboard reflects CONFIRMED, ADEQUATELY-SCANNED conflicts, never noise.

## Siblings
[[reference_sierra_vault_health_lowcov_2026_06_18]] · [[reference_sierra_contradiction_resolve_2026_06_18]]
(the A/B edit-tool fixes) · [[reference_sierra_vault_health_dashboard_2026_06_17]] (the dashboard).
