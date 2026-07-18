---
name: reference_sierra_memory_contradiction_lint_2026_06_17
description: "Sierra built the memory-vault CONTRADICTION lint (commit 6358abaad4, 2026-06-17, branch cad-fusion-live-ms0) -- unit #3 of the highest-ROI vault queue + the assessment's named #2 2nd-brain gap (no contradiction-detector for memories). scripts/lint-memory-contradictions.mjs finds two UNDATED doctrine memos asserting opposite facts via pairwise NLI (Ollama gpt-oss:20b). The LOGICAL-conflict sibling of the supersession (temporal-staleness) detector. R8 REUSE not rebuild: extends my own proven scripts/lint-wiki-contradictions.mjs (f8c183f7a5) -- imports its engine wholesale (tokenizeForTopic/selectClaim/candidatePairs/runNliLint/resolveNliModel); only new code is a memory-corpus loader. Scope = curated doctrine (feedback/+patterns, ~351 memos), NOT the 19.9K node-pointers/snapshots. SYNERGY: excludes already-[SUPERSEDED] memos via the SAME isSupersededMemory predicate my supersession detector writes -- resolved conflicts not re-flagged. LIVE-VALIDATED: found a real candidate contradiction (two memos disagreeing whether the Edit tool corrupts LF->CRLF). Advisory + fail-soft (Ollama down -> SKIPPED report). 9 hermetic tests, 2-arm scrutiny PASS (FAIL->fixed->re-verify: write-by-default + CRLF parse + coverage honesty + getOpt equals-form)."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.192Z
aliases: reference_sierra_memory_contradiction_lint_2026_06_17
---


# Sierra: memory-vault contradiction lint (highest-ROI queue #3, 2026-06-17)

Operator: "tackle the remaining work 1 by 1 by highest roi." Unit #3, the assessment's
named #2 2nd-brain gap. Siblings: [[reference_sierra_vault_supersession_detector_2026_06_17]]
(temporal staleness), [[reference_wiki_nli_lint_2026_06_09]] (the wiki engine I extended).

## Built: scripts/lint-memory-contradictions.mjs (commit 6358abaad4)
Finds two UNDATED doctrine memos asserting OPPOSITE facts (the logical-conflict counterpart
to supersession's temporal staleness). Pairwise NLI: inverted-index candidate pairs (>=2 shared
topic tokens) -> Ollama CONTRADICT/CONSISTENT/UNRELATED verdict -> advisory report. Scope = the
curated doctrine namespaces feedback/+patterns (~351 memos), NOT the 19.9K node-pointers/snapshots.

## R8 REUSE not rebuild (almost missed the dedup)
The assessment claimed "no dedicated contradiction-detector" -- TRUE for memories, but
`scripts/lint-wiki-contradictions.mjs` (my own prior work, OLLAMA-SYNERGY/U-WIKI-NLI-LINT,
f8c183f7a5) is a complete NLI contradiction-detector for the WIKI. Reading it BEFORE building
turned a from-scratch build into a thin extension: imports its engine wholesale
(tokenizeForTopic/selectClaim/candidatePairs/runNliLint/resolveNliModel) -- NLI + pairing +
circuit-breaker stay single-sourced, no drift. Only new code = parseMemoryPage/loadMemoryPages
(memory frontmatter is name:/metadata: not the wiki's title:/tags:). A Workflow was the WRONG
vehicle (the NLI is intentionally GPU-serial; parallel agents would thrash one GPU) -- the
leverage was REUSE, not fan-out.

## SYNERGY with units #1/#2 (the 3 vault tools compound)
loadMemoryPages EXCLUDES already-[SUPERSEDED] memos via the SAME isSupersededMemory predicate
that vault-supersession-detector.mjs writes markers for -- so a memo my supersession detector
marked (resolved temporal conflict) is correctly SKIPPED here (not re-flagged as a logical
contradiction). Live run excluded 1 superseded of 351. Also excludes node-pointer stubs.

## LIVE-VALIDATED: found a REAL candidate contradiction
gpt-oss:20b over the real corpus: 351 doctrine memos, 8/1105 candidate pairs scanned (coverage
0.7% -- bounded --limit to dodge api-error interruptions; full scan is a cheap slow re-run, not
a code gap), FOUND 1 contradiction: feedback_edit_tool_crlf_flips_lf_files vs
feedback_edit_tool_not_powershell_for_repo_files ("A claims Edit/Write corrupt LF->CRLF, B
asserts they preserve line endings"). Advisory -- flags for human review, never auto-resolves.

## Scrutiny: code-analyzer FAIL -> fixed -> re-verify PASS (5 findings)
- P1 write-gate: --limit/--section/--include-reference RAN but never persisted the report (kept
  stale JSON). Fix: write-by-default (--no-write to opt out). An advisory linter must always write.
- P2 CRLF: \n-only frontmatter regex broke on 15% (53/354) CRLF memos -> lost name/description ->
  shrunken tokens -> MISSED pairs (the exact false-negative the tool catches). Fix: \r?\n-tolerant.
  Proof it worked: pairsTotal 1074->1105 after the fix (53 previously-blind memos now contribute).
- P2 coverage honesty (R12): added pairsTotal+coverage so contradictions:0 over 8/1105 doesn't
  read as a full clean scan. P2 getOpt --limit=N equals-form + walkMd divergence comment.

## Session arc (3 units, the operator's "1 by 1 by highest roi")
#1 U-VAULT-SUPERSEDE-DETECT (b397e08da3) -> #2 U-VAULT-SUPERSEDE-MARK (bf3a7c3c58, 128 memos
recall-excluded) -> #3 this. Remaining queue: 150 ambiguous broken links --ambiguous review;
MECE uncategorized/ (10 files); /Daily writer. Next chat picks by ROI.
