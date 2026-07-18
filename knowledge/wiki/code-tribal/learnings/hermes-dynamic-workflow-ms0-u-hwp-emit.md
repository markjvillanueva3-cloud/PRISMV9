# HERMES-DYNAMIC-WORKFLOW-MS0/U-HWP-EMIT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-DYNAMIC-WORKFLOW-MS0]/U-HWP-EMIT (slot:bravo): the second half of 'behave like the coder' — emitWorkflowScript() turns a plan into a RUNNABLE PRISM Workflow harness skeleton (the article's 'Claude writes that harness for you'). Per-pattern codegen: fan-out→parallel(barrier)+opus synth, adversarial-verify→separate-verifier parallel, tournament→code-owned pairwise bracket, loop-until-done→dry-round stop (not fixed count), generate-and-filter→parallel gen+filter, classify-and-act→cheap classifier+route; prepends a read-only quarantine reader when untrusted (step 13); meta block + token-budget/goal/loop comments. CLI --emit. Emitted harness is node --check-valid IN the Workflow async context (top-level await+return are legal there — the test wraps the body in an async fn, the faithful execution model). +6 tests (43 total green). TOOLBELT doc-reflect.

**Commit:** `1bb66a18224c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T12:40:25-05:00
**Tags:** hermes-dynamic-workflow-ms0, u-hwp-emit, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-DYNAMIC-WORKFLOW-MS0]/U-HWP-EMIT (slot:bravo): the second half of 'behave like the coder' — emitWorkflowScript() turns a plan into a RUNNABLE PRISM Workflow harness skeleton (the article's 'Claude writes that harness for you'). Per-pattern codegen: fan-out→parallel(barrier)+opus synth, adversarial-verify→separate-verifier parallel, tournament→code-owned pairwise bracket, loop-until-done→dry-round stop (not fixed count), generate-and-filter→parallel gen+filter, classify-and-act→cheap classifier+route; prepends a read-only quarantine reader when untrusted (step 13); meta block + token-budget/goal/loop comments. CLI --emit. Emitted harness is node --check-valid IN the Workflow async context (top-level await+return are legal there — the test wraps the body in an async fn, the faithful execution model). +6 tests (43 total green). TOOLBELT doc-reflect.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-DYNAMIC-WORKFLOW-MS0]/U-HWP-EMIT (slot:bravo): the second half of 'behave like the coder' — emitWorkflowScript() turns a plan into a RUNNABLE PRISM Workflow harness skeleton (the article's 'Claude writes that harness for you'). Per-pattern codegen: fan-out→parallel(barrier)+opus synth, adversarial-verify→separate-verifier parallel, tournament→code-owned pairwise bracket, loop-until-done→dry-round stop (not fixed count), generate-and-filter→parallel gen+filter, classify-and-act→cheap classifier+route; prepends a read-only quarantine reader when untrusted (step 13); meta block + token-budget/goal/loop comments. CLI --emit. Emitted harness is node --check-valid IN the Workflow async context (top-level await+return are legal there — the test wraps the body in an async fn, the faithful execution model). +6 tests (43 total green). TOOLBELT doc-reflect.
```

## Files touched (4)
- mcp-server/src/engines/hermes-zulu/TOOLBELT.md |   8 +
- scripts/lib/hermes-workflow-planner.mjs        | 660 +++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/hermes-workflow-planner.test.mjs   | 265 +++++++++++++++++++
- 3 files changed, 933 insertions(+)

## Lessons surfaced in commit body
- til-done→dry-round stop (not fixed count), generate-and-filter→parallel gen+filter, classify-and-act→cheap classifier+route; prepends a read-only quarantine reader when untrusted (step 13); meta block + token-budget/goal/loop comments. CLI --emit. Emitted harness is node --check-valid IN the Workflow async context (top-level await+return are legal there — the test wraps the body in an async fn, the f

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1bb66a18224c`
- Milestone envelope: `mcp-server/data/milestones/HERMES-DYNAMIC-WORKFLOW-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._