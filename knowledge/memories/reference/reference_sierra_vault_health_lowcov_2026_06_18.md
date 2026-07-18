---
name: reference_sierra_vault_health_lowcov_2026_06_18
description: "Sierra added a LOW_COVERAGE honesty guard to vault-health (commit 8bf854f94b, 2026-06-18, branch cad-fusion-live-ms0) so a clean-0 doctrine-contradiction scan at low coverage never reads as a clean bill of health. The NLI contradiction lint caps candidate pairs -> a live run checks only ~8/1105 pairs (0.7%); previously vault-health mapped contradictions=0 to OK(green) regardless of coverage, falsely certifying 'doctrine consistent' when 99.3% was never scanned (same R12 false-confidence class as the existing needsScan guard for the 0-pairs-checked case). Fix: contradiction headline gains a LOW_COVERAGE=0.5 guard -- a real contradiction still WARNs; a clean v===0 is OK only when recomputed cov(checked/total)>=0.5, else severity info + lowCoverage:true + 'LOW COVERAGE, not a clean bill'. aggregateHealth carries lowCoverage per-row + in counts; INFO, does NOT escalate overall (the capped scan is the lint's steady state -> escalating would peg the dashboard perpetually STALE). Decision uses recomputed cov, never the report's display-only coverage field. fixture healthy() moved 8/1105->1105/1105 (it was itself low-coverage); +3 tests (17 total); per-file 2-arm scrutiny PASS 0 P0/P1. Also resolved the 1 flagged contradiction: feedback_edit_tool_not_powershell_for_repo_files FALSELY claimed the Edit tool 'preserves line endings' (it writes CRLF -- contradicts feedback_edit_tool_crlf_flips_lf_files); corrected to 'preserves BOM; CRLF normalized by .gitattributes on commit' + cross-linked, in both C: source + H: vault copy. FINDING: the contradiction lint now exits 255 (killed mid-run, OOM/reaper on the slow gpt-oss:20b pass) -- infra-fragile, hardening unit queued."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.201Z
aliases: reference_sierra_vault_health_lowcov_2026_06_18
---


# Sierra: vault-health LOW_COVERAGE honesty guard + contradiction resolution (2026-06-18)

Autonomous vault-ops cron tick. The vault-ops backlog was dry (link-doctor exhausted), so I
hardened what's built -- found a real R12 false-confidence gap in the contradiction reporting.

## The gap (R12 false-confidence -- sibling of the needsScan fix)
The doctrine-contradiction NLI lint caps candidate pairs, so a live run checks only ~8 of 1105
pairs (0.7% coverage). vault-health mapped any clean (contradictions=0) result to OK(green)
REGARDLESS of coverage. So a 0-found over 0.7% scanned would render as "doctrine certified clean"
when 99.3% was never looked at. Same class as the needsScan guard I shipped for the 0-pairs-checked
case -- "barely looked" must not read as "verified clean".

## Built: LOW_COVERAGE guard (commit 8bf854f94b)
contradiction headline order: needsScan (model null / 0 checked) -> real contradiction WARN ->
clean-at-low-coverage INFO+lowCoverage -> clean-at-adequate-coverage OK. Threshold LOW_COVERAGE=0.5.
Decision uses RECOMPUTED cov(checked/total), never the report's display-only `coverage` scalar
(so a malformed coverage field can't flip the verdict). lowCoverage is INFO -- surfaced on the row
+ in counts + the CLI "healthy" guard, but does NOT escalate `overall` (escalating would peg the
dashboard perpetually STALE since the capped 0.7% scan is the lint's steady state; the honest signal
lives on the row detail). fixture healthy() moved 8/1105 -> 1105/1105 (it was itself low-coverage --
without this the existing clean->ok tests would have flipped to info). +3 tests (17 total). 2-arm
scrutiny (reviewer + code-analyzer) PASS 0 findings.

## Resolved the 1 flagged contradiction (a real FACTUAL error, not NLI noise)
feedback_edit_tool_not_powershell_for_repo_files (golf's standing rule) claimed the Edit/Write tool
"preserves ... line endings". That is FALSE -- the Edit tool writes CRLF working-copies (per
[[feedback_edit_tool_crlf_flips_lf_files]] + the repo's many "restore X to LF, edit flipped CRLF"
commits). The NLI flag was CORRECT. Fix (preserves golf's actual rule, corrects the supporting
claim): "preserves the UTF-8 BOM that PowerShell strips; the Edit tool's CRLF working-copy is
normalized to LF by the repo .gitattributes on commit" + cross-link A. Edited BOTH the C: source
(durable) and the H: vault copy (so recall + lint see it). All-slots-free-access (golf not
privileged) + wiki-protocol "Claude owns contradiction resolution".

## R12 honesty: lint re-verify is INFRA-BLOCKED
Could NOT empirically re-run the NLI lint to confirm contradictions->0: `lint-memory-contradictions`
exits 255, killed mid-run across 3 attempts (~100-300s into the gpt-oss:20b pass; Ollama IS
reachable). It produced a clean 8/1105 report EARLIER this session, so this is GPU-contention
OOM/reaper kill, NOT my edit. The fix is logically complete (B no longer makes the contradicting
claim); the dashboard's contradiction WARN persists on the stale report until a successful lint run
re-scans to 0 (then the lowCoverage guard renders it honestly). QUEUED hardening: make the lint
robust to the slow-GPU/reap scenario (lower default limit, per-pair timeout, checkpoint-resume).

## Siblings
[[reference_sierra_vault_health_dashboard_2026_06_17]] (the dashboard this hardens) ·
[[reference_sierra_memory_contradiction_lint_2026_06_17]] (the lint that needs coverage + robustness) ·
[[reference_sierra_vault_link_derank_2026_06_17]] · [[reference_sierra_vault_uncat_dedup_2026_06_17]].
