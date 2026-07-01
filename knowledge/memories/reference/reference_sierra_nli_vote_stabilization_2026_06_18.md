---
name: reference_sierra_nli_vote_stabilization_2026_06_18
description: "Sierra shipped U-VAULT-NLI-VOTE (commit 9f5ef3d701, 2026-06-18, branch cad-fusion-live-ms0) -- stochastic-verdict stabilization for the memory/wiki NLI contradiction lint. ROOT CAUSE (R12 self-correction of the 2026-06-17 'edit-tool A<>B resolved' claim): the lint recorded a SINGLE stochastic verdict per pair; gpt-oss:20b is a sampling model, so for a borderline pair it intermittently emits CONTRADICT on one run and CONSISTENT on the next. The edit-tool A<>B memo pair re-measured CONSISTENT 3/3 live, yet the 05:37 cron run flagged it CONTRADICT (with a real reason) -> a spurious vault-health WARN that drove an operator memo-decision. The descriptions were NOT actually contradictory; the fix was earlier judged 'resolved' on one lucky CONSISTENT sample. FIX: runNliLint gains confirmSamples (default 0 = byte-identical legacy; bravo's shared wiki lint untouched). On a CONTRADICT *primary* it re-samples confirmSamples more times and records ONLY on a STRICT MAJORITY of the (1+confirmSamples) votes -- a flaky single judge becomes a stable majority judge. Confirm fires ONLY on contradict (cost asymmetry: a missed contradiction is cheap -- next run catches it; a spurious WARN is expensive). Conservative drop on confirm-failure (failed confirm = non-contradict vote, NOT fed to the circuit breaker, pair still counts as checked). votes{contradict,total} + totals.confirmCalls surfaced only when active. Memory lint opts into confirmSamples=2 (=> 2-of-3; env PRISM_NLI_CONFIRM_SAMPLES; CLI --confirm N). resolveConfirmSamples extracted + unit-tested -- writing the test caught a footgun: Number('')===0 would let an explicitly-empty env silently DISABLE confirm; guarded so only an explicit '0' disables. +9 tests (43 green). 2-arm scrutiny PASS 0 P0/P1 (arm B mutation-tested the off-by-one majority math + conservative-drop + back-compat leak)."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.197Z
aliases: reference_sierra_nli_vote_stabilization_2026_06_18
---


# Sierra: NLI contradiction-lint stochastic-verdict stabilization (2026-06-18)

Autonomous vault-ops cron tick. Started as "close the live vault-health WARN" (a fresh 05:37
report flagged the edit-tool A<>B pair as a *reasoned* contradiction) and became an R12
self-correction + a root-cause fix.

## The measure-first catch (don't trust the handoff's "resolved")
My 2026-06-17 handoff claimed the A<>B contradiction was RESOLVED (verified via a `--limit 10
--no-write` lint finding 0). But the 05:37 cron report -- run AGAINST my fixed descriptions --
STILL flagged it. I re-measured the CURRENT descriptions with a targeted 3-sample NLI run:
**CONSISTENT 3/3**. So the descriptions were fine; the 05:37 CONTRADICT was gpt-oss:20b
**stochasticity**. The lint records ONE sample per pair, so a borderline pair flakes between
runs -> a spurious WARN that only decays when a later run happens to sample CONSISTENT.

## The fix (commit 9f5ef3d701) -- majority-confirm
`runNliLint` (scripts/lint-wiki-contradictions.mjs) gains `confirmSamples` (default 0 = legacy,
byte-identical -- bravo's wiki lint, which omits it, is provably unaffected). When >0, a
CONTRADICT *primary* verdict is re-sampled `confirmSamples` more times; the finding is recorded
ONLY if a STRICT MAJORITY of (1+confirmSamples) votes agree (confirmRequired =
floor(total/2)+1). The memory lint passes `confirmSamples=2` -> **2-of-3**.

- **Confirm ONLY on contradict** (cost asymmetry): a missed contradiction is cheap (the next
  cron run catches it); a spurious WARN drives an operator memo-decision. So we spend the extra
  GPU calls only on the rare, costly direction.
- **Conservative drop on confirm-failure**: a failed/empty confirm call is a non-contradict
  vote, is NOT fed to the circuit breaker, and the pair still counts as `checked` (R12 coverage
  honesty). A truly-down Ollama trips the breaker on the next pair's PRIMARY call.
- `votes:{contradict,total}` per finding + `totals.confirmSamples`/`confirmCalls` surfaced only
  when confirmSamples>0.

## The footgun the test caught (R9 -- tests verify intent)
Extracted the consumer's count derivation into exported `resolveConfirmSamples(raw, dflt)` to
unit-test the adversarial-input guard. Writing the test exposed `Number("")===0`: an
explicitly-empty `PRISM_NLI_CONFIRM_SAMPLES=` would have silently DISABLED confirm. Guarded so
empty/whitespace/unset -> default; only an explicit `"0"` disables.

## Logical order (R13) -- this BEFORE coverage-accumulation
The originally-queued next unit was lint COVERAGE-ACCUMULATION (rotating --offset to push past
the 13.6% coverage floor). Vote-stabilization had to ship FIRST: widening coverage single-sampled
would MULTIPLY the flaky false positives. Build the stabilizer before widening the net.

## Effect on the live WARN
A fresh full memory lint (confirmSamples=2) re-checks A<>B with 2-of-3; it drops -> the
contradiction row goes WARN -> INFO(lowCoverage) (0 confirmed at cov 0.136; the lowCoverage guard
correctly refuses to call 13.6% a clean bill -- which is exactly what coverage-accumulation will
close next).

## Siblings
The contradiction-honesty arc: [[reference_sierra_vault_health_reasongate_2026_06_18]]
(reason-LESS false positives) + lowCoverage [[reference_sierra_vault_health_lowcov_2026_06_18]]
(0-found at low coverage) + this (reason-FUL but stochastic false positives). Together the
contradiction dashboard reflects CONFIRMED, ADEQUATELY-SCANNED, MAJORITY-STABLE conflicts.
Supersedes the over-confident [[reference_sierra_contradiction_resolve_2026_06_18]] "resolved" framing.
Engine lineage: [[reference_wiki_nli_lint_2026_06_09]] · [[reference_sierra_memory_contradiction_lint_2026_06_17]].
