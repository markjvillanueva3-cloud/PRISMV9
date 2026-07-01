---
name: feedback-verify-actual-contract-not-proxy
description: "When reproducing a failure, replicate the FULL downstream contract — not a proxy signal like exit code"
aliases: feedback_verify_actual_contract_not_proxy
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.450Z
---


# Reproduce the actual contract, not a proxy for it

When diagnosing why code path X fails, the standalone reproduction must exercise the **exact same success condition** the real caller depends on — not a cheaper proxy.

**Why:** 2026-05-16, TRIBAL-GRAPH-MS0 iter-7. The orchestrator's `extractAllDataJson` flagged 31 of 227 course zips as `EXTRACT-FAIL`. I "reproduced" extraction standalone and saw `status=0`, `stdoutLen=8998` — concluded "the zip works, the failure is transient fork-storm." That was wrong for ~5 turns of effort (added retry loops, exponential backoff, blamed the 12-chat fleet). The orchestrator's real contract was not "PowerShell exits 0" — it was **"`JSON.parse(stdout)` succeeds."** My probes checked the exit code and the byte length; they never parsed. The moment I added `JSON.parse` to the probe, the bug was obvious in one run: Windows PowerShell 5.1 writes stdout in the legacy console codepage, so non-ASCII chars in course `data.json` (curly quotes, em-dashes, accented names) were mangled → invalid JSON → `JSON.parse` throws → `return null` → EXTRACT-FAIL. Fix was one line: `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`.

**How to apply:** before concluding "works standalone" / "the failure is environmental," ask: *what is the line in the real caller that decides success?* Run THAT line in the repro. Exit code, HTTP 200, non-empty output, file-exists — these are proxies. The real contract is usually one step downstream: the parse, the schema-validate, the assertion. Replicate to the contract, or the repro lies. Also: a deterministic split ("exactly 31 fail every run") is evidence AGAINST "transient" — transient failures vary; if the failing set is stable, stop blaming the environment and find the deterministic cause.

Related: [[reference_tribal_graph_ms0_content_mine]].
