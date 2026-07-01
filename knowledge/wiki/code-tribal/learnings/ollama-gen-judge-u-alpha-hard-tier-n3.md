# OLLAMA-GEN-JUDGE/U-ALPHA-HARD-TIER-N3 — [MAIN-FORCE] [OLLAMA-GEN-JUDGE]/U-ALPHA-HARD-TIER-N3 (slot:alpha): expand generative hard tier n=1->n=3 for a routable frontier + wiki lesson

**Commit:** `52cd201270d6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T17:07:00-05:00
**Tags:** ollama-gen-judge, u-alpha-hard-tier-n3, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-GEN-JUDGE]/U-ALPHA-HARD-TIER-N3 (slot:alpha): expand generative hard tier n=1->n=3 for a routable frontier + wiki lesson

## Body
```
[MAIN-FORCE] [OLLAMA-GEN-JUDGE]/U-ALPHA-HARD-TIER-N3 (slot:alpha): expand generative hard tier n=1->n=3 for a routable frontier + wiki lesson

The n=1 hard tier was the last gap blocking a routable hard-tier ranking (the executor-routing payoff
needs a robust per-mode floor, not a single sample). Added 2 genuinely-HARD cases each to summarize-hard
(GNN selective-deploy calibration post-mortem; tribal-brain fail-open clobber) and explain-hard
(climb-milling thin-chip-rubbing heat; G96 CSS RPM->infinity-at-center). Each requires preserving a
SUBTLE counter-intuitive fact (the exact failure mode the keyword metric is brittle on + the judge
catches). Made the explain-hard prompt GENERIC (was Kienzle-specific -- wrong for the new cases since
prompt is per-task). Battery now: easy/med n=2, hard n=3. Self-test 14/14, judged self-test 14/14,
struct 9/9.

Also: knowledge/wiki/code-tribal/stress-harness-false0-and-llm-judge-2026-06-25.md -- the generalizable
lesson (a measurement harness must distinguish NO-SIGNAL from a measured FAIL at EVERY layer -- subject
AND judge; keyword-overlap is brittle for generative quality, use an LLM-judge) closing the bug-finding
-> wiki gate for cc24367e41 + 014cfefb46 + 056d0710bc.

The n=3 judged re-measurement is running on the idle GPU (the robust hard-tier frontier will update
state/shared/ollama-generative-stratified-2026-06-25.md on completion).
```

## Files touched (3)
- .../wiki/code-tribal/stress-harness-false0-and-llm-judge-2026-06-25.md      | 66 +++++++++++++++++++++++++++++++++++++
- scripts/lib/stress-battery-generative.mjs                                   | 66 ++++++++++++++++++++++++++++++++++++-
- 2 files changed, 131 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- wrong for the new cases since
- lesson (a measurement harness must distinguish NO-SIGNAL from a measured FAIL at EVERY layer -- subject

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 52cd201270d6`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-GEN-JUDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._