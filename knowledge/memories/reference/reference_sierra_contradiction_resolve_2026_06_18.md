---
name: reference_sierra_contradiction_resolve_2026_06_18
description: "Sierra resolved the edit-tool EOL doctrine contradiction + CORRECTED a prior-tick misattribution (2026-06-18, branch cad-fusion-live-ms0). CORRECTION (R12): the contradiction lint (lint-memory-contradictions / runNliLint in lint-wiki-contradictions.mjs) is NOT broken/infra-fragile as reference_sierra_vault_health_lowcov_2026_06_18 stated -- it is SLOW: DEFAULT_LIMIT=150 candidate pairs x ~6s/pair (gpt-oss:20b) = ~15min/run. The exit-255 I saw was my interactive auto-backgrounding Bash invocation getting harness-killed mid-run, NOT a production failure; a patient/cron run completes fine (proven: fresh 05:37 report, pairsChecked 148/150, coverage 0.136, aborted:false). --limit 2 completes in 11.8s EXIT=0. CONTRADICTION (real, multi-layer): feedback_edit_tool_crlf_flips_lf_files (A) <> feedback_edit_tool_not_powershell_for_repo_files (B) both about Windows EOL. Fixed BOTH: B falsely claimed the Edit tool 'preserves line endings' (it writes CRLF) -> corrected to 'preserves BOM; CRLF normalized by .gitattributes'; A was SELF-inconsistent -- its 2026-06-04 UPDATE says .gitattributes eol=lf shipped (9bd4b22abd) + flags the old 'no .gitattributes' text STALE, yet A's description still asserted it present-tense -> corrected A's description to historical+FIXED. Edited both C: source + H: vault copy each. A's lower-salience body (Symptom/Standing-fix lines) still has stale text A's UPDATE flags -- full A freshness pass queued if the NLI picks those next (slow lint verifies next cron run). 2nd contradiction surfaced via better coverage: feedback_ai_upgrade_broadcast_protocol <> feedback_sierra_no_gates_full_reign_2026_06_10 (empty NLI reason -- likely weak/false positive, needs verify). QUEUED: run-budget hardening for runNliLint (self-abort + partial honest report so interactive runs don't appear to hang 15min)."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.190Z
aliases: reference_sierra_contradiction_resolve_2026_06_18
---


# Sierra: edit-tool EOL contradiction resolved + lint-is-slow-not-broken correction (2026-06-18)

Autonomous vault-ops cron tick, continuing the contradiction work. The headline is an R12
self-correction of last tick's finding.

## R12 CORRECTION: the contradiction lint is SLOW, not broken
Last tick ([[reference_sierra_vault_health_lowcov_2026_06_18]]) concluded the lint "exits 255,
infra-fragile, OOM/reaper-killed". That ROOT-CAUSE was WRONG. The truth:
- `DEFAULT_LIMIT = 150` candidate pairs x ~6s/pair (gpt-oss:20b NLI) = **~15 min/run**.
- My exit-255s were MY interactive auto-backgrounding Bash tool getting harness-killed mid-15min-run
  -- NOT a production failure. `--limit 2` completes in 11.8s, EXIT=0. A patient/cron run completes:
  the live report is fresh (05:37), pairsChecked 148/150, coverage 0.136 (13.6%, up from the 0.7% I
  saw earlier), aborted:false.
LESSON: a long-running CLI that "dies at 255" under the agent's Bash tool may just be exceeding the
tool's auto-background/harness kill window -- confirm with a small-N run before declaring it broken.

## The contradiction was REAL + multi-layer (A and B both needed fixing)
A=`feedback_edit_tool_crlf_flips_lf_files`, B=`feedback_edit_tool_not_powershell_for_repo_files`.
- **B fix (last tick):** B falsely claimed the Edit tool "preserves line endings" -- it writes CRLF.
  Corrected to "preserves the BOM (PowerShell strips it); CRLF normalized to LF by .gitattributes on
  commit" + cross-link A.
- **A fix (this tick):** A was SELF-inconsistent -- its 2026-06-04 UPDATE block says `.gitattributes
  eol=lf` shipped (9bd4b22abd) and explicitly flags the old "no `.gitattributes`" text as STALE, yet
  A's `description:` still asserted "no .gitattributes EOL normalization" present-tense. The NLI
  (correctly) flagged A's stale claim vs B's now-correct one. Corrected A's description to
  historical+FIXED ("UNTIL 2026-06-04 there was no normalization ... FIXED by 9bd4b22abd").
Each edit applied to BOTH the C: source (durable) + the H: vault copy (recall/lint read H:).
RESIDUAL: A's lower-salience body (Symptom line 13, Standing-fix line 24) still has stale present-tense
"there is no .gitattributes" text -- A's own UPDATE flags it. If the next cron lint still flags A<>B,
do a full A body freshness pass (queued). The slow lint (~15min) verifies on the next cron run.

## 2nd contradiction surfaced (better coverage found it)
The 148-pair scan (vs the earlier 8-pair) found a 2nd: `feedback_ai_upgrade_broadcast_protocol` <>
`feedback_sierra_no_gates_full_reign_2026_06_10`, EMPTY NLI reason -> likely a WEAK/FALSE positive
(a real contradiction gets a reason). QUEUED: read both, verify real-vs-false; if a pattern of
empty-reason false positives emerges, the NLI prompt/parse may need a confidence gate.

## QUEUED next unit: run-budget hardening for runNliLint
Even though the lint isn't broken, a 15min interactive run is unusable. Add a wall-clock run-budget
(env-configurable) + dynamic per-call timeout (cap each call by remaining budget) so an interactive
or contended run SELF-ABORTS with a partial honest report (the existing `aborted` path already writes
one) instead of running 15min / getting harness-killed. Lower priority than it seemed (cron completes).

## Siblings
[[reference_sierra_vault_health_lowcov_2026_06_18]] (the guard + the corrected lint finding) ·
[[reference_sierra_memory_contradiction_lint_2026_06_17]] (the lint itself) ·
[[feedback_edit_tool_crlf_flips_lf_files]] · [[feedback_edit_tool_not_powershell_for_repo_files]].
