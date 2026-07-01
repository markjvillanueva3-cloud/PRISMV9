# SIERRA-VAULT-OPS/U-VAULT-CONTRADICT-MEMORY — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-CONTRADICT-MEMORY (slot:sierra): memory-vault contradiction lint -- extends the wiki NLI linter to doctrine memos

**Commit:** `6358abaad48a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T19:15:33-05:00
**Tags:** sierra-vault-ops, u-vault-contradict-memory, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-CONTRADICT-MEMORY (slot:sierra): memory-vault contradiction lint -- extends the wiki NLI linter to doctrine memos

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-CONTRADICT-MEMORY (slot:sierra): memory-vault contradiction lint -- extends the wiki NLI linter to doctrine memos

Unit #3 of the highest-ROI vault queue: the assessment's named #2 2nd-brain gap (no
contradiction-detector for memories). The LOGICAL-conflict sibling of the supersession
(temporal-staleness) detector -- finds two UNDATED doctrine memos asserting opposite facts.

REUSE (R8, not a rebuild): extends my own proven scripts/lint-wiki-contradictions.mjs
(OLLAMA-SYNERGY/U-WIKI-NLI-LINT, f8c183f7a5) -- imports its engine wholesale
(tokenizeForTopic/selectClaim/candidatePairs/runNliLint/resolveNliModel); the ONLY new
code is a memory-corpus loader (parseMemoryPage/loadMemoryPages). NLI/pairing/circuit-breaker
stay single-sourced. Scope = curated doctrine (feedback/+patterns), NOT the 19.9K
node-pointers/snapshots.

SYNERGY with units #1/#2: EXCLUDES already-[SUPERSEDED] memos via the SAME isSupersededMemory
predicate vault-supersession-detector.mjs writes markers for -- a memo my detector marks is
skipped here (resolved conflict, not re-flagged). Also excludes node-pointer stubs.

LIVE-VALIDATED (Ollama gpt-oss:20b): 351 doctrine memos (1 superseded excluded), and FOUND a
real candidate contradiction (two memos disagreeing whether the Edit tool corrupts LF->CRLF).
Advisory + fail-soft (Ollama down -> SKIPPED report, never a false 'clean'). Report at
state/shared/memory-contradictions.json, write-by-default.

9 hermetic tests (injected fs + injected NLI call). 2-arm scrutiny: reviewer PASS, code-analyzer
FAIL->fixed->re-verify PASS. Closed 1 P1 (write-by-default, was silently leaving --limit runs
un-persisted) + 4 P2 (CRLF frontmatter parse for the 15% CRLF memos, pairsTotal/coverage honesty,
getOpt --limit=N equals-form, walkMd divergence comment).
```

## Files touched (3)
- scripts/lint-memory-contradictions.mjs      | 187 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lint-memory-contradictions.test.mjs | 121 ++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 308 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6358abaad48a`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._