# OLLAMA-GEN-JUDGE/U-ALPHA-JUDGE-TRISTATE — [MAIN-FORCE] [OLLAMA-GEN-JUDGE]/U-ALPHA-JUDGE-TRISTATE (slot:alpha): 2-arm scrutiny P2 fixes -- judge false-0 (tri-state ABSTAIN), explain-medium n=1->n=2, low-n flag in matrix

**Commit:** `056d0710bc1e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T16:53:45-05:00
**Tags:** ollama-gen-judge, u-alpha-judge-tristate, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-GEN-JUDGE]/U-ALPHA-JUDGE-TRISTATE (slot:alpha): 2-arm scrutiny P2 fixes -- judge false-0 (tri-state ABSTAIN), explain-medium n=1->n=2, low-n flag in matrix

## Body
```
[MAIN-FORCE] [OLLAMA-GEN-JUDGE]/U-ALPHA-JUDGE-TRISTATE (slot:alpha): 2-arm scrutiny P2 fixes -- judge false-0 (tri-state ABSTAIN), explain-medium n=1->n=2, low-n flag in matrix

Both per-file reviewers PASSed the LLM-judge unit (014cfefb46) with 3 P2 findings; fixed same session
(auto-fix-inline + R16 close-the-gap).

P2-1 (judge false-0, one layer up -- the substantive one): judgeFactCapture returned `false` on a judge
timeout / non-ok / no-verdict, which the runner charged to the SUBJECT as a measured FAIL (no ns tag) --
the exact false-0 class the subject-side guard fixed, reintroduced at the grader layer. FIX: judge is now
TRI-STATE -- PASS=true / FAIL=false / ABSTAIN=null (could-not-grade: call error/timeout/non-ok HTTP/no
parseable PASS|FAIL token). runTaskOnModel maps a null/undefined verdict to noSignal, never a subject
FAIL; a real FAIL verdict stays a measured fail. Sync batteries never return null -> byte-identical (the
23 regression tests confirm). So the judged metric is honest under GPU contention, not just idle.

P2-2: explain-medium was n=1 -> added a 2nd case (G96 CSS) so the easy/MEDIUM "cheap models sufficient"
conclusion rests on n=2 (summarize-medium AND explain-medium).

P2-3: render `(low-n)` in the expanded-run human matrix when frontier.confident=false (the JSON already
carried it) so an n<3 frontier is never read as a hard route.

TEST: judge 14/14 (+2: throw->null abstain, no-token->null abstain, real-FAIL->false), runner+abstain
6/6 (+1: async verify null -> noSignal not a subject fail), regression 23/23 (tri-state verdict change is
back-compat for sync verifiers), generative self-test 10/10 (+1 case), generative struct 9/9, judged
self-test 10/10. Doc updated with the hardening note. 2-arm scrutiny PASS (no P0/P1; these were the P2s).
```

## Files touched (8)
- scripts/lib/stress-battery-generative.mjs               |  13 ++++++
- scripts/lib/stress-judge.mjs                            |  49 +++++++++++++---------
- scripts/lib/stress-judge.test.mjs                       |  12 +++++-
- scripts/ollama-stress-expanded-run.mjs                  |   5 ++-
- scripts/ollama-stress-test-nosignal.test.mjs            |  20 +++++++++
- scripts/ollama-stress-test.mjs                          |  13 ++++--
- state/shared/ollama-generative-stratified-2026-06-25.md | 128 +++++++++++++++++++++++++++++++-------------------------
- 7 files changed, 160 insertions(+), 80 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 056d0710bc1e`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-GEN-JUDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._